import { spawn, type ChildProcess } from 'node:child_process';
import { connect } from 'node:net';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

/** Đổi được bằng PARTY_PORT khi cổng 8787 đã bị app khác chiếm. */
export const PARTY_PORT = Number(process.env.PARTY_PORT) || 8787;
const serverFile = fileURLToPath(new URL('../party-server/server.mjs', import.meta.url));

/** Có tiến trình nào đang nghe ở cổng này chưa (ví dụ server phòng chạy sẵn ở terminal khác). */
function portInUse(port: number) {
  return new Promise<boolean>((resolve) => {
    const socket = connect(port, '127.0.0.1');
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
  });
}

/** Mốc vừa tự tắt server phòng; giữ trên globalThis vì Vite nạp lại file cấu hình khi khởi động lại. */
const STOPPED_AT = Symbol.for('bang-party-server-stopped-at');
const scope = globalThis as { [STOPPED_AT]?: number };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Khi chạy `vite` (dev), tự bật server phòng cho các game nhóm nếu chưa có ai bật,
 * để proxy /party luôn có chỗ nối tới. Tắt Vite thì tắt theo.
 */
export function partyServerPlugin(): Plugin {
  let child: ChildProcess | null = null;
  const stop = () => {
    if (child) scope[STOPPED_AT] = Date.now();
    child?.kill();
    child = null;
  };

  return {
    name: 'bang-party-server',
    apply: 'serve',
    async configureServer(server) {
      // Vite khởi động lại (sửa vite.config) thì server cũ vừa bị tắt nhưng chưa nhả cổng: chờ nó nhả rồi bật lại.
      const restarting = Date.now() - (scope[STOPPED_AT] ?? 0) < 5000;
      for (let i = 0; restarting && i < 20 && (await portInUse(PARTY_PORT)); i++) await sleep(150);
      if (await portInUse(PARTY_PORT)) return;
      child = spawn(process.execPath, ['--watch', serverFile], {
        env: { ...process.env, PORT: String(PARTY_PORT), HOST: '127.0.0.1' },
        stdio: 'inherit',
      });
      child.on('exit', () => (child = null));
      server.httpServer?.once('close', stop);
      process.once('exit', stop);
    },
  };
}
