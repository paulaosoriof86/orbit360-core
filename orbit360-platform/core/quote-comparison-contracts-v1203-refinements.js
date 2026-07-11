/* ============================================================
   Orbit 360 · Refinamientos contratos Cotizador/Comparativo v1.203
   - valida que prima total cuadre con neta+gastos+impuestos;
   - exige versión de fuente para propuestas validadas;
   - impide comparar/recomendar propuestas inconsistentes.
   ============================================================ */
window.Orbit = window.Orbit || {};
(function () {
  const Q = Orbit.quoteContracts;
  if (!Q || Q.__refinementsV1203) return;

  function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
  function clean(v) { return String(v == null ? '' : v).trim(); }
  function unique(values) { return Array.from(new Set(values || [])); }
  function quoteById(value) { return typeof value === 'string' ? Orbit.store.get('cotizaciones', value) : value; }
  function breakdown(quote) {
    quote = quote || {};
    const g = quote.gastos || {}, t = quote.impuestos || {};
    const expected = num(quote.primaNeta) + num(g.emision) + num(g.financiamiento) + num(g.otros) + num(t.ivaMonto) + num(t.otros);
    const total = num(quote.primaTotal);
    const tolerance = Math.max(1, Math.abs(total) * 0.005);
    const errors = [];
    if (total > 0 && Math.abs(total - expected) > tolerance) errors.push('desglose_prima_no_cuadra');
    if (num(quote.cuotas) > 0 && num(quote.primaMensual) > 0 && Math.abs(num(quote.primaMensual) * num(quote.cuotas) - total) > Math.max(1, total * 0.01)) errors.push('cuotas_no_cuadran_con_total');
    return { ok: !errors.length, errors, expected, total };
  }

  const originalValidate = Q.validateQuote.bind(Q);
  Q.validateQuote = function (quote, options) {
    const base = originalValidate(quote, options);
    const errors = [].concat(base.errors || []);
    const b = breakdown(quote);
    errors.push(...b.errors);
    if ((options && options.requireValidated) && !clean(quote && quote.versionFuente)) errors.push('version_fuente_requerida');
    return { ok: !unique(errors).length, errors: unique(errors), warnings: unique(base.warnings || []), breakdown: b };
  };

  const originalPersist = Q.persistQuote.bind(Q);
  Q.persistQuote = function (input, options) {
    options = options || {};
    const normalized = Q.normalizeQuote(input, options);
    const check = Q.validateQuote(normalized, { requireValidated: normalized.estadoValidacion === 'validado' || normalized.estadoValidacion === 'validado_habilitado' });
    if (!check.ok && options.allowDraft !== true) return { ok:false, errors:check.errors, warnings:check.warnings, quote:normalized };
    return originalPersist(input, options);
  };

  const originalRecommendation = Q.recommendation.bind(Q);
  Q.recommendation = function (quotes, criterion, manualId) {
    const valid = [].concat(quotes || []).filter(q => Q.validateQuote(q, { requireValidated:true }).ok);
    return originalRecommendation(valid, criterion, manualId);
  };

  const originalCreateComparison = Q.createComparison.bind(Q);
  Q.createComparison = function (input, options) {
    input = input || {}; options = options || {};
    const quotes = [].concat(input.cotizaciones || input.cotizacionIds || []).map(quoteById).filter(Boolean);
    const invalid = quotes.filter(q => !Q.validateQuote(q, { requireValidated:true }).ok);
    if (invalid.length && options.allowDraft !== true) {
      return { ok:false, errors:['comparativo_contiene_cotizaciones_no_validadas'], invalidQuoteIds:invalid.map(q => q.id), quotes };
    }
    return originalCreateComparison(input, options);
  };

  Q.breakdown = breakdown;
  Q.__refinementsV1203 = { originalValidate, originalPersist, originalRecommendation, originalCreateComparison };
})();
