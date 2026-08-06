#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const GATE_ID = 'block2.7-visual-matrix-corrected-post-auth-lab-v20260805';
const CONTRACT_VERSION = '2.7.8';
const LIFECYCLE_REL = 'tools/orbit360-validator-lifecycle-contract-visual-matrix-corrected-post-auth-lab-v20260805.json';
const REQUEST_REL = process.env.ORBIT360_REQUEST_FILE || '';
const OUT_REL = 'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json';

const ROOTFIX_STATIC_REL = 'orbit360-platform/runtime-gate-crm-v20260716/visual-runtime-rootfix-source-test-sanitized-v20260805.json';
const HYDRATION_STATIC_REL = 'orbit360-platform/runtime-gate-crm-v20260716/visual-hydration-direct-source-validation-sanitized-v20260805.json';
const CAPTURE_STATIC_REL = 'orbit360-platform/runtime-gate-crm-v20260716/visual-capture-v2-sourcefix-sanitized-v20260805.json';
const WRAPPER_STATIC_REL = 'orbit360-platform/runtime-gate-crm-v20260716/visual-rootfix-readonly-wrapper-sourcefix-sanitized-v20260805.json';
const PREVIOUS_STOP_REL = 'orbit360-platform/runtime-gate-crm-v20260716/visual-observable-rootfix-v2-governing-stop-sanitized-v20260805.json';
const PACKAGE_STATIC_REL = 'orbit360-platform/runtime-gate-crm-v20260716/visual-matrix-gate-package-source-test-sanitized-v20260805.json';

const ROOTFIX_REL = 'orbit360-platform/core/visual-runtime-rootfix-v20260805.js';
const MATRIX_REL = 'tools/orbit360-visual-runtime-rootfix-observable-matrix-v20260805.mjs';
const PRECHECK_REL = 'tools/orbit360-visual-runtime-rootfix-browser-precheck-v20260805.mjs';
const RUNNER_REL = 'tools/orbit360-run-visual-matrix-corrected-post-auth-runtime-only-v20260805.sh';
const SEALER_REL = 'tools/orbit360-seal-visual-matrix-corrected-post-auth-runtime-v20260805.mjs';

const abs = rel => path.join(ROOT, rel);
const exists = rel => Boolean(rel) && fs.existsSync(abs(rel));
const readJson = rel => JSON.parse(fs.readFileSync(abs(rel), 'utf8'));
const readText = rel => fs.readFileSync(abs(rel), 'utf8');
const syntaxOk = rel => spawnSync(process.execPath, ['--check', abs(rel)], { encoding: 'utf8' }).status === 0;
const write = payload => {
  fs.mkdirSync(path.dirname(abs(OUT_REL)), { recursive: true });
  fs.writeFileSync(abs(OUT_REL), JSON.stringify(payload, null, 2) + '\n', 'utf8');
};

function exactObject(actual, expected) {
  return JSON.stringify(actual || {}) === JSON.stringify(expected);
}

try {
  const lifecycle = readJson(LIFECYCLE_REL);
  const request = readJson(REQUEST_REL);
  const rootfixStatic = readJson(ROOTFIX_STATIC_REL);
  const hydrationStatic = readJson(HYDRATION_STATIC_REL);
  const captureStatic = readJson(CAPTURE_STATIC_REL);
  const wrapperStatic = readJson(WRAPPER_STATIC_REL);
  const previousStop = readJson(PREVIOUS_STOP_REL);
  const packageStatic = readJson(PACKAGE_STATIC_REL);
  const matrix = readText(MATRIX_REL);
  const rootfix = readText(ROOTFIX_REL);
  const runner = readText(RUNNER_REL);
  const expectedCaps = {
    secrets: true,
    firestoreRead: true,
    writes: false,
    runtime: true,
    browser: true,
    deploy: true,
    functionsDeploy: false,
    rulesDeploy: false,
    production: false
  };

  const scope = request.scope || {};
  const checks = {
    gateArgument: process.argv[2] === GATE_ID,
    lifecycleIdentity:
      lifecycle.gateId === GATE_ID &&
      lifecycle.gateContractVersion === CONTRACT_VERSION &&
      lifecycle.validatorLifecycleRevision === 'phase-capability-contract-v1',
    lifecyclePhase:
      lifecycle.currentPhase === 'VISUAL_MATRIX_CORRECTED_POST_AUTH_LAB_EXECUTION' &&
      lifecycle.executionProfile &&
      lifecycle.executionProfile.phase === 'VISUAL_MATRIX_CORRECTED_POST_AUTH_LAB_EXECUTION',
    exactCapabilities: exactObject(lifecycle.executionProfile && lifecycle.executionProfile.capabilities, expectedCaps),
    authorizationReserved:
      lifecycle.status === 'AUTHORIZED_ONCE_PENDING_EXCLUSIVE_REQUEST' &&
      lifecycle.authorizationReserved === true &&
      lifecycle.allowedExecutions === 1 &&
      lifecycle.requestConsumed === false &&
      lifecycle.replayAllowed === false,
    executionBoundaries:
      lifecycle.executionAuthorized === true &&
      lifecycle.secretAccessAuthorized === true &&
      lifecycle.firestoreReadAuthorized === true &&
      lifecycle.writeAuthorized === false &&
      lifecycle.browserAuthorized === true &&
      lifecycle.hostingDeployAuthorized === true &&
      lifecycle.functionsDeployAuthorized === false &&
      lifecycle.rulesDeployAuthorized === false &&
      lifecycle.productionAuthorized === false &&
      lifecycle.mainAuthorized === false &&
      lifecycle.mergeAuthorized === false,
    requestPath:
      REQUEST_REL === '.github/orbit360-requests/visual-matrix-corrected-post-auth-lab-v20260805-authorization.json',
    requestSchema: request.schemaVersion === 'orbit360-visual-matrix-corrected-post-auth-request-v1',
    requestIdentity:
      request.gateId === GATE_ID &&
      request.contractVersion === CONTRACT_VERSION &&
      request.rcId === 'RC-AYS-LAB-CANONICA-01' &&
      request.branch === 'ays/backend-tenant-lab-v99-20260703' &&
      request.pullRequest === 5 &&
      request.projectId === 'ays-orbit-360-lab' &&
      request.tenantId === 'alianzas-soluciones',
    requestAuthorization:
      request.status === 'AUTHORIZED_ONCE' &&
      request.approved === true &&
      request.allowedExecutions === 1 &&
      request.consumed === false &&
      request.replayAllowed === false,
    requestCapabilities: exactObject(request.capabilities, expectedCaps),
    requestParentHead: typeof request.parentHead === 'string' && /^[a-f0-9]{40}$/.test(request.parentHead),
    requestScope:
      scope.hostingOnly === true &&
      scope.hostingDeploysMaximum === 1 &&
      scope.hostingBackupClone === true &&
      scope.hostingRollbackCloneOnFailure === true &&
      scope.precheckRequiredBeforeMatrix === true &&
      scope.functionsDeploy === false &&
      scope.rulesDeploy === false &&
      scope.firestoreWrites === false &&
      scope.authWrites === false &&
      scope.operationalWrites === false &&
      scope.reimport === false &&
      scope.production === false &&
      scope.main === false &&
      scope.merge === false &&
      scope.directionDesktop === true &&
      scope.operationalTablet === true &&
      scope.advisorMobile === true &&
      scope.viewportCaptureOnly === true &&
      scope.captureWarningsNonBlocking === true,
    rootfixStaticPass:
      rootfixStatic.status === 'PASS_VISUAL_RUNTIME_ROOTFIX_SOURCE' &&
      rootfixStatic.total === 28 &&
      rootfixStatic.failed === 0 &&
      rootfixStatic.ok === true,
    hydrationStaticPass:
      hydrationStatic.status === 'PASS_DIRECT_SOURCE_VALIDATION' &&
      hydrationStatic.total === 24 &&
      hydrationStatic.failed === 0 &&
      hydrationStatic.ok === true,
    captureStaticPass:
      captureStatic.status === 'PASS_VISUAL_CAPTURE_SOURCEFIX' &&
      captureStatic.total === 20 &&
      captureStatic.failed === 0 &&
      captureStatic.ok === true &&
      captureStatic.browserExecuted === false &&
      captureStatic.deployExecuted === false,
    wrapperStaticPass:
      wrapperStatic.status === 'PASS_READONLY_MODULE_WRAPPER_SOURCEFIX' &&
      wrapperStatic.total === 15 &&
      wrapperStatic.failed === 0 &&
      wrapperStatic.ok === true &&
      wrapperStatic.browserExecuted === false &&
      wrapperStatic.deployExecuted === false,
    packageStaticPass:
      packageStatic.status === 'PASS_VISUAL_MATRIX_GATE_PACKAGE_SOURCE_ONLY' &&
      packageStatic.failed === 0 &&
      packageStatic.ok === true &&
      packageStatic.generatorRetired === true &&
      packageStatic.secretsRead === false &&
      packageStatic.browserExecuted === false &&
      packageStatic.deployExecuted === false,
    previousRunConsumed:
      previousStop.runId === '31067506016' &&
      previousStop.decision === 'STOP_RETRY' &&
      previousStop.authorizationConsumed === true &&
      previousStop.replayAllowed === false &&
      previousStop.exactFailureCheckpoint === 'DIRECCION_SCREENSHOT_FULLPAGE_TIMEOUT',
    correctedCapture:
      matrix.includes('const CAPTURE_TIMEOUT_MS = 12000;') &&
      matrix.includes('fullPage: false') &&
      !matrix.includes('fullPage: true') &&
      matrix.includes('blocking: false'),
    immutableWrapper:
      rootfix.includes('moduleWrapState') &&
      rootfix.includes('observer-fallback') &&
      rootfix.includes('Object.isFrozen'),
    sourceFilesExist: [
      ROOTFIX_REL,
      MATRIX_REL,
      PRECHECK_REL,
      RUNNER_REL,
      SEALER_REL
    ].every(exists),
    sourceSyntax: [
      ROOTFIX_REL,
      MATRIX_REL,
      PRECHECK_REL,
      SEALER_REL
    ].every(syntaxOk),
    runnerNoOperationalWrites:
      !/runTransaction|writeBatch|\.set\(|\.update\(|\.delete\(|createUser|updateUser|deleteUser/.test(runner),
    runnerHostingOnly:
      runner.includes('firebase deploy --project "$PROJECT" --only hosting') &&
      !runner.includes('--only functions') &&
      !runner.includes('--only firestore:rules'),
    browserMatrix:
      Array.isArray(lifecycle.browserMatrix) &&
      lifecycle.browserMatrix.length === 3 &&
      lifecycle.browserMatrix.some(x => x.role === 'Direccion' && x.width === 1440 && x.height === 1000) &&
      lifecycle.browserMatrix.some(x => x.role === 'Operativo' && x.width === 1024 && x.height === 768) &&
      lifecycle.browserMatrix.some(x => x.role === 'Asesor' && x.width === 390 && x.height === 844),
    hostingBoundary:
      lifecycle.hostingTarget === 'ays-orbit-360-lab' &&
      lifecycle.hostingDeploysMaximum === 1 &&
      lifecycle.hostingBackupCloneAuthorized === true &&
      lifecycle.hostingRollbackCloneAuthorizedOnFailure === true &&
      lifecycle.functionsDeploysMaximum === 0 &&
      lifecycle.rulesDeploysMaximum === 0,
    protectedWritesZero:
      lifecycle.protectedState &&
      lifecycle.protectedState.firestoreWritesAuthorized === 0 &&
      lifecycle.protectedState.authWritesAuthorized === 0 &&
      lifecycle.protectedState.operationalWritesAuthorized === 0 &&
      lifecycle.protectedState.functionsDeploysAuthorized === 0 &&
      lifecycle.protectedState.rulesDeploysAuthorized === 0 &&
      lifecycle.protectedState.reimportAuthorized === false &&
      lifecycle.protectedState.productionAuthorized === false
  };

  const failedCheckIds = Object.entries(checks).filter(([, ok]) => !ok).map(([id]) => id);
  const output = {
    schemaVersion: 'orbit360-visual-matrix-corrected-post-auth-preflight-v2',
    gateId: GATE_ID,
    contractVersion: CONTRACT_VERSION,
    status: failedCheckIds.length ? 'STOP_GATE_CONTRACT' : 'GO_GATE_CONTRACT',
    classification: failedCheckIds.length ? 'DATA_CONTRACT_FAILURE' : 'GO_VISUAL_MATRIX_CORRECTED_POST_AUTH',
    total: Object.keys(checks).length,
    passed: Object.values(checks).filter(Boolean).length,
    failed: failedCheckIds.length,
    failedCheckIds,
    checks,
    executionAuthorized: failedCheckIds.length === 0,
    secretAccessAuthorized: failedCheckIds.length === 0,
    firestoreReadAuthorized: failedCheckIds.length === 0,
    writeAuthorized: false,
    runtimeAuthorized: failedCheckIds.length === 0,
    browserAuthorized: failedCheckIds.length === 0,
    deployAuthorized: failedCheckIds.length === 0,
    hostingDeployAuthorized: failedCheckIds.length === 0,
    hostingTarget: 'ays-orbit-360-lab',
    hostingDeploysMaximum: 1,
    hostingBackupCloneAuthorized: failedCheckIds.length === 0,
    hostingRollbackCloneAuthorizedOnFailure: failedCheckIds.length === 0,
    functionsDeployAuthorized: false,
    rulesDeployAuthorized: false,
    productionAuthorized: false,
    firestoreWritesAuthorized: 0,
    authWritesAuthorized: 0,
    operationalWritesAuthorized: 0,
    dataAccess: false,
    secretAccess: false,
    firestoreReads: 0,
    firestoreWrites: 0,
    authWrites: 0,
    operationalWrites: 0,
    runtimeExecuted: false,
    browserExecuted: false,
    deployExecuted: false,
    productionTouched: false,
    containsPII: false,
    containsSecrets: false,
    containsPasswords: false,
    ok: failedCheckIds.length === 0
  };
  write(output);
  console.log(JSON.stringify(output, null, 2));
  process.exit(output.ok ? 0 : 41);
} catch (error) {
  const output = {
    schemaVersion: 'orbit360-visual-matrix-corrected-post-auth-preflight-v2',
    gateId: GATE_ID,
    contractVersion: CONTRACT_VERSION,
    status: 'STOP_GATE_CONTRACT',
    classification: 'PIPELINE_MECHANISM_FAILURE',
    total: 1,
    passed: 0,
    failed: 1,
    failedCheckIds: ['ENGINE_EXCEPTION'],
    error: String(error && error.message || error).slice(0, 700),
    dataAccess: false,
    secretAccess: false,
    firestoreReads: 0,
    firestoreWrites: 0,
    authWrites: 0,
    operationalWrites: 0,
    runtimeExecuted: false,
    browserExecuted: false,
    deployExecuted: false,
    productionTouched: false,
    containsPII: false,
    containsSecrets: false,
    containsPasswords: false,
    ok: false
  };
  write(output);
  console.error(JSON.stringify(output, null, 2));
  process.exit(41);
}
