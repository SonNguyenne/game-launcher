import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: { '@': r('./apps/launcher/src') },
  },
  // CSS module trong mini app/party: test chỉ chạy luật chơi nên bỏ qua style.
  css: { modules: { localsConvention: 'camelCase' } },
  test: {
    include: ['{apps,packages,mini-apps}/**/*.test.{ts,mjs}'],
    environment: 'node',
  },
});
