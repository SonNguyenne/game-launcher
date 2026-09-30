import {
  baseState,
  withResult,
  type BaseState,
  type GameDef,
  type Party,
} from '@bang/party';
import type { PenguinSkin } from './avatar';

export interface Snowball {
  id: number;
  ownerId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface PlayerVehicle {
  id: string;
  name: string;
  skin: PenguinSkin;
  x: number; // Tọa độ tương đối so với tâm đảo (0, 0 là tâm)
  y: number;
  vx: number;
  vy: number;
  angle: number; // Hướng xe đang chỉ (radian)
  snowballRadius: number; // Kích thước bóng tuyết đang ủi đằng trước
  alive: boolean;
  score: number;
}

export interface SnowarState extends BaseState {
  stage: 'lobby' | 'playing' | 'round_over' | 'game_over';
  iceRadius: number; // Bán kính chuẩn của đảo băng (tính theo đơn vị ảo 1.0 -> scale theo canvas)
  roundStartedAt: number;
  roundEndsAt: number;
  round: number;
  maxRounds: number;
  vehicles: Record<string, PlayerVehicle>;
  snowballs: Snowball[];
  winnerId: string | null;
  lobbySkins: Record<string, PenguinSkin>;
}

export type SnowarParty = Party<SnowarState, SnowarAction>;

export type SnowarAction =
  | { type: 'set_skin'; skin: PenguinSkin }
  | { type: 'start_game' }
  | { type: 'steer'; angle: number; rolling: boolean }
  | { type: 'shoot_ball'; ball: Snowball }
  | {
      type: 'sync_world';
      vehicles: Record<string, PlayerVehicle>;
      snowballs: Snowball[];
    }
  | { type: 'round_win'; winnerId: string | null }
  | { type: 'next_round' }
  | { type: 'restart' };

export const ARENA_STANDARD_RADIUS = 280; // Bán kính chuẩn trên tọa độ tương đối
export const ROUND_DURATION_SEC = 45;

function fresh(): SnowarState {
  return {
    ...baseState(),
    stage: 'lobby',
    iceRadius: ARENA_STANDARD_RADIUS,
    roundStartedAt: 0,
    roundEndsAt: 0,
    round: 1,
    maxRounds: 3,
    vehicles: {},
    snowballs: [],
    winnerId: null,
    lobbySkins: {},
  };
}

export function spawnPositions(count: number, r = 110): { x: number; y: number; angle: number }[] {
  const result = [];
  for (let i = 0; i < count; i++) {
    const angle = (i * 2 * Math.PI) / Math.max(1, count);
    result.push({
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * (r * 0.58),
      angle: angle + Math.PI, // Hướng đầu xe quay vào tâm đảo
    });
  }
  return result;
}

function initVehicles(
  players: { id: string; name: string }[],
  savedSkins: Record<string, PenguinSkin>,
  previousVehicles: Record<string, PlayerVehicle> = {},
): Record<string, PlayerVehicle> {
  const spawns = spawnPositions(players.length);
  const vehicles: Record<string, PlayerVehicle> = {};

  players.forEach((p, idx) => {
    const sp = spawns[idx] ?? { x: 0, y: 0, angle: 0 };
    vehicles[p.id] = {
      id: p.id,
      name: p.name,
      skin: savedSkins[p.id] ?? {
        color: idx % 2 === 0 ? '#ef4444' : '#3b82f6',
        hat: 'beanie',
        name: p.name,
      },
      x: sp.x,
      y: sp.y,
      vx: 0,
      vy: 0,
      angle: sp.angle,
      snowballRadius: 10,
      alive: true,
      score: previousVehicles[p.id]?.score ?? 0,
    };
  });

  return vehicles;
}

export const iceBumperGame: GameDef<SnowarState, SnowarAction> = {
  id: 'ice-bumper',
  init: fresh,
  configOf: (s) => ({
    maxRounds: s.maxRounds,
  }),
  advance(s) {
    if (s.stage === 'game_over') {
      return {
        ...fresh(),
        lobbySkins: s.lobbySkins,
        seq: s.seq + 1,
      };
    }

    const nextVehicles: Record<string, PlayerVehicle> = {};
    const spawns = spawnPositions(Object.keys(s.vehicles).length);
    Object.values(s.vehicles).forEach((v, idx) => {
      const sp = spawns[idx] ?? { x: 0, y: 0, angle: 0 };
      nextVehicles[v.id] = {
        ...v,
        x: sp.x,
        y: sp.y,
        vx: 0,
        vy: 0,
        angle: sp.angle,
        alive: true,
        snowballRadius: 10,
      };
    });

    const now = Date.now();
    return {
      ...s,
      stage: 'playing',
      round: s.round + 1,
      roundStartedAt: now,
      roundEndsAt: now + ROUND_DURATION_SEC * 1000,
      vehicles: nextVehicles,
      snowballs: [],
      winnerId: null,
      result: null,
      seq: s.seq + 1,
    };
  },
  reduce(s, a, c) {
    if (a.type === 'set_skin') {
      const from = c.from;
      if (!from) return s;
      return {
        ...s,
        lobbySkins: {
          ...s.lobbySkins,
          [from]: a.skin,
        },
      };
    }

    if (a.type === 'start_game') {
      if (!c.host) return s;
      const vehicles = initVehicles(c.players, s.lobbySkins);
      const now = Date.now();
      return {
        ...s,
        stage: 'playing',
        roundStartedAt: now,
        roundEndsAt: now + ROUND_DURATION_SEC * 1000,
        vehicles,
        snowballs: [],
        winnerId: null,
        result: null,
        seq: s.seq + 1,
      };
    }

    if (a.type === 'steer') {
      const from = c.from;
      if (!from || !s.vehicles[from] || !s.vehicles[from].alive) return s;
      return {
        ...s,
        vehicles: {
          ...s.vehicles,
          [from]: {
            ...s.vehicles[from],
            angle: a.angle,
            vx: a.rolling ? Math.cos(a.angle) * 3.6 : s.vehicles[from].vx * 0.88,
            vy: a.rolling ? Math.sin(a.angle) * 3.6 : s.vehicles[from].vy * 0.88,
          },
        },
      };
    }
    if (a.type === 'shoot_ball') {
      return {
        ...s,
        snowballs: [...s.snowballs, a.ball],
      };
    }

    if (a.type === 'sync_world') {
      if (!c.host) return s;
      return {
        ...s,
        vehicles: a.vehicles,
        snowballs: a.snowballs,
      };
    }

    if (a.type === 'round_win') {
      if (!c.host || s.stage !== 'playing') return s;
      const winId = a.winnerId;
      const nextVehicles = { ...s.vehicles };
      if (winId && nextVehicles[winId]) {
        nextVehicles[winId] = {
          ...nextVehicles[winId],
          score: nextVehicles[winId].score + 1,
        };
      }

      const isGameOver = s.round >= s.maxRounds;
      const winnerPlayer = c.players.find((p) => p.id === winId);
      const winText = winnerPlayer ? `🏆 ${winnerPlayer.name} sống sót cuối cùng!` : 'Hòa ván!';

      return withResult(
        {
          ...s,
          stage: isGameOver ? 'game_over' : 'round_over',
          winnerId: winId,
          vehicles: nextVehicles,
          seq: s.seq + 1,
        },
        {
          playerId: winId ?? c.players[0]?.id ?? '',
          text: winText,
          safe: true,
        },
      );
    }

    if (a.type === 'next_round') {
      if (!c.host || s.stage !== 'round_over') return s;
      return iceBumperGame.advance(s);
    }

    if (a.type === 'restart') {
      if (!c.host) return s;
      return {
        ...fresh(),
        lobbySkins: s.lobbySkins,
        seq: s.seq + 1,
      };
    }

    return s;
  },
};
