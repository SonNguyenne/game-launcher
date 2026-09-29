import { useEffect, useState } from 'react';
import { Button, cx, pad2 } from '@bang/ui';
import { appConfig } from '@/config/app';
import { t } from '@/i18n/vi';
import { useOnline } from '@/hooks/useOnline';
import { StatusPanel } from './StatusPanel';
import s from './Runner.module.css';

type LoadState = 'loading' | 'ready' | 'error';

interface LinkAppHostProps {
  name: string;
  url: string;
  index: number;
  reloadKey: number;
  onStateChange: (state: LoadState) => void;
  onRetry: () => void;
  onClose: () => void;
}

/** Nhúng web app qua iframe; báo lỗi nếu quá thời gian không tải xong. */
export function LinkAppHost({ name, url, index, reloadKey, onStateChange, onRetry, onClose }: LinkAppHostProps) {
  const [state, setState] = useState<LoadState>('loading');
  const online = useOnline();

  useEffect(() => {
    setState('loading');
    const timer = setTimeout(() => setState((s) => (s === 'loading' ? 'error' : s)), appConfig.linkLoadTimeoutMs);
    return () => clearTimeout(timer);
  }, [url, reloadKey]);

  useEffect(() => onStateChange(state), [state, onStateChange]);

  if (state === 'error') {
    return (
      <StatusPanel
        art={online ? 'error' : 'offline'}
        code={t.runner.errorCode}
        title={t.runner.errorTitle(name)}
        text={online ? t.runner.errorOnline : t.runner.errorOffline}
        actions={
          <>
            <Button variant="primary" onClick={onRetry}>{t.runner.retry}</Button>
            <Button onClick={() => window.open(url, '_blank', 'noopener')}>{t.runner.openTab}</Button>
            <Button onClick={onClose}>{t.runner.home}</Button>
          </>
        }
      />
    );
  }

  return (
    <>
      {state === 'loading' && <StatusPanel code={pad2(index)} text={t.runner.loading(name)} />}
      <iframe
        key={reloadKey}
        title={name}
        src={url}
        allow={appConfig.iframeAllow}
        className={cx(s.frame, state === 'loading' && s.frameHidden)}
        onLoad={() => setState('ready')}
      />
    </>
  );
}
