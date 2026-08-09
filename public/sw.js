// Minimal service worker. This exists to satisfy PWA "installability"
// requirements (a registered service worker with a fetch handler) without
// caching any portal data. Project status, messages, and files should
// always be fetched fresh — this app intentionally does not work offline.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // No-op: always let the request go to the network as normal.
});
