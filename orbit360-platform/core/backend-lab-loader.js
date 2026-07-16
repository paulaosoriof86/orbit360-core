/* ============================================================
   Orbit 360 - Backend LAB loader v1.110
   Loads Firebase SDK only for:
   ?orbitBackend=firestore-lab&tenant=alianzas-soluciones

   En el canal Hosting LAB normaliza cualquier acceso directo antes
   de cargar el prototipo, para impedir fallback demo por URL incompleta.
   Local: uses ignored core/auth-firebase.config.local.js.
   Firebase Hosting preview: uses reserved /__/firebase/init.js.
   No secrets are versioned.
   ============================================================ */
(function(){
  'use strict';

  var LAB_RUNTIME = '20260716-2';
  var hostname = String(window.location.hostname || '').toLowerCase();
  var isAuthorizedLabHost = /^ays-orbit-360-lab--orbit360-ays-lab-[a-z0-9-]+\.web\.app$/i.test(hostname);
  var initialParams = new URLSearchParams(window.location.search || '');

  if (isAuthorizedLabHost) {
    var canonicalMode = initialParams.get('orbitBackend') === 'firestore-lab';
    var canonicalTenant = initialParams.get('tenant') === 'alianzas-soluciones';
    var canonicalRuntime = initialParams.get('runtime') === LAB_RUNTIME;

    if (!canonicalMode || !canonicalTenant || !canonicalRuntime) {
      var targetHash = window.location.hash && window.location.hash !== '#'
        ? window.location.hash
        : '#/aseguradoras';
      window.location.replace(
        'index.html?orbitBackend=firestore-lab&tenant=alianzas-soluciones&runtime=' +
        encodeURIComponent(LAB_RUNTIME) + targetHash
      );
      return;
    }
  }

  var params = new URLSearchParams(window.location.search || '');
  var requestedMode = params.get('orbitBackend') || '';
  var requestedTenant = params.get('tenant') || 'alianzas-soluciones';
  var allowedTenants = ['alianzas-soluciones'];
  var isFirebaseHosting = /\.(web\.app|firebaseapp\.com)$/i.test(window.location.hostname || '');
  var configSource = isFirebaseHosting ? '/__/firebase/init.js' : 'core/auth-firebase.config.local.js';

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
    loaderVersion: 'v1.110',
    runtimeVersion: LAB_RUNTIME,
    firebaseLoader: 'pending',
    configSource: isFirebaseHosting ? 'firebase-hosting-reserved-init' : 'local-ignored-config',
    configLocal: isFirebaseHosting ? null : 'core/auth-firebase.config.local.js',
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
    write(configSource);
    window.OrbitBackend.firebaseLoader = 'requested';
  } catch(e) {
    window.OrbitBackend.firebaseLoader = 'error';
    window.OrbitBackend.firebaseLoaderError = String(e && (e.message || e) || e);
  }
})();
