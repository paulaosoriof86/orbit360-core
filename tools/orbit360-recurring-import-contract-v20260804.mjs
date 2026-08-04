#!/usr/bin/env node
'use strict';

import crypto from 'node:crypto';

export const VERSION = 'orbit360-recurring-import-contract-v1';
export const SOURCE_TYPES = Object.freeze([
  'receipt_schedule',
  'reported_payments',
  'insurer_payment_report',
  'portfolio_statement',
  'commission_statement',
  'bank_statement',
  'supporting_document'
]);
const text = value => String(value == null ? '' : value).trim();
const norm = value => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
const sha = value => crypto.createHash('sha256').update(String(value ?? ''), 'utf8').digest('hex');
const stable = value => {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(stable);
  if (typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
};
const digest = value => sha(JSON.stringify(stable(value)));
const amount = value => {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value * 100) / 100;
  const parsed = Number(text(value).replace(/[^0-9,.-]/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
};
const normalizeKey = value => norm(value).replace(/ /g, '_');

export function normalizeMapping(mapping = {}) {
  return Object.fromEntries(Object.entries(mapping).map(([source, target]) => [normalizeKey(source), text(target)]).filter(([source, target]) => source && target));
}
export function normalizeRow(input, batch, rowNumber) {
  const mapped = {};
  const mapping = normalizeMapping(batch.mapping || {});
  Object.entries(input || {}).forEach(([key, value]) => { mapped[mapping[normalizeKey(key)] || key] = value; });
  const row = {
    id: `row_${sha(`${batch.id}|${rowNumber}|${digest(input)}`).slice(0, 24)}`,
    rowNumber,
    sourceType: batch.sourceType,
    policyId: text(mapped.policyId || mapped.polizaId),
    policyNumber: text(mapped.policyNumber || mapped.numeroPoliza || mapped.poliza),
    receiptId: text(mapped.receiptId || mapped.reciboId),
    country: text(mapped.country || mapped.pais || batch.country).toUpperCase(),
    currency: text(mapped.currency || mapped.moneda || batch.currency).toUpperCase(),
    period: text(mapped.period || mapped.periodo || batch.period),
    amount: amount(mapped.amount || mapped.monto || mapped.primaTotal || mapped.primaNeta),
    commission: amount(mapped.commission || mapped.comision || mapped.comisionAS || mapped.comisionNeta),
    status: text(mapped.status || mapped.estado),
    sourceReference: text(mapped.sourceReference || mapped.requerimiento || mapped.factura || mapped.numeroReciboFuente),
    rawDigest: digest(input)
  };
  const missing = [];
  if (!row.policyId && !row.policyNumber) missing.push('policy_identity_missing');
  if (!row.country) missing.push('country_missing');
  if (!row.currency) missing.push('currency_missing');
  if (!row.period) missing.push('period_missing');
  const contradictions = [];
  if (row.amount < 0 || row.commission < 0 || /revers|anulad|cancelad|rechaz|duplicad|conflict/.test(norm(row.status))) contradictions.push('negative_or_reversal');
  if (row.sourceType === 'commission_statement' && row.commission === 0) contradictions.push('commission_zero');
  if (row.sourceType === 'bank_statement' && !row.policyId && !row.receiptId && !row.sourceReference) contradictions.push('bank_without_counterpart');
  row.quality = {
    score: Math.max(0, 100 - missing.length * 15 - contradictions.length * 25),
    missing,
    contradictions,
    decision: missing.length || contradictions.length ? 'REQUIRES_VALIDATION' : 'READY'
  };
  return row;
}
export function preview(rows) {
  const seen = new Set();
  const duplicates = new Set();
  rows.forEach(row => { if (seen.has(row.rawDigest)) duplicates.add(row.rawDigest); seen.add(row.rawDigest); });
  const counts = { total: rows.length, ready: 0, requiresValidation: 0, omitted: 0 };
  const output = rows.map(row => {
    if (duplicates.has(row.rawDigest)) {
      counts.omitted += 1;
      return { ...row, quality: { ...row.quality, decision: 'OMIT_DUPLICATE', contradictions: [...new Set([...(row.quality.contradictions || []), 'duplicate_in_batch'])] } };
    }
    if (row.quality.decision === 'READY') counts.ready += 1;
    else counts.requiresValidation += 1;
    return row;
  });
  return { rows: output, counts, duplicateDigestCount: duplicates.size };
}
export function batchId({ tenantId, sourceType, sourceFileHash, period = '' }) {
  return `batch_${sha(`${tenantId}|${sourceType}|${sourceFileHash}|${period}`).slice(0, 26)}`;
}
export const RULES = Object.freeze({
  requiresHumanConfirmation: true,
  bankCreatesCobrosDirectly: false,
  bankCreatesFinancialMovementsDirectly: false,
  commissionCreatesCobrosDirectly: false,
  confirmedBatchCreatesEvidenceOnly: true,
  reconciliationAppliesReceiptsSeparately: true,
  rollbackBlockedAfterConsumption: true
});
