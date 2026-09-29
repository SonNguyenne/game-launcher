export type Level = 'nhe' | 'vua' | 'cang';

/** safe: không phải uống. again: quay thêm lần nữa, giữ nguyên lượt. */
export interface Slice {
  short: string;
  text: string;
  kind?: 'safe' | 'again';
}

export const strings = {
  title: 'vòng quay thử thách',
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
      { short: '1 ngụm', text: 'uống 1 ngụm đồ uống' },
      { short: 'được miễn', text: 'được miễn lượt này, an toàn', kind: 'safe' },
      { short: 'hát 1 câu', text: 'hát 1 câu bài hát bất kỳ' },
      { short: 'bên trái', text: 'người bên trái uống 1 ngụm' },
      { short: 'quay lại', text: 'quay thêm lần nữa', kind: 'again' },
      { short: 'chúc mừng', text: 'nâng ly hoặc cụng tay với người đối diện' },
      { short: 'bên phải', text: 'người bên phải uống 1 ngụm' },
      { short: 'kể chuyện', text: 'kể 1 chuyện cười hoặc tật xấu của mình' },
    ],
    vua: [
      { short: 'thử thách', text: 'thực hiện 1 thử thách do cả bàn giao' },
      { short: 'được miễn', text: 'thoát hiểm, được miễn lượt này', kind: 'safe' },
      { short: '2 ngụm', text: 'uống 2 ngụm đồ uống' },
      { short: 'chỉ định', text: 'chỉ định 1 người chịu phạt cùng' },
      { short: 'quay lại', text: 'quay thêm lần nữa', kind: 'again' },
      { short: 'bên trái', text: 'người bên trái chịu phạt nhẹ' },
      { short: 'cả bàn', text: 'cả bàn cùng nâng ly hoặc high-five' },
      { short: 'bên phải', text: 'người bên phải chịu phạt nhẹ' },
    ],
    cang: [
      { short: 'thắng ra lệnh', text: 'người bên cạnh chọn thử thách cho bạn' },
      { short: '2 người phạt', text: 'chỉ định 2 người cùng chịu phạt' },
      { short: '5 hít đất', text: 'chống đẩy hoặc nhảy lò cò 5 cái' },
      { short: 'quay tiếp', text: 'chịu 1 phạt rồi quay tiếp', kind: 'again' },
      { short: 'cả bàn phạt', text: 'cả bàn chịu phạt, trừ bạn', kind: 'safe' },
      { short: 'đối diện', text: 'bạn và người đối diện cùng chịu phạt' },
      { short: 'hát 1 bài', text: 'hát trọn vẹn 1 điệp khúc bài hát' },
      { short: 'luật mới', text: 'đặt 1 luật vui cho cả bàn đến hết ván', kind: 'safe' },
    ],
  } satisfies Record<Level, readonly Slice[]>,
} as const;
