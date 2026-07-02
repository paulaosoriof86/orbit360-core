/* ============================================================
   Orbit 360 - Backend LAB Firebase init
   Initializes Firebase only in ?orbitBackend=firestore-lab.
   Reads config from local ignored file variables. No secrets here.
   ============================================================ */
(function(){
  'use strict';

  var params = new URLSearchParams(window.location.search || '');
  var mode = params.get('orbitBackend') || (window.OrbitBackend && window.OrbitBackend.mode) || '';
  if (mode !== 'firestore-lab') return;

  window.OrbitBackend = Object.assign({}, window.OrbitBackend || {}, {
    mode: 'firestore-lab',
    firebaseInit: 'pending'
  });

  function findConfig(){
    var candidates = [
      window.firebaseConfig,
      window.firebaseConfigLab,
      window.firebaseConfigLocal,
      window.firebaseConfigOrbit,
      window.ORBIT_FIREBASE_CONFIG,
      window.ORBIT_FIREBASE_LAB_CONFIG,
      window.OrbitFirebaseConfig,
      window.OrbitFirebaseLabConfig,
      window.FIREBASE_CONFIG,
      window.__firebase_config,
      window.__FIREBASE_CONFIG__
    ];

    for (var i = 0; i < candidates.length; i++) {
      var cfg = candidates[i];
      if (cfg && typeof cfg === 'object' && (cfg.apiKey || cfg.projectId || cfg.authDomain)) return cfg;
    }

    if (window.Orbit && window.Orbit.firebaseConfig) return window.Orbit.firebaseConfig;
    if (window.OrbitBackend && window.OrbitBackend.firebaseConfig) return window.OrbitBackend.firebaseConfig;
    return null;
  }

  try {
    if (!window.firebase || typeof window.firebase.initializeApp !== 'function') {
      window.OrbitBackend.firebaseInit = 'sdk-not-ready';
      window.OrbitBackend.firebaseInitError = 'firebase.initializeApp unavailable';
      return;
    }

    if (window.firebase.apps && window.firebase.apps.length > 0) {
      window.OrbitBackend.firebaseInit = 'already-initialized';
      return;
    }

    var config = findConfig();
    if (!config) {
      window.OrbitBackend.firebaseInit = 'config-not-found';
      window.OrbitBackend.firebaseInitError = 'Local config did not expose a recognized Firebase config object';
      return;
    }

    window.firebase.initializeApp(config);
    window.OrbitBackend.firebaseInit = 'initialized';
    window.OrbitBackend.firebaseProjectId = config.projectId || '';
  } catch(e) {
    window.OrbitBackend.firebaseInit = 'error';
    window.OrbitBackend.firebaseInitError = String(e && (e.message || e) || e);
  }
})();