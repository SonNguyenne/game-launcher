import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { appConfig } from '@/config/app';
import { randomId } from '@/lib/id';
import { createInitialState } from './defaults';
import { normalizeState } from './migrate';
import type { AppMeta, LinkAppRecord, PersistedState, Settings } from './types';

interface Actions {
  addLink(input: Omit<LinkAppRecord, 'id'>): LinkAppRecord;
  /** Sửa app link hoặc ghi đè app code, tùy id thuộc loại nào. */
  updateApp(id: string, patch: Partial<AppMeta> & { url?: string }): void;
  removeLink(id: string): void;
  resetOverride(id: string): void;
  /** Đổi chỗ app với hàng xóm trong thứ tự hiện tại. */
  move(id: string, delta: -1 | 1, currentOrder: string[]): void;
  markOpened(id: string): void;
  setAppData(id: string, value: unknown): void;
  updateSettings(patch: Partial<Settings>): void;
  replaceAll(raw: unknown, keepPin?: boolean): void;
  wipe(): void;
}

export type LauncherStore = PersistedState & Actions;

export const useLauncherStore = create<LauncherStore>()(
  persist(
    (set, get) => ({
      ...createInitialState(),

      addLink(input) {
        const record: LinkAppRecord = { id: randomId(appConfig.linkIdPrefix), ...input };
        // Không ghi vào order: app chưa có thứ hạng luôn xếp sau các app đã sắp, tức là nằm cuối bảng.
        set((s) => ({ links: [...s.links, record] }));
        return record;
      },

      updateApp(id, patch) {
        set((s) => {
          if (s.links.some((l) => l.id === id)) {
            return { links: s.links.map((l) => (l.id === id ? { ...l, ...patch } : l)) };
          }
          const { url: _ignored, ...meta } = patch;
          return { overrides: { ...s.overrides, [id]: { ...s.overrides[id], ...meta } } };
        });
      },

      removeLink(id) {
        set((s) => {
          const appData = { ...s.appData };
          delete appData[id];
          return {
            links: s.links.filter((l) => l.id !== id),
            order: s.order.filter((x) => x !== id),
            recents: s.recents.filter((x) => x !== id),
            appData,
          };
        });
      },

      resetOverride(id) {
        set((s) => {
          const overrides = { ...s.overrides };
          delete overrides[id];
          return { overrides };
        });
      },

      move(id, delta, currentOrder) {
        const order = [...currentOrder];
        const i = order.indexOf(id);
        const j = i + delta;
        if (i < 0 || j < 0 || j >= order.length) return;
        [order[i], order[j]] = [order[j], order[i]];
        set({ order });
      },

      markOpened(id) {
        set((s) => ({ recents: [id, ...s.recents.filter((x) => x !== id)].slice(0, appConfig.recentsLimit) }));
      },

      setAppData(id, value) {
        set((s) => ({ appData: { ...s.appData, [id]: value } }));
      },

      updateSettings(patch) {
        set((s) => ({ settings: { ...s.settings, ...patch } }));
      },

      replaceAll(raw, keepPin = true) {
        const pin = get().settings.pinHash;
        const next = normalizeState(raw);
        if (keepPin) next.settings.pinHash = pin;
        set(next);
      },

      wipe() {
        set(createInitialState());
      },
    }),
    {
      name: appConfig.storageKey,
      version: appConfig.storageVersion,
      storage: createJSONStorage(() => localStorage),
      partialize: (s): PersistedState => ({
        links: s.links,
        overrides: s.overrides,
        order: s.order,
        recents: s.recents,
        appData: s.appData,
        settings: s.settings,
      }),
      // Đọc được cả dữ liệu thô của bản HTML trước (không có vỏ { state, version }).
      migrate: (persisted) => normalizeState(persisted),
      merge: (persisted, current) => ({ ...current, ...normalizeState(persisted) }),
    },
  ),
);

/** Xuất đúng phần dữ liệu cần sao lưu, bỏ mã PIN. */
export function selectExportPayload(s: PersistedState) {
  return { ...s, settings: { ...s.settings, pinHash: null } };
}
