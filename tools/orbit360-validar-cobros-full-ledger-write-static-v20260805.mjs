#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CONTRACT = 'tools/orbit360-cobros-full-ledger-write-contract-v20260805.json';
const LIFECYCLE = 'tools/orbit360-validator-lifecycle-contract-cobros-full-ledger-write-lab-v20260805.json';
const FINAL = 'orbit360-platform/runtime-gate-crm-v20260716/cobros-full-replay-final-sanitized-v20260805.json';
const OUT = 'orbit360-platform/runtime-gate-crm-v20260716/cobros-full-ledger-write-static-preflight-sanitized-v20260805.json';

const read = rel => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const write = payload => {
  const target = path.join(ROOT, OUT);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(payload, null, 2) + '\n', 'utf8');
};

try {
  const contract = read(CONTRACT);
  const lifecycle = read(LIFECYCLE);
  const final = read(FINAL);
  const checks = {
    gateId: contract.gateId === 'block10.10-cobros-full-ledger-write-lab-v20260805',
    contractVersion: contract.contractVersion === '10.10.0',
    rc: contract.rcId === 'RC-AYS-LAB-CANONICA-01',
    branch: contract.branch === 'ays/backend-tenant-lab-v99-20260703',
    pullRequest: contract.pullRequest === 5,
    projectTenant: contract.projectId === 'ays-orbit-360-lab' && contract.tenantId === 'alianzas-soluciones',
    replayPass: final.stage === 'PASS_COBROS_FULL_REPLAY' && final.ok === true,
    ledgerCount: final.rowLedgerCount === 365 && contract.source.rowLedgerCount === 365,
    ledgerDigest: final.rowLedgerDigest === contract.source.rowLedgerDigest,
    proposals: contract.durablePlan.propuestasConciliacion === 132
      && contract.proposalBreakdown.sequence === 128
      && contract.proposalBreakdown.postCutoff === 2
      && contract.proposalBreakdown.planillaDetail === 2,
    holds: contract.durablePlan.conciliacionHolds === 233
      && contract.holdBreakdown.reportedPaymentNoUniqueReceiptLink === 233,
    writeMaximum: contract.durablePlan.maximumWrites === 1097,
    noCobroWrites: contract.durablePlan.newCobros === 0,
    noReceiptPolicyFinmovWrites: contract.durablePlan.receiptWrites === 0
      && contract.durablePlan.policyWrites === 0
      && contract.durablePlan.finmovWrites === 0,
    atomicity: contract.atomicity.strategy === 'STAGE_CHUNKS_THEN_SINGLE_ACTIVE_POINTER'
      && contract.atomicity.maximumChunkWrites <= 400
      && contract.atomicity.partialStageIsInvisible === true,
    idempotency: contract.idempotency.sameDigest === 'SKIP_AS_IDEMPOTENT'
      && contract.idempotency.differentDigest === 'STOP_DATA_CONTRACT_FAILURE'
      && contract.idempotency.replayOfConsumedRequest === 'PROHIBITED',
    rollback: contract.rollback.deleteOnlyDocumentsCreatedByRunId === true
      && contract.rollback.restorePreviousActivePointer === true,
    lifecyclePrepared: lifecycle.status === 'PREPARED_STATIC_NOT_AUTHORIZED'
      && lifecycle.currentPhase === 'PREPARED_STATIC',
    noCapabilities: Object.values(lifecycle.executionProfile.capabilities).every(value => value === false)
      && lifecycle.executionAuthorized === false
      && lifecycle.writeAuthorized === false
      && lifecycle.allowedExecutions === 0,
    privatePackageRequired: lifecycle.privatePackageRequiredBeforeAuthorization === true
      && lifecycle.privatePackage === null,
    protectedExistingState: lifecycle.protectedState.existingCobros === 5
      && lifecycle.protectedState.calendarHolds === 44
      && lifecycle.protectedState.newCobrosAuthorized === 0,
    noSensitiveEvidence: contract.containsPII === false
      && contract.containsSecrets === false
      && contract.containsPasswords === false
      && lifecycle.containsPII === false
      && lifecycle.containsSecrets === false
      && lifecycle.containsPasswords === false
  };

  const failedCheckIds = Object.entries(checks).filter(([, ok]) => !ok).map(([id]) => id);
  const payload = {
    schemaVersion: 'orbit360-cobros-full-ledger-write-static-preflight-v1',
    gateId: contract.gateId,
    contractVersion: contract.contractVersion,
    status: failedCheckIds.length ? 'FAIL_COBROS_FULL_LEDGER_WRITE_STATIC' : 'PASS_COBROS_FULL_LEDGER_WRITE_STATIC_CONTRACT',
    classification: failedCheckIds.length ? 'DATA_CONTRACT_FAILURE' : 'STATIC_CONTRACT_READY_NO_ACCESS',
    total: Object.keys(checks).length,
    passed: Object.values(checks).filter(Boolean).length,
    failed: failedCheckIds.length,
    failedCheckIds,
    checks,
    sourceLedgerCount: 365,
    sourceLedgerDigest: contract.source.rowLedgerDigest,
    plannedWritesMaximum: 1097,
    newCobros: 0,
    receiptWrites: 0,
    policyWrites: 0,
    finmovWrites: 0,
    privatePackageReady: false,
    executionAuthorized: false,
    secretAccessAuthorized: false,
    firestoreReadAuthorized: false,
    writeAuthorized: false,
    deployAuthorized: false,
    productionAuthorized: false,
    dataAccess: false,
    secretAccess: false,
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
  write(payload);
  console.log(JSON.stringify(payload, null, 2));
  if (!payload.ok) process.exitCode = 41;
} catch (error) {
  const payload = {
    schemaVersion: 'orbit360-cobros-full-ledger-write-static-preflight-v1',
    gateId: 'block10.10-cobros-full-ledger-write-lab-v20260805',
    contractVersion: '10.10.0',
    status: 'FAIL_COBROS_FULL_LEDGER_WRITE_STATIC',
    classification: 'PIPELINE_MECHANISM_FAILURE',
    error: String(error?.message || error).slice(0, 500),
    dataAccess: false,
    secretAccess: false,
    firestoreWrites: 0,
    authWrites: 0,
    operationalWrites: 0,
    deployExecuted: false,
    productionTouched: false,
    containsPII: false,
    containsSecrets: false,
    containsPasswords: false,
    ok: false
  };
  write(payload);
  console.error(JSON.stringify(payload, null, 2));
  process.exit(41);
}
