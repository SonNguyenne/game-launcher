import type { CSSProperties, ReactNode } from 'react';
import s from './KeyGrid.module.css';

interface KeyGridProps {
  columns: number;
  children: ReactNode;
}

export function KeyGrid({ columns, children }: KeyGridProps) {
  return (
    <div className={s.grid} style={{ '--cols': columns } as CSSProperties}>
      {children}
    </div>
  );
}

export function KeyGroupHeader({ label, count }: { label: string; count: string }) {
  return (
    <div className={s.header}>
      <span className={s.headerLabel}>{label}</span>
      <span className={s.count}>{count}</span>
    </div>
  );
}

/** Lấp ô trống cuối hàng để lưới luôn kín. */
export function KeyFiller({ itemCount, columns }: { itemCount: number; columns: number }) {
  const rest = itemCount % columns;
  if (!rest) return null;
  return (
    <>
      {Array.from({ length: columns - rest }, (_, i) => (
        <span key={i} className={s.filler} aria-hidden="true" />
      ))}
    </>
  );
}

export function KeyGridFullRow({ children }: { children: ReactNode }) {
  return <div className={s.full}>{children}</div>;
}
