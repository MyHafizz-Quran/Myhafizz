// ─── MyHafizz Service Worker ─────────────────────────────────────────────
// Strategies:
//   • App shell assets (JS/CSS/HTML)    → Network First (8s timeout), Cache Fallback
//   • Quran API (alquran.cloud)         → Stale-While-Revalidate
//   • Audio (cdn.islamic.network)       → Cache First, Network Fallback
//   • Neon Auth / Data API              → Network Only (auth/data, pass-through)

// Version timestamp — update this on each deployment to bust stale caches.
const SW_VERSION = "20261030";

const CACHE_STATIC = `myhafizz-static-v${SW_VERSION}`;
const CACHE_API = `myhafizz-api-v${SW_VERSION}`;
// Audio cache is large and version-independent — keep a single name across deployments.
const CACHE_AUDIO = "myhafizz-audio-v2";

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/logo.svg",
  "/logo-192.png",
  "/logo-512.png",
  "/apple-touch-icon.png",
  "/favicon-32.png",
  "/og-image.svg",
  "/og-image.png",
  "/media-artwork.svg",
  "/icons/icon.svg",
];

// Minimal offline fallback returned when both network and cache fail for navigation.
const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>MyHafizz — Hors ligne</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body{font-family:sans-serif;display:flex;flex-direction:column;align-items:center;
         justify-content:center;min-height:100vh;margin:0;background:#f0fdf4;color:#064e3b;}
    h1{font-size:1.5rem;margin-bottom:.5rem;}
    p{color:#065f46;text-align:center;max-width:300px;}
  </style>
</head>
<body>
  <h1>📡 Vous êtes hors ligne</h1>
  <p>Vérifiez votre connexion internet et rechargez la page.</p>
</body>
</html>`;

// ─── Install ─────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ─── Activate ────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  const validCaches = [CACHE_STATIC, CACHE_API, CACHE_AUDIO];
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !validCaches.includes(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Reject after `ms` milliseconds — prevents hangs on slow/unstable mobile connections.
function fetchWithTimeout(request, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(request, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== "GET") return;

  // Skip chrome-extension and non-http requests
  if (!url.protocol.startsWith("http")) return;

  // Audio files → Cache First
  if (url.hostname === "cdn.islamic.network") {
    event.respondWith(cacheFirst(request, CACHE_AUDIO));
    return;
  }

  // Quran text API → Stale-While-Revalidate (serve cached immediately, update in background)
  if (url.hostname === "api.alquran.cloud") {
    event.respondWith(staleWhileRevalidate(request, CACHE_API));
    return;
  }

  // Neon Auth / Data API → Network Only (never cache auth/db requests)
  // Must use event.respondWith() to avoid requests hanging on mobile browsers
  if (url.hostname.endsWith("neon.tech") || url.hostname.endsWith("neon.build")) {
    event.respondWith(fetch(request).catch(() =>
      new Response(JSON.stringify({ error: "Network unavailable" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      })
    ));
    return;
  }

  // App shell (same origin) → Network First, Cache Fallback
  // This ensures updated assets are served after deployments
  if (url.origin === self.location.origin) {
    if (request.mode === "navigate") {
      event.respondWith(navigationHandler(request));
      return;
    }
    event.respondWith(networkFirst(request, CACHE_STATIC));
    return;
  }

  // Any other external request → pass through to network explicitly
  event.respondWith(fetch(request).catch(() =>
    new Response("Network error", { status: 503 })
  ));
});

// ─── Strategies ──────────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Ressource non disponible hors ligne", { status: 503 });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetchWithTimeout(request, 8000);
    if (response && response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(
      JSON.stringify({ code: 503, status: "Hors ligne", data: null }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
}

// Stale-While-Revalidate: serve the cached response immediately if available,
// then fetch and update the cache in the background.
async function staleWhileRevalidate(request, cacheName) {
  const cached = await caches.match(request);
  const fetchPromise = fetchWithTimeout(request, 8000).then(async (response) => {
    if (response && response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);

  if (cached) {
    // User gets the cached response immediately; errors from the background refresh
    // are intentionally ignored — the stale content is already being served.
    fetchPromise.catch(() => {});
    return cached;
  }
  return await fetchPromise || new Response(
    JSON.stringify({ code: 503, status: "Hors ligne", data: null }),
    { status: 503, headers: { "Content-Type": "application/json" } }
  );
}

async function navigationHandler(request) {
  try {
    const response = await fetchWithTimeout(request, 5000);
    if (response && response.ok) {
      const cache = await caches.open(CACHE_STATIC);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match("/index.html");
    if (cached) return cached;
    // Both network and cache failed — return a minimal offline page.
    return new Response(OFFLINE_HTML, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}
