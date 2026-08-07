#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const MODE=process.argv[2]||'source';
const GATE_ID='block1-client360-insurers-lab-v20260717';
const CONTRACT='1.0.41';
const GENERATION='v29-identity-reconciliation-universe-readonly';
const REQUEST_VERSION='20260807.29-identity-reconciliation-universe-readonly';
const REQUEST=process.env.ORBIT360_V29_REQUEST_FILE||'.github/orbit360-requests/block1-client360-insurers-v29-identity-reconciliation-universe-authorization.json';
const LIFECYCLE='tools/orbit360-validator-lifecycle-block1-identity-reconciliation-universe-v29-v20260807.json';
const V28='orbit360-platform/runtime-gate-crm-v20260716/v28-block1-final-sanitized-v20260807.json';
const EVIDENCE=process.env.ORBIT360_V29_PREFLIGHT_EVIDENCE||'orbit360-platform/runtime-gate-crm-v20260716/v29-block1-preflight-sanitized-v20260807.json';
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8').replace(/^\uFEFF/,''));
const exists=p=>fs.existsSync(path.join(ROOT,p));
function persist(out){const p=path.join(ROOT,EVIDENCE);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(out,null,2)+'\n','utf8');console.log(JSON.stringify(out,null,2));}
function fail(id,detail=''){const out={schemaVersion:'orbit360-block1-v29-preflight-v1',gateId:GATE_ID,contractVersion:CONTRACT,authorizationGeneration:GENERATION,mode:MODE,status:'STOP_RETRY_V29_PREFLIGHT',classification:'PIPELINE_MECHANISM_FAILURE',failedCheckId:id,detail:String(detail).slice(0,400),executionAuthorized:false,secretAccessAuthorized:false,firestoreReadAuthorized:false,firestoreWriteAuthorized:false,authReadAuthorized:false,authWriteAuthorized:false,browserAuthorized:false,hostingAuthorized:false,functionsDeployAuthorized:false,rulesDeployAuthorized:false,reimportAuthorized:false,productionAuthorized:false,writesAuthorized:0,containsPII:false,containsSecrets:false,ok:false};persist(out);process.exit(41);}
for(const f of [LIFECYCLE,V28,'tools/orbit360-identity-reconcile-universe-v29-v20260807.mjs','tools/orbit360-test-identity-reconciliation-universe-v29-source-v20260807.mjs'])if(!exists(f))fail('V29_REQUIRED_FILE_MISSING',f);
const lifecycle=read(LIFECYCLE),v28=read(V28);
if(!(v28.decision==='STOP_RETRY'&&v28.rootCause==='CLIENT_PROVENANCE_NOT_DEMONSTRABLE_AFTER_AUTHORIZED_FOCAL_READ'&&v28.targetProvenance?.count===16&&v28.targetProvenance?.unresolved===16&&v28.targetProvenance?.contradictions===0))fail('V29_V28_BASIS_INVALID');
if(!(lifecycle.gateId===GATE_ID&&lifecycle.gateContractVersion===CONTRACT&&lifecycle.authorizationGeneration===GENERATION&&lifecycle.targetFingerprintCount===16&&lifecycle.baselineContract?.clientes===414&&lifecycle.baselineContract?.aseguradoras===26&&lifecycle.baselineContract?.asesores===7))fail('V29_LIFECYCLE_CONTRACT_INVALID');
if(MODE==='source'){
 if(exists(REQUEST))fail('V29_REQUEST_MUST_BE_ABSENT_SOURCE');
 if(!(lifecycle.currentPhase==='SOURCE_ONLY_IDENTITY_RECONCILIATION_UNIVERSE_V29'&&lifecycle.executionAuthorized===false&&lifecycle.executionProfile?.capabilities?.secrets===false&&lifecycle.executionProfile?.capabilities?.firestoreRead===false&&lifecycle.protectedState?.writesAuthorized===0&&lifecycle.protectedState?.hostingAuthorized===false&&lifecycle.protectedState?.browserAuthorized===false))fail('V29_SOURCE_LIFECYCLE_NOT_FAIL_CLOSED');
 const out={schemaVersion:'orbit360-block1-v29-preflight-v1',gateId:GATE_ID,contractVersion:CONTRACT,authorizationGeneration:GENERATION,mode:MODE,status:'PASS_V29_SOURCE_PREFLIGHT',classification:'IDENTITY_RECONCILIATION_SOURCE_VALID',targetFingerprintCount:16,sourceIdentityContract:lifecycle.sourceIdentityContract,baselineContract:lifecycle.baselineContract,executionAuthorized:false,secretAccessAuthorized:false,firestoreReadAuthorized:false,firestoreWriteAuthorized:false,authReadAuthorized:false,authWriteAuthorized:false,browserAuthorized:false,hostingAuthorized:false,functionsDeployAuthorized:false,rulesDeployAuthorized:false,reimportAuthorized:false,productionAuthorized:false,writesAuthorized:0,containsPII:false,containsSecrets:false,ok:true};persist(out);process.exit(0);
}
if(MODE!=='runtime')fail('V29_PREFLIGHT_MODE_INVALID',MODE);
if(!exists(REQUEST))fail('V29_RUNTIME_REQUEST_MISSING');const req=read(REQUEST);const caps=lifecycle.executionProfile?.capabilities||{};
if(!(lifecycle.status==='AUTHORIZED_ONCE_PENDING_EXCLUSIVE_REQUEST'&&lifecycle.currentPhase==='BLOCK1_IDENTITY_RECONCILIATION_UNIVERSE_READONLY_V29'&&lifecycle.executionAuthorized===true&&lifecycle.allowedExecutions===1&&lifecycle.authorizationFrozen===false&&lifecycle.replayAllowed===false))fail('V29_RUNTIME_LIFECYCLE_INVALID',lifecycle.status);
if(!(caps.secrets===true&&caps.firestoreRead===true&&caps.writes===false&&caps.runtime===true&&caps.browser===false&&caps.deploy===false&&caps.functionsDeploy===false&&caps.rulesDeploy===false&&caps.production===false))fail('V29_RUNTIME_CAPABILITIES_INVALID');
if(!(req.requestVersion===REQUEST_VERSION&&req.authorizationGeneration===GENERATION&&req.gateId===GATE_ID&&req.contractVersion===CONTRACT&&req.status==='AUTHORIZED_ONCE'&&req.approved===true&&req.allowedExecutions===1&&req.consumed===false&&req.authorizationFrozen===false&&req.replayAllowed===false))fail('V29_RUNTIME_REQUEST_INVALID');
if(!(req.scope?.firestoreReadOperationsMaximum===4&&req.scope?.identityProjectionOnly===true&&req.scope?.repeatV28ProvenanceFields===false&&req.scope?.baselineIdentityInMemory===true&&req.scope?.demoSourceInMemory===true&&req.scope?.externalAuditOnlyIfRegistered===true&&req.scope?.universeAfterFullAdjudicationOnly===true&&req.scope?.firestoreWrites===false&&req.scope?.authReads===false&&req.scope?.authWrites===false&&req.scope?.hosting===false&&req.scope?.browser===false&&req.scope?.reimport===false&&req.scope?.production===false&&req.scope?.main===false&&req.scope?.merge===false))fail('V29_RUNTIME_SCOPE_INVALID');
const out={schemaVersion:'orbit360-block1-v29-preflight-v1',gateId:GATE_ID,contractVersion:CONTRACT,authorizationGeneration:GENERATION,mode:MODE,status:'GO_V29_IDENTITY_RECONCILIATION_UNIVERSE_READONLY',classification:'GO_IDENTITY_RECONCILIATION_THEN_UNIVERSE_GATE_READONLY',targetFingerprintCount:16,firestoreReadOperationsMaximum:4,executionAuthorized:true,secretAccessAuthorized:true,firestoreReadAuthorized:true,firestoreWriteAuthorized:false,authReadAuthorized:false,authWriteAuthorized:false,browserAuthorized:false,hostingAuthorized:false,functionsDeployAuthorized:false,rulesDeployAuthorized:false,reimportAuthorized:false,productionAuthorized:false,writesAuthorized:0,containsPII:false,containsSecrets:false,ok:true};persist(out);process.exit(0);
