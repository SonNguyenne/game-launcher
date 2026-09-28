import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { wrapLegacyStorage } from '@/store/legacyImport';

// Phải chạy trước khi store được import để đọc được dữ liệu của bản HTML cũ.
wrapLegacyStorage();

const { App } = await import('./App');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
