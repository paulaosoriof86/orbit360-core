#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { inferReconciliation, VERSION as INFERENCE_VERSION } from './orbit360-cobros-inferencia-secuencial-v20260804.mjs';

const VERSION = 'orbit360-cobros-replay-inferencial-completo-v1';
const sha = value => crypto.createHash('sha256').update(String(value ?? ''), 'utf8').digest('hex');
const text = value => String(value == null ? '' : value).trim();
const stable = value => {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(stable);
  if (typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
};
const digest = value => sha(JSON.stringify(stable(value)));

function usage() {
  console.error('Uso: node tools/orbit360-cobros-replay-inferencial-completo-v20260804.mjs <normalized.json> --private <ledger.json> --sanitized <evidence.json>');
}
function parseArgs(argv) {
  const args = argv.slice(2);
  if (!args[0]) return null;
  const out = { input: path.resolve(args[0]), private: '', sanitized: '' };
  for (let index = 1; index < args.length; index += 1) {
    if (args[index] === '--private') out.private = path.resolve(args[++index]);
    else if (args[index] === '--sanitized') out.sanitized = path.resolve(args[++index]);
  }
  return out;
}
function readNormalized(file) {
  const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
  const source = payload.collections || payload;
  const required = ['receipts', 'reportedPayments', 'insurerPayments', 'commissionRows', 'portfolioRows'];
  required.forEach(key => {
    if (!Array.isArray(source[key])) throw new Error(`NORMALIZED_COLLECTION_REQUIRED:${key}`);
  });
  return source;
}
function sourceSummary(source) {
  return {
    receipts: source.receipts.length,
    reportedPayments: source.reportedPayments.length,
    insurerPayments: source.insurerPayments.length,
    commissionRows: source.commissionRows.length,
    portfolioRows: source.portfolioRows.length
  };
}
function evidenceTypes(row) {
  return Array.from(new Set((row.evidence || []).map(item => text(item.type)).filter(Boolean)));
}
function sanitize(row) {
  return {
    receiptIdSha256: sha(row.receiptId),
    policyKeySha256: sha(row.policyKey),
    installment: row.installment || 0,
    outcome: row.outcome,
    confidence: row.confidence,
    evidenceTypes: evidenceTypes(row),
    evidenceCount: Array.isArray(row.evidence) ? row.evidence.length : 0
  };
}
function buildMaterializationPlan(result) {
  return result.rows.map(row => {
    const reconciled = /^CONCILIADO_/.test(row.outcome);
    const hold = row.outcome === 'HOLD_REQUIERE_VALIDACION';
    return {
      receiptId: row.receiptId,
      policyKey: row.policyKey,
      installment: row.installment,
      outcome: row.outcome,
      confidence: row.confidence,
      evidence: row.evidence || [],
      targetCollection: hold ? 'conciliacionHolds' : reconciled ? 'propuestasConciliacion' : row.outcome === 'PAGO_REPORTADO_VALIDO_PENDIENTE_CRUCE' ? 'pagosReportados' : 'propuestasConciliacion',
      autoApply: false,
      humanConfirmationRequired: reconciled,
      operationalWrites: 0
    };
  });
}
function validateLedger(result, source) {
  if (result.rows.length !== source.receipts.length) throw new Error(`LEDGER_RECEIPT_COVERAGE_MISMATCH:${result.rows.length}:${source.receipts.length}`);
  const ids = result.rows.map(row => text(row.receiptId)).filter(Boolean);
  if (new Set(ids).size !== ids.length) throw new Error('LEDGER_DUPLICATE_RECEIPT_ID');
  if (Object.values(result.counts).reduce((sum, value) => sum + value, 0) !== result.rows.length) throw new Error('LEDGER_COUNT_SUM_MISMATCH');
  result.rows.forEach(row => {
    if (/^CONCILIADO_/.test(row.outcome) && (!Array.isArray(row.evidence) || !row.evidence.length)) throw new Error(`RECONCILIATION_WITHOUT_EVIDENCE:${row.receiptId}`);
    if (row.confidence === 'INFERRED_HIGH' && !evidenceTypes(row).some(type => /SEQUENCE/.test(type))) throw new Error(`INFERENCE_WITHOUT_SEQUENCE_EVIDENCE:${row.receiptId}`);
  });
}

const args = parseArgs(process.argv);
if (!args || !args.private || !args.sanitized) {
  usage();
  process.exit(2);
}

try {
  const source = readNormalized(args.input);
  const result = inferReconciliation(source);
  validateLedger(result, source);
  const materialization = buildMaterializationPlan(result);
  const generatedAt = new Date().toISOString();
  const privateLedger = {
    schemaVersion: VERSION,
    inferenceVersion: INFERENCE_VERSION,
    generatedAt,
    sourceSummary: sourceSummary(source),
    sourceDigest: digest(source),
    outcomeCounts: result.counts,
    ledgerDigest: digest(result.rows),
    materializationDigest: digest(materialization),
    rows: result.rows,
    materialization,
    writes: 0,
    operationalWrites: 0,
    containsOperationalIds: true,
    privateEvidenceOnly: true
  };
  const sanitizedRows = result.rows.map(sanitize);
  const sanitized = {
    schemaVersion: VERSION + '-sanitized',
    inferenceVersion: INFERENCE_VERSION,
    generatedAt,
    classification: 'GO_FULL_INFERENTIAL_LEDGER_READ_ONLY',
    sourceSummary: privateLedger.sourceSummary,
    sourceDigest: privateLedger.sourceDigest,
    outcomeCounts: result.counts,
    ledgerCount: sanitizedRows.length,
    ledgerDigest: digest(sanitizedRows),
    rows: sanitizedRows,
    runtimeCollectionsRequired: ['pagosReportados', 'evidenciasCobro', 'propuestasConciliacion', 'conciliacionHolds', 'cobros'],
    firestoreReads: 0,
    firestoreWrites: 0,
    authReads: 0,
    authWrites: 0,
    operationalWrites: 0,
    deployExecuted: false,
    productionTouched: false,
    containsPII: false,
    containsSecrets: false,
    ok: true
  };
  fs.mkdirSync(path.dirname(args.private), { recursive: true });
  fs.mkdirSync(path.dirname(args.sanitized), { recursive: true });
  fs.writeFileSync(args.private, JSON.stringify(privateLedger, null, 2) + '\n', 'utf8');
  fs.writeFileSync(args.sanitized, JSON.stringify(sanitized, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({ ok: true, sourceSummary: sanitized.sourceSummary, outcomeCounts: sanitized.outcomeCounts, ledgerCount: sanitized.ledgerCount }, null, 2));
} catch (error) {
  console.error(String(error && (error.stack || error.message || error)));
  process.exit(42);
}
