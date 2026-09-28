import type { ReactNode } from 'react';
import { Icon, type IconName } from '../Icon';
import s from './TopBar.module.css';

interface TopBarProps {
  title: string;
  backLabel: string;
  onBack: () => void;
  actions?: ReactNode;
}

export function TopBar({ title, backLabel, onBack, actions }: TopBarProps) {
  return (
    <header className={s.bar}>
      <button className={s.iconButton} onClick={onBack} aria-label={backLabel}>
        <Icon name="back" size={20} />
      </button>
      <h1 className={s.title}>{title}</h1>
      <div className={s.actions}>{actions}</div>
    </header>
  );
}

export function TopBarIconButton({ icon, label, onClick }: { icon: IconName; label: string; onClick: () => void }) {
  return (
    <button className={s.iconButton} onClick={onClick} aria-label={label}>
      <Icon name={icon} size={20} />
    </button>
  );
}

export function TopBarTextButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button className={s.textButton} onClick={onClick}>
      {children}
    </button>
  );
}
