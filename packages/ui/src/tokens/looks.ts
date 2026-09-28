import type { ColorRoles } from './colors';

/**
 * Kiểu hiển thị, độc lập với sáng/tối.
 * - board: bảng phím gốc, chữ mono nhỏ, phím sát nhau.
 * - readable: dễ nhìn, chữ sans to hơn, nút cao hơn, phím tách rời bo góc, tương phản cao.
 * - soft: mềm, thẻ trắng bo lớn trên nền be ấm, bóng nhẹ, dock tối ở dưới, màu nhấn cam đào.
 */
export type UiLook = 'board' | 'readable' | 'soft';
export const uiLooks: readonly UiLook[] = ['board', 'readable', 'soft'];
export const isUiLook = (v: unknown): v is UiLook => (uiLooks as readonly unknown[]).includes(v);

/** Phần token một kiểu ghi đè; cùng tên với token gốc nên sinh ra cùng biến CSS. */
export interface LookTokens {
  fontFamily: { ui: string };
  fontSize: Record<string, string>;
  fontWeight: { medium: string };
  letterSpacing: { tight: string; tighter: string };
  size: Record<string, string>;
  shape: Record<string, string>;
  light: ColorRoles;
  dark: ColorRoles;
}

const sansStack = '"Be Vietnam Pro", "Segoe UI", Roboto, system-ui, sans-serif';

/** Xám lạnh để phím trắng nổi rõ, không trùng tông cam "vừa dùng". */
const cool = {
  mist: '#E8ECF1',
  paper: '#FFFFFF',
  paperDim: '#F4F6F9',
  navy: '#0F1A2A',
  slate: '#34404F',
  slateLight: '#566172',
  line: '#9AA5B4',
  lineSoft: '#D3DAE3',
  deep: '#0E131A',
  deepCell: '#19212C',
  deepCellRaised: '#232C39',
  frost: '#F1F4F8',
  frostDim: '#C5CDD8',
  frostMuted: '#98A3B3',
  deepLine: '#3B4757',
  deepLineSoft: '#2A3441',
  signalOrange: '#F05A24',
  red: '#B3261E',
  redBright: '#FF7A6B',
  white: '#FFFFFF',
} as const;

/** Be ấm như giấy kraft sáng, than chì thay đen, cam đào làm điểm nhấn. */
const warm = {
  linen: '#F3F0EB',
  paper: '#FFFFFF',
  sand: '#EAE5DE',
  charcoal: '#232220',
  stone: '#5C5853',
  pebble: '#77726C',
  line: '#D9D3CB',
  lineSoft: '#ECE7E0',
  peach: '#F59762',
  red: '#C8331E',
  dock: '#262523',
  night: '#161514',
  nightCell: '#22201E',
  nightCellRaised: '#2D2A27',
  cream: '#F4F1EC',
  creamDim: '#C9C3BB',
  creamMuted: '#9A948C',
  nightLine: '#3A3632',
  nightLineSoft: '#2C2926',
  redBright: '#FF8A73',
  white: '#FFFFFF',
} as const;

const readable: LookTokens = {
  fontFamily: { ui: sansStack },
  fontSize: { xs: '13px', sm: '14px', md: '16px', base: '17px', lg: '18px', xl: '19px', '2xl': '22px', display: '48px' },
  fontWeight: { medium: '600' },
  letterSpacing: { tight: '-0.02em', tighter: '-0.03em' },
  size: { control: '54px', button: '54px', bar: '56px', row: '64px', tool: '60px' },
  shape: { gridGap: '8px', gridPad: '8px', gridLine: 'var(--bg)', keyRadius: '14px', keyOutline: '1px', controlRadius: '10px' },
  light: {
    bg: cool.mist, cell: cool.paper, cellRaised: cool.paperDim,
    ink: cool.navy, inkSecondary: cool.slate, inkMuted: cool.slateLight,
    rule: cool.line, ruleSoft: cool.lineSoft,
    accent: cool.signalOrange, onAccent: cool.navy,
    danger: cool.red, onDanger: cool.white,
    scrim: 'rgba(15, 26, 42, 0.5)', frameBg: cool.white,
    dock: cool.mist, onDock: cool.navy, shadow: 'transparent',
  },
  dark: {
    bg: cool.deep, cell: cool.deepCell, cellRaised: cool.deepCellRaised,
    ink: cool.frost, inkSecondary: cool.frostDim, inkMuted: cool.frostMuted,
    rule: cool.deepLine, ruleSoft: cool.deepLineSoft,
    accent: cool.signalOrange, onAccent: cool.navy,
    danger: cool.redBright, onDanger: cool.navy,
    scrim: 'rgba(0, 0, 0, 0.7)', frameBg: cool.white,
    dock: cool.deep, onDock: cool.frost, shadow: 'transparent',
  },
};

const soft: LookTokens = {
  fontFamily: { ui: sansStack },
  fontSize: { xs: '13px', sm: '14px', md: '15px', base: '16px', lg: '17px', xl: '18px', '2xl': '22px', display: '60px' },
  fontWeight: { medium: '600' },
  letterSpacing: { tight: '-0.03em', tighter: '-0.04em' },
  size: { control: '52px', button: '54px', bar: '64px', row: '62px', tool: '68px' },
  shape: {
    gridGap: '12px',
    gridPad: '4px 16px 16px',
    gridLine: 'var(--bg)',
    keyRadius: '24px',
    keyOutline: '0',
    keyShadow: '0 12px 28px -14px var(--shadow)',
    controlRadius: '16px',
    markDisplay: 'grid',
    indexDisplay: 'none',
  },
  light: {
    bg: warm.linen, cell: warm.paper, cellRaised: warm.sand,
    ink: warm.charcoal, inkSecondary: warm.stone, inkMuted: warm.pebble,
    rule: warm.line, ruleSoft: warm.lineSoft,
    accent: warm.peach, onAccent: warm.charcoal,
    danger: warm.red, onDanger: warm.white,
    scrim: 'rgba(35, 34, 32, 0.4)', frameBg: warm.white,
    dock: warm.dock, onDock: warm.linen, shadow: 'rgba(90, 60, 30, 0.28)',
  },
  dark: {
    bg: warm.night, cell: warm.nightCell, cellRaised: warm.nightCellRaised,
    ink: warm.cream, inkSecondary: warm.creamDim, inkMuted: warm.creamMuted,
    rule: warm.nightLine, ruleSoft: warm.nightLineSoft,
    accent: warm.peach, onAccent: warm.charcoal,
    danger: warm.redBright, onDanger: warm.charcoal,
    scrim: 'rgba(0, 0, 0, 0.6)', frameBg: warm.white,
    dock: warm.nightCellRaised, onDock: warm.cream, shadow: 'rgba(0, 0, 0, 0.6)',
  },
};

/** Token riêng của mọi kiểu trừ "board" (board dùng token gốc). */
export const lookTokens: Record<Exclude<UiLook, 'board'>, LookTokens> = { readable, soft };
