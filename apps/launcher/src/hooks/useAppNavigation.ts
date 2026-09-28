import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLauncherStore } from '@/store/launcherStore';
import { paths } from '@/routes/paths';
import type { OriginRect, RunnerLocationState, PreviewDraft } from '@/routes/paths';

const rectOf = (el?: HTMLElement | null): OriginRect | undefined => {
  if (!el) return undefined;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, right: window.innerWidth - r.right, bottom: window.innerHeight - r.bottom };
};

/** Mọi điều hướng của launcher đi qua đây để giữ một luồng thống nhất. */
export function useAppNavigation() {
  const navigate = useNavigate();
  const markOpened = useLauncherStore((s) => s.markOpened);

  const openApp = useCallback(
    (appId: string, originEl?: HTMLElement | null) => {
      markOpened(appId);
      const state: RunnerLocationState = { origin: rectOf(originEl) };
      navigate(paths.app(appId), { state });
    },
    [navigate, markOpened],
  );

  const openPreview = useCallback(
    (draft: PreviewDraft) => {
      const state: RunnerLocationState = { preview: draft };
      navigate(paths.app(paths.previewId), { state });
    },
    [navigate],
  );

  const goBack = useCallback(() => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(paths.home, { replace: true });
  }, [navigate]);

  return {
    openApp,
    openPreview,
    goBack,
    openSettings: useCallback(() => navigate(paths.settings), [navigate]),
    openManage: useCallback(() => navigate(paths.manage), [navigate]),
  };
}
