import { useCallback, useRef } from 'react';
import { appConfig } from '@/config/app';

/**
 * Nhấn giữ để mở menu, bấm thường để mở app.
 * Trả về các handler gắn lên phần tử và hàm `wrapClick` chặn cú bấm ngay sau khi nhấn giữ.
 */
export function useLongPress(onLongPress: (target: HTMLElement) => void) {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const start = useRef({ x: 0, y: 0 });
  const fired = useRef(false);

  const cancel = useCallback(() => clearTimeout(timer.current), []);

  const handlers = {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      fired.current = false;
      start.current = { x: e.clientX, y: e.clientY };
      const target = e.currentTarget;
      cancel();
      timer.current = setTimeout(() => {
        fired.current = true;
        navigator.vibrate?.(12);
        onLongPress(target);
      }, appConfig.longPressMs);
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      const d = Math.abs(e.clientX - start.current.x) + Math.abs(e.clientY - start.current.y);
      if (d > appConfig.longPressMoveTolerancePx) cancel();
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onContextMenu: (e: React.MouseEvent<HTMLElement>) => {
      e.preventDefault();
      if (!fired.current) {
        fired.current = true;
        onLongPress(e.currentTarget);
      }
    },
  };

  const wrapClick = (fn: (e: React.MouseEvent<HTMLElement>) => void) => (e: React.MouseEvent<HTMLElement>) => {
    if (fired.current) {
      fired.current = false;
      return;
    }
    fn(e);
  };

  return { handlers, wrapClick };
}
