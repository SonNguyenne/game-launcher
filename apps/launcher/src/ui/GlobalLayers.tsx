import { Banner, Dialog, Toast } from '@bang/ui';
import { t } from '@/i18n/vi';
import { useOnline } from '@/hooks/useOnline';
import { useUiStore } from '@/store/uiStore';
import { PinHost } from '@/features/pin/PinHost';
import { SheetHost } from './SheetHost';

/** Các lớp phủ dùng chung toàn app. Đặt một lần ở gốc cây component. */
export function GlobalLayers() {
  const online = useOnline();
  const toast = useUiStore((s) => s.toast);
  const confirm = useUiStore((s) => s.confirm);
  const closeConfirm = useUiStore((s) => s.closeConfirm);

  return (
    <>
      <SheetHost />
      {confirm && (
        <Dialog
          title={confirm.title}
          text={confirm.text}
          confirmLabel={confirm.confirmLabel}
          cancelLabel={t.common.cancel}
          danger={confirm.danger}
          onCancel={closeConfirm}
          onConfirm={() => {
            closeConfirm();
            confirm.onConfirm();
          }}
        />
      )}
      <PinHost />
      <Toast message={toast.message} visible={toast.visible} />
      <Banner message={t.common.offline} visible={!online} />
    </>
  );
}
