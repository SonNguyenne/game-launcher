#!/usr/bin/env node
/**
 * Server phòng chơi cho các game nhóm (mini-apps dùng @bang/party).
 *
 * - WebSocket ở đường dẫn /party: chỉ chuyển tin, không chạy luật chơi.
 *   Chủ phòng gửi trạng thái -> server lưu bản mới nhất và phát cho cả phòng.
 *   Khách gửi hành động -> server chuyển cho chủ phòng.
 * - Nếu có thư mục build của launcher (apps/launcher/dist) thì phục vụ luôn web app,
 *   nên deploy chỉ cần một process: `node apps/party-server/server.mjs`.
 *
 * Biến môi trường: PORT (8787), HOST (0.0.0.0), STATIC_DIR (../launcher/dist).
 * Giao thức giữ khớp với packages/party/src/net.ts.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

const here = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? '0.0.0.0';
const STATIC_DIR = resolve(process.env.STATIC_DIR ?? join(here, '../launcher/dist'));
const WS_PATH = '/party';

const MAX_MEMBERS = 12;
const MAX_ROOMS = 2000;
const MAX_MESSAGE = 64 * 1024;
/** Máy mất kết nối được giữ chỗ bấy lâu (khóa màn hình, đổi mạng) rồi mới bị xóa khỏi phòng. */
const OFFLINE_GRACE_MS = 90_000;
const HEARTBEAT_MS = 25_000;

/** @typedef {{ id: string, name: string, ws: import('ws').WebSocket | null, timer?: NodeJS.Timeout }} Member */
/** @typedef {{ code: string, game: string, hostId: string, members: Map<string, Member>, state: unknown }} Room */

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

const send = (ws, msg) => ws && ws.readyState === ws.OPEN && ws.send(JSON.stringify(msg));
const memberList = (room) => [...room.members.values()].map((m) => ({ id: m.id, name: m.name, online: !!m.ws }));

function broadcast(room, msg, exceptId) {
  const data = JSON.stringify(msg);
  for (const m of room.members.values()) if (m.id !== exceptId && m.ws && m.ws.readyState === m.ws.OPEN) m.ws.send(data);
}

const broadcastMembers = (room) => broadcast(room, { t: 'members', hostId: room.hostId, members: memberList(room) });

function removeMember(room, id) {
  const m = room.members.get(id);
  if (!m) return;
  clearTimeout(m.timer);
  room.members.delete(id);
  if (!room.members.size) {
    rooms.delete(room.code);
    return;
  }
  // Chủ phòng rời: người đang online vào sớm nhất lên thay, tiếp tục từ trạng thái đã lưu.
  if (room.hostId === id) {
    const next = [...room.members.values()].find((x) => x.ws) ?? room.members.values().next().value;
    room.hostId = next.id;
  }
  broadcastMembers(room);
}

const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE });

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => (ws.isAlive = true));
  /** @type {Room | null} */
  let room = null;
  let memberId = '';

  ws.on('message', (raw, isBinary) => {
    if (isBinary) return;
    let msg;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      return;
    }
    if (!msg || typeof msg.t !== 'string') return;

    if (msg.t === 'create' || msg.t === 'join') {
      if (room) return;
      const id = cleanId(msg.id);
      const name = clean(msg.name, 20);
      const game = cleanGame(msg.game);
      if (!id || !name || !game) return send(ws, { t: 'error', code: 'bad' });

      let target;
      if (msg.t === 'create') {
        const code = rooms.size < MAX_ROOMS ? newCode() : null;
        if (!code) return send(ws, { t: 'error', code: 'busy' });
        target = { code, game, hostId: id, members: new Map(), state: null };
        rooms.set(code, target);
      } else {
        target = rooms.get(clean(msg.code, 4));
        if (!target) return send(ws, { t: 'error', code: 'no-room' });
        if (target.game !== game) return send(ws, { t: 'error', code: 'wrong-game' });
        if (!target.members.has(id) && target.members.size >= MAX_MEMBERS) return send(ws, { t: 'error', code: 'full' });
      }

      // Vào lại bằng cùng id (tải lại trang, rớt mạng) thì giữ chỗ cũ và thứ tự lượt.
      const existing = target.members.get(id);
      if (existing) {
        clearTimeout(existing.timer);
        if (existing.ws && existing.ws !== ws) existing.ws.close();
        existing.ws = ws;
        existing.name = name;
      } else {
        target.members.set(id, { id, name, ws });
      }
      room = target;
      memberId = id;
      send(ws, { t: 'joined', code: room.code, hostId: room.hostId, members: memberList(room), state: room.state });
      broadcast(room, { t: 'members', hostId: room.hostId, members: memberList(room) }, id);
      return;
    }

    if (!room || room.members.get(memberId)?.ws !== ws) return;

    if (msg.t === 'state') {
      if (memberId !== room.hostId) return;
      room.state = msg.state ?? null;
      broadcast(room, { t: 'state', state: room.state }, memberId);
    } else if (msg.t === 'action') {
      if (memberId === room.hostId) return;
      send(room.members.get(room.hostId)?.ws, { t: 'action', from: memberId, action: msg.action });
    } else if (msg.t === 'leave') {
      const r = room;
      room = null;
      removeMember(r, memberId);
    }
  });

  ws.on('close', () => {
    if (!room) return;
    const r = room;
    const m = r.members.get(memberId);
    if (!m || m.ws !== ws) return;
    m.ws = null;
    m.timer = setTimeout(() => removeMember(r, m.id), OFFLINE_GRACE_MS);
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
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

async function serveStatic(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405).end();
    return;
  }
  let path;
  try {
    path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  } catch {
    res.writeHead(400).end();
    return;
  }
  if (path === '/healthz') {
    res.writeHead(200, { 'content-type': 'text/plain' }).end(`ok ${rooms.size} rooms`);
    return;
  }

  let file = resolve(STATIC_DIR, `.${path}`);
  if (file !== STATIC_DIR && !file.startsWith(STATIC_DIR + sep)) {
    res.writeHead(404).end();
    return;
  }
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
  } catch {
    // Đường dẫn của ứng dụng (/app/abc...) trả về index.html; file tĩnh thiếu thì 404.
    if (extname(path)) {
      res.writeHead(404).end();
      return;
    }
    file = join(STATIC_DIR, 'index.html');
  }

  try {
    const body = await readFile(file);
    const immutable = file.includes(`${sep}assets${sep}`);
    res.writeHead(200, {
      'content-type': types[extname(file)] ?? 'application/octet-stream',
      'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    res.writeHead(404).end();
  }
}

const server = createServer((req, res) => void serveStatic(req, res));

server.on('upgrade', (req, socket, head) => {
  if (new URL(req.url ?? '/', 'http://x').pathname !== WS_PATH) {
    socket.destroy();
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
