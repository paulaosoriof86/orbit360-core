#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const GATE='block1-client360-insurers-lab-v20260717';
const VERSION='1.0.41';
const TARGET='projects/ays-orbit-360-lab/locations/global/buckets/_Default/views/_AllLogs';
const ROLE='roles/logging.privateLogViewer';
const REQUEST=process.env.ORBIT360_REQUEST_FILE||'';
const EXPECTED_VERSION=process.env.ORBIT360_EXPECTED_REQUEST_VERSION||'';
const EXPECTED_PARENT=process.env.ORBIT360_EXPECTED_PARENT_HEAD||'';
const OUT='orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json';
const checks=[];
function ck(id,ok){checks.push({id,ok:Boolean(ok)});}
function readJson(p){return JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));}
function persist(payload){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n','utf8');console.log(JSON.stringify(payload,null,2));}

try{
  ck('REQUEST_FILE_PRESENT',REQUEST&&fs.existsSync(REQUEST));
  const r=checks.at(-1).ok?readJson(REQUEST):{};
  ck('SCHEMA',r.schemaVersion==='orbit360-runtime-request-v1');
  ck('GATE',r.gateId===GATE&&r.contractVersion===VERSION);
  ck('GENERATION',r.authorizationGeneration==='v35-logging-view-grant-audit-revoke-runtime');
  ck('VERSION',r.requestVersion===EXPECTED_VERSION&&Boolean(EXPECTED_VERSION));
  ck('ACTIVE_ONCE',r.status==='AUTHORIZED_ONCE'&&r.approved===true&&r.allowedExecutions===1&&r.consumed===false&&r.authorizationFrozen===false&&r.replayAllowed===false);
  ck('PARENT',r.parentHead===EXPECTED_PARENT&&r.authorizedBaseHead===EXPECTED_PARENT&&Boolean(EXPECTED_PARENT));
  ck('OPERATION',r.operation==='TEMPORARY_LOG_VIEW_PRIVATE_LOG_VIEWER_AUDIT_REVOKE');
  ck('TARGET_SCOPE',r.targetResource===TARGET&&r.role===ROLE);
  ck('TARGETS',r.targetFingerprintCount===2);
  ck('IAM_READ_BUDGET',r.iamPolicyReadsMaximum===4);
  ck('IAM_WRITE_BUDGET',r.iamWritesMaximum===2&&r.grantWritesMaximum===1&&r.revokeWritesMaximum===1&&r.revokeMandatory===true);
  ck('LOGGING_BUDGET',r.loggingReadPagesMaximum===10&&r.loggingEntriesPageSize===100);
  ck('NO_OTHER_DATA',r.firestoreReadsAuthorized===0&&r.authReadsAuthorized===0&&r.operationalWritesAuthorized===0);
  ck('NO_UI_DEPLOY_PROD',r.hostingAuthorized===false&&r.browserAuthorized===false&&r.deployAuthorized===false&&r.productionAuthorized===false&&r.mainAuthorized===false&&r.mergeAuthorized===false);
  ck('USER_AUTH',r.authorizedByUser===true);
  ck('SANITIZED',r.containsPII===false&&r.containsSecrets===false);
  const failed=checks.filter(x=>!x.ok);
  const out={schemaVersion:'orbit360-gate-contract-preflight-block1-v35-runtime-v1',gateId:GATE,contractVersion:VERSION,authorizationGeneration:'v35-logging-view-grant-audit-revoke-runtime',executionPhase:'BLOCK1_TEMPORARY_LOG_VIEW_GRANT_AUDIT_REVOKE_V35',status:failed.length?'STOP_GATE_CONTRACT_RUNTIME_V35':'GO_GATE_CONTRACT_RUNTIME_V35',classification:failed.length?'VALIDATOR_STALE':'ENVIRONMENT_IAM_REMEDIATION_AUTHORIZED_TEMPORARY',total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),executionAuthorized:failed.length===0,secretAccessAuthorized:failed.length===0,iamPolicyReadAuthorized:failed.length===0,iamWriteAuthorized:failed.length===0,loggingReadAuthorized:failed.length===0,iamPolicyReadsMaximum:4,iamWritesMaximum:2,grantWritesMaximum:1,revokeWritesMaximum:1,loggingReadPagesMaximum:10,firestoreReadAuthorized:false,authReadAuthorized:false,operationalWritesAuthorized:0,hostingAuthorized:false,browserAuthorized:false,deployAuthorized:false,productionAuthorized:false,secretAccess:false,iamPolicyRead:false,iamWrite:false,loggingRead:false,runtimeExecuted:false,containsPII:false,containsSecrets:false,ok:failed.length===0};
  persist(out);process.exit(failed.length?41:0);
}catch(error){persist({schemaVersion:'orbit360-gate-contract-preflight-block1-v35-runtime-v1',gateId:GATE,contractVersion:VERSION,status:'STOP_GATE_CONTRACT_RUNTIME_V35',classification:'PIPELINE_MECHANISM_FAILURE',failed:1,failedCheckIds:['ENGINE_EXCEPTION'],error:String(error?.message||error).slice(0,180),secretAccess:false,iamPolicyRead:false,iamWrite:false,loggingRead:false,runtimeExecuted:false,containsPII:false,containsSecrets:false,ok:false});process.exit(41);}
