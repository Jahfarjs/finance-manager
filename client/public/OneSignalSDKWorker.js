// Single service worker that handles both OneSignal push AND PWA caching.
// Must be at the root path — iOS Safari requires the push service worker
// to be at scope "/" and named exactly "OneSignalSDKWorker.js".
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

// ── PWA caching ───────────────────────────────────────────────────────────
const CACHE_NAME = "fintrack-v3";
const PRECACHE = ["/", "/manifest.json", "/logo.png", "/favicon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((c) => c.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (request.url.includes("/api/")) return;
  if (request.url.includes("onesignal.com")) return;

  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
        }
        return res;
      })
      .catch(() =>
        caches.match(request).then(
          (cached) =>
            cached ??
            (request.mode === "navigate"
              ? caches.match("/")
              : new Response("Offline", { status: 503 }))
        )
      )
  );
});
