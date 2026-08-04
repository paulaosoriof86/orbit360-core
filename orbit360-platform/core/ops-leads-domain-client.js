/* ============================================================
   Orbit 360 · Cliente de dominio Ops/Leads
   Adaptador genérico para el callable protegido. No contiene tenant,
   nombres, correos, roles fijos ni datos A&S.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  const VERSION = 'orbit360-ops-leads-domain-client-v1';
  const FUNCTION_NAME = (window.OrbitBackend && OrbitBackend.functionNames && OrbitBackend.functionNames.opsLeads) || 'orbit360OpsLeadsCommand';
  const text = value => String(value == null ? '' : value).trim();

  function backend() { return window.OrbitBackend || {}; }
  function tenantId() { return text(backend().tenantId || backend().tenant); }
  function region() { return text(backend().functionsRegion || 'us-central1'); }
  function enabled() {
    const flags = backend().featureFlags || {};
    return flags.opsLeadsDomainBackendActive === true;
  }
  function available() {
    return !!(enabled() && tenantId() && window.firebase && typeof firebase.functions === 'function');
  }
  function callable() {
    if (!available()) throw new Error('OPS_LEADS_DOMAIN_BACKEND_NOT_ACTIVE');
    return firebase.app().functions(region()).httpsCallable(FUNCTION_NAME);
  }
  function requestId(operation, entityId, payload) {
    const marker = [VERSION, tenantId(), operation, entityId || '', payload && (payload.updatedAt || payload.actualizado || payload.id) || '', Date.now()].join('|');
    let hash = 2166136261;
    for (let i = 0; i < marker.length; i += 1) { hash ^= marker.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    return 'wfui_' + (hash >>> 0).toString(16) + '_' + Date.now().toString(36);
  }
  async function command(operation, options) {
    options = options || {};
    const data = {
      tenantId: tenantId(),
      operation,
      entityId: text(options.entityId || (options.payload && options.payload.id)),
      payload: options.payload || {},
      reason: text(options.reason || options.motivo || 'Cambio realizado desde Orbit 360'),
      requestId: text(options.requestId || requestId(operation, options.entityId, options.payload))
    };
    const result = await callable()(data);
    return result && result.data ? result.data : result;
  }
  function status() {
    return Object.freeze({ version: VERSION, functionName: FUNCTION_NAME, tenantId: tenantId(), region: region(), enabled: enabled(), available: available() });
  }

  Orbit.workflowDomain = Object.freeze({ VERSION, FUNCTION_NAME, enabled, available, command, status });
})();
