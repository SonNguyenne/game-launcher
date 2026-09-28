import { Button } from '@bang/ui';
import { t } from '@/i18n/vi';
import s from './Settings.module.css';

export function InstallGuide({ onDone }: { onDone: () => void }) {
  return (
    <>
      <div className={s.card}>
        <strong>{t.install.iosTitle}</strong>
        <p>{t.install.iosBody}</p>
      </div>
      <div className={s.card}>
        <strong>{t.install.androidTitle}</strong>
        <p>{t.install.androidBody}</p>
      </div>
      <Button block variant="primary" onClick={onDone}>{t.install.ok}</Button>
    </>
  );
}
