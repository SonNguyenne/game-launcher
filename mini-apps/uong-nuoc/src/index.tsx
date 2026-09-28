import type { CSSProperties } from 'react';
import { todayKey, usePersistentState, type MiniAppProps } from '@bang/sdk';
import { cx, keyColors, pad2 } from '@bang/ui';
import { config } from './config';
import { strings } from './strings';
import s from './Water.module.css';

/** Chỉ giữ số liệu của ngày hiện tại: { "2026-9-28": 5 } */
type WaterData = Record<string, number>;

const waterStyle = { '--water': keyColors.blue.fill, '--goal': config.dailyGoal } as CSSProperties;

export default function Water({ ctx }: MiniAppProps<WaterData>) {
  const [data, setData] = usePersistentState<WaterData>(ctx, {});
  const key = todayKey();
  const count = data[key] ?? 0;
  const setCount = (n: number) => setData({ [key]: Math.max(0, n) });

  return (
    <div style={waterStyle}>
      <div className={s.face}>
        <small className={s.state}>{count >= config.dailyGoal ? strings.reached : strings.remaining(config.dailyGoal - count)}</small>
        <div className={s.count}>
          {pad2(count)}
          <span className={s.goal}>/{pad2(config.dailyGoal)}</span>
        </div>
      </div>
      <div className={s.cups} role="img" aria-label={`${strings.cups}: ${count}`}>
        {Array.from({ length: config.dailyGoal }, (_, i) => (
          <span key={i} className={cx(s.cup, i < count && s.full)} />
        ))}
      </div>
      <div className={s.actions}>
        <button className={s.action} onClick={() => setCount(count - 1)}>{strings.remove}</button>
        <button className={cx(s.action, s.primary)} onClick={() => setCount(count + 1)}>{strings.add}</button>
      </div>
    </div>
  );
}
