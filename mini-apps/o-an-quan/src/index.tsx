import { useEffect, useRef, useState } from 'react';
import type { MiniAppProps } from '@bang/sdk';
import { Avatar, Chips, PartyShell, SettingsCard, useParty, vibrate, type PartyData, type SettingsProps } from '@bang/party';
import { Button, cx } from '@bang/ui';
import { boardOf, isQuan, liveScore, quanGame, rowOf, type Board, type Dir, type QuanParty, type QuanState, type Seat } from './game';
import { usePlayback } from './usePlayback';
import { strings, type QuanValue, type Toggle } from './strings';
import s from './Quan.module.css';
import iconSvg from '../icon.svg?raw';

const quanOptions = (Object.keys(strings.quanOptions) as QuanValue[]).map((v) => ({ value: v, label: strings.quanOptions[v] }));
const nonOptions = (Object.keys(strings.nonOptions) as Toggle[]).map((v) => ({ value: v, label: strings.nonOptions[v] }));

function QuanSettings({ value, onChange, editable }: SettingsProps<QuanState>) {
  return (
    <SettingsCard editable={editable}>
      <Chips label={strings.quanLabel} options={quanOptions} value={value.quanValue ?? '10'} onChange={(quanValue) => onChange({ quanValue })} disabled={!editable} />
      <Chips label={strings.nonLabel} options={nonOptions} value={value.quanNon ?? 'on'} onChange={(quanNon) => onChange({ quanNon })} disabled={!editable} />
    </SettingsCard>
  );
}

/** Vị trí rải sỏi trong ô: cố định theo thứ tự để sỏi không nhảy lung tung mỗi lần vẽ. */
const SPOTS = Array.from({ length: 24 }, (_, k) => {
  const a = k * 2.399963; // góc vàng
  const r = 0.12 + 0.3 * Math.sqrt((k + 0.5) / 24);
  return [50 + Math.cos(a) * r * 100, 50 + Math.sin(a) * r * 100];
});

function Stones({ n, quan }: { n: number; quan?: boolean }) {
  const shown = Math.min(n, SPOTS.length);
  return (
    <span className={s.stones} aria-hidden="true">
      {quan && <span className={s.mandarin} />}
      {Array.from({ length: shown }, (_, k) => (
        <span key={k} className={s.stone} style={{ left: `${SPOTS[k][0]}%`, top: `${SPOTS[k][1]}%` }} />
      ))}
    </span>
  );
}

interface CellProps {
  i: number;
  b: Board;
  hand: { i: number; n: number } | null;
  eaten: number | null;
  selected: boolean;
  playable: boolean;
  onPick: (i: number) => void;
}

function Cell({ i, b, hand, eaten, selected, playable, onPick }: CellProps) {
  const n = b.pits[i];
  const q = isQuan(i);
  const hasQuan = q && b.quan[i === 0 ? 0 : 1];
  return (
    <button
      className={cx(s.cell, q && s.quanCell, q && (i === 0 ? s.quanA : s.quanB), playable && s.playable, selected && s.selected, hand?.i === i && s.handHere, eaten === i && s.eaten)}
      disabled={!playable}
      onClick={() => onPick(i)}
      aria-label={q ? strings.quanPit(n, hasQuan) : strings.pit(n)}
    >
      <Stones n={n} quan={hasQuan} />
      <span key={n} className={s.count}>{n}</span>
      {hand?.i === i && hand.n > 0 && <span className={s.hand}>{hand.n}</span>}
    </button>
  );
}

function PlayerCard({ party, seat, b, active }: { party: QuanParty; seat: Seat; b: Board; active: boolean }) {
  const st = party.state!;
  const id = st.seats[seat];
  return (
    <div className={cx(s.player, active && s.playerOn)}>
      <Avatar name={party.nameOf(id) || '?'} />
      <div className={s.playerText}>
        <span className={s.playerName}>{party.nameOf(id)}</span>
        <span className={s.playerMeta}>
          {strings.eaten(b.captured[seat], b.quanTaken[seat])}
          {b.debt[seat] > 0 && ` · ${strings.debt(b.debt[seat])}`}
        </span>
      </div>
      <span className={s.playerScore}>{liveScore(b, seat, Number(st.quanValue))}</span>
      <span className={s.playerWins} title={strings.wins}>{st.wins[id] ?? 0}</span>
    </div>
  );
}

function QuanGame({ party }: { party: QuanParty }) {
  const st = party.state!;
  const local = party.mode === 'local';
  const seatIdx = st.seats.indexOf(party.me);
  const mySeat: Seat | null = local ? (st.turn as Seat) : seatIdx < 0 ? null : (seatIdx as Seat);
  // Chơi phòng: hàng của mình luôn ở dưới. Chơi 1 máy: bàn cố định, ghế đầu ở dưới.
  const flip = !local && mySeat === 1;
  const { frame, skip } = usePlayback(st.last, party.sfx);
  const animating = frame !== null;
  const b = frame?.board ?? boardOf(st);
  const [picked, setPicked] = useState<number | null>(null);
  const canPlay = !st.done && !animating && mySeat !== null && mySeat === st.turn;
  const sfx = useRef(party.sfx);
  sfx.current = party.sfx;

  useEffect(() => setPicked(null), [st.seq]);
  useEffect(() => {
    if (st.done && !animating) sfx.current(st.winner !== null ? 'win' : 'buzz');
  }, [st.done, st.winner, animating]);
  useEffect(() => {
    if (canPlay && !local) vibrate([20, 40, 20]);
  }, [canPlay, local]);

  const top = flip ? [7, 8, 9, 10, 11] : [1, 2, 3, 4, 5];
  const bottom = flip ? [5, 4, 3, 2, 1] : [11, 10, 9, 8, 7];
  const leftQuan = flip ? 6 : 0;
  const rightQuan = flip ? 0 : 6;
  const own = mySeat !== null ? rowOf(mySeat) : [];

  const pick = (i: number) => {
    sfx.current('tap');
    setPicked(picked === i ? null : i);
  };
  const sowTo = (screen: 'left' | 'right') => {
    if (picked === null) return;
    // Hàng hiện ở dưới: sang trái là chiều +1; hàng hiện ở trên thì ngược lại.
    const inBottom = bottom.includes(picked);
    const dir: Dir = (screen === 'left') === inBottom ? 1 : -1;
    party.dispatch({ type: 'sow', pit: picked, dir });
    setPicked(null);
  };

  const cell = (i: number) => (
    <Cell key={i} i={i} b={b} hand={frame?.hand ?? null} eaten={frame?.eaten ?? null} selected={picked === i} playable={canPlay && own.includes(i) && st.pits[i] > 0} onPick={pick} />
  );

  const turnName = party.nameOf(st.seats[st.turn]);
  const mover = st.last ? party.nameOf(st.seats[st.last.seat]) : '';
  const status = animating
    ? strings.sowing(mover)
    : st.done
      ? st.winner !== null
        ? strings.won(party.nameOf(st.seats[st.winner]))
        : strings.draw
      : mySeat === null
        ? strings.watching
        : canPlay
          ? picked !== null
            ? strings.pickDir
            : strings.yourMove
          : strings.waitMove(turnName);
  const spreadStep = !animating && st.last?.steps.find((x) => x.t === 'spread');
  const topSeat: Seat = flip ? 0 : 1;
  const bottomSeat: Seat = flip ? 1 : 0;

  return (
    <div className={s.game}>
      <PlayerCard party={party} seat={topSeat} b={b} active={!st.done && !animating && st.turn === topSeat} />

      <div className={s.boardWrap} onClick={animating ? skip : undefined}>
        <div className={s.board}>
          <div className={s.left}>{cell(leftQuan)}</div>
          <div className={s.top}>{top.map(cell)}</div>
          <div className={s.bottom}>{bottom.map(cell)}</div>
          <div className={s.right}>{cell(rightQuan)}</div>
        </div>
        {st.done && !animating && (
          <div className={cx(s.banner, st.winner === null && s.bannerDraw)} aria-hidden="true">
            <span className={s.bannerText}>{st.winner !== null ? strings.won(party.nameOf(st.seats[st.winner])) : strings.draw}</span>
          </div>
        )}
      </div>

      <PlayerCard party={party} seat={bottomSeat} b={b} active={!st.done && !animating && st.turn === bottomSeat} />

      <p className={s.status} aria-live="polite">{status}</p>
      {spreadStep && spreadStep.t === 'spread' && (
        <p className={s.note}>
          {strings.spread(party.nameOf(st.seats[spreadStep.seat]))}
          {spreadStep.borrowed > 0 && ` · ${strings.borrowed(party.nameOf(st.seats[spreadStep.seat]), spreadStep.borrowed)}`}
        </p>
      )}

      {canPlay && picked !== null && (
        <div className={s.dirs}>
          <Button variant="primary" onClick={() => sowTo('left')} aria-label={strings.left}>←</Button>
          <button className={s.link} onClick={() => setPicked(null)}>{strings.cancel}</button>
          <Button variant="primary" onClick={() => sowTo('right')} aria-label={strings.right}>→</Button>
        </div>
      )}

      {st.done && !animating && (
        <div className={s.end}>
          {st.final && <p className={s.final}>{strings.finalScore(st.final[bottomSeat], st.final[topSeat])}</p>}
          {party.isHost ? (
            <Button variant="primary" block onClick={() => party.dispatch({ type: 'restart' })}>{strings.newGame}</Button>
          ) : (
            <p className={s.note}>{strings.waitNewGame}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function OAnQuan({ ctx }: MiniAppProps<PartyData>) {
  const party = useParty(quanGame, ctx);
  return (
    <PartyShell
      party={party}
      info={{
        title: strings.title,
        rule: strings.rule,
        art: <span className={s.heroArt} dangerouslySetInnerHTML={{ __html: iconSvg }} />,
        settings: (p) => <QuanSettings {...p} />,
      }}
    >
      {party.state && <QuanGame party={party} />}
    </PartyShell>
  );
}
