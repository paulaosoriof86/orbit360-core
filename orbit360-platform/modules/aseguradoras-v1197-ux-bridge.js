/* ============================================================
   Orbit 360 · Aseguradoras · puente visual retirado
   La candidata aprobada en modules/aseguradoras.js es la única
   propietaria del directorio, KPIs y ficha. Este archivo permanece
   como shim para conservar el orden de carga sin 404 ni re-render.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
(function () {
  'use strict';
  const mod = Orbit.modules.aseguradoras;
  if (!mod) return;
  mod.__approvedCandidateFrontend = {
    sourceCommit: '756082365b3d63f2a466d622162b9c2dec7053c7',
    sourceBlob: '93f194aae36dfa3ccd4f154f94d216c12350f9cf',
    visualOverride: false,
    canonicalRenderer: 'modules/aseguradoras.js'
  };
})();
