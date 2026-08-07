#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';

const LIFECYCLE = process.argv[2] || 'tools/orbit360-validator-lifecycle-block1-v23-native-v20260807.json';
const SOURCE_EVIDENCE = process.argv[3] || 'orbit360-platform/runtime-gate-crm-v20260716/v23-native-block1-source-sanitized-v20260807.json';
const REQUEST = process.argv[4] || '.github/orbit360-requests/block1-client360-insurers-v23-authorization.json';
const CONTRACT = '1.0.41';
const REQUEST_VERSION = '20260807.23-native-block1-runtime';
const SOURCE_PHASE = 'SOURCE_ONLY_NATIVE_MATRIX_VALIDATION';
const RUNTIME_PHASE = 'BLOCK1_NATIVE_MATRIX_RUNTIME_V23';
const RUNTIME_CAPABILITIES = { secrets:true, firestoreRead:true, writes:false, runtime:true, browser:true, deploy:true, functionsDeploy:false, rulesDeploy:false, production:false };

function fail(code, detail='') {
  console.error(JSON.stringify({ status:'STOP_V23_SOURCE_TO_RUNTIME_TRANSITION', classification:'VALIDATOR_STALE', code, detail:String(detail).slice(0,500), secretAccess:false, firestoreRead:false, runtimeExecuted:false, browserExecuted:false, hostingTouched:false, deployExecuted:false, writes:0, ok:false }));
  process.exit(41);
}
function read(file) { if(!fs.existsSync(file)) fail('FILE_MISSING',file); try{return JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));}catch(error){fail('JSON_INVALID',error.message);} }
function write(file,value){ fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8'); }

if(fs.existsSync(REQUEST)) fail('REQUEST_MUST_BE_ABSENT_DURING_TRANSITION',REQUEST);
const lifecycle=read(LIFECYCLE); const source=read(SOURCE_EVIDENCE);
if(!(lifecycle.gateId==='block1-client360-insurers-lab-v20260717' && lifecycle.gateContractVersion===CONTRACT && lifecycle.status==='SOURCE_VALIDATED_READY_FOR_RUNTIME_TRANSITION' && lifecycle.currentPhase===SOURCE_PHASE && lifecycle.executionAuthorized===false && lifecycle.allowedExecutions===1 && lifecycle.authorizationReserved===true && lifecycle.authorizationFrozen===false && lifecycle.stopRetryActive===false)) fail('SOURCE_LIFECYCLE_NOT_TRANSITIONABLE',lifecycle.status||'');
if(!(source.status==='PASS_V23_NATIVE_BLOCK1_SOURCE_CLOSED' && source.contractVersion===CONTRACT && source.ok===true && source.requestV23Exists===false && source.runtimePending===false && source.secretsRead===false && source.firebaseAccess===false && source.hostingTouched===false && source.browserExecuted===false && source.firestoreWrites===0 && source.authWrites===0 && source.operationalWrites===0)) fail('SOURCE_EVIDENCE_NOT_CLOSED_PASS',source.status||'');
if(!source.sourceRunId || !source.sourceHead) fail('SOURCE_EVIDENCE_IDENTITY_MISSING','run/head');

lifecycle.status='AUTHORIZED_ONCE_PENDING_EXCLUSIVE_REQUEST';
lifecycle.classification='RUNTIME_PENDING_EXCLUSIVE_REQUEST_SOURCE_VALIDATED';
lifecycle.currentPhase=RUNTIME_PHASE;
lifecycle.executionProfile={ mode:'RUNTIME_ONCE_ONLY_WITH_FRESH_EXCLUSIVE_REQUEST', phase:RUNTIME_PHASE, capabilities:RUNTIME_CAPABILITIES };
lifecycle.executionAuthorized=true;
lifecycle.authorizationReserved=true;
lifecycle.authorizationFrozen=false;
lifecycle.allowedExecutions=1;
lifecycle.activeRequest=false;
lifecycle.requestConsumed=false;
lifecycle.replayAllowed=false;
lifecycle.sourceValidation={ status:source.status, runId:source.sourceRunId, head:source.sourceHead, exactRuntimeArtifact:source.exactRuntimeArtifact, exactRuntimeArtifactSha256:source.exactRuntimeArtifactSha256||'', sourceChecks:source.sourceChecks||'', canonicalPreflightStatus:source.canonicalPreflightStatus||'' };
lifecycle.nextAction='CREATE_EXACTLY_ONE_NEW_EXCLUSIVE_IMMUTABLE_V23_REQUEST_COMMIT_BOUND_TO_THIS_RUNTIME_PENDING_HEAD.';
write(LIFECYCLE,lifecycle);
console.log(JSON.stringify({ status:'PASS_V23_SOURCE_TO_RUNTIME_TRANSITION', gateId:lifecycle.gateId, contractVersion:CONTRACT, requestVersion:REQUEST_VERSION, lifecycleStatus:lifecycle.status, lifecyclePhase:lifecycle.currentPhase, requestPresent:false, runtimeCapabilities:RUNTIME_CAPABILITIES, sourceRunId:source.sourceRunId, secretAccess:false, firestoreRead:false, runtimeExecuted:false, browserExecuted:false, hostingTouched:false, deployExecuted:false, writes:0, ok:true },null,2));
