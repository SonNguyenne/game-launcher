import { baseState, shuffle, type BaseState, type GameDef, type Party, type Player } from '@bang/party';
import type { DrawMode, Target } from './strings';

/** Một quân domino: hai nửa a, b (0..6). Trên bàn, a là nửa quay về đầu trái của dãy. */
export interface Tile {
  a: number;
  b: number;
}

export interface Placed extends Tile {
  /** Ghế đặt quân này. */
  by: number;
}

export type LastMove = { seat: number; kind: 'play'; tile: Tile; end: 'left' | 'right' } | { seat: number; kind: 'draw' } | { seat: number; kind: 'pass' };

export interface RoundResult {
  reason: 'domino' | 'blocked';
  /** Ghế thắng ván; null khi bàn chặn mà hòa chấm. */
  winner: number | null;
  points: number;
  /** Số chấm còn trên tay từng ghế lúc hết ván. */
  pips: number[];
}

export interface DominoState extends BaseState {
  /** id người chơi theo ghế; ghế i là người thứ i trong danh sách, nên turn = ghế. */
  seats: string[];
  hands: Tile[][];
  boneyard: Tile[];
  /** Dãy trên bàn từ đầu trái sang đầu phải. */
  line: Placed[];
  /** Số lượt bỏ liên tiếp; đủ một vòng là bàn chặn. */
  passes: number;
  last: LastMove | null;
  round: number;
  roundResult: RoundResult | null;
  /** Điểm cộng dồn theo id. */
  scores: Record<string, number>;
  /** Ghế thắng chung cuộc. */
  champion: number | null;
  mode: DrawMode;
  target: Target;
}

export type Config = Partial<Pick<DominoState, 'mode' | 'target'>>;

export type DominoAction =
  | { type: 'play'; tile: Tile; end?: 'left' | 'right' }
  | { type: 'draw' }
  | { type: 'pass' }
  | { type: 'nextRound' }
  | { type: 'restart' }
  | { type: 'config'; config: Config };

export type DominoParty = Party<DominoState, DominoAction>;

export const MAX_SEATS = 4;

export function fullSet(): Tile[] {
  const out: Tile[] = [];
  for (let a = 0; a <= 6; a++) for (let b = a; b <= 6; b++) out.push({ a, b });
  return out;
}

/** Số quân chia mỗi người: 4 người chế độ bốc thì 5 quân để còn nọc mà bốc. */
export const handSize = (seats: number, mode: DrawMode) => (seats >= 4 && mode === 'draw' ? 5 : 7);

export const pipsOf = (hand: readonly Tile[]) => hand.reduce((n, t) => n + t.a + t.b, 0);
export const sameTile = (x: Tile, y: Tile) => (x.a === y.a && x.b === y.b) || (x.a === y.b && x.b === y.a);

export function ends(line: readonly Placed[]): [number, number] | null {
  if (!line.length) return null;
  return [line[0].a, line[line.length - 1].b];
}

/** Các đầu quân này nối được: rỗng là không nối được. Bàn trống thì nối đâu cũng được. */
export function fits(line: readonly Placed[], t: Tile): ('left' | 'right')[] {
  const e = ends(line);
  if (!e) return ['left', 'right'];
  const out: ('left' | 'right')[] = [];
  if (t.a === e[0] || t.b === e[0]) out.push('left');
  if (t.a === e[1] || t.b === e[1]) out.push('right');
  return out;
}

export const canPlay = (line: readonly Placed[], hand: readonly Tile[]) => hand.some((t) => fits(line, t).length > 0);

/** Ghế đi trước: cầm đôi lớn nhất; không ai có đôi thì cầm quân nhiều chấm nhất. */
export function starter(hands: readonly Tile[][]): number {
  let best = -1;
  let seat = 0;
  hands.forEach((h, i) =>
    h.forEach((t) => {
      const v = t.a === t.b ? 100 + t.a : t.a + t.b;
      if (v > best) {
        best = v;
        seat = i;
      }
    }),
  );
  return seat;
}

function deal(s: Pick<DominoState, 'seats' | 'mode'>): Pick<DominoState, 'hands' | 'boneyard' | 'turn' | 'line' | 'passes' | 'last' | 'roundResult'> {
  const deck = shuffle(fullSet());
  const n = handSize(s.seats.length, s.mode);
  const hands = s.seats.map((_, i) => deck.slice(i * n, i * n + n));
  return {
    hands,
    boneyard: deck.slice(s.seats.length * n),
    turn: starter(hands),
    line: [],
    passes: 0,
    last: null,
    roundResult: null,
  };
}

function fresh(players: Player[], mode: DrawMode = 'block', target: Target = '100'): DominoState {
  const seats = players.slice(0, MAX_SEATS).map((p) => p.id);
  const base = { ...baseState(), seats, mode, target, round: 1, scores: Object.fromEntries(seats.map((id) => [id, 0])), champion: null };
  return { ...base, ...deal(base) };
}

/** Kết thúc ván: tính người thắng và điểm. */
function finishRound(s: DominoState, reason: RoundResult['reason']): DominoState {
  const pips = s.hands.map(pipsOf);
  let winner: number | null;
  if (reason === 'domino') {
    winner = s.hands.findIndex((h) => h.length === 0);
  } else {
    const min = Math.min(...pips);
    const lows = pips.flatMap((p, i) => (p === min ? [i] : []));
    winner = lows.length === 1 ? lows[0] : null;
  }
  const points = winner === null ? 0 : pips.reduce((n, p, i) => (i === winner ? n : n + p), 0);
  const scores = { ...s.scores };
  if (winner !== null) scores[s.seats[winner]] = (scores[s.seats[winner]] ?? 0) + points;
  const goal = Number(s.target);
  const champion = winner !== null && scores[s.seats[winner]] >= goal ? winner : null;
  return { ...s, scores, champion, roundResult: { reason, winner, points, pips } };
}

const nextSeat = (s: DominoState) => (s.turn + 1) % s.seats.length;

export const dominoGame: GameDef<DominoState, DominoAction> = {
  id: 'domino',
  init: (players) => fresh(players),
  configOf: (s) => ({ mode: s.mode, target: s.target }),
  advance: (s) => {
    // Chủ phòng bỏ lượt người đang mất kết nối: chuyển sang ghế kế tiếp.
    if (s.roundResult) return s;
    return { ...s, turn: nextSeat(s), seq: s.seq + 1 };
  },
  reduce(s, a, c) {
    if (a.type === 'config') {
      if (!c.host || s.line.length || s.round > 1) return s;
      const mode: DrawMode = a.config.mode === 'draw' ? 'draw' : 'block';
      const target: Target = a.config.target === '50' ? '50' : '100';
      return { ...fresh(c.players, mode, target), seq: s.seq + 1 };
    }
    if (a.type === 'restart') {
      if (!c.host || s.champion === null) return s;
      return { ...fresh(c.players, s.mode, s.target), seq: s.seq + 1 };
    }
    if (a.type === 'nextRound') {
      if (!c.host || !s.roundResult || s.champion !== null) return s;
      return { ...s, ...deal(s), round: s.round + 1, seq: s.seq + 1 };
    }

    const seat = s.seats.indexOf(c.from);
    if (s.roundResult || seat < 0 || seat !== s.turn) return s;
    const hand = s.hands[seat];

    if (a.type === 'play') {
      const t = a.tile;
      if (!t || !Number.isInteger(t.a) || !Number.isInteger(t.b)) return s;
      const at = hand.findIndex((h) => sameTile(h, t));
      if (at < 0) return s;
      const tile = hand[at];
      const options = fits(s.line, tile);
      if (!options.length) return s;
      if (a.end && !options.includes(a.end)) return s;
      const end = a.end ?? options[0];
      let line: Placed[];
      const e = ends(s.line);
      if (!e) line = [{ a: tile.a, b: tile.b, by: seat }];
      else if (end === 'left') line = [{ a: tile.a === e[0] ? tile.b : tile.a, b: e[0], by: seat }, ...s.line];
      else line = [...s.line, { a: e[1], b: tile.a === e[1] ? tile.b : tile.a, by: seat }];
      const hands = s.hands.map((h, i) => (i === seat ? h.filter((_, j) => j !== at) : h));
      const next: DominoState = { ...s, hands, line, passes: 0, last: { seat, kind: 'play', tile: { a: tile.a, b: tile.b }, end }, seq: s.seq + 1 };
      if (!hands[seat].length) return finishRound(next, 'domino');
      return { ...next, turn: nextSeat(s) };
    }

    if (a.type === 'draw') {
      if (s.mode !== 'draw' || !s.boneyard.length || canPlay(s.line, hand)) return s;
      const [tile, ...boneyard] = s.boneyard;
      const hands = s.hands.map((h, i) => (i === seat ? [...h, tile] : h));
      // Bốc tới khi nối được; người bốc vẫn giữ lượt.
      return { ...s, hands, boneyard, last: { seat, kind: 'draw' }, seq: s.seq + 1 };
    }

    if (a.type === 'pass') {
      if (canPlay(s.line, hand)) return s;
      if (s.mode === 'draw' && s.boneyard.length) return s;
      const passes = s.passes + 1;
      const next: DominoState = { ...s, passes, last: { seat, kind: 'pass' }, seq: s.seq + 1 };
      if (passes >= s.seats.length) return finishRound(next, 'blocked');
      return { ...next, turn: nextSeat(s) };
    }
    return s;
  },
};
