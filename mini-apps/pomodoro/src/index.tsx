import type { MiniAppProps } from '@bang/sdk';
import { Segmented, cx, pad2 } from '@bang/ui';
import { modes, type Mode } from './config';
import { strings } from './strings';
import { usePomodoro, type PomodoroData } from './usePomodoro';
import s from './Pomodoro.module.css';

const modeOptions = (Object.keys(modes) as Mode[]).map((m) => ({ value: m, label: strings.modes[m] }));
const formatClock = (sec: number) => `${pad2(sec / 60)}:${pad2(sec % 60)}`;

export default function Pomodoro({ ctx }: MiniAppProps<PomodoroData>) {
  const { data, remaining, total, status, toggle, reset, switchMode } = usePomodoro(ctx, strings);
  const primaryLabel = status === 'running' ? strings.action.pause : status === 'ready' ? strings.action.start : strings.action.resume;

  return (
    <div>
      <Segmented flat label={strings.modeGroup} options={modeOptions} value={data.mode} onChange={switchMode} />
      <div className={s.face}>
        <small className={s.state}>{strings.state[status]}</small>
        <div className={s.clock}>{formatClock(remaining)}</div>
        <div className={s.track}>
          <i className={s.fill} style={{ width: `${(1 - remaining / total) * 100}%` }} />
        </div>
      </div>
      <div className={s.actions}>
        <button className={cx(s.action, s.primary)} onClick={toggle}>{primaryLabel}</button>
        <button className={s.action} onClick={reset}>{strings.action.reset}</button>
      </div>
      <p className={s.count}>{strings.doneToday(data.done)}</p>
    </div>
  );
}
