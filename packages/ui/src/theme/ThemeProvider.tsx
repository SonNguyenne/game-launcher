import { useEffect, useRef, type ReactNode } from 'react';
import { buildTokenCss, customStyleVars, type StyleCustom, type UiLook } from '../tokens';

export type ThemeMode = 'light' | 'dark' | 'system';

const STYLE_ID = 'bang-ui-tokens';

function ensureHead() {
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = buildTokenCss();
    document.head.prepend(style);
  }
}

function syncThemeColor() {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  if (meta && bg) meta.content = bg;
}

interface ThemeProviderProps {
  mode: ThemeMode;
  look?: UiLook;
  /** Phần người dùng tự chỉnh, chồng lên mặc định của kiểu hiển thị. */
  custom?: Partial<StyleCustom>;
  children: ReactNode;
}

/** Nạp token CSS một lần và gắn chế độ sáng/tối cùng kiểu hiển thị lên <html>. */
export function ThemeProvider({ mode, look = 'board', custom, children }: ThemeProviderProps) {
  useEffect(ensureHead, []);
  const applied = useRef<string[]>([]);

  useEffect(() => {
    const root = document.documentElement;
    if (mode === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', mode);
    if (look === 'board') root.removeAttribute('data-look');
    else root.setAttribute('data-look', look);

    // Biến inline thắng biến sinh từ token; gỡ biến cũ trước để không sót giá trị đã bỏ chọn.
    for (const name of applied.current) root.style.removeProperty(name);
    const vars = customStyleVars(look, custom);
    for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value);
    applied.current = Object.keys(vars);
    syncThemeColor();

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', syncThemeColor);
    return () => mq.removeEventListener('change', syncThemeColor);
  }, [mode, look, custom]);

  return <>{children}</>;
}
