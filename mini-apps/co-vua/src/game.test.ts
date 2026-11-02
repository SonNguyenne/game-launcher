import { describe, expect, it } from 'vitest';
import { chessGame, insufficient, legalMoves, type ChessAction, type ChessState, type Piece } from './game';

const players = [
  { id: 'a', name: 'A' },
  { id: 'b', name: 'B' },
  { id: 'c', name: 'C' },
];
const ctx = (from: string, now = 0) => ({ from, players, host: from === 'a', now });

/** 'e2' -> chỉ số ô. */
const sq = (name: string) => (8 - Number(name[1])) * 8 + (name.charCodeAt(0) - 97);
const mv = (s: ChessState, from: string, to: string, promo?: 'Q' | 'R' | 'B' | 'N', now = 0): ChessState => {
  const who = s.side === 'w' ? s.seats[s.whiteSeat] : s.seats[1 - s.whiteSeat];
  return chessGame.reduce(s, { type: 'move', from: sq(from), to: sq(to), promo }, ctx(who, now));
};
const play = (s: ChessState, moves: string) =>
  moves.split(' ').reduce((st, m) => {
    const next = mv(st, m.slice(0, 2), m.slice(2, 4), (m[4] as 'Q') || undefined);
    if (next === st) throw new Error(`nước ${m} bị từ chối`);
    return next;
  }, s);

/** Dựng thế cờ từ danh sách quân. */
function setup(pieces: Record<string, Piece>, side: 'w' | 'b' = 'w', castle = ''): ChessState {
  const s = chessGame.init(players);
  const board: (Piece | null)[] = Array(64).fill(null);
  for (const [k, p] of Object.entries(pieces)) board[sq(k)] = p;
  return { ...s, board, side, castle, turn: side === 'w' ? 0 : 1 };
}

describe('cờ vua', () => {
  it('thế đầu có 20 nước, chỉ trắng đi được', () => {
    const s = chessGame.init(players);
    expect(legalMoves(s)).toHaveLength(20);
    expect(chessGame.reduce(s, { type: 'move', from: sq('e2'), to: sq('e4') }, ctx('b'))).toBe(s);
    expect(chessGame.reduce(s, { type: 'move', from: sq('e2'), to: sq('e4') }, ctx('c'))).toBe(s);
    expect(mv(s, 'e2', 'e5')).toBe(s);
    const next = mv(s, 'e2', 'e4');
    expect(next.board[sq('e4')]).toBe('wP');
    expect(next.turn).toBe(1);
    expect(next.ep).toBe(sq('e3'));
  });

  it('chiếu hết kiểu cờ thằng ngốc', () => {
    const s = play(chessGame.init(players), 'f2f3 e7e5 g2g4 d8h4');
    expect(s.done).toBe(true);
    expect(s.reason).toBe('mate');
    expect(s.winner).toBe(1);
    expect(s.wins.b).toBe(1);
  });

  it('không được đi nước để vua bị chiếu', () => {
    let s = setup({ e1: 'wK', e2: 'wR', e8: 'bR', a8: 'bK' });
    expect(mv(s, 'e2', 'd2')).toBe(s);
    s = mv(s, 'e2', 'e5');
    expect(s.board[sq('e5')]).toBe('wR');
  });

  it('nhập thành hai cánh và mất quyền khi vua đã đi', () => {
    const base = setup({ e1: 'wK', h1: 'wR', a1: 'wR', e8: 'bK' }, 'w', 'KQ');
    const short = mv(base, 'e1', 'g1');
    expect(short.board[sq('g1')]).toBe('wK');
    expect(short.board[sq('f1')]).toBe('wR');
    expect(short.board[sq('h1')]).toBeNull();
    const long = mv(base, 'e1', 'c1');
    expect(long.board[sq('d1')]).toBe('wR');
    expect(long.castle).toBe('');
    // Vua đi qua ô bị tấn công thì không được nhập thành.
    const guarded = setup({ e1: 'wK', h1: 'wR', f8: 'bR', a8: 'bK' }, 'w', 'K');
    expect(mv(guarded, 'e1', 'g1')).toBe(guarded);
    // Đang bị chiếu cũng không được.
    const checked = setup({ e1: 'wK', h1: 'wR', e8: 'bR', a8: 'bK' }, 'w', 'K');
    expect(mv(checked, 'e1', 'g1')).toBe(checked);
  });

  it('bắt tốt qua đường chỉ ngay nước sau', () => {
    let s = play(chessGame.init(players), 'e2e4 a7a6 e4e5 d7d5');
    const ep = mv(s, 'e5', 'd6');
    expect(ep.board[sq('d6')]).toBe('wP');
    expect(ep.board[sq('d5')]).toBeNull();
    s = play(s, 'h2h3 h7h6');
    expect(mv(s, 'e5', 'd6')).toBe(s);
  });

  it('phong cấp phải chọn quân', () => {
    const s = setup({ a7: 'wP', e1: 'wK', h8: 'bK' });
    expect(mv(s, 'a7', 'a8')).toBe(s);
    const n = mv(s, 'a7', 'a8', 'N');
    expect(n.board[sq('a8')]).toBe('wN');
    const q = mv(s, 'a7', 'a8', 'Q');
    expect(q.board[sq('a8')]).toBe('wQ');
  });

  it('hết nước đi mà không bị chiếu là hòa', () => {
    const s = setup({ a8: 'bK', c6: 'wK', b5: 'wQ' });
    const next = mv(s, 'b5', 'b6');
    expect(next.done).toBe(true);
    expect(next.reason).toBe('stalemate');
    expect(next.winner).toBeNull();
  });

  it('không đủ quân chiếu hết thì hòa', () => {
    const b = (m: Record<string, Piece>) => {
      const arr: (Piece | null)[] = Array(64).fill(null);
      for (const [k, p] of Object.entries(m)) arr[sq(k)] = p;
      return arr;
    };
    expect(insufficient(b({ e1: 'wK', e8: 'bK' }))).toBe(true);
    expect(insufficient(b({ e1: 'wK', e8: 'bK', c3: 'wN' }))).toBe(true);
    expect(insufficient(b({ e1: 'wK', e8: 'bK', c1: 'wB', c8: 'bB' }))).toBe(false);
    expect(insufficient(b({ e1: 'wK', e8: 'bK', c1: 'wB', f8: 'bB' }))).toBe(true);
    expect(insufficient(b({ e1: 'wK', e8: 'bK', a2: 'wP' }))).toBe(false);
    const s = setup({ e1: 'wK', e8: 'bK', d2: 'bR' });
    const next = mv(s, 'e1', 'd2');
    expect(next.reason).toBe('material');
  });

  it('xin hòa: người kia trả lời, chơi 1 máy chuyển lượt cho người trả lời', () => {
    let s = chessGame.init(players);
    s = chessGame.reduce(s, { type: 'offer' }, ctx('a'));
    expect(s.drawOffer).toBe(0);
    expect(s.turn).toBe(1);
    expect(chessGame.reduce(s, { type: 'answer', accept: true }, ctx('a'))).toBe(s);
    const declined = chessGame.reduce(s, { type: 'answer', accept: false }, ctx('b'));
    expect(declined.drawOffer).toBeNull();
    expect(declined.turn).toBe(0);
    const agreed = chessGame.reduce(s, { type: 'answer', accept: true }, ctx('b'));
    expect(agreed.done).toBe(true);
    expect(agreed.reason).toBe('agree');
  });

  it('đầu hàng thì đối thủ thắng, người xem không đầu hàng được', () => {
    const s = chessGame.init(players);
    expect(chessGame.reduce(s, { type: 'resign' }, ctx('c'))).toBe(s);
    const r = chessGame.reduce(s, { type: 'resign' }, ctx('b'));
    expect(r.winner).toBe(0);
    expect(r.reason).toBe('resign');
  });

  it('đồng hồ: trừ giờ khi đi, hết giờ thì thua', () => {
    let s = chessGame.reduce(chessGame.init(players), { type: 'config', config: { clock: '5' } } as ChessAction, ctx('a', 1000));
    expect(s.timeLeft.w).toBe(300_000);
    s = mv(s, 'e2', 'e4', undefined, 11_000);
    expect(s.timeLeft.w).toBe(290_000);
    expect(s.turnStart).toBe(11_000);
    // Báo hết giờ sớm bị bỏ qua.
    expect(chessGame.reduce(s, { type: 'flag' }, ctx('a', 100_000))).toBe(s);
    const flagged = chessGame.reduce(s, { type: 'flag' }, ctx('a', 11_000 + 300_001));
    expect(flagged.done).toBe(true);
    expect(flagged.reason).toBe('time');
    expect(flagged.winner).toBe(0);
  });

  it('ván mới đổi màu, giữ tỉ số', () => {
    let s = play(chessGame.init(players), 'f2f3 e7e5 g2g4 d8h4');
    expect(chessGame.reduce(s, { type: 'restart' }, ctx('b'))).toBe(s);
    s = chessGame.reduce(s, { type: 'restart' }, ctx('a'));
    expect(s.whiteSeat).toBe(1);
    expect(s.turn).toBe(1);
    expect(s.wins.b).toBe(1);
    expect(mv(s, 'e2', 'e4').board[sq('e4')]).toBe('wP');
  });

  it('lặp thế cờ 3 lần là hòa', () => {
    const s = play(chessGame.init(players), 'g1f3 g8f6 f3g1 f6g8 g1f3 g8f6 f3g1 f6g8');
    expect(s.done).toBe(true);
    expect(s.reason).toBe('repetition');
  });
});
