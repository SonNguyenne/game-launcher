export type Role = 'quanvan' | 'votuong' | 'thaigiam' | 'thayboi' | 'ngusu';
export type Kind = 'lamAn' | 'dangLe' | 'vuCao' | 'doiChuc' | 'dangSo' | 'uyHiep' | 'giemPha' | 'xemQue' | 'thanhTra';
export type WindowSec = '8' | '12' | '20';
export type Goal = '5' | '6' | '8';

export const roleNames: Record<Role, string> = {
  quanvan: 'quan văn',
  votuong: 'võ tướng',
  thaigiam: 'thái giám',
  thayboi: 'thầy bói',
  ngusu: 'ngự sử',
};

export const roleDesc: Record<Role, string> = {
  quanvan: 'Dâng sớ: +1 ân. Can được lời gièm pha nhắm vào mình.',
  votuong: 'Uy hiếp một người: họ nộp bạn 2 bạc hoặc chịu 1 tội.',
  thaigiam: 'Gièm pha một người: họ mất 1 ân, bạn +1 bạc. Can được uy hiếp nhắm vào mình.',
  thayboi: 'Xem quẻ: lén xem chức của một người, +1 bạc.',
  ngusu: 'Thanh tra: xóa 1 tội của mình, +1 bạc. Can được lời dâng sớ của bất kỳ ai.',
};

export const kindNames: Record<Kind, string> = {
  lamAn: 'làm ăn',
  dangLe: 'dâng lễ',
  vuCao: 'vu cáo',
  doiChuc: 'đổi chức',
  dangSo: 'dâng sớ',
  uyHiep: 'uy hiếp',
  giemPha: 'gièm pha',
  xemQue: 'xem quẻ',
  thanhTra: 'thanh tra',
};

export const kindDesc: Record<Kind, string> = {
  lamAn: '+1 bạc',
  dangLe: 'nộp 3 bạc, +1 ân',
  vuCao: 'nộp 4 bạc, một người chịu 1 tội',
  doiChuc: 'nộp 1 bạc, trả chức về triều, rút chức mới',
  dangSo: '+1 ân',
  uyHiep: 'người bị chọn nộp bạn 2 bạc hoặc chịu 1 tội',
  giemPha: 'người bị chọn mất 1 ân, bạn +1 bạc',
  xemQue: 'lén xem chức một người, +1 bạc',
  thanhTra: 'xóa 1 tội của mình, +1 bạc',
};

export const strings = {
  title: 'mưu triều',
  rule: 'Lừa gạt chốn triều đình cho 2–6 người. Mỗi người giữ úp một chức (quan văn, võ tướng, thái giám, thầy bói, ngự sử), 2 bạc, 0 ân, 0 tội. Tới lượt chọn một việc: việc thường (làm ăn, dâng lễ, vu cáo, đổi chức) hoặc tấu dùng tài của một chức, có giữ chức đó hay không cũng được. Sau lời tấu, cả triều có vài giây để hặc (tố là nói dối) hoặc can (xưng chức chặn lại; lời can cũng bị hặc được). Hặc trúng: kẻ nói dối chịu 1 tội, người hặc +1 ân. Hặc sai: người bị hặc lật chức minh oan, +1 ân, việc tấu thi hành ngay; người hặc chịu 1 tội. Chức đã lật để ngửa cho tới khi đổi chức. 3 tội thì bị cách chức, ra khỏi ván. Ai đạt đủ ân trước, hoặc là người cuối còn ở triều, thì thắng.',

  windowLabel: 'thời gian hặc / can',
  windowOptions: { '8': '8 giây', '12': '12 giây', '20': '20 giây' } satisfies Record<WindowSec, string>,
  goalLabel: 'ân để thắng',
  goalOptions: { '5': '5 ân', '6': '6 ân', '8': '8 ân' } satisfies Record<Goal, string>,

  passTo: (name: string) => `chuyền máy cho ${name}`,
  passHint: 'Chỉ người đó nhìn chức của mình. Chạm để xem.',
  tapToSee: 'chạm để xem',
  hold: (name: string) => `${name}: giữ ngón tay để xem quẻ`,

  yourRole: 'chức của bạn',
  revealed: 'đã lộ',
  showRole: 'giữ để xem chức của bạn',
  notes: 'quẻ đã xem',
  note: (name: string, role: string) => `${name} là ${role}`,

  silver: 'bạc',
  favor: 'ân',
  crimes: 'tội',
  outTag: 'bị cách chức',
  you: 'bạn',

  yourTurn: 'tới lượt bạn, chọn một việc',
  waitTurn: (name: string) => `${name} đang tính kế`,
  watching: 'bạn đang xem',
  baseTitle: 'việc thường (không ai hặc được)',
  claimTitle: 'tấu dùng tài một chức (có thể bị hặc)',
  claimAs: (role: string) => `xưng ${role}`,
  pickTarget: (what: string) => `${what} ai?`,
  cancel: 'thôi',
  noMoney: (n: number) => `cần ${n} bạc`,

  windowTitle: (name: string, what: string) => `${name} tấu ${what}`,
  windowClaim: (role: string) => `tự xưng ${role}`,
  windowOn: (name: string) => `nhắm vào ${name}`,
  blockTitle: (name: string, role: string) => `${name} can, xưng ${role}`,
  countdown: (sec: number) => `${sec} giây`,
  challenge: 'hặc',
  challengeAs: (name: string) => `${name} hặc`,
  block: (role: string) => `can (xưng ${role})`,
  blockAs: (name: string, role: string) => `${name} can (xưng ${role})`,
  letGo: 'cho qua',
  letAll: 'không ai phản đối, tiếp',
  passed: 'bạn đã cho qua',
  waiting: 'chờ cả triều quyết',

  chooseTitle: (actor: string) => `${actor} uy hiếp: nộp 2 bạc hay chịu 1 tội?`,
  pay: 'nộp 2 bạc',
  takeCrime: 'chịu 1 tội',
  chooseWait: (name: string) => `chờ ${name} chọn`,

  evAct: (a: string, what: string, t?: string) => (t ? `${a} ${what} ${t}` : `${a} ${what}`),
  evTrue: (a: string, b: string, role: string) => `${b} hặc sai: ${a} đúng là ${role}, minh oan +1 ân; ${b} chịu 1 tội`,
  evLie: (a: string, b: string, role: string) => `${b} hặc trúng: ${a} không phải ${role}, chịu 1 tội; ${b} +1 ân`,
  evBlocked: (a: string, role: string) => `${a} xưng ${role} can thành công, việc tấu bị hủy`,
  evPay: (a: string, b: string) => `${a} nộp 2 bạc cho ${b}`,
  evCrime: (a: string) => `${a} chịu 1 tội`,
  evOut: (a: string) => `${a} đủ 3 tội, bị cách chức`,
  evSwap: (a: string) => `${a} đổi chức`,
  log: 'triều sự',

  won: (name: string) => `${name} được vua phong, thắng ván`,
  newGame: 'ván mới',
  waitNewGame: 'chờ chủ phòng mở ván mới',
};
