/* ============================================================
   Orbit 360 · P0.9f · Orquestador de primera fuente Aseguradoras
   Fecha: 2026-07-10

   Ejecuta bootstrap → inspección → plan metadata-only → gate LAB → read model.
   No persiste sin confirmación explícita y nunca habilita módulos.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  var registry = Object.create(null);

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function clone(value) {
    try { return JSON.parse(JSON.stringify(value == null ? null : value)); }
    catch (error) { return value; }
  }
  function unique(values) { return Array.from(new Set((values || []).filter(Boolean))); }
  function registerPlan(plan) {
    plan = clone(plan || {});
    if (!clean(plan.id)) throw new Error('PLAN_ID_REQUIRED');
    if (!clean(plan.tenantId)) throw new Error('TENANT_REQUIRED');
    plan.enabled = false;
    plan.enablesCotizador = false;
    plan.enablesComparativo = false;
    plan.requiresHumanValidation = true;
    plan.requiresSecondGateForEnablement = true;
    registry[clean(plan.tenantId) + '::' + clean(plan.id)] = plan;
    return clone(plan);
  }
  function getPlan(tenantId, planId) {
    return clone(registry[clean(tenantId) + '::' + clean(planId)] || null);
  }
  function listPlans(tenantId) {
    var prefix = clean(tenantId) + '::';
    return Object.keys(registry).filter(function (key) { return key.indexOf(prefix) === 0; }).map(function (key) { return clone(registry[key]); });
  }
  function actorSummary(actor) {
    actor = actor || {};
    return {
      id: clean(actor.id || actor.uid || actor.userId),
      tenantId: clean(actor.tenantId || actor.tenant),
      activeRole: clean(actor.activeRole || actor.rolActivo || actor.role || actor.rol),
      roles: [].concat(actor.roles || actor.rolesAsignados || actor.assignedRoles || []).map(clean).filter(Boolean)
    };
  }
  function sourceFromPlan(plan, input) {
    input = input || {};
    var source = Object.assign({}, clone(plan.source || {}), clone(input.sourcePatch || {}));
    source.id = clean(source.id || source.documentId);
    source.documentId = clean(source.documentId || source.id);
    source.archivoRef = clean(input.sourceRef || input.fileRef || input.archivoRef || source.archivoRef);
    source.fileRef = source.archivoRef;
    source.sourceRef = source.archivoRef;
    source.hash = clean(input.sourceHash || source.hash);
    source.sourceHash = source.hash;
    source.pais = clean(source.pais || plan.pais).toUpperCase();
    source.moneda = clean(source.moneda || plan.moneda).toUpperCase();
    source.version = clean(source.version || 'v1');
    source.estado = clean(source.estado || 'lectura_pendiente');
    return source;
  }
  function validateInput(plan, input) {
    input = input || {};
    var errors = [], actor = actorSummary(input.actor);
    if (!plan) errors.push('FIRST_SOURCE_PLAN_NOT_FOUND');
    if (plan && clean(input.tenantId || plan.tenantId) !== clean(plan.tenantId)) errors.push('PLAN_TENANT_MISMATCH');
    if (!actor.id) errors.push('ACTOR_REQUIRED');
    if (!actor.activeRole) errors.push('ACTIVE_ROLE_REQUIRED');
    if (actor.tenantId && plan && actor.tenantId !== plan.tenantId) errors.push('ACTOR_TENANT_MISMATCH');
    var source = plan ? sourceFromPlan(plan, input) : {};
    if (!clean(source.documentId)) errors.push('DOCUMENT_REQUIRED');
    if (!clean(source.archivoRef)) errors.push('BACKEND_SOURCE_REFERENCE_REQUIRED');
    if (!clean(input.reason)) errors.push('REASON_REQUIRED');
    if (input.confirmedPlan !== true) errors.push('PLAN_CONFIRMATION_REQUIRED');
    return { valid: errors.length === 0, errors: unique(errors), actor: actor, source: source };
  }
  async function ensureBootstrap(input) {
    input = input || {};
    var bootstrap = Orbit.aseguradorasRuntimeBootstrapP09f;
    if (!bootstrap) return { ok: false, code: 'P09F_BOOTSTRAP_REQUIRED', errors: ['P09F_BOOTSTRAP_REQUIRED'] };
    if (input.skipBootstrap !== true && typeof bootstrap.start === 'function') await bootstrap.start();
    var status = typeof bootstrap.status === 'function' ? bootstrap.status() : {};
    var preflight = typeof bootstrap.preflight === 'function' ? bootstrap.preflight() : { ok: false, errors: ['BOOTSTRAP_PREFLIGHT_REQUIRED'] };
    return { ok: status.status === 'ready' || status.status === 'requires_runtime_preflight', status: status, preflight: preflight };
  }
  function contextFor(plan, input, validation) {
    return {
      tenantId: plan.tenantId,
      aseguradoraNombre: clean(plan.insurerName),
      aseguradoraAliases: [].concat(plan.insurerAliases || []),
      source: validation.source,
      purpose: clean(plan.purpose || 'training'),
      actor: validation.actor,
      directory: input.directory || []
    };
  }
  async function prepare(input) {
    input = input || {};
    var tenantId = clean(input.tenantId || 'alianzas-soluciones');
    var plan = input.plan || getPlan(tenantId, input.planId || 'ays_aseguate_tarifario_first_source_v1');
    var validation = validateInput(plan, input);
    if (!validation.valid) return {
      ok: false, code: validation.errors[0], errors: validation.errors,
      persisted: false, enablesCotizador: false, enablesComparativo: false, writeAllowed: false
    };
    var boot = await ensureBootstrap(input);
    if (!boot.ok) return {
      ok: false, code: boot.code || 'P09F_BOOTSTRAP_NOT_READY', errors: boot.errors || [boot.code || 'P09F_BOOTSTRAP_NOT_READY'],
      bootstrap: boot, persisted: false, enablesCotizador: false, enablesComparativo: false, writeAllowed: false
    };
    var service = Orbit.services && Orbit.services.aseguradorasKnowledgeP09;
    if (!service || typeof service.inspect !== 'function' || typeof service.buildPlan !== 'function') {
      return { ok: false, code: 'ASEGURADORAS_KNOWLEDGE_SERVICE_REQUIRED', errors: ['ASEGURADORAS_KNOWLEDGE_SERVICE_REQUIRED'], writeAllowed: false };
    }
    var context = contextFor(plan, input, validation);
    var inspection = input.inspection ? clone(input.inspection) : await service.inspect(context);
    if (!inspection || inspection.ok !== true) return {
      ok: false,
      code: clean(inspection && inspection.code || 'INSPECTION_NOT_READY'),
      errors: inspection && inspection.errors || [clean(inspection && inspection.code || 'INSPECTION_NOT_READY')],
      inspection: inspection || null,
      bootstrap: boot,
      persisted: false,
      enablesCotizador: false,
      enablesComparativo: false,
      writeAllowed: false
    };
    var review = input.review || {};
    var persistencePlan = service.buildPlan(inspection, {
      actor: validation.actor,
      reason: clean(input.reason),
      confirmed: true,
      expectedFingerprint: clean(input.expectedFingerprint),
      proposals: review.proposals || inspection.proposals,
      tariffRules: review.tariffRules || inspection.tariffRules,
      presentations: review.presentations || inspection.presentations,
      bindings: review.bindings || inspection.bindings
    });
    if (!persistencePlan || persistencePlan.ok !== true) return {
      ok: false,
      code: persistencePlan && persistencePlan.errors && persistencePlan.errors[0] || 'PERSISTENCE_PLAN_NOT_READY',
      errors: persistencePlan && persistencePlan.errors || ['PERSISTENCE_PLAN_NOT_READY'],
      inspection: inspection,
      persistencePlan: persistencePlan || null,
      bootstrap: boot,
      persisted: false,
      enablesCotizador: false,
      enablesComparativo: false,
      writeAllowed: false
    };
    persistencePlan.enablesCotizador = false;
    persistencePlan.enablesComparativo = false;
    persistencePlan.metadataOnly = true;
    return {
      ok: true,
      code: 'FIRST_SOURCE_PLAN_READY_METADATA_ONLY',
      planDefinition: clone(plan),
      source: clone(validation.source),
      actor: clone(validation.actor),
      inspection: inspection,
      persistencePlan: persistencePlan,
      bootstrap: boot,
      persisted: false,
      requiresPersistenceConfirmation: true,
      requiresHumanValidation: true,
      requiresSecondGateForEnablement: true,
      enablesCotizador: false,
      enablesComparativo: false,
      writeAllowed: false
    };
  }
  async function persist(prepared, input) {
    input = input || {};
    if (!prepared || prepared.ok !== true || !prepared.persistencePlan) return {
      ok: false, persisted: false, code: 'PREPARED_PLAN_REQUIRED', errors: ['PREPARED_PLAN_REQUIRED'], writeAllowed: false
    };
    if (input.confirmPersistence !== true) return {
      ok: true,
      persisted: false,
      code: 'FIRST_SOURCE_DRY_RUN_READY',
      prepared: prepared,
      enablesCotizador: false,
      enablesComparativo: false,
      writeAllowed: false
    };
    var gate = Orbit.aseguradorasLabPersistenceP09e;
    if (!gate || typeof gate.persist !== 'function') return {
      ok: false, persisted: false, code: 'LAB_PERSISTENCE_GATE_REQUIRED', errors: ['LAB_PERSISTENCE_GATE_REQUIRED'], writeAllowed: false
    };
    var actor = actorSummary(input.actor || prepared.actor);
    var result = await gate.persist(prepared.persistencePlan, actor, { timeoutMs: input.timeoutMs });
    return Object.assign({}, result, {
      prepared: prepared,
      enablesCotizador: false,
      enablesComparativo: false,
      requiresSecondGateForEnablement: true,
      writeAllowed: false
    });
  }
  function verify(input) {
    input = input || {};
    var service = Orbit.services && Orbit.services.aseguradorasKnowledgeP09;
    if (!service || typeof service.read !== 'function') return { ok: false, code: 'ASEGURADORAS_KNOWLEDGE_SERVICE_REQUIRED' };
    var plan = input.plan || getPlan(input.tenantId || 'alianzas-soluciones', input.planId || 'ays_aseguate_tarifario_first_source_v1');
    if (!plan) return { ok: false, code: 'FIRST_SOURCE_PLAN_NOT_FOUND' };
    var model = service.read({
      tenantId: plan.tenantId,
      aseguradoraNombre: plan.insurerName,
      aseguradoraAliases: plan.insurerAliases,
      source: sourceFromPlan(plan, input),
      directory: input.directory || []
    });
    var sourceDocumentId = clean(plan.source && plan.source.documentId);
    var sourceVisible = !!(model && model.insurer && [].concat(model.insurer.docs || []).some(function (doc) { return clean(doc.id) === sourceDocumentId; }));
    var manifestVisible = !!(model && [].concat(model.manifests || []).some(function (item) { return clean(item.documentId) === sourceDocumentId; }));
    return {
      ok: sourceVisible && manifestVisible,
      code: sourceVisible && manifestVisible ? 'FIRST_SOURCE_VISIBLE_IN_READ_MODEL' : 'FIRST_SOURCE_READ_MODEL_INCOMPLETE',
      sourceVisible: sourceVisible,
      manifestVisible: manifestVisible,
      model: model,
      enablesCotizador: false,
      enablesComparativo: false
    };
  }
  async function run(input) {
    var prepared = await prepare(input || {});
    if (!prepared.ok) return prepared;
    return persist(prepared, input || {});
  }

  Orbit.aseguradorasFirstSourceP09f = {
    registerPlan: registerPlan,
    getPlan: getPlan,
    listPlans: listPlans,
    validateInput: validateInput,
    sourceFromPlan: sourceFromPlan,
    prepare: prepare,
    persist: persist,
    verify: verify,
    run: run
  };

  (window.OrbitFirstSourcePlansP09f || []).forEach(registerPlan);
})();