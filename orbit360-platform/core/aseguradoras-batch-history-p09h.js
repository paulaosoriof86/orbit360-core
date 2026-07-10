/* ============================================================
   Orbit 360 · P0.9h · Historial reanudable de lote Aseguradoras
   Fecha: 2026-07-10

   Registra runs e items metadata-only, calcula diffs y reanudación.
   No conserva referencias/rutas, no escribe fuera de Orbit.store y
   nunca habilita Cotizador o Comparativo.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  var RUNS = 'aseguradora_batch_runs';
  var ITEMS = 'aseguradora_batch_items';
  var AUDIT = 'actividades';
  var REVIEW_ROLES = ['superadmin', 'super_admin', 'direccion', 'admin', 'admintenant', 'admin_tenant'];
  var RESUMABLE = ['waiting_reference', 'failed', 'blocked'];
  var installed = false;
  var originalRun = null;

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
    var assigned = [].concat(actor.roles || actor.rolesAsignados || actor.assignedRoles || []).map(norm).filter(Boolean);
    return {
      id: clean(actor.id || actor.uid || actor.userId),
      tenantId: clean(actor.tenantId || actor.tenant),
      activeRole: activeRole,
      assignedRoles: unique(assigned)
    };
  }
  function store() { return Orbit.store; }
  function all(collection) {
    try { return store() && typeof store().all === 'function' ? store().all(collection) || [] : []; }
    catch (error) { return []; }
  }
  function outputSummary(row) {
    var outputs = row && row.outputs || {};
    return {
      manifest: Number(outputs.manifest || 0),
      proposals: Number(outputs.proposals || 0),
      tariffRules: Number(outputs.tariffRules || 0),
      presentations: Number(outputs.presentations || 0),
      bindings: Number(outputs.bindings || 0),
      reconciliations: Number(outputs.reconciliations || 0)
    };
  }
  function attemptSummary(row) {
    var total = Math.max(0, Number(row && row.attempts || 0));
    return {
      total: total,
      finalCode: clean(row && row.code),
      finalStatus: clean(row && row.status),
      retryOccurred: total > 1,
      retryEligible: RESUMABLE.indexOf(clean(row && row.status)) >= 0
    };
  }
  function diffFields(before, after) {
    before = before || {}; after = after || {};
    var fields = ['status', 'code', 'attempts', 'outputs', 'errors'];
    return fields.map(function (field) {
      var left = before[field] == null ? null : before[field];
      var right = after[field] == null ? null : after[field];
      var changed = JSON.stringify(left) !== JSON.stringify(right);
      return changed ? { field: field, before: sanitize(left), after: sanitize(right), status: 'changed' } : null;
    }).filter(Boolean);
  }
  function previousItems(tenantId, batchId) {
    var latestByDocument = Object.create(null);
    all(ITEMS).filter(function (row) {
      return clean(row && row.tenantId) === clean(tenantId) && clean(row && row.batchId) === clean(batchId);
    }).sort(function (a, b) {
      return clean(b.completedAt || b.createdAt).localeCompare(clean(a.completedAt || a.createdAt));
    }).forEach(function (row) {
      var docId = clean(row && row.documentId);
      if (docId && !latestByDocument[docId]) latestByDocument[docId] = row;
    });
    return latestByDocument;
  }
  function buildReferenceContract(batch, references) {
    batch = batch || {}; references = references || {};
    return {
      tenantId: clean(batch.tenantId),
      batchId: clean(batch.id),
      total: [].concat(batch.sources || []).length,
      requirements: [].concat(batch.sources || []).map(function (item) {
        var source = item && item.source || {};
        var documentId = clean(source.documentId || source.id);
        var type = clean(source.tipoFuente || source.sourceType).toLowerCase();
        var name = clean(source.nombre || source.fileName).toLowerCase();
        return {
          documentId: documentId,
          insurerName: clean(item && item.insurerName),
          task: type.indexOf('pdf') >= 0 || /\.pdf$/.test(name) ? 'pdf_manifest' : 'excel_manifest',
          required: true,
          provided: !!references[documentId],
          referenceValueExposed: false
        };
      }),
      containsReferences: false,
      containsPaths: false,
      writeAllowed: false
    };
  }
  function buildHistoryPlan(input) {
    input = input || {};
    var run = input.run || {}, batch = input.batch || {}, actor = actorIdentity(input.actor), errors = [];
    var tenantId = clean(run.tenantId || batch.tenantId || input.tenantId);
    var batchId = clean(run.batchId || batch.id || input.batchId);
    var reason = clean(input.reason);
    if (!clean(run.runId)) errors.push('RUN_ID_REQUIRED');
    if (!tenantId) errors.push('TENANT_REQUIRED');
    if (!batchId) errors.push('BATCH_ID_REQUIRED');
    if (!actor.id) errors.push('ACTOR_REQUIRED');
    if (!actor.activeRole || REVIEW_ROLES.indexOf(actor.activeRole) < 0) errors.push('ACTIVE_ROLE_NOT_AUTHORIZED');
    if (actor.assignedRoles.length && actor.assignedRoles.indexOf(actor.activeRole) < 0) errors.push('ACTIVE_ROLE_NOT_ASSIGNED');
    if (actor.tenantId && actor.tenantId !== tenantId) errors.push('ACTOR_TENANT_MISMATCH');
    if (!reason) errors.push('REASON_REQUIRED');
    if (clean(run.status) === 'running') errors.push('RUN_NOT_COMPLETED');
    var previous = input.previousItems || previousItems(tenantId, batchId);
    var createdAt = clean(run.completedAt || run.startedAt) || new Date().toISOString();
    var runId = clean(run.runId);
    var runRecord = {
      id: runId,
      tenantId: tenantId,
      batchId: batchId,
      mode: clean(run.mode),
      status: clean(run.status),
      code: clean(run.code),
      startedAt: clean(run.startedAt),
      completedAt: clean(run.completedAt),
      summary: sanitize(run.summary || {}),
      bindingSets: sanitize(run.bindingSets || []),
      errors: sanitize(run.errors || []),
      actorId: actor.id,
      activeRole: actor.activeRole,
      reason: reason,
      resumedFromRunId: clean(input.resumedFromRunId || run.resumedFromRunId),
      createdAt: createdAt,
      updatedAt: new Date().toISOString(),
      containsReferences: false,
      containsPaths: false,
      containsRawPayload: false,
      containsSecrets: false,
      enabled: false,
      enablesCotizador: false,
      enablesComparativo: false,
      requiresHumanValidation: true
    };
    var itemRecords = [].concat(run.results || []).map(function (row) {
      var documentId = clean(row && row.documentId);
      var before = previous[documentId] || null;
      var currentComparable = {
        status: clean(row && row.status), code: clean(row && row.code),
        attempts: Number(row && row.attempts || 0), outputs: outputSummary(row),
        errors: sanitize(row && row.errors || [])
      };
      return {
        id: stableId('batch_item', [tenantId, batchId, runId, documentId]),
        tenantId: tenantId,
        batchId: batchId,
        runId: runId,
        documentId: documentId,
        insurerName: clean(row && row.insurerName),
        aseguradoraId: clean(row && row.aseguradoraId),
        task: clean(row && row.task),
        status: currentComparable.status,
        code: currentComparable.code,
        attempts: currentComparable.attempts,
        attemptSummary: attemptSummary(row),
        outputs: currentComparable.outputs,
        errors: currentComparable.errors,
        verification: sanitize(row && row.verification || {}),
        previousRunId: clean(before && before.runId),
        diff: diffFields(before, currentComparable),
        retryEligible: RESUMABLE.indexOf(currentComparable.status) >= 0,
        startedAt: clean(run.startedAt),
        completedAt: clean(run.completedAt),
        createdAt: createdAt,
        updatedAt: new Date().toISOString(),
        containsReferences: false,
        containsPaths: false,
        containsRawPayload: false,
        containsSecrets: false,
        enabled: false,
        enablesCotizador: false,
        enablesComparativo: false,
        requiresHumanValidation: true
      };
    });
    var operations = [{ type: 'upsert', collection: RUNS, id: runRecord.id, row: runRecord }]
      .concat(itemRecords.map(function (row) { return { type: 'upsert', collection: ITEMS, id: row.id, row: row }; }));
    return {
      ok: errors.length === 0,
      code: errors.length ? errors[0] : 'BATCH_HISTORY_PLAN_READY',
      errors: unique(errors),
      planId: stableId('batch_history_plan', [tenantId, batchId, runId]),
      tenantId: tenantId,
      batchId: batchId,
      runId: runId,
      operations: errors.length ? [] : operations,
      expectedItems: itemRecords.length,
      reason: reason,
      actor: actor,
      confirmed: input.confirmed === true,
      metadataOnly: true,
      writeAllowed: false,
      enablesCotizador: false,
      enablesComparativo: false,
      requiresExternalWriter: true,
      requiresHumanValidation: true
    };
  }
  function historyModel(tenantId, batchId) {
    var runs = all(RUNS).filter(function (row) {
      return clean(row && row.tenantId) === clean(tenantId) && (!batchId || clean(row && row.batchId) === clean(batchId));
    }).sort(function (a, b) { return clean(b.completedAt || b.createdAt).localeCompare(clean(a.completedAt || a.createdAt)); });
    var items = all(ITEMS).filter(function (row) {
      return clean(row && row.tenantId) === clean(tenantId) && (!batchId || clean(row && row.batchId) === clean(batchId));
    });
    var latest = runs[0] || null;
    var latestItems = latest ? items.filter(function (row) { return clean(row.runId) === clean(latest.id); }) : [];
    return {
      tenantId: clean(tenantId), batchId: clean(batchId), runs: clone(runs), items: clone(items),
      latest: clone(latest), latestItems: clone(latestItems),
      resumableDocumentIds: unique(latestItems.filter(function (row) { return row.retryEligible === true || RESUMABLE.indexOf(clean(row.status)) >= 0; }).map(function (row) { return clean(row.documentId); })),
      enablesCotizador: false, enablesComparativo: false
    };
  }
  function waitForHistory(plan, timeoutMs) {
    var started = Date.now(), timeout = Number(timeoutMs || 12000);
    return new Promise(function (resolve) {
      (function poll() {
        var run = store() && typeof store().get === 'function' ? store().get(RUNS, plan.runId) : null;
        var count = all(ITEMS).filter(function (row) { return clean(row.runId) === clean(plan.runId); }).length;
        if (run && count >= Number(plan.expectedItems || 0)) {
          resolve({ ok: true, code: 'BATCH_HISTORY_READ_MODEL_CONFIRMED', run: clone(run), itemCount: count });
          return;
        }
        if (Date.now() - started > timeout) {
          resolve({ ok: false, code: 'BATCH_HISTORY_READ_MODEL_TIMEOUT', run: clone(run), itemCount: count });
          return;
        }
        setTimeout(poll, 120);
      })();
    });
  }
  async function persistHistory(plan, actor, options) {
    options = options || {};
    if (!plan || plan.ok !== true || plan.confirmed !== true || plan.metadataOnly !== true) {
      return { ok: false, persisted: false, code: 'CONFIRMED_HISTORY_PLAN_REQUIRED', writeAllowed: false };
    }
    var gate = Orbit.aseguradorasLabPersistenceP09e;
    if (!gate || typeof gate.preflight !== 'function') {
      return { ok: false, persisted: false, code: 'LAB_PERSISTENCE_GATE_REQUIRED', writeAllowed: false };
    }
    var check = gate.preflight(plan, actor);
    if (!check.ok) return Object.assign({ ok: false, persisted: false, code: check.errors[0] || 'LAB_PREFLIGHT_FAILED' }, check);
    var s = store();
    if (!s || typeof s.get !== 'function' || typeof s.insert !== 'function' || typeof s.update !== 'function' || typeof s.remove !== 'function') {
      return { ok: false, persisted: false, code: 'ORBIT_STORE_REQUIRED', writeAllowed: false };
    }
    var allowed = [RUNS, ITEMS], undo = [], applied = [];
    if (plan.operations.some(function (op) { return op.type !== 'upsert' || allowed.indexOf(clean(op.collection)) < 0; })) {
      return { ok: false, persisted: false, code: 'HISTORY_OPERATION_INVALID', writeAllowed: false };
    }
    try {
      plan.operations.forEach(function (op) {
        var before = s.get(op.collection, op.id);
        undo.push({ collection: op.collection, id: op.id, before: before ? clone(before) : null });
        if (before) s.update(op.collection, op.id, sanitize(op.row));
        else s.insert(op.collection, sanitize(op.row));
        applied.push({ collection: op.collection, id: op.id, type: before ? 'update' : 'insert' });
      });
      s.insert(AUDIT, {
        id: stableId('activity', [plan.planId, new Date().toISOString()]),
        tenantId: plan.tenantId,
        tipo: 'aseguradoras_lote_historial_persistido',
        modulo: 'Aseguradoras', entidad: 'batch_run', entidadId: plan.runId,
        actorId: clean(plan.actor && plan.actor.id), activeRole: clean(plan.actor && plan.actor.activeRole),
        motivo: clean(plan.reason), fecha: new Date().toISOString(), planId: plan.planId,
        itemCount: plan.expectedItems, containsReferences: false, containsPaths: false,
        containsRawPayload: false, containsSecrets: false, enablesCotizador: false, enablesComparativo: false
      });
    } catch (error) {
      for (var i = undo.length - 1; i >= 0; i -= 1) {
        var item = undo[i];
        try {
          s.remove(item.collection, item.id);
          if (item.before) s.insert(item.collection, item.before);
        } catch (ignore) {}
      }
      return { ok: false, persisted: false, code: 'HISTORY_WRITE_FAILED_ROLLED_BACK', errors: [clean(error && error.message)], writeAllowed: false };
    }
    if (typeof gate.waitForSettlement === 'function') {
      var settled = await gate.waitForSettlement(0, options.timeoutMs);
      if (!settled.ok) return { ok: false, persisted: false, code: settled.code, errors: settled.errors || [], writeAllowed: false };
    }
    var confirmed = await waitForHistory(plan, options.readModelTimeoutMs || options.timeoutMs);
    return {
      ok: confirmed.ok, persisted: confirmed.ok,
      code: confirmed.ok ? 'BATCH_HISTORY_PERSISTED' : confirmed.code,
      applied: applied, readModel: confirmed,
      enablesCotizador: false, enablesComparativo: false,
      requiresHumanValidation: true, writeAllowed: false
    };
  }
  function resumeDocumentIds(input) {
    input = input || {};
    var model = historyModel(input.tenantId, input.batchId);
    var allowed = unique([].concat(input.statuses || RESUMABLE).map(clean));
    return unique(model.latestItems.filter(function (row) {
      return row.retryEligible === true || allowed.indexOf(clean(row.status)) >= 0;
    }).map(function (row) { return clean(row.documentId); }));
  }
  function install() {
    if (installed) return true;
    var batchApi = Orbit.aseguradorasBatchOrchestratorP09g;
    if (!batchApi || typeof batchApi.run !== 'function') return false;
    originalRun = batchApi.run;
    batchApi.run = async function (input) {
      input = input || {};
      var result = await originalRun(input);
      var batch = input.batch || (typeof batchApi.getBatch === 'function' ? batchApi.getBatch(input.tenantId || 'alianzas-soluciones', input.batchId || 'ays_aseguradoras_knowledge_batch_2026_v1') : null);
      var plan = buildHistoryPlan({
        run: result, batch: batch, actor: input.actor, reason: input.reason,
        confirmed: input.confirmHistoryPlan === true,
        resumedFromRunId: input.resumedFromRunId
      });
      result.history = {
        planId: plan.planId, code: plan.code, confirmed: plan.confirmed,
        itemCount: plan.expectedItems, resumableDocumentIds: result.results ? result.results.filter(function (row) { return RESUMABLE.indexOf(clean(row.status)) >= 0; }).map(function (row) { return clean(row.documentId); }) : [],
        persisted: false, enablesCotizador: false, enablesComparativo: false
      };
      if (input.persistHistory === true) {
        if (input.confirmHistoryPersistence !== true) {
          result.history.code = 'HISTORY_PERSISTENCE_CONFIRMATION_REQUIRED';
        } else {
          plan.confirmed = true;
          var persisted = await persistHistory(plan, input.actor, input.historyOptions || {});
          result.history = Object.assign(result.history, {
            code: persisted.code, persisted: persisted.persisted === true,
            readModel: sanitize(persisted.readModel || {}), appliedCount: [].concat(persisted.applied || []).length
          });
        }
      }
      return result;
    };
    batchApi.resume = async function (input) {
      input = input || {};
      var documentIds = [].concat(input.onlyDocumentIds || resumeDocumentIds(input));
      if (!documentIds.length) return { ok: false, code: 'NO_RESUMABLE_DOCUMENTS', results: [], enablesCotizador: false, enablesComparativo: false };
      var model = historyModel(input.tenantId, input.batchId);
      return batchApi.run(Object.assign({}, input, {
        onlyDocumentIds: documentIds,
        resumedFromRunId: clean(input.resumedFromRunId || model.latest && model.latest.id)
      }));
    };
    batchApi.history = {
      buildReferenceContract: buildReferenceContract,
      buildHistoryPlan: buildHistoryPlan,
      readModel: historyModel,
      resumeDocumentIds: resumeDocumentIds,
      persistHistory: persistHistory
    };
    installed = true;
    return true;
  }

  Orbit.aseguradorasBatchHistoryP09h = {
    RUNS_COLLECTION: RUNS,
    ITEMS_COLLECTION: ITEMS,
    RESUMABLE_STATUSES: RESUMABLE.slice(),
    sanitize: sanitize,
    buildReferenceContract: buildReferenceContract,
    buildHistoryPlan: buildHistoryPlan,
    readModel: historyModel,
    resumeDocumentIds: resumeDocumentIds,
    persistHistory: persistHistory,
    install: install,
    status: function () { return { installed: installed, wrapsBatchRun: !!originalRun, writesDirectly: false, enablesCotizador: false, enablesComparativo: false }; }
  };

  if (!install()) {
    setTimeout(install, 0);
    setTimeout(install, 500);
    setTimeout(install, 1500);
  }
})();