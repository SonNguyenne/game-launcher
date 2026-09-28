import { useEffect, useState } from 'react';
import { Sheet } from '@bang/ui';
import { t } from '@/i18n/vi';
import { useUiStore, type SheetRequest } from '@/store/uiStore';
import { useApps } from '@/registry/useApps';
import { AppFormSheet } from '@/features/app-form/AppFormSheet';
import { AppActionsMenu } from '@/features/app-actions/AppActionsMenu';
import { InstallGuide } from '@/features/settings/InstallGuide';
import { StyleSheet } from '@/features/settings/StyleSheet';
import { pad2 } from '@bang/ui';

/**
 * Hiển thị bảng trượt theo yêu cầu trong uiStore.
 * Giữ yêu cầu cuối cùng để nội dung không biến mất khi đang chạy hiệu ứng đóng.
 */
export function SheetHost() {
  const request = useUiStore((s) => s.sheet);
  const close = useUiStore((s) => s.closeSheet);
  const { byId } = useApps();
  const [shown, setShown] = useState<SheetRequest | null>(request);

  useEffect(() => {
    if (request) setShown(request);
  }, [request]);

  if (!shown) return null;

  const common = { open: !!request, closeLabel: t.common.close, onClose: close };

  switch (shown.kind) {
    case 'app-form': {
      const app = byId(shown.appId);
      return (
        <Sheet {...common} title={app ? t.form.editTitle : t.form.addTitle}>
          <AppFormSheet key={shown.appId ?? 'new'} appId={shown.appId} onDone={close} />
        </Sheet>
      );
    }
    case 'app-actions': {
      const app = byId(shown.appId);
      if (!app) return null;
      return (
        <Sheet {...common} flush title={`${pad2(app.index)}  ${app.name}`}>
          <AppActionsMenu app={app} />
        </Sheet>
      );
    }
    case 'install':
      return (
        <Sheet {...common} title={t.install.title}>
          <InstallGuide onDone={close} />
        </Sheet>
      );
    case 'style':
      return (
        <Sheet {...common} title={t.style.title}>
          <StyleSheet onDone={close} />
        </Sheet>
      );
  }
}
