import { spawn, type ChildProcess } from 'node:child_process';
import { connect } from 'node:net';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

export const PARTY_PORT = 8787;
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

/**
 * Khi chạy `vite` (dev), tự bật server phòng cho các game nhóm nếu chưa có ai bật,
 * để proxy /party luôn có chỗ nối tới. Tắt Vite thì tắt theo.
 */
export function partyServerPlugin(): Plugin {
  let child: ChildProcess | null = null;
  const stop = () => {
    child?.kill();
    child = null;
  };

  return {
    name: 'bang-party-server',
    apply: 'serve',
    async configureServer(server) {
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
