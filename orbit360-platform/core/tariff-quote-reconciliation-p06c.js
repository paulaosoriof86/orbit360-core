/* ============================================================
   Orbit 360 · P0.6c · Reconciliación tarifa ↔ cotización ejemplo
   Fecha: 2026-07-10

   Verifica reglas propuestas contra cotizaciones de ejemplo sin aprender,
   escribir ni habilitar automáticamente. Toda base de cálculo debe ser
   explícita; la ausencia de orden/base produce un bloqueo honesto.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  var SUPPORTED_CALCULATIONS = ['fixed', 'rate', 'rate_with_minimum', 'rate_plus_fixed_with_minimum', 'lookup_range'];
  var DEFAULT_TOLERANCE = { absolute: 1, relative: 0.0025 };

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function norm(value) {
    return clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }
  function clone(value) { return JSON.parse(JSON.stringify(value == null ? null : value)); }
  function unique(values) { return Array.from(new Set((values || []).filter(Boolean))); }
  function finite(value) { var number = Number(value); return Number.isFinite(number) ? number : null; }
  function roundMoney(value) { return Math.round((Number(value) + Number.EPSILON) * 100) / 100; }
  function sanitize(value) {
    var contract = Orbit.documentSourceContractP04;
    return contract && typeof contract.sanitize === 'function'
      ? contract.sanitize(value, { redactSamples: true, maxArray: 1000 }, 0)
      : clone(value || {});
  }
  function dimensions(input) { input = input || {}; return input.dimensiones || input.dimensions || input; }
  function dimensionMismatch(rule, sample) {
    var r = dimensions(rule), s = dimensions(sample);
    var keys = ['pais', 'moneda', 'producto', 'tipoRiesgo', 'tipoVehiculo', 'usoVehiculo', 'plan'];
    return keys.filter(function (key) { return clean(r[key]) && clean(s[key]) && norm(r[key]) !== norm(s[key]); });
  }
  function evidenceValid(item) {
    item = item || {};
    if (clean(item.mediaKind) === 'spreadsheet') return !!(clean(item.documentId) && clean(item.sheet) && clean(item.range));
    if (clean(item.mediaKind) === 'pdf') return !!(clean(item.documentId) && Number(item.page || 0));
    return !!(clean(item.documentId) && (clean(item.sheet) || Number(item.page || 0) || clean(item.block)));
  }
  function lookupValue(rows, context) {
    context = context || {};
    var insured = finite(context.valorAsegurado != null ? context.valorAsegurado : context.insuredValue);
    var age = finite(context.edad != null ? context.edad : context.age);
    var vehicle = norm(context.tipoVehiculo || context.vehicleType), usage = norm(context.usoVehiculo || context.usage);
    var candidate = (rows || []).find(function (row) {
      row = row || {};
      var from = finite(row.valorDesde != null ? row.valorDesde : row.from), to = finite(row.valorHasta != null ? row.valorHasta : row.to);
      var ageFrom = finite(row.edadDesde != null ? row.edadDesde : row.ageFrom), ageTo = finite(row.edadHasta != null ? row.edadHasta : row.ageTo);
      if (insured != null && from != null && insured < from) return false;
      if (insured != null && to != null && insured > to) return false;
      if (age != null && ageFrom != null && age < ageFrom) return false;
      if (age != null && ageTo != null && age > ageTo) return false;
      if (row.tipoVehiculo && norm(row.tipoVehiculo) !== vehicle) return false;
      if (row.usoVehiculo && norm(row.usoVehiculo) !== usage) return false;
      return true;
    });
    if (!candidate) return null;
    return {
      rate: finite(candidate.rate != null ? candidate.rate : candidate.tasa),
      fixedAmount: finite(candidate.fixedAmount != null ? candidate.fixedAmount : candidate.valor),
      minimum: finite(candidate.minimum != null ? candidate.minimum : candidate.minimo), row: sanitize(candidate)
    };
  }
  function calculateBase(component, context, blockers) {
    component = component || {}; context = context || {};
    var type = clean(component.calculationType || 'fixed');
    var insured = finite(context.valorAsegurado != null ? context.valorAsegurado : context.insuredValue);
    var rate = finite(component.rate), fixedAmount = finite(component.fixedAmount != null ? component.fixedAmount : component.value), minimum = finite(component.minimum), lookup = null;
    if (type === 'lookup_range') {
      lookup = lookupValue(component.lookupTable || [], context);
      if (!lookup) { blockers.push('LOOKUP_SIN_FILA_APLICABLE:' + clean(component.id)); return null; }
      rate = lookup.rate != null ? lookup.rate : rate;
      fixedAmount = lookup.fixedAmount != null ? lookup.fixedAmount : fixedAmount;
      minimum = lookup.minimum != null ? lookup.minimum : minimum;
    }
    if (SUPPORTED_CALCULATIONS.indexOf(type) < 0) { blockers.push('TIPO_CALCULO_NO_SOPORTADO:' + type); return null; }
    if (type === 'fixed') {
      if (fixedAmount == null && minimum != null) fixedAmount = minimum;
      if (fixedAmount == null) { blockers.push('VALOR_FIJO_REQUERIDO:' + clean(component.id)); return null; }
      return roundMoney(fixedAmount);
    }
    if (insured == null) { blockers.push('VALOR_ASEGURADO_REQUERIDO'); return null; }
    if (rate == null) { blockers.push('TASA_REQUERIDA:' + clean(component.id)); return null; }
    var calculated = insured * rate;
    if (type === 'rate_plus_fixed_with_minimum') {
      if (fixedAmount == null) { blockers.push('CARGO_FIJO_REQUERIDO:' + clean(component.id)); return null; }
      calculated += fixedAmount;
    }
    if ((type === 'rate_with_minimum' || type === 'rate_plus_fixed_with_minimum') && minimum == null) {
      blockers.push('MINIMO_REQUERIDO:' + clean(component.id)); return null;
    }
    if (minimum != null) calculated = Math.max(calculated, minimum);
    return roundMoney(calculated);
  }
  function componentSelected(component, context) {
    if (!component || component.optional !== true) return true;
    var selected = [].concat(context.coberturasSeleccionadas || context.selectedCoverages || []).map(norm);
    return selected.indexOf(norm(component.id)) >= 0 || selected.indexOf(norm(component.tipo)) >= 0 || selected.indexOf(norm(component.nombre)) >= 0;
  }
  function baseForRate(model, totals, blockers, component) {
    model = model || {};
    var base = clean(model.base || model.applyOn || model.aplicaSobre);
    if (!base) { blockers.push('BASE_COMPONENTE_REQUERIDA:' + clean(component.id)); return null; }
    if (base === 'base_premium') return totals.basePremium;
    if (base === 'net_before_fees' || base === 'net_before_tax') return totals.netBeforeFees;
    if (base === 'net_plus_fees' || base === 'subtotal_before_tax') return totals.subtotalBeforeTax;
    if (base === 'net_plus_fees_plus_assistance') return totals.subtotalBeforeTax;
    blockers.push('BASE_COMPONENTE_NO_SOPORTADA:' + base); return null;
  }
  function calculateRule(rule, context) {
    rule = rule || {}; context = context || {};
    var blockers = [], warnings = [], lines = [], mismatches = dimensionMismatch(rule, context);
    if (mismatches.length) blockers.push('DIMENSIONES_NO_COINCIDEN:' + mismatches.join(','));
    if (clean(rule.amountBasis) === 'requires_validation' || !clean(rule.amountBasis)) blockers.push('BASE_MONETARIA_REQUIERE_VALIDACION');
    if (!clean(rule.documentoFuenteId || rule.documentId)) blockers.push('DOCUMENTO_REGLA_REQUERIDO');
    var sourceEvidence = [].concat(rule.sourceEvidence || rule.evidencias || []);
    if (!sourceEvidence.some(evidenceValid)) blockers.push('EVIDENCIA_REGLA_REQUERIDA');
    var totals = { basePremium: 0, assistance: 0, fees: 0, discounts: 0, optional: 0, netBeforeFees: 0, netBeforeTax: 0, subtotalBeforeTax: 0, tax: 0, financing: 0, total: 0 };
    var components = [].concat(rule.components || rule.componentes || []);
    var baseComponents = components.filter(function (item) { return item && item.tipo === 'base_premium'; });
    if (!baseComponents.length) blockers.push('COMPONENTE_PRIMA_BASE_REQUERIDO');
    baseComponents.forEach(function (component) {
      var amount = calculateBase(component, context, blockers);
      if (amount == null) return;
      totals.basePremium += amount;
      lines.push({ type: component.tipo, id: component.id, amount: amount, operation: 'add', evidence: sanitize(component.evidence) });
    });
    var nonFeeComponents = components.filter(function (item) {
      return item && item.tipo !== 'base_premium' && item.tipo !== 'tax' && item.tipo !== 'financing_surcharge' && item.tipo !== 'issuance_expense' && item.tipo !== 'expedition_expense' && item.tipo !== 'fixed_charge';
    });
    nonFeeComponents.forEach(function (component) {
      if (!componentSelected(component, context)) return;
      var amount = null;
      if (clean(component.calculationType) === 'rate') {
        totals.netBeforeFees = roundMoney(totals.basePremium + totals.assistance + totals.optional - totals.discounts);
        totals.subtotalBeforeTax = roundMoney(totals.netBeforeFees + totals.fees);
        var rateBase = baseForRate(component.formulaModel, totals, blockers, component);
        if (rateBase != null && finite(component.rate) != null) amount = roundMoney(rateBase * finite(component.rate));
      } else amount = calculateBase(component, context, blockers);
      if (amount == null) return;
      var operation = component.tipo === 'discount' ? 'subtract' : 'add';
      if (component.tipo === 'discount') totals.discounts += amount;
      else if (component.tipo === 'assistance') totals.assistance += amount;
      else totals.optional += amount;
      lines.push({ type: component.tipo, id: component.id, amount: amount, operation: operation, evidence: sanitize(component.evidence) });
    });
    totals.netBeforeFees = roundMoney(totals.basePremium + totals.assistance + totals.optional - totals.discounts);
    components.filter(function (item) { return item && (item.tipo === 'issuance_expense' || item.tipo === 'expedition_expense' || item.tipo === 'fixed_charge'); }).forEach(function (component) {
      if (!componentSelected(component, context)) return;
      totals.subtotalBeforeTax = roundMoney(totals.netBeforeFees + totals.fees);
      var amount = null;
      if (clean(component.calculationType) === 'rate') {
        var feeBase = baseForRate(component.formulaModel, totals, blockers, component);
        if (feeBase != null && finite(component.rate) != null) amount = roundMoney(feeBase * finite(component.rate));
      } else amount = calculateBase(component, context, blockers);
      if (amount == null) return;
      totals.fees += amount;
      lines.push({ type: component.tipo, id: component.id, amount: amount, operation: 'add', evidence: sanitize(component.evidence) });
    });
    totals.subtotalBeforeTax = roundMoney(totals.netBeforeFees + totals.fees); totals.netBeforeTax = totals.subtotalBeforeTax;
    components.filter(function (item) { return item && item.tipo === 'tax'; }).forEach(function (component) {
      if (component.includedInGross === true) { warnings.push('IMPUESTO_YA_INCLUIDO:' + clean(component.id)); return; }
      var taxBase = baseForRate(component.formulaModel, totals, blockers, component), rate = finite(component.rate);
      if (taxBase == null || rate == null) { if (rate == null) blockers.push('TASA_IMPUESTO_REQUERIDA:' + clean(component.id)); return; }
      var amount = roundMoney(taxBase * rate); totals.tax += amount;
      lines.push({ type: 'tax', id: component.id, amount: amount, operation: 'add', evidence: sanitize(component.evidence) });
    });
    var schedule = null, requestedInstallments = finite(context.cuotas != null ? context.cuotas : context.installments), requestedMethod = norm(context.formaPago || context.paymentMethod);
    if (requestedInstallments != null || requestedMethod) {
      schedule = [].concat(rule.financingSchedules || rule.financiamientos || []).find(function (item) {
        if (requestedInstallments != null && finite(item.installments) !== requestedInstallments) return false;
        if (requestedMethod && norm(item.paymentMethod) !== requestedMethod) return false;
        return true;
      }) || null;
      if (!schedule) blockers.push('CALENDARIO_PAGO_NO_ENCONTRADO');
    }
    var preFinance = roundMoney(totals.subtotalBeforeTax + totals.tax);
    if (schedule && finite(schedule.surchargeRate) != null) {
      var surchargeBase = clean(schedule.amountBasis || 'net');
      var baseValue = surchargeBase === 'total_before_financing' ? preFinance : totals.subtotalBeforeTax;
      totals.financing = roundMoney(baseValue * finite(schedule.surchargeRate));
      lines.push({ type: 'financing_surcharge', id: schedule.id, amount: totals.financing, operation: 'add', evidence: sanitize(schedule.evidence) });
    }
    totals.total = roundMoney(preFinance + totals.financing);
    return {
      ok: blockers.length === 0,
      code: blockers.length ? 'CALCULATION_INCOMPLETE' : 'CALCULATION_READY_FOR_RECONCILIATION',
      totals: totals, lines: lines, blockers: unique(blockers), warnings: unique(warnings),
      writeAllowed: false, enabled: false, requiresHumanValidation: true
    };
  }
  function reconcile(rule, sample, tolerance) {
    sample = sample || {}; tolerance = Object.assign({}, DEFAULT_TOLERANCE, tolerance || {});
    var calculation = calculateRule(rule, sample), observed = finite(sample.observedTotal != null ? sample.observedTotal : sample.totalObservado);
    var errors = [].concat(calculation.blockers || []);
    if (observed == null) errors.push('TOTAL_OBSERVADO_REQUERIDO');
    if (!evidenceValid(sample.evidence || sample.evidencia || {})) errors.push('EVIDENCIA_MUESTRA_REQUERIDA');
    if (errors.length) return {
      ok: false, status: 'incomplete_requires_validation', ruleId: clean(rule && rule.id), sampleId: clean(sample.id),
      calculation: calculation, observedTotal: observed, errors: unique(errors), writeAllowed: false, enabled: false,
      requiresHumanValidation: true
    };
    var expected = calculation.totals.total, absoluteDelta = roundMoney(observed - expected);
    var relativeDelta = observed === 0 ? (expected === 0 ? 0 : 1) : Math.abs(absoluteDelta) / Math.abs(observed);
    var within = Math.abs(absoluteDelta) <= Number(tolerance.absolute) || relativeDelta <= Number(tolerance.relative);
    return {
      ok: true, status: within ? 'reconciled_within_tolerance' : 'mismatch_requires_validation',
      ruleId: clean(rule && rule.id), sampleId: clean(sample.id), expectedTotal: expected, observedTotal: observed,
      absoluteDelta: absoluteDelta, relativeDelta: relativeDelta, tolerance: sanitize(tolerance), calculation: calculation,
      evidence: sanitize(sample.evidence || sample.evidencia), writeAllowed: false, enabled: false,
      requiresHumanValidation: true, requiresSecondGateForEnablement: true
    };
  }
  function report(rules, samples, tolerance) {
    var rows = [];
    (samples || []).forEach(function (sample) {
      (rules || []).forEach(function (rule) { if (!dimensionMismatch(rule, sample).length) rows.push(reconcile(rule, sample, tolerance)); });
    });
    return {
      rows: rows,
      summary: {
        total: rows.length,
        reconciled: rows.filter(function (row) { return row.status === 'reconciled_within_tolerance'; }).length,
        mismatches: rows.filter(function (row) { return row.status === 'mismatch_requires_validation'; }).length,
        incomplete: rows.filter(function (row) { return row.status === 'incomplete_requires_validation'; }).length
      },
      writeAllowed: false, enabled: false, requiresHumanValidation: true
    };
  }

  Orbit.tariffQuoteReconciliationP06c = {
    SUPPORTED_CALCULATIONS: SUPPORTED_CALCULATIONS.slice(), DEFAULT_TOLERANCE: clone(DEFAULT_TOLERANCE),
    calculateRule: calculateRule, reconcile: reconcile, report: report
  };
})();
