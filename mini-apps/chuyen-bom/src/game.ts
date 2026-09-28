import { baseState, isTurnOf, nextTurn, playerAt, randomInt, withResult, type BaseState, type GameDef } from '@bang/party';
import { strings } from './strings';

export interface BombState extends BaseState {
  taps: number;
  /** Số lần chuyền thì nổ. Nằm trong trạng thái nhưng giao diện không bao giờ hiện ra. */
  fuse: number;
}

export type BombAction = { type: 'tap' };

const newFuse = () => randomInt(5, 18);

export const bombGame: GameDef<BombState, BombAction> = {
  id: 'chuyen-bom',
  init: () => ({ ...baseState(), taps: 0, fuse: newFuse() }),
  // Sau khi nổ: ván mới bắt đầu từ người kế tiếp.
  advance: (s) => ({ ...nextTurn(s), taps: 0, fuse: newFuse() }),
  reduce(s, a, c) {
    if (a.type !== 'tap' || s.result || !isTurnOf(s, c)) return s;
    const taps = s.taps + 1;
    if (taps >= s.fuse) {
      return withResult({ ...s, taps }, { playerId: playerAt(c.players, s.turn)!.id, text: strings.explode, detail: strings.detail(taps) });
    }
    // Chuyền bom: sang người kế mà không có thẻ kết quả.
    return { ...s, taps, turn: s.turn + 1, seq: s.seq + 1 };
  },
};
