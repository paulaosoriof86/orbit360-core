/* Orbit 360 · Bootstrap genérico de configuración tenant para el Router.
   Lee el índice ya cargado y solicita únicamente la configuración activa.
   Carga contratos transversales, proveedor seguro y vínculo antes de router.js
   para evitar proyecciones tardías, estados falsos y doble render.
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
  var credentialProviderSrc = 'core/aseguradoras-credentials-provider-lab-v20260720.js?v=20260720-1';
  var secureTargetBridgeSrc = 'core/insurer-secure-target-bridge-v20260720.js?v=20260720-1';
  var importerContractSrc = 'core/importer-execution-contract-v20260720.js?v=20260720-2';
  var importerAcademySrc = 'data/academia-v1225-importadores-e2e.js?v=20260720-2';

  window.OrbitTenantBootstrapState = {
    owner: 'core/router.js',
    phase: 'shell-parse',
    tenantResolved: Boolean(tenantId),
    sourceResolved: Boolean(source),
    visualContractRequested: true,
    visualContractVersion: '20260720.2',
    credentialProviderRequested: true,
    credentialProviderVersion: '20260720.1',
    secureTargetBridgeRequested: true,
    secureTargetBridgeVersion: '20260720.1',
    importerContractRequested: true,
    importerContractVersion: '20260720.2',
    importerAcademyRequested: true,
    importerAcademyVersion: '1.226',
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
  var credentialProvider = safeSameOrigin(credentialProviderSrc, '/core/aseguradoras-credentials-provider-lab-v20260720.js');
  var secureTargetBridge = safeSameOrigin(secureTargetBridgeSrc, '/core/insurer-secure-target-bridge-v20260720.js');
  var importerContract = safeSameOrigin(importerContractSrc, '/core/importer-execution-contract-v20260720.js');
  var importerAcademy = safeSameOrigin(importerAcademySrc, '/data/academia-v1225-importadores-e2e.js');
  if (!visualScript || !visualStyle || !credentialProvider || !secureTargetBridge || !importerContract || !importerAcademy) {
    window.OrbitTenantBootstrapState.status = 'runtime-source-blocked';
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
    var providerHref = credentialProvider.pathname + credentialProvider.search;
    var bridgeHref = secureTargetBridge.pathname + secureTargetBridge.search;
    var importerContractHref = importerContract.pathname + importerContract.search;
    var importerAcademyHref = importerAcademy.pathname + importerAcademy.search;
    document.write('<link rel="stylesheet" href="' + styleHref.replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '" data-orbit-m1-visual-style="1">');
    document.write('<script src="' + importerContractHref.replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '" data-orbit-importer-execution-contract="1"><\/script>');
    document.write('<script src="' + importerAcademyHref.replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '" data-orbit-importers-e2e-academy="1"><\/script>');
    document.write('<script src="' + providerHref.replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '" data-orbit-insurer-credential-provider="1"><\/script>');
    document.write('<script src="' + bridgeHref.replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '" data-orbit-insurer-secure-target-bridge="1"><\/script>');
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

  function loadVisualContract() {
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
  }

  function loadSecureTargetBridge() {
    if (window.Orbit && window.Orbit.__insurerSecureTargetBridgeV20260720) {
      loadVisualContract();
      return;
    }
    var bridgeScript = document.createElement('script');
    bridgeScript.src = secureTargetBridge.pathname + secureTargetBridge.search;
    bridgeScript.async = false;
    bridgeScript.setAttribute('data-orbit-insurer-secure-target-bridge', '1');
    bridgeScript.addEventListener('load', loadVisualContract, { once: true });
    bridgeScript.addEventListener('error', function () { window.OrbitTenantBootstrapState.status = 'secure-target-bridge-error'; }, { once: true });
    document.head.appendChild(bridgeScript);
  }

  function loadCredentialProvider() {
    if (window.Orbit && window.Orbit.__insurerCredentialProviderLabV20260720) {
      loadSecureTargetBridge();
      return;
    }
    var providerScript = document.createElement('script');
    providerScript.src = credentialProvider.pathname + credentialProvider.search;
    providerScript.async = false;
    providerScript.setAttribute('data-orbit-insurer-credential-provider', '1');
    providerScript.addEventListener('load', loadSecureTargetBridge, { once: true });
    providerScript.addEventListener('error', function () { window.OrbitTenantBootstrapState.status = 'credential-provider-error'; }, { once: true });
    document.head.appendChild(providerScript);
  }

  function loadImporterAcademy() {
    if (window.Orbit && window.Orbit.ACADEMIA_V1225_IMPORTERS_E2E && window.Orbit.ACADEMIA_V1225_IMPORTERS_E2E.version === '1.226') {
      loadCredentialProvider();
      return;
    }
    var academyScript = document.createElement('script');
    academyScript.src = importerAcademy.pathname + importerAcademy.search;
    academyScript.async = false;
    academyScript.setAttribute('data-orbit-importers-e2e-academy', '1');
    academyScript.addEventListener('load', loadCredentialProvider, { once: true });
    academyScript.addEventListener('error', function () { window.OrbitTenantBootstrapState.status = 'importer-academy-error'; }, { once: true });
    document.head.appendChild(academyScript);
  }

  if (window.Orbit && window.Orbit.importerExecutionContractV20260720 && window.Orbit.importerExecutionContractV20260720.version === '20260720.2') {
    loadImporterAcademy();
    return;
  }

  var importerScript = document.createElement('script');
  importerScript.src = importerContract.pathname + importerContract.search;
  importerScript.async = false;
  importerScript.setAttribute('data-orbit-importer-execution-contract', '1');
  importerScript.addEventListener('load', loadImporterAcademy, { once: true });
  importerScript.addEventListener('error', function () { window.OrbitTenantBootstrapState.status = 'importer-contract-error'; }, { once: true });
  document.head.appendChild(importerScript);
})();
/* Preflight v7: contrato E2E legal y Academia cargados antes del Router. */
