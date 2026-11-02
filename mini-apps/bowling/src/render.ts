import { BALL_R, GUTTER, HEAD_PIN, LANE_HALF, OIL_END, PIN_SPOTS, PIT, START_MAX } from './sim';

/** Màu vẽ trên canvas. */
const C = {
  sky: '#0B0D1A',
  wall: '#141833',
  wallGlow: 'rgba(124,92,255,0.35)',
  neonA: '#FF4FD8',
  neonB: '#3DE7FF',
  gutter: '#3A3F4C',
  gutterIn: '#262A33',
  cap: '#5A6070',
  laneNear: '#E9BF7F',
  laneFar: '#B98A4E',
  board: 'rgba(110,70,25,0.18)',
  deck: '#F2D29C',
  pit: '#05060A',
  foul: '#E0402F',
  arrow: '#7A4518',
  pin: '#FBF8F1',
  pinShade: '#D9D3C6',
  pinNeck: '#D8322B',
  shadow: 'rgba(0,0,0,0.32)',
  aim: 'rgba(255,255,255,0.9)',
  aimGlow: 'rgba(61,231,255,0.55)',
};

export const HALF = LANE_HALF + GUTTER;
/** Bề rộng một làn kể cả hai rãnh và vách ngăn, để vẽ làn bên cạnh. */
const PITCH = HALF * 2 + 26;
/** Khoảng cách máy quay tới vạch gần nhất và hệ số nén chiều dài làn cho dễ nhìn. */
const NEAR = 600;
const SQUASH = 0.3;
const PIN_H = 38;
const PIN_W = 12;

/** Phép chiếu phối cảnh nhìn từ sau lưng người ném. */
export interface View {
  w: number;
  h: number;
  /** Tọa độ y của làn nằm ở vạch gần nhất (đáy màn hình). */
  camY: number;
  f: number;
  g: number;
  horizon: number;
  cx: number;
}

/** Sàn ki được giãn sâu thêm để thấy rõ hình tam giác 10 ki, như máy quay đặt cao. */
const DECK_Y = HEAD_PIN - 60;
const DECK_STRETCH = 1.6;
const NEAR_AT = 0.8;
const PINS_AT = 0.2;
const along = (y: number) => y * SQUASH + Math.max(0, y - DECK_Y) * DECK_STRETCH;

export function makeView(w: number, h: number, camY: number): View {
  const f = (w * 0.47 * NEAR) / HALF;
  // Vạch gần ở 80% chiều cao, hàng ki đầu (khi máy quay ở vạch ném) ở 20%.
  const far = NEAR + along(HEAD_PIN) - along(0);
  const g = (h * (NEAR_AT - PINS_AT)) / (1 / NEAR - 1 / far);
  return { w, h, camY, f, g, horizon: h * NEAR_AT - g / NEAR, cx: w / 2 };
}

export const depthOf = (v: View, y: number) => NEAR + along(y) - along(v.camY);

export function project(v: View, x: number, y: number, z = 0) {
  const d = Math.max(40, depthOf(v, y));
  const k = v.f / d;
  return { x: v.cx + x * k, y: v.horizon + v.g / d - z * k, k };
}

/** Đổi điểm trên màn hình (ở đáy, chỗ đặt bi) về x của làn. */
export const laneXAt = (v: View, sx: number, y: number) => ((sx - v.cx) * depthOf(v, y)) / v.f;

function quad(ctx: CanvasRenderingContext2D, v: View, x0: number, x1: number, y0: number, y1: number, fill: string | CanvasGradient) {
  // Cạnh làn gãy khúc ở chỗ bắt đầu giãn sàn ki nên phải đi qua điểm đó.
  const ys = y0 < DECK_Y && y1 > DECK_Y ? [y0, DECK_Y, y1] : [y0, y1];
  ctx.fillStyle = fill;
  ctx.beginPath();
  ys.forEach((y, i) => {
    const p = project(v, x0, y);
    if (i) ctx.lineTo(p.x, p.y);
    else ctx.moveTo(p.x, p.y);
  });
  for (const y of [...ys].reverse()) {
    const p = project(v, x1, y);
    ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  ctx.fill();
}

/** y nhỏ nhất của làn còn thấy ở đáy màn hình (máy quay luôn đứng trước sàn ki). */
const nearY = (v: View) => v.camY + (v.g / (v.h + 20 - v.horizon) - NEAR) / SQUASH;

function drawOneLane(ctx: CanvasRenderingContext2D, v: View, ox: number, main: boolean) {
  const y0 = nearY(v);
  const yEnd = PIT;
  ctx.save();
  if (!main) ctx.globalAlpha = 0.7;
  // Rãnh và vách.
  quad(ctx, v, ox - HALF - 6, ox + HALF + 6, y0, yEnd, C.cap);
  quad(ctx, v, ox - HALF, ox - LANE_HALF, y0, yEnd, C.gutter);
  quad(ctx, v, ox + LANE_HALF, ox + HALF, y0, yEnd, C.gutter);
  quad(ctx, v, ox - HALF + 6, ox - LANE_HALF - 4, y0, yEnd, C.gutterIn);
  quad(ctx, v, ox + LANE_HALF + 4, ox + HALF - 6, y0, yEnd, C.gutterIn);
  // Mặt gỗ: đậm dần về xa.
  const top = project(v, 0, HEAD_PIN).y;
  const grad = ctx.createLinearGradient(0, v.h, 0, top);
  grad.addColorStop(0, C.laneNear);
  grad.addColorStop(1, C.laneFar);
  quad(ctx, v, ox - LANE_HALF, ox + LANE_HALF, y0, HEAD_PIN - 40, grad);
  quad(ctx, v, ox - LANE_HALF, ox + LANE_HALF, HEAD_PIN - 40, PIT - 40, C.deck);
  quad(ctx, v, ox - HALF, ox + HALF, PIT - 40, PIT + 200, C.pit);
  if (main) {
    // Vân ván gỗ.
    ctx.strokeStyle = C.board;
    ctx.lineWidth = 1;
    for (let b = -LANE_HALF + 2.66 * 3; b < LANE_HALF; b += 2.66 * 3) {
      const a = project(v, ox + b, Math.max(y0, v.camY - 100));
      const k = project(v, ox + b, DECK_Y);
      const c = project(v, ox + b, PIT - 40);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(k.x, k.y);
      ctx.lineTo(c.x, c.y);
      ctx.stroke();
    }
    // Lớp dầu bóng phần đầu làn.
    const oilA = project(v, 0, Math.max(y0, 0)).y;
    const oilB = project(v, 0, OIL_END).y;
    if (oilA > oilB) {
      const sheen = ctx.createLinearGradient(0, oilA, 0, oilB);
      sheen.addColorStop(0, 'rgba(255,255,255,0.10)');
      sheen.addColorStop(1, 'rgba(255,255,255,0)');
      quad(ctx, v, ox - LANE_HALF, ox + LANE_HALF, Math.max(y0, 0), OIL_END, sheen);
    }
    // Vạch ném, chấm và mũi tên ngắm.
    quad(ctx, v, ox - LANE_HALF, ox + LANE_HALF, -2, 2, C.foul);
    ctx.fillStyle = C.arrow;
    for (let i = -3; i <= 3; i++) {
      const x = ox + i * 2.66 * 5;
      const dot = project(v, x, 210);
      if (dot.y < v.h + 10) {
        ctx.beginPath();
        ctx.ellipse(dot.x, dot.y, Math.max(1.2, 1.4 * dot.k), Math.max(0.8, 0.6 * dot.k), 0, 0, Math.PI * 2);
        ctx.fill();
      }
      const y = 457 + Math.abs(i) * 15;
      const tip = project(v, x, y + 12);
      const l = project(v, x - 2.4, y - 8);
      const r = project(v, x + 2.4, y - 8);
      ctx.beginPath();
      ctx.moveTo(tip.x, tip.y);
      ctx.lineTo(r.x, r.y);
      ctx.lineTo(l.x, l.y);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Nền, làn bên cạnh, làn chính và bức tường máy dựng ki. */
export function drawScene(ctx: CanvasRenderingContext2D, v: View, t: number) {
  ctx.fillStyle = C.sky;
  ctx.fillRect(0, 0, v.w, v.h);
  for (let n = -3; n <= 3; n++) if (n) drawOneLane(ctx, v, n * PITCH, false);
  drawOneLane(ctx, v, 0, true);
  // Tường che máy dựng ki, đặt ngay sau hố.
  const wl = project(v, -PITCH * 4, PIT + 30);
  const wallTop = project(v, 0, PIT + 30, 120);
  ctx.fillStyle = C.wall;
  ctx.fillRect(0, 0, v.w, Math.max(0, wl.y));
  const glow = ctx.createLinearGradient(0, wallTop.y, 0, wl.y);
  glow.addColorStop(0, 'rgba(0,0,0,0)');
  glow.addColorStop(1, C.wallGlow);
  ctx.fillStyle = glow;
  ctx.fillRect(0, wallTop.y, v.w, wl.y - wallTop.y);
  // Đèn neon nhấp nháy nhẹ trên tường mỗi làn.
  for (let n = -3; n <= 3; n++) {
    const a = project(v, n * PITCH - LANE_HALF, PIT + 30, 70);
    const b = project(v, n * PITCH + LANE_HALF, PIT + 30, 70);
    const pulse = 0.6 + 0.4 * Math.sin(t * 2.2 + n);
    ctx.save();
    ctx.globalAlpha = n === 0 ? 0.6 + 0.4 * pulse : 0.25;
    ctx.strokeStyle = n === 0 ? C.neonB : C.neonA;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 12;
    ctx.lineWidth = Math.max(1.5, 1.6 * a.k);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
  }
  // Tối dần hai mép để mắt tập trung vào làn chính.
  const vig = ctx.createRadialGradient(v.cx, v.h * 0.6, v.w * 0.3, v.cx, v.h * 0.6, v.w * 0.95);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.3)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, v.w, v.h);
}

function pinPath(ctx: CanvasRenderingContext2D, s: number) {
  // Thân ki dựng từ gốc (0,0) lên trên, đơn vị cm nhân s.
  const h = PIN_H * s;
  const w = PIN_W * s * 0.5;
  ctx.beginPath();
  ctx.moveTo(-w * 0.55, 0);
  ctx.bezierCurveTo(-w * 1.05, -h * 0.18, -w * 1.05, -h * 0.42, -w * 0.38, -h * 0.62);
  ctx.bezierCurveTo(-w * 0.28, -h * 0.72, -w * 0.62, -h * 0.86, -w * 0.4, -h * 0.97);
  ctx.quadraticCurveTo(0, -h * 1.04, w * 0.4, -h * 0.97);
  ctx.bezierCurveTo(w * 0.62, -h * 0.86, w * 0.28, -h * 0.72, w * 0.38, -h * 0.62);
  ctx.bezierCurveTo(w * 1.05, -h * 0.42, w * 1.05, -h * 0.18, w * 0.55, 0);
  ctx.closePath();
}

function pinBody(ctx: CanvasRenderingContext2D, s: number) {
  const h = PIN_H * s;
  const w = PIN_W * s * 0.5;
  const grad = ctx.createLinearGradient(-w, 0, w, 0);
  grad.addColorStop(0, C.pinShade);
  grad.addColorStop(0.35, C.pin);
  grad.addColorStop(1, C.pinShade);
  pinPath(ctx, s);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.save();
  pinPath(ctx, s);
  ctx.clip();
  ctx.fillStyle = C.pinNeck;
  ctx.fillRect(-w, -h * 0.72, w * 2, Math.max(1, h * 0.035));
  ctx.fillRect(-w, -h * 0.665, w * 2, Math.max(1, h * 0.035));
  ctx.restore();
}

/** Ki đứng, hoặc đang ngã (tilt 0..1 theo hướng dir). */
export function drawPin(ctx: CanvasRenderingContext2D, v: View, x: number, y: number, tilt = 0, dir = 1, z = 0) {
  const p = project(v, x, y);
  const s = p.k;
  ctx.save();
  ctx.fillStyle = C.shadow;
  ctx.beginPath();
  ctx.ellipse(p.x + 2 * s, p.y, PIN_W * 0.55 * s, PIN_W * 0.2 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(p.x, p.y - z * s);
  if (tilt) ctx.rotate(dir * tilt * Math.PI * 0.5);
  pinBody(ctx, s);
  ctx.restore();
}

/** Ki nằm trên sàn: thân dài theo góc a trong mặt sàn. */
export function drawFallenPin(ctx: CanvasRenderingContext2D, v: View, x: number, y: number, a: number) {
  const dx = Math.cos(a) * PIN_H * 0.5;
  const dy = Math.sin(a) * PIN_H * 0.5;
  const head = project(v, x + dx, y + dy, 5);
  const foot = project(v, x - dx, y - dy, 5);
  const mid = project(v, x, y, 5);
  const ang = Math.atan2(head.y - foot.y, head.x - foot.x);
  const len = Math.hypot(head.x - foot.x, head.y - foot.y);
  const s = mid.k;
  ctx.save();
  ctx.translate(mid.x, mid.y);
  ctx.rotate(ang + Math.PI / 2);
  ctx.scale(1, Math.max(0.2, len / (PIN_H * s)));
  ctx.translate(0, (PIN_H * s) / 2);
  pinBody(ctx, s);
  ctx.restore();
}

/** Bi lăn: hình cầu với ba lỗ ngón tay quay theo quãng đường. */
export function drawBall(ctx: CanvasRenderingContext2D, v: View, x: number, y: number, color: string, phase = 0, side = 0) {
  const p = project(v, x, y, BALL_R);
  const r = BALL_R * p.k;
  ctx.save();
  ctx.fillStyle = C.shadow;
  ctx.beginPath();
  ctx.ellipse(p.x + r * 0.15, p.y + r * 0.95, r * 1.05, r * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(p.x - r * 0.4, p.y - r * 0.45, r * 0.1, p.x, p.y, r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.18, color);
  g.addColorStop(1, '#0A0A14');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fill();
  // Lỗ ngón tay chỉ thấy khi ở mặt trước của bi.
  ctx.fillStyle = 'rgba(5,5,12,0.85)';
  const holes = [
    [0, 0],
    [0.42, -0.22],
    [0.42, 0.22],
  ];
  for (const [u, w] of holes) {
    const a = phase + u;
    const front = Math.cos(a);
    if (front < 0.15) continue;
    const hx = p.x + (w + side * 0.3) * r * 0.9;
    const hy = p.y - Math.sin(a) * r * 0.75;
    ctx.beginPath();
    ctx.ellipse(hx, hy, r * 0.11, r * 0.11 * front, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Đường ngắm từ chỗ đặt bi tới hết đoạn dầu, cộng mũi tên cong theo hướng xoáy. */
export function drawAim(ctx: CanvasRenderingContext2D, v: View, x0: number, angle: number, spin: number, power: number, t: number) {
  const tan = Math.tan(angle);
  const end = OIL_END;
  ctx.save();
  ctx.lineCap = 'round';
  // Chấm chạy dọc đường ngắm cho cảm giác bi sắp lao đi.
  const step = 60;
  const offset = (t * 260 * (0.5 + power)) % step;
  for (let y = 30 + offset; y < end; y += step) {
    const p = project(v, x0 + tan * y, y, 1);
    const a = 1 - y / end;
    ctx.fillStyle = `rgba(255,255,255,${0.25 + 0.7 * a})`;
    ctx.shadowColor = C.aimGlow;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(1.5, 2.6 * p.k), 0, Math.PI * 2);
    ctx.fill();
  }
  // Mũi tên cuối: cong sang bên xoáy.
  const xe = x0 + tan * end;
  const bend = spin * 30;
  const pts = [0, 0.33, 0.66, 1].map((u) => project(v, xe + bend * u * u, end + u * 260, 1));
  ctx.strokeStyle = spin ? C.neonB : C.aim;
  ctx.shadowColor = C.aimGlow;
  ctx.shadowBlur = 10;
  ctx.lineWidth = Math.max(2, 3 * pts[0].k);
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (const q of pts.slice(1)) ctx.lineTo(q.x, q.y);
  ctx.stroke();
  const a = pts[3];
  const b = pts[2];
  const ang = Math.atan2(a.y - b.y, a.x - b.x);
  const hs = Math.max(6, 9 * a.k);
  ctx.fillStyle = ctx.strokeStyle;
  ctx.beginPath();
  ctx.moveTo(a.x + Math.cos(ang) * hs, a.y + Math.sin(ang) * hs);
  ctx.lineTo(a.x + Math.cos(ang + 2.4) * hs, a.y + Math.sin(ang + 2.4) * hs);
  ctx.lineTo(a.x + Math.cos(ang - 2.4) * hs, a.y + Math.sin(ang - 2.4) * hs);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Thanh lực bên phải màn hình. */
export function drawPower(ctx: CanvasRenderingContext2D, v: View, power: number) {
  const bw = 12;
  const bh = v.h * 0.34;
  const x = v.w - bw - 14;
  const y = v.h * 0.48;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.roundRect(x - 3, y - 3, bw + 6, bh + 6, 9);
  ctx.fill();
  const g = ctx.createLinearGradient(0, y + bh, 0, y);
  g.addColorStop(0, '#3DE7FF');
  g.addColorStop(0.6, '#FFD23D');
  g.addColorStop(1, '#FF4F4F');
  ctx.fillStyle = g;
  const fh = bh * power;
  ctx.beginPath();
  ctx.roundRect(x, y + bh - fh, bw, fh, 6);
  ctx.fill();
  ctx.restore();
}

/** Vị trí đặt bi được phép, vẽ thành dải mờ trên vạch ném. */
export function drawStartZone(ctx: CanvasRenderingContext2D, v: View) {
  quad(ctx, v, -START_MAX, START_MAX, -8, 8, 'rgba(61,231,255,0.18)');
}

export { PIN_SPOTS };
