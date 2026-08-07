#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT=process.cwd();
const GATE_ID='block1-client360-insurers-lab-v20260717';
const CONTRACT='1.0.41';
const BASE='b7f35f1a76d43e2485e0631a618a4ef6ec297336';
const GENERATION='v29-identity-reconciliation-universe-readonly';
const REQUEST_VERSION='20260807.29-identity-reconciliation-universe-readonly';
const LIFECYCLE='tools/orbit360-validator-lifecycle-block1-identity-reconciliation-universe-v29-v20260807.json';
const REQUEST=process.env.ORBIT360_REQUEST_FILE||'.github/orbit360-requests/block1-client360-insurers-v29-identity-reconciliation-universe-authorization.json';
const V28='orbit360-platform/runtime-gate-crm-v20260716/v28-block1-final-sanitized-v20260807.json';
const TOOL='tools/orbit360-identity-reconcile-universe-v29-v20260807.mjs';
const TEST='tools/orbit360-test-identity-reconciliation-universe-v29-source-v20260807.mjs';
const PREFLIGHT='tools/orbit360-preflight-block1-identity-reconciliation-universe-v29-v20260807.mjs';
const SOURCE_WF='.github/workflows/orbit360-sourcecheck-v29-identity-reconciliation-universe-v20260807.yml';
const RUNTIME_WF='.github/workflows/orbit360-registered-relay-v29-identity-reconciliation-universe-v20260807.yml';
const EVIDENCE='orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json';
const SOURCE_PHASE='SOURCE_ONLY_IDENTITY_RECONCILIATION_UNIVERSE_V29';
const RUNTIME_PHASE='BLOCK1_IDENTITY_RECONCILIATION_UNIVERSE_READONLY_V29';
const SOURCE_CAPS={secrets:false,firestoreRead:false,writes:false,runtime:false,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false};
const RUNTIME_CAPS={secrets:true,firestoreRead:true,writes:false,runtime:true,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false};
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8').replace(/^\uFEFF/,''));
const exists=p=>fs.existsSync(path.join(ROOT,p));
const exact=(a,b)=>JSON.stringify(a||{})===JSON.stringify(b||{});
const safe=v=>String(v==null?'':v).replace(/[\w.+-]+@[\w.-]+/g,'[email]').slice(0,900);
function write(v){const p=path.join(ROOT,EVIDENCE);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n','utf8');}
function stop(id,detail,phase=''){const out={schemaVersion:'orbit360-gate-contract-preflight-block1-v29-v1',gateId:GATE_ID,contractVersion:CONTRACT,authorizationGeneration:GENERATION,executionPhase:phase||'UNKNOWN',status:'VALIDATOR_STALE',classification:'PIPELINE_MECHANISM_FAILURE',total:1,passed:0,failed:1,failedCheckIds:[id],detail:safe(detail),dataAccess:false,secretAccess:false,secretsRead:false,firestoreRead:false,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false,ok:false};write(out);console.log(JSON.stringify(out,null,2));process.exit(41);}
for(const f of [LIFECYCLE,V28,TOOL,TEST,PREFLIGHT,SOURCE_WF,RUNTIME_WF])if(!exists(f))stop('V29_REQUIRED_FILE_MISSING',f);
const lifecycle=read(LIFECYCLE);const v28=read(V28);const phase=lifecycle.currentPhase||lifecycle.executionProfile?.phase||'';
if(process.argv[2]&&process.argv[2]!==GATE_ID)stop('V29_GATE_ARGUMENT_MISMATCH',process.argv[2],phase);
if(lifecycle.gateId!==GATE_ID||lifecycle.gateContractVersion!==CONTRACT||lifecycle.authorizationGeneration!==GENERATION||lifecycle.authorizedBaseHead!==BASE)stop('V29_LIFECYCLE_IDENTITY_INVALID','gate/version/generation/base',phase);
if(!(v28.decision==='STOP_RETRY'&&v28.classification==='DATA_CONTRACT_FAILURE'&&v28.rootCause==='CLIENT_PROVENANCE_NOT_DEMONSTRABLE_AFTER_AUTHORIZED_FOCAL_READ'&&v28.targetProvenance?.count===16&&v28.targetProvenance?.unresolved===16&&v28.targetProvenance?.contradictions===0&&v28.universe===null))stop('V29_V28_TERMINAL_BASIS_INVALID','v28 evidence',phase);
if(!(lifecycle.sourceIdentityContract?.writeCandidates===414&&lifecycle.sourceIdentityContract?.requiresValidation===26&&lifecycle.sourceIdentityContract?.exactDuplicateRecords===16&&lifecycle.sourceIdentityContract?.probableDuplicateRecords===10&&lifecycle.sourceIdentityContract?.exactDuplicateCriterion==='IDENTIDAD_NORMALIZADA_IGUAL'))stop('V29_SOURCE_IDENTITY_CONTRACT_INVALID','414/26/16/10',phase);
for(const f of [TOOL,TEST,PREFLIGHT]){const c=spawnSync(process.execPath,['--check',f],{cwd:ROOT,encoding:'utf8'});if(c.status!==0)stop('V29_SOURCE_SYNTAX',`${f}:${c.stderr||c.stdout}`,phase);}
const fixture=spawnSync(process.execPath,[TEST],{cwd:ROOT,encoding:'utf8',maxBuffer:32*1024*1024});if(fixture.status!==0||!/PASS_V29_IDENTITY_RECONCILIATION_SOURCE/.test(fixture.stdout||''))stop('V29_SOURCE_FIXTURE_FAILED',fixture.stderr||fixture.stdout,phase);
if(phase===SOURCE_PHASE){
 if(!exact(lifecycle.executionProfile?.capabilities,SOURCE_CAPS)||lifecycle.executionAuthorized!==false||lifecycle.allowedExecutions!==1||lifecycle.authorizationReserved!==true||lifecycle.authorizationFrozen!==false)stop('V29_SOURCE_CAPABILITIES_INVALID',JSON.stringify(lifecycle.executionProfile||{}),phase);
 if(exists(REQUEST))stop('V29_REQUEST_EXISTS_DURING_SOURCE',REQUEST,phase);
 const out={schemaVersion:'orbit360-gate-contract-preflight-block1-v29-v1',gateId:GATE_ID,contractVersion:CONTRACT,authorizationGeneration:GENERATION,executionPhase:SOURCE_PHASE,status:'PASS_GATE_CONTRACT_SOURCE_V29',classification:'DATA_CONTRACT_ROOT_CAUSE_IDENTITY_RECONCILIATION_SOURCE_ONLY',total:20,passed:20,failed:0,failedCheckIds:[],authorizedBaseHead:BASE,targetFingerprintCount:16,baselineContract:{clientes:414,aseguradoras:26,asesores:7},sourceIdentityContract:lifecycle.sourceIdentityContract,requestPresent:false,executionAuthorized:false,secretAccessAuthorized:false,firestoreReadAuthorized:false,firestoreWriteAuthorized:false,authReadAuthorized:false,authWriteAuthorized:false,browserAuthorized:false,hostingAuthorized:false,functionsDeployAuthorized:false,rulesDeployAuthorized:false,productionAuthorized:false,writesAuthorized:0,dataAccess:false,secretAccess:false,secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false,ok:true};write(out);console.log(JSON.stringify(out,null,2));process.exit(0);
}
if(phase!==RUNTIME_PHASE)stop('V29_LIFECYCLE_PHASE_UNSUPPORTED',phase,phase);
if(!exact(lifecycle.executionProfile?.capabilities,RUNTIME_CAPS)||lifecycle.executionAuthorized!==true||lifecycle.allowedExecutions!==1||lifecycle.stopRetryActive!==false)stop('V29_RUNTIME_CAPABILITIES_INVALID',JSON.stringify(lifecycle.executionProfile||{}),phase);
if(process.env.ORBIT360_EXPECTED_REQUEST_VERSION!==REQUEST_VERSION)stop('V29_EXPECTED_REQUEST_VERSION_INVALID',process.env.ORBIT360_EXPECTED_REQUEST_VERSION||'',phase);
if(!exists(REQUEST))stop('V29_RUNTIME_REQUEST_MISSING',REQUEST,phase);const req=read(REQUEST);
if(!(req.requestVersion===REQUEST_VERSION&&req.authorizationGeneration===GENERATION&&req.gateId===GATE_ID&&req.contractVersion===CONTRACT&&req.status==='AUTHORIZED_ONCE'&&req.approved===true&&req.allowedExecutions===1&&req.consumed===false&&req.authorizationFrozen===false&&req.replayAllowed===false))stop('V29_RUNTIME_REQUEST_INVALID',req.status||'',phase);
if(!(req.scope?.identityProjectionOnly===true&&req.scope?.repeatV28ProvenanceFields===false&&req.scope?.baselineIdentityInMemory===true&&req.scope?.demoSourceInMemory===true&&req.scope?.externalAuditOnlyIfRegistered===true&&req.scope?.universeAfterFullAdjudicationOnly===true&&req.scope?.expectedUniverse?.clientes===414&&req.scope?.expectedUniverse?.aseguradoras===26&&req.scope?.expectedUniverse?.asesores===7&&req.scope?.firestoreWrites===false&&req.scope?.authReads===false&&req.scope?.authWrites===false&&req.scope?.hosting===false&&req.scope?.browser===false&&req.scope?.reimport===false&&req.scope?.production===false&&req.scope?.main===false&&req.scope?.merge===false))stop('V29_RUNTIME_REQUEST_SCOPE_INVALID','request scope',phase);
const out={schemaVersion:'orbit360-gate-contract-preflight-block1-v29-v1',gateId:GATE_ID,contractVersion:CONTRACT,authorizationGeneration:GENERATION,executionPhase:RUNTIME_PHASE,status:'GO_GATE_CONTRACT',classification:'GO_BLOCK1_IDENTITY_RECONCILIATION_UNIVERSE_READONLY_V29',total:24,passed:24,failed:0,failedCheckIds:[],requestVersion:REQUEST_VERSION,targetFingerprintCount:16,baselineContract:{clientes:414,aseguradoras:26,asesores:7},firestoreReadOperationsMaximum:4,executionAuthorized:true,secretAccessAuthorized:true,firestoreReadAuthorized:true,firestoreWriteAuthorized:false,authReadAuthorized:false,authWriteAuthorized:false,browserAuthorized:false,hostingAuthorized:false,functionsDeployAuthorized:false,rulesDeployAuthorized:false,productionAuthorized:false,writesAuthorized:0,dataAccess:false,secretAccess:false,secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false,ok:true};write(out);console.log(JSON.stringify(out,null,2));process.exit(0);
