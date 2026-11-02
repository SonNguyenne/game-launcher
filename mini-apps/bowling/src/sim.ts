/**
 * Vật lý một lần ném bowling, hàm thuần và tất định (chỉ + - * / và Math.sqrt).
 * Chủ phòng chạy để ra kết quả; mọi máy chạy lại cùng tham số để phát hoạt ảnh giống hệt.
 * Tọa độ nhìn từ trên xuống: x ngang làn (âm là bên trái người ném), y dọc làn tính từ vạch ném, đơn vị cm.
 */

export const STEP = 1 / 600;
export const FRAME_EVERY = 10;
const MAX_TIME = 9;

/** Làn rộng 105 cm, ki đầu cách vạch ném 1829 cm (60 feet). */
export const LANE_HALF = 52.5;
export const GUTTER = 23;
export const HEAD_PIN = 1829;
const ROW = 26.4;
const SPACING = 30.48;
/** Hết dầu ở đoạn cuối làn: bi bắt đầu ăn xoáy. */
export const OIL_END = 1100;
export const PIT = HEAD_PIN + ROW * 3 + 50;

export const BALL_R = 10.9;
export const PIN_R = 6.05;
const BALL_M = 7;
const PIN_M = 1.5;
/** Gia tốc ngang tối đa do xoáy (cm/s²) khi bi đã ra khỏi dầu. */
const HOOK = 95;
const BALL_ROLL = 12;
const PIN_SLIDE = 260;
const PIN_DRAG = 1.4;
const E_BALL_PIN = 0.62;
const E_PIN_PIN = 0.55;
const E_WALL = 0.45;
/** Ki ngã khi bị đẩy nhanh hơn mức này hoặc lệch khỏi chỗ quá xa. */
const FALL_SPEED = 30;
const FALL_SHIFT = 3;
const FALLEN_R = 9.5;

export const SPEED_MIN = 450;
export const SPEED_MAX = 1000;
export const MAX_ANGLE = 0.1;
export const START_MAX = 44;

/** Chỗ đứng của 10 ki (chỉ số 0 là ki số 1). */
export const PIN_SPOTS: readonly { x: number; y: number }[] = (() => {
  const out: { x: number; y: number }[] = [];
  for (let row = 0; row < 4; row++) for (let j = 0; j <= row; j++) out.push({ x: (j - row / 2) * SPACING, y: HEAD_PIN + row * ROW });
  return out;
})();

export interface Throw {
  x0: number;
  vx: number;
  vy: number;
  /** -1..1: âm móc sang trái, dương móc sang phải. */
  spin: number;
}

export interface RollResult {
  /** Chỉ số các ki đổ trong lần ném này. */
  knocked: number[];
  gutter: boolean;
  /** Khung phát lại: [bx, by, (px, py, ngã)×10]; vật đã rơi xuống hố có x = NaN. */
  frames: Float32Array[];
  hits: { t: number; strong: boolean }[];
  time: number;
}

interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  m: number;
  on: boolean;
  down: boolean;
  pin: number;
}

/** Ném một bi vào các ki đang đứng (standing[i] = ki i còn đứng). */
export function roll(standing: readonly boolean[], t: Throw, frames = false): RollResult {
  const ball: Body = { x: t.x0, y: 0, vx: t.vx, vy: t.vy, r: BALL_R, m: BALL_M, on: true, down: false, pin: -1 };
  const pins: Body[] = PIN_SPOTS.map((p, i) => ({ x: p.x, y: p.y, vx: 0, vy: 0, r: PIN_R, m: PIN_M, on: !!standing[i], down: false, pin: i }));
  const bodies = [ball, ...pins];
  let gutter = false;
  const out: Float32Array[] = [];
  const hits: RollResult['hits'] = [];
  const snap = () => {
    const f = new Float32Array(2 + 30);
    f[0] = ball.on ? ball.x : NaN;
    f[1] = ball.y;
    pins.forEach((p, i) => {
      f[2 + i * 3] = p.on ? p.x : NaN;
      f[3 + i * 3] = p.y;
      f[4 + i * 3] = p.down ? 1 : 0;
    });
    out.push(f);
  };
  if (frames) snap();
  const spin = Math.max(-1, Math.min(1, t.spin));
  const maxSteps = Math.round(MAX_TIME / STEP);
  let step = 0;
  for (; step < maxSteps; step++) {
    const time = (step + 1) * STEP;
    let moving = false;
    // Bi.
    if (ball.on) {
      if (!gutter && ball.y > OIL_END && ball.y < HEAD_PIN) ball.vx += spin * HOOK * STEP;
      const sp = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
      if (sp > BALL_ROLL * STEP) {
        const k = (sp - BALL_ROLL * STEP) / sp;
        ball.vx *= k;
        ball.vy *= k;
        moving = true;
      } else {
        ball.vx = 0;
        ball.vy = 0;
      }
      ball.x += ball.vx * STEP;
      ball.y += ball.vy * STEP;
      if (!gutter && ball.y < HEAD_PIN - PIN_R && Math.abs(ball.x) > LANE_HALF) {
        // Lọt rãnh: lăn thẳng trong rãnh tới hố, không chạm ki nào nữa.
        gutter = true;
        ball.x = (ball.x < 0 ? -1 : 1) * (LANE_HALF + GUTTER / 2);
        ball.vx = 0;
      }
      if (ball.y > PIT || ball.y < -50) ball.on = false;
    }
    // Ki trượt trên sàn.
    for (const p of pins) {
      if (!p.on || (p.vx === 0 && p.vy === 0)) continue;
      const sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      const dec = (PIN_SLIDE + PIN_DRAG * sp) * STEP;
      if (dec >= sp) {
        p.vx = 0;
        p.vy = 0;
        continue;
      }
      const k = (sp - dec) / sp;
      p.vx *= k;
      p.vy *= k;
      p.x += p.vx * STEP;
      p.y += p.vy * STEP;
      moving = true;
    }
    // Va chạm.
    for (let i = 0; i < bodies.length; i++) {
      const a = bodies[i];
      if (!a.on || (i === 0 && gutter)) continue;
      for (let j = i + 1; j < bodies.length; j++) {
        const b = bodies[j];
        if (!b.on) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const rr = a.r + b.r;
        const d2 = dx * dx + dy * dy;
        if (d2 >= rr * rr) continue;
        const d = Math.sqrt(d2);
        const nx = d > 1e-9 ? dx / d : 0;
        const ny = d > 1e-9 ? dy / d : 1;
        const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        const ia = 1 / a.m;
        const ib = 1 / b.m;
        if (rel > 0) {
          const e = a.pin < 0 ? E_BALL_PIN : E_PIN_PIN;
          const imp = ((1 + e) * rel) / (ia + ib);
          a.vx -= imp * ia * nx;
          a.vy -= imp * ia * ny;
          b.vx += imp * ib * nx;
          b.vy += imp * ib * ny;
          hits.push({ t: time, strong: rel > 200 });
        }
        const push = (rr - d) / (ia + ib);
        a.x -= nx * push * ia;
        a.y -= ny * push * ia;
        b.x += nx * push * ib;
        b.y += ny * push * ib;
      }
    }
    // Vách hai bên, hố sau, rãnh, và ki ngã.
    for (const p of pins) {
      if (!p.on) continue;
      const wall = LANE_HALF + GUTTER;
      if (p.x < -wall + p.r && p.vx < 0) p.vx = -p.vx * E_WALL;
      if (p.x > wall - p.r && p.vx > 0) p.vx = -p.vx * E_WALL;
      const spot = PIN_SPOTS[p.pin];
      if (!p.down && (p.vx * p.vx + p.vy * p.vy > FALL_SPEED * FALL_SPEED || (p.x - spot.x) ** 2 + (p.y - spot.y) ** 2 > FALL_SHIFT * FALL_SHIFT)) {
        // Ki ngã nằm dài ra: quét rộng hơn lúc đứng.
        p.down = true;
        p.r = FALLEN_R;
      }
      if (p.y > PIT || Math.abs(p.x) > LANE_HALF + p.r) {
        p.down = true;
        if (p.y > PIT) p.on = false;
      }
    }
    if (frames && (step + 1) % FRAME_EVERY === 0) snap();
    if (!moving && !(ball.on && ball.y < PIT && (ball.vx !== 0 || ball.vy !== 0))) break;
  }
  if (frames) snap();
  return {
    knocked: pins.filter((p) => p.down && standing[p.pin]).map((p) => p.pin),
    gutter,
    frames: out,
    hits,
    time: (step + 1) * STEP,
  };
}

/** Đổi tham số vuốt (góc, lực) thành vận tốc; chỉ chủ phòng gọi (dùng sin/cos). */
export function throwOf(x0: number, angle: number, power: number, spin: number): Throw {
  const speed = SPEED_MIN + (SPEED_MAX - SPEED_MIN) * power;
  return { x0, vx: Math.sin(angle) * speed, vy: Math.cos(angle) * speed, spin };
}
