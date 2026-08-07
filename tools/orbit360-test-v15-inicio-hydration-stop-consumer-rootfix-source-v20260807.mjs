#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const rel = p => path.join(ROOT, p);
const files = {
  hydration: rel('orbit360-platform/core/visual-runtime-hydration-contract-v20260805.js'),
  precheck: rel('tools/orbit360-visual-runtime-rootfix-browser-precheck-v20260805.mjs'),
  consumer: rel('tools/orbit360-consume-visual-matrix-request-on-stop-v20260807.mjs'),
  sealer: rel('tools/orbit360-seal-visual-matrix-corrected-post-auth-runtime-v20260805.mjs'),
  relay: rel('.github/workflows/orbit360-claude-paquete-reconciliado-v1205.yml'),
  v15Evidence: rel('orbit360-platform/runtime-gate-crm-v20260716/visual-matrix-corrected-post-auth-precheck-sanitized-v20260805.json')
};
const read = file => fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
const json = file => JSON.parse(read(file));
const checks = {};

checks.filesExist = Object.values(files).every(fs.existsSync);
const hydration = read(files.hydration);
const precheck = read(files.precheck);
const consumer = read(files.consumer);
const sealer = read(files.sealer);
const relay = read(files.relay);
const v15 = json(files.v15Evidence);

checks.v15ObservedExactFailure =
  v15.checkpoint === 'INICIO_READY_TIMEOUT' &&
  v15.observedState?.membershipReady === true &&
  v15.observedState?.membershipTenantBound === true &&
  v15.observedState?.rootfixLoaded === true &&
  v15.observedState?.loadingVisible === true &&
  Array.isArray(v15.observedState?.lab?.snapshotErrorKeys) &&
  v15.observedState.lab.snapshotErrorKeys.includes('asesores') &&
  !v15.observedState.lab.rawCountKeys.includes('asesores');

checks.inicioCanonicalRequiredOptionalContract =
  hydration.includes("inicio: { required: ['clientes', 'polizas', 'cobros', 'aseguradoras'], optional: ['asesores', 'metas', 'negocios', 'gestiones'] }");
checks.hydrationRebindTracksStoreIdentity =
  hydration.includes('var installedStore = null;') &&
  hydration.includes('if (installedStore !== Orbit.store)') &&
  hydration.includes('installedStore = Orbit.store;') &&
  hydration.includes("document.body.dataset.visualHydrationContractStoreBound = 'true'");
checks.hydrationMountedDiagnostic =
  hydration.includes('mounted: function ()') &&
  hydration.includes('installedStore === Orbit.store') &&
  hydration.includes('Orbit.store.__visualHydrationContractV20260805');
checks.hydrationBootKeepsRevalidating =
  hydration.includes('install();') && hydration.includes("installed ? 100 : 20");
checks.precheckRequiresHydrationMounted =
  precheck.includes("'HYDRATION_CONTRACT_MOUNTED'") &&
  precheck.includes('OrbitHydrationContractDiagnostics.mounted()');
checks.precheckRequiresInicioCanonicalReadiness =
  precheck.includes("'INICIO_REQUIRED_HYDRATION'") &&
  precheck.includes("OrbitHydrationContractDiagnostics") &&
  precheck.includes("status('inicio')") &&
  precheck.includes('state.ready === true');
checks.precheckOrderIsContractBeforeInicio =
  precheck.indexOf("'HYDRATION_CONTRACT_MOUNTED'") >= 0 &&
  precheck.indexOf("'INICIO_REQUIRED_HYDRATION'") > precheck.indexOf("'HYDRATION_CONTRACT_MOUNTED'") &&
  precheck.indexOf("'INICIO_READY'") > precheck.indexOf("'INICIO_REQUIRED_HYDRATION'");
checks.consumerSupportsPartialConsumedState =
  consumer.includes('partiallyOrFullyConsumedState') &&
  consumer.includes("PASS_AUTOMATIC_STOP_COMPLETED_FROM_CONSUMED_STATE") &&
  !consumer.includes('STOP_REQUEST_CONSUMPTION_INVALID_ACTIVE_STATE');
checks.sealerClosesLifecycleAndOverlay =
  sealer.includes('const OVERLAY = process.env.ORBIT360_OVERLAY;') &&
  sealer.includes('lifecycle.authorizationFrozen = true;') &&
  sealer.includes('lifecycle.stopRetryActive = !pass;') &&
  sealer.includes("expectedNextRequestVersion: 'NONE_PENDING_FRESH_AUTHORIZATION'") &&
  sealer.includes('runtimeAllowed: false') &&
  sealer.includes('hostingAllowed: false');
checks.relayCurrentlyFailClosedOrConsumedDetectorSafe =
  relay.includes('ORBIT360_EXPECTED_REQUEST_VERSION: NONE_PENDING_FRESH_AUTHORIZATION') ||
  relay.includes('detect-active-request');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit360-v15-rootfix-'));
const requestPath = path.join(tmp, 'request.json');
const lifecyclePath = path.join(tmp, 'lifecycle.json');
const overlayPath = path.join(tmp, 'overlay.json');
const evidencePath = path.join(tmp, 'evidence.json');

const partialRequest = {
  schemaVersion: 'orbit360-visual-matrix-corrected-post-auth-request-v1',
  requestVersion: 'synthetic-v15-partial-consumed',
  status: 'CONSUMED',
  approved: true,
  allowedExecutions: 0,
  consumed: true,
  authorizationFrozen: false,
  replayAllowed: false,
  capabilities: { secrets:true, firestoreRead:true, writes:false, runtime:true, browser:true, deploy:true, functionsDeploy:false, rulesDeploy:false, production:false },
  scope: { restorePriorBaselineBeforeRuntime:true, hostingDeploysMaximum:1, hostingBackupClone:true, hostingRollbackCloneOnFailure:true, functionsDeploy:false, rulesDeploy:false, firestoreWrites:false, authWrites:false, operationalWrites:false, reimport:false, production:false, main:false, merge:false },
  executionResult: { checkpoint:'INICIO_READY_TIMEOUT', hostingDeploys:1, snapshotIntegrity:'VERIFIED_UNCHANGED' }
};
const lifecycle = {
  status:'CONSUMED_STOP_RETRY', currentPhase:'CONSUMED_STOP_RETRY', stopRetryActive:false,
  executionProfile:{ mode:'RUNTIME_ONCE_ONLY_WITH_FRESH_EXCLUSIVE_REQUEST', phase:'VISUAL_MATRIX_CORRECTED_POST_AUTH_LAB_EXECUTION', capabilities:partialRequest.capabilities },
  protectedState:{ passVisualPostAuth:false }, allowedExecutions:0, requestConsumed:true,
  executionAuthorized:false, secretAccessAuthorized:false, browserAuthorized:false, hostingDeployAuthorized:false
};
const overlay = {
  status:'AUTHORIZED_ONCE_PENDING_EXCLUSIVE_REQUEST', stopRetryActive:false, runtimeAllowed:true, browserAllowed:true, hostingAllowed:true,
  productionAllowed:false, writesAllowed:false, functionsAllowed:false, rulesAllowed:false, reimportAllowed:false
};
const evidence = {
  status:'STOP_RETRY_VISUAL_MATRIX_CORRECTED_POST_AUTH', decision:'STOP_RETRY', classification:'VALIDATOR_STALE_OR_PRODUCT_WAIT_IDENTIFIED',
  checkpoint:'INICIO_READY_TIMEOUT', preflightStatus:'GO_GATE_CONTRACT', secretAccessed:true, hostingDeployAttempted:true, hostingDeploys:1,
  hostingRollbackRestored:true, browserExecuted:true, snapshotIntegrity:'VERIFIED_UNCHANGED', firestoreWrites:0, authWrites:0, operationalWrites:0,
  productionTouched:false
};
fs.writeFileSync(requestPath, JSON.stringify(partialRequest), 'utf8');
fs.writeFileSync(lifecyclePath, JSON.stringify(lifecycle), 'utf8');
fs.writeFileSync(overlayPath, JSON.stringify(overlay), 'utf8');
fs.writeFileSync(evidencePath, JSON.stringify(evidence), 'utf8');

const env = { ...process.env, GITHUB_RUN_ID:'synthetic-v15', GITHUB_RUN_ATTEMPT:'1' };
const firstConsume = spawnSync(process.execPath, [files.consumer, requestPath, lifecyclePath, overlayPath, evidencePath], { encoding:'utf8', env });
const frozenRequest = JSON.parse(fs.readFileSync(requestPath, 'utf8'));
const frozenLifecycle = JSON.parse(fs.readFileSync(lifecyclePath, 'utf8'));
const frozenOverlay = JSON.parse(fs.readFileSync(overlayPath, 'utf8'));
checks.partialConsumedStateCompleted =
  firstConsume.status === 0 && frozenRequest.consumed === true && frozenRequest.allowedExecutions === 0 && frozenRequest.authorizationFrozen === true && frozenRequest.replayAllowed === false &&
  frozenRequest.capabilities.runtime === false && frozenRequest.scope.hostingDeploysMaximum === 0 &&
  frozenLifecycle.stopRetryActive === true && frozenLifecycle.authorizationFrozen === true && frozenLifecycle.executionProfile.capabilities.runtime === false &&
  frozenOverlay.stopRetryActive === true && frozenOverlay.runtimeAllowed === false && frozenOverlay.hostingAllowed === false && frozenOverlay.expectedNextRequestVersion === 'NONE_PENDING_FRESH_AUTHORIZATION';

const secondConsume = spawnSync(process.execPath, [files.consumer, requestPath, lifecyclePath, overlayPath, evidencePath], { encoding:'utf8', env });
const frozenAgain = JSON.parse(fs.readFileSync(requestPath, 'utf8'));
checks.stopConsumerIdempotent =
  secondConsume.status === 0 && frozenAgain.consumed === true && frozenAgain.allowedExecutions === 0 && frozenAgain.authorizationFrozen === true && frozenAgain.replayAllowed === false;

const sealDir = path.join(tmp, 'seal');
fs.mkdirSync(sealDir, { recursive:true });
const pf = path.join(sealDir, 'preflight.json');
const pc = path.join(sealDir, 'precheck.json');
const mx = path.join(sealDir, 'matrix.json');
const lf = path.join(sealDir, 'lifecycle.json');
const ov = path.join(sealDir, 'overlay.json');
const fn = path.join(sealDir, 'final.json');
const cl = path.join(sealDir, 'closure.md');
fs.writeFileSync(pf, JSON.stringify({ status:'GO_GATE_CONTRACT', total:28 }), 'utf8');
fs.writeFileSync(pc, JSON.stringify({ ok:false, stage:'FAIL_VISUAL_BROWSER_PRECHECK', checkpoint:'INICIO_READY_TIMEOUT', classification:'VALIDATOR_STALE_OR_PRODUCT_WAIT_IDENTIFIED', snapshotIntegrity:'VERIFIED_UNCHANGED', firestoreReads:1 }), 'utf8');
fs.writeFileSync(mx, JSON.stringify({ ok:false, stage:'NOT_EXECUTED', firestoreReads:0 }), 'utf8');
fs.writeFileSync(lf, JSON.stringify({ executionProfile:{ capabilities:partialRequest.capabilities }, protectedState:{}, allowedExecutions:1, authorizationFrozen:false, stopRetryActive:false, hostingDeploysMaximum:1, hostingBackupCloneAuthorized:true, hostingRollbackCloneAuthorizedOnFailure:true, priorHostingRestoreAuthorized:true }), 'utf8');
fs.writeFileSync(ov, JSON.stringify({ runtimeAllowed:true, browserAllowed:true, hostingAllowed:true, stopRetryActive:false }), 'utf8');
const sealEnv = {
  ...env,
  ORBIT360_PREFLIGHT_EVIDENCE:pf, ORBIT360_PRECHECK_EVIDENCE:pc, ORBIT360_MATRIX_EVIDENCE:mx,
  ORBIT360_FINAL_EVIDENCE:fn, ORBIT360_LIFECYCLE:lf, ORBIT360_OVERLAY:ov, ORBIT360_CLOSURE:cl,
  REGISTRATION_OUTCOME:'success', PREFLIGHT_OUTCOME:'success', CREDENTIAL_OUTCOME:'success', RUNTIME_OUTCOME:'success',
  BACKUP_OUTCOME:'success', DEPLOY_OUTCOME:'success', PRECHECK_OUTCOME:'failure', MATRIX_OUTCOME:'skipped', ROLLBACK_OUTCOME:'success', DEPLOY_ATTEMPTED:'1'
};
const sealRun = spawnSync(process.execPath, [files.sealer], { encoding:'utf8', env:sealEnv });
const sealedLifecycle = JSON.parse(fs.readFileSync(lf, 'utf8'));
const sealedOverlay = JSON.parse(fs.readFileSync(ov, 'utf8'));
const sealedFinal = JSON.parse(fs.readFileSync(fn, 'utf8'));
checks.sealerTerminalFailClosedSynthetic =
  sealRun.status === 0 && sealedFinal.decision === 'STOP_RETRY' && sealedFinal.checkpoint === 'INICIO_READY_TIMEOUT' && sealedFinal.authorizationFrozen === true &&
  sealedLifecycle.stopRetryActive === true && sealedLifecycle.authorizationFrozen === true && sealedLifecycle.allowedExecutions === 0 && sealedLifecycle.executionProfile.capabilities.runtime === false &&
  sealedOverlay.stopRetryActive === true && sealedOverlay.runtimeAllowed === false && sealedOverlay.hostingAllowed === false && sealedOverlay.expectedNextRequestVersion === 'NONE_PENDING_FRESH_AUTHORIZATION';

const failedCheckIds = Object.entries(checks).filter(([, ok]) => !ok).map(([id]) => id);
const output = {
  schemaVersion:'orbit360-v15-inicio-hydration-stop-consumer-rootfix-source-v1',
  generatedAt:'2026-08-07T08:30:00-06:00',
  gateId:'block2.7-visual-matrix-corrected-post-auth-lab-v20260805',
  status:failedCheckIds.length ? 'STOP_V15_ROOTFIX_SOURCE' : 'PASS_V15_INICIO_HYDRATION_STOP_CONSUMER_ROOTFIX_SOURCE_ONLY',
  classification:failedCheckIds.length ? 'PIPELINE_MECHANISM_FAILURE' : 'PIPELINE_MECHANISM_FAILURE_CORRECTED_SOURCE_ONLY',
  immediateRuntimeFailure:'INICIO_READY_TIMEOUT',
  rootCauses:[
    'HYDRATION_CONTRACT_RUNTIME_COMPOSITION_NOT_PROVEN',
    'STOP_CONSUMER_PARTIAL_CONSUMED_STATE_NOT_IDEMPOTENT'
  ],
  total:Object.keys(checks).length,
  passed:Object.values(checks).filter(Boolean).length,
  failed:failedCheckIds.length,
  failedCheckIds,
  checks,
  runtimeExecuted:false,
  secretsRead:false,
  firebaseAccess:false,
  hostingTouched:false,
  browserExecuted:false,
  deployExecuted:false,
  firestoreWrites:0,
  authWrites:0,
  operationalWrites:0,
  productionTouched:false,
  containsPII:false,
  containsSecrets:false,
  ok:failedCheckIds.length===0
};
const out = rel('orbit360-platform/runtime-gate-crm-v20260716/v15-inicio-hydration-stop-consumer-rootfix-source-sanitized-v20260807.json');
fs.mkdirSync(path.dirname(out), { recursive:true });
fs.writeFileSync(out, JSON.stringify(output, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(output, null, 2));
process.exit(output.ok ? 0 : 41);
