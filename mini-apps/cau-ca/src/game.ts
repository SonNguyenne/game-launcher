import { baseState, isTurnOf, nextTurn, playerAt, randomInt, shuffle, withResult, type BaseState, type GameDef, type Party, type Player } from '@bang/party';
import { strings, type Finale, type Penalty, type PunishMode } from './strings';

/** r: 0..12 (A..K), s: 0..3 (♠ ♣ ♥ ♦). */
export interface Card {
  r: number;
  s: number;
}

export interface Spin {
  id: number;
  slice: number;
  turns: number;
  offset: number;
}

export interface Punish {
  mode: PunishMode;
  /** Thứ tự người bị phạt (chỉ số trong danh sách người chơi), người ít điểm nhất trước. */
  order: number[];
  /** Hình phạt úp dưới 6 lá thăm, xáo lại cho mỗi người. */
  lots: number[];
  /** Lá thăm vừa bốc, hoặc ô vòng quay vừa trúng. */
  picked: number | null;
}

export interface FishState extends BaseState {
  cards: Card[];
  /** Người đã câu lá này (null: còn úp trên bàn). */
  taken: (string | null)[];
  /** Các lá đang ngửa trong lượt (tối đa 2). */
  flipped: number[];
  /**
   * pick: đang lật bài; penalty: vừa lật trượt, chờ quay vòng phạt;
   * punish: hết bài, phạt lần lượt những người thua; done: xong ván.
   */
  phase: 'pick' | 'penalty' | 'punish' | 'done';
  spin: Spin | null;
  scores: Record<string, number>;
  punish: Punish | null;
  /** Tăng mỗi lần xáo bài, để máy nào cũng chạy hiệu ứng xáo. */
  shuffles: number;
  /** Đã lật lá đầu tiên: từ đó không được xáo nữa. */
  started: boolean;
  /** Lật trượt thì quay vòng phạt; tắt thì chỉ mất lượt. */
  penalty: boolean;
  /** Cách phạt cuối ván; off thì hết bài là xong ván. */
  finale: Finale;
  again: boolean;
  customPenalties?: Penalty[];
  customFinals?: Penalty[];
}

export type FishParty = Party<FishState, FishAction>;

export type Config = Partial<Pick<FishState, 'penalty' | 'finale' | 'again' | 'customPenalties' | 'customFinals'>>;

export type FishAction =
  | { type: 'flip'; index: number }
  | { type: 'shuffle' }
  | { type: 'spin' }
  | { type: 'lot'; index: number }
  | { type: 'config'; config: Config }
  | { type: 'restart' };

export const isRed = (c: Card) => c.s >= 2;
export const cardsLeft = (s: FishState) => s.taken.filter((t) => t === null).length;
export const getPenalties = (s: FishState | Config): readonly Penalty[] => s.customPenalties ?? strings.penalties;
export const getFinals = (s: FishState | Config): readonly Penalty[] => s.customFinals ?? strings.finals;
/** Điểm cao nhất và những người đạt điểm đó. */
export function leaders(s: FishState, players: Player[]) {
  const top = Math.max(0, ...players.map((p) => s.scores[p.id] ?? 0));
  return { top, ids: players.filter((p) => (s.scores[p.id] ?? 0) === top).map((p) => p.id) };
}

function newDeck(): Card[] {
  const deck: Card[] = [];
  for (let s = 0; s < 4; s++) for (let r = 0; r < 13; r++) deck.push({ r, s });
  return shuffle(deck);
}

const newLots = () => shuffle(strings.finals.map((_, i) => i));

const fresh = (): FishState => ({
  ...baseState(),
  cards: newDeck(),
  taken: Array(52).fill(null),
  flipped: [],
  phase: 'pick',
  spin: null,
  scores: {},
  punish: null,
  shuffles: 1,
  started: false,
  penalty: true,
  finale: 'wheel',
  again: false,
});

const newSpin = (s: FishState, slices: number): Spin => ({
  id: (s.spin?.id ?? 0) + 1,
  slice: randomInt(0, slices - 1),
  turns: randomInt(4, 6),
  offset: randomInt(-18, 18),
});

/** Những người thua, ít điểm nhất đi trước. Rỗng nếu hòa cả bàn. */
function losersOrder(s: FishState, players: Player[]) {
  const { ids } = leaders(s, players);
  return players
    .map((p, i) => ({ i, pts: s.scores[p.id] ?? 0, win: ids.includes(p.id) }))
    .filter((x) => !x.win)
    .sort((a, b) => a.pts - b.pts)
    .map((x) => x.i);
}

export const fishGame: GameDef<FishState, FishAction> = {
  id: 'cau-ca',
  init: fresh,
  configOf: (s) => ({
    penalty: s.penalty,
    again: !!s.again,
    finale: s.finale ?? 'wheel',
    customPenalties: s.customPenalties,
    customFinals: s.customFinals,
  }),
  advance(s) {
    const next = { ...nextTurn(s), flipped: [] as number[] };
    if (s.phase === 'punish' && s.punish) {
      // Người kế tiếp chịu phạt; hết người thì xong ván.
      const order = s.punish.order.slice(1);
      if (!order.length) return { ...next, phase: 'done', punish: { ...s.punish, order, picked: null } };
      return { ...next, turn: order[0], punish: { ...s.punish, order, lots: newLots(), picked: null } };
    }
    if (s.phase === 'pick' && s.punish) {
      // Vừa câu cặp cuối: chuyển sang phạt cuối ván (danh sách đã tính lúc câu).
      if (!s.punish.order.length) return { ...next, phase: 'done' };
      return { ...next, phase: 'punish', turn: s.punish.order[0] };
    }
    // Vừa câu được (2 lá ngửa đã thuộc về người chơi) và bật chơi tiếp: giữ lượt.
    if (s.phase === 'pick' && s.again && s.flipped.length === 2 && s.taken[s.flipped[0]] !== null) {
      return { ...next, turn: s.turn, phase: 'pick' };
    }
    return { ...next, phase: 'pick' };
  },
  reduce(s, a, c) {
    // Ván mới: đếm tiếp số lần xáo để máy nào cũng chạy hiệu ứng xáo.
    if (a.type === 'restart')
      return c.host && s.phase === 'done'
        ? {
            ...fresh(),
            penalty: s.penalty,
            finale: s.finale ?? 'wheel',
            again: !!s.again,
            customPenalties: s.customPenalties,
            customFinals: s.customFinals,
            shuffles: s.shuffles + 1,
            seq: s.seq + 1,
          }
        : s;
    if (a.type === 'config') {
      // Cài đặt chọn ở phòng chờ, áp vào lúc bắt đầu ván.
      if (!c.host || s.started) return s;
      const { penalty, finale, again, customPenalties, customFinals } = a.config;
      const next = { ...s };
      if (typeof penalty === 'boolean') next.penalty = penalty;
      if (typeof again === 'boolean') next.again = again;
      if (finale && finale in strings.finaleOptions) next.finale = finale;
      if (customPenalties !== undefined) next.customPenalties = customPenalties;
      if (customFinals !== undefined) next.customFinals = customFinals;
      return { ...next, seq: s.seq + 1 };
    }
    if (a.type === 'shuffle') {
      // Ai trong phòng cũng xáo được, nhưng chỉ trước khi lật lá đầu tiên.
      if (s.started || !c.players.some((p) => p.id === c.from)) return s;
      return { ...s, cards: shuffle(s.cards), shuffles: s.shuffles + 1, seq: s.seq + 1 };
    }

    if (s.result || !isTurnOf(s, c)) return s;
    const who = playerAt(c.players, s.turn)!.id;

    if (a.type === 'flip') {
      const i = a.index;
      if (s.phase !== 'pick' || s.flipped.length >= 2 || s.flipped.includes(i) || s.taken[i] !== null || !s.cards[i]) return s;
      const flipped = [...s.flipped, i];
      if (flipped.length === 1) return { ...s, flipped, started: true, seq: s.seq + 1 };

      const [x, y] = flipped.map((k) => s.cards[k]);
      if (x.r !== y.r) {
        if (s.penalty) return { ...s, flipped, phase: 'penalty', seq: s.seq + 1 };
        return withResult({ ...s, flipped }, { playerId: who, text: strings.missed, safe: true });
      }

      const taken = s.taken.map((t, k) => (flipped.includes(k) ? who : t));
      const scored: FishState = { ...s, flipped, taken, scores: { ...s.scores, [who]: (s.scores[who] ?? 0) + 1 } };
      // Cặp cuối cùng: tính luôn ai bị phạt cuối ván (reducer mới có danh sách người chơi).
      const last = taken.every((t) => t !== null);
      // Tắt phạt cuối ván: danh sách rỗng, hết bài là xong ván. Ván lưu từ bản cũ chưa có finale thì phạt bằng quay.
      const finale = s.finale ?? 'wheel';
      const punish: Punish | null = last
        ? { mode: finale === 'off' ? 'wheel' : finale, order: finale === 'off' ? [] : losersOrder(scored, c.players), lots: newLots(), picked: null }
        : null;
      return withResult({ ...scored, punish }, { playerId: who, text: s.again && !last ? strings.caughtAgain : strings.caught, safe: true });
    }

    if (a.type === 'spin') {
      if (s.phase === 'penalty') {
        const penalties = getPenalties(s);
        const spin = newSpin(s, penalties.length);
        const p = penalties[spin.slice];
        return withResult({ ...s, spin }, { playerId: who, text: p.text, safe: 'safe' in p && p.safe });
      }
      if (s.phase === 'punish' && s.punish?.mode === 'wheel' && s.punish.picked === null) {
        const finals = getFinals(s);
        const spin = newSpin(s, finals.length);
        return withResult(
          { ...s, spin, punish: { ...s.punish, picked: spin.slice } },
          { playerId: who, text: finals[spin.slice].text, detail: strings.punishDetail },
        );
      }
      return s;
    }

    if (a.type === 'lot') {
      if (s.phase !== 'punish' || s.punish?.mode !== 'lots' || s.punish.picked !== null) return s;
      const finals = getFinals(s);
      const penalty = s.punish.lots[a.index];
      if (penalty === undefined || !finals[penalty]) return s;
      return withResult(
        { ...s, punish: { ...s.punish, picked: a.index } },
        { playerId: who, text: finals[penalty].text, detail: strings.punishDetail },
      );
    }
    return s;
  },
};
