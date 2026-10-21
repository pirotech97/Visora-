const CACHE_NAME = 'visora-pwa-v2';

// Fichiers statiques annexes précachés (hors HTML qui doit toujours être revalidé en réseau)
const PRECACHE_ASSETS = [
  '/manifest.webmanifest',
  '/icon.svg',
  '/apple-touch-icon.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png'
];

// Installation : mise en cache initiale et skipWaiting immédiat
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
});

// Activation : suppression des anciens caches et clients.claim
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => {
      return self.clients.claim();
    }).then(async () => {
      // Notifie les onglets ouverts qu'une nouvelle version est active
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) {
        client.postMessage({ type: 'SW_UPDATED', cacheName: CACHE_NAME });
      }
    })
  );
});

// Permet également de forcer le skipWaiting sur demande
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Interception des requêtes réseau
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // 1. Ne jamais intercepter ni mettre en cache les requêtes API ou Supabase
  if (url.pathname.startsWith('/api') || url.hostname.includes('supabase')) {
    return;
  }

  // 2. Le service worker lui-même ne doit jamais être servi depuis le cache
  if (url.pathname === '/sw.js' || url.pathname.endsWith('/sw.js')) {
    return;
  }

  // 3. Le HTML ne doit JAMAIS être mis en cache de manière durable (revalidation à chaque ouverture)
  const isHtmlRequest =
    event.request.mode === 'navigate' ||
    event.request.destination === 'document' ||
    url.pathname === '/' ||
    url.pathname.endsWith('.html');

  if (isHtmlRequest) {
    // Stratégie Network-First avec revalidation systématique
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put('/index.html', responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Repli hors-ligne uniquement si le réseau est inaccessible
          return caches.match('/index.html');
        })
    );
    return;
  }

  // 4. Autres ressources statiques (icônes, manifest, bundles JS/CSS avec hash)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return networkResponse;
      });
    })
  );
});
