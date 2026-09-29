import { baseState, isTurnOf, nextTurn, pickFresh, playerAt, randomInt, withResult, type BaseState, type GameDef, type Player } from '@bang/party';
import { decks, strings, type Kind, type Level } from './strings';

export interface Card {
  id: number;
  kind: Kind;
  /** Nội dung đã thay {p} bằng tên thật, để mọi máy thấy cùng một câu. */
  text: string;
  /** Máy chọn loại câu thay người chơi. */
  random?: boolean;
}

export interface TdState extends BaseState {
  level: Level;
  card: Card | null;
  /** Đã dùng lượt đổi câu trong lượt này chưa. */
  swapped: boolean;
  /** Câu đã rút gần đây theo từng bộ, để không lặp lại cho tới khi hết bộ. */
  used: Record<string, number[]>;
  /** Tùy chỉnh hình phạt khi không dám làm cho từng mức. */
  customPenalties?: Partial<Record<Level, string>>;
}

export type TdConfig = { level?: Level; customPenalties?: Partial<Record<Level, string>> };

export type TdAction =
  | { type: 'pick'; kind: Kind | 'random' }
  | { type: 'swap' }
  | { type: 'done' }
  | { type: 'refuse' }
  | { type: 'config'; config: TdConfig };

function fill(template: string, players: Player[], selfId: string) {
  const others = players.filter((p) => p.id !== selfId);
  const name = others.length ? others[randomInt(0, others.length - 1)].name : 'người bên cạnh';
  return template.replace('{p}', name);
}

function draw(s: TdState, kind: Kind, players: Player[], random?: boolean): TdState {
  const deckKey = `${s.level}-${kind}`;
  const deck = decks[s.level][kind];
  const { index, used } = pickFresh(deck.length, s.used[deckKey] ?? []);
  const self = playerAt(players, s.turn)?.id ?? '';
  const card = { id: (s.card?.id ?? s.seq) + 1, kind, text: fill(deck[index], players, self), random };
  return { ...s, card, used: { ...s.used, [deckKey]: used }, seq: s.seq + 1 };
}

export const tdGame: GameDef<TdState, TdAction> = {
  id: 'that-hay-thach',
  init: () => ({ ...baseState(), level: 'vui', card: null, swapped: false, used: {} }),
  configOf: (s) => ({ level: s.level, customPenalties: s.customPenalties }),
  advance: (s) => ({ ...nextTurn(s), card: null, swapped: false, customPenalties: s.customPenalties }),
  reduce(s, a, c) {
    if (s.result) return s;
    if (a.type === 'config') {
      const { level, customPenalties } = a.config;
      if (!c.host || s.card) return s;
      const nextLevel = level && level in decks ? level : s.level;
      return { ...s, level: nextLevel, customPenalties: customPenalties ?? s.customPenalties, seq: s.seq + 1 };
    }
    // "Xong" thì chủ phòng bấm hộ được, khi người chơi quên.
    if (a.type === 'done') return s.card && (isTurnOf(s, c) || c.host) ? tdGame.advance(s) : s;
    if (!isTurnOf(s, c)) return s;
    if (a.type === 'pick') {
      if (s.card) return s;
      const random = a.kind === 'random';
      const kind: Kind = random ? (Math.random() < 0.5 ? 'truth' : 'dare') : (a.kind as Kind);
      return draw(s, kind, c.players, random);
    }
    if (a.type === 'swap') return s.card && !s.swapped ? { ...draw(s, s.card.kind, c.players, s.card.random), swapped: true } : s;
    if (a.type === 'refuse' && s.card) {
      const pen = s.customPenalties?.[s.level] || strings.penalty[s.level];
      return withResult(s, { playerId: playerAt(c.players, s.turn)!.id, text: strings.refuse(pen) });
    }
    return s;
  },
};
