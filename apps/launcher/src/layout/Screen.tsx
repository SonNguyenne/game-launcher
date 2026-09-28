import type { ReactNode } from 'react';
import { useLockPageScroll } from '@/hooks/useLockPageScroll';
import s from './Screen.module.css';

/** Màn hình phủ toàn bộ, trượt vào từ phải. Dùng cho cài đặt, quản lý app. */
export function Screen({ bar, children }: { bar: ReactNode; children: ReactNode }) {
  useLockPageScroll();
  return (
    <section className={s.screen}>
      {bar}
      <div className={s.content}>{children}</div>
    </section>
  );
}
