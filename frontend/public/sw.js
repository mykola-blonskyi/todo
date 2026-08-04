// Minimal service worker - no caching/offline logic on purpose (see
// docs/decisions.md and issue #48). Only registered to satisfy installability
// criteria on platforms that still check for one.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // No-op: falls through to the browser's default network handling.
});
