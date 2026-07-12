/* ============================================================
   Orbit 360 · v1.208 · Adapter runtime P0.6 → contratos v1.203

   Conecta reglas tarifarias profundas ya validadas con Cotizador únicamente
   cuando existe un binding habilitado por el segundo gate. No persiste,
   no habilita, no contiene datos de tenant y conserva el fallback v1.203.
   ============================================================ */
window.Orbit = window.Orbit || {};
(function () {
  'use strict';

  var Q = Orbit.quoteContracts;
  var P06 = Orbit.tariffRuleProposalP06;
  var P06C = Orbit.tariffQuoteReconciliationP06c;
  if (!Q || !P06 || !P06C || Q.__p06RuntimeAdapterV1208) return;

  var originalAvailability = Q.automaticAvailability.bind(Q);
  var originalCalculate = Q.calculateAutomatic.bind(Q);
  var VALIDATED_RULE_STATES = [
    'validated_pending_enablement', 'validado_pendiente_habilitacion',
    'habilitado', 'enabled'
  ];

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function norm(value) {
    return clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }
  function num(value) { var n = Number(value); return Number.isFinite(n) ? n : 0; }
  function clone(value) { try { return JSON.parse(JSON.stringify(value == null ? null : value)); } catch (error) { return value; } }
  function storeRows(collection) {
    try { return Orbit.store && typeof Orbit.store.all === 'function' ? Orbit.store.all(collection) || [] : []; }
    catch (error) { return []; }
  }
  function currentTenantId() {
    var tenant = {};
    try { tenant = Orbit.tenant && typeof Orbit.tenant.get === 'function' ? Orbit.tenant.get() || {} : Orbit.tenant || {}; } catch (error) {}
    var queryTenant = '';
    try { queryTenant = new URLSearchParams(window.location && window.location.search || '').get('tenant') || ''; } catch (error) {}
    return clean(tenant.tenantId || tenant.id || tenant.slug || queryTenant || Orbit.config && Orbit.config.tenantId);
  }
  function dimensions(input) {
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
    left = dimensions(left); right = dimensions(right);
    return Object.keys(left).every(function (key) {
      return !clean(left[key]) || !clean(right[key]) || norm(left[key]) === norm(right[key]);
    });
  }
  function bindingEnabled(binding) {
    binding = binding || {};
    if (binding.enabledCotizadorAutomatico === true) return true;
    return norm(binding.target) === 'cotizador_automatico' && binding.enabled === true;
  }
  function ruleValidated(rule) {
    return VALIDATED_RULE_STATES.indexOf(norm(rule && (rule.estado || rule.status))) >= 0;
  }
  function ruleIdentifier(rule) { return clean(rule && (rule.sourceItemId || rule.ruleId || rule.id)); }
  function bindingRuleIds(binding) { return [].concat(binding && binding.ruleIds || []).map(clean).filter(Boolean); }
  function rulesForBinding(binding, allRules) {
    var ids = bindingRuleIds(binding);
    var embedded = [].concat(binding && binding.rules || []).filter(Boolean);
    var rows = embedded.concat((allRules || []).filter(function (rule) {
      var id = ruleIdentifier(rule);
      return ids.indexOf(id) >= 0 || ids.indexOf(clean(rule && rule.id)) >= 0;
    }));
    var seen = {};
    return rows.filter(function (rule) {
      var key = ruleIdentifier(rule) || clean(rule && rule.id);
      if (!key || seen[key]) return false;
      seen[key] = true;
      return ruleValidated(rule);
    });
  }
  function p06Availability(aseguradoraId, context, risk) {
    var tenantId = currentTenantId();
    var quoteContext = Object.assign({}, dimensions(context || {}), clone(risk || {}));
    var bindings = storeRows('aseguradora_bindings').filter(function (binding) {
      return clean(binding.tenantId) === tenantId &&
        clean(binding.aseguradoraId) === clean(aseguradoraId) &&
        bindingEnabled(binding) && dimensionMatch(binding, quoteContext);
    });
    if (!bindings.length) return { ok: false, errors: ['binding_tarifario_habilitado_no_disponible'], bindings: [], rules: [] };

    var allRules = storeRows('aseguradora_reglas_tarifarias').filter(function (rule) {
      return clean(rule.tenantId) === tenantId && clean(rule.aseguradoraId) === clean(aseguradoraId);
    });
    var candidates = [];
    bindings.forEach(function (binding) {
      rulesForBinding(binding, allRules).forEach(function (rule) {
        if (dimensionMatch(rule, quoteContext) && P06.ruleMatches(rule, quoteContext)) candidates.push({ binding: binding, rule: rule });
      });
    });
    if (!candidates.length) return { ok: false, errors: ['regla_tarifaria_validada_no_aplicable'], bindings: bindings, rules: [] };

    var selection = P06.buildOutputSelection(candidates.map(function (entry) { return entry.rule; }), quoteContext);
    if (!selection.ok || selection.selectedRules.length !== 1) {
      return { ok: false, errors: [].concat(selection.errors || [], selection.selectedRules.length > 1 ? ['regla_tarifaria_no_unica'] : []), bindings: bindings, rules: selection.selectedRules || [] };
    }
    var selectedRule = selection.selectedRules[0];
    var selectedEntry = candidates.find(function (entry) { return ruleIdentifier(entry.rule) === ruleIdentifier(selectedRule); }) || candidates[0];
    return {
      ok: true,
      source: 'p06_binding',
      binding: selectedEntry.binding,
      bindings: bindings,
      rule: selectedRule,
      rules: [selectedRule],
      outputRoute: selection.outputRoute,
      errors: []
    };
  }
  function calculationContext(context, risk, payment) {
    context = context || {}; risk = risk || {}; payment = payment || {};
    return Object.assign({}, dimensions(context), clone(risk), {
      valorAsegurado: num(risk.valorAsegurado || risk.valor || risk.sumaAsegurada),
      edad: num(risk.edad || context.edad),
      genero: clean(risk.genero || context.genero),
      maternidad: risk.maternidad === true || context.maternidad === true,
      modalidad: clean(risk.modalidad || context.modalidad),
      coberturasSeleccionadas: [].concat(risk.coberturasSeleccionadas || context.coberturasSeleccionadas || []),
      cuotas: Math.max(1, num(payment.cuotas || payment.fracc || context.cuotas || 1)),
      formaPago: clean(payment.formaPago || context.formaPago)
    });
  }
  function resultFromP06(availability, calculation, payment) {
    var totals = calculation.totals || {};
    var installments = Math.max(1, num(payment && (payment.cuotas || payment.fracc) || 1));
    var rule = availability.rule || {}, binding = availability.binding || {};
    return {
      ok: true,
      config: { id: clean(binding.id), tipoCalculo: clean(rule.calculationType), estado: 'habilitado_por_binding' },
      sourceGroups: [],
      p06: true,
      result: {
        primaNeta: num(totals.netBeforeFees || totals.basePremium),
        gastosEmision: num(totals.fees),
        gastosFinan: num(totals.financing),
        otros: 0,
        ivaPct: num((rule.components || []).find(function (component) { return component && component.tipo === 'tax'; }) && (rule.components || []).find(function (component) { return component && component.tipo === 'tax'; }).rate) * 100,
        ivaMonto: num(totals.tax),
        primaTotal: num(totals.total),
        primaMensual: num(totals.total) / installments,
        cuotas: installments,
        tasaAplicada: null,
        rangoAplicado: null,
        calculationLines: clone(calculation.lines || []),
        outputRoute: clone(availability.outputRoute || {})
      },
      trace: {
        configuracionTarifaId: clean(binding.id),
        bindingId: clean(binding.id),
        reglaTarifariaId: ruleIdentifier(rule),
        fuenteDocumentoId: clean(rule.documentoFuenteId || rule.documentId),
        versionFuente: clean(rule.versionFuente || rule.sourceVersion),
        motor: 'P06C',
        calculadoAt: new Date().toISOString(),
        requiresSecondGateForEnablement: true
      }
    };
  }

  Q.automaticAvailability = function (aseguradoraId, context) {
    var advanced = p06Availability(aseguradoraId, context || {}, context && context.datosRiesgo || {});
    if (advanced.ok) return advanced;
    var legacy = originalAvailability(aseguradoraId, context || {});
    if (legacy && legacy.ok) return legacy;
    return Object.assign({}, legacy || {}, {
      ok: false,
      errors: Array.from(new Set([].concat(advanced.errors || [], legacy && legacy.errors || []))),
      p06: advanced
    });
  };

  Q.calculateAutomatic = function (aseguradoraId, context, risk, payment) {
    var advanced = p06Availability(aseguradoraId, context || {}, risk || {});
    if (advanced.ok) {
      var calculated = P06C.calculateRule(advanced.rule, calculationContext(context, risk, payment));
      if (!calculated.ok) return { ok: false, errors: [].concat(calculated.blockers || []), warnings: [].concat(calculated.warnings || []), p06: advanced, calculation: calculated };
      return resultFromP06(advanced, calculated, payment || {});
    }
    return originalCalculate(aseguradoraId, context, risk, payment);
  };

  Q.p06RuntimeAvailability = p06Availability;
  Q.__p06RuntimeAdapterV1208 = {
    originalAvailability: originalAvailability,
    originalCalculate: originalCalculate,
    bindingEnabled: bindingEnabled,
    ruleValidated: ruleValidated,
    dimensionMatch: dimensionMatch
  };
})();
