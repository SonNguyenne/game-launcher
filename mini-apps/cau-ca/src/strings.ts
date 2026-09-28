/** safe: không phải uống. */
export interface Penalty {
  short: string;
  text: string;
  safe?: boolean;
}

export type PunishMode = 'wheel' | 'lots';

export const strings = {
  title: 'câu cá',
  rule: 'Lật 2 lá: trùng số thì câu được, +1 điểm. Không trùng thì quay vòng phạt (chủ phòng có thể tắt, khi đó chỉ mất lượt). Hết bài, ai nhiều điểm nhất thắng, những người còn lại quay hoặc bốc thăm hình phạt.',
  ranks: ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'],
  suits: ['♠', '♣', '♥', '♦'],
  suitNames: ['bích', 'chuồn', 'cơ', 'rô'],
  pickFirst: 'lật lá thứ nhất',
  pickSecond: 'lật lá thứ hai',
  flipping: 'xem kỹ 2 lá…',
  waitPick: (name: string) => `${name} đang lật bài`,
  left: (n: number) => `còn ${n} lá`,
  shuffle: 'xáo bài',
  shuffling: 'đang xáo bài…',
  card: (rank: string, suit: string) => `lá ${rank} ${suit}`,
  faceDown: (n: number) => `lá úp số ${n}`,
  taken: (name: string) => `${name} đã câu`,

  caught: 'câu được, +1 điểm',
  penaltyLabel: 'lật trượt',
  penaltyOptions: { on: 'quay phạt', off: 'chỉ mất lượt' },
  missed: 'không trùng, mất lượt',
  missTitle: 'không trùng',
  missHint: 'Quay xem phải uống bao nhiêu.',
  spin: 'quay',
  spinning: 'đang quay…',
  waitSpin: (name: string) => `chờ ${name} quay`,
  /** Vòng phạt khi lật trượt. */
  penalties: [
    { short: '1 ngụm', text: 'nhấp 1 ngụm' },
    { short: 'được miễn', text: 'thoát, được miễn lần này', safe: true },
    { short: '2 ngụm', text: 'nhấp 2 ngụm' },
    { short: 'nửa ly', text: 'uống nửa ly' },
    { short: 'kéo người', text: 'chỉ định 1 người uống cùng 1 ngụm' },
    { short: '1 ly', text: 'uống 1 ly' },
  ] satisfies Penalty[],

  scoreboard: 'bảng điểm',
  pointsTotal: (n: number) => `${n} điểm`,
  winner: (names: string, points: number) => `${names} thắng với ${points} điểm`,
  allTie: 'Hòa cả bàn, không ai bị phạt.',

  punishTitle: (name: string) => `phạt cuối ván: ${name}`,
  punishHint: { wheel: 'Quay vòng phạt nặng.', lots: 'Bốc 1 trong 6 lá thăm.' } satisfies Record<PunishMode, string>,
  modeLabel: 'phạt bằng',
  modes: { wheel: 'quay', lots: 'bốc thăm' } satisfies Record<PunishMode, string>,
  lot: (n: number) => `lá thăm ${n}`,
  pickLot: 'chọn một lá thăm',
  waitLot: (name: string) => `chờ ${name} bốc thăm`,
  punishDetail: 'phạt cuối ván',
  /** Hình phạt cuối ván: dùng cho cả vòng quay lẫn lá thăm. */
  finals: [
    { short: '1 ly trọn', text: 'uống 1 ly, không nghỉ' },
    { short: '2 ly', text: 'uống 2 ly' },
    { short: 'tay trái', text: 'uống 1 ly bằng tay không thuận' },
    { short: 'hát, nửa ly', text: 'hát 1 đoạn rồi uống nửa ly' },
    { short: 'thắng chọn', text: 'người thắng chọn hình phạt cho bạn' },
    { short: 'được tha', text: 'được tha, chỉ nhấp 1 ngụm' },
  ] satisfies Penalty[],

  done: 'hết ván',
  newGame: 'chơi ván mới',
  waitNewGame: 'Chờ chủ phòng mở ván mới.',
} as const;
