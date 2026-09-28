import { useCallback } from 'react';
import { t } from '@/i18n/vi';
import { notify, useUiStore } from '@/store/uiStore';
import { useLauncherStore } from '@/store/launcherStore';

/** Các luồng PIN dùng ở màn cài đặt. Giao diện nhập mã do PinHost hiển thị. */
export function usePinFlows() {
  const requestPin = useUiStore((s) => s.requestPin);
  const updateSettings = useLauncherStore((s) => s.updateSettings);

  const enable = useCallback(
    () => requestPin({ mode: 'setup', title: t.pin.setupTitle, cancellable: true, onSuccess: () => notify(t.pin.enabled) }),
    [requestPin],
  );

  const disable = useCallback(
    () =>
      requestPin({
        mode: 'verify',
        title: t.pin.disableTitle,
        cancellable: true,
        onSuccess: () => {
          updateSettings({ pinHash: null });
          notify(t.pin.disabled);
        },
      }),
    [requestPin, updateSettings],
  );

  const change = useCallback(
    () =>
      requestPin({
        mode: 'verify',
        title: t.pin.changeTitle,
        cancellable: true,
        onSuccess: () => setTimeout(enable, 0),
      }),
    [requestPin, enable],
  );

  return { enable, disable, change };
}
