import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../../utils/cx';
import { useFocusTrap } from '../../utils/useFocusTrap';
import s from './Dialog.module.css';

export interface DialogProps {
  title: string;
  text: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function Dialog({ title, text, confirmLabel, cancelLabel, danger, onConfirm, onCancel }: DialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  useFocusTrap(boxRef, true);

  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return createPortal(
    <>
      <div className={s.scrim} onClick={onCancel} />
      <div ref={boxRef} className={s.dialog} role="alertdialog" aria-modal="true" aria-label={title}>
        <h2 className={s.title}>{title}</h2>
        <p className={s.text}>{text}</p>
        <div className={s.actions}>
          <button className={s.action} onClick={onCancel}>{cancelLabel}</button>
          <button ref={confirmRef} className={cx(s.action, danger ? s.danger : s.confirm)} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
