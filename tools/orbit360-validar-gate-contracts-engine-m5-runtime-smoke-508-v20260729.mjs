#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync,execFileSync} from 'node:child_process';
const ROOT=process.cwd();
const GATE_ID=process.argv[2]||'';
const EXPECTED_GATE='block5-release-candidate-visualization-v20260728';
const VERSION='5.0.8';
const RC_HASH='b25bf2750548651a719526bc4dadf7662def2255876c4c2e5e32bdf90f93a091';
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const REQUEST='tools/orbit360-m5-runtime-smoke-508-request-v20260729.json';
const readJson=rel=>JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8'));
const checks=[];const check=(id,ok,detail='')=>checks.push({id,ok:Boolean(ok),detail:String(detail||'').slice(0,220)});
let activationMode='package_without_request',executionAuthorized=false,allowedExecutions=0;
try{
  const lifecycle=readJson('tools/orbit360-validator-lifecycle-contract-m5-runtime-smoke-508-v20260729.json');
  const auth=readJson('tools/orbit360-m5-runtime-smoke-508-authorization-v20260729.json');
  const freeze=readJson('tools/orbit360-m5-runtime-smoke-508-freeze-v20260729.json');
  const globalFreeze=readJson('tools/orbit360-m5-release-candidate-freeze-v20260728.json');
  const hosting=readJson('orbit360-platform/runtime-gate-crm-v20260716/m5-lab-hosting-delivery-507-closure.json');
  const requestPresent=fs.existsSync(path.join(ROOT,REQUEST));
  const request=requestPresent?readJson(REQUEST):{};
  const parent=requestPresent?execFileSync('git',['rev-parse','HEAD^'],{encoding:'utf8'}).trim():'';
  check('GATE_ID',GATE_ID===EXPECTED_GATE);
  check('BRANCH',(process.env.ORBIT360_BRANCH||'')==='ays/backend-tenant-lab-v99-20260703');
  check('LIFECYCLE',lifecycle.gateId===EXPECTED_GATE&&lifecycle.gateContractVersion===VERSION&&lifecycle.executionProfile?.phase==='LAB_RUNTIME_GATE');
  const capabilities=lifecycle.executionProfile?.capabilities||{};
  check('CAPABILITIES',capabilities.secrets===true&&capabilities.firestoreRead===true&&capabilities.writes===false&&capabilities.runtime===true&&capabilities.browser===true&&capabilities.deploy===false&&capabilities.functionsDeploy===false&&capabilities.rulesDeploy===false&&capabilities.production===false);
  check('AUTHORIZATION',auth.explicitAuthorization===true&&auth.runtimeSmokeAuthorized===true&&auth.allowedExecutions===1&&auth.requestCreated===requestPresent&&auth.releaseCandidateHash===RC_HASH);
  check('FREEZE',freeze.authorization?.runtimeSmokeAuthorized===true&&freeze.authorization?.allowedExecutions===1&&freeze.authorization?.requestCreated===requestPresent&&freeze.baseline?.releaseCandidateHash===RC_HASH);
  check('GLOBAL_FREEZE',requestPresent?(globalFreeze.status==='M5_RUNTIME_SMOKE_508_REQUEST_CREATED'&&globalFreeze.authorization?.runtimeSmokeAuthorized===true&&globalFreeze.authorization?.allowedRuntimeSmokeExecutions===1):(globalFreeze.status==='M5_LAB_HOSTING_CLOSED_25_OF_25_RUNTIME_SMOKE_AUTHORIZATION_REQUIRED'&&globalFreeze.authorization?.runtimeSmokeAuthorized===false&&globalFreeze.authorization?.allowedRuntimeSmokeExecutions===0));
  check('HOSTING_CLOSED',hosting.status==='M5_LAB_HOSTING_DELIVERED_AND_25_OF_25_VERIFIED'&&hosting.releaseCandidate?.hash===RC_HASH&&hosting.publicParityRecovery?.assetsMatched===25&&hosting.publicParityRecovery?.mismatchCount===0&&hosting.publicParityRecovery?.remoteParity===true&&hosting.approvalReadyForRuntimeSmoke===true);
  if(requestPresent){
    const valid=request.schemaVersion==='orbit360-m5-runtime-smoke-request-v2'&&request.gateId===EXPECTED_GATE&&request.contractVersion===VERSION&&request.branch==='ays/backend-tenant-lab-v99-20260703'&&request.authorizedBaseCommit===parent&&request.allowedExecutions===1&&request.runtimeSmoke===true&&request.releaseCandidateHash===RC_HASH&&request.criticalAssets===42&&request.remoteAssetsExpected===25&&request.projectId==='ays-orbit-360-lab'&&request.canonicalUrl==='https://ays-orbit-360-lab--orbit360-ays-lab-fj1zxnk2.web.app'&&request.reviewUrl==='https://ays-orbit-360-lab--orbit360-ays-lab-fj1zxnk2.web.app/ays-lab-preview.html'&&request.secrets===true&&request.firestoreRead===true&&request.firestoreWrite===false&&request.operationalWrites===false&&request.runtime===true&&request.browser===true&&request.deploy===false&&request.hostingDeploy===false&&request.functionsDeploy===false&&request.rulesDeploy===false&&request.production===false&&request.mergeMain===false&&request.policies===false&&request.visualReview===false&&request.containsPII===false&&request.containsSecrets===false;
    check('REQUEST_BOUNDARY',valid,valid?'immutable_request_present':'request_invalid');
    activationMode=valid?'immutable_request_present':'request_invalid';executionAuthorized=valid;allowedExecutions=valid?1:0;
  }else{
    check('REQUEST_BOUNDARY',true,'package_without_request');
  }
  const syntaxFiles=['tools/orbit360-m5-runtime-smoke-508-contract-v20260729.cjs','tools/orbit360-m5-runtime-smoke-live-readonly-v20260729.mjs','tools/orbit360-m5-runtime-smoke-508-browser-v20260729.mjs','tools/orbit360-m5-runtime-smoke-508-close-v20260729.mjs'];
  for(const rel of syntaxFiles){const run=spawnSync(process.execPath,['--check',rel],{cwd:ROOT,encoding:'utf8'});check('SYNTAX:'+rel,run.status===0,(run.stderr||'').slice(0,180));}
  const contractRun=spawnSync(process.execPath,['tools/orbit360-m5-runtime-smoke-508-contract-v20260729.cjs'],{cwd:ROOT,encoding:'utf8',maxBuffer:16*1024*1024});
  check('EXECUTABLE_CONTRACT',contractRun.status===0,(contractRun.stderr||'').slice(0,220));
  const contractPath='orbit360-platform/runtime-gate-crm-v20260716/m5-runtime-smoke-508-contract-summary.json';
  const contract=fs.existsSync(path.join(ROOT,contractPath))?readJson(contractPath):{};
  check('CONTRACT_PASS',contract.ok===true&&contract.status==='M5_RUNTIME_SMOKE_508_CONTRACT_PASS'&&contract.failed===0&&contract.releaseCandidateHash===RC_HASH&&contract.criticalAssets===42&&contract.remoteAssetsExpected===25);
  const failed=checks.filter(item=>!item.ok);
  const out={schemaVersion:'orbit360-gate-contract-preflight-m5-runtime-smoke-v2',gateId:EXPECTED_GATE,contractVersion:VERSION,status:failed.length?'VALIDATOR_STALE':'GO_GATE_CONTRACT',classification:failed.length?'PIPELINE_MECHANISM_FAILURE':null,executionPhase:'LAB_RUNTIME_GATE',validatorRevision:VERSION,activationMode,executionAuthorized:failed.length?false:executionAuthorized,allowedExecutions:failed.length?0:allowedExecutions,passed:checks.length-failed.length,total:checks.length,failed:failed.length,failedCheckIds:failed.map(item=>item.id),checks,capabilityProfile:{secrets:true,firestoreRead:true,writes:false,runtime:true,browser:true,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false},releaseCandidateHash:RC_HASH,criticalAssets:42,remoteAssetsExpected:25,remoteAssetsMatched:25,projectId:'ays-orbit-360-lab',sourceTransformed:false,dataAccess:false,secretAccess:false,operationalWrites:0,secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,functionsDeployed:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
  fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));if(failed.length)process.exit(41);
}catch(error){
  const out={schemaVersion:'orbit360-gate-contract-preflight-m5-runtime-smoke-v2',gateId:EXPECTED_GATE,contractVersion:VERSION,status:'VALIDATOR_STALE',classification:'PIPELINE_MECHANISM_FAILURE',passed:0,total:1,failed:1,failedCheckIds:['ENGINE_EXCEPTION'],error:String(error&&error.message||error).slice(0,300),capabilityProfile:{secrets:true,firestoreRead:true,writes:false,runtime:true,browser:true,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false},sourceTransformed:false,dataAccess:false,secretAccess:false,operationalWrites:0,secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,functionsDeployed:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
  fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.error(JSON.stringify(out,null,2));process.exit(41);
}
