import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { MiniAppProps } from '@bang/sdk';
import { Avatar, Chips, PartyShell, SettingsCard, useParty, vibrate, type PartyData, type SettingsProps } from '@bang/party';
import { Button, cx } from '@bang/ui';
import { BASE_KINDS, CLAIM_KINDS, blockRule, canReact, claimRole, cost, targeted, trieuGame, type Ev, type TrieuParty, type TrieuState } from './game';
import { kindDesc, kindNames, roleDesc, roleNames, strings, type Goal, type Kind, type WindowSec } from './strings';
import s from './MuuTrieu.module.css';
import iconSvg from '../icon.svg?raw';

const opts = <T extends string>(rec: Record<T, string>) => (Object.keys(rec) as T[]).map((value) => ({ value, label: rec[value] }));
const windowOpts = opts<WindowSec>(strings.windowOptions);
const goalOpts = opts<Goal>(strings.goalOptions);

function TrieuSettings({ value, onChange, editable }: SettingsProps<TrieuState>) {
  return (
    <SettingsCard editable={editable}>
      <Chips label={strings.windowLabel} options={windowOpts} value={value.window ?? '12'} onChange={(window) => onChange({ window })} disabled={!editable} />
      <Chips label={strings.goalLabel} options={goalOpts} value={value.goal ?? '6'} onChange={(goal) => onChange({ goal })} disabled={!editable} />
    </SettingsCard>
  );
}

function useClock(party: TrieuParty, on: boolean) {
  const [, set] = useState(0);
  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => set((x) => x + 1), 250);
    return () => clearInterval(id);
  }, [on]);
  return party.now();
}

function Gate({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  if (open) return <>{children}</>;
  return (
    <button className={s.gate} onClick={() => setOpen(true)}>
      <span className={s.gateSeal} aria-hidden="true" />
      <strong className={s.gateTitle}>{title}</strong>
      <span className={s.gateHint}>{strings.passHint}</span>
      <span className={s.gateTap}>{strings.tapToSee}</span>
    </button>
  );
}

/** Chỉ hiện khi đang giữ ngón tay: xem bí mật trên máy chung hoặc giữa phòng đông người. */
function Hold({ label, children }: { label: string; children: ReactNode }) {
  const [on, setOn] = useState(false);
  return (
    <button
      className={cx(s.hold, on && s.holdOn)}
      onPointerDown={() => setOn(true)}
      onPointerUp={() => setOn(false)}
      onPointerLeave={() => setOn(false)}
      onPointerCancel={() => setOn(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {on ? children : label}
    </button>
  );
}

function RoleCard({ st, seat }: { st: TrieuState; seat: number }) {
  const role = st.roles[seat];
  return (
    <div className={s.roleCard}>
      <small>{strings.yourRole}{st.revealed[seat] ? ` · ${strings.revealed}` : ''}</small>
      <strong>{roleNames[role]}</strong>
      <span>{roleDesc[role]}</span>
    </div>
  );
}

function Notes({ st, seat, party }: { st: TrieuState; seat: number; party: TrieuParty }) {
  const mine = st.notes.filter((n) => n.seat === seat);
  if (!mine.length) return null;
  return (
    <p className={s.notes}>
      <small>{strings.notes}: </small>
      {mine.map((n) => strings.note(party.nameOf(st.seats[n.target]), roleNames[n.role])).join(' · ')}
    </p>
  );
}

function Court({ st, party, mySeat, showAll }: { st: TrieuState; party: TrieuParty; mySeat: number; showAll: boolean }) {
  return (
    <ul className={s.court}>
      {st.seats.map((id, i) => (
        <li key={id} className={cx(s.seat, st.turn === i && st.phase !== 'over' && s.seatOn, st.out[i] && s.seatOut, st.winner === i && s.seatWin)}>
          <Avatar name={party.nameOf(id) || '?'} dim={st.out[i]} />
          <div className={s.seatMain}>
            <span className={s.seatName}>
              {party.nameOf(id)}
              {i === mySeat && <small> · {strings.you}</small>}
            </span>
            <span className={s.tags}>
              {(st.revealed[i] || showAll) && <span className={s.roleTag}>{roleNames[st.roles[i]]}</span>}
              {st.out[i] && <span className={s.outTag}>{strings.outTag}</span>}
            </span>
          </div>
          <span className={s.stat} title={strings.silver}><b key={st.silver[i]} className={s.statBump}>{st.silver[i]}</b><small>{strings.silver}</small></span>
          <span className={cx(s.stat, s.statFavor)} title={strings.favor}><b key={st.favor[i]} className={s.statBump}>{st.favor[i]}</b><small>{strings.favor}</small></span>
          <span className={cx(s.stat, st.crimes[i] > 0 && s.statCrime)} title={strings.crimes}><b key={st.crimes[i]} className={s.statBump}>{st.crimes[i]}</b><small>{strings.crimes}</small></span>
        </li>
      ))}
    </ul>
  );
}

function describe(e: Ev, st: TrieuState, party: TrieuParty) {
  const n = (i: number) => party.nameOf(st.seats[i]);
  switch (e.k) {
    case 'act':
      return strings.evAct(n(e.seat), kindNames[e.kind], e.target !== null ? n(e.target) : undefined);
    case 'challenge':
      return e.truthful ? strings.evTrue(n(e.claimant), n(e.accuser), roleNames[e.role]) : strings.evLie(n(e.claimant), n(e.accuser), roleNames[e.role]);
    case 'blocked':
      return strings.evBlocked(n(e.seat), roleNames[e.role]);
    case 'pay':
      return strings.evPay(n(e.seat), n(e.to));
    case 'crime':
      return strings.evCrime(n(e.seat));
    case 'out':
      return strings.evOut(n(e.seat));
    case 'swap':
      return strings.evSwap(n(e.seat));
  }
}

function TurnPanel({ st, party, seat }: { st: TrieuState; party: TrieuParty; seat: number }) {
  const [aim, setAim] = useState<Kind | null>(null);
  const money = st.silver[seat];
  const go = (kind: Kind) => {
    if (targeted.includes(kind)) return setAim(kind);
    party.dispatch({ type: 'act', kind });
  };
  if (aim) {
    return (
      <section className={s.panel}>
        <h3 className={s.panelTitle}>{strings.pickTarget(kindNames[aim])}</h3>
        <div className={s.targets}>
          {st.seats.map((id, i) =>
            i === seat || st.out[i] ? null : (
              <Button key={id} onClick={() => party.dispatch({ type: 'act', kind: aim, target: i })}>{party.nameOf(id)}</Button>
            ),
          )}
        </div>
        <button className={s.pill} onClick={() => setAim(null)}>{strings.cancel}</button>
      </section>
    );
  }
  const btn = (kind: Kind) => {
    const price = cost[kind] ?? 0;
    const role = claimRole[kind];
    return (
      <button key={kind} className={cx(s.kind, role && s.kindClaim)} disabled={money < price} onClick={() => go(kind)}>
        <strong>{kindNames[kind]}</strong>
        <small>{role ? `${strings.claimAs(roleNames[role])} · ` : ''}{money < price ? strings.noMoney(price) : kindDesc[kind]}</small>
      </button>
    );
  };
  return (
    <section className={s.panel}>
      <h3 className={s.groupTitle}>{strings.baseTitle}</h3>
      <div className={s.kinds}>{BASE_KINDS.map(btn)}</div>
      <h3 className={s.groupTitle}>{strings.claimTitle}</h3>
      <div className={s.kinds}>{CLAIM_KINDS.map(btn)}</div>
    </section>
  );
}

function WindowPanel({ st, party, mySeat, now }: { st: TrieuState; party: TrieuParty; mySeat: number; now: number }) {
  const p = st.pending!;
  const local = party.mode === 'local';
  const actor = party.nameOf(st.seats[p.actor]);
  const rule = blockRule[p.kind];
  const role = claimRole[p.kind]!;
  const left = Math.max(0, Math.ceil((st.deadline - now) / 1000));
  const total = Number(st.window);
  const reactors = st.seats.map((_, i) => i).filter((i) => {
    const r = canReact(st, i);
    return r.challenge || r.block;
  });
  const me = canReact(st, mySeat);
  return (
    <section className={s.window}>
      <p className={s.claim}>
        <strong>{strings.windowTitle(actor, kindNames[p.kind])}</strong>
        <span>
          {strings.windowClaim(roleNames[role])}
          {p.target !== null && ` · ${strings.windowOn(party.nameOf(st.seats[p.target]))}`}
        </span>
      </p>
      {st.phase === 'block' && st.blocker !== null && rule && <p className={s.blockLine}>{strings.blockTitle(party.nameOf(st.seats[st.blocker]), roleNames[rule.role])}</p>}
      <div className={cx(s.bar, left <= 3 && s.barLow)} aria-label={strings.countdown(left)}>
        <span style={{ transform: `scaleX(${Math.min(1, left / total)})` }} />
        <b>{strings.countdown(left)}</b>
      </div>
      {local ? (
        <>
          <ul className={s.reactors}>
            {reactors.map((i) => {
              const r = canReact(st, i);
              const name = party.nameOf(st.seats[i]);
              return (
                <li key={i} className={s.reactor}>
                  <span className={s.reactorName}>{name}</span>
                  <button className={cx(s.react, s.reactChallenge)} onClick={() => party.dispatch({ type: 'challenge', by: i })}>{strings.challenge}</button>
                  {r.block && rule && (
                    <button className={s.react} onClick={() => party.dispatch({ type: 'block', by: i })}>{strings.block(roleNames[rule.role])}</button>
                  )}
                  <button className={s.react} onClick={() => party.dispatch({ type: 'pass', by: i })}>{strings.letGo}</button>
                </li>
              );
            })}
          </ul>
          <Button variant="primary" block onClick={() => party.dispatch({ type: 'proceed' })}>{strings.letAll}</Button>
        </>
      ) : me.challenge || me.block ? (
        <div className={s.myReact}>
          <Button variant="danger" onClick={() => party.dispatch({ type: 'challenge' })}>{strings.challenge}</Button>
          {me.block && rule && <Button onClick={() => party.dispatch({ type: 'block' })}>{strings.block(roleNames[rule.role])}</Button>}
          <Button onClick={() => party.dispatch({ type: 'pass' })}>{strings.letGo}</Button>
        </div>
      ) : (
        <p className={s.hint}>{mySeat >= 0 && st.passed[mySeat] ? strings.passed : strings.waiting}</p>
      )}
    </section>
  );
}

function ChoosePanel({ st, party, mySeat }: { st: TrieuState; party: TrieuParty; mySeat: number }) {
  const p = st.pending!;
  const t = p.target!;
  const mine = party.mode === 'local' || mySeat === t;
  return (
    <section className={s.window}>
      <p className={s.claim}><strong>{strings.chooseTitle(party.nameOf(st.seats[p.actor]))}</strong></p>
      {mine ? (
        <div className={s.myReact}>
          <Button variant="primary" onClick={() => party.dispatch({ type: 'choose', pay: true })}>{strings.pay}</Button>
          <Button variant="danger" onClick={() => party.dispatch({ type: 'choose', pay: false })}>{strings.takeCrime}</Button>
        </div>
      ) : (
        <p className={s.hint}>{strings.chooseWait(party.nameOf(st.seats[t]))}</p>
      )}
    </section>
  );
}

function TrieuGame({ party }: { party: TrieuParty }) {
  const st = party.state!;
  const local = party.mode === 'local';
  const mySeat = local ? -1 : st.seats.indexOf(party.me);
  const now = useClock(party, st.deadline > 0);
  const dispatch = useRef(party.dispatch);
  dispatch.current = party.dispatch;
  const clock = useRef(party.now);
  clock.current = party.now;
  const sfx = useRef(party.sfx);
  sfx.current = party.sfx;
  const isHost = party.isHost;

  // Máy giữ luật tự đóng cửa sổ hặc/can khi hết giờ.
  useEffect(() => {
    if (!isHost || !st.deadline) return;
    const id = setTimeout(() => dispatch.current({ type: 'timeout' }), Math.max(0, st.deadline - clock.current()) + 60);
    return () => clearTimeout(id);
  }, [isHost, st.deadline]);

  const lastEv = st.log[st.log.length - 1];
  useEffect(() => {
    if (!lastEv) return;
    if (lastEv.k === 'challenge' || lastEv.k === 'out' || lastEv.k === 'crime') {
      sfx.current('buzz');
      vibrate([25, 50, 25]);
    } else sfx.current('tap');
  }, [lastEv]);
  useEffect(() => {
    if (st.phase === 'over') {
      sfx.current('win');
      vibrate([30, 50, 30]);
    }
    if (st.phase === 'claim' || st.phase === 'block') vibrate(15);
  }, [st.phase]);
  // Cửa sổ hặc/can còn vài giây: tích tắc nhắc.
  const windowLeft = st.deadline > 0 && (st.phase === 'claim' || st.phase === 'block') ? Math.ceil((st.deadline - now) / 1000) : 0;
  useEffect(() => {
    if (windowLeft > 0 && windowLeft <= 3) sfx.current('tick');
  }, [windowLeft]);

  const over = st.phase === 'over';
  const lastNote = st.notes[st.notes.length - 1];
  const freshNote = lastNote && lastNote.turnNo === st.turnNo - 1 ? lastNote : null;

  let body: ReactNode;
  if (over) {
    body = (
      <>
        <p className={s.winner}>{strings.won(party.nameOf(st.seats[st.winner!]))}</p>
        {isHost ? <Button variant="primary" block onClick={() => party.dispatch({ type: 'restart' })}>{strings.newGame}</Button> : <p className={s.hint}>{strings.waitNewGame}</p>}
      </>
    );
  } else if (st.phase === 'turn') {
    if (local) {
      body = (
        <Gate key={st.turnNo} title={strings.passTo(party.nameOf(st.seats[st.turn]))}>
          <RoleCard st={st} seat={st.turn} />
          <Notes st={st} seat={st.turn} party={party} />
          <TurnPanel st={st} party={party} seat={st.turn} />
        </Gate>
      );
    } else if (mySeat === st.turn) {
      body = (
        <>
          <p className={cx(s.status, s.statusOn)}>{strings.yourTurn}</p>
          <TurnPanel key={st.turnNo} st={st} party={party} seat={mySeat} />
        </>
      );
    } else body = <p className={s.status}>{mySeat < 0 ? strings.watching : strings.waitTurn(party.nameOf(st.seats[st.turn]))}</p>;
  } else if (st.phase === 'choose') body = <ChoosePanel st={st} party={party} mySeat={mySeat} />;
  else body = <WindowPanel st={st} party={party} mySeat={mySeat} now={now} />;

  return (
    <div className={s.game}>
      <Court st={st} party={party} mySeat={mySeat} showAll={over} />
      {body}
      {local && freshNote && !over && (
        <Hold label={strings.hold(party.nameOf(st.seats[freshNote.seat]))}>
          {strings.note(party.nameOf(st.seats[freshNote.target]), roleNames[freshNote.role])}
        </Hold>
      )}
      {!local && mySeat >= 0 && !over && (
        <div className={s.mine}>
          <Hold label={strings.showRole}>
            <RoleCard st={st} seat={mySeat} />
          </Hold>
          <Notes st={st} seat={mySeat} party={party} />
        </div>
      )}
      {st.log.length > 0 && (
        <section className={s.log} aria-live="polite">
          <h3>{strings.log}</h3>
          <ol>
            {st.log.slice(-6).reverse().map((e, k) => (
              <li key={st.log.length - k}>{describe(e, st, party)}</li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

export default function MuuTrieu({ ctx }: MiniAppProps<PartyData>) {
  const party = useParty(trieuGame, ctx);
  return (
    <PartyShell
      party={party}
      info={{
        title: strings.title,
        rule: strings.rule,
        art: <span className={s.heroArt} dangerouslySetInnerHTML={{ __html: iconSvg }} />,
        settings: (p) => <TrieuSettings {...p} />,
      }}
    >
      {party.state && <TrieuGame party={party} />}
    </PartyShell>
  );
}
