#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const ROOT=process.cwd();
const GATE='block5-release-candidate-visualization-v20260728';
const VERSION='5.0.30';
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const REQUEST='tools/orbit360-m5-lab-hosting-delivery-request-530-v20260729.json';
const files={
  lifecycle:'tools/orbit360-validator-lifecycle-contract-m5-lab-hosting-delivery-530-v20260729.json',
  registry:'tools/orbit360-gate-contract-registry-extension-m5-lab-hosting-delivery-530-v20260729.json',
  overlay:'tools/orbit360-gate-contract-overlay-m5-lab-hosting-delivery-530-v20260729.json',
  freeze:'tools/orbit360-m5-lab-hosting-delivery-freeze-530-v20260729.json',
  authorization:'tools/orbit360-m5-lab-hosting-delivery-authorization-530-v20260729.json',
  descriptor:'tools/orbit360-m5-release-candidate-descriptor-530-v20260729.json',
  contract:'tools/orbit360-m5-lab-hosting-delivery-contract-530-v20260729.cjs',
  workflow:'.github/workflows/orbit360-m5-lab-hosting-delivery-530-v20260729.yml',
  control:'tools/orbit360-m5-release-candidate-control-overlay-529-v20260729.json',
  readiness:'tools/orbit360-m5-release-candidate-readiness-530-v20260729.mjs'
};
const checks=[];const add=(id,ok,detail='')=>checks.push({id,ok:!!ok,detail:String(detail||'').slice(0,220)});
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');const json=rel=>JSON.parse(read(rel));
Object.entries(files).forEach(([key,rel])=>add('FILE:'+key,fs.existsSync(path.join(ROOT,rel)),rel));
let requestPresent=false,activationMode='package_without_request',executionAuthorized=false,allowedExecutions=0,candidateHash='';
try{
  const lifecycle=json(files.lifecycle),registry=json(files.registry),overlay=json(files.overlay),freeze=json(files.freeze),auth=json(files.authorization),descriptor=json(files.descriptor),control=json(files.control);
  requestPresent=fs.existsSync(path.join(ROOT,REQUEST));
  add('GATE',lifecycle.gateId===GATE&&registry.gates?.[0]?.gateId===GATE&&overlay.gateId===GATE&&freeze.gateId===GATE&&auth.gateId===GATE&&descriptor.gateId===GATE);
  add('VERSION',lifecycle.gateContractVersion===VERSION&&registry.gates?.[0]?.contractVersion===VERSION&&overlay.contractVersion===VERSION&&freeze.contractVersion===VERSION&&auth.contractVersion===VERSION&&descriptor.contractVersion===VERSION);
  add('PHASE',lifecycle.executionProfile?.phase==='M5_LAB_HOSTING_DELIVERY');
  const cap=lifecycle.executionProfile?.capabilities||{};add('CAPABILITIES',cap.secrets===true&&cap.firestoreRead===false&&cap.writes===false&&cap.runtime===false&&cap.browser===false&&cap.deploy===true&&cap.functionsDeploy===false&&cap.rulesDeploy===false&&cap.production===false);
  add('CONTROL_529',control.status==='M5_MULTIROL_OWNER_REMEDIATION_529_STATIC_PASS_READY_TO_REQUEST_NEW_HOSTING_LAB_DELIVERY'&&control.remediation529?.closed===true&&control.remediation529?.failed===0);
  add('DESCRIPTOR',descriptor.schemaVersion==='orbit360-m5-release-candidate-descriptor-v1'&&descriptor.criticalAssets?.length===43&&descriptor.remoteAssets?.length===26&&descriptor.remoteAssets?.includes('core/session-multirol-visibility-v20260716.js'));
  add('AUTH',auth.explicitAuthorization===true&&auth.hostingLabDeliveryAuthorized===true&&auth.allowedExecutions===1&&auth.requestCreated===requestPresent&&auth.criticalAssets===43&&auth.remoteAssetsExpected===26);
  add('FREEZE',freeze.authorization?.hostingLabDeliveryAuthorized===true&&freeze.authorization?.allowedExecutions===1&&freeze.authorization?.requestCreated===requestPresent&&freeze.baseline?.criticalAssets===43&&freeze.baseline?.remoteAssetsExpected===26);
  add('TARGET',auth.projectId==='ays-orbit-360-lab'&&auth.channel==='orbit360-ays-lab'&&descriptor.target?.projectId==='ays-orbit-360-lab'&&descriptor.target?.channel==='orbit360-ays-lab');
  for(const rel of [files.contract,files.readiness,'tools/orbit360-validar-gate-contracts-v20260717.mjs']){const run=spawnSync(process.execPath,['--check',rel],{cwd:ROOT,encoding:'utf8'});add('SYNTAX:'+rel,run.status===0,(run.stderr||'').slice(0,180));}
  const contractRun=spawnSync(process.execPath,[files.contract],{cwd:ROOT,encoding:'utf8',maxBuffer:8*1024*1024});add('CONTRACT_PROCESS',contractRun.status===0,(contractRun.stderr||'').slice(0,220));
  const summaryRel='orbit360-platform/runtime-gate-crm-v20260716/m5-lab-hosting-delivery-530-contract-summary.json';add('CONTRACT_SUMMARY',fs.existsSync(path.join(ROOT,summaryRel)),summaryRel);
  if(fs.existsSync(path.join(ROOT,summaryRel))){const summary=json(summaryRel);candidateHash=String(summary.releaseCandidateHash||'');add('CONTRACT_PASS',summary.ok===true&&summary.status==='M5_LAB_HOSTING_530_CONTRACT_PASS'&&summary.failed===0&&summary.criticalAssets===43&&summary.remoteAssets===26&&candidateHash.length===64);}
  if(requestPresent){
    const request=json(REQUEST),parentRun=spawnSync('git',['rev-parse','HEAD^'],{cwd:ROOT,encoding:'utf8'}),parent=parentRun.status===0?String(parentRun.stdout).trim():'';
    const valid=request.schemaVersion==='orbit360-m5-lab-hosting-delivery-request-530-v1'&&request.gateId===GATE&&request.contractVersion===VERSION&&request.branch==='ays/backend-tenant-lab-v99-20260703'&&request.authorizedBaseCommit===parent&&request.allowedExecutions===1&&request.hostingLabDelivery===true&&request.releaseCandidateHash===candidateHash&&request.criticalAssets===43&&request.remoteAssetsExpected===26&&request.projectId==='ays-orbit-360-lab'&&request.channel==='orbit360-ays-lab'&&request.secrets===true&&request.deploy===true&&request.hostingOnly===true&&request.firestoreRead===false&&request.firestoreWrite===false&&request.operationalWrites===false&&request.browser===false&&request.runtimeSmoke===false&&request.functionsDeploy===false&&request.rulesDeploy===false&&request.production===false&&request.mergeMain===false&&request.policies===false&&request.pólizas===false&&request.visualReview===false&&request.containsPII===false&&request.containsSecrets===false;
    add('REQUEST_BOUNDARY',valid,valid?'immutable_request_present':'active_request_invalid');activationMode=valid?'immutable_request_present':'active_request_invalid';executionAuthorized=valid;allowedExecutions=valid?1:0;
  }else add('REQUEST_BOUNDARY',true,'package_without_request');
}catch(error){add('PREFLIGHT_EXCEPTION',false,error&&error.message||error);}
const failed=checks.filter(row=>!row.ok),profile={secrets:true,firestoreRead:false,writes:false,runtime:false,browser:false,deploy:true,functionsDeploy:false,rulesDeploy:false,production:false};
const out={schemaVersion:'orbit360-gate-contract-preflight-m5-lab-hosting-delivery-530-v1',gateId:GATE,contractVersion:VERSION,validatorRevision:VERSION,executionPhase:'M5_LAB_HOSTING_DELIVERY',status:failed.length?'VALIDATOR_STALE':'GO_GATE_CONTRACT',classification:failed.length?'PIPELINE_MECHANISM_FAILURE':null,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(row=>row.id),checks,activationMode,executionAuthorized:failed.length?false:executionAuthorized,allowedExecutions:failed.length?0:allowedExecutions,releaseCandidateHash:candidateHash,criticalAssets:43,remoteAssetsExpected:26,capabilityProfile:profile,sourceTransformed:false,dataAccess:false,secretAccess:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,operationalWrites:0,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n','utf8');console.log(JSON.stringify(out,null,2));if(failed.length)process.exit(41);
