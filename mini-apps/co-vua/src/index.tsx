import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { MiniAppProps } from '@bang/sdk';
import { Avatar, Chips, PartyShell, SettingsCard, useParty, vibrate, type PartyData, type SettingsProps } from '@bang/party';
import { Button, Dialog, cx } from '@bang/ui';
import {
  actorSeat,
  chessGame,
  colorOf,
  inCheck,
  kingSquare,
  legalMoves,
  other,
  remaining,
  seatOf,
  seatOfColor,
  startBoard,
  type ChessParty,
  type ChessState,
  type Color,
  type Kind,
  type Move,
  type Piece,
  type Promo,
  type Seat,
} from './game';
import { strings, type ClockSetting } from './strings';
import s from './CoVua.module.css';
import iconSvg from '../icon.svg?raw';

const clockOptions = (Object.keys(strings.clockOptions) as ClockSetting[]).map((v) => ({ value: v, label: strings.clockOptions[v] }));

function ChessSettings({ value, onChange, editable }: SettingsProps<ChessState>) {
  return (
    <SettingsCard editable={editable}>
      <Chips label={strings.clockLabel} options={clockOptions} value={value.clock ?? 'none'} onChange={(clock) => onChange({ clock })} disabled={!editable} />
    </SettingsCard>
  );
}

// Biến thể chữ (FE0E) để iPhone không vẽ quân tốt thành emoji.
const GLYPH: Record<Kind, string> = { K: '♚︎', Q: '♛︎', R: '♜︎', B: '♝︎', N: '♞︎', P: '♟︎' };
const VALUE: Record<Kind, number> = { K: 0, Q: 9, R: 5, B: 3, N: 3, P: 1 };
const FILES = 'abcdefgh';
const squareName = (i: number) => `${FILES[i & 7]}${8 - (i >> 3)}`;

function PieceGlyph({ piece, small, slide }: { piece: Piece; small?: boolean; slide?: { dx: number; dy: number } }) {
  return (
    <span
      className={cx(s.piece, piece[0] === 'w' ? s.white : s.black, small && s.small, slide && s.slide)}
      style={slide ? ({ '--dx': slide.dx, '--dy': slide.dy } as CSSProperties) : undefined}
    >
      {GLYPH[piece[1] as Kind]}
    </span>
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

/** Quân một màu đã bị ăn, so với thế đầu (quân phong cấp tính như tốt đã mất). */
function captured(board: readonly (Piece | null)[], color: Color): Piece[] {
  const count = (b: readonly (Piece | null)[], k: Kind) => b.filter((p) => p === `${color}${k}`).length;
  const start = startBoard();
  const out: Piece[] = [];
  for (const k of ['Q', 'R', 'B', 'N', 'P'] as Kind[]) {
    for (let n = count(start, k) - count(board, k); n > 0; n--) out.push(`${color}${k}`);
  }
  return out;
}

const formatClock = (ms: number) => {
  const t = Math.ceil(ms / 1000);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

function PlayerBar({ party, seat, now, active }: { party: ChessParty; seat: Seat; now: number; active: boolean }) {
  const st = party.state!;
  const color = colorOf(st, seat);
  const id = st.seats[seat];
  const lost = captured(st.board, other(color));
  const material = (c: Color) => captured(st.board, c).reduce((n, p) => n + VALUE[p[1] as Kind], 0);
  const lead = material(other(color)) - material(color);
  const left = st.clock === 'none' ? null : remaining(st, color, now);
  return (
    <div className={cx(s.player, active && s.playerOn)}>
      <Avatar name={party.nameOf(id) || '?'} />
      <div className={s.playerMain}>
        <span className={s.playerName}>
          <span className={cx(s.dot, color === 'w' ? s.dotWhite : s.dotBlack)} aria-hidden="true" />
          {party.nameOf(id)}
          <span className={s.wins} aria-label={strings.score}>{st.wins[id] ?? 0}</span>
        </span>
        <span className={s.taken}>
          {lost.map((p, i) => <PieceGlyph key={i} piece={p} small />)}
          {lead > 0 && <span className={s.lead}>+{lead}</span>}
        </span>
      </div>
      {left !== null && <span className={cx(s.clock, active && s.clockOn, left < 20_000 && s.clockLow)}>{formatClock(left)}</span>}
    </div>
  );
}

function ChessGame({ party }: { party: ChessParty }) {
  const st = party.state!;
  const local = party.mode === 'local';
  const actor = actorSeat(st);
  const mySeat: Seat | null = local ? actor : seatOf(st, party.me);
  const sideSeat = seatOfColor(st, st.side);
  const canMove = !st.done && mySeat !== null && mySeat === sideSeat && (local ? st.drawOffer === null : true);
  // Lật bàn: người cầm đen ở phòng thấy quân mình ở dưới. Chơi 1 máy và người xem: trắng ở dưới.
  const flipped = !local && mySeat !== null && colorOf(st, mySeat) === 'b';
  const bottomSeat: Seat = flipped ? (mySeat as Seat) : st.whiteSeat;
  const topSeat = (1 - bottomSeat) as Seat;

  const [selected, setSelected] = useState<number | null>(null);
  const [promo, setPromo] = useState<Move | null>(null);
  const [confirmResign, setConfirmResign] = useState(false);
  const [now, setNow] = useState(() => party.now());

  const moves = useMemo(() => (st.done ? [] : legalMoves(st)), [st]);
  const targets = useMemo(() => (selected === null ? [] : moves.filter((m) => m.from === selected)), [moves, selected]);
  const last = st.history[st.history.length - 1];
  const checked = !st.done || st.reason === 'mate' ? (inCheck(st) ? kingSquare(st.board, st.side) : -1) : -1;

  // Bàn đổi (đối thủ đi, ván mới) thì bỏ chọn.
  const seq = st.seq;
  useEffect(() => {
    setSelected(null);
    setPromo(null);
  }, [seq]);

  const sfx = useRef(party.sfx);
  sfx.current = party.sfx;
  const moveCount = st.history.length;
  const prevBoard = usePrevBoard(st.board, moveCount);
  // Quân bị ăn: ô đích có quân cũ, hoặc bắt tốt qua đường (tốt bị ăn nằm cạnh ô xuất phát).
  const ghosts = useMemo(() => {
    const out = new Map<number, Piece>();
    if (!prevBoard || !last) return out;
    const mover = prevBoard[last.from];
    const epSq = (last.from >> 3) * 8 + (last.to & 7);
    if (prevBoard[last.to]) out.set(last.to, prevBoard[last.to]!);
    else if (mover?.[1] === 'P' && (last.from & 7) !== (last.to & 7) && prevBoard[epSq]) out.set(epSq, prevBoard[epSq]!);
    return out;
  }, [prevBoard, last]);
  const hadCapture = ghosts.size > 0;
  useEffect(() => {
    if (!moveCount) return;
    sfx.current(checked >= 0 ? 'buzz' : 'tap');
    vibrate(checked >= 0 ? [20, 40, 20] : hadCapture ? [14, 30, 14] : 10);
    // Chỉ kêu khi có nước mới.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveCount]);
  useEffect(() => {
    if (st.done) sfx.current(st.winner !== null ? 'win' : 'buzz');
  }, [st.done, st.winner]);

  // Đồng hồ chạy theo giờ chung của phòng; hết giờ thì báo cho luật kiểm tra.
  const ticking = st.clock !== 'none' && !st.done;
  const partyNow = party.now;
  useEffect(() => {
    if (!ticking) return;
    const id = setInterval(() => setNow(partyNow()), 250);
    return () => clearInterval(id);
  }, [ticking, partyNow]);
  const flagged = useRef(-1);
  const dispatch = party.dispatch;
  const outOfTime = ticking && remaining(st, st.side, now) <= 0;
  useEffect(() => {
    if (!outOfTime || flagged.current === seq) return;
    flagged.current = seq;
    dispatch({ type: 'flag' });
  }, [outOfTime, seq, dispatch]);

  const tap = (i: number) => {
    if (!canMove) return;
    const piece = st.board[i];
    if (selected !== null) {
      const hits = targets.filter((m) => m.to === i);
      if (hits.length > 1) return setPromo({ from: selected, to: i });
      if (hits.length === 1) {
        party.dispatch({ type: 'move', from: selected, to: i });
        setSelected(null);
        return;
      }
    }
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

  const order = Array.from({ length: 64 }, (_, i) => (flipped ? 63 - i : i));
  // Quân vừa đi trượt từ ô cũ sang ô mới (tính theo hướng nhìn); nhập thành thì xe trượt theo.
  const slides = new Map<number, { dx: number; dy: number }>();
  if (prevBoard && last) {
    const pos = (sq: number) => (flipped ? 63 - sq : sq);
    const add = (from: number, to: number) => slides.set(to, { dx: (pos(from) & 7) - (pos(to) & 7), dy: (pos(from) >> 3) - (pos(to) >> 3) });
    add(last.from, last.to);
    if (prevBoard[last.from]?.[1] === 'K' && Math.abs(last.to - last.from) === 2) {
      const kingSide = last.to > last.from;
      add(kingSide ? last.from + 3 : last.from - 4, kingSide ? last.from + 1 : last.from - 1);
    }
  }
  const banner = st.done
    ? st.winner !== null
      ? strings.won(nameOfSeat(st.winner))
      : strings.draw
    : null;
  const targetSet = new Map(targets.map((m) => [m.to, m]));
  // Nút xin hòa/đầu hàng: chơi 1 máy thì cho người tới lượt; chơi phòng thì cho người ngồi ghế.
  const actSeat: Seat | null = st.done ? null : local ? (st.drawOffer === null ? sideSeat : null) : mySeat;
  const answering = !st.done && st.drawOffer !== null && (local || mySeat === actor);

  return (
    <div className={s.game}>
      <PlayerBar party={party} seat={topSeat} now={now} active={!st.done && sideSeat === topSeat} />

      <div className={s.head}>
        <span className={s.status} aria-live="polite">{status}</span>
        {!st.done && checked >= 0 && <span className={s.check}>{strings.check}</span>}
        <span className={s.moves}>{strings.moves(Math.ceil(moveCount / 2))}</span>
      </div>

      <div className={s.boardWrap}>
        <div className={s.board} role="grid">
          {order.map((i) => {
            const piece = st.board[i];
            const r = i >> 3;
            const c = i & 7;
            const target = targetSet.get(i);
            const showFile = flipped ? r === 0 : r === 7;
            const showRank = flipped ? c === 7 : c === 0;
            return (
              <button
                key={i}
                className={cx(
                  s.sq,
                  (r + c) % 2 ? s.dark : s.light,
                  last && (i === last.from || i === last.to) && s.last,
                  i === selected && s.sel,
                  i === checked && s.inCheck,
                  target && (piece || (st.board[target.from]?.[1] === 'P' && (i & 7) !== (target.from & 7)) ? s.capture : s.target),
                )}
                onClick={() => tap(i)}
                disabled={!canMove}
                aria-label={strings.square(squareName(i), piece ? `${strings.colors[piece[0] as Color]} ${strings.pieceNames[piece[1] as Kind]}` : undefined)}
              >
                {showRank && <span className={s.rank}>{8 - r}</span>}
                {showFile && <span className={s.file}>{FILES[c]}</span>}
                {ghosts.has(i) && (
                  <span key={`g${moveCount}`} className={s.ghost}>
                    <PieceGlyph piece={ghosts.get(i)!} />
                  </span>
                )}
                {piece && <PieceGlyph key={slides.has(i) ? `m${moveCount}` : 'p'} piece={piece} slide={slides.get(i)} />}
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

        {promo && (
          <div className={s.promo} role="dialog" aria-label={strings.promoteTitle}>
            <span className={s.promoTitle}>{strings.promoteTitle}</span>
            <div className={s.promoRow}>
              {(['Q', 'R', 'B', 'N'] as Promo[]).map((k) => (
                <button
                  key={k}
                  className={s.promoBtn}
                  aria-label={strings.pieceNames[k]}
                  onClick={() => {
                    party.dispatch({ type: 'move', from: promo.from, to: promo.to, promo: k });
                    setPromo(null);
                    setSelected(null);
                  }}
                >
                  <PieceGlyph piece={`${st.side}${k}`} />
                </button>
              ))}
            </div>
            <button className={s.link} onClick={() => setPromo(null)}>{strings.cancel}</button>
          </div>
        )}
      </div>

      <PlayerBar party={party} seat={bottomSeat} now={now} active={!st.done && sideSeat === bottomSeat} />

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

export default function CoVua({ ctx }: MiniAppProps<PartyData>) {
  const party = useParty(chessGame, ctx);
  return (
    <PartyShell
      party={party}
      info={{
        title: strings.title,
        rule: strings.rule,
        art: <span className={s.heroArt} dangerouslySetInnerHTML={{ __html: iconSvg }} />,
        settings: (p) => <ChessSettings {...p} />,
      }}
    >
      {party.state && <ChessGame party={party} />}
    </PartyShell>
  );
}
