/* ============================================================
   Orbit 360 - Backend LAB loader v1.113
   Loads Firebase SDK for the canonical A&S Hosting site and for
   authorized preview channels. Any direct canonical access is
   normalized before the prototype can fall back to demo data.

   Canonical A&S runtime:
   ?orbitBackend=firestore-lab&tenant=alianzas-soluciones

   Local: uses ignored core/auth-firebase.config.local.js.
   Firebase Hosting: uses reserved /__/firebase/init.js.
   No secrets are versioned.
   ============================================================ */
(function(){
  'use strict';

  var LAB_RUNTIME = '20260717-2';
  var hostname = String(window.location.hostname || '').toLowerCase();
  var isCanonicalLabHost = hostname === 'ays-orbit-360-lab.web.app' || hostname === 'ays-orbit-360-lab.firebaseapp.com';
  var isAysPreviewLabHost = /^ays-orbit-360-lab--orbit360-ays-lab-[a-z0-9-]+\.web\.app$/i.test(hostname);
  var isOperationalVerificationPreviewHost = /^ays-orbit-360-lab--orbit360-operational-block12-[a-z0-9-]+\.web\.app$/i.test(hostname);
  var isAuthorizedLabHost = isCanonicalLabHost || isAysPreviewLabHost || isOperationalVerificationPreviewHost;
  var isTenantBoundAysHost = isCanonicalLabHost || isAysPreviewLabHost;
  var initialParams = new URLSearchParams(window.location.search || '');

  if (isTenantBoundAysHost) {
    var canonicalMode = initialParams.get('orbitBackend') === 'firestore-lab';
    var canonicalTenant = initialParams.get('tenant') === 'alianzas-soluciones';
    var canonicalRuntime = initialParams.get('runtime') === LAB_RUNTIME;

    if (!canonicalMode || !canonicalTenant || !canonicalRuntime) {
      var targetHash = window.location.hash && window.location.hash !== '#'
        ? window.location.hash
        : '#/cliente360';
      window.location.replace(
        'index.html?orbitBackend=firestore-lab&tenant=alianzas-soluciones&runtime=' +
        encodeURIComponent(LAB_RUNTIME) + targetHash
      );
      return;
    }
  }

  var params = new URLSearchParams(window.location.search || '');
  var requestedMode = params.get('orbitBackend') || (isAuthorizedLabHost ? 'firestore-lab' : '');
  var requestedTenant = params.get('tenant') || 'alianzas-soluciones';
  var verificationMode = /^(1|auto)$/i.test(params.get('orbitVerify') || '');
  var isSyntheticVerificationTenant = isOperationalVerificationPreviewHost && verificationMode && /^verify-block12-[0-9]+$/.test(requestedTenant);
  var allowedTenants = ['alianzas-soluciones'];
  if (isSyntheticVerificationTenant) allowedTenants.push(requestedTenant);
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
    loaderVersion: 'v1.113-synthetic-verification-fail-closed',
    runtimeVersion: LAB_RUNTIME,
    canonicalHost: isCanonicalLabHost,
    operationalVerificationPreview: isOperationalVerificationPreviewHost,
    syntheticVerificationTenant: isSyntheticVerificationTenant,
    firebaseLoader: 'pending',
    configSource: isFirebaseHosting ? 'firebase-hosting-reserved-init' : 'local-ignored-config',
    configLocal: isFirebaseHosting ? null : 'core/auth-firebase.config.local.js',
    noFallback: true,
    restrictions: {
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
