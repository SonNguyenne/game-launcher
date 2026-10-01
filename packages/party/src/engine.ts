/**
 * Luật chơi của mỗi game là một reducer thuần: (trạng thái, hành động) -> trạng thái mới.
 * Chơi 1 máy: reducer chạy ngay trên máy. Chơi phòng: chỉ máy chủ phòng chạy reducer,
 * rồi gửi trạng thái mới cho cả phòng. Nhờ vậy hai chế độ dùng chung một luật.
 */

export interface Player {
  id: string;
  name: string;
  /** Chỉ có ở chế độ phòng: false khi máy đó đang mất kết nối. */
  online?: boolean;
}

/** Kết quả của một lượt, hiện thành thẻ ở đáy màn hình. */
export interface Result {
  seq: number;
  playerId: string;
  text: string;
  detail?: string;
  /** true: an toàn, không phải uống. */
  safe?: boolean;
}

export interface BaseState {
  turn: number;
  /** Tăng mỗi lần trạng thái đổi lượt, để bỏ qua bấm trùng từ nhiều máy. */
  seq: number;
  result: Result | null;
}

export interface ReduceContext {
  /** Người gửi hành động. Chơi 1 máy: luôn là người đang tới lượt. */
  from: string;
  players: Player[];
  /** Người gửi là chủ phòng (chơi 1 máy luôn đúng). */
  host: boolean;
  /** Giờ chung của phòng (ms, đã khớp giờ server) lúc chạy luật; máy nào cũng tính đồng hồ theo mốc này. */
  now?: number;
}

export interface GameAction {
  type: string;
}

export interface GameDef<S extends BaseState, A extends GameAction> {
  /** Trùng id mini app; máy vào phòng phải cùng game. */
  id: string;
  init(players: Player[]): S;
  reduce(state: S, action: A, ctx: ReduceContext): S;
  /** Sang lượt kế tiếp: dọn dữ liệu của lượt cũ. */
  advance(state: S, c?: ReduceContext): S;
  /**
   * Game có cài đặt: lấy phần cài đặt ra khỏi trạng thái.
   * Chủ phòng chỉnh ở phòng chờ; lúc bắt đầu, launcher gửi { type: 'config', config } vào reduce để áp vào ván mới.
   */
  configOf?(state: S): Partial<S>;
}

/** Hành động chung cho mọi game, do launcher xử lý trước khi tới reducer của game. */
export type CommonAction = { type: 'next'; seq: number } | { type: 'skip' };

export const baseState = (): BaseState => ({ turn: 0, seq: 0, result: null });

export function playerAt(players: Player[], turn: number): Player | undefined {
  if (!players.length) return undefined;
  return players[((turn % players.length) + players.length) % players.length];
}

export const isTurnOf = (s: BaseState, c: ReduceContext) => playerAt(c.players, s.turn)?.id === c.from;

export function withResult<S extends BaseState>(s: S, r: Omit<Result, 'seq'>): S {
  const seq = s.seq + 1;
  return { ...s, seq, result: { ...r, seq } };
}

/** Phần chung của advance: sang người kế, xóa kết quả. */
export const nextTurn = <S extends BaseState>(s: S): S => ({ ...s, turn: s.turn + 1, seq: s.seq + 1, result: null });

export function runReduce<S extends BaseState, A extends GameAction>(
  game: GameDef<S, A>,
  s: S,
  a: A | CommonAction,
  c: ReduceContext,
): S {
  if (a.type === 'next') {
    const seq = (a as { seq: number }).seq;
    return s.result && s.result.seq === seq ? game.advance(s, c) : s;
  }
  // Chủ phòng bỏ lượt người đang mất kết nối để cả bàn không phải chờ.
  if (a.type === 'skip') return c.host ? game.advance(s, c) : s;
  return game.reduce(s, a as A, c);
}

export const randomInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

/** Chọn một chỉ số chưa dùng gần đây; dùng hết thì làm lại từ đầu. */
export function pickFresh(total: number, used: number[]): { index: number; used: number[] } {
  const pool = Array.from({ length: total }, (_, i) => i).filter((i) => !used.includes(i));
  const from = pool.length ? pool : Array.from({ length: total }, (_, i) => i);
  const index = from[Math.floor(Math.random() * from.length)];
  return { index, used: pool.length ? [...used, index] : [index] };
}

export function shuffle<T>(list: readonly T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
