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
  /** Vị trí xuất phát: chia đều trên hình elip bán trục rx, ry tâm (cx, cy), bắt đầu từ góc `from` (radian). */
  spawn: { rx: number; ry: number; from: number; cx?: number; cy?: number };
}

export type MapId = 'floe' | 'ring' | 'flower' | 'bridge' | 'stadium' | 'cross' | 'swiss' | 'triad' | 'zigzag' | 'eight' | 'moon';
export type MapChoice = MapId | 'random';

/** Điểm trên vòng tròn bán kính `d`, góc `deg` độ. */
const at = (deg: number, d: number) => {
  const a = (deg * Math.PI) / 180;
  return { x: Math.cos(a) * d, y: Math.sin(a) * d };
};
const petal = (deg: number): Circle => ({ ...at(deg, 0.62), r: 0.4 });
const link = (a: { x: number; y: number }, b: { x: number; y: number }, r: number): Capsule => ({ ax: a.x, ay: a.y, bx: b.x, by: b.y, r });
const islands = [at(-90, 0.62), at(30, 0.62), at(150, 0.62)];
const zig = [
  { x: -0.95, y: -0.3 },
  { x: -0.32, y: 0.3 },
  { x: 0.32, y: -0.3 },
  { x: 0.95, y: 0.3 },
];

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
  cross: {
    id: 'cross',
    label: 'Ngã tư',
    circles: [{ x: 0, y: 0, r: 0.42 }],
    capsules: [
      { ax: -0.9, ay: 0, bx: 0.9, by: 0, r: 0.27 },
      { ax: 0, ay: -0.9, bx: 0, by: 0.9, r: 0.27 },
    ],
    holes: [],
    spawn: { rx: 0.72, ry: 0.72, from: -Math.PI / 2 },
  },
  swiss: {
    id: 'swiss',
    label: 'Băng thủng',
    circles: [{ x: 0, y: 0, r: 1 }],
    capsules: [],
    holes: [{ x: 0, y: 0, r: 0.16 }, ...[45, 135, 225, 315].map((d) => ({ ...at(d, 0.4), r: 0.12 })), ...[0, 90, 180, 270].map((d) => ({ ...at(d, 0.9), r: 0.1 }))],
    spawn: { rx: 0.66, ry: 0.66, from: -Math.PI / 4 },
  },
  triad: {
    id: 'triad',
    label: 'Ba đảo',
    circles: islands.map((c) => ({ ...c, r: 0.42 })),
    capsules: [link(islands[0], islands[1], 0.1), link(islands[1], islands[2], 0.1), link(islands[2], islands[0], 0.1)],
    holes: [],
    spawn: { rx: 0.62, ry: 0.62, from: -Math.PI / 2 },
  },
  zigzag: {
    id: 'zigzag',
    label: 'Đường gấp khúc',
    circles: zig.map((c) => ({ ...c, r: 0.27 })),
    capsules: [link(zig[0], zig[1], 0.24), link(zig[1], zig[2], 0.24), link(zig[2], zig[3], 0.24)],
    holes: [],
    spawn: { rx: 0.8, ry: 0.3, from: Math.PI },
  },
  eight: {
    id: 'eight',
    label: 'Số tám',
    circles: [
      { x: 0, y: -0.52, r: 0.56 },
      { x: 0, y: 0.52, r: 0.56 },
    ],
    capsules: [],
    holes: [
      { x: 0, y: -0.52, r: 0.17 },
      { x: 0, y: 0.52, r: 0.17 },
    ],
    spawn: { rx: 0.34, ry: 0.86, from: -Math.PI / 2 },
  },
  moon: {
    id: 'moon',
    label: 'Trăng khuyết',
    circles: [{ x: 0, y: 0, r: 1 }],
    capsules: [],
    holes: [{ x: 0.62, y: 0, r: 0.62 }],
    spawn: { rx: 0.42, ry: 0.72, from: Math.PI, cx: -0.48 },
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
  if (n < 2) return onIce(map, R, 0, 0, 24) ? { x: 0, y: 0 } : nearestSafe(map, R, 0, 0, 24);
  const { rx, ry, from, cx = 0, cy = 0 } = map.spawn;
  const a = from + (i * 2 * Math.PI) / n;
  let x = (cx + Math.cos(a) * rx) * R;
  let y = (cy + Math.sin(a) * ry) * R;
  // Rơi xuống nước thì kéo dần về giữa mảnh băng gần nhất.
  const { x: tx, y: ty } = nearestCore(map, x / R, y / R);
  for (let tries = 0; tries < 20 && !onIce(map, R, x, y, 24); tries++) {
    x += (tx * R - x) * 0.2;
    y += (ty * R - y) * 0.2;
  }
  return onIce(map, R, x, y, 24) ? { x, y } : nearestSafe(map, R, x, y, 24);
}

/** Điểm trên băng (vào trong mép ít nhất `margin`) gần (x, y) nhất, dò theo lưới. */
export function nearestSafe(map: MapDef, R: number, x: number, y: number, margin: number) {
  const ext = extentOf(map) * R;
  const gap = R * 0.04;
  let best = { x: 0, y: 0 };
  let bestD = Infinity;
  for (let gx = -ext; gx <= ext; gx += gap) {
    for (let gy = -ext; gy <= ext; gy += gap) {
      const d = Math.hypot(gx - x, gy - y);
      if (d < bestD && onIce(map, R, gx, gy, margin)) {
        bestD = d;
        best = { x: gx, y: gy };
      }
    }
  }
  return best;
}

/**
 * Các chỗ đặt vòng vua / cá: rải đều trên băng (chọn lần lượt điểm xa các điểm đã chọn nhất, bắt đầu gần tâm),
 * tính theo bán kính sân 1 nên mọi máy ra cùng kết quả.
 */
export function spotsOf(map: MapDef, margin: number, count = 6) {
  const ext = extentOf(map);
  const grid: { x: number; y: number }[] = [];
  for (let gx = -ext; gx <= ext + 1e-9; gx += 0.05) {
    for (let gy = -ext; gy <= ext + 1e-9; gy += 0.05) if (onIce(map, 1, gx, gy, margin)) grid.push({ x: gx, y: gy });
  }
  if (!grid.length) return [{ x: 0, y: 0 }];
  const spots = [grid.reduce((a, b) => (Math.hypot(b.x, b.y) < Math.hypot(a.x, a.y) ? b : a))];
  while (spots.length < count) {
    let far = grid[0];
    let farD = -1;
    for (const p of grid) {
      const d = Math.min(...spots.map((q) => Math.hypot(p.x - q.x, p.y - q.y)));
      if (d > farD) {
        farD = d;
        far = p;
      }
    }
    if (farD < 0.2) break;
    spots.push(far);
  }
  return spots;
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
