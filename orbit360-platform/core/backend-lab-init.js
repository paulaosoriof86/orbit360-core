/* ============================================================
   Orbit 360 - Backend LAB Firebase init v1.126
   Inicializa Firebase solo en ?orbitBackend=firestore-lab.
   Declara el read model canónico sellado y mantiene un único owner
   de lectura: Orbit.store. No expone secretos ni crea renderers.
   Carga adaptadores genéricos de onboarding, configuración, flujos,
   conciliación e importaciones recurrentes detrás de compuertas.
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
    firebaseInitVersion: 'v1.126-recurring-import-source',
    functionsRegion: (window.OrbitBackend && window.OrbitBackend.functionsRegion) || 'us-central1',
    canonicalSnapshotDigest: '19e1927d39f6b713ee12504f8762bc42ead9de6e365bb0f12162d2a0c8f8469b',
    featureFlags: Object.assign({}, window.OrbitBackend && window.OrbitBackend.featureFlags || {}, {
      aseguradorasKnowledgeAutoMount: false,
      canonicalReadModelV79: true,
      canonicalStoreSingleOwner: true,
      canonicalSeedExclusion: true,
      genericTeamOnboardingSource: true,
      tenantDomainConfigBackendSource: true,
      tenantDomainConfigBackendActive: false,
      opsLeadsDomainBackendSource: true,
      opsLeadsDomainBackendActive: false,
      cobrosReconciliationDomainSource: true,
      cobrosReconciliationDomainActive: false,
      recurringInsuranceImportSource: true,
      recurringInsuranceImportActive: false
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
    script.onerror = function(){
      try { console.error('[Orbit Backend LAB] No se pudo cargar complemento:', src); } catch(e) {}
    };
    document.head.appendChild(script);
  }

  function afterWindowLoad(callback) {
    if (document.readyState === 'complete') setTimeout(callback, 0);
    else window.addEventListener('load', callback, { once: true });
  }

  function loadTeamOnboarding() {
    loadScriptOnce('core/user-onboarding.js?v=20260804-1', 'user-onboarding-core', function(){
      afterWindowLoad(function(){
        loadScriptOnce('modules/equipo-onboarding-v20260804-bridge.js?v=20260804-1', 'equipo-onboarding-bridge');
      });
    });
  }

  function loadDomainConfiguration() {
    loadScriptOnce('core/tenant-domain-config-client.js?v=20260804-1', 'tenant-domain-config-client', function(){
      afterWindowLoad(function(){
        loadScriptOnce('modules/config-domain-v20260804-bridge.js?v=20260804-1', 'tenant-domain-config-bridge');
      });
    });
  }

  function loadWorkflowDomain() {
    loadScriptOnce('core/ops-leads-domain-client.js?v=20260804-1', 'ops-leads-domain-client', function(){
      afterWindowLoad(function(){
        loadScriptOnce('modules/ops-leads-domain-v20260804-bridge.js?v=20260804-1', 'ops-leads-domain-bridge');
      });
    });
  }

  function loadReconciliationDomain() {
    loadScriptOnce('core/cobros-reconciliation-domain-client.js?v=20260804-1', 'cobros-reconciliation-domain-client');
  }

  function loadRecurringInsuranceImport() {
    loadScriptOnce('core/recurring-insurance-import-client.js?v=20260804-1', 'recurring-import-client', function(){
      loadScriptOnce('core/recurring-insurance-document-extractor.js?v=20260804-1', 'recurring-import-extractor', function(){
        afterWindowLoad(function(){
          loadScriptOnce('modules/importar-recurring-bridge-v20260804.js?v=20260804-2', 'recurring-import-bridge');
        });
      });
    });
  }

  loadTeamOnboarding();
  loadDomainConfiguration();
  loadWorkflowDomain();
  loadReconciliationDomain();
  loadRecurringInsuranceImport();

  if (tenant === 'alianzas-soluciones') {
    window.__orbitAysKnowledgeRuntimePromise = Promise.resolve({
      status: 'catalog_visible_runtime_controlled',
      autoMount: false,
      enablesCotizador: false,
      enablesComparativo: false
    });

    loadScriptOnce('core/aseguradoras-bank-accounts-provider-lab-v20260721.js?v=20260721-1', 'bank-account-provider');
    loadScriptOnce('core/backend-lab-advisor-write-bridge.js?v=20260717-1', 'advisor-write-bridge');
    loadScriptOnce('core/backend-lab-auth-guard.js?v=20260717-1', 'auth-guard', function(){
      loadScriptOnce('core/backend-lab-import-readiness-guard.js?v=20260717-1', 'import-readiness', function(){
        loadScriptOnce('core/backend-lab-canonical-view-sync.js?v=20260801-canonical-v79', 'canonical-view-sync');
      });
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
