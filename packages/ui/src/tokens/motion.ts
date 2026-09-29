export const duration = {
  fast: '120ms',
  base: '200ms',
  slide: '240ms',
  reveal: '280ms',
  /** Nội dung xuất hiện lần đầu (phím bảng app, thẻ kết quả). */
  enter: '460ms',
} as const;

export const easing = {
  out: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  /** Giảm tốc mạnh, dừng êm: dùng cho vật xuất hiện và nhả phím. */
  expo: 'cubic-bezier(0.16, 1, 0.3, 1)',
  linear: 'linear',
} as const;

/** Số mili giây dùng trong JS phải khớp với duration ở trên. */
export const durationMs = { slide: 240, reveal: 280 } as const;
