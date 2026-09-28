import { darkColors, lightColors, type ColorRoles } from './colors';
import { fontFamily, fontSize, fontWeight, letterSpacing, lineHeight } from './typography';
import { shape, space, size, zIndex } from './spacing';
import { duration, easing } from './motion';
import { lookTokens } from './looks';

const kebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

const toVars = (prefix: string, obj: Record<string | number, string>) =>
  Object.entries(obj)
    .map(([k, v]) => `--${prefix}${prefix ? '-' : ''}${kebab(String(k))}:${v};`)
    .join('');

const colorVars = (c: ColorRoles) => toVars('', c as unknown as Record<string, string>);

/**
 * Sinh toàn bộ biến CSS từ token.
 * Chế độ tối áp dụng khi: người dùng chọn "tối", hoặc chọn "theo máy" và hệ thống đang tối.
 * Kiểu hiển thị khác "board" gắn data-look lên <html>, ghi đè cỡ chữ, kích thước, hình khối và màu.
 */
export function buildTokenCss(): string {
  const shared =
    toVars('font', fontFamily) +
    toVars('fs', fontSize) +
    toVars('fw', fontWeight) +
    toVars('lh', lineHeight) +
    toVars('ls', letterSpacing) +
    toVars('space', space) +
    toVars('size', size) +
    toVars('z', zIndex) +
    toVars('', shape) +
    toVars('dur', duration) +
    toVars('ease', easing);

  // Mỗi kiểu 3 khối: sáng, tối theo máy, tối do người dùng chọn. Độ ưu tiên selector cao hơn khối gốc.
  const looks = Object.entries(lookTokens).flatMap(([name, l]) => {
    const sel = `:root[data-look="${name}"]`;
    const vars =
      toVars('font', l.fontFamily) +
      toVars('fs', l.fontSize) +
      toVars('fw', l.fontWeight) +
      toVars('ls', l.letterSpacing) +
      toVars('size', l.size) +
      toVars('', l.shape);
    return [
      `${sel}{${vars}${colorVars(l.light)}}`,
      `@media (prefers-color-scheme: dark){${sel}:not([data-theme="light"]){${colorVars(l.dark)}}}`,
      `${sel}[data-theme="dark"]{${colorVars(l.dark)}}`,
    ];
  });

  return [
    `:root{${shared}${colorVars(lightColors)}color-scheme:light;}`,
    `@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${colorVars(darkColors)}color-scheme:dark;}}`,
    `:root[data-theme="dark"]{${colorVars(darkColors)}color-scheme:dark;}`,
    ...looks,
  ].join('\n');
}
