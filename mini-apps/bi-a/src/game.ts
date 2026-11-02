import { baseState, type BaseState, type GameDef, type Party, type Player } from '@bang/party';
import { CUE_SPOT, FOOT, SPEED_MAX, SPEED_MIN, canPlace, freeSpot, kindOf, rack, simulate, type Ball } from './sim';

export type Seat = 0 | 1;
export type Group = 'solid' | 'stripe';
export type Foul = 'scratch' | 'miss' | 'wrong';

/** Tóm tắt cú đánh vừa rồi để hiện lên màn. */
export interface ShotReport {
  by: Seat;
  foul: Foul | null;
  pocketed: number[];
  /** Nhóm vừa được chọn cho người đánh (lần đầu vào bi). */
  group: Group | null;
  again: boolean;
  /** Bi 8 rơi lúc phá bi: được đặt lại. */
  respot: boolean;
}

export interface BiaState extends BaseState {
  seats: [string, string];
  balls: Ball[];
  /** Nhóm của ghế 0 (ghế 1 nhóm còn lại); null khi bàn còn mở. */
  group0: Group | null;
  /** Bi cái trong tay: 'kitchen' đặt dưới vạch giao bóng, 'table' đặt đâu cũng được. */
  inHand: 'kitchen' | 'table' | null;
  broken: boolean;
  /** Cú đánh gần nhất, để mọi máy chạy lại cùng mô phỏng và phát hoạt ảnh. */
  shot: { n: number; from: Ball[]; vx: number; vy: number } | null;
  report: ShotReport | null;
  winner: Seat | null;
  /** Lý do kết thúc: thắng đẹp hay đối thủ vào bi 8 hỏng. */
  how: 'clean' | 'early8' | 'foul8' | null;
  done: boolean;
  wins: Record<string, number>;
  /** Người phá bi của ván này; ván sau đổi. */
  breaker: Seat;
}

export type BiaAction =
  | { type: 'shoot'; angle: number; power: number; cx?: number; cy?: number }
  | { type: 'restart' };

export type BiaParty = Party<BiaState, BiaAction>;

export const other = (s: Seat): Seat => (s === 0 ? 1 : 0);
export const groupOf = (st: Pick<BiaState, 'group0'>, seat: Seat): Group | null =>
  st.group0 === null ? null : seat === 0 ? st.group0 : st.group0 === 'solid' ? 'stripe' : 'solid';
export const seatOf = (st: Pick<BiaState, 'seats'>, id: string): Seat | null => {
  const i = st.seats.indexOf(id);
  return i < 0 ? null : (i as Seat);
};
/** Ghế đang tới lượt. */
export const shooter = (st: Pick<BiaState, 'turn'>): Seat => (st.turn === 1 ? 1 : 0);

/** Số bi của nhóm còn trên bàn. */
export const left = (balls: readonly Ball[], g: Group) => balls.filter((b) => b.on && kindOf(b.id) === g).length;

export function fresh(players: Player[], breaker: Seat = 0, wins: Record<string, number> = {}, rand: () => number = Math.random): BiaState {
  return {
    ...baseState(),
    turn: breaker,
    seats: [players[0]?.id ?? '', players[1]?.id ?? ''],
    balls: rack(rand),
    group0: null,
    inHand: 'kitchen',
    broken: false,
    shot: null,
    report: null,
    winner: null,
    how: null,
    done: false,
    wins,
    breaker,
  };
}

function finish(s: BiaState, winner: Seat, how: BiaState['how']): Partial<BiaState> {
  const id = s.seats[winner];
  return { winner, how, done: true, wins: { ...s.wins, [id]: (s.wins[id] ?? 0) + 1 } };
}

/** Luật một cú đánh: chạy mô phỏng rồi xét lỗi, nhóm bi, bi 8 và lượt kế. */
export function shoot(s: BiaState, seat: Seat, angle: number, power: number, cx?: number, cy?: number): BiaState {
  let balls = s.balls;
  if (s.inHand && cx !== undefined && cy !== undefined) {
    if (!canPlace(balls, cx, cy, s.inHand === 'kitchen')) return s;
    balls = balls.map((b) => (b.id === 0 ? { ...b, x: cx, y: cy, on: true } : b));
  }
  const p = Math.min(1, Math.max(0, power));
  const speed = SPEED_MIN + (SPEED_MAX - SPEED_MIN) * p;
  const vx = Math.cos(angle) * speed;
  const vy = Math.sin(angle) * speed;
  const sim = simulate(balls, vx, vy);
  const mine = groupOf(s, seat);
  const clearedBefore = mine !== null && left(balls, mine) === 0;
  const objects = sim.pocketed.filter((id) => id !== 0);
  const scratch = sim.pocketed.includes(0);
  const eight = objects.includes(8);

  let foul: Foul | null = null;
  if (scratch) foul = 'scratch';
  else if (sim.firstHit === null) foul = 'miss';
  else if (s.broken) {
    const target = mine === null ? null : clearedBefore ? 'eight' : mine;
    const kind = kindOf(sim.firstHit);
    if (target === null ? kind === 'eight' : kind !== target) foul = 'wrong';
  }

  const shot = { n: (s.shot?.n ?? 0) + 1, from: balls, vx, vy };
  let next: BiaState = { ...s, shot, balls: sim.balls, broken: true, seq: s.seq + 1 };

  if (eight) {
    if (!s.broken) {
      // Bi 8 rơi lúc phá: đặt lại ở chấm đầu bàn, ván chơi tiếp.
      const spot = freeSpot(sim.balls, FOOT.x, FOOT.y, 8);
      next.balls = next.balls.map((b) => (b.id === 8 ? { ...b, ...spot, on: true } : b));
    } else {
      const ok = clearedBefore && !foul;
      const report: ShotReport = { by: seat, foul, pocketed: sim.pocketed, group: null, again: false, respot: false };
      return { ...next, report, inHand: null, ...finish(s, ok ? seat : other(seat), ok ? 'clean' : mine && clearedBefore ? 'foul8' : 'early8') };
    }
  }

  // Lần đầu vào bi (không lỗi): người đánh nhận nhóm của bi rơi đầu tiên.
  let group: Group | null = null;
  const firstObj = objects.find((id) => id !== 8);
  if (s.group0 === null && !foul && firstObj !== undefined) {
    group = kindOf(firstObj) as Group;
    next.group0 = seat === 0 ? group : group === 'solid' ? 'stripe' : 'solid';
  }
  const myGroup = groupOf(next, seat);
  const scored = objects.some((id) => id !== 8 && (myGroup === null || kindOf(id) === myGroup));
  const again = !foul && scored;

  if (scratch) {
    const spot = freeSpot(next.balls, CUE_SPOT.x, CUE_SPOT.y, 0, 1);
    next.balls = next.balls.map((b) => (b.id === 0 ? { ...b, ...spot, on: true } : b));
  }
  next = {
    ...next,
    inHand: foul ? (scratch && !s.broken ? 'kitchen' : 'table') : null,
    turn: again ? seat : other(seat),
    report: { by: seat, foul, pocketed: sim.pocketed, group, again, respot: eight },
  };
  return next;
}

export const biaGame: GameDef<BiaState, BiaAction> = {
  id: 'bi-a',
  init: (players) => fresh(players),
  // Bỏ lượt người mất kết nối: đối thủ được bi cái trong tay.
  advance: (s) => (s.done ? s : { ...s, turn: other(shooter(s)), inHand: s.broken ? 'table' : 'kitchen', report: null, seq: s.seq + 1 }),
  reduce(s, a, c) {
    if (a.type === 'restart') {
      if (!c.host || !s.done) return s;
      const breaker = other(s.breaker);
      return { ...fresh(c.players, breaker, s.wins), seq: s.seq + 1 };
    }
    if (a.type === 'shoot') {
      if (s.done) return s;
      const seat = seatOf(s, c.from);
      if (seat === null || seat !== shooter(s)) return s;
      if (!Number.isFinite(a.angle) || !Number.isFinite(a.power) || a.power < 0 || a.power > 1) return s;
      const placing = a.cx !== undefined || a.cy !== undefined;
      if (placing && (!s.inHand || typeof a.cx !== 'number' || typeof a.cy !== 'number')) return s;
      return shoot(s, seat, a.angle, a.power, a.cx, a.cy);
    }
    return s;
  },
};
