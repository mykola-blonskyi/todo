import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LAYOUT,
  DEFAULT_PALETTE,
  UNKNOWN_MODE,
  layouts,
  palettes,
  type Palette,
} from '@/features/preferences/types';
import {
  CHROME_COLORS,
  CHROME_TOKEN,
  chromeColor,
  viewportThemeColor,
  type ChromeToken,
  type Scheme,
} from '@/features/preferences/chrome';

const css = readFileSync(
  path.join(__dirname, '../src/app/globals.css'),
  'utf8',
);

function cssBlock(selector: string): string {
  const escaped = selector.replace(/[.[\]]/g, '\\$&');
  const match = css.match(
    new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`),
  );
  if (!match) {
    throw new Error(`no CSS block for selector "${selector}"`);
  }
  return match[1];
}

function hslToHex(h: number, s: number, l: number): string {
  const sf = s / 100;
  const lf = l / 100;
  const c = (1 - Math.abs(2 * lf - 1)) * sf;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lf - c / 2;
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  const channel = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

function tokenHex(block: string, token: ChromeToken): string | null {
  const match = block.match(
    new RegExp(`--${token}:\\s*([\\d.]+)\\s+([\\d.]+)%\\s+([\\d.]+)%`),
  );
  return match
    ? hslToHex(Number(match[1]), Number(match[2]), Number(match[3]))
    : null;
}

const rootBlock = cssBlock(':root');
const darkRootBlock = cssBlock('.dark');

function paletteBlock(palette: Palette, scheme: Scheme): string {
  if (palette === 'classic') {
    return scheme === 'light' ? rootBlock : darkRootBlock;
  }
  return scheme === 'light'
    ? cssBlock(`.theme-${palette}`)
    : cssBlock(`.dark.theme-${palette}`);
}

function derivedColor(
  palette: Palette,
  scheme: Scheme,
  token: ChromeToken,
): string {
  const fallback = scheme === 'light' ? rootBlock : darkRootBlock;
  return (
    tokenHex(paletteBlock(palette, scheme), token) ?? tokenHex(fallback, token)!
  );
}

describe('chrome colors', () => {
  it('match the HSL custom properties in globals.css for every palette and scheme', () => {
    const derived = Object.fromEntries(
      palettes.map((palette) => [
        palette,
        {
          light: {
            background: derivedColor(palette, 'light', 'background'),
            card: derivedColor(palette, 'light', 'card'),
            primary: derivedColor(palette, 'light', 'primary'),
          },
          dark: {
            background: derivedColor(palette, 'dark', 'background'),
            card: derivedColor(palette, 'dark', 'card'),
            primary: derivedColor(palette, 'dark', 'primary'),
          },
        },
      ]),
    );

    expect(derived).toEqual(CHROME_COLORS);
  });

  it('keeps the id lists in sync with preferences/types', () => {
    expect(Object.keys(CHROME_COLORS)).toEqual([...palettes]);
    expect(Object.keys(CHROME_TOKEN)).toEqual([...layouts]);
  });

  it('picks the token each layout puts at the top of the viewport', () => {
    expect(chromeColor({ layout: 'terminal', palette: 'paper' }, 'light')).toBe(
      '#64422b',
    );
    expect(chromeColor({ layout: 'board', palette: 'classic' }, 'light')).toBe(
      '#ffffff',
    );
    expect(chromeColor({ layout: 'notebook', palette: 'ocean' }, 'light')).toBe(
      '#f4f9fa',
    );
  });

  it('resolves light and dark mode to a single color', () => {
    const appearance = {
      layout: 'workspace' as const,
      palette: 'classic' as const,
    };
    expect(viewportThemeColor({ ...appearance, mode: 'light' })).toBe(
      '#ffffff',
    );
    expect(viewportThemeColor({ ...appearance, mode: 'dark' })).toBe('#020817');
  });

  it('resolves system mode to both media queries, light first', () => {
    expect(
      viewportThemeColor({
        layout: 'workspace',
        palette: 'classic',
        mode: 'system',
      }),
    ).toEqual([
      { media: '(prefers-color-scheme: light)', color: '#ffffff' },
      { media: '(prefers-color-scheme: dark)', color: '#020817' },
    ]);
  });

  it('covers the appearance a cookie-less visit resolves to', () => {
    expect(
      viewportThemeColor({
        mode: UNKNOWN_MODE,
        palette: DEFAULT_PALETTE,
        layout: DEFAULT_LAYOUT,
      }),
    ).toEqual([
      { media: '(prefers-color-scheme: light)', color: '#ffffff' },
      { media: '(prefers-color-scheme: dark)', color: '#020817' },
    ]);
  });
});
