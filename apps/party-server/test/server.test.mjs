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
    env: { ...process.env, PORT: String(PORT), HOST: '127.0.0.1', STATIC_DIR: dir },
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

  it('phục vụ file tĩnh có nén và header bảo mật', async () => {
    const res = await fetch(`http://127.0.0.1:${PORT}/app/abc`, { headers: { 'accept-encoding': 'gzip' } });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-encoding')).toBe('gzip');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect((await fetch(`http://127.0.0.1:${PORT}/missing.js`)).status).toBe(404);
  });
});
