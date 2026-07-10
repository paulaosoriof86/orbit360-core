/* ============================================================
   Orbit 360 · P0.8 · Vínculo tarifa-presentación y segundo gate
   Fecha: 2026-07-10

   Une reglas tarifarias y perfiles de presentación por combinación.
   No escribe en Orbit.store, no contiene datos de tenant y no activa
   módulos sin validación + decisión administrativa separada.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  var TARGETS = ['cotizador_automatico', 'cotizador_pdf_externo', 'comparativo'];
  var GATE_ROLES = ['superadmin', 'super_admin', 'direccion', 'admin', 'admintenant', 'admin_tenant'];
  var VALIDATED_STATES = ['validated_pending_enablement', 'validado_pendiente_habilitacion', 'habilitado', 'enabled'];
  var SUPERSEDED_STATES = ['superseded', 'reemplazado', 'reemplazado_por_version', 'rejected', 'rechazado'];
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
  function sanitize(value) {
    var contract = Orbit.documentSourceContractP04;
    return contract && typeof contract.sanitize === 'function'
      ? contract.sanitize(value, { redactSamples: true }, 0)
      : clone(value || {});
  }
  function dimensions(input) {
    input = input || {};
    var source = input.dimensiones || input.dimensions || input;
    var schema = Orbit.cotizacionEsquemaAseguradoraP0;
    if (schema && typeof schema.normalizeDimensions === 'function') return schema.normalizeDimensions(source, {});
    var out = {};
    DIMENSION_KEYS.forEach(function (key) { out[key] = clean(source[key]); });
    return out;
  }
  function tenantId(input) { return clean(input && (input.tenantId || input.tenant)); }
  function insurerId(input) {
    return clean(input && (
      input.aseguradoraId || input.insurerId || input.entityId ||
      input.insurerResolution && input.insurerResolution.candidate && input.insurerResolution.candidate.id ||
      input.insurerResolution && input.insurerResolution.topCandidate && input.insurerResolution.topCandidate.id
    ));
  }
  function state(input) { return norm(input && (input.estado || input.status)); }
  function isValidated(input) { return VALIDATED_STATES.indexOf(state(input)) >= 0; }
  function isSuperseded(input) { return SUPERSEDED_STATES.indexOf(state(input)) >= 0; }
  function evidenceLocationValid(location) {
    location = location || {};
    if (clean(location.mediaKind) === 'spreadsheet') return !!(clean(location.sheet || location.hoja) && clean(location.range || location.rango));
    if (clean(location.mediaKind) === 'pdf') return !!Number(location.page || location.pagina || 0);
    return !!(clean(location.sheet || location.hoja) || clean(location.range || location.rango) || Number(location.page || location.pagina || 0) || clean(location.block || location.bloque));
  }
  function ruleEvidenceValid(rule) {
    rule = rule || {};
    if (!clean(rule.documentoFuenteId || rule.documentId)) return false;
    var evidence = [].concat(rule.sourceEvidence || rule.evidencias || []);
    var componentEvidence = [].concat(rule.components || rule.componentes || []).map(function (item) { return item && (item.evidence || item.evidencia); });
    return evidence.concat(componentEvidence).some(evidenceLocationValid);
  }
  function presentationEvidenceValid(profile) {
    profile = profile || {};
    var presentation = profile.presentation || profile.presentacion || profile;
    if (!clean(profile.documentId || presentation.documentoFuenteId || presentation.documentId)) return false;
    return [].concat(presentation.secciones || presentation.sections || []).some(function (section) {
      if (evidenceLocationValid(section && section.sourceLocation)) return true;
      return [].concat(section && (section.campos || section.fields) || []).some(function (field) { return evidenceLocationValid(field && field.sourceLocation); });
    });
  }
  function dimensionMatch(ruleDims, profileDims) {
    var score = 0, mismatches = [], matched = [], generic = [];
    DIMENSION_KEYS.forEach(function (key) {
      var left = norm(ruleDims[key]), right = norm(profileDims[key]);
      if (left && right && left !== right) mismatches.push(key);
      else if (left && right && left === right) { score += key === 'tipoVehiculo' || key === 'tipoRiesgo' || key === 'plan' ? 4 : 2; matched.push(key); }
      else if (!left && right) generic.push(key);
    });
    return { matches: mismatches.length === 0, score: score, mismatches: mismatches, matched: matched, generic: generic };
  }
  function sameOwner(rule, profile) {
    var ruleTenant = tenantId(rule), profileTenant = tenantId(profile);
    var ruleInsurer = insurerId(rule), profileInsurer = insurerId(profile);
    return !!(ruleTenant && profileTenant && ruleTenant === profileTenant && ruleInsurer && profileInsurer && ruleInsurer === profileInsurer);
  }
  function ruleFingerprint(rule) {
    return JSON.stringify(sanitize({
      calculationType: rule && rule.calculationType,
      amountBasis: rule && rule.amountBasis,
      dimensions: dimensions(rule),
      components: rule && (rule.components || rule.componentes),
      rateTable: rule && (rule.rateTable || rule.tablaTarifas),
      outputRoute: rule && (rule.outputRoute || rule.rutaSalida),
      sourceVersion: rule && (rule.versionFuente || rule.sourceVersion)
    }));
  }
  function presentationFingerprint(profile) {
    var presentation = profile && (profile.presentation || profile.presentacion || profile) || {};
    return JSON.stringify(sanitize({
      dimensions: dimensions(profile),
      sections: presentation.secciones || presentation.sections,
      sourceVersion: presentation.versionFuente || profile.versionFuente,
      templateVersion: presentation.plantillaVersion
    }));
  }
  function activeRules(rules) { return (rules || []).filter(function (rule) { return rule && !isSuperseded(rule); }); }
  function activeProfiles(profiles) { return (profiles || []).filter(function (profile) { return profile && !isSuperseded(profile); }); }
  function candidateRules(rules, profile) {
    var pDims = dimensions(profile);
    return activeRules(rules).filter(function (rule) { return sameOwner(rule, profile); }).map(function (rule) {
      return { rule: rule, match: dimensionMatch(dimensions(rule), pDims) };
    }).filter(function (entry) { return entry.match.matches; }).sort(function (a, b) { return b.match.score - a.match.score; });
  }
  function selectRules(rules, profile) {
    var candidates = candidateRules(rules, profile);
    if (!candidates.length) return { selected: [], candidates: [], conflict: false, score: 0, reasons: ['SIN_REGLA_TARIFARIA_APLICABLE'] };
    var bestScore = candidates[0].match.score;
    var best = candidates.filter(function (entry) { return entry.match.score === bestScore; });
    var fingerprints = unique(best.map(function (entry) { return ruleFingerprint(entry.rule); }));
    return {
      selected: fingerprints.length === 1 ? best.map(function (entry) { return entry.rule; }) : [],
      candidates: candidates,
      conflict: fingerprints.length > 1,
      score: bestScore,
      reasons: fingerprints.length > 1 ? ['CONFLICTO_REGLAS_MISMA_ESPECIFICIDAD'] : []
    };
  }
  function profileKey(profile) {
    var d = dimensions(profile);
    return [tenantId(profile), insurerId(profile)].concat(DIMENSION_KEYS.map(function (key) { return d[key]; })).map(norm).join('|');
  }
  function duplicateProfileConflicts(profiles) {
    var grouped = {};
    activeProfiles(profiles).forEach(function (profile) {
      var key = profileKey(profile);
      grouped[key] = grouped[key] || [];
      grouped[key].push(profile);
    });
    return Object.keys(grouped).reduce(function (out, key) {
      var fingerprints = unique(grouped[key].map(presentationFingerprint));
      if (fingerprints.length > 1) out[key] = grouped[key].map(function (profile) { return clean(profile.id); });
      return out;
    }, {});
  }
  function makeBinding(profile, selection, profileConflictIds) {
    var d = dimensions(profile), rules = selection.selected;
    var bindingId = stableId('knowledge_binding', [profileKey(profile), clean(profile.id), rules.map(function (r) { return r.id; }).join(',')]);
    var warnings = [].concat(selection.reasons || []);
    if (profileConflictIds && profileConflictIds.length) warnings.push('CONFLICTO_VERSIONES_PRESENTACION');
    if (!rules.length && !selection.conflict) warnings.push('PRESENTACION_SIN_TARIFA_AUTOMATICA');
    if (!presentationEvidenceValid(profile)) warnings.push('EVIDENCIA_PRESENTACION_INCOMPLETA');
    rules.forEach(function (rule) { if (!ruleEvidenceValid(rule)) warnings.push('EVIDENCIA_REGLA_INCOMPLETA:' + clean(rule.id)); });
    var status = selection.conflict || profileConflictIds && profileConflictIds.length
      ? 'conflict_requires_validation'
      : (rules.length ? 'complete_requires_gate' : 'presentation_only');
    return {
      id: bindingId,
      tenantId: tenantId(profile), aseguradoraId: insurerId(profile), dimensiones: d,
      combinationKey: profileKey(profile), profileId: clean(profile.id),
      presentationDocumentId: clean(profile.documentId || profile.presentation && profile.presentation.documentoFuenteId),
      ruleIds: rules.map(function (rule) { return clean(rule.id); }),
      tariffDocumentIds: unique(rules.map(function (rule) { return clean(rule.documentoFuenteId || rule.documentId); })),
      selectedSpecificity: selection.score, status: status, warnings: unique(warnings),
      profile: profile, rules: rules, conflictProfileIds: profileConflictIds || [],
      enabledCotizadorAutomatico: false, enabledCotizadorPdfExterno: false, enabledComparativo: false,
      writeAllowed: false, requiresHumanValidation: true, requiresSecondGateForEnablement: true
    };
  }
  function orphanRuleBindings(rules, profiles) {
    var used = new Set();
    activeProfiles(profiles).forEach(function (profile) {
      candidateRules(rules, profile).forEach(function (entry) { used.add(clean(entry.rule.id)); });
    });
    return activeRules(rules).filter(function (rule) { return !used.has(clean(rule.id)); }).map(function (rule) {
      var d = dimensions(rule);
      return {
        id: stableId('knowledge_binding_orphan', [tenantId(rule), insurerId(rule), clean(rule.id)]),
        tenantId: tenantId(rule), aseguradoraId: insurerId(rule), dimensiones: d,
        combinationKey: [tenantId(rule), insurerId(rule)].concat(DIMENSION_KEYS.map(function (key) { return d[key]; })).map(norm).join('|'),
        profileId: '', presentationDocumentId: '', ruleIds: [clean(rule.id)],
        tariffDocumentIds: [clean(rule.documentoFuenteId || rule.documentId)].filter(Boolean),
        selectedSpecificity: 0, status: 'tariff_only', warnings: ['TARIFA_SIN_PRESENTACION'],
        profile: null, rules: [rule], conflictProfileIds: [],
        enabledCotizadorAutomatico: false, enabledCotizadorPdfExterno: false, enabledComparativo: false,
        writeAllowed: false, requiresHumanValidation: true, requiresSecondGateForEnablement: true
      };
    });
  }
  function buildBindings(input) {
    input = input || {};
    var rules = activeRules(input.rules || input.reglas || []), profiles = activeProfiles(input.profiles || input.perfiles || []);
    var profileConflicts = duplicateProfileConflicts(profiles);
    var bindings = profiles.map(function (profile) {
      return makeBinding(profile, selectRules(rules, profile), profileConflicts[profileKey(profile)] || []);
    }).concat(orphanRuleBindings(rules, profiles));
    return {
      bindings: bindings,
      summary: {
        total: bindings.length,
        complete: bindings.filter(function (b) { return b.status === 'complete_requires_gate'; }).length,
        presentationOnly: bindings.filter(function (b) { return b.status === 'presentation_only'; }).length,
        tariffOnly: bindings.filter(function (b) { return b.status === 'tariff_only'; }).length,
        conflicts: bindings.filter(function (b) { return b.status === 'conflict_requires_validation'; }).length
      },
      writeAllowed: false, requiresHumanValidation: true
    };
  }
  function moduleEnabled(config, target) {
    config = config || {};
    var modules = config.modules || config.modulos || {};
    if (target === 'comparativo') return modules.comparativo !== false;
    return modules.cotizador !== false;
  }
  function insurerEnabled(config, binding) {
    config = config || {};
    var list = config.insurers || config.aseguradoras || [];
    if (!list.length) return true;
    var hit = list.find(function (item) { return clean(item.id || item.aseguradoraId) === clean(binding.aseguradoraId); });
    return !!(hit && hit.activo !== false && hit.enabled !== false);
  }
  function countryCurrencyValid(binding) {
    var d = binding && binding.dimensiones || {};
    if (d.pais === 'GT') return !d.moneda || d.moneda === 'GTQ' || d.moneda === 'USD';
    if (d.pais === 'CO') return !d.moneda || d.moneda === 'COP' || d.moneda === 'USD';
    return !!(d.pais && d.moneda);
  }
  function uniqueOutputRoute(binding) {
    var routes = unique([].concat(binding.rules || []).map(function (rule) {
      return clean(rule.outputRoute && rule.outputRoute.routeKey || rule.rutaSalida && rule.rutaSalida.routeKey);
    }).filter(Boolean));
    return routes.length <= 1 && (binding.rules || []).every(function (rule) {
      return !!clean(rule.outputRoute && rule.outputRoute.routeKey || rule.rutaSalida && rule.rutaSalida.routeKey);
    });
  }
  function evaluateBinding(binding, target, config) {
    binding = binding || {}; config = config || {};
    var errors = [], warnings = [];
    if (TARGETS.indexOf(target) < 0) errors.push('TARGET_INVALIDO');
    if (!moduleEnabled(config, target)) errors.push('MODULO_DESHABILITADO_POR_TENANT');
    if (!insurerEnabled(config, binding)) errors.push('ASEGURADORA_NO_HABILITADA');
    if (binding.status === 'conflict_requires_validation') errors.push('CONFLICTO_NO_RESUELTO');
    if (!countryCurrencyValid(binding)) errors.push('PAIS_MONEDA_REQUIERE_VALIDACION');
    var profile = binding.profile, rules = binding.rules || [];
    var profileValidated = !!profile && isValidated(profile) && isValidated(profile.presentation || profile.presentacion || profile);
    var rulesValidated = rules.length > 0 && rules.every(isValidated);
    var presentationEvidence = !!profile && presentationEvidenceValid(profile);
    var tariffEvidence = rules.length > 0 && rules.every(ruleEvidenceValid);
    if (target === 'cotizador_automatico') {
      if (!profile) errors.push('PRESENTACION_REQUERIDA');
      if (!rules.length) errors.push('REGLA_TARIFARIA_REQUERIDA');
      if (!profileValidated) errors.push('PRESENTACION_NO_VALIDADA');
      if (!rulesValidated) errors.push('REGLAS_NO_VALIDADAS');
      if (!presentationEvidence) errors.push('EVIDENCIA_PRESENTACION_REQUERIDA');
      if (!tariffEvidence) errors.push('EVIDENCIA_TARIFARIA_REQUERIDA');
      if (!uniqueOutputRoute(binding)) errors.push('RUTA_SALIDA_NO_UNICA');
      rules.forEach(function (rule) {
        if (clean(rule.amountBasis) === 'requires_validation' || !clean(rule.amountBasis)) errors.push('BASE_MONETARIA_REQUIERE_VALIDACION:' + clean(rule.id));
      });
    } else if (target === 'cotizador_pdf_externo') {
      if (!profile) errors.push('PRESENTACION_PDF_REQUERIDA');
      if (!profileValidated) errors.push('PRESENTACION_NO_VALIDADA');
      if (!presentationEvidence) errors.push('EVIDENCIA_PRESENTACION_REQUERIDA');
      if (!rules.length) warnings.push('SIN_TARIFA_AUTOMATICA_USO_SOLO_PDF');
    } else if (target === 'comparativo') {
      if (!profile) errors.push('PERFIL_NORMALIZADO_REQUERIDO');
      if (!profileValidated) errors.push('PRESENTACION_NO_VALIDADA');
      if (!presentationEvidence) errors.push('EVIDENCIA_PRESENTACION_REQUERIDA');
      var sections = profile && (profile.presentation && profile.presentation.secciones || profile.presentacion && profile.presentacion.secciones || profile.secciones || []);
      if (!sections || !sections.length) errors.push('SECCIONES_NORMALIZADAS_REQUERIDAS');
      if (!rules.length) warnings.push('COMPARATIVO_DESDE_PROPUESTA_EXTERNA');
    }
    return {
      ready: errors.length === 0, target: target, bindingId: clean(binding.id),
      errors: unique(errors), warnings: unique(warnings),
      checks: {
        moduleEnabled: moduleEnabled(config, target), insurerEnabled: insurerEnabled(config, binding),
        countryCurrencyValid: countryCurrencyValid(binding), profileValidated: profileValidated,
        rulesValidated: rulesValidated, presentationEvidence: presentationEvidence,
        tariffEvidence: tariffEvidence, uniqueOutputRoute: uniqueOutputRoute(binding)
      },
      writeAllowed: false, requiresSecondGateForEnablement: true
    };
  }
  function actorIdentity(actor) {
    actor = actor || {};
    var roles = [].concat(actor.assignedRoles || actor.roles || []);
    roles.push(actor.rol, actor.role);
    return {
      id: clean(actor.id || actor.uid),
      activeRole: norm(actor.activeRole || actor.rol || actor.role || roles[0]),
      assignedRoles: unique(roles.map(norm).filter(Boolean))
    };
  }
  function actorCanGate(actor) {
    var identity = actorIdentity(actor), active = identity.activeRole;
    if (!active || GATE_ROLES.indexOf(active) < 0) return false;
    return !identity.assignedRoles.length || identity.assignedRoles.indexOf(active) >= 0;
  }
  function bindingFingerprint(binding) {
    return stableId('binding_fp', [
      clean(binding && binding.id), binding && binding.status,
      JSON.stringify(sanitize(binding && binding.dimensiones || {})),
      JSON.stringify((binding && binding.ruleIds || []).slice().sort()),
      clean(binding && binding.profileId), JSON.stringify(binding && binding.warnings || [])
    ]);
  }
  function buildEnablementPlan(binding, decision, actor, config) {
    binding = binding || {}; decision = decision || {}; config = config || {};
    var target = clean(decision.target), reason = clean(decision.reason || decision.motivo);
    var identity = actorIdentity(actor), evaluation = evaluateBinding(binding, target, config), errors = [];
    if (!actorCanGate(actor)) errors.push('ROL_ACTIVO_NO_AUTORIZADO');
    if (!reason) errors.push('MOTIVO_REQUERIDO');
    if (decision.confirmed !== true) errors.push('CONFIRMACION_REFORZADA_REQUERIDA');
    if (!evaluation.ready) errors = errors.concat(evaluation.errors);
    return {
      ok: errors.length === 0,
      plan: errors.length ? null : {
        id: stableId('enablement_plan', [binding.id, target, identity.id, new Date().toISOString()]),
        tenantId: clean(binding.tenantId), aseguradoraId: clean(binding.aseguradoraId), bindingId: clean(binding.id),
        target: target, enabled: decision.enabled !== false, status: 'approved_pending_external_write',
        expectedBindingFingerprint: bindingFingerprint(binding), reason: reason,
        actorId: identity.id, activeRole: identity.activeRole, approvedAt: new Date().toISOString(),
        containsSecrets: false, containsCustomerPayload: false
      },
      evaluation: evaluation, errors: unique(errors), writeAllowed: false, requiresExternalWriter: true
    };
  }
  function buildRuntimePackage(bindings, plans) {
    var bindingMap = {};
    (bindings || []).forEach(function (binding) { bindingMap[clean(binding.id)] = binding; });
    var errors = [], records = [];
    (plans || []).forEach(function (plan) {
      var binding = bindingMap[clean(plan.bindingId)];
      if (!binding) { errors.push('BINDING_NO_ENCONTRADO:' + clean(plan.bindingId)); return; }
      if (clean(plan.expectedBindingFingerprint) !== bindingFingerprint(binding)) { errors.push('BINDING_CAMBIO_REEJECUTAR_GATE:' + clean(binding.id)); return; }
      records.push({
        id: stableId('runtime_knowledge', [binding.id, plan.target]), tenantId: binding.tenantId,
        aseguradoraId: binding.aseguradoraId, bindingId: binding.id, target: plan.target,
        enabled: plan.enabled === true, dimensiones: sanitize(binding.dimensiones), ruleIds: (binding.ruleIds || []).slice(),
        profileId: binding.profileId, presentationDocumentId: binding.presentationDocumentId,
        tariffDocumentIds: (binding.tariffDocumentIds || []).slice(), approvedBy: clean(plan.actorId),
        approvedAt: clean(plan.approvedAt), reason: clean(plan.reason), status: 'ready_for_external_write'
      });
    });
    return { ok: errors.length === 0, records: errors.length ? [] : records, errors: errors, writeAllowed: false, requiresExternalWriter: true };
  }

  Orbit.knowledgeBindingGateP08 = {
    TARGETS: TARGETS.slice(), DIMENSION_KEYS: DIMENSION_KEYS.slice(), dimensions: dimensions,
    dimensionMatch: dimensionMatch, ruleEvidenceValid: ruleEvidenceValid,
    presentationEvidenceValid: presentationEvidenceValid, selectRules: selectRules,
    duplicateProfileConflicts: duplicateProfileConflicts, buildBindings: buildBindings,
    evaluateBinding: evaluateBinding, actorCanGate: actorCanGate,
    bindingFingerprint: bindingFingerprint, buildEnablementPlan: buildEnablementPlan,
    buildRuntimePackage: buildRuntimePackage
  };
})();
