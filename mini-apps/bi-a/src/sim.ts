/**
 * Vật lý bàn bi-a, hàm thuần và tất định.
 * Chỉ dùng + - * / và Math.sqrt (kết quả chính xác theo IEEE 754 trên mọi máy), không dùng sin/cos,
 * nên chủ phòng và mọi máy khách chạy lại cùng một cú đánh đều ra đúng từng vị trí.
 * Bàn đặt dọc: x theo chiều ngang (0..W), y theo chiều dọc (0..H), đơn vị cm, thời gian giây.
 */

export const W = 127;
export const H = 254;
export const R = 2.86;
/** Bước thời gian cố định của mô phỏng. */
export const STEP = 1 / 480;
/** Cứ bấy nhiêu bước thì lưu một khung để phát lại (120 khung/giây). */
export const FRAME_EVERY = 4;
/** Mô phỏng tối đa bấy nhiêu giây (phòng khi có gì kẹt). */
const MAX_TIME = 15;

/** Ma sát lăn (gia tốc hãm không đổi) và lực cản tỉ lệ vận tốc. */
const ROLL = 18;
const DRAG = 0.7;
const E_BALL = 0.94;
const E_CUSHION = 0.78;

/** Miệng lỗ: đoạn băng không có thành ở góc và giữa cạnh dài. */
const CORNER_MOUTH = 6.5;
const SIDE_MOUTH = 6;
const CORNER_R = 6;
const SIDE_R = 4.8;
export const POCKETS: readonly { x: number; y: number; r: number }[] = [
  { x: 0, y: 0, r: CORNER_R },
  { x: W, y: 0, r: CORNER_R },
  { x: -1.5, y: H / 2, r: SIDE_R },
  { x: W + 1.5, y: H / 2, r: SIDE_R },
  { x: 0, y: H, r: CORNER_R },
  { x: W, y: H, r: CORNER_R },
];

/** Điểm đặt bi đầu tam giác và vạch giao bóng (bi cái đặt phía dưới vạch khi phá bi). */
export const FOOT = { x: W / 2, y: H * 0.25 };
export const HEAD_LINE = H * 0.75;
export const CUE_SPOT = { x: W / 2, y: H * 0.8 };

/** Lực tối thiểu/tối đa (cm/s) ứng với power 0..1. */
export const SPEED_MIN = 30;
export const SPEED_MAX = 650;

export interface Ball {
  /** 0: bi cái, 1-7 trơn, 8 đen, 9-15 sọc. */
  id: number;
  x: number;
  y: number;
  on: boolean;
}

export interface SimResult {
  balls: Ball[];
  /** Bi đầu tiên bi cái chạm. */
  firstHit: number | null;
  /** Các bi rơi lỗ theo thứ tự. */
  pocketed: number[];
  /** Khung phát lại: mỗi khung [x0, y0, x1, y1...]; bi đã rơi có x = NaN. */
  frames: Float32Array[];
  /** Thời điểm (giây) các va chạm mạnh và rơi lỗ, để phát tiếng. */
  sounds: { t: number; kind: 'hit' | 'pocket' | 'cushion' }[];
  time: number;
}

interface Body {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  on: boolean;
}

function inMouth(along: number, length: number, side: boolean) {
  if (along < CORNER_MOUTH || along > length - CORNER_MOUTH) return true;
  return side && Math.abs(along - length / 2) < SIDE_MOUTH;
}

/** Đặt được bi cái ở (x, y) không: trong bàn và không đè bi khác. */
export function canPlace(balls: readonly Ball[], x: number, y: number, kitchen: boolean): boolean {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  if (x < R || x > W - R || y < R || y > H - R) return false;
  if (kitchen && y < HEAD_LINE) return false;
  return balls.every((b) => b.id === 0 || !b.on || (b.x - x) ** 2 + (b.y - y) ** 2 >= (2 * R) ** 2);
}

/** Tìm chỗ trống gần (x, y) nhất trên đường dọc giữa bàn (để đặt lại bi 8 hoặc bi cái). */
export function freeSpot(balls: readonly Ball[], x: number, y: number, skip: number, dir = -1): { x: number; y: number } {
  for (let k = 0; k < 400; k++) {
    for (const sgn of [1, -1]) {
      const yy = y + dir * sgn * k * 0.5;
      if (yy < R || yy > H - R) continue;
      if (balls.every((b) => b.id === skip || !b.on || (b.x - x) ** 2 + (b.y - yy) ** 2 >= (2 * R + 0.01) ** 2)) return { x, y: yy };
    }
  }
  return { x, y };
}

/**
 * Chạy cú đánh tới khi mọi bi dừng.
 * @param frames có lưu khung phát lại không (chủ phòng chỉ cần kết quả, máy phát hoạt ảnh cần khung).
 */
export function simulate(start: readonly Ball[], vx: number, vy: number, frames = false): SimResult {
  const bodies: Body[] = start.map((b) => ({ id: b.id, x: b.x, y: b.y, vx: 0, vy: 0, on: b.on }));
  const cue = bodies.find((b) => b.id === 0)!;
  cue.vx = vx;
  cue.vy = vy;
  let firstHit: number | null = null;
  const pocketed: number[] = [];
  const out: Float32Array[] = [];
  const sounds: SimResult['sounds'] = [];
  const snap = () => {
    const f = new Float32Array(bodies.length * 2);
    bodies.forEach((b, i) => {
      f[i * 2] = b.on ? b.x : NaN;
      f[i * 2 + 1] = b.y;
    });
    out.push(f);
  };
  if (frames) snap();

  const maxSteps = Math.round(MAX_TIME / STEP);
  let step = 0;
  for (; step < maxSteps; step++) {
    const t = (step + 1) * STEP;
    let moving = false;
    // Ma sát rồi di chuyển.
    for (const b of bodies) {
      if (!b.on || (b.vx === 0 && b.vy === 0)) continue;
      const sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      const dec = (ROLL + DRAG * sp) * STEP;
      if (dec >= sp || sp < 0.4) {
        b.vx = 0;
        b.vy = 0;
        continue;
      }
      const k = (sp - dec) / sp;
      b.vx *= k;
      b.vy *= k;
      b.x += b.vx * STEP;
      b.y += b.vy * STEP;
      moving = true;
    }
    // Va chạm bi với bi (khối lượng bằng nhau).
    for (let i = 0; i < bodies.length; i++) {
      const a = bodies[i];
      if (!a.on) continue;
      for (let j = i + 1; j < bodies.length; j++) {
        const b = bodies[j];
        if (!b.on) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d2 = dx * dx + dy * dy;
        if (d2 >= 4 * R * R) continue;
        let d = Math.sqrt(d2);
        let nx = 1;
        let ny = 0;
        if (d > 1e-9) {
          nx = dx / d;
          ny = dy / d;
        } else d = 0;
        const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        if (rel > 0) {
          const imp = ((1 + E_BALL) / 2) * rel;
          a.vx -= imp * nx;
          a.vy -= imp * ny;
          b.vx += imp * nx;
          b.vy += imp * ny;
          if (firstHit === null && (a.id === 0 || b.id === 0)) firstHit = a.id === 0 ? b.id : a.id;
          if (rel > 40) sounds.push({ t, kind: 'hit' });
        }
        const push = (2 * R - d) / 2;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
      }
    }
    // Băng và lỗ.
    for (const b of bodies) {
      if (!b.on) continue;
      if (b.x < R && b.vx < 0 && !inMouth(b.y, H, true)) {
        b.x = 2 * R - b.x;
        b.vx = -b.vx * E_CUSHION;
        if (-b.vx > 60) sounds.push({ t, kind: 'cushion' });
      } else if (b.x > W - R && b.vx > 0 && !inMouth(b.y, H, true)) {
        b.x = 2 * (W - R) - b.x;
        b.vx = -b.vx * E_CUSHION;
        if (b.vx > 60) sounds.push({ t, kind: 'cushion' });
      }
      if (b.y < R && b.vy < 0 && !inMouth(b.x, W, false)) {
        b.y = 2 * R - b.y;
        b.vy = -b.vy * E_CUSHION;
        if (-b.vy > 60) sounds.push({ t, kind: 'cushion' });
      } else if (b.y > H - R && b.vy > 0 && !inMouth(b.x, W, false)) {
        b.y = 2 * (H - R) - b.y;
        b.vy = -b.vy * E_CUSHION;
        if (b.vy > 60) sounds.push({ t, kind: 'cushion' });
      }
      const outside = b.x < -R || b.x > W + R || b.y < -R || b.y > H + R;
      if (outside || POCKETS.some((p) => (b.x - p.x) ** 2 + (b.y - p.y) ** 2 < p.r * p.r)) {
        b.on = false;
        b.vx = 0;
        b.vy = 0;
        pocketed.push(b.id);
        sounds.push({ t, kind: 'pocket' });
      }
    }
    if (frames && (step + 1) % FRAME_EVERY === 0) snap();
    if (!moving) break;
  }
  if (frames) snap();
  return {
    balls: bodies.map((b) => ({ id: b.id, x: b.x, y: b.y, on: b.on })),
    firstHit,
    pocketed,
    frames: out,
    sounds,
    time: (step + 1) * STEP,
  };
}

export type Kind = 'cue' | 'solid' | 'stripe' | 'eight';
export const kindOf = (id: number): Kind => (id === 0 ? 'cue' : id === 8 ? 'eight' : id < 8 ? 'solid' : 'stripe');

/** Xếp tam giác 15 bi: bi 8 ở giữa hàng ba, hai góc sau một trơn một sọc. `rand` trả về [0, 1). */
export function rack(rand: () => number): Ball[] {
  const dy = Math.sqrt(3) * R + 0.02;
  const dx = 2 * R + 0.02;
  const spots: { x: number; y: number }[] = [];
  for (let row = 0; row < 5; row++) for (let j = 0; j <= row; j++) spots.push({ x: FOOT.x + (j - row / 2) * dx, y: FOOT.y - row * dy });
  // Chỉ số chỗ: hàng 3 giữa là 4; hai góc sau là 10 và 14.
  const solids = [1, 2, 3, 4, 5, 6, 7];
  const stripes = [9, 10, 11, 12, 13, 14, 15];
  const pick = (list: number[]) => list.splice(Math.floor(rand() * list.length), 1)[0];
  const order: number[] = Array(15).fill(0);
  order[4] = 8;
  const solidLeft = rand() < 0.5;
  order[10] = pick(solidLeft ? solids : stripes);
  order[14] = pick(solidLeft ? stripes : solids);
  const rest = [...solids, ...stripes];
  for (let i = 0; i < 15; i++) if (!order[i]) order[i] = rest.splice(Math.floor(rand() * rest.length), 1)[0];
  const balls: Ball[] = Array.from({ length: 16 }, (_, id) => ({ id, x: 0, y: 0, on: true }));
  balls[0] = { id: 0, x: CUE_SPOT.x, y: CUE_SPOT.y, on: true };
  order.forEach((id, i) => (balls[id] = { id, x: spots[i].x, y: spots[i].y, on: true }));
  return balls;
}

/**
 * Đường ngắm dự đoán: từ bi cái theo hướng (dx, dy) (đã chuẩn hóa) tới bi đầu tiên hoặc băng.
 * Trả về điểm chạm của bi cái, bi bị chạm và hướng đi của bi đó / bi cái sau va chạm.
 */
export function predict(balls: readonly Ball[], dx: number, dy: number) {
  const cue = balls[0];
  let best = Infinity;
  let hit: Ball | null = null;
  for (const b of balls) {
    if (b.id === 0 || !b.on) continue;
    const ox = cue.x - b.x;
    const oy = cue.y - b.y;
    const p = ox * dx + oy * dy;
    const q = ox * ox + oy * oy - 4 * R * R;
    const disc = p * p - q;
    if (disc < 0) continue;
    const t = -p - Math.sqrt(disc);
    if (t > 0 && t < best) {
      best = t;
      hit = b;
    }
  }
  const wallT = Math.min(
    dx < 0 ? (R - cue.x) / dx : dx > 0 ? (W - R - cue.x) / dx : Infinity,
    dy < 0 ? (R - cue.y) / dy : dy > 0 ? (H - R - cue.y) / dy : Infinity,
  );
  if (!hit || wallT < best) return { x: cue.x + dx * wallT, y: cue.y + dy * wallT, hit: null as Ball | null, ox: 0, oy: 0, cx: 0, cy: 0 };
  const x = cue.x + dx * best;
  const y = cue.y + dy * best;
  const nx = (hit.x - x) / (2 * R);
  const ny = (hit.y - y) / (2 * R);
  const along = dx * nx + dy * ny;
  return { x, y, hit, ox: nx * along, oy: ny * along, cx: dx - nx * along, cy: dy - ny * along };
}
