/* ============================================================
   Orbit 360 · Cliente de dominio Cobros/Conciliaciones
   Callable genérico por tenant. No aplica pagos sin confirmación.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  const VERSION = 'orbit360-cobros-reconciliation-client-v1';
  const FUNCTION_NAME = (window.OrbitBackend && OrbitBackend.functionNames && OrbitBackend.functionNames.reconciliation) || 'orbit360CobrosReconciliationCommand';
  const text = value => String(value == null ? '' : value).trim();
  const backend = () => window.OrbitBackend || {};
  const tenantId = () => text(backend().tenantId || backend().tenant);
  const region = () => text(backend().functionsRegion || 'us-central1');
  const enabled = () => !!((backend().featureFlags || {}).cobrosReconciliationDomainActive === true);
  const available = () => !!(enabled() && tenantId() && window.firebase && typeof firebase.functions === 'function');

  function callable() {
    if (!available()) throw new Error('COBROS_RECONCILIATION_BACKEND_NOT_ACTIVE');
    return firebase.app().functions(region()).httpsCallable(FUNCTION_NAME);
  }
  function makeRequestId(operation, payload) {
    const marker = [VERSION, tenantId(), operation, payload && (payload.proposalId || payload.polizaId || payload.id) || '', Date.now()].join('|');
    let hash = 2166136261;
    for (let i = 0; i < marker.length; i += 1) { hash ^= marker.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    return 'recui_' + (hash >>> 0).toString(16) + '_' + Date.now().toString(36);
  }
  async function command(operation, options) {
    options = options || {};
    const payload = options.payload || {};
    const response = await callable()({
      tenantId: tenantId(),
      operation,
      payload,
      reason: text(options.reason || options.motivo || 'Acción de conciliación desde Orbit 360'),
      requestId: text(options.requestId || makeRequestId(operation, payload))
    });
    return response && response.data ? response.data : response;
  }
  function previewPolicy(polizaId) {
    return command('preview_policy', { payload: { polizaId }, reason: 'Vista previa inferencial sin aplicar pagos' });
  }
  function confirmProposal(proposalId, options) {
    options = options || {};
    return command('confirm_application', {
      payload: Object.assign({ proposalId }, options.payload || {}),
      reason: options.reason || options.motivo || 'Conciliación confirmada por usuario autorizado'
    });
  }
  function holdProposal(proposalId, motivo, accionRequerida) {
    return command('hold_proposal', { payload: { proposalId, accionRequerida }, reason: motivo });
  }
  function status() {
    return Object.freeze({ version: VERSION, functionName: FUNCTION_NAME, tenantId: tenantId(), region: region(), enabled: enabled(), available: available() });
  }

  Orbit.reconciliationDomain = Object.freeze({ VERSION, FUNCTION_NAME, enabled, available, command, previewPolicy, confirmProposal, holdProposal, status });
})();
