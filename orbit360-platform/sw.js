/* Orbit 360 · Service Worker — cache mínimo para instalabilidad/offline.
   En el dominio real cachea el shell; en sandbox simplemente no registra. */
var CACHE = 'orbit360-v1';
self.addEventListener('install', function (e) { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.open(CACHE).then(function (cache) {
      return cache.match(e.request).then(function (hit) {
        var net = fetch(e.request).then(function (res) { try { cache.put(e.request, res.clone()); } catch (x) {} return res; }).catch(function () { return hit; });
        return hit || net;
      });
    })
  );
});
