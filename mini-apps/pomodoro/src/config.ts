export const modes = {
  focus: { minutes: 25 },
  rest: { minutes: 5 },
} as const;

export type Mode = keyof typeof modes;

export const config = {
  tickMs: 500,
} as const;
