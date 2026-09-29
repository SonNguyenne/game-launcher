import { Icon } from '@bang/ui';
import { t } from '@/i18n/vi';
import { useLauncherStore } from '@/store/launcherStore';
import { focusSearch } from './SearchBar';
import s from './HomePage.module.css';

/**
 * Thanh công cụ dưới cùng. Kiểu sôi động (arcade) thành dock bo 3 nút, nút thêm app là nút bấm arcade tròn nổi bật ở giữa.
 */
export function BottomTools({ onAdd, onSettings }: { onAdd: () => void; onSettings: () => void }) {
  const dock = useLauncherStore((st) => st.settings.look === 'quan');

  if (dock) {
    return (
      <nav className={s.dock}>
        <button className={s.dockButton} onClick={focusSearch}>
          <Icon name="search" />
          <span>{t.home.searchLabel}</span>
        </button>
        <button className={s.dockMain} onClick={onAdd} aria-label={t.home.add}>
          <span className={s.dockMainPad} aria-hidden="true" />
          <Icon name="plus" size={28} strokeWidth={2.8} />
        </button>
        <button className={s.dockButton} onClick={onSettings}>
          <Icon name="sliders" />
          <span>{t.home.settings}</span>
        </button>
      </nav>
    );
  }

  return (
    <nav className={s.tools}>
      <button className={s.tool} onClick={onAdd}>
        <Icon name="plus" />
        {t.home.add}
      </button>
      <button className={s.tool} onClick={onSettings}>
        <Icon name="sliders" />
        {t.home.settings}
      </button>
    </nav>
  );
}
