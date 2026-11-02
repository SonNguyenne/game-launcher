import { describe, expect, it } from 'vitest';
import { baiGame, card, child, fits, isNgu, leaders, legalPlay, penaltyOf, victimOf, type BaiAction, type BaiState } from './game';

const players = [
  { id: 'a', name: 'A' },
  { id: 'b', name: 'B' },
  { id: 'c', name: 'C' },
];
const ctx = (from: string) => ({ from, players, host: from === 'a' });
const act = (s: BaiState, from: string, a: BaiAction) => baiGame.reduce(s, a, ctx(from));

/** id lá số: hệ he (0 mộc..4 thủy), số n. */
const num = (he: number, n: number) => he * 9 + n - 1;
/** id lá hành động. */
const action = (kind: 'gui' | 'sinh' | 'khac', he: number) => 45 + ['gui', 'sinh', 'khac'].indexOf(kind) * 5 + he;

function setup(hands: number[][], top: number, deck: number[] = [num(2, 9), num(2, 8), num(2, 7), num(2, 6)]): BaiState {
  const s = baiGame.init(players);
  return { ...s, hands, pile: [top], deck, turn: 0, phase: 'play' };
}

describe('bộ bài ngũ hành', () => {
  it('60 lá: 45 lá số, 15 lá hành động', () => {
    const all = Array.from({ length: 60 }, (_, i) => card(i));
    expect(all.filter((c) => c.act === null)).toHaveLength(45);
    expect(all.filter((c) => c.act === 'sinh')).toHaveLength(5);
    expect(card(num(3, 7))).toEqual({ id: num(3, 7), he: 3, n: 7, act: null });
    expect(child(4)).toBe(0); // thủy sinh mộc
    expect(victimOf(0)).toBe(2); // mộc khắc thổ
    expect(victimOf(4)).toBe(1); // thủy khắc hỏa
  });

  it('chia bài đủ và mở bàn bằng lá số', () => {
    const s = baiGame.init(players);
    expect(s.hands.map((h) => h.length)).toEqual([8, 8, 8]);
    expect(card(s.pile[0]).act).toBeNull();
    expect(s.hands.flat().length + s.deck.length + s.pile.length).toBe(60);
  });
});

describe('luật nối', () => {
  it('cùng hệ, cùng số, tương sinh với số lớn hơn', () => {
    const top = num(0, 5); // mộc 5
    expect(fits(num(0, 1), top)).toBe(true);
    expect(fits(num(3, 5), top)).toBe(true);
    expect(fits(num(1, 6), top)).toBe(true); // hỏa 6 nối mộc 5
    expect(fits(num(1, 4), top)).toBe(false); // hỏa nhỏ hơn
    expect(fits(num(2, 9), top)).toBe(false); // thổ không phải hệ con
    expect(fits(action('khac', 0), top)).toBe(true);
    expect(fits(action('khac', 1), top)).toBe(false);
    expect(fits(action('gui', 3), action('gui', 1))).toBe(true);
  });

  it('bộ cùng số và bộ ngũ hành', () => {
    const st = { phase: 'play' as const, pile: [num(0, 5)], sinhHe: null, drawn: null };
    const hand = [num(0, 3), num(2, 3), num(4, 3), num(1, 8), num(3, 2)];
    expect(legalPlay(st, hand, [num(0, 3), num(2, 3), num(4, 3)])).toBe(true);
    expect(legalPlay(st, hand, [num(2, 3), num(0, 3)])).toBe(false); // lá đầu không nối
    const ngu = [num(2, 3), num(4, 3), num(1, 8), num(3, 2), num(0, 3)];
    expect(isNgu(ngu)).toBe(true);
    expect(legalPlay(st, hand, ngu)).toBe(true);
    expect(legalPlay(st, hand, [num(0, 3), num(0, 3)])).toBe(false);
  });
});

describe('lượt chơi', () => {
  it('sai lượt hoặc lá không có trên tay thì bỏ qua', () => {
    const s = setup([[num(0, 1), num(1, 1)], [num(0, 2)], [num(0, 3)]], num(0, 9));
    expect(act(s, 'b', { type: 'play', cards: [num(0, 2)] })).toBe(s);
    expect(act(s, 'a', { type: 'play', cards: [num(0, 2)] })).toBe(s);
    expect(act(s, 'a', { type: 'play', cards: [num(1, 1)] })).toBe(s);
    const next = act(s, 'a', { type: 'play', cards: [num(0, 1)] });
    expect(next.turn).toBe(1);
    expect(next.pile[next.pile.length - 1]).toBe(num(0, 1));
  });

  it('bốc được lá nối thì đánh luôn, không thì hết lượt', () => {
    let s = setup([[num(4, 1)], [num(4, 2)], [num(4, 3)]], num(0, 5), [num(0, 7), num(3, 2)]);
    s = act(s, 'a', { type: 'draw' });
    expect(s.phase).toBe('drawn');
    expect(s.drawn).toBe(num(0, 7));
    expect(act(s, 'a', { type: 'play', cards: [num(4, 1)] })).toBe(s);
    s = act(s, 'a', { type: 'pass' });
    expect(s.turn).toBe(1);
    s = act(s, 'b', { type: 'draw' });
    expect(s.phase).toBe('play');
    expect(s.turn).toBe(2);
  });

  it('lá gửi: tặng 1 lá cho người khác', () => {
    const s = setup([[action('gui', 0), num(3, 9), num(0, 1)], [num(4, 2)], [num(4, 3)]], num(0, 5));
    expect(act(s, 'a', { type: 'play', cards: [action('gui', 0)] })).toBe(s);
    expect(act(s, 'a', { type: 'play', cards: [action('gui', 0)], give: { card: num(3, 9), to: 0 } })).toBe(s);
    const next = act(s, 'a', { type: 'play', cards: [action('gui', 0)], give: { card: num(3, 9), to: 2 } });
    expect(next.hands[0]).toEqual([num(0, 1)]);
    expect(next.hands[2]).toContain(num(3, 9));
  });

  it('lá sinh: đánh tiếp lá hệ con, không có thì bốc và hết lượt', () => {
    let s = setup([[action('sinh', 0), num(1, 2), num(1, 2 + 1), num(4, 4)], [num(4, 2)], [num(4, 3)]], num(0, 5));
    s = act(s, 'a', { type: 'play', cards: [action('sinh', 0)] });
    expect(s.phase).toBe('sinh');
    expect(s.turn).toBe(0);
    expect(act(s, 'a', { type: 'play', cards: [num(4, 4)] })).toBe(s);
    s = act(s, 'a', { type: 'play', cards: [num(1, 2)] }); // hỏa 2 dù nhỏ hơn
    expect(s.turn).toBe(1);
    expect(s.phase).toBe('play');
  });

  it('lá khắc: ai giữ lá hệ bị khắc bốc 1', () => {
    // mộc khắc thổ: b có thổ, c không
    const s = setup([[action('khac', 0), num(0, 1)], [num(2, 2)], [num(4, 3)]], num(0, 5), [num(3, 1), num(3, 2)]);
    const next = act(s, 'a', { type: 'play', cards: [action('khac', 0)] });
    expect(next.hands[1]).toHaveLength(2);
    expect(next.hands[2]).toHaveLength(1);
    expect(next.events[next.events.length - 1]).toMatchObject({ kind: 'play', hit: [1] });
  });

  it('hết bài thì về, bài còn lại thành điểm phạt; về bằng ngũ hành phạt thêm', () => {
    const ngu = [num(2, 3), num(4, 3), num(1, 8), num(3, 2), num(0, 3)];
    const s = setup([ngu, [num(4, 2), action('gui', 1)], [num(4, 3)]], num(2, 5));
    const next = act(s, 'a', { type: 'play', cards: ngu });
    expect(next.phase).toBe('roundEnd');
    expect(next.roundWinner).toBe(0);
    expect(next.roundScores).toEqual([0, 2 + 10 + 10, 3 + 10]);
    expect(penaltyOf(action('khac', 2))).toBe(10);
    const r2 = act(next, 'a', { type: 'nextRound' });
    expect(r2.round).toBe(2);
    expect(r2.turn).toBe(1);
    expect(r2.scores).toEqual(next.scores);
  });

  it('hết nọc và cả bàn không đánh được thì bí, hết ván', () => {
    let s = setup([[num(4, 1)], [num(4, 2)], [num(4, 3)]], num(0, 9), []);
    s = act(s, 'a', { type: 'draw' });
    s = act(s, 'b', { type: 'draw' });
    expect(s.phase).toBe('play');
    s = act(s, 'c', { type: 'draw' });
    expect(s.phase).toBe('roundEnd');
    expect(s.roundWinner).toBe(-1);
    expect(s.roundScores).toEqual([1, 2, 3]);
  });

  it('ít điểm phạt nhất thắng', () => {
    expect(leaders([12, 4, 4])).toEqual([1, 2]);
  });
});
