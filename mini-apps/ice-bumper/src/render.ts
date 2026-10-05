import type { Hat, PenguinSkin } from './avatar';
import { BALL_FULL, BODY_R } from './sim';
import { onIce, type Capsule, type MapDef } from './maps';

/** Bảng màu của trận: biển fjord, băng trắng; cam phao cứu sinh nằm ở CSS (nút bắn, giây cuối). */
export const COLORS = {
  sea: '#0F3550',
  seaDeep: '#0A2740',
  ripple: 'rgba(160, 214, 236, 0.16)',
  ice: '#F2FAFD',
  iceShade: '#B9DDEB',
  iceSide: '#7FB6CE',
  crack: 'rgba(98, 160, 189, 0.55)',
  ink: '#13202E',
  belly: '#FFFFFF',
  beak: '#FFB000',
  snow: '#FFFFFF',
  snowShade: '#CFE6F0',
} as const;

export interface PenguinPose {
  x: number;
  y: number;
  face: number;
  ball: number;
  skin: PenguinSkin;
  /** 0..1: đang chìm xuống nước. */
  sink?: number;
  /** Nhún nhẹ khi đứng chờ (ms). */
  bob?: number;
  /** Vừa quay lại sân, đang được miễn va chạm: vẽ mờ. */
  ghost?: boolean;
}

/** Mép băng lởm chởm, cố định theo hiệp để hai máy vẽ giống nhau. */
export function floeShape(seed: number) {
  const n = 72;
  const k = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return 1 + 0.022 * Math.sin(5 * a + seed) + 0.014 * Math.sin(13 * a + seed * 2.3) + 0.008 * Math.sin(29 * a + seed * 0.7);
  });
  const cracks = Array.from({ length: 11 }, (_, i) => {
    const a = (i / 11) * Math.PI * 2 + Math.sin(seed + i) * 0.25;
    return { a, len: 0.12 + 0.08 * Math.abs(Math.sin(seed * 3 + i)), bend: Math.sin(seed + i * 1.7) * 0.06 };
  });
  return { k, cracks };
}
export type Floe = ReturnType<typeof floeShape>;

/** Viền lởm chởm của một đảo tròn tâm (cx, cy), thêm vào path hiện tại. */
function circlePath(ctx: CanvasRenderingContext2D, floe: Floe, cx: number, cy: number, r: number, dy: number, phase: number) {
  const n = floe.k.length;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * floe.k[(i + phase) % n];
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr + dy;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function capsulePath(ctx: CanvasRenderingContext2D, c: Capsule, R: number, dy: number) {
  const a = Math.atan2(c.by - c.ay, c.bx - c.ax);
  ctx.moveTo(c.ax * R + Math.cos(a + Math.PI / 2) * c.r * R, c.ay * R + Math.sin(a + Math.PI / 2) * c.r * R + dy);
  ctx.arc(c.ax * R, c.ay * R + dy, c.r * R, a + Math.PI / 2, a + (Math.PI * 3) / 2);
  ctx.arc(c.bx * R, c.by * R + dy, c.r * R, a - Math.PI / 2, a + Math.PI / 2);
  ctx.closePath();
}

/** Cả bản đồ thành một path (các mảnh chồng lên nhau, tô kiểu nonzero ra phần hợp). */
function mapPath(ctx: CanvasRenderingContext2D, floe: Floe, map: MapDef, R: number, dy = 0) {
  ctx.beginPath();
  map.circles.forEach((c, i) => circlePath(ctx, floe, c.x * R, c.y * R, c.r * R, dy, i * 17));
  map.capsules.forEach((c) => capsulePath(ctx, c, R, dy));
}

/** Biển: nền đậm dần ra mép và vài vòng sóng lan ra từ tảng băng. */
export function drawSea(ctx: CanvasRenderingContext2D, w: number, h: number, cx: number, cy: number, iceR: number, time: number) {
  const g = ctx.createRadialGradient(cx, cy, iceR * 0.8, cx, cy, Math.max(w, h) * 0.75);
  g.addColorStop(0, COLORS.sea);
  g.addColorStop(1, COLORS.seaDeep);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const p = ((time / 3200 + i / 3) % 1 + 1) % 1;
    ctx.strokeStyle = `rgba(160, 214, 236, ${0.18 * (1 - p)})`;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(0, iceR) + 14 + p * 120, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/** Bản đồ băng: thành băng nhô khỏi mặt nước, mặt băng có vết nứt từ mép vào, lỗ nước có thành băng bên trong. */
export function drawFloe(ctx: CanvasRenderingContext2D, floe: Floe, map: MapDef, R: number, center = true) {
  ctx.fillStyle = COLORS.iceSide;
  mapPath(ctx, floe, map, R, 10);
  ctx.fill();
  ctx.fillStyle = COLORS.iceShade;
  mapPath(ctx, floe, map, R, 5);
  ctx.fill();
  ctx.fillStyle = COLORS.ice;
  mapPath(ctx, floe, map, R);
  ctx.fill();

  // Vết nứt từ mép các đảo tròn vào trong.
  ctx.save();
  mapPath(ctx, floe, map, R);
  ctx.clip();
  ctx.strokeStyle = COLORS.crack;
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  for (const circle of map.circles) {
    const r = circle.r * R;
    const ox = circle.x * R;
    const oy = circle.y * R;
    for (const c of floe.cracks) {
      const from = r * (1 - c.len);
      ctx.beginPath();
      ctx.moveTo(ox + Math.cos(c.a) * r, oy + Math.sin(c.a) * r);
      ctx.lineTo(ox + Math.cos(c.a + c.bend) * (from + r * c.len * 0.5), oy + Math.sin(c.a + c.bend) * (from + r * c.len * 0.5));
      ctx.lineTo(ox + Math.cos(c.a - c.bend) * from, oy + Math.sin(c.a - c.bend) * from);
      ctx.stroke();
    }
  }
  // Vòng tâm mờ: hết giờ ai đứng gần tâm nhất thắng (bỏ qua khi tâm là lỗ nước).
  if (center && onIce(map, R, 0, 0) && !map.holes.some((h) => Math.hypot(h.x, h.y) < h.r + 0.28)) {
    ctx.strokeStyle = 'rgba(127, 182, 206, 0.7)';
    ctx.setLineDash([3, 9]);
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();

  // Lỗ nước: thấy thành băng ở mép trên của lỗ. Chỉ vẽ trong tảng băng (lỗ khoét lẹm ra mép như trăng khuyết).
  ctx.save();
  mapPath(ctx, floe, map, R);
  ctx.clip();
  for (const h of map.holes) {
    ctx.fillStyle = COLORS.iceSide;
    ctx.beginPath();
    ctx.arc(h.x * R, h.y * R, h.r * R, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = COLORS.sea;
    ctx.beginPath();
    ctx.arc(h.x * R, h.y * R + 10, h.r * R, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

/** Cầu tuyết; `z` là độ cao khi đang bay vồng: bóng đổ ở mặt băng, cầu ở trên cao, bay càng cao bóng càng nhạt. */
export function drawSnowball(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, spin = 0, z = 0) {
  if (r <= 0.5) return;
  const lift = 1 / (1 + z / 40);
  ctx.fillStyle = `rgba(10, 39, 64, ${0.18 * lift})`;
  ctx.beginPath();
  ctx.ellipse(x + r * 0.15, y + r * 0.35, r * (0.6 + 0.4 * lift), r * 0.8 * (0.6 + 0.4 * lift), 0, 0, Math.PI * 2);
  ctx.fill();
  const cy = y - z;
  const g = ctx.createRadialGradient(x - r * 0.35, cy - r * 0.4, r * 0.1, x, cy, r);
  g.addColorStop(0, COLORS.snow);
  g.addColorStop(1, COLORS.snowShade);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, cy, r, 0, Math.PI * 2);
  ctx.fill();
  // Vài vệt tuyết dính, xoay theo đường lăn.
  ctx.fillStyle = 'rgba(127, 182, 206, 0.45)';
  for (let i = 0; i < 3; i++) {
    const a = spin + i * 2.1;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55, Math.max(1, r * 0.12), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHat(ctx: CanvasRenderingContext2D, hat: Hat, color: string) {
  const R = BODY_R;
  if (hat === 'beanie') {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(-R * 0.2, 0, R * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(-R * 0.2, 0, R * 0.22, 0, Math.PI * 2);
    ctx.fill();
  } else if (hat === 'crown') {
    ctx.fillStyle = '#FFC000';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const rr = i % 2 ? R * 0.32 : R * 0.62;
      ctx.lineTo(-R * 0.2 + Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
  } else if (hat === 'viking') {
    ctx.fillStyle = '#F2E6CF';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(-R * 0.3, s * R * 0.35);
      ctx.quadraticCurveTo(-R * 0.1, s * R * 1.25, R * 0.35, s * R * 1.05);
      ctx.lineTo(-R * 0.05, s * R * 0.3);
      ctx.fill();
    }
    ctx.fillStyle = '#8A97A6';
    ctx.beginPath();
    ctx.arc(-R * 0.2, 0, R * 0.55, 0, Math.PI * 2);
    ctx.fill();
  } else if (hat === 'party') {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-R * 1.15, 0);
    ctx.lineTo(-R * 0.1, -R * 0.45);
    ctx.lineTo(-R * 0.1, R * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-R * 1.15, 0, R * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Cánh cụt nhìn từ trên xuống, mặt hướng `face`, đẩy cầu tuyết phía trước. */
export function drawPenguin(ctx: CanvasRenderingContext2D, p: PenguinPose) {
  const R = BODY_R;
  const sink = p.sink ?? 0;
  const bob = p.bob ? Math.sin(p.bob / 260) * 1.2 : 0;
  ctx.save();
  ctx.translate(p.x, p.y + bob);
  ctx.globalAlpha = (1 - sink) * (p.ghost ? 0.45 : 1);
  ctx.scale(1 - sink * 0.6, 1 - sink * 0.6);

  // Cầu tuyết trước mặt (vẽ trước để thân đè lên mép cầu).
  if (p.ball > 0.5 && sink === 0) {
    const d = R + p.ball;
    drawSnowball(ctx, Math.cos(p.face) * d, Math.sin(p.face) * d, p.ball, (p.x + p.y) / Math.max(4, p.ball));
  }

  ctx.rotate(p.face);
  // Bóng đổ.
  ctx.fillStyle = 'rgba(10, 39, 64, 0.22)';
  ctx.beginPath();
  ctx.ellipse(1, 5, R * 1.25, R * 1.05, 0, 0, Math.PI * 2);
  ctx.fill();
  // Xe trượt màu áo.
  ctx.fillStyle = p.skin.color;
  ctx.beginPath();
  ctx.roundRect(-R * 1.3, -R * 0.95, R * 2.25, R * 1.9, R * 0.8);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(-R * 1.3, -R * 0.12, R * 0.5, R * 0.24);
  // Thân.
  ctx.fillStyle = COLORS.ink;
  ctx.beginPath();
  ctx.ellipse(0, 0, R * 0.95, R * 0.82, 0, 0, Math.PI * 2);
  ctx.fill();
  // Bụng trắng và mắt hướng về phía trước.
  ctx.fillStyle = COLORS.belly;
  ctx.beginPath();
  ctx.ellipse(R * 0.32, 0, R * 0.52, R * 0.56, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.ink;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(R * 0.5, s * R * 0.24, R * 0.09, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = COLORS.beak;
  ctx.beginPath();
  ctx.moveTo(R * 0.78, -R * 0.14);
  ctx.lineTo(R * 1.12, 0);
  ctx.lineTo(R * 0.78, R * 0.14);
  ctx.closePath();
  ctx.fill();
  // Khăn quàng.
  ctx.strokeStyle = p.skin.color;
  ctx.lineWidth = R * 0.2;
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.62, Math.PI * 0.62, Math.PI * 1.38);
  ctx.stroke();
  drawHat(ctx, p.skin.hat, p.skin.color);
  ctx.restore();
}

/** Tên trên đầu; máy mình có mũi tên màu áo để dễ tìm. */
export function drawTag(ctx: CanvasRenderingContext2D, x: number, y: number, name: string, color: string, mine: boolean, zoom: number) {
  const size = Math.max(10, 12 / zoom);
  ctx.font = `700 ${size}px "Be Vietnam Pro", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  const ty = y - BODY_R * 1.55;
  ctx.lineWidth = 3.5 / zoom;
  ctx.strokeStyle = 'rgba(10, 39, 64, 0.85)';
  ctx.strokeText(name, x, ty);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(name, x, ty);
  if (mine) {
    ctx.fillStyle = color;
    const ay = ty - size - 3;
    ctx.beginPath();
    ctx.moveTo(x - 6, ay - 7);
    ctx.lineTo(x + 6, ay - 7);
    ctx.lineTo(x, ay);
    ctx.closePath();
    ctx.fill();
  }
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
  /** ring: vòng sóng khi rơi xuống nước; puff: bụi tuyết khi va chạm. */
  kind: 'puff' | 'ring';
}

export function puff(list: Particle[], x: number, y: number, power: number) {
  const n = Math.min(14, 4 + Math.round(power / 60));
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 40 + Math.random() * power * 0.4;
    list.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 2 + Math.random() * 3, life: 1, kind: 'puff' });
  }
}

export function splash(list: Particle[], x: number, y: number) {
  for (let i = 0; i < 3; i++) list.push({ x, y, vx: 0, vy: 0, r: 8 + i * 6, life: 1 + i * 0.25, kind: 'ring' });
}

export function drawParticles(ctx: CanvasRenderingContext2D, list: Particle[], dt: number) {
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.life -= dt * (p.kind === 'ring' ? 0.9 : 2.2);
    if (p.life <= 0) {
      list.splice(i, 1);
      continue;
    }
    if (p.kind === 'puff') {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.9;
      p.vy *= 0.9;
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, p.life)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    } else {
      p.r += dt * 40;
      ctx.strokeStyle = `rgba(230, 246, 252, ${Math.min(1, p.life) * 0.8})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.r, p.r * 0.7, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

/** Độ đầy của cầu tuyết (0..1), dùng cho vòng sạc trên nút bắn. */
export const ballCharge = (ball: number) => Math.max(0, Math.min(1, ball / BALL_FULL));

/** Vàng vương miện của vòng vua; cam phao khi bị tranh. */
const CROWN = '#FFC93C';
const CONTEST = '#FF6A2B';

export interface ZoneLook {
  /** Màu áo người đang đứng riêng trong vòng (đang tích giây). */
  owner?: string | null;
  /** Từ hai người trở lên trong vòng: không ai được tính. */
  contested?: boolean;
  /** Tiến độ của người đang giữ, 0..1, vẽ thành cung quanh vòng. */
  progress?: number;
  /** 0..1: vẽ mờ, nét đứt (chỗ vòng sắp dời tới). */
  fade?: number;
}

/** Vương miện nhỏ, tâm (x, y), cỡ s. */
function crown(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(x - s, y + s * 0.5);
  ctx.lineTo(x - s, y - s * 0.4);
  ctx.lineTo(x - s * 0.5, y + s * 0.05);
  ctx.lineTo(x, y - s * 0.6);
  ctx.lineTo(x + s * 0.5, y + s * 0.05);
  ctx.lineTo(x + s, y - s * 0.4);
  ctx.lineTo(x + s, y + s * 0.5);
  ctx.closePath();
}

/**
 * Vòng vua trên mặt băng. Trống: vàng nhịp nhẹ. Một người đứng riêng: tô màu áo người đó, cung tiến độ chạy quanh.
 * Bị tranh: viền cam nét đứt chạy vòng, kèm chữ "Đang tranh" để biết vì sao không ai được giây.
 */
export function drawZone(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, time: number, look: ZoneLook = {}) {
  const { owner = null, contested = false, progress = 0, fade = 1 } = look;
  const pulse = 0.5 + 0.5 * Math.sin(time / 300);
  const edge = contested ? CONTEST : (owner ?? CROWN);
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.fillStyle = contested ? 'rgba(255, 106, 43, 0.14)' : owner ? `${owner}2E` : 'rgba(255, 201, 60, 0.16)';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 4 + pulse * 2;
  ctx.strokeStyle = edge;
  if (fade < 1) ctx.setLineDash([8, 8]);
  else if (contested) {
    ctx.setLineDash([12, 9]);
    ctx.lineDashOffset = -time / 40;
  }
  ctx.stroke();
  ctx.setLineDash([]);
  // Cung tiến độ của người đang giữ: chạy từ đỉnh theo chiều kim đồng hồ.
  if (owner && progress > 0 && fade === 1) {
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(x, y, r + 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, progress));
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.strokeStyle = owner;
    ctx.stroke();
  }
  const s = Math.max(10, r * 0.22);
  ctx.globalAlpha = fade * 0.55;
  ctx.fillStyle = edge;
  ctx.strokeStyle = 'rgba(10, 39, 64, 0.6)';
  ctx.lineWidth = 2;
  crown(ctx, x, y, s);
  ctx.fill();
  ctx.stroke();
  if (contested && fade === 1) {
    ctx.globalAlpha = 1;
    ctx.font = `800 ${Math.max(12, r * 0.2)}px "Be Vietnam Pro", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(10, 39, 64, 0.85)';
    ctx.strokeText('Đang tranh', x, y + r + 20);
    ctx.fillStyle = CONTEST;
    ctx.fillText('Đang tranh', x, y + r + 20);
  }
  ctx.restore();
}

/** Vòng sáng dưới chân người đang ôm cá, màu áo, nhịp nhanh để dễ tìm giữa đám đông. */
export function drawHolderRing(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, time: number) {
  const pulse = 0.5 + 0.5 * Math.sin(time / 160);
  ctx.save();
  ctx.lineWidth = 3;
  ctx.strokeStyle = CROWN;
  ctx.globalAlpha = 0.6 + 0.4 * pulse;
  ctx.beginPath();
  ctx.ellipse(x, y + 4, BODY_R * (1.55 + 0.15 * pulse), BODY_R * (1.25 + 0.12 * pulse), 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.ellipse(x, y + 4, BODY_R * 1.35, BODY_R * 1.08, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/**
 * Con cá bạc. Nằm trên băng: quẫy nhẹ, có vòng sáng vàng nhịp dưới bụng để thấy từ xa.
 * Đang được ôm (`lift` > 0): nảy trên đầu người ôm, to hơn một chút.
 */
export function drawFish(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, time: number, lift = 0) {
  const wiggle = Math.sin(time / 120) * 0.25;
  ctx.save();
  if (!lift) {
    const pulse = 0.5 + 0.5 * Math.sin(time / 220);
    ctx.strokeStyle = CROWN;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.4 + 0.5 * pulse;
    ctx.beginPath();
    ctx.ellipse(x, y + 3, r * (1.9 + 0.5 * pulse), r * (1.3 + 0.35 * pulse), 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // Bóng đổ trên băng.
  ctx.fillStyle = 'rgba(10, 39, 64, 0.22)';
  ctx.beginPath();
  ctx.ellipse(x + 2, y + 4, r * 1.1, r * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  const bounce = lift ? Math.abs(Math.sin(time / 180)) * 4 : 0;
  ctx.translate(x, y - lift - bounce);
  if (lift) ctx.scale(1.25, 1.25);
  ctx.rotate(-0.35 + wiggle);
  ctx.fillStyle = '#9CC9DE';
  ctx.strokeStyle = '#0A2740';
  ctx.lineWidth = 2;
  // Đuôi.
  ctx.beginPath();
  ctx.moveTo(-r * 0.8, 0);
  ctx.lineTo(-r * 1.5, -r * 0.6);
  ctx.lineTo(-r * 1.5, r * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Thân.
  ctx.fillStyle = '#D8EEF7';
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#FF6A2B';
  ctx.beginPath();
  ctx.ellipse(-r * 0.1, r * 0.12, r * 0.55, r * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0A2740';
  ctx.beginPath();
  ctx.arc(r * 0.55, -r * 0.12, r * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
