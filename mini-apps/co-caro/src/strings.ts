export type BoardSize = '15' | '19';
export type BlockRule = 'free' | 'blocked';

export const strings = {
  title: 'cờ caro',
  rule: 'Hai người thay nhau đặt X và O. Ai xếp được 5 quân liền nhau theo hàng ngang, dọc hoặc chéo trước thì thắng. Chủ phòng chọn cỡ bàn và luật chặn hai đầu ở phòng chờ. Phòng đông hơn 2 người thì 2 người đầu chơi, còn lại xem.',
  marks: ['X', 'O'] as const,
  yourMove: (mark: string) => `tới lượt bạn, đánh ${mark}`,
  waitMove: (name: string, mark: string) => `${name} đang đánh ${mark}`,
  watching: 'bạn đang xem',
  moves: (n: number) => `${n} nước`,
  cell: (row: number, col: number, mark?: string) => `ô hàng ${row} cột ${col}${mark ? `, ${mark}` : ''}`,
  won: (name: string) => `${name} thắng`,
  draw: 'hòa, kín bàn',
  newGame: 'ván mới',
  waitNewGame: 'chờ chủ phòng mở ván mới',
  undo: 'đi lại',
  score: 'tỉ số',
  sizeLabel: 'cỡ bàn',
  sizeOptions: { '15': '15 × 15', '19': '19 × 19' } satisfies Record<BoardSize, string>,
  blockLabel: 'chặn hai đầu',
  blockOptions: { free: 'vẫn thắng', blocked: 'không tính' } satisfies Record<BlockRule, string>,
};
