import { useEffect, useRef } from 'react';
import { HATS, VEHICLE_COLORS, type PenguinSkin } from './avatar';
import { drawVehicle } from './SnowarRenderer';
import type { PlayerVehicle } from './game';
import s from './IceBumper.module.css';

export interface SkinEditorProps {
  skin: PenguinSkin;
  onChange: (next: PenguinSkin) => void;
  name: string;
}

export function SkinEditor({ skin, onChange, name }: SkinEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let angle = 0;

    const dummyVehicle: PlayerVehicle = {
      id: 'preview',
      name,
      skin,
      x: 100,
      y: 90,
      vx: 0,
      vy: 0,
      angle: 0,
      snowballRadius: 18,
      alive: true,
      score: 0,
    };

    const render = () => {
      animId = requestAnimationFrame(render);
      angle += 0.012;
      dummyVehicle.angle = angle;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Nền nỉ tuyết nhạt
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Vòng tròn sân khấu
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.ellipse(100, 95, 68, 38, 0, 0, Math.PI * 2);
      ctx.fill();

      drawVehicle(ctx, dummyVehicle, true);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [skin, name]);

  return (
    <div className={s.skinEditor}>
      <div className={s.previewArea}>
        <canvas ref={canvasRef} width={200} height={180} className={s.previewCanvas} />
        <span className={s.previewHint}>Xem trước xe ủi tuyết & Cánh cụt</span>
      </div>

      <div className={s.skinOptions}>
        <div className={s.optionGroup}>
          <label className={s.groupLabel}>Màu xe ủi</label>
          <div className={s.colorSwatches}>
            {VEHICLE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={s.colorBtn}
                style={{
                  backgroundColor: c,
                  outline: skin.color === c ? '3px solid #38bdf8' : 'none',
                }}
                onClick={() => onChange({ ...skin, color: c })}
              />
            ))}
          </div>
        </div>

        <div className={s.optionGroup}>
          <label className={s.groupLabel}>Nón cánh cụt</label>
          <div className={s.pillGroup}>
            {HATS.map((h) => (
              <button
                key={h.id}
                type="button"
                className={skin.hat === h.id ? s.pillActive : s.pill}
                onClick={() => onChange({ ...skin, hat: h.id })}
              >
                {h.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
