import { baseState, shuffle, type BaseState, type GameDef, type Party, type Player } from '@bang/party';
import type { Act, Rounds } from './strings';

export const MAX_SEATS = 6;
export const DECK_SIZE = 60;
const NUMBERS = 45;
const ACTS: Act[] = ['gui', 'sinh', 'khac'];
export const ACT_PENALTY = 10;
export const NGU_PENALTY = 10;

export interface Card {
  id: number;
  /** 0 mộc, 1 hỏa, 2 thổ, 3 kim, 4 thủy (thứ tự tương sinh). */
  he: number;
  /** 1–9; lá hành động là 0. */
  n: number;
  act: Act | null;
}

export function card(id: number): Card {
  if (id < NUMBERS) return { id, he: Math.floor(id / 9), n: (id % 9) + 1, act: null };
  const k = id - NUMBERS;
  return { id, he: k % 5, n: 0, act: ACTS[Math.floor(k / 5)] };
}

/** Hệ được hệ này sinh ra. */
export const child = (he: number) => (he + 1) % 5;
/** Hệ bị hệ này khắc: mộc khắc thổ, hỏa khắc kim, thổ khắc thủy, kim khắc mộc, thủy khắc hỏa. */
export const victimOf = (he: number) => (he + 2) % 5;
export const penaltyOf = (id: number) => {
  const c = card(id);
  return c.act ? ACT_PENALTY : c.n;
};

export type Phase = 'play' | 'sinh' | 'drawn' | 'roundEnd' | 'over';

export type Event =
  | { kind: 'play'; seat: number; cards: number[]; ngu: boolean; hit?: number[]; gaveTo?: number }
  | { kind: 'draw'; seat: number; empty: boolean }
  | { kind: 'pass'; seat: number };

export interface BaiState extends BaseState {
  seats: string[];
  hands: number[][];
  deck: number[];
  /** Lá đã đánh, lá cuối là lá trên cùng. */
  pile: number[];
  phase: Phase;
  /** Hệ phải đánh tiếp sau lá sinh. */
  sinhHe: number | null;
  drawn: number | null;
  /** Số lượt liền nhau không ai đánh được và không bốc được. */
  stuck: number;
  /** Tăng mỗi khi chuyển người, để màn che biết lúc nào phải che lại. */
  turnNo: number;
  round: number;
  rounds: Rounds;
  starter: number;
  scores: number[];
  roundScores: number[] | null;
  roundWinner: number;
  wentNgu: boolean;
  events: Event[];
}

export type BaiAction =
  | { type: 'config'; config: { rounds?: Rounds } }
  | { type: 'play'; cards: number[]; give?: { card: number; to: number } }
  | { type: 'draw' }
  | { type: 'pass' }
  | { type: 'nextRound' }
  | { type: 'restart' };

export type BaiParty = Party<BaiState, BaiAction>;

export const handSize = (n: number) => (n <= 3 ? 8 : n === 4 ? 7 : 6);

function deal(s: BaiState, starter: number): BaiState {
  let deck = shuffle(Array.from({ length: DECK_SIZE }, (_, i) => i));
  const n = s.seats.length;
  const size = handSize(n);
  const hands = s.seats.map((_, i) => deck.slice(i * size, (i + 1) * size));
  deck = deck.slice(n * size);
  // Lá mở bàn phải là lá số.
  const first = deck.findIndex((id) => card(id).act === null);
  const top = deck[first];
  deck = deck.filter((_, i) => i !== first);
  return {
    ...s,
    hands,
    deck,
    pile: [top],
    phase: 'play',
    sinhHe: null,
    drawn: null,
    stuck: 0,
    turn: starter,
    turnNo: s.turnNo + 1,
    starter,
    roundScores: null,
    roundWinner: -1,
    wentNgu: false,
    events: [],
  };
}

function fresh(players: Player[], rounds: Rounds = '3'): BaiState {
  const seats = players.slice(0, MAX_SEATS).map((p) => p.id);
  const base: BaiState = {
    ...baseState(),
    seats,
    hands: [],
    deck: [],
    pile: [],
    phase: 'play',
    sinhHe: null,
    drawn: null,
    stuck: 0,
    turnNo: 0,
    round: 1,
    rounds,
    starter: 0,
    scores: seats.map(() => 0),
    roundScores: null,
    roundWinner: -1,
    wentNgu: false,
    events: [],
  };
  return seats.length >= 2 ? deal(base, 0) : base;
}

/** Lá này có nối được lên lá trên cùng không (lượt thường). */
export function fits(id: number, topId: number): boolean {
  const c = card(id);
  const t = card(topId);
  if (c.he === t.he) return true;
  if (c.act || t.act) {
    if (c.act && c.act === t.act) return true;
    // Tương sinh lên lá hành động: lá số nào của hệ con cũng được.
    return !c.act && t.act !== null && child(t.he) === c.he;
  }
  if (c.n === t.n) return true;
  return child(t.he) === c.he && c.n > t.n;
}

export const isNgu = (ids: number[]) => ids.length === 5 && ids.every((id) => card(id).act === null) && new Set(ids.map((id) => card(id).he)).size === 5;

/** Kiểm tra một lần đánh (chưa xét lá gửi). */
export function legalPlay(s: Pick<BaiState, 'phase' | 'pile' | 'sinhHe' | 'drawn'>, hand: number[], ids: number[]): boolean {
  if (!ids.length || new Set(ids).size !== ids.length || !ids.every((id) => hand.includes(id))) return false;
  const top = s.pile[s.pile.length - 1];
  if (s.phase === 'drawn') return ids.length === 1 && ids[0] === s.drawn && fits(ids[0], top);
  const first = card(ids[0]);
  const startOk = s.phase === 'sinh' ? first.he === s.sinhHe : fits(ids[0], top);
  if (ids.length === 1) return startOk;
  if (s.phase === 'play' && isNgu(ids)) return true;
  return startOk && ids.every((id) => card(id).act === null && card(id).n === first.n);
}

const bump = (s: BaiState, patch: Partial<BaiState>): BaiState => ({ ...s, ...patch, seq: s.seq + 1 });
const pushEvent = (s: BaiState, e: Event) => [...s.events, e].slice(-6);

function nextTurn(s: BaiState): BaiState {
  const turn = (s.turn + 1) % s.seats.length;
  return { ...s, turn, turnNo: s.turnNo + 1, phase: 'play', sinhHe: null, drawn: null };
}

/** Bốc một lá; hết nọc thì xáo lại chồng đã đánh (trừ lá trên cùng). */
function drawOne(s: BaiState): { s: BaiState; id: number | null } {
  let deck = s.deck;
  let pile = s.pile;
  if (!deck.length && pile.length > 1) {
    deck = shuffle(pile.slice(0, -1));
    pile = pile.slice(-1);
  }
  if (!deck.length) return { s: { ...s, deck, pile }, id: null };
  const id = deck[0];
  return { s: { ...s, deck: deck.slice(1), pile }, id };
}

function giveCard(hands: number[][], from: number, to: number, id: number) {
  return hands.map((h, i) => (i === from ? h.filter((x) => x !== id) : i === to ? [...h, id] : h));
}

function endRound(s: BaiState, winner: number): BaiState {
  const roundScores = s.hands.map((h, i) => (i === winner ? 0 : h.reduce((a, id) => a + penaltyOf(id), 0) + (s.wentNgu ? NGU_PENALTY : 0)));
  const scores = s.scores.map((v, i) => v + roundScores[i]);
  const last = s.round >= Number(s.rounds);
  return bump(s, { phase: last ? 'over' : 'roundEnd', roundScores, scores, roundWinner: winner, sinhHe: null, drawn: null });
}

export const baiGame: GameDef<BaiState, BaiAction> = {
  id: 'bai-mau',
  init: (players) => fresh(players),
  configOf: (s) => ({ rounds: s.rounds }),
  advance: (s) => s,
  reduce(s, a, c) {
    if (a.type === 'config') {
      if (!c.host) return s;
      const rounds: Rounds = a.config.rounds === '1' || a.config.rounds === '5' ? a.config.rounds : '3';
      return { ...fresh(c.players, rounds), seq: s.seq + 1 };
    }
    if (a.type === 'restart') {
      if (!c.host) return s;
      return { ...fresh(c.players, s.rounds), seq: s.seq + 1 };
    }
    if (a.type === 'nextRound') {
      if (!c.host || s.phase !== 'roundEnd') return s;
      return bump(deal({ ...s, round: s.round + 1 }, (s.starter + 1) % s.seats.length), {});
    }
    const seat = s.seats.indexOf(c.from);
    if (seat < 0 || seat !== s.turn || s.seats.length < 2) return s;
    if (s.phase !== 'play' && s.phase !== 'sinh' && s.phase !== 'drawn') return s;
    const hand = s.hands[seat];

    if (a.type === 'draw') {
      if (s.phase === 'drawn') return s;
      const { s: after, id } = drawOne(s);
      if (id === null) {
        const stuck = s.stuck + 1;
        const next = { ...after, stuck, events: pushEvent(s, { kind: 'draw', seat, empty: true }) };
        if (stuck >= s.seats.length) return endRound(next, -1);
        return bump(nextTurn(next), {});
      }
      const hands = after.hands.map((h, i) => (i === seat ? [...h, id] : h));
      const next: BaiState = { ...after, hands, stuck: 0, events: pushEvent(s, { kind: 'draw', seat, empty: false }) };
      const top = next.pile[next.pile.length - 1];
      // Lượt thường: lá vừa bốc nối được thì được đánh luôn. Sau lá sinh: bốc xong là hết lượt.
      if (s.phase === 'play' && fits(id, top)) return bump(next, { phase: 'drawn', drawn: id });
      return bump(nextTurn(next), {});
    }

    if (a.type === 'pass') {
      if (s.phase !== 'drawn') return s;
      return bump(nextTurn({ ...s, events: pushEvent(s, { kind: 'pass', seat }) }), {});
    }

    if (a.type === 'play') {
      const ids = Array.isArray(a.cards) ? a.cards : [];
      if (!legalPlay(s, hand, ids)) return s;
      const ngu = s.phase === 'play' && isNgu(ids);
      let hands = s.hands.map((h, i) => (i === seat ? h.filter((id) => !ids.includes(id)) : h));
      const pile = [...s.pile, ...ids];
      const top = card(ids[ids.length - 1]);
      const rest = hands[seat];
      let event: Event = { kind: 'play', seat, cards: ids, ngu };
      let deck = s.deck;
      let next: BaiState = { ...s, pile, stuck: 0 };

      if (top.act === 'gui' && ids.length === 1 && rest.length > 0) {
        const g = a.give;
        if (!g || !rest.includes(g.card) || !Number.isInteger(g.to) || g.to === seat || g.to < 0 || g.to >= s.seats.length) return s;
        hands = giveCard(hands, seat, g.to, g.card);
        event = { ...event, gaveTo: g.to };
      }
      if (top.act === 'khac' && ids.length === 1) {
        const target = victimOf(top.he);
        const hit: number[] = [];
        next = { ...next, deck };
        for (let i = 0; i < s.seats.length; i++) {
          if (i === seat || !hands[i].some((id) => card(id).he === target)) continue;
          const d = drawOne(next);
          next = d.s;
          if (d.id !== null) {
            const id = d.id;
            hands = hands.map((h, j) => (j === i ? [...h, id] : h));
            hit.push(i);
          }
        }
        deck = next.deck;
        event = { ...event, hit };
      }
      next = { ...next, hands, deck, events: pushEvent(s, event), wentNgu: ngu };
      if (hands[seat].length === 0) return endRound(next, seat);
      if (top.act === 'sinh' && ids.length === 1) return bump(next, { phase: 'sinh', sinhHe: child(top.he), drawn: null });
      return bump(nextTurn(next), {});
    }
    return s;
  },
};

/** Người thắng chung cuộc: ít điểm phạt nhất (có thể đồng hạng). */
export function leaders(scores: number[]): number[] {
  const min = Math.min(...scores);
  return scores.flatMap((v, i) => (v === min ? [i] : []));
}
