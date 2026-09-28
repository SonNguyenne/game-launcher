import { appConfig } from '@/config/app';

/**
 * Bản HTML một file lưu dữ liệu thô dưới cùng khóa localStorage.
 * Zustand persist cần dạng { state, version }, nên bọc lại trước khi store khởi tạo.
 */
export function wrapLegacyStorage() {
  try {
    const raw = localStorage.getItem(appConfig.storageKey);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !('state' in parsed)) {
      localStorage.setItem(appConfig.storageKey, JSON.stringify({ state: parsed, version: 1 }));
    }
  } catch {
    /* dữ liệu hỏng: để store tự khởi tạo mặc định */
  }
}
