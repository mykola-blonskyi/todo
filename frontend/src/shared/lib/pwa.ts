import type { MetadataRoute } from 'next';

export const APP_NAME = 'Todolist';
export const BACKGROUND_COLOR = '#ffffff';

export function buildManifest(themeColor: string): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    start_url: '/',
    display: 'standalone',
    theme_color: themeColor,
    background_color: BACKGROUND_COLOR,
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icons/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
