#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const rel = name => path.join(ROOT, name);
const files = {
  router: rel('tools/orbit360-validar-gate-contracts-v20260717.mjs'),
  engine: rel('tools/orbit360-validar-gate-contracts-engine-visual-matrix-corrected-post-auth-lab-v20260805.mjs'),
  preflight: rel('tools/orbit360-preflight-visual-matrix-runtime-relay-v8-v20260806.sh'),
  guard: rel('tools/orbit360-json-guard-visual-matrix-runtime-v20260806.mjs'),
  transition: rel('tools/orbit360-transition-visual-matrix-lifecycle-source-to-runtime-v20260807.mjs'),
  stopConsumer: rel('tools/orbit360-consume-visual-matrix-request-on-stop-v20260807.mjs'),
  workflow: rel('.github/workflows/orbit360-claude-paquete-reconciliado-v1205.yml'),
  overlay: rel('tools/orbit360-validator-lifecycle-overlay-visual-matrix-v8-stop-preflight-v20260806.json')
};
const read = file => fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
const router = read(files.router);
const engine = read(files.engine);
const preflight = read(files.preflight);
const guard = read(files.guard);
const workflow = read(files.workflow);
const overlay = JSON.parse(read(files.overlay));
const checks = {};
const RUNTIME_PHASE = 'VISUAL_MATRIX_CORRECTED_POST_AUTH_LAB_EXECUTION';
const RUNTIME_STATUS = 'AUTHORIZED_ONCE_PENDING_EXCLUSIVE_REQUEST';
const requiredScopeFields = ['precheckRequiredBeforeMatrix','directionDesktop','operationalTablet','advisorMobile','viewportCaptureOnly'];

const isStopPhase = overlay.stopRetryActive === true && overlay.freshAuthorizationRequired === true && overlay.runtimeAllowed === false && overlay.hostingAllowed === false;
const isAuthorizedPhase = overlay.stopRetryActive === false && overlay.freshAuthorizationRequired === false && overlay.runtimeAllowed === true && overlay.runtimeAllowedOnlyWithFreshExclusiveRequest === true && overlay.hostingAllowed === true;
const workflowArmed = !workflow.includes('ORBIT360_EXPECTED_REQUEST_VERSION: NONE_PENDING_FRESH_AUTHORIZATION');

checks.filesExist = Object.values(files).every(fs.existsSync);
checks.routerPropagatesRequest = router.includes('ORBIT360_REQUEST_FILE: requestFile');
checks.routerGuardsFileType = router.includes('fs.statSync(requestAbs).isFile()');
checks.routerRequiresFreshVersion = router.includes('FRESH_AUTHORIZATION_NOT_REGISTERED') && router.includes('CANONICAL_REQUEST_VERSION_MISMATCH');
checks.routerHonorsStopOverlay = router.includes('STOP_RETRY_ACTIVE_FRESH_AUTHORIZATION_REQUIRED');
checks.routerRequiresRuntimePhase = router.includes(RUNTIME_PHASE) && router.includes('CANONICAL_LIFECYCLE_PHASE_MISMATCH');
checks.engineRequiresRuntimePhase = engine.includes(`lifecycle.currentPhase === '${RUNTIME_PHASE}'`) && engine.includes(`lifecycle.status === '${RUNTIME_STATUS}'`);
checks.guardRequiresRuntimePhase = guard.includes(`const RUNTIME_PHASE = '${RUNTIME_PHASE}'`) && guard.includes(`const RUNTIME_STATUS = '${RUNTIME_STATUS}'`);
checks.guardRequiresCanonicalScope = requiredScopeFields.every(field => guard.includes(`scope.${field} === true`));
checks.preflightNoJq = !/\bjq\b/.test(preflight);
checks.workflowNoJq = !/\bjq\b/.test(workflow);
checks.preflightUsesGuard = preflight.includes('orbit360-json-guard-visual-matrix-runtime-v20260806.mjs');
checks.preflightBindsLifecycle = preflight.includes('validate-request "$REQUEST" "$PARENT" "$EXPECTED_REQUEST_VERSION" "$LIFECYCLE"');
checks.workflowUsesGuard = workflow.includes('detect-active-request');
checks.workflowHasFailClosedVersion = workflow.includes('ORBIT360_EXPECTED_REQUEST_VERSION');
checks.armedWorkflowRequiresAutomaticStopConsumer = !workflowArmed || workflow.includes('orbit360-consume-visual-matrix-request-on-stop-v20260807.mjs');
checks.overlayPhaseRecognized = isStopPhase || isAuthorizedPhase;
checks.overlayNeverReusesPriorRequest = overlay.requestReusable === false;
checks.overlayRiskBoundariesMatchPhase = overlay.productionAllowed === false && overlay.writesAllowed === false && overlay.functionsAllowed === false && overlay.rulesAllowed === false && overlay.reimportAllowed === false && (isStopPhase || isAuthorizedPhase);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit360-preflight-source-'));
const version = '20260807.synthetic-two-phase-runtime';
const baselineChannel = 'visual-matrix-corrected-backup-synthetic-current';
const baselineScript = 'tools/orbit360-restore-visual-matrix-synthetic-current.sh';
const parentHead = 'a'.repeat(40);
const runtimeCaps = { secrets:true, firestoreRead:true, writes:false, runtime:true, browser:true, deploy:true, functionsDeploy:false, rulesDeploy:false, production:false };
const syntheticRequest = {
  schemaVersion:'orbit360-visual-matrix-corrected-post-auth-request-v1', requestVersion:version,
  gateId:'block2.7-visual-matrix-corrected-post-auth-lab-v20260805', contractVersion:'2.7.8', status:'AUTHORIZED_ONCE',
  approved:true, allowedExecutions:1, consumed:false, authorizationFrozen:false, replayAllowed:false,
  branch:'ays/backend-tenant-lab-v99-20260703', projectId:'ays-orbit-360-lab', tenantId:'alianzas-soluciones',
  parentHead, authorizedBaseHead:parentHead, capabilities:runtimeCaps,
  scope:{
    registeredWorkflowRelayRequired:true, restorePriorBaselineBeforeRuntime:true,
    restorePriorBaselineChannel:baselineChannel, restorePriorBaselineScript:baselineScript,
    hostingOnly:true, hostingDeploysMaximum:1, hostingBackupClone:true, hostingRollbackCloneOnFailure:true,
    precheckRequiredBeforeMatrix:true, functionsDeploy:false, rulesDeploy:false, firestoreWrites:false, authWrites:false,
    operationalWrites:false, reimport:false, production:false, main:false, merge:false,
    directionDesktop:true, operationalTablet:true, advisorMobile:true, viewportCaptureOnly:true, captureWarningsNonBlocking:true
  }
};
const sourceLifecycle = {
  schemaVersion:'orbit360-validator-lifecycle-contract-v1', validatorLifecycleRevision:'phase-capability-contract-v1',
  gateId:syntheticRequest.gateId, gateContractVersion:syntheticRequest.contractVersion, ownerVersion:'synthetic-source-validated',
  status:'AUTHORIZED_FRESH_REQUEST_ONLY_SYNTHETIC_PENDING_EXCLUSIVE_REQUEST', classification:'SOURCE_ONLY_ACTIVATION_VALIDATED',
  expectedRequestVersion:version, branch:syntheticRequest.branch, projectId:syntheticRequest.projectId, tenantId:syntheticRequest.tenantId,
  currentPhase:'SYNTHETIC_SOURCE_ONLY_PASS_PENDING_EXCLUSIVE_REQUEST',
  executionProfile:{mode:'SOURCE_ONLY_ACTIVATION_PASS_THEN_RUNTIME_ONCE_WITH_FRESH_EXCLUSIVE_REQUEST',phase:'SYNTHETIC_SOURCE_ONLY_PASS_PENDING_EXCLUSIVE_REQUEST',capabilities:{secrets:false,firestoreRead:false,writes:false,runtime:false,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false}},
  priorHostingRestoreChannel:baselineChannel, priorHostingRestoreScript:baselineScript,
  hostingDeploysMaximum:1, hostingBackupCloneAuthorized:true, hostingRollbackCloneAuthorizedOnFailure:true,
  stopRetryActive:false, authorizationReserved:true, authorizationFrozen:false, allowedExecutions:1, requestConsumed:false, replayAllowed:false,
  executionAuthorized:false, secretAccessAuthorized:false, firestoreReadAuthorized:false, writeAuthorized:false, browserAuthorized:false,
  hostingDeployAuthorized:false, functionsDeployAuthorized:false, rulesDeployAuthorized:false, productionAuthorized:false, mainAuthorized:false, mergeAuthorized:false,
  sourcePrerequisites:{activationSourceStatus:'PASS_SYNTHETIC_SOURCE_ACTIVATION'}
};
const sourceOverlay = {
  schemaVersion:'orbit360-validator-lifecycle-overlay-v1', gateId:syntheticRequest.gateId, requestVersion:version,
  status:sourceLifecycle.status, stopRetryActive:false, requestReusable:false, freshAuthorizationRequired:false, expectedNextRequestVersion:version,
  runtimeAllowed:true, runtimeAllowedOnlyWithFreshExclusiveRequest:true, browserAllowed:true, hostingAllowed:true,
  productionAllowed:false, writesAllowed:false, functionsAllowed:false, rulesAllowed:false, reimportAllowed:false
};
const priorRequest = {schemaVersion:syntheticRequest.schemaVersion,requestVersion:'prior-consumed',status:'CONSUMED_STOP_RETRY_SYNTHETIC',allowedExecutions:0,consumed:true,authorizationFrozen:true,replayAllowed:false};

const requestPath = path.join(tmp,'request.json');
const lifecyclePath = path.join(tmp,'lifecycle.json');
const overlayPath = path.join(tmp,'overlay.json');
const priorRequestPath = path.join(tmp,'prior-request.json');
fs.writeFileSync(requestPath,JSON.stringify(syntheticRequest),'utf8');
fs.writeFileSync(lifecyclePath,JSON.stringify(sourceLifecycle),'utf8');
fs.writeFileSync(overlayPath,JSON.stringify(sourceOverlay),'utf8');
fs.writeFileSync(priorRequestPath,JSON.stringify(priorRequest),'utf8');

checks.guardDetectPass = spawnSync(process.execPath,[files.guard,'detect-active-request',requestPath,version]).status === 0;
checks.sourceLifecycleRejectedByRequestGuard = spawnSync(process.execPath,[files.guard,'validate-request',requestPath,parentHead,version,lifecyclePath]).status === 41;
const transition = spawnSync(process.execPath,[files.transition,lifecyclePath,overlayPath,priorRequestPath,version],{encoding:'utf8'});
const transitionedLifecycle = JSON.parse(fs.readFileSync(lifecyclePath,'utf8'));
const transitionedOverlay = JSON.parse(fs.readFileSync(overlayPath,'utf8'));
checks.sourceToRuntimeTransitionPass = transition.status === 0 && transitionedLifecycle.status === RUNTIME_STATUS && transitionedLifecycle.currentPhase === RUNTIME_PHASE;
checks.transitionProducesExactRuntimeCapabilities = JSON.stringify(transitionedLifecycle.executionProfile.capabilities) === JSON.stringify(runtimeCaps);
checks.transitionKeepsRiskBoundaries = transitionedLifecycle.writeAuthorized === false && transitionedLifecycle.functionsDeployAuthorized === false && transitionedLifecycle.rulesDeployAuthorized === false && transitionedLifecycle.productionAuthorized === false && transitionedLifecycle.mainAuthorized === false && transitionedLifecycle.mergeAuthorized === false;
checks.transitionedLifecycleAcceptedByRequestGuard = spawnSync(process.execPath,[files.guard,'validate-request',requestPath,parentHead,version,lifecyclePath]).status === 0;
checks.transitionedOverlayRuntimePending = transitionedOverlay.status === RUNTIME_STATUS && transitionedOverlay.runtimeAllowed === true && transitionedOverlay.runtimeAllowedOnlyWithFreshExclusiveRequest === true;
for (const field of requiredScopeFields) {
  const bad = structuredClone(syntheticRequest);
  delete bad.scope[field];
  const badPath = path.join(tmp,`request-missing-${field}.json`);
  fs.writeFileSync(badPath,JSON.stringify(bad),'utf8');
  checks[`guardRejectsMissing_${field}`] = spawnSync(process.execPath,[files.guard,'validate-request',badPath,parentHead,version,lifecyclePath]).status === 41;
}

const stopEvidencePath = path.join(tmp,'stop-evidence.json');
fs.writeFileSync(stopEvidencePath,JSON.stringify({status:'VALIDATOR_STALE',classification:'PIPELINE_MECHANISM_FAILURE',failedCheckIds:['CANONICAL_PREFLIGHT_ENTRYPOINT'],error:'CANONICAL_LIFECYCLE_PHASE_MISMATCH',secretAccess:false,browserExecuted:false,deployExecuted:false,firestoreWrites:0,authWrites:0,operationalWrites:0,productionTouched:false}),'utf8');
const consumeRequestPath = path.join(tmp,'consume-request.json');
const consumeLifecyclePath = path.join(tmp,'consume-lifecycle.json');
const consumeOverlayPath = path.join(tmp,'consume-overlay.json');
fs.writeFileSync(consumeRequestPath,JSON.stringify(syntheticRequest),'utf8');
fs.writeFileSync(consumeLifecyclePath,JSON.stringify(transitionedLifecycle),'utf8');
fs.writeFileSync(consumeOverlayPath,JSON.stringify(transitionedOverlay),'utf8');
const consume = spawnSync(process.execPath,[files.stopConsumer,consumeRequestPath,consumeLifecyclePath,consumeOverlayPath,stopEvidencePath],{encoding:'utf8',env:{...process.env,GITHUB_RUN_ID:'synthetic-run',GITHUB_RUN_ATTEMPT:'1'}});
const consumedRequest = JSON.parse(fs.readFileSync(consumeRequestPath,'utf8'));
const consumedLifecycle = JSON.parse(fs.readFileSync(consumeLifecyclePath,'utf8'));
const consumedOverlay = JSON.parse(fs.readFileSync(consumeOverlayPath,'utf8'));
checks.automaticStopConsumptionPass = consume.status === 0 && consumedRequest.consumed === true && consumedRequest.allowedExecutions === 0 && consumedRequest.authorizationFrozen === true && consumedRequest.replayAllowed === false;
checks.automaticStopFreezesLifecycle = consumedLifecycle.stopRetryActive === true && consumedLifecycle.allowedExecutions === 0 && consumedLifecycle.executionAuthorized === false && consumedLifecycle.secretAccessAuthorized === false && consumedLifecycle.hostingDeployAuthorized === false;
checks.automaticStopFreezesOverlay = consumedOverlay.stopRetryActive === true && consumedOverlay.runtimeAllowed === false && consumedOverlay.hostingAllowed === false && consumedOverlay.expectedNextRequestVersion === 'NONE_PENDING_FRESH_AUTHORIZATION';
checks.consumedRequestRejectedByDetector = spawnSync(process.execPath,[files.guard,'detect-active-request',consumeRequestPath,version]).status !== 0;

const go = {status:'GO_GATE_CONTRACT',contractVersion:'2.7.8',failed:0,ok:true,executionAuthorized:true,secretAccessAuthorized:true,firestoreReadAuthorized:true,writeAuthorized:false,runtimeAuthorized:true,browserAuthorized:true,hostingDeployAuthorized:true,hostingDeploysMaximum:1,functionsDeployAuthorized:false,rulesDeployAuthorized:false,productionAuthorized:false,secretAccess:false,runtimeExecuted:false,browserExecuted:false,deployExecuted:false,firestoreWrites:0,authWrites:0,operationalWrites:0};
const goPath = path.join(tmp,'go.json');
fs.writeFileSync(goPath,JSON.stringify(go),'utf8');
checks.guardValidateGoPass = spawnSync(process.execPath,[files.guard,'validate-go',goPath]).status === 0;
const stopPath = path.join(tmp,'stop.json');
const emit = spawnSync(process.execPath,[files.guard,'emit-failure',stopPath,'gate','CHECK','detail','41']);
const stop = JSON.parse(fs.readFileSync(stopPath,'utf8'));
checks.guardEmitStop = emit.status === 41 && stop.status === 'STOP_PREFLIGHT_RELAY' && stop.ok === false;

const failedCheckIds = Object.entries(checks).filter(([,ok])=>!ok).map(([id])=>id);
const output = {
  schemaVersion:'orbit360-preflight-portable-source-test-v6-scope-aware-two-phase-lifecycle-stop-consumption',
  generatedAt:'2026-08-07T08:00:00-06:00', gateId:'block2.7-visual-matrix-corrected-post-auth-lab-v20260805',
  status:failedCheckIds.length?'STOP_SOURCE_TEST':'PASS_SOURCE_ONLY_TWO_PHASE_LIFECYCLE_PREFLIGHT_VALIDATOR',
  classification:failedCheckIds.length?'PIPELINE_MECHANISM_FAILURE':'PIPELINE_MECHANISM_FAILURE_CORRECTED_SOURCE_ONLY',
  observedOverlayStatus:String(overlay.status||''), observedLifecyclePhase:isStopPhase?'STOP_RETRY':isAuthorizedPhase?'AUTHORIZED_SOURCE_OR_RUNTIME_PENDING':'UNRECOGNIZED', workflowArmed,
  total:Object.keys(checks).length, passed:Object.values(checks).filter(Boolean).length, failed:failedCheckIds.length, failedCheckIds, checks,
  requiredScopeFields, canonicalRequestScopeRequiredBeforeRuntime:true,
  secretsRead:false,firebaseAccess:false,firestoreReads:0,firestoreWrites:0,authWrites:0,operationalWrites:0,browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false,ok:failedCheckIds.length===0
};
const out = rel('orbit360-platform/runtime-gate-crm-v20260716/preflight-portable-source-test-sanitized-v20260806.json');
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify(output,null,2)+'\n','utf8');
console.log(JSON.stringify(output,null,2));
process.exit(output.ok?0:41);
