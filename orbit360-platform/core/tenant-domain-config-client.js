/* ============================================================
   Orbit 360 · Configuración autoadministrable de dominios
   Usa Orbit.tenant como fuente local del prototipo y sincroniza con
   el servicio protegido cuando la compuerta runtime está activa.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  const VERSION = 'orbit360-tenant-domain-config-client-v1';
  const FUNCTION_NAME = 'orbit360TenantDomainConfig';
  const text = value => String(value == null ? '' : value).trim();
  const clone = value => { try { return JSON.parse(JSON.stringify(value)); } catch (e) { return Object.assign({}, value || {}); } };
  const backend = () => window.OrbitBackend || {};
  const tenantId = () => text(backend().tenantId || backend().tenant || (Orbit.tenant && Orbit.tenant.get && Orbit.tenant.get().id));
  const region = () => text(backend().functionsRegion || 'us-central1');
  const enabled = () => !!((backend().featureFlags || {}).tenantDomainConfigBackendActive === true);
  const available = () => !!(enabled() && tenantId() && window.firebase && typeof firebase.functions === 'function');

  function defaultWorkflow() {
    const stages = {};
    const list = (Orbit.ciclo && Orbit.ciclo.ETAPAS) || [];
    list.forEach(stage => {
      const id = text(stage.id);
      stages[id] = {
        label: text(stage.label || stage.leads || id),
        leads: stage.leads !== null && stage.leads !== false,
        ops: !!stage.ops,
        opsList: text(stage.ops || ''),
        terminal: ['emitido', 'perdido'].includes(id),
        next: [],
        probability: 0,
        slaHours: stage.ops ? 48 : 72
      };
    });
    const flow = (Orbit.ciclo && Orbit.ciclo.FLUJO) || Object.keys(stages);
    flow.forEach((id, index) => { if (stages[id] && flow[index + 1]) stages[id].next = [flow[index + 1]]; });
    if (stages.negociacion) stages.negociacion.next = ['inspeccion', 'emision', 'perdido'];
    if (stages.propuesta) stages.propuesta.next = ['negociacion', 'inspeccion', 'emision', 'perdido'];
    if (stages.perdido) stages.perdido.next = ['contactado'];
    return {
      storageMode: 'legacyCompatible', stages,
      notificationChannels: ['portal', 'in_app'],
      advisorManagementProjection: true,
      portalResponseEnabled: true,
      cadenceEnabled: true,
      escalationEnabled: true,
      duplicateDetectionEnabled: true,
      defaultManagementSlaHours: 72,
      priorities: ['Baja', 'Media', 'Alta', 'Crítica'],
      managementTypes: []
    };
  }
  function defaultReconciliation() {
    return {
      inferenceEnabled: true,
      commissionRecognitionEnabled: true,
      commissionSequenceEnabled: true,
      completePortfolioSequenceEnabled: true,
      bankSupportRequiresCounterpart: true,
      absenceAloneNeverReconciles: true,
      amountTolerance: 0.02,
      dateToleranceDays: 7,
      requireSameCurrency: true,
      requireSameTerm: true,
      holdOnNegative: true,
      holdOnReversal: true,
      holdOnDuplicate: true,
      humanConfirmationRequired: true,
      evidencePriority: ['INSURER_PAYMENT', 'COMMISSION_RECOGNITION', 'PORTFOLIO_SNAPSHOT', 'PLATFORM_PAYMENT_REPORT', 'BANK_SUPPORT']
    };
  }
  function defaults(domain) { return domain === 'workflow' ? defaultWorkflow() : defaultReconciliation(); }
  function localGet(domain) {
    try {
      const tenant = Orbit.tenant && Orbit.tenant.get ? Orbit.tenant.get() : {};
      const config = tenant && tenant.domainConfig && tenant.domainConfig[domain];
      return Object.assign({}, defaults(domain), clone(config || {}));
    } catch (e) { return defaults(domain); }
  }
  function localSave(domain, config) {
    if (!Orbit.tenant || !Orbit.tenant.get || !Orbit.tenant.setDeep) return config;
    const current = Orbit.tenant.get().domainConfig || {};
    current[domain] = clone(config);
    Orbit.tenant.setDeep('domainConfig', current);
    return config;
  }
  function callable() {
    if (!available()) throw new Error('TENANT_DOMAIN_CONFIG_BACKEND_NOT_ACTIVE');
    return firebase.app().functions(region()).httpsCallable(FUNCTION_NAME);
  }
  async function get(domain) {
    const local = localGet(domain);
    if (!available()) return { ok: true, domain, config: local, source: 'tenant' };
    try {
      const response = await callable()({ tenantId: tenantId(), action: 'get', domain });
      const data = response && response.data ? response.data : response;
      if (data && data.config) localSave(domain, data.config);
      return Object.assign({ source: 'tenant' }, data || {}, { config: data && data.config ? data.config : local });
    } catch (error) {
      return { ok: true, domain, config: local, source: 'tenant', syncPending: true, error: text(error && (error.message || error)) };
    }
  }
  async function save(domain, config, reason) {
    const stored = localSave(domain, config);
    if (!available()) return { ok: true, domain, config: stored, source: 'tenant', syncPending: true };
    const response = await callable()({ tenantId: tenantId(), action: 'save', domain, config: stored, reason: text(reason || 'Configuración actualizada desde Orbit 360') });
    const data = response && response.data ? response.data : response;
    if (data && data.config) localSave(domain, data.config);
    return Object.assign({ source: 'protected' }, data || {}, { config: data && data.config ? data.config : stored });
  }
  function status() { return Object.freeze({ version: VERSION, functionName: FUNCTION_NAME, tenantId: tenantId(), enabled: enabled(), available: available() }); }

  Orbit.domainConfig = Object.freeze({ VERSION, defaults, get, save, status });
})();
