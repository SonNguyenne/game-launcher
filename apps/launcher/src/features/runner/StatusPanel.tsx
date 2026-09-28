import type { ReactNode } from 'react';
import s from './Runner.module.css';

interface StatusPanelProps {
  code: string;
  title?: string;
  text?: string;
  actions?: ReactNode;
}

/** Màn trạng thái trong khung app: đang tải, lỗi, không tìm thấy. */
export function StatusPanel({ code, title, text, actions }: StatusPanelProps) {
  return (
    <div className={s.panel}>
      <div className={s.code}>{code}</div>
      {title && <h2 className={s.panelTitle}>{title}</h2>}
      {text && <p className={s.panelText}>{text}</p>}
      {actions && <div className={s.panelActions}>{actions}</div>}
    </div>
  );
}
