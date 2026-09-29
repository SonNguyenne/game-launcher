import { basePaints, signPaint, type ColorRoles } from './colors';

/**
 * Kiểu hiển thị, độc lập với sáng/tối.
 * - board: bảng phím gốc, chữ mono nhỏ, phím sát nhau.
 * - readable: dễ nhìn, chữ sans to hơn, nút cao hơn, phím tách rời bo góc, tương phản cao.
 * - quan: quán nhậu vỉa hè; phím là biển sơn nhiều màu có hình vẽ, chữ bảng hiệu, nhấn lún như nhựa.
 */
export type UiLook = 'board' | 'readable' | 'quan';
export const uiLooks: readonly UiLook[] = ['board', 'readable', 'quan'];
export const isUiLook = (v: unknown): v is UiLook => (uiLooks as readonly unknown[]).includes(v);

/** Phần token một kiểu ghi đè; cùng tên với token gốc nên sinh ra cùng biến CSS. */
export interface LookTokens {
  fontFamily: { ui: string; display: string; hand: string };
  fontSize: Record<string, string>;
  fontWeight: { medium: string };
  letterSpacing: { tight: string; tighter: string };
  size: Record<string, string>;
  shape: Record<string, string>;
  light: ColorRoles;
  dark: ColorRoles;
}

export const sansStack = '"Be Vietnam Pro", "Segoe UI", Roboto, system-ui, sans-serif';
export const displayStack = '"Be Vietnam Pro", "Segoe UI", Roboto, system-ui, sans-serif';
const handStack = '"Be Vietnam Pro", system-ui, sans-serif';

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

/**
 * Giao diện sôi động (Party & Arcade Hub) cho giới trẻ.
 * Sáng: nền sương tuyết mát mắt, thẻ ứng dụng trắng nổi bật.
 * Tối: đá đêm obsidian hiện đại, thẻ gaming tương phản cao.
 */
const partyLight = {
  bg: '#F8FAFC',
  card: '#FFFFFF',
  cardRaised: '#F1F5F9',
  ink: '#0F172A',
  inkMid: '#475569',
  inkLow: '#94A3B8',
  line: '#CBD5E1',
  lineSoft: '#E2E8F0',
  coral: '#FF4757',
  danger: '#E11D48',
} as const;

const partyDark = {
  bg: '#0B0F19',
  card: '#131B2E',
  cardRaised: '#1E293B',
  text: '#F8FAFC',
  textMid: '#94A3B8',
  textLow: '#64748B',
  line: '#26344E',
  lineSoft: '#1A2438',
  coral: '#FF5252',
  danger: '#FF4D6D',
  red2: '#FF4757',
  yellow2: '#FFC000',
  green2: '#05C46B',
  blue2: '#3867D6',
} as const;

const readable: LookTokens = {
  fontFamily: { ui: sansStack, display: sansStack, hand: sansStack },
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
    ...basePaints,
  },
  dark: {
    bg: cool.deep, cell: cool.deepCell, cellRaised: cool.deepCellRaised,
    ink: cool.frost, inkSecondary: cool.frostDim, inkMuted: cool.frostMuted,
    rule: cool.deepLine, ruleSoft: cool.deepLineSoft,
    accent: cool.signalOrange, onAccent: cool.navy,
    danger: cool.redBright, onDanger: cool.navy,
    scrim: 'rgba(0, 0, 0, 0.7)', frameBg: cool.white,
    dock: cool.deep, onDock: cool.frost, shadow: 'transparent',
    ...basePaints,
  },
};

const quan: LookTokens = {
  fontFamily: { ui: sansStack, display: displayStack, hand: handStack },
  fontSize: {
    xs: '12px', sm: '13px', md: '15px', base: '16px', lg: '17px', xl: '19px', '2xl': '24px',
    display: '48px', hero: 'clamp(56px, 16vw, 76px)',
  },
  fontWeight: { medium: '700' },
  letterSpacing: { tight: '-0.02em', tighter: '-0.03em' },
  size: { control: '46px', button: '44px', bar: '54px', row: '54px', tool: '64px' },
  shape: {
    gridGap: '12px 10px',
    gridPad: '0 14px 24px',
    gridLine: 'var(--bg)',
    keyRadius: '16px',
    keyOutline: '0',
    keyShadow: '0 0 0 transparent',
    keyLip: '4px',
    controlRadius: '12px',
    markDisplay: 'grid',
    indexDisplay: 'inline',
  },
  light: {
    bg: partyLight.bg, cell: partyLight.card, cellRaised: partyLight.cardRaised,
    ink: partyLight.ink, inkSecondary: partyLight.inkMid, inkMuted: partyLight.inkLow,
    rule: partyLight.line, ruleSoft: partyLight.lineSoft,
    accent: partyLight.coral, onAccent: '#FFFFFF',
    danger: partyLight.danger, onDanger: '#FFFFFF',
    scrim: 'rgba(15, 23, 42, 0.45)', frameBg: partyLight.card,
    dock: partyLight.ink, onDock: partyLight.bg, shadow: 'rgba(15, 23, 42, 0.1)',
    paintRed: signPaint.red, paintYellow: signPaint.yellow, paintGreen: signPaint.green, paintBlue: signPaint.blue,
    paintInk: signPaint.ink, paintPaper: signPaint.paper,
  },
  dark: {
    bg: partyDark.bg, cell: partyDark.card, cellRaised: partyDark.cardRaised,
    ink: partyDark.text, inkSecondary: partyDark.textMid, inkMuted: partyDark.textLow,
    rule: partyDark.line, ruleSoft: partyDark.lineSoft,
    accent: partyDark.coral, onAccent: '#0B0F19',
    danger: partyDark.danger, onDanger: '#FFFFFF',
    scrim: 'rgba(0, 0, 0, 0.72)', frameBg: partyDark.card,
    dock: partyDark.card, onDock: partyDark.text, shadow: 'rgba(0, 0, 0, 0.45)',
    paintRed: partyDark.red2, paintYellow: partyDark.yellow2, paintGreen: partyDark.green2, paintBlue: partyDark.blue2,
    paintInk: signPaint.ink, paintPaper: signPaint.paper,
  },
};

/** Token riêng của mọi kiểu trừ "board" (board dùng token gốc). */
export const lookTokens: Record<Exclude<UiLook, 'board'>, LookTokens> = { readable, quan };
