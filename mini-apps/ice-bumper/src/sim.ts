import { MAPS, onIce, spawnPoint, spotsOf, type MapDef, type MapId } from './maps';

/**
 * Vật lý của trận đấu, tách khỏi React và mạng.
 * Chủ phòng chạy bản gốc (bước cố định 60 lần/giây) và phát ảnh chụp; máy khách chạy cùng hàm này
 * để đoán trước giữa hai ảnh chụp, nên chuyển động trên mọi máy giống nhau.
 * Đơn vị: điểm ảnh ảo (sân cỡ vừa có bán kính ICE_R) và giây.
 */

export const STEP = 1 / 60;
export const ICE_R = 230;
export const BODY_R = 22;
/** Đếm 3-2-1 trước khi được lái. */
export const COUNTDOWN_MS = 3000;
/** Thời gian mỗi hiệp mặc định (giây); hết giờ thì ai đứng gần tâm băng nhất thắng. 0 là vô hạn. */
export const ROUND_SECONDS = 60;

/** Gia tốc trọng trường theo đơn vị của game (1 đơn vị ≈ 1 cm). */
const G = 981;
/** Khối lượng một chú cánh cụt; mọi khối lượng khác tính theo đơn vị này. */
const PENGUIN_MASS = 1;
/** Khối lượng riêng của tuyết xốp: cầu bán kính 60 nặng bằng một chú cánh cụt (khối lượng ∝ r³). */
const SNOW_DENSITY = 1 / 60 ** 3;
/** Lực đạp chân tối đa, và công suất chân (chạy càng nhanh lực càng giảm: F = P / v). */
const LEG_FORCE = 600;
const LEG_POWER = LEG_FORCE * 110;
/** Chân chỉ đạp được tới tốc độ này; bị húc thì vẫn trượt nhanh hơn được. */
const RUN_SPEED = 210;
/** Tốc độ quay người khi không đẩy gì; đẩy cầu nặng thì quay chậm hơn. */
const TURN_RATE = 6;
/** Hệ số ma sát trượt của cánh cụt trên băng: thanh độ trơn nội suy giữa hai mức (theo cấp số nhân). */
const MU_GRIP = 0.6;
const MU_SLICK = 0.06;
/** Độ bám của chân khi đạp (ma sát nghỉ, lớn hơn ma sát trượt): giới hạn lực đạp và lực chống trượt ngang. */
const tractionOf = (mu: number) => (mu * 1.5 + 0.25) * G * PENGUIN_MASS;
/** Cầu tuyết lăn: ma sát lăn nhỏ hơn nhiều so với trượt. */
const MU_ROLL = 0.025;
/** Lực cản không khí (∝ v²), chỉ đáng kể khi văng rất nhanh. */
const AIR = 0.0006;
/** Hệ số hồi phục: thân cánh cụt nảy vừa; tuyết va vào thì gần như dính, mất nhiều năng lượng. */
const E_BODY = 0.5;
const E_SNOW = 0.2;
/** Lăn 1 đơn vị đường thì cầu dày thêm chừng này (lớp tuyết dính vào), nên cầu lớn theo quãng đường lăn. */
const GROW_PER_UNIT = 0.032;
/** Cầu bắn ra chậm hơn thế này coi như dừng, tan trong SHOT_MELT giây. */
const SHOT_STOP = 12;
/** Bắn vồng: góc đá lên so với mặt băng. */
const LOB_ANGLE = (30 * Math.PI) / 180;
/** Bắn vồng: điểm rơi gần nhất / xa nhất, tính theo bán kính sân R. */
const LOB_NEAR = 0.25;
const LOB_FAR = 1.1;
/** Tốc độ cầu rời chân (mọi cỡ như nhau), và mức người giật lùi nhẹ khi bắn. */
const SHOT_SPEED = 500;
const SHOT_RECOIL = 35;
/** Cầu chạm đất: nảy lại một phần vận tốc đứng, ma sát lúc va đất làm mất bớt vận tốc ngang. */
const LAND_BOUNCE = 0.3;
const LAND_FRICTION = 0.5;
/** Cầu đã bắn lăn trên băng phủ tuyết: ma sát lăn lớn hơn cầu đang được đẩy. */
const MU_SHOT_ROLL = 0.1;
/** Cầu bay thấp hơn chừng này thì vẫn trúng người (chiều cao cánh cụt). */
const PENGUIN_HEIGHT = 40;
const SHOT_MELT = 0.8;
/** Trúng cầu bắn thì người bị đẩy văng mạnh gấp chừng này so với vật lý (cầu không vỡ, bật ra lăn tiếp). */
const SHOT_KNOCK = 2.5;
/** Nút thắng: hệ số ma sát khi cắm chân, và đứng tấn thì "nặng" thêm chừng này lần khi bị va (bị đẩy văng ít hơn). */
const BRAKE_MU = 0.9;
const BRACE_MASS = 4;
/** Bắn thẳng: cầu từ cỡ này trở lên bay chậm dần, cầu to nhất chỉ còn BIG_SHOT_SLOW tốc độ (để còn kịp né hoặc đứng tấn). */
const BIG_SHOT_FROM = 20;
const BIG_SHOT_SLOW = 0.55;
const SHOT_COOLDOWN = 0.4;
/** Độ trơn 0..1 (0: bám, 1: rất trơn). */
export const SLIP = { min: 0, max: 1, step: 0.05, default: 0.35 } as const;
export const muOf = (slip: number) => MU_GRIP * (MU_SLICK / MU_GRIP) ** Math.max(0, Math.min(1, slip));
/** Cỡ sân: nhân với ICE_R. */
export const SCALE = { min: 0.7, max: 2.5, step: 0.05, default: 1.3 } as const;
export const BALL_MIN = 7;
/** Cầu tuyết lớn mãi khi còn lăn, chỉ dừng ở chừng này phần bán kính sân (lúc đó cũng gần như đẩy không nổi). */
const BALL_CAP = 0.35;
/** Cỡ cầu ứng với vòng sạc đầy trên nút bắn. */
export const BALL_FULL = 60;
/** Cầu tuyết nhỏ hơn thế này thì chưa bắn được. */
export const BALL_READY = 11;

/**
 * Chế độ chơi. classic: rơi là hết hiệp; lives: mỗi người LIVES mạng, rơi thì quay lại;
 * king: đứng một mình trong vòng vua để tích giây; fish: cướp cá và giữ lâu nhất. Hai chế độ sau rơi bao nhiêu lần cũng quay lại.
 */
export type ModeId = 'classic' | 'lives' | 'king' | 'fish';
export const MODE_IDS: ModeId[] = ['classic', 'lives', 'king', 'fish'];
export const LIVES = 3;
/** Rơi xuống nước thì chừng này sau quay lại sân, rồi được miễn va chạm (mờ đi) GHOST giây để kịp chạy. */
export const RESPAWN_MS = 1800;
const GHOST = 1.5;
/** Số giây cần tích để thắng hiệp ở chế độ vua đỉnh băng và giữ cá. */
export const KING_TARGET = 15;
export const FISH_TARGET = 20;
/** Vòng vua: bán kính (theo R), và cứ chừng này giây lại dời sang chỗ khác. */
const ZONE_R = 0.2;
export const ZONE_MOVE = 12;
/** Cá: bán kính, ôm cá thì chạy chậm lại, bị va mạnh hơn FISH_DROP thì văng cá ra và chưa ai nhặt được trong FISH_COOL giây. */
export const FISH_R = 15;
const FISH_SLOW = 0.82;
const FISH_DROP = 120;
const FISH_COOL = 0.5;
const FISH_SLIDE = 260;

export interface Input {
  /** Hướng lái (radian), null khi không chạm cần lái. */
  angle: number | null;
  /** Kéo cần lái mạnh cỡ nào (0..1): kéo nhẹ thì đi chậm, kéo hết thì chạy hết sức. Bàn phím luôn là 1. */
  power?: number;
  /** Số lần bấm bắn từ đầu hiệp; chủ phòng bắn khi thấy số này tăng. */
  shots: number;
  /** Kiểu của lần bắn gần nhất: 0 (hoặc không có) là chạm nhanh bắn thẳng; 0..1 là giữ nút bắn vồng, càng lớn càng xa. */
  lob?: number;
  /** Đang giữ nút thắng: cắm chân dừng gấp và đứng tấn chịu đòn. */
  brake?: boolean;
}

export interface Body {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Hướng mặt (radian). */
  face: number;
  /** Bán kính cầu tuyết đang ủi phía trước. */
  ball: number;
  cool: number;
  alive: boolean;
  /** Số lần bắn đã xử lý (so với Input.shots). */
  shots: number;
  /** Người húc mình gần nhất, để tính ai đẩy ai xuống nước. */
  hitBy: string | null;
  /** Đang đứng tấn (giữ thắng) ở bước này; tính lại mỗi bước từ điều khiển, không gửi qua mạng. */
  brace?: boolean;
  /** Số giây đã tích (vua đỉnh băng, giữ cá). */
  score: number;
  /** Số mạng còn lại (chế độ ba mạng). */
  lives: number;
  /** Đang chờ quay lại sân: giờ phòng (ms) lúc quay lại; 0 là không chờ. */
  back: number;
  /** Còn chừng này giây được miễn va chạm sau khi quay lại. */
  ghost: number;
  /** Số lần đã rơi, để mỗi cú rơi chỉ báo một lần. */
  downs: number;
}

/** Con cá ở chế độ giữ cá: nằm trên băng hoặc trong tay một người. */
export interface Fish {
  x: number;
  y: number;
  vx: number;
  vy: number;
  holder: string | null;
  cool: number;
  /** Lần đặt cá thứ mấy, để chọn chỗ đặt tiếp theo. */
  n: number;
}

export interface Shot {
  id: number;
  owner: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
  /** Độ cao so với mặt băng và vận tốc đứng (bắn vồng). */
  z: number;
  vz: number;
}

/** Sân của hiệp: bản đồ, bán kính và độ trơn. Máy nào cũng dựng từ trạng thái ván, không gửi qua ảnh chụp. */
export interface Arena {
  map: MapDef;
  R: number;
  /** Hệ số ma sát trượt μ. */
  mu: number;
  mode: ModeId;
  /** Các chỗ đặt vòng vua / cá (tọa độ thế giới). */
  spots: { x: number; y: number }[];
}

const clamp = (v: number, r: { min: number; max: number; default: number }) => (Number.isFinite(v) ? Math.max(r.min, Math.min(r.max, v)) : r.default);

const spotCache = new Map<MapId, { x: number; y: number }[]>();
function spotsFor(map: MapDef) {
  let spots = spotCache.get(map.id);
  if (!spots) spotCache.set(map.id, (spots = spotsOf(map, ZONE_R * 0.9)));
  return spots;
}

export function arenaOf(map: MapId, scale: number, slip: number, mode: ModeId = 'classic'): Arena {
  const def = MAPS[map] ?? MAPS.floe;
  const R = ICE_R * clamp(scale, SCALE);
  return {
    map: def,
    R,
    mu: muOf(clamp(slip, SLIP)),
    mode: MODE_IDS.includes(mode) ? mode : 'classic',
    spots: spotsFor(def).map((p) => ({ x: p.x * R, y: p.y * R })),
  };
}

export interface World {
  arena: Arena;
  /** Giờ chung của phòng ứng với trạng thái này (ms). */
  t: number;
  bodies: Record<string, Body>;
  shots: Shot[];
  nextShot: number;
  /** Số giây đã thực sự chơi (sau đếm ngược): vòng vua dời chỗ theo đồng hồ này. */
  play: number;
  fish: Fish | null;
}

export type SimEvent =
  | { type: 'shoot'; id: string; x: number; y: number }
  | { type: 'hit'; id: string; x: number; y: number; power: number }
  | { type: 'fall'; id: string; x: number; y: number }
  /** Cầu bắn ra lăn khỏi mép, rơi xuống nước. */
  | { type: 'splash'; x: number; y: number }
  /** Quay lại sân sau khi rơi. */
  | { type: 'back'; id: string; x: number; y: number }
  /** Nhặt được cá / làm văng cá. */
  | { type: 'grab'; id: string; x: number; y: number }
  | { type: 'drop'; id: string; x: number; y: number };

/** Vị trí xuất phát theo bản đồ, mặt quay vào tâm. */
export function spawn(ids: string[], t: number, arena: Arena): World {
  const bodies: Record<string, Body> = {};
  ids.forEach((id, i) => {
    const { x, y } = spawnPoint(arena.map, arena.R, i, ids.length);
    const face = x || y ? Math.atan2(-y, -x) : -Math.PI / 2;
    bodies[id] = { id, x, y, vx: 0, vy: 0, face, ball: BALL_MIN, cool: 0, alive: true, shots: 0, hitBy: null, score: 0, lives: LIVES, back: 0, ghost: 0, downs: 0 };
  });
  const fish = arena.mode === 'fish' ? placeFish(arena, 0) : null;
  return { arena, t, bodies, shots: [], nextShot: 1, play: 0, fish };
}

/** Đặt cá ở chỗ thứ n (lần đầu ở chỗ gần tâm nhất). */
function placeFish(arena: Arena, n: number): Fish {
  const p = arena.spots[n % arena.spots.length];
  return { x: p.x, y: p.y, vx: 0, vy: 0, holder: null, cool: n ? 0.6 : 0, n };
}

/** Vòng vua hiện tại (`ahead` = 1 là chỗ kế tiếp), null nếu không phải chế độ vua. */
export function zoneOf(w: World, ahead = 0) {
  if (w.arena.mode !== 'king') return null;
  const { spots, R } = w.arena;
  const p = spots[(Math.floor(w.play / ZONE_MOVE) + ahead) % spots.length];
  return { x: p.x, y: p.y, r: ZONE_R * R, left: ZONE_MOVE - (w.play % ZONE_MOVE) };
}

/** Rơi rồi có được quay lại không. */
const respawns = (w: World, b: Body) => w.arena.mode === 'king' || w.arena.mode === 'fish' || (w.arena.mode === 'lives' && b.lives > 0);

/** Quay lại sân: chọn chỗ xuất phát xa những người đang trên băng nhất. */
function revive(w: World, b: Body, events: SimEvent[]) {
  const { map, R } = w.arena;
  const others = Object.values(w.bodies).filter((o) => o.alive && o.id !== b.id);
  let best = spawnPoint(map, R, 0, 8);
  let bestD = -1;
  for (let i = 0; i < 8; i++) {
    const p = spawnPoint(map, R, i, 8);
    const d = Math.min(1e9, ...others.map((o) => Math.hypot(o.x - p.x, o.y - p.y)));
    if (d > bestD) {
      bestD = d;
      best = p;
    }
  }
  Object.assign(b, {
    x: best.x,
    y: best.y,
    vx: 0,
    vy: 0,
    face: best.x || best.y ? Math.atan2(-best.y, -best.x) : -Math.PI / 2,
    ball: BALL_MIN,
    cool: 0,
    alive: true,
    back: 0,
    ghost: GHOST,
    hitBy: null,
  });
  events.push({ type: 'back', id: b.id, x: b.x, y: b.y });
}

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const ballCenter = (b: Body) => ({ x: b.x + Math.cos(b.face) * (BODY_R + b.ball), y: b.y + Math.sin(b.face) * (BODY_R + b.ball) });
export const ballMass = (r: number) => SNOW_DENSITY * r ** 3;
/** Khối lượng cả người lẫn cầu đang đẩy (cầu dính trước mặt, đi cùng người). */
const massOf = (b: Body) => PENGUIN_MASS + ballMass(b.ball);

/** Trọng tâm của người và cầu: ra khỏi mép băng thì cả hai rơi. */
export function centerOfMass(b: Body) {
  const m = ballMass(b.ball);
  const c = ballCenter(b);
  const M = PENGUIN_MASS + m;
  return { x: (b.x * PENGUIN_MASS + c.x * m) / M, y: (b.y * PENGUIN_MASS + c.y * m) / M };
}

/** Ma sát Coulomb: giảm tốc độ một lượng cố định `decel·dt`, dừng hẳn chứ không đổi chiều. */
function slow(o: { vx: number; vy: number }, decel: number, dt: number) {
  const sp = Math.hypot(o.vx, o.vy);
  if (!sp) return;
  // Lực cản không khí ∝ v².
  const next = Math.max(0, sp - decel * dt - AIR * sp * sp * dt);
  o.vx *= next / sp;
  o.vy *= next / sp;
}

/** Vận tốc đứng của cầu bắn vồng: cố định để đỉnh vồng (~30) luôn thấp hơn đầu cánh cụt. */
const LOB_VZ = SHOT_SPEED * Math.sin(LOB_ANGLE);

/**
 * Vận tốc ban đầu của cầu khi bắn: cỡ nào cũng mạnh như nhau (không theo vật lý, để cầu to vẫn bắn đi được).
 * Bắn thẳng: lăn sát mặt băng. Bắn vồng: chọn vận tốc ngang để rơi đúng khoảng cách đã canh (tỉ lệ với bán kính sân).
 * Cầu còn mang sẵn vận tốc đang chạy của người. Sau khi rời chân thì bay, va chạm, ma sát theo vật lý.
 */
function launch(w: World, b: Body, lob: number) {
  const k = w.arena.R / ICE_R;
  const dx = Math.cos(b.face);
  const dy = Math.sin(b.face);
  const c = ballCenter(b);
  if (lob <= 0) {
    const slowdown = Math.max(BIG_SHOT_SLOW, 1 - ((1 - BIG_SHOT_SLOW) * Math.max(0, b.ball - BIG_SHOT_FROM)) / 50);
    const v = SHOT_SPEED * Math.sqrt(k) * slowdown;
    return { x: c.x, y: c.y, vx: b.vx + dx * v, vy: b.vy + dy * v, z: 0, vz: 0 };
  }
  const dist = (LOB_NEAR + (LOB_FAR - LOB_NEAR) * Math.min(1, lob)) * w.arena.R;
  const along = dist / ((2 * LOB_VZ) / G);
  return { x: c.x, y: c.y, vx: b.vx + dx * along, vy: b.vy + dy * along, z: 0.01, vz: LOB_VZ };
}

/**
 * Đường bay dự kiến của cú bắn vồng (để hiện khi đang giữ nút): các điểm trên đường bay và điểm rơi.
 * Dùng cùng công thức với lúc bắn thật nên điểm rơi khớp.
 */
export function lobPath(w: World, id: string, lob: number) {
  const b = w.bodies[id];
  if (!b?.alive) return null;
  const s = launch(w, b, Math.max(0.0001, lob));
  const T = (2 * s.vz) / G;
  const points: { x: number; y: number; z: number }[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = (T * i) / 16;
    points.push({ x: s.x + s.vx * t, y: s.y + s.vy * t, z: s.vz * t - (G * t * t) / 2 });
  }
  const end = points[points.length - 1];
  return { points, land: { x: end.x, y: end.y, safe: onIce(w.arena.map, w.arena.R, end.x, end.y) }, r: b.ball };
}

function fire(w: World, b: Body, events: SimEvent[], lob: number) {
  if (b.ball < BALL_READY || b.cool > 0) return;
  const s = launch(w, b, lob);
  w.shots.push({ id: w.nextShot++, owner: b.id, r: b.ball, life: 1, ...s });
  const dx = Math.cos(b.face);
  const dy = Math.sin(b.face);
  b.vx -= dx * SHOT_RECOIL;
  b.vy -= dy * SHOT_RECOIL;
  b.ball = BALL_MIN;
  b.cool = SHOT_COOLDOWN;
  events.push({ type: 'shoot', id: b.id, x: s.x, y: s.y });
}

interface Part {
  x: number;
  y: number;
  r: number;
  /** Vật mang khối lượng (người kèm cầu, hoặc cầu đã bắn). */
  o: { vx: number; vy: number; x: number; y: number };
  m: number;
}

/**
 * Va chạm hai hình tròn theo bảo toàn động lượng: xung lực j = (1+e)·v_rel / (1/m₁ + 1/m₂) dọc pháp tuyến.
 * Trả về xung lực (0 nếu không chạm hoặc đang tách ra).
 */
function collide(a: Part, b: Part, e: number, boost = 1) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy);
  const min = a.r + b.r;
  if (d >= min || d === 0) return 0;
  const nx = dx / d;
  const ny = dy / d;
  // Tách ra theo tỉ lệ khối lượng để không lồng vào nhau.
  const push = (min - d) / (a.m + b.m);
  a.o.x -= nx * push * b.m;
  a.o.y -= ny * push * b.m;
  b.o.x += nx * push * a.m;
  b.o.y += ny * push * a.m;
  const rel = (a.o.vx - b.o.vx) * nx + (a.o.vy - b.o.vy) * ny;
  if (rel <= 0) return 0;
  const j = ((1 + e) * rel) / (1 / a.m + 1 / b.m);
  a.o.vx -= (j / a.m) * nx;
  a.o.vy -= (j / a.m) * ny;
  // `boost` > 1: vật b bị đẩy mạnh hơn vật lý (dùng cho cú trúng cầu bắn).
  b.o.vx += ((j * boost) / b.m) * nx;
  b.o.vy += ((j * boost) / b.m) * ny;
  return j * boost;
}

/** Khối lượng khi va chạm: đứng tấn (giữ thắng) thì chân bám băng, coi như nặng hơn nên bị đẩy ít hơn. */
const hitMass = (b: Body) => massOf(b) * (b.brace ? BRACE_MASS : 1);
const bodyPart = (b: Body): Part => ({ x: b.x, y: b.y, r: BODY_R, o: b, m: hitMass(b) });
const ballPart = (b: Body): Part => ({ ...ballCenter(b), r: b.ball, o: b, m: hitMass(b) });
const shotPart = (s: Shot): Part => ({ x: s.x, y: s.y, r: s.r, o: s, m: ballMass(s.r) });

/** Chạy một bước STEP. Sửa trực tiếp `w` cho nhanh; trả về các sự kiện để phát tiếng và hiệu ứng. */
export function step(w: World, inputs: Record<string, Input | undefined>, live: boolean): SimEvent[] {
  const events: SimEvent[] = [];
  const dt = STEP;
  const { map, R, mu } = w.arena;
  for (const b of Object.values(w.bodies)) if (!b.alive && b.back && w.t >= b.back) revive(w, b, events);
  const list = Object.values(w.bodies).filter((b) => b.alive);
  const fish = w.fish;

  for (const b of list) {
    const inp = live ? inputs[b.id] : undefined;
    const m = ballMass(b.ball);
    const M = PENGUIN_MASS + m;
    const braking = !!inp?.brake;
    b.brace = braking;
    const driving = !braking && !!inp && inp.angle !== null;
    if (braking && inp && inp.angle !== null) {
      // Đang thắng vẫn xoay người được để ngắm, nhưng không chạy.
      const turn = (TURN_RATE / (1 + m)) * dt;
      b.face += Math.max(-turn, Math.min(turn, wrap(inp.angle - b.face)));
    }
    if (driving) {
      // Đẩy cầu nặng thì quay người chậm hơn.
      const turn = (TURN_RATE / (1 + m)) * dt;
      b.face += Math.max(-turn, Math.min(turn, wrap(inp.angle! - b.face)));
      const dx = Math.cos(inp.angle!);
      const dy = Math.sin(inp.angle!);
      const along = b.vx * dx + b.vy * dy;
      const grip = tractionOf(mu);
      const power = Math.max(0, Math.min(1, inp.power ?? 1));
      const top = RUN_SPEED * power * (fish?.holder === b.id ? FISH_SLOW : 1);
      if (along < top) {
        // F = min(F_max, P/v, lực bám) theo độ kéo cần lái; a = F/M. Không đẩy quá tốc độ ứng với độ kéo.
        const force = Math.min(LEG_FORCE, LEG_POWER / Math.max(1, along), grip) * power;
        const add = Math.min((force / M) * dt, top - along);
        b.vx += dx * add;
        b.vy += dy * add;
      }
      // Chân bám mặt băng chống trượt ngang (tới giới hạn lực bám), nên đổi hướng không bị văng ra.
      const a2 = b.vx * dx + b.vy * dy;
      const px = b.vx - dx * a2;
      const py = b.vy - dy * a2;
      const perp = Math.hypot(px, py);
      if (perp > 0) {
        const keep = Math.max(0, perp - (grip / M) * dt) / perp;
        b.vx = dx * a2 + px * keep;
        b.vy = dy * a2 + py * keep;
      }
    }
    // Ma sát: cầu lăn luôn chịu ma sát lăn; cánh cụt chỉ trượt (chịu ma sát trượt) khi không đạp chân
    // hoặc khi bị húc nhanh hơn tốc độ chân.
    const sliding = !driving || Math.hypot(b.vx, b.vy) > RUN_SPEED;
    // Giữ thắng: cắm chân, ma sát lớn hơn hẳn mặt băng nên dừng gấp.
    const footMu = braking ? BRAKE_MU : sliding ? mu : 0;
    slow(b, (footMu * PENGUIN_MASS + MU_ROLL * m) * G / M, dt);

    // Cầu lớn theo quãng đường lăn về phía trước, khi còn lăn trên tuyết.
    const forward = b.vx * Math.cos(b.face) + b.vy * Math.sin(b.face);
    const c = ballCenter(b);
    if (forward > 0 && onIce(map, R, c.x, c.y)) b.ball = Math.min(R * BALL_CAP, b.ball + GROW_PER_UNIT * forward * dt);

    b.cool = Math.max(0, b.cool - dt);
    b.ghost = Math.max(0, b.ghost - dt);
    if (inp && inp.shots > b.shots) {
      b.shots = inp.shots;
      fire(w, b, events, inp.lob ?? 0);
    }
  }

  for (const b of list) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
  }

  const hit = (target: Body, by: string, j: number, x: number, y: number) => {
    target.hitBy = by;
    if (j > 40) events.push({ type: 'hit', id: target.id, x, y, power: j });
    // Bị va mạnh thì văng cá ra, cá trượt ra xa phía bị va.
    if (fish?.holder === target.id && j > FISH_DROP) {
      const dx = target.x - x;
      const dy = target.y - y;
      const d = Math.hypot(dx, dy) || 1;
      Object.assign(fish, { holder: null, cool: FISH_COOL, x: target.x, y: target.y, vx: (dx / d) * FISH_SLIDE + target.vx * 0.5, vy: (dy / d) * FISH_SLIDE + target.vy * 0.5 });
      events.push({ type: 'drop', id: target.id, x: target.x, y: target.y });
    }
  };

  // Người với người: thân chạm thân, cầu đang đẩy chạm thân hoặc chạm cầu của người kia.
  for (let i = 0; i < list.length; i++) {
    for (let k = i + 1; k < list.length; k++) {
      const a = list[i];
      const b = list[k];
      // Vừa quay lại sân thì đi xuyên qua người khác.
      if (a.ghost > 0 || b.ghost > 0) continue;
      const pairs: [Part, Part, number][] = [
        [bodyPart(a), bodyPart(b), E_BODY],
        [ballPart(a), bodyPart(b), E_SNOW],
        [bodyPart(a), ballPart(b), E_SNOW],
        [ballPart(a), ballPart(b), E_SNOW],
      ];
      for (const [pa, pb, e] of pairs) {
        if (pa.r <= 0 || pb.r <= 0) continue;
        const j = collide(pa, pb, e);
        if (!j) continue;
        const x = (pa.x + pb.x) / 2;
        const y = (pa.y + pb.y) / 2;
        hit(b, a.id, j, x, y);
        hit(a, b.id, j, x, y);
      }
    }
  }

  // Cầu tuyết đã bắn: bay vồng theo trọng lực, chạm đất thì nảy rồi lăn; va người hoặc va nhau theo bảo toàn động lượng.
  for (let i = w.shots.length - 1; i >= 0; i--) {
    const s = w.shots[i];
    let gone = false;
    // Di chuyển trước, rồi mới xét chạm đất ở vị trí mới.
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    if (s.z > 0 || s.vz > 0) {
      // Đang bay: không ma sát, không rơi xuống nước dù đang ở trên lỗ.
      s.vz -= G * dt;
      s.z += s.vz * dt;
      if (s.z <= 0) {
        s.z = 0;
        if (!onIce(map, R, s.x, s.y)) {
          events.push({ type: 'splash', x: s.x, y: s.y });
          gone = true;
        } else {
          // Va đất: ma sát va chạm lấy bớt vận tốc ngang theo độ mạnh cú rơi, rồi nảy lại một phần.
          slow(s, (LAND_FRICTION * -s.vz) / dt, dt);
          s.vz = -s.vz * LAND_BOUNCE;
          if (s.vz <= 40) s.vz = 0;
        }
      }
    } else {
      slow(s, MU_SHOT_ROLL * G, dt);
    }
    if (s.z === 0 && Math.hypot(s.vx, s.vy) < SHOT_STOP) {
      s.vx = 0;
      s.vy = 0;
      s.life -= dt / SHOT_MELT;
    }
    if (s.life <= 0) gone = true;
    if (!gone && s.z === 0 && !onIce(map, R, s.x, s.y)) {
      events.push({ type: 'splash', x: s.x, y: s.y });
      gone = true;
    }
    for (const b of list) {
      // Bay cao hơn đầu cánh cụt thì vượt qua.
      if (gone || b.id === s.owner || s.z > PENGUIN_HEIGHT || b.ghost > 0) continue;
      for (const part of [bodyPart(b), ballPart(b)]) {
        if (gone || part.r <= 0) continue;
        // Kể cả bắn sát người: cầu không vỡ, đẩy người văng ra rồi bật lại lăn tiếp.
        const j = collide(shotPart(s), part, E_SNOW, SHOT_KNOCK);
        if (j) hit(b, s.owner, j, s.x, s.y);
      }
    }
    if (gone) w.shots.splice(i, 1);
  }
  for (let i = 0; i < w.shots.length; i++) {
    for (let k = i + 1; k < w.shots.length; k++) {
      const a = w.shots[i];
      const b = w.shots[k];
      if (Math.abs(a.z - b.z) < a.r + b.r) collide(shotPart(a), shotPart(b), E_SNOW);
    }
  }

  // Trọng tâm (người kèm cầu) ra khỏi mép băng là rơi.
  for (const b of list) {
    const c = centerOfMass(b);
    if (!onIce(map, R, c.x, c.y)) {
      b.alive = false;
      b.downs++;
      if (w.arena.mode === 'lives') b.lives = Math.max(0, b.lives - 1);
      b.back = respawns(w, b) ? w.t + RESPAWN_MS : 0;
      events.push({ type: 'fall', id: b.id, x: b.x, y: b.y });
      // Ôm cá rơi xuống nước: cá về chỗ đặt kế tiếp.
      if (fish?.holder === b.id) w.fish = placeFish(w.arena, fish.n + 1);
    }
  }

  if (live) {
    w.play += dt;
    // Vua đỉnh băng: chỉ tích giây khi đứng một mình trong vòng.
    const zone = zoneOf(w);
    if (zone) {
      const inside = list.filter((b) => b.alive && b.ghost === 0 && Math.hypot(b.x - zone.x, b.y - zone.y) <= zone.r);
      if (inside.length === 1) inside[0].score += dt;
    }
  }
  if (w.fish) stepFish(w, list, live, events);

  w.t += dt * 1000;
  return events;
}

/** Cá: đi theo người ôm (người đó tích giây), hoặc trượt trên băng chờ người nhặt; trượt xuống nước thì đặt lại. */
function stepFish(w: World, list: Body[], live: boolean, events: SimEvent[]) {
  const f = w.fish!;
  const dt = STEP;
  const { map, R } = w.arena;
  f.cool = Math.max(0, f.cool - dt);
  const holder = f.holder ? w.bodies[f.holder] : null;
  if (holder?.alive) {
    f.x = holder.x;
    f.y = holder.y;
    if (live) holder.score += dt;
    return;
  }
  f.holder = null;
  f.x += f.vx * dt;
  f.y += f.vy * dt;
  slow(f, MU_SHOT_ROLL * G * 2.5, dt);
  if (!onIce(map, R, f.x, f.y)) {
    events.push({ type: 'splash', x: f.x, y: f.y });
    w.fish = placeFish(w.arena, f.n + 1);
    return;
  }
  if (f.cool > 0 || !live) return;
  // Chạm cá bằng thân hoặc bằng cầu tuyết đang đẩy đều nhặt được (cầu ở trước mặt hay chạm cá trước).
  let near: Body | null = null;
  let nearD = 0;
  for (const b of list) {
    const c = ballCenter(b);
    const d = Math.min(Math.hypot(b.x - f.x, b.y - f.y) - BODY_R, Math.hypot(c.x - f.x, c.y - f.y) - b.ball) - FISH_R;
    if (b.alive && b.ghost === 0 && d < nearD) {
      near = b;
      nearD = d;
    }
  }
  if (near) {
    Object.assign(f, { holder: near.id, vx: 0, vy: 0 });
    events.push({ type: 'grab', id: near.id, x: f.x, y: f.y });
  }
}

/** Số giây cần tích để thắng (0 nếu chế độ không tính giây). */
export const targetOf = (mode: ModeId) => (mode === 'king' ? KING_TARGET : mode === 'fish' ? FISH_TARGET : 0);

/** Đã bị loại khỏi hiệp hẳn (không quay lại được nữa). */
export const isOut = (b: Body | undefined) => !b || (!b.alive && !b.back);

/**
 * Kết quả hiệp theo chế độ: `done` khi đã phân thắng bại (còn một người, hoặc có người tích đủ giây);
 * `timeUp` thì chọn người dẫn đầu.
 */
export function verdict(w: World, roster: string[], timeUp: boolean): { done: boolean; winner: string | null } {
  const mode = w.arena.mode;
  const target = targetOf(mode);
  if (target) {
    const ranked = roster.map((id) => w.bodies[id]).filter(Boolean).sort((a, b) => b.score - a.score);
    const top = ranked[0];
    if (top && top.score >= target) return { done: true, winner: top.id };
    if (!timeUp) return { done: false, winner: null };
    // So theo số giây đã tròn như trên bảng điểm: cùng hiện 3/15 là hòa, chưa ai được giây nào cũng hòa.
    const whole = (b: Body | undefined) => Math.floor(b?.score ?? -1);
    return { done: true, winner: top && whole(top) > 0 && whole(top) > whole(ranked[1]) ? top.id : null };
  }
  const still = roster.filter((id) => !isOut(w.bodies[id]));
  const done = roster.length >= 2 ? still.length <= 1 : still.length === 0;
  if (done) return { done, winner: roster.length >= 2 ? (still[0] ?? null) : null };
  if (!timeUp) return { done: false, winner: null };
  if (roster.length < 2) return { done: true, winner: null };
  if (mode === 'lives') {
    // Nhiều mạng nhất thắng; bằng mạng thì người đang trên băng gần tâm nhất.
    const most = Math.max(...still.map((id) => w.bodies[id].lives));
    const tied = still.filter((id) => w.bodies[id].lives === most);
    return { done: true, winner: closestToCenter(w, tied) ?? tied[0] ?? null };
  }
  return { done: true, winner: closestToCenter(w, still) };
}

/** Hết giờ: người còn trên băng đứng gần tâm nhất thắng hiệp. */
export function closestToCenter(w: World, ids: string[]): string | null {
  let best: string | null = null;
  let bestD = Infinity;
  for (const id of ids) {
    const b = w.bodies[id];
    if (!b?.alive) continue;
    const d = Math.hypot(b.x, b.y);
    if (d < bestD) {
      bestD = d;
      best = id;
    }
  }
  return best;
}

/* ---------- Đoán đường cho máy chơi một mình ---------- */

/** Hướng an toàn nhất từ chỗ đang đứng: dò 16 hướng, chọn hướng còn nhiều băng phía trước nhất. */
function safest(w: World, x: number, y: number) {
  const { map, R } = w.arena;
  let best = 0;
  let bestScore = -1;
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    let score = 0;
    for (const d of [40, 80, 120]) if (onIce(map, R, x + Math.cos(a) * d, y + Math.sin(a) * d, 30)) score++;
    if (score > bestScore) {
      bestScore = score;
      best = a;
    }
  }
  return best;
}

/** Máy tự lái (chơi 1 máy): lao về đối thủ gần nhất, đủ cầu thì bắn, sắp trượt khỏi băng thì quay về chỗ an toàn. */
export function botInput(w: World, id: string, prev: Input | undefined): Input {
  const me = w.bodies[id];
  const shots = prev?.shots ?? 0;
  if (!me?.alive) return { angle: null, shots };
  const others = Object.values(w.bodies).filter((b) => b.alive && b.id !== id && b.ghost === 0);
  const { map, R } = w.arena;
  const edge = !onIce(map, R, me.x, me.y, 45) || !onIce(map, R, me.x + me.vx * 0.4, me.y + me.vy * 0.4, 25);
  if (edge) return { angle: safest(w, me.x, me.y), shots };
  const goTo = (x: number, y: number): Input => ({ angle: Math.atan2(y - me.y, x - me.x), power: 1, shots });
  // Vua đỉnh băng: chưa vào vòng thì chạy vào; giữ cá: chưa ai ôm thì chạy tới nhặt, đang ôm thì chạy xa người gần nhất.
  const zone = zoneOf(w);
  if (zone && Math.hypot(zone.x - me.x, zone.y - me.y) > zone.r * 0.6) return goTo(zone.x, zone.y);
  const f = w.fish;
  if (f && !f.holder) return goTo(f.x, f.y);
  const nearest = others.length ? others.reduce((a, b) => (Math.hypot(b.x - me.x, b.y - me.y) < Math.hypot(a.x - me.x, a.y - me.y) ? b : a)) : null;
  if (f?.holder === id) {
    if (!nearest || Math.hypot(nearest.x - me.x, nearest.y - me.y) > R * 0.7) return { angle: null, shots };
    const away = Math.atan2(me.y - nearest.y, me.x - nearest.x);
    return onIce(map, R, me.x + Math.cos(away) * 90, me.y + Math.sin(away) * 90, 30) ? { angle: away, shots } : { angle: safest(w, me.x, me.y), shots };
  }
  const holder = f?.holder ? w.bodies[f.holder] : null;
  // Vua: chỉ đánh người đang ở trong hoặc sát vòng.
  const rivals = zone ? others.filter((b) => Math.hypot(b.x - zone.x, b.y - zone.y) < zone.r * 2.2) : others;
  if (zone && !rivals.length) return { angle: null, shots };
  if (!others.length) return { angle: safest(w, me.x, me.y), shots };
  const pool = holder?.alive && holder.ghost === 0 ? [holder] : rivals;
  const target = pool.reduce((a, b) => (Math.hypot(b.x - me.x, b.y - me.y) < Math.hypot(a.x - me.x, a.y - me.y) ? b : a));
  const dist = Math.hypot(target.x - me.x, target.y - me.y);
  const toward = Math.atan2(target.y - me.y, target.x - me.x);
  // Kẹt sát nhau đẩy qua đẩy lại: né ngang để lăn cầu và lấy đà rồi quay lại.
  const stuck = dist < BODY_R * 2 + me.ball * 2 + 10 && Math.hypot(me.vx, me.vy) < 40;
  const angle = stuck ? toward + (id.charCodeAt(id.length - 1) % 2 ? 1.4 : -1.4) : toward;
  const aimed = Math.abs(wrap(toward - me.face)) < 0.3;
  const fireNow = !stuck && aimed && me.ball >= BALL_READY + 4 && me.cool === 0 && dist < 260 && Math.random() < 0.06;
  // Gần thì bắn thẳng, xa thì bắn vồng canh đúng khoảng cách.
  const lob = dist < 140 ? 0 : Math.max(0.01, Math.min(1, (dist / R - LOB_NEAR) / (LOB_FAR - LOB_NEAR)));
  return { angle, shots: fireNow ? shots + 1 : shots, lob: fireNow ? lob : prev?.lob };
}

/* ---------- Ảnh chụp gửi qua mạng (gọn, làm tròn) ---------- */

type BodyTuple = [string, number, number, number, number, number, number, number, 0 | 1, number, string | null, number, number, number, number, number];
type FishTuple = [number, number, number, number, string | null, number, number];
type ShotTuple = [number, string, number, number, number, number, number, number, number, number];
/** `i`: điều khiển hiện tại của từng người, để máy khách đoán tiếp cho đúng. */
export interface Snapshot {
  t: number;
  b: BodyTuple[];
  s: ShotTuple[];
  n: number;
  i: Record<string, Input>;
  /** Số giây đã chơi và con cá. */
  p?: number;
  f?: FishTuple | null;
}

const r1 = (v: number) => Math.round(v * 10) / 10;
const r2 = (v: number) => Math.round(v * 100) / 100;

export function encode(w: World, inputs: Record<string, Input | undefined>): Snapshot {
  const i: Record<string, Input> = {};
  for (const id of Object.keys(w.bodies)) {
    const inp = inputs[id];
    if (inp) i[id] = { angle: inp.angle === null ? null : r2(inp.angle), power: r2(inp.power ?? 1), shots: inp.shots, lob: r2(inp.lob ?? 0), brake: !!inp.brake };
  }
  return {
    t: Math.round(w.t),
    b: Object.values(w.bodies).map((b) => [b.id, r1(b.x), r1(b.y), r1(b.vx), r1(b.vy), r2(b.face), r1(b.ball), r2(b.cool), b.alive ? 1 : 0, b.shots, b.hitBy, r2(b.score), b.lives, Math.round(b.back), r2(b.ghost), b.downs]),
    s: w.shots.map((s) => [s.id, s.owner, r1(s.x), r1(s.y), r1(s.vx), r1(s.vy), r1(s.r), r2(s.life), r1(s.z), r1(s.vz)]),
    n: w.nextShot,
    i,
    p: r2(w.play),
    f: w.fish ? [r1(w.fish.x), r1(w.fish.y), r1(w.fish.vx), r1(w.fish.vy), w.fish.holder, r2(w.fish.cool), w.fish.n] : null,
  };
}

export function decode(snap: Snapshot, arena: Arena): World {
  const bodies: Record<string, Body> = {};
  for (const [id, x, y, vx, vy, face, ball, cool, alive, shots, hitBy, score = 0, lives = LIVES, back = 0, ghost = 0, downs = 0] of snap.b) {
    bodies[id] = { id, x, y, vx, vy, face, ball, cool, alive: alive === 1, shots, hitBy: hitBy ?? null, score, lives, back, ghost, downs };
  }
  const shots = snap.s.map(([id, owner, x, y, vx, vy, r, life, z, vz]) => ({ id, owner, x, y, vx, vy, r, life, z: z ?? 0, vz: vz ?? 0 }));
  const f = snap.f;
  const fish = f ? { x: f[0], y: f[1], vx: f[2], vy: f[3], holder: f[4], cool: f[5], n: f[6] } : arena.mode === 'fish' ? placeFish(arena, 0) : null;
  return { arena, t: snap.t, bodies, shots, nextShot: snap.n, play: snap.p ?? 0, fish };
}

export const isSnapshot = (v: unknown): v is Snapshot =>
  !!v && typeof v === 'object' && typeof (v as Snapshot).t === 'number' && Array.isArray((v as Snapshot).b) && Array.isArray((v as Snapshot).s);
