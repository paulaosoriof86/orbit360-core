#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {validatePackageInput,validateEvidenceLedger} from './orbit360-m5-hosting-control-plane-contract-531-v20260729.mjs';

const ROOT=process.cwd(),PLAT=path.join(ROOT,'orbit360-platform');
const OUT=path.join(PLAT,'runtime-gate-crm-v20260716/preflight-sanitizado.json');
const GATE='block5-release-candidate-visualization-v20260728',VERSION='5.0.32',HASH='4bf3c8025654f43f6e4af20e5d16115bdc0851352ccddc6f099649405883cf3b';
const INPUT='tools/orbit360-m5-hosting-package-input-531-v20260729.json',LEDGER='tools/orbit360-m5-hosting-evidence-ledger-531-v20260729.json',DESCRIPTOR='tools/orbit360-m5-release-candidate-descriptor-530-v20260729.json',STOP='tools/orbit360-m5-release-candidate-hosting-stop-overlay-530-v20260729.json',CONTROL='tools/orbit360-m5-release-candidate-control-overlay-531-v20260729.json',FREEZE='tools/orbit360-m5-hosting-control-plane-531-freeze-v20260729.json',AUTH='tools/orbit360-m5-hosting-authorization-532-v20260729.json',REQUEST='tools/orbit360-m5-hosting-request-532-v20260729.json',OVERLAY='tools/orbit360-gate-contract-overlay-m5-hosting-delivery-532-v20260729.json',REGISTRY='tools/orbit360-gate-contract-registry-extension-m5-hosting-delivery-532-v20260729.json';
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8'),json=rel=>JSON.parse(read(rel)),sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const checks=[];const add=(id,ok,detail='')=>checks.push({id,ok:!!ok,detail:String(detail||'').slice(0,220)});
const assetRow=rel=>{const p=path.join(PLAT,rel);return{path:rel,present:fs.existsSync(p),sha256:fs.existsSync(p)?sha(fs.readFileSync(p)):''};};
let activationMode='active_request_invalid',executionAuthorized=false,allowedExecutions=0;
try{
  const input=json(INPUT),ledger=json(LEDGER),descriptor=json(DESCRIPTOR),stop=json(STOP),control=json(CONTROL),freeze=json(FREEZE),auth=json(AUTH),request=json(REQUEST),overlay=json(OVERLAY),registry=json(REGISTRY),firebase=json('firebase.json');
  const rows=(descriptor.criticalAssets||[]).map(assetRow),pkg=validatePackageInput({input,descriptor,assetRows:rows,firebaseConfig:firebase,stopOverlay:stop}),led=validateEvidenceLedger(ledger,INPUT);
  const parentRun=spawnSync('git',['rev-parse','HEAD^'],{cwd:ROOT,encoding:'utf8'}),parent=parentRun.status===0?String(parentRun.stdout).trim():'';
  const packageEntry=(ledger.entries||[]).find(e=>e.kind==='hosting_package_pass'&&e.sourceVersion==='5.0.32'&&e.runId===30492607881);
  const packageWorkflow=read('.github/workflows/orbit360-m5-hosting-package-532-v20260729.yml');
  add('GATE',request.gateId===GATE&&auth.gateId===GATE&&overlay.gateId===GATE&&registry.gates?.[0]?.gateId===GATE);
  add('VERSION',request.contractVersion===VERSION&&auth.contractVersion===VERSION&&overlay.contractVersion===VERSION&&registry.gates?.[0]?.contractVersion===VERSION);
  add('BRANCH',request.branch==='ays/backend-tenant-lab-v99-20260703'&&process.env.ORBIT360_BRANCH==='ays/backend-tenant-lab-v99-20260703');
  add('CONTROL_531',control.status==='M5_HOSTING_CONTROL_PLANE_531_STATIC_PASS_READY_FOR_NEW_HOSTING_AUTHORIZATION'&&control.controlPlane?.packageInputImmutable===true&&control.controlPlane?.evidenceLedgerSeparate===true&&control.controlPlane?.packageResultStableAfterEvidence===true);
  add('FREEZE_531',freeze.status==='M5_HOSTING_CONTROL_PLANE_531_STATIC_PASS'&&freeze.controls?.workflowFrozen===true);
  add('PACKAGE_INPUT',pkg.ok,pkg.errors.join(','));
  add('LEDGER',led.ok&&ledger.appendOnly===true,led.errors.join(','));
  add('PACKAGE_EVIDENCE',!!packageEntry&&packageEntry.status==='PASS'&&packageEntry.candidateHash===HASH&&packageEntry.remoteAssetsMatched===24&&packageEntry.remoteAssetsExpected===26&&packageEntry.hostingDeployExecuted===false);
  add('PACKAGE_WORKFLOW_FROZEN',packageWorkflow.includes('FROZEN')&&packageWorkflow.includes('workflow_dispatch')&&packageWorkflow.includes('rerun forbidden'));
  add('AUTH_SCHEMA',auth.schemaVersion==='orbit360-m5-hosting-authorization-532-v1'&&auth.explicitAuthorization===true&&auth.immutableAfterCreation===true);
  add('AUTH_SOURCE',auth.authorizationSource==='user_autorizado_hosting_nuevo_20260729_post_531');
  add('AUTH_EXECUTION',auth.hostingLabDeliveryAuthorized===true&&auth.allowedExecutions===1&&auth.hostingOnly===true);
  add('AUTH_CANDIDATE',auth.releaseCandidateHash===HASH&&pkg.computedHash===HASH&&auth.criticalAssets===43&&auth.remoteAssetsExpected===26);
  add('AUTH_SCOPE',auth.firestoreRead===false&&auth.firestoreWrite===false&&auth.operationalWrites===false&&auth.browser===false&&auth.runtimeSmoke===false&&auth.functionsDeploy===false&&auth.rulesDeploy===false&&auth.production===false&&auth.mergeMain===false&&auth.policies===false&&auth.pólizas===false&&auth.visualReview===false);
  add('REQUEST_SCHEMA',request.schemaVersion==='orbit360-m5-hosting-request-532-v1'&&request.allowedExecutions===1&&request.hostingLabDelivery===true);
  add('REQUEST_PARENT',request.authorizedBaseCommit===parent,parent);
  add('REQUEST_AUTH',request.authorization===AUTH&&request.authorizationSource===auth.authorizationSource);
  add('REQUEST_CANDIDATE',request.releaseCandidateHash===HASH&&request.criticalAssets===43&&request.remoteAssetsExpected===26);
  add('REQUEST_TARGET',request.projectId==='ays-orbit-360-lab'&&request.channel==='orbit360-ays-lab'&&request.canonicalUrl==='https://ays-orbit-360-lab--orbit360-ays-lab-fj1zxnk2.web.app');
  add('REQUEST_SCOPE',request.secrets===true&&request.deploy===true&&request.hostingOnly===true&&request.firestoreRead===false&&request.firestoreWrite===false&&request.operationalWrites===false&&request.browser===false&&request.runtimeSmoke===false&&request.functionsDeploy===false&&request.rulesDeploy===false&&request.production===false&&request.mergeMain===false&&request.policies===false&&request.pólizas===false&&request.visualReview===false&&request.containsPII===false&&request.containsSecrets===false);
  add('OVERLAY',overlay.required?.releaseCandidateHash===HASH&&overlay.required?.remoteAssetsMatchedBefore===24&&overlay.required?.remoteAssetsMatchedAfter===26&&overlay.required?.hostingDeployExecutions===1);
  add('REGISTRY',registry.gates?.length===1&&registry.gates[0]?.phase==='M5_LAB_HOSTING_DELIVERY'&&registry.gates[0]?.engine==='tools/orbit360-validar-gate-contracts-engine-m5-hosting-delivery-532-v20260729.mjs');
  add('SANITIZED',auth.containsPII===false&&auth.containsSecrets===false&&request.containsPII===false&&request.containsSecrets===false);
  const failed=checks.filter(x=>!x.ok);if(!failed.length){activationMode='immutable_request_present';executionAuthorized=true;allowedExecutions=1;}
  const profile={secrets:true,firestoreRead:false,writes:false,runtime:false,browser:false,deploy:true,functionsDeploy:false,rulesDeploy:false,production:false};
  const out={schemaVersion:'orbit360-gate-contract-preflight-m5-hosting-delivery-532-v1',gateId:GATE,contractVersion:VERSION,validatorRevision:VERSION,executionPhase:'M5_LAB_HOSTING_DELIVERY',status:failed.length?'VALIDATOR_STALE':'GO_GATE_CONTRACT',classification:failed.length?'PIPELINE_MECHANISM_FAILURE':null,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,activationMode,executionAuthorized,allowedExecutions,releaseCandidateHash:pkg.computedHash,criticalAssets:43,remoteAssetsExpected:26,remoteAssetsMatchedBefore:24,capabilityProfile:profile,packageInputImmutable:true,evidenceLedgerSeparate:true,packageRunId:30492607881,sourceTransformed:false,dataAccess:false,secretAccess:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,operationalWrites:0,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
  fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));if(failed.length)process.exit(41);
}catch(error){const profile={secrets:true,firestoreRead:false,writes:false,runtime:false,browser:false,deploy:true,functionsDeploy:false,rulesDeploy:false,production:false};const out={schemaVersion:'orbit360-gate-contract-preflight-m5-hosting-delivery-532-v1',gateId:GATE,contractVersion:VERSION,executionPhase:'M5_LAB_HOSTING_DELIVERY',status:'VALIDATOR_STALE',classification:'PIPELINE_MECHANISM_FAILURE',failed:1,failedCheckIds:['PREFLIGHT_EXCEPTION'],error:String(error&&error.message||error).slice(0,300),activationMode:'active_request_invalid',executionAuthorized:false,allowedExecutions:0,releaseCandidateHash:HASH,criticalAssets:43,remoteAssetsExpected:26,capabilityProfile:profile,dataAccess:false,secretAccess:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.error(out.error);process.exit(41);}
