import { baseState, nextTurn, randomInt, withResult, type BaseState, type GameDef } from '@bang/party';
import { cardItems, rulePresets, strings, type CardItem, type RulePreset, type Speed } from './strings';

export interface DapTayState extends BaseState {
  speed: Speed;
  ruleIndex: number;
  phase: 'ready' | 'running' | 'slapped';
  currentCard: CardItem | null;
  cardCount: number;
  targetArrival: number;
  slapperId: string | null;
  slapOutcome: 'success' | 'trap' | 'wrong' | null;
  penaltyText?: string;
}

export type DapTayConfig = {
  speed?: Speed;
  ruleIndex?: number;
  penaltyText?: string;
};

export type DapTayAction =
  | { type: 'start_round' }
  | { type: 'flip_card'; card: CardItem }
  | { type: 'slap'; outcome: 'success' | 'trap' | 'wrong' }
  | { type: 'next_round' }
  | { type: 'config'; config: DapTayConfig };

export function speedToMs(speed: Speed): number {
  if (speed === 'vua') return 650;
  if (speed === 'dien') return 300;
  return 450;
}

export function pickRandomCard(preset: RulePreset, count: number, targetArrival: number): CardItem {
  // Đã đến lúc ra thẻ mục tiêu
  if (count === targetArrival) {
    return cardItems.find((c) => c.id === preset.targetId) ?? cardItems[0];
  }
  // Thỉnh thoảng tung ra thẻ bẫy
  if (preset.trapId && Math.random() < 0.25) {
    return cardItems.find((c) => c.id === preset.trapId) ?? cardItems[1];
  }
  // Thẻ bình thường khác
  const normalPool = cardItems.filter((c) => c.id !== preset.targetId);
  return normalPool[randomInt(0, normalPool.length - 1)];
}

export const dapTayGame: GameDef<DapTayState, DapTayAction> = {
  id: 'dap-tay',
  init: () => ({
    ...baseState(),
    speed: 'nhanh',
    ruleIndex: 0,
    phase: 'ready',
    currentCard: null,
    cardCount: 0,
    targetArrival: randomInt(4, 9),
    slapperId: null,
    slapOutcome: null,
  }),
  configOf: (s) => ({ speed: s.speed, ruleIndex: s.ruleIndex, penaltyText: s.penaltyText }),
  advance: (s) => ({
    ...nextTurn(s),
    phase: 'ready',
    currentCard: null,
    cardCount: 0,
    targetArrival: randomInt(4, 9),
    slapperId: null,
    slapOutcome: null,
    result: null,
  }),
  reduce(s, a, c) {
    if (a.type === 'config') {
      if (!c.host) return s;
      const { speed, ruleIndex, penaltyText } = a.config;
      return {
        ...s,
        speed: speed ?? s.speed,
        ruleIndex: ruleIndex !== undefined ? ruleIndex : s.ruleIndex,
        penaltyText: penaltyText !== undefined ? penaltyText : s.penaltyText,
        seq: s.seq + 1,
      };
    }

    if (a.type === 'start_round') {
      return {
        ...s,
        phase: 'running',
        currentCard: null,
        cardCount: 0,
        targetArrival: randomInt(4, 9),
        slapperId: null,
        slapOutcome: null,
        seq: s.seq + 1,
      };
    }

    if (a.type === 'flip_card') {
      if (s.phase !== 'running') return s;
      return {
        ...s,
        currentCard: a.card,
        cardCount: s.cardCount + 1,
        seq: s.seq + 1,
      };
    }

    if (a.type === 'slap') {
      if (s.phase !== 'running' || s.slapperId) return s;
      const slapper = c.players.find((p) => p.id === c.from);
      const slapperName = slapper?.name ?? 'Bạn';
      const pen = s.penaltyText?.trim() || strings.defaultPenalty;

      const isSafe = a.outcome === 'success';
      const resultText =
        a.outcome === 'success'
          ? `${strings.slapSuccess(slapperName)} Những người chậm tay: ${pen}`
          : a.outcome === 'trap'
            ? `${strings.slapTrap(slapperName)} ${pen}`
            : `${strings.slapWrong(slapperName)} ${pen}`;

      return withResult(
        {
          ...s,
          phase: 'slapped',
          slapperId: c.from,
          slapOutcome: a.outcome,
        },
        { playerId: c.from, text: resultText, safe: isSafe },
      );
    }

    if (a.type === 'next_round') {
      const nextIndex = (s.ruleIndex + 1) % rulePresets.length;
      const nextS = dapTayGame.advance(s);
      return { ...nextS, ruleIndex: nextIndex };
    }

    return s;
  },
};
