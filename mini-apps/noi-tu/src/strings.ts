export type Seconds = '10' | '15' | '20';
export type CheckMode = 'dict' | 'vote';

export const strings = {
  title: 'nối từ',
  rule: 'Lần lượt nói một từ 2 tiếng, tiếng đầu phải trùng tiếng cuối của từ trước (ví dụ: "học sinh" rồi "sinh viên"). Không lặp từ đã dùng. Mỗi lượt có đồng hồ, hết giờ là bị loại; ai trụ lại cuối cùng thắng. Từ lạ không có trong từ điển thì cả phòng bỏ phiếu.',
  secondsLabel: 'mỗi lượt',
  secondsOptions: { '10': '10 giây', '15': '15 giây', '20': '20 giây' } satisfies Record<Seconds, string>,
  checkLabel: 'từ lạ',
  checkOptions: { dict: 'chỉ từ điển', vote: 'cho bỏ phiếu' } satisfies Record<CheckMode, string>,

  firstWord: 'bạn mở màn, nói từ 2 tiếng bất kỳ',
  yourMove: 'tới lượt bạn',
  waitMove: (name: string) => `${name} đang nghĩ…`,
  watching: 'bạn đang xem',
  out: 'bạn đã bị loại, ngồi xem tiếp',
  placeholderFirst: 'ví dụ: học sinh',
  placeholderNext: 'tiếng thứ hai',
  send: 'nối',
  hint: (n: number) => `gợi ý (${n})`,
  hintNone: 'hết từ để gợi ý',
  hintIs: (w: string) => `gợi ý: ${w}`,
  loadingDict: 'đang tải từ điển…',
  seconds: (n: number) => `${n}`,
  chainEmpty: 'chưa có từ nào',
  chainCount: (n: number) => `${n} từ`,
  inputLabel: 'từ của bạn',

  errSyllables: 'cần đúng 2 tiếng, chỉ gồm chữ cái',
  errLink: (s: string) => `phải bắt đầu bằng "${s}"`,
  errUsed: 'từ này đã dùng rồi',
  errUnknown: 'không có trong từ điển',

  voteTitle: (name: string, word: string) => `${name} nói "${word}"`,
  voteAsk: 'từ này có nghĩa không?',
  voteWait: (n: number) => `chờ ${n} người bỏ phiếu`,
  voteYourTurn: (name: string) => `${name} bỏ phiếu`,
  accept: 'được',
  reject: 'không được',
  voted: 'đã bỏ phiếu, chờ người khác',

  evAccepted: (w: string) => `cả phòng chấp nhận "${w}"`,
  evRejected: (w: string) => `"${w}" bị bác, nói từ khác`,
  evOut: (name: string) => `${name} hết giờ, bị loại`,
  won: (name: string) => `${name} thắng`,
  wins: 'ván thắng',
  newGame: 'ván mới',
  waitNewGame: 'chờ chủ phòng mở ván mới',
};
