import { createContext, useContext, type CSSProperties } from 'react';
import { accentColors, cx, palette } from '@bang/ui';
import { gridOf, type Dot } from './game';
import { lookColor, lookFont, lookScale, type Look } from './look';
import { ERASE_MS, WRITE_MS, writeOrder, type Rewrite } from './rewrite';
import s from './Find.module.css';

/** Màu chữ của các con số, như bút nhiều màu trên giấy. Đủ TINT_COUNT màu. */
export const TINTS = ['var(--ink)', accentColors.orange.fill, accentColors.green.fill, palette.blue, accentColors.violet.fill, accentColors.pink.fill, accentColors.teal.fill];
/** Màu vòng khoanh của từng người chơi, theo thứ tự trong phòng. */
export const RINGS = [accentColors.orange.fill, palette.blue, accentColors.green.fill, accentColors.violet.fill, accentColors.pink.fill, accentColors.teal.fill];

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

/** Hiển thị riêng của máy này (xem look.ts). */
export const LookContext = createContext<{ look: Look; update: (patch: Partial<Look>) => void } | null>(null);
export const useLookContext = () => useContext(LookContext)!;

export const dotStyle = (d: Dot, look: Look, extra?: Record<string, string | number | undefined>) =>
  ({
    left: `${d.x}%`,
    top: `${d.y}%`,
    '--rot': `${look.tilt ? d.rot : 0}deg`,
    '--k': d.size,
    '--tint': look.color === 'multi' ? TINTS[d.tint] : lookColor[look.color],
    ...extra,
  }) as CSSProperties;

export const boardStyle = (size: number, look: Look) => {
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
export function PreviewBoard({ dots, anim }: { dots: Dot[]; anim: Rewrite | null }) {
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
