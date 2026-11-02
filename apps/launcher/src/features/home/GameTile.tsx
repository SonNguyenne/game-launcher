import { cx } from '@bang/ui';
import { t } from '@/i18n/vi';
import { useLongPress } from '@/hooks/useLongPress';
import type { LauncherApp } from '@/registry/types';
import s from './PixelHome.module.css';

/** Chữ cái đầu, giữ nguyên dấu tiếng Việt (Ư, Đ…). */
const initial = (name: string) => Array.from(name.trim().normalize('NFC'))[0]?.toLocaleUpperCase('vi') ?? '';

interface GameTileProps {
  app: LauncherApp;
  hot: boolean;
  onOpen: (app: LauncherApp, el: HTMLElement) => void;
  onLongPress: (app: LauncherApp) => void;
}

/** Ô game của kiểu pixel: icon trong ô tối, tên và số người bên dưới. */
export function GameTile({ app, hot, onOpen, onLongPress }: GameTileProps) {
  const { handlers, wrapClick } = useLongPress(() => onLongPress(app));
  const art = app.kind === 'code' ? app.art : undefined;
  const players = app.kind === 'code' ? app.players : undefined;

  return (
    <button className={cx(s.tile, hot && s.hot)} {...handlers} onClick={wrapClick((e) => onOpen(app, e.currentTarget))}>
      <span className={s.icon} aria-hidden="true">
        {art ? <span className={s.art} dangerouslySetInnerHTML={{ __html: art }} /> : <span className={s.mark}>{initial(app.name)}</span>}
      </span>
      <span className={s.name}>{app.name}</span>
      <span className={s.meta}>{players ? t.home.players(players) : app.kind === 'link' ? t.common.typeLink : ''}</span>
    </button>
  );
}
