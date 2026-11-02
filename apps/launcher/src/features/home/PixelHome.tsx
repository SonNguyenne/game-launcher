import { useState } from 'react';
import { readProfile } from '@bang/party';
import { Button, EmptyState, Icon, cx } from '@bang/ui';
import { t } from '@/i18n/vi';
import { matchesQuery } from '@/lib/text';
import { groupApps } from '@/registry/useApps';
import type { LauncherApp } from '@/registry/types';
import { GameTile } from './GameTile';
import { HomeMenu } from './HomeMenu';
import { JoinRoom } from './JoinRoom';
import { SearchBar, focusSearch } from './SearchBar';
import s from './PixelHome.module.css';

/** Thứ tự nhóm game trên trang chủ; nhóm khác (app link, nhóm tự đặt) xếp sau. */
const GROUP_ORDER = ['board game', 'bài', 'khác'];
const rank = (group: string) => {
  const i = GROUP_ORDER.indexOf(group);
  return i < 0 ? GROUP_ORDER.length : i;
};

interface PixelHomeProps {
  apps: LauncherApp[];
  hotId?: string;
  onOpen: (app: LauncherApp, el: HTMLElement, search?: string) => void;
  onLongPress: (app: LauncherApp) => void;
  onAdd: () => void;
  onManage: () => void;
  onSettings: () => void;
}

/** Trang chủ kiểu pixel: ô vào phòng bằng mã ở đầu, lưới icon game chia nhóm bên dưới. */
export function PixelHome({ apps, hotId, onOpen, onLongPress, onAdd, onManage, onSettings }: PixelHomeProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [name, setName] = useState(() => readProfile().name ?? '');

  const q = query.trim();
  const shown = q ? apps.filter((a) => matchesQuery(q, a.name, a.group)) : apps;
  const groups = q ? [{ group: t.home.results, items: shown }] : groupApps(shown).sort((a, b) => rank(a.group) - rank(b.group));
  const tile = (app: LauncherApp) => <GameTile key={app.id} app={app} hot={app.id === hotId} onOpen={onOpen} onLongPress={onLongPress} />;

  const toggleSearch = () => {
    const next = !searching;
    setSearching(next);
    if (next) requestAnimationFrame(focusSearch);
    else setQuery('');
  };

  return (
    <div className={s.page}>
      <header className={s.top}>
        <button className={s.iconBtn} aria-label={t.home.menu} onClick={() => setMenuOpen(true)}>
          <Icon name="menu" size={22} />
        </button>
        <button className={s.logo} aria-label={t.home.logoLabel} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <span className={s.logoMark} aria-hidden="true">
            {Array.from({ length: 9 }, (_, i) => <i key={i} />)}
          </span>
          bảng
        </button>
        <button className={cx(s.iconBtn, s.push)} aria-label={t.home.searchLabel} aria-pressed={searching} onClick={toggleSearch}>
          <Icon name="search" size={20} />
        </button>
        <button className={s.me} onClick={() => setMenuOpen(true)}>
          <span className={s.ava} aria-hidden="true">{Array.from(name)[0]?.toLocaleUpperCase('vi') ?? '?'}</span>
          <span className={s.meName}>{name || t.home.noName}</span>
        </button>
      </header>

      <main className={s.body}>
        {searching ? (
          <SearchBar value={query} onChange={setQuery} />
        ) : (
          <>
            <h1 className={s.hero}>
              {t.home.heroLead} <span className={s.pop}>{t.home.heroPop}</span>
            </h1>
            <JoinRoom
              hasApp={(id) => apps.some((a) => a.id === id)}
              onJoin={(id, code) => {
                const app = apps.find((a) => a.id === id);
                if (app) onOpen(app, document.body, `?phong=${code}`);
              }}
            />
          </>
        )}

        {!shown.length && (
          <EmptyState
            art={q ? 'no-match' : 'empty'}
            title={q ? t.home.noMatchTitle(q) : t.home.emptyTitle}
            body={q ? t.home.noMatchBody : t.home.emptyBody}
            action={<Button onClick={onAdd}>{t.home.add}</Button>}
          />
        )}

        {groups.map(({ group, items }) => (
          <section key={group} className={s.group} aria-label={group}>
            <div className={s.groupHead}>
              <i className={s.dot} aria-hidden="true" />
              <h2 className={s.groupTitle}>{group}</h2>
              <span className={s.count}>{items.length}</span>
              <hr className={s.rule} />
            </div>
            <div className={s.grid}>{items.map(tile)}</div>
          </section>
        ))}
      </main>

      <HomeMenu open={menuOpen} onClose={() => setMenuOpen(false)} onNameChange={setName} onAdd={onAdd} onManage={onManage} onSettings={onSettings} />
    </div>
  );
}
