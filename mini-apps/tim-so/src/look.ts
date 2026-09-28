import { useCallback, useEffect, useState } from 'react';
import { palette } from '@bang/ui';

/**
 * Cách hiện các con số trên bàn. Mỗi máy tự chọn và lưu trên máy mình,
 * không gửi qua phòng: bàn số (vị trí, thứ tự) vẫn giống nhau ở mọi máy.
 */
export interface Look {
  color: 'multi' | 'ink' | 'blue';
  font: 'app' | 'hand' | 'mono' | 'serif';
  scale: 's' | 'm' | 'l';
  tilt: boolean;
}

const DEFAULT_LOOK: Look = { color: 'multi', font: 'hand', scale: 'm', tilt: true };
const KEY = 'bang-tim-so-look';

export const lookColor: Record<Exclude<Look['color'], 'multi'>, string> = { ink: 'var(--ink)', blue: palette.blue };
export const lookScale: Record<Look['scale'], number> = { s: 0.85, m: 1, l: 1.18 };
export const lookFont: Record<Look['font'], string> = {
  app: 'var(--font-ui)',
  hand: '"Patrick Hand", "Comic Sans MS", var(--font-ui)',
  mono: 'var(--font-mono)',
  serif: 'Georgia, "Times New Roman", serif',
};

const HAND_FONT_URL = 'https://fonts.googleapis.com/css2?family=Patrick+Hand&display=swap';

/** Font viết tay chỉ tải khi có máy chọn nó. */
function loadHandFont() {
  if (document.getElementById('tim-so-hand-font')) return;
  const link = document.createElement('link');
  link.id = 'tim-so-hand-font';
  link.rel = 'stylesheet';
  link.href = HAND_FONT_URL;
  document.head.appendChild(link);
}

function read(): Look {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Look>;
    return { ...DEFAULT_LOOK, ...saved };
  } catch {
    return DEFAULT_LOOK;
  }
}

export function useLook() {
  const [look, setLook] = useState(read);

  useEffect(() => {
    if (look.font === 'hand') loadHandFont();
  }, [look.font]);

  const update = useCallback((patch: Partial<Look>) => {
    setLook((l) => {
      const next = { ...l, ...patch };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // Không lưu được thì chỉ áp dụng lần này.
      }
      return next;
    });
  }, []);

  return [look, update] as const;
}
