import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cx } from '../../utils/cx';
import s from './Field.module.css';

interface FieldProps {
  label: string;
  aside?: string;
  hint?: string;
  error?: string | null;
  htmlFor?: string;
  children: ReactNode;
}

export function Field({ label, aside, hint, error, htmlFor, children }: FieldProps) {
  return (
    <div className={s.field}>
      <label className={s.label} htmlFor={htmlFor}>
        <span>{label}</span>
        {aside && <span className={s.aside}>{aside}</span>}
      </label>
      {children}
      {error ? (
        <em className={s.error} role="alert">{error}</em>
      ) : (
        hint && <small className={s.hint}>{hint}</small>
      )}
    </div>
  );
}

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { invalid, className, ...rest },
  ref,
) {
  return (
    <input ref={ref} className={cx(s.input, invalid && s.invalid, className)} aria-invalid={invalid || undefined} {...rest} />
  );
});
