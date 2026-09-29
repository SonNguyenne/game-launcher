export type Level = 'nhe' | 'vua' | 'cang';

/** safe: không phải uống. again: quay thêm lần nữa, giữ nguyên lượt. */
export interface Slice {
  short: string;
  text: string;
  kind?: 'safe' | 'again';
}

export const strings = {
  title: 'vòng quay phạt',
  rule: 'Tới lượt ai thì người đó quay. Kim chỉ vào ô nào, làm theo ô đó. Chủ phòng chọn mức nhẹ, vừa hay căng ở phòng chờ.',
  spin: 'quay',
  spinning: 'đang quay…',
  wait: (name: string) => `chờ ${name} quay`,
  levelLabel: 'mức',
  levels: { nhe: 'nhẹ', vua: 'vừa', cang: 'căng' } satisfies Record<Level, string>,
  spinAgain: 'quay tiếp',
  history: 'vừa rồi',
  /** Mỗi mức một vòng 8 ô, theo chiều kim đồng hồ từ đỉnh. */
  wheels: {
    nhe: [
      { short: '1 ngụm', text: 'nhấp 1 ngụm' },
      { short: 'được miễn', text: 'được miễn lượt này', kind: 'safe' },
      { short: 'hát 1 câu', text: 'hát 1 câu bất kỳ, không hát thì nhấp 1 ngụm' },
      { short: 'bên trái', text: 'người bên trái nhấp 1 ngụm' },
      { short: 'quay lại', text: 'quay thêm lần nữa', kind: 'again' },
      { short: 'cụng ly', text: 'cụng ly với người đối diện, cùng nhấp' },
      { short: 'bên phải', text: 'người bên phải nhấp 1 ngụm' },
      { short: 'kể chuyện', text: 'kể 1 chuyện vui, cả bàn không cười thì nhấp 1 ngụm' },
    ],
    vua: [
      { short: '1 ly', text: 'uống 1 ly' },
      { short: 'được miễn', text: 'được miễn lượt này', kind: 'safe' },
      { short: 'nửa ly', text: 'uống nửa ly' },
      { short: 'chỉ định', text: 'chỉ định 1 người uống nửa ly' },
      { short: 'quay lại', text: 'quay thêm lần nữa', kind: 'again' },
      { short: 'bên trái', text: 'người bên trái uống nửa ly' },
      { short: 'cả bàn', text: 'cả bàn cùng uống 1 ngụm' },
      { short: 'bên phải', text: 'người bên phải uống nửa ly' },
    ],
    cang: [
      { short: '1 ly trọn', text: 'uống 1 ly, không nghỉ' },
      { short: '2 người', text: 'chỉ định 2 người uống 1 ly' },
      { short: 'tay trái', text: 'uống 1 ly bằng tay không thuận' },
      { short: 'quay tiếp', text: 'uống nửa ly rồi quay tiếp', kind: 'again' },
      { short: 'cả bàn', text: 'cả bàn uống 1 ly, trừ bạn', kind: 'safe' },
      { short: 'đối diện', text: 'bạn và người đối diện uống 1 ly' },
      { short: '2 ly', text: 'uống 2 ly, được nghỉ giữa chừng' },
      { short: 'luật mới', text: 'đặt 1 luật cho bàn đến hết ván, ai phạm uống 1 ngụm', kind: 'safe' },
    ],
  } satisfies Record<Level, readonly Slice[]>,
} as const;
