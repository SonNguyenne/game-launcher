import { H, HEAD_LINE, POCKETS, R, W, FOOT, kindOf } from './sim';

/** Màu vẽ trên canvas (canvas không đọc được biến CSS theo cách đơn giản). */
const C = {
  rail: '#5B3A22',
  railEdge: '#3E2614',
  felt: '#1F7A4D',
  feltDark: '#17603C',
  pocket: '#0D0B08',
  diamond: '#F2E6CF',
  line: 'rgba(255,255,255,0.22)',
  shadow: 'rgba(0,0,0,0.28)',
  white: '#FBF7EE',
  aim: 'rgba(255,255,255,0.85)',
  ghost: 'rgba(255,255,255,0.5)',
  bad: '#FF5A4E',
  cue: '#D9B27C',
  cueTip: '#3867D6',
};
export const BALL_COLORS = ['#FBF7EE', '#F2B124', '#2F5FD0', '#D93A2F', '#6B3FA0', '#F07A1A', '#1E8C4E', '#8A2B2B', '#15120E'];
export const ballColor = (id: number) => BALL_COLORS[id > 8 ? id - 8 : id];

/** Viền gỗ quanh mặt bàn (cm). */
export const RAIL = 8;

export interface View {
  scale: number;
  ox: number;
  oy: number;
}

export function viewOf(w: number, h: number): View {
  const scale = Math.min(w / (W + RAIL * 2), h / (H + RAIL * 2));
  return { scale, ox: (w - W * scale) / 2, oy: (h - H * scale) / 2 };
}

export function drawTable(ctx: CanvasRenderingContext2D, v: View, kitchen: boolean) {
  const { scale: k } = v;
  ctx.save();
  ctx.translate(v.ox, v.oy);
  ctx.scale(k, k);
  // Viền gỗ.
  ctx.fillStyle = C.railEdge;
  roundRect(ctx, -RAIL, -RAIL, W + RAIL * 2, H + RAIL * 2, 5);
  ctx.fill();
  ctx.fillStyle = C.rail;
  roundRect(ctx, -RAIL + 0.8, -RAIL + 0.8, W + RAIL * 2 - 1.6, H + RAIL * 2 - 1.6, 4.4);
  ctx.fill();
  // Mặt nỉ.
  ctx.fillStyle = C.felt;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = C.feltDark;
  ctx.lineWidth = 1.6;
  ctx.strokeRect(0.8, 0.8, W - 1.6, H - 1.6);
  // Chấm định vị trên viền.
  ctx.fillStyle = C.diamond;
  for (let i = 1; i < 4; i++) {
    for (const x of [-RAIL / 2, W + RAIL / 2]) {
      dot(ctx, x, (H / 8) * i, 0.8);
      dot(ctx, x, H / 2 + (H / 8) * i, 0.8);
    }
    for (const y of [-RAIL / 2, H + RAIL / 2]) dot(ctx, (W / 4) * i, y, 0.8);
  }
  // Vạch giao bóng và chấm đầu bàn.
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 0.5;
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.moveTo(0, HEAD_LINE);
  ctx.lineTo(W, HEAD_LINE);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = C.line;
  dot(ctx, FOOT.x, FOOT.y, 0.7);
  if (kitchen) {
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fillRect(0, HEAD_LINE, W, H - HEAD_LINE);
  }
  // Lỗ.
  ctx.fillStyle = C.pocket;
  for (const p of POCKETS) dot(ctx, Math.min(W + 0.6, Math.max(-0.6, p.x)), p.y, p.r * 0.95);
  ctx.restore();
}

export function drawBall(ctx: CanvasRenderingContext2D, v: View, id: number, x: number, y: number, alpha = 1, size = 1) {
  const k = v.scale;
  const px = v.ox + x * k;
  const py = v.oy + y * k;
  const r = R * k * size;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = C.shadow;
  dot(ctx, px + r * 0.18, py + r * 0.22, r);
  const kind = kindOf(id);
  ctx.fillStyle = kind === 'stripe' ? C.white : ballColor(id);
  dot(ctx, px, py, r);
  if (kind === 'stripe') {
    ctx.save();
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = ballColor(id);
    ctx.fillRect(px - r, py - r * 0.55, r * 2, r * 1.1);
    ctx.restore();
  }
  if (id !== 0) {
    ctx.fillStyle = C.white;
    dot(ctx, px, py, r * 0.42);
    if (r > 7) {
      ctx.fillStyle = '#15120E';
      ctx.font = `700 ${Math.round(r * 0.62)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(id), px, py + r * 0.04);
    }
  }
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  dot(ctx, px - r * 0.35, py - r * 0.38, r * 0.22);
  ctx.restore();
}

/** Đường ngắm, bóng bi ma ở điểm chạm, hướng đi của bi bị chạm và của bi cái. */
export function drawAim(
  ctx: CanvasRenderingContext2D,
  v: View,
  cue: { x: number; y: number },
  p: { x: number; y: number; hit: { x: number; y: number } | null; ox: number; oy: number; cx: number; cy: number },
  dx: number,
  dy: number,
  power: number,
  placeOk: boolean,
  /** 0..1: gậy lao tới bi cái (hoạt ảnh đánh). */
  strike = 0,
  /** Thời gian (ms) cho nét nhấp nháy của điểm chạm. */
  now = 0,
) {
  const k = v.scale;
  const P = (x: number, y: number) => [v.ox + x * k, v.oy + y * k] as const;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = placeOk ? C.aim : C.bad;
  ctx.lineWidth = Math.max(1, k * 0.35);
  ctx.setLineDash([k * 1.6, k * 1.2]);
  ctx.lineDashOffset = -(now / 60) % (k * 2.8);
  ctx.beginPath();
  ctx.moveTo(...P(cue.x, cue.y));
  ctx.lineTo(...P(p.x, p.y));
  ctx.stroke();
  ctx.setLineDash([]);
  // Bi ma ở điểm chạm đầu tiên.
  const [gx, gy] = P(p.x, p.y);
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.beginPath();
  ctx.arc(gx, gy, R * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = C.ghost;
  ctx.beginPath();
  ctx.arc(gx, gy, R * k, 0, Math.PI * 2);
  ctx.stroke();
  if (p.hit) {
    // Khoanh bi sẽ bị chạm.
    const pulse = 1 + 0.12 * Math.sin(now / 160);
    ctx.strokeStyle = placeOk ? C.aim : C.bad;
    ctx.beginPath();
    ctx.arc(...P(p.hit.x, p.hit.y), R * k * 1.45 * pulse, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Vòng lực quanh bi cái.
  if (power > 0.01 && placeOk) {
    ctx.strokeStyle = `hsl(${Math.round(120 - power * 120)} 85% 55%)`;
    ctx.lineWidth = Math.max(2, k * 0.7);
    ctx.beginPath();
    ctx.arc(...P(cue.x, cue.y), R * k * 2.3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * power);
    ctx.stroke();
    ctx.lineWidth = Math.max(1, k * 0.35);
  }
  if (p.hit) {
    const len = 26;
    ctx.strokeStyle = C.aim;
    ctx.beginPath();
    ctx.moveTo(...P(p.hit.x, p.hit.y));
    ctx.lineTo(...P(p.hit.x + p.ox * len, p.hit.y + p.oy * len));
    ctx.stroke();
    ctx.strokeStyle = C.ghost;
    ctx.beginPath();
    ctx.moveTo(...P(p.x, p.y));
    ctx.lineTo(...P(p.x + p.cx * len * 0.6, p.y + p.cy * len * 0.6));
    ctx.stroke();
  }
  // Gậy: lùi ra sau theo lực.
  const back = R + 0.3 + (1.2 + power * 18) * (1 - strike);
  const len = 70;
  const [ax, ay] = P(cue.x - dx * back, cue.y - dy * back);
  const [bx, by] = P(cue.x - dx * (back + len), cue.y - dy * (back + len));
  ctx.strokeStyle = C.cue;
  ctx.lineWidth = Math.max(2, k * 1.4);
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.stroke();
  ctx.strokeStyle = C.cueTip;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(...P(cue.x - dx * (back + 1.6), cue.y - dy * (back + 1.6)));
  ctx.stroke();
  ctx.restore();
}

export function drawHandRing(ctx: CanvasRenderingContext2D, v: View, x: number, y: number, ok: boolean) {
  const k = v.scale;
  ctx.save();
  ctx.strokeStyle = ok ? C.aim : C.bad;
  ctx.lineWidth = Math.max(1, k * 0.4);
  ctx.setLineDash([k * 1.2, k * 1]);
  ctx.beginPath();
  ctx.arc(v.ox + x * k, v.oy + y * k, R * k * 2.1, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export interface PocketFx {
  id: number;
  x: number;
  y: number;
  t0: number;
}
export const POCKET_FX_MS = 420;

/** Bi rơi lỗ: thu nhỏ, trượt vào tâm lỗ gần nhất và vòng sóng lan ra. */
export function drawPocketFx(ctx: CanvasRenderingContext2D, v: View, fx: PocketFx, now: number) {
  const t = Math.min(1, (now - fx.t0) / POCKET_FX_MS);
  const e = 1 - (1 - t) * (1 - t);
  let best = POCKETS[0];
  for (const p of POCKETS) if ((p.x - fx.x) ** 2 + (p.y - fx.y) ** 2 < (best.x - fx.x) ** 2 + (best.y - fx.y) ** 2) best = p;
  const x = fx.x + (best.x - fx.x) * e;
  const y = fx.y + (best.y - fx.y) * e;
  drawBall(ctx, v, fx.id, x, y, 1 - t * 0.6, Math.max(0.05, 1 - e));
  const k = v.scale;
  ctx.save();
  ctx.globalAlpha = 1 - t;
  ctx.strokeStyle = C.aim;
  ctx.lineWidth = Math.max(1, k * 0.5);
  ctx.beginPath();
  ctx.arc(v.ox + best.x * k, v.oy + best.y * k, best.r * k * (0.8 + t * 0.9), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
