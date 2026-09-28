import { baseState, isTurnOf, nextTurn, playerAt, randomInt, withResult, type BaseState, type GameDef } from '@bang/party';
import { strings, type Level, type Slice } from './strings';

export interface Spin {
  id: number;
  slice: number;
  /** Số vòng quay thêm và độ lệch trong ô: do máy giữ luật chọn để mọi máy quay giống nhau. */
  turns: number;
  offset: number;
}

export interface WheelState extends BaseState {
  level: Level;
  spin: Spin | null;
  /** Vài kết quả gần nhất, mới nhất đứng đầu. */
  history: { playerId: string; short: string }[];
}

export type WheelAction = { type: 'spin' } | { type: 'config'; config: Partial<Pick<WheelState, 'level'>> };

export const wheelOf = (level: Level): readonly Slice[] => strings.wheels[level];

export const wheelGame: GameDef<WheelState, WheelAction> = {
  id: 'vong-quay',
  init: () => ({ ...baseState(), level: 'vua', spin: null, history: [] }),
  configOf: (s) => ({ level: s.level }),
  advance(s) {
    // "Quay thêm lần nữa": xóa kết quả nhưng giữ nguyên người đang tới lượt.
    const again = s.spin && wheelOf(s.level)[s.spin.slice]?.kind === 'again';
    const next = nextTurn(s);
    return again ? { ...next, turn: s.turn } : next;
  },
  reduce(s, a, c) {
    if (a.type === 'config') {
      // Mức độ chọn ở phòng chờ, áp vào lúc bắt đầu ván.
      const { level } = a.config;
      if (!c.host || s.result || !level || !(level in strings.wheels)) return s;
      return { ...s, level, spin: null, seq: s.seq + 1 };
    }
    if (a.type !== 'spin' || s.result || !isTurnOf(s, c)) return s;
    const wheel = wheelOf(s.level);
    const slice = randomInt(0, wheel.length - 1);
    const item = wheel[slice];
    const who = playerAt(c.players, s.turn)!.id;
    const spin = { id: (s.spin?.id ?? 0) + 1, slice, turns: randomInt(5, 7), offset: randomInt(-16, 16) };
    return withResult(
      { ...s, spin, history: [{ playerId: who, short: item.short }, ...s.history].slice(0, 4) },
      { playerId: who, text: item.text, safe: item.kind === 'safe' },
    );
  },
};
