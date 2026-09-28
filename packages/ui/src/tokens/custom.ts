import { fontFamily, fontSize, fontWeight, letterSpacing } from './typography';
import { lookTokens, type UiLook } from './looks';

/**
 * Màu nhấn người dùng chọn: tô phím "vừa dùng", viền focus, công tắc bật.
 * Không trùng với keyColors để phím vừa dùng luôn phân biệt được.
 */
export const accentColors = {
  peach: { label: 'đào', fill: '#F59762', text: '#232220' },
  orange: { label: 'cam', fill: '#F05A24', text: '#141414' },
  green: { label: 'lá', fill: '#1FA971', text: '#0F1A2A' },
  teal: { label: 'ngọc', fill: '#0FA3B1', text: '#0F1A2A' },
  violet: { label: 'tím', fill: '#7C5CFF', text: '#FFFFFF' },
  pink: { label: 'hồng', fill: '#E8508A', text: '#141414' },
} as const;

export type AccentId = keyof typeof accentColors;
export const accentIds = Object.keys(accentColors) as AccentId[];

export const fontScales = { sm: 0.9, md: 1, lg: 1.12, xl: 1.25 } as const;
export type FontScaleId = keyof typeof fontScales;
export const fontScaleIds = Object.keys(fontScales) as FontScaleId[];

export type FontId = 'mono' | 'sans';
export const fontIds: readonly FontId[] = ['mono', 'sans'];

/** Bo góc [phím, nút và ô nhập]. */
export const cornerSizes = {
  square: ['0', '0'],
  soft: ['8px', '6px'],
  round: ['14px', '10px'],
} as const;
export type CornerId = keyof typeof cornerSizes;
export const cornerIds = Object.keys(cornerSizes) as CornerId[];

export type SpacingId = 'tight' | 'airy';
export const spacingIds: readonly SpacingId[] = ['tight', 'airy'];

export interface StyleCustom {
  accent: AccentId;
  scale: FontScaleId;
  font: FontId;
  corners: CornerId;
  spacing: SpacingId;
}

/** Giá trị mỗi kiểu hiển thị tự có. Phần người dùng chỉnh chồng lên trên. */
export const lookDefaults: Record<UiLook, StyleCustom> = {
  board: { accent: 'orange', scale: 'md', font: 'mono', corners: 'square', spacing: 'tight' },
  readable: { accent: 'orange', scale: 'md', font: 'sans', corners: 'round', spacing: 'airy' },
  soft: { accent: 'peach', scale: 'md', font: 'sans', corners: 'round', spacing: 'airy' },
};

const oneOf = <T extends string>(ids: readonly T[]) => (v: unknown): v is T => typeof v === 'string' && (ids as readonly string[]).includes(v);

/** Kiểm tra từng trường, bỏ trường sai. Dùng khi đọc dữ liệu đã lưu. */
export const customValidators: { [K in keyof StyleCustom]: (v: unknown) => v is StyleCustom[K] } = {
  accent: oneOf(accentIds),
  scale: oneOf(fontScaleIds),
  font: oneOf(fontIds),
  corners: oneOf(cornerIds),
  spacing: oneOf(spacingIds),
};

export const resolveStyle = (look: UiLook, custom: Partial<StyleCustom> = {}): StyleCustom => ({ ...lookDefaults[look], ...custom });

/**
 * Biến CSS cho phần khác với mặc định của kiểu hiển thị.
 * ThemeProvider gán chúng inline lên <html>, nên thắng biến sinh từ token ở cả sáng lẫn tối.
 */
export function customStyleVars(look: UiLook, custom: Partial<StyleCustom> = {}): Record<string, string> {
  const base = lookDefaults[look];
  const c = resolveStyle(look, custom);
  const vars: Record<string, string> = {};

  if (c.accent !== base.accent) {
    vars['--accent'] = accentColors[c.accent].fill;
    vars['--on-accent'] = accentColors[c.accent].text;
  }
  if (c.font !== base.font) {
    const sans = c.font === 'sans';
    const r = lookTokens.readable;
    vars['--font-ui'] = sans ? r.fontFamily.ui : fontFamily.mono;
    vars['--fw-medium'] = sans ? r.fontWeight.medium : fontWeight.medium;
    vars['--ls-tight'] = sans ? r.letterSpacing.tight : letterSpacing.tight;
    vars['--ls-tighter'] = sans ? r.letterSpacing.tighter : letterSpacing.tighter;
  }
  if (c.scale !== 'md') {
    // Nhân trên cỡ chữ của kiểu hiện tại. Biến CSS không tự tham chiếu được nên lấy lại từ token.
    const sizes: Record<string, string> = { ...fontSize, ...(look === 'board' ? {} : lookTokens[look].fontSize) };
    for (const [k, v] of Object.entries(sizes)) vars[`--fs-${k}`] = `calc(${v} * ${fontScales[c.scale]})`;
  }
  if (c.corners !== base.corners) {
    const [key, control] = cornerSizes[c.corners];
    vars['--key-radius'] = key;
    vars['--control-radius'] = control;
  }
  if (c.spacing !== base.spacing) {
    const airy = c.spacing === 'airy';
    vars['--grid-gap'] = airy ? '8px' : 'var(--size-rule)';
    vars['--grid-pad'] = airy ? '8px' : '0';
    vars['--grid-line'] = airy ? 'var(--bg)' : 'var(--rule)';
    vars['--key-outline'] = airy ? '1px' : '0';
  }
  return vars;
}
