import { forwardRef, type ButtonHTMLAttributes, type CSSProperties } from 'react';
import { keyColors, type KeyColorId } from '../../tokens';
import { cx } from '../../utils/cx';
import s from './Key.module.css';

/** Số màu sơn phím tự xoay vòng ở kiểu "quán" (đỏ, vàng, xanh két, xanh dương, giấy). */
export const KEY_TONES = 5;

export interface KeyProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  index?: string;
  /** Ký hiệu ngắn (thường là chữ cái đầu), hiện to thay hình vẽ khi app không có hình. */
  mark?: string;
  /** Mã SVG hình vẽ của app (tin cậy, đóng gói cùng app). Chỉ kiểu "quán" hiển thị. */
  art?: string;
  label: string;
  status?: string;
  color?: KeyColorId;
  /** Vị trí màu sơn khi color là "auto"; 0..KEY_TONES-1. */
  tone?: number;
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
  { index, mark, art, label, status, color = 'auto', tone, hot, variant = 'app', compact, className, style, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(s.key, hot && s.hot, variant === 'add' && s.add, compact && s.compact, className)}
      style={{ ...keyColorStyle(color), ...style }}
      data-color={color}
      data-tone={tone === undefined ? undefined : tone % KEY_TONES}
      {...rest}
    >
      <span className={s.top}>
        {art ? (
          <span className={s.art} aria-hidden="true" dangerouslySetInnerHTML={{ __html: art }} />
        ) : (
          mark && <span className={s.mark} aria-hidden="true">{mark}</span>
        )}
        <span className={s.index}>{index}</span>
        {status && <span className={s.status}>{status}</span>}
      </span>
      <span className={s.label}>{label}</span>
    </button>
  );
});
