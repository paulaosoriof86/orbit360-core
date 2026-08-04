#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import assert from 'node:assert/strict';
import { SOURCE_TYPES, normalizeRow, preview, batchId, RULES } from './orbit360-recurring-import-contract-v20260804.mjs';

const root = process.argv[2] || '.';
const read = relative => fs.readFileSync(`${root}/${relative}`, 'utf8');
const checks = [];
function check(name, fn) {
  try { fn(); checks.push({ name, ok: true }); }
  catch (error) { checks.push({ name, ok: false, error: String(error && error.message || error) }); }
}

const backend = read('functions/recurring-insurance-import.js');
const client = read('orbit360-platform/core/recurring-insurance-import-client.js');
const extractor = read('orbit360-platform/core/recurring-insurance-document-extractor.js');
const bridge = read('orbit360-platform/modules/importar-recurring-bridge-v20260804.js');
const claude = read('orbit360-platform/docs/PAQUETE-ACUMULADO-CLAUDE-ORBIT360-20260804-V2.md');

check('tipos de fuente recurrente completos', () => {
  assert.deepEqual(SOURCE_TYPES, [
    'receipt_schedule', 'reported_payments', 'insurer_payment_report',
    'portfolio_statement', 'commission_statement', 'bank_statement', 'supporting_document'
  ]);
});
check('idempotencia estable por tenant fuente hash y periodo', () => {
  const one = batchId({ tenantId: 'tenant-x', sourceType: 'commission_statement', sourceFileHash: 'a'.repeat(64), period: '2026-08' });
  const two = batchId({ tenantId: 'tenant-x', sourceType: 'commission_statement', sourceFileHash: 'a'.repeat(64), period: '2026-08' });
  assert.equal(one, two);
});
check('mapeo configurable normaliza fila válida', () => {
  const row = normalizeRow({ Poliza: 'P-1', Pais: 'GT', Moneda: 'GTQ', Periodo: '2026-08', Comision: 12 }, {
    id: 'batch-1', sourceType: 'commission_statement', mapping: { Poliza: 'policyNumber', Pais: 'country', Moneda: 'currency', Periodo: 'period', Comision: 'commission' }
  }, 1);
  assert.equal(row.quality.decision, 'READY');
  assert.equal(row.policyNumber, 'P-1');
  assert.equal(row.commission, 12);
});
check('banco sin contraparte queda en validación', () => {
  const row = normalizeRow({ Pais: 'GT', Moneda: 'GTQ', Periodo: '2026-08', Monto: 100 }, {
    id: 'batch-2', sourceType: 'bank_statement', mapping: { Pais: 'country', Moneda: 'currency', Periodo: 'period', Monto: 'amount' }
  }, 1);
  assert.equal(row.quality.decision, 'REQUIRES_VALIDATION');
  assert.ok(row.quality.contradictions.includes('bank_without_counterpart'));
});
check('reverso nunca queda listo', () => {
  const row = normalizeRow({ Poliza: 'P-2', Pais: 'GT', Moneda: 'GTQ', Periodo: '2026-08', Estado: 'Reverso', Comision: -5 }, {
    id: 'batch-3', sourceType: 'commission_statement', mapping: { Poliza: 'policyNumber', Pais: 'country', Moneda: 'currency', Periodo: 'period', Estado: 'status', Comision: 'commission' }
  }, 1);
  assert.equal(row.quality.decision, 'REQUIRES_VALIDATION');
});
check('duplicados se omiten en dry run', () => {
  const batch = { id: 'batch-4', sourceType: 'reported_payments', country: 'GT', currency: 'GTQ', period: '2026-08', mapping: { Poliza: 'policyNumber' } };
  const a = normalizeRow({ Poliza: 'P-3' }, batch, 1);
  const b = normalizeRow({ Poliza: 'P-3' }, batch, 2);
  const result = preview([a, b]);
  assert.equal(result.counts.omitted, 2);
  assert.equal(result.duplicateDigestCount, 1);
});
check('confirmación crea evidencia y no cobros directos', () => {
  assert.equal(RULES.confirmedBatchCreatesEvidenceOnly, true);
  assert.equal(RULES.bankCreatesCobrosDirectly, false);
  assert.equal(RULES.bankCreatesFinancialMovementsDirectly, false);
  assert.match(backend, /evidenciasCobro/);
  assert.doesNotMatch(backend, /finmovs/);
});
check('rollback bloquea evidencia consumida', () => {
  assert.equal(RULES.rollbackBlockedAfterConsumption, true);
  assert.match(backend, /appliedCobroId|proposalConfirmed|consumedAt/);
});
check('cliente no escribe Orbit store', () => {
  assert.match(client, /writesStoreDirectly: false/);
  assert.doesNotMatch(client, /Orbit\.store\.(insert|update|remove)/);
});
check('extractor y bridge preservan el store', () => {
  assert.match(extractor, /writesStore: false/);
  assert.doesNotMatch(extractor, /Orbit\.store\.(insert|update|remove)/);
  assert.match(bridge, /sin sobrescribir core\/importa\.js/i);
  assert.match(bridge, /Orbit\.recurringDocumentExtractor\.extract/);
  assert.doesNotMatch(bridge, /Orbit\.store\.(insert|update|remove)/);
});
check('paquete Claude es genérico y no depende de datos A&S', () => {
  assert.doesNotMatch(claude, /365|235|128|211|AseGuate|El Roble|La Ceiba|Universales|Mapfre|alianzas-soluciones/i);
  assert.match(claude, /candidata.*acumulativa/is);
  assert.match(claude, /cero datos reales/i);
});

const failed = checks.filter(item => !item.ok);
console.log(JSON.stringify({
  schemaVersion: 'orbit360-recurring-import-source-validation-v1',
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  results: checks,
  networkCalls: 0,
  firestoreWrites: 0,
  authWrites: 0,
  deployExecuted: false,
  ok: failed.length === 0
}, null, 2));
if (failed.length) process.exit(42);
