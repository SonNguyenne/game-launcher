import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

/**
 * Hiệu ứng xáo ba nhịp, giống xáo bài thật:
 * gom các lá úp thành xấp giữa bàn, tách đôi rồi xáo kiểu riffle, cuối cùng chia từng lá bay vòng cung về chỗ.
 */
const SHUFFLE_MS = 2200;

export function useShuffleAnimation(board: RefObject<HTMLDivElement | null>, shuffles: number, fresh: boolean, sfx: (tone: 'tick' | 'tap') => void) {
  // Vào giữa ván thì không chạy lại; ván mới (chưa ai lật) thì xáo ngay khi mở.
  const played = useRef(fresh ? 0 : shuffles);
  const [busy, setBusy] = useState(false);
  const sfxRef = useRef(sfx);
  sfxRef.current = sfx;

  useLayoutEffect(() => {
    const el = board.current;
    if (!el || played.current === shuffles) return;
    const prev = played.current;
    played.current = shuffles;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const box = el.getBoundingClientRect();
    const midX = box.left + box.width / 2;
    const midY = box.top + box.height / 2;
    const split = Math.min(90, box.width * 0.22);
    const cards = [...el.querySelectorAll<HTMLElement>('[data-card]')];
    const n = cards.length || 1;
    // Lá xa tâm được gom trước, lá gần tâm sau: xấp bài "hút" từ ngoài vào.
    const byDistance = cards
      .map((card, i) => {
        const r = card.getBoundingClientRect();
        return { i, dx: midX - (r.left + r.width / 2), dy: midY - (r.top + r.height / 2) };
      })
      .sort((a, b) => Math.hypot(b.dx, b.dy) - Math.hypot(a.dx, a.dy));
    const gatherRank = new Map(byDistance.map((c, rank) => [c.i, rank]));

    const anims = cards.map((card, i) => {
      const { dx, dy } = byDistance.find((c) => c.i === i)!;
      const lift = -i * 0.3;
      const tilt = ((i * 37) % 17) - 8;
      const side = i % 2 ? 1 : -1;
      const pile = `translate(${dx + ((i * 7) % 5) - 2}px, ${dy + lift}px) rotate(${tilt * 0.4}deg) scale(1.5)`;
      const half = `translate(${dx + side * split}px, ${dy + lift + 6}px) rotate(${side * 14 + tilt * 0.3}deg) scale(1.5)`;
      const bend = `translate(${dx + side * split * 0.8}px, ${dy + lift - 4}px) rotate(${side * 22}deg) scale(1.5)`;
      const gatherAt = 0.08 + (gatherRank.get(i)! / n) * 0.16;
      const backAt = 0.5 + (i / n) * 0.1;
      const dealAt = 0.64 + (i / n) * 0.28;
      const flightMid = `translate(${dx * 0.45}px, ${dy * 0.45 - 28}px) rotate(${-tilt}deg) scale(1.14)`;
      return card.animate(
        [
          { transform: 'none', offset: 0 },
          { transform: 'none', offset: gatherAt - 0.08, easing: 'cubic-bezier(0.5, 0, 0.3, 1)' },
          { transform: pile, offset: gatherAt },
          { transform: pile, offset: 0.3 },
          { transform: half, offset: 0.37, easing: 'cubic-bezier(0.3, 0, 0.2, 1)' },
          { transform: bend, offset: 0.46 },
          { transform: pile, offset: backAt, easing: 'cubic-bezier(0.6, 0, 0.4, 1)' },
          { transform: pile, offset: dealAt },
          { transform: flightMid, offset: dealAt + 0.04, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' },
          { transform: 'none', offset: Math.min(1, dealAt + 0.08) },
          { transform: 'none', offset: 1 },
        ],
        { duration: SHUFFLE_MS, fill: 'backwards' },
      );
    });

    // Âm thanh: lạch cạch khi xáo riffle, tách tách khi chia bài.
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let k = 0; k < 10; k++) timers.push(setTimeout(() => sfxRef.current('tick'), (0.46 + k * 0.012) * SHUFFLE_MS));
    for (let k = 0; k < 9; k++) timers.push(setTimeout(() => sfxRef.current('tap'), (0.66 + k * 0.035) * SHUFFLE_MS));
    setBusy(true);
    timers.push(setTimeout(() => setBusy(false), SHUFFLE_MS));
    return () => {
      // Bị hủy giữa chừng (StrictMode chạy effect hai lần): cho lần chạy sau diễn lại.
      played.current = prev;
      anims.forEach((a) => a.cancel());
      timers.forEach(clearTimeout);
      setBusy(false);
    };
  }, [board, shuffles]);

  return busy;
}
