import { useState } from 'react';
import { appConfig } from '@/config/app';
import { t } from '@/i18n/vi';
import { useApps } from '@/registry/useApps';
import { useLauncherStore } from '@/store/launcherStore';
import { notify, useUiStore } from '@/store/uiStore';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { validateAppForm, type AppFormErrors, type AppFormValues } from './validation';

/** Toàn bộ logic của form thêm/sửa; component chỉ việc hiển thị. */
export function useAppForm(appId: string | undefined, onDone: () => void) {
  const { byId, all, groups } = useApps();
  const app = byId(appId);
  const isCode = app?.kind === 'code';
  const store = useLauncherStore();
  const askConfirm = useUiStore((s) => s.askConfirm);
  const { openPreview } = useAppNavigation();

  const [values, setValues] = useState<AppFormValues>({
    name: app?.name ?? '',
    url: app?.kind === 'link' ? app.url : '',
    color: app?.color ?? 'auto',
    group: app && app.group !== appConfig.defaultGroup ? app.group : '',
    hidden: app?.hidden ?? false,
  });
  const [errors, setErrors] = useState<AppFormErrors>({});

  const set = <K extends keyof AppFormValues>(key: K, value: AppFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const check = () => {
    const result = validateAppForm(values, !isCode);
    setErrors(result.errors);
    if (result.cleaned.url !== values.url) setValues((v) => ({ ...v, url: result.cleaned.url }));
    return result;
  };

  const index = app?.index ?? all.length + 1;

  const tryOpen = () => {
    const { valid, cleaned } = check();
    if (!valid) return;
    onDone();
    if (isCode && app) openPreview({ kind: 'code', appId: app.id, name: cleaned.name, color: cleaned.color, index });
    else openPreview({ kind: 'link', name: cleaned.name, url: cleaned.url, color: cleaned.color, index });
  };

  const submit = () => {
    const { valid, cleaned } = check();
    if (!valid) return;
    const meta = { name: cleaned.name, color: cleaned.color, group: cleaned.group, hidden: cleaned.hidden };
    if (app) {
      store.updateApp(app.id, isCode ? meta : { ...meta, url: cleaned.url });
      notify(t.form.saved);
    } else {
      store.addLink({ ...meta, url: cleaned.url });
      notify(t.form.added(cleaned.name));
    }
    onDone();
  };

  const remove = () => {
    if (!app) return;
    askConfirm({
      title: t.form.removeConfirm.title(app.name),
      text: t.form.removeConfirm.text,
      confirmLabel: t.form.removeConfirm.ok,
      danger: true,
      onConfirm: () => {
        store.removeLink(app.id);
        notify(t.form.removeConfirm.done(app.name));
      },
    });
  };

  const reset = () => {
    if (!app) return;
    askConfirm({
      title: t.form.resetConfirm.title,
      text: t.form.resetConfirm.text(app.name),
      confirmLabel: t.form.resetConfirm.ok,
      onConfirm: () => {
        store.resetOverride(app.id);
        notify(t.form.resetConfirm.done);
      },
    });
  };

  return { app, isCode, index, values, errors, groups, set, tryOpen, submit, remove, reset };
}
