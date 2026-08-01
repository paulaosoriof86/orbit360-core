/* ============================================================
   Orbit 360 · Adaptador puro de fuentes Planillas/Comisiones P0
   - Sin acceso a Orbit.store, Firestore, navegador o datos reales.
   - Detecta aliases, normaliza filas y genera dry-run inmutable.
   - País, moneda y periodo deben ser explícitos/confiables.
   ============================================================ */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.Orbit = root.Orbit || {};
    root.Orbit.planillasComisionesSourceAdapter = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const ALIASES = Object.freeze({
    type: ['tipo', 'tipo movimiento', 'movimiento'],
    product: ['prod', 'producto', 'ramo producto'],
    policyNumber: ['poliza', 'póliza', 'numero poliza', 'número póliza'],
    incomeRelation: ['rel ing', 'relacion ingreso', 'relación ingreso'],
    paymentDate: ['fecha pago', 'fecha de pago', 'fecha cobranza'],
    currency: ['moneda', 'mon'],
    requirement: ['requerimiento', 'req'],
    series: ['serie', 'no serie', 'número serie'],
    invoice: ['factura', 'no factura', 'número factura'],
    dueDate: ['fecha venc', 'fecha vencimiento', 'fec venc'],
    obligation: ['obligacion', 'obligación'],
    paymentNumber: ['no pago', 'numero pago', 'número pago'],
    insured: ['asegurado', 'cliente', 'contratante'],
    branch: ['ramo'],
    invoiceValue: ['valor factura', 'importe total', 'prima total'],
    netPremium: ['prima neta', 'importe neto'],
    intermediaryCommission: ['comision ays', 'comisión ays', 'comision venta', 'comisión venta', 'comision intermediario'],
    seller: ['vendedor', 'asesor', 'agente'],
    sellerCommission: ['comision vendedor', 'comisión vendedor'],
    extraReference: ['solo referencia gtosmed', 'referencia gtos med', 'referencia adicional']
  });

  function norm(value) {
    return String(value == null ? '' : value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function parseNumber(value) {
    if (value == null || String(value).trim() === '') return { value: null, valid: false, empty: true };
    if (typeof value === 'number' && Number.isFinite(value)) return { value, valid: true, empty: false };
    let text = String(value).trim().replace(/[^0-9,.-]/g, '');
    if (!text) return { value: null, valid: false, empty: true };
    const lastComma = text.lastIndexOf(',');
    const lastDot = text.lastIndexOf('.');
    if (lastComma > lastDot) text = text.replace(/\./g, '').replace(',', '.');
    else text = text.replace(/,/g, '');
    const parsed = Number(text);
    return Number.isFinite(parsed)
      ? { value: parsed, valid: true, empty: false }
      : { value: null, valid: false, empty: false };
  }

  function normalizeDate(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
    const text = String(value == null ? '' : value).trim();
    if (!text) return '';
    let match = text.match(/^(20\d{2})[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])$/);
    if (match) return `${match[1]}-${String(match[2]).padStart(2, '0')}-${String(match[3]).padStart(2, '0')}`;
    match = text.match(/^(0?[1-9]|[12]\d|3[01])[-/](0?[1-9]|1[0-2])[-/](20\d{2})$/);
    if (match) return `${match[3]}-${String(match[2]).padStart(2, '0')}-${String(match[1]).padStart(2, '0')}`;
    return '';
  }

  function periodFromDate(date) {
    return /^20\d{2}-\d{2}-\d{2}$/.test(date || '') ? date.slice(0, 7) : '';
  }

  function normalizeCountry(value) {
    const text = norm(value);
    if (text === 'gt' || text === 'gtm' || text.includes('guatemala')) return 'GT';
    if (text === 'co' || text === 'col' || text.includes('colombia')) return 'CO';
    return '';
  }

  function normalizeCurrency(value) {
    const text = norm(value);
    if (text === 'q' || text === 'gtq' || text.includes('quetzal')) return 'GTQ';
    if (text === 'cop' || text.includes('peso colombiano')) return 'COP';
    if (text === 'usd' || text.includes('dolar') || text.includes('dollar')) return 'USD';
    return '';
  }

  function buildHeaderMap(headers) {
    const normalized = (headers || []).map(norm);
    const map = {};
    Object.entries(ALIASES).forEach(([field, aliases]) => {
      const accepted = aliases.map(norm);
      const index = normalized.findIndex(header => accepted.includes(header));
      if (index >= 0) map[field] = index;
    });
    return Object.freeze(map);
  }

  function read(row, map, field) {
    const index = map[field];
    return Number.isInteger(index) ? row[index] : '';
  }

  function normalizeRow(headers, row, context) {
    const ctx = context || {};
    const map = buildHeaderMap(headers);
    const paymentDate = normalizeDate(read(row, map, 'paymentDate'));
    const sourcePeriod = String(ctx.sourcePeriod || periodFromDate(paymentDate) || '').trim();
    const expectedPeriod = String(ctx.expectedPeriod || '').trim();
    const country = normalizeCountry(ctx.country || read(row, map, 'country'));
    const currency = normalizeCurrency(read(row, map, 'currency') || ctx.currency);
    const invoiceValue = parseNumber(read(row, map, 'invoiceValue'));
    const netPremium = parseNumber(read(row, map, 'netPremium'));
    const intermediaryCommission = parseNumber(read(row, map, 'intermediaryCommission'));
    const sellerCommission = parseNumber(read(row, map, 'sellerCommission'));

    const record = {
      type: String(read(row, map, 'type') || '').trim(),
      product: String(read(row, map, 'product') || '').trim(),
      policyNumber: String(read(row, map, 'policyNumber') || '').trim(),
      incomeRelation: String(read(row, map, 'incomeRelation') || '').trim(),
      paymentDate,
      country,
      currency,
      period: sourcePeriod,
      requirement: String(read(row, map, 'requirement') || '').trim(),
      series: String(read(row, map, 'series') || '').trim(),
      invoice: String(read(row, map, 'invoice') || '').trim(),
      dueDate: normalizeDate(read(row, map, 'dueDate')),
      obligation: String(read(row, map, 'obligation') || '').trim(),
      paymentNumber: String(read(row, map, 'paymentNumber') || '').trim(),
      insured: String(read(row, map, 'insured') || '').trim(),
      branch: String(read(row, map, 'branch') || '').trim(),
      invoiceValue: invoiceValue.value,
      netPremium: netPremium.value,
      intermediaryCommission: intermediaryCommission.value,
      seller: String(read(row, map, 'seller') || '').trim(),
      sellerCommission: sellerCommission.value,
      extraReference: String(read(row, map, 'extraReference') || '').trim(),
      trace: {
        sourceFile: String(ctx.sourceFile || '').trim(),
        sourceSheet: String(ctx.sourceSheet || '').trim(),
        sourceRow: Number(ctx.sourceRow || 0) || null,
        sourcePeriod,
        country,
        currency
      }
    };

    const reasons = [];
    if (!country) reasons.push('COUNTRY_MISSING');
    if (!currency) reasons.push('CURRENCY_MISSING');
    if (!sourcePeriod) reasons.push('PERIOD_MISSING');
    if (!paymentDate) reasons.push('PAYMENT_DATE_INVALID');
    if (!record.policyNumber) reasons.push('POLICY_KEY_MISSING');
    if (!netPremium.valid) reasons.push('NET_PREMIUM_MISSING_OR_INVALID');
    if (!intermediaryCommission.valid) reasons.push('INTERMEDIARY_COMMISSION_MISSING_OR_INVALID');

    let decision = 'CANDIDATE';
    if (expectedPeriod && sourcePeriod && expectedPeriod !== sourcePeriod) {
      decision = 'HOLD_PERIOD_MISMATCH';
      reasons.push('SOURCE_PERIOD_DOES_NOT_MATCH_EXPECTED_PERIOD');
    } else if (reasons.length) decision = 'REQUIERE_VALIDACION';

    return Object.freeze({
      decision,
      reasons: Object.freeze(reasons),
      record: Object.freeze(record),
      writes: 0,
      commissionRateInferred: false
    });
  }

  function identity(record) {
    return [record.country, record.currency, record.policyNumber, record.paymentDate, record.series, record.invoice, record.netPremium, record.intermediaryCommission].join('|');
  }

  function dryRun(input) {
    const headers = input && input.headers || [];
    const rows = input && input.rows || [];
    const baseContext = input && input.context || {};
    const seen = new Set();
    const proposals = rows.map((row, index) => {
      const proposal = normalizeRow(headers, row, Object.assign({}, baseContext, { sourceRow: index + 2 }));
      if (proposal.decision !== 'CANDIDATE') return proposal;
      const key = identity(proposal.record);
      if (seen.has(key)) return Object.freeze({ decision: 'OMIT_DUPLICATE', reasons: Object.freeze(['DUPLICATE_SOURCE_ROW']), record: proposal.record, writes: 0, commissionRateInferred: false });
      seen.add(key);
      return proposal;
    });
    const summary = { total: proposals.length, candidate: 0, requiresValidation: 0, periodMismatch: 0, duplicate: 0, writes: 0 };
    proposals.forEach(item => {
      if (item.decision === 'CANDIDATE') summary.candidate++;
      else if (item.decision === 'REQUIERE_VALIDACION') summary.requiresValidation++;
      else if (item.decision === 'HOLD_PERIOD_MISMATCH') summary.periodMismatch++;
      else if (item.decision === 'OMIT_DUPLICATE') summary.duplicate++;
    });
    return Object.freeze({
      schemaVersion: 'orbit360-planillas-comisiones-source-dryrun-v1',
      headerMap: buildHeaderMap(headers),
      proposals: Object.freeze(proposals),
      summary: Object.freeze(summary),
      writes: 0,
      storeAccess: false,
      firestoreAccess: false
    });
  }

  return Object.freeze({
    schemaVersion: 'orbit360-planillas-comisiones-source-adapter-v1',
    aliases: ALIASES,
    norm,
    parseNumber,
    normalizeDate,
    normalizeCountry,
    normalizeCurrency,
    buildHeaderMap,
    normalizeRow,
    dryRun
  });
});
