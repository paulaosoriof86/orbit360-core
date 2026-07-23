/* Orbit 360 · Bootstrap genérico de configuración tenant para el Router.
   Carga contratos transversales, sesión, proveedores, política de campos,
   owners de lectura/edición y Academia antes de router.js.
   No contiene datos de tenants, secretos ni credenciales. */
(function () {
  'use strict';

  var CRITICAL_RELEASE = 'block1-critical-runtime-20260722-7';
  var params = new URLSearchParams(window.location.search || '');
  var tenantId = String(params.get('tenant') || '').trim();
  var index = window.OrbitTenantRuntimeConfigIndex || {};
  var entry = tenantId && index[tenantId] ? index[tenantId] : null;
  var source = String(entry && entry.insurerConfigSrc || '').trim();

  var sources = {
    visualStyle: ['styles/client-insurer-visual-contract-v20260720.css?v=20260722-6', '/styles/client-insurer-visual-contract-v20260720.css'],
    editStyle: ['styles/client-insurer-edit-mode-v20260722.css?v=20260722-1', '/styles/client-insurer-edit-mode-v20260722.css'],
    session: ['core/session-readiness-contract-v20260720.js?v=20260720-1', '/core/session-readiness-contract-v20260720.js'],
    importerContract: ['core/importer-execution-contract-v20260720.js?v=20260720-2', '/core/importer-execution-contract-v20260720.js'],
    importerAcademy: ['data/academia-v1225-importadores-e2e.js?v=20260720-3', '/data/academia-v1225-importadores-e2e.js'],
    credentialProvider: ['core/aseguradoras-credentials-provider-lab-v20260720.js?v=20260722-2', '/core/aseguradoras-credentials-provider-lab-v20260720.js'],
    secureTargetBridge: ['core/insurer-secure-target-bridge-v20260720.js?v=20260722-2', '/core/insurer-secure-target-bridge-v20260720.js'],
    operationalPolicy: ['core/operational-directory-field-policy-v20260722.js?v=20260722-1', '/core/operational-directory-field-policy-v20260722.js'],
    editOwner: ['core/client-insurer-edit-owner-v20260722.js?v=20260722-1', '/core/client-insurer-edit-owner-v20260722.js'],
    visualStability: ['core/client-insurer-visual-stability-barrier-v20260721.js?v=20260722-5', '/core/client-insurer-visual-stability-barrier-v20260721.js'],
    visualBase: ['core/client-insurer-visual-contract-v20260720.js?v=20260721-4', '/core/client-insurer-visual-contract-v20260720.js'],
    operationalOwner: ['core/client-insurer-operational-directory-owner-v20260722.js?v=20260722-1', '/core/client-insurer-operational-directory-owner-v20260722.js'],
    operationalAcademy: ['data/academia-v1230-operational-directory-v20260722.js?v=20260722-1', '/data/academia-v1230-operational-directory-v20260722.js']
  };

  window.OrbitTenantBootstrapState = {
    owner: 'core/router.js',
    phase: 'shell-parse',
    tenantResolved: Boolean(tenantId),
    sourceResolved: Boolean(source),
    criticalRelease: CRITICAL_RELEASE,
    visualStabilityRequested: true,
    visualStabilityVersion: '20260722.5',
    visualContractRequested: true,
    visualContractVersion: '20260720.2',
    visualContractDeliveryRevision: '20260722.7',
    editOwnerRequested: true,
    editOwnerVersion: '20260722.1',
    editStyleRequested: true,
    sessionReadinessRequested: true,
    sessionReadinessVersion: '20260720.1',
    credentialProviderRequested: true,
    credentialProviderVersion: '20260722.2',
    secureTargetBridgeRequested: true,
    secureTargetBridgeVersion: '20260722.2',
    importerContractRequested: true,
    importerContractVersion: '20260720.2',
    importerAcademyRequested: true,
    importerAcademyVersion: '1.227',
    operationalDirectoryPolicyRequested: true,
    operationalDirectoryPolicyVersion: '20260722.1',
    operationalDirectoryOwnerRequested: true,
    operationalDirectoryOwnerVersion: '20260722.1',
    operationalDirectoryAcademyRequested: true,
    operationalDirectoryAcademyVersion: '1.230',
    status: source ? 'requested' : 'visual-only'
  };

  function safeSameOrigin(value, expectedPath) {
    var target;
    try { target = new URL(value, window.location.href); }
    catch (error) { return null; }
    return target.origin === window.location.origin && target.pathname === expectedPath ? target : null;
  }
  var resolved = {};
  Object.keys(sources).forEach(function (key) { resolved[key] = safeSameOrigin(sources[key][0], sources[key][1]); });
  if (Object.keys(resolved).some(function (key) { return !resolved[key]; })) {
    window.OrbitTenantBootstrapState.status = 'runtime-source-blocked';
    return;
  }

  var tenantTarget = null;
  if (source) {
    try { tenantTarget = new URL(source, window.location.href); }
    catch (error) { window.OrbitTenantBootstrapState.status = 'invalid-source'; return; }
    if (tenantTarget.origin !== window.location.origin || !/^\/data\/tenant-[a-z0-9-]+-insurers-p10\.js$/i.test(tenantTarget.pathname)) {
      window.OrbitTenantBootstrapState.status = 'blocked-source';
      return;
    }
  }

  function escaped(target) { return (target.pathname + target.search).replace(/&/g, '&amp;').replace(/"/g, '&quot;'); }
  function writeScript(target, attribute) { document.write('<script src="' + escaped(target) + '" ' + attribute + '="1"><\/script>'); }
  function writeStyle(target, attribute) { document.write('<link rel="stylesheet" href="' + escaped(target) + '" ' + attribute + '="1">'); }

  if (document.readyState === 'loading') {
    writeStyle(resolved.visualStyle, 'data-orbit-m1-visual-style');
    writeStyle(resolved.editStyle, 'data-orbit-m1-edit-style');
    writeScript(resolved.session, 'data-orbit-session-readiness-contract');
    writeScript(resolved.importerContract, 'data-orbit-importer-execution-contract');
    writeScript(resolved.importerAcademy, 'data-orbit-importers-e2e-academy');
    writeScript(resolved.credentialProvider, 'data-orbit-insurer-credential-provider');
    writeScript(resolved.secureTargetBridge, 'data-orbit-insurer-secure-target-bridge');
    writeScript(resolved.operationalPolicy, 'data-orbit-operational-directory-policy');
    writeScript(resolved.editOwner, 'data-orbit-insurer-edit-owner');
    writeScript(resolved.visualStability, 'data-orbit-insurer-visual-stability');
    writeScript(resolved.visualBase, 'data-orbit-m1-visual-contract');
    writeScript(resolved.operationalOwner, 'data-orbit-operational-directory-owner');
    writeScript(resolved.operationalAcademy, 'data-orbit-operational-directory-academy');
    if (tenantTarget) {
      document.write('<script src="' + escaped(tenantTarget) + '" data-orbit-router-tenant-bootstrap="1"><\/script>');
      window.OrbitTenantBootstrapState.status = 'parser-requested';
    } else window.OrbitTenantBootstrapState.status = 'visual-parser-requested';
    return;
  }

  function ensureStyle(target, attribute) {
    if (document.querySelector('link[' + attribute + ']')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = target.pathname + target.search;
    link.setAttribute(attribute, '1');
    document.head.appendChild(link);
  }
  ensureStyle(resolved.visualStyle, 'data-orbit-m1-visual-style');
  ensureStyle(resolved.editStyle, 'data-orbit-m1-edit-style');

  function loadScript(target, attribute, ready, next, errorStatus) {
    if (ready()) { next(); return; }
    var script = document.createElement('script');
    script.src = target.pathname + target.search;
    script.async = false;
    script.setAttribute(attribute, '1');
    script.addEventListener('load', next, { once: true });
    script.addEventListener('error', function () { window.OrbitTenantBootstrapState.status = errorStatus; }, { once: true });
    document.head.appendChild(script);
  }
  function loadTenantConfig() {
    if (!tenantTarget) { window.OrbitTenantBootstrapState.status = 'visual-loaded'; return; }
    var script = document.createElement('script');
    script.src = tenantTarget.pathname + tenantTarget.search;
    script.async = false;
    script.setAttribute('data-orbit-router-tenant-bootstrap', '1');
    script.addEventListener('load', function () { window.OrbitTenantBootstrapState.status = 'loaded'; }, { once: true });
    script.addEventListener('error', function () { window.OrbitTenantBootstrapState.status = 'error'; }, { once: true });
    document.head.appendChild(script);
  }
  function loadOperationalAcademy() { loadScript(resolved.operationalAcademy, 'data-orbit-operational-directory-academy', function () { return !!(window.Orbit && Orbit.academiaOperationalDirectoryV20260722 && Orbit.academiaOperationalDirectoryV20260722.version === '1.230'); }, loadTenantConfig, 'operational-directory-academy-error'); }
  function loadOperationalOwner() { loadScript(resolved.operationalOwner, 'data-orbit-operational-directory-owner', function () { return !!(window.Orbit && Orbit.clientInsurerOperationalDirectoryOwnerV20260722 && Orbit.clientInsurerOperationalDirectoryOwnerV20260722.version === '20260722.1'); }, loadOperationalAcademy, 'operational-directory-owner-error'); }
  function loadVisualBase() { loadScript(resolved.visualBase, 'data-orbit-m1-visual-contract', function () { return !!(window.Orbit && Orbit.clientInsurerVisualContractV20260720 && Orbit.clientInsurerVisualContractV20260720.version === '20260720.2'); }, loadOperationalOwner, 'visual-error'); }
  function loadVisualStability() { loadScript(resolved.visualStability, 'data-orbit-insurer-visual-stability', function () { return !!(window.Orbit && Orbit.__clientInsurerVisualStabilityBarrierV20260721 && Orbit.__clientInsurerVisualStabilityBarrierV20260721.version === '20260722.5'); }, loadVisualBase, 'visual-stability-error'); }
  function loadEditOwner() { loadScript(resolved.editOwner, 'data-orbit-insurer-edit-owner', function () { return !!(window.Orbit && Orbit.clientInsurerEditOwnerV20260722 && Orbit.clientInsurerEditOwnerV20260722.version === '20260722.1'); }, loadVisualStability, 'edit-owner-error'); }
  function loadOperationalPolicy() { loadScript(resolved.operationalPolicy, 'data-orbit-operational-directory-policy', function () { return !!(window.Orbit && Orbit.operationalDirectoryFieldPolicyV20260722 && Orbit.operationalDirectoryFieldPolicyV20260722.version === '20260722.1'); }, loadEditOwner, 'operational-directory-policy-error'); }
  function loadSecureTargetBridge() { loadScript(resolved.secureTargetBridge, 'data-orbit-insurer-secure-target-bridge', function () { return !!(window.Orbit && Orbit.__insurerSecureTargetBridgeV20260720); }, loadOperationalPolicy, 'secure-target-bridge-error'); }
  function loadCredentialProvider() { loadScript(resolved.credentialProvider, 'data-orbit-insurer-credential-provider', function () { return !!(window.Orbit && Orbit.__insurerCredentialProviderLabV20260720); }, loadSecureTargetBridge, 'credential-provider-error'); }
  function loadImporterAcademy() { loadScript(resolved.importerAcademy, 'data-orbit-importers-e2e-academy', function () { return !!(window.Orbit && Orbit.ACADEMIA_V1225_IMPORTERS_E2E && Orbit.ACADEMIA_V1225_IMPORTERS_E2E.version === '1.227'); }, loadCredentialProvider, 'importer-academy-error'); }
  function loadImporterContract() { loadScript(resolved.importerContract, 'data-orbit-importer-execution-contract', function () { return !!(window.Orbit && Orbit.importerExecutionContractV20260720 && Orbit.importerExecutionContractV20260720.version === '20260720.2'); }, loadImporterAcademy, 'importer-contract-error'); }
  loadScript(resolved.session, 'data-orbit-session-readiness-contract', function () { return !!(window.Orbit && Orbit.sessionReadinessContractV20260720 && Orbit.sessionReadinessContractV20260720.version === '20260720.1'); }, loadImporterContract, 'session-readiness-error');
})();
/* Preflight 1.0.39: Router carga política operativa, owner de edición, barrera edit-aware, lectura y Academia. */
