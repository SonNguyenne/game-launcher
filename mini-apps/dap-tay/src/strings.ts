export type Speed = 'vua' | 'nhanh' | 'dien';

export interface CardItem {
  id: string;
  emoji: string;
  name: string;
}

export interface RulePreset {
  id: string;
  targetId: string;
  trapId?: string;
  desc: string;
}

export const cardItems: readonly CardItem[] = [
  { id: 'cat', emoji: '🐱', name: 'Mèo' },
  { id: 'dog', emoji: '🐶', name: 'Chó' },
  { id: 'mouse', emoji: '🐭', name: 'Chuột' },
  { id: 'chicken', emoji: '🐔', name: 'Gà' },
  { id: 'tiger', emoji: '🐯', name: 'Cọp' },
  { id: 'bomb', emoji: '💣', name: 'Quả Bom' },
  { id: 'diamond', emoji: '💎', name: 'Kim Cương' },
  { id: 'ghost', emoji: '👻', name: 'Con Ma' },
  { id: 'fire', emoji: '🔥', name: 'Ngọn Lửa' },
  { id: 'poop', emoji: '💩', name: 'Cục Cưng' },
];

export const rulePresets: readonly RulePreset[] = [
  {
    id: 'cat_dog',
    targetId: 'cat',
    trapId: 'dog',
    desc: 'Thấy 🐱 MÈO là ĐẬP NGAY! CẤM đập 🐶 CHÓ!',
  },
  {
    id: 'diamond_bomb',
    targetId: 'diamond',
    trapId: 'bomb',
    desc: 'Thấy 💎 KIM CƯƠNG là ĐẬP! Thấy 💣 BOM CẤM ĐẬP!',
  },
  {
    id: 'ghost_fire',
    targetId: 'ghost',
    trapId: 'fire',
    desc: 'Thấy 👻 MA là ĐẬP! Thấy 🔥 LỬA CẤM ĐẬP!',
  },
  {
    id: 'poop_all',
    targetId: 'poop',
    desc: 'Thấy 💩 CỤC CƯNG là ĐẬP NGAY LẬP TỨC!',
  },
];

export const strings = {
  title: 'đập tay',
  rule: 'Thẻ hình lật liên tục với tốc độ chóng mặt. Thấy đúng mục tiêu thì đập ngay, đập nhầm thẻ bẫy hoặc đập chậm là dính phạt!',
  speedLabel: 'tốc độ lật thẻ',
  speeds: {
    vua: 'vừa (650ms)',
    nhanh: 'nhanh (450ms)',
    dien: 'điên rồ (300ms)',
  } satisfies Record<Speed, string>,
  ruleLabel: 'luật đập & bẫy',
  penaltyLabel: 'hình phạt khi đập nhầm / đập chậm',
  defaultPenalty: 'người đập nhầm hoặc chậm nhất dính phạt!',
  penaltyPresets: [
    'người chậm nhất / đập nhầm dính phạt!',
    'uống 1 ngụm đồ uống',
    'chống đẩy 5 cái',
    'kể 1 bí mật dơ nhất',
    'tự vỗ tay khen mình 10 lần',
  ],
  readyTitle: 'MỤC TIÊU VÒNG NÀY',
  startFlipping: 'bắt đầu lật thẻ!',
  slapButton: '💥 ĐẬP NGAY! 💥',
  slapSuccess: (name: string) => `🎉 ${name} đã đập chuẩn xác!`,
  slapTrap: (name: string) => `⚡ ${name} đã đập nhầm thẻ bẫy!`,
  slapWrong: (name: string) => `⚡ ${name} bấm hớ! Chưa tới mục tiêu!`,
  missedAll: 'Cả bàn đã bỏ lỡ mục tiêu! Cùng dính phạt!',
  nextRound: 'vòng tiếp theo',
  localSlapPrompt: 'Ai là người đập tay nhanh nhất?',
  localSlapFail: 'Ai lỡ tay đập hớ?',
  waitSlap: 'Hãy tập trung quan sát… Chuẩn bị đập!',
} as const;
