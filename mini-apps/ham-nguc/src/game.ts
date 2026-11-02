import { baseState, type BaseState, type GameDef, type Party, type Player } from '@bang/party';
import { COLS, FLOORS, ROWS, buildDungeon, dayOf, hashSeed, type Card } from './cards';

export type Mode = 'race' | 'coop';
export type SeedMode = 'daily' | 'random';

export const MAX_PLAYERS = 4;
export const MAX_HP = 10;
export const START_TORCH = 10;
export const MAX_SHIELD = 2;
/** Khiên đỡ tối đa bấy nhiêu sát thương của một đòn rồi vỡ. */
export const SHIELD_BLOCK = 3;
export const CHEST_COST = 2;
export const CAMP_HEAL = 3;
export const CAMP_TORCH = 3;
export const PIT_DAMAGE = 2;
export const BOSS_GOLD = 10;

export interface Hero {
  id: string;
  hp: number;
  weapon: number;
  shield: number;
  keys: number;
  status: 'in' | 'dead' | 'out';
}

/** Một đoàn thám hiểm: đua điểm thì mỗi người một đoàn (cùng bản đồ), hợp tác thì cả đội chung một đoàn. */
export interface Exped {
  floor: number;
  /** -1: đứng ở cửa tầng, chọn được cả 3 ô hàng đầu. */
  row: number;
  col: number;
  torch: number;
  gold: number;
  /** Ô đã thấy mặt (chỉ số floor * 18 + row * 3 + col). */
  seen: number[];
  /** Ô đã đi qua. */
  visited: number[];
  /** Đang chờ người tới lượt chọn (rương không có chìa, lửa trại). */
  pending: { kind: 'chest' | 'camp'; v: number } | null;
}

export type LogKind =
  | 'fight'
  | 'spikes'
  | 'gas'
  | 'pit'
  | 'blade'
  | 'bladeKeep'
  | 'shield'
  | 'potion'
  | 'oil'
  | 'key'
  | 'gold'
  | 'chestKey'
  | 'chestBreak'
  | 'chestSkip'
  | 'campHeal'
  | 'campTorch'
  | 'stumble'
  | 'descend'
  | 'boss'
  | 'die'
  | 'escape';

export interface LogEntry {
  n: number;
  seat: number;
  kind: LogKind;
  v?: number;
  dmg?: number;
  /** Người được hồi máu (hợp tác: bình thuốc cho người yếu nhất). */
  to?: number;
}

export interface DungeonState extends BaseState {
  mode: Mode;
  seedMode: SeedMode;
  seed: number;
  /** Ngày của thử thách hôm nay; null khi hầm ngẫu nhiên. */
  day: string | null;
  floors: Card[][];
  boss: number;
  heroes: Hero[];
  expeds: Exped[];
  log: LogEntry[];
  started: boolean;
  done: boolean;
  wins: Record<string, number>;
}

export type Config = Partial<Pick<DungeonState, 'mode' | 'seedMode'>>;

export type DungeonAction =
  | { type: 'step'; col: number }
  | { type: 'choose'; option: 'open' | 'skip' | 'heal' | 'torch' }
  | { type: 'restart' }
  | { type: 'config'; config: Config };

export type DungeonParty = Party<DungeonState, DungeonAction>;

export const cellId = (floor: number, row: number, col: number) => floor * ROWS * COLS + row * COLS + col;

/** Đoàn của một ghế. */
export const expedOf = (s: Pick<DungeonState, 'mode' | 'expeds'>, seat: number) => (s.mode === 'coop' ? s.expeds[0] : s.expeds[seat]);

/** Sức trùm: hợp tác thì mạnh thêm theo số người. */
export const bossPower = (s: Pick<DungeonState, 'mode' | 'boss' | 'heroes'>) => (s.mode === 'coop' ? s.boss + 3 * (s.heroes.length - 1) : s.boss);

/** Đoàn đang đứng trước trùm (hết hàng cuối tầng 3). */
export const atGate = (e: Pick<Exped, 'floor' | 'row'>) => e.floor === FLOORS - 1 && e.row === ROWS - 1;

/** Các cột bước tới được ở hàng kế: chéo trái, thẳng, chéo phải (ở cửa tầng thì cả 3). */
export function reachable(e: Pick<Exped, 'row' | 'col'>): number[] {
  if (e.row < 0) return [0, 1, 2];
  return [e.col - 1, e.col, e.col + 1].filter((c) => c >= 0 && c < COLS);
}

/** Điểm cuối: còn sống hoặc đã thoát giữ nguyên vàng, gục giữa đường mất một nửa. */
export function scoreOf(s: DungeonState, seat: number): number {
  const gold = expedOf(s, seat).gold;
  if (s.mode === 'coop') return gold;
  return s.heroes[seat].status === 'dead' ? Math.floor(gold / 2) : gold;
}

function seedFor(seedMode: SeedMode, now: number): { seed: number; day: string | null } {
  if (seedMode === 'daily') {
    const day = dayOf(now);
    return { seed: hashSeed(`ham-nguc:${day}`), day };
  }
  return { seed: Math.floor(Math.random() * 2 ** 32) >>> 0, day: null };
}

const reveal = (seen: number[], floor: number, row: number) => {
  if (row >= ROWS) return seen;
  const add = [0, 1, 2].map((c) => cellId(floor, row, c)).filter((id) => !seen.includes(id));
  return add.length ? [...seen, ...add] : seen;
};

function newExped(): Exped {
  return { floor: 0, row: -1, col: 1, torch: START_TORCH, gold: 0, seen: reveal([], 0, 0), visited: [], pending: null };
}

export function fresh(players: Player[], mode: Mode = 'race', seedMode: SeedMode = 'daily', now = Date.now(), wins: Record<string, number> = {}): DungeonState {
  const seats = players.slice(0, MAX_PLAYERS);
  const { seed, day } = seedFor(seedMode, now);
  const d = buildDungeon(seed);
  return {
    ...baseState(),
    mode,
    seedMode,
    seed,
    day,
    floors: d.floors,
    boss: d.boss,
    heroes: seats.map((p) => ({ id: p.id, hp: MAX_HP, weapon: 1, shield: 0, keys: 0, status: 'in' })),
    expeds: mode === 'coop' ? [newExped()] : seats.map(() => newExped()),
    log: [],
    started: false,
    done: false,
    wins,
  };
}

/** Ghế kế tiếp còn đang trong hầm; null khi mọi người đã xong. */
function nextSeat(heroes: Hero[], from: number): number | null {
  for (let k = 1; k <= heroes.length; k++) {
    const i = (from + k) % heroes.length;
    if (heroes[i].status === 'in') return i;
  }
  return null;
}

/** Bộ đếm sửa đổi trong một lượt: gom thay đổi rồi dựng state mới một lần. */
class Turn {
  heroes: Hero[];
  exped: Exped;
  log: LogEntry[] = [];
  constructor(
    readonly s: DungeonState,
    readonly seat: number,
  ) {
    this.heroes = s.heroes.map((h) => ({ ...h }));
    this.exped = { ...expedOf(s, seat) };
  }
  get hero() {
    return this.heroes[this.seat];
  }
  note(kind: LogKind, extra: Omit<LogEntry, 'n' | 'seat' | 'kind'> = {}) {
    this.log.push({ n: 0, seat: this.seat, kind, ...extra });
  }
  /** Gây sát thương có khiên đỡ; trả về sát thương thật. */
  hurt(dmg: number, shieldable = true): number {
    const h = this.hero;
    if (dmg > 0 && shieldable && h.shield > 0) {
      h.shield -= 1;
      dmg = Math.max(0, dmg - SHIELD_BLOCK);
    }
    h.hp -= dmg;
    return dmg;
  }
  checkDeath() {
    const h = this.hero;
    if (h.status === 'in' && h.hp <= 0) {
      h.hp = 0;
      h.status = 'dead';
      this.note('die');
      return true;
    }
    return false;
  }
  heal(v: number) {
    if (this.s.mode === 'coop') {
      // Hợp tác: thuốc chảy về người yếu nhất trong đội.
      let to = this.seat;
      this.heroes.forEach((h, i) => {
        if (h.status === 'in' && h.hp < this.heroes[to].hp) to = i;
      });
      this.heroes[to].hp = Math.min(MAX_HP, this.heroes[to].hp + v);
      return to;
    }
    this.hero.hp = Math.min(MAX_HP, this.hero.hp + v);
    return this.seat;
  }
  /** Xuống tầng kế; hết tầng 3 thì gặp trùm. */
  descend() {
    const e = this.exped;
    if (e.floor + 1 >= FLOORS) {
      // Đứng trước cửa ra: hợp tác mà người đánh trùm gục thì người kế tiếp đánh lại từ đây.
      e.row = ROWS - 1;
      return this.bossFight();
    }
    e.floor += 1;
    e.row = -1;
    e.col = 1;
    if (e.torch > 0) e.seen = reveal(e.seen, e.floor, 0);
    this.note('descend', { v: e.floor + 1 });
  }
  bossFight() {
    const atk = this.s.mode === 'coop' ? this.heroes.filter((h) => h.status === 'in').reduce((a, h) => a + h.weapon, 0) : this.hero.weapon;
    const dmg = this.hurt(Math.max(0, bossPower(this.s) - atk));
    this.note('boss', { v: bossPower(this.s), dmg });
    if (this.checkDeath()) return;
    this.exped.gold += BOSS_GOLD;
    this.exped.row = ROWS;
    if (this.s.mode === 'coop') {
      for (const h of this.heroes) if (h.status === 'in') h.status = 'out';
    } else this.hero.status = 'out';
    this.note('escape');
  }
  /** Lá bài của ô vừa bước vào. */
  resolve(card: Card) {
    const h = this.hero;
    const e = this.exped;
    switch (card.t) {
      case 'monster': {
        const dmg = this.hurt(Math.max(0, card.v - h.weapon));
        this.note('fight', { v: card.v, dmg });
        if (!this.checkDeath()) e.gold += card.v;
        return;
      }
      case 'spikes':
        this.note('spikes', { v: card.v, dmg: this.hurt(card.v) });
        this.checkDeath();
        return;
      case 'gas':
        e.torch = Math.max(0, e.torch - card.v);
        this.note('gas', { v: card.v });
        return;
      case 'pit':
        this.hurt(PIT_DAMAGE, false);
        this.note('pit', { dmg: PIT_DAMAGE });
        if (!this.checkDeath()) this.descend();
        return;
      case 'blade':
        if (card.v > h.weapon) {
          h.weapon = card.v;
          this.note('blade', { v: card.v });
        } else this.note('bladeKeep', { v: card.v });
        return;
      case 'shield':
        h.shield = Math.min(MAX_SHIELD, h.shield + 1);
        this.note('shield');
        return;
      case 'potion':
        this.note('potion', { v: card.v, to: this.heal(card.v) });
        return;
      case 'oil':
        e.torch += card.v;
        this.note('oil', { v: card.v });
        return;
      case 'key':
        h.keys += 1;
        this.note('key');
        return;
      case 'gold':
        e.gold += card.v;
        this.note('gold', { v: card.v });
        return;
      case 'chest':
        if (h.keys > 0) {
          h.keys -= 1;
          e.gold += card.v;
          this.note('chestKey', { v: card.v });
        } else e.pending = { kind: 'chest', v: card.v };
        return;
      case 'camp':
        e.pending = { kind: 'camp', v: 0 };
        return;
    }
  }
  /** Xong ô: soi hàng kế bằng đuốc, hết hàng cuối thì xuống tầng. */
  afterCell() {
    const e = this.exped;
    if (this.hero.status !== 'in' || e.pending) return;
    if (e.row >= ROWS - 1) this.descend();
    else if (e.torch > 0) e.seen = reveal(e.seen, e.floor, e.row + 1);
  }
  commit(): DungeonState {
    const s = this.s;
    const expeds = s.mode === 'coop' ? [this.exped] : s.expeds.map((e, i) => (i === this.seat ? this.exped : e));
    let n = s.log.length ? s.log[s.log.length - 1].n : 0;
    const log = [...s.log, ...this.log.map((l) => ({ ...l, n: ++n }))].slice(-12);
    // Còn chờ chọn thì người này giữ lượt.
    const keep = this.exped.pending && this.hero.status === 'in';
    const next = keep ? this.seat : nextSeat(this.heroes, this.seat);
    const done = next === null;
    let wins = s.wins;
    const out: DungeonState = { ...s, heroes: this.heroes, expeds, log, started: true, turn: next ?? s.turn, done, seq: s.seq + 1 };
    if (done) {
      wins = { ...wins };
      if (s.mode === 'coop') {
        if (this.heroes.some((h) => h.status === 'out')) for (const h of this.heroes) wins[h.id] = (wins[h.id] ?? 0) + 1;
      } else {
        const scores = this.heroes.map((_, i) => scoreOf(out, i));
        const best = Math.max(...scores);
        this.heroes.forEach((h, i) => scores[i] === best && best > 0 && (wins[h.id] = (wins[h.id] ?? 0) + 1));
      }
    }
    return { ...out, wins };
  }
}

export function step(s: DungeonState, seat: number, col: number): DungeonState {
  const e0 = expedOf(s, seat);
  if (e0.pending) return s;
  if (atGate(e0)) {
    const g = new Turn(s, seat);
    g.bossFight();
    return g.commit();
  }
  if (!reachable(e0).includes(col)) return s;
  const t = new Turn(s, seat);
  const e = t.exped;
  e.row += 1;
  e.col = col;
  // Đuốc cháy mỗi bước; đi trong tối thì vấp ngã.
  if (e.torch > 0) e.torch -= 1;
  else {
    t.hurt(1, false);
    t.note('stumble', { dmg: 1 });
    if (t.checkDeath()) return t.commit();
  }
  const id = cellId(e.floor, e.row, e.col);
  e.visited = [...e.visited, id];
  if (!e.seen.includes(id)) e.seen = [...e.seen, id];
  t.resolve(s.floors[e.floor][e.row * COLS + e.col]);
  t.afterCell();
  return t.commit();
}

export function choose(s: DungeonState, seat: number, option: 'open' | 'skip' | 'heal' | 'torch'): DungeonState {
  const p = expedOf(s, seat).pending;
  if (!p) return s;
  if (p.kind === 'chest' && option !== 'open' && option !== 'skip') return s;
  if (p.kind === 'camp' && option !== 'heal' && option !== 'torch') return s;
  const t = new Turn(s, seat);
  t.exped.pending = null;
  if (option === 'open') {
    t.hurt(CHEST_COST, false);
    t.note('chestBreak', { v: p.v, dmg: CHEST_COST });
    if (!t.checkDeath()) t.exped.gold += p.v;
  } else if (option === 'skip') t.note('chestSkip', { v: p.v });
  else if (option === 'heal') {
    if (s.mode === 'coop') {
      // Hợp tác: lửa trại sưởi cả đội, mỗi người ít hơn một chút.
      for (const h of t.heroes) if (h.status === 'in') h.hp = Math.min(MAX_HP, h.hp + CAMP_HEAL - 1);
    } else t.hero.hp = Math.min(MAX_HP, t.hero.hp + CAMP_HEAL);
    t.note('campHeal', { v: s.mode === 'coop' ? CAMP_HEAL - 1 : CAMP_HEAL });
  } else {
    t.exped.torch += CAMP_TORCH;
    t.note('campTorch', { v: CAMP_TORCH });
  }
  t.afterCell();
  return t.commit();
}

export const dungeonGame: GameDef<DungeonState, DungeonAction> = {
  id: 'ham-nguc',
  init: (players) => fresh(players),
  configOf: (s) => ({ mode: s.mode, seedMode: s.seedMode }),
  // Bỏ lượt người mất kết nối: chuyển cho người kế (lựa chọn đang chờ thì bỏ qua rương / lấy máu).
  advance(s) {
    if (s.done) return s;
    const p = expedOf(s, s.turn).pending;
    if (p) return choose(s, s.turn, p.kind === 'chest' ? 'skip' : 'heal');
    const next = nextSeat(s.heroes, s.turn);
    return next === null ? s : { ...s, turn: next, seq: s.seq + 1 };
  },
  reduce(s, a, c) {
    if (a.type === 'config') {
      if (!c.host || s.started) return s;
      const mode: Mode = a.config.mode === 'coop' ? 'coop' : 'race';
      const seedMode: SeedMode = a.config.seedMode === 'random' ? 'random' : 'daily';
      return { ...fresh(c.players, mode, seedMode, c.now ?? Date.now(), s.wins), seq: s.seq + 1 };
    }
    if (a.type === 'restart') {
      if (!c.host || !s.done) return s;
      return { ...fresh(c.players, s.mode, s.seedMode, c.now ?? Date.now(), s.wins), seq: s.seq + 1 };
    }
    if (s.done) return s;
    const seat = s.heroes.findIndex((h) => h.id === c.from);
    if (seat < 0 || seat !== s.turn || s.heroes[seat].status !== 'in') return s;
    if (a.type === 'step') return Number.isInteger(a.col) ? step(s, seat, a.col) : s;
    if (a.type === 'choose') return choose(s, seat, a.option);
    return s;
  },
};
