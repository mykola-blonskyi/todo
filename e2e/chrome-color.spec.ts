import { test, expect, type Page } from '@playwright/test';
import { signIn } from './setup/session';
import {
  CHROME_COLORS,
  chromeColor,
} from '../frontend/src/features/preferences/chrome';
import {
  layouts,
  type Palette,
} from '../frontend/src/features/preferences/types';

const PALETTE: Palette = 'indigo';

function hexToTriple(hex: string): string {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) {
    throw new Error(`expected a 6-digit hex colour, got "${hex}"`);
  }
  return match
    .slice(1)
    .map((part) => Number.parseInt(part, 16))
    .join(',');
}

function topEdgeColors(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const colors = new Set<string>();

    for (const fraction of [0.05, 0.25, 0.5, 0.75, 0.95]) {
      let node = document.elementFromPoint(
        Math.round(window.innerWidth * fraction),
        1,
      );

      // Walk up rather than trust the topmost element: notebook's shell and
      // header carry no background at all, so the colour that reaches the
      // viewport edge is the one `body` paints.
      while (node) {
        const match = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/.exec(
          getComputedStyle(node).backgroundColor,
        );
        if (match && (match[4] === undefined || Number(match[4]) > 0)) {
          colors.add(`${match[1]},${match[2]},${match[3]}`);
        }
        node = node.parentElement;
      }
    }

    return [...colors];
  });
}

test('the pinned palette keeps the three chrome tokens distinct', () => {
  const { background, card, primary } = CHROME_COLORS[PALETTE].light;
  expect(
    new Set([background, card, primary]).size,
    `${PALETTE} paints two of the three chrome tokens the same colour, so a layout case below would pass whatever its Shell renders`,
  ).toBe(3);
});

for (const layout of layouts) {
  test(`${layout} paints its chrome color at the top of the viewport`, async ({
    context,
    page,
  }) => {
    await signIn(context, { mode: 'light', palette: PALETTE, layout });
    await page.goto('/en');

    await expect(page.locator('html')).toHaveAttribute('data-layout', layout);

    const themeColor = page.locator('meta[name="theme-color"]');
    await expect(themeColor).toHaveCount(1);
    const expected = chromeColor({ layout, palette: PALETTE }, 'light');
    await expect(themeColor).toHaveAttribute('content', expected);

    expect(
      await topEdgeColors(page),
      `${layout} renders no ${expected} at the top edge, so CHROME_TOKEN.${layout} no longer matches its Shell`,
    ).toContain(hexToTriple(expected));
  });
}
