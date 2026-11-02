import { describe, expect, it } from 'vitest';
import { cardOf, type Card } from './cards';
import { arrange, beats, classify, suggest } from './combos';
import { instantWin, newRound, tienLenGame, type TLState } from './game';

// c('3♠') -> lá bài, để test dễ đọc.
const RANK = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
const SUIT = ['♠', '♣', '♦', '♥'];
const c = (label: string): Card => cardOf(RANK.indexOf(label.slice(0, -1)), SUIT.indexOf(label.slice(-1)));
const cs = (labels: string) => labels.split(' ').map(c);
const sorted = (x: Card[] | null) => (x ? [...x].sort((p, q) => p - q) : x);
const combo = (labels: string) => classify(cs(labels))!;

const players = [
  { id: 'a', name: 'A' },
  { id: 'b', name: 'B' },
  { id: 'c', name: 'C' },
  { id: 'd', name: 'D' },
  { id: 'e', name: 'E' },
];
const ctx = (from: string, host = from === 'a') => ({ from, players, host });
const act = (s: TLState, from: string, a: Parameters<typeof tienLenGame.reduce>[1]) => tienLenGame.reduce(s, a, ctx(from));

/** Bài 13 lá đệm thêm các lá còn lại để đủ, không tạo tới trắng. */
function hands(...given: string[]): Card[][] {
  const used = new Set(given.flatMap((g) => (g ? cs(g) : [])));
  const spare = Array.from({ length: 52 }, (_, i) => i).filter((x) => !used.has(x));
  return given.map((g) => {
    const h = g ? cs(g) : [];
    while (h.length < 13) h.push(spare.shift()!);
    return h;
  });
}

describe('nhận diện bộ', () => {
  it('rác, đôi, sám, tứ quý, sảnh, đôi thông', () => {
    expect(combo('7♥').kind).toBe('single');
    expect(combo('7♥ 7♠').kind).toBe('pair');
    expect(combo('7♥ 7♠ 7♦').kind).toBe('triple');
    expect(combo('7♥ 7♠ 7♦ 7♣').kind).toBe('quad');
    expect(combo('3♠ 4♦ 5♥').kind).toBe('straight');
    expect(combo('J♠ Q♦ K♥ A♣').len).toBe(4);
    expect(combo('3♠ 3♦ 4♥ 4♣ 5♠ 5♦').kind).toBe('pairs');
    expect(combo('3♠ 3♦ 4♥ 4♣ 5♠ 5♦ 6♠ 6♦').len).toBe(4);
  });

  it('bộ sai bị loại: sảnh có heo, sảnh đứt, đôi thông thiếu', () => {
    expect(classify(cs('K♠ A♦ 2♥'))).toBeNull();
    expect(classify(cs('3♠ 4♦ 6♥'))).toBeNull();
    expect(classify(cs('3♠ 4♦'))).toBeNull();
    expect(classify(cs('3♠ 3♦ 4♥ 4♣'))).toBeNull();
    expect(classify(cs('3♠ 3♦ 4♥ 4♣ 5♠'))).toBeNull();
    expect(classify(cs('2♠ 2♦ 3♥ 3♣ 4♠ 4♦'))).toBeNull();
    expect(classify([])).toBeNull();
  });

  it('so cùng loại theo lá lớn nhất, chất ♠<♣<♦<♥', () => {
    expect(beats(combo('7♥'), combo('7♦'))).toBe(true);
    expect(beats(combo('7♣'), combo('7♦'))).toBe(false);
    expect(beats(combo('8♠'), combo('7♥'))).toBe(true);
    expect(beats(combo('9♠ 9♥'), combo('9♣ 9♦'))).toBe(true);
    expect(beats(combo('4♠ 5♠ 6♥'), combo('4♣ 5♦ 6♦'))).toBe(true);
    // Khác số lá thì không chặn được.
    expect(beats(combo('4♠ 5♠ 6♥ 7♠'), combo('4♣ 5♦ 6♦'))).toBe(false);
    expect(beats(combo('8♠ 8♣'), combo('7♥'))).toBe(false);
  });

  it('chặt heo: 3 đôi thông chặt 1 heo, không chặt đôi heo', () => {
    const three = combo('3♠ 3♦ 4♥ 4♣ 5♠ 5♦');
    expect(beats(three, combo('2♥'))).toBe(true);
    expect(beats(three, combo('2♠ 2♥'))).toBe(false);
    expect(beats(three, combo('A♥'))).toBe(false);
  });

  it('tứ quý chặt heo, đôi heo, 3 đôi thông; thua 4 đôi thông', () => {
    const quad = combo('5♠ 5♣ 5♦ 5♥');
    expect(beats(quad, combo('2♥'))).toBe(true);
    expect(beats(quad, combo('2♠ 2♥'))).toBe(true);
    expect(beats(quad, combo('9♠ 9♦ 10♥ 10♣ J♠ J♦'))).toBe(true);
    expect(beats(quad, combo('3♠ 3♦ 4♥ 4♣ 5♠ 5♦ 6♠ 6♦'))).toBe(false);
    expect(beats(combo('6♠ 6♣ 6♦ 6♥'), quad)).toBe(true);
    expect(beats(combo('2♠ 2♣ 2♦ 2♥'), quad)).toBe(true);
  });

  it('4 đôi thông chặt heo, đôi heo, tứ quý, 3 đôi thông', () => {
    const four = combo('3♠ 3♦ 4♥ 4♣ 5♠ 5♦ 6♠ 6♦');
    expect(beats(four, combo('2♥'))).toBe(true);
    expect(beats(four, combo('2♠ 2♥'))).toBe(true);
    expect(beats(four, combo('K♠ K♣ K♦ K♥'))).toBe(true);
    expect(beats(four, combo('9♠ 9♦ 10♥ 10♣ J♠ J♦'))).toBe(true);
    expect(beats(combo('9♠ 9♦ 10♥ 10♣ J♠ J♦'), four)).toBe(false);
  });
});

describe('gợi ý và xếp bài', () => {
  it('gợi ý lá nhỏ nhất chặn được, ưu tiên cùng loại', () => {
    const hand = cs('4♠ 7♦ 7♥ 9♣ 2♠');
    expect(suggest(hand, combo('7♣'))).toEqual(cs('7♦'));
    expect(suggest(hand, combo('6♠ 6♥'))).toEqual(cs('7♦ 7♥'));
    expect(suggest(hand, combo('2♥'))).toBeNull();
    expect(suggest(hand, null)).toEqual(cs('4♠'));
    expect(sorted(suggest(cs('3♠ 3♦ 4♥ 4♣ 5♠ 5♦ 9♠'), combo('2♥')))).toEqual(sorted(cs('3♠ 3♦ 4♥ 4♣ 5♠ 5♦')));
  });

  it('gợi ý sảnh dùng đúng lá trên cùng để chặn', () => {
    expect(suggest(cs('5♠ 6♠ 7♠ 7♥'), combo('5♣ 6♦ 7♦'))).toEqual(cs('5♠ 6♠ 7♥'));
  });

  it('xếp theo bộ giữ đủ các lá', () => {
    const hand = cs('3♠ 4♠ 5♠ 9♦ 9♥ K♠ K♣ K♦ K♥ A♠ 2♥ 7♣ 8♣');
    const out = arrange(hand);
    expect([...out].sort((x, y) => x - y)).toEqual([...hand].sort((x, y) => x - y));
    expect(out.slice(0, 4)).toEqual(cs('K♠ K♣ K♦ K♥'));
  });
});

describe('tới trắng', () => {
  it('tứ quý heo, 6 đôi, sảnh rồng', () => {
    expect(instantWin(cs('2♠ 2♣ 2♦ 2♥ 3♠ 5♦ 7♥ 9♣ J♠ K♦ 4♥ 6♣ 8♠'))).toBe('quad2');
    expect(instantWin(cs('3♠ 3♦ 5♥ 5♣ 7♠ 7♦ 9♥ 9♣ J♠ J♦ K♠ K♦ A♥'))).toBe('sixPairs');
    expect(instantWin(cs('3♠ 4♦ 5♥ 6♣ 7♠ 8♦ 9♥ 10♣ J♠ Q♦ K♠ A♦ 2♥'))).toBe('dragon');
    expect(instantWin(cs('3♠ 4♦ 5♥ 6♣ 7♠ 8♦ 9♥ 10♣ J♠ Q♦ K♠ 2♦ 2♥'))).toBeNull();
  });

  it('bật thì kết thúc ván ngay, tắt thì chơi bình thường', () => {
    const two = players.slice(0, 2);
    const h = [cs('2♠ 2♣ 2♦ 2♥ 3♣ 4♣ 5♣ 6♣ 7♣ 8♣ 9♣ 10♣ J♣'), cs('3♠ 4♠ 5♠ 6♠ 7♠ 8♠ 9♠ 10♠ J♠ Q♠ K♠ Q♣ K♣')];
    const on = newRound(two, { hands: h });
    expect(on.done).toBe(true);
    expect(on.instant).toEqual({ seat: 0, kind: 'quad2' });
    expect(on.finished).toEqual([0, 1]);
    expect(on.scores).toEqual({ a: 1, b: 0 });
    expect(on.lastWinner).toBe('a');
    const off = newRound(two, { hands: h, toiTrang: 'off' });
    expect(off.done).toBe(false);
    expect(off.turn).toBe(1);
  });
});

describe('ván chơi', () => {
  const start = () => newRound(players, { hands: hands('4♠ 5♠ 6♠', '3♠ 7♦', '7♥ 8♠', 'A♥'), toiTrang: 'off' });

  it('chỉ 4 người đầu được ngồi, người cầm 3♠ đi trước và phải đánh kèm 3♠', () => {
    const s = start();
    expect(s.seats).toEqual(['a', 'b', 'c', 'd']);
    expect(s.turn).toBe(1);
    expect(s.mustPlay).toBe(c('3♠'));
    expect(act(s, 'a', { type: 'play', cards: cs('4♠') })).toBe(s);
    expect(act(s, 'b', { type: 'play', cards: cs('7♦') })).toBe(s);
    expect(act(s, 'b', { type: 'pass' })).toBe(s);
    const next = act(s, 'b', { type: 'play', cards: cs('3♠') });
    expect(next.turn).toBe(2);
    expect(next.mustPlay).toBeNull();
    expect(next.hands[1]).not.toContain(c('3♠'));
  });

  it('từ chối lá không có trên tay, bộ sai, bộ yếu hơn', () => {
    let s = act(start(), 'b', { type: 'play', cards: cs('3♠') });
    expect(act(s, 'c', { type: 'play', cards: cs('A♥') })).toBe(s); // không có lá này
    s = act(s, 'c', { type: 'play', cards: cs('7♥') });
    expect(act(s, 'd', { type: 'play', cards: [c('A♥'), c('A♥')] })).toBe(s);
    const weak = { ...s, hands: s.hands.map((h, i) => (i === 3 ? [...h.filter((x) => x !== c('A♥')), c('6♥')] : h)) };
    expect(act(weak, 'd', { type: 'play', cards: cs('6♥') })).toBe(weak);
  });

  it('bỏ lượt mất quyền chặn tới hết vòng; vòng hết thì chủ bộ đi tự do', () => {
    let s = act(start(), 'b', { type: 'play', cards: cs('3♠') }); // b đánh, tới c
    s = act(s, 'c', { type: 'pass' }); // tới d
    expect(s.turn).toBe(3);
    s = act(s, 'd', { type: 'play', cards: cs('A♥') }); // tới a
    expect(s.turn).toBe(0);
    s = act(s, 'a', { type: 'pass' }); // b
    expect(s.turn).toBe(1);
    s = act(s, 'b', { type: 'pass' }); // c đã bỏ nên bỏ qua; về d, hết vòng
    expect(s.turn).toBe(3);
    expect(s.table).toBeNull();
    expect(s.passed.every((p) => !p)).toBe(true);
    // Đang đi tự do không được bỏ lượt.
    expect(act(s, 'd', { type: 'pass' })).toBe(s);
  });

  it('hết bài thì về nhất; còn một người là bét, cộng điểm, ván sau người nhất đi trước', () => {
    const h = hands('3♠', '4♠', '5♠', '6♠');
    let s = newRound(players, { hands: h.map((x, i) => (i === 0 ? cs('3♠') : x)), toiTrang: 'off' });
    expect(s.hands[0]).toEqual(cs('3♠'));
    s = act(s, 'a', { type: 'play', cards: cs('3♠') });
    expect(s.finished).toEqual([0]);
    // a hết bài: b được đánh tự do? Không, b vẫn phải chặn 3♠ hoặc bỏ.
    expect(s.turn).toBe(1);
    s = act(s, 'b', { type: 'pass' });
    s = act(s, 'c', { type: 'pass' });
    s = act(s, 'd', { type: 'pass' });
    // Chủ bộ đã hết bài: người kế tiếp (b) đi tự do.
    expect(s.turn).toBe(1);
    expect(s.table).toBeNull();
    // Rút ngắn: cho b, c chỉ còn 1 lá.
    s = { ...s, hands: [[], [c('4♠')], [c('5♠')], s.hands[3]] };
    s = act(s, 'b', { type: 'play', cards: cs('4♠') });
    expect(s.finished).toEqual([0, 1]);
    s = act(s, 'c', { type: 'play', cards: cs('5♠') });
    expect(s.done).toBe(true);
    expect(s.finished).toEqual([0, 1, 2, 3]);
    expect(s.scores).toEqual({ a: 3, b: 2, c: 1, d: 0 });
    expect(act(s, 'b', { type: 'restart' })).toBe(s);
    const r = act(s, 'a', { type: 'restart' });
    expect(r.round).toBe(2);
    expect(r.scores.a).toBeGreaterThanOrEqual(3);
    if (!r.done) {
      expect(r.turn).toBe(0);
      expect(r.mustPlay).toBeNull();
    }
  });

  it('2 người: lá nhỏ nhất đi trước, người kia bét khi một bên hết bài', () => {
    const two = players.slice(0, 2);
    let s = newRound(two, { hands: [cs('9♠'), cs('5♦ 6♦')], toiTrang: 'off' });
    expect(s.turn).toBe(1);
    expect(s.mustPlay).toBe(c('5♦'));
    s = tienLenGame.reduce(s, { type: 'play', cards: cs('5♦') }, { from: 'b', players: two, host: false });
    s = tienLenGame.reduce(s, { type: 'play', cards: cs('9♠') }, { from: 'a', players: two, host: true });
    expect(s.done).toBe(true);
    expect(s.finished).toEqual([0, 1]);
    expect(s.scores).toEqual({ a: 1, b: 0 });
  });

  it('chặt heo bằng 3 đôi thông giữa vòng', () => {
    let s = newRound(players, { hands: hands('3♠ 2♥', '4♠ 4♦ 5♠ 5♦ 6♠ 6♦', '', ''), toiTrang: 'off' });
    s = act(s, 'a', { type: 'play', cards: cs('3♠') });
    s = act(s, 'b', { type: 'pass' });
    s = act(s, 'c', { type: 'pass' });
    s = act(s, 'd', { type: 'pass' });
    s = act(s, 'a', { type: 'play', cards: cs('2♥') });
    expect(s.turn).toBe(1);
    expect(act(s, 'b', { type: 'pass' }).turn).toBe(2); // b đã bỏ ở vòng trước? Không: vòng mới nên b còn quyền.
    const chop = act(s, 'b', { type: 'play', cards: cs('4♠ 4♦ 5♠ 5♦ 6♠ 6♦') });
    expect(chop.table?.combo.kind).toBe('pairs');
  });

  it('config chỉ chủ phòng, chỉ trước nước đầu', () => {
    const s = start();
    expect(act(s, 'b', { type: 'config', config: { toiTrang: 'off' } })).toBe(s);
    expect(act(s, 'a', { type: 'config', config: { toiTrang: 'off' } }).toiTrang).toBe('off');
    const moved = act(s, 'b', { type: 'play', cards: cs('3♠') });
    expect(act(moved, 'a', { type: 'config', config: { toiTrang: 'on' } })).toBe(moved);
  });

  it('advance (bỏ lượt người mất kết nối)', () => {
    const s = start();
    const forced = tienLenGame.advance(s, ctx('a'));
    expect(forced.table?.combo.cards).toEqual(cs('3♠'));
    const passed = tienLenGame.advance(forced, ctx('a'));
    expect(passed.passed[2]).toBe(true);
  });
});
