import type { KeyColorId, StyleCustom, ThemeMode, UiLook } from '@bang/ui';
import type { ColumnCount } from '@/config/app';

/** Thông tin hiển thị có thể chỉnh trên giao diện, dùng chung cho mọi loại app. */
export interface AppMeta {
  name: string;
  group: string;
  color: KeyColorId;
  hidden: boolean;
}

/** App dạng link: toàn bộ thông tin do người dùng nhập, lưu trong store. */
export interface LinkAppRecord extends AppMeta {
  id: string;
  url: string;
}

/** Lớp ghi đè cho app code: chỉ lưu những gì người dùng đã đổi. */
export type AppOverride = Partial<AppMeta>;

export interface Settings {
  theme: ThemeMode;
  look: UiLook;
  /** Chỉ lưu phần người dùng đã đổi so với mặc định của kiểu hiển thị. */
  custom: Partial<StyleCustom>;
  columns: ColumnCount;
}

export interface PersistedState {
  links: LinkAppRecord[];
  overrides: Record<string, AppOverride>;
  order: string[];
  recents: string[];
  appData: Record<string, unknown>;
  settings: Settings;
}
