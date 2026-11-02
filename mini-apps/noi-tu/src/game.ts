import { baseState, type BaseState, type GameDef, type Party, type Player, type ReduceContext } from '@bang/party';
import type { CheckMode, Seconds } from './strings';

export const MAX_SEATS = 6;
export const HINTS = 3;
/** Từ bị bác thì người nói được trả lại thời gian còn lại, ít nhất chừng này. */
const MIN_RETRY_MS = 5000;

export interface Link {
  word: string;
  seat: number;
}

export interface Vote {
  word: string;
  seat: number;
  /** id những người được bỏ phiếu (còn trong cuộc, trừ người nói). */
  voters: string[];
  votes: Record<string, boolean>;
  /** Thời gian còn lại của người nói lúc mở phiếu. */
  remaining: number;
}

export type GameEvent =
  | { n: number; kind: 'accepted' | 'rejected'; seat: number; word: string }
  | { n: number; kind: 'out'; seat: number };

export interface NoiTuState extends BaseState {
  seats: string[];
  alive: boolean[];
  chain: Link[];
  /** Giờ phòng (ms) hết lượt hiện tại; 0 là chưa bắt đầu tính giờ. */
  deadline: number;
  hints: Record<string, number>;
  hint: { seat: number; word: string; n: number } | null;
  vote: Vote | null;
  event: GameEvent | null;
  winner: number | null;
  done: boolean;
  wins: Record<string, number>;
  seconds: Seconds;
  check: CheckMode;
}

export type Config = Partial<Pick<NoiTuState, 'seconds' | 'check'>>;

export type NoiTuAction =
  | { type: 'say'; word: string }
  | { type: 'vote'; accept: boolean }
  | { type: 'timeout' }
  | { type: 'hint' }
  | { type: 'restart' }
  | { type: 'config'; config: Config };

export type NoiTuParty = Party<NoiTuState, NoiTuAction>;

// ---------- Chuẩn hóa chữ ----------

/** Dấu đặt kiểu mới (hoà, thuỷ) đổi về kiểu cũ (hòa, thủy) để so sánh hai cách gõ như nhau. */
const TONE_MOVE: [RegExp, string][] = [
  [/oà$/, 'òa'], [/oá$/, 'óa'], [/oả$/, 'ỏa'], [/oã$/, 'õa'], [/oạ$/, 'ọa'],
  [/oè$/, 'òe'], [/oé$/, 'óe'], [/oẻ$/, 'ỏe'], [/oẽ$/, 'õe'], [/oẹ$/, 'ọe'],
  [/([^q])uỳ$/, '$1ùy'], [/([^q])uý$/, '$1úy'], [/([^q])uỷ$/, '$1ủy'], [/([^q])uỹ$/, '$1ũy'], [/([^q])uỵ$/, '$1ụy'],
  [/^uỳ$/, 'ùy'], [/^uý$/, 'úy'], [/^uỷ$/, 'ủy'],
];

export function canonSyllable(s: string): string {
  let out = s;
  for (const [re, to] of TONE_MOVE) out = out.replace(re, to);
  return out;
}

/** Tách từ thành các tiếng đã chuẩn hóa: NFC, chữ thường, bỏ khoảng trắng thừa, thống nhất chỗ đặt dấu. */
export function syllables(word: string): string[] {
  return word
    .normalize('NFC')
    .toLocaleLowerCase('vi')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(canonSyllable);
}

export const canon = (word: string) => syllables(word).join(' ');
const LETTERS = /^\p{L}+$/u;

// ---------- Từ điển (nạp lazy từ words.ts) ----------

interface Dict {
  set: Set<string>;
  byFirst: Map<string, string[]>;
}
let dict: Dict | null = null;

export function loadDictionary(words: readonly string[]) {
  const set = new Set<string>();
  const byFirst = new Map<string, string[]>();
  for (const w of words) {
    const syl = syllables(w);
    if (syl.length !== 2) continue;
    const c = syl.join(' ');
    if (set.has(c)) continue;
    set.add(c);
    const list = byFirst.get(syl[0]);
    if (list) list.push(c);
    else byFirst.set(syl[0], [c]);
  }
  dict = { set, byFirst };
}

export const dictionaryReady = () => dict !== null;
export const inDictionary = (word: string) => dict?.set.has(canon(word)) ?? false;

// ---------- Luật ----------

export type CheckResult = { ok: true; word: string; known: boolean } | { ok: false; reason: 'syllables' | 'link' | 'used' | 'unknown' };

export const lastSyllable = (s: Pick<NoiTuState, 'chain'>) => {
  const last = s.chain[s.chain.length - 1];
  return last ? last.word.split(' ')[1] : null;
};

/** Kiểm tra một từ có nối được không (dùng chung cho reducer và ô nhập để báo lỗi ngay). */
export function checkWord(s: Pick<NoiTuState, 'chain' | 'check'>, raw: string): CheckResult {
  const syl = syllables(raw);
  if (syl.length !== 2 || !syl.every((x) => LETTERS.test(x))) return { ok: false, reason: 'syllables' };
  const word = syl.join(' ');
  const need = lastSyllable(s);
  if (need !== null && syl[0] !== need) return { ok: false, reason: 'link' };
  if (s.chain.some((l) => l.word === word)) return { ok: false, reason: 'used' };
  const known = inDictionary(word);
  if (!known && s.check === 'dict') return { ok: false, reason: 'unknown' };
  return { ok: true, word, known };
}

/** Ghế còn trong cuộc kế tiếp sau `seat`. */
export function nextAlive(alive: readonly boolean[], seat: number): number {
  for (let k = 1; k <= alive.length; k++) {
    const i = (seat + k) % alive.length;
    if (alive[i]) return i;
  }
  return seat;
}

const ms = (s: Pick<NoiTuState, 'seconds'>) => Number(s.seconds) * 1000;
const clock = (c: ReduceContext) => c.now ?? Date.now();

function fresh(players: Player[], seconds: Seconds = '15', check: CheckMode = 'vote', wins: Record<string, number> = {}, now = 0, first = 0): NoiTuState {
  const seats = players.slice(0, MAX_SEATS).map((p) => p.id);
  const turn = seats.length ? first % seats.length : 0;
  return {
    ...baseState(),
    turn,
    seats,
    alive: seats.map(() => true),
    chain: [],
    deadline: now ? now + Number(seconds) * 1000 : 0,
    hints: Object.fromEntries(seats.map((id) => [id, HINTS])),
    hint: null,
    vote: null,
    event: null,
    winner: null,
    done: false,
    wins,
    seconds,
    check,
  };
}

const nextEvent = (s: NoiTuState) => (s.event?.n ?? 0) + 1;

/** Nhận từ vào chuỗi, chuyển lượt cho người kế. */
function accept(s: NoiTuState, seat: number, word: string, now: number, fromVote: boolean): NoiTuState {
  const turn = nextAlive(s.alive, seat);
  return {
    ...s,
    chain: [...s.chain, { word, seat }],
    vote: null,
    hint: null,
    turn,
    deadline: now + ms(s),
    event: fromVote ? { n: nextEvent(s), kind: 'accepted', seat, word } : s.event,
    seq: s.seq + 1,
  };
}

/** Loại người đang tới lượt (hết giờ, hoặc chủ phòng bỏ lượt người mất kết nối). */
function eliminate(s: NoiTuState, now: number): NoiTuState {
  const seat = s.turn;
  const alive = s.alive.map((a, i) => (i === seat ? false : a));
  const left = alive.flatMap((a, i) => (a ? [i] : []));
  const event: GameEvent = { n: nextEvent(s), kind: 'out', seat };
  if (left.length <= 1) {
    const winner = left[0] ?? null;
    const wins = winner === null ? s.wins : { ...s.wins, [s.seats[winner]]: (s.wins[s.seats[winner]] ?? 0) + 1 };
    return { ...s, alive, event, winner, done: true, wins, hint: null, deadline: 0, seq: s.seq + 1 };
  }
  return { ...s, alive, event, turn: nextAlive(alive, seat), hint: null, deadline: now + ms(s), seq: s.seq + 1 };
}

/** Ghi một phiếu; đủ để quyết thì chốt. Hòa phiếu thì chấp nhận. */
function castVote(s: NoiTuState, voter: string, yes: boolean, now: number): NoiTuState {
  const v = s.vote!;
  const votes = { ...v.votes, [voter]: yes };
  const total = v.voters.length;
  const ayes = Object.values(votes).filter(Boolean).length;
  const nays = Object.values(votes).length - ayes;
  if (ayes * 2 >= total) return accept(s, v.seat, v.word, now, true);
  if (nays * 2 > total) {
    return {
      ...s,
      vote: null,
      turn: v.seat,
      deadline: now + Math.max(v.remaining, MIN_RETRY_MS),
      event: { n: nextEvent(s), kind: 'rejected', seat: v.seat, word: v.word },
      seq: s.seq + 1,
    };
  }
  // Chưa quyết: chuyển "lượt" sang người chưa bỏ phiếu, để chơi 1 máy chuyền máy lần lượt.
  const nextVoter = v.voters.find((id) => !(id in votes));
  const turn = nextVoter ? s.seats.indexOf(nextVoter) : s.turn;
  return { ...s, vote: { ...v, votes }, turn, seq: s.seq + 1 };
}

/** Các từ trong từ điển nối được vào chuỗi hiện tại (chưa dùng). */
export function candidates(s: Pick<NoiTuState, 'chain'>): string[] {
  if (!dict) return [];
  const need = lastSyllable(s);
  const used = new Set(s.chain.map((l) => l.word));
  const pool = need === null ? [...dict.set] : (dict.byFirst.get(need) ?? []);
  return pool.filter((w) => !used.has(w));
}

export const noiTuGame: GameDef<NoiTuState, NoiTuAction> = {
  id: 'noi-tu',
  init: (players) => fresh(players),
  configOf: (s) => ({ seconds: s.seconds, check: s.check }),
  advance: (s, c) => {
    // Chủ phòng bỏ lượt người mất kết nối: đang bỏ phiếu thì tính là "được", không thì loại như hết giờ.
    if (s.done) return s;
    const now = c ? clock(c) : Date.now();
    if (s.vote) {
      const id = s.seats[s.turn];
      return s.vote.voters.includes(id) && !(id in s.vote.votes) ? castVote(s, id, true, now) : s;
    }
    return eliminate(s, now);
  },
  reduce(s, a, c) {
    const now = clock(c);
    if (a.type === 'config') {
      if (!c.host || s.chain.length) return s;
      const seconds: Seconds = a.config.seconds === '10' || a.config.seconds === '20' ? a.config.seconds : '15';
      const check: CheckMode = a.config.check === 'dict' ? 'dict' : 'vote';
      return { ...fresh(c.players, seconds, check, s.wins, now), seq: s.seq + 1 };
    }
    if (a.type === 'restart') {
      if (!c.host || !s.done) return s;
      // Ván sau người thắng ván trước mở màn.
      return { ...fresh(c.players, s.seconds, s.check, s.wins, now, s.winner ?? 0), seq: s.seq + 1 };
    }
    if (s.done) return s;
    const seat = s.seats.indexOf(c.from);

    if (a.type === 'vote') {
      const v = s.vote;
      if (!v || !v.voters.includes(c.from) || c.from in v.votes || typeof a.accept !== 'boolean') return s;
      return castVote(s, c.from, a.accept, now);
    }
    if (a.type === 'timeout') {
      if (s.vote || !s.deadline || now < s.deadline) return s;
      return eliminate(s, now);
    }
    if (seat < 0 || seat !== s.turn || !s.alive[seat] || s.vote) return s;

    if (a.type === 'hint') {
      const id = s.seats[seat];
      if ((s.hints[id] ?? 0) <= 0) return s;
      const list = candidates(s);
      const word = list.length ? list[Math.floor(Math.random() * list.length)] : '';
      const hints = word ? { ...s.hints, [id]: s.hints[id] - 1 } : s.hints;
      return { ...s, hints, hint: { seat, word, n: (s.hint?.n ?? 0) + 1 }, seq: s.seq + 1 };
    }
    if (a.type === 'say') {
      if (typeof a.word !== 'string' || a.word.length > 40) return s;
      if (s.deadline && now > s.deadline) return s;
      const r = checkWord(s, a.word);
      if (!r.ok) return s;
      if (r.known) return accept(s, seat, r.word, now, false);
      // Từ lạ: cả phòng bỏ phiếu, đồng hồ dừng.
      const voters = s.seats.filter((_, i) => i !== seat && s.alive[i]);
      const remaining = s.deadline ? Math.max(0, s.deadline - now) : ms(s);
      return { ...s, vote: { word: r.word, seat, voters, votes: {}, remaining }, turn: s.seats.indexOf(voters[0]), hint: null, seq: s.seq + 1 };
    }
    return s;
  },
};
