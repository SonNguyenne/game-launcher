import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import type { MiniAppProps } from '@bang/sdk';
import { Chips, PartyShell, ResultCard, SettingsCard, partyStyles, useParty, vibrate, type Party, type PartyData } from '@bang/party';
import { Button, cx } from '@bang/ui';
import { FAST_SECONDS, SECONDS, correctChoice, questionOf, triviaGame, type TriviaAction, type TriviaState } from './game';
import { strings, type TopicChoice } from './strings';

const topicOptions = (Object.keys(strings.topics) as TopicChoice[]).map((v) => ({ value: v, label: strings.topics[v] }));
import s from './Trivia.module.css';

export function TriviaArt() {
  return (
    <div className={s.art}>
      <span>?</span>
    </div>
  );
}

/** Đếm ngược tính từ lúc máy này thấy câu hỏi, nên không phụ thuộc đồng hồ của máy khác. */
function useCountdown(roundId: number | undefined, running: boolean) {
  const startedAt = useRef<{ id?: number; at: number }>({ at: 0 });
  if (startedAt.current.id !== roundId) startedAt.current = { id: roundId, at: performance.now() };
  const [left, setLeft] = useState(SECONDS);

  useEffect(() => {
    if (roundId === undefined) return;
    const tick = () => setLeft(Math.max(0, Math.ceil(SECONDS - (performance.now() - startedAt.current.at) / 1000)));
    tick();
    if (!running) return;
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [roundId, running]);

  const elapsedMs = useCallback(() => performance.now() - startedAt.current.at, []);
  return { left, elapsedMs };
}

function TriviaGame({ party }: { party: Party<TriviaState, TriviaAction> }) {
  const state = party.state!;
  const round = state.round;
  const answered = state.picked !== null;
  const { left, elapsedMs } = useCountdown(round?.id, !!round && !answered);
  const { dispatch, isHost } = party;

  // Máy giữ luật báo hết giờ.
  useEffect(() => {
    if (!isHost || !round || answered) return;
    const id = setTimeout(() => dispatch({ type: 'timeout', round: round.id }), Math.max(0, SECONDS * 1000 - elapsedMs()));
    return () => clearTimeout(id);
  }, [isHost, round, answered, dispatch, elapsedMs]);

  // Dừng một nhịp để cả bàn thấy đáp án đúng trước khi hiện thẻ kết quả.
  const resultSeq = state.result?.seq;
  const resultSafe = state.result?.safe;
  const [shownSeq, setShownSeq] = useState(resultSeq);
  const sfxRef = useRef(party.sfx);
  sfxRef.current = party.sfx;
  useEffect(() => {
    if (!resultSeq) return;
    sfxRef.current(resultSafe ? 'win' : 'buzz');
    if (!resultSafe) vibrate(200);
    const id = setTimeout(() => setShownSeq(resultSeq), 900);
    return () => clearTimeout(id);
  }, [resultSeq, resultSafe]);

  const tickLeft = round && !answered && left <= 3 && left > 0 ? left : 0;
  useEffect(() => {
    if (tickLeft) sfxRef.current('tick');
  }, [tickLeft]);

  if (!round) {
    return (
      <div className={s.game}>
        <div className={cx(partyStyles.card, s.idle)}>
          <span className={s.bigMark} aria-hidden="true">?</span>
          <p className={s.idleText}>{party.myTurn ? strings.ready : strings.waitAsk(party.current?.name ?? '')}</p>
        </div>
        <Button variant="primary" block className={s.cta} disabled={!party.myTurn} onClick={() => dispatch({ type: 'ask' })}>
          {strings.ask}
        </Button>
        <Scoreboard party={party} />
      </div>
    );
  }

  const q = questionOf(round);
  const right = correctChoice(round);
  const fiftyUsed = !!party.current && state.fiftyUsed.includes(party.current.id);

  return (
    <div className={s.game}>
      <div className={s.timer} role="timer" aria-label={strings.seconds(left)}>
        <div className={s.track}>
          <i key={round.id} className={cx(s.fill, answered && s.paused)} style={{ '--secs': `${SECONDS}s` } as CSSProperties} />
        </div>
        <span className={cx(s.left, left <= 3 && s.urgent)}>{left}</span>
      </div>

      <div className={s.qHead}>
        <span className={s.topicTag}>{strings.topics[q.topic]}</span>
        {party.myTurn && !answered && (
          <button className={s.fifty} disabled={fiftyUsed || round.hidden.length > 0} onClick={() => dispatch({ type: 'fifty', round: round.id })}>
            {fiftyUsed || round.hidden.length ? strings.fiftyUsed : strings.fifty}
          </button>
        )}
      </div>
      <h2 className={s.question}>{q.q}</h2>

      <div className={s.options}>
        {round.order.map((original, i) => (
          <button
            key={original}
            className={cx(
              s.option,
              answered && i === right && s.right,
              answered && i === state.picked && i !== right && s.wrong,
              round.hidden.includes(i) && s.hidden,
            )}
            disabled={!party.myTurn || answered || round.hidden.includes(i)}
            onClick={() => dispatch({ type: 'answer', round: round.id, choice: i, fast: elapsedMs() < FAST_SECONDS * 1000 })}
          >
            <span className={s.letter}>{strings.letters[i]}</span>
            <span>{q.a[original]}</span>
          </button>
        ))}
      </div>

      <ResultCard party={party} show={shownSeq === resultSeq} />
    </div>
  );
}

/** Bảng điểm: xếp theo điểm, kèm số câu đúng liền hiện tại. */
function Scoreboard({ party }: { party: Party<TriviaState, TriviaAction> }) {
  const scores = party.state!.scores;
  const rows = party.players
    .map((p) => ({ p, score: scores[p.id] ?? { points: 0, streak: 0 } }))
    .sort((a, b) => b.score.points - a.score.points);
  if (!rows.some((r) => r.score.points > 0)) return null;
  return (
    <section className={s.board} aria-label={strings.scoreboard}>
      <h3 className={s.boardTitle}>{strings.scoreboard}</h3>
      <ol className={s.boardList}>
        {rows.map(({ p, score }, i) => (
          <li key={p.id} className={cx(s.boardRow, i === 0 && s.leader)}>
            <span className={s.rank}>{i + 1}</span>
            <span className={s.boardName}>{p.name}</span>
            {score.streak >= 2 && <span className={s.streak}>{strings.streakBadge(score.streak)}</span>}
            <span className={s.points}>{strings.points(score.points)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function DoVui({ ctx }: MiniAppProps<PartyData>) {
  const party = useParty(triviaGame, ctx);
  return (
    <PartyShell party={party} info={{
        title: strings.title,
        rule: strings.rule,
        art: <TriviaArt />,
        settings: ({ value, onChange, editable }) => (
          <SettingsCard editable={editable}>
            <Chips label={strings.topicLabel} options={topicOptions} value={value.topic ?? 'mix'} disabled={!editable} onChange={(topic) => onChange({ topic })} />
          </SettingsCard>
        ),
      }}>
      {party.state && <TriviaGame party={party} />}
    </PartyShell>
  );
}
