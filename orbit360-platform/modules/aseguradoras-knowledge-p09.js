/* ============================================================
   Orbit 360 · P0.9/P0.10 · Servicio de conocimiento para Aseguradoras
   Fecha: 2026-07-10

   Orquesta resolución tenant → registry → adapters → perfil financiero
   → plan metadata-only → Orbit.store. No registra providers reales ni
   muestra integraciones como activas.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  Orbit.services = Orbit.services || {};

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function clone(value) { return JSON.parse(JSON.stringify(value == null ? null : value)); }
  function runtime() { return Orbit.aseguradorasKnowledgeRuntimeP09; }
  function registry() { return Orbit.documentProviderRegistryP09; }
  function store() { return Orbit.store; }
  function tenantId(input) {
    input = input || {};
    var tenantData = Orbit.tenant && typeof Orbit.tenant.get === 'function' ? Orbit.tenant.get() || {} : {};
    return clean(input.tenantId || input.tenant || tenantData.tenantId || tenantData.id || tenantData.slug);
  }
  function safeDirectory(input) {
    input = input || {};
    var rows = input.directory || (store() && typeof store().all === 'function' ? store().all('aseguradoras') : []) || [];
    return rows.map(function (item) {
      item = item || {};
      return {
        id: clean(item.id), nombre: clean(item.nombre || item.name), razonSocial: clean(item.razonSocial),
        displayName: clean(item.displayName), pais: clean(item.pais || item.country).toUpperCase(),
        aliases: [].concat(item.aliases || []).map(clean).filter(Boolean)
      };
    });
  }
  function sourceName(input) {
    var source = input && input.source || {};
    return clean(source.nombre || source.fileName || source.archivo || source.sourceName);
  }
  function resolveSourceIdentity(input) {
    input = input || {};
    var tenant = tenantId(input), explicit = clean(input.aseguradoraId || input.insurerId);
    var source = input.source || {}, directory = safeDirectory(input), api = Orbit.tenantInsurerConfigP10;
    if (!tenant) return { resolved: false, code: 'TENANT_REQUIRED', insurerId: '', directory: directory, requiresHumanValidation: true };
    if (api && typeof api.resolveInsurer === 'function') {
      var resolution = api.resolveInsurer({
        tenantId: tenant,
        aseguradoraId: explicit,
        name: clean(input.aseguradoraNombre || input.insurerName),
        fileName: sourceName(input),
        sourceName: clean(source.sourceName),
        aliases: [].concat(input.aseguradoraAliases || input.insurerAliases || []),
        pais: clean(source.pais || input.pais),
        directory: directory
      });
      if (resolution.resolved) return Object.assign({}, resolution, { directory: directory });
      if (!explicit) return Object.assign({}, resolution, { insurerId: '', directory: directory });
    }
    if (explicit) return {
      resolved: true, code: 'EXPLICIT_INSURER_ID', tenantId: tenant, insurerId: explicit,
      directoryId: directory.some(function (item) { return item.id === explicit; }) ? explicit : '',
      internalId: '', canonicalKey: '', displayName: '', directory: directory,
      requiresDirectoryWrite: false, requiresHumanValidation: false
    };
    return { resolved: false, code: 'INSURER_NOT_RESOLVED', insurerId: '', directory: directory, requiresHumanValidation: true };
  }
  function insurerSummary(insurer, resolution) {
    insurer = insurer || {}; resolution = resolution || {};
    return {
      id: clean(insurer.id || resolution.insurerId),
      nombre: clean(insurer.nombre || insurer.name || resolution.displayName || resolution.canonicalName),
      pais: clean(insurer.pais || insurer.country || resolution.pais).toUpperCase(),
      moneda: clean(insurer.moneda).toUpperCase(),
      aliases: [].concat(insurer.aliases || resolution.aliases || []).map(clean).filter(Boolean),
      canonicalKey: clean(resolution.canonicalKey),
      internalId: clean(resolution.internalId),
      directoryId: clean(resolution.directoryId)
    };
  }
  function sourceContext(input) {
    input = input || {};
    var resolution = resolveSourceIdentity(input), insurerId = clean(resolution.insurerId);
    var rawInsurer = insurerId && store() && typeof store().get === 'function' ? store().get('aseguradoras', insurerId) : null;
    return {
      tenantId: tenantId(input),
      aseguradoraId: insurerId,
      insurer: insurerSummary(rawInsurer, resolution),
      insurerResolution: clone(resolution),
      directory: clone(resolution.directory || []),
      source: input.source || null,
      purpose: clean(input.purpose || 'training')
    };
  }
  function tenantConfiguration(input) {
    input = input || {};
    if (input.tenantConfig) return input.tenantConfig;
    return Orbit.tenant && typeof Orbit.tenant.get === 'function' ? Orbit.tenant.get() || {} : {};
  }
  async function inspect(input) {
    input = input || {};
    var rt = runtime(), reg = registry(), ctx = sourceContext(input), actor = input.actor || {};
    if (!rt || !reg) return { ok: false, code: 'P09_RUNTIME_REQUIRED', writeAllowed: false };
    if (!ctx.aseguradoraId) return {
      ok: false, code: clean(ctx.insurerResolution && ctx.insurerResolution.code || 'INSURER_NOT_RESOLVED'),
      insurerResolution: ctx.insurerResolution, writeAllowed: false, requiresHumanValidation: true
    };
    var ingestion = rt.buildIngestionRequest(ctx, actor);
    if (!ingestion.ok) return ingestion;
    var providerResult = await reg.execute(ingestion.task, ingestion.request, { tenantConfig: tenantConfiguration(input) });
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
      insurerResolution: ctx.insurerResolution,
      provider: providerResult.provider, audit: providerResult.audit, manifest: result,
      proposals: proposals, tariffRules: rules, presentations: presentations, bindings: bindings,
      writeAllowed: false, requiresHumanValidation: true, enablesCotizador: false, enablesComparativo: false
    };
  }
  function enrichTariffRules(rules, inspection) {
    rules = [].concat(rules || []); inspection = inspection || {};
    var api = Orbit.tenantInsurerConfigP10, ctx = inspection.context || {}, applications = [];
    if (!api || typeof api.applyFinancialProfile !== 'function') return { rules: rules, applications: [] };
    var enriched = rules.map(function (rule) {
      var result = api.applyFinancialProfile(rule, {
        tenantId: clean(ctx.tenantId), aseguradoraId: clean(ctx.aseguradoraId),
        name: clean(ctx.insurer && ctx.insurer.nombre), pais: clean(rule && rule.dimensiones && rule.dimensiones.pais || ctx.insurer && ctx.insurer.pais),
        directory: ctx.directory || []
      });
      applications.push({
        ruleId: clean(rule && rule.id), code: clean(result.code), applied: result.applied === true,
        addedComponents: [].concat(result.addedComponents || []), existingComponents: [].concat(result.existingComponents || []),
        profileId: clean(result.profile && result.profile.id), canonicalKey: clean(result.resolution && result.resolution.canonicalKey),
        writeAllowed: false
      });
      return result.rule || rule;
    });
    return { rules: enriched, applications: applications };
  }
  function buildPlan(inspection, review) {
    inspection = inspection || {}; review = review || {};
    var rt = runtime();
    if (!rt) return { ok: false, errors: ['P09_RUNTIME_REQUIRED'], operations: [], writeAllowed: false };
    var selectedRules = review.tariffRules || inspection.tariffRules;
    var enriched = enrichTariffRules(selectedRules, inspection);
    var plan = rt.buildPersistencePlan({
      context: inspection.context, actor: review.actor, reason: review.reason, confirmed: review.confirmed,
      expectedFingerprint: review.expectedFingerprint,
      manifest: inspection.manifest, proposals: review.proposals || inspection.proposals,
      tariffRules: enriched.rules,
      presentations: review.presentations || inspection.presentations,
      bindings: review.bindings || inspection.bindings
    });
    plan.tenantProfileApplications = enriched.applications;
    plan.enablesCotizador = false;
    plan.enablesComparativo = false;
    return plan;
  }
  function persist(plan, actor) {
    var rt = runtime();
    return rt ? rt.applyPlan(store(), plan, actor) : { ok: false, errors: ['P09_RUNTIME_REQUIRED'], writeAllowed: false };
  }
  function read(input) {
    input = input || {};
    var rt = runtime(), ctx = sourceContext(input);
    if (!ctx.aseguradoraId) return { ok: false, code: clean(ctx.insurerResolution && ctx.insurerResolution.code || 'INSURER_NOT_RESOLVED') };
    return rt ? rt.readModel(store(), ctx.tenantId, ctx.aseguradoraId) : { ok: false, code: 'P09_RUNTIME_REQUIRED' };
  }

  Orbit.services.aseguradorasKnowledgeP09 = {
    resolveSourceIdentity: resolveSourceIdentity,
    sourceContext: sourceContext,
    enrichTariffRules: enrichTariffRules,
    inspect: inspect,
    buildPlan: buildPlan,
    persist: persist,
    read: read
  };
})();