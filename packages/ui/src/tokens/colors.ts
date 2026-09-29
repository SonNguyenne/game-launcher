/**
 * Bảng màu gốc. Mã hex chỉ nằm trong tokens/: ở đây, looks.ts (các kiểu hiển thị) và custom.ts (màu nhấn).
 * Component không dùng hex trực tiếp, chỉ dùng biến CSS sinh ra từ đây (xem cssVars.ts).
 */
export const palette = {
  aluminum: '#E3E3DF',
  aluminumLight: '#EDEDEA',
  bone: '#F4F3EE',
  ink: '#141414',
  graphite: '#5E5E5A',
  pebble: '#61615C',
  hairline: '#BDBDB7',
  night: '#0F0E12',
  nightCell: '#141317',
  nightCellRaised: '#1C1B20',
  nightRule: '#3A3940',
  nightRuleSoft: '#2A2930',
  fog: '#E5E5E5',
  fogDim: '#A3A3A0',
  fogMuted: '#8A8A85',
  signalOrange: '#F05A24',
  signalRed: '#B81D13',
  signalRedBright: '#F0624F',
  yellow: '#FAB413',
  blue: '#0071BB',
  green: '#1F7A45',
  white: '#FFFFFF',
} as const;

/**
 * Màu sắc chủ đạo cho giao diện sôi động (arcade / party):
 * Đỏ san hô, vàng arcade, xanh bạc hà, xanh điện tử, mực slate và giấy trắng sáng.
 * Dùng cho kiểu "sôi động", ảnh minh họa và icon PWA.
 */
export const signPaint = {
  red: '#FF4757',
  yellow: '#FFC000',
  green: '#05C46B',
  blue: '#3867D6',
  ink: '#0F172A',
  paper: '#FFFFFF',
} as const;

/** Vai trò màu theo từng chế độ. Tên vai trò là tên biến CSS (--bg, --ink...). */
export interface ColorRoles {
  bg: string;
  cell: string;
  cellRaised: string;
  ink: string;
  inkSecondary: string;
  inkMuted: string;
  rule: string;
  ruleSoft: string;
  accent: string;
  onAccent: string;
  danger: string;
  onDanger: string;
  scrim: string;
  frameBg: string;
  /** Thanh công cụ dưới cùng của bảng app. */
  dock: string;
  onDock: string;
  /** Màu bóng đổ dưới phím; trong suốt ở kiểu không dùng bóng. */
  shadow: string;
  /** Bốn màu sơn cho phím, minh họa và game; chữ trên nền sơn dùng paintPaper (đỏ, xanh) hoặc paintInk (vàng). */
  paintRed: string;
  paintYellow: string;
  paintGreen: string;
  paintBlue: string;
  /** Mực và giấy cố định, không đảo theo sáng/tối: chữ đặt trên màu sơn. */
  paintInk: string;
  paintPaper: string;
}

/** Màu sơn của kiểu "board" và "readable": cùng bộ màu sơn, chữ đen/trắng của bảng gốc. */
export const basePaints = {
  paintRed: signPaint.red,
  paintYellow: palette.yellow,
  paintGreen: palette.green,
  paintBlue: palette.blue,
  paintInk: palette.ink,
  paintPaper: palette.bone,
} as const;

export const lightColors: ColorRoles = {
  bg: palette.aluminum,
  cell: palette.aluminum,
  cellRaised: palette.aluminumLight,
  ink: palette.ink,
  inkSecondary: palette.graphite,
  inkMuted: palette.pebble,
  rule: palette.ink,
  ruleSoft: palette.hairline,
  accent: palette.signalOrange,
  onAccent: palette.ink,
  danger: palette.signalRed,
  onDanger: palette.white,
  scrim: 'rgba(20, 20, 20, 0.45)',
  frameBg: palette.white,
  dock: palette.aluminum,
  onDock: palette.ink,
  shadow: 'transparent',
  ...basePaints,
};

export const darkColors: ColorRoles = {
  bg: palette.night,
  cell: palette.nightCell,
  cellRaised: palette.nightCellRaised,
  ink: palette.fog,
  inkSecondary: palette.fogDim,
  inkMuted: palette.fogMuted,
  rule: palette.nightRule,
  ruleSoft: palette.nightRuleSoft,
  accent: palette.signalOrange,
  onAccent: palette.ink,
  danger: palette.signalRedBright,
  onDanger: palette.white,
  scrim: 'rgba(0, 0, 0, 0.65)',
  frameBg: palette.white,
  dock: palette.night,
  onDock: palette.fog,
  shadow: 'transparent',
  ...basePaints,
};

/**
 * Màu phím người dùng chọn cho từng app.
 * Cam (accent) KHÔNG nằm ở đây: nó dành riêng cho "app vừa dùng".
 */
export const keyColors = {
  auto: { label: 'mặc định', fill: null, text: null },
  bone: { label: 'trắng', fill: '#FFFFFF', text: '#0F172A' },
  yellow: { label: 'vàng', fill: '#FFC000', text: '#0F172A' },
  blue: { label: 'xanh lam', fill: '#3867D6', text: '#FFFFFF' },
  red: { label: 'đỏ', fill: '#FF4757', text: '#FFFFFF' },
  green: { label: 'xanh lá', fill: '#05C46B', text: '#FFFFFF' },
  black: { label: 'đen', fill: '#0F172A', text: '#FFFFFF' },
} as const;

export type KeyColorId = keyof typeof keyColors;
export const keyColorIds = Object.keys(keyColors) as KeyColorId[];
export const isKeyColorId = (v: unknown): v is KeyColorId =>
  typeof v === 'string' && v in keyColors;
