export const randomId = (prefix = '') => prefix + Math.random().toString(36).slice(2, 9);
