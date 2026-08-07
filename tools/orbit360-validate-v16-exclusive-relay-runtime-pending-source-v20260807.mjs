#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const REQUEST='.github/orbit360-requests/visual-matrix-corrected-post-auth-lab-v20260805-authorization.json';
const LIFECYCLE='tools/orbit360-validator-lifecycle-contract-visual-matrix-corrected-post-auth-lab-v20260805.json';
const OVERLAY='tools/orbit360-validator-lifecycle-overlay-visual-matrix-v8-stop-preflight-v20260806.json';
const OLD_RELAY='.github/workflows/orbit360-claude-paquete-reconciliado-v1205.yml';
const RELAY='.github/workflows/orbit360-registered-relay-v16-hydration-v20260807.yml';
const PRECHECK='tools/orbit360-visual-runtime-rootfix-browser-precheck-v20260805.mjs';
const OUT='orbit360-platform/runtime-gate-crm-v20260716/v16-source-activation-hydration-sequence-sanitized-v20260807.json';
const VERSION='20260807.16-two-phase-runtime';
const BASE='43f5b2c23fd004abcb0f3a49b55044906e0db3be';
const read=f=>fs.readFileSync(path.resolve(f),'utf8').replace(/^\uFEFF/,'');
const json=f=>JSON.parse(read(f));
const request=json(REQUEST), lifecycle=json(LIFECYCLE), overlay=json(OVERLAY), relay=read(RELAY), oldRelay=read(OLD_RELAY), precheck=read(PRECHECK);
const mounted=precheck.indexOf("'HYDRATION_CONTRACT_MOUNTED'");
const required=precheck.indexOf("'INICIO_REQUIRED_HYDRATION'");
const ready=precheck.indexOf("'INICIO_READY'");
const detect=relay.indexOf('Detect canonical exclusive fresh authorized request and exact transport base');
const baseSha=relay.indexOf('PASS_V16_REGISTERED_RELAY_TRANSPORT_BASE_SHA_BEFORE_SECRETS');
const go=relay.indexOf('GO_GATE_CONTRACT before secrets');
const secrets=relay.indexOf('Restore authorized Hosting LAB baseline');
const checks={
  priorV15ConsumedFrozen: request.requestVersion==='20260807.15-two-phase-runtime'&&request.consumed===true&&request.authorizationFrozen===true&&request.allowedExecutions===0&&request.replayAllowed===false,
  lifecycleRuntimePending: lifecycle.status==='AUTHORIZED_ONCE_PENDING_EXCLUSIVE_REQUEST'&&lifecycle.currentPhase==='VISUAL_MATRIX_CORRECTED_POST_AUTH_LAB_EXECUTION'&&lifecycle.expectedRequestVersion===VERSION&&lifecycle.allowedExecutions===1&&lifecycle.stopRetryActive===false,
  lifecycleExactRelay: lifecycle.registeredWorkflowPath===RELAY,
  lifecycleWritesDenied: lifecycle.writeAuthorized===false&&lifecycle.functionsDeployAuthorized===false&&lifecycle.rulesDeployAuthorized===false&&lifecycle.productionAuthorized===false&&lifecycle.mainAuthorized===false&&lifecycle.mergeAuthorized===false,
  overlayRuntimePending: overlay.status==='AUTHORIZED_ONCE_PENDING_EXCLUSIVE_REQUEST'&&overlay.expectedNextRequestVersion===VERSION&&overlay.runtimeAllowed===true&&overlay.browserAllowed===true&&overlay.hostingAllowed===true,
  overlayExactRelay: overlay.registeredRelayPath===RELAY&&overlay.registeredRelayExpectedRequest===VERSION,
  overlayWritesDenied: overlay.writesAllowed===false&&overlay.functionsAllowed===false&&overlay.rulesAllowed===false&&overlay.reimportAllowed===false&&overlay.productionAllowed===false,
  oldRelayDisarmed: oldRelay.includes('ORBIT360_EXPECTED_REQUEST_VERSION: NONE_PENDING_FRESH_AUTHORIZATION'),
  newRelayExactVersion: relay.includes(`ORBIT360_EXPECTED_REQUEST_VERSION: ${VERSION}`),
  newRelayV16RestoreEvidence: relay.includes('visual-matrix-v16-prior-hosting-restore-sanitized-v20260807.json'),
  newRelayOnlyCanonicalHead: relay.includes("ORBIT360_TRANSPORT_HEAD_REF:-}" )&&relay.includes("!= 'pull_request'"),
  newRelayExactRequestCommit: relay.includes('SKIP_V16_REGISTERED_RELAY_NOT_EXCLUSIVE_REQUEST_COMMIT'),
  newRelayBaseShaBeforeGo: detect>=0&&baseSha>detect&&go>baseSha,
  goBeforeSecrets: go>=0&&secrets>go,
  hydrationSequence: mounted>=0&&required>mounted&&ready>required,
  restoreBaseline: lifecycle.priorHostingRestoreAuthorized===true&&lifecycle.priorHostingRestoreChannel==='visual-matrix-corrected-backup-31135532118',
  hostingBoundary: lifecycle.hostingDeploysMaximum===1&&lifecycle.hostingBackupCloneAuthorized===true&&lifecycle.hostingRollbackCloneAuthorizedOnFailure===true
};
const failed=Object.entries(checks).filter(([,ok])=>!ok).map(([id])=>id);
const output={
  schemaVersion:'orbit360-v16-source-activation-hydration-sequence-v2-exclusive-relay',
  gateId:'block2.7-visual-matrix-corrected-post-auth-lab-v20260805', requestVersion:VERSION, sourceAuthorizationBaseHead:BASE,
  status:failed.length?'STOP_V16_EXCLUSIVE_RELAY_SOURCE':'PASS_V16_SOURCE_TO_RUNTIME_PENDING_EXCLUSIVE_RELAY',
  classification:failed.length?'PIPELINE_MECHANISM_FAILURE':'SOURCE_ONLY_ACTIVATION_VALIDATED',
  sequence:['HYDRATION_CONTRACT_MOUNTED','INICIO_REQUIRED_HYDRATION','INICIO_READY'], registeredRelayPath:RELAY,
  oldRelayDisarmed:true, total:Object.keys(checks).length, passed:Object.values(checks).filter(Boolean).length, failed:failed.length, failedCheckIds:failed, checks,
  sourceStagePrepared:true, runtimePending:true, requestCreated:false, secretsRead:false, firebaseAccess:false, firestoreReads:0, firestoreWrites:0,
  authWrites:0, operationalWrites:0, hostingTouched:false, browserExecuted:false, deployExecuted:false, productionTouched:false,
  containsPII:false, containsSecrets:false, containsPasswords:false, ok:failed.length===0
};
fs.mkdirSync(path.dirname(path.resolve(OUT)),{recursive:true});
fs.writeFileSync(path.resolve(OUT),JSON.stringify(output,null,2)+'\n','utf8');
console.log(JSON.stringify(output,null,2));
process.exit(output.ok?0:41);
