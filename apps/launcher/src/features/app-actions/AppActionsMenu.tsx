import { Menu } from '@bang/ui';
import { t } from '@/i18n/vi';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { useLauncherStore } from '@/store/launcherStore';
import { notify, useUiStore } from '@/store/uiStore';
import type { LauncherApp } from '@/registry/types';

/** Menu hiện khi nhấn giữ một phím trên bảng. */
export function AppActionsMenu({ app }: { app: LauncherApp }) {
  const { openApp } = useAppNavigation();
  const updateApp = useLauncherStore((s) => s.updateApp);
  const { closeSheet, openSheet } = useUiStore();

  return (
    <Menu
      items={[
        { id: 'open', label: t.actions.open, onSelect: () => { closeSheet(); openApp(app.id); } },
        { id: 'edit', label: t.actions.edit, onSelect: () => openSheet({ kind: 'app-form', appId: app.id }) },
        { id: 'hide', label: t.actions.hide, onSelect: () => { closeSheet(); updateApp(app.id, { hidden: true }); notify(t.actions.hidden); } },
      ]}
    />
  );
}
