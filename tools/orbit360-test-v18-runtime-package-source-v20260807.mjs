#!/usr/bin/env node
'use strict';

import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
const json = file => JSON.parse(read(file));
const request = json('.github/orbit360-requests/visual-matrix-corrected-post-auth-lab-v20260805-authorization.json');
const lifecycle = json('tools/orbit360-validator-lifecycle-contract-visual-matrix-corrected-post-auth-lab-v20260805.json');
const rootfix = json('orbit360-platform/runtime-gate-crm-v20260716/v18-hydration-transactional-run-evidence-source-sanitized-v20260807.json');
const hydration = read('orbit360-platform/core/visual-runtime-hydration-contract-v20260805.js');
const precheck = read('tools/orbit360-visual-runtime-rootfix-browser-precheck-v20260805.mjs');
const runner = read('tools/orbit360-run-visual-matrix-corrected-post-auth-runtime-only-v3-cross-runner-v20260806.sh');
const sealer = read('tools/orbit360-seal-visual-matrix-corrected-post-auth-runtime-v20260805.mjs');
const checks = {
  requestV18Active: request.requestVersion === '20260807.18-two-phase-runtime' && request.status === 'AUTHORIZED_ONCE' && request.allowedExecutions === 1 && request.consumed === false && request.authorizationFrozen === false && request.replayAllowed === false,
  runtimePendingLifecycle: lifecycle.status === 'AUTHORIZED_ONCE_PENDING_EXCLUSIVE_REQUEST' && lifecycle.expectedRequestVersion === '20260807.18-two-phase-runtime' && lifecycle.executionAuthorized === true && lifecycle.secretAccessAuthorized === true && lifecycle.firestoreReadAuthorized === true && lifecycle.browserAuthorized === true && lifecycle.hostingDeployAuthorized === true,
  zeroWriteBoundary: lifecycle.writeAuthorized === false && lifecycle.functionsDeployAuthorized === false && lifecycle.rulesDeployAuthorized === false && lifecycle.productionAuthorized === false && lifecycle.mainAuthorized === false && lifecycle.mergeAuthorized === false && request.scope?.firestoreWrites === false && request.scope?.authWrites === false && request.scope?.operationalWrites === false,
  rootfixSourcePass: rootfix.ok === true && rootfix.status === 'PASS_V18_TRANSACTIONAL_HYDRATION_RUN_EVIDENCE_SOURCE_ONLY' && rootfix.fixture?.progressiveModules === true && rootfix.fixture?.ownerGeneration === 1 && rootfix.fixture?.canonicalSnapshotAttached === true && rootfix.fixture?.writes === 0,
  ownerTransactionalSource: hydration.includes('function bindStoreOwner()') && hydration.includes('ownerValid: function () { return ownerValid(); }') && hydration.includes('20260807.4-transactional-owner-reentrant-readiness'),
  ownerAwarePrecheck: precheck.includes("'HYDRATION_OWNER_VALID'") && precheck.includes("HYDRATION_PARTIAL_INSTALL_REENTRANCY_STATE_LOSS"),
  evidenceResetPerRun: runner.includes('reset_run_evidence()') && runner.includes('rm -f "$PRECHECK" "$MATRIX" "$SUPERVISOR" "$FINAL"'),
  staleMatrixDefense: sealer.includes("outcomes.matrix === 'skipped' ? 'NOT_EXECUTED'") && sealer.includes("outcomes.matrix === 'skipped' ? [] : roles"),
  relayExact: request.scope?.registeredWorkflowPath === '.github/workflows/orbit360-registered-relay-v18-transactional-hydration-v20260807.yml' && lifecycle.registeredWorkflowPath === request.scope.registeredWorkflowPath,
  baselineExact: request.scope?.restorePriorBaselineChannel === 'visual-matrix-corrected-backup-31135532118' && request.scope?.hostingDeploysMaximum === 1 && request.scope?.hostingBackupClone === true && request.scope?.hostingRollbackCloneOnFailure === true
};
const failedCheckIds = Object.entries(checks).filter(([,ok]) => !ok).map(([id]) => id);
const out = {
  status: failedCheckIds.length ? 'STOP_V18_RUNTIME_PACKAGE_SOURCE' : 'PASS_V18_RUNTIME_PACKAGE_SOURCE',
  classification: failedCheckIds.length ? 'PIPELINE_MECHANISM_FAILURE' : 'SOURCE_PACKAGE_VALIDATED',
  total: Object.keys(checks).length,
  passed: Object.values(checks).filter(Boolean).length,
  failed: failedCheckIds.length,
  failedCheckIds,
  checks,
  secretsRead:false,
  firebaseAccess:false,
  hostingTouched:false,
  browserExecuted:false,
  writes:0,
  ok: failedCheckIds.length === 0
};
console.log(JSON.stringify(out,null,2));
process.exit(out.ok ? 0 : 41);