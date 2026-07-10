/* ============================================================
   Orbit 360 · P0.6b · Adapter hechos Excel → reglas tarifarias
   Fecha: 2026-07-10

   Convierte manifiestos determinísticos/semánticos en propuestas P0.6.
   No escribe en Orbit.store, no contiene aseguradoras ni tarifas reales y
   nunca habilita Cotizador/Comparativo sin validación + segundo gate.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  var COMPONENT_FACT_TYPES = [
    'rate', 'minimum_premium', 'base_premium', 'assistance',
    'issuance_expense', 'expedition_expense', 'tax', 'dental',
    'maternity', 'discount', 'financing_surcharge', 'total_premium'
  ];
  var NUMERIC_FACT_TYPES = COMPONENT_FACT_TYPES.concat(['installment', 'age_band', 'deductible']);
  var COMPONENT_TYPE_BY_FACT = {
    rate: 'base_premium', minimum_premium: 'minimum_premium', base_premium: 'base_premium',
    assistance: 'assistance', issuance_expense: 'issuance_expense', expedition_expense: 'expedition_expense',
    tax: 'tax', dental: 'dental', maternity: 'maternity', discount: 'discount',
    financing_surcharge: 'financing_surcharge', total_premium: 'other'
  };

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function norm(value) {
    return clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }
  function clone(value) { return JSON.parse(JSON.stringify(value == null ? null : value)); }
  function unique(values) { return Array.from(new Set((values || []).filter(Boolean))); }
  function finite(value) { var number = Number(value); return Number.isFinite(number) ? number : null; }
  function stableId(prefix, parts) {
    var text = (parts || []).map(norm).join('|'), hash = 0;
    for (var i = 0; i < text.length; i += 1) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    return prefix + '_' + Math.abs(hash).toString(36);
  }
  function sanitize(value) {
    var contract = Orbit.documentSourceContractP04;
    return contract && typeof contract.sanitize === 'function'
      ? contract.sanitize(value, { redactSamples: true, maxArray: 1000 }, 0)
      : clone(value || {});
  }
  function manifestDocument(manifest) { return manifest && manifest.document || {}; }
  function facts(manifest) { return [].concat(manifest && manifest.facts || []); }
  function groups(manifest) { return [].concat(manifest && manifest.candidateGroups || []); }
  function tables(manifest) { return [].concat(manifest && manifest.candidateTables || []); }
  function routes(manifest) { return [].concat(manifest && manifest.outputRoutes || []); }
  function byId(rows) {
    return (rows || []).reduce(function (out, row) { if (row && row.id) out[row.id] = row; return out; }, {});
  }
  function evidence(fact, fallback) {
    fact = fact || {}; fallback = fallback || {};
    var source = fact.evidence || fallback.evidence || {};
    return {
      mediaKind: 'spreadsheet', documentId: clean(source.documentId || fallback.documentId),
      fileRef: clean(source.fileRef || fallback.fileRef), sheet: clean(source.sheet),
      range: clean(source.range), formulaRef: clean(source.formulaRef || fact.formula),
      method: clean(source.method || 'deterministic_excel_rule_facts_p06b'),
      containsRawPayload: false, containsCustomerPayload: false
    };
  }
  function evidenceValid(item) { return !!(item && item.documentId && item.sheet && item.range); }
  function validateManifest(manifest) {
    var errors = [], warnings = [], document = manifestDocument(manifest);
    if (!manifest || clean(manifest.schemaVersion).indexOf('p06b') < 0) warnings.push('SCHEMA_P06B_RECOMENDADO');
    if (!document.id) errors.push('DOCUMENTO_REQUERIDO');
    if (!document.tenantId) errors.push('TENANT_REQUERIDO');
    if (!document.aseguradoraId) errors.push('ASEGURADORA_REQUERIDA');
    if (!facts(manifest).length) errors.push('HECHOS_REQUERIDOS');
    if (manifest && manifest.flags && manifest.flags.containsCustomerPayload === true) errors.push('CUSTOMER_PAYLOAD_FORBIDDEN');
    if (manifest && manifest.flags && manifest.flags.containsSecrets === true) errors.push('SECRETS_FORBIDDEN');
    if (manifest && manifest.flags && manifest.flags.macrosExecuted === true) errors.push('MACRO_EXECUTION_FORBIDDEN');
    return { valid: errors.length === 0, errors: errors, warnings: warnings };
  }
  function factValue(fact) {
    if (!fact) return null;
    if (fact.numericValue != null && Number.isFinite(Number(fact.numericValue))) return Number(fact.numericValue);
    if (fact.value != null && Number.isFinite(Number(fact.value))) return Number(fact.value);
    return null;
  }
  function factIsUsable(fact) {
    return !!(fact && fact.id && evidenceValid(evidence(fact)) && (factValue(fact) != null || clean(fact.formula)));
  }
  function factsForGroup(manifest, group) {
    var factMap = byId(facts(manifest));
    return [].concat(group && group.factIds || []).map(function (id) { return factMap[id]; }).filter(Boolean);
  }
  function firstFact(rows, type, usableOnly) {
    return (rows || []).find(function (row) { return row && row.factType === type && (!usableOnly || factIsUsable(row)); }) || null;
  }
  function factList(rows, type, usableOnly) {
    return (rows || []).filter(function (row) { return row && row.factType === type && (!usableOnly || factIsUsable(row)); });
  }
  function mappingTemplate(manifest) {
    var validation = validateManifest(manifest);
    if (!validation.valid) return { ok: false, code: validation.errors[0], validation: validation, combinations: [], writeAllowed: false };
    var output = groups(manifest).map(function (group) {
      var rows = factsForGroup(manifest, group);
      return {
        id: clean(group.id), groupKey: clean(group.groupKey), sheet: clean(group.sheet),
        sectionAnchor: clean(group.sectionAnchor), semanticCluster: clean(group.semanticCluster),
        dimensionsProposal: sanitize(group.dimensionsProposal || {}),
        recommendedCalculationType: clean(group.recommendedCalculationType || 'manual_validated'),
        factIds: rows.map(function (row) { return row.id; }),
        usableNumericFactIds: rows.filter(factIsUsable).map(function (row) { return row.id; }),
        factTypes: unique(rows.map(function (row) { return clean(row.factType); })),
        requiresSemanticMapping: true, requiresHumanValidation: true, writeAllowed: false
      };
    });
    return {
      ok: true, code: 'MAPPING_TEMPLATE_READY', document: sanitize(manifestDocument(manifest)),
      combinations: output, warnings: validation.warnings, writeAllowed: false, requiresHumanValidation: true
    };
  }
  function componentFromFacts(spec, factMap, document) {
    spec = spec || {};
    var primary = factMap[spec.factId || spec.valueFactId] || null;
    var primaryIsRate = primary && (clean(primary.valueKind) === 'rate' || clean(primary.unit) === 'percent');
    var primaryIsAmount = primary && clean(primary.valueKind) === 'amount';
    var rateFact = factMap[spec.rateFactId] || (primaryIsRate ? primary : (primary && primary.factType === 'rate' ? primary : null));
    var minimumFact = factMap[spec.minimumFactId] || (primary && primary.factType === 'minimum_premium' ? primary : null);
    var fixedFact = factMap[spec.fixedFactId] || (primaryIsAmount ? primary : (primary && ['assistance','issuance_expense','expedition_expense','dental','maternity','base_premium'].indexOf(primary.factType) >= 0 ? primary : null));
    var factType = clean(spec.factType || primary && primary.factType || rateFact && rateFact.factType || minimumFact && minimumFact.factType || fixedFact && fixedFact.factType || 'other');
    var componentType = clean(spec.tipo || spec.type || COMPONENT_TYPE_BY_FACT[factType] || 'other');
    var calculationType = clean(spec.calculationType || (rateFact && minimumFact ? 'rate_with_minimum' : (rateFact ? 'rate' : 'fixed')));
    var evFact = primary || rateFact || minimumFact || fixedFact, warnings = [];
    if (!evFact) warnings.push('FACTO_COMPONENTE_REQUERIDO');
    if (evFact && !evidenceValid(evidence(evFact, document))) warnings.push('EVIDENCIA_COMPONENTE_REQUERIDA');
    return {
      id: clean(spec.id) || stableId('component_map', [componentType, spec.factId, spec.rateFactId, spec.minimumFactId, spec.fixedFactId]),
      tipo: componentType, nombre: clean(spec.nombre || spec.name || evFact && evFact.label || componentType),
      calculationType: calculationType, amountBasis: clean(spec.amountBasis || 'requires_validation'),
      rate: rateFact ? factValue(rateFact) : finite(spec.rate), minimum: minimumFact ? factValue(minimumFact) : finite(spec.minimum),
      fixedAmount: fixedFact ? factValue(fixedFact) : finite(spec.fixedAmount), value: primary ? sanitize(primary.value) : sanitize(spec.value),
      currency: clean(spec.currency || spec.moneda), taxable: spec.taxable === true, financeable: spec.financeable === true,
      includedInGross: spec.includedInGross === true, optional: spec.optional === true,
      applicability: sanitize(spec.applicability || {}),
      formulaModel: sanitize(Object.assign({}, spec.formulaModel || {}, {
        factIds: unique([spec.factId, spec.rateFactId, spec.minimumFactId, spec.fixedFactId]),
        rateEvidence: rateFact ? evidence(rateFact, document) : null,
        minimumEvidence: minimumFact ? evidence(minimumFact, document) : null,
        fixedEvidence: fixedFact ? evidence(fixedFact, document) : null
      })),
      lookupTable: sanitize(spec.lookupTable || []), evidence: evidence(evFact, document), warnings: warnings,
      requiresHumanValidation: true, enabled: false
    };
  }
  function financingFromSpec(spec, factMap, document) {
    spec = spec || {};
    var installmentFact = factMap[spec.installmentFactId] || factMap[spec.factId] || null;
    var surchargeFact = factMap[spec.surchargeFactId] || null;
    var evFact = surchargeFact || installmentFact;
    return {
      id: clean(spec.id) || stableId('finance_map', [spec.installmentFactId, spec.surchargeFactId, spec.paymentMethod]),
      nombre: clean(spec.nombre || spec.name || evFact && evFact.label || 'Calendario de pagos'),
      paymentMethod: clean(spec.paymentMethod || 'consecutive'),
      installments: installmentFact ? factValue(installmentFact) : finite(spec.installments),
      surchargeRate: surchargeFact ? factValue(surchargeFact) : finite(spec.surchargeRate),
      thresholdMin: finite(spec.thresholdMin), amountBasis: clean(spec.amountBasis || 'net'),
      provider: clean(spec.provider),
      conditions: sanitize(Object.assign({}, spec.conditions || {}, { factIds: unique([spec.factId, spec.installmentFactId, spec.surchargeFactId]) })),
      evidence: evidence(evFact, document), requiresHumanValidation: true, enabled: false
    };
  }
  function routeFromSpec(spec, routeMap, document) {
    spec = spec || {};
    var route = routeMap[spec.routeId] || null, source = route || spec, ev = source.evidence || {};
    return {
      mode: clean(spec.mode || source.mode || (route ? 'single_output' : 'requires_validation')),
      routeKey: clean(spec.routeKey || source.routeKey || route && route.id),
      outputSheet: clean(spec.outputSheet || source.sheet), templateId: clean(spec.templateId),
      productKey: clean(spec.productKey), vehicleTypeKey: clean(spec.vehicleTypeKey), planKey: clean(spec.planKey),
      printArea: clean(spec.printArea || source.printAreas && source.printAreas[0]),
      preservesSourceSections: spec.preservesSourceSections !== false,
      requiresSingleSelection: spec.requiresSingleSelection !== false,
      evidence: {
        mediaKind: 'spreadsheet', documentId: clean(ev.documentId || document.id),
        fileRef: clean(ev.fileRef || document.fileRef), sheet: clean(ev.sheet || source.sheet),
        range: clean(ev.range || source.printAreas && source.printAreas[0]),
        method: clean(ev.method || 'deterministic_excel_rule_facts_p06b'),
        containsRawPayload: false, containsCustomerPayload: false
      }
    };
  }
  function buildRuleProposals(manifest, mapping, ctx) {
    mapping = mapping || {}; ctx = ctx || {};
    var validation = validateManifest(manifest);
    if (!validation.valid) return { ok: false, code: validation.errors[0], rules: [], diff: null, writeAllowed: false };
    var p06 = Orbit.tariffRuleProposalP06;
    if (!p06 || typeof p06.normalizeRule !== 'function') return { ok: false, code: 'TARIFF_RULE_PROPOSAL_P06_REQUIRED', rules: [], writeAllowed: false };
    var factMap = byId(facts(manifest)), routeMap = byId(routes(manifest)), tableMap = byId(tables(manifest));
    var document = manifestDocument(manifest), errors = [], rules = [], audit = [];
    [].concat(mapping.combinations || []).forEach(function (combo, index) {
      var comboErrors = [], dimensions = sanitize(combo.dimensions || combo.dimensiones || combo.dimensionsProposal || {});
      if (!clean(dimensions.pais)) comboErrors.push('PAIS_REQUIERE_VALIDACION');
      if (!clean(dimensions.moneda)) comboErrors.push('MONEDA_REQUIERE_VALIDACION');
      if (!clean(dimensions.producto)) comboErrors.push('PRODUCTO_REQUIERE_VALIDACION');
      var components = [].concat(combo.components || []).map(function (spec) { return componentFromFacts(spec, factMap, document); });
      components.forEach(function (component) { comboErrors = comboErrors.concat(component.warnings || []); });
      var financing = [].concat(combo.financingSchedules || combo.financiamientos || []).map(function (spec) { return financingFromSpec(spec, factMap, document); });
      var sourceFacts = unique([].concat(combo.factIds || [], combo.components || []).reduce(function (ids, item) {
        if (typeof item === 'string') ids.push(item);
        else if (item) ids.push(item.factId, item.valueFactId, item.rateFactId, item.minimumFactId, item.fixedFactId);
        return ids;
      }, [])).map(function (id) { return factMap[id]; }).filter(Boolean);
      var sourceEvidence = sourceFacts.map(function (fact) { return evidence(fact, document); }).filter(evidenceValid);
      if (!sourceEvidence.length) comboErrors.push('EVIDENCIA_REGLA_REQUERIDA');
      var table = tableMap[combo.rateTableId] || null;
      var route = routeFromSpec(combo.outputRoute || { routeId: combo.outputRouteId }, routeMap, document);
      var input = {
        id: clean(combo.id) || stableId('tariff_candidate', [document.id, combo.groupKey, index]),
        tenantId: clean(combo.tenantId || document.tenantId || ctx.tenantId),
        aseguradoraId: clean(combo.aseguradoraId || document.aseguradoraId || ctx.aseguradoraId),
        documentoFuenteId: clean(document.id), archivoRef: clean(document.fileRef || document.fileName),
        versionFuente: clean(combo.versionFuente || document.version || 'v1'),
        nombre: clean(combo.nombre || combo.name || combo.sectionAnchor || dimensions.plan || dimensions.producto || 'Regla tarifaria propuesta'),
        dimensiones: dimensions, calculationType: clean(combo.calculationType || combo.recommendedCalculationType || 'manual_validated'),
        amountBasis: clean(combo.amountBasis || 'requires_validation'), applicability: sanitize(combo.applicability || {}),
        components: components, financingSchedules: financing, options: sanitize(combo.options || []),
        rateTable: sanitize(combo.rateTable || table && table.rows || []), outputRoute: route,
        sourceEvidence: sourceEvidence, confidence: Number(combo.confidence || 0),
        estado: comboErrors.length ? 'requires_validation' : 'proposed'
      };
      var rule = p06.normalizeRule(input, ctx, index);
      rule.mapping = {
        sourceGroupId: clean(combo.groupId || combo.id),
        sourceFactIds: sourceFacts.map(function (fact) { return fact.id; }),
        sourceTableId: clean(combo.rateTableId),
        sourceRouteId: clean(combo.outputRouteId || combo.outputRoute && combo.outputRoute.routeId),
        errors: unique(comboErrors), requiresSemanticMapping: combo.requiresSemanticMapping !== false,
        containsCustomerPayload: false
      };
      rule.estado = comboErrors.length ? 'requires_validation' : 'proposed';
      rule.enabledCotizador = false; rule.enabledComparativo = false; rule.writeAllowed = false;
      rules.push(rule);
      if (comboErrors.length) errors.push({ combinationId: rule.id, errors: unique(comboErrors) });
      audit.push({ combinationId: rule.id, factCount: sourceFacts.length, componentCount: components.length, status: rule.estado, containsRealPayload: false });
    });
    var diff = typeof p06.buildRuleDiff === 'function' ? p06.buildRuleDiff(mapping.currentRules || [], rules) : null;
    return {
      ok: rules.length > 0, code: errors.length ? 'RULE_PROPOSALS_REQUIRE_VALIDATION' : 'RULE_PROPOSALS_READY_FOR_REVIEW',
      rules: rules, diff: diff, errors: errors, audit: audit, writeAllowed: false, approved: false,
      enabled: false, requiresHumanValidation: true, requiresSecondGateForEnablement: true
    };
  }
  function autoMapSimpleTariff(manifest) {
    var template = mappingTemplate(manifest);
    if (!template.ok) return template;
    var combinations = [], unmappedFinancingGroups = [];
    groups(manifest).forEach(function (group) {
      var rows = factsForGroup(manifest, group);
      var rate = firstFact(rows, 'rate', true), minimum = firstFact(rows, 'minimum_premium', true), base = firstFact(rows, 'base_premium', true);
      var assistance = firstFact(rows, 'assistance', true), issuance = firstFact(rows, 'issuance_expense', true), expedition = firstFact(rows, 'expedition_expense', true);
      var tax = firstFact(rows, 'tax', true), dental = firstFact(rows, 'dental', true), maternity = firstFact(rows, 'maternity', true);
      var discounts = factList(rows, 'discount', true), installmentFacts = factList(rows, 'installment', true), surchargeFacts = factList(rows, 'financing_surcharge', true);
      var components = [];
      if (rate || minimum || base) components.push({
        tipo: 'base_premium', nombre: 'Prima base propuesta',
        calculationType: rate && minimum ? 'rate_with_minimum' : (rate ? 'rate' : 'fixed'),
        rateFactId: rate && rate.id, minimumFactId: minimum && minimum.id, fixedFactId: base && base.id,
        amountBasis: 'requires_validation'
      });
      [[assistance,'assistance'],[issuance,'issuance_expense'],[expedition,'expedition_expense'],[tax,'tax'],[dental,'dental'],[maternity,'maternity']].forEach(function (entry) {
        if (entry[0]) components.push({ tipo: entry[1], factId: entry[0].id, calculationType: entry[0].valueKind === 'rate' ? 'rate' : 'fixed', optional: entry[1] === 'dental' || entry[1] === 'maternity' });
      });
      discounts.slice(0, 3).forEach(function (fact) { components.push({ tipo: 'discount', factId: fact.id, calculationType: fact.valueKind === 'rate' ? 'rate' : 'manual_validated', optional: true }); });
      var financing = [];
      installmentFacts.forEach(function (installment) {
        var nearest = surchargeFacts.find(function (surcharge) { return clean(surcharge.label) === clean(installment.label); });
        financing.push({ installmentFactId: installment.id, surchargeFactId: nearest && nearest.id, paymentMethod: /visa/i.test(installment.label) ? 'third_party' : 'consecutive' });
      });
      if (!components.length) {
        if (financing.length) unmappedFinancingGroups.push({ groupId: group.id, groupKey: group.groupKey, financingSchedules: financing, reason: 'FINANCING_SCOPE_REQUIRES_MAPPING' });
        return;
      }
      combinations.push({
        id: stableId('simple_mapping', [group.id]), groupId: group.id, groupKey: group.groupKey,
        sectionAnchor: group.sectionAnchor,
        nombre: clean(group.sectionAnchor || group.dimensionsProposal && group.dimensionsProposal.plan || 'Regla simple propuesta'),
        dimensions: sanitize(group.dimensionsProposal || {}),
        calculationType: clean(group.recommendedCalculationType || 'manual_validated'), amountBasis: 'requires_validation',
        components: components, financingSchedules: financing, factIds: rows.map(function (fact) { return fact.id; }),
        outputRouteId: [].concat(group.outputRouteIds || [])[0] || '', confidence: Number(group.confidence || 0),
        requiresSemanticMapping: true
      });
    });
    return {
      ok: combinations.length > 0, code: combinations.length ? 'SIMPLE_MAPPING_PROPOSED' : 'NO_SIMPLE_MAPPING_AVAILABLE',
      document: template.document, combinations: combinations, unmappedFinancingGroups: unmappedFinancingGroups,
      warnings: unique([].concat(template.warnings || [], ['AUTO_MAPPING_REQUIRES_HUMAN_VALIDATION'], unmappedFinancingGroups.length ? ['FINANCING_SCOPE_REQUIRES_MAPPING'] : [])),
      writeAllowed: false, requiresHumanValidation: true
    };
  }

  Orbit.excelRuleProposalAdapterP06b = {
    COMPONENT_FACT_TYPES: COMPONENT_FACT_TYPES.slice(), NUMERIC_FACT_TYPES: NUMERIC_FACT_TYPES.slice(),
    validateManifest: validateManifest, mappingTemplate: mappingTemplate,
    autoMapSimpleTariff: autoMapSimpleTariff, buildRuleProposals: buildRuleProposals
  };
})();
