import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { MiniAppProps } from '@bang/sdk';
import { Avatar, Chips, PartyShell, SettingsCard, useParty, vibrate, type PartyData, type SettingsProps } from '@bang/party';
import { Button, cx } from '@bang/ui';
import { RANKS, SUITS, cardLabel, cardName, isRed, rankOf, sortCards, suitOf, type Card } from './cards';
import { arrange, classify, suggest } from './combos';
import { placePoints, playError, seatOf, tienLenGame, type TLParty, type TLState, type Toggle } from './game';
import { strings } from './strings';
import s from './TienLen.module.css';
import iconSvg from '../icon.svg?raw';

const toggleOptions = (Object.keys(strings.toiTrangOptions) as Toggle[]).map((v) => ({ value: v, label: strings.toiTrangOptions[v] }));

function TienLenSettings({ value, onChange, editable }: SettingsProps<TLState>) {
  return (
    <SettingsCard editable={editable}>
      <Chips label={strings.toiTrangLabel} options={toggleOptions} value={value.toiTrang ?? 'on'} onChange={(toiTrang) => onChange({ toiTrang })} disabled={!editable} />
      <p className={s.settingHint}>{strings.toiTrangHint}</p>
    </SettingsCard>
  );
}

/** Mặt lá bài. Chỉ vẽ lá được phép xem; bài úp của người khác chỉ hiện số lá. */
function Face({ card, className, style }: { card: Card; className?: string; style?: CSSProperties }) {
  return (
    <span className={cx(s.face, isRed(card) && s.red, className)} style={style}>
      <span className={s.corner}>
        <span className={s.rank}>{RANKS[rankOf(card)]}</span>
        <span className={s.suit}>{SUITS[suitOf(card)]}</span>
      </span>
      <span className={s.pip} aria-hidden="true">{SUITS[suitOf(card)]}</span>
    </span>
  );
}

/** Chỉ chạy hiệu ứng sau lần vẽ đầu: tải lại ván giữa chừng không bị diễn lại. */
function useAfterMount() {
  const ready = useRef(false);
  const was = ready.current;
  useEffect(() => {
    ready.current = true;
  }, []);
  return was;
}

function Seats({ party }: { party: TLParty }) {
  const st = party.state!;
  return (
    <ul className={s.seats}>
      {st.seats.map((id, seat) => {
        const place = st.finished.indexOf(seat);
        const active = !st.done && st.turn === seat;
        return (
          <li key={id} className={cx(s.seat, active && s.seatOn, st.passed[seat] && !st.done && s.seatPassed)}>
            <Avatar name={party.nameOf(id) || '?'} />
            <span className={s.seatText}>
              <span className={s.seatName}>{party.nameOf(id)}</span>
              <span className={s.seatMeta}>
                {place >= 0 ? strings.place(place, st.seats.length) : strings.cardsLeft(st.hands[seat].length)}
                {place < 0 && st.hands[seat].length > 0 && (
                  <span className={s.backs} aria-hidden="true">
                    {Array.from({ length: Math.min(4, st.hands[seat].length) }, (_, k) => (
                      <span key={k} className={s.miniBack} />
                    ))}
                  </span>
                )}
                {st.passed[seat] && !st.done && place < 0 && <span className={s.tag}>{strings.passedTag}</span>}
              </span>
            </span>
            <span className={s.seatScore} aria-label={strings.points(st.scores[id] ?? 0)}>{st.scores[id] ?? 0}</span>
          </li>
        );
      })}
    </ul>
  );
}

function Table({ party, mySeat }: { party: TLParty; mySeat: number }) {
  const st = party.state!;
  const play = st.table;
  const ready = useAfterMount();
  // Giữ bộ bài vừa bị dọn thêm một nhịp để chạy hiệu ứng thu bài.
  const prev = useRef(play);
  const [ghost, setGhost] = useState<typeof play>(null);
  useEffect(() => {
    if (!play && prev.current) {
      setGhost(prev.current);
      const id = setTimeout(() => setGhost(null), 450);
      prev.current = play;
      return () => clearTimeout(id);
    }
    prev.current = play;
  }, [play]);
  const fromMe = play ? st.seats[play.seat] === party.me || (party.mode === 'local' && play.seat === mySeat) : false;
  return (
    <section className={s.table} aria-live="polite">
      {play ? (
        <>
          <p className={s.tableLabel}>
            {strings.played(party.nameOf(st.seats[play.seat]), strings.comboName(play.combo.kind, play.combo.len))}
          </p>
          <div key={st.moves} className={cx(s.tableCards, ready && (fromMe ? s.flyUp : s.flyDown))} style={{ '--n': play.combo.cards.length } as CSSProperties}>
            {play.combo.cards.map((c) => (
              <Face key={c} card={c} className={s.tableCard} />
            ))}
          </div>
        </>
      ) : (
        <p className={s.tableEmpty}>{strings.emptyTable}</p>
      )}
      {ghost && (
        <div className={s.sweep} aria-hidden="true" style={{ '--n': ghost.combo.cards.length } as CSSProperties}>
          {ghost.combo.cards.map((c) => (
            <Face key={c} card={c} className={s.tableCard} />
          ))}
        </div>
      )}
    </section>
  );
}

function Cover({ name, onReveal }: { name: string; onReveal: () => void }) {
  return (
    <button className={s.cover} onClick={onReveal}>
      <span className={s.coverTitle}>{strings.passTo(name)}</span>
      <span className={s.coverTap}>{strings.tapToSee}</span>
      <span className={s.coverHint}>{strings.coverHint}</span>
    </button>
  );
}

function Hand({ party, seat, canPlay, order, deal }: { party: TLParty; seat: number; canPlay: boolean; order: 'rank' | 'group'; deal: boolean }) {
  const st = party.state!;
  const hand = st.hands[seat];
  const [picked, setPicked] = useState<Card[]>([]);
  const [note, setNote] = useState('');
  const shown = useMemo(() => (order === 'group' ? arrange(hand) : sortCards(hand)), [hand, order]);
  const err = picked.length ? playError(st, picked) : null;
  const toggle = (c: Card) => {
    setNote('');
    setPicked((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));
    party.sfx('tick');
  };
  const hint = () => {
    const h = suggest(hand, st.table?.combo ?? null, st.mustPlay);
    if (h) {
      setPicked(h);
      setNote('');
    } else {
      setNote(strings.noHint);
      party.sfx('buzz');
      vibrate(25);
    }
  };
  const play = () => {
    if (!canPlay || err || !picked.length) return;
    party.dispatch({ type: 'play', cards: picked });
  };
  const combo = picked.length ? classify(picked) : null;

  return (
    <div className={s.handArea}>
      <div className={s.hand} role="group" aria-label={strings.handLabel} style={{ '--n': shown.length } as CSSProperties}>
        {shown.map((c, i) => {
          const on = picked.includes(c);
          const mid = (shown.length - 1) / 2;
          return (
            <button
              key={c}
              className={cx(s.handCard, on && s.picked, deal && s.dealt)}
              style={{ '--tilt': `${(i - mid) * Math.min(1.6, 14 / Math.max(shown.length, 1))}deg`, '--i': i } as CSSProperties}
              onClick={() => toggle(c)}
              aria-pressed={on}
              aria-label={strings.card(cardName(c), on)}
            >
              <Face card={c} />
            </button>
          );
        })}
      </div>
      <p className={cx(s.note, err && canPlay && s.noteErr)} aria-live="polite">
        {note || (picked.length ? (err ? strings.errors[err] : combo ? strings.comboName(combo.kind, combo.len) : '') : '')}
      </p>
      <div className={s.actions}>
        <button className={s.pill} onClick={hint} disabled={!canPlay}>{strings.hint}</button>
        <button className={s.pill} onClick={() => setPicked([])} disabled={!picked.length}>{strings.clear}</button>
        <Button className={s.passBtn} onClick={() => party.dispatch({ type: 'pass' })} disabled={!canPlay || !st.table}>{strings.pass}</Button>
        <Button className={s.playBtn} variant="primary" onClick={play} disabled={!canPlay || !picked.length || !!err}>
          {picked.length ? `${strings.play} (${picked.length})` : strings.play}
        </Button>
      </div>
    </div>
  );
}

function Results({ party }: { party: TLParty }) {
  const st = party.state!;
  const n = st.seats.length;
  return (
    <section className={s.results}>
      <p className={s.banner} role="status">
        {party.nameOf(st.seats[st.finished[0]])} {strings.place(0, n)}
      </p>
      {st.instant && (
        <p className={s.instant}>{strings.instantWin(party.nameOf(st.seats[st.instant.seat]), strings.instant[st.instant.kind])}</p>
      )}
      <ol className={s.ranking}>
        {st.finished.map((seat, place) => {
          const id = st.seats[seat];
          const pts = st.instant && place > 0 ? 0 : placePoints(place, n);
          return (
            <li key={id} className={cx(s.rankRow, place === 0 && s.rankFirst)}>
              <span className={s.rankPlace}>{st.instant && place > 0 ? '–' : strings.place(place, n)}</span>
              <span className={s.rankName}>{party.nameOf(id)}</span>
              <span className={s.rankPts}>{strings.plusPoints(pts)}</span>
              <span className={s.rankTotal}>{strings.points(st.scores[id] ?? 0)}</span>
            </li>
          );
        })}
      </ol>
      {party.isHost ? (
        <Button variant="primary" block onClick={() => party.dispatch({ type: 'restart' })}>{strings.newGame}</Button>
      ) : (
        <p className={s.hintText}>{strings.waitNewGame}</p>
      )}
    </section>
  );
}

function TienLenTable({ party }: { party: TLParty }) {
  const st = party.state!;
  const local = party.mode === 'local';
  const mySeat = local ? st.turn : seatOf(st, party.me);
  const myTurn = !st.done && mySeat >= 0 && mySeat === st.turn;
  const [order, setOrder] = useState<'rank' | 'group'>('rank');
  const coverKey = `${st.round}-${st.moves}-${st.turn}`;
  const [seen, setSeen] = useState('');
  const covered = local && !st.done && seen !== coverKey;

  // Chia bài: chạy khi bắt đầu ván (moves = 0) và khi sang ván mới, tắt sau khi xong.
  const [dealing, setDealing] = useState(st.moves === 0);
  const lastRound = useRef(st.round);
  useEffect(() => {
    if (lastRound.current !== st.round) {
      lastRound.current = st.round;
      setDealing(true);
    }
  }, [st.round]);
  useEffect(() => {
    if (!dealing) return;
    const id = setTimeout(() => setDealing(false), 1400);
    return () => clearTimeout(id);
  }, [dealing]);

  const sfx = useRef(party.sfx);
  sfx.current = party.sfx;
  useEffect(() => {
    if (st.moves) sfx.current('tap');
  }, [st.moves]);
  useEffect(() => {
    if (dealing) sfx.current('tick');
  }, [dealing]);
  useEffect(() => {
    if (st.done) {
      sfx.current('win');
      vibrate([30, 40, 60]);
    }
  }, [st.done]);
  useEffect(() => {
    if (myTurn && !local) vibrate(30);
  }, [myTurn, local, st.moves]);

  const turnName = party.nameOf(st.seats[st.turn]);
  const status = st.done
    ? st.instant
      ? strings.instantWin(party.nameOf(st.seats[st.instant.seat]), strings.instant[st.instant.kind])
      : `${party.nameOf(st.seats[st.finished[0]])} ${strings.place(0, st.seats.length)}`
    : mySeat < 0
      ? strings.watching
      : myTurn
        ? st.mustPlay !== null
          ? strings.mustLead(cardLabel(st.mustPlay))
          : st.table
            ? strings.yourTurn
            : strings.yourLead
        : st.passed[mySeat]
          ? strings.youPassed
          : strings.waitTurn(turnName);

  const showHand = !st.done && mySeat >= 0 && st.finished.indexOf(mySeat) < 0 && !covered;

  return (
    <div className={s.game}>
      <Seats party={party} />
      <div className={s.head}>
        <span className={s.status}>{status}</span>
        <span className={s.round}>{strings.round(st.round)}</span>
        {showHand && (
          <button className={s.pill} onClick={() => setOrder((o) => (o === 'rank' ? 'group' : 'rank'))}>
            {strings.sort}: {strings.sortModes[order]}
          </button>
        )}
      </div>
      <Table party={party} mySeat={mySeat} />
      {st.done ? (
        <Results party={party} />
      ) : covered ? (
        <Cover name={turnName} onReveal={() => setSeen(coverKey)} />
      ) : showHand ? (
        <Hand key={local ? coverKey : st.hands[mySeat].join(',')} party={party} seat={mySeat} canPlay={myTurn} order={order} deal={dealing && st.moves === 0} />
      ) : null}
    </div>
  );
}

export default function TienLen({ ctx }: MiniAppProps<PartyData>) {
  const party = useParty(tienLenGame, ctx);
  return (
    <PartyShell
      party={party}
      info={{
        title: strings.title,
        rule: strings.rule,
        art: <span className={s.heroArt} dangerouslySetInnerHTML={{ __html: iconSvg }} />,
        settings: (p) => <TienLenSettings {...p} />,
      }}
    >
      {party.state && <TienLenTable party={party} />}
    </PartyShell>
  );
}
