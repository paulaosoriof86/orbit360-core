/* ============================================================
   Orbit 360 · P0.10 · Configuración reusable de aseguradoras por tenant
   Fecha: 2026-07-10

   Resuelve aliases y perfiles financieros desde configuración tenant.
   El core no contiene aseguradoras ni tasas concretas; cada tenant registra
   sus overrides en un archivo de datos/configuración independiente.
   No escribe en Orbit.store y no habilita módulos.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  var registry = Object.create(null);
  var DIMENSION_KEYS = [
    'pais', 'moneda', 'ramo', 'producto', 'familiaProducto', 'subtipoProducto',
    'segmento', 'tipoRiesgo', 'tipoVehiculo', 'usoVehiculo', 'plan'
  ];

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function norm(value) {
    return clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }
  function clone(value) { return JSON.parse(JSON.stringify(value == null ? null : value)); }
  function unique(values) { return Array.from(new Set((values || []).filter(Boolean))); }
  function stableId(prefix, parts) {
    var text = (parts || []).map(norm).join('|'), hash = 0;
    for (var i = 0; i < text.length; i += 1) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    return prefix + '_' + Math.abs(hash).toString(36);
  }
  function dimensions(input) {
    input = input || {};
    var source = input.dimensiones || input.dimensions || input;
    var out = {};
    DIMENSION_KEYS.forEach(function (key) { out[key] = clean(source[key]); });
    out.pais = out.pais.toUpperCase();
    out.moneda = out.moneda.toUpperCase();
    return out;
  }
  function normalizedNames(item) {
    item = item || {};
    return unique([item.nombre, item.name, item.canonicalName, item.displayName]
      .concat(item.aliases || [], item.sourceHints || []).map(norm).filter(Boolean));
  }
  function normalizeFinancialComponent(component, insurer, profile) {
    component = component || {};
    var type = clean(component.tipo || component.type);
    return {
      id: clean(component.id) || stableId('tenant_component', [insurer.canonicalKey, profile.id, type]),
      tipo: type,
      nombre: clean(component.nombre || component.name || type),
      calculationType: clean(component.calculationType || component.tipoCalculo || 'rate'),
      rate: Number(component.rate != null ? component.rate : component.tasa),
      fixedAmount: component.fixedAmount == null ? null : Number(component.fixedAmount),
      amountBasis: clean(component.amountBasis || component.baseMonto || 'net'),
      formulaModel: clone(component.formulaModel || component.modeloFormula || {}),
      taxable: component.taxable === true,
      includedInGross: component.includedInGross === true,
      optional: component.optional === true,
      evidence: clone(component.evidence || component.evidencia || {}),
      sourceProfileId: clean(profile.id),
      sourceTenantConfig: true,
      requiresHumanValidation: true,
      enabled: false
    };
  }
  function normalizeProfile(profile, insurer) {
    profile = profile || {};
    var normalized = {
      id: clean(profile.id) || stableId('financial_profile', [insurer.canonicalKey, profile.pais, profile.ramo, profile.producto]),
      pais: clean(profile.pais).toUpperCase(),
      moneda: clean(profile.moneda).toUpperCase(),
      ramoPatterns: unique([].concat(profile.ramoPatterns || profile.ramos || []).map(norm).filter(Boolean)),
      productoPatterns: unique([].concat(profile.productoPatterns || profile.productos || []).map(norm).filter(Boolean)),
      tipoVehiculoPatterns: unique([].concat(profile.tipoVehiculoPatterns || profile.tiposVehiculo || []).map(norm).filter(Boolean)),
      planPatterns: unique([].concat(profile.planPatterns || profile.planes || []).map(norm).filter(Boolean)),
      status: clean(profile.status || profile.estado || 'confirmed_tenant_config'),
      confirmedAt: clean(profile.confirmedAt),
      confirmedBy: clean(profile.confirmedBy),
      evidenceRefs: clone(profile.evidenceRefs || []),
      requiresSecondGateForEnablement: profile.requiresSecondGateForEnablement !== false,
      enabled: false,
      components: []
    };
    normalized.components = (profile.components || []).map(function (component) {
      return normalizeFinancialComponent(component, insurer, normalized);
    });
    return normalized;
  }
  function normalizeInsurer(item, tenantId) {
    item = item || {};
    var country = clean(item.pais || item.country).toUpperCase();
    var canonicalName = clean(item.canonicalName || item.nombre || item.name);
    var canonicalKey = clean(item.canonicalKey) || norm([country, canonicalName].filter(Boolean).join('_'));
    var internalId = clean(item.internalId) || ['ins', norm(country || 'xx'), norm(canonicalName || canonicalKey)].filter(Boolean).join('_');
    var insurer = {
      tenantId: tenantId,
      canonicalKey: canonicalKey,
      internalId: internalId,
      canonicalName: canonicalName,
      displayName: clean(item.displayName || canonicalName),
      pais: country,
      aliases: unique([canonicalName, item.displayName].concat(item.aliases || []).map(clean).filter(Boolean)),
      sourceHints: unique([].concat(item.sourceHints || []).map(clean).filter(Boolean)),
      active: item.active !== false,
      financialProfiles: []
    };
    insurer.financialProfiles = (item.financialProfiles || []).map(function (profile) { return normalizeProfile(profile, insurer); });
    return insurer;
  }
  function normalizeTenantConfig(input) {
    input = input || {};
    var tenantId = clean(input.tenantId || input.id);
    if (!tenantId) throw new Error('TENANT_REQUIRED');
    return {
      tenantId: tenantId,
      version: clean(input.version || 'v1'),
      updatedAt: clean(input.updatedAt),
      insurers: (input.insurers || input.aseguradoras || []).map(function (item) { return normalizeInsurer(item, tenantId); })
    };
  }
  function registerTenantConfig(input) {
    var config = normalizeTenantConfig(input);
    registry[config.tenantId] = config;
    return clone(config);
  }
  function getTenantConfig(tenantId) { return clone(registry[clean(tenantId)] || null); }
  function insurerByConfig(config, input) {
    var queries = unique([input && input.name, input && input.nombre, input && input.fileName, input && input.sourceName]
      .concat(input && input.aliases || []).map(norm).filter(Boolean));
    var candidates = [];
    (config.insurers || []).forEach(function (insurer) {
      if (!insurer.active) return;
      var aliases = normalizedNames(insurer);
      var sourceHints = (insurer.sourceHints || []).map(norm).filter(Boolean);
      var score = 0, reasons = [];
      queries.forEach(function (query) {
        if (aliases.indexOf(query) >= 0) { score = Math.max(score, 100); reasons.push('exact_alias'); }
        aliases.forEach(function (alias) {
          if (alias && query && (query.indexOf(alias) >= 0 || alias.indexOf(query) >= 0)) {
            score = Math.max(score, 92); reasons.push('contained_alias');
          }
        });
        sourceHints.forEach(function (hint) {
          if (hint && query.indexOf(hint) >= 0) { score = Math.max(score, 88); reasons.push('source_hint'); }
        });
      });
      if (input && input.pais && insurer.pais && clean(input.pais).toUpperCase() !== insurer.pais) return;
      if (score) candidates.push({ insurer: insurer, score: score, reasons: unique(reasons) });
    });
    candidates.sort(function (a, b) { return b.score - a.score; });
    if (!candidates.length) return { candidate: null, candidates: [], ambiguous: false };
    var top = candidates[0], tied = candidates.filter(function (entry) { return entry.score === top.score; });
    return { candidate: tied.length === 1 ? top : null, candidates: candidates, ambiguous: tied.length > 1 };
  }
  function directoryNames(item) {
    return unique([item && item.nombre, item && item.name, item && item.razonSocial, item && item.displayName]
      .concat(item && item.aliases || []).map(norm).filter(Boolean));
  }
  function directoryMatch(directory, insurer) {
    var targets = normalizedNames(insurer);
    var hits = (directory || []).filter(function (item) {
      if (insurer.pais && item && (item.pais || item.country) && clean(item.pais || item.country).toUpperCase() !== insurer.pais) return false;
      return directoryNames(item).some(function (name) { return targets.indexOf(name) >= 0; });
    });
    return { hit: hits.length === 1 ? hits[0] : null, hits: hits, ambiguous: hits.length > 1 };
  }
  function directDirectoryMatch(directory, input) {
    var queries = unique([input && input.name, input && input.nombre].concat(input && input.aliases || []).map(norm).filter(Boolean));
    var hits = (directory || []).filter(function (item) {
      if (input && input.pais && item && (item.pais || item.country) && clean(item.pais || item.country).toUpperCase() !== clean(input.pais).toUpperCase()) return false;
      return directoryNames(item).some(function (name) { return queries.indexOf(name) >= 0; });
    });
    return { hit: hits.length === 1 ? hits[0] : null, hits: hits, ambiguous: hits.length > 1 };
  }
  function resolveInsurer(input) {
    input = input || {};
    var tenantId = clean(input.tenantId), config = registry[tenantId], directory = input.directory || [];
    if (!tenantId) return { resolved: false, code: 'TENANT_REQUIRED', requiresHumanValidation: true };
    if (!config) {
      var direct = directDirectoryMatch(directory, input);
      if (direct.hit) return { resolved: true, code: 'RESOLVED_DIRECTORY_ONLY', tenantId: tenantId, insurerId: clean(direct.hit.id), directoryId: clean(direct.hit.id), displayName: clean(direct.hit.nombre || direct.hit.name), requiresHumanValidation: false };
      return { resolved: false, code: direct.ambiguous ? 'DIRECTORY_MATCH_AMBIGUOUS' : 'TENANT_CONFIG_NOT_FOUND', requiresHumanValidation: true };
    }
    var selected = insurerByConfig(config, input);
    if (selected.ambiguous) return { resolved: false, code: 'TENANT_ALIAS_AMBIGUOUS', candidates: selected.candidates.map(function (entry) { return entry.insurer.canonicalKey; }), requiresHumanValidation: true };
    if (!selected.candidate) {
      var directFallback = directDirectoryMatch(directory, input);
      if (directFallback.hit) return { resolved: true, code: 'RESOLVED_DIRECTORY_ONLY', tenantId: tenantId, insurerId: clean(directFallback.hit.id), directoryId: clean(directFallback.hit.id), displayName: clean(directFallback.hit.nombre || directFallback.hit.name), requiresHumanValidation: false };
      return { resolved: false, code: directFallback.ambiguous ? 'DIRECTORY_MATCH_AMBIGUOUS' : 'INSURER_NOT_FOUND', requiresHumanValidation: true };
    }
    var insurer = selected.candidate.insurer;
    var directoryResult = directoryMatch(directory, insurer);
    if (directoryResult.ambiguous) return { resolved: false, code: 'DIRECTORY_CANONICAL_MATCH_AMBIGUOUS', canonicalKey: insurer.canonicalKey, requiresHumanValidation: true };
    var directoryId = directoryResult.hit && clean(directoryResult.hit.id);
    return {
      resolved: true,
      code: directoryId ? 'RESOLVED_TENANT_CONFIG_AND_DIRECTORY' : 'RESOLVED_TENANT_CONFIG_INTERNAL_ID',
      tenantId: tenantId,
      insurerId: directoryId || insurer.internalId,
      directoryId: directoryId || '',
      internalId: insurer.internalId,
      canonicalKey: insurer.canonicalKey,
      canonicalName: insurer.canonicalName,
      displayName: insurer.displayName,
      pais: insurer.pais,
      aliases: insurer.aliases.slice(),
      matchScore: selected.candidate.score,
      matchReasons: selected.candidate.reasons.slice(),
      requiresDirectoryWrite: !directoryId,
      requiresHumanValidation: false
    };
  }
  function profileSpecificity(profile) {
    return (profile.ramoPatterns.length + profile.productoPatterns.length + profile.tipoVehiculoPatterns.length + profile.planPatterns.length) * 10 + (profile.pais ? 2 : 0) + (profile.moneda ? 1 : 0);
  }
  function patternMatch(patterns, value) {
    if (!patterns || !patterns.length) return true;
    var candidate = norm(value);
    return patterns.some(function (pattern) { return candidate === pattern || candidate.indexOf(pattern) >= 0 || pattern.indexOf(candidate) >= 0; });
  }
  function profileMatches(profile, dims) {
    if (profile.pais && dims.pais && profile.pais !== dims.pais) return false;
    if (profile.moneda && dims.moneda && profile.moneda !== dims.moneda) return false;
    if (!patternMatch(profile.ramoPatterns, dims.ramo)) return false;
    if (!patternMatch(profile.productoPatterns, dims.producto)) return false;
    if (!patternMatch(profile.tipoVehiculoPatterns, dims.tipoVehiculo)) return false;
    if (!patternMatch(profile.planPatterns, dims.plan)) return false;
    return true;
  }
  function getFinancialProfile(input) {
    input = input || {};
    var config = registry[clean(input.tenantId)];
    if (!config) return { found: false, code: 'TENANT_CONFIG_NOT_FOUND' };
    var resolution = resolveInsurer(input);
    if (!resolution.resolved) return { found: false, code: resolution.code, resolution: resolution };
    var insurer = config.insurers.find(function (item) { return item.canonicalKey === resolution.canonicalKey || item.internalId === resolution.internalId; });
    if (!insurer) return { found: false, code: 'INSURER_CONFIG_NOT_FOUND', resolution: resolution };
    var dims = dimensions(input);
    var candidates = insurer.financialProfiles.filter(function (profile) { return profileMatches(profile, dims); })
      .sort(function (a, b) { return profileSpecificity(b) - profileSpecificity(a); });
    if (!candidates.length) return { found: false, code: 'FINANCIAL_PROFILE_NOT_FOUND', resolution: resolution };
    var bestScore = profileSpecificity(candidates[0]), best = candidates.filter(function (profile) { return profileSpecificity(profile) === bestScore; });
    if (best.length > 1 && unique(best.map(function (profile) { return JSON.stringify(profile.components); })).length > 1) {
      return { found: false, code: 'FINANCIAL_PROFILE_CONFLICT', resolution: resolution };
    }
    return { found: true, code: 'FINANCIAL_PROFILE_RESOLVED', profile: clone(best[0]), resolution: resolution, requiresHumanValidation: true };
  }
  function applyFinancialProfile(rule, input) {
    rule = clone(rule || {}); input = input || {};
    var lookup = Object.assign({}, input, dimensions(rule), {
      tenantId: clean(input.tenantId || rule.tenantId),
      name: input.name || input.insurerName || rule.insurerName,
      aseguradoraId: clean(input.aseguradoraId || rule.aseguradoraId)
    });
    var result = getFinancialProfile(lookup);
    if (!result.found) return { applied: false, code: result.code, rule: rule, warnings: [result.code], resolution: result.resolution || null, writeAllowed: false };
    var profile = result.profile, components = [].concat(rule.components || rule.componentes || []), added = [], existing = [];
    profile.components.forEach(function (component) {
      var hit = components.find(function (item) { return norm(item && item.tipo) === norm(component.tipo); });
      if (hit) { existing.push(component.tipo); return; }
      components.push(clone(component)); added.push(component.tipo);
    });
    rule.tenantId = clean(rule.tenantId || input.tenantId);
    rule.aseguradoraId = clean(rule.aseguradoraId || result.resolution.insurerId);
    rule.components = components;
    rule.tenantFinancialProfile = {
      id: profile.id,
      status: profile.status,
      canonicalKey: result.resolution.canonicalKey,
      confirmedAt: profile.confirmedAt,
      confirmedBy: profile.confirmedBy,
      evidenceRefs: clone(profile.evidenceRefs),
      addedComponents: added.slice(),
      existingComponents: existing.slice()
    };
    rule.enabled = false;
    rule.enabledCotizador = false;
    rule.enabledComparativo = false;
    rule.writeAllowed = false;
    rule.requiresSecondGateForEnablement = true;
    return {
      applied: added.length > 0,
      code: added.length ? 'TENANT_FINANCIAL_PROFILE_APPLIED' : 'TENANT_FINANCIAL_COMPONENTS_ALREADY_PRESENT',
      rule: rule,
      addedComponents: added,
      existingComponents: existing,
      profile: profile,
      resolution: result.resolution,
      writeAllowed: false,
      requiresHumanValidation: true,
      requiresSecondGateForEnablement: true
    };
  }
  function listTenantInsurers(tenantId) {
    var config = registry[clean(tenantId)];
    return config ? clone(config.insurers) : [];
  }

  Orbit.tenantInsurerConfigP10 = {
    DIMENSION_KEYS: DIMENSION_KEYS.slice(),
    normalizeTenantConfig: normalizeTenantConfig,
    registerTenantConfig: registerTenantConfig,
    getTenantConfig: getTenantConfig,
    listTenantInsurers: listTenantInsurers,
    resolveInsurer: resolveInsurer,
    getFinancialProfile: getFinancialProfile,
    applyFinancialProfile: applyFinancialProfile
  };

  var queued = window.OrbitTenantInsurerConfigsP10 || [];
  queued.forEach(function (config) { registerTenantConfig(config); });
})();