import { baseState, shuffle, type BaseState, type GameDef, type Party, type Player, type ReduceContext } from '@bang/party';
import type { Goal, Kind, Role, WindowSec } from './strings';

export const MAX_SEATS = 6;
export const ROLES: Role[] = ['quanvan', 'votuong', 'thaigiam', 'thayboi', 'ngusu'];
const COPIES = 3;
export const START_SILVER = 2;
export const MAX_CRIMES = 3;

/** Việc tấu nào cần chức nào. Việc thường không cần chức. */
export const claimRole: Partial<Record<Kind, Role>> = {
  dangSo: 'quanvan',
  uyHiep: 'votuong',
  giemPha: 'thaigiam',
  xemQue: 'thayboi',
  thanhTra: 'ngusu',
};
/** Việc tấu bị can bằng chức nào; `anyone`: ai cũng can được, không thì chỉ người bị nhắm. */
export const blockRule: Partial<Record<Kind, { role: Role; anyone: boolean }>> = {
  dangSo: { role: 'ngusu', anyone: true },
  uyHiep: { role: 'thaigiam', anyone: false },
  giemPha: { role: 'quanvan', anyone: false },
};
export const cost: Partial<Record<Kind, number>> = { dangLe: 3, vuCao: 4, doiChuc: 1 };
export const targeted: Kind[] = ['vuCao', 'uyHiep', 'giemPha', 'xemQue'];
export const BASE_KINDS: Kind[] = ['lamAn', 'dangLe', 'vuCao', 'doiChuc'];
export const CLAIM_KINDS: Kind[] = ['dangSo', 'uyHiep', 'giemPha', 'xemQue', 'thanhTra'];

export type Phase = 'turn' | 'claim' | 'block' | 'choose' | 'over';

export type Ev =
  | { k: 'act'; seat: number; kind: Kind; target: number | null }
  | { k: 'challenge'; claimant: number; accuser: number; role: Role; truthful: boolean }
  | { k: 'blocked'; seat: number; role: Role }
  | { k: 'pay'; seat: number; to: number }
  | { k: 'crime'; seat: number }
  | { k: 'out'; seat: number }
  | { k: 'swap'; seat: number };

export interface Pending {
  kind: Kind;
  actor: number;
  target: number | null;
}

export interface TrieuState extends BaseState {
  seats: string[];
  roles: Role[];
  revealed: boolean[];
  court: Role[];
  silver: number[];
  favor: number[];
  crimes: number[];
  out: boolean[];
  phase: Phase;
  pending: Pending | null;
  blocker: number | null;
  /** Ai đã cho qua trong cửa sổ hặc/can hiện tại. */
  passed: boolean[];
  deadline: number;
  window: WindowSec;
  goal: Goal;
  turnNo: number;
  notes: { seat: number; target: number; role: Role; turnNo: number }[];
  log: Ev[];
  winner: number | null;
}

export type TrieuAction =
  | { type: 'config'; config: { window?: WindowSec; goal?: Goal } }
  | { type: 'act'; kind: Kind; target?: number }
  | { type: 'challenge'; by?: number }
  | { type: 'block'; by?: number }
  | { type: 'pass'; by?: number }
  | { type: 'proceed' }
  | { type: 'timeout' }
  | { type: 'choose'; pay: boolean }
  | { type: 'restart' };

export type TrieuParty = Party<TrieuState, TrieuAction>;

function fresh(players: Player[], window: WindowSec = '12', goal: Goal = '6'): TrieuState {
  const seats = players.slice(0, MAX_SEATS).map((p) => p.id);
  const deck = shuffle(ROLES.flatMap((r) => Array<Role>(COPIES).fill(r)));
  const n = seats.length;
  return {
    ...baseState(),
    seats,
    roles: deck.slice(0, n),
    court: deck.slice(n),
    revealed: seats.map(() => false),
    silver: seats.map(() => START_SILVER),
    favor: seats.map(() => 0),
    crimes: seats.map(() => 0),
    out: seats.map(() => false),
    phase: 'turn',
    pending: null,
    blocker: null,
    passed: seats.map(() => false),
    deadline: 0,
    window,
    goal,
    turnNo: 1,
    notes: [],
    log: [],
    winner: null,
  };
}

const bump = (s: TrieuState, patch: Partial<TrieuState>): TrieuState => ({ ...s, ...patch, seq: s.seq + 1 });
const nowOf = (c: ReduceContext) => c.now ?? Date.now();
const set = <T,>(list: T[], i: number, v: T) => list.map((x, j) => (j === i ? v : x));
const addLog = (s: TrieuState, ...e: Ev[]): TrieuState => ({ ...s, log: [...s.log, ...e].slice(-12) });
export const active = (s: TrieuState) => s.seats.flatMap((_, i) => (s.out[i] ? [] : [i]));

/** Ai còn được phản ứng trong cửa sổ hiện tại. */
export function canReact(s: TrieuState, seat: number): { challenge: boolean; block: boolean } {
  const no = { challenge: false, block: false };
  if (seat < 0 || s.out[seat] || s.passed[seat] || !s.pending) return no;
  if (s.phase === 'claim') {
    if (seat === s.pending.actor) return no;
    const rule = blockRule[s.pending.kind];
    return { challenge: true, block: !!rule && (rule.anyone || seat === s.pending.target) };
  }
  if (s.phase === 'block') {
    if (seat === s.blocker) return no;
    return { challenge: true, block: false };
  }
  return no;
}

function giveCrime(s: TrieuState, seat: number): TrieuState {
  const crimes = set(s.crimes, seat, s.crimes[seat] + 1);
  let next = addLog({ ...s, crimes }, { k: 'crime', seat });
  if (crimes[seat] >= MAX_CRIMES && !s.out[seat]) next = addLog({ ...next, out: set(next.out, seat, true), revealed: set(next.revealed, seat, true) }, { k: 'out', seat });
  return next;
}

/** Xét thắng: đủ ân trước (theo thứ tự ghế), hoặc chỉ còn một người ở triều. */
function checkWin(s: TrieuState): TrieuState {
  const goal = Number(s.goal);
  const left = active(s);
  const rich = left.find((i) => s.favor[i] >= goal);
  const winner = rich ?? (left.length === 1 ? left[0] : null);
  if (winner === null) return s;
  return { ...s, phase: 'over', winner, pending: null, blocker: null, deadline: 0, turn: winner };
}

function endTurn(s: TrieuState): TrieuState {
  const won = checkWin(s);
  if (won.phase === 'over') return bump(won, {});
  const n = s.seats.length;
  const from = s.pending?.actor ?? s.turn;
  let turn = from;
  for (let k = 1; k <= n; k++) {
    const i = (from + k) % n;
    if (!s.out[i]) {
      turn = i;
      break;
    }
  }
  return bump(s, { phase: 'turn', pending: null, blocker: null, deadline: 0, passed: s.seats.map(() => false), turn, turnNo: s.turnNo + 1 });
}

/** Thi hành việc đã được chấp nhận. */
function perform(s: TrieuState, c: ReduceContext): TrieuState {
  const p = s.pending!;
  const a = p.actor;
  const t = p.target;
  switch (p.kind) {
    case 'lamAn':
      return endTurn({ ...s, silver: set(s.silver, a, s.silver[a] + 1) });
    case 'dangLe':
      return endTurn({ ...s, favor: set(s.favor, a, s.favor[a] + 1) });
    case 'vuCao':
      return endTurn(giveCrime(s, t!));
    case 'doiChuc': {
      const court = shuffle([...s.court, s.roles[a]]);
      const role = court[0];
      return endTurn(addLog({ ...s, court: court.slice(1), roles: set(s.roles, a, role), revealed: set(s.revealed, a, false) }, { k: 'swap', seat: a }));
    }
    case 'dangSo':
      return endTurn({ ...s, favor: set(s.favor, a, s.favor[a] + 1) });
    case 'uyHiep':
      if (s.out[t!]) return endTurn(s);
      // Người bị uy hiếp tự chọn (trỏ lượt sang họ để chơi 1 máy bấm đúng người); hết giờ thì coi như nộp bạc.
      if (s.silver[t!] >= 2) return bump(s, { phase: 'choose', deadline: nowOf(c) + Number(s.window) * 1000, turn: t! });
      return endTurn(giveCrime(s, t!));
    case 'giemPha':
      return endTurn({ ...s, favor: set(s.favor, t!, Math.max(0, s.favor[t!] - 1)), silver: set(s.silver, a, s.silver[a] + 1) });
    case 'xemQue':
      return endTurn({ ...s, silver: set(s.silver, a, s.silver[a] + 1), notes: [...s.notes, { seat: a, target: t!, role: s.roles[t!], turnNo: s.turnNo }] });
    case 'thanhTra':
      return endTurn({ ...s, crimes: set(s.crimes, a, Math.max(0, s.crimes[a] - 1)), silver: set(s.silver, a, s.silver[a] + 1) });
  }
  return endTurn(s);
}

/** Hặc một lời xưng chức. Trả về state sau phân xử và lời xưng có thật không. */
function judge(s: TrieuState, claimant: number, accuser: number, role: Role): { s: TrieuState; truthful: boolean } {
  const truthful = s.roles[claimant] === role;
  let next = addLog(s, { k: 'challenge', claimant, accuser, role, truthful });
  if (truthful) {
    next = { ...next, revealed: set(next.revealed, claimant, true), favor: set(next.favor, claimant, next.favor[claimant] + 1) };
    next = giveCrime(next, accuser);
  } else {
    next = { ...next, favor: set(next.favor, accuser, next.favor[accuser] + 1) };
    next = giveCrime(next, claimant);
  }
  return { s: next, truthful };
}

/** Mọi người còn quyền phản ứng đã cho qua chưa. */
function allPassed(s: TrieuState) {
  return active(s).every((i) => {
    const r = canReact(s, i);
    return !r.challenge && !r.block;
  });
}

/** Hết cửa sổ mà không ai phản đối. */
function settle(s: TrieuState, c: ReduceContext): TrieuState {
  if (s.phase === 'claim') return perform(s, c);
  if (s.phase === 'block') return endTurn(addLog(s, { k: 'blocked', seat: s.blocker!, role: blockRule[s.pending!.kind]!.role }));
  return s;
}

function openWindow(s: TrieuState, phase: 'claim' | 'block', c: ReduceContext, blocker: number | null = null): TrieuState {
  return bump(s, { phase, blocker, passed: s.seats.map(() => false), deadline: nowOf(c) + Number(s.window) * 1000 });
}

export const trieuGame: GameDef<TrieuState, TrieuAction> = {
  id: 'muu-trieu',
  init: (players) => fresh(players),
  configOf: (s) => ({ window: s.window, goal: s.goal }),
  advance: (s) => s,
  reduce(s, a, c) {
    if (a.type === 'config') {
      if (!c.host) return s;
      const window: WindowSec = a.config.window === '8' || a.config.window === '20' ? a.config.window : '12';
      const goal: Goal = a.config.goal === '5' || a.config.goal === '8' ? a.config.goal : '6';
      return { ...fresh(c.players, window, goal), seq: s.seq + 1 };
    }
    if (a.type === 'restart') {
      if (!c.host || s.phase !== 'over') return s;
      return { ...fresh(c.players, s.window, s.goal), seq: s.seq + 1 };
    }
    if (s.phase === 'over' || s.seats.length < 2) return s;
    const fromSeat = s.seats.indexOf(c.from);
    // Chơi 1 máy (chủ phòng giữ luật) được bấm thay cho người khác trong cửa sổ phản ứng.
    const who = (by?: number) => (c.host && typeof by === 'number' && by >= 0 && by < s.seats.length ? by : fromSeat);

    switch (a.type) {
      case 'act': {
        if (s.phase !== 'turn' || fromSeat !== s.turn || s.out[fromSeat]) return s;
        const kind = a.kind;
        if (!BASE_KINDS.includes(kind) && !CLAIM_KINDS.includes(kind)) return s;
        const price = cost[kind] ?? 0;
        if (s.silver[fromSeat] < price) return s;
        let target: number | null = null;
        if (targeted.includes(kind)) {
          const t = a.target;
          if (typeof t !== 'number' || !Number.isInteger(t) || t < 0 || t >= s.seats.length || t === fromSeat || s.out[t]) return s;
          target = t;
        }
        const next = addLog({ ...s, silver: set(s.silver, fromSeat, s.silver[fromSeat] - price), pending: { kind, actor: fromSeat, target } }, { k: 'act', seat: fromSeat, kind, target });
        if (BASE_KINDS.includes(kind)) return perform(next, c);
        return openWindow(next, 'claim', c);
      }
      case 'challenge': {
        const seat = who(a.by);
        if (!canReact(s, seat).challenge) return s;
        const p = s.pending!;
        if (s.phase === 'claim') {
          const r = judge(s, p.actor, seat, claimRole[p.kind]!);
          // Minh oan thì việc tấu thi hành ngay; nói dối thì hủy. Người tấu bị cách chức thì cũng hủy.
          if (r.truthful && !r.s.out[p.actor]) return perform({ ...r.s, phase: 'claim' }, c);
          return endTurn(r.s);
        }
        const blocker = s.blocker!;
        const r = judge(s, blocker, seat, blockRule[p.kind]!.role);
        if (r.truthful) return endTurn(addLog(r.s, { k: 'blocked', seat: blocker, role: blockRule[p.kind]!.role }));
        // Lời can là dối: việc tấu vẫn được thi hành (nếu người tấu còn ở triều).
        if (r.s.out[p.actor]) return endTurn(r.s);
        return perform(r.s, c);
      }
      case 'block': {
        const seat = who(a.by);
        if (s.phase !== 'claim' || !canReact(s, seat).block) return s;
        return openWindow(s, 'block', c, seat);
      }
      case 'pass': {
        const seat = who(a.by);
        const r = canReact(s, seat);
        if (!r.challenge && !r.block) return s;
        const next = { ...s, passed: set(s.passed, seat, true) };
        if (allPassed(next)) return settle(next, c);
        return bump(next, {});
      }
      case 'proceed': {
        if (!c.host || (s.phase !== 'claim' && s.phase !== 'block')) return s;
        return settle(s, c);
      }
      case 'timeout': {
        if (!s.deadline || nowOf(c) < s.deadline) return s;
        if (s.phase === 'choose') return trieuGame.reduce(s, { type: 'choose', pay: true }, { ...c, from: s.seats[s.pending!.target!] });
        if (s.phase !== 'claim' && s.phase !== 'block') return s;
        return settle(s, c);
      }
      case 'choose': {
        if (s.phase !== 'choose' || !s.pending) return s;
        const t = s.pending.target!;
        if (fromSeat !== t) return s;
        if (a.pay && s.silver[t] >= 2) {
          const a2 = s.pending.actor;
          const silver = s.silver.map((v, i) => (i === t ? v - 2 : i === a2 ? v + 2 : v));
          return endTurn(addLog({ ...s, silver }, { k: 'pay', seat: t, to: a2 }));
        }
        return endTurn(giveCrime(s, t));
      }
    }
    return s;
  },
};
