import { useCallback, useEffect, useRef, useState } from 'react';
import type { MiniAppProps } from '@bang/sdk';
import { Avatar, PartyShell, useParty, type PartyData } from '@bang/party';
import { Button, cx } from '@bang/ui';
import { biaGame, groupOf, left, seatOf, shooter, type BiaParty, type Seat } from './game';
import { kindOf } from './sim';
import { ballColor } from './render';
import { Table } from './Table';
import { strings } from './strings';
import s from './Bia.module.css';
import iconSvg from '../icon.svg?raw';

function Seats({ party, rolling }: { party: BiaParty; rolling: boolean }) {
  const st = party.state!;
  return (
    <div className={s.seats} aria-label={strings.score}>
      {st.seats.map((id, i) => {
        const seat = i as Seat;
        const g = groupOf(st, seat);
        const balls = g ? st.balls.filter((b) => b.on && kindOf(b.id) === g) : [];
        const on8 = g !== null && left(st.balls, g) === 0;
        return (
          <div key={seat} className={cx(s.seat, !st.done && !rolling && shooter(st) === seat && s.seatOn)}>
            <Avatar name={party.nameOf(id) || '?'} />
            <div className={s.seatBody}>
              <span className={s.seatName}>{party.nameOf(id)}</span>
              <span className={s.seatGroup}>
                {g ? (on8 ? strings.target8 : strings.groups[g]) : strings.open}
                <span className={s.dots} aria-hidden="true">
                  {balls.map((b) => (
                    <i key={b.id} className={cx(s.dot, kindOf(b.id) === 'stripe' && s.dotStripe)} style={{ ['--c' as string]: ballColor(b.id) }} />
                  ))}
                </span>
              </span>
            </div>
            <span className={s.wins}>{st.wins[id] ?? 0}</span>
          </div>
        );
      })}
    </div>
  );
}

function Report({ party }: { party: BiaParty }) {
  const st = party.state!;
  const r = st.report;
  if (!r || st.done) return null;
  const name = party.nameOf(st.seats[r.by]);
  const parts: string[] = [];
  const objects = r.pocketed.filter((id) => id !== 0);
  if (r.foul) parts.push(strings.fouls[r.foul], strings.ballInHand(party.nameOf(st.seats[shooter(st)])));
  else parts.push(objects.length ? strings.potted(objects.length) : strings.nothing);
  if (r.group) parts.push(strings.groupSet(name, strings.groups[r.group]));
  if (r.respot) parts.push(strings.respot);
  if (r.again) parts.push(strings.again);
  return <p className={cx(s.report, r.foul && s.reportFoul)}>{parts.join(' · ')}</p>;
}

function BiaGame({ party }: { party: BiaParty }) {
  const st = party.state!;
  const [rolling, setRolling] = useState(false);
  const onRolling = useCallback((v: boolean) => setRolling(v), []);
  const mySeat = party.mode === 'local' ? shooter(st) : seatOf(st, party.me);
  const myTurn = mySeat !== null && mySeat === shooter(st);
  const sfx = useRef(party.sfx);
  sfx.current = party.sfx;

  // Âm báo sau khi bi dừng: lỗi thì rè, hết ván thì nhạc thắng.
  const reportSeq = rolling ? null : st.seq;
  const lastSeq = useRef(st.seq);
  useEffect(() => {
    if (reportSeq === null || reportSeq === lastSeq.current) return;
    lastSeq.current = reportSeq;
    if (st.done) sfx.current('win');
    else if (st.report?.foul) sfx.current('buzz');
  }, [reportSeq, st.done, st.report]);

  const status = st.done
    ? strings.won(party.nameOf(st.seats[st.winner ?? 0]))
    : rolling
      ? strings.rolling
      : mySeat === null
        ? strings.watching
        : myTurn
          ? strings.yourShot
          : strings.waitShot(party.nameOf(st.seats[shooter(st)]));

  return (
    <div className={s.game}>
      <Seats party={party} rolling={rolling} />
      <div className={s.head}>
        <span className={s.status} aria-live="polite">{status}</span>
        {st.done && st.how && <span className={s.how}>{strings.how[st.how]}</span>}
      </div>
      {!rolling && <Report party={party} />}
      <Table party={party} onRolling={onRolling} />
      {st.done && !rolling && (
        <div className={s.banner} role="status">
          <span className={s.bannerTag}>{strings.champion}</span>
          <strong>{party.nameOf(st.seats[st.winner ?? 0])}</strong>
        </div>
      )}
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

export default function BiA({ ctx }: MiniAppProps<PartyData>) {
  const party = useParty(biaGame, ctx);
  return (
    <PartyShell
      party={party}
      info={{
        title: strings.title,
        rule: strings.rule,
        art: <span className={s.heroArt} dangerouslySetInnerHTML={{ __html: iconSvg }} />,
      }}
    >
      {party.state && <BiaGame party={party} />}
    </PartyShell>
  );
}
