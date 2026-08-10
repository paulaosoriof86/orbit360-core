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
const ROLES=['roles/owner','roles/iam.securityAdmin','roles/logging.admin','roles/iam.devOps','roles/iam.infrastructureAdmin','roles/iam.networkAdmin'];
const checks=[];
const ck=(id,ok)=>checks.push({id,ok:Boolean(ok)});
const readJson=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
function persist(v){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(v,null,2)+'\n','utf8');console.log(JSON.stringify(v,null,2));}
try{
  ck('REQUEST_PRESENT',REQUEST&&fs.existsSync(REQUEST));
  const r=checks.at(-1).ok?readJson(REQUEST):{};
  ck('SCHEMA',r.schemaVersion==='orbit360-runtime-request-v1');
  ck('GATE',r.gateId===GATE&&r.contractVersion===VERSION);
  ck('GENERATION',r.authorizationGeneration==='v37-project-iam-direct-visibility-readonly-runtime');
  ck('VERSION',r.requestVersion===EXPECTED_VERSION&&Boolean(EXPECTED_VERSION));
  ck('ACTIVE_ONCE',r.status==='AUTHORIZED_ONCE'&&r.approved===true&&r.allowedExecutions===1&&r.consumed===false&&r.authorizationFrozen===false&&r.replayAllowed===false);
  ck('PARENT',r.parentHead===EXPECTED_PARENT&&r.authorizedBaseHead===EXPECTED_PARENT&&Boolean(EXPECTED_PARENT));
  ck('OPERATION',r.operation==='PROJECT_IAM_DIRECT_VISIBILITY_READONLY');
  ck('PROJECT',r.projectResource==='ays-orbit-360-lab');
  ck('TEST_PERMISSION',r.testPermission==='resourcemanager.projects.getIamPolicy');
  ck('READ_BUDGETS',r.testIamPermissionsCallsMaximum===1&&r.projectIamPolicyReadsMaximum===1&&r.requestedPolicyVersion===3);
  ck('ROLE_SET',JSON.stringify(r.candidateRoles)===JSON.stringify(ROLES));
  ck('ZERO_IAM_WRITES',r.iamWritesAuthorized===0);
  ck('ZERO_OTHER_IAM_READERS',r.policyAnalyzerQueriesAuthorized===0&&r.policyTroubleshooterQueriesAuthorized===0);
  ck('ZERO_DATA',r.firestoreReadsAuthorized===0&&r.authReadsAuthorized===0&&r.loggingEntryReadsAuthorized===0&&r.operationalWritesAuthorized===0);
  ck('SANITIZATION',r.persistRawPrincipals===false&&r.persistRawPolicies===false&&r.persistSecrets===false&&r.principalFingerprintsOnly===true);
  ck('NO_UI_DEPLOY_PROD',r.hostingAuthorized===false&&r.browserAuthorized===false&&r.deployAuthorized===false&&r.productionAuthorized===false&&r.mainAuthorized===false&&r.mergeAuthorized===false);
  ck('USER_AUTH',r.authorizedByUser===true&&r.containsPII===false&&r.containsSecrets===false);
  const failed=checks.filter(x=>!x.ok);
  const out={schemaVersion:'orbit360-gate-contract-preflight-block1-v37-runtime-v1',gateId:GATE,contractVersion:VERSION,authorizationGeneration:'v37-project-iam-direct-visibility-readonly-runtime',executionPhase:'BLOCK1_PROJECT_IAM_DIRECT_VISIBILITY_READONLY_V37',status:failed.length?'STOP_GATE_CONTRACT_RUNTIME_V37':'GO_GATE_CONTRACT_RUNTIME_V37',classification:failed.length?'VALIDATOR_STALE':'ENVIRONMENT_PROJECT_IAM_DIRECT_VISIBILITY_AUTHORIZED_READONLY',total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),executionAuthorized:failed.length===0,secretAccessAuthorized:failed.length===0,iamReadAuthorized:failed.length===0,iamWriteAuthorized:false,testIamPermissionsCallsMaximum:1,projectIamPolicyReadsMaximum:1,requestedPolicyVersion:3,iamWritesAuthorized:0,policyAnalyzerQueriesAuthorized:0,policyTroubleshooterQueriesAuthorized:0,firestoreReadAuthorized:false,authReadAuthorized:false,loggingEntryReadAuthorized:false,operationalWritesAuthorized:0,hostingAuthorized:false,browserAuthorized:false,deployAuthorized:false,productionAuthorized:false,secretAccess:false,iamRead:false,iamWrite:false,runtimeExecuted:false,containsPII:false,containsSecrets:false,ok:failed.length===0};
  persist(out);process.exit(failed.length?41:0);
}catch(e){persist({schemaVersion:'orbit360-gate-contract-preflight-block1-v37-runtime-v1',gateId:GATE,contractVersion:VERSION,status:'STOP_GATE_CONTRACT_RUNTIME_V37',classification:'PIPELINE_MECHANISM_FAILURE',failed:1,failedCheckIds:['ENGINE_EXCEPTION'],error:String(e?.message||e).slice(0,180),secretAccess:false,iamRead:false,iamWrite:false,runtimeExecuted:false,containsPII:false,containsSecrets:false,ok:false});process.exit(41);}
