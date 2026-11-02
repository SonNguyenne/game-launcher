import { TWO, rankOf, sortCards, type Card } from './cards';

/** single: rác, pair: đôi, triple: sám, quad: tứ quý, straight: sảnh, pairs: đôi thông. */
export type ComboKind = 'single' | 'pair' | 'triple' | 'quad' | 'straight' | 'pairs';

export interface Combo {
  kind: ComboKind;
  /** Các lá, xếp tăng dần. */
  cards: Card[];
  /** Lá lớn nhất, dùng để so hai bộ cùng loại. */
  top: Card;
  /** Số hạng liên tiếp (sảnh, đôi thông); các bộ khác là 1. */
  len: number;
}

function byRank(cards: readonly Card[]) {
  const m = new Map<number, Card[]>();
  for (const c of cards) m.set(rankOf(c), [...(m.get(rankOf(c)) ?? []), c]);
  return m;
}

const consecutive = (ranks: number[]) => ranks.every((r, i) => i === 0 || r === ranks[i - 1] + 1);

/** Nhận diện bộ bài; không hợp lệ thì trả null. */
export function classify(input: readonly Card[]): Combo | null {
  const cards = sortCards(input);
  const n = cards.length;
  if (!n || new Set(cards).size !== n) return null;
  const top = cards[n - 1];
  const groups = byRank(cards);
  const ranks = [...groups.keys()].sort((a, b) => a - b);
  if (ranks.length === 1) {
    const kind = (['single', 'pair', 'triple', 'quad'] as const)[n - 1];
    return { kind, cards, top, len: 1 };
  }
  // Sảnh và đôi thông không được chứa heo.
  if (ranks[ranks.length - 1] === TWO || !consecutive(ranks)) return null;
  if (n >= 3 && ranks.length === n) return { kind: 'straight', cards, top, len: n };
  if (ranks.length >= 3 && n === ranks.length * 2 && [...groups.values()].every((g) => g.length === 2)) {
    return { kind: 'pairs', cards, top, len: ranks.length };
  }
  return null;
}

const isTwo = (c: Combo) => rankOf(c.top) === TWO;

/**
 * Bộ `next` có chặn được bộ `prev` không.
 * Cùng loại, cùng số lá thì so lá lớn nhất. Chặt heo theo luật miền Nam phổ biến:
 * - 3 đôi thông chặt 1 heo (và 3 đôi thông nhỏ hơn).
 * - Tứ quý chặt 1 heo, đôi heo, 3 đôi thông (và tứ quý nhỏ hơn).
 * - 4 đôi thông (trở lên) chặt heo, đôi heo, 3 đôi thông, tứ quý (và đôi thông ngắn hơn).
 */
export function beats(next: Combo, prev: Combo): boolean {
  if (next.kind === prev.kind && next.cards.length === prev.cards.length) return next.top > prev.top;
  if (next.kind === 'pairs') {
    if (prev.kind === 'single' && isTwo(prev)) return true;
    if (next.len >= 4) {
      if (prev.kind === 'pair' && isTwo(prev)) return true;
      if (prev.kind === 'quad') return true;
      if (prev.kind === 'pairs' && prev.len < next.len) return true;
    }
    return false;
  }
  if (next.kind === 'quad') {
    if ((prev.kind === 'single' || prev.kind === 'pair') && isTwo(prev)) return true;
    return prev.kind === 'pairs' && prev.len === 3;
  }
  return false;
}

/** Mọi bộ có thể tạo từ bài trên tay (đủ để tìm gợi ý; với sảnh/đôi thông chỉ lấy lá nhỏ nhất ở các hạng dưới). */
export function allCombos(hand: readonly Card[]): Combo[] {
  const groups = byRank(sortCards(hand));
  const out: Combo[] = [];
  const push = (cards: Card[]) => {
    const c = classify(cards);
    if (c) out.push(c);
  };
  for (const g of groups.values()) {
    for (let i = 0; i < g.length; i++) {
      push([g[i]]);
      for (let j = i + 1; j < g.length; j++) {
        push([g[i], g[j]]);
        for (let k = j + 1; k < g.length; k++) push([g[i], g[j], g[k]]);
      }
    }
    if (g.length === 4) push(g);
  }
  // Sảnh: các hạng dưới lấy lá nhỏ nhất, hạng trên cùng thử từng lá.
  for (let start = 0; start < TWO; start++) {
    const body: Card[] = [];
    for (let r = start; r < TWO && groups.has(r); r++) {
      if (r - start >= 2) for (const t of groups.get(r)!) push([...body, t]);
      body.push(groups.get(r)![0]);
    }
  }
  // Đôi thông: các hạng dưới lấy 2 lá nhỏ nhất, hạng trên cùng lấy lá nhỏ nhất kèm từng lá còn lại.
  for (let start = 0; start < TWO; start++) {
    const body: Card[] = [];
    for (let r = start; r < TWO && (groups.get(r)?.length ?? 0) >= 2; r++) {
      const g = groups.get(r)!;
      if (r - start >= 2) for (let j = 1; j < g.length; j++) push([...body, g[0], g[j]]);
      body.push(g[0], g[1]);
    }
  }
  return out;
}

/**
 * Gợi ý nước đi nhỏ nhất hợp lệ. table: bộ đang phải chặn (null: đang được đi tự do).
 * must: lá bắt buộc phải đánh kèm (ván đầu). Không có nước nào thì trả null.
 */
export function suggest(hand: readonly Card[], table: Combo | null, must: Card | null = null): Card[] | null {
  if (!hand.length) return null;
  if (!table) {
    const low = must !== null && hand.includes(must) ? must : sortCards(hand)[0];
    return [low];
  }
  const options = allCombos(hand)
    .filter((c) => beats(c, table))
    // Ưu tiên cùng loại (không phí bộ chặt), rồi lá lớn nhất nhỏ nhất.
    .sort((a, b) => Number(a.kind !== table.kind) - Number(b.kind !== table.kind) || a.cards.length - b.cards.length || a.top - b.top);
  return options[0]?.cards ?? null;
}

/** Xếp bài theo bộ để dễ nhìn: tứ quý, đôi thông, sảnh, sám, đôi, rác (mỗi nhóm tăng dần). */
export function arrange(hand: readonly Card[]): Card[] {
  let rest = sortCards(hand);
  const out: Card[] = [];
  const take = (cards: Card[]) => {
    out.push(...cards);
    rest = rest.filter((c) => !cards.includes(c));
  };
  const groups = () => byRank(rest);
  for (const g of byRank(rest).values()) if (g.length === 4) take(g);
  // Đôi thông dài nhất trước, rồi sảnh dài nhất.
  for (const kind of ['pairs', 'straight'] as const) {
    for (;;) {
      const g = groups();
      let best: Card[] = [];
      for (let start = 0; start < TWO; start++) {
        const run: Card[] = [];
        for (let r = start; r < TWO && (g.get(r)?.length ?? 0) >= (kind === 'pairs' ? 2 : 1); r++) {
          run.push(...g.get(r)!.slice(0, kind === 'pairs' ? 2 : 1));
        }
        const ranks = kind === 'pairs' ? run.length / 2 : run.length;
        if (ranks >= 3 && run.length > best.length) best = run;
      }
      if (!best.length) break;
      take(best);
    }
  }
  for (const size of [3, 2]) for (const g of groups().values()) if (g.length === size) take(g);
  take(rest);
  return out;
}
