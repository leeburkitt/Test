const CACHE_NAME = "fitness-tracker-v1";
const STATIC_CACHE_PATTERNS = [/^\/_next\/static\//, /^\/icons\//, /^\/favicon\.ico$/];

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
      await self.clients.claim();
    })()
  );
});

function isStaticAsset(pathname) {
  return STATIC_CACHE_PATTERNS.some((pattern) => pattern.test(pathname));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isStaticAsset(url.pathname)) {
    // Cache-first: static build assets are content-hashed, safe to serve from cache indefinitely.
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })()
    );
    return;
  }

  if (request.mode === "navigate") {
    // Network-first: always prefer fresh server-rendered content; fall back to
    // the last cached copy of that page when offline.
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        try {
          const response = await fetch(request);
          if (response.ok) cache.put(request, response.clone());
          return response;
        } catch {
          const cached = await cache.match(request);
          return cached ?? Response.error();
        }
      })()
    );
  }
});
