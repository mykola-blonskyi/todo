import { describe, expect, it } from 'vitest';
import { BACKGROUND_COLOR, buildManifest, THEME_COLOR } from '@shared/lib/pwa';

describe('PWA manifest', () => {
  it('includes the fields required for installability', () => {
    const manifest = buildManifest();

    expect(manifest.name).toBeTruthy();
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons?.length).toBeGreaterThan(0);
  });

  it('includes a maskable icon variant', () => {
    const manifest = buildManifest();

    expect(manifest.icons?.some((icon) => icon.purpose === 'maskable')).toBe(
      true,
    );
  });

  it('uses the shadcn theme tokens for its colors', () => {
    const manifest = buildManifest();

    expect(manifest.theme_color).toBe(THEME_COLOR);
    expect(manifest.background_color).toBe(BACKGROUND_COLOR);
  });
});
