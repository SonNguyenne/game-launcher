import type { ComponentType } from 'react';

/** Nội dung file manifest.json của mỗi mini app. */
export interface MiniAppManifest {
  /** Trùng tên thư mục, chỉ gồm a-z, 0-9 và dấu gạch ngang. */
  id: string;
  name: string;
  group?: string;
  /** Một trong các màu phím của @bang/ui: auto | bone | yellow | blue | black. */
  color?: string;
  description?: string;
  version?: string;
}

/** Kho dữ liệu riêng của từng mini app, launcher lo việc lưu và đồng bộ. */
export interface MiniAppStorage<T = unknown> {
  get(): T | undefined;
  set(value: T): void;
}

/** Những gì launcher đưa cho mini app khi mở. */
export interface MiniAppContext<T = unknown> {
  appId: string;
  storage: MiniAppStorage<T>;
  /** Hiện thông báo ngắn ở đáy màn hình. */
  notify(message: string): void;
  /** Đóng mini app, quay về bảng. */
  close(): void;
}

export interface MiniAppProps<T = unknown> {
  ctx: MiniAppContext<T>;
}

export type MiniAppComponent<T = unknown> = ComponentType<MiniAppProps<T>>;
