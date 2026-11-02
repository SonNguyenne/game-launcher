export type MarketOpt = '3' | '4' | '5';

export const strings = {
  title: 'ghép làng',
  rule:
    'Cùng dựng một ngôi làng 7×7 quanh giếng làng ở giữa. Chợ mảnh luôn lật ngửa vài mảnh; tới lượt, chọn một mảnh và đặt vào ô trống kề (ngang/dọc) một mảnh đã có. Điểm tính ngay cho người đặt: ' +
    'ruộng +1 mỗi ruộng kề, +1 nếu kề ao; nhà +1 mỗi nhà kề, +2 nếu có chợ ở 8 ô quanh, +1 nếu sát giếng; ao +1 mỗi ruộng hoặc nhà kề; tre +1 mỗi nhà kề, +1 nếu ở mép làng; ' +
    'chợ +1 mỗi nhà ở 8 ô quanh (hai chợ không được kề nhau); đình +1 mỗi loại khác nhau ở 8 ô quanh (hai đình không được sát nhau). ' +
    'Mỗi người có 2 ước nguyện công khai, chỉ tính mảnh do chính mình đặt, cộng điểm khi hết ván. Một lần mỗi lượt được trả 1 điểm để thay cả chợ mảnh. ' +
    'Làng kín hoặc hết mảnh đặt được thì kết thúc, ai nhiều điểm nhất thắng. 2–5 người.',
  marketLabel: 'số mảnh ở chợ',
  marketOptions: { '3': '3 mảnh', '4': '4 mảnh', '5': '5 mảnh' } satisfies Record<MarketOpt, string>,
  kinds: ['ruộng', 'nhà', 'ao', 'tre', 'chợ', 'đình', 'giếng'],
  glyph: ['🌾', '🏠', '💧', '🎋', '🧺', '🏛', '◎'],
  kindHint: [
    '+1 mỗi ruộng kề, +1 nếu kề ao',
    '+1 mỗi nhà kề, +2 gần chợ, +1 sát giếng',
    '+1 mỗi ruộng hoặc nhà kề',
    '+1 mỗi nhà kề, +1 ở mép làng',
    '+1 mỗi nhà ở 8 ô quanh, không kề chợ khác',
    '+1 mỗi loại quanh 8 ô, không sát đình khác',
    '',
  ],
  wishes: [
    { title: 'đồng lúa', text: 'một vùng ruộng liền nhau từ 4 ô do bạn đặt', pts: 5 },
    { title: 'xóm nhỏ', text: 'một vùng nhà liền nhau từ 3 ô do bạn đặt', pts: 5 },
    { title: 'ao làng', text: '2 ao của bạn, mỗi ao kề ít nhất 2 ruộng', pts: 5 },
    { title: 'lũy tre', text: '3 bụi tre của bạn nằm ở mép làng', pts: 4 },
    { title: 'phiên chợ', text: 'một chợ của bạn có từ 4 nhà ở 8 ô quanh', pts: 5 },
    { title: 'đình làng', text: 'một đình của bạn có từ 5 loại khác nhau quanh', pts: 6 },
    { title: 'đủ nghề', text: 'bạn đã đặt đủ 6 loại mảnh', pts: 4 },
    { title: 'giữ giếng', text: '2 mảnh của bạn sát giếng (8 ô quanh)', pts: 4 },
    { title: 'đường làng', text: '4 mảnh của bạn liền một hàng ngang hoặc dọc', pts: 4 },
    { title: 'vườn ao', text: 'một ao của bạn kề ít nhất 2 bụi tre', pts: 4 },
  ],
  yourTurn: 'tới lượt bạn, chọn một mảnh',
  placeHint: (kind: string) => `chạm ô sáng để đặt ${kind}`,
  waiting: (name: string) => `${name} đang ghép`,
  watching: 'bạn đang xem',
  refresh: 'thay chợ (−1 điểm)',
  left: (n: number) => `còn ${n} mảnh`,
  won: (name: string) => `${name} thắng`,
  newGame: 'ván mới',
  waitNewGame: 'chờ chủ phòng mở ván mới',
  wishTitle: 'ước nguyện',
  points: (n: number) => `${n} điểm`,
  gain: (n: number) => `+${n}`,
  cell: (r: number, c: number, kind: string, by: string) => `hàng ${r} cột ${c}${kind ? `, ${kind}` : ', trống'}${by ? ` của ${by}` : ''}`,
  preview: (n: number) => `đặt được ${n} điểm`,
  final: (base: number, wish: number) => `${base} + ${wish} ước nguyện`,
  log: {
    place: (name: string, kind: string, n: number) => `${name} đặt ${kind} được ${n} điểm`,
    refresh: (name: string) => `${name} thay chợ mảnh`,
    end: 'làng đã thành, tính ước nguyện',
  },
};
