import { baseState, isTurnOf, nextTurn, playerAt, randomInt, shuffle, withResult, type BaseState, type GameDef, type Party, type Player } from '@bang/party';
import { strings, type Order, type Play } from './strings';

/** Lựa chọn nhanh; ngoài ra nhập được số bất kỳ trong khoảng LIMITS. */
export const SIZES = [30, 50, 100] as const;
export const SECONDS = [30, 60, 90, 120] as const;
/** Thời gian mỗi lượt khi chơi lần lượt. */
export const TURN_SECONDS = [5, 10, 15, 30] as const;
export const LIMITS = { size: { min: 10, max: 200 }, seconds: { min: 10, max: 600 }, turnSeconds: { min: 3, max: 120 } } as const;

const inRange = (v: unknown, r: { min: number; max: number }): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= r.min && v <= r.max;
/** Đếm 3-2-1 trước khi hiện bàn số, để máy nào cũng xuất phát cùng lúc. */
export const COUNTDOWN_MS = 3000;
/** Số màu chữ của các con số (xem TINTS trong index.tsx). */
export const TINT_COUNT = 7;

export interface Dot {
  n: number;
  /** Tâm con số, tính theo % chiều rộng / cao của bàn. */
  x: number;
  y: number;
  rot: number;
  tint: number;
  /** Hệ số cỡ chữ, quanh 1. */
  size: number;
}

export interface Round {
  id: number;
  /** Thứ tự các số phải tìm. */
  targets: number[];
  /** Số đã tìm -> người tìm được. */
  found: Record<number, string>;
  /** Chỉ số trong targets của số đang cần tìm. */
  at: number;
  /** Mỗi lần đồng hồ chạy lại (vòng mới, hoặc lượt mới khi chơi lần lượt) có id riêng. */
  attempt: number;
  /** Chơi lần lượt: find đang tìm; spin hết giờ, chờ quay vòng phạt. */
  phase: 'find' | 'spin';
  spin: Spin | null;
}

export type FindParty = Party<FindState, FindAction>;

export interface Spin {
  id: number;
  slice: number;
  turns: number;
  offset: number;
}

export interface FindState extends BaseState {
  order: Order;
  size: number;
  seconds: number;
  /** Thời gian mỗi lượt (chơi lần lượt). */
  turnSeconds: number;
  /** Chơi lần lượt: hết giờ thì quay vòng phạt; tắt thì chỉ mất lượt. */
  penalty: boolean;
  play: Play;
  round: Round | null;
  /** Tổng số tìm được qua các vòng. */
  scores: Record<string, number>;
  /** Số vòng thắng. */
  wins: Record<string, number>;
  /** Bàn số của vòng sắp chơi / đang chơi; xem trước được ở màn chờ. */
  dots: Dot[];
  /** Tăng mỗi lần viết lại bàn số, để máy nào cũng chạy hiệu ứng bôi rồi viết lại. */
  shuffles: number;
}

export type Config = Partial<Pick<FindState, 'order' | 'size' | 'seconds' | 'turnSeconds' | 'penalty' | 'play'>>;

export type FindAction =
  | { type: 'config'; config: Config }
  | { type: 'start' }
  | { type: 'find'; round: number; n: number }
  | { type: 'timeout'; attempt: number }
  | { type: 'spin' }
  | { type: 'shuffle' };

/** Lưới cho mỗi cỡ bàn: đủ ô cho mọi số, mỗi số lệch ngẫu nhiên trong ô của nó nên không đè nhau. */
export function gridOf(size: number) {
  // Bàn dọc 3:5; 50 số ra lưới 5x10, 100 số ra 7x15.
  const cols = Math.max(2, Math.round(Math.sqrt(size * 0.5)));
  return { cols, rows: Math.ceil(size / cols) };
}

function layout(size: number): Dot[] {
  const { cols, rows } = gridOf(size);
  const cells = shuffle(Array.from({ length: cols * rows }, (_, i) => i)).slice(0, size);
  return cells.map((cell, i) => {
    const col = cell % cols;
    const row = Math.floor(cell / cols);
    const jitter = (spread: number) => (Math.random() * 2 - 1) * spread;
    return {
      n: i + 1,
      x: Math.round(((col + 0.5 + jitter(0.18)) / cols) * 1000) / 10,
      y: Math.round(((row + 0.5 + jitter(0.12)) / rows) * 1000) / 10,
      rot: randomInt(-22, 22),
      tint: randomInt(0, TINT_COUNT - 1),
      size: randomInt(88, 116) / 100,
    };
  });
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

export const targetOf = (r: Round): number | undefined => r.targets[r.at];

/** Số tìm được của từng người trong vòng. */
export function countsOf(r: Round) {
  const counts: Record<string, number> = {};
  for (const id of Object.values(r.found)) counts[id] = (counts[id] ?? 0) + 1;
  return counts;
}

/** Người tìm nhiều nhất trong vòng và người ít nhất (ít hơn người nhất). */
function standings(round: Round, players: Player[]) {
  const counts = countsOf(round);
  const rows = players.map((p) => ({ p, n: counts[p.id] ?? 0 }));
  const top = Math.max(0, ...rows.map((r) => r.n));
  const low = Math.min(...rows.map((r) => r.n));
  const names = (list: typeof rows) => list.map((r) => r.p.name).join(', ');
  const winners = rows.filter((r) => r.n === top);
  const losers = rows.filter((r) => r.n === low && r.n < top);
  return { top, low, winners, losers, names };
}

/** Chơi cùng lúc hết giờ hoặc hết số: cộng điểm và viết thẻ kết quả. */
function finishRace(s: FindState, round: Round, players: Player[], who: string): FindState {
  const counts = countsOf(round);
  const scores = { ...s.scores };
  for (const [id, n] of Object.entries(counts)) scores[id] = (scores[id] ?? 0) + n;
  const base = { ...s, round, scores };
  const { top, low, winners, losers, names } = standings(round, players);
  if (top === 0) return withResult(base, { playerId: players[0]?.id ?? who, text: strings.nobody });
  const wins = { ...s.wins };
  for (const w of winners) wins[w.p.id] = (wins[w.p.id] ?? 0) + 1;
  const detail = losers.length ? strings.raceLoser(names(losers), low) : undefined;
  return withResult(
    { ...base, wins },
    winners.length > 1
      ? { playerId: winners[0].p.id, text: strings.raceTie(names(winners), top), detail, safe: true }
      : { playerId: winners[0].p.id, text: strings.raceWin(top), detail, safe: true },
  );
}

/** Chơi lần lượt, vừa tìm được số cuối: ghi người thắng vào phần chi tiết. */
function boardDoneDetail(round: Round, players: Player[]) {
  const { top, winners, names } = standings(round, players);
  return winners.length > 1 ? strings.turnsTie(names(winners), top) : strings.turnsWin(names(winners), top);
}

export const isBoardDone = (r: Round) => r.at >= r.targets.length;

export const findGame: GameDef<FindState, FindAction> = {
  id: 'tim-so',
  init: () => ({
    ...baseState(),
    order: 'up',
    size: 50,
    seconds: 60,
    turnSeconds: 10,
    penalty: true,
    play: 'race',
    round: null,
    scores: {},
    wins: {},
    dots: layout(50),
    shuffles: 1,
  }),
  configOf: ({ order, size, seconds, turnSeconds, penalty, play }) => ({ order, size, seconds, turnSeconds, penalty, play }),
  advance(s) {
    // Chơi cùng lúc thì không có lượt riêng: giữ nguyên lượt, chỉ dọn vòng cũ.
    // Hết vòng thì viết sẵn bàn số mới cho vòng sau.
    const fresh = { dots: layout(s.size), shuffles: s.shuffles + 1, round: null };
    if (s.play === 'race') return { ...s, seq: s.seq + 1, result: null, ...fresh };
    const next = nextTurn(s);
    if (!s.round || isBoardDone(s.round)) return { ...next, ...fresh };
    // Sang người kế, cùng bàn số, số cần tìm giữ nguyên nếu người trước không tìm được.
    return { ...next, round: { ...s.round, attempt: next.seq, phase: 'find', spin: null } };
  },
  reduce(s, a, c) {
    if (a.type === 'config') {
      if (!c.host || s.round) return s;
      const { order, size, seconds, turnSeconds, penalty, play } = a.config;
      const next = { ...s };
      if (order && order in strings.orders) next.order = order;
      if (inRange(size, LIMITS.size)) next.size = size;
      if (inRange(seconds, LIMITS.seconds)) next.seconds = seconds;
      if (inRange(turnSeconds, LIMITS.turnSeconds)) next.turnSeconds = turnSeconds;
      if (typeof penalty === 'boolean') next.penalty = penalty;
      if (play && play in strings.plays) next.play = play;
      if (next.size !== s.size) Object.assign(next, { dots: layout(next.size), shuffles: s.shuffles + 1 });
      return { ...next, seq: s.seq + 1 };
    }

    if (a.type === 'shuffle') {
      // Ai trong phòng cũng xáo được, nhưng chỉ khi chưa vào vòng.
      if (s.round || s.result || !c.players.some((p) => p.id === c.from)) return s;
      return { ...s, dots: layout(s.size), shuffles: s.shuffles + 1, seq: s.seq + 1 };
    }

    if (a.type === 'start') {
      if (s.round || s.result) return s;
      if (s.play === 'turns' ? !isTurnOf(s, c) : !c.host) return s;
      const targets = s.order === 'up' ? range(s.size) : shuffle(range(s.size));
      const id = s.seq + 1;
      return { ...s, seq: id, round: { id, targets, found: {}, at: 0, attempt: id, phase: 'find', spin: null } };
    }

    const round = s.round;
    if (!round || s.result) return s;
    const who = playerAt(c.players, s.turn)?.id ?? c.from;

    if (a.type === 'find') {
      if (round.id !== a.round || round.phase !== 'find' || a.n !== targetOf(round)) return s;
      if (!c.players.some((p) => p.id === c.from)) return s;
      const next: Round = { ...round, found: { ...round.found, [a.n]: c.from }, at: round.at + 1 };
      if (s.play === 'race') {
        // Hai người chạm cùng lúc: người tới máy chủ phòng trước được, người sau bị bỏ qua vì số đã đổi.
        if (isBoardDone(next)) return finishRace(s, next, c.players, who);
        return { ...s, round: next, seq: s.seq + 1 };
      }
      // Lần lượt: tìm được thì +1 điểm, rồi sang người kế.
      if (!isTurnOf(s, c)) return s;
      const scores = { ...s.scores, [who]: (s.scores[who] ?? 0) + 1 };
      const done = isBoardDone(next);
      const wins = { ...s.wins };
      if (done) for (const w of standings(next, c.players).winners) wins[w.p.id] = (wins[w.p.id] ?? 0) + 1;
      return withResult(
        { ...s, round: next, scores, wins },
        { playerId: who, text: strings.turnFound(a.n), detail: done ? boardDoneDetail(next, c.players) : undefined, safe: true },
      );
    }

    if (a.type === 'timeout') {
      // Hết giờ: chỉ máy giữ luật (chủ phòng) được báo.
      if (!c.host || a.attempt !== round.attempt || round.phase !== 'find') return s;
      if (s.play === 'race') return finishRace(s, round, c.players, who);
      if (s.penalty) return { ...s, round: { ...round, phase: 'spin' }, seq: s.seq + 1 };
      return withResult(s, { playerId: who, text: strings.turnMissed, detail: strings.turnMissedDetail, safe: true });
    }

    // Quay vòng phạt sau khi hết giờ.
    if (s.play !== 'turns' || round.phase !== 'spin' || !isTurnOf(s, c)) return s;
    const spin: Spin = {
      id: (round.spin?.id ?? 0) + 1,
      slice: randomInt(0, strings.penalties.length - 1),
      turns: randomInt(4, 6),
      offset: randomInt(-18, 18),
    };
    const p = strings.penalties[spin.slice];
    return withResult({ ...s, round: { ...round, spin } }, { playerId: who, text: p.text, detail: strings.turnMissed, safe: 'safe' in p && p.safe });
  },
};
