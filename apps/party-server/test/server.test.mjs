import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';

const PORT = 18000 + Math.floor(Math.random() * 1000);
let proc;

beforeAll(async () => {
  const dir = mkdtempSync(join(tmpdir(), 'party-'));
  writeFileSync(join(dir, 'index.html'), `<!doctype html><title>t</title>${'x'.repeat(4000)}`);
  proc = spawn(process.execPath, [fileURLToPath(new URL('../server.mjs', import.meta.url))], {
    env: { ...process.env, PORT: String(PORT), HOST: '127.0.0.1', STATIC_DIR: dir, HOST_HANDOFF_MS: '300' },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  await new Promise((resolve) => proc.stdout.once('data', resolve));
});

afterAll(() => proc?.kill());

function open() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${PORT}/party`);
    ws.once('open', () => resolve(ws));
    ws.once('error', reject);
  });
}

/** Chờ tin kế tiếp có kiểu `t`. */
function next(ws, t) {
  return new Promise((resolve) => {
    const on = (d) => {
      const m = JSON.parse(String(d));
      if (m.t !== t) return;
      ws.off('message', on);
      resolve(m);
    };
    ws.on('message', on);
  });
}

const hello = (ws, msg) => ws.send(JSON.stringify({ game: 'test-game', ...msg }));

describe('party-server', () => {
  it('không phát id bí mật và không cho mạo danh chủ phòng', async () => {
    const host = await open();
    hello(host, { t: 'create', id: 'host-secret-key', name: 'Chủ' });
    const joined = await next(host, 'joined');
    expect(JSON.stringify(joined)).not.toContain('host-secret-key');

    // Khách lấy id công khai của chủ phòng làm id để vào: chỉ được một chỗ mới.
    const evil = await open();
    hello(evil, { t: 'join', code: joined.code, id: joined.hostId, name: 'Giả' });
    const evilJoined = await next(evil, 'joined');
    expect(evilJoined.you).not.toBe(joined.hostId);
    expect(evilJoined.hostId).toBe(joined.hostId);
    expect(host.readyState).toBe(WebSocket.OPEN);

    // Chủ phòng vào lại bằng đúng key bí mật thì giữ nguyên id và quyền chủ.
    host.close();
    const back = await open();
    hello(back, { t: 'join', code: joined.code, id: 'host-secret-key', name: 'Chủ' });
    const again = await next(back, 'joined');
    expect(again.you).toBe(joined.you);
    expect(again.hostId).toBe(joined.you);
    evil.close();
    back.close();
  });

  it('chuyển hành động của khách cho chủ phòng với id công khai', async () => {
    const host = await open();
    hello(host, { t: 'create', id: 'host-key-2', name: 'Chủ' });
    const { code } = await next(host, 'joined');
    const guest = await open();
    hello(guest, { t: 'join', code, id: 'guest-key-2', name: 'Khách' });
    const { you } = await next(guest, 'joined');
    guest.send(JSON.stringify({ t: 'action', action: { type: 'tap' } }));
    const action = await next(host, 'action');
    expect(action).toEqual({ t: 'action', from: you, action: { type: 'tap' } });
    host.close();
    guest.close();
  });

  it('trả giờ server cho ping, kể cả trước khi vào phòng', async () => {
    const ws = await open();
    ws.send(JSON.stringify({ t: 'ping', c: 42 }));
    const pong = await next(ws, 'pong');
    expect(pong.c).toBe(42);
    expect(Math.abs(pong.now - Date.now())).toBeLessThan(1000);
    ws.close();
  });

  it('ghép patch của chủ phòng vào trạng thái đã lưu và phát cho khách', async () => {
    const host = await open();
    hello(host, { t: 'create', id: 'host-key-3', name: 'Chủ' });
    const { code } = await next(host, 'joined');
    host.send(JSON.stringify({ t: 'state', state: { a: 1, b: 2, c: 3 } }));
    const guest = await open();
    hello(guest, { t: 'join', code, id: 'guest-key-3', name: 'Khách' });
    expect((await next(guest, 'joined')).state).toEqual({ a: 1, b: 2, c: 3 });

    host.send(JSON.stringify({ t: 'patch', set: { b: 5 }, del: ['c'] }));
    expect(await next(guest, 'patch')).toEqual({ t: 'patch', set: { b: 5 }, del: ['c'] });
    // Khách patch thì bị bỏ qua.
    guest.send(JSON.stringify({ t: 'patch', set: { a: 9 }, del: [] }));

    const late = await open();
    hello(late, { t: 'join', code, id: 'late-key-3', name: 'Muộn' });
    expect((await next(late, 'joined')).state).toEqual({ a: 1, b: 5 });
    host.close();
    guest.close();
    late.close();
  });

  it('patch khi server chưa có trạng thái thì bảo chủ phòng gửi lại cả bản', async () => {
    const host = await open();
    hello(host, { t: 'create', id: 'host-key-4', name: 'Chủ' });
    await next(host, 'joined');
    host.send(JSON.stringify({ t: 'patch', set: { a: 1 }, del: [] }));
    expect(await next(host, 'resync')).toEqual({ t: 'resync' });
    host.close();
  });

  it('chủ phòng mất kết nối lâu thì người online khác lên thay', async () => {
    const host = await open();
    hello(host, { t: 'create', id: 'host-key-5', name: 'Chủ' });
    const { code, you: hostId } = await next(host, 'joined');
    const guest = await open();
    hello(guest, { t: 'join', code, id: 'guest-key-5', name: 'Khách' });
    const { you } = await next(guest, 'joined');
    host.close();
    let m = await next(guest, 'members');
    while (m.hostId === hostId) m = await next(guest, 'members');
    expect(m.hostId).toBe(you);
    guest.close();
  });

  it('phục vụ file tĩnh có nén và header bảo mật', async () => {
    const res = await fetch(`http://127.0.0.1:${PORT}/app/abc`, { headers: { 'accept-encoding': 'gzip' } });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-encoding')).toBe('gzip');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect((await fetch(`http://127.0.0.1:${PORT}/missing.js`)).status).toBe(404);
  });
});
