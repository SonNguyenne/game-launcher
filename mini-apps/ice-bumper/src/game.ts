import { baseState, withResult, type BaseState, type GameDef, type Party, type Player } from '@bang/party';
import { skinFor, type PenguinSkin } from './avatar';
import { COUNTDOWN_MS, ROUND_SECONDS, SCALE, SLIP, arenaOf } from './sim';
import { MAPS, MAP_IDS, type MapChoice, type MapId } from './maps';
import { strings } from './strings';

export const ROUND_OPTIONS = [3, 5, 7] as const;
/** Thời gian mỗi hiệp (giây); 0 là vô hạn: chỉ hết hiệp khi còn một người trên băng. */
export const ROUND_TIME_OPTIONS = [30, 60, 90, 120, 0] as const;

/**
 * Trạng thái ván lưu qua party (đổi ít: vào hiệp, hết hiệp, đổi áo).
 * Vị trí từng con cánh cụt không nằm ở đây mà đi qua kênh thời gian thực (xem Arena.tsx).
 */
export interface SnowarState extends BaseState {
  /** garage: chọn áo trước trận; playing: đang đấu; round_over: hết hiệp; game_over: hết trận. */
  stage: 'garage' | 'playing' | 'round_over' | 'game_over';
  maxRounds: number;
  /** Thời gian mỗi hiệp (giây), 0 là vô hạn. */
  roundSeconds: number;
  /** Cài đặt của chủ phòng: bản đồ (hoặc ngẫu nhiên mỗi hiệp), cỡ sân, độ trơn. */
  map: MapChoice;
  /** Cỡ sân (nhân với bán kính chuẩn), SCALE.min..max. */
  scale: number;
  /** Độ trơn 0 (bám) .. 1 (rất trơn). */
  slip: number;
  /** Bản đồ của hiệp đang chơi (đã bốc nếu chọn ngẫu nhiên). */
  roundMap: MapId;
  round: number;
  /** Những người được vào hiệp này (vào phòng giữa hiệp thì đứng xem tới hiệp sau). */
  roster: string[];
  /** Giờ chung của phòng lúc đếm ngược 3-2-1 bắt đầu. */
  startedAt: number;
  /** Số hiệp thắng. */
  wins: Record<string, number>;
  /** Số lần đẩy được người khác xuống nước. */
  kos: Record<string, number>;
  winnerId: string | null;
  skins: Record<string, PenguinSkin>;
}

export type SnowarParty = Party<SnowarState, SnowarAction>;
export type Config = Partial<Pick<SnowarState, 'maxRounds' | 'roundSeconds' | 'map' | 'scale' | 'slip'>>;

export type SnowarAction =
  | { type: 'config'; config: Config }
  | { type: 'set_skin'; skin: PenguinSkin }
  | { type: 'start' }
  /** Chủ phòng báo hết hiệp: người trụ lại (null nếu cùng rơi) và ai đẩy được ai trong hiệp. */
  | { type: 'round_end'; round: number; winnerId: string | null; kos: Record<string, number>; timeUp?: boolean };

const fresh = (): SnowarState => ({
  ...baseState(),
  stage: 'garage',
  maxRounds: 3,
  roundSeconds: ROUND_SECONDS,
  map: 'floe',
  scale: SCALE.default,
  slip: SLIP.default,
  roundMap: 'floe',
  round: 0,
  roster: [],
  startedAt: 0,
  wins: {},
  kos: {},
  winnerId: null,
  skins: {},
});

/** Ngẫu nhiên: không lặp lại bản đồ của hiệp vừa chơi. */
function pickMap(s: SnowarState): MapId {
  if (s.map !== 'random') return s.map;
  const pool = MAP_IDS.filter((id) => id !== s.roundMap);
  return pool[Math.floor(Math.random() * pool.length)];
}

function newRound(s: SnowarState, players: Player[], now: number): SnowarState {
  return {
    ...s,
    roundMap: pickMap(s),
    stage: 'playing',
    round: s.round + 1,
    roster: players.map((p) => p.id),
    startedAt: now + 400,
    winnerId: null,
    result: null,
    seq: s.seq + 1,
  };
}

/** Người thắng chung cuộc: nhiều hiệp nhất, hòa thì ai đẩy được nhiều hơn. */
export function standings(s: SnowarState, players: Player[]) {
  return players
    .map((p) => ({ p, wins: s.wins[p.id] ?? 0, kos: s.kos[p.id] ?? 0 }))
    .sort((a, b) => b.wins - a.wins || b.kos - a.kos);
}

export const skinOf = (s: SnowarState, players: Player[], id: string) => s.skins[id] ?? skinFor(Math.max(0, players.findIndex((p) => p.id === id)));

/** Sân của hiệp đang chơi. */
export const arenaOfState = (s: SnowarState) => arenaOf(s.roundMap, s.scale, s.slip);

/** Hiệp bắt đầu được lái khi hết đếm ngược. */
export const controlStartsAt = (s: SnowarState) => s.startedAt + COUNTDOWN_MS;

export const iceBumperGame: GameDef<SnowarState, SnowarAction> = {
  id: 'ice-bumper',
  init: fresh,
  configOf: (s) => ({ maxRounds: s.maxRounds, roundSeconds: s.roundSeconds, map: s.map, scale: s.scale, slip: s.slip }),
  advance(s, c) {
    // Hết trận: về chọn áo, xóa điểm. Hết hiệp: vào hiệp sau với những người đang trong phòng.
    if (s.stage === 'game_over') return { ...fresh(), maxRounds: s.maxRounds, roundSeconds: s.roundSeconds, map: s.map, scale: s.scale, slip: s.slip, skins: s.skins, seq: s.seq + 1 };
    if (s.stage === 'round_over') return newRound(s, c?.players ?? [], c?.now ?? Date.now());
    return s;
  },
  reduce(s, a, c) {
    if (a.type === 'config') {
      if (!c.host || s.stage !== 'garage') return s;
      const { maxRounds, roundSeconds, map, scale, slip } = a.config;
      const next = { ...s };
      if (ROUND_OPTIONS.includes(maxRounds as (typeof ROUND_OPTIONS)[number])) next.maxRounds = maxRounds as number;
      if (ROUND_TIME_OPTIONS.includes(roundSeconds as (typeof ROUND_TIME_OPTIONS)[number])) next.roundSeconds = roundSeconds as number;
      if (map === 'random' || (map && map in MAPS)) next.map = map;
      const inRange = (v: unknown, r: { min: number; max: number }): v is number => typeof v === 'number' && v >= r.min && v <= r.max;
      if (inRange(scale, SCALE)) next.scale = Math.round(scale * 100) / 100;
      if (inRange(slip, SLIP)) next.slip = Math.round(slip * 100) / 100;
      return { ...next, seq: s.seq + 1 };
    }
    if (a.type === 'set_skin') {
      if (!c.players.some((p) => p.id === c.from)) return s;
      const { color, hat } = a.skin;
      if (typeof color !== 'string' || typeof hat !== 'string') return s;
      return { ...s, skins: { ...s.skins, [c.from]: { color, hat } } };
    }
    if (a.type === 'start') {
      if (!c.host || s.stage !== 'garage' || !c.players.length) return s;
      return newRound({ ...s, round: 0, wins: {}, kos: {} }, c.players, c.now ?? Date.now());
    }
    if (a.type === 'round_end') {
      if (!c.host || s.stage !== 'playing' || a.round !== s.round) return s;
      const wins = { ...s.wins };
      if (a.winnerId) wins[a.winnerId] = (wins[a.winnerId] ?? 0) + 1;
      const kos = { ...s.kos };
      for (const [id, n] of Object.entries(a.kos)) if (typeof n === 'number') kos[id] = (kos[id] ?? 0) + n;
      const over = s.round >= s.maxRounds;
      const next: SnowarState = { ...s, stage: over ? 'game_over' : 'round_over', winnerId: a.winnerId, wins, kos };
      const name = (id: string | null) => c.players.find((p) => p.id === id)?.name ?? '';
      if (over) {
        const [top] = standings(next, c.players);
        return withResult(next, { playerId: top?.p.id ?? '', text: strings.champion(top?.p.name ?? '', top?.wins ?? 0), safe: true });
      }
      return withResult(next, {
        playerId: a.winnerId ?? c.players[0]?.id ?? '',
        text: a.winnerId ? (a.timeUp ? strings.timeWin(name(a.winnerId)) : strings.roundWin(name(a.winnerId))) : strings.roundDraw,
        safe: true,
      });
    }
    return s;
  },
};
