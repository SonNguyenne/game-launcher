import { customValidators, isKeyColorId, isUiLook, type StyleCustom } from '@bang/ui';
import { appConfig, type ColumnCount } from '@/config/app';
import { createInitialState } from './defaults';
import type { AppOverride, LinkAppRecord, PersistedState, Settings } from './types';

type Loose = Record<string, unknown>;
const isObj = (v: unknown): v is Loose => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback);
const strArr = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

function toLink(raw: unknown): LinkAppRecord | null {
  if (!isObj(raw) || typeof raw.id !== 'string' || typeof raw.url !== 'string') return null;
  return {
    id: raw.id,
    url: raw.url,
    name: str(raw.name, raw.url),
    group: str(raw.group),
    color: isKeyColorId(raw.color) ? raw.color : 'auto',
    hidden: raw.hidden === true,
  };
}

function toOverride(raw: unknown): AppOverride {
  if (!isObj(raw)) return {};
  const o: AppOverride = {};
  if (typeof raw.name === 'string') o.name = raw.name;
  if (typeof raw.group === 'string') o.group = raw.group;
  if (isKeyColorId(raw.color)) o.color = raw.color;
  if (typeof raw.hidden === 'boolean') o.hidden = raw.hidden;
  return o;
}

function toCustom(raw: unknown): Partial<StyleCustom> {
  if (!isObj(raw)) return {};
  const out: Record<string, unknown> = {};
  for (const [k, valid] of Object.entries(customValidators)) if (valid(raw[k])) out[k] = raw[k];
  return out as Partial<StyleCustom>;
}

function toSettings(raw: unknown): Settings {
  const base = createInitialState().settings;
  if (!isObj(raw)) return base;
  const theme = raw.theme === 'light' || raw.theme === 'dark' || raw.theme === 'system' ? raw.theme : base.theme;
  // Bản HTML cũ dùng "cols", bản mới dùng "columns".
  const cols = Number(raw.columns ?? raw.cols);
  const columns = (appConfig.columnOptions as readonly number[]).includes(cols) ? (cols as ColumnCount) : base.columns;
  const look = isUiLook(raw.look) ? raw.look : base.look;
  return { theme, look, custom: toCustom(raw.custom), columns, pinHash: typeof raw.pinHash === 'string' ? raw.pinHash : null };
}

/**
 * Chuẩn hóa dữ liệu từ bất kỳ nguồn nào (localStorage cũ, file xuất, bản HTML trước).
 * Trường lạ bị bỏ qua, trường thiếu lấy mặc định; không bao giờ ném lỗi.
 */
export function normalizeState(raw: unknown): PersistedState {
  const init = createInitialState();
  if (!isObj(raw)) return init;
  const overrides: Record<string, AppOverride> = {};
  if (isObj(raw.overrides)) for (const [k, v] of Object.entries(raw.overrides)) overrides[k] = toOverride(v);

  return {
    links: Array.isArray(raw.links) ? raw.links.map(toLink).filter((l): l is LinkAppRecord => !!l) : init.links,
    overrides,
    order: strArr(raw.order),
    recents: strArr(raw.recents),
    appData: isObj(raw.appData) ? raw.appData : init.appData,
    settings: toSettings(raw.settings),
  };
}

export const looksLikeExport = (raw: unknown): raw is Loose => isObj(raw) && Array.isArray(raw.links);
