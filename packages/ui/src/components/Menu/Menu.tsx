import { cx } from '../../utils/cx';
import { pad2 } from '../../utils/format';
import s from './Menu.module.css';

export interface MenuItem {
  id: string;
  label: string;
  onSelect: () => void;
  danger?: boolean;
}

export function Menu({ items }: { items: MenuItem[] }) {
  return (
    <div role="menu">
      {items.map((item, i) => (
        <button key={item.id} role="menuitem" className={cx(s.item, item.danger && s.danger)} onClick={item.onSelect}>
          <span className={s.index}>{pad2(i + 1)}</span>
          {item.label}
        </button>
      ))}
    </div>
  );
}
