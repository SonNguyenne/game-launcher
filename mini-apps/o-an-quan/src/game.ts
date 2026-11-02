import { baseState, type BaseState, type GameDef, type Party, type Player } from '@bang/party';
import type { QuanValue, Toggle } from './strings';

/**
 * Bàn 12 ô xếp vòng: 0 là ô quan trái, 1..5 hàng trên (ghế 1), 6 là ô quan phải, 7..11 hàng dưới (ghế 0).
 * Hướng +1 đi theo chiều chỉ số tăng. Nhìn từ phía mình (hàng của mình ở dưới), +1 là sang trái.
 */
export type Seat = 0 | 1;
export type Dir = 1 | -1;

export const PITS = 12;
export const QUAN_PITS = [0, 6] as const;
export const rowOf = (seat: Seat): number[] => (seat === 0 ? [7, 8, 9, 10, 11] : [1, 2, 3, 4, 5]);
export const isQuan = (i: number) => i === 0 || i === 6;
const quanIndex = (i: number) => (i === 0 ? 0 : 1);
const mod = (i: number) => ((i % PITS) + PITS) % PITS;
/** Ô quan có ít hơn số dân này mà còn quan thì là quan non. */
export const NON_LIMIT = 5;

export interface Board {
  /** Số quân dân trong mỗi ô (ô quan cũng có thể có dân). */
  pits: number[];
  /** Quan còn nằm ở ô quan trái / phải. */
  quan: [boolean, boolean];
  /** Dân đã ăn của từng ghế. */
  captured: [number, number];
  /** Số quan đã ăn của từng ghế. */
  quanTaken: [number, number];
  /** Số quân từng ghế đã vay của đối thủ để rải lại. */
  debt: [number, number];
}

/** Từng bước của nước đi, để máy nào cũng diễn lại được hiệu ứng rải. */
export type Step =
  | { t: 'pick'; i: number; n: number }
  | { t: 'drop'; i: number }
  | { t: 'eat'; i: number; n: number; quan: boolean; seat: Seat }
  | { t: 'spread'; seat: Seat; borrowed: number };

export interface Move {
  id: number;
  seat: Seat;
  pit: number;
  dir: Dir;
  /** Bàn trước nước đi, điểm bắt đầu của hiệu ứng. */
  before: Board;
  steps: Step[];
}

export interface QuanState extends BaseState, Board {
  seats: [string, string];
  first: Seat;
  last: Move | null;
  done: boolean;
  winner: Seat | null;
  /** Điểm cuối ván của từng ghế. */
  final: [number, number] | null;
  wins: Record<string, number>;
  quanValue: QuanValue;
  quanNon: Toggle;
}

export type Config = Partial<Pick<QuanState, 'quanValue' | 'quanNon'>>;

export type QuanAction = { type: 'sow'; pit: number; dir: Dir } | { type: 'restart' } | { type: 'config'; config: Config };

export type QuanParty = Party<QuanState, QuanAction>;

export const boardOf = (s: Board): Board => ({ pits: s.pits, quan: s.quan, captured: s.captured, quanTaken: s.quanTaken, debt: s.debt });

const hasContent = (b: Board, i: number) => b.pits[i] > 0 || (isQuan(i) && b.quan[quanIndex(i)]);

export function newBoard(): Board {
  return {
    pits: Array.from({ length: PITS }, (_, i) => (isQuan(i) ? 0 : 5)),
    quan: [true, true],
    captured: [0, 0],
    quanTaken: [0, 0],
    debt: [0, 0],
  };
}

const cloneBoard = (b: Board): Board => ({
  pits: b.pits.slice(),
  quan: [b.quan[0], b.quan[1]],
  captured: [b.captured[0], b.captured[1]],
  quanTaken: [b.quanTaken[0], b.quanTaken[1]],
  debt: [b.debt[0], b.debt[1]],
});

export interface Rules {
  quanNon: boolean;
}

/** Rải một ô theo luật; trả về bàn mới và các bước. Không kiểm tra quyền đi. */
export function sow(board: Board, seat: Seat, pit: number, dir: Dir, rules: Rules): { board: Board; steps: Step[] } {
  const b = cloneBoard(board);
  const steps: Step[] = [];
  let hand = b.pits[pit];
  b.pits[pit] = 0;
  steps.push({ t: 'pick', i: pit, n: hand });
  let pos = pit;
  // Phòng vòng lặp vô tận (về lý thuyết hiếm khi xảy ra): dừng sau rất nhiều bước.
  for (let guard = 0; guard < 2000; guard++) {
    while (hand > 0) {
      pos = mod(pos + dir);
      b.pits[pos]++;
      hand--;
      steps.push({ t: 'drop', i: pos });
    }
    const n1 = mod(pos + dir);
    if (hasContent(b, n1)) {
      // Ô kế là ô quan còn quân: mất lượt. Ô dân có quân: bốc lên rải tiếp.
      if (isQuan(n1)) break;
      hand = b.pits[n1];
      b.pits[n1] = 0;
      pos = n1;
      steps.push({ t: 'pick', i: n1, n: hand });
      continue;
    }
    // Ô kế trống: ăn ô sau nó nếu có quân, rồi ăn tiếp cách ô.
    let cur = mod(n1 + dir);
    while (hasContent(b, cur)) {
      if (isQuan(cur)) {
        const q = quanIndex(cur);
        if (rules.quanNon && b.quan[q] && b.pits[cur] < NON_LIMIT) break;
      }
      const n = b.pits[cur];
      const quan = isQuan(cur) && b.quan[quanIndex(cur)];
      b.captured[seat] += n;
      b.pits[cur] = 0;
      if (quan) {
        b.quan[quanIndex(cur)] = false;
        b.quanTaken[seat]++;
      }
      steps.push({ t: 'eat', i: cur, n, quan, seat });
      const gap = mod(cur + dir);
      if (hasContent(b, gap)) break;
      cur = mod(gap + dir);
    }
    break;
  }
  return { board: b, steps };
}

/** Hết hai quan (ô quan trống hẳn) thì hết ván. */
export const finished = (b: Board) => !b.quan[0] && !b.quan[1] && b.pits[0] === 0 && b.pits[6] === 0;

/** Hàng của ghế trống: lấy 5 quân đã ăn rải lại, thiếu thì vay đối thủ. Không đủ cả hai thì trả null (hết ván). */
export function spread(board: Board, seat: Seat): { board: Board; step: Step } | null {
  const other: Seat = seat === 0 ? 1 : 0;
  const own = Math.min(5, board.captured[seat]);
  const borrowed = 5 - own;
  if (board.captured[other] < borrowed) return null;
  const b = cloneBoard(board);
  b.captured[seat] -= own;
  b.captured[other] -= borrowed;
  b.debt[seat] += borrowed;
  for (const i of rowOf(seat)) b.pits[i] = 1;
  return { board: b, step: { t: 'spread', seat, borrowed } };
}

/** Điểm cuối: dân + quan đã ăn, trả nợ, cộng dân còn bên hàng mình. */
export function tally(b: Board, quanValue: number): [number, number] {
  const score = (seat: Seat) => {
    const other: Seat = seat === 0 ? 1 : 0;
    const row = rowOf(seat).reduce((n, i) => n + b.pits[i], 0);
    return b.captured[seat] + row + b.quanTaken[seat] * quanValue - b.debt[seat] + b.debt[other];
  };
  return [score(0), score(1)];
}

/** Điểm đang có (chưa tính dân còn trên bàn), để hiện trong ván. */
export const liveScore = (b: Board, seat: Seat, quanValue: number) => b.captured[seat] + b.quanTaken[seat] * quanValue;

function fresh(players: Player[], quanValue: QuanValue = '10', quanNon: Toggle = 'on', first: Seat = 0, wins: Record<string, number> = {}): QuanState {
  return {
    ...baseState(),
    ...newBoard(),
    turn: first,
    seats: [players[0]?.id ?? '', players[1]?.id ?? ''],
    first,
    last: null,
    done: false,
    winner: null,
    final: null,
    wins,
    quanValue,
    quanNon,
  };
}

function end(s: QuanState, b: Board): QuanState {
  const final = tally(b, Number(s.quanValue));
  const winner: Seat | null = final[0] === final[1] ? null : final[0] > final[1] ? 0 : 1;
  const wins = winner === null ? s.wins : { ...s.wins, [s.seats[winner]]: (s.wins[s.seats[winner]] ?? 0) + 1 };
  return { ...s, ...b, done: true, final, winner, wins };
}

export const quanGame: GameDef<QuanState, QuanAction> = {
  id: 'o-an-quan',
  init: (players) => fresh(players),
  configOf: (s) => ({ quanValue: s.quanValue, quanNon: s.quanNon }),
  advance: (s) => s,
  reduce(s, a, c) {
    if (a.type === 'config') {
      if (!c.host || s.last) return s;
      const quanValue: QuanValue = a.config.quanValue === '5' ? '5' : '10';
      const quanNon: Toggle = a.config.quanNon === 'off' ? 'off' : 'on';
      return { ...fresh(c.players, quanValue, quanNon, s.first, s.wins), seq: s.seq + 1 };
    }
    if (a.type === 'restart') {
      if (!c.host || !s.done) return s;
      const first: Seat = s.first === 0 ? 1 : 0;
      return { ...fresh(c.players, s.quanValue, s.quanNon, first, s.wins), seq: s.seq + 1 };
    }
    if (a.type === 'sow') {
      const seat = s.seats.indexOf(c.from);
      if (s.done || seat < 0 || seat !== s.turn) return s;
      if (a.dir !== 1 && a.dir !== -1) return s;
      if (!rowOf(seat as Seat).includes(a.pit) || s.pits[a.pit] <= 0) return s;
      const before = boardOf(s);
      const { board, steps } = sow(before, seat as Seat, a.pit, a.dir, { quanNon: s.quanNon === 'on' });
      const last: Move = { id: (s.last?.id ?? 0) + 1, seat: seat as Seat, pit: a.pit, dir: a.dir, before, steps };
      const next: QuanState = { ...s, last, seq: s.seq + 1 };
      if (finished(board)) return end(next, board);
      const other: Seat = seat === 0 ? 1 : 0;
      let b = board;
      if (rowOf(other).every((i) => b.pits[i] === 0)) {
        const sp = spread(b, other);
        if (!sp) return end(next, b);
        b = sp.board;
        steps.push(sp.step);
      }
      return { ...next, ...b, turn: other };
    }
    return s;
  },
};
