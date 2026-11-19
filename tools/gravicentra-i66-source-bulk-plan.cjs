'use strict';
// I6.6: scalable preflight for the existing protected insurer-source write gate.
// This file does not write to Firestore. A protected writer must re-read exact
// preimages, compare fingerprints, and verify every postimage before PASS.
const crypto = require('node:crypto');

const MAX_CHUNK = 250;
const str = value => String(value == null ? '' : value).trim();
const norm = value => str(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const isDate = value => /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(str(value)) &&
  new Date(str(value) + 'T00:00:00Z').toISOString().slice(0, 10) === str(value);
const moneyCents = value => value == null || value === '' || !Number.isFinite(+value) ? null : Math.round((+value + Number.EPSILON) * 100);
const sourceAliases = ['numeroReciboFuente', 'numeroReciboAseguradora', 'numeroRequerimiento', 'requerimiento',
  'numeroBoleta', 'sourceNumber', 'referenciaCobro', 'receiptNumber'];
const internal = value => !str(value) || /^rec_[a-f\d]{16,64}$/i.test(str(value)) || /^\d{1,2}\s*\/\s*\d{1,2}$/.test(str(value));
const preimageFingerprint = (receiptId, portfolioId, requirement, receiptGrossCents, carteraGrossCents) =>
  digest({receiptId, portfolioId, requirement, receiptGrossCents, carteraGrossCents});
// The operational grace deadline is not the insurer's contractual due date.
const dueOf = row => str(row.fechaVencimientoContractual || row.vence || row.fechaVencimiento);
const paid = row => !!row && (row.pagado === true || row.conciliadoPago === true || row.conciliado === true ||
  !!str(row.fechaPago || row.fechaPagoReportada || row.paidDate) || /^(PAGADO|PAID|CONCILIADO)$/i.test(str(row.estado)) ||
  /^PAID_/i.test(str(row.paymentState)) || /^APPLIED_/i.test(str(row.applicationState)));

function normalizeSource(raw) {
  const row = {
    caseId: str(raw.caseId), insurer: norm(raw.insurer), policy: str(raw.policy),
    requirement: str(raw.requirement), due: str(raw.due),
    installment: Number.isSafeInteger(Number(raw.installment)) ? Number(raw.installment) : null,
    grossCents: raw.grossCents, state: str(raw.state), sourceSha256: str(raw.sourceSha256).toLowerCase()
  };
  if (!row.caseId || !row.insurer || !row.policy || !row.requirement ||
    !isDate(row.due) || !Number.isSafeInteger(row.grossCents) || row.grossCents <= 0 ||
    !/^[a-f\d]{64}$/.test(row.sourceSha256) ||
    !['PENDING', 'PAID'].includes(row.state) ||
    (row.installment != null && (row.installment < 1 || row.installment > 120))) {
    return {error: 'INVALID_SOURCE_ROW', caseId: row.caseId};
  }
  return row;
}

function planSourceBatch(rawRows, policyGroups, options = {}) {
  if (!Array.isArray(rawRows) || !Array.isArray(policyGroups) || !rawRows.length || rawRows.length > 5000) {
    throw new RangeError('SOURCE_BATCH_SIZE_OR_SHAPE');
  }
  const chunkSize = options.chunkSize == null ? MAX_CHUNK : options.chunkSize;
  if (!Number.isSafeInteger(chunkSize) || chunkSize < 1 || chunkSize > MAX_CHUNK) {
    throw new RangeError('SOURCE_BATCH_CHUNK_LIMIT');
  }
  const ready = [], unchanged = [], exceptions = [], seenKeys = new Set(), seenTargets = new Set();
  const groupsByNumber = new Map();
  for (const group of policyGroups) {
    const number = str(group?.policy?.numero);
    if (!number) continue;
    if (!groupsByNumber.has(number)) groupsByNumber.set(number, []);
    groupsByNumber.get(number).push(group);
  }
  for (const raw of rawRows) {
    const row = normalizeSource(raw);
    if (row.error) { exceptions.push({caseId: row.caseId, code: row.error}); continue; }
    const key = [row.insurer, row.policy, row.requirement].join('|');
    if (seenKeys.has(key)) { exceptions.push({caseId: row.caseId, code: 'DUPLICATED_SOURCE_REQUIREMENT'}); continue; }
    seenKeys.add(key);
    if (row.state === 'PAID') {
      exceptions.push({caseId: row.caseId, code: 'PAID_REQUIRES_COBRO_PROOF_AND_WRITER'});
      continue;
    }
    const policyCandidates = (groupsByNumber.get(row.policy) || []).filter(g => {
      const p = g.policy || {};
      return norm(g.insurerName || p.aseguradoraNombre).includes(row.insurer) &&
        norm(p.moneda) === 'GTQ' && norm(p.pais) === 'GT' &&
        isDate(p.vigenciaInicio) && isDate(p.vigenciaFin) &&
        p.vigenciaInicio <= row.due && p.vigenciaFin >= row.due &&
        !/ANULADA|CANCELADA|SUSPENDIDA|DELETED/.test(norm(p.estado)) &&
        g.clientExists === true && g.insurerVerified === true;
    });
    if (policyCandidates.length !== 1) {
      exceptions.push({caseId: row.caseId, code: policyCandidates.length ? 'POLICY_EDITION_AMBIGUOUS' : 'POLICY_EDITION_MISSING'});
      continue;
    }
    const group = policyCandidates[0], p = group.policy;
    const matches = (group.receipts || []).filter(r => {
      if (str(r.polizaId) !== str(p.id) || norm(r.moneda || p.moneda) !== 'GTQ') return false;
      const refs = sourceAliases.map(a => str(r[a])).filter(a => a && !internal(a));
      if (refs.some(ref => ref !== row.requirement)) return false;
      if (refs.includes(row.requirement)) return true;
      // A different requirement on the same policy is normal; select a unique
      // contractual due, or corroborate a unique installment sequence.
      return dueOf(r) === row.due || row.installment != null && Number(r.secuencia || r.numeroCuota) === row.installment;
    });
    if (matches.length !== 1) {
      exceptions.push({caseId: row.caseId, code: matches.length ? 'RECEIPT_AMBIGUOUS' : 'RECEIPT_NOT_IDENTIFIED'});
      continue;
    }
    const receipt = matches[0], rid = str(receipt.id);
    if (!rid || seenTargets.has(rid)) {
      exceptions.push({caseId: row.caseId, code: 'RECEIPT_ASSIGNED_TWICE'}); continue;
    }
    const portfolio = (group.portfolio || []).filter(c => str(c.reciboId) === rid && c.carteraActiva !== false);
    if (portfolio.length !== 1 || !str(portfolio[0].id) || paid(receipt) || paid(portfolio[0]) ||
      (group.cobros || []).some(c => str(c.reciboId) === rid)) {
      exceptions.push({caseId: row.caseId, code: 'PAYMENT_OR_PORTFOLIO_EXCEPTION'}); continue;
    }
    const cartera = portfolio[0];
    if (str(cartera.polizaId || cartera.policyId) !== str(p.id) ||
      norm(cartera.moneda || p.moneda) !== 'GTQ' ||
      (cartera.clienteId && str(cartera.clienteId) !== str(p.clienteId)) ||
      sourceAliases.some(a => str(receipt[a]) && !internal(receipt[a]) && str(receipt[a]) !== row.requirement)) {
      exceptions.push({caseId: row.caseId, code: 'RELATION_OR_REFERENCE_CONFLICT'}); continue;
    }
    const beforeReceipt = moneyCents(receipt.primaTotal), beforeCartera = moneyCents(cartera.primaTotal);
    if (beforeReceipt == null || beforeCartera == null || beforeReceipt !== beforeCartera ||
      ['monto', 'montoTotal', 'saldo', 'valor'].some(k => receipt[k] != null || cartera[k] != null)) {
      exceptions.push({caseId: row.caseId, code: 'GROSS_PREIMAGE_NOT_COMPARABLE'}); continue;
    }
    const existingRef = str(receipt.numeroReciboFuente);
    const record = {
      caseId: row.caseId, sourceKey: key, insurer: row.insurer, policy: row.policy, due: row.due,
      policyId: str(p.id), receiptId: rid, portfolioId: str(cartera.id),
      requirement: row.requirement, grossCents: row.grossCents,
      oldGrossCents: beforeReceipt, sourceSha256: row.sourceSha256,
      beforeFingerprint: preimageFingerprint(rid, cartera.id, existingRef, beforeReceipt, beforeCartera),
    };
    seenTargets.add(rid);
    if (existingRef === row.requirement && beforeReceipt === row.grossCents) unchanged.push(record);
    else ready.push(record);
  }
  const chunks = [];
  for (let i = 0; i < ready.length; i += chunkSize) {
    const rows = ready.slice(i, i + chunkSize);
    chunks.push({sequence: chunks.length + 1, count: rows.length,
      sourcePlanSha256: digest(rows.map(r => [r.caseId, r.sourceKey, r.receiptId, r.portfolioId,
        r.oldGrossCents, r.grossCents, r.beforeFingerprint])), rows});
  }
  return {status: 'BULK_SOURCE_PREFLIGHT_ONLY_NO_WRITES', inputRows: rawRows.length,
    readyCount: ready.length, unchangedCount: unchanged.length, exceptionCount: exceptions.length,
    chunks, unchanged, exceptions, writes: 0};
}

module.exports = {MAX_CHUNK, planSourceBatch, normalizeSource, moneyCents,
  preimageFingerprint, paid, internal, sourceAliases};
