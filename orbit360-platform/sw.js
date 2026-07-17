/* Orbit 360 · Service Worker — red primero con fallback offline.
   Evita que una versión antigua de Auth o del shell bloquee el canal LAB. */
var CACHE = 'orbit360-v20260717-2';
var BUILD = '20260717-2';

self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key.indexOf('orbit360-') === 0 && key !== CACHE) return caches.delete(key);
        return Promise.resolve(false);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;

  var originalUrl = new URL(event.request.url);
  if (originalUrl.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE).then(function (cache) {
      var request = event.request;

      if (/\/core\/auth\.js$/i.test(originalUrl.pathname)) {
        var freshAuthUrl = new URL(originalUrl.href);
        freshAuthUrl.searchParams.set('orbitBuild', BUILD);
        request = new Request(freshAuthUrl.href, {
          method: 'GET',
          headers: event.request.headers,
          credentials: event.request.credentials,
          redirect: event.request.redirect
        });
      }

      return fetch(request, { cache: 'no-store' }).then(function (response) {
        if (response && response.ok) {
          try { cache.put(event.request, response.clone()); } catch (ignore) {}
        }
        return response;
      }).catch(function (error) {
        return cache.match(event.request).then(function (hit) {
          if (hit) return hit;
          throw error;
        });
      });
    })
  );
});
