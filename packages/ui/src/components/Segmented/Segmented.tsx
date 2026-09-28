import { cx } from '../../utils/cx';
import s from './Segmented.module.css';

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string | number> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  flat?: boolean;
}

export function Segmented<T extends string | number>({ options, value, onChange, label, flat }: SegmentedProps<T>) {
  return (
    <div className={cx(s.seg, flat && s.flat)} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" className={s.option} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
