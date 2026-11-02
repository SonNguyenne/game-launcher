import { useEffect, useRef, useState } from 'react';
import type { MiniAppProps } from '@bang/sdk';
import { Avatar, Chips, PartyShell, SettingsCard, useParty, vibrate, type PartyData, type SettingsProps } from '@bang/party';
import { Button, cx } from '@bang/ui';
import { RANKS, SUITS, cardName, isRed, rankOf, suitOf, type Card } from './cards';
import { canRaise, maxRaiseTo, minRaiseTo, pokerGame, seatOf, toCall, type BlindUp, type PokerParty, type PokerState, type StartChips } from './game';
import { strings } from './strings';
import s from './Poker.module.css';
import iconSvg from '../icon.svg?raw';

const chipOptions = (Object.keys(strings.startChipsOptions) as StartChips[]).map((v) => ({ value: v, label: strings.startChipsOptions[v] }));
const blindOptions = (Object.keys(strings.blindUpOptions) as BlindUp[]).map((v) => ({ value: v, label: strings.blindUpOptions[v] }));

function PokerSettings({ value, onChange, editable }: SettingsProps<PokerState>) {
  return (
    <SettingsCard editable={editable}>
      <Chips label={strings.startChipsLabel} options={chipOptions} value={value.startChips ?? '1000'} onChange={(startChips) => onChange({ startChips })} disabled={!editable} />
      <Chips label={strings.blindUpLabel} options={blindOptions} value={value.blindUp ?? '10'} onChange={(blindUp) => onChange({ blindUp })} disabled={!editable} />
      <p className={s.note}>{strings.chipsNote}</p>
    </SettingsCard>
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

function Face({ card, hot, small, flip }: { card: Card; hot?: boolean; small?: boolean; flip?: boolean }) {
  return (
    <span className={cx(s.face, isRed(card) && s.red, hot && s.hot, small && s.small, flip && s.flip)} role="img" aria-label={strings.card(cardName(card))}>
      <span className={s.corner}>
        <span className={s.rank}>{RANKS[rankOf(card)]}</span>
        <span className={s.suitSm}>{SUITS[suitOf(card)]}</span>
      </span>
      <span className={s.suit} aria-hidden="true">{SUITS[suitOf(card)]}</span>
    </span>
  );
}

/** Mặt sau lá bài: chỉ là hình, không chứa thông tin lá. */
const Back = ({ small }: { small?: boolean }) => <span className={cx(s.back, small && s.small)} aria-hidden="true" />;

const potOf = (st: PokerState) => st.contrib.reduce((a, b) => a + b, 0);

function Seats({ party, mySeat }: { party: PokerParty; mySeat: number }) {
  const st = party.state!;
  const best = new Set(st.showdown?.best ?? []);
  const ready = useAfterMount();
  return (
    <ul className={s.seats}>
      {st.seats.map((id, i) => {
        const out = !st.inHand[i] && st.chips[i] === 0;
        const shown = st.showdown?.shown.includes(i);
        const hand = st.showdown?.hands[i];
        const won = st.showdown?.won[i] ?? 0;
        return (
          <li
            key={id}
            className={cx(s.seat, st.phase === 'bet' && st.turn === i && s.seatOn, (st.folded[i] || out) && s.seatDim, won > 0 && s.seatWon, i === mySeat && s.seatMe)}
          >
            <div className={s.seatTop}>
              <Avatar name={party.nameOf(id) || '?'} dim={out} />
              <span className={s.seatName}>{party.nameOf(id)}</span>
              {st.inHand[i] && i === st.dealer && <span className={cx(s.badge, s.dealerBadge)}>{strings.dealer}</span>}
            </div>
            <div className={s.seatMid}>
              <span className={s.stack}>{strings.chips(st.chips[i])}</span>
              {out ? (
                <span className={s.tag}>{strings.outTag}</span>
              ) : st.folded[i] ? (
                <span className={s.tag}>{strings.foldedTag}</span>
              ) : st.allIn[i] ? (
                <span className={cx(s.tag, s.tagHot)}>{strings.allInTag}</span>
              ) : st.phase === 'bet' && i === st.sbSeat && st.street === 'preflop' ? (
                <span className={s.tagSoft}>{strings.sbTag}</span>
              ) : st.phase === 'bet' && i === st.bbSeat && st.street === 'preflop' ? (
                <span className={s.tagSoft}>{strings.bbTag}</span>
              ) : null}
            </div>
            {st.bets[i] > 0 && (
              <span key={st.bets[i]} className={cx(s.betChip, ready && s.chipIn)}>
                <i className={s.coin} aria-hidden="true" />
                {strings.chips(st.bets[i])}
              </span>
            )}
            {won > 0 && <span className={cx(s.wonChip, ready && s.wonRise)}>+{strings.chips(won)}</span>}
            {shown && (
              <div className={s.seatCards}>
                {st.hole[i].map((c) => <Face key={c} card={c} small hot={best.has(c)} flip={ready} />)}
                {hand !== null && hand !== undefined && <span className={s.handName}>{strings.hands[hand]}</span>}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Board({ party }: { party: PokerParty }) {
  const st = party.state!;
  const best = new Set(st.showdown?.best ?? []);
  const ready = useAfterMount();
  const pot = potOf(st);
  const dim = !!st.showdown && best.size > 0;
  return (
    <section className={s.felt} aria-label={strings.board}>
      <div className={s.feltHead}>
        <span key={pot} className={cx(s.pot, ready && pot > 0 && s.potBump)}>
          <i className={s.coin} aria-hidden="true" />
          {strings.pot(pot)}
        </span>
        <span className={s.feltMeta}>
          {strings.handNo(st.handNo)} · {strings.blinds(st.sb, st.bb)}
          {st.phase === 'bet' && ` · ${strings.streets[st.street]}`}
        </span>
      </div>
      <div className={s.board}>
        {Array.from({ length: 5 }, (_, i) =>
          st.board[i] !== undefined ? (
            <span key={st.board[i]} className={cx(s.boardCard, dim && !best.has(st.board[i]) && s.mute)} style={{ animationDelay: ready ? `${(i % 3) * 90}ms` : undefined }}>
              <Face card={st.board[i]} hot={best.has(st.board[i])} flip={ready} />
            </span>
          ) : (
            <span key={`slot-${i}`} className={s.slot} aria-label={strings.emptySlot} />
          ),
        )}
      </div>
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

function Actions({ party, seat }: { party: PokerParty; seat: number }) {
  const st = party.state!;
  const need = toCall(st, seat);
  const max = maxRaiseTo(st, seat);
  const min = Math.min(minRaiseTo(st), max);
  const raisable = canRaise(st, seat);
  const [to, setTo] = useState(min);
  const value = Math.max(min, Math.min(max, to));
  const pot = potOf(st);
  const preset = (target: number) => setTo(Math.max(min, Math.min(max, Math.round(target))));
  const step = Math.max(1, st.sb);
  const send = (a: Parameters<typeof party.dispatch>[0]) => {
    party.sfx('tap');
    party.dispatch(a);
  };

  return (
    <div className={s.actions}>
      {raisable && max > min && (
        <div className={s.raiseBox}>
          <div className={s.presets}>
            <button className={s.pill} onClick={() => preset(min)}>{strings.presets.min}</button>
            <button className={s.pill} onClick={() => preset(st.currentBet + (pot + need) / 2)}>{strings.presets.half}</button>
            <button className={s.pill} onClick={() => preset(st.currentBet + need + pot)}>{strings.presets.pot}</button>
          </div>
          <input
            className={s.range}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            aria-label={strings.raiseAmount}
            onChange={(e) => setTo(Number(e.target.value))}
          />
        </div>
      )}
      <div className={s.buttons}>
        <Button onClick={() => send({ type: 'fold' })}>{strings.fold}</Button>
        {need === 0 ? (
          <Button onClick={() => send({ type: 'check' })}>{strings.check}</Button>
        ) : (
          <Button onClick={() => send(need >= st.chips[seat] ? { type: 'allin' } : { type: 'call' })}>{need >= st.chips[seat] ? strings.allIn(st.chips[seat]) : strings.call(need)}</Button>
        )}
        {raisable &&
          (value >= max ? (
            <Button variant="primary" onClick={() => send({ type: 'allin' })}>{strings.allIn(st.chips[seat])}</Button>
          ) : (
            <Button variant="primary" onClick={() => send({ type: 'raise', to: value })}>{st.currentBet === 0 ? strings.bet(value) : strings.raise(value)}</Button>
          ))}
      </div>
    </div>
  );
}

function ResultPanel({ party }: { party: PokerParty }) {
  const st = party.state!;
  const sd = st.showdown;
  const names = (seats: number[]) => seats.map((i) => party.nameOf(st.seats[i])).join(', ');
  const inTable = party.mode === 'local' || seatOf(st, party.me) >= 0 || party.isHost;
  if (st.phase === 'done') {
    const champ = st.chips.findIndex((c) => c > 0);
    return (
      <section className={s.result}>
        <p className={cx(s.champion, s.pop)} role="status">{strings.champion(party.nameOf(st.seats[champ]))}</p>
        {party.isHost ? (
          <Button variant="primary" block onClick={() => party.dispatch({ type: 'restart' })}>{strings.playAgain}</Button>
        ) : (
          <p className={s.note}>{strings.waitNewGame}</p>
        )}
      </section>
    );
  }
  return (
    <section className={s.result}>
      {sd && !sd.shown.length && sd.pots[0] ? (
        <p className={cx(s.resultLine, s.pop)} role="status">{strings.winsUncontested(names(sd.pots[0].winners), potOf(st))}</p>
      ) : (
        sd?.pots.map((p, i) => <p key={i} className={cx(s.resultLine, s.pop)} role={i === 0 ? 'status' : undefined}>{strings.potWon(names(p.winners), p.amount, i)}</p>)
      )}
      {inTable && (
        <Button variant="primary" block onClick={() => party.dispatch({ type: 'deal' })}>{strings.nextHand}</Button>
      )}
    </section>
  );
}

function PokerTable({ party }: { party: PokerParty }) {
  const st = party.state!;
  const local = party.mode === 'local';
  const mySeat = local ? (st.phase === 'bet' ? st.turn : -1) : seatOf(st, party.me);
  const myTurn = st.phase === 'bet' && mySeat >= 0 && mySeat === st.turn;
  const coverKey = `${st.handNo}-${st.moves}-${st.turn}`;
  const [seen, setSeen] = useState('');
  const covered = local && st.phase === 'bet' && seen !== coverKey;

  const sfx = useRef(party.sfx);
  sfx.current = party.sfx;
  useEffect(() => {
    if (st.moves) sfx.current('tick');
  }, [st.moves]);
  useEffect(() => {
    if (st.board.length) sfx.current('tap');
  }, [st.board.length]);
  useEffect(() => {
    if (st.phase === 'result' || st.phase === 'done') {
      sfx.current('win');
      vibrate([30, 40, 60]);
    }
  }, [st.phase, st.handNo]);
  const ready = useAfterMount();
  useEffect(() => {
    if (myTurn && !local) vibrate(30);
  }, [myTurn, local, st.moves]);

  const turnName = party.nameOf(st.seats[st.turn]);
  const status =
    st.phase !== 'bet'
      ? ''
      : mySeat < 0
        ? strings.waitTurn(turnName)
        : myTurn
          ? strings.yourTurn
          : !st.inHand[mySeat]
            ? strings.youOut
            : st.folded[mySeat]
              ? strings.youFolded
              : st.allIn[mySeat]
                ? strings.youAllIn
                : strings.waitTurn(turnName);
  const showMine = mySeat >= 0 && st.inHand[mySeat] && !covered && st.hole[mySeat].length > 0 && !st.showdown?.shown.includes(mySeat);

  return (
    <div className={s.game}>
      <Seats party={party} mySeat={local ? -1 : mySeat} />
      <Board party={party} />
      {status && <p className={s.status} aria-live="polite">{status}</p>}
      {st.phase !== 'bet' ? (
        <ResultPanel party={party} />
      ) : covered ? (
        <Cover name={turnName} onReveal={() => setSeen(coverKey)} />
      ) : (
        <>
          {showMine && (
            <div className={s.mine} aria-label={strings.yourCards}>
              {st.hole[mySeat].map((c, k) =>
                st.folded[mySeat] ? <Back key={c} /> : (
                  <span key={c} className={cx(s.holeCard, ready && s.dealIn)} style={{ animationDelay: `${k * 120}ms`, transform: `rotate(${k ? 5 : -5}deg)` }}>
                    <Face card={c} flip={ready} />
                  </span>
                ),
              )}
            </div>
          )}
          {myTurn && <Actions key={coverKey} party={party} seat={mySeat} />}
        </>
      )}
    </div>
  );
}

export default function Poker({ ctx }: MiniAppProps<PartyData>) {
  const party = useParty(pokerGame, ctx);
  return (
    <PartyShell
      party={party}
      info={{
        title: strings.title,
        rule: strings.rule,
        art: <span className={s.heroArt} dangerouslySetInnerHTML={{ __html: iconSvg }} />,
        settings: (p) => <PokerSettings {...p} />,
      }}
    >
      {party.state && <PokerTable party={party} />}
    </PartyShell>
  );
}
