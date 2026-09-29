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
  const renderKey = (app: LauncherApp, position: number) => (
    <AppKey key={app.id} app={app} hot={app.id === hotId} compact={compact} position={position} onOpen={onOpen} onLongPress={onLongPress} />
  );

  if (!apps.length) {
    const empty = query ? (
      <EmptyState art="no-match" title={t.home.noMatchTitle(query)} body={t.home.noMatchBody} action={<Button onClick={onAdd}>{t.home.add}</Button>} />
    ) : (
      <EmptyState art="empty" title={t.home.emptyTitle} body={t.home.emptyBody} action={<Button variant="primary" onClick={onAdd}>{t.home.emptyAction}</Button>} />
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
        {apps.map((app, i) => renderKey(app, i))}
        <KeyFiller itemCount={apps.length} columns={columns} />
      </KeyGrid>
    );
  }

  const groups = groupApps(apps);
  // Vị trí liền mạch qua các nhóm để màu sơn không lặp giữa hai phím kề nhau.
  const starts = groups.map((_, gi) => groups.slice(0, gi).reduce((n, g) => n + g.items.length, 0));
  return (
    <KeyGrid columns={columns}>
      {groups.map(({ group, items }, gi) => [
        <KeyGroupHeader key={`h-${group}`} label={group} count={pad2(items.length)} />,
        ...items.map((app, i) => renderKey(app, starts[gi] + i)),
        <KeyFiller key={`f-${group}`} itemCount={items.length} columns={columns} />,
      ])}
    </KeyGrid>
  );
}
