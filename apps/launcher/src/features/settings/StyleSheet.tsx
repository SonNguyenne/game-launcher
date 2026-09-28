import {
  Button,
  Field,
  Key,
  Segmented,
  Swatches,
  accentColors,
  cornerIds,
  fontIds,
  fontScaleIds,
  resolveStyle,
  spacingIds,
  type StyleCustom,
} from '@bang/ui';
import { t } from '@/i18n/vi';
import { useLauncherStore } from '@/store/launcherStore';
import { notify } from '@/store/uiStore';
import s from './Settings.module.css';

const opts = <T extends string>(ids: readonly T[], labels: Record<T, string>) => ids.map((v) => ({ value: v, label: labels[v] }));

const scaleOptions = opts(fontScaleIds, t.style.scaleOptions);
const fontOptions = opts(fontIds, t.style.fontOptions);
const cornerOptions = opts(cornerIds, t.style.cornerOptions);
const spacingOptions = opts(spacingIds, t.style.spacingOptions);

/** Chỉnh giao diện; mỗi thay đổi áp dụng ngay nên phần xem trước luôn đúng. */
export function StyleSheet({ onDone }: { onDone: () => void }) {
  const look = useLauncherStore((st) => st.settings.look);
  const custom = useLauncherStore((st) => st.settings.custom);
  const updateSettings = useLauncherStore((st) => st.updateSettings);
  const style = resolveStyle(look, custom);

  const set = <K extends keyof StyleCustom>(key: K, value: StyleCustom[K]) => updateSettings({ custom: { ...custom, [key]: value } });
  const reset = () => {
    updateSettings({ custom: {} });
    notify(t.style.resetDone);
  };

  return (
    <>
      <div className={s.preview} aria-hidden="true">
        <Key tabIndex={-1} index="01" label={t.style.previewKey} />
        <Key tabIndex={-1} index="02" label={t.style.previewKey} status={t.common.hot} hot />
      </div>

      <Field label={t.style.accent} aside={t.style.accentAside}>
        <Swatches label={t.style.accent} options={accentColors} value={style.accent} onChange={(v) => set('accent', v)} />
      </Field>
      <Field label={t.style.scale}>
        <Segmented label={t.style.scale} options={scaleOptions} value={style.scale} onChange={(v) => set('scale', v)} />
      </Field>
      <Field label={t.style.font}>
        <Segmented label={t.style.font} options={fontOptions} value={style.font} onChange={(v) => set('font', v)} />
      </Field>
      <Field label={t.style.corners}>
        <Segmented label={t.style.corners} options={cornerOptions} value={style.corners} onChange={(v) => set('corners', v)} />
      </Field>
      <Field label={t.style.spacing}>
        <Segmented label={t.style.spacing} options={spacingOptions} value={style.spacing} onChange={(v) => set('spacing', v)} />
      </Field>

      <div className={s.actions}>
        <Button onClick={reset} disabled={Object.keys(custom).length === 0}>{t.style.reset}</Button>
        <Button variant="primary" onClick={onDone}>{t.style.done}</Button>
      </div>
    </>
  );
}
