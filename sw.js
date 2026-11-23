/* =========================================================
   Service Worker (PWA & Billet Hors-Ligne)
   Éclairer le Monde — Noël à Aboisso (24 Décembre 2026)
   ========================================================= */
const CACHE_NAME = "noel-aboisso-v27";
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/styles.css?v=27",
  "/script.js?v=27",
  "/assets/shared.js?v=27",
  "/assets/qrcode-generator.js",
  "/assets/light_the_world.webp",
  "/assets/pattern-light.svg",
  "/assets/pattern-white.svg",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => {})
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
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  /* Ne pas mettre en cache les vidéos MP4 lourdes, les MP3 ou les routes d'administration */
  if (
    url.pathname.endsWith(".mp4") ||
    url.pathname.endsWith(".mp3") ||
    url.pathname.startsWith("/api/admin") ||
    url.pathname === "/admin.html"
  ) {
    return;
  }

  /* Images du mur photo et assets statiques : Cache-First avec mise en cache dynamique */
  if (
    url.pathname.startsWith("/assets/") ||
    url.pathname === "/api/photo-wall/img"
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  /* Pages HTML et données publiques (billet QR, vœux) : Network-First avec repli Hors-Ligne */
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
        }
        return res;
      })
      .catch(() =>
        caches.match(request).then((cached) => cached || caches.match("/index.html"))
      )
  );
});
