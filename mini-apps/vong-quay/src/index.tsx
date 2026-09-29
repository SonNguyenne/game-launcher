import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { MiniAppProps } from '@bang/sdk';
import { PartyShell, ResultCard, useParty, vibrate, type Party, type PartyData } from '@bang/party';
import { Button, keyColors } from '@bang/ui';
import { wheelGame, wheelOf, type Spin, type WheelAction, type WheelState } from './game';
import { WheelSettings } from './Settings';
import { strings, type Slice } from './strings';
import s from './Wheel.module.css';
import iconSvg from '../icon.svg?raw';

/** Mọi vòng đều 8 ô. */
const SLICE = 360 / 8;
const R = 140;
const SPIN_MS = 4200;
const REDUCED_SPIN_MS = 700;

/** Bốn cặp nền/chữ xen kẽ, hai ô cạnh nhau không trùng màu. Kiểu quán đổi sang màu sơn theo data-tone. */
const tones = [
  { fill: 'var(--accent)', text: 'var(--on-accent)' },
  { fill: keyColors.yellow.fill, text: keyColors.yellow.text },
  { fill: keyColors.blue.fill, text: keyColors.blue.text },
  { fill: 'var(--ink)', text: 'var(--bg)' },
];

const point = (deg: number, r = R) => {
  const a = (deg * Math.PI) / 180;
  return `${(r * Math.sin(a)).toFixed(2)} ${(-r * Math.cos(a)).toFixed(2)}`;
};

function WheelFace({ slices }: { slices: readonly Slice[] }) {
  return (
    <svg viewBox="-150 -150 300 300" className={s.face} aria-hidden="true">
      {slices.map((item, i) => {
        const tone = tones[i % tones.length];
        const center = i * SLICE + SLICE / 2;
        // Nửa bên trái xoay ngược 180° để chữ không bị lộn đầu.
        const flip = center > 180;
        return (
          <g key={i} className={s.slice} data-tone={i % tones.length} style={{ '--tone-fill': tone.fill, '--tone-text': tone.text } as CSSProperties}>
            <path d={`M0 0 L${point(i * SLICE)} A${R} ${R} 0 0 1 ${point((i + 1) * SLICE)} Z`} />
            <text x={flip ? -R * 0.6 : R * 0.6} y={0} transform={`rotate(${flip ? center + 90 : center - 90})`} className={s.label}>
              {item.short}
            </text>
          </g>
        );
      })}
      <circle r={R} className={s.rim} />
      {slices.map((_, i) => {
        const [x, y] = point(i * SLICE).split(' ');
        return <circle key={i} cx={x} cy={y} r={3.2} className={s.rivet} />;
      })}
      <circle r={22} className={s.hub} />
    </svg>
  );
}

/** Góc quay mới, luôn lớn hơn góc cũ, để ô được chọn dừng đúng dưới kim ở đỉnh. */
function targetFor(prev: number, spin: Spin) {
  const center = spin.slice * SLICE + SLICE / 2 + spin.offset;
  const want = (((360 - center) % 360) + 360) % 360;
  const delta = (((want - (prev % 360)) % 360) + 360) % 360;
  return prev + spin.turns * 360 + delta;
}

const prefersReduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

function WheelGame({ party }: { party: Party<WheelState, WheelAction> }) {
  const spin = party.state?.spin ?? null;
  const [rotation, setRotation] = useState(() => (spin ? targetFor(0, spin) : 0));
  const [revealed, setRevealed] = useState(spin?.id ?? 0);
  const [duration, setDuration] = useState(SPIN_MS);
  // Khách nhận trạng thái qua mạng là object mới mỗi lần, nên hiệu ứng bám theo id lần quay.
  const spinRef = useRef(spin);
  spinRef.current = spin;
  const sfxRef = useRef(party.sfx);
  sfxRef.current = party.sfx;
  const run = useRef({ id: spin?.id ?? 0, from: 0, to: rotation, ms: SPIN_MS, startedAt: 0 });
  const spinId = spin?.id ?? 0;
  // Lẫy kim bật lại mỗi lần qua một vạch.
  const pointerRef = useRef<HTMLSpanElement>(null);
  const flap = () => {
    const el = pointerRef.current;
    if (!el) return;
    el.classList.remove(s.flap);
    void el.offsetWidth;
    el.classList.add(s.flap);
  };
  const flapRef = useRef(flap);
  flapRef.current = flap;

  useEffect(() => {
    const spin = spinRef.current;
    if (!spin || spin.id === revealed) return;
    const r = run.current;
    if (r.id !== spin.id) {
      const ms = prefersReduced() ? REDUCED_SPIN_MS : SPIN_MS;
      run.current = { id: spin.id, from: r.to, to: targetFor(r.to, spin), ms, startedAt: performance.now() };
      setDuration(ms);
      setRotation(run.current.to);
    }
    // Hẹn giờ tính từ lúc bắt đầu quay, nên chạy lại hiệu ứng (StrictMode) không làm lệch.
    const { from, to, ms, startedAt } = run.current;
    const elapsed = performance.now() - startedAt;
    const timers: ReturnType<typeof setTimeout>[] = [];
    // Tiếng tách mỗi lần kim qua một vạch, thưa dần theo đường cong giảm tốc (ease-out cubic).
    for (let k = 1; k * SLICE < to - from && k < 80; k++) {
      const at = (1 - Math.cbrt(1 - (k * SLICE) / (to - from))) * ms - elapsed;
      if (at > 0)
        timers.push(
          setTimeout(() => {
            sfxRef.current('tick');
            flapRef.current();
          }, at),
        );
    }
    timers.push(setTimeout(() => setRevealed(spin.id), Math.max(0, ms + 80 - elapsed)));
    return () => timers.forEach(clearTimeout);
  }, [spinId, revealed]);

  const spinning = !!spin && revealed !== spin.id;
  const result = party.state?.result;

  const resultSeq = result?.seq;
  const resultSafe = result?.safe;
  useEffect(() => {
    if (spinning || !resultSeq) return;
    sfxRef.current(resultSafe ? 'win' : 'buzz');
    vibrate(120);
    // Chỉ kêu một lần mỗi kết quả.
  }, [spinning, resultSeq, resultSafe]);

  const state = party.state!;
  const slices = wheelOf(state.level, state.customWheels);
  const again = !!spin && slices[spin.slice]?.kind === 'again';
  // Lúc đang quay chưa hiện kết quả mới nhất, để không lộ trước.
  const history = spinning ? state.history.slice(1) : state.history;
  const canSpin = party.myTurn && !spinning && !result;
  const go = () => canSpin && party.dispatch({ type: 'spin' });
  const label = spinning ? strings.spinning : party.myTurn ? strings.spin : strings.wait(party.current?.name ?? '');

  return (
    <div className={s.game}>
      <div className={s.wheelBox}>
        <span ref={pointerRef} className={s.pointer} aria-hidden="true">
          <svg viewBox="0 0 32 40">
            <path d="M3 3 H29 L16 37 Z" />
            <circle cx="16" cy="12" r="4" />
          </svg>
        </span>
        <button
          className={s.wheel}
          style={{ '--rot': `${rotation}deg`, '--spin-ms': `${duration}ms` } as CSSProperties}
          onClick={go}
          disabled={!canSpin}
          aria-label={strings.spin}
        >
          <WheelFace slices={slices} />
        </button>
      </div>
      <Button variant="primary" block className={s.spin} onClick={go} disabled={!canSpin}>
        {label}
      </Button>
      {history.length > 0 && (
        <p className={s.history}>
          <span>{strings.history}</span>
          {history.map((h, i) => (
            <span key={i} className={s.historyItem}>
              {party.nameOf(h.playerId)}: {h.short}
            </span>
          ))}
        </p>
      )}
      <ResultCard party={party} show={!spinning} actionLabel={again ? strings.spinAgain : undefined} />
    </div>
  );
}

export default function VongQuay({ ctx }: MiniAppProps<PartyData>) {
  const party = useParty(wheelGame, ctx);
  return (
    <PartyShell party={party} info={{
        title: strings.title,
        rule: strings.rule,
        art: <span dangerouslySetInnerHTML={{ __html: iconSvg }} />,
        settings: (p) => <WheelSettings {...p} />,
      }}>
      {party.state && <WheelGame party={party} />}
    </PartyShell>
  );
}
