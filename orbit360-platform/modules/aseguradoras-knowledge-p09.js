/* ============================================================
   Orbit 360 · P0.9 · Servicio de conocimiento para Aseguradoras
   Fecha: 2026-07-10

   Orquesta registry → adapters → plan metadata-only → Orbit.store.
   No registra providers reales ni muestra integraciones como activas.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  Orbit.services = Orbit.services || {};

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function runtime() { return Orbit.aseguradorasKnowledgeRuntimeP09; }
  function registry() { return Orbit.documentProviderRegistryP09; }
  function store() { return Orbit.store; }
  function sourceContext(input) {
    input = input || {};
    var insurerId = clean(input.aseguradoraId || input.insurerId);
    return {
      tenantId: clean(input.tenantId || Orbit.tenant && (Orbit.tenant.id || Orbit.tenant.tenantId)),
      aseguradoraId: insurerId,
      insurer: input.insurer || (store() && store().get('aseguradoras', insurerId)) || null,
      source: input.source || null,
      purpose: clean(input.purpose || 'training')
    };
  }
  async function inspect(input) {
    input = input || {};
    var rt = runtime(), reg = registry(), ctx = sourceContext(input), actor = input.actor || {};
    if (!rt || !reg) return { ok: false, code: 'P09_RUNTIME_REQUIRED', writeAllowed: false };
    var ingestion = rt.buildIngestionRequest(ctx, actor);
    if (!ingestion.ok) return ingestion;
    var providerResult = await reg.execute(ingestion.task, ingestion.request, { tenantConfig: input.tenantConfig || {} });
    if (!providerResult.ok) return providerResult;
    var result = providerResult.result || {}, proposals = [], rules = [], presentations = [], bindings = [];
    if (ingestion.task === 'excel_manifest') {
      var adapter = Orbit.excelRuleProposalAdapterP06b;
      if (adapter && typeof adapter.mappingTemplate === 'function') {
        var template = adapter.mappingTemplate(result);
        proposals.push({
          id: 'mapping_' + clean(ingestion.request.documentId), tipo: 'excel_mapping_template', estado: 'requiere_validacion',
          documentId: clean(ingestion.request.documentId), template: template, requiresHumanValidation: true
        });
      }
    }
    if (ingestion.task === 'pdf_manifest') {
      var pdf = Orbit.pdfQuoteAdapterP07;
      if (pdf && typeof pdf.buildQuoteProfile === 'function') {
        presentations.push(pdf.buildQuoteProfile(Object.assign({}, result, {
          tenantId: ctx.tenantId, aseguradoraId: ctx.aseguradoraId, documentId: ingestion.request.documentId,
          fileRef: ingestion.request.fileRef, sourceHash: ingestion.request.sourceHash, purpose: ctx.purpose,
          dimensiones: ingestion.request.dimensiones
        }), ctx));
      }
    }
    return {
      ok: true, code: 'KNOWLEDGE_INSPECTION_READY_FOR_REVIEW', context: ctx, task: ingestion.task,
      provider: providerResult.provider, audit: providerResult.audit, manifest: result,
      proposals: proposals, tariffRules: rules, presentations: presentations, bindings: bindings,
      writeAllowed: false, requiresHumanValidation: true, enablesCotizador: false, enablesComparativo: false
    };
  }
  function buildPlan(inspection, review) {
    inspection = inspection || {}; review = review || {};
    var rt = runtime();
    if (!rt) return { ok: false, errors: ['P09_RUNTIME_REQUIRED'], operations: [], writeAllowed: false };
    return rt.buildPersistencePlan({
      context: inspection.context, actor: review.actor, reason: review.reason, confirmed: review.confirmed,
      expectedFingerprint: review.expectedFingerprint,
      manifest: inspection.manifest, proposals: review.proposals || inspection.proposals,
      tariffRules: review.tariffRules || inspection.tariffRules,
      presentations: review.presentations || inspection.presentations,
      bindings: review.bindings || inspection.bindings
    });
  }
  function persist(plan, actor) {
    var rt = runtime();
    return rt ? rt.applyPlan(store(), plan, actor) : { ok: false, errors: ['P09_RUNTIME_REQUIRED'], writeAllowed: false };
  }
  function read(input) {
    input = input || {};
    var rt = runtime(), ctx = sourceContext(input);
    return rt ? rt.readModel(store(), ctx.tenantId, ctx.aseguradoraId) : { ok: false, code: 'P09_RUNTIME_REQUIRED' };
  }

  Orbit.services.aseguradorasKnowledgeP09 = { inspect: inspect, buildPlan: buildPlan, persist: persist, read: read };
})();