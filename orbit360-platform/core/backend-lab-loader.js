/* ============================================================
   Orbit 360 - Backend LAB loader v1.104
   Loads Firebase SDK + local ignored config only for:
   ?orbitBackend=firestore-lab&tenant=alianzas-soluciones

   No secrets in repository. Local config remains ignored by Git.
   This file is frontend LAB plumbing, not production credential storage.
   ============================================================ */
(function(){
  'use strict';

  var params = new URLSearchParams(window.location.search || '');
  var requestedMode = params.get('orbitBackend') || '';
  var requestedTenant = params.get('tenant') || 'alianzas-soluciones';
  var allowedTenants = ['alianzas-soluciones'];

  if (requestedMode !== 'firestore-lab') return;

  if (allowedTenants.indexOf(requestedTenant) < 0) {
    window.OrbitBackend = Object.assign({}, window.OrbitBackend || {}, {
      mode: 'firestore-lab',
      tenantId: 'alianzas-soluciones',
      tenant: 'alianzas-soluciones',
      loader: 'core/backend-lab-loader.js',
      firebaseLoader: 'blocked-tenant',
      requestedTenant: requestedTenant,
      noFallback: true
    });
    try { console.warn('[Orbit Backend LAB] Tenant no permitido para LAB:', requestedTenant); } catch(e) {}
    return;
  }

  window.OrbitBackend = Object.assign({}, window.OrbitBackend || {}, {
    mode: 'firestore-lab',
    tenantId: requestedTenant,
    tenant: requestedTenant,
    loader: 'core/backend-lab-loader.js',
    loaderVersion: 'v1.104',
    firebaseLoader: 'pending',
    configLocal: 'core/auth-firebase.config.local.js',
    noFallback: true,
    restrictions: {
      noProduction: true,
      noSecretsInRepo: true,
      noSeedAsSource: true,
      noMainBranch: true
    }
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
