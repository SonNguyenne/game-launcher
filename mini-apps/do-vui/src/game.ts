import { baseState, isTurnOf, nextTurn, playerAt, shuffle, withResult, type BaseState, type GameDef } from '@bang/party';
import { questions, strings, type TopicChoice } from './strings';

export const SECONDS = 10;
/** Trả lời trong ngần này giây được thêm điểm. */
export const FAST_SECONDS = 4;

export interface Round {
  id: number;
  question: number;
  /** Thứ tự hiện đáp án; phần tử là chỉ số trong danh sách gốc, 0 là đáp án đúng. */
  order: number[];
  /** Các ô bị ẩn khi dùng 50/50 (chỉ số theo thứ tự hiện). */
  hidden: number[];
}

export interface Score {
  points: number;
  streak: number;
}

export interface TriviaState extends BaseState {
  topic: TopicChoice;
  round: Round | null;
  picked: number | null;
  used: number[];
  scores: Record<string, Score>;
  /** Người đã dùng quyền 50/50. */
  fiftyUsed: string[];
}

export type TriviaAction =
  | { type: 'ask' }
  | { type: 'answer'; round: number; choice: number; fast: boolean }
  | { type: 'timeout'; round: number }
  | { type: 'fifty'; round: number }
  | { type: 'config'; config: Partial<Pick<TriviaState, 'topic'>> };

export const questionOf = (r: Round) => questions[r.question];
export const correctChoice = (r: Round) => r.order.indexOf(0);

/** Chọn câu chưa hỏi trong chủ đề; hết câu thì làm lại chủ đề đó. */
function pickQuestion(topic: TopicChoice, used: number[]) {
  const pool = questions.map((q, i) => ({ q, i })).filter(({ q }) => topic === 'mix' || q.topic === topic).map(({ i }) => i);
  let fresh = pool.filter((i) => !used.includes(i));
  let nextUsed = used;
  if (!fresh.length) {
    fresh = pool;
    nextUsed = used.filter((i) => !pool.includes(i));
  }
  const index = fresh[Math.floor(Math.random() * fresh.length)];
  return { index, used: [...nextUsed, index] };
}

export const triviaGame: GameDef<TriviaState, TriviaAction> = {
  id: 'do-vui',
  init: () => ({ ...baseState(), topic: 'mix', round: null, picked: null, used: [], scores: {}, fiftyUsed: [] }),
  configOf: (s) => ({ topic: s.topic }),
  advance: (s) => ({ ...nextTurn(s), round: null, picked: null }),
  reduce(s, a, c) {
    if (s.result) return s;
    const who = playerAt(c.players, s.turn)?.id ?? '';
    const score = s.scores[who] ?? { points: 0, streak: 0 };

    if (a.type === 'config') {
      // Chủ đề chọn ở phòng chờ, áp vào lúc bắt đầu ván.
      const { topic } = a.config;
      if (!c.host || s.round || !topic || !(topic in strings.topics)) return s;
      return { ...s, topic, seq: s.seq + 1 };
    }
    if (a.type === 'ask') {
      if (s.round || !isTurnOf(s, c)) return s;
      const { index, used } = pickQuestion(s.topic, s.used);
      const order = shuffle([0, 1, 2, 3]);
      return { ...s, used, picked: null, seq: s.seq + 1, round: { id: s.seq + 1, question: index, order, hidden: [] } };
    }
    if (!s.round || s.round.id !== a.round || s.picked !== null) return s;
    const round = s.round;

    if (a.type === 'fifty') {
      if (!isTurnOf(s, c) || s.fiftyUsed.includes(who)) return s;
      const wrong = shuffle([0, 1, 2, 3].filter((i) => round.order[i] !== 0)).slice(0, 2);
      return { ...s, round: { ...round, hidden: wrong }, fiftyUsed: [...s.fiftyUsed, who], seq: s.seq + 1 };
    }

    const answer = strings.answerWas(questionOf(round).a[0]);
    const lose = (picked: number, text: string) =>
      withResult({ ...s, picked, scores: { ...s.scores, [who]: { ...score, streak: 0 } } }, { playerId: who, text, detail: answer });

    if (a.type === 'answer') {
      if (!isTurnOf(s, c) || round.hidden.includes(a.choice)) return s;
      if (round.order[a.choice] !== 0) return lose(a.choice, strings.wrong);
      const gain = a.fast ? 2 : 1;
      const next = { points: score.points + gain, streak: score.streak + 1 };
      const reward = next.streak % 3 === 0;
      return withResult(
        { ...s, picked: a.choice, scores: { ...s.scores, [who]: next } },
        { playerId: who, text: reward ? strings.streak : strings.correct, detail: strings.gained(gain, a.fast), safe: true },
      );
    }
    // Hết giờ: chỉ máy giữ luật (chủ phòng) được báo.
    return c.host ? lose(-1, strings.timeout) : s;
  },
};
