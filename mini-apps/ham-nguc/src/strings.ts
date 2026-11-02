import type { Card, CardGroup } from './cards';
import type { LogEntry, Mode, SeedMode } from './game';

const MONSTERS: Record<number, string>[] = [
  { 1: 'chuột cống', 2: 'dơi hang', 3: 'yêu tinh', 4: 'nhện độc' },
  { 3: 'sói xám', 4: 'cương thi', 5: 'người đá', 6: 'rết khổng lồ' },
  { 5: 'hiệp sĩ xương', 6: 'ma trơi', 7: 'quỷ lửa', 8: 'rắn hai đầu' },
];

export const strings = {
  title: 'hầm ngục',
  rule: 'Thám hiểm 3 tầng hầm, mỗi tầng là bản đồ 6 hàng × 3 ô úp. Mỗi lượt bước lên một ô ở hàng kế (chéo trái, thẳng hoặc chéo phải) và gặp lá bài ở đó: quái (mất máu bằng sức quái trừ vũ khí, thắng thì nhận vàng bằng sức quái), bẫy (gai đâm mất máu, khí độc làm tắt đuốc, sập hầm rơi thẳng xuống tầng dưới), đồ (kiếm, khiên đỡ 3 sát thương, thuốc, dầu đuốc, chìa khóa), kho báu (túi vàng, rương: có chìa thì mở, không thì phá mất 2 máu hoặc bỏ) và lửa trại (hồi máu hoặc thêm đuốc). Mỗi bước đốt 1 đuốc; còn đuốc thì soi thấy trước hàng kế, hết đuốc thì đi mò và vấp ngã mất 1 máu. Hết tầng 3 phải đánh trùm canh cửa; thoát ra được thưởng 10 vàng. Đua điểm: mỗi người một đoàn trên cùng một hầm, gục giữa đường mất nửa số vàng, nhiều vàng nhất thắng. Hợp tác: cả đội đi chung, thay nhau dẫn đường, thuốc chảy về người yếu nhất, trùm mạnh hơn theo số người nhưng cả đội cùng đánh; thoát được là thắng. Chọn "thử thách hôm nay" để mọi người cùng gặp một hầm trong ngày. Tối đa 4 người vào hầm, còn lại xem.',
  modeLabel: 'cách chơi',
  modeOptions: { race: 'đua điểm', coop: 'hợp tác' } satisfies Record<Mode, string>,
  seedLabel: 'hầm',
  seedOptions: { daily: 'thử thách hôm nay', random: 'ngẫu nhiên' } satisfies Record<SeedMode, string>,
  daily: (day: string) => `thử thách ${day.slice(8, 10)}/${day.slice(5, 7)}`,
  randomDungeon: 'hầm ngẫu nhiên',
  floorNames: ['hang đá', 'mỏ bỏ hoang', 'lăng mộ'],
  floor: (n: number, name: string) => `tầng ${n}/3 · ${name}`,
  torch: (n: number) => `đuốc ${n}`,
  gold: (n: number) => `${n} vàng`,
  teamGold: (n: number) => `đội có ${n} vàng`,
  hp: 'máu',
  weapon: 'vũ khí',
  shield: 'khiên',
  keys: 'chìa',
  where: (floor: number, row: number) => (row < 0 ? `cửa tầng ${floor}` : `tầng ${floor} · hàng ${row + 1}`),
  dead: 'đã gục',
  out: 'đã thoát',
  yourTurn: 'tới lượt bạn, chọn ô sáng để bước',
  waitTurn: (name: string) => `${name} đang dò đường`,
  watching: 'bạn đang xem',
  viewing: (name: string) => `bản đồ của ${name}`,
  entrance: 'lối vào',
  exit: 'lối xuống',
  gate: (power: number) => `trùm canh cửa · sức ${power}`,
  fightBoss: 'đánh trùm',
  hidden: 'ô úp',
  chestAsk: (v: number) => `rương ${v} vàng, không có chìa`,
  chestOpen: 'phá rương (−2 máu)',
  chestSkip: 'bỏ qua',
  campAsk: 'lửa trại',
  campHeal: (coop: boolean) => (coop ? 'cả đội sưởi (+2 máu)' : 'nghỉ (+3 máu)'),
  campTorch: 'thắp đuốc (+3)',
  log: 'nhật ký',
  results: 'kết quả',
  coopWin: 'cả đội đã thoát khỏi hầm!',
  coopLose: 'cả đội đã gục trong hầm',
  raceWin: (names: string) => `${names} thắng`,
  newGame: 'ván mới',
  waitNewGame: 'chờ chủ phòng mở ván mới',
  rulesTitle: 'luật chơi',
  groups: { monster: 'quái', trap: 'bẫy', item: 'đồ', treasure: 'kho báu', camp: 'lửa trại' } satisfies Record<CardGroup, string>,
};

/** Tên lá bài để hiện trên ô. */
export function cardName(c: Card, floor: number): string {
  switch (c.t) {
    case 'monster':
      return MONSTERS[floor]?.[c.v] ?? 'quái';
    case 'spikes':
      return 'bẫy gai';
    case 'gas':
      return 'khí độc';
    case 'pit':
      return 'sập hầm';
    case 'blade':
      return 'kiếm';
    case 'shield':
      return 'khiên';
    case 'potion':
      return 'thuốc';
    case 'oil':
      return 'dầu đuốc';
    case 'key':
      return 'chìa khóa';
    case 'gold':
      return 'túi vàng';
    case 'chest':
      return 'rương';
    case 'camp':
      return 'lửa trại';
  }
}

/** Con số trên ô: sức quái, sát thương, giá trị đồ. */
export function cardValue(c: Card): string {
  switch (c.t) {
    case 'monster':
      return `⚔${c.v}`;
    case 'spikes':
      return `−${c.v}`;
    case 'gas':
      return `đuốc −${c.v}`;
    case 'pit':
      return '−2';
    case 'blade':
      return `+${c.v}`;
    case 'potion':
      return `+${c.v}`;
    case 'oil':
      return `+${c.v}`;
    case 'gold':
    case 'chest':
      return `${c.v}`;
    default:
      return '';
  }
}

export function logText(l: LogEntry, name: (seat: number) => string): string {
  const who = name(l.seat);
  const dmg = l.dmg ? `, mất ${l.dmg} máu` : ', không mất máu';
  switch (l.kind) {
    case 'fight':
      return `${who} đánh quái sức ${l.v}${dmg}`;
    case 'spikes':
      return `${who} giẫm bẫy gai${dmg}`;
    case 'gas':
      return `${who} hít khí độc, đuốc tắt bớt ${l.v}`;
    case 'pit':
      return `${who} sập hầm, rơi xuống tầng dưới (mất ${l.dmg} máu)`;
    case 'blade':
      return `${who} nhặt kiếm, vũ khí thành ${l.v}`;
    case 'bladeKeep':
      return `${who} thấy kiếm ${l.v}, giữ kiếm cũ tốt hơn`;
    case 'shield':
      return `${who} nhặt khiên`;
    case 'potion':
      return l.to !== undefined && l.to !== l.seat ? `${who} đưa thuốc cho ${name(l.to)} (+${l.v} máu)` : `${who} uống thuốc (+${l.v} máu)`;
    case 'oil':
      return `${who} châm dầu, đuốc +${l.v}`;
    case 'key':
      return `${who} nhặt chìa khóa`;
    case 'gold':
      return `${who} nhặt ${l.v} vàng`;
    case 'chestKey':
      return `${who} mở rương bằng chìa, được ${l.v} vàng`;
    case 'chestBreak':
      return `${who} phá rương, được ${l.v} vàng`;
    case 'chestSkip':
      return `${who} bỏ qua rương`;
    case 'campHeal':
      return `${who} nghỉ bên lửa trại (+${l.v} máu)`;
    case 'campTorch':
      return `${who} thắp thêm đuốc (+${l.v})`;
    case 'stumble':
      return `${who} vấp ngã trong tối (mất 1 máu)`;
    case 'descend':
      return `${who} xuống tầng ${l.v}: ${strings.floorNames[(l.v ?? 1) - 1] ?? ''}`;
    case 'boss':
      return `${who} đánh trùm sức ${l.v}${dmg}`;
    case 'die':
      return `${who} đã gục`;
    case 'escape':
      return `${who} thoát khỏi hầm (+10 vàng)`;
  }
}
