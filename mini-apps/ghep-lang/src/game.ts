import { baseState, shuffle, type BaseState, type GameDef, type Party, type Player } from '@bang/party';
import { strings, type MarketOpt } from './strings';

export const N = 7;
export const CELLS = N * N;
export const WELL_CELL = 24;
export const MAX_SEATS = 5;

/** 0 ruộng, 1 nhà, 2 ao, 3 tre, 4 chợ, 5 đình, 6 giếng (chỉ có một ở giữa, không ai đặt). */
export type Kind = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const FIELD = 0, HOUSE = 1, POND = 2, BAMBOO = 3, MARKET = 4, SHRINE = 5, WELL = 6;

export interface Tile {
  k: Kind;
  /** Ghế người đặt; -1 là giếng. */
  by: number;
}

const BAG: Kind[] = [...Array(14).fill(FIELD), ...Array(12).fill(HOUSE), ...Array(7).fill(POND), ...Array(7).fill(BAMBOO), ...Array(4).fill(MARKET), ...Array(4).fill(SHRINE)];
export const WISH_COUNT = strings.wishes.length;

export interface LastMove {
  cell: number;
  gain: number;
  seat: number;
}

export interface GLState extends BaseState {
  seats: string[];
  cells: (Tile | null)[];
  bag: Kind[];
  market: Kind[];
  marketSize: MarketOpt;
  score: number[];
  wishes: number[][];
  /** Đã thay chợ trong lượt này chưa. */
  refreshed: boolean;
  last: LastMove | null;
  log: string[];
  done: boolean;
  /** Điểm ước nguyện cộng thêm lúc hết ván (theo ghế), và ước nguyện nào đạt. */
  wishScore: number[];
  wishMet: boolean[][];
  winners: number[];
}

export type GLAction =
  | { type: 'place'; slot: number; cell: number }
  | { type: 'refresh' }
  | { type: 'restart' }
  | { type: 'config'; config: Partial<Pick<GLState, 'marketSize'>> };

export type GLParty = Party<GLState, GLAction>;

const MARKET_OPTS: MarketOpt[] = ['3', '4', '5'];

function fresh(players: Player[], marketSize: MarketOpt = '4'): GLState {
  const seats = players.slice(0, MAX_SEATS).map((p) => p.id);
  const bag = shuffle(BAG);
  const size = Number(marketSize);
  const wishDeck = shuffle(Array.from({ length: WISH_COUNT }, (_, i) => i));
  const cells: (Tile | null)[] = Array(CELLS).fill(null);
  cells[WELL_CELL] = { k: WELL, by: -1 };
  return {
    ...baseState(),
    seats,
    cells,
    market: bag.slice(0, size),
    bag: bag.slice(size),
    marketSize,
    score: seats.map(() => 0),
    wishes: seats.map((_, i) => [wishDeck[(2 * i) % WISH_COUNT], wishDeck[(2 * i + 1) % WISH_COUNT]]),
    refreshed: false,
    last: null,
    log: [],
    done: false,
    wishScore: seats.map(() => 0),
    wishMet: seats.map(() => [false, false]),
    winners: [],
  };
}

/* ---------- Hình học ---------- */

export const rowOf = (c: number) => Math.floor(c / N);
export const colOf = (c: number) => c % N;
const inside = (r: number, c: number) => r >= 0 && c >= 0 && r < N && c < N;

export function ortho(cell: number): number[] {
  const r = rowOf(cell), c = colOf(cell);
  return [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].filter(([a, b]) => inside(a, b)).map(([a, b]) => a * N + b);
}

export function around(cell: number): number[] {
  const r = rowOf(cell), c = colOf(cell);
  const out: number[] = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if ((dr || dc) && inside(r + dr, c + dc)) out.push((r + dr) * N + c + dc);
  return out;
}

export const onEdge = (cell: number) => rowOf(cell) === 0 || colOf(cell) === 0 || rowOf(cell) === N - 1 || colOf(cell) === N - 1;

type Cells = readonly (Tile | null)[];
const kindAt = (cells: Cells, i: number) => cells[i]?.k;

/* ---------- Luật đặt và tính điểm ---------- */

export function legal(cells: Cells, cell: number, kind: Kind): boolean {
  if (!Number.isInteger(cell) || cell < 0 || cell >= CELLS || cells[cell]) return false;
  if (!ortho(cell).some((n) => cells[n])) return false;
  if (kind === MARKET && ortho(cell).some((n) => kindAt(cells, n) === MARKET)) return false;
  if (kind === SHRINE && around(cell).some((n) => kindAt(cells, n) === SHRINE)) return false;
  return kind !== WELL;
}

/** Điểm người đặt nhận ngay khi đặt mảnh kind vào ô cell. */
export function placeScore(cells: Cells, cell: number, kind: Kind): number {
  const o = ortho(cell).map((n) => kindAt(cells, n));
  const a = around(cell).map((n) => kindAt(cells, n));
  const count = (list: (Kind | undefined)[], k: Kind) => list.filter((x) => x === k).length;
  switch (kind) {
    case FIELD:
      return count(o, FIELD) + (o.includes(POND) ? 1 : 0);
    case HOUSE:
      return count(o, HOUSE) + (a.includes(MARKET) ? 2 : 0) + (a.includes(WELL) ? 1 : 0);
    case POND:
      return count(o, FIELD) + count(o, HOUSE);
    case BAMBOO:
      return count(o, HOUSE) + (onEdge(cell) ? 1 : 0);
    case MARKET:
      return count(a, HOUSE);
    case SHRINE:
      return new Set(a.filter((x) => x !== undefined)).size;
    default:
      return 0;
  }
}

/** Vùng liền (ngang/dọc) lớn nhất gồm mảnh loại kind do ghế seat đặt. */
function largestGroup(cells: Cells, seat: number, kind: Kind): number {
  const seen = new Set<number>();
  let best = 0;
  const mine = (i: number) => cells[i]?.k === kind && cells[i]?.by === seat;
  for (let i = 0; i < CELLS; i++) {
    if (!mine(i) || seen.has(i)) continue;
    let size = 0;
    const stack = [i];
    seen.add(i);
    while (stack.length) {
      const x = stack.pop()!;
      size++;
      for (const n of ortho(x)) {
        if (!mine(n) || seen.has(n)) continue;
        seen.add(n);
        stack.push(n);
      }
    }
    best = Math.max(best, size);
  }
  return best;
}

function hasLine(cells: Cells, seat: number): boolean {
  const mine = (r: number, c: number) => inside(r, c) && cells[r * N + c]?.by === seat;
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++) {
      if (!mine(r, c)) continue;
      if ([1, 2, 3].every((d) => mine(r, c + d)) || [1, 2, 3].every((d) => mine(r + d, c))) return true;
    }
  return false;
}

/** Ước nguyện w của ghế seat đã đạt trên bàn hiện tại chưa. */
export function wishMet(cells: Cells, seat: number, w: number): boolean {
  const mineOf = (k: Kind) => cells.map((t, i) => (t && t.k === k && t.by === seat ? i : -1)).filter((i) => i >= 0);
  const count = (list: number[], k: Kind) => list.filter((n) => kindAt(cells, n) === k).length;
  switch (w) {
    case 0:
      return largestGroup(cells, seat, FIELD) >= 4;
    case 1:
      return largestGroup(cells, seat, HOUSE) >= 3;
    case 2:
      return mineOf(POND).filter((p) => count(ortho(p), FIELD) >= 2).length >= 2;
    case 3:
      return mineOf(BAMBOO).filter(onEdge).length >= 3;
    case 4:
      return mineOf(MARKET).some((m) => count(around(m), HOUSE) >= 4);
    case 5:
      return mineOf(SHRINE).some((m) => new Set(around(m).map((n) => kindAt(cells, n)).filter((x) => x !== undefined)).size >= 5);
    case 6:
      return new Set(cells.filter((t) => t && t.by === seat).map((t) => t!.k)).size >= 6;
    case 7:
      return around(WELL_CELL).filter((n) => cells[n]?.by === seat).length >= 2;
    case 8:
      return hasLine(cells, seat);
    case 9:
      return mineOf(POND).some((p) => count(ortho(p), BAMBOO) >= 2);
    default:
      return false;
  }
}

export const anyLegal = (cells: Cells, kind: Kind) => cells.some((_, i) => legal(cells, i, kind));
export const seatOf = (s: Pick<GLState, 'seats'>, id: string) => s.seats.indexOf(id);

/* ---------- Reducer ---------- */

const nameOf = (s: GLState, players: Player[], seat: number) => players.find((p) => p.id === s.seats[seat])?.name ?? '?';
const pushLog = (log: string[], line: string) => [...log, line].slice(-6);

function finish(s: GLState): GLState {
  const wishMetList = s.seats.map((_, seat) => s.wishes[seat].map((w) => wishMet(s.cells, seat, w)));
  const wishScore = s.seats.map((_, seat) => s.wishes[seat].reduce((sum, w, j) => sum + (wishMetList[seat][j] ? strings.wishes[w].pts : 0), 0));
  const totals = s.score.map((v, i) => v + wishScore[i]);
  const best = Math.max(...totals);
  return {
    ...s,
    done: true,
    wishMet: wishMetList,
    wishScore,
    winners: totals.map((v, i) => (v === best ? i : -1)).filter((i) => i >= 0),
    log: pushLog(s.log, strings.log.end),
  };
}

/** Sang người kế; hết mảnh đặt được thì kết thúc. */
function next(s: GLState): GLState {
  const n: GLState = { ...s, turn: (s.turn + 1) % s.seats.length, refreshed: false, seq: s.seq + 1 };
  if (!n.market.some((k) => anyLegal(n.cells, k))) return finish(n);
  return n;
}

export const totalOf = (s: GLState, seat: number) => s.score[seat] + (s.done ? s.wishScore[seat] : 0);

export const glGame: GameDef<GLState, GLAction> = {
  id: 'ghep-lang',
  init: (players) => fresh(players),
  configOf: (s) => ({ marketSize: s.marketSize }),
  advance: (s) => (s.done ? s : next(s)),
  reduce(s, a, c) {
    if (a.type === 'config') {
      if (!c.host || s.last) return s;
      const size = MARKET_OPTS.includes(a.config.marketSize as MarketOpt) ? (a.config.marketSize as MarketOpt) : '4';
      return { ...fresh(c.players, size), seq: s.seq + 1 };
    }
    if (a.type === 'restart') {
      if (!c.host || !s.done) return s;
      return { ...fresh(c.players, s.marketSize), seq: s.seq + 1 };
    }
    const seat = seatOf(s, c.from);
    if (s.done || seat < 0 || seat !== s.turn) return s;

    if (a.type === 'refresh') {
      if (s.refreshed || s.score[seat] < 1 || !s.bag.length) return s;
      const pool = shuffle([...s.bag, ...s.market]);
      const size = Number(s.marketSize);
      const refreshed: GLState = {
        ...s,
        market: pool.slice(0, size),
        bag: pool.slice(size),
        score: s.score.map((v, i) => (i === seat ? v - 1 : v)),
        refreshed: true,
        log: pushLog(s.log, strings.log.refresh(nameOf(s, c.players, seat))),
        seq: s.seq + 1,
      };
      return refreshed;
    }

    if (a.type === 'place') {
      const kind = s.market[a.slot];
      if (kind === undefined || !legal(s.cells, a.cell, kind)) return s;
      const gain = placeScore(s.cells, a.cell, kind);
      const cells = s.cells.slice();
      cells[a.cell] = { k: kind, by: seat };
      const market = s.market.filter((_, i) => i !== a.slot);
      const bag = s.bag.slice();
      if (bag.length) market.push(bag.shift()!);
      return next({
        ...s,
        cells,
        market,
        bag,
        score: s.score.map((v, i) => (i === seat ? v + gain : v)),
        last: { cell: a.cell, gain, seat },
        log: pushLog(s.log, strings.log.place(nameOf(s, c.players, seat), strings.kinds[kind], gain)),
      });
    }
    return s;
  },
};
