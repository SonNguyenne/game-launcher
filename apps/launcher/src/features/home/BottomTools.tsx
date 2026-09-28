import { Icon } from '@bang/ui';
import { t } from '@/i18n/vi';
import { useLauncherStore } from '@/store/launcherStore';
import { focusSearch } from './SearchBar';
import s from './HomePage.module.css';

/**
 * Thanh công cụ dưới cùng. Kiểu "mềm" thành dock tối 3 nút, nút thêm app ở giữa,
 * thêm nút tìm để khỏi với tay lên đầu màn hình.
 */
export function BottomTools({ onAdd, onSettings }: { onAdd: () => void; onSettings: () => void }) {
  const dock = useLauncherStore((st) => st.settings.look === 'soft');

  if (dock) {
    return (
      <nav className={s.dock}>
        <button className={s.dockButton} onClick={focusSearch}>
          <Icon name="search" />
          <span>{t.home.searchLabel}</span>
        </button>
        <button className={s.dockMain} onClick={onAdd} aria-label={t.home.add}>
          <Icon name="plus" size={26} />
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
