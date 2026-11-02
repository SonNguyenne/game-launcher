import { useEffect, useRef, type CSSProperties } from 'react';
import type { MiniAppProps } from '@bang/sdk';
import { Avatar, Chips, PartyShell, SettingsCard, useParty, vibrate, type PartyData, type SettingsProps } from '@bang/party';
import { Button, cx } from '@bang/ui';
import { caroGame, seatOf, seatTurn, type CaroParty, type CaroState } from './game';
import { strings, type BlockRule, type BoardSize } from './strings';
import s from './Caro.module.css';
import iconSvg from '../icon.svg?raw';

const sizeOptions = (Object.keys(strings.sizeOptions) as BoardSize[]).map((v) => ({ value: v, label: strings.sizeOptions[v] }));
const blockOptions = (Object.keys(strings.blockOptions) as BlockRule[]).map((v) => ({ value: v, label: strings.blockOptions[v] }));

function CaroSettings({ value, onChange, editable }: SettingsProps<CaroState>) {
  return (
    <SettingsCard editable={editable}>
      <Chips label={strings.sizeLabel} options={sizeOptions} value={value.boardSize ?? '15'} onChange={(boardSize) => onChange({ boardSize })} disabled={!editable} />
      <Chips label={strings.blockLabel} options={blockOptions} value={value.block ?? 'free'} onChange={(block) => onChange({ block })} disabled={!editable} />
    </SettingsCard>
  );
}

function Score({ party }: { party: CaroParty }) {
  const st = party.state!;
  const turnSeat = seatTurn(st);
  return (
    <div className={s.score} aria-label={strings.score}>
      {st.seats.map((id, seat) => (
        <div key={seat} className={cx(s.seat, !st.done && turnSeat === seat && s.seatOn)}>
          <Avatar name={party.nameOf(id) || '?'} />
          <span className={s.seatName}>{party.nameOf(id)}</span>
          <span className={cx(s.mark, seat === 0 ? s.x : s.o)}>{strings.marks[seat]}</span>
          <span className={s.wins}>{st.wins[id] ?? 0}</span>
        </div>
      ))}
    </div>
  );
}

function CaroGame({ party }: { party: CaroParty }) {
  const st = party.state!;
  // Chơi 1 máy: luôn đánh cho ghế đang tới lượt. Chơi phòng: chỉ ghế của mình.
  const mySeat = party.mode === 'local' ? seatTurn(st) : seatOf(st, party.me);
  const turnSeat = seatTurn(st);
  const canPlay = !st.done && mySeat !== null && mySeat === turnSeat;
  const last = st.history[st.history.length - 1];
  const sfx = useRef(party.sfx);
  sfx.current = party.sfx;

  useEffect(() => {
    if (last === undefined) return;
    sfx.current('tap');
    vibrate(10);
  }, [last, st.history.length]);
  useEffect(() => {
    if (st.done) sfx.current(st.winner !== null ? 'win' : 'buzz');
  }, [st.done, st.winner]);

  const status = st.done
    ? st.winner !== null
      ? strings.won(party.nameOf(st.seats[st.winner]))
      : strings.draw
    : mySeat === null
      ? strings.watching
      : canPlay
        ? strings.yourMove(strings.marks[turnSeat])
        : strings.waitMove(party.nameOf(st.seats[turnSeat]), strings.marks[turnSeat]);
  // Người vừa đánh được đi lại khi đối thủ chưa đánh (chơi 1 máy: ai cũng bấm được).
  const canUndo = !st.done && st.history.length > 0 && (party.mode === 'local' || (mySeat !== null && mySeat !== turnSeat));
  const line = new Set(st.line);

  return (
    <div className={s.game}>
      <Score party={party} />
      <div className={s.head}>
        <span className={s.status} aria-live="polite">{status}</span>
        <span className={s.moves}>{strings.moves(st.history.length)}</span>
        {canUndo && (
          <button className={s.pill} onClick={() => party.dispatch({ type: 'undo' })}>
            {strings.undo}
          </button>
        )}
      </div>

      <div className={s.stage}>
        <div className={s.boardWrap}>
          <div className={s.board} style={{ '--n': st.size } as CSSProperties} role="grid">
            {st.cells.map((cell, i) => {
              const mark = cell === null ? undefined : strings.marks[cell];
              const onLine = line.has(i);
              return (
                <button
                  key={i}
                  className={cx(s.cell, cell === 0 && s.x, cell === 1 && s.o, i === last && s.last, onLine && s.win)}
                  style={onLine ? ({ '--k': st.line.indexOf(i) } as CSSProperties) : undefined}
                  data-next={canPlay && cell === null ? strings.marks[turnSeat] : undefined}
                  disabled={!canPlay || cell !== null}
                  onClick={() => party.dispatch({ type: 'place', index: i })}
                  aria-label={strings.cell(Math.floor(i / st.size) + 1, (i % st.size) + 1, mark)}
                >
                  {mark && <span className={s.stone}>{mark}</span>}
                </button>
              );
            })}
          </div>
        </div>
        {st.done && (
          <div className={cx(s.banner, st.winner === null && s.bannerDraw)} aria-hidden="true">
            <span className={s.bannerText}>{st.winner !== null ? strings.won(party.nameOf(st.seats[st.winner])) : strings.draw}</span>
          </div>
        )}
      </div>

      {st.done &&
        (party.isHost ? (
          <Button variant="primary" block onClick={() => party.dispatch({ type: 'restart' })}>{strings.newGame}</Button>
        ) : (
          <p className={s.hint}>{strings.waitNewGame}</p>
        ))}
    </div>
  );
}

export default function CoCaro({ ctx }: MiniAppProps<PartyData>) {
  const party = useParty(caroGame, ctx);
  return (
    <PartyShell
      party={party}
      info={{
        title: strings.title,
        rule: strings.rule,
        art: <span className={s.heroArt} dangerouslySetInnerHTML={{ __html: iconSvg }} />,
        settings: (p) => <CaroSettings {...p} />,
      }}
    >
      {party.state && <CaroGame party={party} />}
    </PartyShell>
  );
}
