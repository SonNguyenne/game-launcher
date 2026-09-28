import type { CSSProperties } from 'react';
import { keyColors } from '../../tokens';
import s from './Swatches.module.css';

type ColorTable = Record<string, { label: string; fill: string | null; text: string | null }>;

interface SwatchesProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  label: string;
  /** Bảng màu để chọn; mặc định là màu phím. */
  options?: ColorTable;
}

const swatchStyle = (c: ColorTable[string]): CSSProperties =>
  c.fill ? ({ '--key-fill': c.fill, '--key-text': c.text } as CSSProperties) : {};

export function Swatches<T extends string>({ value, onChange, label, options = keyColors }: SwatchesProps<T>) {
  const ids = Object.keys(options) as T[];
  return (
    <div className={s.grid} role="group" aria-label={label} style={{ '--count': ids.length } as CSSProperties}>
      {ids.map((id) => (
        <button key={id} type="button" className={s.swatch} style={swatchStyle(options[id])} aria-pressed={id === value} onClick={() => onChange(id)}>
          {options[id].label}
        </button>
      ))}
    </div>
  );
}
