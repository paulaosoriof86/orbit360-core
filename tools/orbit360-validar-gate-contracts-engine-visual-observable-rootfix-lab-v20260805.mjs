#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const GATE_ID = 'block2.7-visual-observable-rootfix-lab-v20260805';
const CONTRACT_VERSION = '2.7.3';
const LIFECYCLE_REL = 'tools/orbit360-validator-lifecycle-contract-visual-observable-rootfix-lab-v20260805.json';
const STATIC_REL = 'orbit360-platform/runtime-gate-crm-v20260716/visual-runtime-rootfix-source-test-sanitized-v20260805.json';
const STALE_CLOSURE_REL = 'orbit360-platform/runtime-gate-crm-v20260716/visual-validator-stale-source-closure-sanitized-v20260805.json';
const ROOTFIX_REL = 'orbit360-platform/core/visual-runtime-rootfix-v20260805.js';
const LOADER_REL = 'orbit360-platform/core/backend-lab-loader.js';
const PRECHECK_REL = 'tools/orbit360-visual-runtime-rootfix-browser-precheck-v20260805.mjs';
const MATRIX_REL = 'tools/orbit360-visual-runtime-rootfix-observable-matrix-v20260805.mjs';
const OUT_REL = 'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json';
const REQUEST_REL = process.env.ORBIT360_REQUEST_FILE || '';

const read = rel => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const text = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = rel => !!rel && fs.existsSync(path.join(ROOT, rel));
const syntaxOk = rel => {
  const result = spawnSync(process.execPath, ['--check', path.join(ROOT, rel)], { encoding: 'utf8' });
  return result.status === 0;
};
const write = payload => {
  const target = path.join(ROOT, OUT_REL);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(payload, null, 2) + '\n', 'utf8');
};

try {
  const lifecycle = read(LIFECYCLE_REL);
  const request = read(REQUEST_REL);
  const staticEvidence = read(STATIC_REL);
  const staleClosure = read(STALE_CLOSURE_REL);
  const rootfix = text(ROOTFIX_REL);
  const loader = text(LOADER_REL);
  const precheck = text(PRECHECK_REL);
  const matrix = text(MATRIX_REL);
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
  const caps = lifecycle.executionProfile && lifecycle.executionProfile.capabilities || {};
  const checks = {
    gateArgument: process.argv[2] === GATE_ID,
    lifecycleGate: lifecycle.gateId === GATE_ID,
    contractVersion: lifecycle.gateContractVersion === CONTRACT_VERSION,
    lifecycleRevision: lifecycle.validatorLifecycleRevision === 'phase-capability-contract-v1',
    lifecyclePhase: lifecycle.executionProfile && lifecycle.executionProfile.phase === 'VISUAL_OBSERVABLE_ROOTFIX_LAB_EXECUTION',
    exactCapabilities: JSON.stringify(caps) === JSON.stringify(expectedCaps),
    lifecycleAuthorizedOnce: lifecycle.status === 'AUTHORIZED_ONCE_PENDING_PREFLIGHT'
      && lifecycle.executionAuthorized === true
      && lifecycle.secretAccessAuthorized === true
      && lifecycle.firestoreReadAuthorized === true
      && lifecycle.writeAuthorized === false
      && lifecycle.browserAuthorized === true
      && lifecycle.hostingDeployAuthorized === true
      && lifecycle.functionsDeployAuthorized === false
      && lifecycle.rulesDeployAuthorized === false
      && lifecycle.productionAuthorized === false
      && lifecycle.allowedExecutions === 1
      && lifecycle.requestConsumed === false
      && lifecycle.replayAllowed === false,
    requestPath: /^\.github\/orbit360-requests\/visual-observable-rootfix-lab-v20260805-[a-z0-9-]+\.json$/.test(REQUEST_REL),
    requestSchema: request.schemaVersion === 'orbit360-visual-observable-rootfix-lab-request-v1',
    requestScope: request.gateId === GATE_ID
      && request.contractVersion === CONTRACT_VERSION
      && request.rcId === 'RC-AYS-LAB-CANONICA-01'
      && request.branch === 'ays/backend-tenant-lab-v99-20260703'
      && request.pullRequest === 5
      && request.projectId === 'ays-orbit-360-lab'
      && request.tenantId === 'alianzas-soluciones',
    requestAuthorization: request.status === 'AUTHORIZED_ONCE'
      && request.approved === true
      && request.allowedExecutions === 1
      && request.consumed === false
      && request.replayAllowed === false,
    requestCapabilities: JSON.stringify(request.capabilities || {}) === JSON.stringify(expectedCaps),
    requestBoundaries: request.scope
      && request.scope.hostingDeploysMaximum === 1
      && request.scope.hostingOnly === true
      && request.scope.hostingBackupClone === true
      && request.scope.hostingRollbackCloneOnFailure === true
      && request.scope.precheckRequiredBeforeMatrix === true
      && request.scope.functionsDeploy === false
      && request.scope.rulesDeploy === false
      && request.scope.firestoreWrites === false
      && request.scope.authWrites === false
      && request.scope.operationalWrites === false
      && request.scope.reimport === false
      && request.scope.production === false
      && request.scope.main === false
      && request.scope.merge === false
      && request.scope.directionDesktop === true
      && request.scope.operationalTablet === true
      && request.scope.advisorMobile === true,
    staticRootfixPass: staticEvidence.status === 'PASS_VISUAL_RUNTIME_ROOTFIX_SOURCE'
      && staticEvidence.total === 28 && staticEvidence.passed === 28 && staticEvidence.failed === 0 && staticEvidence.ok === true,
    staleClosurePass: staleClosure.status === 'PASS_VISUAL_VALIDATOR_STALE_SOURCE_CLOSURE'
      && staleClosure.classification === 'VALIDATOR_STALE_CLOSED_SOURCE_ONLY'
      && staleClosure.total === 15 && staleClosure.passed === 15 && staleClosure.failed === 0 && staleClosure.ok === true,
    sourceFilesExist: [ROOTFIX_REL, LOADER_REL, PRECHECK_REL, MATRIX_REL].every(exists),
    sourceSyntax: [ROOTFIX_REL, LOADER_REL, PRECHECK_REL, MATRIX_REL].every(syntaxOk),
    rootfixBoundary: rootfix.includes("var VERSION = '20260805.1'")
      && rootfix.includes('Mantener sesión iniciada en este dispositivo')
      && !/firebase\s+deploy|runTransaction|writeBatch/.test(rootfix),
    loaderReferencesRootfix: loader.includes("write('core/visual-runtime-rootfix-v20260805.js?v=20260805-1')"),
    precheckObservable: precheck.includes("mark('PAGE_GOTO')")
      && precheck.includes("'ROOTFIX_MARKER'")
      && precheck.includes("'FIREBASE_AUTH'")
      && precheck.includes("mark('CUSTOM_TOKEN_SIGNIN')")
      && precheck.includes("'AUTH_INSIDE'")
      && precheck.includes("'INICIO_READY'")
      && precheck.includes('observedState')
      && precheck.includes('failureScreenshot'),
    matrixObservable: matrix.includes('currentCheckpoint')
      && matrix.includes('checkpoints')
      && matrix.includes('observedState')
      && matrix.includes('failureScreenshot')
      && matrix.includes("role: 'Direccion'")
      && matrix.includes("role: 'Operativo'")
      && matrix.includes("role: 'Asesor'"),
    hostingBoundary: lifecycle.hostingTarget === 'ays-orbit-360-lab'
      && lifecycle.hostingDeploysMaximum === 1
      && lifecycle.hostingBackupCloneAuthorized === true
      && lifecycle.hostingRollbackCloneAuthorizedOnFailure === true
      && lifecycle.functionsDeploysMaximum === 0
      && lifecycle.rulesDeploysMaximum === 0,
    browserMatrix: Array.isArray(lifecycle.browserMatrix)
      && lifecycle.browserMatrix.length === 3
      && lifecycle.browserMatrix.some(x => x.role === 'Direccion' && x.width === 1440 && x.height === 1000)
      && lifecycle.browserMatrix.some(x => x.role === 'Operativo' && x.width === 1024 && x.height === 768)
      && lifecycle.browserMatrix.some(x => x.role === 'Asesor' && x.width === 390 && x.height === 844),
    protectedWritesZero: lifecycle.protectedState
      && lifecycle.protectedState.firestoreWritesAuthorized === 0
      && lifecycle.protectedState.authWritesAuthorized === 0
      && lifecycle.protectedState.operationalWritesAuthorized === 0
      && lifecycle.protectedState.functionsDeploysAuthorized === 0
      && lifecycle.protectedState.rulesDeploysAuthorized === 0
  };
  const failedCheckIds = Object.entries(checks).filter(([, ok]) => !ok).map(([id]) => id);
  const output = {
    schemaVersion: 'orbit360-visual-observable-rootfix-lab-preflight-v1',
    gateId: GATE_ID,
    contractVersion: CONTRACT_VERSION,
    status: failedCheckIds.length ? 'STOP_GATE_CONTRACT' : 'GO_GATE_CONTRACT',
    classification: failedCheckIds.length ? 'DATA_CONTRACT_FAILURE' : 'GO_VISUAL_OBSERVABLE_ROOTFIX_LAB',
    total: Object.keys(checks).length,
    passed: Object.values(checks).filter(Boolean).length,
    failed: failedCheckIds.length,
    failedCheckIds,
    checks,
    executionAuthorized: !failedCheckIds.length,
    secretAccessAuthorized: !failedCheckIds.length,
    firestoreReadAuthorized: !failedCheckIds.length,
    writeAuthorized: false,
    runtimeAuthorized: !failedCheckIds.length,
    browserAuthorized: !failedCheckIds.length,
    deployAuthorized: !failedCheckIds.length,
    hostingDeployAuthorized: !failedCheckIds.length,
    hostingTarget: 'ays-orbit-360-lab',
    hostingDeploysMaximum: 1,
    hostingBackupCloneAuthorized: !failedCheckIds.length,
    hostingRollbackCloneAuthorizedOnFailure: !failedCheckIds.length,
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
    schemaVersion: 'orbit360-visual-observable-rootfix-lab-preflight-v1',
    gateId: GATE_ID,
    contractVersion: CONTRACT_VERSION,
    status: 'STOP_GATE_CONTRACT',
    classification: 'PIPELINE_MECHANISM_FAILURE',
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
