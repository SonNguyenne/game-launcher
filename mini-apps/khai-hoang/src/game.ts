import { baseState, randomInt, shuffle, type BaseState, type GameDef, type Party, type Player } from '@bang/party';
import { strings, type TargetOpt } from './strings';

export const N = 6;
export const CELLS = N * N;
export const MAX_SEATS = 4;
export const ROUND_CAP = 30;

/** Địa hình: 0 ruộng (lúa), 1 rừng tre (tre), 2 đầm (cá), 3 bãi sét (đất). Chỉ số địa hình = chỉ số sản vật. */
export type Terrain = 0 | 1 | 2 | 3;
/** Số lượng [lúa, tre, cá, đất]. */
export type Res = [number, number, number, number];

const DECK: Terrain[] = [...Array(10).fill(0), ...Array(9).fill(1), ...Array(9).fill(2), ...Array(8).fill(3)];

export const COST = {
  claim: [1, 1, 0, 0] as Res,
  house: [0, 2, 1, 1] as Res,
  dike: [0, 1, 0, 2] as Res,
  offer: [1, 1, 1, 1] as Res,
};
/** Mùa theo vòng: xuân lúa, hạ cá, thu tre, đông đất. */
export const SEASON_RES: Terrain[] = [0, 2, 1, 3];

export type Phase = 'setup' | 'roll' | 'build' | 'over';

export interface KHState extends BaseState {
  seats: string[];
  terrain: Terrain[];
  owner: (number | null)[];
  house: boolean[];
  dike: boolean[];
  res: Res[];
  offerings: number[];
  phase: Phase;
  /** Thứ tự ghế còn phải chọn đất gốc. */
  draft: number[];
  round: number;
  dice: [number, number] | null;
  rollId: number;
  /** Sản vật mỗi ghế vừa nhận ở lần đổ gần nhất. */
  gains: Res[];
  flood: boolean;
  /** Sản vật đang được giá ở chợ (đổi 2 lấy 1). */
  hot: Terrain;
  target: TargetOpt;
  winner: number | null;
  done: boolean;
  log: string[];
}

export type Mode = 'claim' | 'house' | 'dike';

export type KHAction =
  | { type: 'pick'; cell: number }
  | { type: 'roll' }
  | { type: 'build'; mode: Mode; cell: number }
  | { type: 'offer' }
  | { type: 'trade'; give: number; get: number }
  | { type: 'end' }
  | { type: 'restart' }
  | { type: 'config'; config: Partial<Pick<KHState, 'target'>> };

export type KHParty = Party<KHState, KHAction>;

const TARGETS: TargetOpt[] = ['12', '16', '20'];
const zero = (): Res => [0, 0, 0, 0];

function fresh(players: Player[], target: TargetOpt = '16'): KHState {
  const seats = players.slice(0, MAX_SEATS).map((p) => p.id);
  const n = seats.length;
  const order = seats.map((_, i) => i);
  return {
    ...baseState(),
    seats,
    terrain: shuffle(DECK),
    owner: Array(CELLS).fill(null),
    house: Array(CELLS).fill(false),
    dike: Array(CELLS).fill(false),
    res: Array.from({ length: n }, zero),
    offerings: Array(n).fill(0),
    phase: 'setup',
    draft: [...order, ...order.slice().reverse()],
    round: 1,
    dice: null,
    rollId: 0,
    gains: Array.from({ length: n }, zero),
    flood: false,
    hot: randomInt(0, 3) as Terrain,
    target,
    winner: null,
    done: false,
    log: [],
  };
}

/* ---------- Hàm thuần dùng chung cho luật và giao diện ---------- */

export const rowOf = (cell: number) => Math.floor(cell / N);
export const colOf = (cell: number) => cell % N;

export function neighbors(cell: number): number[] {
  const r = rowOf(cell);
  const c = colOf(cell);
  const out: number[] = [];
  if (r > 0) out.push(cell - N);
  if (r < N - 1) out.push(cell + N);
  if (c > 0) out.push(cell - 1);
  if (c < N - 1) out.push(cell + 1);
  return out;
}

export function points(s: Pick<KHState, 'owner' | 'house' | 'dike' | 'offerings'>, seat: number): number {
  let p = s.offerings[seat] ?? 0;
  s.owner.forEach((o, i) => {
    if (o !== seat) return;
    p += 1;
    if (s.house[i]) p += 2;
    if (s.dike[i]) p += 1;
  });
  return p;
}

export const canPay = (have: Res, cost: Res) => cost.every((n, i) => have[i] >= n);
export const season = (round: number) => (round - 1) % 4;
export const tradeRate = (s: Pick<KHState, 'hot'>, give: number) => (give === s.hot ? 2 : 3);

/** Ô hợp lệ cho từng kiểu xây của một ghế. */
export function canBuild(s: KHState, seat: number, mode: Mode, cell: number): boolean {
  if (!Number.isInteger(cell) || cell < 0 || cell >= CELLS) return false;
  if (!canPay(s.res[seat], COST[mode])) return false;
  if (mode === 'claim') return s.owner[cell] === null && neighbors(cell).some((n) => s.owner[n] === seat);
  if (s.owner[cell] !== seat) return false;
  if (mode === 'house') return !s.house[cell];
  return !s.dike[cell] && (s.terrain[cell] === 0 || s.terrain[cell] === 2);
}

/** Sản lượng của lần đổ (hàng r, cột c, tính từ 0) cho mọi ghế. */
export function produce(s: Pick<KHState, 'terrain' | 'owner' | 'house' | 'dike' | 'seats' | 'round'>, r: number, c: number): Res[] {
  const gains = s.seats.map(zero);
  const flood = r === c;
  const inSeason = SEASON_RES[season(s.round)];
  s.owner.forEach((o, cell) => {
    if (o === null) return;
    const onRow = rowOf(cell) === r;
    const onCol = colOf(cell) === c;
    if (!onRow && !onCol) return;
    const t = s.terrain[cell];
    if (flood && !s.dike[cell]) return;
    let n = s.house[cell] ? 2 : 1;
    if (onRow && onCol) n *= 2;
    if (t === inSeason) n += 1;
    if (flood && s.dike[cell]) n += 1;
    gains[o][t] += n;
  });
  return gains;
}

export const seatOf = (s: Pick<KHState, 'seats'>, id: string) => s.seats.indexOf(id);

/* ---------- Luật ---------- */

function names(s: KHState, players: Player[]) {
  return s.seats.map((id) => players.find((p) => p.id === id)?.name ?? '?');
}

const pushLog = (log: string[], line: string) => [...log, line].slice(-6);
const sub = (a: Res, b: Res): Res => a.map((n, i) => n - b[i]) as Res;
const setAt = <T,>(list: T[], i: number, v: T) => list.map((x, j) => (j === i ? v : x));

/** Sau mỗi lần ghi điểm: đủ mục tiêu thì thắng ngay. */
function checkWin(s: KHState, seat: number, players: Player[]): KHState {
  if (points(s, seat) < Number(s.target)) return s;
  return { ...s, done: true, phase: 'over', winner: seat, log: pushLog(s.log, strings.log.win(names(s, players)[seat])) };
}

function nextTurn(s: KHState): KHState {
  const n = s.seats.length;
  const turn = (s.turn + 1) % n;
  const round = turn === 0 ? s.round + 1 : s.round;
  if (round > ROUND_CAP) {
    const best = Math.max(...s.seats.map((_, i) => points(s, i)));
    const winner = s.seats.findIndex((_, i) => points(s, i) === best);
    return { ...s, round: ROUND_CAP, phase: 'over', done: true, winner, log: pushLog(s.log, strings.log.cap), seq: s.seq + 1 };
  }
  return { ...s, turn, round, phase: 'roll', seq: s.seq + 1 };
}

function pick(s: KHState, seat: number, cell: number, players: Player[]): KHState {
  const t = s.terrain[cell];
  const res = s.res.map((r, i) => (i === seat ? (r.map((v, k) => (k === t ? v + 1 : v)) as Res) : r));
  const draft = s.draft.slice(1);
  const next: KHState = {
    ...s,
    owner: setAt(s.owner, cell, seat),
    res,
    draft,
    log: pushLog(s.log, strings.log.pick(names(s, players)[seat], strings.terrain[t])),
    seq: s.seq + 1,
  };
  if (draft.length) return { ...next, turn: draft[0] };
  return { ...next, turn: 0, phase: 'roll' };
}

export const khGame: GameDef<KHState, KHAction> = {
  id: 'khai-hoang',
  init: (players) => fresh(players),
  configOf: (s) => ({ target: s.target }),
  /** Bỏ lượt người mất kết nối (lúc chọn đất gốc thì chọn giúp một ô ngẫu nhiên). */
  advance(s, c) {
    if (s.done) return s;
    if (s.phase === 'setup') {
      const free = s.owner.map((o, i) => (o === null ? i : -1)).filter((i) => i >= 0);
      return pick(s, s.turn, free[randomInt(0, free.length - 1)], c?.players ?? []);
    }
    return nextTurn(s);
  },
  reduce(s, a, c) {
    if (a.type === 'config') {
      if (!c.host || s.phase !== 'setup' || s.draft.length !== s.seats.length * 2) return s;
      const target = TARGETS.includes(a.config.target as TargetOpt) ? (a.config.target as TargetOpt) : '16';
      return { ...fresh(c.players, target), seq: s.seq + 1 };
    }
    if (a.type === 'restart') {
      if (!c.host || !s.done) return s;
      return { ...fresh(c.players, s.target), seq: s.seq + 1 };
    }
    const seat = seatOf(s, c.from);
    if (s.done || seat < 0 || seat !== s.turn) return s;
    const who = () => names(s, c.players)[seat];

    switch (a.type) {
      case 'pick': {
        if (s.phase !== 'setup' || !Number.isInteger(a.cell) || a.cell < 0 || a.cell >= CELLS || s.owner[a.cell] !== null) return s;
        return pick(s, seat, a.cell, c.players);
      }
      case 'roll': {
        if (s.phase !== 'roll') return s;
        const r = randomInt(1, N);
        const col = randomInt(1, N);
        const gains = produce(s, r - 1, col - 1);
        const flood = r === col;
        let log = pushLog(s.log, strings.log.roll(who(), r, col));
        if (flood) log = pushLog(log, strings.log.flood(r));
        return {
          ...s,
          dice: [r, col],
          rollId: s.rollId + 1,
          gains,
          flood,
          res: s.res.map((v, i) => v.map((x, k) => x + gains[i][k]) as Res),
          hot: randomInt(0, 3) as Terrain,
          phase: 'build',
          log,
          seq: s.seq + 1,
        };
      }
      case 'build': {
        if (s.phase !== 'build' || !(a.mode in COST) || a.mode === ('offer' as Mode)) return s;
        if (!canBuild(s, seat, a.mode, a.cell)) return s;
        const res = setAt(s.res, seat, sub(s.res[seat], COST[a.mode]));
        let next: KHState = { ...s, res, seq: s.seq + 1 };
        if (a.mode === 'claim') next = { ...next, owner: setAt(s.owner, a.cell, seat), log: pushLog(s.log, strings.log.claim(who(), strings.terrain[s.terrain[a.cell]])) };
        if (a.mode === 'house') next = { ...next, house: setAt(s.house, a.cell, true), log: pushLog(s.log, strings.log.house(who())) };
        if (a.mode === 'dike') next = { ...next, dike: setAt(s.dike, a.cell, true), log: pushLog(s.log, strings.log.dike(who())) };
        return checkWin(next, seat, c.players);
      }
      case 'offer': {
        if (s.phase !== 'build' || !canPay(s.res[seat], COST.offer)) return s;
        const next: KHState = {
          ...s,
          res: setAt(s.res, seat, sub(s.res[seat], COST.offer)),
          offerings: setAt(s.offerings, seat, s.offerings[seat] + 1),
          log: pushLog(s.log, strings.log.offer(who())),
          seq: s.seq + 1,
        };
        return checkWin(next, seat, c.players);
      }
      case 'trade': {
        const { give, get } = a;
        if (s.phase !== 'build' || ![0, 1, 2, 3].includes(give) || ![0, 1, 2, 3].includes(get) || give === get) return s;
        const n = tradeRate(s, give);
        if (s.res[seat][give] < n) return s;
        const mine = s.res[seat].map((v, k) => (k === give ? v - n : k === get ? v + 1 : v)) as Res;
        return { ...s, res: setAt(s.res, seat, mine), log: pushLog(s.log, strings.log.trade(who(), n, strings.res[give], strings.res[get])), seq: s.seq + 1 };
      }
      case 'end':
        if (s.phase !== 'build') return s;
        return nextTurn(s);
    }
    return s;
  },
};
