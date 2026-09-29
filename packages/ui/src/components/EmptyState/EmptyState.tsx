import type { ReactNode } from 'react';
import { Illustration, type IllustrationName } from '../Illustration';
import s from './EmptyState.module.css';

interface EmptyStateProps {
  title: string;
  body: string;
  action?: ReactNode;
  art?: IllustrationName;
}

export function EmptyState({ title, body, action, art }: EmptyStateProps) {
  return (
    <div className={s.empty}>
      {art && <Illustration name={art} className={s.art} />}
      <h2 className={s.title}>{title}</h2>
      <p className={s.body}>{body}</p>
      {action}
    </div>
  );
}
