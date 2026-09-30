const CACHE_NAME = 'pos-solar-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// Instalación: Guardar los archivos estáticos en caché
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activación: Limpiar cachés antiguos si se cambia la versión (CACHE_NAME)
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interceptar peticiones (Fetch)
self.addEventListener('fetch', event => {
  // Ignorar las llamadas a la API de Supabase para que las maneje el DataPlugin (que ya tiene su propio caché en localStorage)
  if (event.request.url.includes('supabase.co')) {
    return;
  }

  // Estrategia "Stale-While-Revalidate" (Sirve desde caché instantáneamente, y actualiza por detrás si hay internet)
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        // Guardar la versión fresca en caché para la próxima vez
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, networkResponse.clone());
        });
        return networkResponse;
      }).catch(error => {
        // Fallback: Si no hay red y no está en caché
        console.log('Modo offline activado, usando caché para:', event.request.url);
      });

      // Retorna el caché inmediatamente si existe, o espera a la red si es la primera vez
      return cachedResponse || fetchPromise;
    })
  );
});
