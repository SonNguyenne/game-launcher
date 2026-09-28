import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { matchesQuery } from '@/lib/text';
import { useApps } from '@/registry/useApps';
import { useLauncherStore } from '@/store/launcherStore';
import { useUiStore } from '@/store/uiStore';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { AppBoard } from './AppBoard';
import { BottomTools } from './BottomTools';
import { ClockStrip } from './ClockStrip';
import { SearchBar } from './SearchBar';
import s from './HomePage.module.css';

/** Bảng app luôn nằm dưới cùng; các màn khác (app, cài đặt…) hiện đè lên qua <Outlet />. */
export function HomePage() {
  const [query, setQuery] = useState('');
  const { visible } = useApps();
  const columns = useLauncherStore((st) => st.settings.columns);
  const hotId = useLauncherStore((st) => st.recents[0]);
  const openSheet = useUiStore((st) => st.openSheet);
  const { openApp, openSettings } = useAppNavigation();

  const shown = query ? visible.filter((a) => matchesQuery(query, a.name, a.group)) : visible;
  const openForm = () => openSheet({ kind: 'app-form' });

  return (
    <>
      <main className={s.home}>
        <ClockStrip appCount={visible.length} />
        <SearchBar value={query} onChange={setQuery} />
        <div className={s.board}>
          <AppBoard
            apps={shown}
            query={query.trim()}
            columns={columns}
            hotId={hotId}
            onOpen={(app, el) => openApp(app.id, el)}
            onLongPress={(app) => openSheet({ kind: 'app-actions', appId: app.id })}
            onAdd={openForm}
          />
        </div>
        <BottomTools onAdd={openForm} onSettings={openSettings} />
      </main>
      <Outlet />
    </>
  );
}
