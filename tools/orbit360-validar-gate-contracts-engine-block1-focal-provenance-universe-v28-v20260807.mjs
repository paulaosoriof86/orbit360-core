#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT=process.cwd();
const GATE_ID='block1-client360-insurers-lab-v20260717';
const CONTRACT='1.0.41';
const GENERATION='v28-focal-provenance-universe-readonly';
const REQUEST_VERSION='20260807.28-focal-provenance-universe-readonly';
const EVIDENCE='orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json';
const LIFECYCLE='tools/orbit360-validator-lifecycle-block1-focal-provenance-universe-v28-v20260807.json';
const REQUEST=process.env.ORBIT360_REQUEST_FILE||'.github/orbit360-requests/block1-client360-insurers-v28-focal-provenance-universe-authorization.json';
const TOOL='tools/orbit360-focal-client-provenance-universe-v28-v20260807.mjs';
const TEST='tools/orbit360-test-focal-client-provenance-universe-v28-source-v20260807.mjs';
const PREFLIGHT='tools/orbit360-preflight-block1-focal-provenance-universe-v28-v20260807.mjs';
const DEDUPE='tools/orbit360-insurer-identity-dedupe-v26-v20260807.mjs';
const ADJ='tools/orbit360-adjudicate-block1-universe-readonly-v26-v20260807.mjs';
const V25='orbit360-platform/runtime-gate-crm-v20260716/v25-block1-universe-differential-sanitized-v20260807.json';
const SOURCE_PHASE='SOURCE_ONLY_FOCAL_PROVENANCE_UNIVERSE_V28';
const RUNTIME_PHASE='BLOCK1_FOCAL_PROVENANCE_UNIVERSE_READONLY_V28';
const SOURCE_CAPS={secrets:false,firestoreRead:false,writes:false,runtime:false,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false};
const RUNTIME_CAPS={secrets:true,firestoreRead:true,writes:false,runtime:true,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false};
const CANONICAL='ays/backend-tenant-lab-v99-20260703';
const BASE='f453b3c89a1e697230369e9d49197b16f4973efe';

const exists=p=>fs.existsSync(path.join(ROOT,p));
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8').replace(/^\uFEFF/,''));
const exact=(a,b)=>JSON.stringify(a||{})===JSON.stringify(b||{});
function write(v){const a=path.join(ROOT,EVIDENCE);fs.mkdirSync(path.dirname(a),{recursive:true});fs.writeFileSync(a,JSON.stringify(v,null,2)+'\n','utf8');}
function stop(id,detail='',phase=''){
 const out={schemaVersion:'orbit360-gate-contract-preflight-block1-v28-v1',gateId:GATE_ID,contractVersion:CONTRACT,authorizationGeneration:GENERATION,executionPhase:phase||'UNKNOWN',status:'VALIDATOR_STALE',classification:'PIPELINE_MECHANISM_FAILURE',failed:1,failedCheckIds:[id],detail:String(detail).replace(/[\w.+-]+@[\w.-]+/g,'[email]').slice(0,700),executionAuthorized:false,secretAccessAuthorized:false,firestoreReadAuthorized:false,firestoreWriteAuthorized:false,authReadAuthorized:false,authWriteAuthorized:false,browserAuthorized:false,hostingAuthorized:false,functionsDeployAuthorized:false,rulesDeployAuthorized:false,productionAuthorized:false,writesAuthorized:0,dataAccess:false,secretAccess:false,secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false,ok:false};write(out);console.log(JSON.stringify(out,null,2));process.exit(41);
}
for(const f of [LIFECYCLE,TOOL,TEST,PREFLIGHT,DEDUPE,ADJ,V25]) if(!exists(f)) stop('V28_REQUIRED_FILE_MISSING',f);
const lifecycle=read(LIFECYCLE); const phase=String(lifecycle.currentPhase||lifecycle.executionProfile?.phase||'');
if(lifecycle.gateId!==GATE_ID||lifecycle.gateContractVersion!==CONTRACT||lifecycle.authorizationGeneration!==GENERATION||lifecycle.expectedRequestVersion!==REQUEST_VERSION||lifecycle.ownerReferenceVersion!=='20260807.23-native-source-canonical-owner-1.0.41') stop('V28_LIFECYCLE_IDENTITY_INVALID',lifecycle.status,phase);
const v25=read(V25); const targets=Array.isArray(v25?.differential?.clientes)?v25.differential.clientes.map(x=>x.fingerprint).filter(Boolean):[];
if(new Set(targets).size!==16) stop('V28_TARGET_FINGERPRINT_SET_INVALID',targets.length,phase);
if(!(lifecycle.baselineContract?.clientes===414&&lifecycle.baselineContract?.aseguradoras===26&&lifecycle.baselineContract?.asesores===7)) stop('V28_BASELINE_CONTRACT_DRIFT',JSON.stringify(lifecycle.baselineContract||{}),phase);
if(!(lifecycle.protectedState?.productFrozen===true&&lifecycle.protectedState?.cliente360Frozen===true&&lifecycle.protectedState?.insurersFunctionalFrozen===true&&lifecycle.protectedState?.polizasFrozen===true&&lifecycle.protectedState?.cobrosFrozen===true&&lifecycle.protectedState?.pwaServiceWorkerFrozen===true&&lifecycle.protectedState?.owner1041Frozen===true&&lifecycle.protectedState?.matrixFrozen===true&&lifecycle.protectedState?.observerFrozen===true&&lifecycle.protectedState?.authFrozen===true&&lifecycle.protectedState?.storeFrozen===true&&lifecycle.protectedState?.importersFrozen===true&&lifecycle.protectedState?.rulesFrozen===true&&lifecycle.protectedState?.backendProtectedFrozen===true&&lifecycle.protectedState?.hostingAuthorized===false&&lifecycle.protectedState?.browserAuthorized===false&&lifecycle.protectedState?.writesAuthorized===0)) stop('V28_PROTECTED_STATE_INVALID','freeze contract',phase);

if(phase===SOURCE_PHASE){
 if(!exact(lifecycle.executionProfile?.capabilities,SOURCE_CAPS)||lifecycle.executionAuthorized!==false||lifecycle.allowedExecutions!==1||lifecycle.authorizationReserved!==true||lifecycle.authorizationFrozen!==false) stop('V28_SOURCE_CAPABILITIES_INVALID',JSON.stringify(lifecycle.executionProfile||{}),phase);
 if(exists(REQUEST)) stop('V28_REQUEST_EXISTS_DURING_SOURCE',REQUEST,phase);
 const test=spawnSync(process.execPath,[TEST],{cwd:ROOT,encoding:'utf8',env:process.env,maxBuffer:32*1024*1024});
 if(test.status!==0||!/PASS_V28_FOCAL_PROVENANCE_UNIVERSE_SOURCE/.test(test.stdout||'')) stop('V28_SOURCE_TEST_FAILED',test.stderr||test.stdout,phase);
 const out={schemaVersion:'orbit360-gate-contract-preflight-block1-v28-v1',gateId:GATE_ID,contractVersion:CONTRACT,authorizationGeneration:GENERATION,executionPhase:SOURCE_PHASE,status:'PASS_GATE_CONTRACT_SOURCE_V28',classification:'VALIDATOR_STALE_CORRECTED_CONTROL_PLANE_SOURCE_ONLY',total:18,passed:18,failed:0,failedCheckIds:[],authorizedBaseHead:BASE,targetFingerprintCount:16,baselineContract:{clientes:414,aseguradoras:26,asesores:7},requestPresent:false,executionAuthorized:false,secretAccessAuthorized:false,firestoreReadAuthorized:false,firestoreWriteAuthorized:false,authReadAuthorized:false,authWriteAuthorized:false,browserAuthorized:false,hostingAuthorized:false,functionsDeployAuthorized:false,rulesDeployAuthorized:false,productionAuthorized:false,writesAuthorized:0,dataAccess:false,secretAccess:false,secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false,ok:true};write(out);console.log(JSON.stringify(out,null,2));process.exit(0);
}
if(phase!==RUNTIME_PHASE) stop('V28_LIFECYCLE_PHASE_UNSUPPORTED',phase,phase);
if(!exact(lifecycle.executionProfile?.capabilities,RUNTIME_CAPS)||lifecycle.executionAuthorized!==true||lifecycle.allowedExecutions!==1||lifecycle.stopRetryActive!==false||lifecycle.authorizationFrozen!==false) stop('V28_RUNTIME_CAPABILITIES_INVALID',JSON.stringify(lifecycle.executionProfile||{}),phase);
if((process.env.ORBIT360_EXPECTED_REQUEST_VERSION||'')!==REQUEST_VERSION) stop('V28_EXPECTED_REQUEST_VERSION_INVALID',process.env.ORBIT360_EXPECTED_REQUEST_VERSION||'',phase);
if(!exists(REQUEST)) stop('V28_RUNTIME_REQUEST_MISSING',REQUEST,phase);
const r=read(REQUEST);
if(!(r.requestVersion===REQUEST_VERSION&&r.authorizationGeneration===GENERATION&&r.gateId===GATE_ID&&r.contractVersion===CONTRACT&&r.status==='AUTHORIZED_ONCE'&&r.approved===true&&r.allowedExecutions===1&&r.consumed===false&&r.authorizationFrozen===false&&r.replayAllowed===false)) stop('V28_RUNTIME_REQUEST_INVALID',r.status||'',phase);
if(!(r.scope?.purpose==='FOCAL_CLIENT_PROVENANCE_THEN_UNIVERSE_GATE_READONLY'&&r.scope?.targetFingerprintCount===16&&r.scope?.firestoreReadOperationsMaximum===5&&r.scope?.firestoreWrites===false&&r.scope?.authReads===false&&r.scope?.authWrites===false&&r.scope?.hosting===false&&r.scope?.browser===false&&r.scope?.functionsDeploy===false&&r.scope?.rulesDeploy===false&&r.scope?.reimport===false&&r.scope?.production===false&&r.scope?.main===false&&r.scope?.merge===false)) stop('V28_RUNTIME_REQUEST_SCOPE_INVALID','scope',phase);
const branch=process.env.ORBIT360_BRANCH||process.env.GITHUB_HEAD_REF||''; if(branch&&branch!==CANONICAL) stop('V28_RUNTIME_BRANCH_MISMATCH',branch,phase);
const out={schemaVersion:'orbit360-gate-contract-preflight-block1-v28-v1',gateId:GATE_ID,contractVersion:CONTRACT,authorizationGeneration:GENERATION,executionPhase:RUNTIME_PHASE,status:'GO_GATE_CONTRACT',classification:'GO_BLOCK1_FOCAL_PROVENANCE_UNIVERSE_READONLY_V28',total:22,passed:22,failed:0,failedCheckIds:[],requestVersion:REQUEST_VERSION,targetFingerprintCount:16,baselineContract:{clientes:414,aseguradoras:26,asesores:7},firestoreReadOperationsMaximum:5,executionAuthorized:true,secretAccessAuthorized:true,firestoreReadAuthorized:true,firestoreWriteAuthorized:false,authReadAuthorized:false,authWriteAuthorized:false,browserAuthorized:false,hostingAuthorized:false,functionsDeployAuthorized:false,rulesDeployAuthorized:false,productionAuthorized:false,writesAuthorized:0,dataAccess:false,secretAccess:false,secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false,ok:true};write(out);console.log(JSON.stringify(out,null,2));process.exit(0);
