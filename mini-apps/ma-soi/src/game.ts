import { baseState, shuffle, type BaseState, type GameDef, type Party, type Player, type ReduceContext } from '@bang/party';
import type { Role, TalkTime, Toggle, WolfCount } from './strings';

export const MIN = 5;
export const MAX = 12;

export type Phase = 'few' | 'reveal' | 'night' | 'day' | 'vote' | 'verdict' | 'hunter' | 'over';
export type Step = 'baove' | 'soi' | 'tientri' | 'phuthuy';
const STEP_ORDER: Step[] = ['baove', 'soi', 'tientri', 'phuthuy'];
/** Không ai còn sống giữ vai này: vẫn giả vờ gọi vai một lúc để không lộ là vai đó đã chết. */
const FAKE_MIN = 3000;
const FAKE_SPREAD = 3000;

export type LogEntry =
  | { kind: 'night'; n: number; seats: number[] }
  | { kind: 'hang'; n: number; seat: number }
  | { kind: 'shot'; seat: number; target: number };

export interface Config {
  wolves: WolfCount;
  seerOn: Toggle;
  guardOn: Toggle;
  witchOn: Toggle;
  hunterOn: Toggle;
  talk: TalkTime;
}

export interface WolfState extends BaseState, Config {
  seats: string[];
  roles: Role[];
  alive: boolean[];
  phase: Phase;
  night: number;
  day: number;
  step: Step | null;
  /** Giai đoạn nhận vai: ai đã xem. */
  ready: boolean[];
  guard: number | null;
  lastGuard: number | null;
  /** Phiếu của từng con sói đêm nay (chỉ số ghế bị chọn). */
  wolfVotes: (number | null)[];
  victim: number | null;
  /** Lịch sử soi của tiên tri. */
  seen: { night: number; target: number; wolf: boolean }[];
  peeked: boolean;
  heal: boolean;
  poison: boolean;
  saved: boolean;
  poisoned: number | null;
  /** Người chết đêm vừa qua (công bố lúc trời sáng). */
  deaths: number[];
  /** -1 là không bỏ phiếu, null là chưa bỏ. */
  votes: (number | null)[];
  /** Kết quả treo cổ gần nhất: -1 là không ai. */
  hanged: number;
  hunter: number | null;
  after: 'day' | 'night';
  deadline: number;
  winner: 'village' | 'wolf' | null;
  log: LogEntry[];
}

export type WolfAction =
  | { type: 'config'; config: Partial<Config> }
  | { type: 'ready' }
  | { type: 'guard'; target: number }
  | { type: 'bite'; target: number }
  | { type: 'peek'; target: number }
  | { type: 'done' }
  | { type: 'witch'; save: boolean; poison: number | null }
  | { type: 'tick' }
  | { type: 'startVote' }
  | { type: 'vote'; target: number }
  | { type: 'closeVote' }
  | { type: 'continue' }
  | { type: 'shoot'; target: number }
  | { type: 'force' }
  | { type: 'restart' };

export type WolfParty = Party<WolfState, WolfAction>;

export const defaultConfig: Config = { wolves: 'auto', seerOn: 'auto', guardOn: 'auto', witchOn: 'auto', hunterOn: 'auto', talk: '180' };

const pick = <T extends string>(v: unknown, list: readonly T[], d: T): T => (list.includes(v as T) ? (v as T) : d);

const configOf = (s: Config): Config => ({ wolves: s.wolves, seerOn: s.seerOn, guardOn: s.guardOn, witchOn: s.witchOn, hunterOn: s.hunterOn, talk: s.talk });

export function cleanConfig(c: Partial<Config>): Config {
  const t = ['auto', 'on', 'off'] as const;
  return {
    wolves: pick(c.wolves, ['auto', '1', '2', '3', '4'] as const, 'auto'),
    seerOn: pick(c.seerOn, t, 'auto'),
    guardOn: pick(c.guardOn, t, 'auto'),
    witchOn: pick(c.witchOn, t, 'auto'),
    hunterOn: pick(c.hunterOn, t, 'auto'),
    talk: pick(c.talk, ['60', '120', '180', '300'] as const, '180'),
  };
}

/** Chia vai theo số người và cài đặt. Sói luôn ít hơn nửa số người, vai đặc biệt không vượt quá số chỗ còn lại. */
export function roleCounts(n: number, c: Config): Record<Role, number> {
  const out: Record<Role, number> = { dan: 0, soi: 0, tientri: 0, baove: 0, phuthuy: 0, thosan: 0 };
  if (n < 1) return out;
  const maxWolves = Math.max(1, Math.floor((n - 1) / 2));
  const autoWolves = n <= 6 ? 1 : n <= 9 ? 2 : 3;
  out.soi = Math.min(maxWolves, c.wolves === 'auto' ? autoWolves : Number(c.wolves));
  const want = (t: Toggle, minN: number) => (t === 'on' ? true : t === 'off' ? false : n >= minN);
  let room = n - out.soi;
  const specials: [Role, boolean][] = [
    ['tientri', want(c.seerOn, 1)],
    ['baove', want(c.guardOn, 6)],
    ['phuthuy', want(c.witchOn, 7)],
    ['thosan', want(c.hunterOn, 8)],
  ];
  for (const [r, on] of specials) {
    if (on && room > 1) {
      out[r] = 1;
      room--;
    }
  }
  out.dan = room;
  return out;
}

export function dealRoles(n: number, c: Config): Role[] {
  const counts = roleCounts(n, c);
  const list: Role[] = [];
  for (const r of Object.keys(counts) as Role[]) for (let i = 0; i < counts[r]; i++) list.push(r);
  return shuffle(list);
}

function fresh(players: Player[], cfg: Config = defaultConfig): WolfState {
  const seats = players.slice(0, MAX).map((p) => p.id);
  const n = seats.length;
  const few = n < MIN;
  const roles = few ? [] : dealRoles(n, cfg);
  return {
    ...baseState(),
    ...cfg,
    seats,
    roles,
    alive: seats.map(() => true),
    phase: few ? 'few' : 'reveal',
    night: 0,
    day: 0,
    step: null,
    ready: seats.map(() => false),
    guard: null,
    lastGuard: null,
    wolfVotes: seats.map(() => null),
    victim: null,
    seen: [],
    peeked: false,
    heal: true,
    poison: true,
    saved: false,
    poisoned: null,
    deaths: [],
    votes: seats.map(() => null),
    hanged: -1,
    hunter: null,
    after: 'night',
    deadline: 0,
    winner: null,
    log: [],
  };
}

const bump = (s: WolfState, patch: Partial<WolfState>): WolfState => ({ ...s, ...patch, seq: s.seq + 1 });
const nowOf = (c: ReduceContext) => c.now ?? Date.now();

export const seatOf = (s: WolfState, id: string) => s.seats.indexOf(id);
export const holders = (s: Pick<WolfState, 'roles' | 'alive'>, role: Role) => s.roles.flatMap((r, i) => (r === role && s.alive[i] ? [i] : []));
export const stepsOf = (s: Pick<WolfState, 'roles'>) => STEP_ORDER.filter((st) => s.roles.includes(st));
export const isWolf = (s: WolfState, seat: number) => s.roles[seat] === 'soi';
const validTarget = (s: WolfState, t: number) => Number.isInteger(t) && t >= 0 && t < s.seats.length && s.alive[t];

export function winnerOf(s: Pick<WolfState, 'roles' | 'alive'>): WolfState['winner'] {
  let wolves = 0;
  let others = 0;
  s.roles.forEach((r, i) => {
    if (!s.alive[i]) return;
    if (r === 'soi') wolves++;
    else others++;
  });
  if (wolves === 0) return 'village';
  if (wolves >= others) return 'wolf';
  return null;
}

/** Ai cần hành động trong bước đêm hiện tại (để trỏ lượt). */
function firstWolfToVote(s: WolfState) {
  return holders(s, 'soi').find((w) => s.wolfVotes[w] === null);
}

function enterStep(s: WolfState, step: Step | null, c: ReduceContext): WolfState {
  if (!step) return resolveNight(s, c);
  const who = step === 'soi' ? holders(s, 'soi') : holders(s, step);
  const fake = who.length === 0;
  const turn = fake ? s.turn : who[0];
  return bump(s, { step, turn, deadline: fake ? nowOf(c) + FAKE_MIN + Math.floor(Math.random() * FAKE_SPREAD) : 0 });
}

function nextStep(s: WolfState, c: ReduceContext): WolfState {
  const steps = stepsOf(s);
  const i = s.step ? steps.indexOf(s.step) : -1;
  return enterStep(s, steps[i + 1] ?? null, c);
}

function startNight(s: WolfState, c: ReduceContext): WolfState {
  const steps = stepsOf(s);
  const base: WolfState = {
    ...s,
    phase: 'night',
    night: s.night + 1,
    step: null,
    guard: null,
    wolfVotes: s.seats.map(() => null),
    victim: null,
    peeked: false,
    saved: false,
    poisoned: null,
    deaths: [],
    hunter: null,
  };
  return enterStep(base, steps[0] ?? null, c);
}

function startDay(s: WolfState, c: ReduceContext): WolfState {
  const first = s.alive.findIndex(Boolean);
  return bump(s, {
    phase: 'day',
    day: s.day + 1,
    step: null,
    votes: s.seats.map(() => null),
    hanged: -1,
    turn: first,
    deadline: nowOf(c) + Number(s.talk) * 1000,
  });
}

/** Sau khi có người chết: thợ săn bắn trước, rồi xét thắng thua, rồi sang giai đoạn kế. */
function afterDeaths(s: WolfState, dead: number[], next: 'day' | 'night', c: ReduceContext): WolfState {
  const hunter = dead.find((d) => s.roles[d] === 'thosan');
  if (hunter !== undefined) return bump(s, { phase: 'hunter', hunter, after: next, turn: hunter, step: null });
  const winner = winnerOf(s);
  if (winner) return bump(s, { phase: 'over', winner, step: null });
  return next === 'day' ? startDay(s, c) : startNight(s, c);
}

function resolveNight(s: WolfState, c: ReduceContext): WolfState {
  const dead: number[] = [];
  if (s.victim !== null && s.guard !== s.victim && !s.saved) dead.push(s.victim);
  if (s.poisoned !== null && !dead.includes(s.poisoned)) dead.push(s.poisoned);
  const alive = s.alive.map((a, i) => a && !dead.includes(i));
  const next: WolfState = {
    ...s,
    alive,
    deaths: dead,
    lastGuard: s.guard,
    step: null,
    log: [...s.log, { kind: 'night', n: s.night, seats: dead }],
  };
  return afterDeaths(next, dead, 'day', c);
}

function tally(votes: (number | null)[]): number {
  const count = new Map<number, number>();
  for (const v of votes) if (v !== null && v >= 0) count.set(v, (count.get(v) ?? 0) + 1);
  let best = -1;
  let top = 0;
  let tie = false;
  for (const [seat, n] of count) {
    if (n > top) {
      top = n;
      best = seat;
      tie = false;
    } else if (n === top) tie = true;
  }
  return tie ? -1 : best;
}

function resolveVote(s: WolfState): WolfState {
  const votes = s.votes.map((v, i) => (s.alive[i] && v === null ? -1 : v));
  const hanged = tally(votes);
  const alive = hanged >= 0 ? s.alive.map((a, i) => a && i !== hanged) : s.alive;
  return bump(s, { votes, hanged, alive, phase: 'verdict', log: [...s.log, { kind: 'hang', n: s.day, seat: hanged }] });
}

/** Bầy sói chốt người bị cắn: nhiều phiếu nhất; hòa thì theo phiếu của con sói ngồi trước. */
function wolfTarget(s: WolfState): number | null {
  const t = tally(s.wolfVotes);
  if (t >= 0) return t;
  const first = s.wolfVotes.find((v) => v !== null && v >= 0);
  return first ?? null;
}

const turnToFirstUnvoted = (s: WolfState) => {
  const i = s.alive.findIndex((a, j) => a && s.votes[j] === null);
  return i < 0 ? s.turn : i;
};

export const wolfGame: GameDef<WolfState, WolfAction> = {
  id: 'ma-soi',
  init: (players) => fresh(players),
  configOf: (s) => configOf(s),
  advance: (s) => s,
  reduce(s, a, c) {
    if (a.type === 'config') {
      if (!c.host || (s.phase !== 'reveal' && s.phase !== 'few') || s.ready.some(Boolean)) return s;
      return { ...fresh(c.players, cleanConfig({ ...configOf(s), ...a.config })), seq: s.seq + 1 };
    }
    if (a.type === 'restart') {
      if (!c.host || (s.phase !== 'over' && s.phase !== 'few')) return s;
      return { ...fresh(c.players, configOf(s)), seq: s.seq + 1 };
    }
    const me = seatOf(s, c.from);
    const meAlive = me >= 0 && s.alive[me];

    switch (a.type) {
      case 'ready': {
        if (s.phase !== 'reveal' || me < 0 || s.ready[me]) return s;
        const ready = s.ready.map((r, i) => r || i === me);
        if (ready.every(Boolean)) return startNight({ ...s, ready }, c);
        return bump(s, { ready, turn: ready.indexOf(false) });
      }
      case 'guard': {
        if (s.phase !== 'night' || s.step !== 'baove' || !meAlive || s.roles[me] !== 'baove') return s;
        if (!validTarget(s, a.target) || a.target === s.lastGuard) return s;
        return nextStep({ ...s, guard: a.target }, c);
      }
      case 'bite': {
        if (s.phase !== 'night' || s.step !== 'soi' || !meAlive || !isWolf(s, me) || s.wolfVotes[me] !== null) return s;
        if (!validTarget(s, a.target) || isWolf(s, a.target)) return s;
        const wolfVotes = s.wolfVotes.map((v, i) => (i === me ? a.target : v));
        const next = { ...s, wolfVotes };
        const pending = firstWolfToVote(next);
        if (pending !== undefined) return bump(next, { turn: pending });
        return nextStep({ ...next, victim: wolfTarget(next) }, c);
      }
      case 'peek': {
        if (s.phase !== 'night' || s.step !== 'tientri' || !meAlive || s.roles[me] !== 'tientri' || s.peeked) return s;
        if (!validTarget(s, a.target) || a.target === me) return s;
        return bump(s, { peeked: true, seen: [...s.seen, { night: s.night, target: a.target, wolf: isWolf(s, a.target) }] });
      }
      case 'done': {
        if (s.phase !== 'night' || s.step !== 'tientri' || !meAlive || s.roles[me] !== 'tientri' || !s.peeked) return s;
        return nextStep(s, c);
      }
      case 'witch': {
        if (s.phase !== 'night' || s.step !== 'phuthuy' || !meAlive || s.roles[me] !== 'phuthuy') return s;
        if (a.save && a.poison !== null) return s;
        if (a.save && (!s.heal || s.victim === null)) return s;
        if (a.poison !== null && (!s.poison || !validTarget(s, a.poison) || a.poison === me)) return s;
        return nextStep({ ...s, saved: a.save, heal: s.heal && !a.save, poisoned: a.poison, poison: s.poison && a.poison === null }, c);
      }
      case 'tick': {
        if (!s.deadline || nowOf(c) < s.deadline) return s;
        if (s.phase === 'night' && s.step && (s.step === 'soi' ? holders(s, 'soi') : holders(s, s.step)).length === 0) return nextStep(s, c);
        if (s.phase === 'day') return bump(s, { phase: 'vote', deadline: 0, turn: turnToFirstUnvoted(s) });
        return s;
      }
      case 'startVote': {
        if (s.phase !== 'day' || !c.host) return s;
        return bump(s, { phase: 'vote', deadline: 0, turn: turnToFirstUnvoted(s) });
      }
      case 'vote': {
        if (s.phase !== 'vote' || !meAlive || s.votes[me] !== null) return s;
        if (a.target !== -1 && (!validTarget(s, a.target) || a.target === me)) return s;
        const votes = s.votes.map((v, i) => (i === me ? a.target : v));
        const next = { ...s, votes };
        if (s.alive.every((al, i) => !al || votes[i] !== null)) return resolveVote(next);
        return bump(next, { turn: turnToFirstUnvoted(next) });
      }
      case 'closeVote': {
        if (s.phase !== 'vote' || !c.host) return s;
        return resolveVote(s);
      }
      case 'continue': {
        if (s.phase !== 'verdict' || (!c.host && me < 0)) return s;
        return afterDeaths(s, s.hanged >= 0 ? [s.hanged] : [], 'night', c);
      }
      case 'shoot': {
        if (s.phase !== 'hunter' || s.hunter === null || me !== s.hunter) return s;
        if (a.target !== -1 && (!validTarget(s, a.target) || a.target === me)) return s;
        const shot = a.target;
        const alive = shot >= 0 ? s.alive.map((al, i) => al && i !== shot) : s.alive;
        const log: LogEntry[] = shot >= 0 ? [...s.log, { kind: 'shot', seat: me, target: shot }] : s.log;
        return afterDeaths({ ...s, alive, log, hunter: null }, [], s.after, c);
      }
      case 'force': {
        if (!c.host) return s;
        if (s.phase === 'reveal') return startNight({ ...s, ready: s.ready.map(() => true) }, c);
        if (s.phase === 'night') {
          if (s.step === 'soi') return nextStep({ ...s, victim: wolfTarget(s) }, c);
          return nextStep(s, c);
        }
        if (s.phase === 'hunter') return afterDeaths({ ...s, hunter: null }, [], s.after, c);
        return s;
      }
    }
    return s;
  },
};
