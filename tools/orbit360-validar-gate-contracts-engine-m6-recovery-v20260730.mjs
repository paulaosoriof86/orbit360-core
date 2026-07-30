#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const GATE='block6-go-live-product-v20260730';
const VERSION='6.1.4';
const REQUEST='tools/orbit360-m6-recovery-request-v20260730.json';
const WORKFLOW='.github/workflows/orbit360-m6-corrective-go-live-v20260730.yml';
const READINESS='tools/orbit360-hosting-readiness-bounded-v20260730.mjs';
const STATIC_RUN=30517683129;
const checks=[];
const add=(id,ok,detail='')=>checks.push({id,ok:Boolean(ok),detail:String(detail||'').slice(0,240)});
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
function write(payload){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n');}
try{
  const req=JSON.parse(read(REQUEST));
  const parent=execFileSync('git',['rev-parse','HEAD^'],{cwd:ROOT,encoding:'utf8'}).trim();
  add('GATE',process.argv[2]===GATE&&req.gateId===GATE&&req.contractVersion===VERSION);
  add('BRANCH',req.branch==='ays/backend-tenant-lab-v99-20260703'&&process.env.ORBIT360_BRANCH===req.branch);
  add('BINDING',req.recoveryBaseCommit===parent,parent);
  add('AUTHORIZATION',req.explicitRecoveryAuthorization===true&&req.authorizationSource==='user_authorized_m6_recovery_after_stop_retry_20260730'&&req.allowedExecutions===1&&req.authorizationConsumed===false&&req.stopRetryRootCauseClosed===true);
  add('STATIC_REMEDIATION',req.staticPipelineRemediationRun===STATIC_RUN&&req.boundedHostingReadiness===true);
  add('HISTORY',req.originalFailedRuns&&JSON.stringify(req.originalFailedRuns)===JSON.stringify([30516109429,30517031703])&&req.environmentDiagnosticRun===30516599013);
  add('TARGET',req.target?.projectId==='ays-orbit-360-lab'&&req.target?.tenantId==='alianzas-soluciones'&&req.target?.liveUrl==='https://ays-orbit-360-lab.web.app'&&req.createProject===false&&req.createStorageBucket===false);
  add('SCOPE',req.secrets===true&&req.firestoreRead===true&&req.firestoreDataWrites===false&&req.runtime===true&&req.browser===true&&req.hostingDeploy===true&&req.firestoreRulesDeploy===true&&req.storageRulesDeploy===false&&req.storageDeferredFailClosed===true&&req.functionsDeploy===false&&req.production===true&&req.merge===false&&req.main===false&&req.polizas===false&&req.rollbackOnFailure===true);
  const required=[READINESS,WORKFLOW,'firebase.product-go-live.json','firebase.product-rollback-safe.json','firestore.product-readonly.rules','firestore.product-deny-all.rules','tools/orbit360-m6-product-browser-smoke-v20260730.mjs','tools/orbit360-m6-product-data-snapshot-readonly-v20260730.mjs','tools/orbit360-m6-build-product-shell-v20260730.mjs','tools/orbit360-m6-root-cause-closure-v20260730.json'];
  add('FILES',required.every(r=>fs.existsSync(path.join(ROOT,r))),required.filter(r=>!fs.existsSync(path.join(ROOT,r))).join(','));
  for(const r of required.filter(x=>/\.(?:js|mjs)$/.test(x)))execFileSync(process.execPath,['--check',r],{cwd:ROOT,stdio:'pipe'});
  add('SYNTAX',true);
  const wf=read(WORKFLOW),owner=read(READINESS);
  add('ONE_STABLE_WORKFLOW',wf.includes(REQUEST)&&wf.includes('recovery_requested')&&wf.includes("needs.static_preflight.outputs.recovery_requested == 'true'"));
  add('SEPARATED_STAGES',wf.includes('id: firebase_deploy')&&wf.includes('id: hosting_readiness')&&wf.includes('id: browser')&&wf.includes('id: data_integrity')&&wf.includes('id: rollback'));
  add('BOUNDED_READINESS',wf.includes('node tools/orbit360-hosting-readiness-bounded-v20260730.mjs product')&&wf.includes('node tools/orbit360-hosting-readiness-bounded-v20260730.mjs rollback')&&owner.includes('M6_HOSTING_READINESS_PASS')&&owner.includes('M6_HOSTING_READINESS_TIMEOUT'));
  add('NO_IMMEDIATE_CURL',!wf.includes('curl --fail --silent --show-error --location --max-time 30'));
  add('STORAGE_DEFERRED',wf.includes('firestore:rules,hosting')&&!wf.includes('firestore:rules,storage,hosting'));
  add('RAW_PROVIDER_EVIDENCE',wf.includes('m6-product-deploy-raw.json')&&wf.includes('m6-product-rollback-raw.json'));
  const go=JSON.parse(read('firebase.product-go-live.json')),rb=JSON.parse(read('firebase.product-rollback-safe.json'));
  add('CONFIG',go.firestore?.rules==='firestore.product-readonly.rules'&&!go.storage&&go.hosting?.public==='orbit360-platform'&&rb.firestore?.rules==='firestore.product-deny-all.rules'&&!rb.storage&&rb.hosting?.public==='orbit360-platform/rollback-safe');
  const build=JSON.parse(execFileSync(process.execPath,['tools/orbit360-m6-build-product-shell-v20260730.mjs'],{cwd:ROOT,encoding:'utf8'}));
  add('SHELL',build.ok===true&&build.forbiddenPresent?.length===0&&Boolean(build.productSha256),build.productSha256||'');
  const packageRows=required.map(r=>({path:r,sha256:sha(fs.readFileSync(path.join(ROOT,r)))}));
  const failed=checks.filter(c=>!c.ok);
  const profile={secrets:true,firestoreRead:true,writes:false,runtime:true,browser:true,deploy:true,functionsDeploy:false,rulesDeploy:true,production:true};
  const out={schemaVersion:'orbit360-gate-contract-preflight-m6-recovery-v1',gateId:GATE,contractVersion:VERSION,executionPhase:'M6_PRODUCT_GO_LIVE_RECOVERY_EXECUTION',status:failed.length?'VALIDATOR_STALE':'GO_GATE_CONTRACT',classification:failed.length?'PIPELINE_MECHANISM_FAILURE':null,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(c=>c.id),checks,executionAuthorized:failed.length===0,allowedExecutions:failed.length?0:1,staticPipelineRemediationRun:STATIC_RUN,originalFailedRuns:[30516109429,30517031703],environmentDiagnosticRun:30516599013,stopRetryRootCauseClosed:true,boundedHostingReadiness:true,storageDeferredFailClosed:true,createStorageBucket:false,storageRulesDeploy:false,packageHash:sha(JSON.stringify(packageRows)),productShellHash:build.productSha256||'',capabilityProfile:profile,dataAccess:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
  write(out);console.log(JSON.stringify(out,null,2));if(failed.length)process.exit(41);
}catch(error){write({schemaVersion:'orbit360-gate-contract-preflight-m6-recovery-v1',gateId:GATE,contractVersion:VERSION,status:'VALIDATOR_STALE',classification:'PIPELINE_MECHANISM_FAILURE',failed:1,failedCheckIds:['M6_RECOVERY_PREFLIGHT_EXCEPTION'],error:String(error&&error.message||error).slice(0,500),executionAuthorized:false,allowedExecutions:0,dataAccess:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false});process.exit(41);}
