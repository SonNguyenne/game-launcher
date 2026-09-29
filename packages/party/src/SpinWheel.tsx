import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Button } from '@bang/ui';
import type { Tone } from './sound';
import { partyStrings as t } from './strings';
import s from './SpinWheel.module.css';

/** Một lần quay do reducer tạo: trúng ô nào, quay bao nhiêu vòng, lệch khỏi tâm ô bao nhiêu độ. */
export interface WheelSpin {
  id: number;
  slice: number;
  turns: number;
  offset: number;
}

export interface WheelSlice {
  short: string;
  /** Ô "thoát" được tô đen, khác hẳn các ô phạt. */
  safe?: boolean;
}

interface SpinWheelProps {
  party: {
    myTurn: boolean;
    state: { result: unknown } | null;
    current?: { name: string };
    sfx: (tone: Tone) => void;
  };
  spin: WheelSpin | null;
  slices: readonly WheelSlice[];
  onSpin: () => void;
  /** Gọi khi vòng dừng hẳn, để game hiện thẻ kết quả đúng lúc. */
  onRevealed: (id: number) => void;
}

const R = 140;
const SPIN_MS = 3200;
/** Màu ô lấy từ biến CSS của vòng (SpinWheel.module.css) để mỗi kiểu hiển thị tự tô. */
const tones = [
  { fill: 'var(--wheel-a)', text: 'var(--wheel-a-ink)' },
  { fill: 'var(--paint-yellow)', text: 'var(--paint-ink)' },
  { fill: 'var(--paint-blue)', text: 'var(--paint-paper)' },
];
const safeTone = { fill: 'var(--wheel-safe)', text: 'var(--wheel-safe-ink)' };

const point = (deg: number) => {
  const a = (deg * Math.PI) / 180;
  return `${(R * Math.sin(a)).toFixed(2)} ${(-R * Math.cos(a)).toFixed(2)}`;
};

/** Góc cần quay tới để kim chỉ vào đúng ô, luôn quay thêm `turns` vòng theo chiều kim đồng hồ. */
export function wheelTarget(prev: number, spin: WheelSpin, slice: number) {
  const center = spin.slice * slice + slice / 2 + spin.offset;
  const want = (((360 - center) % 360) + 360) % 360;
  return prev + spin.turns * 360 + ((((want - (prev % 360)) % 360) + 360) % 360);
}

/** Vòng phạt dùng chung cho các game: quay theo `spin` do chủ phòng tạo nên máy nào cũng dừng cùng ô. */
export function SpinWheel({ party, spin, slices, onSpin, onRevealed }: SpinWheelProps) {
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
    const to = wheelTarget(from, sp, slice);
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

  const canSpin = party.myTurn && !party.state?.result && !spinning;
  return (
    <>
      <div className={s.box}>
        <span className={s.pointer} aria-hidden="true" />
        <svg
          viewBox="-150 -150 300 300"
          className={s.wheel}
          style={{ '--rot': `${rotation}deg`, '--spin-ms': `${SPIN_MS}ms` } as CSSProperties}
          aria-hidden="true"
        >
          {slices.map((b, i) => {
            const tone = b.safe ? safeTone : tones[i % tones.length];
            const center = i * slice + slice / 2;
            const flip = center > 180;
            return (
              <g key={i}>
                <path d={`M0 0 L${point(i * slice)} A${R} ${R} 0 0 1 ${point((i + 1) * slice)} Z`} style={{ fill: tone.fill }} />
                <text
                  x={flip ? -R * 0.58 : R * 0.58}
                  y={0}
                  transform={`rotate(${flip ? center + 90 : center - 90})`}
                  className={s.label}
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
      <Button variant="primary" block disabled={!canSpin} onClick={onSpin}>
        {spinning ? t.spinning : party.myTurn ? t.spin : t.waitSpin(party.current?.name ?? '')}
      </Button>
    </>
  );
}
