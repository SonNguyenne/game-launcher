import { baseState, shuffle, type BaseState, type GameDef, type Party, type Player, type ReduceContext } from '@bang/party';
import { fullDeck, isCard, rankOf, sortCards, type Card } from './cards';

export const MAX_SEATS = 4;
export const MAX_PLAY = 4;

/** sequence: khai lần lượt A, 2, 3... K rồi quay lại; free: người đánh tự chọn hạng để khai. */
export type ClaimMode = 'sequence' | 'free';
/** Số giây được lật tẩy sau mỗi lần khai. */
export type WindowSec = '3' | '5' | '8' | '15';

export interface Claim {
  seat: number;
  rank: number;
  /** Các lá thật đã úp xuống (chỉ lộ khi bị lật tẩy). */
  cards: Card[];
}

export interface Reveal {
  claimer: number;
  caller: number;
  rank: number;
  cards: Card[];
  lie: boolean;
  /** Ghế phải ôm cả chồng. */
  taker: number;
  /** Số lá đã ôm. */
  taken: number;
}

export interface BipState extends BaseState {
  /** id người ngồi từng ghế (tối đa 4). Ghế i trùng chỉ số i trong danh sách người chơi. */
  seats: string[];
  hands: Card[][];
  /** Chồng bài úp giữa bàn. */
  pile: Card[];
  /** play: người tới lượt úp bài; window: đang chờ lật tẩy; done: có người thắng. */
  phase: 'play' | 'window' | 'done';
  claim: Claim | null;
  /** Hết hạn lật tẩy (giờ chung của phòng, ms). */
  deadline: number;
  /** Những ghế đã bấm "tin". */
  believers: number[];
  /** Hạng phải khai ở lượt tới (chế độ lần lượt). */
  rank: number;
  /** Lần lật tẩy gần nhất, để cả bàn xem bài lật. */
  reveal: Reveal | null;
  winner: number | null;
  wins: Record<string, number>;
  /** Đếm số nước, để màn che chuyền máy biết khi nào đổi người. */
  moves: number;
  mode: ClaimMode;
  windowSec: WindowSec;
}

export type Config = Partial<Pick<BipState, 'mode' | 'windowSec'>>;

/**
 * `as`: chỉ dùng khi chơi 1 máy, ai cũng bấm trên cùng một máy nên phải nói rõ ai lật tẩy / ai tin.
 * Chơi phòng thì bỏ qua, luôn tính theo người gửi.
 */
export type BipAction =
  | { type: 'play'; cards: Card[]; rank?: number }
  | { type: 'call'; as?: string }
  | { type: 'believe'; as?: string }
  | { type: 'resolve' }
  | { type: 'restart' }
  | { type: 'config'; config: Config };

export type BipParty = Party<BipState, BipAction>;

/**
 * Chơi 1 máy: launcher đặt id người chơi là p0, p1...; id trong phòng do server cấp là 12 ký tự hex.
 * Dùng để biết có được tin trường `as` không (xem báo cáo: nên có cờ local trong ReduceContext).
 */
export const isLocalCtx = (c: ReduceContext) => c.players.length > 0 && c.players.every((p) => /^p\d+$/.test(p.id));

export const windowMs = (s: Pick<BipState, 'windowSec'>) => Number(s.windowSec) * 1000;

function deal(n: number): Card[][] {
  // useParty gọi init([]) để lấy cài đặt mặc định: không có ai thì không chia.
  if (n < 1) return [];
  const deck = shuffle(fullDeck());
  const hands: Card[][] = Array.from({ length: n }, () => []);
  deck.forEach((c, i) => hands[i % n].push(c));
  return hands.map(sortCards);
}

interface NewOpts {
  mode?: ClaimMode;
  windowSec?: WindowSec;
  wins?: Record<string, number>;
  first?: number;
  hands?: Card[][];
}

export function newGame(players: Player[], o: NewOpts = {}): BipState {
  const seats = players.slice(0, MAX_SEATS).map((p) => p.id);
  const wins = { ...(o.wins ?? {}) };
  for (const id of seats) wins[id] ??= 0;
  return {
    ...baseState(),
    turn: Math.min(Math.max(0, o.first ?? 0), Math.max(0, seats.length - 1)),
    seats,
    hands: (o.hands ?? deal(seats.length)).map(sortCards),
    pile: [],
    phase: 'play',
    claim: null,
    deadline: 0,
    believers: [],
    rank: 0,
    reveal: null,
    winner: null,
    wins,
    moves: 0,
    mode: o.mode ?? 'sequence',
    windowSec: o.windowSec ?? '5',
  };
}

export const seatOf = (s: Pick<BipState, 'seats'>, id: string) => s.seats.indexOf(id);

/** Kết thúc lần khai: không ai lật tẩy (reveal null) hoặc đã lật. Xét thắng rồi sang người kế. */
function finish(s: BipState, reveal: Reveal | null): BipState {
  const claimer = s.claim!.seat;
  const n = s.seats.length;
  const base: BipState = {
    ...s,
    claim: null,
    believers: [],
    deadline: 0,
    reveal,
    rank: s.mode === 'sequence' ? (s.rank + 1) % 13 : s.rank,
    moves: s.moves + 1,
    seq: s.seq + 1,
  };
  if (!s.hands[claimer].length) {
    const id = s.seats[claimer];
    return { ...base, phase: 'done', winner: claimer, turn: claimer, wins: { ...s.wins, [id]: (s.wins[id] ?? 0) + 1 } };
  }
  return { ...base, phase: 'play', turn: (claimer + 1) % n };
}

/** Người lật tẩy / người tin: chơi 1 máy thì theo `as`, chơi phòng thì theo người gửi. */
function actor(a: { as?: string }, c: ReduceContext) {
  return a.as !== undefined && isLocalCtx(c) ? a.as : c.from;
}

export const baiBipGame: GameDef<BipState, BipAction> = {
  id: 'bai-bip',
  init: (players) => newGame(players),
  configOf: (s) => ({ mode: s.mode, windowSec: s.windowSec }),
  // Chủ phòng bỏ lượt người mất kết nối: đang chờ lật tẩy thì chốt luôn, tới lượt úp thì úp thật 1 lá.
  advance(s, c) {
    if (!c) return s;
    if (s.phase === 'window') return finish(s, null);
    if (s.phase !== 'play') return s;
    const hand = s.hands[s.turn];
    const honest = hand.find((x) => rankOf(x) === s.rank) ?? hand[0];
    return baiBipGame.reduce(s, { type: 'play', cards: [honest], rank: s.mode === 'free' ? rankOf(honest) : s.rank }, { ...c, from: s.seats[s.turn] });
  },
  reduce(s, a, c) {
    if (a.type === 'config') {
      if (!c.host || s.moves > 0 || s.phase !== 'play' || s.pile.length) return s;
      const mode: ClaimMode = a.config.mode === 'free' ? 'free' : 'sequence';
      const windowSec: WindowSec = (['3', '5', '8', '15'] as const).find((w) => w === a.config.windowSec) ?? '5';
      return { ...newGame(c.players, { mode, windowSec, wins: s.wins, first: s.turn }), seq: s.seq + 1 };
    }
    if (a.type === 'restart') {
      if (!c.host || s.phase !== 'done') return s;
      return { ...newGame(c.players, { mode: s.mode, windowSec: s.windowSec, wins: s.wins, first: s.winner ?? 0 }), seq: s.seq + 1 };
    }

    if (a.type === 'play') {
      const seat = seatOf(s, c.from);
      if (s.phase !== 'play' || seat < 0 || seat !== s.turn) return s;
      if (!Array.isArray(a.cards) || a.cards.length < 1 || a.cards.length > MAX_PLAY || !a.cards.every(isCard)) return s;
      const hand = s.hands[seat];
      if (new Set(a.cards).size !== a.cards.length || !a.cards.every((x) => hand.includes(x))) return s;
      let rank = s.rank;
      if (s.mode === 'free') {
        if (!Number.isInteger(a.rank) || a.rank! < 0 || a.rank! > 12) return s;
        rank = a.rank!;
      }
      const hands = s.hands.slice();
      hands[seat] = hand.filter((x) => !a.cards.includes(x));
      return {
        ...s,
        hands,
        pile: [...s.pile, ...a.cards],
        phase: 'window',
        claim: { seat, rank, cards: [...a.cards] },
        deadline: (c.now ?? 0) + windowMs(s),
        believers: [],
        rank,
        reveal: null,
        moves: s.moves + 1,
        seq: s.seq + 1,
      };
    }

    if (s.phase !== 'window' || !s.claim) return s;
    const claimer = s.claim.seat;

    if (a.type === 'resolve') {
      // Hết giờ mà không ai lật tẩy: lần khai được chấp nhận.
      if (c.now !== undefined && c.now < s.deadline) return s;
      return finish(s, null);
    }

    const who = seatOf(s, actor(a, c));
    if (who < 0 || who === claimer) return s;

    if (a.type === 'believe') {
      if (s.believers.includes(who)) return s;
      const believers = [...s.believers, who];
      const others = s.seats.length - 1;
      if (believers.length >= others) return finish({ ...s, believers }, null);
      return { ...s, believers, seq: s.seq + 1 };
    }

    if (a.type === 'call') {
      // Đã bấm tin thì thôi; quá giờ thì không lật được nữa.
      if (s.believers.includes(who)) return s;
      if (c.now !== undefined && c.now > s.deadline) return s;
      const lie = s.claim.cards.some((x) => rankOf(x) !== s.claim!.rank);
      const taker = lie ? claimer : who;
      const hands = s.hands.slice();
      hands[taker] = sortCards([...hands[taker], ...s.pile]);
      const reveal: Reveal = { claimer, caller: who, rank: s.claim.rank, cards: s.claim.cards, lie, taker, taken: s.pile.length };
      return finish({ ...s, hands, pile: [] }, reveal);
    }
    return s;
  },
};
