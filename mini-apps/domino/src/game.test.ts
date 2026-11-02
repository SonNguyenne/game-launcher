import { describe, expect, it } from 'vitest';
import { dominoGame, fits, fullSet, handSize, pipsOf, starter, type DominoState, type Placed, type Tile } from './game';
import { layoutSnake } from './layout';

const p = (n: number) => Array.from({ length: n }, (_, i) => ({ id: String.fromCharCode(97 + i), name: String.fromCharCode(65 + i) }));
const ctx = (from: string, n = 2) => ({ from, players: p(n), host: from === 'a' });
const T = (a: number, b: number): Tile => ({ a, b });

/** Ván dựng sẵn: tay và nọc tùy chọn, a đi trước. */
function setup(hands: Tile[][], extra: Partial<DominoState> = {}): DominoState {
  const base = dominoGame.init(p(hands.length));
  return { ...base, hands, boneyard: [], line: [], turn: 0, passes: 0, ...extra };
}

describe('domino: chia quân', () => {
  it('bộ đủ 28 quân, không trùng', () => {
    const set = fullSet();
    expect(set).toHaveLength(28);
    expect(new Set(set.map((t) => `${t.a}${t.b}`)).size).toBe(28);
  });

  it('2-3 người mỗi người 7 quân; 4 người chế độ bốc 5 quân', () => {
    expect(handSize(2, 'block')).toBe(7);
    expect(handSize(3, 'draw')).toBe(7);
    expect(handSize(4, 'block')).toBe(7);
    expect(handSize(4, 'draw')).toBe(5);
    const s = dominoGame.reduce(dominoGame.init(p(4)), { type: 'config', config: { mode: 'draw' } }, ctx('a', 4));
    expect(s.hands.every((h) => h.length === 5)).toBe(true);
    expect(s.boneyard).toHaveLength(8);
    const s3 = dominoGame.init(p(3));
    expect(s3.boneyard).toHaveLength(7);
  });

  it('chỉ lấy tối đa 4 ghế', () => {
    const s = dominoGame.init(p(5));
    expect(s.seats).toEqual(['a', 'b', 'c', 'd']);
  });

  it('người có đôi lớn nhất đi trước', () => {
    expect(starter([[T(1, 1), T(2, 5)], [T(4, 4), T(0, 1)], [T(3, 3)]])).toBe(1);
    // Không ai có đôi: quân nhiều chấm nhất.
    expect(starter([[T(1, 2)], [T(5, 6)]])).toBe(1);
    const s = dominoGame.init(p(2));
    expect(s.turn).toBe(starter(s.hands));
  });
});

describe('domino: nối quân', () => {
  it('quân đầu tiên đặt tự do, sau đó phải khớp đầu', () => {
    let s = setup([[T(6, 6), T(6, 2), T(1, 3)], [T(2, 4), T(0, 0)]]);
    s = dominoGame.reduce(s, { type: 'play', tile: T(6, 6) }, ctx('a'));
    expect(s.line).toEqual([{ a: 6, b: 6, by: 0 }]);
    expect(s.turn).toBe(1);
    // b không có quân khớp 6
    expect(dominoGame.reduce(s, { type: 'play', tile: T(2, 4) }, ctx('b'))).toBe(s);
  });

  it('nối đầu trái thì lật quân cho khớp, chọn đầu khi hợp cả hai', () => {
    let s = setup([[T(3, 5), T(1, 1)], [T(5, 1), T(6, 6)]]);
    s = dominoGame.reduce(s, { type: 'play', tile: T(3, 5) }, ctx('a'));
    // 5-1 chỉ khớp đầu phải (5)
    expect(dominoGame.reduce(s, { type: 'play', tile: T(5, 1), end: 'left' }, ctx('b'))).toBe(s);
    s = dominoGame.reduce(s, { type: 'play', tile: T(1, 5), end: 'right' }, ctx('b'));
    expect(s.line.map((t) => [t.a, t.b])).toEqual([[3, 5], [5, 1]]);
    // a cầm 1-1: chỉ đầu phải là 1
    s = dominoGame.reduce(s, { type: 'play', tile: T(1, 1) }, ctx('a'));
    expect(s.line.map((t) => [t.a, t.b])).toEqual([[3, 5], [5, 1], [1, 1]]);
  });

  it('nối đầu trái', () => {
    let s = setup([[T(3, 5), T(0, 3)], [T(6, 6)]]);
    s = { ...s, line: [{ a: 3, b: 5, by: 0 }], hands: [[T(0, 3), T(2, 2)], [T(6, 6)]] };
    s = dominoGame.reduce(s, { type: 'play', tile: T(0, 3), end: 'left' }, ctx('a'));
    expect(s.line.map((t) => [t.a, t.b])).toEqual([[0, 3], [3, 5]]);
    expect(fits(s.line, T(5, 0))).toEqual(['left', 'right']);
  });

  it('không đúng lượt, quân không có trên tay, người xem: bỏ qua', () => {
    const s = setup([[T(3, 5)], [T(5, 1)]]);
    expect(dominoGame.reduce(s, { type: 'play', tile: T(5, 1) }, ctx('b'))).toBe(s);
    expect(dominoGame.reduce(s, { type: 'play', tile: T(2, 2) }, ctx('a'))).toBe(s);
    expect(dominoGame.reduce(s, { type: 'play', tile: T(3, 5) }, { from: 'z', players: p(2), host: false })).toBe(s);
  });
});

describe('domino: bốc và bỏ lượt', () => {
  it('chế độ chặn: không đi được thì bỏ lượt; còn quân đi được thì không được bỏ', () => {
    const s = setup([[T(1, 2), T(6, 6)], [T(0, 0)]], { line: [{ a: 3, b: 4, by: 1 }] as Placed[] });
    const passed = dominoGame.reduce(s, { type: 'pass' }, ctx('a'));
    expect(passed.turn).toBe(1);
    expect(passed.passes).toBe(1);
    const s2 = setup([[T(4, 2)], [T(0, 0)]], { line: [{ a: 3, b: 4, by: 1 }] as Placed[] });
    expect(dominoGame.reduce(s2, { type: 'pass' }, ctx('a'))).toBe(s2);
    expect(dominoGame.reduce(s2, { type: 'draw' }, ctx('a'))).toBe(s2);
  });

  it('chế độ bốc: phải bốc tới khi đi được, hết nọc mới được bỏ', () => {
    let s = setup([[T(1, 2)], [T(0, 0)]], { mode: 'draw', boneyard: [T(5, 6), T(4, 1)], line: [{ a: 3, b: 4, by: 1 }] as Placed[] });
    expect(dominoGame.reduce(s, { type: 'pass' }, ctx('a'))).toBe(s);
    s = dominoGame.reduce(s, { type: 'draw' }, ctx('a'));
    expect(s.hands[0]).toHaveLength(2);
    expect(s.turn).toBe(0);
    s = dominoGame.reduce(s, { type: 'draw' }, ctx('a'));
    expect(s.boneyard).toHaveLength(0);
    // Bốc được 4-1 nối được: không bốc thêm, không bỏ lượt
    expect(dominoGame.reduce(s, { type: 'pass' }, ctx('a'))).toBe(s);
    s = dominoGame.reduce(s, { type: 'play', tile: T(4, 1) }, ctx('a'));
    expect(s.line.at(-1)).toEqual({ a: 4, b: 1, by: 0 });
  });
});

describe('domino: tính điểm', () => {
  it('hết quân thì thắng ván, cộng chấm của đối thủ', () => {
    let s = setup([[T(3, 5)], [T(6, 6), T(1, 2)], [T(0, 4)]]);
    s = dominoGame.reduce(s, { type: 'play', tile: T(3, 5) }, ctx('a', 3));
    expect(s.roundResult).toEqual({ reason: 'domino', winner: 0, points: 12 + 3 + 4, pips: [0, 15, 4] });
    expect(s.scores.a).toBe(19);
    // Ván đã hết: không đi tiếp được
    expect(dominoGame.reduce(s, { type: 'pass' }, ctx('b', 3))).toBe(s);
  });

  it('bàn chặn: ít chấm nhất thắng; hòa chấm thì không ai được điểm', () => {
    const line = [{ a: 3, b: 4, by: 0 }] as Placed[];
    let s = setup([[T(1, 1)], [T(6, 6)]], { line });
    s = dominoGame.reduce(s, { type: 'pass' }, ctx('a'));
    s = dominoGame.reduce(s, { type: 'pass' }, ctx('b'));
    expect(s.roundResult?.reason).toBe('blocked');
    expect(s.roundResult?.winner).toBe(0);
    expect(s.scores.a).toBe(12);

    let t = setup([[T(1, 2)], [T(0, 1), T(0, 2)]], { line });
    t = dominoGame.reduce(t, { type: 'pass' }, ctx('a'));
    t = dominoGame.reduce(t, { type: 'pass' }, ctx('b'));
    expect(t.roundResult?.winner).toBeNull();
    expect(t.scores).toEqual({ a: 0, b: 0 });
  });

  it('đạt mục tiêu thì thắng chung cuộc; chủ phòng mở ván tiếp / chơi lại', () => {
    let s = setup([[T(3, 5)], [T(6, 6), T(5, 5)]], { target: '50', scores: { a: 40, b: 0 } });
    s = dominoGame.reduce(s, { type: 'play', tile: T(3, 5) }, ctx('a'));
    expect(s.champion).toBe(0);
    expect(dominoGame.reduce(s, { type: 'nextRound' }, ctx('a'))).toBe(s);
    const again = dominoGame.reduce(s, { type: 'restart' }, ctx('a'));
    expect(again.scores).toEqual({ a: 0, b: 0 });
    expect(again.roundResult).toBeNull();

    let r = setup([[T(3, 5)], [T(1, 1)]]);
    r = dominoGame.reduce(r, { type: 'play', tile: T(3, 5) }, ctx('a'));
    expect(r.champion).toBeNull();
    expect(dominoGame.reduce(r, { type: 'nextRound' }, ctx('b'))).toBe(r);
    const next = dominoGame.reduce(r, { type: 'nextRound' }, ctx('a'));
    expect(next.round).toBe(2);
    expect(next.scores.a).toBe(2);
    expect(next.hands.every((h) => h.length === 7)).toBe(true);
    expect(pipsOf(next.hands.flat()) + pipsOf(next.boneyard)).toBe(168);
  });
});

describe('domino: xếp dãy uốn khúc', () => {
  it('không quân nào chồng lên nhau và không tràn khung', () => {
    const line: Placed[] = [];
    let end = 0;
    for (const t of fullSet()) {
      const other = t.a === end ? t.b : t.b === end ? t.a : null;
      if (other === null) continue;
      line.push({ a: end, b: other, by: 0 });
      end = other;
    }
    const laid = layoutSnake(line, 12);
    expect(laid).toHaveLength(line.length);
    for (const l of laid) {
      expect(l.x).toBeGreaterThanOrEqual(0);
      expect(l.x + l.w).toBeLessThanOrEqual(12);
    }
    for (let i = 0; i < laid.length; i++)
      for (let j = i + 1; j < laid.length; j++) {
        const A = laid[i];
        const B = laid[j];
        const overlap = A.x < B.x + B.w - 1e-9 && B.x < A.x + A.w - 1e-9 && A.y < B.y + B.h - 1e-9 && B.y < A.y + A.h - 1e-9;
        expect(overlap).toBe(false);
      }
  });
});
