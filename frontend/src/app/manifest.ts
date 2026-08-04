import type { MetadataRoute } from 'next';
import { buildManifest } from '@shared/lib/pwa';

export default function manifest(): MetadataRoute.Manifest {
  return buildManifest();
}
