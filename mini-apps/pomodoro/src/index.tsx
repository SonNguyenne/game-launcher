import type { CSSProperties } from 'react';
import type { MiniAppProps } from '@bang/sdk';
import { Button, Segmented, pad2 } from '@bang/ui';
import { modes, type Mode } from './config';
import { strings } from './strings';
import { usePomodoro, type PomodoroData } from './usePomodoro';
import s from './Pomodoro.module.css';

const modeOptions = (Object.keys(modes) as Mode[]).map((m) => ({ value: m, label: strings.modes[m] }));
const formatClock = (sec: number) => `${pad2(sec / 60)}:${pad2(sec % 60)}`;

export default function Pomodoro({ ctx }: MiniAppProps<PomodoroData>) {
  const { data, remaining, total, status, toggle, reset, switchMode } = usePomodoro(ctx, strings);
  const primaryLabel = status === 'running' ? strings.action.pause : status === 'ready' ? strings.action.start : strings.action.resume;
  const trackStyle = { '--minutes': modes[data.mode].minutes } as CSSProperties;

  return (
    <div className={s.pomodoro} data-mode={data.mode} data-status={status}>
      <Segmented flat label={strings.modeGroup} options={modeOptions} value={data.mode} onChange={switchMode} />
      <div className={s.face}>
        <small className={s.state}>{strings.state[status]}</small>
        <div className={s.clock}>{formatClock(remaining)}</div>
        <div className={s.track} style={trackStyle}>
          <i className={s.fill} style={{ transform: `scaleX(${1 - remaining / total})` }} />
        </div>
      </div>
      <div className={s.actions}>
        <Button variant="primary" block className={s.action} onClick={toggle}>{primaryLabel}</Button>
        <Button block className={s.action} onClick={reset} disabled={status === 'ready'}>{strings.action.reset}</Button>
      </div>
      <p className={s.count}>
        <span className={s.countLabel}>{strings.doneLabel}</span>
        <b className={s.countNum}>{pad2(data.done)}</b>
      </p>
    </div>
  );
}
