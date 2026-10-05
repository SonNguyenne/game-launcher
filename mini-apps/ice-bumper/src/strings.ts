import { FISH_TARGET, KING_TARGET, LIVES, ZONE_MOVE, type ModeId } from './sim';

const slipWord = (v: number) => (v < 0.25 ? 'bám' : v < 0.6 ? 'hơi trơn' : v < 0.85 ? 'trơn' : 'rất trơn');

export const strings = {
  title: 'snowar.io',
  rule: 'Mỗi người một chú cánh cụt trên tảng băng giữa biển. Lái để lăn cầu tuyết to dần, bắn hoặc húc cho đối thủ trượt xuống nước. Chủ phòng chọn chế độ: trụ lại cuối cùng, ba mạng, vua đỉnh băng hoặc giữ cá.',
  mode: 'Chế độ',
  modeName: { classic: 'Trụ cuối', lives: 'Ba mạng', king: 'Vua đỉnh băng', fish: 'Giữ cá' } as Record<ModeId, string>,
  modeHint: {
    classic: 'Rơi là xem nốt hiệp. Ai trụ lại cuối cùng thắng; hết giờ thì người gần tâm nhất thắng.',
    lives: `Mỗi người ${LIVES} mạng, rơi thì quay lại sân. Hết mạng là bị loại; hết giờ thì ai còn nhiều mạng nhất thắng.`,
    king: `Đứng một mình trong vòng vàng để tích giây, đủ ${KING_TARGET} giây là thắng. Có hai người trong vòng thì không ai được tính. Vòng dời chỗ mỗi ${ZONE_MOVE} giây. Rơi thì quay lại.`,
    fish: `Chạm vào cá để ôm, ôm đủ ${FISH_TARGET} giây là thắng. Ôm cá chạy chậm hơn, bị bắn hoặc húc mạnh là văng cá. Rơi thì quay lại.`,
  } as Record<ModeId, string>,
  winText: (mode: ModeId, name: string, timeUp: boolean) =>
    mode === 'king'
      ? `${name} làm vua đỉnh băng`
      : mode === 'fish'
        ? `${name} giữ cá lâu nhất`
        : mode === 'lives'
          ? timeUp
            ? `Hết giờ, ${name} còn nhiều mạng nhất`
            : `${name} là người cuối còn mạng`
          : timeUp
            ? `Hết giờ, ${name} đứng gần tâm nhất`
            : `${name} trụ lại cuối cùng`,
  respawn: (s: number) => `Quay lại sau ${s} giây`,
  livesLeft: (n: number) => (n > 0 ? `còn ${n} mạng` : 'hết mạng'),
  seconds: (n: number) => `${n} giây`,
  winsBadge: (n: number) => `${n} hiệp thắng`,
  holdsFish: 'đang ôm cá',
  holdsZone: 'đang giữ vòng',
  backIn: 'Quay lại sau',
  scored: (s: number, target: number) => `${s}/${target} giây`,
  grabbed: (name: string) => `${name} ôm được cá`,
  dropped: (name: string) => `${name} làm văng cá`,
  zoneMoving: 'Vòng sắp dời chỗ',
  rounds: 'Số hiệp',
  map: 'Bản đồ',
  random: 'Ngẫu nhiên',
  scale: 'Cỡ sân',
  scaleEnds: ['Nhỏ', 'Lớn'] as const,
  scaleValue: (v: number) => `${Math.round(v * 100)}%`,
  slip: 'Độ trơn',
  slipEnds: ['Bám', 'Rất trơn'] as const,
  slipWord,
  arena: (mode: string, map: string, scale: number, slip: number, time: string) => `${mode}: ${map.toLowerCase()}, sân ${Math.round(scale * 100)}%, mặt băng ${slipWord(slip)}, mỗi hiệp ${time.toLowerCase()}`,
  slipHint: (v: number) => (v < 0.25 ? 'Dừng nhanh, khó bị đẩy rơi.' : v < 0.6 ? 'Trượt vừa phải, dễ làm quen.' : 'Bị húc là trượt rất xa.'),
  preview: 'Xem trước sân',
  randomMaps: 'Bản đồ đổi mỗi hiệp',
  roundsValue: (n: number) => `${n} hiệp`,
  roundTime: 'Thời gian mỗi hiệp',
  roundTimeValue: (s: number) => (s === 0 ? 'Vô hạn' : s < 120 ? `${s} giây` : `${s / 60} phút`),
  noLimit: 'Không giới hạn thời gian',
  garageTitle: 'Chọn áo cho cánh cụt',
  garageHint: 'Màu áo giúp cả phòng nhận ra bạn trên băng.',
  color: 'Màu áo',
  hat: 'Mũ',
  you: 'bạn',
  start: (n: number) => (n > 1 ? `Vào trận với ${n} người` : 'Vào trận'),
  waitStart: (host: string) => `Chờ ${host} cho vào trận`,
  practice: 'Chơi 1 máy: bạn lái chú đầu tiên, các chú còn lại tự lái.',
  round: (n: number, total: number) => `Hiệp ${n}/${total}`,
  clock: (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`,
  timeLeft: (s: number) => `Còn ${s} giây`,
  go: 'Lăn!',
  fell: (name: string) => `${name} rơi xuống biển`,
  pushed: (by: string, name: string) => `${by} đẩy ${name} xuống biển`,
  spectating: 'Bạn vào giữa hiệp, xem trước rồi chơi từ hiệp sau.',
  out: 'Bạn rơi rồi, xem nốt hiệp nhé.',
  fire: 'Bắn cầu tuyết',
  brake: 'Thắng: giữ để dừng gấp và đứng vững',
  brakeShort: 'Thắng',
  steerHint: 'Kéo để lái. Nút cam: chạm bắn, giữ để đứng vững canh vồng. Giữ Thắng để dừng gấp',
  keysHint: 'Mũi tên hoặc WASD để lái. Space: nhấn bắn thẳng, giữ canh bắn vồng. Shift: giữ để thắng, đứng vững',
  roundDraw: 'Cả bàn cùng rơi, hiệp này hòa',
  champion: (name: string, wins: number) => `${name} vô địch với ${wins} hiệp thắng`,
  matchOver: 'Hết trận',
  nextRound: 'Sang hiệp sau',
  backToGarage: 'Về chọn áo, chơi trận mới',
  wins: (n: number) => `${n} thắng`,
  kos: (n: number) => `${n} lần đẩy`,
} as const;
