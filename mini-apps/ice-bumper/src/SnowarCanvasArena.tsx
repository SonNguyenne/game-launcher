import { useEffect, useRef } from 'react';
import type { PlayerVehicle, SnowarParty, Snowball } from './game';
import { drawFlyingSnowball, drawIceArena, drawVehicle } from './SnowarRenderer';
import s from './IceBumper.module.css';

export interface SnowarCanvasArenaProps {
  party: SnowarParty;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
}

const ARENA_RADIUS = 280;
const VEHICLE_SPEED = 4.0;
const BALL_MAX_RADIUS = 36;
const BALL_GROWTH_RATE = 14;
const BALL_SHOOT_SPEED = 12;

export function SnowarCanvasArena({ party }: SnowarCanvasArenaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const st = party.state;
  const isHost = party.isHost;
  const myId = party.me;

  // Local game state để chạy loop mượt mà độc lập
  const localVehiclesRef = useRef<Record<string, PlayerVehicle>>({});
  const localBallsRef = useRef<Snowball[]>([]);

  // Throttling gửi input mạng
  const lastSendTimeRef = useRef(0);

  // Điều khiển joystick
  const joystickRef = useRef<{ active: boolean; startX: number; startY: number }>({
    active: false,
    startX: 0,
    startY: 0,
  });
  const inputAngleRef = useRef<number | null>(null);

  // Hiệu ứng hạt tuyết
  const snowFlakesRef = useRef<{ x: number; y: number; r: number; vy: number; vx: number }[]>([]);
  const splashParticlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const flakes = [];
    for (let i = 0; i < 70; i++) {
      flakes.push({
        x: Math.random() * 1200,
        y: Math.random() * 800,
        r: Math.random() * 2.5 + 1,
        vy: Math.random() * 1.5 + 1,
        vx: Math.random() * 1 - 0.5,
      });
    }
    snowFlakesRef.current = flakes;
  }, []);

  // 1. Khởi tạo & cập nhật từ party.state
  useEffect(() => {
    if (!st?.vehicles) return;

    Object.entries(st.vehicles).forEach(([id, v]) => {
      const current = localVehiclesRef.current[id];
      if (!current) {
        localVehiclesRef.current[id] = { ...v };
      } else {
        // Chỉ đồng bộ khi không phải máy mình
        if (id !== myId) {
          // KHÔNG ghi đè giật lùi, chỉ cập nhật vận tốc và bù trừ nhẹ sai số
          current.vx = v.vx;
          current.vy = v.vy;
          current.angle = v.angle;
          current.snowballRadius = v.snowballRadius;
          current.alive = v.alive;
          current.score = v.score;

          // Nếu lệch quá lớn thì mới kéo dần về vị trí server
          const dist = Math.hypot(v.x - current.x, v.y - current.y);
          if (dist > 40) {
            current.x += (v.x - current.x) * 0.2;
            current.y += (v.y - current.y) * 0.2;
          }
        } else {
          current.alive = v.alive;
          current.score = v.score;
        }
      }
    });

    if (st.snowballs && !isHost) {
      localBallsRef.current = st.snowballs;
    }
  }, [st?.vehicles, st?.snowballs, isHost, myId]);

  // 2. Main Render & Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !st) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let lastTime = performance.now();
    let syncTimer = 0;

    const loop = (now: number) => {
      animId = requestAnimationFrame(loop);
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const w = canvas.width || 360;
      const h = canvas.height || 640;
      const centerX = w / 2;
      const centerY = h / 2;
      const scale = Math.min(w / 720, h / 620, 1.25);
      const scaledIceR = ARENA_RADIUS * scale;

      const vehicles = localVehiclesRef.current;
      const myVehicle = vehicles[myId];

      // A. Cập nhật xe người chơi hiện tại
      if (myVehicle && myVehicle.alive && st.stage === 'playing') {
        if (joystickRef.current.active && inputAngleRef.current !== null) {
          const angle = inputAngleRef.current;
          myVehicle.angle = angle;
          myVehicle.vx = Math.cos(angle) * VEHICLE_SPEED;
          myVehicle.vy = Math.sin(angle) * VEHICLE_SPEED;

          if (myVehicle.snowballRadius < BALL_MAX_RADIUS) {
            myVehicle.snowballRadius += BALL_GROWTH_RATE * dt;
          }

          if (Math.random() < 0.35) {
            splashParticlesRef.current.push({
              x: myVehicle.x + Math.cos(angle) * (20 + myVehicle.snowballRadius),
              y: myVehicle.y + Math.sin(angle) * (20 + myVehicle.snowballRadius),
              vx: (Math.random() - 0.5) * 40,
              vy: (Math.random() - 0.5) * 40,
              radius: Math.random() * 3 + 1,
              alpha: 1,
            });
          }
        } else {
          myVehicle.vx *= 0.88;
          myVehicle.vy *= 0.88;
        }

        // Host cập nhật trực tiếp vào st.vehicles[myId] để không bị mất gói
        if (isHost && st.vehicles[myId]) {
          st.vehicles[myId].x = myVehicle.x;
          st.vehicles[myId].y = myVehicle.y;
          st.vehicles[myId].vx = myVehicle.vx;
          st.vehicles[myId].vy = myVehicle.vy;
          st.vehicles[myId].angle = myVehicle.angle;
          st.vehicles[myId].snowballRadius = myVehicle.snowballRadius;
        }

        // Khách gửi góc lái định kỳ (mỗi 60ms)
        if (!isHost && now - lastSendTimeRef.current > 60) {
          lastSendTimeRef.current = now;
          party.dispatch({
            type: 'steer',
            angle: myVehicle.angle,
            rolling: joystickRef.current.active,
          });
        }
      }

      // B. Tính toán vật lý cho tất cả các xe tại 60fps
      const vList = Object.values(vehicles);
      vList.forEach((v) => {
        if (!v.alive) return;
        v.x += v.vx;
        v.y += v.vy;

        // Nếu xe đối thủ đang di chuyển thì tăng bóng tuyết
        if (v.id !== myId && Math.hypot(v.vx, v.vy) > 0.5 && v.snowballRadius < BALL_MAX_RADIUS) {
          v.snowballRadius += BALL_GROWTH_RATE * dt;
        }

        // Kiểm tra rơi xuống biển
        const dist = Math.hypot(v.x, v.y / 0.58);
        if (dist > ARENA_RADIUS + 30) {
          v.alive = false;
          v.vx = 0;
          v.vy = 0;
          v.snowballRadius = 0;
          party.sfx('buzz');
        }
      });

      // C. Xử lý bóng tuyết bay & va chạm
      const balls = localBallsRef.current;
      for (let i = balls.length - 1; i >= 0; i--) {
        const b = balls[i];
        b.x += b.vx;
        b.y += b.vy;
        b.vx *= 0.99;
        b.vy *= 0.99;

        vList.forEach((v) => {
          if (!v.alive || v.id === b.ownerId) return;
          const dist = Math.hypot(v.x - b.x, v.y - b.y);
          if (dist < b.radius + 22) {
            const hitAngle = Math.atan2(v.y - b.y, v.x - b.x);
            const knockback = (b.radius / 10) * 14;
            v.vx += Math.cos(hitAngle) * knockback;
            v.vy += Math.sin(hitAngle) * knockback;
            party.sfx('tap');

            for (let p = 0; p < 10; p++) {
              splashParticlesRef.current.push({
                x: b.x,
                y: b.y,
                vx: (Math.random() - 0.5) * 100,
                vy: (Math.random() - 0.5) * 100,
                radius: Math.random() * 4 + 2,
                alpha: 1,
              });
            }
            balls.splice(i, 1);
          }
        });

        if (Math.hypot(b.x, b.y / 0.58) > ARENA_RADIUS + 80) {
          balls.splice(i, 1);
        }
      }

      // D. Host broadcast tọa độ thế giới mỗi 120ms (chỉ gửi khi đang chơi)
      if (isHost && st.stage === 'playing') {
        const alivePlayers = vList.filter((v) => v.alive);
        if (vList.length > 1 && alivePlayers.length <= 1) {
          const winner = alivePlayers[0] ? alivePlayers[0].id : null;
          party.dispatch({ type: 'round_win', winnerId: winner });
        }

        syncTimer += dt;
        if (syncTimer > 0.12) {
          syncTimer = 0;
          party.dispatch({
            type: 'sync_world',
            vehicles,
            snowballs: balls,
          });
        }
      }

      // --- E. VẼ FRAME ---
      ctx.fillStyle = '#075985';
      ctx.fillRect(0, 0, w, h);

      // Gợn sóng biển
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.18)';
      ctx.lineWidth = 2;
      for (let y = 30; y < h; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x < w; x += 60) {
          ctx.quadraticCurveTo(x + 30, y + Math.sin(now * 0.003 + x) * 6, x + 60, y);
        }
        ctx.stroke();
      }

      drawIceArena(ctx, centerX, centerY, scaledIceR);

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.scale(scale, scale);

      balls.forEach((b) => drawFlyingSnowball(ctx, b));

      vList.forEach((v) => {
        if (v.alive) {
          drawVehicle(ctx, v, v.id === myId);
        }
      });

      const particles = splashParticlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.alpha -= dt * 2;
        if (p.alpha <= 0) {
          particles.splice(i, 1);
        } else {
          ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();

      // Bông tuyết bay nền
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      snowFlakesRef.current.forEach((fl) => {
        fl.y += fl.vy;
        fl.x += fl.vx;
        if (fl.y > h) fl.y = -10;
        if (fl.x > w) fl.x = 0;
        if (fl.x < 0) fl.x = w;
        ctx.beginPath();
        ctx.arc(fl.x, fl.y, fl.r, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    animId = requestAnimationFrame(loop);

    const handleResize = () => {
      if (!containerRef.current || !canvasRef.current) return;
      canvasRef.current.width = containerRef.current.clientWidth;
      canvasRef.current.height = containerRef.current.clientHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [st, isHost, myId, party]);

  const handlePointerDown = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    joystickRef.current = {
      active: true,
      startX: x,
      startY: y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!joystickRef.current.active) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dx = x - joystickRef.current.startX;
    const dy = y - joystickRef.current.startY;
    if (Math.hypot(dx, dy) > 8) {
      inputAngleRef.current = Math.atan2(dy, dx);
    }
  };

  const shootSnowball = () => {
    const myVehicle = localVehiclesRef.current[myId];
    if (myVehicle && myVehicle.alive && myVehicle.snowballRadius > 3) {
      const forwardAngle = myVehicle.angle;
      const ballDist = 28 + myVehicle.snowballRadius;
      const newBall: Snowball = {
        id: Date.now() + Math.random(),
        ownerId: myId,
        x: myVehicle.x + Math.cos(forwardAngle) * ballDist,
        y: myVehicle.y + Math.sin(forwardAngle) * ballDist,
        vx: Math.cos(forwardAngle) * BALL_SHOOT_SPEED,
        vy: Math.sin(forwardAngle) * BALL_SHOOT_SPEED,
        radius: myVehicle.snowballRadius,
      };

      localBallsRef.current.push(newBall);
      myVehicle.snowballRadius = 0;
      party.sfx('tap');

      party.dispatch({ type: 'shoot_ball', ball: newBall });
    }
  };

  const handlePointerUp = () => {
    if (joystickRef.current.active) {
      joystickRef.current.active = false;
      inputAngleRef.current = null;
      shootSnowball();
    }
  };

  return (
    <div className={s.landscapeContainer} ref={containerRef}>
      <canvas
        ref={canvasRef}
        className={s.gameCanvas}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />

      <div className={s.hudOverlay}>
        <div className={s.hudLeft}>
          <span className={s.roundBadge}>Hiệp {st?.round} / {st?.maxRounds}</span>
          <span className={s.hintRolling}>Lái để gom bóng • Thả tay hoặc bấm nút đỏ để Bắn!</span>
        </div>

        <div className={s.hudScores}>
          {Object.values(localVehiclesRef.current).map((v) => (
            <div
              key={v.id}
              className={v.alive ? s.playerScoreTag : s.playerDeadScoreTag}
              style={{ borderLeftColor: v.skin.color }}
            >
              <span className={s.scoreName}>{v.name}</span>
              <span className={s.scoreVal}>{v.score}</span>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        className={s.shootBtn}
        onPointerDown={(e) => {
          e.stopPropagation();
          shootSnowball();
        }}
        title="Bắn cầu tuyết"
      >
        <span className={s.shootIcon}>❄️</span>
        <span className={s.shootLabel}>BẮN</span>
      </button>
    </div>
  );
}
