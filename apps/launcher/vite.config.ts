import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { signPaint } from '../../packages/ui/src/tokens/colors';
import pkg from '../../package.json' with { type: 'json' };
import { PARTY_PORT, partyServerPlugin } from './partyServerPlugin';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  define: {
    'import.meta.env.PACKAGE_VERSION': JSON.stringify(pkg.version),
  },
  build: { target: 'es2022' },
  // Game nhóm: chuyển WebSocket /party sang server phòng (partyServerPlugin tự bật nó khi dev).
  server: {
    proxy: { '/party': { target: `ws://127.0.0.1:${PARTY_PORT}`, ws: true } },
  },
  resolve: {
    alias: {
      '@': r('./src'),
      '@mini-apps': r('../../mini-apps'),
    },
    // Mọi gói trong monorepo dùng chung một bản React.
    dedupe: ['react', 'react-dom'],
  },
  plugins: [
    react(),
    partyServerPlugin(),
    VitePWA({
      // Tự đăng ký trong UpdateWatcher, chỉ áp dụng bản mới khi đang ở bảng app.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/favicon.svg'],
      manifest: {
        name: 'bảng app',
        short_name: 'bảng app',
        description: 'Launcher cá nhân cho các web app tự làm.',
        lang: 'vi',
        display: 'standalone',
        start_url: '/',
        // Màn chờ cùng màu vàng bia với icon ghế nhựa; màu thanh trạng thái được ThemeProvider đồng bộ lúc chạy.
        background_color: signPaint.yellow,
        theme_color: signPaint.yellow,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
});
