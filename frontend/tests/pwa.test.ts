import { describe, expect, it } from 'vitest';
import { BACKGROUND_COLOR, buildManifest } from '@shared/lib/pwa';
import { DEFAULT_CHROME_COLOR } from '@features/preferences/chrome';

describe('PWA manifest', () => {
  it('includes the fields required for installability', () => {
    const manifest = buildManifest(DEFAULT_CHROME_COLOR);

    expect(manifest.name).toBeTruthy();
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons?.length).toBeGreaterThan(0);
  });

  it('includes a maskable icon variant', () => {
    const manifest = buildManifest(DEFAULT_CHROME_COLOR);

    expect(manifest.icons?.some((icon) => icon.purpose === 'maskable')).toBe(
      true,
    );
  });

  it('uses the default chrome color and the shadcn background token', () => {
    const manifest = buildManifest(DEFAULT_CHROME_COLOR);

    expect(manifest.theme_color).toBe(DEFAULT_CHROME_COLOR);
    expect(manifest.background_color).toBe(BACKGROUND_COLOR);
  });
});
