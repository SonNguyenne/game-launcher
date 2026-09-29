import type { MiniAppComponent, MiniAppManifest } from '@bang/sdk';
import { isKeyColorId } from '@bang/ui';
import { appConfig } from '@/config/app';
import type { AppMeta } from '@/store/types';

export interface CodeAppDefinition {
  id: string;
  defaults: AppMeta;
  description?: string;
  /** Mã SVG từ mini-apps/<id>/icon.svg, nếu app có hình vẽ. */
  art?: string;
  load: () => Promise<{ default: MiniAppComponent }>;
}

/**
 * Tự tìm mọi mini app: mỗi thư mục trong mini-apps/ có manifest.json và src/index.tsx.
 * Thêm app mới không cần sửa file này. Code của app chỉ tải khi người dùng mở; icon.svg (nếu có) đóng gói sẵn vì nhỏ.
 */
const manifests = import.meta.glob<MiniAppManifest>('@mini-apps/*/manifest.json', { eager: true, import: 'default' });
const entries = import.meta.glob<{ default: MiniAppComponent }>('@mini-apps/*/src/index.tsx');
const arts = import.meta.glob<string>('@mini-apps/*/icon.svg', { eager: true, query: '?raw', import: 'default' });

/** Lấy tên thư mục app từ đường dẫn file: ".../mini-apps/pomodoro/src/index.tsx" -> "pomodoro". */
const folderOf = (path: string) => /mini-apps\/([^/]+)\//.exec(path)?.[1] ?? path;

const entryByFolder = new Map(Object.entries(entries).map(([path, load]) => [folderOf(path), load]));
const artByFolder = new Map(Object.entries(arts).map(([path, svg]) => [folderOf(path), svg]));

export const codeAppDefinitions: CodeAppDefinition[] = Object.entries(manifests)
  .map(([path, m]): CodeAppDefinition | null => {
    const folder = folderOf(path);
    const load = entryByFolder.get(folder);
    if (!load) {
      console.warn(`[registry] mini-apps/${folder} thiếu src/index.tsx, bỏ qua.`);
      return null;
    }
    if (m.id !== folder) console.warn(`[registry] mini-apps/${folder}: id trong manifest (${m.id}) nên trùng tên thư mục.`);
    return {
      id: folder,
      description: m.description,
      art: artByFolder.get(folder),
      load,
      defaults: {
        name: m.name || folder,
        group: m.group || appConfig.defaultGroup,
        color: isKeyColorId(m.color) ? m.color : 'auto',
        hidden: false,
      },
    };
  })
  .filter((d): d is CodeAppDefinition => d !== null)
  .sort((a, b) => a.id.localeCompare(b.id));
