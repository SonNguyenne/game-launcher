import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { vibrate } from '@bang/party';
import { cx } from '@bang/ui';
import type { BowlParty } from './game';
import { BALL_R, FRAME_EVERY, HEAD_PIN, MAX_ANGLE, PIN_SPOTS, START_MAX, STEP, roll } from './sim';
import { drawAim, drawBall, drawFallenPin, drawPin, drawPower, drawScene, drawStartZone, laneXAt, makeView, project, type View } from './render';
import { strings } from './strings';
import s from './Bowling.module.css';

/** Màu bi theo chỗ ngồi. */
export const BALL_COLORS = ['#3D6BFF', '#FF4F8B', '#22C98A', '#FFB23D'];

interface Anim {
  frames: Float32Array[];
  hits: { t: number; strong: boolean }[];
  start: number;
  played: number;
  color: string;
  /** Khung ki bắt đầu ngã, hướng ngã trên màn hình và góc nằm trên sàn. */
  fall: { at: number; dir: number; a: number }[];
}

interface Spark {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  c: string;
  born: number;
}

/** Sau khi bi dừng còn giữ khung nhìn ki thêm một chút. */
const HOLD = 0.9;
/** Thời gian (khung 1/60 s) một ki đổ từ đứng sang nằm. */
const TIP = 12;
/** Chỗ bi nằm chờ ném, ngay sau vạch. */
const REST_Y = -30;
const SPARK_COLORS = ['#FF4FD8', '#3DE7FF', '#FFD23D', '#FFFFFF'];
export const SPINS = [-1, -0.5, 0, 0.5, 1] as const;

export interface Outcome {
  n: number;
  knocked: number;
  kind: 'strike' | 'spare' | 'gutter' | 'pins';
}

/** Kéo ngược như ná: kéo xuống càng xa càng mạnh, lệch sang trái thì bi đi sang phải. */
export function pullToThrow(dx: number, dy: number, maxPull: number) {
  const power = Math.max(0, Math.min(1, dy / maxPull));
  const angle = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, (-dx / maxPull) * MAX_ANGLE * 1.6));
  return { power, angle };
}

function fallOf(frames: Float32Array[]): Anim['fall'] {
  return PIN_SPOTS.map((spot, k) => {
    const at = frames.findIndex((f) => f[4 + k * 3] === 1);
    if (at < 0) return { at: -1, dir: 1, a: 0 };
    const from = frames[Math.max(0, at - 1)];
    const to = frames[Math.min(frames.length - 1, at + 6)];
    let mx = to[2 + k * 3] - from[2 + k * 3];
    let my = to[3 + k * 3] - from[3 + k * 3];
    if (!Number.isFinite(mx) || !Number.isFinite(my) || Math.hypot(mx, my) < 0.5) {
      mx = spot.x || (k % 2 ? 1 : -1);
      my = 2;
    }
    return { at, dir: mx < 0 ? -1 : 1, a: Math.atan2(my, mx) };
  });
}

type Drag = { mode: 'wait' | 'move' | 'pull'; sx: number; sy: number; x: number; y: number };

export function Lane({ party, onOutcome, onRolling }: { party: BowlParty; onOutcome: (o: Outcome) => void; onRolling: (v: boolean) => void }) {
  const st = party.state!;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const local = party.mode === 'local';
  const canAct = !st.done && (local || st.seats[st.turn] === party.me);
  const [rolling, setRolling] = useState(false);
  const [spin, setSpin] = useState(0);
  const [aimed, setAimed] = useState(false);
  const anim = useRef<Anim | null>(null);
  const drag = useRef<Drag | null>(null);
  const x0 = useRef(0);
  const thrown = useRef(false);
  const view = useRef<View | null>(null);
  const sparks = useRef<Spark[]>([]);
  const rackAt = useRef(-1e9);
  const live = useRef({ st, canAct, party, onOutcome, rolling, spin });
  live.current = { st, canAct, party, onOutcome, rolling, spin };
  const lastShot = useRef(st.shot?.n ?? null);

  const shotN = st.shot?.n ?? null;
  useEffect(() => {
    if (shotN === lastShot.current) return;
    lastShot.current = shotN;
    thrown.current = false;
    const shot = live.current.st.shot;
    if (!shot) return;
    const r = roll(shot.standing, shot.throw, true);
    const color = BALL_COLORS[shot.by % BALL_COLORS.length];
    anim.current = { frames: r.frames, hits: r.hits, start: performance.now(), played: 0, color, fall: fallOf(r.frames) };
    setRolling(true);
  }, [shotN]);

  useEffect(() => onRolling(rolling), [rolling, onRolling]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let raf = 0;
    let lastHit = 0;
    let shakeAt = -1e9;
    let cam = 0;
    let prev = performance.now();

    const burst = (big: boolean) => {
      if (reduce) return;
      const now = performance.now();
      const n = big ? 70 : 36;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + i * 0.37;
        const sp = 60 + ((i * 53) % 140);
        sparks.current.push({ x: 0, y: HEAD_PIN + 40, z: 20, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: 160 + ((i * 31) % 160), c: SPARK_COLORS[i % SPARK_COLORS.length], born: now });
      }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      const { st: cur, canAct: act, spin: sp } = live.current;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;
      if (canvas.width !== Math.round(w * dpr)) canvas.width = Math.round(w * dpr);
      if (canvas.height !== Math.round(h * dpr)) canvas.height = Math.round(h * dpr);
      const a = anim.current;
      const t = a ? (now - a.start) / 1000 : 0;
      const i = a ? Math.min(a.frames.length - 1, Math.floor(t / (STEP * FRAME_EVERY))) : 0;
      const f = a?.frames[i];

      // Máy quay: đứng sau vạch lúc ngắm, đuổi theo bi khi lăn rồi dừng trước sàn ki.
      let target = 0;
      if (f) target = Number.isNaN(f[0]) ? HEAD_PIN - 760 : Math.max(0, Math.min(HEAD_PIN - 760, f[1] - 320));
      cam += (target - cam) * (1 - Math.exp(-dt * (a ? 7 : 4)));
      const v = makeView(w, h, cam);
      view.current = v;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const shake = now - shakeAt < 260 && !reduce ? (1 - (now - shakeAt) / 260) * 5 : 0;
      if (shake) ctx.translate(Math.sin(now * 0.09) * shake, Math.cos(now * 0.11) * shake * 0.6);
      drawScene(ctx, v, now / 1000);

      if (a && f) {
        while (a.played < a.hits.length && a.hits[a.played].t <= t) {
          const hit = a.hits[a.played++];
          if (now - lastHit > 70) {
            lastHit = now;
            live.current.party.sfx(hit.strong ? 'tap' : 'tick');
            if (hit.strong) {
              vibrate(12);
              shakeAt = now;
            }
          }
        }
        // Vẽ từ xa tới gần để vật gần che vật xa.
        const items: { y: number; draw: () => void }[] = [];
        for (let k = 0; k < 10; k++) {
          const px = f[2 + k * 3];
          const py = f[3 + k * 3];
          if (Number.isNaN(px)) continue;
          const fl = a.fall[k];
          if (fl.at < 0 || i < fl.at) items.push({ y: py, draw: () => drawPin(ctx, v, px, py) });
          else if (i - fl.at < TIP) items.push({ y: py, draw: () => drawPin(ctx, v, px, py, (i - fl.at) / TIP, fl.dir) });
          else items.push({ y: py, draw: () => drawFallenPin(ctx, v, px, py, fl.a) });
        }
        if (!Number.isNaN(f[0])) {
          const bx = f[0];
          const by = f[1];
          items.push({ y: by, draw: () => drawBall(ctx, v, bx, by, a.color, by / BALL_R) });
        }
        items.sort((p, q) => q.y - p.y).forEach((it) => it.draw());

        if (i >= a.frames.length - 1 && t > a.frames.length * STEP * FRAME_EVERY + HOLD) {
          anim.current = null;
          rackAt.current = now;
          setRolling(false);
          const shot = live.current.st.shot;
          if (shot) {
            const before = shot.standing.filter(Boolean).length;
            const n = shot.knocked.length;
            const kind = n === 10 && before === 10 ? 'strike' : n === before && n > 0 ? 'spare' : shot.gutter && n === 0 ? 'gutter' : 'pins';
            if (kind === 'strike' || kind === 'spare') burst(kind === 'strike');
            live.current.onOutcome({ n: shot.n, knocked: n, kind });
          }
        }
      } else {
        // Ki dựng lại: rơi từ trên xuống, xa trước gần sau.
        const since = (now - rackAt.current) / 1000;
        const order = PIN_SPOTS.map((_, k) => k).sort((p, q) => PIN_SPOTS[q].y - PIN_SPOTS[p].y);
        for (const k of order) {
          if (!cur.standing[k]) continue;
          const u = reduce ? 1 : Math.max(0, Math.min(1, (since - 0.15 - (9 - k) * 0.03) / 0.35));
          const z = (1 - u) * (1 - u) * 60;
          if (u > 0) drawPin(ctx, v, PIN_SPOTS[k].x, PIN_SPOTS[k].y, 0, 1, z);
        }
        if (act) {
          const d = drag.current;
          const pull = d?.mode === 'pull' ? pullToThrow(d.x - d.sx, d.y - d.sy, h * 0.3) : null;
          if (!thrown.current) {
            drawStartZone(ctx, v);
            drawAim(ctx, v, x0.current, pull?.angle ?? 0, sp, pull?.power ?? 0, now / 1000);
          }
          const color = BALL_COLORS[cur.turn % BALL_COLORS.length];
          drawBall(ctx, v, x0.current, REST_Y - (pull?.power ?? 0) * 70, color, 0.2);
          if (pull) drawPower(ctx, v, pull.power);
        }
      }

      // Pháo sáng khi strike/spare.
      if (sparks.current.length) {
        sparks.current = sparks.current.filter((p) => now - p.born < 1400);
        for (const p of sparks.current) {
          const age = (now - p.born) / 1000;
          const q = project(v, p.x + p.vx * age, p.y + p.vy * age, Math.max(0, p.z + p.vz * age - 260 * age * age));
          ctx.globalAlpha = 1 - age / 1.4;
          ctx.fillStyle = p.c;
          ctx.fillRect(q.x - 2, q.y - 2, Math.max(2, 2.5 * q.k), Math.max(2, 2.5 * q.k));
        }
        ctx.globalAlpha = 1;
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const ready = canAct && !rolling;
  const point = (e: ReactPointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const down = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!ready || thrown.current || !view.current) return;
    const p = point(e);
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { mode: 'wait', sx: p.x, sy: p.y, x: p.x, y: p.y };
  };
  const move = (e: ReactPointerEvent) => {
    const d = drag.current;
    const v = view.current;
    if (!d || !v) return;
    const p = point(e);
    d.x = p.x;
    d.y = p.y;
    if (d.mode === 'wait' && Math.hypot(p.x - d.sx, p.y - d.sy) > 8) {
      // Chạm gần bi và kéo ngang là dời chỗ đứng; còn lại là kéo ná để ném.
      const b = project(v, x0.current, REST_Y, BALL_R);
      const nearBall = Math.hypot(d.sx - b.x, d.sy - b.y) < BALL_R * b.k * 2.6;
      d.mode = nearBall && Math.abs(p.x - d.sx) > Math.abs(p.y - d.sy) ? 'move' : 'pull';
    }
    if (d.mode === 'move') x0.current = Math.max(-START_MAX, Math.min(START_MAX, laneXAt(v, p.x, REST_Y)));
  };
  const up = (e: ReactPointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d || !ready || d.mode !== 'pull') return;
    const p = point(e);
    const h = canvasRef.current!.clientHeight;
    const { power, angle } = pullToThrow(p.x - d.sx, p.y - d.sy, h * 0.3);
    if (power < 0.08) return;
    thrown.current = true;
    setAimed(true);
    vibrate(20);
    party.sfx('tap');
    party.dispatch({ type: 'roll', x0: x0.current, angle, power, spin });
  };

  return (
    <div className={s.laneWrap}>
      <canvas
        ref={canvasRef}
        className={cx(s.canvas, ready && s.canvasLive)}
        aria-label={strings.lane}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={() => (drag.current = null)}
      />
      {ready && (
        <>
          {!aimed && <p className={s.swipeHint}>{strings.swipeHint}</p>}
          <div className={s.spinBar} role="group" aria-label={strings.spinLabel}>
            {SPINS.map((v) => (
              <button key={v} type="button" className={cx(s.spinBtn, v === spin && s.spinOn)} aria-pressed={v === spin} aria-label={strings.spinName(v)} onClick={() => setSpin(v)}>
                {strings.spinIcon(v)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
