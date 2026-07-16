/* ============================================================
   Orbit 360 · Sincronización de vistas canónicas en Firestore LAB
   - No crea un renderer alterno ni reemplaza HTML del prototipo.
   - Reutiliza Orbit.modules.aseguradoras y Orbit.modules.cliente360.
   - Re-renderiza cuando los snapshots reales hidratan o actualizan
     Clientes o Aseguradoras después del login/carga controlada.
   ============================================================ */
(function () {
  'use strict';

  var params = new URLSearchParams(window.location.search || '');
  var mode = params.get('orbitBackend') || (window.OrbitBackend && window.OrbitBackend.mode) || '';
  var tenant = params.get('tenant') || (window.OrbitBackend && (window.OrbitBackend.tenantId || window.OrbitBackend.tenant)) || '';
  var timer = null;
  var pendingCollection = '';

  if (mode !== 'firestore-lab' || tenant !== 'alianzas-soluciones') return;

  function routeKey() {
    var hash = String(window.location.hash || '');
    if (hash.indexOf('#/cliente360') === 0) return 'cliente360';
    if (hash.indexOf('#/aseguradoras') === 0) return 'aseguradoras';
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

  function renderCanonical() {
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

    mod.render(host);

    try {
      window.dispatchEvent(new CustomEvent('orbit:lab:canonical-view-hydrated', {
        detail: {
          tenantId: tenant,
          route: route,
          triggerCollection: triggerCollection,
          clientes: collectionCount('clientes'),
          aseguradoras: collectionCount('aseguradoras'),
          renderer: 'prototype-canonical'
        }
      }));
    } catch (error) {}
  }

  function schedule(collection) {
    var route = routeKey();
    if (!route) return;
    if (collection && ['clientes', 'aseguradoras', 'asesores', '*'].indexOf(collection) < 0) return;
    pendingCollection = collection || pendingCollection || '*';
    if (timer) clearTimeout(timer);
    timer = setTimeout(renderCanonical, 120);
  }

  window.addEventListener('orbit:store:emit', function (event) {
    schedule(event && event.detail && event.detail.collection || '');
  });
  window.addEventListener('orbit:backend:write-ok', function (event) {
    schedule(event && event.detail && event.detail.collection || '');
  });
  window.addEventListener('hashchange', function () {
    schedule('*');
  });

  window.OrbitLabCanonicalViewSync = {
    schedule: schedule,
    render: renderCanonical,
    status: function () {
      return {
        tenantId: tenant,
        route: routeKey(),
        renderer: 'prototype-canonical',
        clientes: collectionCount('clientes'),
        aseguradoras: collectionCount('aseguradoras')
      };
    }
  };

  schedule('*');
})();
