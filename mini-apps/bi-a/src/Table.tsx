import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { vibrate } from '@bang/party';
import { cx } from '@bang/ui';
import { seatOf, shooter, type BiaParty } from './game';
import { FRAME_EVERY, R, STEP, canPlace, predict, simulate } from './sim';
import { POCKET_FX_MS, drawAim, drawBall, drawHandRing, drawPocketFx, drawTable, viewOf, type PocketFx, type View } from './render';
import { strings } from './strings';
import s from './Bia.module.css';

interface Anim {
  frames: Float32Array[];
  sounds: ReturnType<typeof simulate>['sounds'];
  start: number;
  played: number;
  /** Khung đã quét để bắt bi rơi lỗ. */
  scanned: number;
}

/** Kéo lùi bao nhiêu cm thì đủ lực tối đa. */
const PULL_MAX = 55;
/** Thời gian gậy lao tới bi cái (ms). */
const STRIKE_MS = 130;
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Bàn bi-a trên canvas: ngắm, đặt bi cái, chỉnh lực và phát lại cú đánh. */
export function Table({ party, onRolling }: { party: BiaParty; onRolling: (rolling: boolean) => void }) {
  const st = party.state!;
  const local = party.mode === 'local';
  const mySeat = local ? shooter(st) : seatOf(st, party.me);
  const canAct = !st.done && mySeat !== null && mySeat === shooter(st);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [power, setPower] = useState(0.5);
  const [rolling, setRolling] = useState(false);
  const aim = useRef(-Math.PI / 2);
  /** Chỗ đặt bi cái đang kéo (khi cầm bi), cùng chỗ hợp lệ gần nhất. */
  const hand = useRef<{ x: number; y: number; ok: boolean; lastOk: { x: number; y: number } } | null>(null);
  const drag = useRef<'aim' | 'cue' | 'pull' | null>(null);
  const anim = useRef<Anim | null>(null);
  const fx = useRef<PocketFx[]>([]);
  /** Gậy đang lao tới: đánh thật khi hết thời gian. */
  const strike = useRef<{ t0: number; angle: number; power: number; cx?: number; cy?: number } | null>(null);
  const view = useRef<View>({ scale: 1, ox: 0, oy: 0 });
  const live = useRef({ st, canAct, power, rolling, party });
  live.current = { st, canAct, power, rolling, party };
  const lastShot = useRef<number | null>(st.shot?.n ?? null);

  // Có cú đánh mới: chạy lại cùng mô phỏng để phát hoạt ảnh.
  const shotN = st.shot?.n ?? null;
  useEffect(() => {
    if (shotN === lastShot.current) return;
    lastShot.current = shotN;
    const shot = live.current.st.shot;
    if (!shot) return;
    const sim = simulate(shot.from, shot.vx, shot.vy, true);
    anim.current = { frames: sim.frames, sounds: sim.sounds, start: performance.now(), played: 0, scanned: 0 };
    hand.current = null;
    strike.current = null;
    fx.current = [];
    setRolling(true);
    live.current.party.sfx('tap');
  }, [shotN]);

  useEffect(() => onRolling(rolling), [rolling, onRolling]);

  // Lượt mới mà được cầm bi: bắt đầu từ chỗ bi cái đang nằm.
  const inHandKey = canAct && !rolling && st.inHand ? `${st.seq}` : '';
  useEffect(() => {
    if (!inHandKey) {
      hand.current = null;
      return;
    }
    const b = live.current.st.balls[0];
    hand.current = { x: b.x, y: b.y, ok: true, lastOk: { x: b.x, y: b.y } };
  }, [inHandKey]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const { st: cur, canAct: act, power: pw } = live.current;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr)) canvas.width = Math.round(w * dpr);
      if (canvas.height !== Math.round(h * dpr)) canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const v = viewOf(w, h);
      view.current = v;
      const a = anim.current;
      drawTable(ctx, v, act && !a && cur.inHand === 'kitchen');

      if (a) {
        const t = (now - a.start) / 1000;
        while (a.played < a.sounds.length && a.sounds[a.played].t <= t) {
          const snd = a.sounds[a.played++];
          if (snd.kind === 'pocket') {
            live.current.party.sfx('tick');
            vibrate(15);
          } else if (snd.kind === 'hit') live.current.party.sfx('tap');
        }
        const i = Math.min(a.frames.length - 1, Math.floor(t / (STEP * FRAME_EVERY)));
        const f = a.frames[i];
        // Bi vừa biến mất khỏi khung: bắt lấy vị trí cuối để chạy hoạt ảnh rơi lỗ.
        for (; a.scanned < i; a.scanned++) {
          const p0 = a.frames[a.scanned];
          const p1 = a.frames[a.scanned + 1];
          for (let id = 0; id < 16; id++)
            if (!Number.isNaN(p0[id * 2]) && Number.isNaN(p1[id * 2]) && !reduced()) fx.current.push({ id, x: p0[id * 2], y: p0[id * 2 + 1], t0: now });
        }
        fx.current = fx.current.filter((e) => now - e.t0 < POCKET_FX_MS);
        for (const e of fx.current) drawPocketFx(ctx, v, e, now);
        for (let id = 15; id >= 0; id--) if (!Number.isNaN(f[id * 2])) drawBall(ctx, v, id, f[id * 2], f[id * 2 + 1]);
        if (i >= a.frames.length - 1) {
          anim.current = null;
          setRolling(false);
        }
        return;
      }

      const hd = act && cur.inHand ? hand.current : null;
      fx.current = fx.current.filter((e) => now - e.t0 < POCKET_FX_MS);
      for (const e of fx.current) drawPocketFx(ctx, v, e, now);
      for (let id = 15; id >= 1; id--) {
        const b = cur.balls[id];
        if (b.on) drawBall(ctx, v, id, b.x, b.y);
      }
      const cue = hd ?? cur.balls[0];
      if (cur.balls[0].on || hd) drawBall(ctx, v, 0, cue.x, cue.y);
      if (act && !cur.done) {
        if (hd) drawHandRing(ctx, v, hd.x, hd.y, hd.ok);
        const dx = Math.cos(aim.current);
        const dy = Math.sin(aim.current);
        const balls = hd ? cur.balls.map((b) => (b.id === 0 ? { ...b, x: hd.x, y: hd.y } : b)) : cur.balls;
        const sk = strike.current;
        const e = sk ? Math.min(1, (now - sk.t0) / STRIKE_MS) : 0;
        drawAim(ctx, v, cue, predict(balls, dx, dy), dx, dy, sk ? sk.power : pw, !hd || hd.ok, e * e, now);
        if (sk && e >= 1) {
          strike.current = null;
          vibrate(20);
          live.current.party.sfx('tap');
          live.current.party.dispatch(sk.cx === undefined ? { type: 'shoot', angle: sk.angle, power: sk.power } : { type: 'shoot', angle: sk.angle, power: sk.power, cx: sk.cx, cy: sk.cy });
        }
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const toTable = (e: ReactPointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const v = view.current;
    return { x: (e.clientX - rect.left - v.ox) / v.scale, y: (e.clientY - rect.top - v.oy) / v.scale };
  };
  const cuePos = () => hand.current ?? st.balls[0];
  const ready = canAct && !rolling;

  const move = (e: ReactPointerEvent) => {
    const p = toTable(e);
    if (drag.current === 'cue' && hand.current) {
      const ok = canPlace(st.balls, p.x, p.y, st.inHand === 'kitchen');
      hand.current = { x: p.x, y: p.y, ok, lastOk: ok ? { x: p.x, y: p.y } : hand.current.lastOk };
    } else if (drag.current === 'aim') {
      const c = cuePos();
      if (Math.hypot(p.x - c.x, p.y - c.y) > R) aim.current = Math.atan2(p.y - c.y, p.x - c.x);
    } else if (drag.current === 'pull') {
      // Kéo lùi khỏi bi cái: hướng đánh ngược chiều kéo, lực theo độ dài kéo.
      const c = cuePos();
      const d = Math.hypot(p.x - c.x, p.y - c.y);
      if (d > R) {
        aim.current = Math.atan2(c.y - p.y, c.x - p.x);
        const pw = Math.min(1, Math.max(0, (d - R * 1.5) / PULL_MAX));
        if (Math.abs(pw - live.current.power) > 0.01) {
          if (Math.floor(pw * 10) !== Math.floor(live.current.power * 10)) live.current.party.sfx('tick');
          live.current.power = pw;
          setPower(pw);
        }
      }
    }
  };
  const down = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!ready || strike.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toTable(e);
    const c = cuePos();
    const near = Math.hypot(p.x - c.x, p.y - c.y);
    // Cầm bi: chạm đúng bi cái để dời; còn lại chạm gần bi cái để kéo lùi lấy lực.
    drag.current = hand.current && near < R * 3.2 ? 'cue' : near < R * 9 && !hand.current ? 'pull' : 'aim';
    if (drag.current === 'pull') {
      live.current.power = 0;
      setPower(0);
    }
    move(e);
  };
  const up = () => {
    if (drag.current === 'cue' && hand.current && !hand.current.ok) {
      const back = hand.current.lastOk;
      hand.current = { ...back, ok: true, lastOk: back };
    }
    const wasPull = drag.current === 'pull';
    drag.current = null;
    if (wasPull && live.current.power > 0.04) fire();
  };

  const fire = () => {
    const pw = live.current.power;
    if (!ready || pw <= 0.01 || strike.current) return;
    const h = hand.current;
    const shot = { angle: aim.current, power: pw, cx: h?.lastOk.x, cy: h?.lastOk.y };
    if (reduced()) {
      vibrate(20);
      party.dispatch(h ? { type: 'shoot', angle: shot.angle, power: pw, cx: shot.cx, cy: shot.cy } : { type: 'shoot', angle: shot.angle, power: pw });
    } else {
      strike.current = { t0: performance.now(), ...shot };
    }
  };

  const bar = useRef<HTMLDivElement>(null);
  const setFromBar = (e: ReactPointerEvent) => {
    const r = bar.current!.getBoundingClientRect();
    setPower(Math.min(1, Math.max(0.02, (e.clientX - r.left) / r.width)));
  };
  const nudge = (d: number) => (aim.current += d);

  return (
    <>
      <div className={s.tableWrap}>
        <canvas
          ref={canvasRef}
          className={cx(s.canvas, ready && s.canvasLive)}
          aria-label={strings.table}
          onPointerDown={down}
          onPointerMove={(e) => drag.current && move(e)}
          onPointerUp={up}
          onPointerCancel={up}
        />
      </div>
      {ready && (
        <div className={s.controls}>
          <p className={s.hint}>{st.inHand ? (st.inHand === 'kitchen' ? strings.placeKitchen : strings.placeHint) : strings.aimHint}</p>
          <div className={s.controlRow}>
            <button className={s.nudge} onClick={() => nudge(-0.004)} aria-label={strings.nudgeLeft}>‹</button>
            <div
              ref={bar}
              className={s.powerBar}
              role="slider"
              aria-label={strings.power}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(power * 100)}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') setPower((p) => Math.min(1, p + 0.05));
                if (e.key === 'ArrowLeft') setPower((p) => Math.max(0.02, p - 0.05));
              }}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                setFromBar(e);
              }}
              onPointerMove={(e) => e.buttons && setFromBar(e)}
            >
              <span className={s.powerFill} style={{ width: `${power * 100}%` }} />
              <span className={s.powerLabel}>{strings.power} {Math.round(power * 100)}</span>
            </div>
            <button className={s.nudge} onClick={() => nudge(0.004)} aria-label={strings.nudgeRight}>›</button>
            <button className={s.shoot} onClick={fire}>{strings.shoot}</button>
          </div>
        </div>
      )}
    </>
  );
}

