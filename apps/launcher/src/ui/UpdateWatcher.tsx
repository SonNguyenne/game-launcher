import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import { paths } from '@/routes/paths';
import { useUiStore } from '@/store/uiStore';

/**
 * Có bản mới thì chỉ tải lại khi người dùng đang đứng ở bảng app, không mở sheet hay hộp xác nhận.
 * Tự tải lại ngay lúc bản mới về (autoUpdate) sẽ văng người chơi ra khỏi ván hay mất chữ đang gõ.
 */
export function UpdateWatcher() {
  const { pathname } = useLocation();
  const idle = useUiStore((s) => !s.sheet && !s.confirm);
  const [ready, setReady] = useState(false);
  const update = useRef<((reload?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    update.current = registerSW({ onNeedRefresh: () => setReady(true) });
  }, []);

  useEffect(() => {
    if (ready && idle && pathname === paths.home) void update.current?.(true);
  }, [ready, idle, pathname]);

  return null;
}
