import { useLocation, useParams } from 'react-router-dom';
import { useApps } from '@/registry/useApps';
import { paths, type RunnerLocationState } from '@/routes/paths';
import type { LauncherApp } from '@/registry/types';

export interface RunnerTarget {
  app: LauncherApp;
  /** true khi mở từ nút "thử mở" của form: chưa lưu, không cho sửa. */
  isPreview: boolean;
}

/** Xác định app cần chạy từ URL, hoặc từ bản nháp khi xem trước. */
export function useRunnerApp(): { target: RunnerTarget | null; origin: RunnerLocationState['origin'] } {
  const { appId } = useParams();
  const { state } = useLocation() as { state: RunnerLocationState | null };
  const { byId } = useApps();

  const preview = appId === paths.previewId ? state?.preview : undefined;
  if (preview) {
    if (preview.kind === 'link') {
      const app: LauncherApp = { kind: 'link', id: paths.previewId, url: preview.url, name: preview.name, color: preview.color, index: preview.index, group: '', hidden: false };
      return { target: { app, isPreview: true }, origin: undefined };
    }
    const base = byId(preview.appId);
    if (base) return { target: { app: { ...base, name: preview.name, color: preview.color }, isPreview: true }, origin: undefined };
  }

  const app = byId(appId);
  return { target: app ? { app, isPreview: false } : null, origin: state?.origin };
}
