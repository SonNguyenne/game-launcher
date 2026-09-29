import { Banner, Dialog, Toast } from '@bang/ui';
import { t } from '@/i18n/vi';
import { useOnline } from '@/hooks/useOnline';
import { useUiStore } from '@/store/uiStore';
import { SheetHost } from './SheetHost';
import { UpdateWatcher } from './UpdateWatcher';

/** Các lớp phủ dùng chung toàn app. Đặt một lần ở gốc cây component. */
export function GlobalLayers() {
  const online = useOnline();
  const toast = useUiStore((s) => s.toast);
  const confirm = useUiStore((s) => s.confirm);
  const closeConfirm = useUiStore((s) => s.closeConfirm);

  return (
    <>
      <SheetHost />
      <UpdateWatcher />
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
      <Toast message={toast.message} visible={toast.visible} />
      <Banner message={t.common.offline} visible={!online} />
    </>
  );
}
