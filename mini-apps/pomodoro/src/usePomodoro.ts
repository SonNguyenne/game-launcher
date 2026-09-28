import { useCallback, useEffect, useState } from 'react';
import { todayKey, usePersistentState, type MiniAppContext } from '@bang/sdk';
import { config, modes, type Mode } from './config';

export interface PomodoroData {
  mode: Mode;
  /** Mốc kết thúc (ms). Có giá trị nghĩa là đang chạy; lưu mốc giúp đóng app vẫn đếm đúng. */
  endAt: number | null;
  /** Số giây còn lại khi đang dừng. */
  left: number;
  done: number;
  day: string;
}

const fullSeconds = (mode: Mode) => modes[mode].minutes * 60;

const initial = (): PomodoroData => ({ mode: 'focus', endAt: null, left: fullSeconds('focus'), done: 0, day: todayKey() });

export function usePomodoro(ctx: MiniAppContext<PomodoroData>, messages: { focusDone: string; restDone: string }) {
  const [data, setData] = usePersistentState(ctx, initial());
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), config.tickMs);
    return () => clearInterval(id);
  }, []);

  // Sang ngày mới thì đặt lại bộ đếm phiên.
  useEffect(() => {
    if (data.day !== todayKey()) setData((d) => ({ ...d, done: 0, day: todayKey() }));
  }, [data.day, setData]);

  const remaining = data.endAt ? Math.max(0, Math.round((data.endAt - now) / 1000)) : data.left;
  const total = fullSeconds(data.mode);

  useEffect(() => {
    if (!data.endAt || remaining > 0) return;
    const finishedFocus = data.mode === 'focus';
    const nextMode: Mode = finishedFocus ? 'rest' : 'focus';
    setData((d) => ({ ...d, mode: nextMode, endAt: null, left: fullSeconds(nextMode), done: d.done + (finishedFocus ? 1 : 0) }));
    ctx.notify(finishedFocus ? messages.focusDone : messages.restDone);
  }, [remaining, data.endAt, data.mode, setData, ctx, messages]);

  const toggle = useCallback(() => {
    setData((d) =>
      d.endAt
        ? { ...d, left: Math.max(0, Math.round((d.endAt - Date.now()) / 1000)), endAt: null }
        : { ...d, endAt: Date.now() + d.left * 1000 },
    );
  }, [setData]);

  const reset = useCallback(() => setData((d) => ({ ...d, endAt: null, left: fullSeconds(d.mode) })), [setData]);

  const switchMode = useCallback((mode: Mode) => setData((d) => ({ ...d, mode, endAt: null, left: fullSeconds(mode) })), [setData]);

  const status = data.endAt ? 'running' : remaining === total ? 'ready' : 'paused';

  return { data, remaining, total, status, toggle, reset, switchMode } as const;
}
