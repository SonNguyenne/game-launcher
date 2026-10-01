import { useEffect, useRef, type CSSProperties } from 'react';
import { Chips, SettingsCard, type SettingsProps } from '@bang/party';
import { cx } from '@bang/ui';
import { ROUND_OPTIONS, ROUND_TIME_OPTIONS, type SnowarState } from './game';
import { MAPS, MAP_IDS, extentOf, spawnPoint, type MapChoice, type MapId } from './maps';
import { COLORS, drawFloe, drawPenguin, floeShape } from './render';
import { skinFor } from './avatar';
import { BALL_MIN, ICE_R, SCALE, SLIP } from './sim';
import { strings } from './strings';
import s from './IceBumper.module.css';

const roundOptions = ROUND_OPTIONS.map((n) => ({ value: String(n), label: strings.roundsValue(n) }));
const timeOptions = ROUND_TIME_OPTIONS.map((n) => ({ value: String(n), label: strings.roundTimeValue(n) }));

/** Hình thu nhỏ của một bản đồ, vẽ bằng cùng hàm với trận đấu. */
function MapThumb({ id }: { id: MapId }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = canvas.clientWidth || 72;
    canvas.width = canvas.height = Math.round(size * dpr);
    const map = MAPS[id];
    const R = 100;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = COLORS.sea;
    ctx.fillRect(0, 0, size, size);
    ctx.translate(size / 2, size / 2);
    const zoom = size / ((extentOf(map) * R + 14) * 2);
    ctx.scale(zoom, zoom);
    drawFloe(ctx, floeShape(3), map, R);
  }, [id]);
  return <canvas ref={ref} className={s.mapThumb} aria-hidden="true" />;
}

/**
 * Xem trước sân đúng cỡ: khung cố định theo bản đồ này ở cỡ lớn nhất, nên kéo cỡ sân thấy băng to nhỏ thật
 * so với bốn chú cánh cụt đứng ở chỗ xuất phát. Chọn ngẫu nhiên thì lần lượt hiện các bản đồ.
 */
function ArenaPreview({ map, scale }: { map: MapChoice; scale: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const live = useRef({ map, scale });
  live.current = { map, scale };

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    const floe = floeShape(3);
    let raf = 0;
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr)) canvas.width = Math.round(w * dpr);
      if (canvas.height !== Math.round(h * dpr)) canvas.height = Math.round(h * dpr);
      const { map: choice, scale: k } = live.current;
      const id: MapId = choice === 'random' ? MAP_IDS[Math.floor(t / 1400) % MAP_IDS.length] : choice;
      const def = MAPS[id];
      const R = ICE_R * k;
      const zoom = Math.min(w, h) / ((extentOf(def) * ICE_R * SCALE.max + 10) * 2);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = COLORS.sea;
      ctx.fillRect(0, 0, w, h);
      ctx.translate(w / 2, h / 2);
      ctx.scale(zoom, zoom);
      drawFloe(ctx, floe, def, R);
      for (let i = 0; i < 4; i++) {
        const p = spawnPoint(def, R, i, 4);
        drawPenguin(ctx, { x: p.x, y: p.y, face: Math.atan2(-p.y, -p.x), ball: BALL_MIN, skin: skinFor(i), bob: t + i * 300 });
      }
      if (choice === 'random') {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.font = '700 13px "Be Vietnam Pro", system-ui, sans-serif';
        ctx.fillStyle = 'rgba(242, 250, 253, 0.9)';
        ctx.textAlign = 'left';
        ctx.fillText(def.label, 10, h - 10);
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={ref} className={s.preview} role="img" aria-label={strings.preview} />;
}

interface SliderProps {
  label: string;
  value: number;
  range: { min: number; max: number; step: number };
  ends: readonly [string, string];
  display: string;
  disabled: boolean;
  onChange: (v: number) => void;
}

/** Thanh kéo dạng progress bar: phần đã kéo tô đậm, hai đầu ghi ý nghĩa. */
function Slider({ label, value, range, ends, display, disabled, onChange }: SliderProps) {
  const fill = ((value - range.min) / (range.max - range.min)) * 100;
  return (
    <label className={s.slider}>
      <span className={s.sliderHead}>
        <span>{label}</span>
        <b>{display}</b>
      </span>
      <input
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        disabled={disabled}
        style={{ '--fill': `${fill}%` } as CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className={s.sliderEnds} aria-hidden="true">
        <span>{ends[0]}</span>
        <span>{ends[1]}</span>
      </span>
    </label>
  );
}

export function SnowarSettings({ value, onChange, editable }: SettingsProps<SnowarState>) {
  const map: MapChoice = value.map ?? 'floe';
  const scale = value.scale ?? SCALE.default;
  const slip = value.slip ?? SLIP.default;
  const choices: MapChoice[] = [...MAP_IDS, 'random'];
  return (
    <SettingsCard editable={editable}>
      <ArenaPreview map={map} scale={scale} />

      <div className={s.mapGroup} role="radiogroup" aria-label={strings.map}>
        <span className={s.mapLabel}>{strings.map}</span>
        <div className={s.maps}>
          {choices.map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={map === id}
              className={cx(s.mapTile, map === id && s.mapOn)}
              disabled={!editable && map !== id}
              onClick={() => editable && onChange({ map: id })}
            >
              {id === 'random' ? <span className={cx(s.mapThumb, s.mapRandom)} aria-hidden="true">?</span> : <MapThumb id={id} />}
              <span>{id === 'random' ? strings.random : MAPS[id].label}</span>
            </button>
          ))}
        </div>
      </div>

      <Slider label={strings.scale} value={scale} range={SCALE} ends={strings.scaleEnds} display={strings.scaleValue(scale)} disabled={!editable} onChange={(v) => onChange({ scale: v })} />
      <Slider label={strings.slip} value={slip} range={SLIP} ends={strings.slipEnds} display={strings.slipWord(slip)} disabled={!editable} onChange={(v) => onChange({ slip: v })} />
      <p className={s.gripHint}>{strings.slipHint(slip)}</p>

      <Chips label={strings.rounds} options={roundOptions} value={String(value.maxRounds ?? 3)} onChange={(v) => onChange({ maxRounds: Number(v) })} disabled={!editable} />
      <Chips label={strings.roundTime} options={timeOptions} value={String(value.roundSeconds ?? 60)} onChange={(v) => onChange({ roundSeconds: Number(v) })} disabled={!editable} />
    </SettingsCard>
  );
}
