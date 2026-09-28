import { forwardRef, type ButtonHTMLAttributes, type CSSProperties } from 'react';
import { keyColors, type KeyColorId } from '../../tokens';
import { cx } from '../../utils/cx';
import s from './Key.module.css';

export interface KeyProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  index?: string;
  /** Ký hiệu ngắn (thường là chữ cái đầu) hiện trong ô tròn ở kiểu "mềm". */
  mark?: string;
  label: string;
  status?: string;
  color?: KeyColorId;
  hot?: boolean;
  variant?: 'app' | 'add';
  compact?: boolean;
}

/** Style inline chỉ gán biến CSS; màu thật lấy từ token keyColors. */
export function keyColorStyle(color: KeyColorId = 'auto'): CSSProperties {
  const c = keyColors[color];
  if (!c.fill) return {};
  return { '--key-fill': c.fill, '--key-text': c.text } as CSSProperties;
}

export const Key = forwardRef<HTMLButtonElement, KeyProps>(function Key(
  { index, mark, label, status, color = 'auto', hot, variant = 'app', compact, className, style, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(s.key, hot && s.hot, variant === 'add' && s.add, compact && s.compact, className)}
      style={{ ...keyColorStyle(color), ...style }}
      {...rest}
    >
      <span className={s.top}>
        <span className={s.index}>{index}</span>
        {mark && <span className={s.mark} aria-hidden="true">{mark}</span>}
        {status && <span className={s.status}>{status}</span>}
      </span>
      <span className={s.label}>{label}</span>
    </button>
  );
});
