export type Role = 'dan' | 'soi' | 'tientri' | 'baove' | 'phuthuy' | 'thosan';
export type WolfCount = 'auto' | '1' | '2' | '3' | '4';
export type Toggle = 'auto' | 'on' | 'off';
export type TalkTime = '60' | '120' | '180' | '300';

export const roleInfo: Record<Role, { name: string; team: string; desc: string }> = {
  dan: { name: 'dân làng', team: 'phe dân', desc: 'Không có phép gì. Ban ngày tìm ra sói và bỏ phiếu treo cổ chúng.' },
  soi: { name: 'ma sói', team: 'phe sói', desc: 'Mỗi đêm cùng bầy chọn một người để cắn. Ban ngày giả làm dân.' },
  tientri: { name: 'tiên tri', team: 'phe dân', desc: 'Mỗi đêm soi một người, biết người đó có phải sói không.' },
  baove: { name: 'bảo vệ', team: 'phe dân', desc: 'Mỗi đêm che chở một người khỏi sói cắn, được che chính mình, không che cùng một người hai đêm liền.' },
  phuthuy: { name: 'phù thủy', team: 'phe dân', desc: 'Có một bình cứu và một bình độc cho cả ván. Mỗi đêm biết ai bị cắn, dùng tối đa một bình.' },
  thosan: { name: 'thợ săn', team: 'phe dân', desc: 'Khi chết (đêm hay bị treo) được bắn chết ngay một người khác.' },
};

export const roleOrder: Role[] = ['soi', 'tientri', 'baove', 'phuthuy', 'thosan', 'dan'];

export const strings = {
  title: 'ma sói',
  rule: 'Trò chơi nhập vai cho 5–12 người, app làm người dẫn trò. Mỗi người nhận một vai bí mật. Đêm xuống, sói chọn người để cắn; tiên tri soi, bảo vệ che chở, phù thủy cứu hoặc đầu độc. Ban ngày cả làng thảo luận trong thời gian giới hạn rồi bỏ phiếu treo cổ một người, hòa phiếu thì không ai chết. Thợ săn chết thì được bắn một người. Dân thắng khi hết sói, sói thắng khi số sói bằng hoặc hơn số người còn lại. Người chết được xem vai của tất cả. Chơi 1 máy: chuyền máy, ban đêm mọi người nhắm mắt, vai được gọi mở mắt cầm máy.',

  // cài đặt
  wolvesLabel: 'số sói',
  wolfOptions: { auto: 'gợi ý', '1': '1', '2': '2', '3': '3', '4': '4' } satisfies Record<WolfCount, string>,
  toggleOptions: { auto: 'gợi ý', on: 'có', off: 'không' } satisfies Record<Toggle, string>,
  talkLabel: 'thời gian thảo luận',
  talkOptions: { '60': '1 phút', '120': '2 phút', '180': '3 phút', '300': '5 phút' } satisfies Record<TalkTime, string>,
  suggestTitle: (n: number) => `${n} người, các vai sẽ chia:`,
  suggestFew: (n: number) => `Đang có ${n} người. Cần 5–12 người để chơi.`,
  suggestMany: 'Phòng hơn 12 người: 12 người đầu chơi, còn lại xem.',

  few: 'Cần ít nhất 5 người để chơi ma sói. Chủ phòng về phòng chờ, mời thêm bạn rồi bắt đầu lại.',

  // màn che
  passTo: (name: string) => `chuyền máy cho ${name}`,
  passHint: 'Chỉ người đó nhìn màn hình. Chạm để xem.',
  closeEyes: 'mọi người nhắm mắt',
  wakeUp: (role: string) => `${role} mở mắt, cầm máy`,
  wakeHint: 'Chạm khi chỉ còn vai được gọi đang nhìn.',
  tapToSee: 'chạm để xem',
  hideRole: 'che vai',
  showRole: 'xem vai của bạn',

  // giai đoạn
  revealTitle: 'nhận vai',
  yourRole: 'vai của bạn',
  packmates: (names: string) => `bầy sói: ${names}`,
  readyBtn: 'đã nhớ vai',
  readyNext: 'đã nhớ, chuyền máy tiếp',
  readyCount: (n: number, total: number) => `${n}/${total} người đã xem vai`,
  night: (n: number) => `đêm thứ ${n}`,
  day: (n: number) => `ngày thứ ${n}`,
  sleeping: 'bạn đang ngủ, chờ trời sáng',
  acting: (role: string) => `${role} đang hành động…`,
  stepNames: { baove: 'bảo vệ', soi: 'ma sói', tientri: 'tiên tri', phuthuy: 'phù thủy' } as Record<string, string>,

  guardPick: 'che chở ai đêm nay?',
  guardNo: 'đêm qua đã che người này',
  wolfPick: 'bầy sói cắn ai?',
  wolfVoted: (name: string) => `chọn ${name}`,
  wolfWait: 'chờ cả bầy chọn xong',
  seerPick: 'soi ai đêm nay?',
  seerIs: (name: string, wolf: boolean) => (wolf ? `${name} là sói` : `${name} không phải sói`),
  seerDone: 'xong, nhắm mắt',
  seerLog: 'đã soi',
  witchVictim: (name: string | null) => (name ? `đêm nay sói cắn ${name}` : 'đêm nay sói không cắn ai'),
  witchSave: 'dùng bình cứu',
  witchPoison: 'đầu độc một người',
  witchPoisonPick: 'đầu độc ai?',
  witchNone: 'không dùng bình',
  witchLeft: (heal: boolean, poison: boolean) => `còn: ${[heal && 'bình cứu', poison && 'bình độc'].filter(Boolean).join(', ') || 'hết bình'}`,
  cancel: 'thôi',

  dawnDead: (names: string) => `đêm qua ${names} đã chết`,
  dawnPeace: 'đêm qua bình yên, không ai chết',
  talk: 'thảo luận',
  timeLeft: (mmss: string) => `còn ${mmss}`,
  voteNow: 'bỏ phiếu ngay',
  voteTitle: 'treo cổ ai?',
  abstain: 'không bỏ phiếu',
  voted: (n: number, total: number) => `${n}/${total} người đã bỏ phiếu`,
  votedYou: 'bạn đã bỏ phiếu, chờ mọi người',
  closeVote: 'chốt phiếu',
  hanged: (name: string) => `${name} bị treo cổ`,
  noHang: 'hòa phiếu hoặc không ai đủ phiếu, không ai bị treo',
  voteLine: (voter: string, target: string) => `${voter} → ${target}`,
  continue: 'tiếp tục',
  waitHost: 'chờ chủ phòng bấm tiếp',

  hunterTitle: (name: string) => `${name} là thợ săn, được bắn một người`,
  hunterPick: 'bắn ai?',
  hunterSkip: 'không bắn',
  hunterWait: (name: string) => `chờ thợ săn ${name} bắn`,
  shot: (a: string, b: string) => `${a} bắn chết ${b}`,

  villageWin: 'phe dân thắng, hết sói',
  wolfWin: 'phe sói thắng',
  newGame: 'ván mới',
  waitNewGame: 'chờ chủ phòng mở ván mới',

  you: 'bạn',
  dead: 'đã chết',
  deadView: 'bạn đã chết, giờ được xem vai của mọi người',
  watching: 'bạn đang xem',
  skipStuck: 'bỏ qua bước này',
  people: 'người chơi',
  log: 'diễn biến',
  logNight: (n: number, names: string) => `đêm ${n}: ${names || 'không ai chết'}`,
  logHang: (n: number, name: string) => `ngày ${n}: ${name ? `treo ${name}` : 'không treo ai'}`,
  logShot: (a: string, b: string) => `${a} (thợ săn) bắn ${b}`,
};
