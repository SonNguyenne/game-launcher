import { useLayoutEffect, useRef, useState } from 'react';
import type { Dot } from './game';

/* ---------- Xáo số: bôi hết số cũ rồi viết lại bàn mới ---------- */

/** Thời gian bôi bàn cũ và viết bàn mới. */
export const ERASE_MS = 900;
export const WRITE_MS = 1100;

export interface Rewrite {
  id: number;
  /** Bàn cũ đang bị bôi; null khi mới mở game (chỉ viết). */
  old: Dot[] | null;
}

/** Mỗi lần bàn số đổi (xáo, hết vòng, đổi số lượng): chạy hiệu ứng trên mọi máy. */
export function useRewrite(dots: Dot[], shuffles: number, sfx: (tone: 'tick' | 'tap') => void) {
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
export function writeOrder(dots: Dot[]) {
  const sorted = [...dots].sort((a, b) => a.y - b.y || a.x - b.x);
  return new Map(sorted.map((d, i) => [d.n, i]));
}
