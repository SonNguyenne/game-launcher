import { baseState, type BaseState, type GameDef, type Party, type Player } from '@bang/party';
import type { ClockSetting } from './strings';

/** Màu quân: trắng đi trước. */
export type Color = 'w' | 'b';
export type Kind = 'P' | 'N' | 'B' | 'R' | 'Q' | 'K';
export type Piece = `${Color}${Kind}`;
export type Seat = 0 | 1;
export type Promo = 'Q' | 'R' | 'B' | 'N';

/**
 * Ô bàn cờ đánh số 0..63 theo hàng từ trên xuống: hàng 0 là hàng 8 (quân đen), hàng 7 là hàng 1 (quân trắng).
 * Cột 0 là cột a.
 */
export interface Move {
  from: number;
  to: number;
  promo?: Promo;
}

export interface Position {
  board: (Piece | null)[];
  side: Color;
  /** Quyền nhập thành còn lại, dạng FEN: 'KQkq'. */
  castle: string;
  /** Ô có thể bắt tốt qua đường (ô tốt đối phương vừa đi qua), hoặc null. */
  ep: number | null;
}

export type EndReason = 'mate' | 'stalemate' | 'material' | 'agree' | 'resign' | 'time' | 'repetition' | 'fifty';

export interface ChessState extends BaseState, Position {
  /** id người ngồi ghế 0 và ghế 1 (hai người đầu danh sách). */
  seats: [string, string];
  /** Ghế cầm quân trắng; đổi mỗi ván. */
  whiteSeat: Seat;
  /** Các nước đã đi (để tô nước cuối, đếm số nước). */
  history: Move[];
  /** Số nửa nước từ lần ăn quân hoặc đi tốt gần nhất (luật 50 nước). */
  halfmove: number;
  /** Khóa thế cờ từ lần đi không đảo ngược được gần nhất, để xét lặp 3 lần. */
  keys: string[];
  /** Ghế đang xin hòa, chờ đối thủ trả lời. */
  drawOffer: Seat | null;
  done: boolean;
  /** Ghế thắng; null nếu hòa (hoặc chưa xong). */
  winner: Seat | null;
  reason: EndReason | null;
  clock: ClockSetting;
  /** Thời gian còn lại của mỗi màu (ms), tính tới mốc turnStart. */
  timeLeft: Record<Color, number>;
  /** Giờ chung lúc bên đang đi bắt đầu nghĩ. */
  turnStart: number;
  wins: Record<string, number>;
}

export type Config = Partial<Pick<ChessState, 'clock'>>;

export type ChessAction =
  | { type: 'move'; from: number; to: number; promo?: Promo }
  | { type: 'offer' }
  | { type: 'answer'; accept: boolean }
  | { type: 'resign' }
  | { type: 'flag' }
  | { type: 'restart' }
  | { type: 'config'; config: Config };

export type ChessParty = Party<ChessState, ChessAction>;

const BACK: Kind[] = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
export const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');
const rowOf = (i: number) => i >> 3;
const colOf = (i: number) => i & 7;
const at = (r: number, c: number) => (r < 0 || r > 7 || c < 0 || c > 7 ? -1 : r * 8 + c);

export function startBoard(): (Piece | null)[] {
  const b: (Piece | null)[] = Array(64).fill(null);
  for (let c = 0; c < 8; c++) {
    b[c] = `b${BACK[c]}`;
    b[8 + c] = 'bP';
    b[48 + c] = 'wP';
    b[56 + c] = `w${BACK[c]}`;
  }
  return b;
}

const KNIGHT = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]] as const;
const KING = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]] as const;
const ROOK = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const;
const BISHOP = [[-1, -1], [-1, 1], [1, -1], [1, 1]] as const;

/** Ô sq có bị quân màu `by` tấn công không. */
export function attacked(board: readonly (Piece | null)[], sq: number, by: Color): boolean {
  const r = rowOf(sq);
  const c = colOf(sq);
  // Tốt trắng đánh lên (hàng nhỏ hơn), nên tốt trắng tấn công sq nằm ở hàng r+1.
  const pr = by === 'w' ? r + 1 : r - 1;
  for (const dc of [-1, 1]) {
    const i = at(pr, c + dc);
    if (i >= 0 && board[i] === `${by}P`) return true;
  }
  for (const [dr, dc] of KNIGHT) {
    const i = at(r + dr, c + dc);
    if (i >= 0 && board[i] === `${by}N`) return true;
  }
  for (const [dr, dc] of KING) {
    const i = at(r + dr, c + dc);
    if (i >= 0 && board[i] === `${by}K`) return true;
  }
  const slide = (dirs: readonly (readonly [number, number])[], kinds: Kind[]) => {
    for (const [dr, dc] of dirs) {
      let rr = r + dr;
      let cc = c + dc;
      for (let i = at(rr, cc); i >= 0; rr += dr, cc += dc, i = at(rr, cc)) {
        const p = board[i];
        if (!p) continue;
        if (p[0] === by && kinds.includes(p[1] as Kind)) return true;
        break;
      }
    }
    return false;
  };
  return slide(ROOK, ['R', 'Q']) || slide(BISHOP, ['B', 'Q']);
}

export const kingSquare = (board: readonly (Piece | null)[], color: Color) => board.indexOf(`${color}K`);

export const inCheck = (p: Pick<Position, 'board' | 'side'>) => {
  const k = kingSquare(p.board, p.side);
  return k >= 0 && attacked(p.board, k, other(p.side));
};

/** Nước đi giả hợp lệ (chưa xét vua có bị chiếu sau khi đi không), trừ nhập thành đã xét đủ. */
function pseudoMoves(p: Position): Move[] {
  const { board, side } = p;
  const out: Move[] = [];
  const enemy = other(side);
  const push = (from: number, to: number) => {
    const r = rowOf(to);
    if (board[from]?.[1] === 'P' && (r === 0 || r === 7)) {
      for (const promo of ['Q', 'R', 'B', 'N'] as const) out.push({ from, to, promo });
    } else out.push({ from, to });
  };
  for (let sq = 0; sq < 64; sq++) {
    const piece = board[sq];
    if (!piece || piece[0] !== side) continue;
    const kind = piece[1] as Kind;
    const r = rowOf(sq);
    const c = colOf(sq);
    if (kind === 'P') {
      const dir = side === 'w' ? -1 : 1;
      const home = side === 'w' ? 6 : 1;
      const one = at(r + dir, c);
      if (one >= 0 && !board[one]) {
        push(sq, one);
        const two = at(r + 2 * dir, c);
        if (r === home && !board[two]) push(sq, two);
      }
      for (const dc of [-1, 1]) {
        const t = at(r + dir, c + dc);
        if (t < 0) continue;
        if (board[t]?.[0] === enemy || t === p.ep) push(sq, t);
      }
    } else if (kind === 'N' || kind === 'K') {
      for (const [dr, dc] of kind === 'N' ? KNIGHT : KING) {
        const t = at(r + dr, c + dc);
        if (t >= 0 && board[t]?.[0] !== side) push(sq, t);
      }
    } else {
      const dirs = kind === 'R' ? ROOK : kind === 'B' ? BISHOP : [...ROOK, ...BISHOP];
      for (const [dr, dc] of dirs) {
        let rr = r + dr;
        let cc = c + dc;
        for (let t = at(rr, cc); t >= 0; rr += dr, cc += dc, t = at(rr, cc)) {
          if (board[t]?.[0] === side) break;
          push(sq, t);
          if (board[t]) break;
        }
      }
    }
  }
  // Nhập thành: vua và xe chưa đi, ô giữa trống, vua không đang bị chiếu, không đi qua hay đứng vào ô bị tấn công.
  const homeRow = side === 'w' ? 7 : 0;
  const k = homeRow * 8 + 4;
  if (board[k] === `${side}K` && !attacked(board, k, enemy)) {
    const rights = side === 'w' ? ['K', 'Q'] : ['k', 'q'];
    if (p.castle.includes(rights[0]) && board[k + 3] === `${side}R` && !board[k + 1] && !board[k + 2] && !attacked(board, k + 1, enemy) && !attacked(board, k + 2, enemy)) {
      out.push({ from: k, to: k + 2 });
    }
    if (p.castle.includes(rights[1]) && board[k - 4] === `${side}R` && !board[k - 1] && !board[k - 2] && !board[k - 3] && !attacked(board, k - 1, enemy) && !attacked(board, k - 2, enemy)) {
      out.push({ from: k, to: k - 2 });
    }
  }
  return out;
}

/** Áp nước đi (không kiểm tra hợp lệ). */
export function applyMove(p: Position, m: Move): Position {
  const board = p.board.slice();
  const piece = board[m.from]!;
  const side = piece[0] as Color;
  const kind = piece[1] as Kind;
  board[m.to] = m.promo && kind === 'P' ? `${side}${m.promo}` : piece;
  board[m.from] = null;
  if (kind === 'P' && m.to === p.ep && colOf(m.to) !== colOf(m.from)) {
    // Bắt tốt qua đường: tốt bị bắt đứng cùng hàng với ô xuất phát.
    board[rowOf(m.from) * 8 + colOf(m.to)] = null;
  }
  if (kind === 'K' && Math.abs(m.to - m.from) === 2) {
    const kingSide = m.to > m.from;
    const rookFrom = kingSide ? m.from + 3 : m.from - 4;
    const rookTo = kingSide ? m.from + 1 : m.from - 1;
    board[rookTo] = board[rookFrom];
    board[rookFrom] = null;
  }
  let castle = p.castle;
  const drop = (ch: string) => (castle = castle.replace(ch, ''));
  if (kind === 'K') {
    for (const ch of side === 'w' ? 'KQ' : 'kq') drop(ch);
  }
  for (const sq of [m.from, m.to]) {
    if (sq === 63) drop('K');
    if (sq === 56) drop('Q');
    if (sq === 7) drop('k');
    if (sq === 0) drop('q');
  }
  const ep = kind === 'P' && Math.abs(m.to - m.from) === 16 ? (m.from + m.to) / 2 : null;
  return { board, side: other(side), castle, ep };
}

export function legalMoves(p: Position): Move[] {
  return pseudoMoves(p).filter((m) => {
    const next = applyMove(p, m);
    const k = kingSquare(next.board, p.side);
    return k >= 0 && !attacked(next.board, k, next.side);
  });
}

/** Không bên nào đủ quân chiếu hết: chỉ còn vua, vua + 1 mã/tượng, hoặc chỉ tượng cùng màu ô. */
export function insufficient(board: readonly (Piece | null)[]): boolean {
  const extra: { kind: Kind; sq: number }[] = [];
  board.forEach((p, sq) => {
    if (p && p[1] !== 'K') extra.push({ kind: p[1] as Kind, sq });
  });
  if (extra.length === 0) return true;
  if (extra.length === 1 && (extra[0].kind === 'N' || extra[0].kind === 'B')) return true;
  if (extra.every((e) => e.kind === 'B')) {
    const shade = (sq: number) => (rowOf(sq) + colOf(sq)) % 2;
    return extra.every((e) => shade(e.sq) === shade(extra[0].sq));
  }
  return false;
}

/** Một màu còn đủ quân để chiếu hết không (dùng khi hết giờ: đối thủ không đủ quân thì hòa). */
function canMate(board: readonly (Piece | null)[], color: Color): boolean {
  const mine = board.filter((p) => p && p[0] === color && p[1] !== 'K') as Piece[];
  if (mine.some((p) => p[1] === 'P' || p[1] === 'R' || p[1] === 'Q')) return true;
  return mine.length >= 2;
}

function positionKey(p: Position): string {
  // Ô bắt qua đường chỉ tính khi có tốt đứng cạnh để bắt.
  let ep = '';
  if (p.ep !== null) {
    const r = p.side === 'w' ? rowOf(p.ep) + 1 : rowOf(p.ep) - 1;
    const c = colOf(p.ep);
    if ([at(r, c - 1), at(r, c + 1)].some((i) => i >= 0 && p.board[i] === `${p.side}P`)) ep = String(p.ep);
  }
  return `${p.board.map((x) => x ?? '.').join('')}|${p.side}|${p.castle}|${ep}`;
}

export const colorOf = (s: Pick<ChessState, 'whiteSeat'>, seat: Seat): Color => (seat === s.whiteSeat ? 'w' : 'b');
export const seatOfColor = (s: Pick<ChessState, 'whiteSeat'>, color: Color): Seat => (color === 'w' ? s.whiteSeat : ((1 - s.whiteSeat) as Seat));
export const seatOf = (s: Pick<ChessState, 'seats'>, id: string): Seat | null => {
  const i = s.seats.indexOf(id);
  return i < 0 ? null : (i as Seat);
};

/** Ghế đang phải hành động: người trả lời lời xin hòa, hoặc bên tới lượt đi. */
export const actorSeat = (s: Pick<ChessState, 'drawOffer' | 'side' | 'whiteSeat'>): Seat =>
  s.drawOffer !== null ? ((1 - s.drawOffer) as Seat) : seatOfColor(s, s.side);

export const CLOCK_MS: Record<ClockSetting, number> = { none: 0, '5': 5 * 60_000, '10': 10 * 60_000 };

/** Thời gian còn lại của một màu tại thời điểm now. */
export function remaining(s: Pick<ChessState, 'clock' | 'timeLeft' | 'turnStart' | 'side' | 'done'>, color: Color, now: number): number {
  const left = s.timeLeft[color];
  if (s.done || color !== s.side) return left;
  return Math.max(0, left - Math.max(0, now - s.turnStart));
}

function fresh(players: Player[], clock: ClockSetting = 'none', whiteSeat: Seat = 0, wins: Record<string, number> = {}, now = 0): ChessState {
  const pos: Position = { board: startBoard(), side: 'w', castle: 'KQkq', ep: null };
  const ms = CLOCK_MS[clock];
  return {
    ...baseState(),
    ...pos,
    turn: whiteSeat,
    seats: [players[0]?.id ?? '', players[1]?.id ?? ''],
    whiteSeat,
    history: [],
    halfmove: 0,
    keys: [positionKey(pos)],
    drawOffer: null,
    done: false,
    winner: null,
    reason: null,
    clock,
    timeLeft: { w: ms, b: ms },
    turnStart: now,
    wins,
  };
}

function finish(s: ChessState, winner: Seat | null, reason: EndReason): ChessState {
  const id = winner === null ? null : s.seats[winner];
  return {
    ...s,
    done: true,
    winner,
    reason,
    drawOffer: null,
    wins: id ? { ...s.wins, [id]: (s.wins[id] ?? 0) + 1 } : s.wins,
    seq: s.seq + 1,
  };
}

const withTurn = (s: ChessState): ChessState => ({ ...s, turn: actorSeat(s) });

export const chessGame: GameDef<ChessState, ChessAction> = {
  id: 'co-vua',
  init: (players) => fresh(players),
  configOf: (s) => ({ clock: s.clock }),
  // Cờ vua không dùng thẻ kết quả.
  advance: (s) => s,
  reduce(s, a, c) {
    const now = c.now ?? Date.now();
    if (a.type === 'config') {
      if (!c.host || s.history.length) return s;
      const clock: ClockSetting = a.config.clock === '5' || a.config.clock === '10' ? a.config.clock : 'none';
      return { ...fresh(c.players, clock, s.whiteSeat, s.wins, now), seq: s.seq + 1 };
    }
    if (a.type === 'restart') {
      if (!c.host || !s.done) return s;
      return { ...fresh(c.players, s.clock, (1 - s.whiteSeat) as Seat, s.wins, now), seq: s.seq + 1 };
    }
    if (s.done) return s;
    if (a.type === 'flag') {
      // Ai cũng báo được hết giờ; luật tự kiểm tra theo giờ chung.
      if (s.clock === 'none' || remaining(s, s.side, now) > 0) return s;
      const timed = { ...s, timeLeft: { ...s.timeLeft, [s.side]: 0 } };
      const opp = other(s.side);
      return finish(timed, canMate(s.board, opp) ? seatOfColor(s, opp) : null, 'time');
    }
    const seat = seatOf(s, c.from);
    if (seat === null) return s;
    if (a.type === 'resign') return finish(s, (1 - seat) as Seat, 'resign');
    if (a.type === 'offer') {
      if (s.drawOffer !== null) return s;
      return withTurn({ ...s, drawOffer: seat, seq: s.seq + 1 });
    }
    if (a.type === 'answer') {
      if (s.drawOffer === null || s.drawOffer === seat) return s;
      if (a.accept) return finish(s, null, 'agree');
      return withTurn({ ...s, drawOffer: null, seq: s.seq + 1 });
    }
    if (a.type === 'move') {
      if (colorOf(s, seat) !== s.side) return s;
      const move = legalMoves(s).find((m) => m.from === a.from && m.to === a.to && (m.promo ?? null) === (a.promo ?? null));
      if (!move) return s;
      let timeLeft = s.timeLeft;
      if (s.clock !== 'none') {
        const left = remaining(s, s.side, now);
        if (left <= 0) {
          const opp = other(s.side);
          return finish({ ...s, timeLeft: { ...s.timeLeft, [s.side]: 0 } }, canMate(s.board, opp) ? seatOfColor(s, opp) : null, 'time');
        }
        timeLeft = { ...s.timeLeft, [s.side]: left };
      }
      const irreversible = s.board[move.from]?.[1] === 'P' || s.board[move.to] !== null || (s.board[move.from]?.[1] === 'P' && move.to === s.ep);
      const pos = applyMove(s, move);
      const key = positionKey(pos);
      const keys = irreversible ? [key] : [...s.keys, key];
      const next: ChessState = {
        ...s,
        ...pos,
        history: [...s.history, move],
        halfmove: irreversible ? 0 : s.halfmove + 1,
        keys,
        drawOffer: null,
        timeLeft,
        turnStart: now,
        seq: s.seq + 1,
      };
      const replies = legalMoves(pos);
      if (!replies.length) {
        return inCheck(pos) ? finish(next, seat, 'mate') : finish(next, null, 'stalemate');
      }
      if (insufficient(pos.board)) return finish(next, null, 'material');
      if (keys.filter((k) => k === key).length >= 3) return finish(next, null, 'repetition');
      if (next.halfmove >= 100) return finish(next, null, 'fifty');
      return withTurn(next);
    }
    return s;
  },
};
