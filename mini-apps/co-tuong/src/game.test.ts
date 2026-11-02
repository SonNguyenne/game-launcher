import { describe, expect, it } from 'vitest';
import { legalMoves, xiangqiGame, type Piece, type XiangqiState } from './game';

const players = [
  { id: 'a', name: 'A' },
  { id: 'b', name: 'B' },
  { id: 'c', name: 'C' },
];
const ctx = (from: string) => ({ from, players, host: from === 'a' });
const p = (r: number, c: number) => r * 9 + c;

const mv = (s: XiangqiState, from: number, to: number) => {
  const who = s.side === 'r' ? s.seats[s.redSeat] : s.seats[1 - s.redSeat];
  return xiangqiGame.reduce(s, { type: 'move', from, to }, ctx(who));
};

function setup(pieces: [number, Piece][], side: 'r' | 'b' = 'r'): XiangqiState {
  const s = xiangqiGame.init(players);
  const board: (Piece | null)[] = Array(90).fill(null);
  for (const [i, piece] of pieces) board[i] = piece;
  return { ...s, board, side, turn: side === 'r' ? 0 : 1 };
}
const targets = (s: XiangqiState, from: number) =>
  legalMoves(s.board, s.side)
    .filter((m) => m.from === from)
    .map((m) => m.to)
    .sort((a, b) => a - b);

describe('cờ tướng', () => {
  it('thế đầu: đỏ có 44 nước, đen không đi trước, người xem không đi được', () => {
    const s = xiangqiGame.init(players);
    expect(legalMoves(s.board, 'r')).toHaveLength(44);
    expect(xiangqiGame.reduce(s, { type: 'move', from: p(3, 0), to: p(4, 0) }, ctx('b'))).toBe(s);
    expect(xiangqiGame.reduce(s, { type: 'move', from: p(6, 0), to: p(5, 0) }, ctx('c'))).toBe(s);
    const next = mv(s, p(6, 0), p(5, 0));
    expect(next.board[p(5, 0)]).toBe('rP');
    expect(next.turn).toBe(1);
  });

  it('mã bị cản chân', () => {
    const free = setup([[p(9, 4), 'rK'], [p(0, 3), 'bK'], [p(5, 4), 'rH']]);
    expect(targets(free, p(5, 4))).toHaveLength(8);
    const blocked = setup([[p(9, 4), 'rK'], [p(0, 3), 'bK'], [p(5, 4), 'rH'], [p(4, 4), 'bP']]);
    expect(targets(blocked, p(5, 4))).not.toContain(p(3, 3));
    expect(targets(blocked, p(5, 4))).not.toContain(p(3, 5));
    expect(targets(blocked, p(5, 4))).toHaveLength(6);
  });

  it('tượng bị cản mắt và không qua sông', () => {
    const s = setup([[p(9, 4), 'rK'], [p(0, 3), 'bK'], [p(5, 2), 'rE']]);
    expect(targets(s, p(5, 2))).toEqual([p(7, 0), p(7, 4)]);
    const eye = setup([[p(9, 4), 'rK'], [p(0, 3), 'bK'], [p(5, 2), 'rE'], [p(6, 3), 'rP']]);
    expect(targets(eye, p(5, 2))).toEqual([p(7, 0)]);
  });

  it('pháo phải cách đúng một quân mới ăn được', () => {
    const s = xiangqiGame.init(players);
    const t = targets(s, p(7, 1));
    expect(t).toContain(p(0, 1)); // nhảy qua pháo đen ăn mã
    expect(t).not.toContain(p(2, 1));
    expect(t).not.toContain(p(9, 1));
    expect(mv(s, p(7, 1), p(0, 1)).board[p(0, 1)]).toBe('rC');
  });

  it('tốt chưa qua sông chỉ đi thẳng, qua sông thì đi ngang, không đi lùi', () => {
    const home = setup([[p(9, 4), 'rK'], [p(0, 3), 'bK'], [p(6, 2), 'rP']]);
    expect(targets(home, p(6, 2))).toEqual([p(5, 2)]);
    const crossed = setup([[p(9, 4), 'rK'], [p(0, 3), 'bK'], [p(4, 2), 'rP']]);
    expect(targets(crossed, p(4, 2))).toEqual([p(3, 2), p(4, 1), p(4, 3)]);
  });

  it('tướng và sĩ không ra khỏi cung', () => {
    const s = setup([[p(7, 3), 'rK'], [p(0, 4), 'bK'], [p(7, 5), 'rA']]);
    expect(targets(s, p(7, 3))).toEqual([p(8, 3)]);
    expect(targets(s, p(7, 5))).toEqual([p(8, 4)]);
  });

  it('không được để hai tướng đối mặt', () => {
    // Xe đỏ đứng giữa hai tướng: đi ngang ra là lộ mặt tướng.
    const s = setup([[p(9, 4), 'rK'], [p(0, 4), 'bK'], [p(5, 4), 'rR']]);
    expect(targets(s, p(5, 4)).every((t) => t % 9 === 4)).toBe(true);
    expect(mv(s, p(5, 4), p(5, 0))).toBe(s);
    // Tướng không bước sang cột có tướng địch trống trơn.
    const k = setup([[p(9, 3), 'rK'], [p(0, 4), 'bK']]);
    expect(targets(k, p(9, 3))).toEqual([p(8, 3)]);
  });

  it('chiếu hết thì thắng', () => {
    const s = setup([[p(0, 4), 'bK'], [p(9, 3), 'rK'], [p(1, 0), 'rR'], [p(5, 8), 'rR']]);
    const next = mv(s, p(5, 8), p(0, 8));
    expect(next.done).toBe(true);
    expect(next.reason).toBe('mate');
    expect(next.winner).toBe(0);
    expect(next.wins.a).toBe(1);
  });

  it('hết nước đi là thua dù không bị chiếu', () => {
    const s = setup([[p(0, 4), 'bK'], [p(9, 3), 'rK'], [p(2, 6), 'rH']]);
    const next = mv(s, p(9, 3), p(8, 3));
    expect(next.done).toBe(true);
    expect(next.reason).toBe('stalemate');
    expect(next.winner).toBe(0);
  });

  it('xin hòa, đầu hàng, ván mới đổi bên', () => {
    let s = xiangqiGame.init(players);
    s = xiangqiGame.reduce(s, { type: 'offer' }, ctx('a'));
    expect(s.turn).toBe(1);
    expect(xiangqiGame.reduce(s, { type: 'answer', accept: true }, ctx('a'))).toBe(s);
    expect(xiangqiGame.reduce(s, { type: 'answer', accept: true }, ctx('b')).reason).toBe('agree');
    const resigned = xiangqiGame.reduce(xiangqiGame.init(players), { type: 'resign' }, ctx('a'));
    expect(resigned.winner).toBe(1);
    expect(xiangqiGame.reduce(resigned, { type: 'restart' }, ctx('b'))).toBe(resigned);
    const again = xiangqiGame.reduce(resigned, { type: 'restart' }, ctx('a'));
    expect(again.redSeat).toBe(1);
    expect(again.turn).toBe(1);
    expect(again.wins.b).toBe(1);
  });
});
