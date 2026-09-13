import type { Viewport } from 'next';
import {
  DEFAULT_LAYOUT,
  DEFAULT_PALETTE,
  type Appearance,
  type Layout,
  type Palette,
} from './types';

export type Scheme = 'light' | 'dark';
export type ChromeToken = 'background' | 'card' | 'primary';

// Mirrors the top-of-viewport background in each src/layouts/<id>/Shell.tsx;
// nothing in the type system enforces that the two stay in sync.
export const CHROME_TOKEN: Record<Layout, ChromeToken> = {
  workspace: 'background',
  board: 'card',
  notebook: 'background',
  pocket: 'background',
  terminal: 'primary',
  ledger: 'card',
};

// Mirrors the HSL custom properties in app/globals.css. tests/chrome-color.test.ts
// re-derives this table from that file, so the two must move together.
export const CHROME_COLORS: Record<
  Palette,
  Record<Scheme, Record<ChromeToken, string>>
> = {
  classic: {
    light: { background: '#ffffff', card: '#ffffff', primary: '#0f172a' },
    dark: { background: '#020817', card: '#020817', primary: '#f8fafc' },
  },
  rose: {
    light: { background: '#fff0f2', card: '#ffebec', primary: '#e21d48' },
    dark: { background: '#220612', card: '#2b0816', primary: '#e84a6c' },
  },
  indigo: {
    light: { background: '#f9fafb', card: '#ffffff', primary: '#3342cc' },
    dark: { background: '#101219', card: '#161922', primary: '#7480e7' },
  },
  ocean: {
    light: { background: '#f4f9fa', card: '#ffffff', primary: '#17818c' },
    dark: { background: '#0a151a', card: '#0f1d24', primary: '#42d2d7' },
  },
  forest: {
    light: { background: '#f7f9f6', card: '#ffffff', primary: '#276847' },
    dark: { background: '#0d1612', card: '#141f1a', primary: '#5ec98b' },
  },
  olive: {
    light: { background: '#f7f7f2', card: '#fdfdfc', primary: '#627231' },
    dark: { background: '#161711', card: '#1f2018', primary: '#abc76b' },
  },
  honey: {
    light: { background: '#fcf9f3', card: '#ffffff', primary: '#da870b' },
    dark: { background: '#17120c', card: '#201a13', primary: '#fab938' },
  },
  clay: {
    light: { background: '#f7f2ed', card: '#fcfaf8', primary: '#bd5028' },
    dark: { background: '#191310', card: '#221a16', primary: '#e78155' },
  },
  coral: {
    light: { background: '#fdf8f7', card: '#ffffff', primary: '#ef4b39' },
    dark: { background: '#160d0f', card: '#1f1416', primary: '#f66f5a' },
  },
  violet: {
    light: { background: '#f9f8fc', card: '#ffffff', primary: '#762fda' },
    dark: { background: '#100c17', card: '#181320', primary: '#b47ef1' },
  },
  graphite: {
    light: { background: '#ffffff', card: '#ffffff', primary: '#171717' },
    dark: { background: '#0d0d0d', card: '#141414', primary: '#f2f2f2' },
  },
  paper: {
    light: { background: '#f3efe7', card: '#fbf9f4', primary: '#64422b' },
    dark: { background: '#1a1714', card: '#231f1a', primary: '#d8c097' },
  },
};

export function chromeColor(
  appearance: Pick<Appearance, 'layout' | 'palette'>,
  scheme: Scheme,
): string {
  const token = CHROME_TOKEN[appearance.layout];
  return CHROME_COLORS[appearance.palette][scheme][token];
}

export function viewportThemeColor(
  appearance: Pick<Appearance, 'layout' | 'palette' | 'mode'>,
): NonNullable<Viewport['themeColor']> {
  if (appearance.mode !== 'system') {
    return chromeColor(appearance, appearance.mode);
  }

  return [
    {
      media: '(prefers-color-scheme: light)',
      color: chromeColor(appearance, 'light'),
    },
    {
      media: '(prefers-color-scheme: dark)',
      color: chromeColor(appearance, 'dark'),
    },
  ];
}

export const DEFAULT_CHROME_COLOR = chromeColor(
  { layout: DEFAULT_LAYOUT, palette: DEFAULT_PALETTE },
  'light',
);
