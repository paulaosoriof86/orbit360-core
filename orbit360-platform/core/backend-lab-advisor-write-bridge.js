/* ============================================================
   Orbit 360 · Puente de confirmación del catálogo de asesores LAB
   Se instala únicamente sobre el adapter Firestore LAB explícito.
   Mantiene visible la fila solicitada mientras la cola real termina
   y el snapshot Firestore converge. Los errores reales siguen siendo
   bloqueantes mediante writeErrors. No contiene credenciales.
   ============================================================ */
(function () {
  'use strict';

  var params = new URLSearchParams(window.location.search || '');
  var mode = params.get('orbitBackend') || (window.OrbitBackend && window.OrbitBackend.mode) || '';
  var tenant = params.get('tenant') || (window.OrbitBackend && (window.OrbitBackend.tenantId || window.OrbitBackend.tenant)) || '';

  if (mode !== 'firestore-lab' || tenant !== 'alianzas-soluciones') return;

  function install() {
    var store = window.Orbit && Orbit.store;
    if (
      !store ||
      store.__firestoreLabExplicit !== true ||
      typeof store.update !== 'function' ||
      typeof store.get !== 'function'
    ) {
      setTimeout(install, 100);
      return;
    }
    if (store.__advisorWriteBridgeInstalled) return;

    var originalUpdate = store.update.bind(store);
    var originalGet = store.get.bind(store);
    var desired = {};
    var confirmed = {};

    store.update = function (collection, id, patch) {
      if (collection === 'asesores' && id) {
        desired[id] = Object.assign({}, patch || {}, { id: id, tenantId: tenant });
      }
      return originalUpdate(collection, id, patch);
    };

    store.get = function (collection, id) {
      var row = originalGet(collection, id);
      if (collection === 'asesores' && id) {
        var overlay = confirmed[id] || desired[id];
        if (overlay) return Object.assign({}, row || {}, overlay);
      }
      return row;
    };

    window.addEventListener('orbit:backend:write-ok', function (event) {
      var detail = event && event.detail || {};
      if (detail.collection !== 'asesores' || !detail.id || !desired[detail.id]) return;
      confirmed[detail.id] = Object.assign({}, desired[detail.id]);
    });

    window.addEventListener('orbit:backend:write-error', function (event) {
      var detail = event && event.detail || {};
      if (detail.collection !== 'asesores' || !detail.id) return;
      delete confirmed[detail.id];
      delete desired[detail.id];
    });

    store.__advisorWriteBridgeInstalled = true;
    window.OrbitLabAdvisorWriteBridge = {
      storeSource: 'firestore-lab-explicit',
      status: function () {
        return {
          desired: Object.keys(desired).length,
          confirmed: Object.keys(confirmed).length,
          installedOnFirestoreLab: store.__firestoreLabExplicit === true
        };
      }
    };
  }

  install();
})();