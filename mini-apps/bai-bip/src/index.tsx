import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { MiniAppProps } from '@bang/sdk';
import { Avatar, Chips, PartyShell, SettingsCard, useParty, vibrate, type PartyData, type SettingsProps } from '@bang/party';
import { Button, cx } from '@bang/ui';
import { RANKS, SUITS, cardName, isRed, rankOf, suitOf, type Card } from './cards';
import { MAX_PLAY, baiBipGame, seatOf, windowMs, type BipParty, type BipState, type ClaimMode, type WindowSec } from './game';
import { strings } from './strings';
import s from './BaiBip.module.css';
import iconSvg from '../icon.svg?raw';

const modeOptions = (Object.keys(strings.modeOptions) as ClaimMode[]).map((v) => ({ value: v, label: strings.modeOptions[v] }));
const windowOptions = (Object.keys(strings.windowOptions) as WindowSec[]).map((v) => ({ value: v, label: strings.windowOptions[v] }));

function BipSettings({ value, onChange, editable }: SettingsProps<BipState>) {
  return (
    <SettingsCard editable={editable}>
      <Chips label={strings.modeLabel} options={modeOptions} value={value.mode ?? 'sequence'} onChange={(mode) => onChange({ mode })} disabled={!editable} />
      <Chips label={strings.windowLabel} options={windowOptions} value={value.windowSec ?? '5'} onChange={(windowSec) => onChange({ windowSec })} disabled={!editable} />
    </SettingsCard>
  );
}

function Face({ card, className, style }: { card: Card; className?: string; style?: CSSProperties }) {
  return (
    <span className={cx(s.face, isRed(card) && s.red, className)} style={style}>
      <span className={s.corner}>
        <span className={s.rank}>{RANKS[rankOf(card)]}</span>
        <span className={s.suitSm}>{SUITS[suitOf(card)]}</span>
      </span>
      <span className={s.suit} aria-hidden="true">{SUITS[suitOf(card)]}</span>
    </span>
  );
}

/** Chỉ chạy hiệu ứng sau lần vẽ đầu: tải lại giữa ván không diễn lại. */
function useAfterMount() {
  const ready = useRef(false);
  const was = ready.current;
  useEffect(() => {
    ready.current = true;
  }, []);
  return was;
}

/** Giờ chung của phòng, cập nhật liên tục khi đang đếm ngược. */
function useRoomClock(now: () => number, active: boolean) {
  const [t, setT] = useState(now);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setT(now()), 100);
    return () => clearInterval(id);
  }, [active, now]);
  return active ? t : 0;
}

function Seats({ party }: { party: BipParty }) {
  const st = party.state!;
  return (
    <ul className={s.seats}>
      {st.seats.map((id, i) => (
        <li key={id} className={cx(s.seat, st.phase !== 'done' && st.turn === i && s.seatOn, st.winner === i && s.seatWin)}>
          <Avatar name={party.nameOf(id) || '?'} />
          <span className={s.seatText}>
            <span className={s.seatName}>{party.nameOf(id)}</span>
            <span className={s.seatMeta}>
              {strings.cardsLeft(st.hands[i].length)} · {strings.wins(st.wins[id] ?? 0)}
            </span>
          </span>
          {st.phase === 'window' && st.believers.includes(i) && <span className={s.tag}>{strings.believed}</span>}
        </li>
      ))}
    </ul>
  );
}

function Center({ party, clock }: { party: BipParty; clock: number }) {
  const st = party.state!;
  const claim = st.claim;
  const r = st.reveal;
  const left = claim ? Math.max(0, st.deadline - clock) : 0;
  const total = windowMs(st);
  const ready = useAfterMount();
  const shown = Math.min(6, st.pile.length);
  return (
    <section className={s.center} aria-live="polite">
      <div className={s.pileRow}>
        <div className={s.pile} aria-hidden="true">
          {Array.from({ length: shown }, (_, i) => (
            // Lá trên cùng được khóa theo số lá trong chồng: có lá mới thì nó bay vào giữa bàn.
            <span
              key={i === shown - 1 ? `top-${st.pile.length}` : i}
              className={cx(s.pileCard, i === shown - 1 && ready && s.pileIn)}
              style={{ transform: `translate(${i * 2}px, ${-i * 2}px) rotate(${(i % 3) * 4 - 4}deg)` }}
            />
          ))}
        </div>
        <span className={s.pileCount}>{st.pile.length ? strings.pile(st.pile.length) : strings.pileEmpty}</span>
      </div>
      {claim && (
        <>
          <p className={s.claim}>{strings.claim(party.nameOf(st.seats[claim.seat]), claim.cards.length, RANKS[claim.rank])}</p>
          <div className={s.timer} role="timer" aria-label={strings.secondsLeft(Math.ceil(left / 1000))}>
            <span className={s.timerBar} style={{ width: `${Math.min(100, (left / total) * 100)}%` }} />
            <span className={s.timerText}>{strings.secondsLeft(Math.ceil(left / 1000))}</span>
          </div>
        </>
      )}
      {!claim && r && (
        <div className={cx(s.reveal, r.lie ? s.revealLie : s.revealTruth)}>
          <p className={s.revealHead}>
            {strings.calledBy(party.nameOf(st.seats[r.caller]), strings.claim(party.nameOf(st.seats[r.claimer]), r.cards.length, RANKS[r.rank]))}
          </p>
          <div className={s.revealCards}>
            {r.cards.map((c, i) => (
              <Face key={c} card={c} className={ready ? s.flipIn : undefined} style={{ animationDelay: `${i * 110}ms` }} />
            ))}
          </div>
          <p className={cx(s.revealVerdict, ready && s.pop)} style={{ animationDelay: `${r.cards.length * 110 + 200}ms` }}>{r.lie ? strings.lie(party.nameOf(st.seats[r.taker]), r.taken) : strings.truth(party.nameOf(st.seats[r.taker]), r.taken)}</p>
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

function Hand({ party, seat, canPlay, deal }: { party: BipParty; seat: number; canPlay: boolean; deal: boolean }) {
  const st = party.state!;
  const hand = st.hands[seat];
  const [picked, setPicked] = useState<Card[]>([]);
  const [rank, setRank] = useState(st.rank);
  const claimRank = st.mode === 'free' ? rank : st.rank;
  const toggle = (c: Card) => {
    if (!canPlay) return;
    setPicked((p) => (p.includes(c) ? p.filter((x) => x !== c) : p.length < MAX_PLAY ? [...p, c] : p));
    party.sfx('tick');
  };
  return (
    <div className={s.handArea}>
      {canPlay && st.mode === 'free' && (
        <div className={s.rankPick} role="radiogroup" aria-label={strings.chooseRank}>
          <span className={s.rankLabel}>{strings.chooseRank}</span>
          <div className={s.rankRow}>
            {RANKS.map((r, i) => (
              <button key={r} role="radio" aria-checked={rank === i} className={cx(s.rankChip, rank === i && s.rankOn)} onClick={() => setRank(i)}>
                {r}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className={s.hand} role="group" aria-label={strings.handLabel}>
        {hand.map((c, i) => {
          const on = picked.includes(c);
          return (
            <button
              key={c}
              className={cx(s.handCard, on && s.picked, deal && s.dealt)}
              style={{ '--i': i } as CSSProperties}
              onClick={() => toggle(c)}
              disabled={!canPlay}
              aria-pressed={on}
              aria-label={strings.card(cardName(c), on)}
            >
              <Face card={c} />
            </button>
          );
        })}
      </div>
      {canPlay && (
        <Button
          variant="primary"
          block
          disabled={!picked.length}
          onClick={() => {
            party.sfx('tap');
            party.dispatch({ type: 'play', cards: picked, rank: claimRank });
          }}
        >
          {picked.length ? strings.playBtn(picked.length, RANKS[claimRank]) : st.mode === 'free' ? strings.pick : strings.mustClaim(RANKS[claimRank])}
        </Button>
      )}
    </div>
  );
}

/** Nút lật tẩy / tin khi đang chờ. Chơi 1 máy: mỗi người một nút tên. */
function Verdict({ party, mySeat }: { party: BipParty; mySeat: number }) {
  const st = party.state!;
  const claimer = st.claim!.seat;
  const call = (as?: string) => {
    vibrate([30, 40, 30]);
    party.dispatch(as ? { type: 'call', as } : { type: 'call' });
  };
  if (party.mode === 'local') {
    const others = st.seats.map((id, i) => ({ id, i })).filter((x) => x.i !== claimer && !st.believers.includes(x.i));
    return (
      <div className={s.verdict}>
        <p className={s.hintText}>{strings.localCallHint}</p>
        <div className={s.callGrid}>
          {others.map(({ id }) => (
            <Button key={id} variant="danger" onClick={() => call(id)}>{strings.callAs(party.nameOf(id))}</Button>
          ))}
        </div>
        <Button block onClick={() => others.forEach(({ id }) => party.dispatch({ type: 'believe', as: id }))}>{strings.allBelieve}</Button>
      </div>
    );
  }
  if (mySeat < 0) return null;
  if (mySeat === claimer) return <p className={s.hintText}>{strings.yourClaim}</p>;
  if (st.believers.includes(mySeat)) return <p className={s.hintText}>{strings.youBelieved}</p>;
  return (
    <div className={s.verdictRow}>
      <Button onClick={() => party.dispatch({ type: 'believe' })}>{strings.believeBtn}</Button>
      <Button variant="danger" className={s.callBtn} onClick={() => call()}>{strings.callBtn}</Button>
    </div>
  );
}

function BipTable({ party }: { party: BipParty }) {
  const st = party.state!;
  const local = party.mode === 'local';
  const mySeat = local ? st.turn : seatOf(st, party.me);
  const myTurn = st.phase === 'play' && mySeat >= 0 && mySeat === st.turn;
  const coverKey = `${st.moves}-${st.turn}`;
  const [seen, setSeen] = useState('');
  const covered = local && st.phase === 'play' && seen !== coverKey;
  const clock = useRoomClock(party.now, st.phase === 'window');
  const { isHost, dispatch, now } = party;

  // Máy giữ luật chốt lần khai khi hết giờ.
  useEffect(() => {
    if (!isHost || st.phase !== 'window') return;
    const wait = Math.max(0, st.deadline - now()) + 50;
    const id = setTimeout(() => dispatch({ type: 'resolve' }), wait);
    return () => clearTimeout(id);
  }, [isHost, st.phase, st.deadline, dispatch, now]);

  const sfx = useRef(party.sfx);
  sfx.current = party.sfx;
  const revealKey = st.reveal ? `${st.moves}` : '';
  const lie = st.reveal?.lie;
  useEffect(() => {
    if (!revealKey) return;
    sfx.current(lie ? 'buzz' : 'tap');
    vibrate(lie ? [60, 40, 60] : 30);
  }, [revealKey, lie]);
  useEffect(() => {
    if (st.phase === 'window') sfx.current('tick');
  }, [st.phase, st.moves]);
  useEffect(() => {
    if (st.phase === 'done') {
      sfx.current('win');
      vibrate([30, 40, 60]);
    }
  }, [st.phase]);
  // Chia bài: chạy khi mới vào ván (chưa ai đánh) rồi tắt, không lặp mỗi lượt.
  const [dealing, setDealing] = useState(st.moves === 0);
  useEffect(() => {
    if (!dealing) return;
    sfx.current('tick');
    const id = setTimeout(() => setDealing(false), 1600);
    return () => clearTimeout(id);
  }, [dealing]);
  const lastMoves = useRef(st.moves);
  useEffect(() => {
    if (st.moves < lastMoves.current) setDealing(true);
    lastMoves.current = st.moves;
  }, [st.moves]);
  useEffect(() => {
    if (myTurn && !local) vibrate(30);
  }, [myTurn, local]);

  const turnName = party.nameOf(st.seats[st.turn]);
  const status =
    st.phase === 'done'
      ? strings.won(party.nameOf(st.seats[st.winner ?? 0]))
      : st.phase === 'window'
        ? ''
        : mySeat < 0
          ? strings.watching
          : myTurn
            ? st.mode === 'sequence'
              ? `${strings.yourTurn}, ${strings.mustClaim(RANKS[st.rank])}`
              : strings.yourTurn
            : strings.waitTurn(turnName);
  const showHand = st.phase !== 'done' && mySeat >= 0 && !(local && (covered || st.phase === 'window'));

  return (
    <div className={s.game}>
      <Seats party={party} />
      {status && <p className={cx(s.status, st.phase === 'done' && s.banner)} role={st.phase === 'done' ? 'status' : undefined}>{status}</p>}
      <Center party={party} clock={clock} />
      {st.phase === 'window' && <Verdict party={party} mySeat={mySeat} />}
      {st.phase === 'done' ? (
        party.isHost ? (
          <Button variant="primary" block onClick={() => party.dispatch({ type: 'restart' })}>{strings.newGame}</Button>
        ) : (
          <p className={s.hintText}>{strings.waitNewGame}</p>
        )
      ) : covered ? (
        <Cover name={turnName} onReveal={() => setSeen(coverKey)} />
      ) : showHand ? (
        <Hand key={local ? coverKey : `${st.hands[mySeat].join(',')}-${st.moves}`} party={party} seat={mySeat} canPlay={myTurn} deal={dealing && st.moves === 0} />
      ) : null}
    </div>
  );
}

export default function BaiBip({ ctx }: MiniAppProps<PartyData>) {
  const party = useParty(baiBipGame, ctx);
  return (
    <PartyShell
      party={party}
      info={{
        title: strings.title,
        rule: strings.rule,
        art: <span className={s.heroArt} dangerouslySetInnerHTML={{ __html: iconSvg }} />,
        settings: (p) => <BipSettings {...p} />,
      }}
    >
      {party.state && <BipTable party={party} />}
    </PartyShell>
  );
}
