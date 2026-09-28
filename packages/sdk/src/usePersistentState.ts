import { useCallback, useState } from 'react';
import type { MiniAppContext } from './types';

/**
 * Giống useState nhưng tự lưu qua storage của launcher.
 * `fallback` là giá trị khi app mở lần đầu.
 */
export function usePersistentState<T>(ctx: MiniAppContext<T>, fallback: T) {
  const [value, setValue] = useState<T>(() => ctx.storage.get() ?? fallback);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        ctx.storage.set(resolved);
        return resolved;
      });
    },
    [ctx],
  );

  return [value, update] as const;
}
