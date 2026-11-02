import { useEffect, useRef, useState } from 'react';
import { vibrate, type Tone } from '@bang/party';
import { rowOf, type Board, type Move, type Step } from './game';

export interface Frame {
  board: Board;
  /** Ô đang cầm quân và số quân còn trên tay. */
  hand: { i: number; n: number } | null;
  /** Ô vừa bị ăn, để tô sáng. */
  eaten: number | null;
}

const clone = (b: Board): Board => ({
  pits: b.pits.slice(),
  quan: [b.quan[0], b.quan[1]],
  captured: [b.captured[0], b.captured[1]],
  quanTaken: [b.quanTaken[0], b.quanTaken[1]],
  debt: [b.debt[0], b.debt[1]],
});

/** Áp một bước lên khung hình đang diễn. Luật đã tính xong trong reducer, đây chỉ là diễn lại. */
export function applyStep(f: Frame, step: Step): Frame {
  const b = clone(f.board);
  if (step.t === 'pick') {
    b.pits[step.i] = 0;
    return { board: b, hand: { i: step.i, n: step.n }, eaten: null };
  }
  if (step.t === 'drop') {
    b.pits[step.i]++;
    return { board: b, hand: f.hand ? { i: step.i, n: Math.max(0, f.hand.n - 1) } : null, eaten: null };
  }
  if (step.t === 'eat') {
    b.pits[step.i] = 0;
    b.captured[step.seat] += step.n;
    if (step.quan) {
      b.quan[step.i === 0 ? 0 : 1] = false;
      b.quanTaken[step.seat]++;
    }
    return { board: b, hand: null, eaten: step.i };
  }
  const other = step.seat === 0 ? 1 : 0;
  b.captured[step.seat] -= 5 - step.borrowed;
  b.captured[other] -= step.borrowed;
  b.debt[step.seat] += step.borrowed;
  for (const i of rowOf(step.seat)) b.pits[i] = 1;
  return { board: b, hand: null, eaten: null };
}

const delay = (step: Step) => (step.t === 'drop' ? 170 : step.t === 'pick' ? 320 : 520);

/**
 * Diễn lại nước đi mới nhất từng bước. Trả về khung hình đang diễn (null khi đã xong, vẽ theo state thật).
 * Nước đi đã có sẵn lúc mở màn (vào giữa ván, tải lại trang) thì không diễn.
 */
export function usePlayback(last: Move | null, sfx: (t: Tone) => void) {
  const [frame, setFrame] = useState<Frame | null>(null);
  const seen = useRef(last?.id ?? 0);
  const sound = useRef(sfx);
  sound.current = sfx;
  const stop = useRef<() => void>(() => {});

  useEffect(() => {
    if (!last || last.id === seen.current) {
      if (!last) setFrame(null);
      return;
    }
    seen.current = last.id;
    let f: Frame = { board: clone(last.before), hand: null, eaten: null };
    let k = 0;
    let timer: ReturnType<typeof setTimeout>;
    setFrame(f);
    const tick = () => {
      if (k >= last.steps.length) {
        setFrame(null);
        return;
      }
      const step = last.steps[k++];
      f = applyStep(f, step);
      setFrame(f);
      if (step.t === 'eat') {
        sound.current('win');
        vibrate(25);
      } else sound.current(step.t === 'drop' ? 'tick' : 'tap');
      timer = setTimeout(tick, delay(step));
    };
    timer = setTimeout(tick, 250);
    stop.current = () => {
      clearTimeout(timer);
      setFrame(null);
    };
    return () => {
      clearTimeout(timer);
      setFrame(null);
    };
  }, [last]);

  return { frame, skip: () => stop.current() };
}
