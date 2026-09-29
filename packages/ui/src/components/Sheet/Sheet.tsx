import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { durationMs } from '../../tokens';
import { cx } from '../../utils/cx';
import { useFocusTrap } from '../../utils/useFocusTrap';
import { Icon } from '../Icon';
import s from './Sheet.module.css';

export interface SheetProps {
  open: boolean;
  title: string;
  closeLabel: string;
  onClose: () => void;
  /** Bỏ padding khi nội dung tự kẻ ô (ví dụ Menu). */
  flush?: boolean;
  children: ReactNode;
}

/** Bảng trượt từ dưới lên. Giữ DOM trong lúc chạy hiệu ứng đóng. */
export function Sheet({ open, title, closeLabel, onClose, flush, children }: SheetProps) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open && mounted);

  useEffect(() => {
    if (open) {
      setMounted(true);
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setVisible(true));
      });
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    }
    setVisible(false);
    const t = setTimeout(() => setMounted(false), durationMs.slide);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (visible) panelRef.current?.focus({ preventScroll: true });
  }, [visible]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!mounted) return null;
  return createPortal(
    <div className={cx(visible && s.open)}>
      <div className={s.scrim} onClick={onClose} />
      <div ref={panelRef} className={s.sheet} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        <div className={s.handle} aria-hidden="true" />
        <div className={s.head}>
          <h2>{title}</h2>
          <button className={s.close} onClick={onClose} aria-label={closeLabel}>
            <Icon name="close" />
          </button>
        </div>
        <div className={cx(s.body, flush && s.flush)}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
