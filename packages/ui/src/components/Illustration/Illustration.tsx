import { cx } from '../../utils/cx';
import s from './Illustration.module.css';

const arts = import.meta.glob<string>('./art/*.svg', { eager: true, query: '?raw', import: 'default' });

export type IllustrationName = 'empty' | 'no-match' | 'offline' | 'error';

/**
 * Hình vẽ sơn tay cho màn trống, lỗi, mất mạng. Tô bằng 3 biến --art-ink, --art-paper, --art-pop
 * lấy từ màu trang; chỉ hiện ở kiểu hiển thị có hình (--mark-display).
 */
export function Illustration({ name, className }: { name: IllustrationName; className?: string }) {
  const svg = arts[`./art/${name}.svg`];
  if (!svg) return null;
  return <span className={cx(s.art, className)} aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />;
}
