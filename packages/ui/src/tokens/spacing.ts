/** Thang khoảng cách 2px; đặt tên theo bội số để dễ đoán. */
export const space = {
  0: '0',
  1: '2px',
  2: '4px',
  3: '6px',
  4: '8px',
  5: '10px',
  6: '12px',
  7: '14px',
  8: '16px',
  9: '18px',
  10: '20px',
  12: '24px',
  14: '28px',
  18: '36px',
} as const;

/** Kích thước cố định của các thành phần điều khiển. */
export const size = {
  rule: '1px',
  touch: '44px',
  control: '46px',
  button: '48px',
  bar: '52px',
  row: '56px',
  tool: '52px',
  pinKey: '72px',
  contentMax: '620px',
} as const;

export const radius = { none: '0' } as const;

/**
 * Hình khối của lưới phím và nút. Kiểu "bảng phím" mặc định: phím sát nhau, ngăn bằng đường kẻ, góc vuông.
 * Kiểu "dễ nhìn" ghi đè trong looks.ts.
 */
export const shape = {
  gridGap: 'var(--size-rule)',
  gridPad: '0',
  gridLine: 'var(--rule)',
  keyRadius: '0',
  keyOutline: '0',
  keyShadow: '0 0 0 transparent',
  controlRadius: '0',
  /** Kiểu "mềm" hiện chữ cái đầu trong ô tròn thay cho số thứ tự trên phím. */
  markDisplay: 'none',
  indexDisplay: 'inline',
} as const;

export const zIndex = {
  screen: '20',
  runner: '30',
  scrim: '50',
  sheet: '51',
  dialogScrim: '60',
  dialog: '61',
  toast: '80',
  banner: '90',
  lock: '100',
} as const;
