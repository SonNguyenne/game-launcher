import { appConfig } from '@/config/app';
import type { PersistedState } from './types';

export const createInitialState = (): PersistedState => ({
  links: [],
  overrides: {},
  order: [],
  recents: [],
  appData: {},
  settings: { theme: 'system', look: 'pixel', custom: {}, columns: appConfig.defaultColumns },
});
