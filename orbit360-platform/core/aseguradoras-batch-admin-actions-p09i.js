/* ============================================================
   Orbit 360 · P0.9i · Acciones administrativas del lote Aseguradoras
   Fecha: 2026-07-10

   Prepara preview, ejecuta dry-run/reanudación sin persistir conocimiento y
   separa la persistencia metadata-only del historial. No conserva referencias,
   rutas ni secretos; nunca habilita Cotizador o Comparativo.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  var PREVIEW_ROLES = ['superadmin', 'super_admin', 'direccion', 'admin', 'admintenant', 'admin_tenant', 'operativo'];
  var ADMIN_ROLES = ['superadmin', 'super_admin', 'direccion', 'admin', 'admintenant', 'admin_tenant'];
  var ACTIONS = ['dry_run', 'resume'];
  var lastPlan = null;
  var lastExecution = null;

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function norm(value) {
    return clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }
  function clone(value) {
    try { return JSON.parse(JSON.stringify(value == null ? null : value)); }
    catch (error) { return value; }
  }
  function unique(values) { return Array.from(new Set((values || []).filter(Boolean))); }
  function stableId(prefix, parts) {
    var text = (parts || []).map(clean).join('|'), hash = 0;
    for (var i = 0; i < text.length; i += 1) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    return prefix + '_' + Math.abs(hash).toString(36);
  }
  function sensitiveKey(key) {
    return /^(?:fileRef|sourceRef|archivoRef|mountedPath|localPath|path|url|signedUrl|downloadUrl|raw|rawBytes|bytes|binary|binaryPayload|base64|fullText|apiKey|token|accessToken|refreshToken|secret|password|authorization|credential|credentials|privateKey|clientSecret)$/i.test(clean(key));
  }
  function sanitize(value, depth) {
    depth = depth || 0;
    if (depth > 14 || value == null) return value == null ? value : '[depth_limited]';
    if (Array.isArray(value)) return value.slice(0, 5000).map(function (item) { return sanitize(item, depth + 1); });
    if (typeof value !== 'object') return value;
    var out = {};
    Object.keys(value).forEach(function (key) {
      if (!sensitiveKey(key)) out[key] = sanitize(value[key], depth + 1);
    });
    return out;
  }
  function actorIdentity(actor) {
    actor = actor || {};
    var activeRole = norm(actor.activeRole || actor.rolActivo || actor.role || actor.rol);
    return {
      id: clean(actor.id || actor.uid || actor.userId),
      tenantId: clean(actor.tenantId || actor.tenant),
      activeRole: activeRole,
      assignedRoles: unique([].concat(actor.roles || actor.rolesAsignados || actor.assignedRoles || []).map(norm).filter(Boolean))
    };
  }
  function batchApi() { return Orbit.aseguradorasBatchOrchestratorP09g; }
  function historyApi() { return Orbit.aseguradorasBatchHistoryP09h; }
  function sourceDocumentId(item) { return clean(item && item.source && (item.source.documentId || item.source.id)); }
  function sourceTask(item) {
    var source = item && item.source || {};
    var type = clean(source.tipoFuente || source.sourceType).toLowerCase();
    var name = clean(source.nombre || source.fileName).toLowerCase();
    return type.indexOf('pdf') >= 0 || /\.pdf$/.test(name) ? 'pdf_manifest' : 'excel_manifest';
  }
  function roleErrors(actor, tenantId, allowedRoles) {
    var identity = actorIdentity(actor), errors = [];
    if (!identity.id) errors.push('ACTOR_REQUIRED');
    if (!identity.activeRole || allowedRoles.indexOf(identity.activeRole) < 0) errors.push('ACTIVE_ROLE_NOT_AUTHORIZED');
    if (identity.assignedRoles.length && identity.assignedRoles.indexOf(identity.activeRole) < 0) errors.push('ACTIVE_ROLE_NOT_ASSIGNED');
    if (identity.tenantId && identity.tenantId !== clean(tenantId)) errors.push('ACTOR_TENANT_MISMATCH');
    return { identity: identity, errors: errors };
  }
  function requiredConfirmation(action) {
    return action === 'resume' ? 'REANUDAR DRY-RUN' : 'EJECUTAR DRY-RUN';
  }
  function resolveBatch(input) {
    input = input || {};
    var api = batchApi(), tenantId = clean(input.tenantId || 'alianzas-soluciones');
    var batchId = clean(input.batchId || 'ays_aseguradoras_knowledge_batch_2026_v1');
    var batch = input.batch || (api && typeof api.getBatch === 'function' ? api.getBatch(tenantId, batchId) : null);
    return { api: api, tenantId: tenantId, batchId: batchId, batch: batch };
  }
  function requestedDocuments(action, input, batch) {
    var explicit = unique([].concat(input.onlyDocumentIds || []).map(clean));
    if (action === 'resume') {
      var history = historyApi();
      var resumable = history && typeof history.resumeDocumentIds === 'function'
        ? history.resumeDocumentIds({ tenantId: batch.tenantId, batchId: batch.id, statuses: input.resumeStatuses })
        : [];
      return explicit.length ? resumable.filter(function (id) { return explicit.indexOf(id) >= 0; }) : resumable;
    }
    if (explicit.length) return explicit;
    return [].concat(batch.sources || []).map(sourceDocumentId).filter(Boolean);
  }
  function sourcePreview(batch, documentIds) {
    var allowed = Object.create(null);
    documentIds.forEach(function (id) { allowed[id] = true; });
    return [].concat(batch.sources || []).filter(function (item) { return allowed[sourceDocumentId(item)]; }).map(function (item) {
      var source = item.source || {};
      return {
        order: Number(item.order || 0),
        documentId: sourceDocumentId(item),
        insurerName: clean(item.insurerName),
        sourceName: clean(source.nombre || source.fileName),
        task: sourceTask(item),
        country: clean(source.pais).toUpperCase(),
        currency: clean(source.moneda).toUpperCase(),
        product: clean(source.producto),
        version: clean(source.version),
        referenceValueExposed: false
      };
    }).sort(function (a, b) { return a.order - b.order; });
  }
  function referenceContract(batch, input, documentIds) {
    var history = historyApi();
    var contract = history && typeof history.buildReferenceContract === 'function'
      ? history.buildReferenceContract(batch, input.sourceRefs || input.references || {})
      : { requirements: [], containsReferences: false, containsPaths: false };
    var allowed = Object.create(null);
    documentIds.forEach(function (id) { allowed[id] = true; });
    contract.requirements = [].concat(contract.requirements || []).filter(function (row) { return allowed[clean(row.documentId)]; });
    contract.total = contract.requirements.length;
    contract.provided = contract.requirements.filter(function (row) { return row.provided === true; }).length;
    contract.missing = contract.requirements.filter(function (row) { return row.provided !== true; }).map(function (row) { return clean(row.documentId); });
    contract.containsReferences = false;
    contract.containsPaths = false;
    contract.writeAllowed = false;
    return contract;
  }
  function preview(input) {
    input = input || {};
    var resolved = resolveBatch(input), errors = [];
    var action = clean(input.action || 'dry_run');
    if (ACTIONS.indexOf(action) < 0) errors.push('ADMIN_ACTION_INVALID');
    if (!resolved.api || typeof resolved.api.run !== 'function') errors.push('BATCH_ORCHESTRATOR_REQUIRED');
    if (!resolved.batch) errors.push('BATCH_NOT_FOUND');
    var role = roleErrors(input.actor, resolved.tenantId, PREVIEW_ROLES);
    errors = errors.concat(role.errors);
    var reason = clean(input.reason);
    if (!reason) errors.push('REASON_REQUIRED');
    var documentIds = resolved.batch ? requestedDocuments(action, input, resolved.batch) : [];
    if (!documentIds.length) errors.push(action === 'resume' ? 'NO_RESUMABLE_DOCUMENTS' : 'NO_DOCUMENTS_SELECTED');
    var documents = resolved.batch ? sourcePreview(resolved.batch, documentIds) : [];
    if (documents.length !== documentIds.length) errors.push('DOCUMENT_SELECTION_INVALID');
    var refs = resolved.batch ? referenceContract(resolved.batch, input, documentIds) : { requirements: [], missing: documentIds };
    var fingerprint = stableId('batch_admin_preview', [
      resolved.tenantId, resolved.batchId, action, documentIds.join(','), role.identity.id,
      role.identity.activeRole, reason, resolved.batch && resolved.batch.version
    ]);
    var plan = {
      ok: errors.length === 0,
      code: errors.length ? errors[0] : 'BATCH_ADMIN_PREVIEW_READY',
      errors: unique(errors),
      planId: stableId('batch_admin_plan', [resolved.tenantId, resolved.batchId, action, fingerprint]),
      fingerprint: fingerprint,
      tenantId: resolved.tenantId,
      batchId: resolved.batchId,
      batchVersion: clean(resolved.batch && resolved.batch.version),
      action: action,
      executionMode: 'dry_run',
      actor: role.identity,
      reason: reason,
      documentIds: documentIds,
      documents: documents,
      referenceContract: refs,
      requiredConfirmation: requiredConfirmation(action),
      confirmed: false,
      knowledgePersistenceAllowed: false,
      historyPersistenceSeparate: true,
      applyAllowed: false,
      enablesCotizador: false,
      enablesComparativo: false,
      requiresHumanValidation: true,
      requiresReinforcedConfirmation: true
    };
    lastPlan = sanitize(plan);
    return clone(lastPlan);
  }
  function planErrors(plan, input) {
    plan = plan || {}; input = input || {};
    var errors = [];
    var role = roleErrors(input.actor || plan.actor, plan.tenantId, PREVIEW_ROLES);
    errors = errors.concat(role.errors);
    if (!plan.ok) errors.push('VALID_PREVIEW_REQUIRED');
    if (clean(input.expectedFingerprint) !== clean(plan.fingerprint)) errors.push('ADMIN_PLAN_FINGERPRINT_MISMATCH');
    if (input.confirmExecution !== true) errors.push('EXECUTION_CONFIRMATION_REQUIRED');
    if (clean(input.confirmationText) !== clean(plan.requiredConfirmation)) errors.push('REINFORCED_CONFIRMATION_MISMATCH');
    if (clean(input.reason || plan.reason) !== clean(plan.reason)) errors.push('REASON_CHANGED_REBUILD_PREVIEW');
    return { errors: unique(errors), identity: role.identity };
  }
  async function execute(plan, input) {
    input = input || {};
    var validation = planErrors(plan, input);
    if (validation.errors.length) return {
      ok: false, code: validation.errors[0], errors: validation.errors,
      knowledgePersisted: false, historyPersisted: false,
      enablesCotizador: false, enablesComparativo: false, writeAllowed: false
    };
    var api = batchApi();
    if (!api || typeof api.run !== 'function') return { ok: false, code: 'BATCH_ORCHESTRATOR_REQUIRED', writeAllowed: false };
    var common = {
      tenantId: plan.tenantId,
      batchId: plan.batchId,
      onlyDocumentIds: plan.documentIds,
      sourceRefs: input.sourceRefs || input.references || {},
      sourceHashes: input.sourceHashes || {},
      actor: input.actor || plan.actor,
      reason: plan.reason,
      directory: input.directory || [],
      inspections: input.inspections || {},
      reviews: input.reviews || {},
      expectedFingerprints: input.expectedFingerprints || {},
      mode: 'dry_run',
      skipBootstrap: input.skipBootstrap === true,
      persistHistory: false,
      confirmHistoryPlan: false
    };
    var result = plan.action === 'resume' && typeof api.resume === 'function'
      ? await api.resume(Object.assign({}, common, { resumedFromRunId: clean(input.resumedFromRunId) }))
      : await api.run(common);
    var publicResult = sanitize(result || {});
    lastExecution = {
      ok: !!(result && result.ok),
      code: clean(result && result.code || 'BATCH_ADMIN_EXECUTION_FAILED'),
      planId: plan.planId,
      fingerprint: plan.fingerprint,
      action: plan.action,
      tenantId: plan.tenantId,
      batchId: plan.batchId,
      documentIds: plan.documentIds.slice(),
      executedAt: new Date().toISOString(),
      run: publicResult,
      knowledgePersisted: false,
      historyPersisted: false,
      referencesExposed: false,
      enablesCotizador: false,
      enablesComparativo: false,
      writeAllowed: false
    };
    return clone(lastExecution);
  }
  function buildHistoryPlan(execution, input) {
    input = input || {};
    var history = historyApi(), resolved = resolveBatch(input);
    var actor = input.actor || execution && execution.actor || lastPlan && lastPlan.actor;
    var role = roleErrors(actor, execution && execution.tenantId || resolved.tenantId, ADMIN_ROLES);
    if (role.errors.length) return { ok: false, code: role.errors[0], errors: role.errors, operations: [], writeAllowed: false };
    if (!history || typeof history.buildHistoryPlan !== 'function') return { ok: false, code: 'BATCH_HISTORY_REQUIRED', operations: [], writeAllowed: false };
    if (!execution || !execution.run || !execution.run.runId) return { ok: false, code: 'COMPLETED_EXECUTION_REQUIRED', operations: [], writeAllowed: false };
    return history.buildHistoryPlan({
      run: execution.run,
      batch: resolved.batch,
      tenantId: execution.tenantId,
      batchId: execution.batchId,
      actor: actor,
      reason: clean(input.reason || lastPlan && lastPlan.reason),
      confirmed: input.confirmHistoryPlan === true,
      resumedFromRunId: clean(input.resumedFromRunId || execution.run.resumedFromRunId)
    });
  }
  async function persistHistory(execution, input) {
    input = input || {};
    if (input.confirmHistoryPlan !== true || input.confirmHistoryPersistence !== true) {
      return { ok: false, persisted: false, code: 'HISTORY_DOUBLE_CONFIRMATION_REQUIRED', writeAllowed: false };
    }
    var plan = buildHistoryPlan(execution, input);
    if (!plan.ok) return Object.assign({ persisted: false }, plan);
    var history = historyApi();
    if (!history || typeof history.persistHistory !== 'function') return { ok: false, persisted: false, code: 'BATCH_HISTORY_REQUIRED', writeAllowed: false };
    plan.confirmed = true;
    var result = await history.persistHistory(plan, input.actor, input.historyOptions || {});
    if (lastExecution && clean(lastExecution.planId) === clean(execution.planId)) lastExecution.historyPersisted = !!(result && result.persisted);
    return Object.assign({}, sanitize(result || {}), {
      knowledgePersisted: false,
      historyPersisted: !!(result && result.persisted),
      enablesCotizador: false,
      enablesComparativo: false,
      writeAllowed: false
    });
  }
  function status() {
    return {
      version: 'p09i-v1',
      lastPlan: clone(lastPlan),
      lastExecution: clone(lastExecution),
      previewRoles: PREVIEW_ROLES.slice(),
      historyPersistenceRoles: ADMIN_ROLES.slice(),
      knowledgePersistenceAllowed: false,
      enablesCotizador: false,
      enablesComparativo: false,
      referencesExposed: false
    };
  }
  function resetForTest() { lastPlan = null; lastExecution = null; }

  Orbit.aseguradorasBatchAdminActionsP09i = {
    PREVIEW_ROLES: PREVIEW_ROLES.slice(),
    ADMIN_ROLES: ADMIN_ROLES.slice(),
    ACTIONS: ACTIONS.slice(),
    requiredConfirmation: requiredConfirmation,
    preview: preview,
    execute: execute,
    buildHistoryPlan: buildHistoryPlan,
    persistHistory: persistHistory,
    status: status,
    resetForTest: resetForTest,
    sanitize: sanitize
  };
})();