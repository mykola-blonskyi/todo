export const themes = ['light', 'dark', 'theme-rose'] as const;
export type Theme = (typeof themes)[number];
