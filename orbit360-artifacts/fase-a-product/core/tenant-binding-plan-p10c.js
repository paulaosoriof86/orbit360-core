/* ============================================================
   Orbit 360 · P0.10c · Constructor reusable de bindings por tenant
   Fecha: 2026-07-10

   Combina reglas revisadas, perfiles de presentación y casos de validación.
   No persiste, no habilita y no contiene cifras de aseguradoras en el core.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  var registry = Object.create(null);

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function norm(value) {
    return clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }
  function clone(value) { return JSON.parse(JSON.stringify(value == null ? null : value)); }
  function unique(values) { return Array.from(new Set((values || []).filter(Boolean))); }
  function dims(input) {
    input = input || {};
    var source = input.dimensiones || input.dimensions || input;
    return {
      pais: clean(source.pais).toUpperCase(), moneda: clean(source.moneda).toUpperCase(),
      ramo: clean(source.ramo), producto: clean(source.producto),
      familiaProducto: clean(source.familiaProducto), subtipoProducto: clean(source.subtipoProducto),
      segmento: clean(source.segmento), tipoRiesgo: clean(source.tipoRiesgo),
      tipoVehiculo: clean(source.tipoVehiculo), usoVehiculo: clean(source.usoVehiculo), plan: clean(source.plan)
    };
  }
  function dimensionMatch(left, right) {
    left = dims(left); right = dims(right);
    var keys = ['pais','moneda','ramo','producto','familiaProducto','subtipoProducto','segmento','tipoRiesgo','tipoVehiculo','usoVehiculo','plan'];
    return keys.every(function (key) {
      return !clean(left[key]) || !clean(right[key]) || norm(left[key]) === norm(right[key]);
    });
  }
  function registerPlan(plan) {
    plan = clone(plan || {});
    if (!clean(plan.tenantId)) throw new Error('TENANT_REQUIRED');
    if (!clean(plan.id)) throw new Error('PLAN_ID_REQUIRED');
    plan.enabled = false;
    plan.enablesCotizador = false;
    plan.enablesComparativo = false;
    plan.requiresHumanValidation = true;
    registry[clean(plan.tenantId) + '::' + clean(plan.id)] = plan;
    return clone(plan);
  }
  function getPlan(tenantId, planId) { return clone(registry[clean(tenantId) + '::' + clean(planId)] || null); }
  function resolvePlanInsurer(plan, input) {
    var api = Orbit.tenantInsurerConfigP10;
    if (!api || typeof api.resolveInsurer !== 'function') return { resolved: false, code: 'TENANT_INSURER_CONFIG_REQUIRED' };
    return api.resolveInsurer({
      tenantId: clean(plan.tenantId),
      aseguradoraId: clean(input.aseguradoraId || input.insurerId),
      name: clean(plan.insurerName || plan.aseguradoraNombre),
      aliases: [].concat(plan.insurerAliases || plan.aseguradoraAliases || []),
      pais: clean(plan.pais),
      directory: input.directory || []
    });
  }
  function enrichRules(rules, resolution, input) {
    var api = Orbit.tenantInsurerConfigP10;
    return [].concat(rules || []).map(function (rule) {
      if (!api || typeof api.applyFinancialProfile !== 'function') return clone(rule);
      var result = api.applyFinancialProfile(rule, {
        tenantId: clean(input.tenantId),
        aseguradoraId: clean(resolution.insurerId),
        name: clean(resolution.displayName || resolution.canonicalName),
        pais: clean(rule && rule.dimensiones && rule.dimensiones.pais || resolution.pais),
        directory: input.directory || []
      });
      return result.rule || clone(rule);
    });
  }
  function reconcileCases(rules, cases) {
    var api = Orbit.tariffQuoteReconciliationP06c;
    if (!api || typeof api.reconcile !== 'function') return [].concat(cases || []).map(function (sample) {
      return { sampleId: clean(sample && sample.id), status: 'incomplete_requires_validation', errors: ['RECONCILIATION_CONTRACT_REQUIRED'] };
    });
    var rows = [];
    [].concat(cases || []).forEach(function (sample) {
      var candidates = [].concat(rules || []).filter(function (rule) { return dimensionMatch(rule, sample); });
      if (!candidates.length) {
        rows.push({ sampleId: clean(sample && sample.id), status: 'incomplete_requires_validation', errors: ['RULE_NOT_FOUND_FOR_SAMPLE'] });
        return;
      }
      candidates.forEach(function (rule) { rows.push(api.reconcile(rule, sample)); });
    });
    return rows;
  }
  function buildBindings(rules, profiles) {
    var gate = Orbit.knowledgeBindingGateP08;
    if (!gate || typeof gate.buildBindings !== 'function') return {
      bindings: [], summary: { total: 0, complete: 0, presentationOnly: 0, tariffOnly: 0, conflicts: 0 },
      errors: ['KNOWLEDGE_BINDING_GATE_REQUIRED']
    };
    var result = gate.buildBindings({ rules: rules, profiles: profiles });
    result.bindings = [].concat(result.bindings || []).map(function (binding) {
      return Object.assign({}, binding, {
        enabled: false,
        enabledCotizadorAutomatico: false,
        enabledCotizadorPdfExterno: false,
        enabledComparativo: false,
        requiresHumanValidation: true,
        requiresSecondGateForEnablement: true
      });
    });
    return result;
  }
  function variantStatus(variant, rules, profiles, reconciliations, bindings) {
    var variantDims = dims(variant);
    var variantRules = rules.filter(function (rule) { return dimensionMatch(rule, variantDims); });
    var variantProfiles = profiles.filter(function (profile) { return dimensionMatch(profile, variantDims); });
    var variantReconciliations = reconciliations.filter(function (row) {
      var sample = [].concat(variant.validationCases || []).find(function (item) { return clean(item.id) === clean(row.sampleId); });
      return !!sample;
    });
    var variantBindings = bindings.filter(function (binding) { return dimensionMatch(binding, variantDims); });
    var blockers = [];
    if (!variantRules.length) blockers.push('RULE_REQUIRED');
    if (!variantProfiles.length) blockers.push('PRESENTATION_REQUIRED');
    if (!variantReconciliations.length) blockers.push('RECONCILIATION_REQUIRED');
    if (variantReconciliations.some(function (row) { return row.status !== 'reconciled_within_tolerance'; })) blockers.push('RECONCILIATION_NOT_CLOSED');
    if (variantBindings.some(function (binding) { return binding.status === 'conflict_requires_validation'; })) blockers.push('BINDING_CONFLICT');
    return {
      id: clean(variant.id), dimensiones: variantDims,
      ruleIds: variantRules.map(function (rule) { return clean(rule.id); }),
      profileIds: variantProfiles.map(function (profile) { return clean(profile.id); }),
      bindingIds: variantBindings.map(function (binding) { return clean(binding.id); }),
      reconciliations: variantReconciliations,
      status: blockers.length ? 'requires_validation' : 'ready_for_second_gate',
      blockers: unique(blockers),
      enabled: false,
      enablesCotizador: false,
      enablesComparativo: false
    };
  }
  function build(input) {
    input = input || {};
    var plan = input.plan || getPlan(input.tenantId, input.planId), errors = [];
    if (!plan) errors.push('TENANT_BINDING_PLAN_NOT_FOUND');
    if (plan && clean(input.tenantId || plan.tenantId) !== clean(plan.tenantId)) errors.push('PLAN_TENANT_MISMATCH');
    if (errors.length) return { ok: false, errors: errors, bindings: [], enabled: false, writeAllowed: false };
    var resolution = resolvePlanInsurer(plan, input);
    if (!resolution.resolved) return { ok: false, errors: [clean(resolution.code || 'INSURER_NOT_RESOLVED')], resolution: resolution, bindings: [], enabled: false, writeAllowed: false };
    var rules = enrichRules(input.rules || [], resolution, { tenantId: plan.tenantId, directory: input.directory || [] });
    var profiles = [].concat(input.profiles || []).map(clone);
    rules = rules.map(function (rule) { rule.tenantId = plan.tenantId; rule.aseguradoraId = resolution.insurerId; return rule; });
    profiles = profiles.map(function (profile) { profile.tenantId = plan.tenantId; profile.aseguradoraId = resolution.insurerId; return profile; });
    var cases = [].concat(input.validationCases || []);
    var reconciliations = reconcileCases(rules, cases);
    var bindingResult = buildBindings(rules, profiles);
    var variants = [].concat(plan.variants || []).map(function (variant) {
      var variantCases = cases.filter(function (sample) { return dimensionMatch(sample, variant); });
      return variantStatus(Object.assign({}, variant, { validationCases: variantCases }), rules, profiles, reconciliations, bindingResult.bindings || []);
    });
    var blockers = unique([].concat(bindingResult.errors || [], variants.reduce(function (all, variant) { return all.concat(variant.blockers || []); }, [])));
    return {
      ok: blockers.length === 0,
      code: blockers.length ? 'TENANT_BINDINGS_REQUIRE_VALIDATION' : 'TENANT_BINDINGS_READY_FOR_SECOND_GATE',
      tenantId: plan.tenantId,
      planId: plan.id,
      insurerResolution: resolution,
      rules: rules,
      profiles: profiles,
      bindings: bindingResult.bindings || [],
      reconciliations: reconciliations,
      variants: variants,
      blockers: blockers,
      summary: bindingResult.summary || {},
      enabled: false,
      enablesCotizador: false,
      enablesComparativo: false,
      requiresHumanValidation: true,
      requiresSecondGateForEnablement: true,
      writeAllowed: false
    };
  }

  Orbit.tenantBindingPlanP10c = {
    registerPlan: registerPlan,
    getPlan: getPlan,
    build: build,
    dimensionMatch: dimensionMatch
  };
  (window.OrbitTenantBindingPlansP10c || []).forEach(registerPlan);
})();