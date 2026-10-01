#!/usr/bin/env node
/**
 * Server phòng chơi cho các game nhóm (mini-apps dùng @bang/party).
 *
 * - WebSocket ở đường dẫn /party: chỉ chuyển tin, không chạy luật chơi.
 *   Chủ phòng gửi trạng thái (cả bản hoặc chỉ phần đổi) -> server lưu bản mới nhất và phát cho cả phòng.
 *   Khách gửi hành động -> server chuyển cho chủ phòng.
 *   ping -> pong kèm giờ server, để các máy dùng chung một đồng hồ.
 *   Game thời gian thực: tick (chủ phòng -> cả phòng) và input (khách -> chủ phòng) chỉ chuyển, không lưu.
 * - Nếu có thư mục build của launcher (apps/launcher/dist) thì phục vụ luôn web app,
 *   nên deploy chỉ cần một process: `node apps/party-server/server.mjs`.
 *
 * Biến môi trường: PORT (8787), HOST (0.0.0.0), STATIC_DIR (../launcher/dist), HOST_HANDOFF_MS (15000),
 * TRUST_PROXY=1 khi chạy sau Cloudflare/nginx (lấy IP thật từ CF-Connecting-IP / X-Forwarded-For để giới hạn theo IP;
 * thiếu biến này thì mọi người qua cùng proxy bị tính chung một IP).
 * Giao thức giữ khớp với packages/party/src/net.ts.
 */
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { promisify } from 'node:util';
import { brotliCompress, constants as zlib, gzip } from 'node:zlib';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

const here = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? '0.0.0.0';
const STATIC_DIR = resolve(process.env.STATIC_DIR ?? join(here, '../launcher/dist'));
const WS_PATH = '/party';
const TRUST_PROXY = process.env.TRUST_PROXY === '1';

const MAX_MEMBERS = 12;
const MAX_ROOMS = 2000;
const MAX_MESSAGE = 64 * 1024;
/** Máy mất kết nối được giữ chỗ bấy lâu (khóa màn hình, đổi mạng) rồi mới bị xóa khỏi phòng. */
const OFFLINE_GRACE_MS = 90_000;
/** Chủ phòng mất kết nối lâu hơn thế này thì người đang online khác lên thay, để cả phòng không phải chờ. */
const HOST_HANDOFF_MS = Number(process.env.HOST_HANDOFF_MS ?? 15_000);
const HEARTBEAT_MS = 25_000;
/** Chống một máy/script chiếm hết tài nguyên: số kết nối mở cùng lúc và số phòng tạo mới mỗi cửa sổ thời gian, theo IP. */
const MAX_CONN_PER_IP = 30;
const MAX_CREATES_PER_IP = 20;
const CREATE_WINDOW_MS = 10 * 60_000;

/**
 * `key` là id bí mật của máy (client gửi lên, không bao giờ phát lại cho ai), dùng để vào lại đúng chỗ.
 * `id` là id công khai do server cấp, phát cho cả phòng. Tách hai id để không ai mạo danh được người khác
 * (trước đây id phát cho cả phòng cũng là id để vào lại, nên khách có thể chiếm quyền chủ phòng).
 * @typedef {{ key: string, id: string, name: string, ws: import('ws').WebSocket | null, timer?: NodeJS.Timeout }} Member
 */
/** `members` theo key bí mật; `hostKey` là key của chủ phòng. */
/** @typedef {{ code: string, game: string, hostKey: string, members: Map<string, Member>, state: unknown, handoff?: NodeJS.Timeout }} Room */

/** @type {Map<string, Room>} */
const rooms = new Map();

const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const cleanId = (v) => (/^[a-z0-9-]{4,40}$/i.test(String(v)) ? String(v) : '');
const cleanGame = (v) => (/^[a-z0-9-]{1,40}$/.test(String(v)) ? String(v) : '');

function newCode() {
  for (let i = 0; i < 50; i++) {
    const code = String(1000 + Math.floor(Math.random() * 9000));
    if (!rooms.has(code)) return code;
  }
  return null;
}

const publicId = () => randomBytes(6).toString('hex');
const hostIdOf = (room) => room.members.get(room.hostKey)?.id ?? '';

const send = (ws, msg) => ws && ws.readyState === ws.OPEN && ws.send(JSON.stringify(msg));
const memberList = (room) => [...room.members.values()].map((m) => ({ id: m.id, name: m.name, online: !!m.ws }));

function broadcast(room, msg, exceptId) {
  const data = JSON.stringify(msg);
  for (const m of room.members.values()) if (m.id !== exceptId && m.ws && m.ws.readyState === m.ws.OPEN) m.ws.send(data);
}

const broadcastMembers = (room, exceptId) => broadcast(room, { t: 'members', hostId: hostIdOf(room), members: memberList(room) }, exceptId);

function removeMember(room, key) {
  const m = room.members.get(key);
  if (!m) return;
  clearTimeout(m.timer);
  room.members.delete(key);
  if (!room.members.size) {
    clearTimeout(room.handoff);
    rooms.delete(room.code);
    return;
  }
  // Chủ phòng rời: người đang online vào sớm nhất lên thay, tiếp tục từ trạng thái đã lưu.
  if (room.hostKey === key) {
    const next = [...room.members.values()].find((x) => x.ws) ?? room.members.values().next().value;
    room.hostKey = next.key;
  }
  broadcastMembers(room);
}

/** Chủ phòng vẫn mất kết nối sau HOST_HANDOFF_MS: trao quyền cho người online vào sớm nhất (chủ cũ quay lại thành khách). */
function scheduleHandoff(room) {
  clearTimeout(room.handoff);
  room.handoff = setTimeout(() => {
    if (rooms.get(room.code) !== room || room.members.get(room.hostKey)?.ws) return;
    const next = [...room.members.values()].find((x) => x.ws);
    if (!next) return;
    room.hostKey = next.key;
    broadcastMembers(room);
  }, HOST_HANDOFF_MS);
}

const isObject = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

/* ---------- Giới hạn theo IP ---------- */

function clientIp(req) {
  if (TRUST_PROXY) {
    const real = String(req.headers['cf-connecting-ip'] ?? req.headers['x-forwarded-for'] ?? '').split(',')[0].trim();
    if (real) return real;
  }
  return req.socket.remoteAddress ?? '';
}

/** @type {Map<string, number>} */
const connPerIp = new Map();
/** @type {Map<string, number[]>} */
const createsPerIp = new Map();

function allowCreate(ip) {
  const now = Date.now();
  const recent = (createsPerIp.get(ip) ?? []).filter((t) => now - t < CREATE_WINDOW_MS);
  if (recent.length >= MAX_CREATES_PER_IP) {
    createsPerIp.set(ip, recent);
    return false;
  }
  recent.push(now);
  createsPerIp.set(ip, recent);
  return true;
}

// Dọn các IP đã hết hạn để map không phình mãi.
setInterval(() => {
  const now = Date.now();
  for (const [ip, list] of createsPerIp) if (list.every((t) => now - t >= CREATE_WINDOW_MS)) createsPerIp.delete(ip);
}, CREATE_WINDOW_MS).unref();

const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE });

wss.on('connection', (ws, req) => {
  const ip = clientIp(req);
  connPerIp.set(ip, (connPerIp.get(ip) ?? 0) + 1);
  ws.on('close', () => {
    const n = (connPerIp.get(ip) ?? 1) - 1;
    if (n > 0) connPerIp.set(ip, n);
    else connPerIp.delete(ip);
  });

  ws.isAlive = true;
  ws.on('pong', () => (ws.isAlive = true));
  /** @type {Room | null} */
  let room = null;
  let memberKey = '';

  ws.on('message', (raw, isBinary) => {
    if (isBinary) return;
    let msg;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      return;
    }
    if (!msg || typeof msg.t !== 'string') return;

    // Đo giờ: trả lại `c` của máy gửi kèm giờ server; dùng được cả trước khi vào phòng.
    if (msg.t === 'ping') return send(ws, { t: 'pong', c: typeof msg.c === 'number' ? msg.c : 0, now: Date.now() });

    if (msg.t === 'create' || msg.t === 'join') {
      if (room) return;
      const key = cleanId(msg.id);
      const name = clean(msg.name, 20);
      const game = cleanGame(msg.game);
      if (!key || !name || !game) return send(ws, { t: 'error', code: 'bad' });

      let target;
      if (msg.t === 'create') {
        const code = rooms.size < MAX_ROOMS && allowCreate(ip) ? newCode() : null;
        if (!code) return send(ws, { t: 'error', code: 'busy' });
        target = { code, game, hostKey: key, members: new Map(), state: null };
        rooms.set(code, target);
      } else {
        target = rooms.get(clean(msg.code, 4));
        if (!target) return send(ws, { t: 'error', code: 'no-room' });
        if (target.game !== game) return send(ws, { t: 'error', code: 'wrong-game' });
        if (!target.members.has(key) && target.members.size >= MAX_MEMBERS) return send(ws, { t: 'error', code: 'full' });
      }

      // Vào lại bằng cùng id (tải lại trang, rớt mạng) thì giữ chỗ cũ và thứ tự lượt.
      let member = target.members.get(key);
      if (member) {
        clearTimeout(member.timer);
        if (member.ws && member.ws !== ws) member.ws.close();
        member.ws = ws;
        member.name = name;
        if (target.hostKey === key) clearTimeout(target.handoff);
      } else {
        member = { key, id: publicId(), name, ws };
        target.members.set(key, member);
      }
      room = target;
      memberKey = key;
      send(ws, { t: 'joined', code: room.code, you: member.id, hostId: hostIdOf(room), members: memberList(room), state: room.state });
      broadcastMembers(room, member.id);
      return;
    }

    const me = room?.members.get(memberKey);
    if (!room || !me || me.ws !== ws) return;

    if (msg.t === 'state') {
      if (memberKey !== room.hostKey) return;
      room.state = msg.state ?? null;
      broadcast(room, { t: 'state', state: room.state }, me.id);
    } else if (msg.t === 'patch') {
      // Chỉ phần trạng thái đổi so với bản trước (theo khóa cấp đầu). Lệch bản thì bảo chủ phòng gửi lại cả bản.
      if (memberKey !== room.hostKey) return;
      if (!isObject(room.state) || !isObject(msg.set)) return send(ws, { t: 'resync' });
      const del = Array.isArray(msg.del) ? msg.del.filter((k) => typeof k === 'string') : [];
      const next = { ...room.state, ...msg.set };
      for (const k of del) delete next[k];
      room.state = next;
      broadcast(room, { t: 'patch', set: msg.set, del }, me.id);
    } else if (msg.t === 'tick') {
      // Game thời gian thực: ảnh chụp thế giới của chủ phòng, chỉ chuyển tiếp, không lưu.
      if (memberKey !== room.hostKey) return;
      broadcast(room, { t: 'tick', data: msg.data }, me.id);
    } else if (msg.t === 'input') {
      if (memberKey === room.hostKey) return;
      send(room.members.get(room.hostKey)?.ws, { t: 'input', from: me.id, data: msg.data });
    } else if (msg.t === 'action') {
      if (memberKey === room.hostKey) return;
      send(room.members.get(room.hostKey)?.ws, { t: 'action', from: me.id, action: msg.action });
    } else if (msg.t === 'leave') {
      const r = room;
      room = null;
      removeMember(r, memberKey);
    }
  });

  ws.on('close', () => {
    if (!room) return;
    const r = room;
    const m = r.members.get(memberKey);
    if (!m || m.ws !== ws) return;
    m.ws = null;
    m.timer = setTimeout(() => removeMember(r, m.key), OFFLINE_GRACE_MS);
    if (r.hostKey === m.key) scheduleHandoff(r);
    broadcastMembers(r);
  });
});

// Ngắt các kết nối chết (điện thoại tắt hẳn) để đánh dấu mất kết nối cho cả phòng.
const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, HEARTBEAT_MS);
wss.on('close', () => clearInterval(heartbeat));

/* ---------- Phục vụ web app đã build (tùy chọn) ---------- */

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json',
};
const compressible = new Set(['.html', '.js', '.mjs', '.css', '.json', '.webmanifest', '.svg', '.txt', '.map']);

/** Header bảo mật cho mọi phản hồi. Không đặt CSP đầy đủ vì launcher nhúng iframe tới domain bất kỳ. */
const securityHeaders = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'content-security-policy': "frame-ancestors 'self'",
  'permissions-policy': 'interest-cohort=()',
};

const brotli = promisify(brotliCompress);
const gz = promisify(gzip);

/**
 * File build không đổi trong suốt vòng đời process, nên đọc và nén một lần rồi giữ trong RAM.
 * @type {Map<string, Promise<{ raw: Buffer, br?: Buffer, gzip?: Buffer } | null>>}
 */
const fileCache = new Map();

function loadFile(file) {
  let entry = fileCache.get(file);
  if (!entry) {
    entry = (async () => {
      try {
        const raw = await readFile(file);
        if (!compressible.has(extname(file)) || raw.length < 1024) return { raw };
        const [br, gzipped] = await Promise.all([
          brotli(raw, { params: { [zlib.BROTLI_PARAM_QUALITY]: 11 } }),
          gz(raw, { level: 9 }),
        ]);
        return { raw, br, gzip: gzipped };
      } catch {
        return null;
      }
    })();
    fileCache.set(file, entry);
    // Không giữ kết quả lỗi, để lần sau đọc lại.
    entry.then((v) => v || fileCache.delete(file));
  }
  return entry;
}

async function serveStatic(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, securityHeaders).end();
    return;
  }
  let path;
  try {
    path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  } catch {
    res.writeHead(400, securityHeaders).end();
    return;
  }
  if (path === '/healthz') {
    res.writeHead(200, { 'content-type': 'text/plain' }).end(`ok ${rooms.size} rooms`);
    return;
  }

  let file = resolve(STATIC_DIR, `.${path}`);
  if (file !== STATIC_DIR && !file.startsWith(STATIC_DIR + sep)) {
    res.writeHead(404, securityHeaders).end();
    return;
  }
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
  } catch {
    // Đường dẫn của ứng dụng (/app/abc...) trả về index.html; file tĩnh thiếu thì 404.
    if (extname(path)) {
      res.writeHead(404, securityHeaders).end();
      return;
    }
    file = join(STATIC_DIR, 'index.html');
  }

  const entry = await loadFile(file);
  if (!entry) {
    res.writeHead(404, securityHeaders).end();
    return;
  }
  const accept = String(req.headers['accept-encoding'] ?? '');
  const encoding = entry.br && /\bbr\b/.test(accept) ? 'br' : entry.gzip && /\bgzip\b/.test(accept) ? 'gzip' : null;
  const body = encoding ? entry[encoding] : entry.raw;
  const immutable = file.includes(`${sep}assets${sep}`);
  res.writeHead(200, {
    ...securityHeaders,
    'content-type': types[extname(file)] ?? 'application/octet-stream',
    'content-length': body.length,
    'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    ...(entry.br || entry.gzip ? { vary: 'Accept-Encoding' } : {}),
    ...(encoding ? { 'content-encoding': encoding } : {}),
  });
  res.end(req.method === 'HEAD' ? undefined : body);
}

const server = createServer((req, res) => void serveStatic(req, res));

server.on('upgrade', (req, socket, head) => {
  if (new URL(req.url ?? '/', 'http://x').pathname !== WS_PATH) {
    socket.destroy();
    return;
  }
  if ((connPerIp.get(clientIp(req)) ?? 0) >= MAX_CONN_PER_IP) {
    socket.end('HTTP/1.1 429 Too Many Requests\r\nConnection: close\r\n\r\n');
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
});

server.listen(PORT, HOST, () => {
  console.log(`party-server: http://${HOST}:${PORT}  (WebSocket ${WS_PATH}, web app từ ${STATIC_DIR})`);
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    wss.close();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 2000).unref();
  });
}
