/* eslint-disable no-restricted-globals */
/**
 * Proper CRM service worker.
 *
 * Deliberately small. It keeps the app shell and today's job data available
 * with no signal; the outbound queue (completions, notes, photos) lives in
 * IndexedDB and is drained by the page, because uploads need the user's auth
 * session. A Background Sync registration nudges the page to drain when the
 * signal returns.
 */
const VERSION = 'proper-crm-v1';
const SHELL_CACHE = `${VERSION}-shell`;
const DATA_CACHE = `${VERSION}-data`;

const SHELL_ASSETS = [
  '/offline.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.webmanifest'
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // App shell navigations: try the network, fall back to the offline card.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(DATA_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => (await caches.match(request)) ?? caches.match('/offline.html')),
    );
    return;
  }

  // Build output is content-hashed, so cache-first is safe and instant.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
  }
});

/** The page owns the outbound queue; this only wakes it up. */
async function askClientsToSync() {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clients.forEach((client) => client.postMessage({ type: 'proper-crm:drain-queue' }));
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'proper-crm-sync') {
    event.waitUntil(askClientsToSync());
  }
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'proper-crm:skip-waiting') self.skipWaiting();

  // Sign-out: drop every cached page. The shell assets are public and stay.
  if (event.data?.type === 'proper-crm:clear-data') {
    event.waitUntil(caches.delete(DATA_CACHE));
  }
});
