import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { cx } from '@bang/ui';
import { appConfig } from '@/config/app';
import { t } from '@/i18n/vi';
import s from './PinPad.module.css';

/** Kết quả kiểm tra mã: đúng, sai (kèm lý do) hoặc sang bước tiếp (kèm hướng dẫn). */
export type PinCheck = { ok: true } | { ok: false; error: string } | { next: string };

interface PinPadProps {
  title: string;
  subtitle: string;
  cancellable: boolean;
  onSubmit: (pin: string) => Promise<PinCheck>;
  onSuccess: () => void;
  onCancel: () => void;
}

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export function PinPad({ title, subtitle, cancellable, onSubmit, onSuccess, onCancel }: PinPadProps) {
  const [value, setValue] = useState('');
  const [sub, setSub] = useState(subtitle);
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(0);

  const press = useCallback(
    async (key: string) => {
      if (key === 'del') return setValue((v) => v.slice(0, -1));
      if (value.length >= appConfig.pinLength) return;
      const next = value + key;
      setValue(next);
      if (next.length < appConfig.pinLength) return;

      const res = await onSubmit(next);
      if ('next' in res) {
        setSub(res.next);
        setError(false);
        setValue('');
      } else if (res.ok) {
        onSuccess();
      } else {
        setSub(res.error);
        setError(true);
        setShake((n) => n + 1);
        navigator.vibrate?.(60);
        setTimeout(() => setValue(''), 300);
      }
    },
    [value, onSubmit, onSuccess],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('del');
      else if (e.key === 'Escape' && cancellable) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press, cancellable, onCancel]);

  return (
    <div className={s.lock} role="dialog" aria-modal="true" aria-label={title}>
      <div className={s.top}>
        <small className={s.brand}>{t.pin.brand}</small>
        <h2 className={s.title}>{title}</h2>
        <p className={cx(s.sub, error && s.error)} role="status">{sub}</p>
        <div
          key={shake}
          className={cx(s.dots, shake > 0 && s.shake)}
          style={{ '--len': appConfig.pinLength } as CSSProperties}
          aria-label={t.pin.progress(value.length, appConfig.pinLength)}
        >
          {Array.from({ length: appConfig.pinLength }, (_, i) => (
            <span key={i} className={cx(s.dot, i < value.length && s.filled)} />
          ))}
        </div>
      </div>
      <div className={s.pad}>
        {DIGITS.map((d) => (
          <button key={d} className={s.key} onClick={() => press(d)}>{d}</button>
        ))}
        {cancellable ? (
          <button className={cx(s.key, s.fn)} onClick={onCancel}>{t.common.cancel}</button>
        ) : (
          <span className={s.key} aria-hidden="true" />
        )}
        <button className={s.key} onClick={() => press('0')}>0</button>
        <button className={cx(s.key, s.fn)} onClick={() => press('del')} aria-label={t.pin.deleteLabel}>{t.pin.delete}</button>
      </div>
    </div>
  );
}
