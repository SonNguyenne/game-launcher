import { Button, EmptyState, KeyFiller, KeyGrid, KeyGridFullRow, KeyGroupHeader, pad2 } from '@bang/ui';
import { t } from '@/i18n/vi';
import { groupApps } from '@/registry/useApps';
import type { LauncherApp } from '@/registry/types';
import { AppKey } from './AppKey';

interface AppBoardProps {
  apps: LauncherApp[];
  query: string;
  columns: number;
  hotId?: string;
  onOpen: (app: LauncherApp, el: HTMLElement) => void;
  onLongPress: (app: LauncherApp) => void;
  onAdd: () => void;
}

export function AppBoard({ apps, query, columns, hotId, onOpen, onLongPress, onAdd }: AppBoardProps) {
  const compact = columns > 2;
  const renderKey = (app: LauncherApp) => (
    <AppKey key={app.id} app={app} hot={app.id === hotId} compact={compact} onOpen={onOpen} onLongPress={onLongPress} />
  );

  if (!apps.length) {
    const empty = query ? (
      <EmptyState title={t.home.noMatchTitle(query)} body={t.home.noMatchBody} action={<Button onClick={onAdd}>{t.home.add}</Button>} />
    ) : (
      <EmptyState title={t.home.emptyTitle} body={t.home.emptyBody} action={<Button variant="primary" onClick={onAdd}>{t.home.emptyAction}</Button>} />
    );
    return (
      <KeyGrid columns={columns}>
        <KeyGridFullRow>{empty}</KeyGridFullRow>
      </KeyGrid>
    );
  }

  if (query) {
    return (
      <KeyGrid columns={columns}>
        <KeyGroupHeader label={t.home.results} count={pad2(apps.length)} />
        {apps.map(renderKey)}
        <KeyFiller itemCount={apps.length} columns={columns} />
      </KeyGrid>
    );
  }

  const groups = groupApps(apps);
  return (
    <KeyGrid columns={columns}>
      {groups.map(({ group, items }) => [
        <KeyGroupHeader key={`h-${group}`} label={group} count={pad2(items.length)} />,
        ...items.map(renderKey),
        <KeyFiller key={`f-${group}`} itemCount={items.length} columns={columns} />,
      ])}
    </KeyGrid>
  );
}
