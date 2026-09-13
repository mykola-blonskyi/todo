import type { MetadataRoute } from 'next';
import { buildManifest } from '@shared/lib/pwa';
import { DEFAULT_CHROME_COLOR } from '@features/preferences/chrome';

export default function manifest(): MetadataRoute.Manifest {
  return buildManifest(DEFAULT_CHROME_COLOR);
}
