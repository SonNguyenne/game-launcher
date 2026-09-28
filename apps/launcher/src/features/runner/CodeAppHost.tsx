import { lazy, Suspense, useMemo } from 'react';
import type { MiniAppContext } from '@bang/sdk';
import { Button, pad2 } from '@bang/ui';
import { t } from '@/i18n/vi';
import { useLauncherStore } from '@/store/launcherStore';
import { notify } from '@/store/uiStore';
import { ErrorBoundary } from '@/ui/ErrorBoundary';
import type { CodeApp } from '@/registry/types';
import { StatusPanel } from './StatusPanel';

interface CodeAppHostProps {
  app: CodeApp;
  onClose: () => void;
}

/** Tải code mini app khi cần và đưa cho nó một MiniAppContext. */
export function CodeAppHost({ app, onClose }: CodeAppHostProps) {
  const Component = useMemo(() => lazy(app.load), [app.load]);
  const setAppData = useLauncherStore((s) => s.setAppData);

  const ctx = useMemo<MiniAppContext>(
    () => ({
      appId: app.id,
      storage: {
        get: () => useLauncherStore.getState().appData[app.id],
        set: (value) => setAppData(app.id, value),
      },
      notify,
      close: onClose,
    }),
    [app.id, setAppData, onClose],
  );

  return (
    <ErrorBoundary
      fallback={(_, reset) => (
        <StatusPanel
          code={t.runner.errorCode}
          title={t.runner.errorTitle(app.name)}
          actions={
            <>
              <Button variant="primary" onClick={reset}>{t.runner.retry}</Button>
              <Button onClick={onClose}>{t.runner.home}</Button>
            </>
          }
        />
      )}
    >
      <Suspense fallback={<StatusPanel code={pad2(app.index)} text={t.runner.loading(app.name)} />}>
        <Component ctx={ctx} />
      </Suspense>
    </ErrorBoundary>
  );
}
