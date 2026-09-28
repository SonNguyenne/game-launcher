import { cx } from '../../utils/cx';
import s from './Toast.module.css';

export function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div className={cx(s.toast, visible && s.show)} role="status" aria-live="polite">
      {message}
    </div>
  );
}
