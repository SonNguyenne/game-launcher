import type { ReactNode } from 'react';
import s from './EmptyState.module.css';

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className={s.empty}>
      <h2 className={s.title}>{title}</h2>
      <p className={s.body}>{body}</p>
      {action}
    </div>
  );
}
