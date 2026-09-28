import { Icon } from '@bang/ui';
import { t } from '@/i18n/vi';
import s from './HomePage.module.css';

export const SEARCH_INPUT_ID = 'app-search';

/** Đưa con trỏ vào ô tìm, cuộn lên nếu cần. Dùng cho nút tìm ở dock. */
export const focusSearch = () => document.getElementById(SEARCH_INPUT_ID)?.focus();

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className={s.search}>
      <label className={s.searchLabel} htmlFor={SEARCH_INPUT_ID}>
        <span className={s.searchText}>{t.home.searchLabel}</span>
        <span className={s.searchIcon}><Icon name="search" size={20} /></span>
      </label>
      <input
        id={SEARCH_INPUT_ID}
        className={s.searchInput}
        type="search"
        autoComplete="off"
        placeholder={t.home.searchPlaceholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
