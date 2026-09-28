const monoStack = '"IBM Plex Mono", "Noto Sans Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace';

/** `ui` là font chữ chính của giao diện; kiểu "dễ nhìn" đổi nó sang sans (xem looks.ts). */
export const fontFamily = {
  ui: monoStack,
  mono: monoStack,
} as const;

/**
 * Nguồn font web; đổi font chỉ cần sửa ở đây và fontFamily.
 * Nạp cả hai họ, trình duyệt chỉ tải file của họ đang được dùng.
 */
export const fontSource =
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Be+Vietnam+Pro:wght@400;600&display=swap';

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
