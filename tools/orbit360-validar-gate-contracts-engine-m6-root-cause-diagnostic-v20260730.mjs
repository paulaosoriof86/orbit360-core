#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const ROOT=process.cwd();
const GATE='block6-go-live-product-v20260730';
const VERSION='6.1.1';
const REQUEST='tools/orbit360-m6-root-cause-diagnostic-request-v20260730.json';
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const checks=[];
const add=(id,ok,detail='')=>checks.push({id,ok:Boolean(ok),detail:String(detail||'').slice(0,240)});
function write(payload){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n');}
try{
  const req=JSON.parse(fs.readFileSync(path.join(ROOT,REQUEST),'utf8'));
  const parent=execFileSync('git',['rev-parse','HEAD^'],{cwd:ROOT,encoding:'utf8'}).trim();
  add('GATE',process.argv[2]===GATE&&req.gateId===GATE&&req.contractVersion===VERSION);
  add('BRANCH',req.branch==='ays/backend-tenant-lab-v99-20260703'&&process.env.ORBIT360_BRANCH===req.branch);
  add('BINDING',req.diagnosticBaseCommit===parent,parent);
  add('FAILED_RUN_BOUND',req.failedRunId===30516109429&&req.failedJobId===90786173738);
  add('READ_ONLY',req.readOnlyDiagnostic===true&&req.secrets===true&&req.firestoreRead===false&&req.dataWrites===false&&req.runtime===false&&req.browser===false&&req.deploy===false&&req.rulesDeploy===false&&req.functionsDeploy===false&&req.productionMutation===false&&req.merge===false&&req.main===false&&req.polizas===false);
  add('PROJECT',req.projectId==='ays-orbit-360-lab'&&req.tenantId==='alianzas-soluciones');
  const required=['tools/orbit360-m6-deploy-capability-diagnostic-readonly-v20260730.mjs','.github/workflows/orbit360-m6-root-cause-diagnostic-v20260730.yml','tools/orbit360-validator-lifecycle-contract-m6-root-cause-diagnostic-v20260730.json'];
  add('FILES',required.every(rel=>fs.existsSync(path.join(ROOT,rel))),required.filter(rel=>!fs.existsSync(path.join(ROOT,rel))).join(','));
  for(const rel of required.filter(x=>x.endsWith('.mjs')))execFileSync(process.execPath,['--check',rel],{cwd:ROOT,stdio:'pipe'});
  add('SYNTAX',true);
  const workflow=fs.readFileSync(path.join(ROOT,'.github/workflows/orbit360-m6-root-cause-diagnostic-v20260730.yml'),'utf8');
  const forbidden=['firebase deploy','hosting:channel:deploy','gcloud functions deploy','gcloud run deploy'];
  add('NO_DEPLOY_COMMAND',forbidden.every(token=>!workflow.includes(token)),forbidden.filter(token=>workflow.includes(token)).join(','));
  const failed=checks.filter(x=>!x.ok);
  const out={schemaVersion:'orbit360-gate-contract-preflight-m6-root-cause-diagnostic-v1',gateId:GATE,contractVersion:VERSION,executionPhase:'M6_PRODUCT_GO_LIVE_ROOT_CAUSE_DIAGNOSTIC',status:failed.length?'VALIDATOR_STALE':'GO_GATE_CONTRACT',classification:failed.length?'PIPELINE_MECHANISM_FAILURE':null,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,diagnosticAuthorized:failed.length===0,failedRunId:30516109429,capabilityProfile:{secrets:true,firestoreRead:false,writes:false,runtime:false,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false},dataAccess:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
  write(out);console.log(JSON.stringify(out,null,2));if(failed.length)process.exit(41);
}catch(error){write({schemaVersion:'orbit360-gate-contract-preflight-m6-root-cause-diagnostic-v1',gateId:GATE,contractVersion:VERSION,status:'VALIDATOR_STALE',classification:'PIPELINE_MECHANISM_FAILURE',failed:1,failedCheckIds:['M6_ROOT_CAUSE_PREFLIGHT_EXCEPTION'],error:String(error&&error.message||error).slice(0,500),diagnosticAuthorized:false,dataAccess:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false});process.exit(41);}
