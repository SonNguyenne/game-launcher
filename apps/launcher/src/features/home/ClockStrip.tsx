import { pad2 } from '@bang/ui';
import { appConfig } from '@/config/app';
import { t } from '@/i18n/vi';
import { formatShortDay } from '@/lib/date';
import { useNow } from '@/hooks/useNow';
import s from './HomePage.module.css';

export function ClockStrip({ appCount }: { appCount: number }) {
  const now = useNow(appConfig.clockTickMs);
  const hour = now.getHours();
  // Mốc giờ xếp giảm dần; trước mốc nhỏ nhất (0h–5h) vẫn là câu khuya, tức câu đầu.
  const mood = t.home.moods.find(([from]) => hour >= from) ?? t.home.moods[0];
  return (
    <header className={s.strip}>
      <div className={s.clock} aria-label={t.home.clockLabel}>
        {pad2(hour)}
        <span className={s.colon}>:</span>
        {pad2(now.getMinutes())}
      </div>
      <div className={s.meta}>
        <span className={s.metaStrong}>{formatShortDay(now)}</span>
        <span className={s.appPill}>{t.common.appCount(appCount)}</span>
      </div>
      <p className={s.mood}>{mood[1]}</p>
    </header>
  );
}
