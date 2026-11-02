import { baseState, randomInt, shuffle, type BaseState, type GameDef, type Party, type Player } from '@bang/party';
import { strings, type RoundsOpt } from './strings';

/** Bàn 24 ô: 4 góc (0, 6, 12, 18), 4 ô đặc biệt giữa cạnh (3, 9, 15, 21), còn lại 16 mảnh đất. */
export const SIZE = 24;
export type Special = 'start' | 'rumor' | 'notary' | 'tax' | 'pot' | 'boom' | 'fee';
export const SPECIALS: Record<number, Special> = { 0: 'start', 3: 'rumor', 6: 'notary', 9: 'tax', 12: 'pot', 15: 'rumor', 18: 'boom', 21: 'fee' };
/** Giá gốc từng mảnh đất theo vị trí. */
export const BASE: Record<number, number> = {
  1: 60, 2: 60, 4: 70, 5: 80,
  7: 100, 8: 100, 10: 110, 11: 120,
  13: 140, 14: 140, 16: 150, 17: 160,
  19: 180, 20: 190, 22: 200, 23: 220,
};
/** Thứ tự các mảnh đất trong mỗi phường (dãy phố liền nhau, ô đặc biệt giữa cạnh không cắt dãy). */
export const DISTRICT_LOTS = [0, 1, 2, 3].map((k) => [6 * k + 1, 6 * k + 2, 6 * k + 4, 6 * k + 5]);
export const districtOf = (pos: number) => Math.floor(pos / 6);
export const isLot = (pos: number) => BASE[pos] !== undefined;

export const START_CASH = 1000;
export const SALARY = 150;
export const MAX_SEATS = 6;
/** Hệ số tiền thuê theo độ dài dãy liền (chỉ số = số mảnh). */
export const CHAIN_MULT = [0, 1, 2, 3, 5];
const RENT_RATE = 0.2;
const INDEX_MIN = 50;
const INDEX_MAX = 200;
export const EVENT_COUNT = strings.events.length;

export type Phase = 'roll' | 'buy' | 'invest' | 'notary' | 'boom' | 'over';

export interface Lot {
  owner: number | null;
  level: number;
}

export interface Card {
  id: number;
  event: number;
  district: number;
  seat: number;
}

export interface DVState extends BaseState {
  seats: string[];
  cash: number[];
  pos: number[];
  out: boolean[];
  /** null ở ô đặc biệt. */
  lots: (Lot | null)[];
  /** Chỉ số giá đất của 4 phường, tính theo %. */
  index: number[];
  pot: number;
  round: number;
  rounds: RoundsOpt;
  phase: Phase;
  /** Giảm giá (%) khi mua ở phòng công chứng nhờ sự kiện cò đất. */
  discount: number;
  dice: [number, number] | null;
  /** Tăng mỗi lần đổ, để máy khách chạy hiệu ứng xúc xắc. */
  rollId: number;
  /** Vị trí trước khi đi của lần đổ gần nhất, để vẽ quân đi từng bước. */
  from: number;
  deck: number[];
  card: Card | null;
  log: string[];
  done: boolean;
  winners: number[];
}

export type DVAction =
  | { type: 'roll' }
  | { type: 'buy' }
  | { type: 'invest' }
  | { type: 'pass' }
  | { type: 'notary'; pos: number }
  | { type: 'boom'; district: number }
  | { type: 'restart' }
  | { type: 'config'; config: Partial<Pick<DVState, 'rounds'>> };

export type DVParty = Party<DVState, DVAction>;

const ROUND_OPTS: RoundsOpt[] = ['8', '12', '16'];

function fresh(players: Player[], rounds: RoundsOpt = '12'): DVState {
  const seats = players.slice(0, MAX_SEATS).map((p) => p.id);
  const n = seats.length;
  return {
    ...baseState(),
    seats,
    cash: Array(n).fill(START_CASH),
    pos: Array(n).fill(0),
    out: Array(n).fill(false),
    lots: Array.from({ length: SIZE }, (_, i) => (isLot(i) ? { owner: null, level: 0 } : null)),
    index: [100, 100, 100, 100],
    pot: 0,
    round: 1,
    rounds,
    phase: 'roll',
    discount: 0,
    dice: null,
    rollId: 0,
    from: 0,
    deck: shuffle(Array.from({ length: EVENT_COUNT }, (_, i) => i)),
    card: null,
    log: [],
    done: false,
    winners: [],
  };
}

/* ---------- Tính giá (dùng chung cho luật và giao diện) ---------- */

type Board = Pick<DVState, 'lots' | 'index'>;

export const lotValue = (s: Board, pos: number) => {
  const lot = s.lots[pos];
  return Math.round(((BASE[pos] ?? 0) * s.index[districtOf(pos)]) / 100 * (1 + 0.5 * (lot?.level ?? 0)));
};

export const buyPrice = (s: Board, pos: number, discount = 0) =>
  Math.round(((BASE[pos] ?? 0) * s.index[districtOf(pos)]) / 100 * (100 - discount) / 100);

export const investCost = (pos: number) => Math.round((BASE[pos] ?? 0) / 2);

/** Số mảnh cùng chủ nằm liền nhau (trong cùng phường) tính cả mảnh này. */
export function chainLength(s: Pick<DVState, 'lots'>, pos: number): number {
  const owner = s.lots[pos]?.owner;
  if (owner === null || owner === undefined) return 0;
  const order = DISTRICT_LOTS[districtOf(pos)];
  const i = order.indexOf(pos);
  let n = 1;
  for (let j = i - 1; j >= 0 && s.lots[order[j]]?.owner === owner; j--) n++;
  for (let j = i + 1; j < order.length && s.lots[order[j]]?.owner === owner; j++) n++;
  return n;
}

export const rentOf = (s: Board, pos: number) => Math.round(lotValue(s, pos) * RENT_RATE * CHAIN_MULT[chainLength(s, pos)]);

export const landValue = (s: Board, seat: number) =>
  s.lots.reduce((sum, lot, pos) => (lot && lot.owner === seat ? sum + lotValue(s, pos) : sum), 0);

export const worth = (s: DVState, seat: number) => (s.out[seat] ? 0 : s.cash[seat] + landValue(s, seat));

export const seatOf = (s: Pick<DVState, 'seats'>, id: string) => s.seats.indexOf(id);

/* ---------- Bản nháp để luật sửa trực tiếp ---------- */

interface Draft {
  s: DVState;
  names: string[];
}

function draft(s: DVState, players: Player[]): Draft {
  return {
    s: {
      ...s,
      cash: [...s.cash],
      pos: [...s.pos],
      out: [...s.out],
      lots: s.lots.map((l) => (l ? { ...l } : null)),
      index: [...s.index],
      deck: [...s.deck],
      log: [...s.log],
      winners: [],
      seq: s.seq + 1,
    },
    names: s.seats.map((id) => players.find((p) => p.id === id)?.name ?? '?'),
  };
}

function log(d: Draft, text: string) {
  d.s.log.push(text);
  if (d.s.log.length > 8) d.s.log.splice(0, d.s.log.length - 8);
}

const active = (s: DVState) => s.seats.map((_, i) => i).filter((i) => !s.out[i]);

function credit(d: Draft, to: number | 'pot' | 'bank', amount: number) {
  if (to === 'pot') d.s.pot += amount;
  else if (to !== 'bank') d.s.cash[to] += amount;
}

/** Trả tiền; thiếu thì ngân hàng mua lại đất (rẻ trước) nửa giá trị; vẫn thiếu thì phá sản. */
function pay(d: Draft, seat: number, amount: number, to: number | 'pot' | 'bank') {
  const s = d.s;
  if (amount <= 0 || s.out[seat]) return;
  while (s.cash[seat] < amount) {
    let cheapest = -1;
    s.lots.forEach((lot, pos) => {
      if (lot?.owner === seat && (cheapest < 0 || lotValue(s, pos) < lotValue(s, cheapest))) cheapest = pos;
    });
    if (cheapest < 0) break;
    const got = Math.round(lotValue(s, cheapest) / 2);
    s.lots[cheapest] = { owner: null, level: 0 };
    s.cash[seat] += got;
    log(d, strings.log.sold(d.names[seat], strings.tiles[cheapest], got));
  }
  const paid = Math.min(s.cash[seat], amount);
  s.cash[seat] -= paid;
  credit(d, to, paid);
  if (paid < amount) {
    s.out[seat] = true;
    s.cash[seat] = 0;
    log(d, strings.log.bankrupt(d.names[seat]));
  }
}

const anyNotaryLot = (s: DVState, seat: number, discount: number) =>
  s.lots.some((lot, pos) => lot && lot.owner === null && buyPrice(s, pos, discount) <= s.cash[seat]);

/** Xử lý ô vừa dừng. Trả về true nếu người chơi còn phải chọn. */
function land(d: Draft, seat: number, depth = 0): boolean {
  const s = d.s;
  if (s.out[seat]) return false;
  const pos = s.pos[seat];
  const lot = s.lots[pos];
  if (lot) {
    if (lot.owner === null) {
      if (buyPrice(s, pos) <= s.cash[seat]) return (s.phase = 'buy'), true;
      return false;
    }
    if (lot.owner === seat) {
      if (lot.level < 2 && investCost(pos) <= s.cash[seat]) return (s.phase = 'invest'), true;
      return false;
    }
    if (s.out[lot.owner]) return false;
    const rent = rentOf(s, pos);
    log(d, strings.log.rent(d.names[seat], d.names[lot.owner], rent));
    pay(d, seat, rent, lot.owner);
    return false;
  }
  switch (SPECIALS[pos]) {
    case 'notary':
      if (anyNotaryLot(s, seat, 0)) return (s.phase = 'notary'), (s.discount = 0), true;
      return false;
    case 'boom':
      return (s.phase = 'boom'), true;
    case 'pot':
      if (s.pot > 0) {
        log(d, strings.log.pot(d.names[seat], s.pot));
        s.cash[seat] += s.pot;
        s.pot = 0;
      }
      return false;
    case 'tax': {
      const tax = Math.max(20, Math.round(landValue(s, seat) / 10));
      log(d, strings.log.tax(d.names[seat], tax));
      pay(d, seat, tax, 'pot');
      return false;
    }
    case 'fee':
      log(d, strings.log.tax(d.names[seat], 40));
      pay(d, seat, 40, 'pot');
      return false;
    case 'rumor':
      return depth < 2 && rumor(d, seat, depth);
    default:
      return false;
  }
}

function drawEvent(d: Draft): number {
  if (!d.s.deck.length) d.s.deck = shuffle(Array.from({ length: EVENT_COUNT }, (_, i) => i));
  return d.s.deck.shift()!;
}

/** Rút và áp dụng một sự kiện tin đồn. */
function rumor(d: Draft, seat: number, depth: number, forced?: number): boolean {
  const s = d.s;
  const event = forced ?? drawEvent(d);
  const district = randomInt(0, 3);
  s.card = { id: s.rollId * 10 + depth + 1, event, district, seat };
  const others = active(s).filter((i) => i !== seat);
  switch (event) {
    case 0:
      s.index[district] = Math.min(INDEX_MAX, s.index[district] + 30);
      return false;
    case 1:
      s.index[district] = Math.max(INDEX_MIN, s.index[district] - 25);
      return false;
    case 2:
      s.cash[seat] += 100;
      return false;
    case 3: {
      const owned = s.lots.filter((l) => l?.owner === seat).length;
      pay(d, seat, owned * 15, 'pot');
      return false;
    }
    case 4:
      for (const o of others) pay(d, o, 20, seat);
      return false;
    case 5:
      for (const o of others) pay(d, seat, 20, o);
      return false;
    case 6:
      s.pos[seat] = 0;
      s.cash[seat] += SALARY;
      return false;
    case 7:
      s.pos[seat] = (s.pos[seat] - 3 + SIZE) % SIZE;
      return land(d, seat, depth + 1);
    case 8:
      s.cash[seat] += 60;
      return false;
    case 9:
      pay(d, seat, 50, 'pot');
      return false;
    case 10: {
      let cheapest = -1;
      s.lots.forEach((lot, pos) => {
        if (lot?.owner === seat && (cheapest < 0 || lotValue(s, pos) < lotValue(s, cheapest))) cheapest = pos;
      });
      if (cheapest >= 0) {
        s.cash[seat] += Math.round(lotValue(s, cheapest) * 1.5);
        s.lots[cheapest] = { owner: null, level: 0 };
      }
      return false;
    }
    case 11:
      if (anyNotaryLot(s, seat, 30)) return (s.phase = 'notary'), (s.discount = 30), true;
      return false;
    default:
      return false;
  }
}

function finish(d: Draft) {
  const s = d.s;
  s.phase = 'over';
  s.done = true;
  const alive = active(s);
  const best = Math.max(...alive.map((i) => worth(s, i)));
  s.winners = alive.filter((i) => worth(s, i) === best);
  log(d, strings.log.end);
}

/** Sang người kế tiếp còn chơi; quay hết một lượt bàn thì sang vòng mới; hết vòng thì kết thúc. */
function endTurn(d: Draft) {
  const s = d.s;
  s.phase = 'roll';
  s.discount = 0;
  if (active(s).length <= 1) return finish(d);
  const n = s.seats.length;
  for (let i = 1; i <= n; i++) {
    const cand = (s.turn + i) % n;
    if (s.turn + i >= n) {
      // Vừa đi qua ghế cuối: hết một vòng.
      if (s.turn + i - 1 < n) s.round += 1;
    }
    if (!s.out[cand]) {
      s.turn = cand;
      break;
    }
  }
  if (s.round > Number(s.rounds)) finish(d);
}

/** Dùng cho test: áp dụng một sự kiện cụ thể cho người đang tới lượt. */
export function applyEvent(s: DVState, event: number, players: Player[]): DVState {
  const d = draft(s, players);
  if (!rumor(d, s.turn, 0, event)) endTurn(d);
  return d.s;
}

export const dvGame: GameDef<DVState, DVAction> = {
  id: 'dat-vang',
  init: (players) => fresh(players),
  configOf: (s) => ({ rounds: s.rounds }),
  /** Bỏ lượt người mất kết nối. */
  advance(s, c) {
    if (s.done) return s;
    const d = draft(s, c?.players ?? []);
    endTurn(d);
    return d.s;
  },
  reduce(s, a, c) {
    if (a.type === 'config') {
      if (!c.host || s.rollId > 0) return s;
      const rounds = ROUND_OPTS.includes(a.config.rounds as RoundsOpt) ? (a.config.rounds as RoundsOpt) : '12';
      return { ...fresh(c.players, rounds), seq: s.seq + 1 };
    }
    if (a.type === 'restart') {
      if (!c.host || !s.done) return s;
      return { ...fresh(c.players, s.rounds), seq: s.seq + 1 };
    }
    const seat = seatOf(s, c.from);
    if (s.done || seat < 0 || seat !== s.turn || s.out[seat]) return s;

    if (a.type === 'roll') {
      if (s.phase !== 'roll') return s;
      const d = draft(s, c.players);
      const a1 = randomInt(1, 6);
      const a2 = randomInt(1, 6);
      d.s.dice = [a1, a2];
      d.s.rollId = s.rollId + 1;
      d.s.card = null;
      d.s.from = s.pos[seat];
      const to = s.pos[seat] + a1 + a2;
      d.s.pos[seat] = to % SIZE;
      log(d, strings.log.roll(d.names[seat], a1, a2, strings.tiles[to % SIZE]));
      if (to >= SIZE) {
        d.s.cash[seat] += SALARY;
        log(d, strings.log.salary(d.names[seat]));
      }
      if (!land(d, seat)) endTurn(d);
      return d.s;
    }

    if (a.type === 'buy') {
      const pos = s.pos[seat];
      const price = buyPrice(s, pos);
      if (s.phase !== 'buy' || s.lots[pos]?.owner !== null || price > s.cash[seat]) return s;
      const d = draft(s, c.players);
      d.s.cash[seat] -= price;
      d.s.lots[pos] = { owner: seat, level: 0 };
      log(d, strings.log.buy(d.names[seat], strings.tiles[pos], price));
      endTurn(d);
      return d.s;
    }

    if (a.type === 'invest') {
      const pos = s.pos[seat];
      const lot = s.lots[pos];
      const cost = investCost(pos);
      if (s.phase !== 'invest' || !lot || lot.owner !== seat || lot.level >= 2 || cost > s.cash[seat]) return s;
      const d = draft(s, c.players);
      d.s.cash[seat] -= cost;
      d.s.lots[pos] = { owner: seat, level: lot.level + 1 };
      log(d, strings.log.invest(d.names[seat], strings.tiles[pos], cost));
      endTurn(d);
      return d.s;
    }

    if (a.type === 'notary') {
      const lot = s.lots[a.pos];
      const price = buyPrice(s, a.pos, s.discount);
      if (s.phase !== 'notary' || !lot || lot.owner !== null || price > s.cash[seat]) return s;
      const d = draft(s, c.players);
      d.s.cash[seat] -= price;
      d.s.lots[a.pos] = { owner: seat, level: 0 };
      log(d, strings.log.buy(d.names[seat], strings.tiles[a.pos], price));
      endTurn(d);
      return d.s;
    }

    if (a.type === 'boom') {
      if (s.phase !== 'boom' || !Number.isInteger(a.district) || a.district < 0 || a.district > 3) return s;
      const d = draft(s, c.players);
      d.s.index[a.district] = Math.min(INDEX_MAX, d.s.index[a.district] + 25);
      log(d, strings.log.boom(d.names[seat], strings.districts[a.district]));
      endTurn(d);
      return d.s;
    }

    if (a.type === 'pass') {
      if (s.phase === 'roll' || s.phase === 'over') return s;
      const d = draft(s, c.players);
      endTurn(d);
      return d.s;
    }
    return s;
  },
};
