import { baseState, nextTurn, pickFresh, withResult, type BaseState, type GameDef } from '@bang/party';
import { questions, strings, type Topic } from './strings';

export interface ChiTayState extends BaseState {
  topic: Topic;
  qIndex: number;
  used: number[];
  phase: 'question' | 'voting' | 'revealed';
  votes: Record<string, string>; // voterId -> targetPlayerId
  penaltyText?: string;
  victimIds: string[];
}

export type ChiTayConfig = {
  topic?: Topic;
  penaltyText?: string;
};

export type ChiTayAction =
  | { type: 'ready' }
  | { type: 'vote'; targetId: string }
  | { type: 'confirm_local'; victimId: string }
  | { type: 'next_question' }
  | { type: 'config'; config: ChiTayConfig };

export function questionsFor(topic: Topic): { index: number; q: string }[] {
  return questions
    .map((item, index) => ({ index, ...item }))
    .filter((item) => topic === 'mix' || item.topic === topic);
}

function pickNextQ(topic: Topic, used: number[]) {
  const pool = questionsFor(topic);
  const { index, used: nextUsed } = pickFresh(pool.length, used);
  return { qIndex: pool[index].index, used: nextUsed };
}

export const chiTayGame: GameDef<ChiTayState, ChiTayAction> = {
  id: 'chi-tay',
  init: () => {
    const { qIndex, used } = pickNextQ('mix', []);
    return {
      ...baseState(),
      topic: 'mix',
      qIndex,
      used,
      phase: 'question',
      votes: {},
      victimIds: [],
    };
  },
  configOf: (s) => ({ topic: s.topic, penaltyText: s.penaltyText }),
  advance: (s) => {
    const { qIndex, used } = pickNextQ(s.topic, s.used);
    return {
      ...nextTurn(s),
      qIndex,
      used,
      phase: 'question',
      votes: {},
      victimIds: [],
      result: null,
    };
  },
  reduce(s, a, c) {
    if (a.type === 'config') {
      if (!c.host) return s;
      const { topic, penaltyText } = a.config;
      const nextTopic = topic ?? s.topic;
      const { qIndex, used } = topic && topic !== s.topic ? pickNextQ(nextTopic, []) : { qIndex: s.qIndex, used: s.used };
      return {
        ...s,
        topic: nextTopic,
        penaltyText: penaltyText !== undefined ? penaltyText : s.penaltyText,
        qIndex,
        used,
        seq: s.seq + 1,
      };
    }

    if (a.type === 'ready') {
      if (s.phase !== 'question') return s;
      return { ...s, phase: 'voting', votes: {}, victimIds: [], seq: s.seq + 1 };
    }

    if (a.type === 'vote') {
      if (s.phase !== 'voting') return s;
      const votes = { ...s.votes, [c.from]: a.targetId };
      const allVoted = c.players.length > 0 && c.players.every((p) => votes[p.id]);

      if (!allVoted) {
        return { ...s, votes, seq: s.seq + 1 };
      }

      // Đếm phiếu
      const counts: Record<string, number> = {};
      for (const targetId of Object.values(votes)) {
        counts[targetId] = (counts[targetId] ?? 0) + 1;
      }
      const maxVotes = Math.max(0, ...Object.values(counts));
      const victimIds = Object.keys(counts).filter((id) => counts[id] === maxVotes);
      const victimNames = victimIds.map((id) => c.players.find((p) => p.id === id)?.name ?? id).join(', ');
      const pen = s.penaltyText?.trim() || strings.defaultPenalty;

      return withResult(
        { ...s, votes, victimIds, phase: 'revealed' },
        { playerId: victimIds[0] ?? c.from, text: `${victimNames}: ${pen}` },
      );
    }

    if (a.type === 'confirm_local') {
      if (s.phase !== 'voting') return s;
      const victim = c.players.find((p) => p.id === a.victimId);
      const victimName = victim?.name ?? 'Bạn';
      const pen = s.penaltyText?.trim() || strings.defaultPenalty;

      return withResult(
        { ...s, victimIds: [a.victimId], phase: 'revealed' },
        { playerId: a.victimId, text: `${victimName}: ${pen}` },
      );
    }

    if (a.type === 'next_question') {
      return chiTayGame.advance(s);
    }

    return s;
  },
};
