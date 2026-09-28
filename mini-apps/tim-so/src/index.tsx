import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import type { MiniAppProps } from '@bang/sdk';
import { Chips, PartyShell, ResultCard, partyStyles, useParty, vibrate, type Party, type PartyData } from '@bang/party';
import { Button, Icon, Sheet, TextInput, accentColors, cx, keyColors, palette } from '@bang/ui';
import { COUNTDOWN_MS, LIMITS, SECONDS, SIZES, TURN_SECONDS, countsOf, isBoardDone, findGame, gridOf, targetOf, type Config, type Dot, type Spin, type FindAction, type FindState, type Round } from './game';
import { strings, type Order, type Play } from './strings';
import { lookColor, lookFont, lookScale, useLook, type Look } from './look';
import s from './Find.module.css';

type FindParty = Party<FindState, FindAction>;

/** Màu chữ của các con số, như bút nhiều màu trên giấy. Đủ TINT_COUNT màu. */
const TINTS = ['var(--ink)', accentColors.orange.fill, accentColors.green.fill, palette.blue, accentColors.violet.fill, accentColors.pink.fill, accentColors.teal.fill];
/** Màu vòng khoanh của từng người chơi, theo thứ tự trong phòng. */
const RINGS = [accentColors.orange.fill, palette.blue, accentColors.green.fill, accentColors.violet.fill, accentColors.pink.fill, accentColors.teal.fill];

const orderOptions = (Object.keys(strings.orders) as Order[]).map((v) => ({ value: v, label: strings.orders[v] }));
const playOptions = (Object.keys(strings.plays) as Play[]).map((v) => ({ value: v, label: strings.plays[v] }));
const sizeOptions = SIZES.map((n) => ({ value: String(n), label: strings.size(n) }));
const secondOptions = SECONDS.map((n) => ({ value: String(n), label: strings.seconds(n) }));
const turnSecondOptions = TURN_SECONDS.map((n) => ({ value: String(n), label: strings.seconds(n) }));
const penaltyOptions = (['on', 'off'] as const).map((v) => ({ value: v, label: strings.penaltyOptions[v] }));

const clock = (secs: number) => `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;

export function FindArt() {
  return (
    <div className={s.art}>
      {[
        { n: 7, x: 22, y: 26, r: -14, c: 1 },
        { n: 23, x: 70, y: 22, r: 10, c: 3 },
        { n: 1, x: 46, y: 52, r: -4, c: 0, ring: true },
        { n: 56, x: 20, y: 78, r: 12, c: 2 },
        { n: 38, x: 76, y: 74, r: -10, c: 4 },
      ].map((d) => (
        <span
          key={d.n}
          className={cx(s.artNum, d.ring && s.artRing)}
          style={{ left: `${d.x}%`, top: `${d.y}%`, rotate: `${d.r}deg`, color: TINTS[d.c] } as CSSProperties}
        >
          {d.n}
        </span>
      ))}
    </div>
  );
}

/** Đồng hồ của vòng, tính từ lúc máy này thấy vòng mới nên không phụ thuộc giờ của máy khác. */
function useRoundClock(round: Round, seconds: number, running: boolean) {
  const started = useRef<{ id: number; at: number }>({ id: -1, at: 0 });
  if (started.current.id !== round.attempt) started.current = { id: round.attempt, at: performance.now() };
  const secondsRef = useRef(seconds);
  secondsRef.current = seconds;

  const read = useCallback(() => {
    const ms = performance.now() - started.current.at;
    return {
      counting: ms < COUNTDOWN_MS,
      count: Math.ceil((COUNTDOWN_MS - ms) / 1000),
      left: Math.max(0, Math.ceil(secondsRef.current - (ms - COUNTDOWN_MS) / 1000)),
    };
  }, []);
  const [now, setNow] = useState(read);

  useEffect(() => {
    setNow(read());
    if (!running) return;
    const id = setInterval(() => setNow(read()), 100);
    return () => clearInterval(id);
  }, [round.attempt, running, read]);

  const remainingMs = useCallback(() => COUNTDOWN_MS + secondsRef.current * 1000 - (performance.now() - started.current.at), []);
  return { ...now, remainingMs };
}

/* ---------- Vòng phạt khi hết giờ (chơi lần lượt) ---------- */

const R = 140;
const SPIN_MS = 3200;
const tones = [
  { fill: 'var(--accent)', text: 'var(--on-accent)' },
  { fill: keyColors.yellow.fill, text: keyColors.yellow.text },
  { fill: keyColors.blue.fill, text: keyColors.blue.text },
];
const point = (deg: number) => {
  const a = (deg * Math.PI) / 180;
  return `${(R * Math.sin(a)).toFixed(2)} ${(-R * Math.cos(a)).toFixed(2)}`;
};
function targetFor(prev: number, spin: Spin, slice: number) {
  const center = spin.slice * slice + slice / 2 + spin.offset;
  const want = (((360 - center) % 360) + 360) % 360;
  return prev + spin.turns * 360 + ((((want - (prev % 360)) % 360) + 360) % 360);
}

function SpinWheel({ party, spin, onRevealed }: { party: FindParty; spin: Spin | null; onRevealed: (id: number) => void }) {
  const slices = strings.penalties;
  const slice = 360 / slices.length;
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  // Mở ra lần nào cũng đứng yên; chỉ quay khi có lần quay mới.
  const run = useRef({ id: spin?.id ?? 0, to: 0 });
  const spinRef = useRef(spin);
  spinRef.current = spin;
  const sfxRef = useRef(party.sfx);
  sfxRef.current = party.sfx;
  const spinId = spin?.id ?? 0;

  useEffect(() => {
    const sp = spinRef.current;
    if (!sp || sp.id === run.current.id) return;
    const ms = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 600 : SPIN_MS;
    const from = run.current.to;
    const to = targetFor(from, sp, slice);
    run.current = { id: sp.id, to };
    setRotation(to);
    setSpinning(true);
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let k = 1; k * slice < to - from && k < 60; k++) {
      timers.push(setTimeout(() => sfxRef.current('tick'), (1 - Math.cbrt(1 - (k * slice) / (to - from))) * ms));
    }
    timers.push(
      setTimeout(() => {
        setSpinning(false);
        onRevealed(sp.id);
      }, ms + 80),
    );
    return () => timers.forEach(clearTimeout);
  }, [spinId, onRevealed, slice]);

  const canSpin = party.myTurn && !party.state!.result && !spinning;
  return (
    <>
      <div className={s.wheelBox}>
        <span className={s.pointer} aria-hidden="true" />
        <svg
          viewBox="-150 -150 300 300"
          className={s.wheel}
          style={{ '--rot': `${rotation}deg`, '--spin-ms': `${SPIN_MS}ms` } as CSSProperties}
          aria-hidden="true"
        >
          {slices.map((b, i) => {
            // Ô được miễn tô đen, khác hẳn các ô phạt.
            const tone = 'safe' in b && b.safe ? { fill: 'var(--ink)', text: 'var(--bg)' } : tones[i % tones.length];
            const center = i * slice + slice / 2;
            const flip = center > 180;
            return (
              <g key={i}>
                <path d={`M0 0 L${point(i * slice)} A${R} ${R} 0 0 1 ${point((i + 1) * slice)} Z`} style={{ fill: tone.fill }} />
                <text
                  x={flip ? -R * 0.58 : R * 0.58}
                  y={0}
                  transform={`rotate(${flip ? center + 90 : center - 90})`}
                  className={s.wheelLabel}
                  style={{ fill: tone.text }}
                >
                  {b.short}
                </text>
              </g>
            );
          })}
          <circle r={R} className={s.rim} />
          <circle r={20} className={s.hub} />
        </svg>
      </div>
      <Button variant="primary" block disabled={!canSpin} onClick={() => party.dispatch({ type: 'spin' })}>
        {spinning ? strings.spinning : party.myTurn ? strings.spin : strings.waitSpin(party.current?.name ?? '')}
      </Button>
    </>
  );
}

/* ---------- Xáo số: bôi hết số cũ rồi viết lại bàn mới ---------- */

/** Thời gian bôi bàn cũ và viết bàn mới. */
const ERASE_MS = 900;
const WRITE_MS = 1100;

interface Rewrite {
  id: number;
  /** Bàn cũ đang bị bôi; null khi mới mở game (chỉ viết). */
  old: Dot[] | null;
}

/** Mỗi lần bàn số đổi (xáo, hết vòng, đổi số lượng): chạy hiệu ứng trên mọi máy. */
function useRewrite(dots: Dot[], shuffles: number, sfx: (tone: 'tick' | 'tap') => void) {
  // Ghi lại bàn cũ ngay khi thấy id mới (so theo id nên render hai lần vẫn đúng).
  const board = useRef<{ id: number; dots: Dot[] } | null>(null);
  const pending = useRef<Rewrite | null>(null);
  if (board.current?.id !== shuffles) {
    pending.current = { id: shuffles, old: board.current?.dots ?? null };
    board.current = { id: shuffles, dots };
  }
  const [anim, setAnim] = useState<Rewrite | null>(null);
  const sfxRef = useRef(sfx);
  sfxRef.current = sfx;

  useLayoutEffect(() => {
    const next = pending.current;
    if (!next || next.id !== shuffles) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const erase = next.old ? ERASE_MS : 0;
    setAnim(next);
    const timers: ReturnType<typeof setTimeout>[] = [];
    // Sột soạt khi gạch, lách cách khi viết.
    if (next.old) for (let k = 0; k < 6; k++) timers.push(setTimeout(() => sfxRef.current('tick'), k * 90));
    for (let k = 0; k < 8; k++) timers.push(setTimeout(() => sfxRef.current('tap'), erase + 120 + k * 120));
    timers.push(
      setTimeout(() => {
        pending.current = null;
        setAnim(null);
      }, erase + WRITE_MS + 200),
    );
    return () => {
      timers.forEach(clearTimeout);
      setAnim(null);
    };
  }, [shuffles]);

  return anim;
}

/** Thứ tự viết: từ trên xuống, trái sang phải, như viết tay lên giấy. */
function writeOrder(dots: Dot[]) {
  const sorted = [...dots].sort((a, b) => a.y - b.y || a.x - b.x);
  return new Map(sorted.map((d, i) => [d.n, i]));
}

/** Hiển thị riêng của máy này (xem look.ts). */
const LookContext = createContext<{ look: Look; update: (patch: Partial<Look>) => void } | null>(null);
const useLookContext = () => useContext(LookContext)!;

const dotStyle = (d: Dot, look: Look, extra?: Record<string, string | number | undefined>) =>
  ({
    left: `${d.x}%`,
    top: `${d.y}%`,
    '--rot': `${look.tilt ? d.rot : 0}deg`,
    '--k': d.size,
    '--tint': look.color === 'multi' ? TINTS[d.tint] : lookColor[look.color],
    ...extra,
  }) as CSSProperties;

const boardStyle = (size: number, look: Look) => {
  const { cols, rows } = gridOf(size);
  return {
    '--rows': rows,
    '--cell-w': `${74 / cols}%`,
    '--cell-h': `${80 / rows}%`,
    '--fs': `${(38 / cols) * lookScale[look.scale]}cqw`,
    '--dot-font': lookFont[look.font],
  } as CSSProperties;
};

/** Bàn số xem trước ở màn chờ: không bấm được, chạy hiệu ứng bôi rồi viết lại. */
function PreviewBoard({ dots, anim }: { dots: Dot[]; anim: Rewrite | null }) {
  const { look } = useLookContext();
  const order = writeOrder(dots);
  const oldOrder = anim?.old ? writeOrder(anim.old) : null;
  const erase = anim?.old ? ERASE_MS : 0;
  const n = dots.length || 1;
  return (
    <div className={cx(s.board, s.preview)} style={boardStyle(dots.length, look)} aria-hidden="true">
      {anim?.old?.map((d) => (
        <span
          key={`old-${anim.id}-${d.n}`}
          className={cx(s.dot, s.erasing)}
          style={dotStyle(d, look, { '--d': `${Math.round((oldOrder!.get(d.n)! / (anim.old!.length || 1)) * 420)}ms`, '--fade': `${ERASE_MS - 260}ms` })}
        >
          {d.n}
          <svg className={s.scribble} viewBox="0 0 100 40" preserveAspectRatio="none">
            <path pathLength={100} d="M2 30 L13 9 L23 33 L35 6 L47 34 L59 7 L71 33 L83 9 L97 27" />
          </svg>
        </span>
      ))}
      {dots.map((d) => (
        <span
          key={`${anim?.id ?? 'x'}-${d.n}`}
          className={cx(s.dot, anim && s.writing)}
          style={dotStyle(d, look, anim ? { '--w': `${Math.round(erase + (order.get(d.n)! / n) * (WRITE_MS - 380))}ms` } : undefined)}
        >
          {d.n}
        </span>
      ))}
    </div>
  );
}

function RoundView({ party, round }: { party: FindParty; round: Round }) {
  const state = party.state!;
  const { look } = useLookContext();
  const { dispatch, isHost } = party;
  const race = state.play === 'race';
  const secs = race ? state.seconds : state.turnSeconds;
  // Đồng hồ dừng khi có kết quả, hoặc khi hết giờ và đang chờ quay phạt.
  const done = !!state.result || round.phase !== 'find';
  const { counting, count, left, remainingMs } = useRoundClock(round, secs, !done);
  const target = targetOf(round);
  const inGame = party.players.some((p) => p.id === party.me) || party.mode === 'local';
  const canTap = !done && !counting && inGame && (race || party.myTurn);
  const ringOf = (id: string) => RINGS[Math.max(0, party.players.findIndex((p) => p.id === id)) % RINGS.length];

  const sfxRef = useRef(party.sfx);
  sfxRef.current = party.sfx;

  // Máy giữ luật báo hết giờ.
  useEffect(() => {
    if (!isHost || done) return;
    const id = setTimeout(() => dispatch({ type: 'timeout', attempt: round.attempt }), Math.max(0, remainingMs()));
    return () => clearTimeout(id);
  }, [isHost, done, round.attempt, dispatch, remainingMs]);

  // Tiếng đếm 3-2-1 và 5 giây cuối.
  const beat = counting ? count : !done && left <= 5 && left > 0 ? left : 0;
  useEffect(() => {
    if (beat) sfxRef.current('tick');
  }, [beat]);

  // Chạm nhầm: rung, số đỏ lên, khóa tay một nhịp.
  const [wrong, setWrong] = useState<{ n: number; at: number } | null>(null);
  const locked = !!wrong;
  useEffect(() => {
    if (!wrong) return;
    const id = setTimeout(() => setWrong(null), 700);
    return () => clearTimeout(id);
  }, [wrong]);

  const tap = (d: Dot) => {
    if (!canTap || locked || round.found[d.n]) return;
    if (d.n === target) {
      sfxRef.current('tap');
      dispatch({ type: 'find', round: round.id, n: d.n });
    } else {
      sfxRef.current('buzz');
      vibrate(80);
      setWrong({ n: d.n, at: performance.now() });
    }
  };

  // Dừng một nhịp để cả phòng thấy vòng khoanh cuối trước khi hiện thẻ kết quả.
  // Kết quả qua vòng phạt thì chờ vòng quay dừng.
  const resultSeq = state.result?.seq;
  const resultSafe = !!state.result?.safe;
  const viaWheel = round.phase === 'spin';
  const spinId = round.spin?.id ?? 0;
  const [shownSeq, setShownSeq] = useState<number>();
  const [revealedSpin, setRevealedSpin] = useState(spinId);
  useEffect(() => {
    if (!resultSeq || viaWheel) return;
    sfxRef.current(resultSafe ? 'win' : 'buzz');
    const id = setTimeout(() => setShownSeq(resultSeq), 700);
    return () => clearTimeout(id);
  }, [resultSeq, viaWheel, resultSafe]);
  const onRevealed = useRef((id: number) => {
    setRevealedSpin(id);
    vibrate(120);
  }).current;
  const wheelDone = viaWheel && !!resultSeq && revealedSpin === spinId;
  useEffect(() => {
    if (wheelDone) sfxRef.current(resultSafe ? 'win' : 'buzz');
  }, [wheelDone, resultSafe]);
  const showResult = !!resultSeq && (viaWheel ? revealedSpin === spinId : shownSeq === resultSeq);

  const counts = countsOf(round);
  const foundCount = round.at;
  const total = round.targets.length;
  const urgent = !counting && !done && left <= Math.min(10, Math.ceil(secs / 3));

  return (
    <div className={s.game}>
      <div className={s.bar}>
        <div className={s.targetBox} aria-live="polite" aria-label={target ? strings.target(target) : undefined}>
          <small>{strings.find}</small>
          <strong key={target} className={s.target}>{counting ? '?' : (target ?? '✓')}</strong>
        </div>
        <div className={cx(s.clock, urgent && s.urgent)} role="timer" aria-label={strings.timeLeft(counting ? secs : left)}>
          {clock(counting ? secs : left)}
        </div>
        <div className={s.progress} aria-label={strings.progressLabel(foundCount, total)}>
          {strings.progress(foundCount, total)}
        </div>
      </div>

      <div
        className={cx(s.board, counting && s.hidden, locked && s.locked)}
        style={boardStyle(state.dots.length, look)}
      >
        {state.dots.map((d) => {
          const by = round.found[d.n];
          return (
            <button
              key={d.n}
              type="button"
              className={cx(s.dot, by && s.found, wrong?.n === d.n && s.wrong)}
              style={dotStyle(d, look, { '--ring': by ? ringOf(by) : undefined })}
              tabIndex={counting ? -1 : undefined}
              aria-label={by ? strings.dotFound(d.n, party.nameOf(by)) : strings.dot(d.n)}
              onClick={() => tap(d)}
            >
              {d.n}
            </button>
          );
        })}
        {counting && (
          <div className={s.countdown} aria-live="assertive">
            <span key={count}>{count}</span>
          </div>
        )}
      </div>

      <ul className={s.legend}>
        {party.players.map((p) => (
          <li key={p.id} className={cx(s.legendItem, !race && p.id === party.current?.id && s.legendTurn)} style={{ '--ring': ringOf(p.id) } as CSSProperties}>
            <i aria-hidden="true" />
            <span className={s.legendName}>{p.name}</span>
            <strong>{counts[p.id] ?? 0}</strong>
          </li>
        ))}
      </ul>

      {viaWheel && (
        <div className={s.sheet} role="dialog" aria-label={strings.missTitle}>
          <h2 className={s.panelTitle}>{strings.missTitle}</h2>
          <p className={s.panelHint}>{strings.missHint}</p>
          <SpinWheel key={round.attempt} party={party} spin={round.spin} onRevealed={onRevealed} />
        </div>
      )}

      <ResultCard party={party} show={showResult} actionLabel={race || isBoardDone(round) ? strings.again : undefined} />
    </div>
  );
}

/** Ô nhập số tùy ý; áp dụng khi rời ô hoặc bấm Enter, số ngoài khoảng bị kéo về giới hạn gần nhất. */
function NumberInput({ value, min, max, label, hint, onCommit }: { value: number; min: number; max: number; label: string; hint: string; onCommit: (n: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const n = Number.parseInt(draft, 10);
    if (Number.isNaN(n)) return setDraft(String(value));
    const clamped = Math.min(max, Math.max(min, n));
    setDraft(String(clamped));
    if (clamped !== value) onCommit(clamped);
  };
  return (
    <label className={s.custom}>
      <span className={s.customLabel}>{label}</span>
      <TextInput
        className={s.customInput}
        value={draft}
        inputMode="numeric"
        enterKeyHint="done"
        maxLength={3}
        onChange={(e) => setDraft(e.target.value.replace(/\D/g, ''))}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      />
      <span className={s.customHint}>{hint}</span>
    </label>
  );
}

function SettingsSheet({ party, open, onClose }: { party: FindParty; open: boolean; onClose: () => void }) {
  const state = party.state!;
  const config = (c: Config) => party.dispatch({ type: 'config', config: c });
  const race = state.play === 'race';
  return (
    <Sheet open={open} title={strings.settingsTitle} closeLabel={strings.settingsDone} onClose={onClose}>
      <div className={s.settings}>
        <Chips label={strings.orderLabel} options={orderOptions} value={state.order} onChange={(order) => config({ order })} />
        {party.mode === 'online' && <Chips label={strings.playLabel} options={playOptions} value={state.play} onChange={(play) => config({ play })} />}

        <section className={s.group}>
          <Chips label={strings.sizeLabel} options={sizeOptions} value={String(state.size)} onChange={(v) => config({ size: Number(v) })} />
          <NumberInput
            value={state.size}
            {...LIMITS.size}
            label={strings.custom}
            hint={strings.sizeRange(LIMITS.size.min, LIMITS.size.max)}
            onCommit={(size) => config({ size })}
          />
        </section>

        {race ? (
          <section className={s.group}>
            <Chips label={strings.secondsLabel} options={secondOptions} value={String(state.seconds)} onChange={(v) => config({ seconds: Number(v) })} />
            <NumberInput
              value={state.seconds}
              {...LIMITS.seconds}
              label={strings.custom}
              hint={strings.secondsRange(LIMITS.seconds.min, LIMITS.seconds.max)}
              onCommit={(seconds) => config({ seconds })}
            />
          </section>
        ) : (
          <>
            <section className={s.group}>
              <Chips
                label={strings.turnSecondsLabel}
                options={turnSecondOptions}
                value={String(state.turnSeconds)}
                onChange={(v) => config({ turnSeconds: Number(v) })}
              />
              <NumberInput
                value={state.turnSeconds}
                {...LIMITS.turnSeconds}
                label={strings.custom}
                hint={strings.secondsRange(LIMITS.turnSeconds.min, LIMITS.turnSeconds.max)}
                onCommit={(turnSeconds) => config({ turnSeconds })}
              />
            </section>
            <Chips
              label={strings.penaltyLabel}
              options={penaltyOptions}
              value={state.penalty ? 'on' : 'off'}
              onChange={(v) => config({ penalty: v === 'on' })}
            />
          </>
        )}

        <Button variant="primary" block onClick={onClose}>{strings.settingsDone}</Button>
      </div>
    </Sheet>
  );
}

function LookSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { look, update } = useLookContext();
  const opts = <K extends string>(labels: Record<K, string>) => (Object.keys(labels) as K[]).map((v) => ({ value: v, label: labels[v] }));
  return (
    <Sheet open={open} title={strings.lookTitle} closeLabel={strings.settingsDone} onClose={onClose}>
      <div className={s.settings}>
        <p className={s.summaryHint}>{strings.lookHint}</p>
        <Chips label={strings.lookColor} options={opts(strings.lookColors)} value={look.color} onChange={(color) => update({ color })} />
        <Chips label={strings.lookFont} options={opts(strings.lookFonts)} value={look.font} onChange={(font) => update({ font })} />
        <Chips label={strings.lookScale} options={opts(strings.lookScales)} value={look.scale} onChange={(scale) => update({ scale })} />
        <Chips label={strings.lookTilt} options={opts(strings.lookTilts)} value={look.tilt ? 'on' : 'off'} onChange={(v) => update({ tilt: v === 'on' })} />
        <Button variant="primary" block onClick={onClose}>{strings.settingsDone}</Button>
      </div>
    </Sheet>
  );
}

function Setup({ party, anim }: { party: FindParty; anim: Rewrite | null }) {
  const state = party.state!;
  const { dispatch } = party;
  const race = state.play === 'race';
  const host = party.isHost;
  const busy = !!anim;
  const canStart = (race ? host : party.myTurn) && !busy;
  const inGame = party.mode === 'local' || party.players.some((p) => p.id === party.me);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lookOpen, setLookOpen] = useState(false);

  const summary = [
    { label: strings.orderLabel, value: strings.orders[state.order] },
    { label: strings.sizeLabel, value: strings.size(state.size) },
    race
      ? { label: strings.secondsLabel, value: strings.seconds(state.seconds) }
      : { label: strings.turnSecondsLabel, value: strings.seconds(state.turnSeconds) },
    ...(race ? [] : [{ label: strings.penaltyLabel, value: strings.penaltyOptions[state.penalty ? 'on' : 'off'] }]),
    ...(party.mode === 'online' ? [{ label: strings.playLabel, value: strings.plays[state.play] }] : []),
  ];

  return (
    <div className={s.setup}>
      <p className={s.idleText}>{race ? strings.readyRace : strings.readyTurn(party.current?.name ?? '', state.turnSeconds, state.penalty)}</p>

      <section className={s.previewBox} aria-label={strings.preview}>
        <div className={s.previewHead}>
          <span className={s.previewTitle} aria-live="polite">{busy ? strings.shuffling : strings.preview}</span>
          <div className={s.previewActions}>
            <button className={cx(s.shuffleButton, s.ghostButton)} onClick={() => setLookOpen(true)}>
              <Icon name="eye" size={18} /> {strings.look}
            </button>
            {inGame && (
              <button className={s.shuffleButton} disabled={busy} onClick={() => dispatch({ type: 'shuffle' })}>
                <Icon name="shuffle" size={18} /> {strings.shuffle}
              </button>
            )}
          </div>
        </div>
        <PreviewBoard dots={state.dots} anim={anim} />
      </section>

      <section className={cx(partyStyles.card, s.summary)} aria-label={strings.settings}>
        <dl className={s.summaryList}>
          {summary.map((row) => (
            <div key={row.label} className={s.summaryRow}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
        {host ? (
          <Button block onClick={() => setSettingsOpen(true)}>
            <Icon name="sliders" /> {strings.settings}
          </Button>
        ) : (
          <p className={s.summaryHint}>{strings.hostSets}</p>
        )}
      </section>

      {(race ? host : party.myTurn) ? (
        <Button variant="primary" block className={s.cta} disabled={!canStart} onClick={() => dispatch({ type: 'start' })}>
          {strings.start}
        </Button>
      ) : (
        <p className={s.wait}>{race ? strings.waitStart : strings.waitTurn(party.current?.name ?? '')}</p>
      )}
      <Scoreboard party={party} />
      {host && <SettingsSheet party={party} open={settingsOpen} onClose={() => setSettingsOpen(false)} />}
      <LookSheet open={lookOpen} onClose={() => setLookOpen(false)} />
    </div>
  );
}

function Scoreboard({ party }: { party: FindParty }) {
  const { scores, wins, play } = party.state!;
  const rows = party.players.map((p) => ({ p, n: scores[p.id] ?? 0, w: wins[p.id] ?? 0 })).sort((a, b) => b.w - a.w || b.n - a.n);
  if (!rows.some((r) => r.n > 0)) return null;
  return (
    <section className={s.scores} aria-label={strings.scoreboard}>
      <h3 className={s.scoresTitle}>{strings.scoreboard}</h3>
      <ol className={s.scoreList}>
        {rows.map(({ p, n, w }, i) => (
          <li key={p.id} className={cx(s.scoreRow, i === 0 && s.leader)}>
            <span className={s.rank}>{i + 1}</span>
            <span className={s.scoreName}>{p.name}</span>
            {play === 'race' && w > 0 && <span className={s.winTag}>{strings.wins(w)}</span>}
            <span className={s.points}>{strings.points(n)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function FindGame({ party }: { party: FindParty }) {
  const state = party.state!;
  const { dispatch, mode } = party;
  // Chơi 1 máy thì không thể tìm cùng lúc: chuyền tay nhau từng lượt.
  const wantPlay = mode === 'local' ? 'turns' : null;
  useEffect(() => {
    if (wantPlay && state.play !== wantPlay && !state.round) dispatch({ type: 'config', config: { play: wantPlay } });
  }, [wantPlay, state.play, state.round, dispatch]);

  // Hiệu ứng viết lại sống ở đây để còn nhớ bàn cũ khi từ vòng chơi quay về màn chờ.
  const sfxRef = useRef(party.sfx);
  sfxRef.current = party.sfx;
  const anim = useRewrite(state.dots, state.shuffles, (tone) => sfxRef.current(tone));

  return state.round ? <RoundView party={party} round={state.round} /> : <Setup party={party} anim={anim} />;
}

export default function TimSo({ ctx }: MiniAppProps<PartyData>) {
  const party = useParty(findGame, ctx);
  const [look, update] = useLook();
  return (
    <LookContext.Provider value={{ look, update }}>
      <PartyShell party={party} together={party.state?.play === 'race'} info={{ title: strings.title, rule: strings.rule, art: <FindArt /> }}>
        {party.state && <FindGame party={party} />}
      </PartyShell>
    </LookContext.Provider>
  );
}
