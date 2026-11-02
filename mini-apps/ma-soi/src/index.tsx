import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { MiniAppProps } from '@bang/sdk';
import { Avatar, Chips, PartyShell, SettingsCard, useParty, vibrate, type PartyData, type SettingsProps } from '@bang/party';
import { Button, cx } from '@bang/ui';
import { MAX, MIN, cleanConfig, type Config, holders, isWolf, roleCounts, seatOf, wolfGame, type LogEntry, type Step, type WolfParty, type WolfState } from './game';
import { roleInfo, roleOrder, strings, type Role, type TalkTime, type Toggle, type WolfCount } from './strings';
import s from './MaSoi.module.css';
import iconSvg from '../icon.svg?raw';

const opts = <T extends string>(rec: Record<T, string>) => (Object.keys(rec) as T[]).map((value) => ({ value, label: rec[value] }));
const wolfOpts = opts<WolfCount>(strings.wolfOptions);
const toggleOpts = opts<Toggle>(strings.toggleOptions);
const talkOpts = opts<TalkTime>(strings.talkOptions);

function WolfSettings({ value, onChange, editable, count }: SettingsProps<WolfState> & { count: number }) {
  const cfg = cleanConfig(value as Partial<Config>);
  const n = Math.min(count, MAX);
  const counts = roleCounts(n, cfg);
  const toggles: [keyof typeof cfg, Role][] = [
    ['seerOn', 'tientri'],
    ['guardOn', 'baove'],
    ['witchOn', 'phuthuy'],
    ['hunterOn', 'thosan'],
  ];
  return (
    <SettingsCard editable={editable}>
      <Chips label={strings.wolvesLabel} options={wolfOpts} value={cfg.wolves} onChange={(wolves) => onChange({ wolves })} disabled={!editable} />
      {toggles.map(([k, r]) => (
        <Chips key={k} label={roleInfo[r].name} options={toggleOpts} value={cfg[k] as Toggle} onChange={(v) => onChange({ [k]: v })} disabled={!editable} />
      ))}
      <Chips label={strings.talkLabel} options={talkOpts} value={cfg.talk} onChange={(talk) => onChange({ talk })} disabled={!editable} />
      <div className={s.suggest}>
        {count < MIN ? (
          <p>{strings.suggestFew(count)}</p>
        ) : (
          <>
            <p>{strings.suggestTitle(n)}</p>
            <ul className={s.suggestList}>
              {roleOrder.filter((r) => counts[r] > 0).map((r) => (
                <li key={r} className={cx(s.roleTag, r === 'soi' && s.wolfTag)}>{`${roleInfo[r].name} × ${counts[r]}`}</li>
              ))}
            </ul>
            {count > MAX && <p>{strings.suggestMany}</p>}
          </>
        )}
      </div>
    </SettingsCard>
  );
}

/** Đồng hồ chung của phòng, vẽ lại mỗi 250ms khi cần. */
function useClock(party: WolfParty, on: boolean) {
  const [, set] = useState(0);
  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => set((x) => x + 1), 250);
    return () => clearInterval(id);
  }, [on]);
  return party.now();
}

const mmss = (ms: number) => {
  const t = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

/** Màn che khi chơi 1 máy: chạm mới lộ phần bên trong. Đổi key để che lại. */
function Gate({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  if (open) return <>{children}</>;
  return (
    <button className={s.gate} onClick={() => setOpen(true)}>
      <span className={s.gateMoon} aria-hidden="true" />
      <strong className={s.gateTitle}>{title}</strong>
      <span className={s.gateHint}>{hint}</span>
      <span className={s.gateTap}>{strings.tapToSee}</span>
    </button>
  );
}

function RoleCard({ role, mates }: { role: Role; mates?: string }) {
  const info = roleInfo[role];
  return (
    <div className={cx(s.roleCard, role === 'soi' && s.roleWolf)}>
      <small className={s.roleKicker}>{strings.yourRole}</small>
      <strong className={s.roleName}>{info.name}</strong>
      <span className={s.roleTeam}>{info.team}</span>
      <p className={s.roleDesc}>{info.desc}</p>
      {mates && <p className={s.roleMates}>{strings.packmates(mates)}</p>}
    </div>
  );
}

/** Vai của mình ở chế độ phòng: che sẵn, chạm để xem. */
function MyRole({ st, seat, party }: { st: WolfState; seat: number; party: WolfParty }) {
  const [show, setShow] = useState(false);
  return show ? (
    <div className={s.myRole}>
      <RoleCard role={st.roles[seat]} mates={mates(st, seat, party)} />
      <button className={s.pill} onClick={() => setShow(false)}>{strings.hideRole}</button>
    </div>
  ) : (
    <button className={s.peekRole} onClick={() => setShow(true)}>{strings.showRole}</button>
  );
}

function mates(st: WolfState, seat: number, party: WolfParty) {
  if (!isWolf(st, seat)) return undefined;
  return st.seats.filter((_, i) => i !== seat && isWolf(st, i)).map((id) => party.nameOf(id)).join(', ') || undefined;
}

function Picker({ st, party, can, onPick, mark }: { st: WolfState; party: WolfParty; can: (i: number) => boolean; onPick: (i: number) => void; mark?: (i: number) => string | undefined }) {
  return (
    <div className={s.picker}>
      {st.seats.map((id, i) =>
        st.alive[i] ? (
          <button
            key={id}
            className={s.pick}
            disabled={!can(i)}
            onClick={() => {
              party.sfx('tap');
              vibrate(12);
              onPick(i);
            }}
          >
            <Avatar name={party.nameOf(id) || '?'} />
            <span className={s.pickName}>{party.nameOf(id)}</span>
            {mark?.(i) && <small className={s.pickMark}>{mark(i)}</small>}
          </button>
        ) : null,
      )}
    </div>
  );
}

function People({ st, party, showAll, viewer }: { st: WolfState; party: WolfParty; showAll: boolean; viewer: number }) {
  const viewerWolf = viewer >= 0 && isWolf(st, viewer);
  return (
    <ul className={s.people} aria-label={strings.people}>
      {st.seats.map((id, i) => {
        const role = showAll || (viewerWolf && isWolf(st, i) && i !== viewer) ? st.roles[i] : null;
        return (
          <li key={id} className={cx(s.person, !st.alive[i] && s.dead)}>
            <Avatar name={party.nameOf(id) || '?'} dim={!st.alive[i]} />
            <span className={s.personName}>
              {party.nameOf(id)}
              {i === viewer && party.mode === 'online' && <small> · {strings.you}</small>}
            </span>
            {role && <span className={cx(s.roleTag, role === 'soi' && s.wolfTag)}>{roleInfo[role].name}</span>}
            {!st.alive[i] && <span className={s.deadTag}>{strings.dead}</span>}
          </li>
        );
      })}
    </ul>
  );
}

const names = (st: WolfState, party: WolfParty, seats: number[]) => seats.map((i) => party.nameOf(st.seats[i])).join(', ');

function NightAction({ st, party, seat }: { st: WolfState; party: WolfParty; seat: number }) {
  const [poisonMode, setPoisonMode] = useState(false);
  const step = st.step;
  const local = party.mode === 'local';
  if (step === 'baove') {
    return (
      <section className={s.panel}>
        <h3 className={s.panelTitle}>{strings.guardPick}</h3>
        <Picker st={st} party={party} can={(i) => i !== st.lastGuard} mark={(i) => (i === st.lastGuard ? strings.guardNo : undefined)} onPick={(target) => party.dispatch({ type: 'guard', target })} />
      </section>
    );
  }
  if (step === 'soi') {
    const pack = holders(st, 'soi');
    const voted = st.wolfVotes[seat] !== null;
    const bite = (target: number) => {
      // Chơi 1 máy: cả bầy cùng nhìn một máy, chọn một lần là phiếu của cả bầy.
      const times = local ? pack.filter((w) => st.wolfVotes[w] === null).length : 1;
      for (let k = 0; k < times; k++) party.dispatch({ type: 'bite', target });
    };
    return (
      <section className={s.panel}>
        <h3 className={s.panelTitle}>{strings.wolfPick}</h3>
        {!local && pack.length > 1 && (
          <ul className={s.packVotes}>
            {pack.map((w) => (
              <li key={w}>
                {party.nameOf(st.seats[w])}: {st.wolfVotes[w] !== null ? strings.wolfVoted(party.nameOf(st.seats[st.wolfVotes[w]!])) : '…'}
              </li>
            ))}
          </ul>
        )}
        {voted ? <p className={s.hint}>{strings.wolfWait}</p> : <Picker st={st} party={party} can={(i) => !isWolf(st, i)} onPick={bite} />}
      </section>
    );
  }
  if (step === 'tientri') {
    const last = st.seen[st.seen.length - 1];
    return (
      <section className={s.panel}>
        {!st.peeked ? (
          <>
            <h3 className={s.panelTitle}>{strings.seerPick}</h3>
            <Picker st={st} party={party} can={(i) => i !== seat} onPick={(target) => party.dispatch({ type: 'peek', target })} />
          </>
        ) : (
          <>
            <p className={cx(s.big, last?.wolf && s.bigWolf)}>{last && strings.seerIs(party.nameOf(st.seats[last.target]), last.wolf)}</p>
            <Button variant="primary" block onClick={() => party.dispatch({ type: 'done' })}>{strings.seerDone}</Button>
          </>
        )}
        {st.seen.length > 0 && (
          <div className={s.seenLog}>
            <small>{strings.seerLog}</small>
            {st.seen.map((x, k) => (
              <span key={k} className={cx(s.roleTag, x.wolf && s.wolfTag)}>{`${party.nameOf(st.seats[x.target])}: ${x.wolf ? 'sói' : 'không'}`}</span>
            ))}
          </div>
        )}
      </section>
    );
  }
  if (step === 'phuthuy') {
    const victim = st.victim !== null ? party.nameOf(st.seats[st.victim]) : null;
    if (poisonMode) {
      return (
        <section className={s.panel}>
          <h3 className={s.panelTitle}>{strings.witchPoisonPick}</h3>
          <Picker st={st} party={party} can={(i) => i !== seat} onPick={(poison) => party.dispatch({ type: 'witch', save: false, poison })} />
          <button className={s.pill} onClick={() => setPoisonMode(false)}>{strings.cancel}</button>
        </section>
      );
    }
    return (
      <section className={s.panel}>
        <p className={s.big}>{strings.witchVictim(victim)}</p>
        <p className={s.hint}>{strings.witchLeft(st.heal, st.poison)}</p>
        <div className={s.actions}>
          {st.heal && st.victim !== null && <Button variant="primary" block onClick={() => party.dispatch({ type: 'witch', save: true, poison: null })}>{strings.witchSave}</Button>}
          {st.poison && <Button block onClick={() => setPoisonMode(true)}>{strings.witchPoison}</Button>}
          <Button block onClick={() => party.dispatch({ type: 'witch', save: false, poison: null })}>{strings.witchNone}</Button>
        </div>
      </section>
    );
  }
  return null;
}

const stepRole = (step: Step): Role => step;

function Night({ st, party, mySeat }: { st: WolfState; party: WolfParty; mySeat: number }) {
  const step = st.step!;
  const roleName = strings.stepNames[step];
  const who = holders(st, stepRole(step));
  const local = party.mode === 'local';
  if (who.length === 0) return <p className={s.sleep}>{strings.acting(roleName)}</p>;
  if (local) {
    const key = step === 'soi' ? `n${st.night}-soi` : `n${st.night}-${step}-${st.turn}`;
    return (
      <Gate key={key} title={strings.closeEyes} hint={strings.wakeUp(roleName)}>
        <NightAction st={st} party={party} seat={st.turn} />
      </Gate>
    );
  }
  if (mySeat >= 0 && st.alive[mySeat] && who.includes(mySeat)) return <NightAction key={`${st.night}-${step}`} st={st} party={party} seat={mySeat} />;
  return (
    <div className={s.sleepBox}>
      <p className={s.sleep}>{mySeat >= 0 && st.alive[mySeat] ? strings.sleeping : strings.acting(roleName)}</p>
      {mySeat >= 0 && st.alive[mySeat] && <p className={s.hint}>{strings.acting(roleName)}</p>}
    </div>
  );
}

function Dawn({ st, party }: { st: WolfState; party: WolfParty }) {
  const shots = st.log.filter((e): e is Extract<LogEntry, { kind: 'shot' }> => e.kind === 'shot');
  const lastNight = st.log.map((e) => e.kind).lastIndexOf('night');
  const shotToday = shots.filter((e) => st.log.indexOf(e) > lastNight);
  return (
    <div className={s.dawn}>
      <p className={s.big}>{st.deaths.length ? strings.dawnDead(names(st, party, st.deaths)) : strings.dawnPeace}</p>
      {shotToday.map((e, k) => (
        <p key={k} className={s.hint}>{strings.shot(party.nameOf(st.seats[e.seat]), party.nameOf(st.seats[e.target]))}</p>
      ))}
    </div>
  );
}

function Vote({ st, party, mySeat }: { st: WolfState; party: WolfParty; mySeat: number }) {
  const local = party.mode === 'local';
  const alive = st.alive.filter(Boolean).length;
  const done = st.votes.filter((v, i) => st.alive[i] && v !== null).length;
  const picker = (seat: number) => (
    <section className={s.panel}>
      <h3 className={s.panelTitle}>{strings.voteTitle}</h3>
      <Picker st={st} party={party} can={(i) => i !== seat} onPick={(target) => party.dispatch({ type: 'vote', target })} />
      <Button block onClick={() => party.dispatch({ type: 'vote', target: -1 })}>{strings.abstain}</Button>
    </section>
  );
  return (
    <>
      <p className={s.hint}>{strings.voted(done, alive)}</p>
      {local ? (
        <Gate key={`v${st.day}-${st.turn}`} title={strings.passTo(party.nameOf(st.seats[st.turn]))} hint={strings.passHint}>
          {picker(st.turn)}
        </Gate>
      ) : mySeat >= 0 && st.alive[mySeat] ? (
        st.votes[mySeat] === null ? picker(mySeat) : <p className={s.sleep}>{strings.votedYou}</p>
      ) : null}
      {party.isHost && (
        <button className={s.pill} onClick={() => party.dispatch({ type: 'closeVote' })}>{strings.closeVote}</button>
      )}
    </>
  );
}

function Verdict({ st, party }: { st: WolfState; party: WolfParty }) {
  const canGo = party.isHost || party.mode === 'local';
  // Đếm phiếu theo người bị bầu (-1 = bỏ qua) để vẽ thanh dài dần.
  const counts = new Map<number, number>();
  st.votes.forEach((v) => v !== null && counts.set(v, (counts.get(v) ?? 0) + 1));
  const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const max = rows.length ? rows[0][1] : 1;
  return (
    <section className={s.panel}>
      <p className={cx(s.big, st.hanged >= 0 && s.bigWolf)}>{st.hanged >= 0 ? strings.hanged(party.nameOf(st.seats[st.hanged])) : strings.noHang}</p>
      <ul className={s.tally}>
        {rows.map(([target, n], k) => (
          <li key={target} className={cx(s.tallyRow, target === st.hanged && s.tallyTop)}>
            <span className={s.tallyName}>{target >= 0 ? party.nameOf(st.seats[target]) : strings.abstain}</span>
            <span className={s.tallyTrack}>
              <span className={s.tallyBar} style={{ '--share': n / max, '--i': k } as CSSProperties} />
            </span>
            <b className={s.tallyCount}>{n}</b>
          </li>
        ))}
      </ul>
      <ul className={s.voteLines}>
        {st.votes.map((v, i) =>
          v === null ? null : (
            <li key={i}>{strings.voteLine(party.nameOf(st.seats[i]), v >= 0 ? party.nameOf(st.seats[v]) : strings.abstain)}</li>
          ),
        )}
      </ul>
      {canGo ? <Button variant="primary" block onClick={() => party.dispatch({ type: 'continue' })}>{strings.continue}</Button> : <p className={s.hint}>{strings.waitHost}</p>}
    </section>
  );
}

function Hunter({ st, party, mySeat }: { st: WolfState; party: WolfParty; mySeat: number }) {
  const h = st.hunter!;
  const name = party.nameOf(st.seats[h]);
  const mine = party.mode === 'local' || mySeat === h;
  return (
    <section className={s.panel}>
      {st.after === 'day' && <Dawn st={st} party={party} />}
      <p className={s.big}>{strings.hunterTitle(name)}</p>
      {mine ? (
        <>
          <h3 className={s.panelTitle}>{strings.hunterPick}</h3>
          <Picker st={st} party={party} can={(i) => i !== h} onPick={(target) => party.dispatch({ type: 'shoot', target })} />
          <Button block onClick={() => party.dispatch({ type: 'shoot', target: -1 })}>{strings.hunterSkip}</Button>
        </>
      ) : (
        <p className={s.hint}>{strings.hunterWait(name)}</p>
      )}
    </section>
  );
}

function Log({ st, party }: { st: WolfState; party: WolfParty }) {
  if (!st.log.length) return null;
  return (
    <details className={s.log}>
      <summary>{strings.log}</summary>
      <ul>
        {st.log.map((e, k) => (
          <li key={k}>
            {e.kind === 'night'
              ? strings.logNight(e.n, names(st, party, e.seats))
              : e.kind === 'hang'
                ? strings.logHang(e.n, e.seat >= 0 ? party.nameOf(st.seats[e.seat]) : '')
                : strings.logShot(party.nameOf(st.seats[e.seat]), party.nameOf(st.seats[e.target]))}
          </li>
        ))}
      </ul>
    </details>
  );
}

function WolfGame({ party }: { party: WolfParty }) {
  const st = party.state!;
  const local = party.mode === 'local';
  const mySeat = local ? -1 : seatOf(st, party.me);
  const ticking = st.deadline > 0;
  const now = useClock(party, ticking);
  const dispatch = useRef(party.dispatch);
  dispatch.current = party.dispatch;
  const clock = useRef(party.now);
  clock.current = party.now;
  const isHost = party.isHost;
  const sfx = useRef(party.sfx);
  sfx.current = party.sfx;

  // Máy giữ luật tự đẩy bước khi hết giờ (vai giả, hết giờ thảo luận).
  useEffect(() => {
    if (!isHost || !st.deadline) return;
    const id = setTimeout(() => dispatch.current({ type: 'tick' }), Math.max(0, st.deadline - clock.current()) + 50);
    return () => clearTimeout(id);
  }, [isHost, st.deadline]);

  useEffect(() => {
    if (st.phase === 'over') sfx.current('win');
    else if (st.phase === 'day' || st.phase === 'verdict') {
      sfx.current('buzz');
      vibrate([30, 60, 30]);
    } else sfx.current('tap');
  }, [st.phase]);

  const showAll = st.phase === 'over' || (mySeat >= 0 && !st.alive[mySeat] && st.phase !== 'reveal');
  const head =
    st.phase === 'night' ? strings.night(st.night) : st.phase === 'reveal' ? strings.revealTitle : st.day > 0 ? strings.day(st.day) : strings.title;
  const nightTone = st.phase === 'night' || st.phase === 'reveal';

  let body: ReactNode = null;
  if (st.phase === 'few') body = <p className={s.big}>{strings.few}</p>;
  else if (st.phase === 'reveal') {
    const done = st.ready.filter(Boolean).length;
    body = local ? (
      <Gate key={`r${st.turn}`} title={strings.passTo(party.nameOf(st.seats[st.turn]))} hint={strings.passHint}>
        <RoleCard role={st.roles[st.turn]} mates={mates(st, st.turn, party)} />
        <Button variant="primary" block onClick={() => party.dispatch({ type: 'ready' })}>{strings.readyNext}</Button>
      </Gate>
    ) : (
      <>
        {mySeat >= 0 ? (
          <>
            <MyRole st={st} seat={mySeat} party={party} />
            {!st.ready[mySeat] && <Button variant="primary" block onClick={() => party.dispatch({ type: 'ready' })}>{strings.readyBtn}</Button>}
          </>
        ) : (
          <p className={s.hint}>{strings.watching}</p>
        )}
        <p className={s.hint}>{strings.readyCount(done, st.seats.length)}</p>
      </>
    );
  } else if (st.phase === 'night') body = <Night st={st} party={party} mySeat={mySeat} />;
  else if (st.phase === 'day')
    body = (
      <>
        <Dawn st={st} party={party} />
        <div className={cx(s.timer, st.deadline - now <= 10000 && s.timerLow)}>
          <span>{strings.talk}</span>
          <strong>{mmss(st.deadline - now)}</strong>
        </div>
        {party.isHost && <Button variant="primary" block onClick={() => party.dispatch({ type: 'startVote' })}>{strings.voteNow}</Button>}
      </>
    );
  else if (st.phase === 'vote') body = <Vote st={st} party={party} mySeat={mySeat} />;
  else if (st.phase === 'verdict') body = <Verdict st={st} party={party} />;
  else if (st.phase === 'hunter') body = <Hunter st={st} party={party} mySeat={mySeat} />;
  else if (st.phase === 'over')
    body = (
      <>
        <p className={cx(s.winner, st.winner === 'wolf' && s.bigWolf)}>{st.winner === 'wolf' ? strings.wolfWin : strings.villageWin}</p>
        {party.isHost ? (
          <Button variant="primary" block onClick={() => party.dispatch({ type: 'restart' })}>{strings.newGame}</Button>
        ) : (
          <p className={s.hint}>{strings.waitNewGame}</p>
        )}
      </>
    );

  const stuck = party.isHost && !local && (st.phase === 'reveal' || st.phase === 'hunter' || (st.phase === 'night' && st.deadline === 0));

  return (
    <div className={cx(s.game, nightTone && s.night)}>
      <div className={s.head}>
        <span key={head} className={s.phaseBanner}>
          <span className={s.phaseIcon} aria-hidden="true" />
          <span className={s.phase} aria-live="polite">{head}</span>
        </span>
        {st.phase !== 'over' && st.phase !== 'few' && mySeat >= 0 && !st.alive[mySeat] && <span className={s.deadTag}>{strings.dead}</span>}
      </div>
      {body}
      {!local && mySeat >= 0 && st.alive[mySeat] && st.phase !== 'reveal' && st.phase !== 'over' && st.phase !== 'few' && st.phase !== 'night' && (
        <MyRole st={st} seat={mySeat} party={party} />
      )}
      {mySeat >= 0 && !st.alive[mySeat] && st.phase !== 'over' && <p className={s.hint}>{strings.deadView}</p>}
      {st.phase !== 'reveal' && st.phase !== 'few' && <People st={st} party={party} showAll={showAll} viewer={showAll ? -1 : mySeat} />}
      {(st.phase === 'over' || showAll) && <Log st={st} party={party} />}
      {stuck && (
        <button className={s.ghostLink} onClick={() => party.dispatch({ type: 'force' })}>{strings.skipStuck}</button>
      )}
    </div>
  );
}

export default function MaSoi({ ctx }: MiniAppProps<PartyData>) {
  const party = useParty(wolfGame, ctx);
  return (
    <PartyShell
      party={party}
      together
      info={{
        title: strings.title,
        rule: strings.rule,
        art: <span className={s.heroArt} dangerouslySetInnerHTML={{ __html: iconSvg }} />,
        settings: (p) => <WolfSettings {...p} count={party.players.length} />,
      }}
    >
      {party.state && <WolfGame party={party} />}
    </PartyShell>
  );
}
