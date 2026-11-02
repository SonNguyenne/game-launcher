import { baseState, shuffle, type BaseState, type GameDef, type Party, type Player } from '@bang/party';
import { fullDeck, type Card } from './cards';
import { bestHand, type Category } from './hand';

export const MAX_SEATS = 6;
/** Mức big blind tăng dần; small blind bằng một nửa. */
export const BLIND_LEVELS = [20, 30, 40, 60, 80, 100, 150, 200, 300, 400, 600, 800, 1000, 1500, 2000, 3000, 5000];

export type StartChips = '500' | '1000' | '2000';
/** Tăng blind sau mỗi bao nhiêu ván; off: giữ nguyên. */
export type BlindUp = 'off' | '5' | '10';
export type Street = 'preflop' | 'flop' | 'turn' | 'river';
/** bet: đang cược; result: hết ván bài, chờ chia ván tiếp; done: còn một người, xong trận. */
export type Phase = 'bet' | 'result' | 'done';

export interface PotResult {
  amount: number;
  winners: number[];
}

export interface Showdown {
  pots: PotResult[];
  /** Hạng tay bài của những người lật bài (null nếu thắng vì mọi người bỏ). */
  hands: (Category | null)[];
  /** Những ghế phải lật bài. */
  shown: number[];
  /** 5 lá tạo tay bài thắng, để tô sáng. */
  best: Card[];
  /** Tiền mỗi ghế nhận được trong ván. */
  won: number[];
}

export interface PokerState extends BaseState {
  /** id người ngồi từng ghế (tối đa 6). Ghế i trùng chỉ số i trong danh sách người chơi. */
  seats: string[];
  chips: number[];
  /** Ván bài thứ mấy (bắt đầu 1). */
  handNo: number;
  dealer: number;
  sbSeat: number;
  bbSeat: number;
  sb: number;
  bb: number;
  deck: Card[];
  hole: Card[][];
  board: Card[];
  street: Street;
  phase: Phase;
  /** Tiền cược mỗi ghế ở vòng cược hiện tại. */
  bets: number[];
  /** Tổng tiền mỗi ghế bỏ vào pot cả ván bài, để chia pot phụ. */
  contrib: number[];
  /** Ghế có chơi ván bài này (còn chip lúc chia). */
  inHand: boolean[];
  folded: boolean[];
  allIn: boolean[];
  /** Đã hành động kể từ lần tố đủ gần nhất; true thì không được tố lại (trừ khi có người tố đủ). */
  acted: boolean[];
  currentBet: number;
  minRaise: number;
  showdown: Showdown | null;
  /** Thứ tự bị loại (ghế), người ra trước đứng trước. */
  busted: number[];
  /** Đếm số hành động trong ván bài, để màn che chuyền máy biết khi nào đổi người. */
  moves: number;
  startChips: StartChips;
  blindUp: BlindUp;
}

export type Config = Partial<Pick<PokerState, 'startChips' | 'blindUp'>>;

export type PokerAction =
  | { type: 'fold' }
  | { type: 'check' }
  | { type: 'call' }
  /** Bet (khi chưa ai cược) hoặc raise: `to` là tổng cược của mình ở vòng này sau khi tố. */
  | { type: 'raise'; to: number }
  | { type: 'allin' }
  /** Chia ván bài tiếp theo sau khi xem kết quả. */
  | { type: 'deal' }
  /** Hết trận: chơi lại từ đầu. */
  | { type: 'restart' }
  | { type: 'config'; config: Config };

export type PokerParty = Party<PokerState, PokerAction>;

export const blindsFor = (handNo: number, blindUp: BlindUp) => {
  const every = blindUp === 'off' ? Infinity : Number(blindUp);
  const level = Math.min(BLIND_LEVELS.length - 1, Math.floor((handNo - 1) / every));
  const bb = BLIND_LEVELS[level];
  return { sb: bb / 2, bb };
};

const seatsIdx = (s: { seats: string[] }) => s.seats.map((_, i) => i);

function nextWhere(s: { seats: string[] }, from: number, ok: (i: number) => boolean): number {
  const n = s.seats.length;
  for (let k = 1; k <= n; k++) {
    const i = (from + k) % n;
    if (ok(i)) return i;
  }
  return -1;
}

/** Ghế còn cần hành động ở vòng cược này. */
const needsAction = (s: PokerState, i: number) => s.inHand[i] && !s.folded[i] && !s.allIn[i] && (!s.acted[i] || s.bets[i] < s.currentBet);
const live = (s: PokerState) => seatsIdx(s).filter((i) => s.inHand[i] && !s.folded[i]);
const canBet = (s: PokerState) => live(s).filter((i) => !s.allIn[i]);

/** Bỏ tiền ghế i vào pot (tối đa số chip đang có). */
function put(s: PokerState, i: number, amount: number): PokerState {
  const pay = Math.min(amount, s.chips[i]);
  const chips = s.chips.slice();
  const bets = s.bets.slice();
  const contrib = s.contrib.slice();
  const allIn = s.allIn.slice();
  chips[i] -= pay;
  bets[i] += pay;
  contrib[i] += pay;
  if (chips[i] === 0) allIn[i] = true;
  return { ...s, chips, bets, contrib, allIn };
}

/** Chia một ván bài mới: dời nút dealer, đặt blind, chia 2 lá. Có thể truyền sẵn bộ bài (cho test). */
export function startHand(s: PokerState, deck: Card[] = shuffle(fullDeck())): PokerState {
  const n = s.seats.length;
  const inHand = s.chips.map((c) => c > 0);
  const players = inHand.filter(Boolean).length;
  if (players < 2) return { ...s, phase: 'done', inHand };
  const handNo = s.handNo + 1;
  const { sb, bb } = blindsFor(handNo, s.blindUp);
  const dealer = s.handNo === 0 && inHand[s.dealer] ? s.dealer : nextWhere(s, s.dealer, (i) => inHand[i]);
  // Hai người: dealer là small blind và nói trước ở vòng đầu.
  const sbSeat = players === 2 ? dealer : nextWhere(s, dealer, (i) => inHand[i]);
  const bbSeat = nextWhere(s, sbSeat, (i) => inHand[i]);
  const hole: Card[][] = s.seats.map(() => []);
  let d = 0;
  for (let round = 0; round < 2; round++) {
    for (let k = 1; k <= n; k++) {
      const i = (dealer + k) % n;
      if (inHand[i]) hole[i].push(deck[d++]);
    }
  }
  let next: PokerState = {
    ...s,
    handNo,
    dealer,
    sbSeat,
    bbSeat,
    sb,
    bb,
    deck: deck.slice(d),
    hole,
    board: [],
    street: 'preflop',
    phase: 'bet',
    bets: s.seats.map(() => 0),
    contrib: s.seats.map(() => 0),
    inHand,
    folded: s.seats.map(() => false),
    allIn: s.seats.map(() => false),
    acted: s.seats.map(() => false),
    currentBet: bb,
    minRaise: bb,
    showdown: null,
    moves: 0,
  };
  next = put(put(next, sbSeat, sb), bbSeat, bb);
  return toNextActor(next, bbSeat);
}

function freshGame(players: Player[], startChips: StartChips = '1000', blindUp: BlindUp = '10'): PokerState {
  const seats = players.slice(0, MAX_SEATS).map((p) => p.id);
  const zeros = seats.map(() => 0);
  const flags = seats.map(() => false);
  const base: PokerState = {
    ...baseState(),
    seats,
    chips: seats.map(() => Number(startChips)),
    handNo: 0,
    dealer: 0,
    sbSeat: 0,
    bbSeat: 0,
    sb: 0,
    bb: 0,
    deck: [],
    hole: seats.map(() => []),
    board: [],
    street: 'preflop',
    phase: 'bet',
    bets: zeros,
    contrib: zeros,
    inHand: flags,
    folded: flags,
    allIn: flags,
    acted: flags,
    currentBet: 0,
    minRaise: 0,
    showdown: null,
    busted: [],
    moves: 0,
    startChips,
    blindUp,
  };
  return seats.length >= 2 ? startHand(base) : base;
}

/** Chia pot (kể cả pot phụ) theo tổng tiền mỗi người đã bỏ. Người bỏ bài góp tiền nhưng không được ăn. */
export function buildPots(contrib: readonly number[], folded: readonly boolean[]): { amount: number; eligible: number[] }[] {
  const levels = [...new Set(contrib.filter((c) => c > 0))].sort((a, b) => a - b);
  const pots: { amount: number; eligible: number[] }[] = [];
  let prev = 0;
  for (const level of levels) {
    const amount = contrib.reduce((sum, c) => sum + Math.max(0, Math.min(c, level) - prev), 0);
    const eligible = contrib.map((_, i) => i).filter((i) => contrib[i] >= level && !folded[i]);
    prev = level;
    const last = pots[pots.length - 1];
    if (last && (!eligible.length || (last.eligible.length === eligible.length && last.eligible.every((x, k) => x === eligible[k])))) {
      last.amount += amount;
    } else if (eligible.length) {
      pots.push({ amount, eligible });
    } else if (amount) {
      pots.push({ amount, eligible: contrib.map((_, i) => i).filter((i) => !folded[i]) });
    }
  }
  return pots;
}

/** Kết thúc ván bài: chia pot, lật bài, loại người hết chip. */
function settle(s: PokerState): PokerState {
  const alive = live(s);
  const contested = alive.length > 1;
  const values = s.seats.map((_, i) => (contested && alive.includes(i) ? bestHand([...s.hole[i], ...s.board]) : null));
  const pots = buildPots(s.contrib, s.folded.map((f, i) => f || !s.inHand[i]));
  const chips = s.chips.slice();
  const won = s.seats.map(() => 0);
  const results: PotResult[] = [];
  const n = s.seats.length;
  for (const pot of pots) {
    let winners = pot.eligible;
    if (contested) {
      const top = Math.max(...pot.eligible.map((i) => values[i]!.score));
      winners = pot.eligible.filter((i) => values[i]!.score === top);
    }
    // Chia đều; tiền lẻ cho người ngồi gần bên trái dealer nhất.
    const share = Math.floor(pot.amount / winners.length);
    let odd = pot.amount - share * winners.length;
    const order = [...winners].sort((a, b) => ((a - s.dealer - 1 + n) % n) - ((b - s.dealer - 1 + n) % n));
    for (const w of order) {
      const get = share + (odd > 0 ? 1 : 0);
      if (odd > 0) odd--;
      chips[w] += get;
      won[w] += get;
    }
    results.push({ amount: pot.amount, winners: order });
  }
  const busted = [...s.busted];
  s.seats.forEach((_, i) => {
    if (s.inHand[i] && chips[i] === 0 && !busted.includes(i)) busted.push(i);
  });
  const mainWinner = results[0]?.winners[0];
  const best = contested && mainWinner !== undefined ? values[mainWinner]!.cards : [];
  const remaining = chips.filter((c) => c > 0).length;
  return {
    ...s,
    chips,
    busted,
    bets: s.seats.map(() => 0),
    currentBet: 0,
    phase: remaining < 2 ? 'done' : 'result',
    showdown: {
      pots: results,
      hands: values.map((v) => v?.category ?? null),
      shown: contested ? alive : [],
      best,
      won,
    },
  };
}

/** Sang vòng cược kế (hoặc lật hết bài khi không còn ai cược được). */
function nextStreet(s: PokerState): PokerState {
  const reset = { ...s, bets: s.seats.map(() => 0), acted: s.seats.map(() => false), currentBet: 0, minRaise: s.bb };
  const deck = s.deck.slice();
  const board = s.board.slice();
  const runOut = canBet(s).length < 2;
  const target = s.street === 'preflop' ? 3 : s.street === 'flop' ? 4 : 5;
  const until = runOut ? 5 : target;
  if (s.street === 'river' || board.length >= 5) return settle(reset);
  while (board.length < until) board.push(deck.shift()!);
  const street: Street = board.length === 3 ? 'flop' : board.length === 4 ? 'turn' : 'river';
  const next = { ...reset, deck, board, street };
  if (runOut) return settle(next);
  const first = nextWhere(next, next.dealer, (i) => needsAction(next, i));
  return { ...next, turn: first };
}

/** Sau khi ghế `from` hành động: tìm người kế, hoặc kết thúc vòng cược / ván bài. */
function toNextActor(s: PokerState, from: number): PokerState {
  if (live(s).length === 1) return settle(s);
  const bettors = canBet(s);
  // Chỉ còn một người cược được và đã theo đủ: không còn ai để cược với.
  if (bettors.length <= 1 && bettors.every((i) => s.bets[i] >= s.currentBet)) return nextStreet(s);
  const next = nextWhere(s, from, (i) => needsAction(s, i));
  if (next < 0) return nextStreet(s);
  return { ...s, turn: next };
}

export const seatOf = (s: Pick<PokerState, 'seats'>, id: string) => s.seats.indexOf(id);

/** Số tiền cần bỏ thêm để theo. */
export const toCall = (s: PokerState, seat: number) => Math.max(0, Math.min(s.currentBet - s.bets[seat], s.chips[seat]));
/** Mức tố tối thiểu (tổng cược ở vòng này). */
export const minRaiseTo = (s: PokerState) => s.currentBet + s.minRaise;
/** Mức tố tối đa = all-in. */
export const maxRaiseTo = (s: PokerState, seat: number) => s.bets[seat] + s.chips[seat];
/** Được tố không: chưa hành động từ lần tố đủ gần nhất, và có tiền vượt mức đang cược. */
export const canRaise = (s: PokerState, seat: number) => !s.acted[seat] && maxRaiseTo(s, seat) > s.currentBet;

function act(s: PokerState, seat: number, a: PokerAction): PokerState | null {
  const acted = () => {
    const list = s.acted.slice();
    list[seat] = true;
    return list;
  };
  switch (a.type) {
    case 'fold': {
      const folded = s.folded.slice();
      folded[seat] = true;
      return { ...s, folded, acted: acted() };
    }
    case 'check':
      if (s.bets[seat] < s.currentBet) return null;
      return { ...s, acted: acted() };
    case 'call': {
      const need = toCall(s, seat);
      return { ...put(s, seat, need), acted: acted() };
    }
    case 'raise':
    case 'allin': {
      if (!canRaise(s, seat)) {
        // Hết quyền tố: all-in chỉ được khi số chip không vượt mức cần theo.
        if (a.type === 'allin' && maxRaiseTo(s, seat) <= s.currentBet) return { ...put(s, seat, s.chips[seat]), acted: acted() };
        return null;
      }
      const max = maxRaiseTo(s, seat);
      const to = a.type === 'allin' ? max : a.to;
      if (!Number.isInteger(to) || to > max || to <= s.currentBet) return null;
      const full = to - s.currentBet >= s.minRaise;
      // Tố thiếu mức tối thiểu chỉ được khi là all-in.
      if (!full && to !== max) return null;
      let next = put(s, seat, to - s.bets[seat]);
      const list = full ? s.seats.map(() => false) : s.acted.slice();
      list[seat] = true;
      next = { ...next, acted: list, currentBet: to, minRaise: full ? to - s.currentBet : s.minRaise };
      return next;
    }
  }
  return null;
}

export const pokerGame: GameDef<PokerState, PokerAction> = {
  id: 'poker',
  init: (players) => freshGame(players),
  configOf: (s) => ({ startChips: s.startChips, blindUp: s.blindUp }),
  // Chủ phòng bỏ lượt người mất kết nối: xem bài nếu được, không thì bỏ bài.
  advance(s, c) {
    if (s.phase !== 'bet' || !c) return s;
    const from = s.seats[s.turn];
    const check = pokerGame.reduce(s, { type: 'check' }, { ...c, from });
    return check !== s ? check : pokerGame.reduce(s, { type: 'fold' }, { ...c, from });
  },
  reduce(s, a, c) {
    if (a.type === 'config') {
      if (!c.host || s.handNo > 1 || s.moves > 0) return s;
      const startChips: StartChips = a.config.startChips === '500' || a.config.startChips === '2000' ? a.config.startChips : '1000';
      const blindUp: BlindUp = a.config.blindUp === 'off' || a.config.blindUp === '5' ? a.config.blindUp : '10';
      return { ...freshGame(c.players, startChips, blindUp), seq: s.seq + 1 };
    }
    if (a.type === 'restart') {
      if (!c.host || s.phase !== 'done') return s;
      return { ...freshGame(c.players, s.startChips, s.blindUp), seq: s.seq + 1 };
    }
    if (a.type === 'deal') {
      // Ai trong bàn cũng bấm được; bấm trùng thì bỏ qua vì phase đã đổi.
      if (s.phase !== 'result' || (!c.host && seatOf(s, c.from) < 0)) return s;
      return { ...startHand({ ...s, showdown: null }), seq: s.seq + 1 };
    }
    const seat = seatOf(s, c.from);
    if (s.phase !== 'bet' || seat < 0 || seat !== s.turn || !needsAction(s, seat)) return s;
    const next = act(s, seat, a);
    if (!next) return s;
    return { ...toNextActor(next, seat), moves: s.moves + 1, seq: s.seq + 1 };
  },
};
