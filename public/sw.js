// Service worker for the Food Logger PWA: precaches the app shell, serves static
// assets cache-first (stale-while-revalidate), navigations network-first with an
// offline fallback, and never touches /api requests (user data is always live).

const CACHE = "food-logger-v1";
const OFFLINE_URL = "/offline";
const APP_SHELL = ["/", "/dashboard", "/login", "/signup", OFFLINE_URL];

self.addEventListener("install", event => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", event => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache the API — logs, auth, and usage must always hit the network.
  if (url.pathname.startsWith("/api/")) return;

  // Page navigations: try the network, fall back to cache, then the offline page.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then(cached => cached || caches.match(OFFLINE_URL)),
        ),
    );
    return;
  }

  // Static assets (Next chunks, icons, etc.): serve from cache, refresh in background.
  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request)
        .then(response => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
