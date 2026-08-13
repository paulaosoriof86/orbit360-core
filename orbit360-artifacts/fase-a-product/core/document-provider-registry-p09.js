/* ============================================================
   Orbit 360 · P0.9 · Registro reusable de providers documentales
   Fecha: 2026-07-10

   Registro backend-agnostic para parsing Excel/PDF, OCR y análisis
   semántico. No contiene secretos, no llama red, no escribe store.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  var TASKS = [
    'pdf_manifest', 'pdf_ocr', 'pdf_semantic',
    'excel_manifest', 'excel_semantic',
    'entity_matching', 'consultative_reasoning'
  ];
  var PURPOSES = ['training', 'operational'];
  var STATUS = ['connected', 'degraded', 'backend_required', 'disabled'];
  var FORBIDDEN_KEYS = /^(?:api_?key|token|access_?token|refresh_?token|secret|password|passwd|authorization|credential|credentials|private_?key|client_?secret|raw_?bytes|binary_?payload|base64)$/i;

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function clone(value) { return JSON.parse(JSON.stringify(value == null ? null : value)); }
  function unique(values) { return Array.from(new Set((values || []).filter(Boolean))); }
  function sanitize(value, depth) {
    depth = depth || 0;
    if (depth > 12 || value == null) return value == null ? value : '[depth_limited]';
    if (Array.isArray(value)) return value.slice(0, 2000).map(function (item) { return sanitize(item, depth + 1); });
    if (typeof value !== 'object') return value;
    var out = {};
    Object.keys(value).forEach(function (key) {
      if (FORBIDDEN_KEYS.test(key)) return;
      out[key] = sanitize(value[key], depth + 1);
    });
    return out;
  }
  function normalizeTasks(tasks) {
    return unique([].concat(tasks || []).map(clean).filter(function (task) { return TASKS.indexOf(task) >= 0; }));
  }
  function normalizeStatus(value) {
    var status = clean(value || 'backend_required');
    return STATUS.indexOf(status) >= 0 ? status : 'backend_required';
  }
  function taskMethod(provider, task) {
    if (!provider) return null;
    if (typeof provider.execute === 'function') return function (request) { return provider.execute(task, request); };
    var methods = {
      pdf_manifest: ['extractPdfManifest', 'extractManifest', 'inspectPdf'],
      pdf_ocr: ['ocrPdf', 'ocr'],
      pdf_semantic: ['analyzePdf', 'analyzeSemantic', 'analyze'],
      excel_manifest: ['extractExcelManifest', 'extractManifest', 'inspectExcel'],
      excel_semantic: ['analyzeExcel', 'analyzeSemantic', 'analyze'],
      entity_matching: ['matchEntity', 'match'],
      consultative_reasoning: ['reason', 'analyze']
    };
    var name = (methods[task] || []).find(function (candidate) { return typeof provider[candidate] === 'function'; });
    return name ? function (request) { return provider[name](request); } : null;
  }
  function validateRequest(task, request) {
    request = request || {};
    var errors = [];
    if (TASKS.indexOf(task) < 0) errors.push('TASK_INVALID');
    if (!clean(request.tenantId)) errors.push('TENANT_REQUIRED');
    if (!clean(request.aseguradoraId || request.insurerId || request.entityId)) errors.push('INSURER_REQUIRED');
    if (!clean(request.documentId)) errors.push('DOCUMENT_REQUIRED');
    if (!clean(request.fileRef || request.sourceRef)) errors.push('SOURCE_REF_REQUIRED');
    if (PURPOSES.indexOf(clean(request.purpose || 'training')) < 0) errors.push('PURPOSE_INVALID');
    return { valid: errors.length === 0, errors: errors };
  }
  function policyFor(config, task) {
    config = config || {};
    var root = config.documentIntelligence || config.inteligenciaDocumental || config;
    var tasks = root.tasks || root.tareas || {};
    var row = tasks[task] || {};
    return {
      primary: clean(row.primary || row.primario || root.primary || root.primario),
      fallbacks: unique([].concat(row.fallbacks || row.fallback || root.fallbacks || []).map(clean)),
      enabled: row.enabled !== false && row.activo !== false,
      allowExternalAi: row.allowExternalAi !== false && root.allowExternalAi !== false,
      allowedRegions: unique([].concat(row.allowedRegions || root.allowedRegions || []).map(clean)),
      maxPages: Number(row.maxPages || root.maxPages || 0),
      maxCost: Number(row.maxCost || root.maxCost || 0)
    };
  }

  var providers = {};

  function register(id, provider, metadata) {
    id = clean(id);
    metadata = metadata || {};
    if (!id) throw new Error('PROVIDER_ID_REQUIRED');
    providers[id] = {
      id: id,
      provider: provider || {},
      metadata: sanitize({
        name: clean(metadata.name || id),
        tasks: normalizeTasks(metadata.tasks),
        status: normalizeStatus(metadata.status || (provider ? 'connected' : 'backend_required')),
        region: clean(metadata.region),
        externalAi: metadata.externalAi === true,
        deterministic: metadata.deterministic === true,
        version: clean(metadata.version),
        notes: clean(metadata.notes)
      })
    };
    return status(id);
  }
  function unregister(id) { delete providers[clean(id)]; }
  function status(id) {
    var row = providers[clean(id)];
    if (!row) return { id: clean(id), status: 'backend_required', tasks: [], connected: false };
    return Object.assign({}, clone(row.metadata), { id: row.id, connected: row.metadata.status === 'connected' });
  }
  function list() { return Object.keys(providers).map(status); }
  function candidates(task, config) {
    var policy = policyFor(config, task);
    if (!policy.enabled) return [];
    var ordered = unique([policy.primary].concat(policy.fallbacks).filter(Boolean));
    if (!ordered.length) {
      ordered = Object.keys(providers).filter(function (id) {
        var row = providers[id];
        return row.metadata.tasks.indexOf(task) >= 0;
      });
    }
    return ordered.map(function (id) { return providers[id]; }).filter(function (row) {
      if (!row || row.metadata.status !== 'connected') return false;
      if (row.metadata.tasks.indexOf(task) < 0) return false;
      if (!policy.allowExternalAi && row.metadata.externalAi) return false;
      if (policy.allowedRegions.length && row.metadata.region && policy.allowedRegions.indexOf(row.metadata.region) < 0) return false;
      return !!taskMethod(row.provider, task);
    });
  }
  function resolve(task, config) {
    var rows = candidates(task, config);
    if (!rows.length) return { ok: false, code: 'BACKEND_REQUIRED', providerId: '', provider: null, policy: policyFor(config, task) };
    return { ok: true, code: 'PROVIDER_READY', providerId: rows[0].id, provider: rows[0], policy: policyFor(config, task) };
  }
  async function execute(task, request, options) {
    request = sanitize(request || {});
    options = options || {};
    var validation = validateRequest(task, request);
    if (!validation.valid) return { ok: false, code: validation.errors[0], errors: validation.errors, writeAllowed: false };
    var resolved = resolve(task, options.tenantConfig || options.config || {});
    if (!resolved.ok) return { ok: false, code: resolved.code, errors: [resolved.code], writeAllowed: false, provider: null };
    var method = taskMethod(resolved.provider.provider, task);
    var startedAt = new Date().toISOString();
    try {
      var response = sanitize(await method(Object.assign({}, request, {
        task: task,
        purpose: clean(request.purpose || 'training'),
        returnRawBytes: false,
        returnBase64: false,
        returnTokens: false,
        executeEmbeddedContent: false
      })));
      if (response && response.flags && (response.flags.containsCustomerPayload === true || response.flags.containsSecrets === true)) {
        return { ok: false, code: response.flags.containsCustomerPayload === true ? 'CUSTOMER_PAYLOAD_FORBIDDEN' : 'SECRETS_FORBIDDEN', errors: ['PROVIDER_RESULT_NOT_METADATA_ONLY'], writeAllowed: false };
      }
      return {
        ok: true,
        code: 'PROVIDER_EXECUTION_READY_FOR_REVIEW',
        provider: { id: resolved.providerId, name: resolved.provider.metadata.name, version: resolved.provider.metadata.version },
        task: task,
        request: sanitize(request),
        result: response,
        audit: {
          eventType: 'document_provider_execution', tenantId: clean(request.tenantId),
          aseguradoraId: clean(request.aseguradoraId || request.insurerId || request.entityId),
          documentId: clean(request.documentId), task: task, providerId: resolved.providerId,
          purpose: clean(request.purpose || 'training'), startedAt: startedAt,
          completedAt: new Date().toISOString(), containsRawPayload: false,
          containsSecrets: false, requiresHumanValidation: true
        },
        writeAllowed: false,
        requiresHumanValidation: true
      };
    } catch (error) {
      return {
        ok: false, code: clean(error && error.code) || 'PROVIDER_EXECUTION_FAILED',
        errors: [clean(error && error.message) || 'Provider execution failed'],
        provider: { id: resolved.providerId }, task: task, writeAllowed: false
      };
    }
  }

  Orbit.documentProviderRegistryP09 = {
    TASKS: TASKS.slice(), PURPOSES: PURPOSES.slice(), STATUS: STATUS.slice(),
    sanitize: sanitize, register: register, unregister: unregister,
    status: status, list: list, policyFor: policyFor, resolve: resolve,
    validateRequest: validateRequest, execute: execute
  };
})();