import type { Placed } from './game';

/** Một quân đã xếp chỗ, đơn vị là nửa quân (1 ô vuông). first là nửa trên/trái, second là nửa dưới/phải. */
export interface Laid {
  x: number;
  y: number;
  w: number;
  h: number;
  first: number;
  second: number;
  /** Vị trí trong dãy (0 là đầu trái). */
  index: number;
}

/**
 * Xếp dãy domino uốn khúc trong khung rộng `cols` ô: hàng đầu đi trái sang phải, hết chỗ thì một quân dựng đứng
 * ở mép để rẽ xuống, hàng sau đi ngược lại. Quân đôi nằm ngang dãy (dựng đứng) như cách xếp thường thấy.
 * Cột cuối mỗi phía luôn chừa cho quân rẽ.
 */
export function layoutSnake(line: readonly Placed[], cols = 12): Laid[] {
  const out: Laid[] = [];
  let x = 0;
  let dir = 1;
  let lane = 0;
  let afterTurn = false;
  line.forEach((t, index) => {
    const double = t.a === t.b;
    const across = double && !afterTurn;
    const len = across ? 1 : 2;
    const room = dir > 0 ? x + len <= cols - 1 : x - len >= 1;
    if (!room && index > 0) {
      // Quân rẽ: dựng đứng ở mép, nửa trên giáp hàng này, nửa dưới chạm quân đầu hàng sau.
      const left = dir > 0 ? x : x - 1;
      out.push({ x: left, y: lane, w: 1, h: 2, first: t.a, second: t.b, index });
      x = dir > 0 ? left + 1 : left;
      dir = -dir;
      lane += 2;
      afterTurn = true;
      return;
    }
    afterTurn = false;
    const left = dir > 0 ? x : x - len;
    if (across) out.push({ x: left, y: lane - 0.5, w: 1, h: 2, first: t.a, second: t.b, index });
    else out.push({ x: left, y: lane, w: 2, h: 1, first: dir > 0 ? t.a : t.b, second: dir > 0 ? t.b : t.a, index });
    x = dir > 0 ? x + len : x - len;
  });
  return out;
}

/** Khung bao của dãy đã xếp, để đặt viewBox. */
export function bounds(laid: readonly Laid[]) {
  if (!laid.length) return { x: 0, y: 0, w: 1, h: 1 };
  const x0 = Math.min(...laid.map((l) => l.x));
  const y0 = Math.min(...laid.map((l) => l.y));
  const x1 = Math.max(...laid.map((l) => l.x + l.w));
  const y1 = Math.max(...laid.map((l) => l.y + l.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
