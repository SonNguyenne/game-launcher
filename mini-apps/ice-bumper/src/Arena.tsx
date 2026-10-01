import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { vibrate, type RealtimeMessage } from '@bang/party';
import { cx } from '@bang/ui';
import { arenaOfState, controlStartsAt, skinOf, standings, type SnowarParty } from './game';
import { extentOf } from './maps';
import {
  BALL_READY,
  BODY_R,
  lobPath,
  STEP,
  botInput,
  closestToCenter,
  decode,
  encode,
  isSnapshot,
  spawn,
  step,
  type Input,
  type SimEvent,
  type Snapshot,
  type World,
} from './sim';
import { ballCharge, drawFloe, drawParticles, drawPenguin, drawSea, drawSnowball, drawTag, floeShape, puff, splash, type Particle } from './render';
import { strings } from './strings';
import s from './IceBumper.module.css';

/** Chủ phòng phát ảnh chụp 20 lần/giây; khách gửi điều khiển ngay khi đổi, tối đa 30 lần/giây. */
const SNAPSHOT_MS = 50;
/** Khách: mỗi ảnh chụp chỉ kéo vị trí tự đoán của mình về đúng chừng này phần; lệch quá RECONCILE_SNAP (bị húc văng) thì nhảy theo luôn. */
const RECONCILE_RATE = 0.15;
/** Người khác: kéo về nhanh hơn một chút để bám sát vị trí thật của họ. */
const RECONCILE_RATE_OTHERS = 0.3;
const RECONCILE_SNAP = 70;
const INPUT_MS = 33;
/** Còn một người (hoặc không ai) trên băng: chờ chừng này cho cả phòng xem cú rơi rồi mới báo hết hiệp. */
const END_DELAY_MS = 1300;
const SINK_MS = 800;
const STICK_MAX = 46;
/** Bán kính thân cánh cụt tối thiểu trên màn hình (px); sân to hơn mức này thì camera phóng to và đi theo người. */
const MIN_BODY_PX = 13;
/** Nút bắn: chạm nhanh hơn TAP_MS là bắn thẳng; giữ lâu hơn thì ngắm bắn vồng, điểm rơi xa dần trong CHARGE_MS. */
const TAP_MS = 200;
/** Màu đường canh bắn vồng: cam phao như nút bắn, viền xanh đậm. */
const AIM_COLOR = '#FF6A2B';
const AIM_EDGE = '#0A2740';
const CHARGE_MS = 1200;
/** Kéo ít hơn thế này (px) coi như chưa lái. */
const STICK_DEAD = 10;

interface Hud {
  /** 3, 2, 1 khi đếm ngược; 0 là "Lăn!"; null khi đã chạy. */
  count: number | null;
  /** Số giây còn lại của hiệp. */
  left: number;
  alive: string;
}

interface Feed {
  id: number;
  text: string;
}

/** Tải lại trang giữa hiệp: nhớ thế giới lúc rời trang để vào lại không bị dịch hết về chỗ xuất phát. */
const SAVE_KEY = 'ice-bumper-world';
const SAVE_TTL = 90_000;
interface SavedWorld {
  key: string;
  snap: Snapshot;
  kos: Record<string, number>;
  at: number;
}

function loadWorld(key: string): SavedWorld | null {
  try {
    const v = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null') as SavedWorld | null;
    return v && v.key === key && Date.now() - v.at < SAVE_TTL && isSnapshot(v.snap) ? v : null;
  } catch {
    return null;
  }
}

function saveWorld(v: Omit<SavedWorld, 'at'>) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...v, at: Date.now() }));
  } catch {
    // Không lưu được thì vào lại sẽ bắt đầu từ chỗ xuất phát.
  }
}

const sameHud = (a: Hud, b: Hud) => a.count === b.count && a.left === b.left && a.alive === b.alive;
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

function readInput(v: unknown): Input | null {
  if (!v || typeof v !== 'object') return null;
  const { angle, shots, power = 1, lob = 0, brake = false } = v as Input;
  if (angle !== null && (typeof angle !== 'number' || !Number.isFinite(angle))) return null;
  if (typeof shots !== 'number' || !Number.isFinite(shots)) return null;
  if (typeof power !== 'number' || !Number.isFinite(power)) return null;
  if (typeof lob !== 'number' || !Number.isFinite(lob)) return null;
  return { angle, shots, power: Math.max(0, Math.min(1, power)), lob: Math.max(0, Math.min(1, lob)), brake: brake === true };
}

export function Arena({ party }: { party: SnowarParty }) {
  const st = party.state!;
  const local = party.mode === 'local';
  // Chơi 1 máy: máy này lái chú đầu tiên, các chú khác tự lái.
  const meId = local ? (party.players[0]?.id ?? '') : party.me;
  const inRound = st.roster.includes(meId);
  const controlAt = controlStartsAt(st);
  const roundKey = `${st.round}:${st.startedAt}`;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const fireRef = useRef<HTMLButtonElement>(null);

  // Vòng lặp vẽ sống suốt hiệp, đọc giá trị mới nhất qua ref thay vì chạy lại effect mỗi lần render.
  const live = useRef({ party, st, meId, inRound, controlAt, local });
  live.current = { party, st, meId, inRound, controlAt, local };

  /** Thế giới của hiệp hiện tại; dựng lại khi sang hiệp mới. */
  const game = useRef<{
    key: string;
    world: World;
    inputs: Record<string, Input | undefined>;
    floe: ReturnType<typeof floeShape>;
    seen: Set<string>;
    sinking: Map<string, { x: number; y: number; at: number }>;
    kos: Record<string, number>;
    endAt: number;
    ended: boolean;
    snap: Snapshot | null;
  } | null>(null);
  const saveKey = `${party.room?.code ?? 'local'}:${roundKey}`;
  if (game.current?.key !== roundKey) {
    const arena = arenaOfState(st);
    const saved = st.stage === 'playing' ? loadWorld(saveKey) : null;
    game.current = {
      key: roundKey,
      world: saved ? decode(saved.snap, arena) : spawn(st.roster, Math.min(controlAt, party.now()), arena),
      inputs: {},
      floe: floeShape(st.round * 1.7 + st.roster.length),
      seen: new Set(),
      sinking: new Map(),
      kos: saved?.kos ?? {},
      endAt: 0,
      ended: false,
      snap: null,
    };
  }
  const input = useRef<Input>({ angle: null, shots: 0 });
  const lastRound = useRef(roundKey);
  if (lastRound.current !== roundKey) {
    lastRound.current = roundKey;
    input.current = { angle: null, shots: 0 };
  }

  const [hud, setHud] = useState<Hud>({ count: 3, left: st.roundSeconds ?? 60, alive: '' });
  const [feed, setFeed] = useState<Feed[]>([]);
  const feedId = useRef(0);
  const pushFeed = useRef((text: string) => {
    const id = ++feedId.current;
    setFeed((f) => [...f.slice(-2), { id, text }]);
    setTimeout(() => setFeed((f) => f.filter((x) => x.id !== id)), 2600);
  }).current;

  // Rời trang (tải lại, chuyển app) giữa hiệp: lưu thế giới hiện tại.
  const saveKeyRef = useRef(saveKey);
  saveKeyRef.current = saveKey;
  useEffect(() => {
    const save = () => {
      const g = game.current;
      if (g && live.current.st.stage === 'playing') saveWorld({ key: saveKeyRef.current, snap: encode(g.world, g.inputs), kos: g.kos });
    };
    const onHide = () => document.visibilityState === 'hidden' && save();
    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', save);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, []);

  // Tin thời gian thực: khách nhận ảnh chụp, chủ phòng nhận điều khiển.
  const { onRealtime } = party;
  useEffect(
    () =>
      onRealtime((m: RealtimeMessage) => {
        const g = game.current;
        if (!g) return;
        if (m.kind === 'tick') {
          // Bỏ ảnh chụp trễ của hiệp trước.
          if (isSnapshot(m.data) && m.data.t >= live.current.st.startedAt && (!g.snap || m.data.t >= g.snap.t)) g.snap = m.data;
        } else {
          const inp = readInput(m.data);
          if (inp && live.current.st.roster.includes(m.from)) g.inputs[m.from] = inp;
        }
      }),
    [onRealtime],
  );

  // Vòng lặp chính: chạy vật lý theo giờ chung của phòng, vẽ, cập nhật HUD.
  useEffect(() => {
    const canvas = canvasRef.current!;
    const box = boxRef.current!;
    const ctx = canvas.getContext('2d')!;
    let w = 0;
    let h = 0;
    let dpr = 1;
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = box.clientWidth;
      h = box.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(box);

    const particles: Particle[] = [];
    const disp = new Map<string, { x: number; y: number; face: number }>();
    /** Tâm camera (tọa độ thế giới) khi sân quá to phải phóng to và đi theo người. */
    const cam = { x: 0, y: 0 };
    let lastFrame = performance.now();
    let lastStream = 0;
    let lastSend = 0;
    let lastBots = 0;
    let sent: Input = { angle: null, shots: 0 };
    let raf = 0;

    const nameOf = (id: string) => live.current.party.nameOf(id) || '?';

    const handle = (events: SimEvent[], authority: boolean) => {
      const g = game.current!;
      const { party: p, meId: me } = live.current;
      for (const e of events) {
        if (e.type === 'fall') {
          const key = `fall:${e.id}`;
          if (g.seen.has(key)) continue;
          g.seen.add(key);
          g.sinking.set(e.id, { x: e.x, y: e.y, at: performance.now() });
          splash(particles, e.x, e.y);
          p.sfx('buzz');
          if (e.id === me) vibrate(220);
          const by = g.world.bodies[e.id]?.hitBy;
          if (authority && by && by !== e.id) g.kos[by] = (g.kos[by] ?? 0) + 1;
          pushFeed(by && by !== e.id ? strings.pushed(nameOf(by), nameOf(e.id)) : strings.fell(nameOf(e.id)));
        } else if (e.type === 'hit') {
          const key = `hit:${e.id}:${Math.round(g.world.t / 120)}`;
          if (g.seen.has(key)) continue;
          g.seen.add(key);
          puff(particles, e.x, e.y, e.power);
          p.sfx('tap');
          if (e.id === me) vibrate(40);
        } else if (e.type === 'splash') {
          const key = `splash:${Math.round(e.x / 20)}:${Math.round(e.y / 20)}`;
          if (g.seen.has(key)) continue;
          g.seen.add(key);
          splash(particles, e.x, e.y);
        } else {
          const key = `shoot:${e.id}:${g.world.bodies[e.id]?.shots}`;
          if (g.seen.has(key)) continue;
          g.seen.add(key);
          puff(particles, e.x, e.y, 40);
        }
      }
    };

    const advance = (to: number, authority: boolean) => {
      const g = game.current!;
      const { st: state, controlAt: at } = live.current;
      const playing = state.stage === 'playing';
      let n = 0;
      while (g.world.t + STEP * 1000 <= to && n < 40) {
        const elapsed = (g.world.t - at) / 1000;
        handle(step(g.world, g.inputs, playing && elapsed >= 0), authority);
        n++;
      }
      // Máy bị treo lâu (chuyển tab): bỏ qua phần trễ thay vì chạy bù hàng trăm bước.
      if (to - g.world.t > 600) g.world.t = to;
    };

    const frame = (perf: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (perf - lastFrame) / 1000);
      lastFrame = perf;
      const g = game.current!;
      const { party: p, st: state, meId: me, inRound: mine, controlAt: at, local: solo } = live.current;
      const authority = p.isHost;
      const now = p.now();
      const playing = state.stage === 'playing';

      // Thắng khi giữ nút Thắng, hoặc khi đang giữ nút bắn để canh bắn vồng (tự đứng tấn, vẫn xoay người để ngắm):
      // trên điện thoại ngón phải không giữ được cả hai nút cùng lúc.
      const aimingNow = !!hold.current && perf - hold.current.at >= TAP_MS;
      const wantBrake = brakeHeld.current || aimingNow;
      if (!!input.current.brake !== wantBrake) input.current = { ...input.current, brake: wantBrake };
      if (mine && playing) g.inputs[me] = input.current;

      if (authority) {
        // Chơi 1 máy: các chú còn lại tự lái.
        if (solo && perf - lastBots > 90) {
          lastBots = perf;
          for (const id of state.roster) if (id !== me) g.inputs[id] = botInput(g.world, id, g.inputs[id]);
        }
        // Người rời phòng giữa hiệp coi như rơi.
        if (!solo) {
          for (const id of state.roster) {
            const b = g.world.bodies[id];
            if (b?.alive && !p.players.some((x) => x.id === id)) b.alive = false;
          }
        }
        if (playing) advance(now, true);
        if (playing && !solo && perf - lastStream >= SNAPSHOT_MS) {
          lastStream = perf;
          p.stream(encode(g.world, g.inputs));
        }
        // Hết hiệp: còn một người (hoặc chẳng còn ai) trên băng, hoặc hết giờ thì người gần tâm nhất thắng.
        if (playing && !g.ended && now >= at) {
          const alive = state.roster.filter((id) => g.world.bodies[id]?.alive);
          const done = state.roster.length >= 2 ? alive.length <= 1 : alive.length === 0;
          if (done && !g.endAt) g.endAt = now + END_DELAY_MS;
          // Thời gian 0 là vô hạn: chỉ hết hiệp khi còn một người trên băng.
          const limit = state.roundSeconds ?? 60;
          const timeUp = !done && limit > 0 && now >= at + limit * 1000;
          if (timeUp || (done && now >= g.endAt)) {
            g.ended = true;
            const winnerId = state.roster.length < 2 ? null : timeUp ? closestToCenter(g.world, alive) : (alive[0] ?? null);
            p.dispatch({ type: 'round_end', round: state.round, winnerId, kos: g.kos, timeUp });
          }
        }
      } else if (playing) {
        // Khách: lấy ảnh chụp mới nhất của chủ phòng làm gốc, rồi chạy tiếp tới hiện tại với điều khiển đã biết.
        // Chủ phòng nhận điều khiển của mình trễ (~1 vòng mạng), nên ảnh chụp thường lệch với chỗ mình đã tự đoán.
        // Đặt lại thẳng sẽ giật mỗi lần đổi hướng: so hai vị trí ở cùng thời điểm rồi chỉ kéo về dần (reconciliation).
        // Người khác cũng vậy: máy này đoán họ đi tiếp theo điều khiển cũ, ảnh chụp tới báo họ đã đổi hướng.
        const predicted = new Map<string, { x: number; y: number }>();
        if (g.snap) {
          advance(now, false);
          for (const b of Object.values(g.world.bodies)) if (b.alive) predicted.set(b.id, { x: b.x, y: b.y });
          const snap = g.snap;
          g.snap = null;
          g.world = decode(snap, g.world.arena);
          for (const [id, inp] of Object.entries(snap.i)) if (id !== me) g.inputs[id] = inp;
          for (const id of g.sinking.keys()) if (g.world.bodies[id]?.alive) g.sinking.delete(id);
          for (const b of Object.values(g.world.bodies)) if (b.alive) g.seen.delete(`fall:${b.id}`);
        }
        advance(now, false);
        for (const [id, guess] of predicted) {
          const fixed = g.world.bodies[id];
          if (!fixed?.alive) continue;
          const ex = guess.x - fixed.x;
          const ey = guess.y - fixed.y;
          if (Math.hypot(ex, ey) >= RECONCILE_SNAP) continue;
          const rate = id === me ? RECONCILE_RATE : RECONCILE_RATE_OTHERS;
          fixed.x += ex * (1 - rate);
          fixed.y += ey * (1 - rate);
        }
        // Gửi điều khiển khi đổi.
        const cur = input.current;
        const changed =
          cur.shots !== sent.shots ||
          (cur.angle === null) !== (sent.angle === null) ||
          (cur.angle !== null && sent.angle !== null && Math.abs(wrap(cur.angle - sent.angle)) > 0.04) ||
          Math.abs((cur.power ?? 1) - (sent.power ?? 1)) > 0.08 ||
          !!cur.brake !== !!sent.brake;
        if (mine && changed && perf - lastSend >= INPUT_MS) {
          lastSend = perf;
          sent = { ...cur };
          p.sendInput(cur);
        }
      }

      /* ---------- Vẽ ---------- */
      const elapsed = (now - at) / 1000;
      // Màn dọc chừa chỗ cho HUD phía trên; màn ngang HUD nằm hai bên nên băng dùng hết chiều cao.
      const wide = w > h * 1.2;
      const { map, R } = g.world.arena;
      const ext = extentOf(map) * R;
      const fit = Math.min(w - 8, h - (wide ? 12 : 110)) / ((ext + 25) * 2);
      // Sân nhỏ: thu vừa cả sân. Sân to: giữ cánh cụt đủ to để nhìn rõ, camera đi theo mình.
      const zoom = Math.max(fit, MIN_BODY_PX / BODY_R);
      const follow = zoom > fit + 1e-6;
      let target = { x: 0, y: 0 };
      if (follow) {
        const meBody = g.world.bodies[me];
        const alive = Object.values(g.world.bodies).filter((b) => b.alive);
        if (meBody?.alive) target = { x: meBody.x, y: meBody.y };
        else if (alive.length) target = { x: alive.reduce((a, b) => a + b.x, 0) / alive.length, y: alive.reduce((a, b) => a + b.y, 0) / alive.length };
        // Không cho khung nhìn trôi quá xa khỏi sân.
        const lx = Math.max(0, ext + 40 - w / 2 / zoom);
        const ly = Math.max(0, ext + 40 - h / 2 / zoom);
        target = { x: Math.max(-lx, Math.min(lx, target.x)), y: Math.max(-ly, Math.min(ly, target.y)) };
      }
      const camK = 1 - Math.exp(-dt * 6);
      cam.x += (target.x - cam.x) * camK;
      cam.y += (target.y - cam.y) * camK;
      const cx = w / 2 - cam.x * zoom;
      const cy = h / 2 + (wide ? 4 : 22) - cam.y * zoom;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawSea(ctx, w, h, cx, cy, ext * zoom, perf);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(zoom, zoom);
      drawFloe(ctx, g.floe, map, R);

      // Cầu đang lăn vẽ dưới cánh cụt, cầu đang bay vồng vẽ đè lên trên.
      const drawShots = (flying: boolean) => {
        for (const shot of g.world.shots) {
          if (shot.z > 0 !== flying) continue;
          ctx.strokeStyle = 'rgba(255,255,255,0.35)';
          ctx.lineWidth = shot.r * 0.9;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(shot.x - shot.vx * 0.05, shot.y - shot.vy * 0.05 - (shot.z - shot.vz * 0.05));
          ctx.lineTo(shot.x, shot.y - shot.z);
          ctx.stroke();
          // Cầu đã dừng thì tan dần; đang lăn thì vệt tuyết xoay theo quãng đường.
          drawSnowball(ctx, shot.x, shot.y, shot.r * (0.3 + 0.7 * shot.life), (shot.x + shot.y) / Math.max(4, shot.r), shot.z);
        }
      };
      drawShots(false);

      const k = authority ? 1 : 1 - Math.exp(-dt * 22);
      const bodies = Object.values(g.world.bodies).sort((a, b) => a.y - b.y);
      for (const b of bodies) {
        const skin = skinOf(state, p.players, b.id);
        const sinking = g.sinking.get(b.id);
        if (!b.alive) {
          if (!sinking) continue;
          const t = (performance.now() - sinking.at) / SINK_MS;
          if (t < 1) drawPenguin(ctx, { x: sinking.x, y: sinking.y, face: b.face, ball: 0, skin, sink: t });
          continue;
        }
        let d = disp.get(b.id);
        if (!d || Math.hypot(d.x - b.x, d.y - b.y) > 90) d = { x: b.x, y: b.y, face: b.face };
        else d = { x: d.x + (b.x - d.x) * k, y: d.y + (b.y - d.y) * k, face: d.face + wrap(b.face - d.face) * k };
        disp.set(b.id, d);
        drawPenguin(ctx, { x: d.x, y: d.y, face: d.face, ball: b.ball, skin, bob: now < at ? perf + b.x * 7 : undefined });
      }
      for (const b of bodies) {
        const d = disp.get(b.id);
        if (b.alive && d) drawTag(ctx, d.x, d.y, nameOf(b.id), skinOf(state, p.players, b.id).color, b.id === me, zoom);
      }
      drawShots(true);

      // Đang giữ nút bắn: vẽ đường bay vồng dự kiến và điểm rơi, màu cam phao viền đậm để nổi trên băng lẫn nước.
      // Rơi trên băng: vòng liền; rơi xuống nước: vòng đứt nét kèm dấu X.
      const aim = hold.current ? perf - hold.current.at - TAP_MS : -1;
      const mineNow = g.world.bodies[me];
      if (aim >= 0 && mine && playing && mineNow?.alive) {
        const path = lobPath(g.world, me, Math.max(0.01, Math.min(1, aim / CHARGE_MS)));
        if (path) {
          ctx.fillStyle = AIM_COLOR;
          ctx.strokeStyle = AIM_EDGE;
          ctx.lineWidth = 1.5;
          path.points.forEach((p, i) => {
            if (i === 0 || i === path.points.length - 1) return;
            ctx.beginPath();
            ctx.arc(p.x, p.y - p.z, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          });
          const { x, y, safe } = path.land;
          const rr = Math.max(20, path.r);
          const ring = (width: number, color: string) => {
            ctx.lineWidth = width;
            ctx.strokeStyle = color;
            ctx.setLineDash(safe ? [] : [6, 5]);
            ctx.beginPath();
            ctx.ellipse(x, y, rr, rr * 0.75, 0, 0, Math.PI * 2);
            ctx.stroke();
            if (!safe) {
              ctx.setLineDash([]);
              ctx.beginPath();
              ctx.moveTo(x - rr * 0.5, y - rr * 0.4);
              ctx.lineTo(x + rr * 0.5, y + rr * 0.4);
              ctx.moveTo(x + rr * 0.5, y - rr * 0.4);
              ctx.lineTo(x - rr * 0.5, y + rr * 0.4);
              ctx.stroke();
            }
          };
          ring(6, AIM_EDGE);
          ring(3.5, AIM_COLOR);
          ctx.setLineDash([]);
        }
      }
      drawParticles(ctx, particles, dt);
      ctx.restore();

      // Camera đi theo: người ngoài khung nhìn hiện mũi tên màu áo ở mép màn hình.
      if (follow) {
        for (const b of Object.values(g.world.bodies)) {
          if (!b.alive || b.id === me) continue;
          const sx = cx + b.x * zoom;
          const sy = cy + b.y * zoom;
          const m = 26;
          if (sx > m && sx < w - m && sy > 96 && sy < h - m) continue;
          const ex = Math.max(m, Math.min(w - m, sx));
          const ey = Math.max(96, Math.min(h - m, sy));
          const a = Math.atan2(sy - ey || sy - h / 2, sx - ex || sx - w / 2);
          ctx.save();
          ctx.translate(ex, ey);
          ctx.rotate(a);
          ctx.fillStyle = skinOf(state, p.players, b.id).color;
          ctx.strokeStyle = 'rgba(255,255,255,0.9)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(12, 0);
          ctx.lineTo(-8, -9);
          ctx.lineTo(-8, 9);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      }

      // Nút bắn: vòng sạc theo cỡ cầu tuyết.
      const mineBody = g.world.bodies[me];
      const btn = fireRef.current;
      if (btn) {
        btn.style.setProperty('--charge', String(mineBody?.alive ? ballCharge(mineBody.ball) : 0));
        btn.dataset.ready = mineBody?.alive && mineBody.ball >= BALL_READY && mineBody.cool === 0 ? '1' : '0';
        btn.dataset.aim = hold.current && perf - hold.current.at >= TAP_MS ? '1' : '0';
      }

      const ms = now - at;
      const next: Hud = {
        count: ms < 0 ? Math.min(3, Math.ceil(-ms / 1000)) : ms < 700 ? 0 : null,
        left: (state.roundSeconds ?? 60) > 0 ? Math.max(0, Math.min(state.roundSeconds ?? 60, Math.ceil((state.roundSeconds ?? 60) - elapsed))) : -1,
        alive: state.roster.filter((id) => g.world.bodies[id]?.alive).join(','),
      };
      setHud((prev) => (sameHud(prev, next) ? prev : next));
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [pushFeed]);

  /* ---------- Điều khiển ---------- */
  const canControl = inRound && st.stage === 'playing';
  const stick = useRef<{ id: number; x: number; y: number } | null>(null);
  const hold = useRef<{ id: number | 'key'; at: number } | null>(null);
  /** Đang giữ nút Thắng (hoặc phím Shift). */
  const brakeHeld = useRef(false);

  const showStick = (x: number, y: number, kx: number, ky: number) => {
    const el = stickRef.current;
    const knob = knobRef.current;
    if (!el || !knob) return;
    el.style.opacity = '1';
    el.style.transform = `translate(${x}px, ${y}px)`;
    knob.style.transform = `translate(${kx}px, ${ky}px)`;
  };
  const hideStick = () => {
    if (stickRef.current) stickRef.current.style.opacity = '0';
  };

  // Hết hiệp lúc ngón tay còn đặt trên màn: lớp điều khiển bị gỡ nên không bao giờ nhận được "nhấc tay".
  // Xóa ngón tay cũ mỗi khi vào hiệp mới hoặc mất quyền lái, nếu không lần chạm sau bị bỏ qua.
  useEffect(() => {
    stick.current = null;
    hold.current = null;
    brakeHeld.current = false;
    input.current = { ...input.current, angle: null, brake: false };
  }, [canControl, roundKey]);

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!canControl) return;
    // Ngón chạm mới luôn chiếm cần lái. Không bỏ qua khi tưởng đang có ngón khác giữ: trên điện thoại
    // có lúc không nhận được "nhấc tay" (hết hiệp, cuộc gọi, kéo thanh thông báo) và cần lái bị kẹt mãi.
    const old = stick.current;
    if (old && old.id !== e.pointerId && e.currentTarget.hasPointerCapture(old.id)) e.currentTarget.releasePointerCapture(old.id);
    const r = e.currentTarget.getBoundingClientRect();
    stick.current = { id: e.pointerId, x: e.clientX - r.left, y: e.clientY - r.top };
    e.currentTarget.setPointerCapture(e.pointerId);
    showStick(stick.current.x, stick.current.y, 0, 0);
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const sk = stick.current;
    if (!sk || sk.id !== e.pointerId) return;
    const r = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - r.left - sk.x;
    const dy = e.clientY - r.top - sk.y;
    const d = Math.hypot(dx, dy);
    const k = d > STICK_MAX ? STICK_MAX / d : 1;
    showStick(sk.x, sk.y, dx * k, dy * k);
    // Cần lái analog: dưới vùng chết thì đứng yên, kéo càng xa càng nhanh, chạm vòng ngoài là hết sức.
    const power = Math.max(0, Math.min(1, (d - STICK_DEAD) / (STICK_MAX - STICK_DEAD)));
    input.current = { ...input.current, angle: d > STICK_DEAD ? Math.atan2(dy, dx) : null, power: Math.max(0.2, power) };
  };
  const onUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (stick.current?.id !== e.pointerId) return;
    stick.current = null;
    hideStick();
    input.current = { ...input.current, angle: null };
  };
  const fire = (lob: number) => {
    if (!live.current.inRound || live.current.st.stage !== 'playing') return;
    input.current = { ...input.current, shots: input.current.shots + 1, lob };
    vibrate(15);
  };
  /** Đang giữ nút bắn (ngón tay hoặc phím Space) từ lúc nào. */
  const startHold = (id: number | 'key') => {
    if (!live.current.inRound || live.current.st.stage !== 'playing') return;
    hold.current = { id, at: performance.now() };
  };
  /** Thả nút: giữ ngắn là bắn thẳng, giữ lâu là bắn vồng tới điểm đang canh. */
  const releaseHold = (id: number | 'key') => {
    const h = hold.current;
    if (!h || h.id !== id) return;
    hold.current = null;
    const held = performance.now() - h.at;
    fire(held < TAP_MS ? 0 : Math.max(0.01, Math.min(1, (held - TAP_MS) / CHARGE_MS)));
  };
  const holdFns = useRef({ startHold, releaseHold });
  holdFns.current = { startHold, releaseHold };
  /** Nút thắng: giữ để cắm chân dừng gấp và đứng tấn chịu đòn. */
  const setBrake = (on: boolean) => {
    if (on && (!live.current.inRound || live.current.st.stage !== 'playing')) return;
    if (brakeHeld.current === on) return;
    brakeHeld.current = on;
    if (on) vibrate(10);
  };
  const brakeFn = useRef(setBrake);
  brakeFn.current = setBrake;

  // Bàn phím: mũi tên / WASD để lái, Space để bắn.
  useEffect(() => {
    const keys = new Set<string>();
    const dir: Record<string, [number, number]> = {
      ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1],
      ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0],
    };
    const update = () => {
      let x = 0;
      let y = 0;
      for (const k of keys) {
        x += dir[k][0];
        y += dir[k][1];
      }
      if (stick.current) return;
      input.current = { ...input.current, angle: x || y ? Math.atan2(y, x) : null, power: 1 };
    };
    const down = (e: KeyboardEvent) => {
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        brakeFn.current(true);
      } else if (e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat) holdFns.current.startHold('key');
      } else if (dir[e.code]) {
        e.preventDefault();
        keys.add(e.code);
        update();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') holdFns.current.releaseHold('key');
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') brakeFn.current(false);
      if (!dir[e.code]) return;
      keys.delete(e.code);
      update();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  const alive = new Set(hud.alive.split(',').filter(Boolean));
  const meAlive = alive.has(meId);
  const over = st.stage === 'round_over' || st.stage === 'game_over';

  return (
    <div className={s.arena} ref={boxRef}>
      <canvas ref={canvasRef} className={s.canvas} aria-label={strings.title} />

      <div className={s.hud}>
        <div className={s.rounds} aria-label={strings.round(st.round, st.maxRounds)}>
          {Array.from({ length: st.maxRounds }, (_, i) => (
            <i key={i} className={cx(s.roundPip, i < st.round - 1 && s.roundDone, i === st.round - 1 && s.roundNow)} />
          ))}
          <span>{strings.round(st.round, st.maxRounds)}</span>
        </div>
        {st.stage === 'playing' && (
          <div className={cx(s.timer, hud.left >= 0 && hud.left <= 10 && s.timerLow)} role="timer" aria-label={hud.left < 0 ? strings.noLimit : strings.timeLeft(hud.left)}>
            {hud.left < 0 ? '∞' : strings.clock(hud.left)}
          </div>
        )}
        <ul className={s.roster}>
          {st.roster.map((id) => (
            <li key={id} className={cx(s.rosterItem, !alive.has(id) && hud.count === null && s.rosterOut)} style={{ '--skin': skinOf(st, party.players, id).color } as CSSProperties}>
              <i aria-hidden="true" />
              <span>{party.nameOf(id) || '?'}</span>
              {(st.wins[id] ?? 0) > 0 && <b>{st.wins[id]}</b>}
            </li>
          ))}
        </ul>
      </div>

      <div className={s.feed} aria-live="polite">
        {feed.map((f) => (
          <p key={f.id} className={s.feedItem}>{f.text}</p>
        ))}
      </div>

      {hud.count !== null && st.stage === 'playing' && (
        <div className={s.countdown} aria-live="assertive">
          <span key={hud.count} className={cx(s.countNum, hud.count === 0 && s.countGo)}>{hud.count || strings.go}</span>
        </div>
      )}

      {canControl && (
        <>
          <div className={s.touch} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onLostPointerCapture={onUp}>
            <div className={s.stick} ref={stickRef} aria-hidden="true">
              <div className={s.knob} ref={knobRef} />
            </div>
            {hud.count !== null && <p className={s.hint}>{strings.steerHint}</p>}
          </div>
          <button
            ref={fireRef}
            type="button"
            className={s.fire}
            aria-label={strings.fire}
            onPointerDown={(e) => {
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              startHold(e.pointerId);
            }}
            onPointerUp={(e) => releaseHold(e.pointerId)}
            onPointerCancel={() => (hold.current = null)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.repeat) fire(0);
            }}
          >
            <span className={s.fireCore} />
          </button>
          <button
            type="button"
            className={s.brake}
            aria-label={strings.brake}
            onPointerDown={(e) => {
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              setBrake(true);
            }}
            onPointerUp={() => setBrake(false)}
            onPointerCancel={() => setBrake(false)}
            onLostPointerCapture={() => setBrake(false)}
          >
            <span className={s.brakeLabel} aria-hidden="true">{strings.brakeShort}</span>
          </button>
        </>
      )}

      {!over && st.stage === 'playing' && hud.count === null && (!inRound || !meAlive) && (
        <p className={s.note}>{inRound ? strings.out : strings.spectating}</p>
      )}

      {over && <RoundPanel party={party} />}
    </div>
  );
}

/** Hết hiệp / hết trận: người thắng, bảng điểm, nút đi tiếp (máy nào trong phòng cũng bấm được). */
function RoundPanel({ party }: { party: SnowarParty }) {
  const st = party.state!;
  const result = st.result;
  const final = st.stage === 'game_over';
  const rows = standings(st, party.players.filter((p) => st.roster.includes(p.id) || (st.wins[p.id] ?? 0) > 0));
  const winnerColor = st.winnerId ? skinOf(st, party.players, st.winnerId).color : undefined;
  return (
    <div className={s.panel} role="dialog" aria-label={result?.text} style={{ '--win': winnerColor ?? 'var(--ib-ink-soft)' } as CSSProperties}>
      <p className={s.panelKicker}>{final ? strings.matchOver : strings.round(st.round, st.maxRounds)}</p>
      <h2 className={s.panelTitle}>{result?.text}</h2>
      <ol className={s.table}>
        {rows.map(({ p, wins, kos }, i) => (
          <li key={p.id} className={cx(s.row, final && i === 0 && s.rowTop)} style={{ '--skin': skinOf(st, party.players, p.id).color } as CSSProperties}>
            <i aria-hidden="true" />
            <span className={s.rowName}>{p.name}</span>
            <span className={s.pips} aria-label={strings.wins(wins)}>
              {Array.from({ length: st.maxRounds }, (_, k) => (
                <b key={k} className={cx(k < wins && s.pipOn)} />
              ))}
            </span>
            <span className={s.rowKos}>{strings.kos(kos)}</span>
          </li>
        ))}
      </ol>
      {result && (
        <button type="button" className={s.panelButton} onClick={() => party.dispatch({ type: 'next', seq: result.seq })}>
          {final ? strings.backToGarage : strings.nextRound}
        </button>
      )}
    </div>
  );
}

