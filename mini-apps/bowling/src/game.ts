import { baseState, type BaseState, type GameDef, type Party, type Player } from '@bang/party';
import { MAX_ANGLE, START_MAX, roll, throwOf, type Throw } from './sim';
import { freshRack, framesDone, splitFrames, totalOf } from './score';

export const MAX_PLAYERS = 4;
const FULL = (): boolean[] => Array(10).fill(true);

export interface BowlState extends BaseState {
  /** id người chơi theo thứ tự ném (tối đa 4); ai vào sau thì xem. */
  seats: string[];
  rolls: number[][];
  /** Ki còn đứng trước lần ném kế tiếp. */
  standing: boolean[];
  /** Lần ném gần nhất để mọi máy chạy lại mô phỏng. */
  shot: { n: number; by: number; throw: Throw; standing: boolean[]; knocked: number[]; gutter: boolean } | null;
  done: boolean;
  /** Ván thắng theo id, giữ qua các ván. */
  wins: Record<string, number>;
}

export type BowlAction = { type: 'roll'; x0: number; angle: number; power: number; spin: number } | { type: 'restart' };

export type BowlParty = Party<BowlState, BowlAction>;

export function fresh(players: Player[], wins: Record<string, number> = {}): BowlState {
  const seats = players.slice(0, MAX_PLAYERS).map((p) => p.id);
  return { ...baseState(), seats, rolls: seats.map(() => []), standing: FULL(), shot: null, done: false, wins };
}

export const seatOf = (s: Pick<BowlState, 'seats'>, id: string) => {
  const i = s.seats.indexOf(id);
  return i < 0 ? null : i;
};

/** Khung hiện tại (0-9) của một người. */
export const frameOf = (rolls: readonly number[]) => Math.min(9, framesDone(rolls));

/** Người có điểm cao nhất (hòa thì nhiều người). */
export function leaders(s: BowlState): number[] {
  const totals = s.rolls.map((r) => totalOf(r));
  const best = Math.max(...totals);
  return totals.map((t, i) => (t === best ? i : -1)).filter((i) => i >= 0);
}

/** Ghi một lần ném (số ki đổ) cho người đang ném rồi chuyển lượt khi khung xong. */
export function record(s: BowlState, knocked: number[], shot: BowlState['shot']): BowlState {
  const seat = s.turn;
  const rolls = s.rolls.map((r, i) => (i === seat ? [...r, knocked.length] : r));
  const mine = rolls[seat];
  const fr = splitFrames(mine);
  const frameFinished = framesDone(mine) > framesDone(s.rolls[seat]);
  let standing = s.standing.map((up, i) => up && !knocked.includes(i));
  let turn = seat;
  let done = false;
  if (frameFinished) {
    standing = FULL();
    // Khung tiếp theo: người kế tiếp. Người cuối ném xong khung 10 thì hết ván.
    const next = (seat + 1) % s.seats.length;
    if (next === 0 && fr.length === 10) done = true;
    else turn = next;
  } else if (freshRack(mine)) standing = FULL();
  let wins = s.wins;
  const out: BowlState = { ...s, rolls, standing, turn, done, shot, seq: s.seq + 1 };
  if (done) {
    wins = { ...wins };
    for (const i of leaders(out)) wins[s.seats[i]] = (wins[s.seats[i]] ?? 0) + 1;
  }
  return { ...out, wins };
}

const inRange = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;

export const bowlingGame: GameDef<BowlState, BowlAction> = {
  id: 'bowling',
  init: (players) => fresh(players),
  // Bỏ lượt người mất kết nối: tính là một bi lọt rãnh.
  advance: (s) => (s.done ? s : record(s, [], s.shot)),
  reduce(s, a, c) {
    if (a.type === 'restart') {
      if (!c.host || !s.done) return s;
      return { ...fresh(c.players, s.wins), seq: s.seq + 1 };
    }
    if (a.type === 'roll') {
      if (s.done || s.seats[s.turn] !== c.from) return s;
      if (!inRange(a.x0, -START_MAX, START_MAX) || !inRange(a.angle, -MAX_ANGLE, MAX_ANGLE) || !inRange(a.power, 0, 1) || !inRange(a.spin, -1, 1)) return s;
      const t = throwOf(a.x0, a.angle, a.power, a.spin);
      const r = roll(s.standing, t);
      return record(s, r.knocked, { n: (s.shot?.n ?? 0) + 1, by: s.turn, throw: t, standing: s.standing, knocked: r.knocked, gutter: r.gutter });
    }
    return s;
  },
};
