#!/usr/bin/env node
/**
 * Tạo mini app mới:  pnpm new-app <id> ["tên hiển thị"] ["nhóm"]
 * Ví dụ:            pnpm new-app chi-tieu "sổ chi tiêu" "tiện ích"
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [id, name = id, group = 'khác'] = process.argv.slice(2);

if (!id || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) {
  console.error('Cần id dạng chữ thường không dấu, nối bằng gạch ngang. Ví dụ: pnpm new-app chi-tieu "sổ chi tiêu"');
  process.exit(1);
}

const dir = join(root, 'mini-apps', id);
if (existsSync(dir)) {
  console.error(`mini-apps/${id} đã tồn tại.`);
  process.exit(1);
}

const component = id
  .split('-')
  .map((w) => w[0].toUpperCase() + w.slice(1))
  .join('');

const files = {
  'package.json': JSON.stringify(
    {
      name: `@bang/mini-${id}`,
      version: '1.0.0',
      private: true,
      type: 'module',
      main: 'src/index.tsx',
      dependencies: { '@bang/sdk': 'workspace:*', '@bang/ui': 'workspace:*' },
      peerDependencies: { react: '^19.0.0' },
      devDependencies: { '@types/react': '^19.0.0', react: '^19.0.0' },
    },
    null,
    2,
  ),
  'manifest.json': JSON.stringify({ id, name, group, color: 'auto', description: '', version: '1.0.0' }, null, 2),
  'src/config.ts': `export const config = {\n  // Hằng số của app đặt ở đây.\n} as const;\n`,
  'src/strings.ts': `export const strings = {\n  title: '${name}',\n  increase: 'thêm 1',\n  reset: 'đặt lại',\n} as const;\n`,
  [`src/${component}.module.css`]: `.face { padding: var(--space-18) var(--space-7); border-bottom: var(--size-rule) solid var(--rule); }
.value { font-size: var(--fs-hero); line-height: 1; letter-spacing: var(--ls-tighter); }
.actions { display: grid; grid-template-columns: 1fr 1fr; border-bottom: var(--size-rule) solid var(--rule); }
.actions > * + * { border-left: var(--size-rule) solid var(--rule); }
`,
  'src/index.tsx': `import { usePersistentState, type MiniAppProps } from '@bang/sdk';
import { Button, pad2 } from '@bang/ui';
import { strings } from './strings';
import s from './${component}.module.css';

interface Data {
  count: number;
}

/** Điểm vào của mini app. Launcher truyền ctx: storage, notify, close. */
export default function ${component}({ ctx }: MiniAppProps<Data>) {
  const [data, setData] = usePersistentState<Data>(ctx, { count: 0 });

  return (
    <div>
      <div className={s.face}>
        <div className={s.value}>{pad2(data.count)}</div>
      </div>
      <div className={s.actions}>
        <Button onClick={() => setData({ count: 0 })}>{strings.reset}</Button>
        <Button variant="primary" onClick={() => setData((d) => ({ count: d.count + 1 }))}>{strings.increase}</Button>
      </div>
    </div>
  );
}
`,
};

for (const [rel, content] of Object.entries(files)) {
  const path = join(dir, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content.endsWith('\n') ? content : content + '\n');
}

console.log(`Đã tạo mini-apps/${id}.
Tiếp theo:
  1. pnpm install        (liên kết thư viện cho app mới)
  2. pnpm dev            (app tự xuất hiện trên bảng, nhóm "${group}")
  3. Sửa mini-apps/${id}/src/index.tsx`);
