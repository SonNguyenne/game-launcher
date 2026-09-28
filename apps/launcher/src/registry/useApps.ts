import { useMemo } from 'react';
import { appConfig } from '@/config/app';
import { useLauncherStore } from '@/store/launcherStore';
import type { PersistedState } from '@/store/types';
import { codeAppDefinitions } from './discover';
import type { LauncherApp } from './types';

/** Hàm thuần: gộp app code + app link + ghi đè + thứ tự thành một danh sách. */
export function buildAppList(s: Pick<PersistedState, 'links' | 'overrides' | 'order'>): LauncherApp[] {
  const code: LauncherApp[] = codeAppDefinitions.map((d) => ({
    kind: 'code',
    id: d.id,
    description: d.description,
    load: d.load,
    index: 0,
    ...d.defaults,
    ...s.overrides[d.id],
  }));
  const links: LauncherApp[] = s.links.map((l) => ({
    kind: 'link',
    index: 0,
    ...l,
    group: l.group || appConfig.defaultGroup,
  }));

  const rank = new Map(s.order.map((id, i) => [id, i]));
  const all = [...code, ...links]
    .map((app, natural) => ({ app, natural }))
    .sort((a, b) => (rank.get(a.app.id) ?? Infinity) - (rank.get(b.app.id) ?? Infinity) || a.natural - b.natural)
    .map(({ app }, i) => ({ ...app, index: i + 1 }));
  return all;
}

export function useApps() {
  const links = useLauncherStore((s) => s.links);
  const overrides = useLauncherStore((s) => s.overrides);
  const order = useLauncherStore((s) => s.order);

  return useMemo(() => {
    const all = buildAppList({ links, overrides, order });
    return {
      all,
      visible: all.filter((a) => !a.hidden),
      byId: (id: string | undefined) => all.find((a) => a.id === id),
      groups: [...new Set(all.map((a) => a.group).filter(Boolean))],
    };
  }, [links, overrides, order]);
}

/** Gom app theo nhóm, giữ thứ tự xuất hiện đầu tiên của nhóm. */
export function groupApps(apps: LauncherApp[]) {
  const map = new Map<string, LauncherApp[]>();
  for (const a of apps) {
    const list = map.get(a.group) ?? [];
    list.push(a);
    map.set(a.group, list);
  }
  return [...map.entries()].map(([group, items]) => ({ group, items }));
}
