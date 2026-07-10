/* ============================================================
   Orbit 360 · P0.9g · Orquestador controlado de lote Aseguradoras
   Fecha: 2026-07-10

   Coordina fuentes tenant-scoped reutilizando P0.9f por documento. No escribe
   Orbit.store directamente, no conserva rutas y nunca habilita módulos.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  var batches = Object.create(null);
  var runs = Object.create(null);
  var RETRYABLE_CODES = [
    'PROVIDER_EXECUTION_FAILED',
    'PDF_EXTRACTION_FAILED',
    'INSPECTION_NOT_READY',
    'SNAPSHOT_CONFIRMATION_TIMEOUT',
    'WRITE_FAILED_ROLLED_BACK'
  ];
  var READY_STATUSES = ['dry_run_ready', 'persisted', 'verified'];

  function clean(value) { return String(value == null ? '' : value).trim(); }
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
  function emit(name, detail) {
    try { window.dispatchEvent(new CustomEvent(name, { detail: clone(detail || {}) })); } catch (error) {}
  }
  function documentId(item) { return clean(item && item.source && (item.source.documentId || item.source.id)); }
  function sourceName(item) { return clean(item && item.source && (item.source.nombre || item.source.fileName)); }
  function insurerName(item) { return clean(item && (item.insurerName || item.aseguradoraNombre)); }
  function sourceAliases(item) { return [].concat(item && (item.insurerAliases || item.aseguradoraAliases) || []).map(clean).filter(Boolean); }
  function sourceType(item) { return clean(item && item.source && (item.source.tipoFuente || item.source.sourceType)); }
  function taskFor(item) {
    var type = sourceType(item).toLowerCase(), name = sourceName(item).toLowerCase();
    if (type.indexOf('excel') >= 0 || /\.(xlsx|xlsm)$/.test(name)) return 'excel_manifest';
    if (type.indexOf('pdf') >= 0 || /\.pdf$/.test(name)) return 'pdf_manifest';
    return '';
  }
  function stripReference(value) {
    if (!value || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(stripReference);
    var out = {};
    Object.keys(value).forEach(function (key) {
      if (/^(?:fileRef|sourceRef|archivoRef|mountedPath|localPath|url|signedUrl)$/i.test(key)) return;
      out[key] = stripReference(value[key]);
    });
    return out;
  }

  function validateBatchDefinition(batch) {
    batch = batch || {};
    var errors = [], seenDocuments = Object.create(null), seenBindings = Object.create(null);
    if (!clean(batch.id)) errors.push('BATCH_ID_REQUIRED');
    if (!clean(batch.tenantId)) errors.push('TENANT_REQUIRED');
    if (!Array.isArray(batch.sources) || !batch.sources.length) errors.push('SOURCES_REQUIRED');
    [].concat(batch.sources || []).forEach(function (item, index) {
      var docId = documentId(item);
      if (!docId) errors.push('DOCUMENT_REQUIRED:' + index);
      if (!sourceName(item)) errors.push('SOURCE_NAME_REQUIRED:' + index);
      if (!insurerName(item)) errors.push('INSURER_NAME_REQUIRED:' + index);
      if (!taskFor(item)) errors.push('SOURCE_TYPE_UNSUPPORTED:' + (docId || index));
      if (docId && seenDocuments[docId]) errors.push('DUPLICATE_DOCUMENT:' + docId);
      if (docId) seenDocuments[docId] = true;
    });
    [].concat(batch.bindingSets || []).forEach(function (binding, index) {
      var id = clean(binding && binding.id);
      if (!id) errors.push('BINDING_SET_ID_REQUIRED:' + index);
      if (id && seenBindings[id]) errors.push('DUPLICATE_BINDING_SET:' + id);
      if (id) seenBindings[id] = true;
      [].concat(binding && binding.requiredDocuments || []).forEach(function (docId) {
        if (!seenDocuments[clean(docId)]) errors.push('BINDING_DOCUMENT_NOT_IN_BATCH:' + clean(docId));
      });
    });
    return { valid: errors.length === 0, errors: unique(errors) };
  }

  function registerBatch(batch) {
    batch = clone(batch || {});
    var validation = validateBatchDefinition(batch);
    if (!validation.valid) {
      var error = new Error(validation.errors[0]);
      error.code = validation.errors[0];
      error.errors = validation.errors;
      throw error;
    }
    batch.enabled = false;
    batch.applyAllowed = false;
    batch.enablesCotizador = false;
    batch.enablesComparativo = false;
    batch.requiresHumanValidation = true;
    batch.requiresSecondGateForEnablement = true;
    batches[clean(batch.tenantId) + '::' + clean(batch.id)] = batch;
    return summarizeBatch(batch);
  }
  function getBatch(tenantId, batchId) { return clone(batches[clean(tenantId) + '::' + clean(batchId)] || null); }
  function listBatches(tenantId) {
    var prefix = clean(tenantId) + '::';
    return Object.keys(batches).filter(function (key) { return key.indexOf(prefix) === 0; })
      .map(function (key) { return summarizeBatch(batches[key]); });
  }
  function summarizeBatch(batch) {
    batch = batch || {};
    var insurers = unique([].concat(batch.sources || []).map(insurerName));
    return {
      id: clean(batch.id), tenantId: clean(batch.tenantId), version: clean(batch.version),
      totalSources: [].concat(batch.sources || []).length,
      totalInsurers: insurers.length,
      totalExcel: [].concat(batch.sources || []).filter(function (item) { return taskFor(item) === 'excel_manifest'; }).length,
      totalPdf: [].concat(batch.sources || []).filter(function (item) { return taskFor(item) === 'pdf_manifest'; }).length,
      bindingSets: [].concat(batch.bindingSets || []).length,
      enabled: false, applyAllowed: false, enablesCotizador: false, enablesComparativo: false
    };
  }

  function resolveSources(batch, input) {
    var adapter = Orbit.tenantSourceBatchAdapterP10;
    if (!adapter || typeof adapter.resolveBatchSources !== 'function') {
      return { ok: false, code: 'TENANT_SOURCE_BATCH_ADAPTER_REQUIRED', rows: [], sources: [], errors: ['TENANT_SOURCE_BATCH_ADAPTER_REQUIRED'] };
    }
    var flattened = [].concat(batch.sources || []).map(function (item) {
      return Object.assign({}, clone(item.source || {}), {
        tenantId: batch.tenantId,
        aseguradoraNombre: insurerName(item),
        aseguradoraAliases: sourceAliases(item)
      });
    });
    return adapter.resolveBatchSources({
      tenantId: batch.tenantId,
      sources: flattened,
      directory: input.directory || []
    });
  }

  function referenceFor(item, input) {
    input = input || {};
    var docId = documentId(item), refs = input.sourceRefs || input.references || {};
    var value = refs[docId];
    if (!value && typeof input.resolveReference === 'function') value = input.resolveReference(docId, clone(item));
    return clean(value && (value.fileRef || value.sourceRef || value.ref) || value);
  }
  function hashFor(item, input) {
    var docId = documentId(item), hashes = input.sourceHashes || {};
    return clean(hashes[docId] || '');
  }
  function inspectionFor(item, input) {
    var rows = input.inspections || input.inspectionByDocumentId || {};
    return rows[documentId(item)] ? clone(rows[documentId(item)]) : null;
  }
  function reviewFor(item, input) {
    var rows = input.reviews || input.reviewByDocumentId || {};
    return rows[documentId(item)] ? clone(rows[documentId(item)]) : {};
  }
  function planFor(batch, item, resolvedSource) {
    return {
      id: clean(batch.id) + '::' + documentId(item),
      tenantId: batch.tenantId,
      insurerName: insurerName(item),
      insurerAliases: sourceAliases(item),
      pais: clean(item.source && item.source.pais).toUpperCase(),
      moneda: clean(item.source && item.source.moneda).toUpperCase(),
      source: Object.assign({}, clone(item.source || {}), {
        id: documentId(item),
        documentId: documentId(item),
        aseguradoraId: clean(resolvedSource && resolvedSource.aseguradoraId)
      }),
      purpose: clean(item.purpose || batch.purpose || 'training'),
      enabled: false,
      enablesCotizador: false,
      enablesComparativo: false,
      requiresHumanValidation: true,
      requiresSecondGateForEnablement: true
    };
  }
  function retryable(code, input) {
    var allowed = unique([].concat(input.retryableCodes || RETRYABLE_CODES).map(clean));
    return allowed.indexOf(clean(code)) >= 0;
  }
  function outputCounts(prepared) {
    prepared = prepared || {};
    var inspection = prepared.inspection || {};
    var plan = prepared.persistencePlan || {};
    var operations = [].concat(plan.operations || []);
    function countCollection(name) {
      return operations.filter(function (op) { return clean(op.collection) === name; }).length;
    }
    return {
      manifest: inspection.manifest ? 1 : countCollection('aseguradora_manifiestos'),
      proposals: [].concat(inspection.proposals || []).length || countCollection('aseguradora_propuestas'),
      tariffRules: [].concat(inspection.tariffRules || []).length || countCollection('aseguradora_reglas_tarifarias'),
      presentations: [].concat(inspection.presentations || []).length || countCollection('aseguradora_presentaciones'),
      bindings: [].concat(inspection.bindings || []).length || countCollection('aseguradora_bindings'),
      reconciliations: [].concat(inspection.reconciliations || prepared.reconciliations || []).length
    };
  }
  function knowledgeAvailable(kind, rows) {
    return rows.some(function (row) {
      var out = row.outputs || {};
      if (kind === 'manifest') return Number(out.manifest || 0) > 0;
      if (kind === 'proposal') return Number(out.proposals || 0) > 0;
      if (kind === 'tariff_rule') return Number(out.tariffRules || 0) > 0;
      if (kind === 'presentation') return Number(out.presentations || 0) > 0;
      if (kind === 'binding') return Number(out.bindings || 0) > 0;
      if (kind === 'reconciliation') return Number(out.reconciliations || 0) > 0;
      return false;
    });
  }
  function evaluateBindingSets(batch, itemResults) {
    var byDoc = Object.create(null);
    itemResults.forEach(function (row) { byDoc[row.documentId] = row; });
    return [].concat(batch.bindingSets || []).map(function (binding) {
      var requiredDocs = [].concat(binding.requiredDocuments || []).map(clean);
      var rows = requiredDocs.map(function (docId) { return byDoc[docId]; }).filter(Boolean);
      var missingDocuments = requiredDocs.filter(function (docId) { return !byDoc[docId]; });
      var failedDocuments = rows.filter(function (row) { return READY_STATUSES.indexOf(row.status) < 0; }).map(function (row) { return row.documentId; });
      var requiredKnowledge = [].concat(binding.requiredKnowledge || []).map(clean);
      var knownMissing = unique([].concat(binding.knownMissingKnowledge || []).map(clean));
      var missingKnowledge = unique(requiredKnowledge.filter(function (kind) { return !knowledgeAvailable(kind, rows); }).concat(knownMissing));
      var status = 'waiting_sources';
      if (missingDocuments.length) status = 'invalid_missing_documents';
      else if (failedDocuments.length) status = 'waiting_or_blocked_sources';
      else if (missingKnowledge.length) status = knownMissing.length ? 'incomplete_known_missing_knowledge' : 'documents_ready_knowledge_incomplete';
      else status = 'ready_for_binding_review';
      return {
        id: clean(binding.id),
        insurerName: clean(binding.insurerName),
        variant: clone(binding.variant || {}),
        requiredDocuments: requiredDocs,
        requiredKnowledge: requiredKnowledge,
        missingDocuments: missingDocuments,
        failedDocuments: failedDocuments,
        missingKnowledge: missingKnowledge,
        status: status,
        enabled: false,
        enablesCotizador: false,
        enablesComparativo: false,
        requiresHumanValidation: true,
        requiresSecondGateForEnablement: true
      };
    });
  }
  function summarizeResults(batch, rows, bindings) {
    var groups = Object.create(null);
    rows.forEach(function (row) {
      var key = row.insurerName || row.aseguradoraId || 'sin_aseguradora';
      groups[key] = groups[key] || [];
      groups[key].push(row);
    });
    return {
      total: rows.length,
      dryRunReady: rows.filter(function (row) { return row.status === 'dry_run_ready'; }).length,
      persisted: rows.filter(function (row) { return row.status === 'persisted' || row.status === 'verified'; }).length,
      verified: rows.filter(function (row) { return row.status === 'verified'; }).length,
      waitingReference: rows.filter(function (row) { return row.status === 'waiting_reference'; }).length,
      failed: rows.filter(function (row) { return row.status === 'failed'; }).length,
      blocked: rows.filter(function (row) { return row.status === 'blocked'; }).length,
      insurers: Object.keys(groups).map(function (name) {
        var list = groups[name];
        return {
          name: name,
          total: list.length,
          ready: list.filter(function (row) { return READY_STATUSES.indexOf(row.status) >= 0; }).length,
          pending: list.filter(function (row) { return READY_STATUSES.indexOf(row.status) < 0; }).length
        };
      }),
      bindingsReadyForReview: bindings.filter(function (row) { return row.status === 'ready_for_binding_review'; }).length,
      bindingsIncomplete: bindings.filter(function (row) { return row.status !== 'ready_for_binding_review'; }).length,
      enablesCotizador: false,
      enablesComparativo: false
    };
  }

  async function executeItem(batch, item, resolvedSource, input, mode) {
    var docId = documentId(item), ref = referenceFor(item, input);
    if (!ref) return {
      documentId: docId, insurerName: insurerName(item), aseguradoraId: clean(resolvedSource && resolvedSource.aseguradoraId),
      task: taskFor(item), status: 'waiting_reference', ok: false, code: 'BACKEND_SOURCE_REFERENCE_REQUIRED', attempts: 0,
      outputs: {}, enablesCotizador: false, enablesComparativo: false
    };
    var first = Orbit.aseguradorasFirstSourceP09f;
    if (!first || typeof first.prepare !== 'function' || typeof first.persist !== 'function') return {
      documentId: docId, insurerName: insurerName(item), aseguradoraId: clean(resolvedSource && resolvedSource.aseguradoraId),
      task: taskFor(item), status: 'blocked', ok: false, code: 'FIRST_SOURCE_ORCHESTRATOR_REQUIRED', attempts: 0,
      outputs: {}, enablesCotizador: false, enablesComparativo: false
    };
    var policy = batch.executionPolicy || {};
    var maxRetries = Math.max(0, Number(input.maxRetries != null ? input.maxRetries : policy.maxRetries || 0));
    var attempts = 0, prepared = null, lastCode = '';
    while (attempts <= maxRetries) {
      attempts += 1;
      prepared = await first.prepare({
        plan: planFor(batch, item, resolvedSource),
        tenantId: batch.tenantId,
        sourceRef: ref,
        sourceHash: hashFor(item, input),
        actor: input.actor,
        reason: clean(input.reason),
        confirmedPlan: true,
        directory: input.directory || [],
        inspection: inspectionFor(item, input),
        review: reviewFor(item, input),
        expectedFingerprint: clean((input.expectedFingerprints || {})[docId]),
        skipBootstrap: input.skipBootstrap === true
      });
      if (prepared && prepared.ok === true) break;
      lastCode = clean(prepared && prepared.code || 'PREPARE_FAILED');
      if (!retryable(lastCode, input) || attempts > maxRetries) break;
    }
    if (!prepared || prepared.ok !== true) return {
      documentId: docId, insurerName: insurerName(item), aseguradoraId: clean(resolvedSource && resolvedSource.aseguradoraId),
      task: taskFor(item), status: 'failed', ok: false, code: lastCode || 'PREPARE_FAILED', attempts: attempts,
      outputs: {}, errors: clone(prepared && prepared.errors || []), enablesCotizador: false, enablesComparativo: false
    };
    var outputs = outputCounts(prepared);
    if (mode !== 'persist') return {
      documentId: docId, insurerName: insurerName(item), aseguradoraId: clean(resolvedSource && resolvedSource.aseguradoraId),
      task: taskFor(item), status: 'dry_run_ready', ok: true, code: 'SOURCE_DRY_RUN_READY', attempts: attempts,
      outputs: outputs, persistencePlanId: clean(prepared.persistencePlan && prepared.persistencePlan.planId),
      enablesCotizador: false, enablesComparativo: false
    };
    var confirmations = input.confirmPersistenceByDocumentId || {};
    if (input.confirmAllPersistence !== true && confirmations[docId] !== true) return {
      documentId: docId, insurerName: insurerName(item), aseguradoraId: clean(resolvedSource && resolvedSource.aseguradoraId),
      task: taskFor(item), status: 'blocked', ok: false, code: 'SOURCE_PERSISTENCE_CONFIRMATION_REQUIRED', attempts: attempts,
      outputs: outputs, enablesCotizador: false, enablesComparativo: false
    };
    var persisted = await first.persist(prepared, {
      confirmPersistence: true,
      actor: input.actor,
      timeoutMs: input.timeoutMs
    });
    if (!persisted || persisted.ok !== true || persisted.persisted === false) return {
      documentId: docId, insurerName: insurerName(item), aseguradoraId: clean(resolvedSource && resolvedSource.aseguradoraId),
      task: taskFor(item), status: 'failed', ok: false,
      code: clean(persisted && persisted.code || persisted && persisted.errors && persisted.errors[0] || 'PERSIST_FAILED'),
      attempts: attempts, outputs: outputs, errors: clone(persisted && persisted.errors || []),
      enablesCotizador: false, enablesComparativo: false
    };
    var verifyAfter = input.verifyAfterPersist !== false && policy.verifyAfterPersist !== false;
    if (!verifyAfter) return {
      documentId: docId, insurerName: insurerName(item), aseguradoraId: clean(resolvedSource && resolvedSource.aseguradoraId),
      task: taskFor(item), status: 'persisted', ok: true, code: 'SOURCE_METADATA_PERSISTED', attempts: attempts,
      outputs: outputs, enablesCotizador: false, enablesComparativo: false
    };
    var verified = typeof first.verify === 'function' ? first.verify({
      plan: planFor(batch, item, resolvedSource),
      tenantId: batch.tenantId,
      sourceRef: ref,
      directory: input.directory || []
    }) : { ok: false, code: 'VERIFY_NOT_AVAILABLE' };
    return {
      documentId: docId, insurerName: insurerName(item), aseguradoraId: clean(resolvedSource && resolvedSource.aseguradoraId),
      task: taskFor(item), status: verified && verified.ok ? 'verified' : 'persisted', ok: true,
      code: verified && verified.ok ? 'SOURCE_VISIBLE_IN_READ_MODEL' : 'SOURCE_PERSISTED_VERIFY_PENDING', attempts: attempts,
      outputs: outputs, verification: stripReference(verified), enablesCotizador: false, enablesComparativo: false
    };
  }

  async function run(input) {
    input = input || {};
    var tenantId = clean(input.tenantId || 'alianzas-soluciones');
    var batch = input.batch || getBatch(tenantId, input.batchId || 'ays_aseguradoras_knowledge_batch_2026_v1');
    if (!batch) return { ok: false, code: 'BATCH_NOT_FOUND', results: [], enablesCotizador: false, enablesComparativo: false };
    var validation = validateBatchDefinition(batch);
    if (!validation.valid) return { ok: false, code: validation.errors[0], errors: validation.errors, results: [], enablesCotizador: false, enablesComparativo: false };
    var mode = clean(input.mode || 'dry_run');
    if (['dry_run', 'persist'].indexOf(mode) < 0) return { ok: false, code: 'BATCH_MODE_INVALID', results: [], enablesCotizador: false, enablesComparativo: false };
    if (mode === 'persist' && input.confirmBatchPersistence !== true) {
      return { ok: false, code: 'BATCH_PERSISTENCE_CONFIRMATION_REQUIRED', results: [], enablesCotizador: false, enablesComparativo: false };
    }
    if (!input.actor || !clean(input.actor.id || input.actor.uid || input.actor.userId)) {
      return { ok: false, code: 'ACTOR_REQUIRED', results: [], enablesCotizador: false, enablesComparativo: false };
    }
    if (!clean(input.reason)) return { ok: false, code: 'REASON_REQUIRED', results: [], enablesCotizador: false, enablesComparativo: false };

    var resolution = resolveSources(batch, input);
    if (!resolution.ok) return {
      ok: false, code: clean(resolution.code || 'BATCH_SOURCE_RESOLUTION_FAILED'),
      errors: clone(resolution.errors || []), resolution: stripReference(resolution), results: [],
      enablesCotizador: false, enablesComparativo: false
    };
    var resolvedByDoc = Object.create(null);
    resolution.sources.forEach(function (source) { resolvedByDoc[clean(source.documentId || source.id)] = source; });
    var ordered = [].concat(batch.sources || []).slice().sort(function (a, b) { return Number(a.order || 0) - Number(b.order || 0); });
    var only = unique([].concat(input.onlyDocumentIds || []).map(clean));
    if (only.length) ordered = ordered.filter(function (item) { return only.indexOf(documentId(item)) >= 0; });

    var runId = stableId('batch_run', [batch.tenantId, batch.id, mode, new Date().toISOString()]);
    var runState = {
      runId: runId, batchId: batch.id, tenantId: batch.tenantId, mode: mode,
      status: 'running', startedAt: new Date().toISOString(), completedAt: '',
      results: [], bindingSets: [], summary: {}, errors: [],
      enablesCotizador: false, enablesComparativo: false
    };
    runs[runId] = runState;
    emit('orbit:aseguradoras:batch-state', publicRun(runState));

    var stopOnError = input.stopOnError != null ? input.stopOnError === true : batch.executionPolicy && batch.executionPolicy.stopOnError === true;
    for (var i = 0; i < ordered.length; i += 1) {
      var item = ordered[i], docId = documentId(item);
      var result = await executeItem(batch, item, resolvedByDoc[docId], input, mode);
      runState.results.push(result);
      emit('orbit:aseguradoras:batch-item', { runId: runId, result: stripReference(result), enablesCotizador: false, enablesComparativo: false });
      if (!result.ok && stopOnError) break;
    }
    runState.bindingSets = evaluateBindingSets(batch, runState.results);
    runState.summary = summarizeResults(batch, runState.results, runState.bindingSets);
    runState.completedAt = new Date().toISOString();
    runState.status = runState.results.length === ordered.length && runState.results.every(function (row) { return READY_STATUSES.indexOf(row.status) >= 0; })
      ? (mode === 'persist' ? 'persisted_or_verified' : 'dry_run_complete')
      : 'incomplete';
    runState.errors = unique(runState.results.filter(function (row) { return !row.ok; }).map(function (row) { return row.code; }));
    runs[runId] = runState;
    emit('orbit:aseguradoras:batch-state', publicRun(runState));
    return publicRun(runState);
  }

  function publicRun(runState) {
    if (!runState) return null;
    return stripReference({
      ok: runState.status === 'dry_run_complete' || runState.status === 'persisted_or_verified',
      code: runState.status === 'dry_run_complete' ? 'BATCH_DRY_RUN_COMPLETE' :
        runState.status === 'persisted_or_verified' ? 'BATCH_PERSISTENCE_COMPLETE' : 'BATCH_INCOMPLETE',
      runId: runState.runId,
      batchId: runState.batchId,
      tenantId: runState.tenantId,
      mode: runState.mode,
      status: runState.status,
      startedAt: runState.startedAt,
      completedAt: runState.completedAt,
      results: runState.results,
      bindingSets: runState.bindingSets,
      summary: runState.summary,
      errors: runState.errors,
      applyAllowed: false,
      enablesCotizador: false,
      enablesComparativo: false,
      requiresHumanValidation: true,
      requiresSecondGateForEnablement: true
    });
  }
  function status(runId) { return publicRun(runs[clean(runId)] || null); }
  function latest(tenantId, batchId) {
    var rows = Object.keys(runs).map(function (key) { return runs[key]; }).filter(function (row) {
      return clean(row.tenantId) === clean(tenantId) && (!batchId || clean(row.batchId) === clean(batchId));
    }).sort(function (a, b) { return clean(b.startedAt).localeCompare(clean(a.startedAt)); });
    return publicRun(rows[0] || null);
  }

  Orbit.aseguradorasBatchOrchestratorP09g = {
    RETRYABLE_CODES: RETRYABLE_CODES.slice(),
    validateBatchDefinition: validateBatchDefinition,
    registerBatch: registerBatch,
    getBatch: getBatch,
    listBatches: listBatches,
    summarizeBatch: summarizeBatch,
    evaluateBindingSets: evaluateBindingSets,
    run: run,
    status: status,
    latest: latest
  };

  (window.OrbitSourceBatchesP09g || []).forEach(registerBatch);
})();