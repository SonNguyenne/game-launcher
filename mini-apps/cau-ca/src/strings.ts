/** safe: an toàn, không bị phạt. */
export interface Penalty {
  short: string;
  text: string;
  safe?: boolean;
}

export type PunishMode = 'wheel' | 'lots';
/** Cách phạt cuối ván chọn trước khi chơi; off: hết bài là xong, không phạt. */
export type Finale = PunishMode | 'off';

export const strings = {
  title: 'câu cá',
  rule: 'Lật 2 lá: trùng số thì câu được, +1 điểm; không trùng thì quay vòng thử thách hoặc chỉ mất lượt. Hết bài, ai nhiều điểm nhất thắng, những người còn lại chịu phạt cuối ván. Chủ phòng chọn cách phạt và cho câu được thì lật tiếp ở phòng chờ.',
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
  caughtAgain: 'câu được, +1 điểm, lật tiếp',
  penaltyLabel: 'lật trượt',
  penaltyOptions: { on: 'quay phạt', off: 'chỉ mất lượt' },
  againLabel: 'câu được',
  againOptions: { on: 'chơi tiếp', off: 'sang lượt' },
  finaleLabel: 'phạt cuối ván',
  finaleOptions: { wheel: 'quay', lots: 'bốc thăm', off: 'tắt' } satisfies Record<Finale, string>,
  settings: 'cài đặt',
  settingsTitle: 'cài đặt ván chơi',
  settingsDone: 'xong',
  hostSets: 'Chủ phòng chỉnh cài đặt.',
  missed: 'không trùng, mất lượt',
  missTitle: 'không trùng',
  missHint: 'Quay xem bạn nhận thử thách gì.',
  /** Vòng phạt khi lật trượt. */
  penalties: [
    { short: '1 ngụm', text: 'uống 1 ngụm đồ uống' },
    { short: 'được miễn', text: 'thoát, an toàn lần này', safe: true },
    { short: '2 ngụm', text: 'uống 2 ngụm đồ uống' },
    { short: 'thử thách', text: 'làm 1 thử thách do cả bàn giao' },
    { short: 'kéo người', text: 'chỉ định 1 người chịu phạt cùng' },
    { short: 'hát 1 câu', text: 'hát 1 câu bài hát bất kỳ' },
  ] satisfies Penalty[],

  scoreboard: 'bảng điểm',
  pointsTotal: (n: number) => `${n} điểm`,
  winner: (names: string, points: number) => `${names} thắng với ${points} điểm`,
  allTie: 'Hòa cả bàn, không ai bị phạt.',

  punishTitle: (name: string) => `thử thách cuối ván: ${name}`,
  punishHint: { wheel: 'Quay vòng thử thách cuối ván.', lots: 'Bốc 1 trong 6 lá thăm.' } satisfies Record<PunishMode, string>,
  lot: (n: number) => `lá thăm ${n}`,
  pickLot: 'chọn một lá thăm',
  waitLot: (name: string) => `chờ ${name} bốc thăm`,
  punishDetail: 'phạt cuối ván',
  /** Hình phạt cuối ván: dùng cho cả vòng quay lẫn lá thăm. */
  finals: [
    { short: 'thắng ra lệnh', text: 'người thắng chọn thử thách cho bạn' },
    { short: 'hát 1 bài', text: 'hát trọn 1 đoạn điệp khúc bài hát' },
    { short: '5 chống đẩy', text: 'chống đẩy hoặc thụt dầu 5 cái' },
    { short: 'tay không thuận', text: 'làm 1 thử thách bằng tay không thuận' },
    { short: 'kể bí mật', text: 'bật mí 1 bí mật vui chưa ai biết' },
    { short: 'được tha', text: 'may mắn thoát, được cả bàn tha', safe: true },
  ] satisfies Penalty[],

  done: 'hết ván',
  newGame: 'chơi ván mới',
  waitNewGame: 'Chờ chủ phòng mở ván mới.',
} as const;
