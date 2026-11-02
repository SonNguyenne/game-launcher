import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { MiniAppProps } from '@bang/sdk';
import { Avatar, Chips, PartyShell, SettingsCard, useParty, vibrate, type PartyData, type SettingsProps } from '@bang/party';
import { Button, cx } from '@bang/ui';
import { baiGame, card, leaders, legalPlay, penaltyOf, type BaiParty, type BaiState, type Event } from './game';
import { actNames, heGlyph, heNames, strings, type Rounds } from './strings';
import s from './BaiMau.module.css';
import iconSvg from '../icon.svg?raw';

const roundOpts = (Object.keys(strings.roundsOptions) as Rounds[]).map((value) => ({ value, label: strings.roundsOptions[value] }));
const heClass = [s.moc, s.hoa, s.tho, s.kim, s.thuy];

function BaiSettings({ value, onChange, editable }: SettingsProps<BaiState>) {
  return (
    <SettingsCard editable={editable}>
      <Chips label={strings.roundsLabel} options={roundOpts} value={value.rounds ?? '3'} onChange={(rounds) => onChange({ rounds })} disabled={!editable} />
    </SettingsCard>
  );
}

const faceOf = (id: number) => {
  const c = card(id);
  return c.act ? actNames[c.act] : String(c.n);
};
const labelOf = (id: number) => strings.cardLabel(heNames[card(id).he], faceOf(id));

/** Chỉ chạy hiệu ứng sau lần vẽ đầu: tải lại giữa ván không diễn lại. */
function useAfterMount() {
  const ready = useRef(false);
  const was = ready.current;
  useEffect(() => {
    ready.current = true;
  }, []);
  return was;
}

function CardFace({ id, big, order, selected, glow, onClick, disabled, anim, index }: { id: number; big?: boolean; order?: number; selected?: boolean; glow?: boolean; onClick?: () => void; disabled?: boolean; anim?: 'deal' | 'land'; index?: number }) {
  const c = card(id);
  const body = (
    <>
      <span className={s.glyph} aria-hidden="true">{heGlyph[c.he]}</span>
      <span className={cx(s.face, c.act && s.faceAct)}>{faceOf(id)}</span>
      <span className={s.heName}>{heNames[c.he]}</span>
      {order !== undefined && <span className={s.order}>{order}</span>}
    </>
  );
  const cls = cx(s.card, heClass[c.he], big && s.cardBig, selected && s.selected, glow && s.glow, anim === 'deal' && s.dealt, anim === 'land' && s.land);
  const style = index !== undefined ? ({ '--i': index } as CSSProperties) : undefined;
  if (!onClick) return <div className={cls} style={style} aria-label={labelOf(id)}>{body}</div>;
  return (
    <button className={cls} style={style} onClick={onClick} disabled={disabled} aria-pressed={selected} aria-label={labelOf(id)}>
      {body}
    </button>
  );
}

function Gate({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  if (open) return <>{children}</>;
  return (
    <button className={s.gate} onClick={() => setOpen(true)}>
      <span className={s.gateBack} aria-hidden="true" />
      <strong className={s.gateTitle}>{title}</strong>
      <span className={s.gateHint}>{strings.passHint}</span>
      <span className={s.gateTap}>{strings.tapToSee}</span>
    </button>
  );
}

function describe(e: Event, st: BaiState, party: BaiParty) {
  const name = (i: number) => party.nameOf(st.seats[i]);
  if (e.kind === 'draw') return e.empty ? `${strings.evDraw(name(e.seat))} · ${strings.evEmpty}` : strings.evDraw(name(e.seat));
  if (e.kind === 'pass') return strings.evPass(name(e.seat));
  const what = e.ngu ? strings.ngu : e.cards.map(labelOf).join(', ');
  const parts = [strings.evPlay(name(e.seat), what)];
  if (e.gaveTo !== undefined) parts.push(strings.evGive(name(e.seat), name(e.gaveTo)));
  if (e.hit) parts.push(e.hit.length ? strings.evKhac(e.hit.map(name).join(', ')) : strings.evKhacNone);
  return parts.join(' · ');
}

function Table({ st, party, mySeat }: { st: BaiState; party: BaiParty; mySeat: number }) {
  const top = st.pile[st.pile.length - 1];
  const last = st.events[st.events.length - 1];
  const ready = useAfterMount();
  return (
    <>
      <ul className={s.seats}>
        {st.seats.map((id, i) => (
          <li key={id} className={cx(s.seat, st.turn === i && st.phase !== 'roundEnd' && st.phase !== 'over' && s.seatOn)}>
            <Avatar name={party.nameOf(id) || '?'} />
            <span className={s.seatName}>
              {party.nameOf(id)}
              {i === mySeat && <small> · {strings.you}</small>}
            </span>
            <span className={s.count}>{strings.cards(st.hands[i]?.length ?? 0)}</span>
            <span className={s.score}>{st.scores[i]}</span>
          </li>
        ))}
      </ul>
      <div className={s.table}>
        {/* Khóa theo số lá trong chồng: có lá mới thì nó bay vào giữa bàn. */}
        {top !== undefined && <CardFace key={`${top}-${st.pile.length}`} id={top} big anim={ready ? 'land' : undefined} />}
        <div className={s.tableInfo}>
          <span className={s.round}>{strings.round(st.round, Number(st.rounds))}</span>
          <span className={s.deck}>{strings.deck(st.deck.length)}</span>
          {st.sinhHe !== null && <span className={s.sinhTag}>{strings.sinhTurn(heNames[st.sinhHe])}</span>}
        </div>
      </div>
      {last && <p className={s.event} aria-live="polite">{describe(last, st, party)}</p>}
    </>
  );
}

function Hand({ st, party, seat, deal }: { st: BaiState; party: BaiParty; seat: number; deal: boolean }) {
  const hand = st.hands[seat];
  const mine = st.turn === seat && (st.phase === 'play' || st.phase === 'sinh' || st.phase === 'drawn');
  const [sel, setSel] = useState<number[]>(st.phase === 'drawn' && st.drawn !== null ? [st.drawn] : []);
  const [giving, setGiving] = useState<number | null>(null);
  const [giveMode, setGiveMode] = useState(false);
  const sorted = [...hand].sort((a, b) => card(a).he - card(b).he || card(a).n - card(b).n || a - b);
  const ok = mine && legalPlay(st, hand, sel);
  const rest = hand.filter((id) => !sel.includes(id));
  const needsGive = ok && sel.length === 1 && card(sel[0]).act === 'gui' && rest.length > 0;

  const toggle = (id: number) => {
    if (!mine || st.phase === 'drawn') return;
    party.sfx('tick');
    setSel((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  };
  const play = () => {
    if (needsGive) return setGiveMode(true);
    party.dispatch({ type: 'play', cards: sel });
  };

  if (giveMode) {
    return (
      <section className={s.panel}>
        <h3 className={s.panelTitle}>{strings.givePick}</h3>
        <div className={s.hand}>
          {rest.map((id) => (
            <CardFace key={id} id={id} selected={giving === id} onClick={() => setGiving(id)} />
          ))}
        </div>
        <h3 className={s.panelTitle}>{strings.giveTo}</h3>
        <div className={s.targets}>
          {st.seats.map((id, i) =>
            i === seat ? null : (
              <Button key={id} disabled={giving === null} onClick={() => giving !== null && party.dispatch({ type: 'play', cards: sel, give: { card: giving, to: i } })}>
                {party.nameOf(id)}
              </Button>
            ),
          )}
        </div>
        <button className={s.pill} onClick={() => setGiveMode(false)}>{strings.cancel}</button>
      </section>
    );
  }

  return (
    <section className={s.panel}>
      <p className={s.penaltyHint}>{`${strings.cards(hand.length)} · ${strings.penalty(hand.reduce((a, id) => a + penaltyOf(id), 0))}`}</p>
      <div className={s.hand}>
        {sorted.map((id, i) => (
          <CardFace
            key={id}
            id={id}
            index={i}
            anim={deal ? 'deal' : undefined}
            selected={sel.includes(id)}
            glow={st.phase === 'drawn' && st.drawn === id && st.turn === seat}
            order={sel.length > 1 && sel.includes(id) ? sel.indexOf(id) + 1 : undefined}
            onClick={() => toggle(id)}
            disabled={!mine}
          />
        ))}
      </div>
      {mine && (
        <>
          <div className={s.actions}>
            <Button variant="primary" disabled={!ok} onClick={play}>
              {sel.length && !ok ? strings.invalid : strings.playN(sel.length)}
            </Button>
            {st.phase === 'drawn' ? (
              <Button onClick={() => party.dispatch({ type: 'pass' })}>{strings.keep}</Button>
            ) : (
              <Button onClick={() => party.dispatch({ type: 'draw' })}>{st.phase === 'sinh' ? strings.drawEnd : strings.draw}</Button>
            )}
          </div>
          {sel.length > 0 && st.phase !== 'drawn' && <button className={s.pill} onClick={() => setSel([])}>{strings.clear}</button>}
          <p className={s.hint}>{st.phase === 'drawn' ? strings.drawnTurn : strings.setHint}</p>
        </>
      )}
    </section>
  );
}

function RoundEnd({ st, party }: { st: BaiState; party: BaiParty }) {
  const over = st.phase === 'over';
  const best = leaders(st.scores);
  return (
    <section className={s.panel}>
      <p className={cx(s.big, s.pop)} role="status">{strings.roundOver(st.roundWinner >= 0 ? party.nameOf(st.seats[st.roundWinner]) : null)}</p>
      {st.wentNgu && <p className={s.hint}>{strings.roundNgu}</p>}
      {over && (
        <p className={cx(s.winner, s.pop)}>
          {best.length === 1 ? strings.matchWin(party.nameOf(st.seats[best[0]])) : strings.matchTie(best.map((i) => party.nameOf(st.seats[i])).join(', '))}
        </p>
      )}
      <table className={s.scoreTable}>
        <thead>
          <tr>
            <th>{strings.roundTable}</th>
            <th>{strings.thisRound}</th>
            <th>{strings.total}</th>
          </tr>
        </thead>
        <tbody>
          {st.seats.map((id, i) => (
            <tr key={id} className={cx(over && best.includes(i) && s.best)}>
              <td>{party.nameOf(id)}</td>
              <td>
                {st.roundScores?.[i] ?? 0}
                <span className={s.leftCards}>{st.hands[i].map((c) => `${faceOf(c)}`).join(' ')}</span>
              </td>
              <td>{st.scores[i]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {party.isHost ? (
        <Button variant="primary" block onClick={() => party.dispatch({ type: over ? 'restart' : 'nextRound' })}>{over ? strings.newGame : strings.nextRound}</Button>
      ) : (
        <p className={s.hint}>{strings.waitHost}</p>
      )}
    </section>
  );
}

function BaiGame({ party }: { party: BaiParty }) {
  const st = party.state!;
  const local = party.mode === 'local';
  const mySeat = local ? st.turn : st.seats.indexOf(party.me);
  const ended = st.phase === 'roundEnd' || st.phase === 'over';
  const sfx = useRef(party.sfx);
  sfx.current = party.sfx;
  const evCount = st.events.length;
  const lastEv = st.events[evCount - 1];

  useEffect(() => {
    if (!lastEv) return;
    if (lastEv.kind === 'play' && lastEv.hit?.length) {
      sfx.current('buzz');
      vibrate([20, 40, 20]);
    } else sfx.current('tap');
  }, [lastEv]);
  useEffect(() => {
    if (ended) {
      sfx.current('win');
      vibrate([30, 40, 60]);
    }
  }, [ended]);
  // Chia bài: chạy khi mới vào ván / sang ván mới rồi tắt, không lặp mỗi lượt.
  const [dealing, setDealing] = useState(st.turnNo === 0);
  const lastRound = useRef(st.round);
  useEffect(() => {
    if (lastRound.current !== st.round) {
      lastRound.current = st.round;
      setDealing(true);
    }
  }, [st.round]);
  useEffect(() => {
    if (!dealing) return;
    sfx.current('tick');
    const id = setTimeout(() => setDealing(false), 1600);
    return () => clearTimeout(id);
  }, [dealing]);
  useEffect(() => {
    if (!local && st.turn === mySeat && !ended) vibrate(15);
  }, [st.turnNo, local, mySeat, st.turn, ended]);

  if (st.seats.length < 2) return null;
  const status = ended
    ? ''
    : mySeat < 0
      ? strings.watching
      : st.turn === mySeat
        ? strings.yourTurn
        : strings.waitTurn(party.nameOf(st.seats[st.turn]));

  return (
    <div className={s.game}>
      <Table st={st} party={party} mySeat={local ? -1 : mySeat} />
      {ended ? (
        <RoundEnd st={st} party={party} />
      ) : (
        <>
          {!local && <p className={cx(s.status, st.turn === mySeat && s.statusOn)}>{status}</p>}
          {local ? (
            <Gate key={`${st.round}-${st.turnNo}`} title={strings.passTo(party.nameOf(st.seats[st.turn]))}>
              <Hand key={`${st.turnNo}-${st.phase}-${st.seq}`} st={st} party={party} seat={st.turn} deal={dealing && st.turnNo === 0} />
            </Gate>
          ) : mySeat >= 0 ? (
            <Hand key={`${st.turnNo}-${st.phase}-${st.seq}`} st={st} party={party} seat={mySeat} deal={dealing && st.turnNo === 0} />
          ) : null}
        </>
      )}
    </div>
  );
}

export default function BaiMau({ ctx }: MiniAppProps<PartyData>) {
  const party = useParty(baiGame, ctx);
  return (
    <PartyShell
      party={party}
      info={{
        title: strings.title,
        rule: strings.rule,
        art: <span className={s.heroArt} dangerouslySetInnerHTML={{ __html: iconSvg }} />,
        settings: (p) => <BaiSettings {...p} />,
      }}
    >
      {party.state && <BaiGame party={party} />}
    </PartyShell>
  );
}
