import type { MiniAppComponent } from '@bang/sdk';
import type { AppMeta } from '@/store/types';

export type AppKind = 'code' | 'link';

interface BaseApp extends AppMeta {
  id: string;
  kind: AppKind;
  /** Số thứ tự 1-based trên bảng, tính theo thứ tự đã sắp xếp. */
  index: number;
}

export interface CodeApp extends BaseApp {
  kind: 'code';
  description?: string;
  load: () => Promise<{ default: MiniAppComponent }>;
}

export interface LinkApp extends BaseApp {
  kind: 'link';
  url: string;
}

export type LauncherApp = CodeApp | LinkApp;
