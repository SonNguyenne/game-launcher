import { memo, useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { ResultCard, SpinWheel, vibrate } from '@bang/party';
import { cx } from '@bang/ui';
import { COUNTDOWN_MS, countsOf, isBoardDone, type Dot, type FindParty, type Round } from './game';
import { strings } from './strings';
import { RINGS, boardStyle, dotStyle, useLookContext } from './board';
import type { Look } from './look';
import s from './Find.module.css';

const clock = (secs: number) => `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;

/**
 * Đồng hồ của vòng, tính theo giờ chung của phòng từ mốc chủ phòng ghi vào vòng,
 * nên các máy hết giờ cùng lúc và tải lại trang giữa vòng vẫn đúng giờ.
 */
function useRoundClock(round: Round, seconds: number, running: boolean, now: () => number) {
  // Vòng từ bản cũ chưa có mốc giờ: tính từ lúc máy này thấy vòng.
  const seen = useRef<{ id: number; at: number }>({ id: -1, at: 0 });
  if (seen.current.id !== round.attempt) seen.current = { id: round.attempt, at: now() };
  const startRef = useRef(0);
  startRef.current = round.startedAt ?? seen.current.at;
  const secondsRef = useRef(seconds);
  secondsRef.current = seconds;
  const nowRef = useRef(now);
  nowRef.current = now;

  const read = useCallback(() => {
    const ms = nowRef.current() - startRef.current;
    return {
      counting: ms < COUNTDOWN_MS,
      count: Math.ceil((COUNTDOWN_MS - ms) / 1000),
      left: Math.max(0, Math.ceil(secondsRef.current - (ms - COUNTDOWN_MS) / 1000)),
    };
  }, []);
  const [clock, setClock] = useState(read);

  useEffect(() => {
    // Chỉ vẽ lại khi số trên đồng hồ đổi (mỗi giây), không phải mỗi nhịp đo.
    const tick = () => setClock((p) => {
      const n = read();
      return p.counting === n.counting && p.count === n.count && p.left === n.left ? p : n;
    });
    tick();
    if (!running) return;
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [round.attempt, round.startedAt, running, read]);

  const remainingMs = useCallback(() => COUNTDOWN_MS + secondsRef.current * 1000 - (nowRef.current() - startRef.current), []);
  return { ...clock, remainingMs };
}

/** Số mình vừa chạm, hiện ngay trước khi chủ phòng xác nhận; quá lâu không thấy xác nhận thì bỏ. */
const PENDING_MS = 2500;
interface Pending {
  round: number;
  n: number;
  at: number;
}

interface DotProps {
  d: Dot;
  look: Look;
  ring: string | undefined;
  found: boolean;
  wrong: boolean;
  hidden: boolean;
  label: string;
  onTap: (d: Dot) => void;
}

/** Một con số trên bàn; chỉ vẽ lại khi chính nó đổi, để bàn 200 số không khựng mỗi lần có người tìm được. */
const DotButton = memo(function DotButton({ d, look, ring, found, wrong, hidden, label, onTap }: DotProps) {
  return (
    <button
      type="button"
      className={cx(s.dot, found && s.found, wrong && s.wrong)}
      style={dotStyle(d, look, { '--ring': ring })}
      tabIndex={hidden ? -1 : undefined}
      aria-label={label}
      onClick={() => onTap(d)}
    >
      {d.n}
    </button>
  );
});

export function RoundView({ party, round }: { party: FindParty; round: Round }) {
  const state = party.state!;
  const { look } = useLookContext();
  const { dispatch, isHost } = party;
  const race = state.play === 'race';
  const secs = race ? state.seconds : state.turnSeconds;
  // Đồng hồ dừng khi có kết quả, hoặc khi hết giờ và đang chờ quay phạt.
  const done = !!state.result || round.phase !== 'find';
  const { counting, count, left, remainingMs } = useRoundClock(round, secs, !done, party.now);

  // Số mình đã chạm nhưng chưa thấy trong trạng thái từ chủ phòng: coi như đã tìm, để chạm tiếp số sau ngay.
  const [pending, setPending] = useState<Pending[]>([]);
  const mine = pending.filter((p) => p.round === round.id && !round.found[p.n]);
  const mineSet = new Set(mine.map((p) => p.n));
  let at = round.at;
  while (at < round.targets.length && mineSet.has(round.targets[at])) at++;
  const target = round.targets[at];
  useEffect(() => {
    setPending((list) => {
      const keep = list.filter((p) => p.round === round.id && !round.found[p.n] && performance.now() - p.at < PENDING_MS);
      return keep.length === list.length ? list : keep;
    });
  }, [round.id, round.found]);
  useEffect(() => {
    if (!pending.length) return;
    const id = setTimeout(() => setPending((list) => list.filter((p) => performance.now() - p.at < PENDING_MS)), PENDING_MS);
    return () => clearTimeout(id);
  }, [pending]);
  const foundBy = (n: number) => round.found[n] ?? (mineSet.has(n) ? party.me : undefined);

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
    if (!canTap || locked || foundBy(d.n)) return;
    if (d.n === target) {
      sfxRef.current('tap');
      setPending((list) => [...list, { round: round.id, n: d.n, at: performance.now() }]);
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

  const tapRef = useRef(tap);
  tapRef.current = tap;
  const onTap = useCallback((d: Dot) => tapRef.current(d), []);

  const counts = countsOf(round);
  if (mine.length && party.me) counts[party.me] = (counts[party.me] ?? 0) + mine.length;
  const foundCount = at;
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
          const by = foundBy(d.n);
          return (
            <DotButton
              key={d.n}
              d={d}
              look={look}
              ring={by ? ringOf(by) : undefined}
              found={!!by}
              wrong={wrong?.n === d.n}
              hidden={counting}
              label={by ? strings.dotFound(d.n, party.nameOf(by)) : strings.dot(d.n)}
              onTap={onTap}
            />
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
