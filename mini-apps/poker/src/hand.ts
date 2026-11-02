import { rankOf, suitOf, type Card } from './cards';

/**
 * Hạng tay bài: 0 mậu thầu, 1 đôi, 2 thú (hai đôi), 3 sám, 4 sảnh, 5 thùng, 6 cù lũ, 7 tứ quý, 8 thùng phá sảnh.
 */
export type Category = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface HandValue {
  category: Category;
  /** Điểm so sánh: lớn hơn là mạnh hơn, bằng nhau là hòa. */
  score: number;
  /** 5 lá tạo nên tay bài. */
  cards: Card[];
}

/** Gộp hạng tay và các lá phụ (giá trị 0..12) thành một số để so. */
const pack = (category: number, kickers: number[]) => kickers.reduce((acc, k) => acc * 16 + k, category) * 16 ** (5 - kickers.length);

/** Đánh giá đúng 5 lá. */
export function evaluate5(cards: readonly Card[]): { category: Category; score: number } {
  const ranks = cards.map(rankOf).sort((a, b) => b - a);
  const flush = cards.every((c) => suitOf(c) === suitOf(cards[0]));
  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  // Nhóm theo số lá rồi theo hạng, giảm dần: [hạng, số lá].
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const unique = groups.length === 5;
  let straightTop = -1;
  if (unique) {
    if (ranks[0] - ranks[4] === 4) straightTop = ranks[0];
    // A-2-3-4-5: A tính là 1, lá cao nhất là 5.
    else if (ranks[0] === 12 && ranks[1] === 3) straightTop = 3;
  }
  const order = groups.map((g) => g[0]);
  if (straightTop >= 0 && flush) return { category: 8, score: pack(8, [straightTop]) };
  if (groups[0][1] === 4) return { category: 7, score: pack(7, order) };
  if (groups[0][1] === 3 && groups[1][1] === 2) return { category: 6, score: pack(6, order) };
  if (flush) return { category: 5, score: pack(5, ranks) };
  if (straightTop >= 0) return { category: 4, score: pack(4, [straightTop]) };
  if (groups[0][1] === 3) return { category: 3, score: pack(3, order) };
  if (groups[0][1] === 2 && groups[1][1] === 2) return { category: 2, score: pack(2, order) };
  if (groups[0][1] === 2) return { category: 1, score: pack(1, order) };
  return { category: 0, score: pack(0, ranks) };
}

/** Tay bài mạnh nhất chọn 5 trong 5–7 lá. */
export function bestHand(cards: readonly Card[]): HandValue {
  const n = cards.length;
  let best: HandValue | null = null;
  const pick: Card[] = [];
  const walk = (start: number) => {
    if (pick.length === 5) {
      const v = evaluate5(pick);
      if (!best || v.score > best.score) best = { ...v, cards: [...pick] };
      return;
    }
    for (let i = start; i <= n - (5 - pick.length); i++) {
      pick.push(cards[i]);
      walk(i + 1);
      pick.pop();
    }
  };
  walk(0);
  if (!best) throw new Error('cần ít nhất 5 lá');
  return best;
}
