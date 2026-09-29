import { baseState, isTurnOf, nextTurn, playerAt, randomInt, withResult, type BaseState, type GameDef } from '@bang/party';
import { strings } from './strings';

export interface BombState extends BaseState {
  taps: number;
  /** Số lần chuyền thì nổ. Nằm trong trạng thái nhưng giao diện không bao giờ hiện ra. */
  fuse: number;
  /** Hình phạt khi bom nổ, do người chơi tùy chỉnh. */
  penaltyText?: string;
}

export type BombConfig = { penaltyText?: string };

export type BombAction = { type: 'tap' } | { type: 'config'; config: BombConfig };

const newFuse = () => randomInt(5, 18);

export const bombGame: GameDef<BombState, BombAction> = {
  id: 'chuyen-bom',
  init: () => ({ ...baseState(), taps: 0, fuse: newFuse() }),
  configOf: (s) => ({ penaltyText: s.penaltyText }),
  // Sau khi nổ: ván mới bắt đầu từ người kế tiếp.
  advance: (s) => ({ ...nextTurn(s), taps: 0, fuse: newFuse(), penaltyText: s.penaltyText }),
  reduce(s, a, c) {
    if (a.type === 'config') {
      if (!c.host || s.taps > 0) return s;
      return { ...s, penaltyText: a.config.penaltyText, seq: s.seq + 1 };
    }
    if (a.type !== 'tap' || s.result || !isTurnOf(s, c)) return s;
    const taps = s.taps + 1;
    if (taps >= s.fuse) {
      const text = s.penaltyText?.trim() || strings.explode;
      return withResult({ ...s, taps }, { playerId: playerAt(c.players, s.turn)!.id, text, detail: strings.detail(taps) });
    }
    // Chuyền bom: sang người kế mà không có thẻ kết quả.
    return { ...s, taps, turn: s.turn + 1, seq: s.seq + 1 };
  },
};
