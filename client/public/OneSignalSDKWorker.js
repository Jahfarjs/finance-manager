// ─── OneSignal Web Push ───────────────────────────────────────────────────
// importScripts MUST be first — registers push/notificationclick handlers
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

// ─── PWA Caching ─────────────────────────────────────────────────────────
const CACHE_NAME = "fintrack-v2";
const STATIC_ASSETS = ["/", "/manifest.json", "/logo.png", "/favicon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  // Force immediate activation — don't wait for old worker to release clients
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only cache GET requests
  if (request.method !== "GET") return;
  // Always go to network for API calls
  if (request.url.includes("/api/")) return;
  // Don't cache OneSignal CDN resources
  if (request.url.includes("onesignal.com")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached;
          // For navigation requests, serve the cached SPA shell
          if (request.mode === "navigate") return caches.match("/");
          return new Response("Offline", { status: 503 });
        })
      )
  );
});
