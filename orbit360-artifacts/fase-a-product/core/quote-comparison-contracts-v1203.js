/* ============================================================
   Orbit 360 · Cotizador/Comparativo contratos v1.203
   ------------------------------------------------------------
   - CotizacionNormalizada y ComparativoNormalizado.
   - Tarifa automática solo con configuración validado_habilitado.
   - PDF/manual requieren fuente y confirmación humana.
   - Persistencia exclusiva mediante Orbit.store.
   - Recomendación explicable solo con propuestas validadas.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.quoteContracts = (function () {
  const QUOTE_ORIGINS = new Set(['automatica_tarifa','pdf_aseguradora','manual_asistida']);
  const VALID_STATES = new Set(['validado','validado_habilitado']);
  const COMMERCIAL_STATES = new Set(['borrador','generado','preparado','enviado_confirmado','ganado','perdido','vencido']);
  const TARIFF_STATES = new Set(['validado_habilitado']);
  const REQUIRED_DIMENSIONS = ['pais','moneda','ramo','producto'];
  const OPTIONAL_DIMENSIONS = ['familiaProducto','subtipoProducto','segmento','tipoRiesgo','tipoVehiculo','usoVehiculo','plan'];

  function S() { return Orbit.store; }
  function A() { return Orbit.access || {}; }
  function clean(v) { return String(v == null ? '' : v).trim(); }
  function fold(v) { return clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
  function slug(v) { return fold(v).replace(/\s+/g, '_'); }
  function clone(v) { try { return JSON.parse(JSON.stringify(v)); } catch (e) { return Object.assign({}, v || {}); } }
  function now() { return new Date().toISOString(); }
  function today() { return Orbit.ui && Orbit.ui.today ? Orbit.ui.today() : now().slice(0,10); }
  function tenantId() { return A().tenantId ? A().tenantId() : ''; }
  function actor() { return A().actorUser ? A().actorUser() : { id:'', nombre:'Usuario', rolActivo: A().activeRole ? A().activeRole() : 'Sin rol' }; }
  function safeAll(collection) { try { return S().all(collection) || []; } catch (e) { return []; } }
  function id(prefix) { return (prefix || 'id') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,7); }
  function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
  function currencyFor(country) {
    if (A().currencyFor) return A().currencyFor(country);
    if (country === 'GT') return 'GTQ';
    if (country === 'CO') return 'COP';
    return '';
  }
  function sourceApi() { return Orbit.modules && Orbit.modules.aseguradoras && Orbit.modules.aseguradoras._fuentes; }
  function dimValue(input, key) {
    input = input || {};
    if (key === 'producto') return clean(input.producto || input.subramo || input.subtipoProducto);
    return clean(input[key]);
  }
  function dimensions(input) {
    const country = clean(input && input.pais).toUpperCase();
    const out = { pais: country, moneda: clean(input && input.moneda || currencyFor(country)).toUpperCase() };
    REQUIRED_DIMENSIONS.concat(OPTIONAL_DIMENSIONS).forEach(key => { if (!(key in out)) out[key] = dimValue(input, key); });
    return out;
  }
  function exactOrWildcard(source, requested, required) {
    const s = fold(source), r = fold(requested);
    if (!r) return !required;
    if (!s) return !required;
    return s === r;
  }
  function dimensionsMatch(source, requested) {
    const s = dimensions(source), r = dimensions(requested);
    return REQUIRED_DIMENSIONS.every(k => exactOrWildcard(s[k], r[k], true)) &&
      OPTIONAL_DIMENSIONS.every(k => exactOrWildcard(s[k], r[k], false));
  }
  function activeDateRange(item, date) {
    const d = clean(date || today());
    if (item && item.vigenciaDesde && d < item.vigenciaDesde) return false;
    if (item && item.vigenciaHasta && d > item.vigenciaHasta) return false;
    return true;
  }
  function insurer(idValue) { return clean(idValue) ? S().get('aseguradoras', clean(idValue)) : null; }
  function sourceGroups(aseguradora) {
    const api = sourceApi();
    if (!aseguradora || !api || typeof api.resumenGrupos !== 'function') return [];
    try { return (api.resumenGrupos(aseguradora.docs || [], aseguradora).grupos || []); } catch (e) { return []; }
  }
  function matchingValidatedGroups(aseguradora, context) {
    return sourceGroups(aseguradora).filter(group => {
      if (!dimensionsMatch(group.dimensiones || {}, context || {})) return false;
      const enabled = (group.fuentes || []).filter(src => src.estado === 'validado_habilitado' && activeDateRange(src));
      if (!enabled.length) return false;
      const evals = enabled.map(src => {
        const api = sourceApi();
        return api && api.evaluarFuente ? api.evaluarFuente(src) : {};
      });
      return evals.some(e => e.sirveParaTarifas || e.sirveParaReglas) && evals.some(e => e.sirveParaPresentacion || e.sirveParaCasosPrueba);
    });
  }
  function tariffCandidates(aseguradora, context) {
    const external = safeAll('configuracionesTarifa').filter(x => x && x.aseguradoraId === aseguradora.id);
    const embedded = [].concat(aseguradora.tarifasConfiguradas || []);
    const legacy = aseguradora.cotTasasMeta && aseguradora.cotTasas ? Object.keys(aseguradora.cotTasas).map(product => ({
      id: 'legacy_' + aseguradora.id + '_' + slug(product),
      aseguradoraId: aseguradora.id,
      pais: aseguradora.cotTasasMeta.pais || aseguradora.pais,
      moneda: aseguradora.cotTasasMeta.moneda || currencyFor(aseguradora.pais),
      ramo: aseguradora.cotTasasMeta.ramo || 'Auto',
      producto,
      estado: aseguradora.cotTasasMeta.estado,
      fuenteDocumentoId: aseguradora.cotTasasMeta.fuenteDocumentoId || aseguradora.cotTasasMeta.documentRef,
      version: aseguradora.cotTasasMeta.version,
      tipoCalculo: 'tabla_rangos', rangos: clone(aseguradora.cotTasas[product])
    })) : [];
    return external.concat(embedded, legacy).filter(cfg => cfg && dimensionsMatch(cfg, context) && TARIFF_STATES.has(cfg.estado) && activeDateRange(cfg));
  }
  function validateTariffConfig(cfg) {
    const errors = [];
    if (!cfg) return { ok:false, errors:['configuracion_tarifa_no_encontrada'] };
    if (!TARIFF_STATES.has(cfg.estado)) errors.push('configuracion_tarifa_no_habilitada');
    REQUIRED_DIMENSIONS.forEach(k => { if (!dimValue(cfg, k)) errors.push('dimension_tarifa_requerida_' + k); });
    if (!clean(cfg.fuenteDocumentoId || cfg.archivoFuenteId || cfg.documentRef || cfg.sourceRef)) errors.push('fuente_tarifa_requerida');
    if (!clean(cfg.version)) errors.push('version_tarifa_requerida');
    const type = clean(cfg.tipoCalculo || cfg.tipo_calculo || (cfg.reglas && cfg.reglas.tipoCalculo));
    if (!['porcentaje_valor','prima_fija','tabla_rangos','lookup'].includes(type)) errors.push('tipo_calculo_no_soportado');
    if (type === 'tabla_rangos' && !Array.isArray(cfg.rangos || (cfg.reglas && cfg.reglas.rangos))) errors.push('rangos_tarifa_requeridos');
    if (type === 'lookup' && !(cfg.lookup || (cfg.reglas && cfg.reglas.lookup))) errors.push('lookup_tarifa_requerido');
    return { ok:!errors.length, errors, type };
  }
  function automaticAvailability(aseguradoraId, context) {
    const asg = insurer(aseguradoraId), errors = [];
    if (!asg) return { ok:false, errors:['aseguradora_no_encontrada'], groups:[], configs:[] };
    if (asg.vinculada === false) errors.push('aseguradora_no_vinculada');
    if (asg.pais && context && context.pais && asg.pais !== context.pais) errors.push('pais_no_coincide_aseguradora');
    const missing = REQUIRED_DIMENSIONS.filter(k => !dimValue(dimensions(context || {}), k));
    missing.forEach(k => errors.push('contexto_requerido_' + k));
    const groups = matchingValidatedGroups(asg, context || {});
    if (!groups.length) errors.push('fuentes_validadas_insuficientes');
    const configs = tariffCandidates(asg, context || {}).filter(cfg => validateTariffConfig(cfg).ok);
    if (!configs.length) errors.push('configuracion_tarifa_validada_no_disponible');
    return { ok:!errors.length, errors, insurer:asg, groups, configs };
  }
  function lookupValue(table, risk) {
    if (!table || typeof table !== 'object') return 0;
    const keys = [].concat(risk.lookupKeys || [], risk.edad, risk.plan, risk.tipoVehiculo, risk.usoVehiculo).map(clean).filter(Boolean);
    let current = table;
    for (const key of keys) {
      if (current && typeof current === 'object' && Object.prototype.hasOwnProperty.call(current, key)) current = current[key];
    }
    return num(current);
  }
  function calculateAutomatic(aseguradoraId, context, risk, payment) {
    context = dimensions(context || {}); risk = risk || {}; payment = payment || {};
    const availability = automaticAvailability(aseguradoraId, context);
    if (!availability.ok) return Object.assign({ ok:false }, availability);
    const cfg = availability.configs[0];
    const checked = validateTariffConfig(cfg);
    if (!checked.ok) return { ok:false, errors:checked.errors };
    const rules = Object.assign({}, cfg.reglas || {}, cfg);
    const type = checked.type;
    const value = num(risk.valorAsegurado || risk.valor || risk.sumaAsegurada);
    let net = 0, appliedRate = null, appliedRange = null;
    if (type === 'prima_fija') net = num(rules.primaFija || rules.prima_fija || rules.primaMinima || rules.prima_min);
    else if (type === 'porcentaje_valor') {
      appliedRate = num(rules.tasa || rules.base);
      net = value * appliedRate / 100;
      if (num(rules.primaMinima || rules.prima_min)) net = Math.max(net, num(rules.primaMinima || rules.prima_min));
      if (num(rules.primaMaxima || rules.prima_max)) net = Math.min(net, num(rules.primaMaxima || rules.prima_max));
    } else if (type === 'tabla_rangos') {
      const ranges = [].concat(rules.rangos || []).slice().sort((a,b) => num(a.hasta) - num(b.hasta));
      appliedRange = ranges.find(r => value <= num(r.hasta)) || ranges[ranges.length - 1];
      if (!appliedRange) return { ok:false, errors:['rango_tarifa_no_encontrado'] };
      appliedRate = num(appliedRange.tasa || appliedRange.rate);
      net = value * appliedRate / 100;
      if (num(appliedRange.primaMinima || appliedRange.prima_min || appliedRange.min)) net = Math.max(net, num(appliedRange.primaMinima || appliedRange.prima_min || appliedRange.min));
      if (num(appliedRange.primaMaxima || appliedRange.prima_max || appliedRange.max)) net = Math.min(net, num(appliedRange.primaMaxima || appliedRange.prima_max || appliedRange.max));
    } else if (type === 'lookup') net = lookupValue(rules.lookup, risk);
    if (!(net > 0)) return { ok:false, errors:['prima_neta_no_calculable'] };
    const installments = Math.max(1, num(payment.cuotas || payment.fracc || 1));
    const surcharges = rules.recargosPago || rules.recargos_pago || rules.recargos || {};
    const surchargePct = num(surcharges[installments] != null ? surcharges[installments] : surcharges[String(installments)]);
    const finance = net * surchargePct / 100;
    const issueExpense = rules.gastosEmisionPct != null ? net * num(rules.gastosEmisionPct) / 100 : num(rules.gastosEmision || rules.gastos_emision);
    const other = num(rules.otros || rules.asistencia || rules.asistenciaFija);
    const baseTax = net + finance + issueExpense + other;
    const countryTax = Orbit.primas && Orbit.primas.cfgPais ? num(Orbit.primas.cfgPais(context.pais).iva) : (context.pais === 'CO' ? 19 : 12);
    const taxPct = rules.ivaPct != null ? num(rules.ivaPct) : (rules.iva != null && num(rules.iva) <= 1 ? num(rules.iva) * 100 : (rules.iva != null ? num(rules.iva) : countryTax));
    const tax = baseTax * taxPct / 100;
    const total = baseTax + tax;
    return {
      ok:true, config:cfg, sourceGroups:availability.groups,
      result:{ primaNeta:net, gastosEmision:issueExpense, gastosFinan:finance, otros:other, ivaPct:taxPct, ivaMonto:tax, primaTotal:total, primaMensual:total/installments, cuotas:installments, tasaAplicada:appliedRate, rangoAplicado:appliedRange },
      trace:{ configuracionTarifaId:cfg.id, fuenteDocumentoId:cfg.fuenteDocumentoId || cfg.archivoFuenteId || cfg.documentRef || cfg.sourceRef, versionFuente:cfg.version, calculadoAt:now() }
    };
  }
  function normalizeCoverage(values) {
    if (Array.isArray(values)) return values.map(x => typeof x === 'string' ? { codigo:slug(x), nombre:x, incluido:true } : clone(x));
    if (values && typeof values === 'object') return Object.keys(values).map(k => ({ codigo:k, nombre:k, valor:values[k], incluido:!!values[k] }));
    return [];
  }
  function sourceEvidence(input) {
    return clean(input.fuenteDocumentoId || input.documentRef || input.sourceRef || input.configuracionTarifaId);
  }
  function normalizeQuote(input, options) {
    input = input || {}; options = options || {};
    const asg = insurer(input.aseguradoraId);
    const dims = dimensions(input);
    const origin = QUOTE_ORIGINS.has(input.cotizacionOrigen) ? input.cotizacionOrigen : 'manual_asistida';
    const premium = input.resultado || input.prima || input;
    const expenses = {
      emision:num(premium.gastosEmision || (premium.gastos && premium.gastos.emision)),
      financiamiento:num(premium.gastosFinan || premium.recargo || (premium.gastos && premium.gastos.financiamiento)),
      otros:num(premium.otros || (premium.gastos && premium.gastos.otros))
    };
    const taxes = { ivaPct:num(premium.ivaPct || (premium.impuestos && premium.impuestos.ivaPct)), ivaMonto:num(premium.ivaMonto || premium.iva || (premium.impuestos && premium.impuestos.ivaMonto)), otros:num(premium.otrosImpuestos || (premium.impuestos && premium.impuestos.otros)) };
    const net = num(premium.primaNeta || premium.neta);
    const total = num(premium.primaTotal || premium.total) || net + expenses.emision + expenses.financiamiento + expenses.otros + taxes.ivaMonto + taxes.otros;
    const installments = Math.max(1, num(input.cuotas || input.fracc || premium.cuotas || 1));
    const evidence = sourceEvidence(input);
    const autoValidated = origin === 'automatica_tarifa' && !!clean(input.configuracionTarifaId) && !!clean(input.versionFuente) && !!evidence;
    const humanValidated = origin !== 'automatica_tarifa' && input.confirmacionHumana === true && !!evidence;
    const validation = clean(input.estadoValidacion) || ((autoValidated || humanValidated) ? 'validado' : 'requiere_validacion');
    const warnings = [].concat(input.alertasCalidad || []);
    if (!evidence) warnings.push('fuente_documental_requerida');
    if (origin !== 'automatica_tarifa' && !input.confirmacionHumana) warnings.push('confirmacion_humana_requerida');
    if (!clean(input.aseguradoraId)) warnings.push('aseguradora_requerida');
    if (!net || !total) warnings.push('prima_requerida');
    return {
      id:clean(input.id) || id('cot'), tenantId:clean(input.tenantId || tenantId()),
      cotizacionOrigen:origin, aseguradoraId:clean(input.aseguradoraId), aseguradoraNombreSnapshot:clean(input.aseguradoraNombreSnapshot || (asg && asg.nombre)),
      pais:dims.pais, moneda:dims.moneda, producto:dims.producto, ramo:dims.ramo, plan:dims.plan,
      familiaProducto:dims.familiaProducto, subtipoProducto:dims.subtipoProducto, segmento:dims.segmento, tipoRiesgo:dims.tipoRiesgo, tipoVehiculo:dims.tipoVehiculo, usoVehiculo:dims.usoVehiculo,
      clienteId:clean(input.clienteId), prospectoId:clean(input.prospectoId), prospectoNombre:clean(input.prospectoNombre || input.cliente), asesorId:clean(input.asesorId),
      datosRiesgo:clone(input.datosRiesgo || {}), primaNeta:net, gastos:expenses, impuestos:taxes, primaTotal:total, primaMensual:num(input.primaMensual) || total/installments,
      formasPago:clone(input.formasPago || []), cuotas:installments,
      coberturas:normalizeCoverage(input.coberturas || input.cob), deducibles:clone(input.deducibles || (input.deducible ? [{ codigo:'principal', nombre:'Deducible', valor:input.deducible }] : [])),
      condiciones:clone(input.condiciones || []), exclusiones:clone(input.exclusiones || []), restricciones:clone(input.restricciones || []), beneficios:clone(input.beneficios || []),
      fuenteDocumentoId:clean(input.fuenteDocumentoId || input.documentRef), sourceRef:clean(input.sourceRef), configuracionTarifaId:clean(input.configuracionTarifaId), versionFuente:clean(input.versionFuente),
      confianzaExtraccion:input.confianzaExtraccion == null ? null : num(input.confianzaExtraccion), camposCorregidos:clone(input.camposCorregidos || []),
      estadoValidacion:validation, estadoComercial:COMMERCIAL_STATES.has(input.estadoComercial) ? input.estadoComercial : 'borrador',
      alertasCalidad:Array.from(new Set(warnings)), confirmacionHumana:!!input.confirmacionHumana,
      trazabilidad:Object.assign({ creadoAt:clean(input.creadoAt) || now(), actualizadoAt:now(), actor:actor(), origenModulo:clean(input.origenModulo || 'Cotizador') }, clone(input.trazabilidad || {}))
    };
  }
  function validateQuote(quote, options) {
    quote = quote || {}; options = options || {};
    const errors = [], warnings = [].concat(quote.alertasCalidad || []);
    if (!clean(quote.tenantId)) errors.push('tenant_requerido');
    if (!insurer(quote.aseguradoraId)) errors.push('aseguradora_requerida');
    REQUIRED_DIMENSIONS.forEach(k => { if (!dimValue(quote, k)) errors.push('dimension_requerida_' + k); });
    if (currencyFor(quote.pais) && quote.moneda !== currencyFor(quote.pais) && quote.moneda !== 'USD') errors.push('moneda_no_coincide_pais');
    if (!quote.clienteId && !quote.prospectoId && !quote.prospectoNombre) errors.push('cliente_o_prospecto_requerido');
    if (!(num(quote.primaNeta) > 0) || !(num(quote.primaTotal) > 0)) errors.push('prima_requerida');
    if (!sourceEvidence(quote)) errors.push('fuente_documental_requerida');
    if (quote.cotizacionOrigen === 'automatica_tarifa') {
      if (!quote.configuracionTarifaId || !quote.versionFuente) errors.push('configuracion_tarifa_trazable_requerida');
    } else if (!quote.confirmacionHumana) errors.push('confirmacion_humana_requerida');
    if (options.requireValidated && !VALID_STATES.has(quote.estadoValidacion)) errors.push('cotizacion_no_validada');
    return { ok:!errors.length, errors:Array.from(new Set(errors)), warnings:Array.from(new Set(warnings)) };
  }
  function persistQuote(input, options) {
    options = options || {};
    const quote = normalizeQuote(input, options), check = validateQuote(quote, { requireValidated:false });
    if (!check.ok && options.allowDraft !== true) return { ok:false, errors:check.errors, warnings:check.warnings, quote };
    const before = S().get('cotizaciones', quote.id);
    if (before) S().update('cotizaciones', quote.id, quote); else S().insert('cotizaciones', quote);
    if (A().audit) A().audit(before ? 'actualizar_cotizacion' : 'crear_cotizacion', 'cotizaciones', quote.id, before, quote, options.motivo || 'Cotización normalizada', { estadoValidacion:quote.estadoValidacion, sourceRef:sourceEvidence(quote) });
    return { ok:true, quote:S().get('cotizaciones', quote.id) || quote, warnings:check.warnings, draft:!check.ok };
  }
  function quoteById(value) { return typeof value === 'string' ? S().get('cotizaciones', value) : value; }
  function comparisonConsistency(quotes) {
    const errors = [];
    if (quotes.length < 2) errors.push('comparativo_requiere_dos_cotizaciones');
    ['pais','moneda','ramo','producto','clienteId','prospectoId'].forEach(key => {
      const vals = Array.from(new Set(quotes.map(q => clean(q && q[key])).filter(Boolean)));
      if (vals.length > 1) errors.push('comparativo_inconsistente_' + key);
    });
    return errors;
  }
  function coverageScore(quote) {
    const included = (quote.coberturas || []).filter(c => c && c.incluido !== false).length;
    const valued = (quote.coberturas || []).reduce((s,c) => s + (num(c.valor) > 0 ? 1 : 0), 0);
    return included + valued * 0.5 + (num(quote.datosRiesgo && quote.datosRiesgo.sumaAsegurada) > 0 ? 0.5 : 0);
  }
  function deductibleNumber(quote) {
    const values = (quote.deducibles || []).map(d => num(String(d.valor || '').replace(/[^0-9.]/g,''))).filter(x => x > 0);
    return values.length ? Math.min(...values) : Number.POSITIVE_INFINITY;
  }
  function liabilityNumber(quote) {
    const found = (quote.coberturas || []).find(c => /responsabilidad|\brc\b/i.test(clean(c.nombre || c.codigo)));
    return found ? num(found.valor) : 0;
  }
  function recommendation(quotes, criterion, manualId) {
    const valid = quotes.filter(q => validateQuote(q, { requireValidated:true }).ok);
    if (!valid.length) return { ok:false, errors:['sin_cotizaciones_validadas'], eligible:0 };
    if (criterion === 'manual') {
      const selected = valid.find(q => q.id === manualId);
      if (!selected) return { ok:false, errors:['seleccion_manual_no_valida'], eligible:valid.length };
      return { ok:true, quoteId:selected.id, criterio:'manual', score:null, explicacion:'Selección manual confirmada por el usuario autorizado; debe registrarse la justificación.', factores:[{ factor:'seleccion_manual', valor:selected.aseguradoraNombreSnapshot }] };
    }
    const totals = valid.map(q => q.primaTotal), minTotal = Math.min(...totals), maxTotal = Math.max(...totals);
    const covs = valid.map(coverageScore), maxCov = Math.max(1, ...covs);
    const deds = valid.map(deductibleNumber), finiteDeds = deds.filter(Number.isFinite), minDed = finiteDeds.length ? Math.min(...finiteDeds) : null;
    const rcs = valid.map(liabilityNumber), maxRc = Math.max(1, ...rcs);
    const ranked = valid.map((q,index) => {
      const price = maxTotal === minTotal ? 1 : 1 - ((q.primaTotal - minTotal) / (maxTotal - minTotal));
      const coverage = coverageScore(q) / maxCov;
      const ded = minDed == null ? 0 : (deductibleNumber(q) === minDed ? 1 : 0);
      const rc = liabilityNumber(q) / maxRc;
      let score = price * 0.45 + coverage * 0.35 + ded * 0.10 + rc * 0.10;
      if (criterion === 'precio') score = price;
      else if (criterion === 'cobertura') score = coverage;
      else if (criterion === 'deducible') score = ded;
      else if (criterion === 'rc') score = rc;
      return { quote:q, score, factors:{ price, coverage, deductible:ded, liability:rc } };
    }).sort((a,b) => b.score - a.score);
    const top = ranked[0];
    return {
      ok:true, quoteId:top.quote.id, criterio:criterion || 'equilibrio', score:top.score,
      explicacion:'Sugerencia calculada entre propuestas validadas según ' + (criterion || 'equilibrio precio, cobertura, deducible y responsabilidad civil') + '. No sustituye el análisis profesional ni las condiciones emitidas.',
      factores:Object.keys(top.factors).map(k => ({ factor:k, valor:top.factors[k] })),
      ranking:ranked.map(x => ({ quoteId:x.quote.id, score:x.score, factores:x.factors })), eligible:valid.length
    };
  }
  function createComparison(input, options) {
    input = input || {}; options = options || {};
    const quotes = [].concat(input.cotizaciones || input.cotizacionIds || []).map(quoteById).filter(Boolean).map(q => normalizeQuote(q));
    const errors = comparisonConsistency(quotes);
    const rec = recommendation(quotes, input.criterioRecomendacion || 'equilibrio', input.seleccionManualId);
    if (errors.length && options.allowDraft !== true) return { ok:false, errors, quotes };
    const first = quotes[0] || {}, comparison = {
      id:clean(input.id) || id('cmp'), tenantId:clean(input.tenantId || tenantId()),
      pais:first.pais || clean(input.pais), moneda:first.moneda || clean(input.moneda), producto:first.producto || clean(input.producto), ramo:first.ramo || clean(input.ramo),
      clienteId:first.clienteId || clean(input.clienteId), prospectoId:first.prospectoId || clean(input.prospectoId), prospectoNombre:first.prospectoNombre || clean(input.prospectoNombre), asesorId:first.asesorId || clean(input.asesorId),
      cotizacionIds:quotes.map(q => q.id), schemaComparativoId:clean(input.schemaComparativoId || ('schema_' + slug((first.pais || input.pais) + '_' + (first.producto || input.producto || first.ramo || input.ramo)) + '_v1')),
      criterioRecomendacion:input.criterioRecomendacion || 'equilibrio', recomendacion:rec.ok ? rec.quoteId : '', explicacion:rec.ok ? rec.explicacion : '', seleccionManual:input.criterioRecomendacion === 'manual', versionReglas:'v1.203',
      estado:COMMERCIAL_STATES.has(input.estado) ? input.estado : 'borrador', fechaGeneracion:clean(input.fechaGeneracion || now()), fechaEnvio:clean(input.fechaEnvio), archivoPdfRef:clean(input.archivoPdfRef), plantillaWhatsAppId:clean(input.plantillaWhatsAppId),
      alertasCalidad:Array.from(new Set([].concat(input.alertasCalidad || [], errors, rec.ok ? [] : rec.errors || []))),
      trazabilidad:Object.assign({ creadoAt:clean(input.creadoAt) || now(), actualizadoAt:now(), actor:actor(), origenModulo:'Comparativo' }, clone(input.trazabilidad || {}))
    };
    const before = S().get('comparativos', comparison.id);
    if (options.persist !== false) {
      if (before) S().update('comparativos', comparison.id, comparison); else S().insert('comparativos', comparison);
      if (A().audit) A().audit(before ? 'actualizar_comparativo' : 'crear_comparativo', 'comparativos', comparison.id, before, comparison, options.motivo || 'Comparativo normalizado', { quoteCount:quotes.length, validCount:rec.eligible || 0 });
    }
    return { ok:!errors.length, comparison:S().get('comparativos', comparison.id) || comparison, quotes, recommendation:rec, errors };
  }
  function prepareCommunication(comparisonId, channel) {
    const cmp = S().get('comparativos', comparisonId);
    if (!cmp) return { ok:false, errors:['comparativo_no_encontrado'] };
    const quotes = (cmp.cotizacionIds || []).map(quoteById).filter(Boolean);
    const rec = recommendation(quotes, cmp.criterioRecomendacion, cmp.recomendacion);
    const lines = quotes.map(q => '• ' + q.aseguradoraNombreSnapshot + ': ' + q.moneda + ' ' + Math.round(q.primaTotal).toLocaleString('es-GT')).join('\n');
    const selected = rec.ok && quotes.find(q => q.id === rec.quoteId);
    const message = 'Comparativo de ' + (cmp.producto || cmp.ramo || 'seguros') + ' con ' + quotes.length + ' opciones:\n\n' + lines + (selected ? '\n\nSugerencia consultiva: ' + selected.aseguradoraNombreSnapshot + '. ' + rec.explicacion : '\n\nLas propuestas requieren revisión antes de elegir.');
    S().update('comparativos', cmp.id, { estado:'preparado', canalPreparado:channel || 'auto', preparadoAt:now(), actualizadoAt:now() });
    if (A().audit) A().audit('preparar_comparativo_cliente', 'comparativos', cmp.id, cmp, S().get('comparativos', cmp.id), 'Comunicación preparada; entrega no confirmada', { channel:channel || 'auto' });
    return { ok:true, comparison:S().get('comparativos', cmp.id), message, recommendation:rec };
  }
  function quoteForLegacy(quote) {
    quote = normalizeQuote(quote);
    const deductible = (quote.deducibles || [])[0];
    const cob = {};
    (quote.coberturas || []).forEach(c => { cob[c.codigo || slug(c.nombre)] = c.valor != null ? c.valor : c.incluido; });
    return {
      id:quote.id, quoteId:quote.id, aseguradoraId:quote.aseguradoraId, nombre:quote.aseguradoraNombreSnapshot, aseguradora:quote.aseguradoraNombreSnapshot,
      total:quote.primaTotal, neta:quote.primaNeta, gastosEm:(quote.gastos || {}).emision || 0, recargo:(quote.gastos || {}).financiamiento || 0, otros:(quote.gastos || {}).otros || 0,
      iva:(quote.impuestos || {}).ivaMonto || 0, ivaPct:(quote.impuestos || {}).ivaPct || 0, cur:quote.moneda, moneda:quote.moneda, pais:quote.pais, ramo:quote.ramo, producto:quote.producto, plan:quote.plan,
      clienteId:quote.clienteId, cliente:quote.prospectoNombre, asesorId:quote.asesorId, fracc:quote.cuotas, cuotas:quote.cuotas,
      sumaAsegurada:num(quote.datosRiesgo && quote.datosRiesgo.sumaAsegurada), deducible:deductible && deductible.valor || '', cob,
      sourceRef:quote.sourceRef, documentRef:quote.fuenteDocumentoId, configuracionTarifaId:quote.configuracionTarifaId, versionFuente:quote.versionFuente,
      estadoValidacion:quote.estadoValidacion, confirmacionHumana:quote.confirmacionHumana, cotizacionOrigen:quote.cotizacionOrigen, datosRiesgo:clone(quote.datosRiesgo), _canonical:quote
    };
  }

  return {
    QUOTE_ORIGINS, VALID_STATES, REQUIRED_DIMENSIONS, OPTIONAL_DIMENSIONS,
    dimensions, dimensionsMatch, sourceGroups, matchingValidatedGroups, tariffCandidates,
    validateTariffConfig, automaticAvailability, calculateAutomatic,
    normalizeQuote, validateQuote, persistQuote, recommendation, createComparison,
    prepareCommunication, quoteById, quoteForLegacy
  };
})();
