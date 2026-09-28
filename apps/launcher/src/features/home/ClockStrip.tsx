import { appConfig } from '@/config/app';
import { t } from '@/i18n/vi';
import { formatClock, formatShortDay } from '@/lib/date';
import { useNow } from '@/hooks/useNow';
import s from './HomePage.module.css';

export function ClockStrip({ appCount }: { appCount: number }) {
  const now = useNow(appConfig.clockTickMs);
  return (
    <header className={s.strip}>
      <div className={s.clock} aria-label={t.home.clockLabel}>{formatClock(now)}</div>
      <div className={s.meta}>
        <span className={s.metaStrong}>{formatShortDay(now)}</span>
        <span>{t.common.appCount(appCount)}</span>
      </div>
    </header>
  );
}
