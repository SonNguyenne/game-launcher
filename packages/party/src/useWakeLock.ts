import { useEffect } from 'react';

/**
 * Giữ màn hình sáng khi `active` (đang trong ván hoặc trong phòng), để điện thoại đặt giữa bàn không tự tắt.
 * Trình duyệt tự nhả khóa khi tab bị ẩn, nên xin lại mỗi lần tab hiện trở lại.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = async () => {
      if (document.visibilityState !== 'visible' || (lock && !lock.released)) return;
      try {
        const next = await navigator.wakeLock.request('screen');
        if (cancelled) void next.release();
        else lock = next;
      } catch {
        // Pin yếu, trình duyệt từ chối... thì thôi.
      }
    };

    void request();
    document.addEventListener('visibilitychange', request);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', request);
      void lock?.release().catch(() => {});
    };
  }, [active]);
}
