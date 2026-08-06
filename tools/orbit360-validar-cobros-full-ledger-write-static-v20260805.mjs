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
  const pkg = lifecycle.privatePackage || {};
  const paths = contract.collections || {};
  const checks = {
    gateAndVersion: contract.gateId === 'block10.10-cobros-full-ledger-write-lab-v20260805'
      && contract.contractVersion === '10.10.2'
      && lifecycle.gateContractVersion === '10.10.2'
      && pkg.contractVersion === '10.10.2',
    scope: contract.rcId === 'RC-AYS-LAB-CANONICA-01'
      && contract.branch === 'ays/backend-tenant-lab-v99-20260703'
      && contract.pullRequest === 5
      && contract.projectId === 'ays-orbit-360-lab'
      && contract.tenantId === 'alianzas-soluciones',
    replayClosed: final.stage === 'PASS_COBROS_FULL_REPLAY'
      && final.explainedPayments === 365
      && final.unresolvedPayments === 0
      && final.ok === true,
    ledgerIdentity: final.rowLedgerCount === 365
      && final.rowLedgerDigest === contract.source.rowLedgerDigest
      && lifecycle.sourceLedger.digest === contract.source.rowLedgerDigest,
    durableCounts: contract.durablePlan.pagosReportados === 365
      && contract.durablePlan.evidenciasCobro === 365
      && contract.durablePlan.propuestasConciliacion === 132
      && contract.durablePlan.conciliacionHolds === 233
      && contract.durablePlan.maximumWrites === 1098,
    proposalAndHoldBreakdown: contract.proposalBreakdown.sequence === 128
      && contract.proposalBreakdown.postCutoff === 2
      && contract.proposalBreakdown.planillaDetail === 2
      && contract.holdBreakdown.reportedPaymentNoUniqueReceiptLink === 233,
    noBusinessApplications: contract.durablePlan.newCobros === 0
      && contract.durablePlan.receiptWrites === 0
      && contract.durablePlan.policyWrites === 0
      && contract.durablePlan.finmovWrites === 0,
    runScopedCanonicalPaths: contract.pathAuthority.class === 'canonical-v79-run-scoped-data-items'
      && /^tenants\/\{tenantId\}\/data\/cobrosLedgerRuns\/items\/\{runId\}$/.test(paths.runManifest)
      && ['pagosReportados','evidenciasCobro','propuestasConciliacion','conciliacionHolds'].every(name =>
        paths[name] === `tenants/{tenantId}/data/cobrosLedgerRuns/items/{runId}/${name}/{deterministicId}`)
      && paths.activePointer === 'tenants/{tenantId}/data/cobrosLedgerControl/items/active',
    noVisiblePartialWrites: contract.pathAuthority.directTargetCollectionStageWritesProhibited === true
      && contract.atomicity.stageDocumentsInvisibleToCurrentConsumers === true
      && contract.atomicity.partialStageIsInvisible === true,
    activationAtomicity: contract.atomicity.strategy === 'ISOLATED_RUN_SUBCOLLECTIONS_THEN_POINTER_TRANSACTION'
      && contract.atomicity.maximumChunkWrites <= 400
      && contract.atomicity.activationTransactionWrites === 2
      && contract.atomicity.activePointerSelectsOnlyCompleteRun === true,
    idempotency: contract.idempotency.runIdDeterministic === true
      && contract.idempotency.sameRunAndDigest === 'SKIP_AS_IDEMPOTENT'
      && contract.idempotency.sameDocumentDifferentDigest === 'STOP_DATA_CONTRACT_FAILURE'
      && contract.idempotency.replayOfConsumedRequest === 'PROHIBITED',
    rollback: contract.rollback.deleteOnlyRunScopedDocuments === true
      && contract.rollback.restorePreviousActivePointer === true
      && contract.rollback.deleteRunManifestIfCreated === true
      && contract.rollback.preexistingActiveRunUntouched === true,
    lifecycleReady: lifecycle.status === 'PRIVATE_PACKAGE_READY_STATIC_NOT_AUTHORIZED'
      && lifecycle.currentPhase === 'PRIVATE_PACKAGE_READY'
      && lifecycle.pathAuthority.class === 'canonical-v79-run-scoped-data-items'
      && lifecycle.isolatedRunStageRequired === true
      && lifecycle.pointerActivationTransactionRequired === true,
    packageReadback: pkg.driveFileId === '1t4di7P2z6OQVnT8LF5CtEMg_latkW7Cx'
      && pkg.sizeBytes === 857161
      && pkg.sha256 === '9769d7a952e9b2a15c27821da9098e5899466b0558ba8b68e021689864ad8cfe'
      && pkg.logicalSha256 === 'a999977e31c73feebb8aafe3ca380a536e1ca60047d57fcdb6d9a592bd829654'
      && pkg.downloadReadbackVerified === true
      && pkg.writeTopology === 'ISOLATED_RUN_SUBCOLLECTIONS_THEN_POINTER_TRANSACTION',
    packageCounts: pkg.counts.pagosReportados === 365
      && pkg.counts.evidenciasCobro === 365
      && pkg.counts.propuestasConciliacion === 132
      && pkg.counts.conciliacionHolds === 233,
    oldPackagesSuperseded: Array.isArray(lifecycle.supersededPrivatePackages)
      && lifecycle.supersededPrivatePackages.length === 2
      && lifecycle.supersededPrivatePackages.every(row => row.status === 'SUPERSEDED_NO_USE'),
    noCapabilities: Object.values(lifecycle.executionProfile.capabilities).every(value => value === false)
      && lifecycle.allowedExecutions === 0
      && lifecycle.executionAuthorized === false
      && lifecycle.firestoreReadAuthorized === false
      && lifecycle.writeAuthorized === false
      && lifecycle.deployAuthorized === false
      && lifecycle.productionAuthorized === false,
    protectedState: lifecycle.protectedState.existingCobros === 5
      && lifecycle.protectedState.calendarHolds === 44
      && lifecycle.protectedState.newCobrosAuthorized === 0
      && lifecycle.protectedState.receiptWritesAuthorized === 0
      && lifecycle.protectedState.policyWritesAuthorized === 0
      && lifecycle.protectedState.finmovWritesAuthorized === 0,
    consumerProjectionDeferred: contract.atomicity.block5ConsumerProjectionRequired === true
      && lifecycle.block5ConsumerProjectionRequired === true,
    noSensitiveRepoEvidence: contract.containsPII === false
      && contract.containsSecrets === false
      && contract.containsPasswords === false
      && lifecycle.containsPII === false
      && lifecycle.containsSecrets === false
      && lifecycle.containsPasswords === false
      && pkg.repositoryPersistenceProhibited === true
  };
  const failedCheckIds = Object.entries(checks).filter(([, ok]) => !ok).map(([id]) => id);
  const payload = {
    schemaVersion: 'orbit360-cobros-full-ledger-write-static-preflight-v3',
    gateId: contract.gateId,
    contractVersion: contract.contractVersion,
    status: failedCheckIds.length ? 'FAIL_COBROS_FULL_LEDGER_WRITE_STATIC' : 'PASS_COBROS_FULL_LEDGER_WRITE_STATIC_CONTRACT',
    classification: failedCheckIds.length ? 'DATA_CONTRACT_FAILURE' : 'STATIC_ISOLATED_RUN_CONTRACT_AND_PRIVATE_PACKAGE_READY_NO_ACCESS',
    total: Object.keys(checks).length,
    passed: Object.values(checks).filter(Boolean).length,
    failed: failedCheckIds.length,
    failedCheckIds,
    checks,
    sourceLedgerCount: 365,
    sourceLedgerDigest: contract.source.rowLedgerDigest,
    plannedWritesMaximum: 1098,
    stageDocuments: 1095,
    activationTransactionWrites: 2,
    packageSha256: pkg.sha256 || '',
    packageLogicalSha256: pkg.logicalSha256 || '',
    newCobros: 0,
    receiptWrites: 0,
    policyWrites: 0,
    finmovWrites: 0,
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
    schemaVersion: 'orbit360-cobros-full-ledger-write-static-preflight-v3',
    gateId: 'block10.10-cobros-full-ledger-write-lab-v20260805',
    contractVersion: '10.10.2',
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
