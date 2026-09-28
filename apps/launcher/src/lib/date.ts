import { pad2 } from '@bang/ui';
import { t } from '@/i18n/vi';

export const formatClock = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
export const formatShortDay = (d: Date) => `${t.days[d.getDay()]} ${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}`;
export const fileDateStamp = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
