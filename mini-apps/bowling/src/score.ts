/** Tính điểm bowling 10 khung chuẩn, kể cả khung 10 (tối đa 3 lần ném). */

export interface FrameView {
  /** Ký hiệu từng lần ném: 'X' strike, '/' spare, '-' trượt, hoặc số ki. */
  marks: string[];
  /** Điểm cộng dồn tới hết khung này; null khi chưa tính được (chờ lần ném thưởng). */
  total: number | null;
}

/** Chia dãy lần ném thành các khung. */
export function splitFrames(rolls: readonly number[]): number[][] {
  const frames: number[][] = [];
  let i = 0;
  while (i < rolls.length && frames.length < 9) {
    if (rolls[i] === 10) {
      frames.push([10]);
      i += 1;
    } else {
      frames.push(rolls.slice(i, i + 2));
      i += 2;
    }
  }
  if (i < rolls.length) frames.push(rolls.slice(i, i + 3));
  return frames;
}

/** Khung (chỉ số 0-9) đã ném xong chưa. */
export function frameDone(balls: readonly number[], index: number): boolean {
  if (index < 9) return balls[0] === 10 || balls.length === 2;
  if (balls.length < 2) return false;
  if (balls.length === 3) return true;
  return balls[0] + balls[1] < 10;
}

/** Số ván (khung) đã xong của dãy lần ném. */
export function framesDone(rolls: readonly number[]): number {
  const fr = splitFrames(rolls);
  return fr.filter((b, i) => frameDone(b, i)).length;
}

/**
 * Ki còn đứng trước lần ném kế tiếp có phải dựng lại cả 10 không (đầu khung, hoặc khung 10 sau strike/spare).
 * Trả về false khi lần ném kế là ném bù trong cùng khung.
 */
export function freshRack(rolls: readonly number[]): boolean {
  const fr = splitFrames(rolls);
  const last = fr[fr.length - 1];
  const i = fr.length - 1;
  if (!last || frameDone(last, i)) return true;
  if (i < 9) return false;
  // Khung 10.
  if (last.length === 1) return last[0] === 10;
  return last[0] === 10 ? last[1] === 10 : last[0] + last[1] === 10;
}

export function scoreFrames(rolls: readonly number[]): FrameView[] {
  const out: FrameView[] = [];
  let total = 0;
  let i = 0;
  let known = true;
  for (let f = 0; f < 10; f++) {
    const a = rolls[i];
    const b = rolls[i + 1];
    const c = rolls[i + 2];
    if (a === undefined) {
      out.push({ marks: [], total: null });
      continue;
    }
    if (f < 9) {
      if (a === 10) {
        out.push({ marks: ['', 'X'], total: null });
        if (b !== undefined && c !== undefined && known) total += 10 + b + c;
        else known = false;
        i += 1;
      } else {
        const marks = [mark(a), b === undefined ? '' : a + b === 10 ? '/' : mark(b)];
        out.push({ marks, total: null });
        if (b === undefined) known = false;
        else if (a + b === 10) {
          if (c !== undefined && known) total += 10 + c;
          else known = false;
        } else if (known) total += a + b;
        i += 2;
      }
    } else {
      const balls = rolls.slice(i, i + 3);
      const marks: string[] = [];
      balls.forEach((v, k) => {
        const prev = balls[k - 1];
        // Sau strike (hoặc spare) ki được dựng lại; ném bù sạch phần còn lại là spare.
        const rackFresh = k === 0 || prev === 10 || (k === 2 && balls[0] !== 10 && balls[0] + balls[1] === 10) || (k === 2 && balls[0] === 10 && balls[1] === 10);
        if (v === 10 && rackFresh) marks.push('X');
        else if (!rackFresh && prev + v === 10) marks.push('/');
        else marks.push(mark(v));
      });
      out.push({ marks, total: null });
      if (frameDone(balls, 9) && known) total += balls.reduce((x, y) => x + y, 0);
      else known = false;
    }
    if (known) out[f].total = total;
  }
  return out;
}

export function totalOf(rolls: readonly number[]): number {
  // Điểm đã chắc chắn (khung còn chờ ném thưởng chưa cộng).
  const fr = scoreFrames(rolls);
  let last = 0;
  for (const f of fr) if (f.total !== null) last = f.total;
  return last;
}

const mark = (v: number) => (v === 0 ? '-' : String(v));
