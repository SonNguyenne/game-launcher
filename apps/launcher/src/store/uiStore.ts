import { create } from 'zustand';
import { appConfig } from '@/config/app';

/** Bảng trượt nào đang mở. Mỗi loại một "kind", thêm loại mới ở đây và ở SheetHost. */
export type SheetRequest =
  | { kind: 'app-form'; appId?: string }
  | { kind: 'app-actions'; appId: string }
  | { kind: 'install' }
  | { kind: 'style' };

export interface ConfirmRequest {
  title: string;
  text: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
}

interface UiState {
  sheet: SheetRequest | null;
  confirm: ConfirmRequest | null;
  toast: { message: string; visible: boolean };
  openSheet(req: SheetRequest): void;
  closeSheet(): void;
  askConfirm(req: ConfirmRequest): void;
  closeConfirm(): void;
  notify(message: string): void;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const useUiStore = create<UiState>()((set) => ({
  sheet: null,
  confirm: null,
  toast: { message: '', visible: false },
  openSheet: (sheet) => set({ sheet }),
  closeSheet: () => set({ sheet: null }),
  askConfirm: (confirm) => set({ sheet: null, confirm }),
  closeConfirm: () => set({ confirm: null }),
  notify: (message) => {
    clearTimeout(toastTimer);
    set({ toast: { message, visible: true } });
    toastTimer = setTimeout(() => set((s) => ({ toast: { ...s.toast, visible: false } })), appConfig.toastMs);
  },
}));

/** Gọi được cả ngoài component (ví dụ trong hàm xử lý dữ liệu). */
export const notify = (message: string) => useUiStore.getState().notify(message);
