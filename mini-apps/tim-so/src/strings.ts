export type Order = 'up' | 'random';
export type Play = 'race' | 'turns';

/** Ô vòng phạt; safe: không phải uống. */
export interface Penalty {
  short: string;
  text: string;
  safe?: boolean;
}

export const strings = {
  title: 'tìm số',
  rule: 'Các con số nằm rải rác trên màn hình, chạm đúng số được yêu cầu. Chơi cùng lúc: ai chạm trước được số đó, hết giờ ai nhiều nhất thắng. Chơi lần lượt: mỗi người tìm 1 số trong thời gian của lượt, hết giờ thì quay phạt hoặc mất lượt. Chủ phòng chỉnh ở phòng chờ.',

  orderLabel: 'kiểu tìm',
  orders: { up: 'từ bé đến lớn', random: 'ngẫu nhiên' } satisfies Record<Order, string>,
  sizeLabel: 'số lượng',
  size: (n: number) => `${n} số`,
  secondsLabel: 'thời gian',
  seconds: (n: number) => (n % 60 === 0 ? `${n / 60} phút` : `${n} giây`),
  playLabel: 'cách chơi',
  settings: 'cài đặt',
  settingsTitle: 'cài đặt vòng chơi',
  settingsDone: 'xong',
  custom: 'số khác',
  sizeRange: (min: number, max: number) => `Nhập từ ${min} đến ${max} số.`,
  secondsRange: (min: number, max: number) => `Nhập số giây, từ ${min} đến ${max}.`,
  hostSets: 'Chủ phòng chỉnh cài đặt.',
  plays: { race: 'cùng lúc', turns: 'lần lượt' } satisfies Record<Play, string>,
  turnSecondsLabel: 'mỗi lượt',
  penaltyLabel: 'hết giờ',
  penaltyOptions: { on: 'quay phạt', off: 'chỉ mất lượt' },

  start: 'bắt đầu tìm',
  shuffle: 'xáo số',
  shuffling: 'đang viết lại…',
  preview: 'bàn số vòng tới',
  look: 'hiển thị',
  lookTitle: 'hiển thị trên máy này',
  lookHint: 'Chỉ đổi cách các con số hiện trên máy của bạn, không ảnh hưởng người khác.',
  lookColor: 'màu mực',
  lookColors: { multi: 'nhiều màu', ink: 'một màu', blue: 'bút xanh' },
  lookFont: 'kiểu chữ',
  lookFonts: { hand: 'viết tay', app: 'như app', mono: 'máy chữ', serif: 'có chân' },
  lookScale: 'cỡ chữ',
  lookScales: { s: 'nhỏ', m: 'vừa', l: 'to' },
  lookTilt: 'nghiêng',
  lookTilts: { on: 'có', off: 'không' },
  waitStart: 'Chờ chủ phòng bắt đầu.',
  waitTurn: (name: string) => `Chờ ${name} bắt đầu lượt.`,
  readyRace: 'Cả phòng tìm cùng lúc, ai chạm trúng trước thì được số đó.',
  readyTurn: (name: string, secs: number, penalty: boolean) =>
    `Mỗi lượt một người tìm 1 số trong ${secs} giây. Tìm được +1 điểm, ${penalty ? 'hết giờ thì quay vòng phạt' : 'hết giờ thì mất lượt'}. ${name} đi trước.`,

  find: 'tìm',
  target: (n: number) => `tìm số ${n}`,
  timeLeft: (s: number) => `còn ${s} giây`,
  progress: (found: number, total: number) => `${found}/${total}`,
  progressLabel: (found: number, total: number) => `đã tìm ${found} trên ${total} số`,
  dot: (n: number) => `số ${n}`,
  dotFound: (n: number, name: string) => `số ${n}, ${name} đã tìm`,
  watching: (name: string) => `${name} đang tìm`,

  raceWin: (n: number) => `tìm nhiều nhất, ${n} số`,
  raceTie: (names: string, n: number) => `${names} hòa, mỗi người ${n} số`,
  raceLoser: (names: string, n: number) => `${names} tìm ít nhất (${n} số), uống`,
  nobody: 'không ai tìm được số nào, cả phòng uống',
  turnFound: (n: number) => `tìm được số ${n}, +1 điểm`,
  turnMissed: 'hết giờ, không tìm ra',
  turnMissedDetail: 'Không được điểm.',
  turnsWin: (name: string, n: number) => `Hết số trên bàn. ${name} thắng với ${n} điểm.`,
  turnsTie: (names: string, n: number) => `Hết số trên bàn. ${names} hòa, mỗi người ${n} điểm.`,
  missTitle: 'hết giờ',
  missHint: 'Quay xem phải uống bao nhiêu.',
  /** Vòng phạt khi hết giờ mà chưa tìm ra. */
  penalties: [
    { short: '1 ngụm', text: 'nhấp 1 ngụm' },
    { short: 'được miễn', text: 'thoát, được miễn lần này', safe: true },
    { short: '2 ngụm', text: 'nhấp 2 ngụm' },
    { short: 'nửa ly', text: 'uống nửa ly' },
    { short: 'kéo người', text: 'chỉ định 1 người uống cùng 1 ngụm' },
    { short: '1 ly', text: 'uống 1 ly' },
  ] satisfies Penalty[],
  again: 'chơi vòng mới',

  scoreboard: 'bảng điểm',
  points: (n: number) => `${n} số`,
  wins: (n: number) => `thắng ${n}`,
} as const;
