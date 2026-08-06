#!/usr/bin/env node
'use strict';

import {
  GATE_ID,
  CONTRACT_VERSION,
  PROJECT_ID,
  TENANT_ID,
  SOURCE_LEDGER_DIGEST,
  sha256,
  logicalDigest,
  validatePrivatePackageBytes,
  buildLedgerPlan,
  sanitizedPlan
} from './orbit360-cobros-full-ledger-planner-v20260805.mjs';

function rows(name, count) {
  return Array.from({ length: count }, (_, index) => ({
    documentId: sha256(Buffer.from(`${TENANT_ID}|${name}|${index}`, 'utf8')),
    tenantId: TENANT_ID,
    sourceRowId: `fixture_${index}`,
    sourceRowIdSha256: sha256(Buffer.from(`fixture_${index}`, 'utf8')),
    policyNumber: `FIXTURE-${index}`,
    currency: index % 2 ? 'GTQ' : 'COP',
    reportedDate: '2026-07-01',
    amount: index + 1,
    ledgerOutcome: name === 'conciliacionHolds' ? 'HOLD_REPORTED_PAYMENT_NO_UNIQUE_RECEIPT_LINK' : 'FIXTURE',
    evidenceCodes: ['SOURCE_ONLY_FIXTURE']
  }));
}

const pkg = {
  schemaVersion: 'orbit360-cobros-full-ledger-write-private-package-v1',
  createdAt: '2026-08-05T00:00:00Z',
  classification: 'SOURCE_ONLY_FIXTURE',
  gateId: GATE_ID,
  contractVersion: CONTRACT_VERSION,
  rcId: 'RC-AYS-LAB-CANONICA-01',
  projectId: PROJECT_ID,
  tenantId: TENANT_ID,
  sourceLedger: { count: 365, digest: SOURCE_LEDGER_DIGEST },
  plannedCounts: {
    pagosReportados: 365,
    evidenciasCobro: 365,
    propuestasConciliacion: 132,
    conciliacionHolds: 233,
    newCobros: 0,
    receiptWrites: 0,
    policyWrites: 0,
    finmovWrites: 0
  },
  writeTopology: {
    strategy: 'ISOLATED_RUN_SUBCOLLECTIONS_THEN_POINTER_TRANSACTION',
    runId: 'cobledger_sha256(tenantId|sourceLedgerDigest|packageLogicalSha256)',
    stageWrites: 1095,
    manifestCreate: 1,
    activationTransactionWrites: 2,
    maximumWrites: 1098,
    directTargetCollectionStageWrites: 0,
    newCobros: 0
  },
  pagosReportados: rows('pagosReportados', 365),
  evidenciasCobro: rows('evidenciasCobro', 365),
  propuestasConciliacion: rows('propuestasConciliacion', 132),
  conciliacionHolds: rows('conciliacionHolds', 233),
  containsOperationalIds: false,
  containsPolicyNumbers: false,
  containsAmounts: false,
  containsPII: false,
  containsSecrets: false,
  containsPasswords: false,
  repositoryPersistenceProhibited: true,
  writeAuthorized: false,
  productionTouched: false
};
pkg.logicalSha256 = logicalDigest(pkg);
const bytes = Buffer.from(JSON.stringify(pkg), 'utf8');
const physicalSha = sha256(bytes);

try {
  const validated = validatePrivatePackageBytes(bytes, {
    packageSha256: physicalSha,
    packageLogicalSha256: pkg.logicalSha256
  });
  const plan = buildLedgerPlan(validated.pkg);
  const second = buildLedgerPlan(validated.pkg);
  const sanitized = sanitizedPlan(plan);
  const checks = {
    packageValidated: validated.physicalSha === physicalSha && validated.logicalSha === pkg.logicalSha256,
    runIdFormat: /^cobledger_[a-f0-9]{28}$/.test(plan.runId),
    deterministicRunId: plan.runId === second.runId,
    deterministicAggregateDigest: plan.aggregateDigest === second.aggregateDigest,
    pagos365: plan.collections.pagosReportados.length === 365,
    evidencias365: plan.collections.evidenciasCobro.length === 365,
    propuestas132: plan.collections.propuestasConciliacion.length === 132,
    holds233: plan.collections.conciliacionHolds.length === 233,
    stage1095: plan.stageDocumentCount === 1095,
    maximum1098: plan.maximumWrites === 1098,
    uniqueIdsPerClass: Object.values(plan.collections).every(list => new Set(list.map(row => row.id)).size === list.length),
    payloadDigests: Object.values(plan.collections).every(list => list.every(row => /^[a-f0-9]{64}$/.test(row.payloadDigest))),
    collectionDigests: Object.values(plan.collectionDigests).every(value => /^[a-f0-9]{64}$/.test(value)),
    aggregateDigest: /^[a-f0-9]{64}$/.test(plan.aggregateDigest),
    manifestStaging: plan.manifest.status === 'STAGING' && plan.manifest.activationState === 'STAGED',
    pointerTargetsRun: plan.activePointer.activeRunId === plan.runId && plan.activePointer.status === 'ACTIVE',
    noBusinessWrites: plan.manifest.newCobros === 0 && plan.manifest.receiptWrites === 0 && plan.manifest.policyWrites === 0 && plan.manifest.finmovWrites === 0,
    sanitizedBoundary: sanitized.directVisibleCollectionStageWrites === 0
      && sanitized.executionAuthorized === false
      && sanitized.firestoreWrites === 0
      && sanitized.containsPII === false
      && sanitized.containsSecrets === false
      && sanitized.containsPasswords === false
  };
  const failedCheckIds = Object.entries(checks).filter(([, ok]) => !ok).map(([id]) => id);
  const output = {
    schemaVersion: 'orbit360-cobros-full-ledger-planner-source-test-v1',
    status: failedCheckIds.length ? 'FAIL_COBROS_FULL_LEDGER_PLANNER_SOURCE' : 'PASS_COBROS_FULL_LEDGER_PLANNER_SOURCE',
    total: Object.keys(checks).length,
    passed: Object.values(checks).filter(Boolean).length,
    failed: failedCheckIds.length,
    failedCheckIds,
    checks,
    fixtureOnly: true,
    realPrivateRowsUsed: false,
    secretsRead: false,
    firestoreRead: false,
    firestoreWrites: 0,
    authWrites: 0,
    operationalWrites: 0,
    deployExecuted: false,
    productionTouched: false,
    containsPII: false,
    containsSecrets: false,
    containsPasswords: false,
    ok: failedCheckIds.length === 0
  };
  console.log(JSON.stringify(output, null, 2));
  if (!output.ok) process.exitCode = 41;
} catch (error) {
  console.error(String(error?.message || error));
  process.exit(41);
}
