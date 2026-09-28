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
  white: '#FFFFFF',
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
}

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
};

/**
 * Màu phím người dùng chọn cho từng app.
 * Cam (accent) KHÔNG nằm ở đây: nó dành riêng cho "app vừa dùng".
 */
export const keyColors = {
  auto: { label: 'mặc định', fill: null, text: null },
  bone: { label: 'trắng', fill: palette.bone, text: palette.ink },
  yellow: { label: 'vàng', fill: palette.yellow, text: palette.ink },
  blue: { label: 'xanh', fill: palette.blue, text: palette.bone },
  black: { label: 'đen', fill: palette.ink, text: palette.bone },
} as const;

export type KeyColorId = keyof typeof keyColors;
export const keyColorIds = Object.keys(keyColors) as KeyColorId[];
export const isKeyColorId = (v: unknown): v is KeyColorId =>
  typeof v === 'string' && v in keyColors;
