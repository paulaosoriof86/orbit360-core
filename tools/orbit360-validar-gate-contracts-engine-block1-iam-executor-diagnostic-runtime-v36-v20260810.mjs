#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
const GATE='block1-client360-insurers-lab-v20260717';
const VERSION='1.0.41';
const REQUEST=process.env.ORBIT360_REQUEST_FILE||'';
const EXPECTED_VERSION=process.env.ORBIT360_EXPECTED_REQUEST_VERSION||'';
const EXPECTED_PARENT=process.env.ORBIT360_EXPECTED_PARENT_HEAD||'';
const OUT='orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json';
const checks=[];
const ck=(id,ok)=>checks.push({id,ok:Boolean(ok)});
const readJson=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
function persist(v){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(v,null,2)+'\n','utf8');console.log(JSON.stringify(v,null,2));}
try{
  ck('REQUEST_PRESENT',REQUEST&&fs.existsSync(REQUEST));
  const r=checks.at(-1).ok?readJson(REQUEST):{};
  ck('SCHEMA',r.schemaVersion==='orbit360-runtime-request-v1');
  ck('GATE',r.gateId===GATE&&r.contractVersion===VERSION);
  ck('GENERATION',r.authorizationGeneration==='v36-iam-executor-diagnostic-readonly-runtime');
  ck('VERSION',r.requestVersion===EXPECTED_VERSION&&Boolean(EXPECTED_VERSION));
  ck('ACTIVE_ONCE',r.status==='AUTHORIZED_ONCE'&&r.approved===true&&r.allowedExecutions===1&&r.consumed===false&&r.authorizationFrozen===false&&r.replayAllowed===false);
  ck('PARENT',r.parentHead===EXPECTED_PARENT&&r.authorizedBaseHead===EXPECTED_PARENT&&Boolean(EXPECTED_PARENT));
  ck('OPERATION',r.operation==='IAM_EXECUTOR_DIAGNOSTIC_READONLY');
  ck('TARGET',r.targetResource==='projects/ays-orbit-360-lab/locations/global/buckets/_Default/views/_AllLogs');
  ck('PERMISSIONS',Array.isArray(r.permissions)&&r.permissions.length===2&&r.permissions[0]==='logging.views.getIamPolicy'&&r.permissions[1]==='logging.views.setIamPolicy');
  ck('READ_BUDGETS',r.ancestryReadsMaximum===1&&r.policyAnalyzerQueriesMaximum===1&&r.candidatePrincipalsMaximum===20&&r.policyTroubleshooterQueriesMaximum===40);
  ck('ZERO_WRITES',r.iamWritesAuthorized===0&&r.operationalWritesAuthorized===0);
  ck('ZERO_DATA',r.firestoreReadsAuthorized===0&&r.authReadsAuthorized===0&&r.loggingEntryReadsAuthorized===0);
  ck('SANITIZATION',r.persistRawPrincipals===false&&r.persistRawPolicies===false&&r.persistSecrets===false&&r.principalFingerprintsOnly===true);
  ck('NO_UI_DEPLOY_PROD',r.hostingAuthorized===false&&r.browserAuthorized===false&&r.deployAuthorized===false&&r.productionAuthorized===false&&r.mainAuthorized===false&&r.mergeAuthorized===false);
  ck('USER_AUTH',r.authorizedByUser===true);
  ck('REQUEST_SANITIZED',r.containsPII===false&&r.containsSecrets===false);
  const failed=checks.filter(x=>!x.ok);
  const out={schemaVersion:'orbit360-gate-contract-preflight-block1-v36-runtime-v1',gateId:GATE,contractVersion:VERSION,authorizationGeneration:'v36-iam-executor-diagnostic-readonly-runtime',executionPhase:'BLOCK1_IAM_EXECUTOR_DIAGNOSTIC_READONLY_V36',status:failed.length?'STOP_GATE_CONTRACT_RUNTIME_V36':'GO_GATE_CONTRACT_RUNTIME_V36',classification:failed.length?'VALIDATOR_STALE':'ENVIRONMENT_IAM_EXECUTOR_DIAGNOSTIC_AUTHORIZED_READONLY',total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),executionAuthorized:failed.length===0,secretAccessAuthorized:failed.length===0,iamReadAuthorized:failed.length===0,iamWriteAuthorized:false,ancestryReadsMaximum:1,policyAnalyzerQueriesMaximum:1,candidatePrincipalsMaximum:20,policyTroubleshooterQueriesMaximum:40,iamWritesAuthorized:0,firestoreReadAuthorized:false,authReadAuthorized:false,loggingEntryReadAuthorized:false,operationalWritesAuthorized:0,hostingAuthorized:false,browserAuthorized:false,deployAuthorized:false,productionAuthorized:false,secretAccess:false,iamRead:false,iamWrite:false,runtimeExecuted:false,containsPII:false,containsSecrets:false,ok:failed.length===0};
  persist(out);process.exit(failed.length?41:0);
}catch(e){persist({schemaVersion:'orbit360-gate-contract-preflight-block1-v36-runtime-v1',gateId:GATE,contractVersion:VERSION,status:'STOP_GATE_CONTRACT_RUNTIME_V36',classification:'PIPELINE_MECHANISM_FAILURE',failed:1,failedCheckIds:['ENGINE_EXCEPTION'],error:String(e?.message||e).slice(0,180),secretAccess:false,iamRead:false,iamWrite:false,runtimeExecuted:false,containsPII:false,containsSecrets:false,ok:false});process.exit(41);}
