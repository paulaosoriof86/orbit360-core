/* ============================================================
   Orbit 360 · Refinamientos contratos Cotizador/Comparativo v1.215
   - valida desglose real: neta + gastos + impuestos = total;
   - tolerancia de redondeo absoluta de 0.51;
   - persiste gastos planos/estructurados sin reconstruirlos desde total;
   - clasifica estimaciones internas como revisada_interna;
   - impide que estimaciones internas entren a ranking, comparativo
     elegible, comunicación o emisión;
   - exige versión de fuente para propuestas validadas;
   - impide comparar/recomendar propuestas inconsistentes.
   ============================================================ */
window.Orbit = window.Orbit || {};
(function () {
  const Q = Orbit.quoteContracts;
  if (!Q || Q.__refinementsV1215) return;

  const EPS = 0.51;
  function rawNumber(v) {
    if (v === '' || v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  function num(v) {
    const n = rawNumber(v);
    return n == null ? 0 : n;
  }
  function clean(v) { return String(v == null ? '' : v).trim(); }
  function unique(values) { return Array.from(new Set(values || [])); }
  function clone(v) { try { return JSON.parse(JSON.stringify(v)); } catch (e) { return Object.assign({}, v || {}); } }
  function quoteById(value) { return typeof value === 'string' ? Orbit.store.get('cotizaciones', value) : value; }
  function isInternalEstimate(value) {
    value = value || {};
    const origin = clean(value.cotizacionOrigen || value.origen || value.sourceType).toLowerCase();
    return origin === 'estimacion_interna' || value.esEstimacionInterna === true || value.internalEstimate === true;
  }
  function flatExpense(value) {
    if (!value) return null;
    if (typeof value.gastos === 'number' || typeof value.gastos === 'string') return rawNumber(value.gastos);
    if (typeof value.gastosEmision === 'number' || typeof value.gastosEmision === 'string') return rawNumber(value.gastosEmision);
    return null;
  }
  function normalizeInput(input) {
    const out = clone(input || {});
    const premium = clone(out.resultado || out.prima || {});
    const source = Object.keys(premium).length ? premium : out;
    const flat = flatExpense(source);
    if (flat != null) {
      premium.gastos = Object.assign({}, premium.gastos && typeof premium.gastos === 'object' ? premium.gastos : {}, {
        emision: flat
      });
      premium.gastosEmision = flat;
    }
    if (source.neta != null && premium.primaNeta == null) premium.primaNeta = source.neta;
    if (source.total != null && premium.primaTotal == null) premium.primaTotal = source.total;
    if (source.iva != null && premium.ivaMonto == null) premium.ivaMonto = source.iva;
    if (Object.keys(premium).length) out.resultado = premium;
    return out;
  }
  function breakdown(quote) {
    quote = quote || {};
    const g = quote.gastos || {}, t = quote.impuestos || {};
    const fields = {
      primaNeta: rawNumber(quote.primaNeta),
      gastoEmision: rawNumber(g.emision == null ? 0 : g.emision),
      gastoFinanciamiento: rawNumber(g.financiamiento == null ? 0 : g.financiamiento),
      gastoOtros: rawNumber(g.otros == null ? 0 : g.otros),
      iva: rawNumber(t.ivaMonto == null ? 0 : t.ivaMonto),
      impuestoOtros: rawNumber(t.otros == null ? 0 : t.otros),
      total: rawNumber(quote.primaTotal)
    };
    const errors = [];
    if (fields.primaNeta == null || fields.primaNeta <= 0) errors.push('prima_neta_invalida');
    ['gastoEmision','gastoFinanciamiento','gastoOtros'].forEach(key => {
      if (fields[key] == null || fields[key] < 0) errors.push('gasto_invalido_' + key);
    });
    ['iva','impuestoOtros'].forEach(key => {
      if (fields[key] == null || fields[key] < 0) errors.push('impuesto_invalido_' + key);
    });
    if (fields.total == null || fields.total <= 0) errors.push('prima_total_invalida');
    const expected = num(fields.primaNeta) + num(fields.gastoEmision) + num(fields.gastoFinanciamiento) +
      num(fields.gastoOtros) + num(fields.iva) + num(fields.impuestoOtros);
    if (fields.total != null && Math.abs(fields.total - expected) > EPS) errors.push('desglose_prima_no_cuadra');
    const cuotas = rawNumber(quote.cuotas);
    const mensual = rawNumber(quote.primaMensual);
    if (cuotas != null && cuotas > 0 && mensual != null && mensual > 0 &&
        fields.total != null && Math.abs(mensual * cuotas - fields.total) > EPS) {
      errors.push('cuotas_no_cuadran_con_total');
    }
    return { ok: !errors.length, errors: unique(errors), expected, total: fields.total, tolerance: EPS, fields };
  }

  const originalNormalize = Q.normalizeQuote.bind(Q);
  Q.normalizeQuote = function (input, options) {
    const internal = isInternalEstimate(input);
    const normalizedInput = normalizeInput(input);
    const quote = originalNormalize(normalizedInput, options);
    if (internal) {
      quote.cotizacionOrigen = 'estimacion_interna';
      quote.estadoValidacion = 'revisada_interna';
      quote.confirmacionHumana = false;
      quote.alertasCalidad = unique([].concat(quote.alertasCalidad || [], 'estimacion_interna_no_elegible'));
      quote.trazabilidad = Object.assign({}, quote.trazabilidad || {}, {
        clasificacion: 'estimacion_interna',
        elegibleComparativo: false,
        elegibleEmision: false
      });
    }
    return quote;
  };

  const originalValidate = Q.validateQuote.bind(Q);
  Q.validateQuote = function (quote, options) {
    quote = quote || {};
    options = options || {};
    const base = originalValidate(quote, options);
    const errors = [].concat(base.errors || []);
    const warnings = [].concat(base.warnings || []);
    const b = breakdown(quote);
    errors.push(...b.errors);
    if (isInternalEstimate(quote)) {
      warnings.push('estimacion_interna_solo_referencia');
      if (options.requireValidated) errors.push('estimacion_interna_no_elegible');
    }
    if (options.requireValidated && !clean(quote.versionFuente)) errors.push('version_fuente_requerida');
    return { ok: !unique(errors).length, errors: unique(errors), warnings: unique(warnings), breakdown: b };
  };

  Q.persistQuote = function (input, options) {
    options = options || {};
    const quote = Q.normalizeQuote(input, options);
    const internal = isInternalEstimate(quote);
    const requireValidated = quote.estadoValidacion === 'validado' || quote.estadoValidacion === 'validado_habilitado';
    const check = Q.validateQuote(quote, { requireValidated });
    if (!check.ok && options.allowDraft !== true && !internal) {
      return { ok:false, errors:check.errors, warnings:check.warnings, quote };
    }
    const before = Orbit.store.get('cotizaciones', quote.id);
    if (before) Orbit.store.update('cotizaciones', quote.id, quote);
    else Orbit.store.insert('cotizaciones', quote);
    if (Orbit.access && Orbit.access.audit) {
      Orbit.access.audit(
        before ? 'actualizar_cotizacion' : 'crear_cotizacion',
        'cotizaciones',
        quote.id,
        before,
        quote,
        options.motivo || (internal ? 'Registrar estimación interna no elegible' : 'Cotización normalizada'),
        {
          estadoValidacion: quote.estadoValidacion,
          cotizacionOrigen: quote.cotizacionOrigen,
          elegibleComparativo: !internal,
          elegibleEmision: !internal
        }
      );
    }
    return {
      ok:true,
      quote:Orbit.store.get('cotizaciones', quote.id) || quote,
      warnings:check.warnings,
      draft:!check.ok || internal,
      internalEstimate:internal
    };
  };

  const originalRecommendation = Q.recommendation.bind(Q);
  Q.recommendation = function (quotes, criterion, manualId) {
    const valid = [].concat(quotes || []).filter(q =>
      !isInternalEstimate(q) && Q.validateQuote(q, { requireValidated:true }).ok
    );
    return originalRecommendation(valid, criterion, manualId);
  };

  const originalCreateComparison = Q.createComparison.bind(Q);
  Q.createComparison = function (input, options) {
    input = input || {};
    options = options || {};
    const quotes = [].concat(input.cotizaciones || input.cotizacionIds || []).map(quoteById).filter(Boolean);
    const internal = quotes.filter(isInternalEstimate);
    const invalid = quotes.filter(q => !isInternalEstimate(q) && !Q.validateQuote(q, { requireValidated:true }).ok);
    if ((internal.length || invalid.length) && options.allowDraft !== true) {
      return {
        ok:false,
        errors:unique([
          ...(internal.length ? ['comparativo_contiene_estimaciones_internas'] : []),
          ...(invalid.length ? ['comparativo_contiene_cotizaciones_no_validadas'] : [])
        ]),
        internalEstimateIds:internal.map(q => q.id),
        invalidQuoteIds:invalid.map(q => q.id),
        quotes
      };
    }
    const eligible = quotes.filter(q => !isInternalEstimate(q));
    return originalCreateComparison(Object.assign({}, input, {
      cotizaciones: eligible,
      cotizacionIds: eligible.map(q => q.id)
    }), options);
  };

  Q.breakdown = breakdown;
  Q.isInternalEstimate = isInternalEstimate;
  Q.__refinementsV1215 = {
    version:'v1.215-local-empalme',
    tolerance:EPS,
    originalNormalize,
    originalValidate,
    originalRecommendation,
    originalCreateComparison
  };
})();
