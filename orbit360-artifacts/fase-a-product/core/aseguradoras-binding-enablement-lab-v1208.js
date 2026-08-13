/* ============================================================
   Orbit 360 · v1.208 · Escritor controlado del segundo gate en LAB

   Materializa únicamente planes aprobados por knowledge-binding-gate P0.8.
   No aprueba por sí mismo, no contiene datos de tenant y no se autoejecuta.
   En este LAB solo admite el tenant alianzas-soluciones.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  var COLLECTION = 'aseguradora_bindings';
  var AUDIT_COLLECTION = 'actividades';
  var TARGETS = ['cotizador_automatico', 'cotizador_pdf_externo', 'comparativo'];
  var GATE_ROLES = ['superadmin', 'super_admin', 'direccion', 'admin', 'admintenant', 'admin_tenant'];

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function norm(value) {
    return clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }
  function clone(value) { try { return JSON.parse(JSON.stringify(value == null ? null : value)); } catch (error) { return value; } }
  function unique(values) { return Array.from(new Set((values || []).filter(Boolean))); }
  function stableId(prefix, parts) {
    var text = (parts || []).map(norm).join('|'), hash = 0;
    for (var i = 0; i < text.length; i += 1) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    return prefix + '_' + Math.abs(hash).toString(36);
  }
  function backend() { return window.OrbitBackend || window.ORBIT_BACKEND || {}; }
  function store() { return Orbit.store; }
  function backendStatus() {
    var b = backend(), s = store();
    try { if (typeof b.status === 'function') return b.status() || {}; } catch (error) {}
    try { if (s && typeof s._labStatus === 'function') return s._labStatus() || {}; } catch (error) {}
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
  function actorAuthorized(actor) {
    var identity = actorIdentity(actor);
    return !!(identity.id && identity.activeRole && GATE_ROLES.indexOf(identity.activeRole) >= 0 &&
      (!identity.assignedRoles.length || identity.assignedRoles.indexOf(identity.activeRole) >= 0));
  }
  function sourceBindings() {
    var rows = [];
    try { rows = store() && typeof store().all === 'function' ? store().all(COLLECTION) || [] : []; } catch (error) {}
    return rows.filter(function (row) { return row && row.runtimeEnablementRecord !== true && !clean(row.target); });
  }
  function sourceBinding(bindingId) {
    return sourceBindings().find(function (row) { return clean(row.id) === clean(bindingId); }) || null;
  }
  function gateApi() { return Orbit.knowledgeBindingPolicyP08 || Orbit.knowledgeBindingGateP08; }
  function bindingFingerprint(binding) {
    var gate = Orbit.knowledgeBindingGateP08;
    return gate && typeof gate.bindingFingerprint === 'function' ? clean(gate.bindingFingerprint(binding)) : '';
  }
  function tenantIdFromRuntime() {
    var b = backend(), status = backendStatus(), query = null;
    try { query = new URLSearchParams(window.location && window.location.search || ''); } catch (error) { query = new URLSearchParams(''); }
    return clean(query.get('tenant') || b.tenantId || b.tenant || status.tenantId || status.tenant);
  }
  function buildPlan(input) {
    input = input || {};
    var actor = input.actor || {}, identity = actorIdentity(actor), errors = [];
    var binding = sourceBinding(input.bindingId);
    var target = clean(input.target), reason = clean(input.reason || input.motivo);
    if (!binding) errors.push('BINDING_NO_ENCONTRADO');
    if (TARGETS.indexOf(target) < 0) errors.push('TARGET_INVALIDO');
    if (!actorAuthorized(actor)) errors.push('ROL_ACTIVO_NO_AUTORIZADO');
    if (!reason) errors.push('MOTIVO_REQUERIDO');
    if (input.confirmed !== true) errors.push('CONFIRMACION_REFORZADA_REQUERIDA');
    if (errors.length) return { ok: false, errors: unique(errors), plan: null, writeAllowed: false };

    var gate = gateApi();
    if (!gate || typeof gate.buildEnablementPlan !== 'function' || typeof gate.buildRuntimePackage !== 'function') {
      return { ok: false, errors: ['KNOWLEDGE_BINDING_GATE_REQUIRED'], plan: null, writeAllowed: false };
    }
    var decision = { target: target, enabled: input.enabled !== false, reason: reason, confirmed: true };
    var approval = gate.buildEnablementPlan(binding, decision, actor, input.tenantConfig || {});
    if (!approval || approval.ok !== true || !approval.plan) {
      return { ok: false, errors: unique([].concat(approval && approval.errors || ['BINDING_NO_LISTO_PARA_GATE'])), evaluation: approval && approval.evaluation, plan: null, writeAllowed: false };
    }
    var runtimePackage = gate.buildRuntimePackage([binding], [approval.plan]);
    if (!runtimePackage || runtimePackage.ok !== true || runtimePackage.records.length !== 1) {
      return { ok: false, errors: unique([].concat(runtimePackage && runtimePackage.errors || ['RUNTIME_PACKAGE_INVALIDO'])), plan: null, writeAllowed: false };
    }
    var record = clone(runtimePackage.records[0]);
    record.runtimeEnablementRecord = true;
    record.sourceBindingId = clean(binding.id);
    record.sourceBindingFingerprint = clean(approval.plan.expectedBindingFingerprint || bindingFingerprint(binding));
    record.status = record.enabled === true ? 'enabled' : 'disabled';
    record.updatedAt = new Date().toISOString();
    record.createdAt = clean(record.createdAt) || record.updatedAt;
    record.requiresHumanValidation = false;
    record.requiresSecondGateForEnablement = false;
    return {
      ok: true,
      errors: [],
      plan: {
        id: stableId('binding_enablement_lab', [binding.id, target, identity.id, record.updatedAt]),
        tenantId: clean(binding.tenantId),
        aseguradoraId: clean(binding.aseguradoraId),
        bindingId: clean(binding.id),
        target: target,
        enabled: record.enabled === true,
        reason: reason,
        confirmed: true,
        actor: identity,
        expectedBindingFingerprint: record.sourceBindingFingerprint,
        runtimeRecord: record,
        evaluation: clone(approval.evaluation || {}),
        createdAt: record.updatedAt,
        requiresExternalWriter: true,
        writeAllowed: false
      },
      evaluation: approval.evaluation,
      writeAllowed: false
    };
  }
  function planSafe(plan) {
    plan = plan || {};
    var record = plan.runtimeRecord || {};
    return plan.confirmed === true && TARGETS.indexOf(clean(plan.target)) >= 0 &&
      clean(plan.bindingId) && clean(plan.expectedBindingFingerprint) &&
      clean(record.bindingId) === clean(plan.bindingId) && clean(record.sourceBindingId) === clean(plan.bindingId) &&
      clean(record.target) === clean(plan.target) && typeof record.enabled === 'boolean' &&
      record.runtimeEnablementRecord === true && clean(record.sourceBindingFingerprint) === clean(plan.expectedBindingFingerprint);
  }
  function preflight(plan, actor) {
    plan = plan || {}; actor = actor || {};
    var errors = [], b = backend(), status = backendStatus(), s = store(), identity = actorIdentity(actor);
    var tenantId = clean(b.tenantId || b.tenant || status.tenantId || status.tenant || tenantIdFromRuntime());
    var expectedUid = clean(status.expectedUid || b.expectedUid), expectedEmail = clean(status.expectedEmail || b.expectedEmail).toLowerCase();
    var auth = status.auth || {};
    var snapshots = Orbit.aseguradorasLabCollectionsP09e;
    var snapshotStatus = snapshots && typeof snapshots.status === 'function' ? snapshots.status() : {};
    var binding = sourceBinding(plan.bindingId), currentFingerprint = bindingFingerprint(binding);

    if (clean(b.mode || status.mode) !== 'firestore-lab') errors.push('FIRESTORE_LAB_REQUIRED');
    if (tenantId !== 'alianzas-soluciones') errors.push('LAB_TENANT_NOT_ALLOWED');
    if (!s || s.__firestoreLabExplicit !== true) errors.push('EXPLICIT_LAB_STORE_REQUIRED');
    if (!status.snapshotAttached) errors.push('BASE_SNAPSHOTS_REQUIRED');
    if (!snapshotStatus.installed || snapshotStatus.snapshotAttachedCount !== snapshotStatus.collections.length) errors.push('KNOWLEDGE_SNAPSHOTS_REQUIRED');
    if (!b.securityGuard || b.securityGuard.installed !== true) errors.push('BACKEND_SECURITY_GUARD_REQUIRED');
    if (!clean(auth.uid || auth.email)) errors.push('LAB_AUTH_REQUIRED');
    if (expectedUid && clean(auth.uid) !== expectedUid && clean(auth.email).toLowerCase() !== expectedEmail) errors.push('LAB_AUTH_MISMATCH');
    if (!actorAuthorized(actor)) errors.push('ACTIVE_ROLE_NOT_AUTHORIZED');
    if (identity.tenantId && identity.tenantId !== tenantId) errors.push('ACTOR_TENANT_MISMATCH');
    if (!planSafe(plan)) errors.push('ENABLEMENT_PLAN_REQUIRED');
    if (clean(plan.tenantId) !== tenantId) errors.push('PLAN_TENANT_MISMATCH');
    if (clean(plan.actor && plan.actor.id) !== identity.id) errors.push('ACTOR_MISMATCH');
    if (!binding) errors.push('BINDING_NO_ENCONTRADO');
    if (binding && clean(plan.expectedBindingFingerprint) !== currentFingerprint) errors.push('BINDING_CAMBIO_REEJECUTAR_GATE');

    return {
      ok: errors.length === 0,
      errors: unique(errors),
      tenantId: tenantId,
      actor: identity,
      binding: binding,
      currentBindingFingerprint: currentFingerprint,
      writeAllowed: false
    };
  }
  function writeErrorCount(status) { return [].concat(status && status.writeErrors || []).length; }
  function sleep(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }
  async function waitForSettlement(startErrorCount, timeoutMs) {
    var started = Date.now(), timeout = Number(timeoutMs || 12000);
    while (Date.now() - started <= timeout) {
      var status = backendStatus(), queue = [].concat(status.writeQueue || []), errors = [].concat(status.writeErrors || []);
      if (errors.length > startErrorCount) return { ok: false, code: 'LAB_WRITE_FAILED', errors: errors.slice(startErrorCount), status: status };
      if (!queue.length) return { ok: true, code: 'LAB_WRITES_SETTLED', status: status };
      await sleep(120);
    }
    return { ok: false, code: 'LAB_WRITE_TIMEOUT', errors: [], status: backendStatus() };
  }
  async function waitForRecord(recordId, enabled, timeoutMs) {
    var started = Date.now(), timeout = Number(timeoutMs || 12000), found = null;
    while (Date.now() - started <= timeout) {
      try { found = store().get(COLLECTION, recordId); } catch (error) { found = null; }
      if (found && found.runtimeEnablementRecord === true && found.enabled === enabled && clean(found.target)) {
        return { ok: true, code: 'ENABLEMENT_READ_MODEL_CONFIRMED', record: found };
      }
      await sleep(120);
    }
    return { ok: false, code: 'ENABLEMENT_READ_MODEL_NOT_CONFIRMED', record: found };
  }
  function restoreRecord(before, recordId) {
    var s = store();
    try {
      if (before) s.update(COLLECTION, recordId, before);
      else s.remove(COLLECTION, recordId);
    } catch (error) {}
  }
  async function persist(plan, actor, options) {
    options = options || {};
    var check = preflight(plan, actor);
    if (!check.ok) return { persisted: false, code: check.errors[0] || 'ENABLEMENT_PREFLIGHT_FAILED', errors: check.errors, writeAllowed: false };

    var s = store(), record = clone(plan.runtimeRecord), before = s.get(COLLECTION, record.id) || null;
    var statusBefore = backendStatus(), startErrorCount = writeErrorCount(statusBefore);
    try {
      if (before) s.update(COLLECTION, record.id, record); else s.insert(COLLECTION, record);
      s.insert(AUDIT_COLLECTION, {
        id: stableId('activity_binding_gate', [plan.id, new Date().toISOString()]),
        tenantId: plan.tenantId,
        tipo: plan.enabled ? 'aseguradora_binding_habilitado' : 'aseguradora_binding_deshabilitado',
        modulo: 'Aseguradoras', entidad: 'aseguradora_binding', entidadId: plan.bindingId,
        actorId: check.actor.id, activeRole: check.actor.activeRole,
        motivo: plan.reason, fecha: new Date().toISOString(), target: plan.target,
        runtimeRecordId: record.id, sourceBindingFingerprint: plan.expectedBindingFingerprint,
        before: before ? { enabled: before.enabled, status: before.status, target: before.target } : null,
        after: { enabled: record.enabled, status: record.status, target: record.target }
      });
    } catch (error) {
      restoreRecord(before, record.id);
      return { persisted: false, code: 'ENABLEMENT_WRITE_REJECTED', errors: [clean(error && error.message || error)], writeAllowed: false };
    }

    var settled = await waitForSettlement(startErrorCount, options.timeoutMs);
    if (!settled.ok) {
      restoreRecord(before, record.id);
      return { persisted: false, code: settled.code, errors: settled.errors || [settled.code], backendStatus: settled.status, writeAllowed: false };
    }
    var confirmed = await waitForRecord(record.id, record.enabled, options.readModelTimeoutMs || options.timeoutMs);
    if (!confirmed.ok) {
      restoreRecord(before, record.id);
      return { persisted: false, code: confirmed.code, errors: [confirmed.code], record: confirmed.record, writeAllowed: false };
    }
    return {
      persisted: true,
      code: record.enabled ? 'BINDING_TARGET_ENABLED_CONFIRMED' : 'BINDING_TARGET_DISABLED_CONFIRMED',
      record: confirmed.record,
      target: record.target,
      enabled: record.enabled,
      requiresHumanValidation: false,
      writeAllowed: false
    };
  }

  Orbit.aseguradorasBindingEnablementLabV1208 = {
    COLLECTION: COLLECTION,
    TARGETS: TARGETS.slice(),
    GATE_ROLES: GATE_ROLES.slice(),
    actorIdentity: actorIdentity,
    actorAuthorized: actorAuthorized,
    sourceBinding: sourceBinding,
    bindingFingerprint: bindingFingerprint,
    buildPlan: buildPlan,
    planSafe: planSafe,
    preflight: preflight,
    waitForSettlement: waitForSettlement,
    waitForRecord: waitForRecord,
    persist: persist
  };
})();
