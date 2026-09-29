import type { Mode } from './config';

export const strings = {
  modes: { focus: 'tập trung 25', rest: 'nghỉ 05' } satisfies Record<Mode, string>,
  modeGroup: 'Chế độ hẹn giờ',
  state: { running: 'đang chạy', ready: 'sẵn sàng', paused: 'tạm dừng' },
  action: { start: 'bắt đầu', pause: 'tạm dừng', resume: 'tiếp tục', reset: 'đặt lại' },
  doneLabel: 'phiên tập trung hôm nay',
  focusDone: 'xong một phiên. nghỉ 5 phút',
  restDone: 'hết giờ nghỉ',
} as const;
