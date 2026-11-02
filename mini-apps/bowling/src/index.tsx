import { useCallback, useEffect, useRef, useState } from 'react';
import type { MiniAppProps } from '@bang/sdk';
import { PartyShell, useParty, type PartyData } from '@bang/party';
import { Button, cx } from '@bang/ui';
import { bowlingGame, frameOf, leaders, type BowlParty } from './game';
import { scoreFrames, splitFrames, totalOf } from './score';
import { BALL_COLORS, Lane, type Outcome } from './Lane';
import { strings } from './strings';
import s from './Bowling.module.css';
import iconSvg from '../icon.svg?raw';

function Board({ party, rolling }: { party: BowlParty; rolling: boolean }) {
  const st = party.state!;
  return (
    <div className={s.boardWrap}>
      <table className={s.board} aria-label={strings.board}>
        <thead>
          <tr>
            <th className={s.nameCol} />
            {Array.from({ length: 10 }, (_, f) => (
              <th key={f}>{f + 1}</th>
            ))}
            <th>{strings.total}</th>
          </tr>
        </thead>
        <tbody>
          {st.seats.map((id, i) => {
            // Bi còn đang lăn thì chưa ghi lần ném mới lên bảng.
            const rolls = rolling && st.shot?.by === i ? st.rolls[i].slice(0, -1) : st.rolls[i];
            const frames = scoreFrames(rolls);
            const cur = frameOf(rolls);
            const on = !st.done && st.turn === i;
            return (
              <tr key={id} className={cx(on && !rolling && s.rowOn)}>
                <th className={s.nameCol} scope="row">
                  <span className={s.name}>
                    <i className={s.ballDot} style={{ background: BALL_COLORS[i % BALL_COLORS.length] }} aria-hidden />
                    {party.nameOf(id)}
                  </span>
                  {(st.wins[id] ?? 0) > 0 && <span className={s.winsBadge} aria-label={strings.wins(st.wins[id])}>{st.wins[id]}</span>}
                </th>
                {frames.map((f, k) => (
                  <td key={k} className={cx(s.frame, on && k === cur && s.frameOn, k === 9 && s.frame10)}>
                    <span className={s.marks}>
                      {(k === 9 ? [0, 1, 2] : [0, 1]).map((m) => (
                        <i key={m} className={cx(s.mark, (f.marks[m] === 'X' || f.marks[m] === '/') && s.markHit)}>{f.marks[m] ?? ''}</i>
                      ))}
                    </span>
                    <span className={s.cum}>{f.total ?? ''}</span>
                  </td>
                ))}
                <td className={s.totalCell}>{totalOf(rolls)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function BowlingGame({ party }: { party: BowlParty }) {
  const st = party.state!;
  const [rolling, setRolling] = useState(false);
  const [flash, setFlash] = useState<Outcome | null>(null);
  const onRolling = useCallback((v: boolean) => setRolling(v), []);
  const sfx = useRef(party.sfx);
  sfx.current = party.sfx;

  const onOutcome = useCallback((o: Outcome) => {
    setFlash(o);
    if (o.kind === 'strike' || o.kind === 'spare') sfx.current('win');
    else if (o.kind === 'gutter') sfx.current('buzz');
  }, []);
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 1600);
    return () => clearTimeout(t);
  }, [flash]);
  useEffect(() => {
    if (st.done && !rolling) sfx.current('win');
  }, [st.done, rolling]);

  const local = party.mode === 'local';
  const cur = st.seats[st.turn];
  const mine = local || cur === party.me;
  const frame = frameOf(st.rolls[st.turn] ?? []) + 1;
  const fr = splitFrames(st.rolls[st.turn] ?? []);
  const lastFrame = fr[frame - 1] ?? [];
  const ball = lastFrame.length >= (frame === 10 ? 3 : 2) || (frame < 10 && lastFrame[0] === 10) ? 1 : lastFrame.length + 1;
  const watching = !local && !st.seats.includes(party.me);
  const top = leaders(st);

  const status = st.done
    ? strings.won(top.map((i) => party.nameOf(st.seats[i])).join(', '))
    : rolling
      ? strings.rolling
      : watching && !mine
        ? strings.watching
        : mine
          ? strings.yourTurn(frame, ball)
          : strings.waitTurn(party.nameOf(cur), frame);

  return (
    <div className={s.game}>
      <div className={s.head}>
        <span className={s.status} aria-live="polite">{status}</span>
        {st.done && <span className={s.best}>{strings.wonScore(totalOf(st.rolls[top[0]]))}</span>}
      </div>
      <div className={s.stage}>
        <Lane party={party} onOutcome={onOutcome} onRolling={onRolling} />
        {flash && (
          <div key={flash.n} className={cx(s.flash, (flash.kind === 'strike' || flash.kind === 'spare') && s.flashBig)} role="status">
            {flash.kind === 'pins' ? strings.outcome.pins(flash.knocked) : strings.outcome[flash.kind]}
          </div>
        )}
      </div>
      <Board party={party} rolling={rolling} />
      {st.done &&
        !rolling &&
        (party.isHost ? (
          <Button variant="primary" block onClick={() => party.dispatch({ type: 'restart' })}>{strings.newGame}</Button>
        ) : (
          <p className={s.hint}>{strings.waitNewGame}</p>
        ))}
    </div>
  );
}

export default function Bowling({ ctx }: MiniAppProps<PartyData>) {
  const party = useParty(bowlingGame, ctx);
  return (
    <PartyShell
      party={party}
      info={{
        title: strings.title,
        rule: strings.rule,
        art: <span className={s.heroArt} dangerouslySetInnerHTML={{ __html: iconSvg }} />,
      }}
    >
      {party.state && <BowlingGame party={party} />}
    </PartyShell>
  );
}
