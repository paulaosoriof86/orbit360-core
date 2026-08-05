#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const text = value => String(value == null ? '' : value).trim();
const norm = value => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const bool = value => value === true || ['true', '1', 'si', 'sí'].includes(text(value).toLowerCase());
const sha = value => crypto.createHash('sha256').update(String(value ?? ''), 'utf8').digest('hex');
const stable = value => {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(stable);
  if (typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
};
const digest = value => sha(JSON.stringify(stable(value)));

function rows(value) {
  if (Array.isArray(value)) return value;
  for (const key of ['rows', 'payments', 'ledger', 'items']) if (Array.isArray(value?.[key])) return value[key];
  return [];
}

function pick(row, keys) {
  for (const key of keys) if (row?.[key] !== undefined && text(row[key])) return row[key];
  const entries = Object.entries(row || {});
  for (const wanted of keys.map(norm)) {
    const found = entries.find(([key, value]) => norm(key) === wanted && text(value));
    if (found) return found[1];
  }
  return '';
}

function paymentKey(row) {
  const direct = text(pick(row, ['paymentIdSha256', 'receiptIdSha256', 'receiptId_sha256']));
  if (/^[a-f0-9]{64}$/i.test(direct)) return direct.toLowerCase();
  const raw = text(pick(row, ['id', 'receiptId', 'paymentId']));
  return raw ? sha(raw) : '';
}

function main() {
  const [baseFile, overlayFile, outFile] = process.argv.slice(2);
  if (!baseFile || !overlayFile || !outFile) {
    console.error('Uso: node tools/orbit360-cobros-overlay-hold-finalizer-v20260805.mjs <base.json> <overlay.json> <out.json>');
    process.exit(2);
  }

  const base = JSON.parse(fs.readFileSync(baseFile, 'utf8'));
  const overlay = JSON.parse(fs.readFileSync(overlayFile, 'utf8'));
  const baseRows = rows(base);
  const overlayRows = rows(overlay);
  if (baseRows.length !== 365 || overlayRows.length !== 365) throw new Error('DATA_CONTRACT_FAILURE:FINALIZER_ROW_COUNT');

  const baseByKey = new Map(baseRows.map(row => [paymentKey(row), row]));
  let holdApplied = 0;
  let requiresValidationApplied = 0;

  const finalRows = overlayRows.map(row => {
    if (row.outcome !== 'UNRESOLVED_NEEDS_ADDITIONAL_EVIDENCE') return row;
    const source = baseByKey.get(paymentKey(row));
    if (!source) throw new Error('DATA_CONTRACT_FAILURE:FINALIZER_PAYMENT_NOT_IN_BASE');

    if (bool(pick(source, ['requiereValidacion', 'requiresValidation']))) {
      requiresValidationApplied += 1;
      return {
        ...row,
        outcome: 'REQUIRES_VALIDATION_CANONICAL_PAYMENT',
        confidence: 'REQUIRES_VALIDATION',
        evidence: [...(row.evidence || []), 'CANONICAL_PAYMENT_REQUIRES_VALIDATION']
      };
    }

    const authoritative = norm(pick(source, ['estadoOperativo', 'status'])) === 'pagoreportado'
      && norm(pick(source, ['exigibilidad'])) === 'nopendiente'
      && bool(pick(source, ['enCartera', 'inPortfolio'])) === false
      && text(pick(source, ['fuenteAutoridad', 'sourceAuthority'])).toUpperCase() === 'SIGA'
      && text(pick(source, ['matchQuality', 'calidadMatch'])).toUpperCase().includes('SIGA_ESTADO_PAGO_O_HOLD');

    if (!authoritative) throw new Error('DATA_CONTRACT_FAILURE:UNCLASSIFIED_PAYMENT_REMAINS');
    holdApplied += 1;
    return {
      ...row,
      outcome: 'HOLD_REPORTED_PAYMENT_NO_UNIQUE_RECEIPT_LINK',
      confidence: 'ALTA_FUENTE_NO_APLICACION_AUTOMATICA',
      evidence: [...(row.evidence || []), 'CANONICAL_SIGA_REPORTED_PAYMENT_NO_PORTFOLIO_LINK']
    };
  });

  const outcomeCounts = finalRows.reduce((acc, row) => {
    acc[row.outcome] = (acc[row.outcome] || 0) + 1;
    return acc;
  }, {});
  const unresolved = outcomeCounts.UNRESOLVED_NEEDS_ADDITIONAL_EVIDENCE || 0;
  if (unresolved !== 0) throw new Error(`DATA_CONTRACT_FAILURE:UNRESOLVED_REMAINS:${unresolved}`);

  const output = {
    ...overlay,
    schemaVersion: 'orbit360-cobros-overlay-readonly-v2-finalized',
    stage: 'PASS_COBROS_FULL_REPLAY',
    classification: 'GO_COBROS_LEDGER_COMPLETE_NO_WRITES',
    canonicalHoldApplied: holdApplied,
    requiresValidationApplied,
    explainedPayments: 365,
    unresolvedPayments: 0,
    outcomeCounts,
    rowLedgerCount: 365,
    rowLedgerDigest: digest(finalRows),
    rows: finalRows,
    firestoreWrites: 0,
    authWrites: 0,
    operationalWrites: 0,
    reimportExecuted: false,
    deployExecuted: false,
    productionTouched: false,
    containsPII: false,
    containsSecrets: false,
    containsPasswords: false,
    ok: true
  };

  fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(output, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({
    stage: output.stage,
    explainedPayments: output.explainedPayments,
    unresolvedPayments: output.unresolvedPayments,
    canonicalHoldApplied: holdApplied,
    requiresValidationApplied,
    outcomeCounts
  }, null, 2));
}

try { main(); }
catch (error) {
  console.error(String(error?.message || error));
  process.exit(41);
}
