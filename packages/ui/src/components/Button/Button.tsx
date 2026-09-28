import type { ButtonHTMLAttributes } from 'react';
import { cx } from '../../utils/cx';
import s from './Button.module.css';

type Variant = 'primary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  block?: boolean;
}

export function Button({ variant = 'ghost', block, className, type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={cx(s.button, s[variant], block && s.block, className)} {...rest} />;
}
