/* ============================================================
   Orbit 360 · P0.8c · Política estricta país/moneda para gate
   Fecha: 2026-07-10

   Endurece knowledge-binding-gate-p08 sin modificar store/backend.
   País y moneda son obligatorios. Monedas adicionales solo se aceptan
   cuando el tenant las declara expresamente.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  var DEFAULT_ALLOWED = { GT: ['GTQ'], CO: ['COP'] };
  var baseGate = Orbit.knowledgeBindingGateP08 || null;
  var baseEvaluate = baseGate && baseGate.evaluateBinding;
  var baseEnablementPlan = baseGate && baseGate.buildEnablementPlan;
  var baseRuntimePackage = baseGate && baseGate.buildRuntimePackage;

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function upper(value) { return clean(value).toUpperCase(); }
  function unique(values) { return Array.from(new Set((values || []).filter(Boolean))); }
  function clone(value) { return JSON.parse(JSON.stringify(value == null ? null : value)); }

  function countryRow(config, country) {
    config = config || {};
    var source = config.paisesCfg || config.countries || config.paises || {};
    if (Array.isArray(source)) {
      return source.find(function (row) {
        return upper(row && (row.codigo || row.code || row.pais || row.country)) === country;
      }) || null;
    }
    return source[country] || source[country.toLowerCase()] || null;
  }

  function configuredCurrencies(config, country) {
    var row = countryRow(config, country), values = [];
    if (row) {
      values = values.concat(row.monedas || row.currencies || []);
      values.push(row.moneda, row.currency);
    }
    if (!values.filter(Boolean).length) values = DEFAULT_ALLOWED[country] || [];
    return unique(values.map(upper).filter(Boolean));
  }

  function validateCountryCurrency(binding, config) {
    var dims = binding && binding.dimensiones || {};
    var country = upper(dims.pais || dims.country);
    var currency = upper(dims.moneda || dims.currency);
    var errors = [], allowed = configuredCurrencies(config, country);
    if (!country) errors.push('PAIS_REQUIERE_VALIDACION');
    if (!currency) errors.push('MONEDA_REQUIERE_VALIDACION');
    if (country && currency && allowed.length && allowed.indexOf(currency) < 0) {
      errors.push('MONEDA_NO_HABILITADA_PARA_PAIS');
    }
    if (country && currency && !allowed.length) errors.push('CATALOGO_MONEDA_PAIS_REQUERIDO');
    return {
      valid: errors.length === 0,
      country: country,
      currency: currency,
      allowedCurrencies: allowed,
      errors: errors
    };
  }

  function strictEvaluate(binding, target, config) {
    if (!baseGate || typeof baseEvaluate !== 'function') {
      return { ready: false, target: target, errors: ['KNOWLEDGE_BINDING_GATE_P08_REQUIRED'], warnings: [], writeAllowed: false };
    }
    var result = clone(baseEvaluate.call(baseGate, binding, target, config)) || {};
    var policy = validateCountryCurrency(binding, config);
    result.errors = unique([].concat(result.errors || [], policy.errors));
    result.ready = result.errors.length === 0;
    result.checks = Object.assign({}, result.checks || {}, {
      countryCurrencyPolicyValid: policy.valid,
      country: policy.country,
      currency: policy.currency,
      allowedCurrencies: policy.allowedCurrencies
    });
    result.writeAllowed = false;
    result.requiresSecondGateForEnablement = true;
    return result;
  }

  function strictEnablementPlan(binding, decision, actor, config) {
    if (!baseGate || typeof baseEnablementPlan !== 'function') {
      return { ok: false, plan: null, errors: ['KNOWLEDGE_BINDING_GATE_P08_REQUIRED'], writeAllowed: false };
    }
    var evaluation = strictEvaluate(binding, clean(decision && decision.target), config);
    var result = clone(baseEnablementPlan.call(baseGate, binding, decision, actor, config)) || {};
    if (!evaluation.ready) {
      result.ok = false;
      result.plan = null;
      result.errors = unique([].concat(result.errors || [], evaluation.errors));
    }
    result.evaluation = evaluation;
    result.writeAllowed = false;
    result.requiresExternalWriter = true;
    return result;
  }

  function strictRuntimePackage(bindings, plans) {
    return typeof baseRuntimePackage === 'function'
      ? baseRuntimePackage.call(baseGate, bindings, plans)
      : { ok: false, records: [], errors: ['KNOWLEDGE_BINDING_GATE_P08_REQUIRED'], writeAllowed: false };
  }

  Orbit.knowledgeBindingPolicyP08 = {
    DEFAULT_ALLOWED: clone(DEFAULT_ALLOWED),
    configuredCurrencies: configuredCurrencies,
    validateCountryCurrency: validateCountryCurrency,
    evaluateBinding: strictEvaluate,
    buildEnablementPlan: strictEnablementPlan,
    buildRuntimePackage: strictRuntimePackage,
    authoritative: true
  };

  if (baseGate) {
    baseGate.evaluateBinding = strictEvaluate;
    baseGate.buildEnablementPlan = strictEnablementPlan;
  }
})();