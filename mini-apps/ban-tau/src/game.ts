import { baseState, type BaseState, type GameDef, type Party, type Player } from '@bang/party';
import type { ChainRule } from './strings';

export type Seat = 0 | 1;
export const SIZE = 10;
/** Độ dài 5 con tàu mỗi người. */
export const FLEET = [5, 4, 3, 3, 2] as const;

/** Một con tàu là danh sách ô (0..99, hàng × 10 + cột) liền nhau theo hàng ngang hoặc dọc. */
export type Ship = number[];

export interface Shot {
  seat: Seat;
  cell: number;
  hit: boolean;
  /** Độ dài con tàu vừa bị bắn chìm, nếu có. */
  sunk: number | null;
}

export interface ShipState extends BaseState {
  phase: 'place' | 'battle' | 'over';
  seats: [string, string];
  /** Đội tàu của từng ghế (rỗng khi chưa xếp xong). */
  fleets: [Ship[], Ship[]];
  ready: [boolean, boolean];
  /** shots[ghế] = các ô ghế đó đã bắn vào biển đối thủ, theo thứ tự. */
  shots: [number[], number[]];
  shooter: Seat;
  /** Ghế bắn trước của ván này; ván sau đổi. */
  first: Seat;
  lastShot: Shot | null;
  winner: Seat | null;
  chain: ChainRule;
  wins: Record<string, number>;
}

export type Config = Partial<Pick<ShipState, 'chain'>>;

export type ShipAction =
  | { type: 'ready'; ships: Ship[] }
  | { type: 'unready' }
  | { type: 'fire'; cell: number }
  | { type: 'restart' }
  | { type: 'config'; config: Config };

export type ShipParty = Party<ShipState, ShipAction>;

export const opp = (seat: Seat): Seat => (seat === 0 ? 1 : 0);
export const seatOf = (s: Pick<ShipState, 'seats'>, id: string): Seat | null => {
  const i = s.seats.indexOf(id);
  return i < 0 ? null : (i as Seat);
};

/** Các ô của tàu dài len đặt từ ô đầu `head` theo hướng ngang/dọc; null nếu tràn bàn. */
export function shipCells(head: number, len: number, vertical: boolean): Ship | null {
  const r = Math.floor(head / SIZE);
  const c = head % SIZE;
  if (head < 0 || head >= SIZE * SIZE) return null;
  if (vertical ? r + len > SIZE : c + len > SIZE) return null;
  return Array.from({ length: len }, (_, i) => (vertical ? head + i * SIZE : head + i));
}

/** Đội tàu hợp lệ: đủ đúng các độ dài, mỗi tàu thẳng hàng liền nhau, không chồng lên nhau. */
export function validFleet(ships: unknown): ships is Ship[] {
  if (!Array.isArray(ships) || ships.length !== FLEET.length) return false;
  const lens = ships.map((sh) => (Array.isArray(sh) ? sh.length : -1)).sort((a, b) => b - a);
  if (lens.join() !== [...FLEET].sort((a, b) => b - a).join()) return false;
  const used = new Set<number>();
  for (const sh of ships as unknown[][]) {
    if (!sh.every((x) => Number.isInteger(x))) return false;
    const cells = (sh as number[]).slice().sort((a, b) => a - b);
    const vertical = cells.length > 1 && cells[1] - cells[0] === SIZE;
    const expect = shipCells(cells[0], cells.length, vertical);
    if (!expect || expect.join() !== cells.join()) return false;
    for (const x of cells) {
      if (used.has(x)) return false;
      used.add(x);
    }
  }
  return true;
}

/** Xếp ngẫu nhiên cả đội tàu (dùng cho nút xếp ngẫu nhiên). */
export function randomFleet(rand: () => number = Math.random): Ship[] {
  for (;;) {
    const used = new Set<number>();
    const ships: Ship[] = [];
    for (const len of FLEET) {
      for (let tries = 0; tries < 200; tries++) {
        const cells = shipCells(Math.floor(rand() * SIZE * SIZE), len, rand() < 0.5);
        if (!cells || cells.some((x) => used.has(x))) continue;
        cells.forEach((x) => used.add(x));
        ships.push(cells);
        break;
      }
    }
    if (ships.length === FLEET.length) return ships;
  }
}

export const isSunk = (ship: Ship, shots: readonly number[]) => ship.every((x) => shots.includes(x));

/** Ghế đang phải hành động: lúc xếp tàu là người chưa sẵn sàng (ghế 0 trước), lúc bắn là người bắn. */
function actor(s: ShipState): Seat {
  if (s.phase === 'place') return !s.ready[0] ? 0 : !s.ready[1] ? 1 : s.first;
  return s.shooter;
}
const withTurn = (s: ShipState): ShipState => ({ ...s, turn: actor(s) });

function fresh(players: Player[], chain: ChainRule = 'on', first: Seat = 0, wins: Record<string, number> = {}): ShipState {
  return {
    ...baseState(),
    turn: 0,
    phase: 'place',
    seats: [players[0]?.id ?? '', players[1]?.id ?? ''],
    fleets: [[], []],
    ready: [false, false],
    shots: [[], []],
    shooter: first,
    first,
    lastShot: null,
    winner: null,
    chain,
    wins,
  };
}

export const shipGame: GameDef<ShipState, ShipAction> = {
  id: 'ban-tau',
  init: (players) => fresh(players),
  configOf: (s) => ({ chain: s.chain }),
  advance: (s) => s,
  reduce(s, a, c) {
    if (a.type === 'config') {
      if (!c.host || s.phase !== 'place' || s.ready.some(Boolean)) return s;
      const chain: ChainRule = a.config.chain === 'off' ? 'off' : 'on';
      return { ...fresh(c.players, chain, s.first, s.wins), seq: s.seq + 1 };
    }
    if (a.type === 'restart') {
      if (!c.host || s.phase !== 'over') return s;
      return { ...fresh(c.players, s.chain, opp(s.first), s.wins), seq: s.seq + 1 };
    }
    const seat = seatOf(s, c.from);
    if (seat === null) return s;
    if (a.type === 'ready') {
      if (s.phase !== 'place' || s.ready[seat] || !validFleet(a.ships)) return s;
      const fleets = s.fleets.slice() as ShipState['fleets'];
      fleets[seat] = a.ships.map((sh) => sh.slice().sort((x, y) => x - y));
      const ready = s.ready.slice() as ShipState['ready'];
      ready[seat] = true;
      const both = ready[0] && ready[1];
      return withTurn({ ...s, fleets, ready, phase: both ? 'battle' : 'place', shooter: s.first, seq: s.seq + 1 });
    }
    if (a.type === 'unready') {
      if (s.phase !== 'place' || !s.ready[seat]) return s;
      const ready = s.ready.slice() as ShipState['ready'];
      ready[seat] = false;
      return withTurn({ ...s, ready, seq: s.seq + 1 });
    }
    if (a.type === 'fire') {
      if (s.phase !== 'battle' || seat !== s.shooter) return s;
      if (!Number.isInteger(a.cell) || a.cell < 0 || a.cell >= SIZE * SIZE || s.shots[seat].includes(a.cell)) return s;
      const mine = [...s.shots[seat], a.cell];
      const shots = s.shots.slice() as ShipState['shots'];
      shots[seat] = mine;
      const target = s.fleets[opp(seat)];
      const ship = target.find((sh) => sh.includes(a.cell));
      const hit = !!ship;
      const sunk = ship && isSunk(ship, mine) ? ship.length : null;
      const lastShot: Shot = { seat, cell: a.cell, hit, sunk };
      if (target.every((sh) => isSunk(sh, mine))) {
        const id = s.seats[seat];
        return { ...s, shots, lastShot, phase: 'over', winner: seat, wins: { ...s.wins, [id]: (s.wins[id] ?? 0) + 1 }, seq: s.seq + 1 };
      }
      const shooter = hit && s.chain === 'on' ? seat : opp(seat);
      return withTurn({ ...s, shots, lastShot, shooter, seq: s.seq + 1 });
    }
    return s;
  },
};
