const monoStack = '"IBM Plex Mono", "Noto Sans Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace';

/**
 * `ui` là font chữ chính của giao diện; kiểu "dễ nhìn" đổi nó sang sans (xem looks.ts).
 * `display` cho số và tiêu đề lớn (đồng hồ, mã phòng, tên phím), `hand` cho nhãn viết tay nhỏ.
 * Kiểu "board" dùng mono cho cả ba; kiểu "quán" dùng chữ bảng hiệu và chữ viết tay.
 */
export const fontFamily = {
  ui: monoStack,
  mono: monoStack,
  display: monoStack,
  hand: monoStack,
} as const;

export const fontSize = {
  xs: '11px',
  sm: '12px',
  md: '13px',
  base: '14px',
  lg: '15px',
  xl: '16px',
  '2xl': '18px',
  display: '44px',
  hero: 'clamp(72px, 26vw, 120px)',
} as const;

export const fontWeight = { regular: '400', medium: '500' } as const;

export const lineHeight = { tight: '1.1', snug: '1.25', normal: '1.5', relaxed: '1.65' } as const;

export const letterSpacing = { tight: '-0.04em', tighter: '-0.05em', normal: '0' } as const;
