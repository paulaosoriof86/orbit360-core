#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const sha = value => crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit360-cobros-overlay-v2-'));
const baseFile = path.join(dir, 'base.json');
const sequenceFile = path.join(dir, 'sequence.json');
const planillaFile = path.join(dir, 'planillas.json');
const outputFile = path.join(dir, 'output.json');

try {
  const baseRows = Array.from({ length: 365 }, (_, index) => ({
    id: `rec_${index}`,
    polizaNumero: `POL-${index}`,
    moneda: 'GTQ',
    fechaPagoReportada: '2026-06-15',
    primaTotal: 100
  }));
  const sequenceRows = [];
  for (let index = 0; index < 128; index += 1) {
    sequenceRows.push({ receiptId_sha256: sha(`rec_${index}`), Resultado: 'CONCILIADO_SECUENCIA_CARTERA_PROPUESTO' });
  }
  for (let index = 128; index < 130; index += 1) {
    sequenceRows.push({ receiptId_sha256: sha(`rec_${index}`), Resultado: 'PAGO_VALIDO_POST_CORTE' });
  }
  const planillaRows = [
    { Póliza: 'POL-130', Moneda: 'GTQ', Periodo: '2026-06', 'Prima neta': 100, 'Decisión CRM': 'CANDIDATE' },
    { Póliza: 'POL-131', Moneda: 'GTQ', Periodo: '2026-06', 'Prima neta': 80, 'Decisión CRM': 'CANDIDATE' },
    { Póliza: 'POL-131', Moneda: 'GTQ', Periodo: '2026-06', 'Prima neta': 90, 'Decisión CRM': 'CANDIDATE' },
    { Póliza: 'POL-132', Moneda: 'GTQ', Periodo: '2026-06', 'Prima neta': -25, 'Decisión CRM': 'CANDIDATE_REVERSAL' },
    { Póliza: 'POL-133', Moneda: 'GTQ', Periodo: '2026-06', 'Prima neta': 0, 'Decisión CRM': 'OMIT_ZERO_COMMISSION' },
    { Póliza: 'POL-134', Moneda: 'GTQ', Periodo: '2026-06', 'Prima neta': 80, 'Decisión CRM': 'CANDIDATE_PERIOD_ONLY' }
  ];

  fs.writeFileSync(baseFile, JSON.stringify({ rows: baseRows }), 'utf8');
  fs.writeFileSync(sequenceFile, JSON.stringify({ rows: sequenceRows }), 'utf8');
  fs.writeFileSync(planillaFile, JSON.stringify({ rows: planillaRows, source: { reportedRows: 6 } }), 'utf8');

  execFileSync(process.execPath, [
    'tools/orbit360-cobros-overlay-readonly-v2-20260805.mjs',
    baseFile,
    sequenceFile,
    planillaFile,
    outputFile
  ], { cwd: process.cwd(), stdio: 'pipe' });

  const output = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
  const checks = {
    canonicalPayments365: output.canonicalPayments === 365,
    sequence128: output.sequenceApplied === 128,
    postCutoff2: output.postCutoffApplied === 2,
    exactPlanilla1: output.exactPlanillaProposals === 1,
    duplicatePlanillaRowsHeld2: output.planillaCounts?.PLANILLA_DETAIL_AMBIGUOUS_HOLD === 2,
    duplicatePlanillaNotApplied: output.planillaMatchOutcomes?.sourceKeyAmbiguousHold === 2,
    explained131: output.explainedPayments === 131,
    unresolved234: output.unresolvedPayments === 234,
    reversalHoldClassified: output.planillaCounts?.PLANILLA_REVERSAL_HOLD === 1,
    zeroOmitClassified: output.planillaCounts?.PLANILLA_ZERO_OMIT === 1,
    periodOnlyClassified: output.planillaCounts?.PLANILLA_PERIOD_ONLY === 1,
    noWrites: output.firestoreWrites === 0 && output.authWrites === 0 && output.operationalWrites === 0,
    noDeploy: output.deployExecuted === false && output.productionTouched === false,
    noSensitiveOutput: output.containsPII === false && output.containsSecrets === false && output.containsPasswords === false,
    materializedPreserved: output.existingMaterializedCobrosPreserved === 5,
    holdsPreserved: output.calendarHoldsPreserved === 44
  };
  const failedCheckIds = Object.entries(checks).filter(([, ok]) => !ok).map(([id]) => id);
  const evidence = {
    schemaVersion: 'orbit360-cobros-overlay-source-test-v2',
    status: failedCheckIds.length ? 'FAIL_COBROS_OVERLAY_SOURCE_ONLY_V2' : 'PASS_COBROS_OVERLAY_SOURCE_ONLY_V2',
    total: Object.keys(checks).length,
    passed: Object.values(checks).filter(Boolean).length,
    failed: failedCheckIds.length,
    failedCheckIds,
    checks,
    duplicateSourceKeyProtection: true,
    firestoreWrites: 0,
    authWrites: 0,
    deploys: 0,
    productionTouched: false,
    containsPII: false,
    containsSecrets: false,
    containsPasswords: false,
    ok: failedCheckIds.length === 0
  };
  console.log(JSON.stringify(evidence, null, 2));
  if (!evidence.ok) process.exitCode = 41;
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
