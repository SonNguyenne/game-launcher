export type Rounds = '1' | '3' | '5';

/** Năm hệ theo thứ tự tương sinh: Mộc sinh Hỏa, Hỏa sinh Thổ, Thổ sinh Kim, Kim sinh Thủy, Thủy sinh Mộc. */
export const heNames = ['mộc', 'hỏa', 'thổ', 'kim', 'thủy'] as const;
export const heGlyph = ['木', '火', '土', '金', '水'] as const;

export const actNames = { gui: 'gửi', sinh: 'sinh', khac: 'khắc' } as const;
export type Act = keyof typeof actNames;

export const strings = {
  title: 'bài màu',
  rule: 'Bài ngũ hành cho 2–6 người, ai đánh hết bài trước thì về. Bộ 60 lá: 5 hệ (mộc, hỏa, thổ, kim, thủy) số 1–9, mỗi hệ thêm 3 lá gửi, sinh, khắc. Nối lá cùng hệ, cùng số, hoặc theo tương sinh (mộc→hỏa→thổ→kim→thủy→mộc): lá hệ được sinh ra nối lên với số lớn hơn. Đánh nhiều lá cùng số một lần, hoặc đủ 5 hệ một lúc (bộ ngũ hành) bất kể lá trên bàn. Gửi: tặng 1 lá cho người khác. Sinh: đánh tiếp ngay 1 lá hệ con, không có thì bốc 1. Khắc: ai đang giữ lá hệ bị khắc phải bốc 1. Không đánh được thì bốc 1 lá, lá bốc nối được thì đánh luôn. Hết ván, bài còn trên tay thành điểm phạt (số theo mặt lá, lá hành động 10, về bằng bộ ngũ hành phạt thêm 10). Sau số ván đã chọn, ít điểm phạt nhất thắng.',

  roundsLabel: 'số ván',
  roundsOptions: { '1': '1 ván', '3': '3 ván', '5': '5 ván' } satisfies Record<Rounds, string>,

  passTo: (name: string) => `chuyền máy cho ${name}`,
  passHint: 'Chỉ người đó nhìn bài. Chạm để xem.',
  tapToSee: 'chạm để xem bài',

  round: (n: number, total: number) => `ván ${n}/${total}`,
  deck: (n: number) => `nọc ${n}`,
  cards: (n: number) => `${n} lá`,
  penalty: (n: number) => `${n} điểm`,
  yourTurn: 'tới lượt bạn',
  sinhTurn: (he: string) => `sinh: đánh tiếp lá hệ ${he}, hoặc bốc 1`,
  drawnTurn: 'lá vừa bốc nối được: đánh luôn hoặc giữ',
  waitTurn: (name: string) => `${name} đang đánh`,
  watching: 'bạn đang xem',

  play: 'đánh',
  playN: (n: number) => (n > 1 ? `đánh ${n} lá` : 'đánh'),
  draw: 'bốc 1 lá',
  drawEnd: 'bốc 1 lá, hết lượt',
  keep: 'giữ, hết lượt',
  clear: 'bỏ chọn',
  setHint: 'Chạm nhiều lá cùng số để đánh một lần, hoặc 5 lá đủ 5 hệ. Thứ tự chạm là thứ tự đánh, lá chạm cuối nằm trên.',
  invalid: 'chưa nối được',
  ngu: 'bộ ngũ hành',

  giveTitle: 'gửi 1 lá cho ai?',
  givePick: 'chọn lá muốn gửi',
  giveTo: 'gửi cho',
  cancel: 'thôi',

  evPlay: (name: string, what: string) => `${name} đánh ${what}`,
  evDraw: (name: string) => `${name} bốc 1 lá`,
  evPass: (name: string) => `${name} hết lượt`,
  evKhac: (names: string) => `bị khắc, bốc 1: ${names}`,
  evKhacNone: 'không ai bị khắc',
  evGive: (a: string, b: string) => `${a} gửi 1 lá cho ${b}`,
  evEmpty: 'hết nọc, không bốc được',

  roundOver: (name: string | null) => (name ? `${name} về` : 'bí cả bàn, hết ván'),
  roundNgu: 'về bằng bộ ngũ hành, cả bàn phạt thêm 10',
  roundTable: 'điểm phạt',
  thisRound: 'ván này',
  total: 'tổng',
  nextRound: 'ván tiếp',
  waitHost: 'chờ chủ phòng',
  matchWin: (name: string) => `${name} thắng chung cuộc`,
  matchTie: (names: string) => `đồng hạng: ${names}`,
  newGame: 'chơi lại từ đầu',
  you: 'bạn',
  cardLabel: (he: string, face: string) => `${face} ${he}`,
};
