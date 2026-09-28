import { useCallback, useEffect, useRef } from 'react';
import { t } from '@/i18n/vi';
import { hashPin } from '@/lib/hash';
import { useLauncherStore } from '@/store/launcherStore';
import { useUiStore } from '@/store/uiStore';
import { PinPad, type PinCheck } from './PinPad';

/** Hiển thị bàn phím PIN theo yêu cầu, và khóa launcher khi mở nếu đã bật PIN. */
export function PinHost() {
  const request = useUiStore((s) => s.pin);
  const { requestPin, closePin } = useUiStore();
  const pinHash = useLauncherStore((s) => s.settings.pinHash);
  const updateSettings = useLauncherStore((s) => s.updateSettings);
  const firstEntry = useRef<string | null>(null);

  // Khóa ngay khi khởi động nếu có mã PIN.
  useEffect(() => {
    if (useLauncherStore.getState().settings.pinHash) {
      requestPin({ mode: 'unlock', title: t.pin.unlock, cancellable: false });
    }
  }, [requestPin]);

  useEffect(() => {
    firstEntry.current = null;
  }, [request]);

  const submit = useCallback(
    async (pin: string): Promise<PinCheck> => {
      if (!request) return { ok: false, error: t.pin.wrong };
      if (request.mode === 'setup') {
        if (!firstEntry.current) {
          firstEntry.current = pin;
          return { next: t.pin.confirmSub };
        }
        if (firstEntry.current !== pin) {
          firstEntry.current = null;
          return { ok: false, error: t.pin.mismatch };
        }
        updateSettings({ pinHash: await hashPin(pin) });
        return { ok: true };
      }
      return (await hashPin(pin)) === pinHash ? { ok: true } : { ok: false, error: t.pin.wrong };
    },
    [request, pinHash, updateSettings],
  );

  if (!request) return null;
  const subtitle = request.mode === 'setup' ? t.pin.setupSub : t.pin.currentSub;

  return (
    <PinPad
      key={`${request.mode}-${request.title}`}
      title={request.title}
      subtitle={subtitle}
      cancellable={request.cancellable}
      onSubmit={submit}
      onCancel={closePin}
      onSuccess={() => {
        const done = request.onSuccess;
        closePin();
        done?.();
      }}
    />
  );
}
