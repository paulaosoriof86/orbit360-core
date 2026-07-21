/* ============================================================
   Orbit 360 · Aseguradoras OP-2 · lectura fresca antes de importar
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  var params = new URLSearchParams(window.location.search || '');
  var mode = params.get('orbitBackend') || (window.OrbitBackend && OrbitBackend.mode) || '';
  var tenant = params.get('tenant') || (window.OrbitBackend && (OrbitBackend.tenantId || OrbitBackend.tenant)) || '';
  var TENANT_ID = 'alianzas-soluciones';
  var VERSION = '20260721.1';
  if (mode !== 'firestore-lab' || tenant !== TENANT_ID) return;

  function waitForReadiness(timeoutMs) {
    var started = Date.now();
    return new Promise(function (resolve, reject) {
      (function check() {
        if (window.OrbitLabImportReadiness && typeof OrbitLabImportReadiness.loadCriticalCollections === 'function') {
          resolve(OrbitLabImportReadiness); return;
        }
        if (Date.now() - started >= timeoutMs) { reject(new Error('CRITICAL_READ_OWNER_NOT_READY')); return; }
        setTimeout(check, 100);
      })();
    });
  }
  async function refreshCritical() {
    var owner = await waitForReadiness(15000);
    var state = await owner.loadCriticalCollections(true);
    var counts = state && state.counts || {};
    if (Number(counts.clientes || 0) !== 414) throw new Error('CLIENT_COUNT_NOT_READY');
    if (Number(counts.aseguradoras || 0) !== 26) throw new Error('INSURER_COUNT_NOT_READY');
    if (Number(counts.asesores || 0) !== 7) throw new Error('ADVISOR_COUNT_NOT_READY');
    return state;
  }
  function install() {
    var D = Orbit.insurerDirectoryImport;
    if (!D || typeof D.parseFile !== 'function') return false;
    if (D.__freshReadGuardV20260721) return true;
    var originalParseFile = D.parseFile.bind(D);
    D.parseFile = async function () {
      await refreshCritical();
      return originalParseFile.apply(D, arguments);
    };
    D.__freshReadGuardV20260721 = { version: VERSION, originalParseFile: originalParseFile, refreshCritical: refreshCritical, failClosed: true };
    return true;
  }
  Orbit.__insurerDirectoryFreshReadGuardV20260721 = { version: VERSION, install: install, refreshCritical: refreshCritical, failClosed: true };
  var attempts = 0;
  var timer = setInterval(function () { attempts += 1; if (install() || attempts > 160) clearInterval(timer); }, 100);
  setTimeout(install, 0);
})();
