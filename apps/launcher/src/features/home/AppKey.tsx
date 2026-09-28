import { Key, pad2 } from '@bang/ui';
import { t } from '@/i18n/vi';
import { useLongPress } from '@/hooks/useLongPress';
import type { LauncherApp } from '@/registry/types';

/** Chữ cái đầu, giữ nguyên dấu tiếng Việt (Ư, Đ…). */
const initial = (name: string) => Array.from(name.trim().normalize('NFC'))[0]?.toLocaleUpperCase('vi') ?? '';

interface AppKeyProps {
  app: LauncherApp;
  hot: boolean;
  compact: boolean;
  onOpen: (app: LauncherApp, el: HTMLElement) => void;
  onLongPress: (app: LauncherApp) => void;
}

/** Nối dữ liệu app vào component Key của @bang/ui, kèm cử chỉ nhấn giữ. */
export function AppKey({ app, hot, compact, onOpen, onLongPress }: AppKeyProps) {
  const { handlers, wrapClick } = useLongPress(() => onLongPress(app));
  const status = hot ? t.common.hot : app.kind === 'link' ? t.common.typeLink : '';

  return (
    <Key
      index={pad2(app.index)}
      mark={initial(app.name)}
      label={app.name}
      status={status}
      color={app.color}
      hot={hot}
      compact={compact}
      {...handlers}
      onClick={wrapClick((e) => onOpen(app, e.currentTarget))}
    />
  );
}
