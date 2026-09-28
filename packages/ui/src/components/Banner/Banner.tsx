import { cx } from '../../utils/cx';
import s from './Banner.module.css';

export function Banner({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div className={cx(s.banner, visible && s.show)} role="status" aria-hidden={!visible}>
      {message}
    </div>
  );
}
