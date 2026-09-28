import { Button, Field, Key, Swatches, SwitchRow, TextInput, pad2 } from '@bang/ui';
import { appConfig } from '@/config/app';
import { t } from '@/i18n/vi';
import { useAppForm } from './useAppForm';
import s from './AppFormSheet.module.css';

interface AppFormSheetProps {
  appId?: string;
  onDone: () => void;
}

export function AppFormSheet({ appId, onDone }: AppFormSheetProps) {
  const { app, isCode, index, values, errors, groups, set, tryOpen, submit, remove, reset } = useAppForm(appId, onDone);

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className={s.preview} aria-hidden="true">
        <Key tabIndex={-1} index={pad2(index)} status={t.form.preview} label={values.name || t.form.namePlaceholderLabel} color={values.color} />
      </div>

      <Field label={t.form.name} error={errors.name} htmlFor="f-name">
        <TextInput id="f-name" maxLength={appConfig.nameMaxLength} value={values.name} placeholder={t.form.namePlaceholder} invalid={!!errors.name} onChange={(e) => set('name', e.target.value)} />
      </Field>

      {isCode ? (
        <p className={s.note}>{t.form.codeNote}</p>
      ) : (
        <Field label={t.form.url} hint={t.form.urlHint} error={errors.url} htmlFor="f-url">
          <TextInput id="f-url" type="url" inputMode="url" value={values.url} placeholder={t.form.urlPlaceholder} invalid={!!errors.url} onChange={(e) => set('url', e.target.value)} />
        </Field>
      )}

      <Field label={t.form.color} aside={t.form.colorAside}>
        <Swatches label={t.form.color} value={values.color} onChange={(c) => set('color', c)} />
      </Field>

      <Field label={t.form.group} htmlFor="f-group">
        <TextInput id="f-group" list="f-groups" maxLength={appConfig.groupMaxLength} value={values.group} placeholder={t.form.groupPlaceholder} onChange={(e) => set('group', e.target.value)} />
        <datalist id="f-groups">
          {groups.map((g) => <option key={g} value={g} />)}
        </datalist>
      </Field>

      <SwitchRow label={t.form.hidden} checked={values.hidden} onChange={(v) => set('hidden', v)} />

      <div className={s.actions}>
        <Button onClick={tryOpen}>{t.form.tryOpen}</Button>
        <Button type="submit" variant="primary">{app ? t.form.submitEdit : t.form.submitAdd}</Button>
      </div>

      {app && (
        <div className={s.extra}>
          {isCode ? (
            <Button block onClick={reset}>{t.form.reset}</Button>
          ) : (
            <Button block variant="danger" onClick={remove}>{t.form.remove}</Button>
          )}
        </div>
      )}
    </form>
  );
}
