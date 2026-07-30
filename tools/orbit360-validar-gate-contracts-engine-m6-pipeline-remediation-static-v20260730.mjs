#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const GATE='block6-go-live-product-v20260730';
const VERSION='6.1.3';
const WORKFLOW='.github/workflows/orbit360-m6-corrective-go-live-v20260730.yml';
const READINESS='tools/orbit360-hosting-readiness-bounded-v20260730.mjs';
const checks=[];
const add=(id,ok,detail='')=>checks.push({id,ok:Boolean(ok),detail:String(detail||'').slice(0,240)});
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');
function write(payload){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n');}
try{
  add('GATE',process.argv[2]===GATE);
  add('BRANCH',process.env.ORBIT360_BRANCH==='ays/backend-tenant-lab-v99-20260703');
  const required=[
    READINESS,
    WORKFLOW,
    'firebase.product-go-live.json',
    'firebase.product-rollback-safe.json',
    'firestore.product-readonly.rules',
    'firestore.product-deny-all.rules',
    'orbit360-platform/docs/CIERRE-M6-STOP-RETRY-CAUSA-RAIZ-20260730.md',
    'orbit360-platform/docs/LEDGER-M6-FIXES-REUTILIZABLES-PROTOTIPO-CLAUDE-ACADEMIA-20260730.md',
    'orbit360-platform/docs/ACADEMIA-M6-CAUSA-RAIZ-READINESS-ROLLBACK-20260730.md'
  ];
  add('FILES',required.every(r=>fs.existsSync(path.join(ROOT,r))),required.filter(r=>!fs.existsSync(path.join(ROOT,r))).join(','));
  execFileSync(process.execPath,['--check',READINESS],{cwd:ROOT,stdio:'pipe'});
  add('READINESS_SYNTAX',true);
  const owner=read(READINESS);
  add('READINESS_OWNER',owner.includes('M6_HOSTING_READINESS_PASS')&&owner.includes('M6_HOSTING_READINESS_TIMEOUT')&&owner.includes('orbitReadiness')&&owner.includes('auth-product-runtime-p0.js')&&owner.includes('La plataforma no está disponible temporalmente')&&owner.includes("timeoutMs=Math.max(15000")&&owner.includes('readOnly:true'));
  const wf=read(WORKFLOW);
  add('SINGLE_WORKFLOW',wf.includes('tools/orbit360-m6-recovery-request-v20260730.json')&&wf.includes(WORKFLOW));
  add('STATIC_AND_RECOVERY_MODES',wf.includes('recovery_requested')&&wf.includes('needs.static_preflight.outputs.recovery_requested')&&wf.includes("id: static_preflight"));
  add('BOUNDED_PRODUCT_READINESS',wf.includes('node tools/orbit360-hosting-readiness-bounded-v20260730.mjs product')&&!wf.includes('curl --fail --silent --show-error --location --max-time 30 -H'));
  add('BOUNDED_ROLLBACK_READINESS',wf.includes('node tools/orbit360-hosting-readiness-bounded-v20260730.mjs rollback'));
  add('DEPLOY_STAGE_SEPARATED',wf.includes('id: firebase_deploy')&&wf.includes('id: hosting_readiness')&&wf.includes('id: browser')&&wf.includes('id: rollback'));
  add('STORAGE_DEFERRED',wf.includes('firestore:rules,hosting')&&!wf.includes('firestore:rules,storage,hosting')&&wf.includes('storageDeferredFailClosed'));
  add('RAW_PROVIDER_EVIDENCE',wf.includes('m6-product-deploy-raw.json')&&wf.includes('m6-product-rollback-raw.json'));
  const go=JSON.parse(read('firebase.product-go-live.json')),rb=JSON.parse(read('firebase.product-rollback-safe.json'));
  add('CONFIG_NO_STORAGE',go.firestore?.rules==='firestore.product-readonly.rules'&&!go.storage&&go.hosting?.public==='orbit360-platform'&&rb.firestore?.rules==='firestore.product-deny-all.rules'&&!rb.storage&&rb.hosting?.public==='orbit360-platform/rollback-safe');
  const failed=checks.filter(c=>!c.ok);
  const out={schemaVersion:'orbit360-gate-contract-preflight-m6-pipeline-remediation-static-v1',gateId:GATE,contractVersion:VERSION,executionPhase:'M6_PRODUCT_GO_LIVE_PIPELINE_REMEDIATION_STATIC',status:failed.length?'VALIDATOR_STALE':'GO_GATE_CONTRACT',classification:failed.length?'PIPELINE_MECHANISM_FAILURE':null,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(c=>c.id),checks,staticReady:failed.length===0,stopRetryActive:true,originalFailedRuns:[30516109429,30517031703],rootCauseEnvironmentClosed:true,rootCausePipelineClosed:true,storageDeferredFailClosed:true,recoveryAuthorizationPresent:false,capabilityProfile:{secrets:false,firestoreRead:false,writes:false,runtime:false,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false},dataAccess:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
  write(out);console.log(JSON.stringify(out,null,2));if(failed.length)process.exit(41);
}catch(error){write({schemaVersion:'orbit360-gate-contract-preflight-m6-pipeline-remediation-static-v1',gateId:GATE,contractVersion:VERSION,status:'VALIDATOR_STALE',classification:'PIPELINE_MECHANISM_FAILURE',failed:1,failedCheckIds:['M6_PIPELINE_REMEDIATION_STATIC_EXCEPTION'],error:String(error&&error.message||error).slice(0,500),staticReady:false,stopRetryActive:true,capabilityProfile:{secrets:false,firestoreRead:false,writes:false,runtime:false,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false},dataAccess:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false});process.exit(41);}
