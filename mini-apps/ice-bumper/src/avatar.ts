export type Hat = 'none' | 'beanie' | 'crown' | 'viking' | 'party';

export interface PenguinSkin {
  /** Màu khăn quàng và xe trượt. */
  color: string;
  hat: Hat;
}

/** Màu áo, lấy từ bảng màu arcade của app để nổi trên nền băng trắng và biển xanh. */
export const SKIN_COLORS = ['#FF4757', '#FFB000', '#05C46B', '#3867D6', '#8E5CF7', '#FF6FB5'] as const;

export const HATS: { id: Hat; label: string }[] = [
  { id: 'beanie', label: 'Mũ len' },
  { id: 'crown', label: 'Vương miện' },
  { id: 'viking', label: 'Mũ sừng' },
  { id: 'party', label: 'Nón tiệc' },
  { id: 'none', label: 'Đầu trần' },
];

/** Áo mặc định theo thứ tự trong phòng, để hai người chưa chọn không trùng màu. */
export const skinFor = (index: number): PenguinSkin => ({
  color: SKIN_COLORS[index % SKIN_COLORS.length],
  hat: HATS[index % (HATS.length - 1)].id,
});

const KEY = 'ice-bumper-skin';

/** Áo đã chọn lần trước trên máy này. */
export function savedSkin(): PenguinSkin | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as PenguinSkin | null;
    return v && typeof v.color === 'string' && typeof v.hat === 'string' ? v : null;
  } catch {
    return null;
  }
}

export function saveSkin(skin: PenguinSkin) {
  try {
    localStorage.setItem(KEY, JSON.stringify(skin));
  } catch {
    // Không lưu được thì thôi.
  }
}
