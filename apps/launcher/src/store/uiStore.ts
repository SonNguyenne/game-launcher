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

export type PinMode = 'unlock' | 'setup' | 'verify';

export interface PinRequest {
  mode: PinMode;
  title: string;
  cancellable: boolean;
  onSuccess?: () => void;
}

interface UiState {
  sheet: SheetRequest | null;
  confirm: ConfirmRequest | null;
  pin: PinRequest | null;
  toast: { message: string; visible: boolean };
  openSheet(req: SheetRequest): void;
  closeSheet(): void;
  askConfirm(req: ConfirmRequest): void;
  closeConfirm(): void;
  requestPin(req: PinRequest): void;
  closePin(): void;
  notify(message: string): void;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const useUiStore = create<UiState>()((set) => ({
  sheet: null,
  confirm: null,
  pin: null,
  toast: { message: '', visible: false },
  openSheet: (sheet) => set({ sheet }),
  closeSheet: () => set({ sheet: null }),
  askConfirm: (confirm) => set({ sheet: null, confirm }),
  closeConfirm: () => set({ confirm: null }),
  requestPin: (pin) => set({ pin }),
  closePin: () => set({ pin: null }),
  notify: (message) => {
    clearTimeout(toastTimer);
    set({ toast: { message, visible: true } });
    toastTimer = setTimeout(() => set((s) => ({ toast: { ...s.toast, visible: false } })), appConfig.toastMs);
  },
}));

/** Gọi được cả ngoài component (ví dụ trong hàm xử lý dữ liệu). */
export const notify = (message: string) => useUiStore.getState().notify(message);
