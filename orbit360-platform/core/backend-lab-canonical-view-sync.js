/* ============================================================
   Orbit 360 · Sincronización de vistas canónicas en Firestore LAB
   - No crea un renderer alterno ni reemplaza HTML del prototipo.
   - Reutiliza Orbit.modules.aseguradoras y Orbit.modules.cliente360.
   - Re-renderiza cuando snapshots reales hidratan o actualizan datos.
   - Evita repintados repetidos con la misma firma de ruta/conteos.
   ============================================================ */
(function () {
  'use strict';

  var params = new URLSearchParams(window.location.search || '');
  var mode = params.get('orbitBackend') || (window.OrbitBackend && window.OrbitBackend.mode) || '';
  var tenant = params.get('tenant') || (window.OrbitBackend && (window.OrbitBackend.tenantId || window.OrbitBackend.tenant)) || '';
  var timer = null;
  var pendingCollection = '';
  var lastRenderSignature = '';
  var lastRenderAt = 0;

  if (mode !== 'firestore-lab' || tenant !== 'alianzas-soluciones') return;

  function routeKey() {
    try {
      var key = window.Orbit && Orbit.route && Orbit.route.key ? String(Orbit.route.key) : '';
      if (key === 'cliente360' || key === 'aseguradoras') return key;
    } catch (error) {}
    return '';
  }

  function collectionCount(name) {
    try {
      return window.Orbit && Orbit.store && typeof Orbit.store.all === 'function'
        ? (Orbit.store.all(name) || []).length
        : 0;
    } catch (error) {
      return 0;
    }
  }

  function canonicalModule(route) {
    try {
      return window.Orbit && Orbit.modules && Orbit.modules[route];
    } catch (error) {
      return null;
    }
  }

  function renderSignature(route) {
    return [route, collectionCount('clientes'), collectionCount('aseguradoras'), collectionCount('asesores'), String(location.hash || '')].join('|');
  }

  function renderCanonical(force) {
    timer = null;
    var triggerCollection = pendingCollection || '*';
    pendingCollection = '';
    var route = routeKey();
    if (!route) return;

    var host = document.getElementById('host');
    var mod = canonicalModule(route);
    if (!host || !mod || typeof mod.render !== 'function') return;

    if (route === 'cliente360' && collectionCount('clientes') === 0) return;
    if (route === 'aseguradoras' && collectionCount('aseguradoras') === 0) return;

    var signature = renderSignature(route);
    var now = Date.now();
    if (!force && signature === lastRenderSignature && now - lastRenderAt < 900) return;
    lastRenderSignature = signature;
    lastRenderAt = now;

    mod.render(host);

    try {
      if (window.Orbit && Orbit.m1VisualIntegrity && typeof Orbit.m1VisualIntegrity.patch === 'function') {
        Orbit.m1VisualIntegrity.patch();
      }
    } catch (error) {}

    try {
      window.dispatchEvent(new CustomEvent('orbit:lab:canonical-view-hydrated', {
        detail: {
          tenantId: tenant,
          route: route,
          triggerCollection: triggerCollection,
          clientes: collectionCount('clientes'),
          aseguradoras: collectionCount('aseguradoras'),
          renderer: 'prototype-canonical',
          deduplicatedRender: true
        }
      }));
    } catch (error) {}
  }

  function schedule(collection, force) {
    var route = routeKey();
    if (!route) return;
    if (collection && ['clientes', 'aseguradoras', 'asesores', '*'].indexOf(collection) < 0) return;
    pendingCollection = collection || pendingCollection || '*';
    if (timer) clearTimeout(timer);
    timer = setTimeout(function () { renderCanonical(force === true); }, force ? 20 : 180);
  }

  function loadVisualIntegrity() {
    if (window.Orbit && Orbit.m1VisualIntegrity) return;
    if (document.querySelector('script[data-orbit-m1-visual-integrity]')) return;
    var script = document.createElement('script');
    script.src = 'core/m1-visual-integrity-v20260719.js?v=20260719-1';
    script.async = false;
    script.dataset.orbitM1VisualIntegrity = '1';
    script.onload = function () { schedule('*', true); };
    (document.head || document.documentElement).appendChild(script);
  }

  window.addEventListener('orbit:store:emit', function (event) {
    schedule(event && event.detail && event.detail.collection || '');
  });
  window.addEventListener('orbit:backend:write-ok', function (event) {
    schedule(event && event.detail && event.detail.collection || '', true);
  });
  window.addEventListener('hashchange', function () {
    schedule('*', true);
  });

  window.OrbitLabCanonicalViewSync = {
    schedule: schedule,
    render: function () { renderCanonical(true); },
    status: function () {
      return {
        tenantId: tenant,
        route: routeKey(),
        renderer: 'prototype-canonical',
        clientes: collectionCount('clientes'),
        aseguradoras: collectionCount('aseguradoras'),
        deduplicatedRender: true,
        lastRenderSignature: lastRenderSignature
      };
    }
  };

  loadVisualIntegrity();
  schedule('*', true);
})();
