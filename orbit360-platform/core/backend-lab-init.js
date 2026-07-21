/* ============================================================
   Orbit 360 - Backend LAB Firebase init v1.122
   Initializes Firebase only in ?orbitBackend=firestore-lab.
   No secrets are versioned or exposed.
   ============================================================ */
(function(){
  'use strict';
  var params = new URLSearchParams(window.location.search || '');
  var mode = params.get('orbitBackend') || (window.OrbitBackend && window.OrbitBackend.mode) || '';
  var tenant = params.get('tenant') || (window.OrbitBackend && (window.OrbitBackend.tenantId || window.OrbitBackend.tenant)) || 'alianzas-soluciones';
  if (mode !== 'firestore-lab') return;

  window.OrbitBackend = Object.assign({}, window.OrbitBackend || {}, {
    mode: 'firestore-lab', tenantId: tenant, tenant: tenant,
    firebaseInit: 'pending', firebaseInitVersion: 'v1.122',
    featureFlags: Object.assign({}, window.OrbitBackend && window.OrbitBackend.featureFlags || {}, {
      aseguradorasKnowledgeAutoMount: false,
      insurerDirectoryCanonicalRuntime: true
    })
  });

  function loadScriptOnce(src, key, done) {
    var attr = 'data-orbit-lab-addon';
    var existing = document.querySelector('script[' + attr + '="' + key + '"]');
    if (existing) {
      if (done) {
        if (existing.dataset.loaded === '1') done();
        else existing.addEventListener('load', done, { once: true });
      }
      return;
    }
    var script = document.createElement('script');
    script.src = src;
    script.setAttribute(attr, key);
    script.onload = function(){ script.dataset.loaded = '1'; if (done) done(); };
    script.onerror = function(){ try { console.error('[Orbit Backend LAB] No se pudo cargar complemento:', src); } catch(e) {} };
    document.head.appendChild(script);
  }

  if (tenant === 'alianzas-soluciones') {
    window.__orbitAysKnowledgeRuntimePromise = Promise.resolve({
      status: 'catalog_visible_runtime_controlled', autoMount: false,
      enablesCotizador: false, enablesComparativo: false
    });

    /* Owner canónico primero. Bloquea el flujo anterior hasta verificar
       contratos, lectura fresca, proveedores y escritura parcial. */
    loadScriptOnce('core/aseguradoras-canonical-runtime-bootstrap-v20260721.js?v=20260721-1', 'insurer-directory-canonical-runtime');
    loadScriptOnce('data/academia-v1224-aseguradoras-canonical-recovery.js?v=20260721-1', 'academy-canonical-recovery');
    loadScriptOnce('core/aseguradoras-bank-accounts-provider-lab-v20260721.js?v=20260721-1', 'bank-account-provider');
    loadScriptOnce('core/backend-lab-advisor-write-bridge.js?v=20260717-1', 'advisor-write-bridge');
    loadScriptOnce('core/backend-lab-auth-guard.js?v=20260717-1', 'auth-guard', function(){
      loadScriptOnce('core/backend-lab-import-readiness-guard.js?v=20260717-1', 'import-readiness', function(){
        loadScriptOnce('core/backend-lab-canonical-view-sync.js?v=20260717-1', 'canonical-view-sync');
      });
    });
  }

  function findConfig(){
    var candidates = [
      window.firebaseConfigLab, window.firebaseConfigLocal, window.firebaseConfigOrbit,
      window.ORBIT_FIREBASE_LAB_CONFIG, window.ORBIT_FIREBASE_CONFIG,
      window.OrbitFirebaseLabConfig, window.OrbitFirebaseConfig,
      window.FIREBASE_CONFIG, window.__firebase_config, window.__FIREBASE_CONFIG__, window.firebaseConfig
    ];
    for (var i = 0; i < candidates.length; i++) {
      var cfg = candidates[i];
      if (cfg && typeof cfg === 'object' && (cfg.projectId || cfg.authDomain)) return cfg;
    }
    if (window.Orbit && window.Orbit.firebaseConfig) return window.Orbit.firebaseConfig;
    if (window.OrbitBackend && window.OrbitBackend.firebaseConfig) return window.OrbitBackend.firebaseConfig;
    return null;
  }
  function publicConfigInfo(config){
    return { projectId: config && config.projectId || '', authDomain: config && config.authDomain || '', hasApiKey: !!(config && config.apiKey), hasAppId: !!(config && config.appId) };
  }

  try {
    if (!window.firebase || typeof window.firebase.initializeApp !== 'function') {
      window.OrbitBackend.firebaseInit = 'sdk-not-ready';
      window.OrbitBackend.firebaseInitError = 'firebase.initializeApp unavailable';
      return;
    }
    if (window.firebase.apps && window.firebase.apps.length > 0) {
      var existingApp = typeof window.firebase.app === 'function' ? window.firebase.app() : window.firebase.apps[0];
      var existingConfig = existingApp && existingApp.options ? existingApp.options : {};
      window.OrbitBackend.firebaseInit = 'already-initialized';
      window.OrbitBackend.firebaseConfigInfo = publicConfigInfo(existingConfig);
      window.OrbitBackend.firebaseProjectId = existingConfig.projectId || '';
      return;
    }
    var config = findConfig();
    if (!config) {
      window.OrbitBackend.firebaseInit = 'config-not-found';
      window.OrbitBackend.firebaseInitError = 'Local config did not expose a recognized Firebase config object';
      return;
    }
    if (!config.projectId || !config.authDomain) {
      window.OrbitBackend.firebaseInit = 'config-incomplete';
      window.OrbitBackend.firebaseInitError = 'Firebase LAB config requires projectId and authDomain';
      window.OrbitBackend.firebaseConfigInfo = publicConfigInfo(config);
      return;
    }
    window.firebase.initializeApp(config);
    window.OrbitBackend.firebaseInit = 'initialized';
    window.OrbitBackend.firebaseConfigInfo = publicConfigInfo(config);
    window.OrbitBackend.firebaseProjectId = config.projectId || '';
  } catch(e) {
    window.OrbitBackend.firebaseInit = 'error';
    window.OrbitBackend.firebaseInitError = String(e && (e.message || e) || e);
  }
})();
