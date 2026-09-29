import { describe, expect, it } from 'vitest';
import { baseState, pickFresh, playerAt, runReduce, withResult, type BaseState, type GameDef } from './engine';

const players = [
  { id: 'a', name: 'A' },
  { id: 'b', name: 'B' },
  { id: 'c', name: 'C' },
];

type S = BaseState & { hits: number };
const game: GameDef<S, { type: 'hit' }> = {
  id: 'test',
  init: () => ({ ...baseState(), hits: 0 }),
  advance: (s) => ({ ...s, turn: s.turn + 1, seq: s.seq + 1, result: null }),
  reduce: (s) => withResult({ ...s, hits: s.hits + 1 }, { playerId: 'a', text: 'hit' }),
};

describe('playerAt', () => {
  it('xoay vòng theo lượt, kể cả lượt âm', () => {
    expect(playerAt(players, 0)?.id).toBe('a');
    expect(playerAt(players, 4)?.id).toBe('b');
    expect(playerAt(players, -1)?.id).toBe('c');
    expect(playerAt([], 3)).toBeUndefined();
  });
});

describe('runReduce', () => {
  const ctx = { from: 'a', players, host: true };

  it('"next" chỉ sang lượt khi đúng seq của thẻ kết quả (chống bấm trùng từ nhiều máy)', () => {
    const s = runReduce(game, game.init(players), { type: 'hit' }, ctx);
    expect(s.result?.seq).toBe(1);
    expect(runReduce(game, s, { type: 'next', seq: 0 }, ctx)).toBe(s);
    const next = runReduce(game, s, { type: 'next', seq: 1 }, ctx);
    expect(next.turn).toBe(1);
    expect(next.result).toBeNull();
  });

  it('"skip" chỉ chủ phòng được dùng', () => {
    const s = game.init(players);
    expect(runReduce(game, s, { type: 'skip' }, { ...ctx, host: false })).toBe(s);
    expect(runReduce(game, s, { type: 'skip' }, ctx).turn).toBe(1);
  });
});

describe('pickFresh', () => {
  it('không lặp lại cho tới khi dùng hết', () => {
    let used: number[] = [];
    const seen = new Set<number>();
    for (let i = 0; i < 5; i++) {
      const r = pickFresh(5, used);
      seen.add(r.index);
      used = r.used;
    }
    expect(seen.size).toBe(5);
    expect(pickFresh(5, used).used).toHaveLength(1);
  });
});
