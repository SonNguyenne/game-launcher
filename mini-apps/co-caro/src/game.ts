import { baseState, type BaseState, type GameDef, type Party, type Player } from '@bang/party';
import type { BlockRule, BoardSize } from './strings';

/** Ô trống: null; 0 là X, 1 là O (cũng là chỉ số ghế). */
export type Mark = 0 | 1;

export interface CaroState extends BaseState {
  size: number;
  cells: (Mark | null)[];
  /** id người ngồi ghế X và ghế O. Ghế X luôn ở vị trí turn chẵn của danh sách người chơi. */
  seats: [string, string];
  /** Các nước đã đi, để vẽ nước cuối và cho đi lại. */
  history: number[];
  /** Ghế đánh trước của ván này; ván sau đổi lượt đi trước. */
  first: Mark;
  winner: Mark | null;
  /** Các ô của hàng thắng để tô sáng. */
  line: number[];
  done: boolean;
  /** Số ván thắng theo id người chơi, giữ qua các ván. */
  wins: Record<string, number>;
  boardSize: BoardSize;
  block: BlockRule;
}

export type Config = Partial<Pick<CaroState, 'boardSize' | 'block'>>;

export type CaroAction =
  | { type: 'place'; index: number }
  | { type: 'undo' }
  | { type: 'restart' }
  | { type: 'config'; config: Config };

export type CaroParty = Party<CaroState, CaroAction>;

const WIN = 5;
const DIRS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
] as const;

/** Chỉ số trong danh sách người chơi của ghế đang tới lượt. */
export const seatTurn = (s: Pick<CaroState, 'first' | 'history'>): Mark => ((s.first + s.history.length) % 2) as Mark;

export const seatOf = (s: Pick<CaroState, 'seats'>, id: string): Mark | null => {
  const i = s.seats.indexOf(id);
  return i < 0 ? null : (i as Mark);
};

function fresh(players: Player[], boardSize: BoardSize = '15', block: BlockRule = 'free', first: Mark = 0, wins: Record<string, number> = {}): CaroState {
  const size = Number(boardSize);
  const seats: [string, string] = [players[0]?.id ?? '', players[1]?.id ?? ''];
  return {
    ...baseState(),
    turn: first,
    size,
    cells: Array<Mark | null>(size * size).fill(null),
    seats,
    history: [],
    first,
    winner: null,
    line: [],
    done: false,
    wins,
    boardSize,
    block,
  };
}

/**
 * Tìm hàng thắng đi qua ô vừa đánh. Luật chặn hai đầu: hàng bị quân đối thủ (hoặc mép bàn không tính)
 * chặn kín cả hai đầu thì không thắng.
 */
export function findLine(cells: readonly (Mark | null)[], size: number, index: number, block: BlockRule): number[] {
  const mark = cells[index];
  if (mark === null || mark === undefined) return [];
  const r0 = Math.floor(index / size);
  const c0 = index % size;
  const at = (r: number, c: number) => (r < 0 || c < 0 || r >= size || c >= size ? undefined : cells[r * size + c]);
  for (const [dr, dc] of DIRS) {
    const line = [index];
    let r = r0 + dr;
    let c = c0 + dc;
    while (at(r, c) === mark) {
      line.push(r * size + c);
      r += dr;
      c += dc;
    }
    const endA = at(r, c);
    r = r0 - dr;
    c = c0 - dc;
    while (at(r, c) === mark) {
      line.unshift(r * size + c);
      r -= dr;
      c -= dc;
    }
    const endB = at(r, c);
    if (line.length < WIN) continue;
    const other = mark === 0 ? 1 : 0;
    if (block === 'blocked' && endA === other && endB === other) continue;
    return line;
  }
  return [];
}

export const caroGame: GameDef<CaroState, CaroAction> = {
  id: 'co-caro',
  init: (players) => fresh(players),
  configOf: (s) => ({ boardSize: s.boardSize, block: s.block }),
  // Caro không dùng thẻ kết quả: hết ván thì hiện bảng ngay trên bàn.
  advance: (s) => s,
  reduce(s, a, c) {
    if (a.type === 'config') {
      if (!c.host || s.history.length) return s;
      const boardSize = a.config.boardSize === '19' ? '19' : '15';
      const block = a.config.block === 'blocked' ? 'blocked' : 'free';
      return { ...fresh(c.players, boardSize, block, s.first, s.wins), seq: s.seq + 1 };
    }
    if (a.type === 'restart') {
      if (!c.host || !s.done) return s;
      const first: Mark = s.first === 0 ? 1 : 0;
      return { ...fresh(c.players, s.boardSize, s.block, first, s.wins), seq: s.seq + 1 };
    }
    const seat = seatOf(s, c.from);
    if (a.type === 'undo') {
      // Chỉ người vừa đánh được rút lại nước của mình, khi đối thủ chưa đi tiếp.
      if (s.done || !s.history.length || seat === null || seatTurn(s) === seat) return s;
      const last = s.history[s.history.length - 1];
      const cells = s.cells.slice();
      cells[last] = null;
      const history = s.history.slice(0, -1);
      return { ...s, cells, history, turn: seatTurn({ first: s.first, history }), seq: s.seq + 1 };
    }
    if (a.type === 'place') {
      if (s.done || seat === null || seat !== seatTurn(s)) return s;
      if (!Number.isInteger(a.index) || a.index < 0 || a.index >= s.cells.length || s.cells[a.index] !== null) return s;
      const cells = s.cells.slice();
      cells[a.index] = seat;
      const history = [...s.history, a.index];
      const line = findLine(cells, s.size, a.index, s.block);
      const won = line.length > 0;
      const full = !won && history.length === cells.length;
      const wins = won ? { ...s.wins, [c.from]: (s.wins[c.from] ?? 0) + 1 } : s.wins;
      return {
        ...s,
        cells,
        history,
        line,
        winner: won ? seat : null,
        done: won || full,
        wins,
        turn: won || full ? s.turn : seatTurn({ first: s.first, history }),
        seq: s.seq + 1,
      };
    }
    return s;
  },
};
