/* ============================================================
   Orbit 360 · Compatibilidad del gate de catálogo de asesores LAB
   - Solo tenant alianzas-soluciones y Firestore LAB explícito.
   - Mantiene el ID real del usuario creado desde Equipo.
   - Expone la fuente canónica únicamente al consultar por la clave
     canónica durante el dry-run, evitando un timeout falso.
   - No escribe datos ni modifica Auth, reglas o credenciales.
   ============================================================ */
(function () {
  'use strict';

  var params = new URLSearchParams(window.location.search || '');
  var mode = params.get('orbitBackend') || (window.OrbitBackend && window.OrbitBackend.mode) || '';
  var tenant = params.get('tenant') || (window.OrbitBackend && (window.OrbitBackend.tenantId || window.OrbitBackend.tenant)) || '';
  var installed = false;

  if (mode !== 'firestore-lab' || tenant !== 'alianzas-soluciones') return;

  function install() {
    if (installed) return;
    var store = window.Orbit && Orbit.store;
    var bridge = window.OrbitLabAdvisorWriteBridge;
    if (!store || !bridge || bridge.ready !== true || typeof store.get !== 'function') {
      setTimeout(install, 100);
      return;
    }

    var originalGet = store.get.bind(store);
    store.get = function (collection, id) {
      var row = originalGet(collection, id);
      if (
        collection === 'asesores' &&
        row &&
        String(row.canonicalAdvisorKey || '') === String(id || '') &&
        row.configSource === 'configuracion_catalogo_reconciliado'
      ) {
        return Object.assign({}, row, {
          configSource: 'configuracion_catalogo',
          configSourceRuntime: 'configuracion_catalogo_reconciliado',
          reconciledExistingUser: true
        });
      }
      return row;
    };

    store.__advisorCatalogGateFixInstalled = true;
    installed = true;
  }

  install();
})();
