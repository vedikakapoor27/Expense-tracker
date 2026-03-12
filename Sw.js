// FinTrack Service Worker v1.0
const CACHE_NAME    = "fintrack-v1";
const OFFLINE_URL   = "/offline.html";

// Files to pre-cache on install
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/dashboard.html",
  "/analytics.html",
  "/goals.html",
  "/reminders.html",
  "/profile.html",
  "/login.html",
  "/home.html",
  "/app.js",
  "/theme.js",
  "/offline.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap",
  "https://cdn.jsdelivr.net/npm/chart.js",
];

// ── Install: pre-cache all shell assets ──────────────────────────────────────
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("[SW] Pre-caching app shell");
      return cache.addAll(PRECACHE_URLS.map(url => {
        // Gracefully skip resources that fail to cache
        return new Request(url, { mode: "no-cors" });
      }));
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: clean up old caches ────────────────────────────────────────────
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: network-first for API, cache-first for assets ─────────────────────
self.addEventListener("fetch", event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and Firebase/external API calls
  if (request.method !== "GET") return;
  if (url.hostname.includes("firestore.googleapis.com")) return;
  if (url.hostname.includes("firebase.googleapis.com")) return;
  if (url.hostname.includes("identitytoolkit.googleapis.com")) return;

  // Network-first strategy for HTML pages (always fresh)
  if (request.destination === "document") {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match(OFFLINE_URL)))
    );
    return;
  }

  // Cache-first strategy for static assets (JS, CSS, fonts, images)
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (!response || response.status !== 200) return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        return response;
      }).catch(() => {
        // Return a placeholder for failed image requests
        if (request.destination === "image") return new Response("", { status: 404 });
      });
    })
  );
});

// ── Background Sync: queue failed expense saves ──────────────────────────────
self.addEventListener("sync", event => {
  if (event.tag === "sync-expenses") {
    event.waitUntil(syncPendingExpenses());
  }
});

async function syncPendingExpenses() {
  // Pending expenses would be stored in IndexedDB
  // This hook allows them to sync when connection is restored
  console.log("[SW] Background sync triggered");
}

// ── Push Notifications ───────────────────────────────────────────────────────
self.addEventListener("push", event => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || "FinTrack", {
      body:    data.body  || "You have a bill due soon.",
      icon:    "/icons/icon-192.png",
      badge:   "/icons/icon-96.png",
      tag:     "fintrack-reminder",
      vibrate: [200, 100, 200],
      actions: [
        { action: "view",    title: "View Bills" },
        { action: "dismiss", title: "Dismiss"    }
      ]
    })
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  if (event.action === "view" || !event.action) {
    event.waitUntil(clients.openWindow("/reminders.html"));
  }
});