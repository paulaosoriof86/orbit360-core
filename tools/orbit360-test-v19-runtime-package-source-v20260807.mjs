#!/usr/bin/env node
'use strict';

import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
const json = file => JSON.parse(read(file));
const request = json('.github/orbit360-requests/visual-matrix-corrected-post-auth-lab-v20260805-authorization.json');
const lifecycle = json('tools/orbit360-validator-lifecycle-contract-visual-matrix-corrected-post-auth-lab-v20260805.json');
const rootfix = json('orbit360-platform/runtime-gate-crm-v20260716/v19-cliente360-bounded-render-source-sanitized-v20260807.json');
const cliente = read('orbit360-platform/modules/cliente360.js');
const matrix = read('tools/orbit360-visual-runtime-rootfix-observable-matrix-v20260805.mjs');
const runner = read('tools/orbit360-run-visual-matrix-corrected-post-auth-runtime-only-v3-cross-runner-v20260806.sh');
const sealer = read('tools/orbit360-seal-visual-matrix-corrected-post-auth-runtime-v20260805.mjs');
const checks = {
  requestV19Active: request.requestVersion === '20260807.19-two-phase-runtime' && request.status === 'AUTHORIZED_ONCE' && request.allowedExecutions === 1 && request.consumed === false && request.authorizationFrozen === false && request.replayAllowed === false,
  runtimePendingLifecycle: lifecycle.status === 'AUTHORIZED_ONCE_PENDING_EXCLUSIVE_REQUEST' && lifecycle.expectedRequestVersion === '20260807.19-two-phase-runtime' && lifecycle.executionAuthorized === true && lifecycle.secretAccessAuthorized === true && lifecycle.firestoreReadAuthorized === true && lifecycle.browserAuthorized === true && lifecycle.hostingDeployAuthorized === true,
  zeroWriteBoundary: lifecycle.writeAuthorized === false && lifecycle.functionsDeployAuthorized === false && lifecycle.rulesDeployAuthorized === false && lifecycle.productionAuthorized === false && lifecycle.mainAuthorized === false && lifecycle.mergeAuthorized === false && request.scope?.firestoreWrites === false && request.scope?.authWrites === false && request.scope?.operationalWrites === false,
  rootfixSourcePass: rootfix.ok === true && rootfix.status === 'PASS_V19_CLIENTE360_BOUNDED_RENDER_SOURCE_ONLY' && rootfix.fixture?.clients === 430 && rootfix.fixture?.policies === 1375 && rootfix.fixture?.firstFrameRows === 40 && rootfix.fixture?.writes === 0,
  boundedClienteSource: cliente.includes('const LIST_PAGE_SIZE = 40') && cliente.includes('renderedRows: visibleRows.length') && cliente.includes('summaryCacheMs') && cliente.includes('innerHtmlMs'),
  routeProbeDecoupled: matrix.includes('async function waitRequiredHydration') && matrix.includes('await waitRequiredHydration(page, role, target)') && matrix.indexOf('await waitRequiredHydration(page, role, target)') < matrix.indexOf("mark(role.toUpperCase() + '_NAVIGATE_'") && matrix.includes('VALIDATOR_STALE_RENDER_PROBE_BLOCKED'),
  renderMetricsPersisted: matrix.includes('persistRouteMetric') && matrix.includes('renderReadyWaitMs') && sealer.includes('routeMetrics') && sealer.includes('matrixValidatorFinding'),
  evidenceResetPerRun: runner.includes('reset_run_evidence()') && runner.includes('rm -f "$PRECHECK" "$MATRIX" "$SUPERVISOR" "$FINAL"'),
  relayExact: request.scope?.registeredWorkflowPath === '.github/workflows/orbit360-registered-relay-v19-bounded-render-v20260807.yml' && lifecycle.registeredWorkflowPath === request.scope.registeredWorkflowPath,
  baselineExact: request.scope?.restorePriorBaselineChannel === 'visual-matrix-corrected-backup-31135532118' && request.scope?.hostingDeploysMaximum === 1 && request.scope?.hostingBackupClone === true && request.scope?.hostingRollbackCloneOnFailure === true
};
const failedCheckIds = Object.entries(checks).filter(([,ok]) => !ok).map(([id]) => id);
const out = {
  status: failedCheckIds.length ? 'STOP_V19_RUNTIME_PACKAGE_SOURCE' : 'PASS_V19_RUNTIME_PACKAGE_SOURCE',
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
