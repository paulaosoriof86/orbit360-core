#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const sha = value => crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit360-cobros-finalizer-'));
const baseFile = path.join(dir, 'base.json');
const overlayFile = path.join(dir, 'overlay.json');
const outputFile = path.join(dir, 'output.json');

try {
  const baseRows = Array.from({ length: 365 }, (_, index) => ({
    id: `rec_${index}`,
    estadoOperativo: 'pago_reportado',
    exigibilidad: 'no_pendiente',
    enCartera: false,
    requiereValidacion: false,
    fuenteAutoridad: 'SIGA',
    matchQuality: 'SIGA_ESTADO_PAGO_O_HOLD'
  }));
  const overlayRows = baseRows.map((row, index) => ({
    paymentIdSha256: sha(row.id),
    outcome: index < 128
      ? 'PROPOSE_SEQUENCE_RECONCILIATION_NO_WRITE'
      : index < 130
        ? 'VALID_POST_CUTOFF_PENDING_EXTERNAL_CONFIRMATION'
        : index === 130
          ? 'PROPOSE_PLANILLA_DETAIL_RECONCILIATION_NO_WRITE'
          : 'UNRESOLVED_NEEDS_ADDITIONAL_EVIDENCE',
    confidence: index <= 130 ? 'TEST' : 'PENDING',
    evidence: []
  }));

  fs.writeFileSync(baseFile, JSON.stringify({ rows: baseRows }), 'utf8');
  fs.writeFileSync(overlayFile, JSON.stringify({
    schemaVersion: 'fixture-overlay-v1',
    canonicalPayments: 365,
    sequenceApplied: 128,
    postCutoffApplied: 2,
    exactPlanillaProposals: 1,
    rows: overlayRows,
    existingMaterializedCobrosPreserved: 5,
    calendarHoldsPreserved: 44
  }), 'utf8');

  execFileSync(process.execPath, [
    'tools/orbit360-cobros-overlay-hold-finalizer-v20260805.mjs',
    baseFile,
    overlayFile,
    outputFile
  ], { cwd: process.cwd(), stdio: 'pipe' });

  const output = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
  const checks = {
    canonical365: output.canonicalPayments === 365,
    stagePass: output.stage === 'PASS_COBROS_FULL_REPLAY',
    explained365: output.explainedPayments === 365,
    unresolved0: output.unresolvedPayments === 0,
    sequencePreserved128: output.outcomeCounts?.PROPOSE_SEQUENCE_RECONCILIATION_NO_WRITE === 128,
    postCutoffPreserved2: output.outcomeCounts?.VALID_POST_CUTOFF_PENDING_EXTERNAL_CONFIRMATION === 2,
    planillaPreserved1: output.outcomeCounts?.PROPOSE_PLANILLA_DETAIL_RECONCILIATION_NO_WRITE === 1,
    canonicalHolds234: output.outcomeCounts?.HOLD_REPORTED_PAYMENT_NO_UNIQUE_RECEIPT_LINK === 234,
    noWrites: output.firestoreWrites === 0 && output.authWrites === 0 && output.operationalWrites === 0,
    noDeployOrProduction: output.deployExecuted === false && output.productionTouched === false,
    existingCobrosPreserved: output.existingMaterializedCobrosPreserved === 5,
    calendarHoldsPreserved: output.calendarHoldsPreserved === 44,
    noSensitiveOutput: output.containsPII === false && output.containsSecrets === false && output.containsPasswords === false,
    ok: output.ok === true
  };
  const failedCheckIds = Object.entries(checks).filter(([, ok]) => !ok).map(([id]) => id);
  console.log(JSON.stringify({
    schemaVersion: 'orbit360-cobros-overlay-hold-finalizer-source-test-v1',
    status: failedCheckIds.length ? 'FAIL_COBROS_HOLD_FINALIZER_SOURCE_ONLY' : 'PASS_COBROS_HOLD_FINALIZER_SOURCE_ONLY',
    total: Object.keys(checks).length,
    passed: Object.values(checks).filter(Boolean).length,
    failed: failedCheckIds.length,
    failedCheckIds,
    checks,
    firestoreWrites: 0,
    authWrites: 0,
    deploys: 0,
    productionTouched: false,
    containsPII: false,
    containsSecrets: false,
    containsPasswords: false,
    ok: failedCheckIds.length === 0
  }, null, 2));
  if (failedCheckIds.length) process.exitCode = 41;
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
