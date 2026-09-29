import { appConfig } from '@/config/app';
import { t } from '@/i18n/vi';
import { fileDateStamp } from '@/lib/date';
import { downloadText, pickTextFile } from '@/lib/files';
import { useLauncherStore } from '@/store/launcherStore';
import { looksLikeExport } from '@/store/migrate';
import { notify, useUiStore } from '@/store/uiStore';

/** Xuất dữ liệu ra file JSON. */
export function exportData() {
  const payload = {
    format: appConfig.exportFormat,
    version: appConfig.storageVersion,
    exportedAt: new Date().toISOString(),
    // Chỉ phần dữ liệu; các action (hàm) bị JSON.stringify bỏ qua.
    ...useLauncherStore.getState(),
  };
  downloadText(`${appConfig.exportFormat}-${fileDateStamp()}.json`, JSON.stringify(payload, null, 2));
  notify(t.settings.exported);
}

/** Nhập file JSON; đọc được cả file xuất từ bản HTML một file trước đây. */
export async function importData() {
  const text = await pickTextFile();
  if (!text) return;
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    raw = null;
  }
  if (!looksLikeExport(raw)) {
    notify(t.settings.importConfirm.invalid);
    return;
  }
  const count = (raw.links as unknown[]).length;
  useUiStore.getState().askConfirm({
    title: t.settings.importConfirm.title,
    text: t.settings.importConfirm.text(count),
    confirmLabel: t.settings.importConfirm.ok,
    onConfirm: () => {
      useLauncherStore.getState().replaceAll(raw);
      notify(t.settings.importConfirm.done);
    },
  });
}

export function wipeData() {
  const c = t.settings.wipeConfirm;
  useUiStore.getState().askConfirm({
    title: c.title,
    text: c.text,
    confirmLabel: c.ok,
    danger: true,
    onConfirm: () => {
      useLauncherStore.getState().wipe();
      notify(c.done);
    },
  });
}
