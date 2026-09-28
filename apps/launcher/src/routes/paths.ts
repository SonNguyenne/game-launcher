import type { KeyColorId } from '@bang/ui';

export const paths = {
  home: '/',
  settings: '/settings',
  manage: '/manage',
  app: (id: string) => `/app/${encodeURIComponent(id)}`,
  appPattern: 'app/:appId',
  previewId: '__preview',
} as const;

/** Vị trí phím được bấm, để khung app mở ra từ đúng chỗ đó. */
export interface OriginRect {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

/** Bản nháp từ form "thử mở"; chỉ chứa dữ liệu thuần vì phải lưu vào history. */
export type PreviewDraft =
  | { kind: 'link'; name: string; url: string; color: KeyColorId; index: number }
  | { kind: 'code'; appId: string; name: string; color: KeyColorId; index: number };

export interface RunnerLocationState {
  origin?: OriginRect;
  preview?: PreviewDraft;
}
