/* Orbit 360 · Bootstrap genérico de configuración tenant para el Router.
   Lee el índice ya cargado y solicita únicamente la configuración activa.
   Carga el contrato visual/operativo Cliente 360 + Aseguradoras antes de
   router.js para evitar proyecciones tardías y doble render.
   No contiene datos de tenants, secretos ni credenciales. */
(function () {
  'use strict';

  var params = new URLSearchParams(window.location.search || '');
  var tenantId = String(params.get('tenant') || '').trim();
  var index = window.OrbitTenantRuntimeConfigIndex || {};
  var entry = tenantId && index[tenantId] ? index[tenantId] : null;
  var source = String(entry && entry.insurerConfigSrc || '').trim();
  var visualScriptSrc = 'core/client-insurer-visual-contract-v20260720.js?v=20260720-2';
  var visualStyleSrc = 'styles/client-insurer-visual-contract-v20260720.css?v=20260720-2';

  window.OrbitTenantBootstrapState = {
    owner: 'core/router.js',
    phase: 'shell-parse',
    tenantResolved: Boolean(tenantId),
    sourceResolved: Boolean(source),
    visualContractRequested: true,
    visualContractVersion: '20260720.2',
    status: source ? 'requested' : 'visual-only'
  };

  function safeSameOrigin(value, expectedPath) {
    var target;
    try { target = new URL(value, window.location.href); }
    catch (error) { return null; }
    if (target.origin !== window.location.origin || target.pathname !== expectedPath) return null;
    return target;
  }

  var visualScript = safeSameOrigin(visualScriptSrc, '/core/client-insurer-visual-contract-v20260720.js');
  var visualStyle = safeSameOrigin(visualStyleSrc, '/styles/client-insurer-visual-contract-v20260720.css');
  if (!visualScript || !visualStyle) {
    window.OrbitTenantBootstrapState.status = 'visual-source-blocked';
    return;
  }

  var target = null;
  if (source) {
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
  }

  if (document.readyState === 'loading') {
    var styleHref = visualStyle.pathname + visualStyle.search;
    var scriptHref = visualScript.pathname + visualScript.search;
    document.write('<link rel="stylesheet" href="' + styleHref.replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '" data-orbit-m1-visual-style="1">');
    document.write('<script src="' + scriptHref.replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '" data-orbit-m1-visual-contract="1"><\/script>');
    if (target) {
      var escaped = (target.pathname + target.search).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
      document.write('<script src="' + escaped + '" data-orbit-router-tenant-bootstrap="1"><\/script>');
      window.OrbitTenantBootstrapState.status = 'parser-requested';
    } else {
      window.OrbitTenantBootstrapState.status = 'visual-parser-requested';
    }
    return;
  }

  if (!document.querySelector('link[data-orbit-m1-visual-style]')) {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = visualStyle.pathname + visualStyle.search;
    link.setAttribute('data-orbit-m1-visual-style', '1');
    document.head.appendChild(link);
  }

  function loadTenantConfig() {
    if (!target) {
      window.OrbitTenantBootstrapState.status = 'visual-loaded';
      return;
    }
    var tenantScript = document.createElement('script');
    tenantScript.src = target.pathname + target.search;
    tenantScript.async = false;
    tenantScript.setAttribute('data-orbit-router-tenant-bootstrap', '1');
    tenantScript.addEventListener('load', function () { window.OrbitTenantBootstrapState.status = 'loaded'; }, { once: true });
    tenantScript.addEventListener('error', function () { window.OrbitTenantBootstrapState.status = 'error'; }, { once: true });
    document.head.appendChild(tenantScript);
  }

  if (window.Orbit && window.Orbit.clientInsurerVisualContractV20260720 && window.Orbit.clientInsurerVisualContractV20260720.version === '20260720.2') {
    loadTenantConfig();
    return;
  }

  var script = document.createElement('script');
  script.src = visualScript.pathname + visualScript.search;
  script.async = false;
  script.setAttribute('data-orbit-m1-visual-contract', '1');
  script.addEventListener('load', loadTenantConfig, { once: true });
  script.addEventListener('error', function () { window.OrbitTenantBootstrapState.status = 'visual-error'; }, { once: true });
  document.head.appendChild(script);
})();
/* Preflight v5 reconciliado: sin cambios de producto. */
