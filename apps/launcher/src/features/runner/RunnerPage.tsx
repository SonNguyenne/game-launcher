import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Button, Icon, Menu, Sheet, cx, durationMs, pad2, type MenuItem } from '@bang/ui';
import { t } from '@/i18n/vi';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { useLockPageScroll } from '@/hooks/useLockPageScroll';
import { useUiStore } from '@/store/uiStore';
import { useNavigate } from 'react-router-dom';
import { paths, type OriginRect } from '@/routes/paths';
import { CodeAppHost } from './CodeAppHost';
import { LinkAppHost } from './LinkAppHost';
import { StatusPanel } from './StatusPanel';
import { useRunnerApp } from './useRunnerApp';
import s from './Runner.module.css';

const originStyle = (o?: OriginRect): CSSProperties =>
  o ? ({ '--o-top': `${o.top}px`, '--o-left': `${o.left}px`, '--o-right': `${o.right}px`, '--o-bottom': `${o.bottom}px` } as CSSProperties) : {};

export function RunnerPage() {
  const { target, origin } = useRunnerApp();
  const { goBack } = useAppNavigation();
  const navigate = useNavigate();
  const openSheet = useUiStore((st) => st.openSheet);
  useLockPageScroll();

  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(false);
  // Trang trong iframe tự chuyển trang (vd. sang trang đăng nhập) sẽ thêm mục vào lịch sử của cả tab.
  const historyAtOpen = useRef(window.history.length);

  // Hai khung hình để trình duyệt kịp vẽ trạng thái đóng trước khi chạy hiệu ứng mở.
  useEffect(() => {
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setOpen(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, []);

  const close = useCallback(() => {
    setMenuOpen(false);
    setClosing(true);
    setOpen(false);
    setTimeout(() => {
      // Lùi qua luôn các mục iframe đã thêm, nếu không history.back() chỉ lùi trong iframe và app không đóng.
      const extra = window.history.length - historyAtOpen.current;
      const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
      const at = window.location.pathname;
      if (extra > 0 && idx > 0) window.history.go(-(extra + 1));
      else goBack();
      // Lịch sử còn sót mục iframe không đếm được (vd. trang đã tải lại khi đang mở app): lùi xong vẫn ở app thì về thẳng bảng.
      setTimeout(() => {
        if (window.location.pathname === at) navigate(paths.home, { replace: true });
      }, 200);
    }, durationMs.reveal);
  }, [goBack, navigate]);

  const reload = () => {
    setMenuOpen(false);
    setReloadKey((k) => k + 1);
  };

  const onLinkState = useCallback((st: 'loading' | 'ready' | 'error') => setLoading(st === 'loading'), []);

  const app = target?.app;
  const menuItems: MenuItem[] = [{ id: 'reload', label: t.runner.reload, onSelect: reload }];
  if (app?.kind === 'link') menuItems.push({ id: 'tab', label: t.runner.openTab, onSelect: () => window.open(app.url, '_blank', 'noopener') });
  if (app && !target?.isPreview) menuItems.push({ id: 'edit', label: t.runner.edit, onSelect: () => { setMenuOpen(false); openSheet({ kind: 'app-form', appId: app.id }); } });
  menuItems.push({ id: 'home', label: t.runner.home, onSelect: close });

  return (
    <div className={cx(s.runner, open && s.open)} style={originStyle(origin)} role="dialog" aria-modal="true" aria-label={app?.name}>
      <div className={s.bar}>
        <button className={s.barButton} onClick={close} aria-label={t.common.back}><Icon name="back" size={20} /></button>
        <h1 className={s.title}>
          {app && <span className={s.titleIndex}>{pad2(app.index)}</span>}
          {app?.name}
        </h1>
        <button className={s.barButton} onClick={() => setMenuOpen(true)} aria-label={t.runner.menu}><Icon name="more" size={20} /></button>
        <button className={s.barButton} onClick={close} aria-label={t.runner.closeApp}><Icon name="close" size={20} /></button>
        {loading && <div className={s.progress} />}
      </div>

      <div className={s.body}>
        {!app && (
          <StatusPanel art="no-match" code={t.runner.errorCode} text={t.runner.notFound} actions={<Button onClick={close}>{t.runner.home}</Button>} />
        )}
        {app?.kind === 'code' && <CodeAppHost key={reloadKey} app={app} onClose={close} />}
        {/* Gỡ iframe trước khi thu nhỏ: Chrome để sót hình của iframe khác domain khi nó nằm trong clip-path đang chạy hiệu ứng. */}
        {app?.kind === 'link' && !closing && (
          <LinkAppHost name={app.name} url={app.url} index={app.index} reloadKey={reloadKey} onStateChange={onLinkState} onRetry={reload} onClose={close} />
        )}
      </div>

      <Sheet open={menuOpen} flush title={app?.name ?? ''} closeLabel={t.common.close} onClose={() => setMenuOpen(false)}>
        <Menu items={menuItems} />
      </Sheet>
    </div>
  );
}
