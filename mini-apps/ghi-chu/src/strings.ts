import { pad2 } from '@bang/ui';

export const strings = {
  label: 'Nội dung ghi chú',
  placeholder: 'viết gì đó…',
  words: (n: number) => `${pad2(n)} từ`,
  idle: 'tự động lưu',
  saving: 'đang lưu…',
  saved: 'đã lưu',
} as const;
