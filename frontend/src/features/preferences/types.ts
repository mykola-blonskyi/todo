// Three independent appearance axes (see the layouts ADR in docs/decisions.md):
//
//   mode    - light / dark / system. Owned by next-themes on the client
//             (localStorage + the `dark` class on <html>), mirrored to the
//             backend's `updateTheme` as before.
//   palette - which `.theme-*` CSS-variable set colours the page. Every
//             palette ships a light AND a dark block, so it composes with any
//             mode. Stored in a cookie (the server needs it to render <html>
//             with the right class - no flash) and on the User row.
//   layout  - which app shell / page composition renders (src/layouts/*).
//             Also cookie + User row, since the shell is server-rendered.
//
// The enum ids match the backend's UserTheme / UserPalette / UserLayout
// exactly, so they round-trip through GraphQL unchanged.

export const modes = ['light', 'dark', 'system'] as const;
export type Mode = (typeof modes)[number];

export const palettes = [
  'classic',
  'rose',
  'indigo',
  'ocean',
  'forest',
  'olive',
  'honey',
  'clay',
  'coral',
  'violet',
  'graphite',
  'paper',
] as const;
export type Palette = (typeof palettes)[number];

export const layouts = [
  'workspace',
  'board',
  'notebook',
  'pocket',
  'terminal',
  'ledger',
] as const;
export type Layout = (typeof layouts)[number];

export const DEFAULT_MODE: Mode = 'light';
export const DEFAULT_PALETTE: Palette = 'classic';
export const DEFAULT_LAYOUT: Layout = 'workspace';

export const MODE_COOKIE = 'todolist-mode';
export const PALETTE_COOKIE = 'todolist-palette';
export const LAYOUT_COOKIE = 'todolist-layout';
// One year - these are durable preferences, not session state.
export const PREFERENCE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export interface Appearance {
  // next-themes still owns applying the mode on the client; this is the
  // value the server hands it as `defaultTheme`, so a device with nothing in
  // localStorage yet starts from the User's real choice (TODO-61).
  mode: Mode;
  palette: Palette;
  layout: Layout;
}

export function isMode(value: unknown): value is Mode {
  return (
    typeof value === 'string' && (modes as readonly string[]).includes(value)
  );
}

export function isPalette(value: unknown): value is Palette {
  return (
    typeof value === 'string' && (palettes as readonly string[]).includes(value)
  );
}

export function isLayout(value: unknown): value is Layout {
  return (
    typeof value === 'string' && (layouts as readonly string[]).includes(value)
  );
}

// Lenient parsers for cookie / backend values: anything unknown (an old
// value, a typo, a value from a future version) falls back to the default
// instead of throwing during render.
export function parseMode(value: unknown): Mode {
  return isMode(value) ? value : DEFAULT_MODE;
}

export function parsePalette(value: unknown): Palette {
  return isPalette(value) ? value : DEFAULT_PALETTE;
}

export function parseLayout(value: unknown): Layout {
  return isLayout(value) ? value : DEFAULT_LAYOUT;
}

// `classic` is the un-classed shadcn default, everything else is a
// `.theme-<id>` block in globals.css (same convention theme-rose already used).
export function paletteClassName(palette: Palette): string {
  return palette === 'classic' ? '' : `theme-${palette}`;
}

// Kept as an alias so older call sites/tests that spoke of "theme" (the
// light/dark/rose single select) keep compiling while they migrate to Mode.
export type Theme = Mode;
export const themes = modes;
