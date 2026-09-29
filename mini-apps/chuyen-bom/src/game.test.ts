import { describe, expect, it } from 'vitest';
import { bombGame } from './game';

const players = [
  { id: 'a', name: 'A' },
  { id: 'b', name: 'B' },
];

describe('chuyền bom', () => {
  it('chuyền qua lại tới khi đủ số lần thì nổ ở người đang cầm', () => {
    let s = { ...bombGame.init(players), fuse: 3 };
    s = bombGame.reduce(s, { type: 'tap' }, { from: 'a', players, host: true });
    s = bombGame.reduce(s, { type: 'tap' }, { from: 'b', players, host: true });
    expect(s.result).toBeNull();
    s = bombGame.reduce(s, { type: 'tap' }, { from: 'a', players, host: true });
    expect(s.result?.playerId).toBe('a');
  });

  it('bỏ qua người bấm không phải lượt mình', () => {
    const s = bombGame.init(players);
    expect(bombGame.reduce(s, { type: 'tap' }, { from: 'b', players, host: false })).toBe(s);
  });
});
