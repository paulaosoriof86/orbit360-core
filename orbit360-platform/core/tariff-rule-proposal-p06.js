/* ============================================================
   Orbit 360 · P0.6 · Contrato reusable de reglas tarifarias
   Fecha: 2026-07-10

   Modela reglas extraídas de cotizadores/tarifarios por aseguradora,
   país, producto, vehículo/riesgo, plan y versión. No calcula con
   datos reales, no escribe en Orbit.store y no habilita productos.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  var CALCULATION_TYPES = [
    'fixed', 'rate', 'rate_with_minimum', 'rate_plus_fixed_with_minimum',
    'lookup_range', 'matrix_age_gender', 'matrix_age_gender_maternity',
    'per_member', 'household_tier', 'gross_table', 'manual_validated'
  ];
  var AMOUNT_BASES = [
    'net', 'gross_includes_tax', 'gross_includes_fees',
    'gross_includes_tax_and_fees', 'requires_validation'
  ];
  var COMPONENT_TYPES = [
    'base_premium', 'minimum_premium', 'fixed_charge', 'assistance',
    'issuance_expense', 'expedition_expense', 'financing_surcharge',
    'tax', 'life_premium', 'dental', 'maternity', 'optional_coverage',
    'discount', 'other'
  ];
  var STATUS_VALUES = [
    'proposed', 'requires_validation', 'conflict',
    'validated_pending_enablement', 'rejected', 'superseded'
  ];
  var ROUTE_MODES = ['single_output', 'plan_output', 'template_output', 'requires_validation'];
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
  function finite(value) { var n = Number(value); return Number.isFinite(n) ? n : null; }
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
  function dimensions(input, ctx) {
    input = input || {};
    ctx = ctx || {};
    var d = input.dimensiones || input.dimensions || {};
    var fallback = ctx.dimensiones || ctx.dimensions || {};
    return {
      pais: clean(input.pais || d.pais || ctx.pais || fallback.pais).toUpperCase(),
      moneda: clean(input.moneda || d.moneda || ctx.moneda || fallback.moneda).toUpperCase(),
      ramo: clean(input.ramo || d.ramo || ctx.ramo || fallback.ramo),
      producto: clean(input.producto || d.producto || ctx.producto || fallback.producto),
      familiaProducto: clean(input.familiaProducto || d.familiaProducto || d.familia || ctx.familiaProducto || fallback.familiaProducto),
      subtipoProducto: clean(input.subtipoProducto || d.subtipoProducto || d.subtipo || ctx.subtipoProducto || fallback.subtipoProducto),
      segmento: clean(input.segmento || d.segmento || ctx.segmento || fallback.segmento),
      tipoRiesgo: clean(input.tipoRiesgo || d.tipoRiesgo || ctx.tipoRiesgo || fallback.tipoRiesgo),
      tipoVehiculo: clean(input.tipoVehiculo || d.tipoVehiculo || ctx.tipoVehiculo || fallback.tipoVehiculo),
      usoVehiculo: clean(input.usoVehiculo || d.usoVehiculo || ctx.usoVehiculo || fallback.usoVehiculo),
      plan: clean(input.plan || d.plan || ctx.plan || fallback.plan)
    };
  }
  function evidence(input, ctx) {
    input = input || {};
    ctx = ctx || {};
    var media = clean(input.mediaKind || input.tipo || ctx.mediaKind || 'spreadsheet');
    return {
      mediaKind: media,
      documentId: clean(input.documentId || input.documentoFuenteId || ctx.documentId),
      fileRef: clean(input.fileRef || input.archivoRef || ctx.fileRef),
      sheet: clean(input.sheet || input.hoja),
      range: clean(input.range || input.rango),
      formulaRef: clean(input.formulaRef || input.formula),
      page: Number(input.page || input.pagina || 0),
      block: clean(input.block || input.bloque),
      evidenceHash: clean(input.evidenceHash || input.hashEvidencia),
      method: clean(input.method || input.metodo || 'deterministic'),
      containsRawPayload: false,
      containsCustomerPayload: false
    };
  }
  function evidenceValid(item) {
    if (!item || !item.documentId) return false;
    if (item.mediaKind === 'spreadsheet') return !!(item.sheet && item.range);
    if (item.mediaKind === 'pdf' || item.mediaKind === 'image') return !!(item.page || item.block);
    return !!(item.sheet || item.range || item.page || item.block);
  }
  function normalizeApplicability(input) {
    input = input || {};
    var source = input.aplicabilidad || input.applicability || input;
    function arr(key) {
      var value = source[key];
      if (value == null || value === '') return [];
      return unique((Array.isArray(value) ? value : [value]).map(clean).filter(Boolean));
    }
    return {
      tiposVehiculo: arr('tiposVehiculo').concat(arr('tipoVehiculo')),
      usosVehiculo: arr('usosVehiculo').concat(arr('usoVehiculo')),
      tiposRiesgo: arr('tiposRiesgo').concat(arr('tipoRiesgo')),
      modalidades: arr('modalidades').concat(arr('modalidad')),
      generos: arr('generos').concat(arr('genero')),
      edadesDesde: finite(source.edadesDesde != null ? source.edadesDesde : source.edadDesde),
      edadesHasta: finite(source.edadesHasta != null ? source.edadesHasta : source.edadHasta),
      valorDesde: finite(source.valorDesde),
      valorHasta: finite(source.valorHasta),
      anosAntiguedadMax: finite(source.anosAntiguedadMax),
      sumaAseguradaDesde: finite(source.sumaAseguradaDesde),
      sumaAseguradaHasta: finite(source.sumaAseguradaHasta),
      requiereMaternidad: source.requiereMaternidad === true,
      excluyeMaternidad: source.excluyeMaternidad === true,
      requiereCoberturas: arr('requiereCoberturas'),
      excluyeCoberturas: arr('excluyeCoberturas'),
      observaciones: clean(source.observaciones)
    };
  }
  function normalizeComponent(input, ctx, index) {
    input = input || {};
    ctx = ctx || {};
    var type = clean(input.tipo || input.type || 'other');
    if (COMPONENT_TYPES.indexOf(type) < 0) type = 'other';
    var calc = clean(input.calculationType || input.tipoCalculo || 'fixed');
    if (CALCULATION_TYPES.indexOf(calc) < 0) calc = 'manual_validated';
    var basis = clean(input.amountBasis || input.baseMonto || ctx.amountBasis || 'requires_validation');
    if (AMOUNT_BASES.indexOf(basis) < 0) basis = 'requires_validation';
    var ev = evidence(input.evidencia || input.evidence || {}, ctx);
    return {
      id: clean(input.id) || stableId('component', [ctx.ruleId, type, input.nombre || input.name, index || 0]),
      tipo: type,
      nombre: clean(input.nombre || input.name || type),
      calculationType: calc,
      amountBasis: basis,
      value: sanitize(input.value != null ? input.value : input.valor),
      rate: finite(input.rate != null ? input.rate : input.tasa),
      fixedAmount: finite(input.fixedAmount != null ? input.fixedAmount : input.valorFijo),
      minimum: finite(input.minimum != null ? input.minimum : input.minimo),
      maximum: finite(input.maximum != null ? input.maximum : input.maximo),
      unit: clean(input.unit || input.unidad),
      currency: clean(input.currency || input.moneda || ctx.moneda).toUpperCase(),
      taxable: input.taxable === true,
      financeable: input.financeable === true,
      includedInGross: input.includedInGross === true,
      optional: input.optional === true,
      applicability: normalizeApplicability(input),
      formulaModel: sanitize(input.formulaModel || input.modeloFormula || {}),
      lookupTable: sanitize(input.lookupTable || input.tabla || []),
      evidence: ev,
      requiresHumanValidation: true,
      enabled: false
    };
  }
  function normalizeFinancing(input, ctx, index) {
    input = input || {};
    ctx = ctx || {};
    var ev = evidence(input.evidencia || input.evidence || {}, ctx);
    return {
      id: clean(input.id) || stableId('finance', [ctx.ruleId, input.nombre || input.name, index || 0]),
      nombre: clean(input.nombre || input.name || 'Calendario de pagos'),
      paymentMethod: clean(input.paymentMethod || input.formaPago || 'consecutive'),
      installments: finite(input.installments != null ? input.installments : input.cuotas),
      surchargeRate: finite(input.surchargeRate != null ? input.surchargeRate : input.recargo),
      thresholdMin: finite(input.thresholdMin || input.umbralMinimo),
      amountBasis: clean(input.amountBasis || input.baseMonto || 'net'),
      provider: clean(input.provider || input.proveedor),
      conditions: sanitize(input.conditions || input.condiciones || {}),
      evidence: ev,
      requiresHumanValidation: true,
      enabled: false
    };
  }
  function normalizeOutputRoute(input, ctx) {
    input = input || {};
    ctx = ctx || {};
    var mode = clean(input.mode || input.modo || 'requires_validation');
    if (ROUTE_MODES.indexOf(mode) < 0) mode = 'requires_validation';
    return {
      mode: mode,
      routeKey: clean(input.routeKey || input.claveRuta),
      outputSheet: clean(input.outputSheet || input.hojaSalida),
      templateId: clean(input.templateId || input.plantillaId),
      productKey: clean(input.productKey || input.claveProducto || ctx.producto),
      vehicleTypeKey: clean(input.vehicleTypeKey || input.claveTipoVehiculo || ctx.tipoVehiculo),
      planKey: clean(input.planKey || input.clavePlan || ctx.plan),
      printArea: clean(input.printArea || input.areaImpresion),
      preservesSourceSections: input.preservesSourceSections !== false,
      requiresSingleSelection: input.requiresSingleSelection !== false,
      evidence: evidence(input.evidencia || input.evidence || {}, ctx)
    };
  }
  function normalizeRule(input, ctx, index) {
    input = input || {};
    ctx = ctx || {};
    var d = dimensions(input, ctx);
    var calc = clean(input.calculationType || input.tipoCalculo || 'manual_validated');
    if (CALCULATION_TYPES.indexOf(calc) < 0) calc = 'manual_validated';
    var basis = clean(input.amountBasis || input.baseMonto || 'requires_validation');
    if (AMOUNT_BASES.indexOf(basis) < 0) basis = 'requires_validation';
    var ruleId = clean(input.id) || stableId('tariff', [
      input.aseguradoraId || ctx.aseguradoraId, d.pais, d.producto, d.tipoVehiculo,
      d.tipoRiesgo, d.plan, input.versionFuente || ctx.versionFuente, index || 0
    ]);
    var childCtx = Object.assign({}, ctx, d, {
      ruleId: ruleId,
      moneda: d.moneda,
      amountBasis: basis,
      documentId: input.documentoFuenteId || input.documentId || ctx.documentId,
      fileRef: input.archivoRef || input.fileRef || ctx.fileRef
    });
    var status = clean(input.estado || input.status || 'proposed');
    if (STATUS_VALUES.indexOf(status) < 0) status = 'proposed';
    return {
      id: ruleId,
      tenantId: clean(input.tenantId || ctx.tenantId),
      aseguradoraId: clean(input.aseguradoraId || ctx.aseguradoraId),
      documentoFuenteId: clean(input.documentoFuenteId || input.documentId || ctx.documentId),
      archivoRef: clean(input.archivoRef || input.fileRef || ctx.fileRef),
      versionFuente: clean(input.versionFuente || input.sourceVersion || ctx.versionFuente || 'v1'),
      nombre: clean(input.nombre || input.name || d.producto || 'Regla tarifaria'),
      dimensiones: d,
      calculationType: calc,
      amountBasis: basis,
      applicability: normalizeApplicability(input),
      components: (input.components || input.componentes || []).map(function (item, i) { return normalizeComponent(item, childCtx, i); }),
      financingSchedules: (input.financingSchedules || input.financiamientos || []).map(function (item, i) { return normalizeFinancing(item, childCtx, i); }),
      options: sanitize(input.options || input.opciones || []),
      rateTable: sanitize(input.rateTable || input.tablaTarifas || []),
      outputRoute: normalizeOutputRoute(input.outputRoute || input.rutaSalida || {}, childCtx),
      sourceEvidence: (input.sourceEvidence || input.evidencias || []).map(function (item) { return evidence(item, childCtx); }),
      confidence: Math.max(0, Math.min(100, Number(input.confidence || input.confianza || 0))),
      estado: status,
      requiresHumanValidation: true,
      enabledCotizador: false,
      enabledComparativo: false,
      writeAllowed: false,
      createdAt: clean(input.createdAt) || new Date().toISOString()
    };
  }
  function validateRule(rule) {
    rule = rule || {};
    var errors = [], warnings = [];
    if (!rule.tenantId) errors.push('TENANT_REQUERIDO');
    if (!rule.aseguradoraId) errors.push('ASEGURADORA_REQUERIDA');
    if (!rule.documentoFuenteId) errors.push('DOCUMENTO_REQUERIDO');
    if (!rule.dimensiones || !rule.dimensiones.pais) errors.push('PAIS_REQUIERE_VALIDACION');
    if (!rule.dimensiones || !rule.dimensiones.producto) errors.push('PRODUCTO_REQUIERE_VALIDACION');
    if (CALCULATION_TYPES.indexOf(rule.calculationType) < 0) errors.push('TIPO_CALCULO_INVALIDO');
    if (AMOUNT_BASES.indexOf(rule.amountBasis) < 0) errors.push('BASE_MONTO_INVALIDA');
    if (!rule.outputRoute || rule.outputRoute.mode === 'requires_validation' || !rule.outputRoute.routeKey) warnings.push('RUTA_SALIDA_REQUIERE_VALIDACION');
    if (!rule.sourceEvidence || !rule.sourceEvidence.some(evidenceValid)) warnings.push('EVIDENCIA_REGLA_REQUERIDA');
    rule.components.forEach(function (component) {
      if (!evidenceValid(component.evidence)) warnings.push('EVIDENCIA_COMPONENTE_REQUERIDA:' + component.tipo);
    });
    if (rule.amountBasis === 'gross_includes_tax' || rule.amountBasis === 'gross_includes_tax_and_fees') {
      if (rule.components.some(function (component) { return component.tipo === 'tax' && component.includedInGross !== true; })) errors.push('DOBLE_IMPUESTO_RIESGO');
    }
    if (rule.amountBasis === 'gross_includes_fees' || rule.amountBasis === 'gross_includes_tax_and_fees') {
      if (rule.components.some(function (component) {
        return (component.tipo === 'issuance_expense' || component.tipo === 'expedition_expense') && component.includedInGross !== true;
      })) errors.push('DOBLE_GASTO_RIESGO');
    }
    if (rule.calculationType === 'matrix_age_gender' || rule.calculationType === 'matrix_age_gender_maternity') {
      if (!Array.isArray(rule.rateTable) || !rule.rateTable.length) errors.push('MATRIZ_EDAD_GENERO_REQUERIDA');
    }
    if (rule.calculationType === 'matrix_age_gender_maternity') {
      var hasWith = rule.rateTable.some(function (row) { return row && row.maternity === true; });
      var hasWithout = rule.rateTable.some(function (row) { return row && row.maternity === false; });
      if (!hasWith || !hasWithout) errors.push('VARIANTES_MATERNIDAD_REQUERIDAS');
    }
    if (rule.confidence < 60) warnings.push('CONFIANZA_BAJA');
    return { valid: errors.length === 0, errors: unique(errors), warnings: unique(warnings) };
  }
  function matchesValue(allowed, actual) {
    if (!allowed || !allowed.length) return true;
    return allowed.map(norm).indexOf(norm(actual)) >= 0;
  }
  function rangeMatches(min, max, actual) {
    if (actual == null || actual === '') return min == null && max == null;
    var value = Number(actual);
    if (!Number.isFinite(value)) return false;
    if (min != null && value < min) return false;
    if (max != null && value > max) return false;
    return true;
  }
  function ruleMatches(rule, quoteContext) {
    rule = rule || {};
    quoteContext = quoteContext || {};
    var d = rule.dimensiones || {};
    var a = rule.applicability || {};
    if (d.pais && norm(d.pais) !== norm(quoteContext.pais)) return false;
    if (d.producto && norm(d.producto) !== norm(quoteContext.producto)) return false;
    if (d.plan && quoteContext.plan && norm(d.plan) !== norm(quoteContext.plan)) return false;
    if (d.tipoVehiculo && quoteContext.tipoVehiculo && norm(d.tipoVehiculo) !== norm(quoteContext.tipoVehiculo)) return false;
    if (d.tipoRiesgo && quoteContext.tipoRiesgo && norm(d.tipoRiesgo) !== norm(quoteContext.tipoRiesgo)) return false;
    if (!matchesValue(a.tiposVehiculo, quoteContext.tipoVehiculo)) return false;
    if (!matchesValue(a.usosVehiculo, quoteContext.usoVehiculo)) return false;
    if (!matchesValue(a.tiposRiesgo, quoteContext.tipoRiesgo)) return false;
    if (!matchesValue(a.modalidades, quoteContext.modalidad)) return false;
    if (!matchesValue(a.generos, quoteContext.genero)) return false;
    if (!rangeMatches(a.edadesDesde, a.edadesHasta, quoteContext.edad)) return false;
    if (!rangeMatches(a.valorDesde, a.valorHasta, quoteContext.valorAsegurado)) return false;
    if (a.requiereMaternidad && quoteContext.maternidad !== true) return false;
    if (a.excluyeMaternidad && quoteContext.maternidad === true) return false;
    return true;
  }
  function selectApplicableRules(rules, quoteContext) {
    return (rules || []).filter(function (rule) { return ruleMatches(rule, quoteContext); });
  }
  function buildOutputSelection(rules, quoteContext) {
    var applicable = selectApplicableRules(rules, quoteContext);
    var routeKeys = unique(applicable.map(function (rule) { return clean(rule.outputRoute && rule.outputRoute.routeKey); }).filter(Boolean));
    var errors = [];
    if (!applicable.length) errors.push('SIN_REGLA_APLICABLE');
    if (routeKeys.length > 1) errors.push('RUTAS_SALIDA_EN_CONFLICTO');
    return {
      ok: errors.length === 0,
      selectedRules: applicable,
      routeKey: routeKeys[0] || '',
      outputRoute: applicable[0] && clone(applicable[0].outputRoute),
      errors: errors,
      rendersSingleVehicleOrRisk: errors.length === 0,
      writeAllowed: false
    };
  }
  function ruleKey(rule) {
    rule = rule || {};
    var d = rule.dimensiones || {};
    return [
      rule.aseguradoraId, d.pais, d.ramo, d.producto, d.familiaProducto,
      d.subtipoProducto, d.segmento, d.tipoRiesgo, d.tipoVehiculo,
      d.usoVehiculo, d.plan, rule.versionFuente, rule.nombre
    ].map(norm).join('|');
  }
  function detectRuleConflicts(rules) {
    var grouped = {};
    (rules || []).forEach(function (rule) {
      var key = ruleKey(rule);
      grouped[key] = grouped[key] || [];
      grouped[key].push(rule);
    });
    return Object.keys(grouped).filter(function (key) {
      return unique(grouped[key].map(function (item) {
        return JSON.stringify({ calculationType: item.calculationType, amountBasis: item.amountBasis, components: sanitize(item.components), rateTable: sanitize(item.rateTable), outputRoute: sanitize(item.outputRoute) });
      })).length > 1;
    }).map(function (key) {
      return { key: key, ruleIds: grouped[key].map(function (item) { return item.id; }), status: 'conflict', requiresHumanDecision: true };
    });
  }
  function buildRuleDiff(currentRules, proposedRules) {
    var current = {};
    (currentRules || []).forEach(function (rule) { current[ruleKey(rule)] = rule; });
    var conflicts = detectRuleConflicts(proposedRules || []);
    var conflictKeys = new Set(conflicts.map(function (item) { return item.key; }));
    var rows = (proposedRules || []).map(function (rule) {
      var key = ruleKey(rule), before = current[key] || null;
      var validation = validateRule(rule);
      var action = 'create_proposed';
      if (conflictKeys.has(key)) action = 'conflict_requires_validation';
      else if (!validation.valid) action = 'invalid_requires_validation';
      else if (before && JSON.stringify(sanitize(before)) === JSON.stringify(sanitize(rule))) action = 'omit_same_rule';
      else if (before) action = 'update_proposed';
      return { key: key, action: action, before: before ? sanitize(before) : null, after: rule, validation: validation, requiresHumanDecision: action !== 'omit_same_rule', writeAllowed: false };
    });
    return {
      rows: rows,
      conflicts: conflicts,
      summary: {
        total: rows.length,
        createProposed: rows.filter(function (row) { return row.action === 'create_proposed'; }).length,
        updateProposed: rows.filter(function (row) { return row.action === 'update_proposed'; }).length,
        omitSameRule: rows.filter(function (row) { return row.action === 'omit_same_rule'; }).length,
        invalid: rows.filter(function (row) { return row.action === 'invalid_requires_validation'; }).length,
        conflicts: conflicts.length
      },
      writeAllowed: false,
      requiresHumanValidation: true
    };
  }
  function buildValidatedPlan(diff, decisions, ctx) {
    diff = diff || {};
    decisions = decisions || [];
    ctx = ctx || {};
    var decisionMap = {};
    decisions.forEach(function (item) { if (item && item.ruleId) decisionMap[item.ruleId] = item; });
    var records = [], errors = [], audit = [];
    (diff.rows || []).forEach(function (row) {
      if (row.action === 'omit_same_rule') return;
      var rule = row.after, decision = decisionMap[rule.id];
      if (!decision) { errors.push({ ruleId: rule.id, code: 'DECISION_REQUERIDA' }); return; }
      var action = clean(decision.action), reason = clean(decision.reason || decision.motivo);
      if (!reason) { errors.push({ ruleId: rule.id, code: 'MOTIVO_REQUERIDO' }); return; }
      if (action === 'reject') { audit.push({ ruleId: rule.id, action: 'reject', reason: reason }); return; }
      if (action !== 'confirm' && action !== 'correct') { errors.push({ ruleId: rule.id, code: 'ACCION_INVALIDA' }); return; }
      if (row.action === 'conflict_requires_validation') { errors.push({ ruleId: rule.id, code: 'CONFLICTO_NO_RESUELTO' }); return; }
      var record = action === 'correct' ? normalizeRule(Object.assign({}, rule, decision.patch || {}, { id: rule.id }), {}, 0) : clone(rule);
      var validation = validateRule(record);
      if (!validation.valid) { errors.push({ ruleId: rule.id, code: validation.errors[0] || 'REGLA_INVALIDA' }); return; }
      record.estado = 'validated_pending_enablement';
      record.enabledCotizador = false;
      record.enabledComparativo = false;
      record.writeAllowed = false;
      record.validation = { actorId: clean(ctx.actorId), activeRole: clean(ctx.activeRole), reason: reason, validatedAt: clean(ctx.validatedAt) || new Date().toISOString() };
      records.push(record);
      audit.push({ ruleId: rule.id, action: action, reason: reason, containsRealPayload: false });
    });
    if (errors.length) records = [];
    return {
      ok: errors.length === 0,
      records: records,
      errors: errors,
      audit: audit,
      writeAllowed: false,
      requiresExternalWriter: true,
      requiresSecondGateForEnablement: true,
      enabled: false
    };
  }
  function summarizeCoverage(rules) {
    var groups = {};
    (rules || []).forEach(function (rule) {
      var d = rule.dimensiones || {};
      var key = DIMENSION_KEYS.map(function (name) { return norm(d[name]) || '*'; }).join('|');
      groups[key] = groups[key] || [];
      groups[key].push(rule);
    });
    return {
      totalRules: (rules || []).length,
      totalCombinations: Object.keys(groups).length,
      combinations: Object.keys(groups).map(function (key) {
        var list = groups[key];
        return {
          key: key,
          dimensions: clone(list[0].dimensiones),
          rules: list.length,
          calculationTypes: unique(list.map(function (rule) { return rule.calculationType; })),
          amountBases: unique(list.map(function (rule) { return rule.amountBasis; })),
          outputRoutes: unique(list.map(function (rule) { return clean(rule.outputRoute && rule.outputRoute.routeKey); }).filter(Boolean)),
          pendingValidation: list.filter(function (rule) { return rule.estado !== 'validated_pending_enablement'; }).length
        };
      })
    };
  }

  Orbit.tariffRuleProposalP06 = {
    CALCULATION_TYPES: CALCULATION_TYPES.slice(),
    AMOUNT_BASES: AMOUNT_BASES.slice(),
    COMPONENT_TYPES: COMPONENT_TYPES.slice(),
    STATUS_VALUES: STATUS_VALUES.slice(),
    ROUTE_MODES: ROUTE_MODES.slice(),
    dimensions: dimensions,
    normalizeApplicability: normalizeApplicability,
    normalizeComponent: normalizeComponent,
    normalizeFinancing: normalizeFinancing,
    normalizeOutputRoute: normalizeOutputRoute,
    normalizeRule: normalizeRule,
    validateRule: validateRule,
    ruleMatches: ruleMatches,
    selectApplicableRules: selectApplicableRules,
    buildOutputSelection: buildOutputSelection,
    ruleKey: ruleKey,
    detectRuleConflicts: detectRuleConflicts,
    buildRuleDiff: buildRuleDiff,
    buildValidatedPlan: buildValidatedPlan,
    summarizeCoverage: summarizeCoverage
  };
})();