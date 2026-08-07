#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';

const REQUEST = process.env.ORBIT360_REQUEST_FILE || '.github/orbit360-requests/block1-client360-insurers-v23-authorization.json';
const LIFECYCLE = process.env.ORBIT360_V23_LIFECYCLE || 'tools/orbit360-validator-lifecycle-block1-v23-native-v20260807.json';
const PREFLIGHT = process.env.ORBIT360_V23_PREFLIGHT_EVIDENCE || 'orbit360-platform/runtime-gate-crm-v20260716/v23-block1-preflight-sanitized-v20260807.json';
const UNIVERSE = process.env.ORBIT360_UNIVERSE_EVIDENCE || 'orbit360-platform/runtime-gate-crm-v20260716/v23-block1-universe-adjudication-sanitized-v20260807.json';
const PRECHECK = process.env.ORBIT360_BROWSER_PRECHECK_EVIDENCE || 'orbit360-platform/runtime-gate-crm-v20260716/v23-block1-browser-precheck-sanitized-v20260807.json';
const MATRIX = process.env.ORBIT360_MATRIX_EVIDENCE || 'orbit360-platform/runtime-gate-crm-v20260716/v23-block1-native-matrix-sanitized-v20260807.json';
const STATE = process.env.ORBIT360_V23_RUNTIME_STATE || 'orbit360-platform/runtime-gate-crm-v20260716/v23-block1-runtime-state-sanitized-v20260807.json';
const FINAL = process.env.ORBIT360_V23_FINAL_EVIDENCE || 'orbit360-platform/runtime-gate-crm-v20260716/v23-block1-final-sanitized-v20260807.json';

const read = file => { try { return JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'')); } catch { return null; } };
const write = (file,value) => { fs.mkdirSync(path.dirname(path.resolve(file)),{recursive:true}); fs.writeFileSync(path.resolve(file),JSON.stringify(value,null,2)+'\n','utf8'); };
const request = read(REQUEST); const lifecycle = read(LIFECYCLE);
if(!request || !lifecycle) throw new Error('V23_CLOSURE_REQUEST_OR_LIFECYCLE_MISSING');
const preflight=read(PREFLIGHT); const universe=read(UNIVERSE); const precheck=read(PRECHECK); const matrix=read(MATRIX); const state=read(STATE) || {};
const matrixPass = !!(matrix && matrix.ok===true && matrix.stage==='PASS_BLOCK1_NATIVE_VISUAL_MATRIX' && matrix.classification==='PASS_VISUAL_POST_AUTH' && matrix.snapshotIntegrity==='VERIFIED_UNCHANGED' && matrix.totalRoleFailures===0 && matrix.firestoreWrites===0 && matrix.authWrites===0 && matrix.operationalWrites===0);
const universePass = !!(universe && universe.ok===true && universe.goForHosting===true && universe.status==='PASS_BLOCK1_UNIVERSE_ADJUDICATION');
const precheckPass = !!(precheck && precheck.ok===true && precheck.stage==='PASS_BLOCK1_V23_BROWSER_PRECHECK' && precheck.classification==='GO_FULL_BLOCK1_MATRIX');
const runtimePass = matrixPass && universePass && precheckPass && state.runtimeOutcome==='success' && state.rollbackOutcome!=='failure';
let classification='PIPELINE_MECHANISM_FAILURE'; let checkpoint=state.checkpoint || 'UNKNOWN';
if(runtimePass){ classification='PASS_VISUAL_POST_AUTH'; checkpoint='BLOCK1_MATRIX_COMPLETE'; }
else if(universe && universe.ok===false){ classification=universe.classification || 'DATA_CONTRACT_FAILURE'; checkpoint='UNIVERSE_ADJUDICATION'; }
else if(precheck && precheck.ok===false){ classification=precheck.classification || 'FUNCTIONAL_DEFECT'; checkpoint=precheck.checkpoint || 'BROWSER_PRECHECK'; }
else if(matrix && matrix.ok===false){ classification=matrix.classification || 'FUNCTIONAL_DEFECT'; checkpoint=matrix.currentCheckpoint || 'BLOCK1_MATRIX'; }
else if(state.rollbackOutcome==='failure'){ classification='ENVIRONMENT_FAILURE'; checkpoint='HOSTING_ROLLBACK'; }

const runId=process.env.GITHUB_RUN_ID || ''; const attempt=Number(process.env.GITHUB_RUN_ATTEMPT || 1);
request.status = runtimePass ? 'CONSUMED_PASS_VISUAL_POST_AUTH' : `CONSUMED_STOP_RETRY_${checkpoint}`;
request.consumed = true; request.allowedExecutions = 0; request.authorizationFrozen = true; request.replayAllowed = false; request.consumedByRunId=runId; request.consumedByAttempt=attempt; request.consumedAt=new Date().toISOString();
request.executionResult={ decision:runtimePass?'PASS_VISUAL_POST_AUTH':'STOP_RETRY', classification, checkpoint, runId, attempt, goGateContract:preflight&&preflight.status==='GO_GATE_CONTRACT'?'GRANTED':'NOT_GRANTED', universeStatus:universe&&universe.status||'', hostingRestoreOutcome:state.restoreOutcome||'skipped', hostingBackupOutcome:state.backupOutcome||'skipped', hostingDeploys:Number(state.deployAttempted?1:0), browserPrecheck:precheck&&precheck.stage||'', matrixStage:matrix&&matrix.stage||'', rollbackOutcome:state.rollbackOutcome||'skipped', snapshotIntegrity:matrix&&matrix.snapshotIntegrity||'NOT_VERIFIED', firestoreWrites:Number(matrix&&matrix.firestoreWrites||0), authWrites:Number(matrix&&matrix.authWrites||0), operationalWrites:Number(matrix&&matrix.operationalWrites||0), productionTouched:false };

lifecycle.status = runtimePass ? 'PASS_VISUAL_POST_AUTH_BLOCK1_CLOSED' : `STOP_RETRY_${checkpoint}`;
lifecycle.classification = classification;
lifecycle.currentPhase = runtimePass ? 'BLOCK1_CLOSED' : `STOP_RETRY_${checkpoint}`;
lifecycle.stopRetryActive = !runtimePass;
lifecycle.authorizationReserved=false; lifecycle.authorizationFrozen=true; lifecycle.allowedExecutions=0; lifecycle.activeRequest=false; lifecycle.requestConsumed=true; lifecycle.replayAllowed=false; lifecycle.executionAuthorized=false;
lifecycle.executionProfile={ mode:runtimePass?'BLOCK1_CLOSED':'STOP_RETRY_NO_RUNTIME', phase:lifecycle.currentPhase, capabilities:{ secrets:false,firestoreRead:false,writes:false,runtime:false,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false } };
lifecycle.protectedState = { ...(lifecycle.protectedState||{}), passVisualPostAuth:runtimePass, snapshotIntegrity:matrix&&matrix.snapshotIntegrity||'NOT_VERIFIED', firestoreWritesAuthorized:0,authWritesAuthorized:0,operationalWritesAuthorized:0,reimportAuthorized:false,productionAuthorized:false };
lifecycle.runtimeResult={ runId,attempt,result:runtimePass?'PASS_VISUAL_POST_AUTH':'STOP_RETRY',classification,checkpoint,universeStatus:universe&&universe.status||'',hostingDeploys:Number(state.deployAttempted?1:0),rollbackOutcome:state.rollbackOutcome||'skipped',snapshotIntegrity:matrix&&matrix.snapshotIntegrity||'NOT_VERIFIED',totalRoleFailures:Number(matrix&&matrix.totalRoleFailures||0) };
lifecycle.nextAction = runtimePass ? 'BLOCK1_CLOSED. PROCEED_ONLY_TO_NEXT_MASTER_PLAN_BLOCK_WITH_FRESH_AUTHORIZATION.' : 'DIAGNOSE_FIRST_FAILED_V23_CHECK. DO NOT REPLAY THIS REQUEST.';

const final={ schemaVersion:'orbit360-block1-v23-final-v1', gateId:'block1-client360-insurers-lab-v20260717',contractVersion:'1.0.26',decision:runtimePass?'PASS_VISUAL_POST_AUTH':'STOP_RETRY',classification,checkpoint,runId,attempt,preflightStatus:preflight&&preflight.status||'',universeStatus:universe&&universe.status||'',universeClassification:universe&&universe.classification||'',observedRaw:universe&&universe.observedRaw||{},observedEffective:universe&&universe.observedEffective||{},restoreOutcome:state.restoreOutcome||'skipped',backupOutcome:state.backupOutcome||'skipped',deployAttempted:!!state.deployAttempted,deploys:Number(state.deployAttempted?1:0),precheckStatus:precheck&&precheck.stage||'',matrixStage:matrix&&matrix.stage||'',totalRoleFailures:Number(matrix&&matrix.totalRoleFailures||0),snapshotIntegrity:matrix&&matrix.snapshotIntegrity||'NOT_VERIFIED',rollbackOutcome:state.rollbackOutcome||'skipped',requestConsumed:true,authorizationFrozen:true,replayAllowed:false,firestoreWrites:Number(matrix&&matrix.firestoreWrites||0),authWrites:Number(matrix&&matrix.authWrites||0),operationalWrites:Number(matrix&&matrix.operationalWrites||0),productionTouched:false,containsPII:false,containsSecrets:false,ok:runtimePass};
write(REQUEST,request); write(LIFECYCLE,lifecycle); write(FINAL,final); console.log(JSON.stringify(final,null,2)); process.exit(runtimePass?0:42);
