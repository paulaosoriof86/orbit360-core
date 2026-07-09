/* ============================================================
   Orbit 360 · P0 reglas de importacion de polizas
   Fecha: 2026-07-09

   Modulo puro/aditivo para normalizar polizas importadas sin tocar
   backend protegido ni escribir datos reales. Se integra despues con
   core/importa.js cuando pase smoke.
   ============================================================ */
(function () {
  window.Orbit = window.Orbit || {};

  const PAIS_MONEDA = { GT: 'GTQ', CO: 'COP' };

  function norm(value) {
    return String(value == null ? '' : value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function parseNum(value) {
    if (value == null || value === '') return 0;
    let s = String(value).replace(/[^0-9,.\-]/g, '');
    s = s.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  }

  function dateYMD(value) {
    if (!value) return '';
    const raw = String(value).trim();
    let m = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (m) return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
    m = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (m) return `${m[3]}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
    return raw.slice(0, 10);
  }

  function todayYMD() {
    return (window.Orbit && Orbit.ui && Orbit.ui.today) ? Orbit.ui.today() : new Date().toISOString().slice(0, 10);
  }

  function isActiveTerm(policy, today) {
    const now = today || todayYMD();
    const start = dateYMD(policy.vigenciaIni || policy.vigenciaInicio || policy.desde);
    const end = dateYMD(policy.vigenciaFin || policy.vigenciaFinal || policy.hasta || policy.vencimiento);
    if (start && now < start) return false;
    if (end && now > end) return false;
    return !!(start || end);
  }

  function resolveCountry(rawCountry, insurer) {
    const n = norm(rawCountry || (insurer && insurer.pais) || '');
    if (n === 'gt' || n === 'gtm' || n.includes('guatemala')) return { country: 'GT', source: rawCountry ? 'row' : 'insurer', requiresValidation: false };
    if (n === 'co' || n === 'col' || n.includes('colombia')) return { country: 'CO', source: rawCountry ? 'row' : 'insurer', requiresValidation: false };
    return { country: '', source: '', requiresValidation: true };
  }

  function resolveCurrency(rawCurrency, country, insurer) {
    const n = norm(rawCurrency || (insurer && insurer.moneda) || '');
    if (n === 'gtq' || n.includes('quetzal')) return { currency: 'GTQ', source: rawCurrency ? 'row' : 'insurer', requiresValidation: false };
    if (n === 'cop' || n.includes('peso')) return { currency: 'COP', source: rawCurrency ? 'row' : 'insurer', requiresValidation: false };
    if (n === 'usd' || n.includes('dolar')) return { currency: 'USD', source: rawCurrency ? 'row' : 'insurer', requiresValidation: false };
    if (country && PAIS_MONEDA[country]) return { currency: PAIS_MONEDA[country], source: 'country', requiresValidation: false };
    return { currency: '', source: '', requiresValidation: true };
  }

  function splitPremium(input) {
    const primaNeta = parseNum(input.primaNeta || input.neta || input.prima_base);
    const gastos = parseNum(input.gastos || input.gastosEmision || input.derechos);
    const iva = parseNum(input.iva || input.impuesto || input.impuestos);
    const primaTotalRaw = parseNum(input.primaTotal || input.total || input.primaBruta || input.prima);
    let net = primaNeta;
    let total = primaTotalRaw;
    let ambiguous = false;

    if (!net && total && (gastos || iva)) net = Math.max(0, total - gastos - iva);
    if (!total && net) total = net + gastos + iva;
    if (!net && total && !gastos && !iva) ambiguous = true;

    return { primaNeta: net, gastos, iva, primaTotal: total || net, ambiguous };
  }

  function operationalStatus(input, today) {
    const source = norm(input.estadoFuenteOriginal || input.estadoPol || input.estado || input.status || '');
    const active = isActiveTerm(input, today);

    if (/cancel|anulad|rescind/.test(source)) {
      return { estadoOperativoOrbit: 'cancelada_terminal', estadoCartera: 'no_exigible', label: 'Cancelada', requiresValidation: false };
    }
    if (/no renov/.test(source)) {
      return { estadoOperativoOrbit: 'no_renovada_historica', estadoCartera: 'no_exigible', label: 'No renovada', requiresValidation: false };
    }
    if (/renov/.test(source) && active) {
      return { estadoOperativoOrbit: 'vigente_renovada', estadoCartera: 'genera_recibos_esperados', label: 'Renovada vigente', requiresValidation: false };
    }
    if (/vig/.test(source) && active) {
      return { estadoOperativoOrbit: 'vigente_operativa', estadoCartera: 'genera_recibos_esperados', label: 'Vigente', requiresValidation: false };
    }
    if (/venc|termin/.test(source)) {
      return { estadoOperativoOrbit: 'historica_vencida', estadoCartera: 'recibo_analitico_no_cartera_viva', label: 'Histórica vencida', requiresValidation: false };
    }
    if (active) {
      return { estadoOperativoOrbit: 'vigente_por_vigencia_requiere_validacion', estadoCartera: 'requiere_validacion', label: 'Requiere validación', requiresValidation: true };
    }
    return { estadoOperativoOrbit: 'requiere_validacion_estado', estadoCartera: 'requiere_validacion', label: 'Requiere validación', requiresValidation: true };
  }

  function partyKey(input) {
    return input.clienteId || input.aseguradoId || input.contratanteId || input.tomadorId ||
      input.identificacion || input.documento || input.clienteNombre || input.aseguradoNombre ||
      input.contratanteNombre || input.tomadorNombre || input.nombre || '';
  }

  function policyDedupKey(input) {
    const insurer = input.aseguradoraId || input.aseguradoraNombre || input.aseguradora || '';
    const number = input.numero || input.poliza || input.numeroPoliza || '';
    const party = partyKey(input);
    const start = dateYMD(input.vigenciaIni || input.vigenciaInicio || input.desde);
    const end = dateYMD(input.vigenciaFin || input.vigenciaFinal || input.hasta || input.vencimiento);
    if (!insurer || !number || !party || !start || !end) return '';
    return [norm(insurer), norm(number), norm(party), start, end].join('|');
  }

  function normalizePolicy(input, ctx) {
    const insurer = (ctx && ctx.insurer) || input.aseguradoraObj || null;
    const countryInfo = resolveCountry(input.pais || input.country, insurer);
    const currencyInfo = resolveCurrency(input.moneda || input.divisa || input.currency, countryInfo.country, insurer);
    const premium = splitPremium(input);
    const status = operationalStatus(input, ctx && ctx.today);
    const dedupKey = policyDedupKey(input);
    const formaPago = input.formaPago || input.frecuencia || input.periodicidad || input.conducto || '';

    const missing = [];
    if (!dedupKey) missing.push('llave_poliza');
    if (!countryInfo.country) missing.push('pais');
    if (!currencyInfo.currency) missing.push('moneda');
    if (premium.ambiguous || !premium.primaNeta) missing.push('prima_neta');
    if (!formaPago) missing.push('forma_pago');
    if (status.requiresValidation) missing.push('estado');

    return Object.assign({}, input, {
      _dedupKey: dedupKey,
      estadoFuenteOriginal: input.estadoFuenteOriginal || input.estadoPol || input.estado || input.status || '',
      estadoOperativoOrbit: status.estadoOperativoOrbit,
      estadoCartera: status.estadoCartera,
      estadoConciliacion: input.estadoConciliacion || 'pendiente',
      estado: status.label,
      pais: countryInfo.country,
      moneda: currencyInfo.currency,
      monedaFuente: currencyInfo.source,
      primaNeta: premium.primaNeta,
      gastos: premium.gastos,
      iva: premium.iva,
      primaTotal: premium.primaTotal,
      formaPago,
      requiereValidacion: missing.length > 0,
      motivosValidacion: missing,
      importadorP0: true
    });
  }

  function shouldGenerateExpectedReceipts(policy) {
    return !policy.requiereValidacion &&
      (policy.estadoOperativoOrbit === 'vigente_operativa' || policy.estadoOperativoOrbit === 'vigente_renovada') &&
      !!policy.primaNeta && !!policy.moneda && !!policy.formaPago;
  }

  function expectedReceiptSeed(policy, receipt, index) {
    return {
      id: receipt && receipt.id ? receipt.id : `rec_esp_${policy.id || policy._dedupKey}_${index}`,
      polizaId: policy.id || '',
      clienteId: policy.clienteId || '',
      asesorId: policy.asesorId || '',
      cuota: receipt && receipt.n != null ? receipt.n : index + 1,
      monto: receipt && receipt.total != null ? receipt.total : 0,
      moneda: policy.moneda,
      neta: receipt && receipt.neta != null ? receipt.neta : 0,
      gastosEmision: receipt && receipt.gastosEmision != null ? receipt.gastosEmision : 0,
      gastosFinan: receipt && receipt.gastosFinan != null ? receipt.gastosFinan : 0,
      otros: receipt && receipt.otros != null ? receipt.otros : 0,
      iva: receipt && receipt.iva != null ? receipt.iva : 0,
      vence: receipt && receipt.vence ? receipt.vence : '',
      fechaLimite: receipt && receipt.fechaLimite ? receipt.fechaLimite : '',
      fechaPago: null,
      estado: 'esperado',
      estadoCartera: 'recibo_esperado',
      estadoConciliacion: 'pendiente',
      confirmadoPago: false,
      carteraOperativa: false,
      conciliado: false,
      origen: 'poliza_importada',
      importado: true
    };
  }

  window.Orbit.importaPolizasP0 = {
    norm,
    parseNum,
    dateYMD,
    isActiveTerm,
    resolveCountry,
    resolveCurrency,
    splitPremium,
    operationalStatus,
    policyDedupKey,
    normalizePolicy,
    shouldGenerateExpectedReceipts,
    expectedReceiptSeed
  };
})();
