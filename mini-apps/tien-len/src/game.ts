import { baseState, shuffle, type BaseState, type GameDef, type Party, type Player } from '@bang/party';
import { TWO, fullDeck, isCard, rankOf, sortCards, type Card } from './cards';
import { beats, classify, type Combo } from './combos';

export type Toggle = 'on' | 'off';
/** Kiểu tới trắng: tứ quý heo, 6 đôi, sảnh rồng. */
export type InstantKind = 'quad2' | 'sixPairs' | 'dragon';

export const MAX_SEATS = 4;
export const HAND_SIZE = 13;

export interface Tableplay {
  seat: number;
  combo: Combo;
}

export interface TLState extends BaseState {
  /** id người ngồi từng ghế (tối đa 4, lấy theo thứ tự trong phòng). Ghế i trùng chỉ số i trong danh sách người chơi. */
  seats: string[];
  hands: Card[][];
  /** Bộ đang nằm trên bàn phải chặn; null: người tới lượt được đi tự do. */
  table: Tableplay | null;
  /** Ai đã bỏ lượt trong vòng này (mất quyền chặn tới hết vòng). */
  passed: boolean[];
  /** Các ghế đã hết bài, theo thứ tự về nhất, nhì, ba, bét. */
  finished: number[];
  /** Ván đầu: lá nhỏ nhất (3♠ khi đủ 4 người) bắt buộc phải có trong nước đầu tiên. */
  mustPlay: Card | null;
  done: boolean;
  /** Ván kết thúc do tới trắng. */
  instant: { seat: number; kind: InstantKind } | null;
  /** Điểm cộng dồn qua các ván, theo id. */
  scores: Record<string, number>;
  /** Số ván đã chia (bắt đầu từ 1). */
  round: number;
  /** Đếm số nước đã đi trong ván (đánh hoặc bỏ lượt), để màn che chuyền máy biết khi nào đổi người. */
  moves: number;
  /** Người về nhất ván trước, đi trước ván sau. */
  lastWinner: string | null;
  toiTrang: Toggle;
}

export type Config = Partial<Pick<TLState, 'toiTrang'>>;

export type TLAction =
  | { type: 'play'; cards: Card[] }
  | { type: 'pass' }
  | { type: 'restart' }
  | { type: 'config'; config: Config };

export type TLParty = Party<TLState, TLAction>;

/** Điểm theo hạng: nhất được (số người − 1), bét 0. */
export const placePoints = (place: number, players: number) => Math.max(0, players - 1 - place);

export function instantWin(hand: readonly Card[]): InstantKind | null {
  const count = new Map<number, number>();
  for (const c of hand) count.set(rankOf(c), (count.get(rankOf(c)) ?? 0) + 1);
  if ((count.get(TWO) ?? 0) === 4) return 'quad2';
  let pairs = 0;
  for (const n of count.values()) pairs += Math.floor(n / 2);
  if (pairs >= 6) return 'sixPairs';
  let dragon = true;
  for (let r = 0; r < TWO; r++) if (!count.has(r)) dragon = false;
  return dragon ? 'dragon' : null;
}

function deal(n: number): Card[][] {
  const deck = shuffle(fullDeck());
  return Array.from({ length: n }, (_, i) => sortCards(deck.slice(i * HAND_SIZE, (i + 1) * HAND_SIZE)));
}

function score(s: TLState, finished: number[]): Record<string, number> {
  const scores = { ...s.scores };
  finished.forEach((seat, place) => {
    const id = s.seats[seat];
    scores[id] = (scores[id] ?? 0) + placePoints(place, s.seats.length);
  });
  return scores;
}

interface DealOpts {
  toiTrang?: Toggle;
  scores?: Record<string, number>;
  round?: number;
  lastWinner?: string | null;
  hands?: Card[][];
}

/** Chia ván mới. Có thể truyền sẵn bài (cho test). */
export function newRound(players: Player[], o: DealOpts = {}): TLState {
  const seats = players.slice(0, MAX_SEATS).map((p) => p.id);
  const n = seats.length;
  const hands = (o.hands ?? deal(n)).map(sortCards);
  const round = o.round ?? 1;
  const toiTrang = o.toiTrang ?? 'on';
  const scores = { ...(o.scores ?? {}) };
  for (const id of seats) scores[id] ??= 0;

  // Ván đầu (hoặc người thắng đã rời bàn): người cầm lá nhỏ nhất đi trước và phải đánh kèm lá đó.
  const winnerSeat = o.lastWinner ? seats.indexOf(o.lastWinner) : -1;
  let leader = winnerSeat;
  let mustPlay: Card | null = null;
  if (leader < 0 && n) {
    mustPlay = Math.min(...hands.flat());
    leader = Math.max(0, hands.findIndex((h) => h.includes(mustPlay!)));
  }

  const s: TLState = {
    ...baseState(),
    turn: Math.max(0, leader),
    seats,
    hands,
    table: null,
    passed: seats.map(() => false),
    finished: [],
    mustPlay,
    done: false,
    instant: null,
    scores,
    round,
    moves: 0,
    lastWinner: o.lastWinner ?? null,
    toiTrang,
  };

  if (toiTrang === 'on') {
    // Xét từ người đi trước theo vòng.
    for (let i = 0; i < n; i++) {
      const seat = (s.turn + i) % n;
      const kind = instantWin(hands[seat]);
      if (!kind) continue;
      const others = seats.map((_, k) => k).filter((k) => k !== seat);
      const scoresAfter = { ...scores, [seats[seat]]: scores[seats[seat]] + placePoints(0, n) };
      return { ...s, done: true, instant: { seat, kind }, finished: [seat, ...others], scores: scoresAfter, lastWinner: seats[seat] };
    }
  }
  return s;
}

/** Bắt đầu vòng mới: dọn bàn, ai cũng được đánh lại. */
const openRound = (s: TLState, leader: number): TLState => ({ ...s, table: null, passed: s.passed.map(() => false), turn: leader });

function nextUnfinished(s: TLState, from: number): number {
  const n = s.seats.length;
  for (let i = 1; i <= n; i++) {
    const k = (from + i) % n;
    if (!s.finished.includes(k)) return k;
  }
  return from;
}

/**
 * Sau khi ghế `from` đánh hoặc bỏ lượt: tìm người kế tiếp còn quyền chặn.
 * Vòng quay lại tới chủ bộ trên bàn (mọi người khác đã bỏ) thì người đó đi tự do;
 * chủ bộ đã hết bài thì người kế tiếp chưa hết bài được đi tự do.
 */
function moveOn(s: TLState, from: number): TLState {
  const n = s.seats.length;
  const owner = s.table!.seat;
  for (let i = 1; i <= n; i++) {
    const k = (from + i) % n;
    if (k === owner) {
      if (!s.finished.includes(k)) return openRound(s, k);
      continue;
    }
    if (s.finished.includes(k) || s.passed[k]) continue;
    return { ...s, turn: k };
  }
  return openRound(s, nextUnfinished(s, owner));
}

/** Kiểm tra một nước đánh, trả lỗi (mã) hoặc null nếu hợp lệ. */
export function playError(s: Pick<TLState, 'mustPlay' | 'table'>, cards: readonly Card[]): 'combo' | 'must' | 'weak' | null {
  const combo = classify(cards);
  if (!combo) return 'combo';
  if (s.mustPlay !== null && !cards.includes(s.mustPlay)) return 'must';
  if (s.table && !beats(combo, s.table.combo)) return 'weak';
  return null;
}

export const seatOf = (s: Pick<TLState, 'seats'>, id: string) => s.seats.indexOf(id);

export const tienLenGame: GameDef<TLState, TLAction> = {
  id: 'tien-len',
  init: (players) => newRound(players),
  configOf: (s) => ({ toiTrang: s.toiTrang }),
  // Chủ phòng bỏ lượt người mất kết nối: được bỏ thì bỏ, đang đi tự do thì đánh lá nhỏ nhất.
  advance(s, c) {
    if (s.done || !c) return s;
    const from = s.seats[s.turn];
    if (s.table) return tienLenGame.reduce(s, { type: 'pass' }, { ...c, from });
    const low = s.mustPlay ?? s.hands[s.turn][0];
    return tienLenGame.reduce(s, { type: 'play', cards: [low] }, { ...c, from });
  },
  reduce(s, a, c) {
    if (a.type === 'config') {
      if (!c.host || s.moves > 0) return s;
      const toiTrang: Toggle = a.config.toiTrang === 'off' ? 'off' : 'on';
      return { ...newRound(c.players, { toiTrang, scores: s.scores, round: s.round, lastWinner: s.lastWinner }), seq: s.seq + 1 };
    }
    if (a.type === 'restart') {
      if (!c.host || !s.done) return s;
      return { ...newRound(c.players, { toiTrang: s.toiTrang, scores: s.scores, round: s.round + 1, lastWinner: s.lastWinner }), seq: s.seq + 1 };
    }
    const seat = seatOf(s, c.from);
    if (s.done || seat < 0 || seat !== s.turn) return s;

    if (a.type === 'pass') {
      // Đang đi tự do thì không được bỏ.
      if (!s.table) return s;
      const passed = s.passed.slice();
      passed[seat] = true;
      return { ...moveOn({ ...s, passed }, seat), moves: s.moves + 1, seq: s.seq + 1 };
    }

    if (a.type === 'play') {
      if (!Array.isArray(a.cards) || !a.cards.every(isCard)) return s;
      const hand = s.hands[seat];
      if (new Set(a.cards).size !== a.cards.length || !a.cards.every((x) => hand.includes(x))) return s;
      if (playError(s, a.cards)) return s;
      const combo = classify(a.cards)!;
      const hands = s.hands.slice();
      hands[seat] = hand.filter((x) => !a.cards.includes(x));
      let next: TLState = { ...s, hands, table: { seat, combo }, mustPlay: null, moves: s.moves + 1, seq: s.seq + 1 };
      if (!hands[seat].length) {
        const finished = [...s.finished, seat];
        const left = s.seats.map((_, k) => k).filter((k) => !finished.includes(k));
        if (left.length <= 1) {
          const all = [...finished, ...left];
          return {
            ...next,
            finished: all,
            done: true,
            scores: score(s, all),
            lastWinner: s.seats[all[0]],
          };
        }
        next = { ...next, finished };
      }
      return moveOn(next, seat);
    }
    return s;
  },
};
