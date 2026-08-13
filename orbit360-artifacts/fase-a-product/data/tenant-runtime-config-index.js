/* ============================================================
   Orbit 360 · índice declarativo de configuración runtime por tenant
   - El core consulta este índice; no contiene lógica operativa.
   - Cada entrada apunta a un archivo de configuración separado.
   - No contiene clientes, credenciales, cuentas ni secretos.
   ============================================================ */
(function () {
  'use strict';
  window.OrbitTenantRuntimeConfigIndex = Object.assign({}, window.OrbitTenantRuntimeConfigIndex || {}, {
    'alianzas-soluciones': {
      insurerConfigSrc: 'data/tenant-alianzas-soluciones-insurers-p10.js'
    }
  });
})();
