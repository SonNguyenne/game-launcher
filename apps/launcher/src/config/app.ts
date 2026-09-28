/** Mọi hằng số hành vi của launcher. Đổi ở đây, không sửa trong component. */
export const appConfig = {
  storageKey: 'bang-app-state-v1',
  storageVersion: 2,
  exportFormat: 'bang-app',
  recentsLimit: 8,
  defaultGroup: 'khác',
  defaultColumns: 2,
  columnOptions: [2, 3] as const,
  nameMaxLength: 40,
  groupMaxLength: 24,
  linkLoadTimeoutMs: 15_000,
  longPressMs: 480,
  longPressMoveTolerancePx: 10,
  toastMs: 2_200,
  clockTickMs: 15_000,
  pinLength: 4,
  pinSalt: 'bang-app:',
  linkIdPrefix: 'link-',
  iframeAllow: 'clipboard-read; clipboard-write; fullscreen; geolocation; camera; microphone',
} as const;

export type ColumnCount = (typeof appConfig.columnOptions)[number];
