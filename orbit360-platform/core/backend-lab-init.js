/* ============================================================
   Orbit 360 - Backend LAB Firebase init v1.113
   Initializes Firebase only in ?orbitBackend=firestore-lab.
   Reads config from local ignored file variables. No secrets here.
   ============================================================ */
(function(){
  'use strict';

  var params = new URLSearchParams(window.location.search || '');
  var mode = params.get('orbitBackend') || (window.OrbitBackend && window.OrbitBackend.mode) || '';
  var tenant = params.get('tenant') || (window.OrbitBackend && (window.OrbitBackend.tenantId || window.OrbitBackend.tenant)) || 'alianzas-soluciones';

  if (mode !== 'firestore-lab') return;

  window.OrbitBackend = Object.assign({}, window.OrbitBackend || {}, {
    mode: 'firestore-lab',
    tenantId: tenant,
    tenant: tenant,
    firebaseInit: 'pending',
    firebaseInitVersion: 'v1.113'
  });

  /* Carga complementos de importación solo en el tenant LAB autorizado.
     Los archivos contienen configuración y lógica, nunca datos reales ni
     secretos; el lote JSON permanece seleccionado en el navegador. */
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
    script.onerror = function(){
      try { console.error('[Orbit Backend LAB] No se pudo cargar complemento:', src); } catch(e) {}
    };
    document.head.appendChild(script);
  }

  if (tenant === 'alianzas-soluciones') {
    loadScriptOnce('core/backend-lab-advisor-write-bridge.js?v=20260715-6', 'advisor-write-bridge', function(){
      loadScriptOnce('data/import-initial-profiles.js?v=20260715-6', 'initial-profile', function(){
        loadScriptOnce('modules/importar-initial-tenant-lab.js?v=20260715-6', 'initial-import');
      });
    });
    loadScriptOnce('core/backend-lab-auth-guard.js?v=20260715-6', 'auth-guard', function(){
      loadScriptOnce('core/backend-lab-import-readiness-guard.js?v=20260715-6', 'import-readiness');
    });
  }

  function findConfig(){
    var candidates = [
      window.firebaseConfigLab,
      window.firebaseConfigLocal,
      window.firebaseConfigOrbit,
      window.ORBIT_FIREBASE_LAB_CONFIG,
      window.ORBIT_FIREBASE_CONFIG,
      window.OrbitFirebaseLabConfig,
      window.OrbitFirebaseConfig,
      window.FIREBASE_CONFIG,
      window.__firebase_config,
      window.__FIREBASE_CONFIG__,
      window.firebaseConfig
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
    return {
      projectId: config && config.projectId || '',
      authDomain: config && config.authDomain || '',
      hasApiKey: !!(config && config.apiKey),
      hasAppId: !!(config && config.appId)
    };
  }

  try {
    if (!window.firebase || typeof window.firebase.initializeApp !== 'function') {
      window.OrbitBackend.firebaseInit = 'sdk-not-ready';
      window.OrbitBackend.firebaseInitError = 'firebase.initializeApp unavailable';
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

    if (window.firebase.apps && window.firebase.apps.length > 0) {
      window.OrbitBackend.firebaseInit = 'already-initialized';
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