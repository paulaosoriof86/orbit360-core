/* ============================================================
   Orbit 360 - Backend LAB loader
   Loads Firebase SDK + local config only for ?orbitBackend=firestore-lab.
   No secrets in repository. Local config remains ignored by Git.
   ============================================================ */
(function(){
  'use strict';

  var params = new URLSearchParams(window.location.search || '');
  var mode = params.get('orbitBackend') || '';
  var tenant = params.get('tenant') || 'alianzas-soluciones';

  if (mode !== 'firestore-lab') return;

  window.OrbitBackend = Object.assign({}, window.OrbitBackend || {}, {
    mode: 'firestore-lab',
    tenantId: tenant,
    tenant: tenant,
    loader: 'core/backend-lab-loader.js',
    firebaseLoader: 'pending',
    configLocal: 'core/auth-firebase.config.local.js',
    noFallback: true
  });

  function write(src){
    document.write('<script src="' + src + '"><\/script>');
  }

  try {
    write('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
    write('https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js');
    write('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js');
    write('core/auth-firebase.config.local.js');
    window.OrbitBackend.firebaseLoader = 'requested';
  } catch(e) {
    window.OrbitBackend.firebaseLoader = 'error';
    window.OrbitBackend.firebaseLoaderError = String(e && (e.message || e) || e);
  }
})();