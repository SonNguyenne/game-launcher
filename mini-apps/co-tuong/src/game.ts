import { baseState, type BaseState, type GameDef, type Party, type Player } from '@bang/party';
import type { Script } from './strings';

/** Đỏ đi trước. */
export type Color = 'r' | 'b';
/** K tướng, A sĩ, E tượng, H mã, R xe, C pháo, P tốt. */
export type Kind = 'K' | 'A' | 'E' | 'H' | 'R' | 'C' | 'P';
export type Piece = `${Color}${Kind}`;
export type Seat = 0 | 1;

export const COLS = 9;
export const ROWS = 10;

/**
 * Giao điểm đánh số 0..89 theo hàng từ trên xuống: hàng 0..4 là nửa bàn của đen, hàng 5..9 của đỏ.
 * Sông nằm giữa hàng 4 và hàng 5.
 */
export interface Move {
  from: number;
  to: number;
}

export type EndReason = 'mate' | 'stalemate' | 'agree' | 'resign';

export interface XiangqiState extends BaseState {
  board: (Piece | null)[];
  side: Color;
  seats: [string, string];
  /** Ghế cầm quân đỏ; đổi mỗi ván. */
  redSeat: Seat;
  history: Move[];
  drawOffer: Seat | null;
  done: boolean;
  winner: Seat | null;
  reason: EndReason | null;
  script: Script;
  wins: Record<string, number>;
}

export type Config = Partial<Pick<XiangqiState, 'script'>>;

export type XiangqiAction =
  | { type: 'move'; from: number; to: number }
  | { type: 'offer' }
  | { type: 'answer'; accept: boolean }
  | { type: 'resign' }
  | { type: 'restart' }
  | { type: 'config'; config: Config };

export type XiangqiParty = Party<XiangqiState, XiangqiAction>;

export const other = (c: Color): Color => (c === 'r' ? 'b' : 'r');
const rowOf = (i: number) => Math.floor(i / COLS);
const colOf = (i: number) => i % COLS;
const at = (r: number, c: number) => (r < 0 || r >= ROWS || c < 0 || c >= COLS ? -1 : r * COLS + c);

const BACK: Kind[] = ['R', 'H', 'E', 'A', 'K', 'A', 'E', 'H', 'R'];

export function startBoard(): (Piece | null)[] {
  const b: (Piece | null)[] = Array(COLS * ROWS).fill(null);
  for (let c = 0; c < COLS; c++) {
    b[at(0, c)] = `b${BACK[c]}`;
    b[at(9, c)] = `r${BACK[c]}`;
  }
  for (const c of [1, 7]) {
    b[at(2, c)] = 'bC';
    b[at(7, c)] = 'rC';
  }
  for (const c of [0, 2, 4, 6, 8]) {
    b[at(3, c)] = 'bP';
    b[at(6, c)] = 'rP';
  }
  return b;
}

const inPalace = (color: Color, r: number, c: number) => c >= 3 && c <= 5 && (color === 'b' ? r <= 2 : r >= 7);
/** Còn ở nửa bàn nhà mình (chưa qua sông). */
const ownSide = (color: Color, r: number) => (color === 'b' ? r <= 4 : r >= 5);

const ORTHO = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const;
const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]] as const;

/** Nước đi theo cách đi của quân, chưa xét tướng bị chiếu hay lộ mặt tướng. */
export function pseudoMoves(board: readonly (Piece | null)[], side: Color): Move[] {
  const out: Move[] = [];
  const add = (from: number, to: number) => {
    if (to >= 0 && board[to]?.[0] !== side) out.push({ from, to });
  };
  for (let sq = 0; sq < board.length; sq++) {
    const p = board[sq];
    if (!p || p[0] !== side) continue;
    const kind = p[1] as Kind;
    const r = rowOf(sq);
    const c = colOf(sq);
    switch (kind) {
      case 'K':
        for (const [dr, dc] of ORTHO) if (inPalace(side, r + dr, c + dc)) add(sq, at(r + dr, c + dc));
        break;
      case 'A':
        for (const [dr, dc] of DIAG) if (inPalace(side, r + dr, c + dc)) add(sq, at(r + dr, c + dc));
        break;
      case 'E':
        for (const [dr, dc] of DIAG) {
          const t = at(r + 2 * dr, c + 2 * dc);
          // Bị cản mắt tượng, hoặc qua sông, thì không đi được.
          if (t < 0 || board[at(r + dr, c + dc)] || !ownSide(side, r + 2 * dr)) continue;
          add(sq, t);
        }
        break;
      case 'H':
        for (const [dr, dc] of ORTHO) {
          const leg = at(r + dr, c + dc);
          if (leg < 0 || board[leg]) continue; // cản chân mã
          if (dr) {
            add(sq, at(r + 2 * dr, c - 1));
            add(sq, at(r + 2 * dr, c + 1));
          } else {
            add(sq, at(r - 1, c + 2 * dc));
            add(sq, at(r + 1, c + 2 * dc));
          }
        }
        break;
      case 'R':
      case 'C':
        for (const [dr, dc] of ORTHO) {
          let screen = false;
          for (let rr = r + dr, cc = c + dc, t = at(rr, cc); t >= 0; rr += dr, cc += dc, t = at(rr, cc)) {
            const q = board[t];
            if (kind === 'R') {
              add(sq, t);
              if (q) break;
            } else if (!screen) {
              if (q) screen = true;
              else add(sq, t);
            } else if (q) {
              // Pháo ăn quân phải cách đúng một quân (ngòi).
              if (q[0] !== side) add(sq, t);
              break;
            }
          }
        }
        break;
      case 'P': {
        const fwd = side === 'r' ? -1 : 1;
        add(sq, at(r + fwd, c));
        if (!ownSide(side, r)) {
          add(sq, at(r, c - 1));
          add(sq, at(r, c + 1));
        }
        break;
      }
    }
  }
  return out;
}

export const kingSquare = (board: readonly (Piece | null)[], color: Color) => board.indexOf(`${color}K`);

/** Hai tướng đứng cùng cột, không có quân nào ở giữa. */
export function generalsFace(board: readonly (Piece | null)[]): boolean {
  const a = kingSquare(board, 'r');
  const b = kingSquare(board, 'b');
  if (a < 0 || b < 0 || colOf(a) !== colOf(b)) return false;
  for (let i = b + COLS; i < a; i += COLS) if (board[i]) return false;
  return true;
}

/** Tướng của màu `color` đang bị chiếu. */
export function inCheck(board: readonly (Piece | null)[], color: Color): boolean {
  const k = kingSquare(board, color);
  if (k < 0) return true;
  return pseudoMoves(board, other(color)).some((m) => m.to === k);
}

export function applyMove(board: readonly (Piece | null)[], m: Move): (Piece | null)[] {
  const next = board.slice();
  next[m.to] = next[m.from];
  next[m.from] = null;
  return next;
}

export function legalMoves(board: readonly (Piece | null)[], side: Color): Move[] {
  return pseudoMoves(board, side).filter((m) => {
    const next = applyMove(board, m);
    return !generalsFace(next) && !inCheck(next, side);
  });
}

export const colorOf = (s: Pick<XiangqiState, 'redSeat'>, seat: Seat): Color => (seat === s.redSeat ? 'r' : 'b');
export const seatOfColor = (s: Pick<XiangqiState, 'redSeat'>, color: Color): Seat => (color === 'r' ? s.redSeat : ((1 - s.redSeat) as Seat));
export const seatOf = (s: Pick<XiangqiState, 'seats'>, id: string): Seat | null => {
  const i = s.seats.indexOf(id);
  return i < 0 ? null : (i as Seat);
};
export const actorSeat = (s: Pick<XiangqiState, 'drawOffer' | 'side' | 'redSeat'>): Seat =>
  s.drawOffer !== null ? ((1 - s.drawOffer) as Seat) : seatOfColor(s, s.side);

function fresh(players: Player[], script: Script = 'han', redSeat: Seat = 0, wins: Record<string, number> = {}): XiangqiState {
  return {
    ...baseState(),
    turn: redSeat,
    board: startBoard(),
    side: 'r',
    seats: [players[0]?.id ?? '', players[1]?.id ?? ''],
    redSeat,
    history: [],
    drawOffer: null,
    done: false,
    winner: null,
    reason: null,
    script,
    wins,
  };
}

function finish(s: XiangqiState, winner: Seat | null, reason: EndReason): XiangqiState {
  const id = winner === null ? null : s.seats[winner];
  return { ...s, done: true, winner, reason, drawOffer: null, wins: id ? { ...s.wins, [id]: (s.wins[id] ?? 0) + 1 } : s.wins, seq: s.seq + 1 };
}

const withTurn = (s: XiangqiState): XiangqiState => ({ ...s, turn: actorSeat(s) });

export const xiangqiGame: GameDef<XiangqiState, XiangqiAction> = {
  id: 'co-tuong',
  init: (players) => fresh(players),
  configOf: (s) => ({ script: s.script }),
  advance: (s) => s,
  reduce(s, a, c) {
    if (a.type === 'config') {
      if (!c.host || s.history.length) return s;
      const script: Script = a.config.script === 'viet' ? 'viet' : 'han';
      return { ...fresh(c.players, script, s.redSeat, s.wins), seq: s.seq + 1 };
    }
    if (a.type === 'restart') {
      if (!c.host || !s.done) return s;
      return { ...fresh(c.players, s.script, (1 - s.redSeat) as Seat, s.wins), seq: s.seq + 1 };
    }
    if (s.done) return s;
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
      if (!legalMoves(s.board, s.side).some((m) => m.from === a.from && m.to === a.to)) return s;
      const board = applyMove(s.board, a);
      const side = other(s.side);
      const next: XiangqiState = { ...s, board, side, history: [...s.history, { from: a.from, to: a.to }], drawOffer: null, seq: s.seq + 1 };
      // Cờ tướng: bên không còn nước đi là thua, dù bị chiếu hay không.
      if (!legalMoves(board, side).length) return finish(next, seat, inCheck(board, side) ? 'mate' : 'stalemate');
      return withTurn(next);
    }
    return s;
  },
};
