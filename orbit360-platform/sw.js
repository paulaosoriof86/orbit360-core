/* Orbit 360 · Service Worker — red primero con fallback offline.
   Evita que una versión antigua de Auth o del shell bloquee el canal LAB. */
var CACHE = 'orbit360-v20260721-4-pwa2';
var BUILD = '20260721-4';
var CRITICAL_RELEASE = 'block1-critical-runtime-20260721-4';
var RUNTIME_CONTRACT_TIMEOUT_MS = 8000;
var RUNTIME_CONTRACT_CACHE_STRATEGY = 'cache-first-bounded-revalidate';
var RUNTIME_CONTRACT_PATHS = [
  '/core/session-multirol-visibility-v20260716.js',
  '/core/client-canonical-view-projection-v20260716.js',
  '/core/tenant-insurer-config-p10.js',
  '/data/tenant-runtime-config-index.js'
];
var CRITICAL_RUNTIME_PATHS = [
  '/core/router-tenant-config-bootstrap.js',
  '/core/client-insurer-visual-stability-barrier-v20260721.js',
  '/core/client-insurer-visual-contract-v20260720.js',
  '/styles/client-insurer-visual-contract-v20260720.css',
  '/core/pwa.js',
  '/modules/ia.js'
];

function canonicalRequest(pathname) {
  return new Request(new URL(pathname, self.location.origin).href, {
    method: 'GET',
    credentials: 'same-origin',
    redirect: 'follow'
  });
}

function isRuntimeContract(pathname) {
  return RUNTIME_CONTRACT_PATHS.indexOf(pathname) >= 0 || /^\/data\/tenant-[^/]+-insurers-p10\.js$/i.test(pathname);
}

function isCriticalRuntime(pathname) {
  return CRITICAL_RUNTIME_PATHS.indexOf(pathname) >= 0;
}

function releaseRequest(eventRequest, originalUrl) {
  var freshUrl = new URL(originalUrl.href);
  freshUrl.searchParams.set('orbitBuild', BUILD);
  freshUrl.searchParams.set('criticalRelease', CRITICAL_RELEASE);
  return new Request(freshUrl.href, {
    method: 'GET',
    headers: eventRequest.headers,
    credentials: eventRequest.credentials,
    redirect: eventRequest.redirect
  });
}

function fetchWithTimeout(request, timeoutMs) {
  if (typeof AbortController !== 'function') {
    return Promise.race([
      fetch(request, { cache: 'no-store' }),
      new Promise(function (_, reject) {
        setTimeout(function () { reject(new Error('NETWORK_TIMEOUT')); }, timeoutMs);
      })
    ]);
  }
  var controller = new AbortController();
  var timer = setTimeout(function () { controller.abort(); }, timeoutMs);
  return fetch(request, { cache: 'no-store', signal: controller.signal }).then(function (response) {
    clearTimeout(timer);
    return response;
  }, function (error) {
    clearTimeout(timer);
    throw error;
  });
}

function cacheResponse(cache, key, response) {
  if (!response || !response.ok) return Promise.resolve(response);
  return cache.put(key, response.clone()).catch(function () { return false; }).then(function () {
    return response;
  });
}

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return Promise.all(RUNTIME_CONTRACT_PATHS.map(function (pathname) {
        var key = canonicalRequest(pathname);
        return fetchWithTimeout(key, 15000).then(function (response) {
          return cacheResponse(cache, key, response);
        }).catch(function () { return null; });
      }));
    }).then(function () {
      return self.skipWaiting();
    })
  );
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

  if (isRuntimeContract(originalUrl.pathname)) {
    var key = canonicalRequest(originalUrl.pathname);
    var cachePromise = caches.open(CACHE);
    var refreshPromise = cachePromise.then(function (cache) {
      return fetchWithTimeout(event.request, RUNTIME_CONTRACT_TIMEOUT_MS).then(function (response) {
        return cacheResponse(cache, key, response);
      });
    });

    event.waitUntil(refreshPromise.catch(function () { return null; }));
    event.respondWith(
      cachePromise.then(function (cache) {
        return cache.match(key);
      }).then(function (hit) {
        if (hit) return hit;
        return refreshPromise.catch(function (error) {
          return cachePromise.then(function (cache) {
            return cache.match(event.request, { ignoreSearch: true });
          }).then(function (fallback) {
            if (fallback) return fallback;
            throw error;
          });
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE).then(function (cache) {
      var request = event.request;

      if (isCriticalRuntime(originalUrl.pathname) || /\/core\/auth\.js$/i.test(originalUrl.pathname)) {
        request = releaseRequest(event.request, originalUrl);
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
