import { baseState, nextTurn, pickFresh, withResult, type BaseState, type GameDef, type Player } from '@bang/party';
import { prompts, strings } from './strings';

export interface DongDieuState extends BaseState {
  pairIds: [string, string];
  pIndex: number;
  used: number[];
  phase: 'pair_pick' | 'typing' | 'revealed';
  answers: Record<string, string>;
  isMatched?: boolean;
  penaltyText?: string;
}

export type DongDieuConfig = {
  penaltyText?: string;
};

export type DongDieuAction =
  | { type: 'start_typing' }
  | { type: 'submit_answer'; answer: string }
  | { type: 'submit_local_answers'; a1: string; a2: string }
  | { type: 'judge'; matched: boolean }
  | { type: 'next_round' }
  | { type: 'config'; config: DongDieuConfig };

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ');
}

export function areAnswersSimilar(a: string, b: string): boolean {
  const normA = normalizeText(a);
  const normB = normalizeText(b);
  if (!normA || !normB) return false;
  return normA === normB || normA.includes(normB) || normB.includes(normA);
}

function pickPair(players: Player[], round: number): [string, string] {
  if (players.length < 2) return ['p1', 'p2'];
  const idx1 = round % players.length;
  const idx2 = (round + 1) % players.length;
  return [players[idx1].id, players[idx2].id];
}

export const dongDieuGame: GameDef<DongDieuState, DongDieuAction> = {
  id: 'dong-dieu',
  init: (players) => {
    const { index, used } = pickFresh(prompts.length, []);
    return {
      ...baseState(),
      pairIds: pickPair(players, 0),
      pIndex: index,
      used,
      phase: 'pair_pick',
      answers: {},
    };
  },
  configOf: (s) => ({ penaltyText: s.penaltyText }),
  advance: (s) => {
    const { index, used } = pickFresh(prompts.length, s.used);
    return {
      ...nextTurn(s),
      pIndex: index,
      used,
      phase: 'pair_pick',
      answers: {},
      isMatched: undefined,
      result: null,
    };
  },
  reduce(s, a, c) {
    if (a.type === 'config') {
      if (!c.host) return s;
      return {
        ...s,
        penaltyText: a.config.penaltyText !== undefined ? a.config.penaltyText : s.penaltyText,
        seq: s.seq + 1,
      };
    }

    if (a.type === 'start_typing') {
      const pair = pickPair(c.players, s.turn);
      return { ...s, pairIds: pair, phase: 'typing', answers: {}, isMatched: undefined, seq: s.seq + 1 };
    }

    if (a.type === 'submit_answer') {
      if (s.phase !== 'typing') return s;
      const answers = { ...s.answers, [c.from]: a.answer.trim() };
      const [id1, id2] = s.pairIds;
      const bothDone = !!(answers[id1] && answers[id2]);

      if (!bothDone) {
        return { ...s, answers, seq: s.seq + 1 };
      }

      const match = areAnswersSimilar(answers[id1], answers[id2]);
      const name1 = c.players.find((p) => p.id === id1)?.name ?? 'Người 1';
      const name2 = c.players.find((p) => p.id === id2)?.name ?? 'Người 2';
      const pen = s.penaltyText?.trim() || strings.defaultPenalty;
      const resultText = match
        ? `${name1} & ${name2}: Đồng điệu tuyệt đối!`
        : `${name1} & ${name2} lệch pha: ${pen}`;

      return withResult(
        { ...s, answers, isMatched: match, phase: 'revealed' },
        { playerId: id1, text: resultText, safe: match },
      );
    }

    if (a.type === 'submit_local_answers') {
      if (s.phase !== 'typing') return s;
      const [id1, id2] = s.pairIds;
      const answers = { [id1]: a.a1.trim(), [id2]: a.a2.trim() };
      const match = areAnswersSimilar(a.a1, a.a2);
      const name1 = c.players.find((p) => p.id === id1)?.name ?? 'Người 1';
      const name2 = c.players.find((p) => p.id === id2)?.name ?? 'Người 2';
      const pen = s.penaltyText?.trim() || strings.defaultPenalty;
      const resultText = match
        ? `${name1} & ${name2}: Đồng điệu tuyệt đối!`
        : `${name1} & ${name2} lệch pha: ${pen}`;

      return withResult(
        { ...s, answers, isMatched: match, phase: 'revealed' },
        { playerId: id1, text: resultText, safe: match },
      );
    }

    if (a.type === 'judge') {
      if (s.phase !== 'revealed') return s;
      const [id1, id2] = s.pairIds;
      const name1 = c.players.find((p) => p.id === id1)?.name ?? 'Người 1';
      const name2 = c.players.find((p) => p.id === id2)?.name ?? 'Người 2';
      const pen = s.penaltyText?.trim() || strings.defaultPenalty;
      const resultText = a.matched
        ? `${name1} & ${name2}: Đồng điệu tuyệt đối!`
        : `${name1} & ${name2} lệch pha: ${pen}`;

      return withResult(
        { ...s, isMatched: a.matched },
        { playerId: id1, text: resultText, safe: a.matched },
      );
    }

    if (a.type === 'next_round') {
      const nextS = dongDieuGame.advance(s);
      return { ...nextS, pairIds: pickPair(c.players, nextS.turn) };
    }

    return s;
  },
};
