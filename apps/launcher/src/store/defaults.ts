import { appConfig } from '@/config/app';
import type { PersistedState } from './types';

export const createInitialState = (): PersistedState => ({
  links: [],
  overrides: {},
  order: [],
  recents: [],
  appData: {},
  settings: { theme: 'system', look: 'soft', custom: {}, columns: appConfig.defaultColumns, pinHash: null },
});
