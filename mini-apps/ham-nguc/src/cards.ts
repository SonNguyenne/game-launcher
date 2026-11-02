/**
 * Bộ bài riêng của Hầm Ngục: mỗi tầng một chồng 24 lá, rút 18 lá xếp thành bản đồ 6 hàng × 3 cột.
 * Bộ sinh số giả tất định theo hạt giống, để "thử thách hôm nay" ai cũng gặp cùng một hầm.
 */

export type CardType =
  | 'monster'
  | 'spikes'
  | 'gas'
  | 'pit'
  | 'blade'
  | 'shield'
  | 'potion'
  | 'oil'
  | 'key'
  | 'gold'
  | 'chest'
  | 'camp';

export interface Card {
  t: CardType;
  v: number;
}

export type CardGroup = 'monster' | 'trap' | 'item' | 'treasure' | 'camp';

export const groupOf = (t: CardType): CardGroup =>
  t === 'monster' ? 'monster' : t === 'spikes' || t === 'gas' || t === 'pit' ? 'trap' : t === 'gold' || t === 'chest' ? 'treasure' : t === 'camp' ? 'camp' : 'item';

export const FLOORS = 3;
export const ROWS = 6;
export const COLS = 3;
export const CELLS = ROWS * COLS;

const c = (t: CardType, v = 0): Card => ({ t, v });
const many = (t: CardType, vs: number[]) => vs.map((v) => c(t, v));

/** Chồng bài từng tầng (24 lá): tầng càng sâu quái càng mạnh, bẫy càng đau, của càng nhiều. */
export const DECKS: readonly Card[][] = [
  [
    ...many('monster', [1, 1, 2, 2, 2, 3, 3, 4]),
    c('spikes', 1), c('spikes', 2), c('gas', 2),
    c('blade', 2), c('blade', 3), c('shield'), c('potion', 3), c('potion', 3), c('oil', 3), c('key'),
    c('gold', 2), c('gold', 2), c('gold', 3), c('gold', 3), c('chest', 6),
    c('camp'),
  ],
  [
    ...many('monster', [3, 3, 4, 4, 4, 5, 5, 6]),
    c('spikes', 2), c('spikes', 3), c('gas', 2), c('pit'),
    c('blade', 4), c('blade', 5), c('shield'), c('potion', 4), c('potion', 3), c('oil', 3), c('key'),
    c('gold', 3), c('gold', 4), c('gold', 5), c('chest', 9),
    c('camp'),
  ],
  [
    ...many('monster', [5, 5, 6, 6, 7, 7, 8, 8]),
    c('spikes', 3), c('spikes', 4), c('gas', 3), c('pit'),
    c('blade', 6), c('blade', 7), c('shield'), c('shield'), c('potion', 5), c('oil', 4), c('key'),
    c('gold', 5), c('gold', 6), c('gold', 8), c('chest', 12),
    c('camp'),
  ],
];

/** mulberry32: bộ sinh số giả 32 bit, tất định trên mọi máy. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Băm chuỗi (ví dụ ngày "2026-10-30") ra hạt giống. */
export function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Ngày theo giờ máy, dạng YYYY-MM-DD. */
export function dayOf(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface Dungeon {
  floors: Card[][];
  /** Sức mạnh trùm canh cửa ra (trước khi cộng theo số người khi hợp tác). */
  boss: number;
}

/** Dựng hầm từ hạt giống: xáo từng chồng, lấy 18 lá; trùm mạnh 8-10. */
export function buildDungeon(seed: number): Dungeon {
  const rand = rng(seed);
  const floors = DECKS.map((deck) => {
    const d = deck.slice();
    for (let i = d.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [d[i], d[j]] = [d[j], d[i]];
    }
    return d.slice(0, CELLS);
  });
  return { floors, boss: 8 + Math.floor(rand() * 3) };
}
