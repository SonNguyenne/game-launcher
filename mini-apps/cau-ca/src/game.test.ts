import { describe, expect, it } from 'vitest';
import { fishGame, type FishState } from './game';

const players = [
  { id: 'a', name: 'A' },
  { id: 'b', name: 'B' },
];
const ctx = (from: string) => ({ from, players, host: from === 'a' });

/** Bộ bài cố định: lá 0 và 1 cùng số, lá 2 khác. */
function stacked(over: Partial<FishState> = {}): FishState {
  const s = fishGame.init(players);
  const cards = s.cards.map((_, i) => ({ r: i < 2 ? 0 : 1 + (i % 12), s: i % 4 }));
  return { ...s, cards, ...over };
}

describe('câu cá', () => {
  it('câu được cặp thì cộng điểm và lấy bài', () => {
    let s = stacked();
    s = fishGame.reduce(s, { type: 'flip', index: 0 }, ctx('a'));
    s = fishGame.reduce(s, { type: 'flip', index: 1 }, ctx('a'));
    expect(s.scores.a).toBe(1);
    expect(s.taken[0]).toBe('a');
    expect(fishGame.advance(s).turn).toBe(1);
  });

  it('bật "câu được thì lật tiếp" thì giữ lượt', () => {
    let s = stacked({ again: true });
    s = fishGame.reduce(s, { type: 'flip', index: 0 }, ctx('a'));
    s = fishGame.reduce(s, { type: 'flip', index: 1 }, ctx('a'));
    expect(fishGame.advance(s).turn).toBe(0);
  });

  it('lật trượt khi bật phạt thì chờ quay vòng phạt', () => {
    let s = stacked();
    s = fishGame.reduce(s, { type: 'flip', index: 0 }, ctx('a'));
    s = fishGame.reduce(s, { type: 'flip', index: 2 }, ctx('a'));
    expect(s.phase).toBe('penalty');
  });

  it('không cho xáo sau khi đã lật lá đầu', () => {
    const s = fishGame.reduce(stacked(), { type: 'flip', index: 0 }, ctx('a'));
    expect(fishGame.reduce(s, { type: 'shuffle' }, ctx('b'))).toBe(s);
  });

  it('khách không đổi được cài đặt', () => {
    const s = stacked();
    expect(fishGame.reduce(s, { type: 'config', config: { penalty: false } }, ctx('b'))).toBe(s);
    expect(fishGame.reduce(s, { type: 'config', config: { penalty: false } }, ctx('a')).penalty).toBe(false);
  });
});
