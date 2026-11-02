import { useEffect, useMemo, useRef, useState } from 'react';
import type { MiniAppProps } from '@bang/sdk';
import { Avatar, Chips, PartyShell, SettingsCard, useParty, vibrate, type PartyData, type SettingsProps } from '@bang/party';
import { Button, cx } from '@bang/ui';
import { canPlay, dominoGame, ends, fits, pipsOf, type DominoParty, type DominoState, type Tile } from './game';
import { bounds, layoutSnake } from './layout';
import { strings, type DrawMode, type Target } from './strings';
import { TileShape, TileSvg } from './Tile';
import s from './Domino.module.css';
import iconSvg from '../icon.svg?raw';

const modeOptions = (Object.keys(strings.modeOptions) as DrawMode[]).map((v) => ({ value: v, label: strings.modeOptions[v] }));
const targetOptions = (Object.keys(strings.targetOptions) as Target[]).map((v) => ({ value: v, label: strings.targetOptions[v] }));

function DominoSettings({ value, onChange, editable }: SettingsProps<DominoState>) {
  return (
    <SettingsCard editable={editable}>
      <Chips label={strings.modeLabel} options={modeOptions} value={value.mode ?? 'block'} onChange={(mode) => onChange({ mode })} disabled={!editable} />
      <Chips label={strings.targetLabel} options={targetOptions} value={value.target ?? '100'} onChange={(target) => onChange({ target })} disabled={!editable} />
    </SettingsCard>
  );
}

function Seats({ party }: { party: DominoParty }) {
  const st = party.state!;
  return (
    <div className={s.seats} style={{ gridTemplateColumns: `repeat(${st.seats.length}, minmax(0, 1fr))` }}>
      {st.seats.map((id, i) => (
        <div key={id} className={cx(s.seat, !st.roundResult && st.turn === i && s.seatOn, st.champion === i && s.seatWin)}>
          <div className={s.seatTop}>
            <Avatar name={party.nameOf(id) || '?'} />
            <span className={s.seatScore}>{st.scores[id] ?? 0}</span>
          </div>
          <span className={s.seatName}>{party.nameOf(id)}</span>
          <span className={s.seatMeta}>{strings.tilesLeft(st.hands[i].length)}</span>
        </div>
      ))}
    </div>
  );
}

function Board({ st }: { st: DominoState }) {
  const laid = useMemo(() => layoutSnake(st.line, 12), [st.line]);
  // Quân vừa đặt bay lên từ phía tay bài. Chỉ diễn khi dãy dài thêm đúng 1 quân (không diễn khi mới vào ván).
  const [seen, setSeen] = useState({ len: st.line.length, fresh: false });
  if (seen.len !== st.line.length) setSeen({ len: st.line.length, fresh: st.line.length === seen.len + 1 });
  const lastMove = st.last;
  const freshIndex = seen.fresh && lastMove?.kind === 'play' ? (lastMove.end === 'left' ? 0 : st.line.length - 1) : -1;
  if (!laid.length) return <div className={cx(s.board, s.boardEmpty)}>{strings.emptyBoard}</div>;
  const b = bounds(laid);
  const pad = 0.3;
  const last = st.line.length - 1;
  return (
    <div className={s.board}>
      <svg
        className={s.snake}
        viewBox={`${b.x - pad} ${b.y - pad} ${Math.max(b.w, 6) + pad * 2} ${b.h + pad * 2}`}
        role="img"
        aria-label={st.line.map((t) => `${t.a}-${t.b}`).join(', ')}
      >
        {laid.map((l) => (
          <TileShape key={l.index === freshIndex ? `f${st.seq}` : l.index} {...l} hot={l.index === 0 || l.index === last} fresh={l.index === freshIndex} />
        ))}
      </svg>
    </div>
  );
}

function lastText(party: DominoParty) {
  const st = party.state!;
  const m = st.last;
  if (!m) return '';
  const name = party.nameOf(st.seats[m.seat]);
  if (m.kind === 'play') return strings.lastPlay(name, m.tile.a, m.tile.b);
  if (m.kind === 'draw') return strings.lastDraw(name);
  return strings.lastPass(name);
}

function RoundPanel({ party }: { party: DominoParty }) {
  const st = party.state!;
  const r = st.roundResult!;
  const winName = r.winner !== null ? party.nameOf(st.seats[r.winner]) : '';
  const title = st.champion !== null ? strings.matchWon(party.nameOf(st.seats[st.champion])) : r.winner === null ? strings.roundTie : r.reason === 'domino' ? strings.roundDomino(winName, r.points) : strings.roundBlocked(winName, r.points);
  return (
    <section className={s.panel} aria-live="polite">
      <h3 className={s.panelTitle}>{title}</h3>
      <ul className={s.reveal}>
        {st.seats.map((id, i) => (
          <li key={id} className={cx(s.revealRow, r.winner === i && s.revealWin)}>
            <span className={s.revealName}>{party.nameOf(id)}</span>
            <span className={s.revealTiles}>
              {st.hands[i].map((t, j) => (
                <TileSvg key={j} a={t.a} b={t.b} className={s.mini} />
              ))}
            </span>
            <span className={s.revealPips}>{strings.pips(r.pips[i])}</span>
          </li>
        ))}
      </ul>
      {party.isHost ? (
        st.champion !== null ? (
          <Button variant="primary" block onClick={() => party.dispatch({ type: 'restart' })}>{strings.newGame}</Button>
        ) : (
          <Button variant="primary" block onClick={() => party.dispatch({ type: 'nextRound' })}>{strings.nextRound}</Button>
        )
      ) : (
        <p className={s.hint}>{strings.waitHost}</p>
      )}
    </section>
  );
}

function Hand({ party, seat }: { party: DominoParty; seat: number }) {
  const st = party.state!;
  const hand = st.hands[seat];
  const myTurn = !st.roundResult && st.turn === seat;
  const [picking, setPicking] = useState<Tile | null>(null);
  const e = ends(st.line);
  const stuck = myTurn && !canPlay(st.line, hand);
  const canDraw = stuck && st.mode === 'draw' && st.boneyard.length > 0;

  const choose = (t: Tile) => {
    const opts = fits(st.line, t);
    if (!opts.length) return;
    // Chạm lại quân đang chọn thì bỏ chọn.
    if (picking && picking.a === t.a && picking.b === t.b) {
      setPicking(null);
      return;
    }
    // Hai đầu cùng số thì nối đầu nào cũng như nhau.
    if (opts.length === 1 || !e || e[0] === e[1]) {
      setPicking(null);
      party.dispatch({ type: 'play', tile: t, end: opts.length === 1 ? opts[0] : 'right' });
      return;
    }
    setPicking(t);
  };

  return (
    <section className={s.handWrap} aria-label={strings.yourHand}>
      {picking && e ? (
        <div className={s.pick}>
          <span className={s.pickLabel}>{strings.pickEnd}</span>
          <div className={s.pickRow}>
            <Button onClick={() => { party.dispatch({ type: 'play', tile: picking, end: 'left' }); setPicking(null); }}>{strings.endLeft(e[0])}</Button>
            <Button onClick={() => { party.dispatch({ type: 'play', tile: picking, end: 'right' }); setPicking(null); }}>{strings.endRight(e[1])}</Button>
            <button className={s.link} onClick={() => setPicking(null)}>{strings.cancel}</button>
          </div>
        </div>
      ) : stuck ? (
        <div className={s.pickRow}>
          {canDraw ? (
            <Button variant="primary" block onClick={() => party.dispatch({ type: 'draw' })}>{strings.draw} · {strings.boneyard(st.boneyard.length)}</Button>
          ) : (
            <Button variant="primary" block onClick={() => party.dispatch({ type: 'pass' })}>{strings.pass}</Button>
          )}
        </div>
      ) : null}
      <div className={s.hand}>
        {hand.map((t) => {
          const ok = myTurn && fits(st.line, t).length > 0;
          const on = picking && picking.a === t.a && picking.b === t.b;
          return (
            <button key={`${t.a}-${t.b}`} className={cx(s.handTile, ok && s.handOk, on && s.handOn)} disabled={!ok} onClick={() => choose(t)} aria-label={strings.tile(t.a, t.b)}>
              <TileSvg a={t.a} b={t.b} className={s.handSvg} />
            </button>
          );
        })}
      </div>
      <p className={s.handMeta}>{strings.pips(pipsOf(hand))}</p>
    </section>
  );
}

function DominoGame({ party }: { party: DominoParty }) {
  const st = party.state!;
  const local = party.mode === 'local';
  const seat = local ? st.turn : st.seats.indexOf(party.me);
  const myTurn = !st.roundResult && seat >= 0 && st.turn === seat;
  const sfx = useRef(party.sfx);
  sfx.current = party.sfx;

  // Chơi 1 máy: mỗi khi đổi người cầm máy thì che quân lại.
  const coverKey = `${st.round}|${st.turn}|${st.line.length}|${st.passes}`;
  const [seen, setSeen] = useState('');
  const covered = local && !st.roundResult && seen !== coverKey;

  useEffect(() => {
    if (!st.last) return;
    sfx.current(st.last.kind === 'pass' ? 'tick' : 'tap');
    vibrate(st.last.kind === 'play' ? 12 : 6);
  }, [st.last, st.seq]);
  useEffect(() => {
    if (st.roundResult) sfx.current(st.champion !== null || st.roundResult.winner !== null ? 'win' : 'buzz');
  }, [st.roundResult, st.champion]);
  useEffect(() => {
    if (myTurn && !local) vibrate([20, 40, 20]);
  }, [myTurn, local]);

  const turnName = party.nameOf(st.seats[st.turn]);
  const hand = seat >= 0 ? st.hands[seat] : [];
  const status = st.roundResult || covered
    ? ''
    : seat < 0
      ? strings.watching
      : myTurn
        ? !st.line.length
          ? strings.yourMoveFirst
          : canPlay(st.line, hand)
            ? strings.yourMove
            : st.mode === 'draw' && st.boneyard.length
              ? strings.mustDraw
              : strings.mustPass
        : strings.waitMove(turnName);

  return (
    <div className={s.game}>
      <Seats party={party} />
      <div className={s.head}>
        <span className={cx(s.status, myTurn && !covered && s.statusOn)} aria-live="polite">{status || lastText(party)}</span>
        <span className={s.meta}>
          {strings.round(st.round)} · {strings.target(st.target)}
          {st.mode === 'draw' && ` · ${strings.boneyard(st.boneyard.length)}`}
        </span>
      </div>
      {status && st.last && <p className={s.last}>{lastText(party)}</p>}
      <Board st={st} />
      {st.roundResult ? (
        <RoundPanel party={party} />
      ) : covered ? (
        <button className={s.cover} onClick={() => setSeen(coverKey)}>
          <strong className={s.coverName}>{strings.passTo(turnName)}</strong>
          <span>{strings.tapToSee}</span>
          <small className={s.hint}>{strings.hideNote}</small>
        </button>
      ) : seat >= 0 ? (
        <Hand key={coverKey} party={party} seat={seat} />
      ) : null}
    </div>
  );
}

export default function Domino({ ctx }: MiniAppProps<PartyData>) {
  const party = useParty(dominoGame, ctx);
  return (
    <PartyShell
      party={party}
      info={{
        title: strings.title,
        rule: strings.rule,
        art: <span className={s.heroArt} dangerouslySetInnerHTML={{ __html: iconSvg }} />,
        settings: (p) => <DominoSettings {...p} />,
      }}
    >
      {party.state && <DominoGame party={party} />}
    </PartyShell>
  );
}
