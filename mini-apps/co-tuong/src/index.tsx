import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { MiniAppProps } from '@bang/sdk';
import { Avatar, Chips, PartyShell, SettingsCard, useParty, vibrate, type PartyData, type SettingsProps } from '@bang/party';
import { Button, Dialog, cx } from '@bang/ui';
import {
  COLS,
  ROWS,
  actorSeat,
  colorOf,
  inCheck,
  kingSquare,
  legalMoves,
  seatOf,
  seatOfColor,
  xiangqiGame,
  type Color,
  type Kind,
  type Piece,
  type Seat,
  type XiangqiParty,
  type XiangqiState,
} from './game';
import { strings, type Script } from './strings';
import s from './CoTuong.module.css';
import iconSvg from '../icon.svg?raw';

const scriptOptions = (Object.keys(strings.scriptOptions) as Script[]).map((v) => ({ value: v, label: strings.scriptOptions[v] }));

function XiangqiSettings({ value, onChange, editable }: SettingsProps<XiangqiState>) {
  return (
    <SettingsCard editable={editable}>
      <Chips label={strings.scriptLabel} options={scriptOptions} value={value.script ?? 'han'} onChange={(script) => onChange({ script })} disabled={!editable} />
    </SettingsCard>
  );
}

/**
 * Bàn trước nước vừa đi (để diễn quân trượt và quân bị ăn mờ dần). Chỉ có khi số nước tăng đúng 1:
 * vào giữa ván, ván mới, hay đổi cấu hình thì null và không diễn gì.
 */
function usePrevBoard(board: readonly (Piece | null)[], count: number) {
  const [t, setT] = useState({ board, count, prev: null as readonly (Piece | null)[] | null });
  if (t.count !== count) setT({ board, count, prev: t.count === count - 1 ? t.board : null });
  return t.prev;
}

function PieceFace({ piece, script, slide }: { piece: Piece; script: Script; slide?: { dx: number; dy: number } }) {
  const color = piece[0] as Color;
  const kind = piece[1] as Kind;
  return (
    <span
      className={cx(s.piece, color === 'r' ? s.red : s.black, script === 'viet' && s.viet, slide && s.slide)}
      style={slide ? ({ '--dx': slide.dx, '--dy': slide.dy } as CSSProperties) : undefined}
    >
      <span className={s.pieceText}>{script === 'han' ? strings.han[color][kind] : strings.viet[kind]}</span>
    </span>
  );
}

/** Mặt bàn: đường kẻ, sông, cung tướng. Đối xứng nên lật bàn không cần vẽ lại. */
function BoardLines() {
  const x = (c: number) => 5 + c * 10;
  const y = (r: number) => 5 + r * 10;
  const lines: string[] = [];
  for (let r = 0; r < ROWS; r++) lines.push(`M${x(0)} ${y(r)}H${x(8)}`);
  for (let c = 0; c < COLS; c++) {
    if (c === 0 || c === 8) lines.push(`M${x(c)} ${y(0)}V${y(9)}`);
    else lines.push(`M${x(c)} ${y(0)}V${y(4)}M${x(c)} ${y(5)}V${y(9)}`);
  }
  lines.push(`M${x(3)} ${y(0)}L${x(5)} ${y(2)}M${x(5)} ${y(0)}L${x(3)} ${y(2)}`);
  lines.push(`M${x(3)} ${y(7)}L${x(5)} ${y(9)}M${x(5)} ${y(7)}L${x(3)} ${y(9)}`);
  return (
    <svg className={s.lines} viewBox="0 0 90 100" aria-hidden="true">
      <rect x="3" y="3" width="84" height="94" className={s.frame} />
      <path d={lines.join('')} className={s.grid} />
      <text x={x(2)} y="51.6" className={s.river}>{strings.river[0]}</text>
      <text x={x(6)} y="51.6" className={s.river}>{strings.river[1]}</text>
    </svg>
  );
}

function Seats({ party }: { party: XiangqiParty }) {
  const st = party.state!;
  const sideSeat = seatOfColor(st, st.side);
  return (
    <div className={s.score} aria-label={strings.score}>
      {st.seats.map((id, i) => {
        const seat = i as Seat;
        const color = colorOf(st, seat);
        return (
          <div key={seat} className={cx(s.seat, !st.done && sideSeat === seat && s.seatOn)}>
            <Avatar name={party.nameOf(id) || '?'} />
            <span className={s.seatName}>{party.nameOf(id)}</span>
            <span className={cx(s.badge, color === 'r' ? s.red : s.black)} aria-label={strings.colors[color]}>{strings.han[color].K}</span>
            <span className={s.wins}>{st.wins[id] ?? 0}</span>
          </div>
        );
      })}
    </div>
  );
}

function XiangqiGame({ party }: { party: XiangqiParty }) {
  const st = party.state!;
  const local = party.mode === 'local';
  const actor = actorSeat(st);
  const mySeat: Seat | null = local ? actor : seatOf(st, party.me);
  const sideSeat = seatOfColor(st, st.side);
  const canMove = !st.done && mySeat !== null && mySeat === sideSeat && (!local || st.drawOffer === null);
  // Người cầm đen ở phòng thấy quân mình ở dưới.
  const flipped = !local && mySeat !== null && colorOf(st, mySeat) === 'b';

  const [selected, setSelected] = useState<number | null>(null);
  const [confirmResign, setConfirmResign] = useState(false);
  const moves = useMemo(() => (st.done ? [] : legalMoves(st.board, st.side)), [st.done, st.board, st.side]);
  const targets = useMemo(() => new Set(selected === null ? [] : moves.filter((m) => m.from === selected).map((m) => m.to)), [moves, selected]);
  const last = st.history[st.history.length - 1];
  const checkedColor: Color | null = inCheck(st.board, st.side) ? st.side : null;
  const checked = checkedColor ? kingSquare(st.board, checkedColor) : -1;

  const seq = st.seq;
  useEffect(() => setSelected(null), [seq]);

  const sfx = useRef(party.sfx);
  sfx.current = party.sfx;
  const moveCount = st.history.length;
  const prevBoard = usePrevBoard(st.board, moveCount);
  const ghost = prevBoard && last ? prevBoard[last.to] : null;
  const checkRef = useRef(checked >= 0);
  checkRef.current = checked >= 0;
  const captureRef = useRef(false);
  captureRef.current = !!ghost;
  useEffect(() => {
    if (!moveCount) return;
    sfx.current(checkRef.current ? 'buzz' : 'tap');
    vibrate(checkRef.current ? [20, 40, 20] : captureRef.current ? [14, 30, 14] : 10);
  }, [moveCount]);
  useEffect(() => {
    if (st.done) sfx.current(st.winner !== null ? 'win' : 'buzz');
  }, [st.done, st.winner]);

  const tap = (i: number) => {
    if (!canMove) return;
    if (selected !== null && targets.has(i)) {
      party.dispatch({ type: 'move', from: selected, to: i });
      setSelected(null);
      return;
    }
    const piece = st.board[i];
    if (piece && piece[0] === st.side) {
      setSelected(i === selected ? null : i);
      party.sfx('tick');
    } else setSelected(null);
  };

  const nameOfSeat = (seat: Seat) => party.nameOf(st.seats[seat]);
  const sideColor = strings.colors[st.side];
  const status = st.done
    ? st.winner !== null
      ? `${strings.won(nameOfSeat(st.winner))} · ${strings.reasons[st.reason!]}`
      : `${strings.draw} · ${strings.reasons[st.reason!]}`
    : mySeat === null
      ? `${strings.watching} · ${strings.waitMove(nameOfSeat(sideSeat), sideColor)}`
      : mySeat === sideSeat
        ? strings.yourMove(sideColor)
        : strings.waitMove(nameOfSeat(sideSeat), sideColor);

  const total = COLS * ROWS;
  const order = Array.from({ length: total }, (_, i) => (flipped ? total - 1 - i : i));
  const pos = (sq: number) => (flipped ? total - 1 - sq : sq);
  const slide = prevBoard && last ? { dx: (pos(last.from) % COLS) - (pos(last.to) % COLS), dy: Math.floor(pos(last.from) / COLS) - Math.floor(pos(last.to) / COLS) } : null;
  const banner = st.done ? (st.winner !== null ? strings.won(nameOfSeat(st.winner)) : strings.draw) : null;
  const actSeat: Seat | null = st.done ? null : local ? (st.drawOffer === null ? sideSeat : null) : mySeat;
  const answering = !st.done && st.drawOffer !== null && (local || mySeat === actor);

  return (
    <div className={s.game}>
      <Seats party={party} />
      <div className={s.head}>
        <span className={s.status} aria-live="polite">{status}</span>
        <span className={s.moves}>{strings.moves(Math.ceil(moveCount / 2))}</span>
      </div>
      {!st.done && checked >= 0 && (
        <p className={s.check} role="alert">{strings.check}</p>
      )}

      <div className={s.boardWrap}>
        <div className={s.board}>
          <BoardLines />
          <div className={s.points} role="grid">
            {order.map((i) => {
              const piece = st.board[i];
              const r = Math.floor(i / COLS) + 1;
              const c = (i % COLS) + 1;
              return (
                <button
                  key={i}
                  className={cx(
                    s.pt,
                    last && (i === last.from || i === last.to) && s.last,
                    i === selected && s.sel,
                    i === checked && s.inCheck,
                    targets.has(i) && (piece ? s.capture : s.target),
                  )}
                  disabled={!canMove}
                  onClick={() => tap(i)}
                  aria-label={strings.point(r, c, piece ? `${strings.pieceNames[piece[1] as Kind]} ${strings.colors[piece[0] as Color]}` : undefined)}
                >
                  {ghost && last && i === last.to && (
                    <span key={`g${moveCount}`} className={s.ghost}>
                      <PieceFace piece={ghost} script={st.script} />
                    </span>
                  )}
                  {piece && <PieceFace key={slide && last && i === last.to ? `m${moveCount}` : 'p'} piece={piece} script={st.script} slide={slide && last && i === last.to ? slide : undefined} />}
                </button>
              );
            })}
          </div>
          {banner && (
            <div className={cx(s.banner, st.winner === null && s.bannerDraw)} aria-hidden="true">
              <span className={s.bannerText}>{banner}</span>
              <span className={s.bannerSub}>{strings.reasons[st.reason!]}</span>
            </div>
          )}
        </div>
      </div>

      {answering && (
        <div className={s.offer} role="alertdialog" aria-label={strings.offerFrom(nameOfSeat(st.drawOffer!))}>
          <span>{local ? strings.offerAsk(nameOfSeat(actor)) : strings.offerFrom(nameOfSeat(st.drawOffer!))}</span>
          <div className={s.offerRow}>
            <Button onClick={() => party.dispatch({ type: 'answer', accept: false })}>{strings.decline}</Button>
            <Button variant="primary" onClick={() => party.dispatch({ type: 'answer', accept: true })}>{strings.accept}</Button>
          </div>
        </div>
      )}
      {!local && !st.done && st.drawOffer !== null && st.drawOffer === mySeat && <p className={s.hint}>{strings.offered}</p>}

      {actSeat !== null && !answering && (
        <div className={s.actions}>
          <button className={s.pill} disabled={st.drawOffer !== null} onClick={() => party.dispatch({ type: 'offer' })}>{strings.offerDraw}</button>
          <button className={cx(s.pill, s.pillDanger)} onClick={() => setConfirmResign(true)}>{strings.resign}</button>
        </div>
      )}
      {confirmResign && actSeat !== null && (
        <Dialog
          title={strings.resignTitle}
          text={strings.resignText(nameOfSeat(actSeat))}
          confirmLabel={strings.resign}
          cancelLabel={strings.cancel}
          danger
          onCancel={() => setConfirmResign(false)}
          onConfirm={() => {
            setConfirmResign(false);
            party.dispatch({ type: 'resign' });
          }}
        />
      )}

      {st.done &&
        (party.isHost ? (
          <Button variant="primary" block onClick={() => party.dispatch({ type: 'restart' })}>{strings.newGame}</Button>
        ) : (
          <p className={s.hint}>{strings.waitNewGame}</p>
        ))}
    </div>
  );
}

export default function CoTuong({ ctx }: MiniAppProps<PartyData>) {
  const party = useParty(xiangqiGame, ctx);
  return (
    <PartyShell
      party={party}
      info={{
        title: strings.title,
        rule: strings.rule,
        art: <span className={s.heroArt} dangerouslySetInnerHTML={{ __html: iconSvg }} />,
        settings: (p) => <XiangqiSettings {...p} />,
      }}
    >
      {party.state && <XiangqiGame party={party} />}
    </PartyShell>
  );
}
