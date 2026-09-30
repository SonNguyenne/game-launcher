export interface PenguinSkin {
  color: string; // Màu xe ủi (Đỏ, Xanh dương, Cam, Vàng, Tím, v.v.)
  hat: 'none' | 'beanie' | 'crown' | 'viking' | 'party';
  name: string;
}

export const VEHICLE_COLORS = [
  '#ef4444', // Đỏ Snow
  '#3b82f6', // Xanh Ice
  '#f59e0b', // Vàng Bão tuyết
  '#10b981', // Xanh Rừng tuyết
  '#8b5cf6', // Tím Cực quang
  '#ec4899', // Hồng Băng
] as const;

export const HATS = [
  { id: 'none', label: 'Mộc' },
  { id: 'beanie', label: 'Mũ len đỏ' },
  { id: 'crown', label: 'Vương miện' },
  { id: 'viking', label: 'Mũ chiến binh' },
  { id: 'party', label: 'Nón sinh nhật' },
] as const;

export const DEFAULT_SKIN: PenguinSkin = {
  color: '#ef4444',
  hat: 'beanie',
  name: 'Cánh Cụt',
};
