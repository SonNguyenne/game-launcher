import { cx } from '@bang/ui';
import s from './Party.module.css';

interface ChipsProps<T extends string> {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  /** Khách trong phòng chỉ xem; chủ phòng (hoặc chơi 1 máy) mới đổi được. */
  disabled?: boolean;
}

/** Hàng chip chọn mức độ / chủ đề của ván, đặt ở đầu màn chơi. */
export function Chips<T extends string>({ label, options, value, onChange, disabled }: ChipsProps<T>) {
  return (
    <div className={s.chips} role="radiogroup" aria-label={label}>
      <span className={s.chipsLabel}>{label}</span>
      <div className={s.chipRow}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            className={cx(s.chip, o.value === value && s.chipOn)}
            disabled={disabled && o.value !== value}
            onClick={() => !disabled && onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
