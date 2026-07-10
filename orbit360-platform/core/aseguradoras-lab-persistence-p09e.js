/* ============================================================
   Orbit 360 · P0.9e · Gate de persistencia metadata-only en Firestore LAB
   Fecha: 2026-07-10

   Exige modo LAB explícito, tenant A&S, Auth LAB, guard de seguridad,
   snapshots base y snapshots de conocimiento. No habilita módulos.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  var REVIEW_ROLES = ['superadmin', 'super_admin', 'direccion', 'admin', 'admintenant', 'admin_tenant'];

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function norm(value) {
    return clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }
  function unique(values) { return Array.from(new Set((values || []).filter(Boolean))); }
  function backend() { return window.OrbitBackend || window.ORBIT_BACKEND || {}; }
  function store() { return window.Orbit && window.Orbit.store; }
  function backendStatus() {
    var b = backend();
    try { if (typeof b.status === 'function') return b.status() || {}; } catch (error) {}
    try { if (store() && typeof store()._labStatus === 'function') return store()._labStatus() || {}; } catch (error) {}
    return b || {};
  }
  function actorIdentity(actor) {
    actor = actor || {};
    var assigned = [].concat(actor.roles || actor.rolesAsignados || actor.assignedRoles || []).map(norm).filter(Boolean);
    var activeRole = norm(actor.activeRole || actor.rolActivo || actor.role || actor.rol);
    return {
      id: clean(actor.id || actor.uid || actor.userId),
      tenantId: clean(actor.tenantId || actor.tenant),
      activeRole: activeRole,
      assignedRoles: unique(assigned)
    };
  }
  function planSafe(plan) {
    plan = plan || {};
    return plan.ok === true && plan.confirmed === true && plan.metadataOnly === true &&
      plan.enablesCotizador !== true && plan.enablesComparativo !== true &&
      (plan.operations || []).every(function (operation) {
        var row = operation && operation.row || operation && operation.source || {};
        return row.enabled !== true && row.enabledCotizador !== true && row.enabledComparativo !== true &&
          row.enabledCotizadorAutomatico !== true && row.enabledCotizadorPdfExterno !== true;
      });
  }
  function preflight(plan, actor) {
    var errors = [], b = backend(), status = backendStatus(), s = store();
    var identity = actorIdentity(actor);
    var extension = Orbit.aseguradorasLabCollectionsP09e;
    var extensionStatus = extension && typeof extension.status === 'function' ? extension.status() : {};
    var tenantId = clean(b.tenantId || b.tenant || status.tenantId || status.tenant);
    var expectedUid = clean(status.expectedUid || b.expectedUid);
    var expectedEmail = clean(status.expectedEmail || b.expectedEmail).toLowerCase();
    var auth = status.auth || {};

    if (clean(b.mode || status.mode) !== 'firestore-lab') errors.push('FIRESTORE_LAB_REQUIRED');
    if (tenantId !== 'alianzas-soluciones') errors.push('LAB_TENANT_NOT_ALLOWED');
    if (!s || s.__firestoreLabExplicit !== true) errors.push('EXPLICIT_LAB_STORE_REQUIRED');
    if (!status.snapshotAttached || Number(status.snapshotAttachedCount || 0) < 1) errors.push('BASE_SNAPSHOTS_REQUIRED');
    if (!b.securityGuard || b.securityGuard.installed !== true) errors.push('BACKEND_SECURITY_GUARD_REQUIRED');
    if (!extensionStatus.installed || extensionStatus.snapshotAttachedCount !== extensionStatus.collections.length) errors.push('KNOWLEDGE_SNAPSHOTS_REQUIRED');
    if (!auth || !clean(auth.uid || auth.email)) errors.push('LAB_AUTH_REQUIRED');
    if (auth && expectedUid && clean(auth.uid) !== expectedUid && clean(auth.email).toLowerCase() !== expectedEmail) errors.push('LAB_AUTH_MISMATCH');
    if (!identity.id) errors.push('ACTOR_REQUIRED');
    if (!identity.activeRole || REVIEW_ROLES.indexOf(identity.activeRole) < 0) errors.push('ACTIVE_ROLE_NOT_AUTHORIZED');
    if (identity.assignedRoles.length && identity.assignedRoles.indexOf(identity.activeRole) < 0) errors.push('ACTIVE_ROLE_NOT_ASSIGNED');
    if (identity.tenantId && identity.tenantId !== tenantId) errors.push('ACTOR_TENANT_MISMATCH');
    if (!planSafe(plan)) errors.push('METADATA_ONLY_PLAN_REQUIRED');
    if (plan && clean(plan.tenantId) !== tenantId) errors.push('PLAN_TENANT_MISMATCH');

    return {
      ok: errors.length === 0,
      errors: unique(errors),
      tenantId: tenantId,
      actor: identity,
      backend: {
        mode: clean(b.mode || status.mode),
        snapshotAttached: status.snapshotAttached === true,
        snapshotAttachedCount: Number(status.snapshotAttachedCount || 0),
        auth: auth && { uid: clean(auth.uid), email: clean(auth.email) }
      },
      knowledgeCollections: extensionStatus,
      writeAllowed: false
    };
  }
  function writeErrorCount(status) { return [].concat(status && status.writeErrors || []).length; }
  function sleep(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }
  async function waitForSettlement(startErrorCount, timeoutMs) {
    var started = Date.now(), timeout = Number(timeoutMs || 12000);
    while (Date.now() - started <= timeout) {
      var status = backendStatus();
      var queue = [].concat(status.writeQueue || []);
      var errors = [].concat(status.writeErrors || []);
      if (errors.length > startErrorCount) return { ok: false, code: 'LAB_WRITE_FAILED', status: status, errors: errors.slice(startErrorCount) };
      if (!queue.length) return { ok: true, code: 'LAB_WRITES_SETTLED', status: status };
      await sleep(120);
    }
    return { ok: false, code: 'LAB_WRITE_TIMEOUT', status: backendStatus(), errors: [] };
  }
  async function persist(plan, actor, options) {
    options = options || {};
    var check = preflight(plan, actor);
    if (!check.ok) return Object.assign({ persisted: false, code: check.errors[0] || 'LAB_PREFLIGHT_FAILED' }, check);
    var service = Orbit.services && Orbit.services.aseguradorasKnowledgeP09;
    if (!service || typeof service.persist !== 'function' || typeof service.read !== 'function') {
      return { persisted: false, code: 'ASEGURADORAS_KNOWLEDGE_SERVICE_REQUIRED', errors: ['ASEGURADORAS_KNOWLEDGE_SERVICE_REQUIRED'], writeAllowed: false };
    }
    var before = backendStatus(), startErrorCount = writeErrorCount(before);
    var result = service.persist(plan, actor);
    if (!result || result.ok !== true) return {
      persisted: false,
      code: result && result.errors && result.errors[0] || 'LAB_PERSIST_REJECTED',
      errors: result && result.errors || ['LAB_PERSIST_REJECTED'],
      result: result || null,
      writeAllowed: false
    };
    var settled = await waitForSettlement(startErrorCount, options.timeoutMs);
    if (!settled.ok) return {
      persisted: false, code: settled.code, errors: settled.errors || [settled.code],
      result: result, backendStatus: settled.status, writeAllowed: false
    };
    var model = service.read({ tenantId: plan.tenantId, aseguradoraId: plan.aseguradoraId });
    var sourceVisible = !!(model && model.insurer && [].concat(model.insurer.docs || []).some(function (doc) {
      return clean(doc.id) === clean(plan.sourceDocumentId);
    }));
    var manifestVisible = !!(model && [].concat(model.manifests || []).some(function (item) {
      return clean(item.documentId) === clean(plan.sourceDocumentId);
    }));
    if (!sourceVisible || !manifestVisible) return {
      persisted: false,
      code: 'LAB_READ_MODEL_NOT_CONFIRMED',
      errors: [!sourceVisible ? 'SOURCE_NOT_VISIBLE' : '', !manifestVisible ? 'MANIFEST_NOT_VISIBLE' : ''].filter(Boolean),
      result: result, model: model, writeAllowed: false
    };
    return {
      persisted: true,
      code: 'LAB_METADATA_PERSISTED_PENDING_VALIDATION',
      result: result,
      model: model,
      backendStatus: settled.status,
      enablesCotizador: false,
      enablesComparativo: false,
      requiresHumanValidation: true,
      writeAllowed: false
    };
  }

  Orbit.aseguradorasLabPersistenceP09e = {
    REVIEW_ROLES: REVIEW_ROLES.slice(),
    planSafe: planSafe,
    preflight: preflight,
    waitForSettlement: waitForSettlement,
    persist: persist
  };
})();