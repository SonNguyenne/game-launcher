import { useId, type CSSProperties } from 'react';
import { todayKey, usePersistentState, type MiniAppProps } from '@bang/sdk';
import { Button, cx, keyColors, pad2 } from '@bang/ui';
import { config } from './config';
import { strings } from './strings';
import s from './Water.module.css';

/** Chỉ giữ số liệu của ngày hiện tại: { "2026-9-28": 5 } */
type WaterData = Record<string, number>;

const waterStyle = { '--water': keyColors.blue.fill, '--goal': config.dailyGoal } as CSSProperties;

/** Cốc vẽ tay: miệng rộng, đáy hẹp, hơi lệch như nét cọ. */
const GLASS = 'M5 6C18 5.2 31 5.6 43 5.4L37.6 57C37.4 59 36 60.4 34 60.4H14C12 60.4 10.6 59 10.4 57Z';

function Glass({ full }: { full: boolean }) {
  const clip = useId();
  return (
    <svg className={s.glass} viewBox="0 0 50 66" aria-hidden="true">
      <defs>
        <clipPath id={clip}><path d={GLASS} /></clipPath>
      </defs>
      <path className={s.glassShadow} d={GLASS} transform="translate(3 3)" />
      <path className={s.glassBody} d={GLASS} />
      <g clipPath={`url(#${clip})`}>
        <path className={cx(s.water, full && s.waterFull)} d="M0 20C8 17 16 23 25 20C33 17 41 23 50 20V66H0Z" />
      </g>
      <path className={s.glassLine} d={GLASS} />
      <path className={s.glassShine} d="M11.5 12L14 38" />
    </svg>
  );
}

export default function Water({ ctx }: MiniAppProps<WaterData>) {
  const [data, setData] = usePersistentState<WaterData>(ctx, {});
  const key = todayKey();
  const count = data[key] ?? 0;
  const setCount = (n: number) => setData({ [key]: Math.max(0, n) });
  const reached = count >= config.dailyGoal;

  return (
    <div className={s.app} style={waterStyle} data-reached={reached || undefined}>
      <div className={s.face}>
        <small className={s.state}>{reached ? strings.reached : strings.remaining(config.dailyGoal - count)}</small>
        <div className={s.count}>
          {pad2(count)}
          <span className={s.goal}>/{pad2(config.dailyGoal)}</span>
        </div>
      </div>
      <div className={s.cups} role="img" aria-label={`${strings.cups}: ${count}`}>
        {Array.from({ length: config.dailyGoal }, (_, i) => (
          <span key={i} className={cx(s.cup, i < count && s.full)}>
            <Glass full={i < count} />
          </span>
        ))}
      </div>
      <div className={s.actions}>
        <Button block className={s.action} onClick={() => setCount(count - 1)} disabled={count === 0}>{strings.remove}</Button>
        <Button variant="primary" block className={s.action} onClick={() => setCount(count + 1)}>{strings.add}</Button>
      </div>
    </div>
  );
}
