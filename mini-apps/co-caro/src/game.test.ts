import { describe, expect, it } from 'vitest';
import { caroGame, findLine, type CaroState } from './game';

const players = [
  { id: 'a', name: 'A' },
  { id: 'b', name: 'B' },
  { id: 'c', name: 'C' },
];
const ctx = (from: string) => ({ from, players, host: from === 'a' });

const play = (s: CaroState, moves: [string, number][]) => moves.reduce((st, [who, index]) => caroGame.reduce(st, { type: 'place', index }, ctx(who)), s);

describe('cờ caro', () => {
  it('chỉ người tới lượt được đánh, người xem không đánh được', () => {
    const s = caroGame.init(players);
    expect(caroGame.reduce(s, { type: 'place', index: 0 }, ctx('b'))).toBe(s);
    expect(caroGame.reduce(s, { type: 'place', index: 0 }, ctx('c'))).toBe(s);
    const next = caroGame.reduce(s, { type: 'place', index: 0 }, ctx('a'));
    expect(next.cells[0]).toBe(0);
    expect(next.turn).toBe(1);
    expect(caroGame.reduce(next, { type: 'place', index: 0 }, ctx('b'))).toBe(next);
  });

  it('5 quân liền hàng ngang thì thắng và cộng tỉ số', () => {
    const s = play(caroGame.init(players), [
      ['a', 0], ['b', 15],
      ['a', 1], ['b', 16],
      ['a', 2], ['b', 17],
      ['a', 3], ['b', 18],
      ['a', 4],
    ]);
    expect(s.done).toBe(true);
    expect(s.winner).toBe(0);
    expect(s.line).toEqual([0, 1, 2, 3, 4]);
    expect(s.wins.a).toBe(1);
  });

  it('luật chặn hai đầu: hàng bị chặn kín không tính', () => {
    const size = 15;
    const cells = Array(size * size).fill(null);
    // O X X X X X O trên hàng đầu
    cells[0] = 1;
    for (let i = 1; i <= 5; i++) cells[i] = 0;
    cells[6] = 1;
    expect(findLine(cells, size, 3, 'blocked')).toEqual([]);
    expect(findLine(cells, size, 3, 'free')).toHaveLength(5);
  });

  it('đi lại chỉ khi đối thủ chưa đánh tiếp', () => {
    let s = play(caroGame.init(players), [['a', 10]]);
    expect(caroGame.reduce(s, { type: 'undo' }, ctx('b'))).toBe(s);
    s = caroGame.reduce(s, { type: 'undo' }, ctx('a'));
    expect(s.cells[10]).toBeNull();
    expect(s.turn).toBe(0);
  });

  it('ván mới đổi người đi trước, giữ tỉ số', () => {
    let s = play(caroGame.init(players), [
      ['a', 0], ['b', 15], ['a', 1], ['b', 16], ['a', 2], ['b', 17], ['a', 3], ['b', 18], ['a', 4],
    ]);
    s = caroGame.reduce(s, { type: 'restart' }, ctx('a'));
    expect(s.done).toBe(false);
    expect(s.first).toBe(1);
    expect(s.turn).toBe(1);
    expect(s.wins.a).toBe(1);
  });
});
