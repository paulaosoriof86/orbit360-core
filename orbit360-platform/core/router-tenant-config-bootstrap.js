/* Orbit 360 · Bootstrap genérico de configuración tenant para el Router.
   Lee el índice ya cargado y solicita únicamente la configuración activa.
   No contiene datos de tenants, secretos ni credenciales. */
(function () {
  'use strict';

  var params = new URLSearchParams(window.location.search || '');
  var tenantId = String(params.get('tenant') || '').trim();
  var index = window.OrbitTenantRuntimeConfigIndex || {};
  var entry = tenantId && index[tenantId] ? index[tenantId] : null;
  var source = String(entry && entry.insurerConfigSrc || '').trim();

  window.OrbitTenantBootstrapState = {
    owner: 'core/router.js',
    phase: 'shell-parse',
    tenantResolved: Boolean(tenantId),
    sourceResolved: Boolean(source),
    status: source ? 'requested' : 'no-source'
  };

  if (!source) return;

  var target;
  try { target = new URL(source, window.location.href); }
  catch (error) {
    window.OrbitTenantBootstrapState.status = 'invalid-source';
    return;
  }

  var safePath = /^\/data\/tenant-[a-z0-9-]+-insurers-p10\.js$/i.test(target.pathname);
  if (target.origin !== window.location.origin || !safePath) {
    window.OrbitTenantBootstrapState.status = 'blocked-source';
    return;
  }

  if (document.readyState === 'loading') {
    var escaped = target.pathname.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    document.write('<script src="' + escaped + '" data-orbit-router-tenant-bootstrap="1"><\/script>');
    window.OrbitTenantBootstrapState.status = 'parser-requested';
    return;
  }

  var script = document.createElement('script');
  script.src = target.pathname;
  script.async = false;
  script.setAttribute('data-orbit-router-tenant-bootstrap', '1');
  script.addEventListener('load', function () { window.OrbitTenantBootstrapState.status = 'loaded'; }, { once: true });
  script.addEventListener('error', function () { window.OrbitTenantBootstrapState.status = 'error'; }, { once: true });
  document.head.appendChild(script);
})();
