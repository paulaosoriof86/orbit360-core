#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const sha = value => crypto.createHash('sha256').update(String(value ?? ''), 'utf8').digest('hex');
const text = value => String(value == null ? '' : value).trim();
const norm = value => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const num = value => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(text(value).replace(/[^0-9,.-]/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
};
const stable = value => {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(stable);
  if (typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
};
const digest = value => sha(JSON.stringify(stable(value)));

function readJson(file) {
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!parsed || typeof parsed !== 'object') throw new Error(`DATA_CONTRACT_FAILURE:INVALID_JSON:${path.basename(file)}`);
  return parsed;
}

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

function policyNumberKey(row) {
  const direct = text(pick(row, ['policyNumberSha256', 'policyNumberHash']));
  if (/^[a-f0-9]{64}$/i.test(direct)) return direct.toLowerCase();
  const raw = norm(pick(row, ['policyNumber', 'polizaNumero', 'poliza', 'póliza']));
  return raw ? sha(raw) : '';
}

function period(row) {
  const direct = text(pick(row, ['period', 'periodo'])).slice(0, 7);
  if (/^\d{4}-\d{2}$/.test(direct)) return direct;
  const date = text(pick(row, ['reportedDate', 'fechaPagoReportada', 'fechaPago', 'paymentDate'])).slice(0, 10);
  return /^\d{4}-\d{2}/.test(date) ? date.slice(0, 7) : '';
}

function amount(row) {
  return num(pick(row, ['amount', 'primaTotal', 'monto', 'total', 'primaNeta']));
}

function currency(row) {
  return text(pick(row, ['currency', 'moneda'])).toUpperCase();
}

function decision(row) {
  return text(pick(row, ['result', 'resultado', 'decision', 'decisión', 'decisionCRM', 'Decisión CRM'])).toUpperCase();
}

function classifyPlanillaRow(row) {
  const crm = text(pick(row, ['decisionCRM', 'Decisión CRM'])).toUpperCase();
  const finance = text(pick(row, ['decisionFinanciera', 'Decisión financiera'])).toUpperCase();
  const notes = text(pick(row, ['notes', 'notas'])).toUpperCase();
  const value = amount(row);
  if (value < 0 || crm.includes('REVERSAL') || notes.includes('REVERS')) return 'PLANILLA_REVERSAL_HOLD';
  if (value === 0 || crm.includes('OMIT_ZERO')) return 'PLANILLA_ZERO_OMIT';
  if (crm.includes('SOURCE_INCOMPLETE') || finance.includes('PLANILLA_INCOMPLETE')) return 'PLANILLA_SOURCE_INCOMPLETE_HOLD';
  if (crm.includes('PERIOD_ONLY')) return 'PLANILLA_PERIOD_ONLY';
  if (crm.includes('CANDIDATE') || crm.includes('EXACT')) return 'PLANILLA_DETAIL_CANDIDATE';
  return 'PLANILLA_UNCLASSIFIED_HOLD';
}

function main() {
  const [baseFile, sequenceFile, planillaFile, outFile] = process.argv.slice(2);
  if (!baseFile || !sequenceFile || !planillaFile || !outFile) {
    console.error('Uso: node tools/orbit360-cobros-overlay-readonly-v20260805.mjs <base.json> <sequence.json> <planillas.json> <out.json>');
    process.exit(2);
  }

  const base = readJson(baseFile);
  const sequence = readJson(sequenceFile);
  const planillas = readJson(planillaFile);
  const baseRows = rows(base);
  const sequenceRows = rows(sequence);
  const planillaRows = rows(planillas);

  if (baseRows.length !== 365) throw new Error(`DATA_CONTRACT_FAILURE:BASE_PAYMENT_COUNT:${baseRows.length}`);

  const paymentMap = new Map();
  for (const row of baseRows) {
    const key = paymentKey(row);
    if (!key) throw new Error('DATA_CONTRACT_FAILURE:BASE_PAYMENT_KEY_MISSING');
    if (paymentMap.has(key)) throw new Error('DATA_CONTRACT_FAILURE:BASE_PAYMENT_DUPLICATE');
    paymentMap.set(key, {
      paymentIdSha256: key,
      policyNumberSha256: policyNumberKey(row),
      currency: currency(row),
      amount: amount(row),
      period: period(row),
      outcome: 'UNRESOLVED_NEEDS_ADDITIONAL_EVIDENCE',
      confidence: 'PENDING',
      evidence: []
    });
  }

  let sequenceApplied = 0;
  let postCutoffApplied = 0;
  for (const row of sequenceRows) {
    const key = paymentKey(row);
    const target = paymentMap.get(key);
    if (!target) throw new Error('DATA_CONTRACT_FAILURE:SEQUENCE_PAYMENT_NOT_IN_BASE');
    if (target.outcome !== 'UNRESOLVED_NEEDS_ADDITIONAL_EVIDENCE') throw new Error('DATA_CONTRACT_FAILURE:OVERLAY_DUPLICATE_SEQUENCE');
    const result = decision(row);
    if (result.includes('POST') && result.includes('CORTE')) {
      target.outcome = 'VALID_POST_CUTOFF_PENDING_EXTERNAL_CONFIRMATION';
      target.confidence = 'ALTA_FECHA';
      postCutoffApplied += 1;
    } else if (result.includes('SECUENCIA') || result.includes('CONCILIADO')) {
      target.outcome = 'PROPOSE_SEQUENCE_RECONCILIATION_NO_WRITE';
      target.confidence = 'ALTA';
      sequenceApplied += 1;
    } else {
      throw new Error('DATA_CONTRACT_FAILURE:SEQUENCE_RESULT_UNKNOWN');
    }
    target.evidence.push('SEQUENCE_LEDGER');
  }

  if (sequenceApplied !== 128) throw new Error(`DATA_CONTRACT_FAILURE:SEQUENCE_COUNT:${sequenceApplied}`);
  if (postCutoffApplied !== 2) throw new Error(`DATA_CONTRACT_FAILURE:POST_CUTOFF_COUNT:${postCutoffApplied}`);

  const unresolvedByPolicy = new Map();
  for (const item of paymentMap.values()) {
    if (item.outcome !== 'UNRESOLVED_NEEDS_ADDITIONAL_EVIDENCE' || !item.policyNumberSha256) continue;
    const key = [item.policyNumberSha256, item.currency, item.period].join('|');
    const list = unresolvedByPolicy.get(key) || [];
    list.push(item);
    unresolvedByPolicy.set(key, list);
  }

  const planillaCounts = {};
  let exactPlanillaProposals = 0;
  for (const row of planillaRows) {
    const classification = classifyPlanillaRow(row);
    planillaCounts[classification] = (planillaCounts[classification] || 0) + 1;
    if (classification !== 'PLANILLA_DETAIL_CANDIDATE') continue;
    const key = [policyNumberKey(row), currency(row), period(row)].join('|');
    const candidates = unresolvedByPolicy.get(key) || [];
    if (candidates.length === 1) {
      candidates[0].outcome = 'PROPOSE_PLANILLA_DETAIL_RECONCILIATION_NO_WRITE';
      candidates[0].confidence = 'MEDIA_ALTA_REQUIERE_CONFIRMACION';
      candidates[0].evidence.push('PLANILLA_DETAIL');
      exactPlanillaProposals += 1;
      unresolvedByPolicy.delete(key);
    }
  }

  const ledger = [...paymentMap.values()];
  const outcomeCounts = ledger.reduce((acc, row) => {
    acc[row.outcome] = (acc[row.outcome] || 0) + 1;
    return acc;
  }, {});
  const explained = ledger.length - (outcomeCounts.UNRESOLVED_NEEDS_ADDITIONAL_EVIDENCE || 0);
  const sanitizedRows = ledger.map(row => ({
    paymentIdSha256: row.paymentIdSha256,
    outcome: row.outcome,
    confidence: row.confidence,
    evidence: row.evidence
  }));

  const output = {
    schemaVersion: 'orbit360-cobros-overlay-readonly-v1',
    stage: explained === 365 ? 'PASS_COBROS_FULL_REPLAY' : 'COBROS_OVERLAY_PROGRESS',
    classification: explained === 365 ? 'GO_COBROS_LEDGER_COMPLETE_NO_WRITES' : 'READ_ONLY_PROGRESS_REQUIRES_MORE_EVIDENCE',
    canonicalPayments: 365,
    sequenceApplied,
    postCutoffApplied,
    exactPlanillaProposals,
    explainedPayments: explained,
    unresolvedPayments: outcomeCounts.UNRESOLVED_NEEDS_ADDITIONAL_EVIDENCE || 0,
    outcomeCounts,
    planillaCounts,
    rowLedgerCount: sanitizedRows.length,
    rowLedgerDigest: digest(sanitizedRows),
    rows: sanitizedRows,
    existingMaterializedCobrosPreserved: 5,
    calendarHoldsPreserved: 44,
    firestoreWrites: 0,
    authWrites: 0,
    operationalWrites: 0,
    reimportExecuted: false,
    deployExecuted: false,
    productionTouched: false,
    containsPII: false,
    containsSecrets: false,
    containsPasswords: false,
    ok: explained === 365
  };

  fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(output, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({ stage: output.stage, explained, unresolved: output.unresolvedPayments, outcomeCounts, planillaCounts }, null, 2));
}

try { main(); }
catch (error) {
  console.error(String(error?.message || error));
  process.exit(41);
}
