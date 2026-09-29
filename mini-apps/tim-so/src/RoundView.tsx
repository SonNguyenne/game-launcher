import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { ResultCard, SpinWheel, vibrate } from '@bang/party';
import { cx } from '@bang/ui';
import { COUNTDOWN_MS, countsOf, isBoardDone, targetOf, type Dot, type FindParty, type Round } from './game';
import { strings } from './strings';
import { RINGS, boardStyle, dotStyle, useLookContext } from './board';
import s from './Find.module.css';

const clock = (secs: number) => `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;

/** Đồng hồ của vòng, tính từ lúc máy này thấy vòng mới nên không phụ thuộc giờ của máy khác. */
function useRoundClock(round: Round, seconds: number, running: boolean) {
  const started = useRef<{ id: number; at: number }>({ id: -1, at: 0 });
  if (started.current.id !== round.attempt) started.current = { id: round.attempt, at: performance.now() };
  const secondsRef = useRef(seconds);
  secondsRef.current = seconds;

  const read = useCallback(() => {
    const ms = performance.now() - started.current.at;
    return {
      counting: ms < COUNTDOWN_MS,
      count: Math.ceil((COUNTDOWN_MS - ms) / 1000),
      left: Math.max(0, Math.ceil(secondsRef.current - (ms - COUNTDOWN_MS) / 1000)),
    };
  }, []);
  const [now, setNow] = useState(read);

  useEffect(() => {
    setNow(read());
    if (!running) return;
    const id = setInterval(() => setNow(read()), 100);
    return () => clearInterval(id);
  }, [round.attempt, running, read]);

  const remainingMs = useCallback(() => COUNTDOWN_MS + secondsRef.current * 1000 - (performance.now() - started.current.at), []);
  return { ...now, remainingMs };
}

export function RoundView({ party, round }: { party: FindParty; round: Round }) {
  const state = party.state!;
  const { look } = useLookContext();
  const { dispatch, isHost } = party;
  const race = state.play === 'race';
  const secs = race ? state.seconds : state.turnSeconds;
  // Đồng hồ dừng khi có kết quả, hoặc khi hết giờ và đang chờ quay phạt.
  const done = !!state.result || round.phase !== 'find';
  const { counting, count, left, remainingMs } = useRoundClock(round, secs, !done);
  const target = targetOf(round);
  const inGame = party.players.some((p) => p.id === party.me) || party.mode === 'local';
  const canTap = !done && !counting && inGame && (race || party.myTurn);
  const ringOf = (id: string) => RINGS[Math.max(0, party.players.findIndex((p) => p.id === id)) % RINGS.length];

  const sfxRef = useRef(party.sfx);
  sfxRef.current = party.sfx;

  // Máy giữ luật báo hết giờ.
  useEffect(() => {
    if (!isHost || done) return;
    const id = setTimeout(() => dispatch({ type: 'timeout', attempt: round.attempt }), Math.max(0, remainingMs()));
    return () => clearTimeout(id);
  }, [isHost, done, round.attempt, dispatch, remainingMs]);

  // Tiếng đếm 3-2-1 và 5 giây cuối.
  const beat = counting ? count : !done && left <= 5 && left > 0 ? left : 0;
  useEffect(() => {
    if (beat) sfxRef.current('tick');
  }, [beat]);

  // Chạm nhầm: rung, số đỏ lên, khóa tay một nhịp.
  const [wrong, setWrong] = useState<{ n: number; at: number } | null>(null);
  const locked = !!wrong;
  useEffect(() => {
    if (!wrong) return;
    const id = setTimeout(() => setWrong(null), 700);
    return () => clearTimeout(id);
  }, [wrong]);

  const tap = (d: Dot) => {
    if (!canTap || locked || round.found[d.n]) return;
    if (d.n === target) {
      sfxRef.current('tap');
      dispatch({ type: 'find', round: round.id, n: d.n });
    } else {
      sfxRef.current('buzz');
      vibrate(80);
      setWrong({ n: d.n, at: performance.now() });
    }
  };

  // Dừng một nhịp để cả phòng thấy vòng khoanh cuối trước khi hiện thẻ kết quả.
  // Kết quả qua vòng phạt thì chờ vòng quay dừng.
  const resultSeq = state.result?.seq;
  const resultSafe = !!state.result?.safe;
  const viaWheel = round.phase === 'spin';
  const spinId = round.spin?.id ?? 0;
  const [shownSeq, setShownSeq] = useState<number>();
  const [revealedSpin, setRevealedSpin] = useState(spinId);
  useEffect(() => {
    if (!resultSeq || viaWheel) return;
    sfxRef.current(resultSafe ? 'win' : 'buzz');
    const id = setTimeout(() => setShownSeq(resultSeq), 700);
    return () => clearTimeout(id);
  }, [resultSeq, viaWheel, resultSafe]);
  const onRevealed = useRef((id: number) => {
    setRevealedSpin(id);
    vibrate(120);
  }).current;
  const wheelDone = viaWheel && !!resultSeq && revealedSpin === spinId;
  useEffect(() => {
    if (wheelDone) sfxRef.current(resultSafe ? 'win' : 'buzz');
  }, [wheelDone, resultSafe]);
  const showResult = !!resultSeq && (viaWheel ? revealedSpin === spinId : shownSeq === resultSeq);

  const counts = countsOf(round);
  const foundCount = round.at;
  const total = round.targets.length;
  const urgent = !counting && !done && left <= Math.min(10, Math.ceil(secs / 3));

  return (
    <div className={s.game}>
      <div className={s.bar}>
        <div className={s.targetBox} aria-live="polite" aria-label={target ? strings.target(target) : undefined}>
          <small>{strings.find}</small>
          <strong key={target} className={s.target}>{counting ? '?' : (target ?? '✓')}</strong>
        </div>
        <div className={cx(s.clock, urgent && s.urgent)} role="timer" aria-label={strings.timeLeft(counting ? secs : left)}>
          {clock(counting ? secs : left)}
        </div>
        <div className={s.progress} aria-label={strings.progressLabel(foundCount, total)}>
          {strings.progress(foundCount, total)}
        </div>
      </div>

      <div
        className={cx(s.board, counting && s.hidden, locked && s.locked)}
        style={boardStyle(state.dots.length, look)}
      >
        {state.dots.map((d) => {
          const by = round.found[d.n];
          return (
            <button
              key={d.n}
              type="button"
              className={cx(s.dot, by && s.found, wrong?.n === d.n && s.wrong)}
              style={dotStyle(d, look, { '--ring': by ? ringOf(by) : undefined })}
              tabIndex={counting ? -1 : undefined}
              aria-label={by ? strings.dotFound(d.n, party.nameOf(by)) : strings.dot(d.n)}
              onClick={() => tap(d)}
            >
              {d.n}
            </button>
          );
        })}
        {counting && (
          <div className={s.countdown} aria-live="assertive">
            <span key={count}>{count}</span>
          </div>
        )}
      </div>

      <ul className={s.legend}>
        {party.players.map((p) => (
          <li key={p.id} className={cx(s.legendItem, !race && p.id === party.current?.id && s.legendTurn)} style={{ '--ring': ringOf(p.id) } as CSSProperties}>
            <i aria-hidden="true" />
            <span className={s.legendName}>{p.name}</span>
            <strong>{counts[p.id] ?? 0}</strong>
          </li>
        ))}
      </ul>

      {viaWheel && (
        <div className={s.sheet} role="dialog" aria-label={strings.missTitle}>
          <h2 className={s.panelTitle}>{strings.missTitle}</h2>
          <p className={s.panelHint}>{strings.missHint}</p>
          <SpinWheel key={round.attempt} party={party} spin={round.spin} slices={strings.penalties} onSpin={() => dispatch({ type: 'spin' })} onRevealed={onRevealed} />
        </div>
      )}

      <ResultCard party={party} show={showResult} actionLabel={race || isBoardDone(round) ? strings.again : undefined} />
    </div>
  );
}
