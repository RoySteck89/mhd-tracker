const CACHE_NAME = 'mhd-scanner-v3';
const ASSETS_TO_CACHE = [
  './index.html',
  './css/designs.css',
  './js/datenbank-verbindung.js',
  './js/benutzer-verwaltung.js',
  './js/scanner-logik.js',
  './js/artikel-suche.js',
  './js/mitarbeiter-profil.js',
  './js/app-steuerung.js',
  './js/key-manager.js',
  './js/auth.js',
  './js/admin-dashboard.js',
  './js/bezirksleitung-dashboard.js',
  './js/globale-modals.js',
  './js/pull-to-refresh.js'
];

// Installation & Caching
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Aktivierung (Alten Cache aufräumen)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch (Netzwerk-Anfragen abfangen)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});