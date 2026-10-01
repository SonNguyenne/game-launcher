/**
 * Bản đồ: ghép từ hình tròn và hình con nhộng (đoạn thẳng có bán kính), có thể khoét lỗ nước.
 * Tọa độ tính theo bán kính sân R (1 = R), nên đổi cỡ sân chỉ cần đổi R.
 */

export interface Circle {
  x: number;
  y: number;
  r: number;
}

export interface Capsule {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  r: number;
}

export interface MapDef {
  id: MapId;
  label: string;
  circles: Circle[];
  capsules: Capsule[];
  holes: Circle[];
  /** Vị trí xuất phát: chia đều trên hình elip bán trục rx, ry, bắt đầu từ góc `from` (radian). */
  spawn: { rx: number; ry: number; from: number };
}

export type MapId = 'floe' | 'ring' | 'flower' | 'bridge' | 'stadium';
export type MapChoice = MapId | 'random';

const petal = (deg: number): Circle => {
  const a = (deg * Math.PI) / 180;
  return { x: Math.cos(a) * 0.62, y: Math.sin(a) * 0.62, r: 0.4 };
};

export const MAPS: Record<MapId, MapDef> = {
  floe: { id: 'floe', label: 'Tảng băng', circles: [{ x: 0, y: 0, r: 1 }], capsules: [], holes: [], spawn: { rx: 0.55, ry: 0.55, from: -Math.PI / 2 } },
  ring: {
    id: 'ring',
    label: 'Vành khuyên',
    circles: [{ x: 0, y: 0, r: 1 }],
    capsules: [],
    holes: [{ x: 0, y: 0, r: 0.4 }],
    spawn: { rx: 0.7, ry: 0.7, from: -Math.PI / 2 },
  },
  flower: {
    id: 'flower',
    label: 'Hoa băng',
    circles: [{ x: 0, y: 0, r: 0.5 }, petal(45), petal(135), petal(225), petal(315)],
    capsules: [],
    holes: [],
    spawn: { rx: 0.62, ry: 0.62, from: -Math.PI / 4 },
  },
  bridge: {
    id: 'bridge',
    label: 'Hai bờ',
    circles: [
      { x: -0.58, y: 0, r: 0.5 },
      { x: 0.58, y: 0, r: 0.5 },
    ],
    capsules: [{ ax: -0.2, ay: 0, bx: 0.2, by: 0, r: 0.14 }],
    holes: [],
    spawn: { rx: 0.58, ry: 0.32, from: Math.PI },
  },
  stadium: {
    id: 'stadium',
    label: 'Sân dài',
    circles: [],
    capsules: [{ ax: -0.72, ay: 0, bx: 0.72, by: 0, r: 0.52 }],
    holes: [],
    spawn: { rx: 0.75, ry: 0.3, from: Math.PI },
  },
};

export const MAP_IDS = Object.keys(MAPS) as MapId[];

/** Khoảng cách từ điểm tới đoạn thẳng của hình con nhộng. */
function capsuleDist(c: Capsule, x: number, y: number) {
  const dx = c.bx - c.ax;
  const dy = c.by - c.ay;
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((x - c.ax) * dx + (y - c.ay) * dy) / len)) : 0;
  return Math.hypot(x - (c.ax + dx * t), y - (c.ay + dy * t));
}

/** Điểm (tọa độ thế giới) có nằm trên băng không; `margin` > 0 đòi phải vào trong mép chừng đó. */
export function onIce(map: MapDef, R: number, x: number, y: number, margin = 0) {
  const u = x / R;
  const v = y / R;
  const m = margin / R;
  if (map.holes.some((h) => Math.hypot(u - h.x, v - h.y) < h.r + m)) return false;
  return map.circles.some((c) => Math.hypot(u - c.x, v - c.y) <= c.r - m) || map.capsules.some((c) => capsuleDist(c, u, v) <= c.r - m);
}

/** Bán kính bao quanh cả bản đồ (theo R), để vừa khung hình. */
export function extentOf(map: MapDef) {
  const ends = [
    ...map.circles.map((c) => Math.hypot(c.x, c.y) + c.r),
    ...map.capsules.flatMap((c) => [Math.hypot(c.ax, c.ay) + c.r, Math.hypot(c.bx, c.by) + c.r]),
  ];
  return Math.max(1, ...ends);
}

/** Vị trí xuất phát của người thứ i trong n người; luôn nằm trên băng. */
export function spawnPoint(map: MapDef, R: number, i: number, n: number) {
  if (n < 2) return onIce(map, R, 0, 0, 20) ? { x: 0, y: 0 } : { x: map.spawn.rx * R, y: 0 };
  const a = map.spawn.from + (i * 2 * Math.PI) / n;
  let x = Math.cos(a) * map.spawn.rx * R;
  let y = Math.sin(a) * map.spawn.ry * R;
  // Rơi xuống nước thì kéo dần về giữa mảnh băng gần nhất.
  const { x: tx, y: ty } = nearestCore(map, x / R, y / R);
  for (let tries = 0; tries < 20 && !onIce(map, R, x, y, 24); tries++) {
    x += (tx * R - x) * 0.2;
    y += (ty * R - y) * 0.2;
  }
  return { x, y };
}

/** Tâm của mảnh băng gần điểm (u, v) nhất (theo R): tâm đảo tròn, hoặc điểm gần nhất trên trục hình con nhộng. */
function nearestCore(map: MapDef, u: number, v: number) {
  const cores = [
    ...map.circles.map((c) => ({ x: c.x, y: c.y, d: Math.hypot(u - c.x, v - c.y) - c.r })),
    ...map.capsules.map((c) => {
      const dx = c.bx - c.ax;
      const dy = c.by - c.ay;
      const len = dx * dx + dy * dy;
      const t = len ? Math.max(0, Math.min(1, ((u - c.ax) * dx + (v - c.ay) * dy) / len)) : 0;
      const x = c.ax + dx * t;
      const y = c.ay + dy * t;
      return { x, y, d: Math.hypot(u - x, v - y) - c.r };
    }),
  ];
  return cores.reduce((a, b) => (b.d < a.d ? b : a), { x: 0, y: 0, d: Infinity });
}
