#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
const ROOT=process.cwd();
const GATE='block5-release-candidate-visualization-v20260728';
const VERSION='5.0.30';
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const REQUEST='tools/orbit360-m5-lab-hosting-delivery-request-530-v20260729.json';
const files={
  lifecycle:'tools/orbit360-validator-lifecycle-contract-m5-lab-hosting-delivery-530-v20260729.json',
  freeze:'tools/orbit360-m5-lab-hosting-delivery-freeze-530-v20260729.json',
  authorization:'tools/orbit360-m5-lab-hosting-delivery-authorization-530-v20260729.json',
  stopOverlay:'tools/orbit360-m5-release-candidate-hosting-stop-overlay-530-v20260729.json',
  descriptor:'tools/orbit360-m5-release-candidate-descriptor-530-v20260729.json'
};
const checks=[];const add=(id,ok,detail='')=>checks.push({id,ok:!!ok,detail:String(detail||'').slice(0,220)});const json=rel=>JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8'));
Object.entries(files).forEach(([key,rel])=>add('FILE:'+key,fs.existsSync(path.join(ROOT,rel)),rel));
try{
  const lifecycle=json(files.lifecycle),freeze=json(files.freeze),auth=json(files.authorization),stop=json(files.stopOverlay),descriptor=json(files.descriptor);
  add('GATE',lifecycle.gateId===GATE&&freeze.gateId===GATE&&auth.gateId===GATE&&stop.gateId===GATE&&descriptor.gateId===GATE);
  add('VERSION',lifecycle.gateContractVersion===VERSION&&freeze.contractVersion===VERSION&&auth.contractVersion===VERSION&&stop.contractVersion===VERSION&&descriptor.contractVersion===VERSION);
  add('STATIC_PHASE',lifecycle.executionProfile?.phase==='M5_VALIDATOR_REDESIGN_STATIC');
  const cap=lifecycle.executionProfile?.capabilities||{};add('ZERO_CAPABILITIES',cap.secrets===false&&cap.firestoreRead===false&&cap.writes===false&&cap.runtime===false&&cap.browser===false&&cap.deploy===false&&cap.functionsDeploy===false&&cap.rulesDeploy===false&&cap.production===false);
  add('STOP_FREEZE',freeze.status==='M5_LAB_HOSTING_530_STOPPED_AFTER_TWO_PACKAGE_PIPELINE_FAILURES'&&freeze.controls?.packageFailureCount===2&&freeze.controls?.thirdPackageAttemptForbidden===true&&freeze.controls?.requestCreationForbidden===true&&freeze.controls?.hostingDeployForbidden===true);
  add('AUTH_INVALIDATED',auth.hostingLabDeliveryAuthorized===false&&auth.allowedExecutions===0&&auth.requestCreated===false&&auth.authorizationConsumed===false&&auth.authorizationInvalidated===true&&auth.deploy===false&&auth.secrets===false);
  add('STOP_OVERLAY',stop.authoritativeForCurrentM5HostingState===true&&stop.status==='M5_LAB_HOSTING_530_STOPPED_AFTER_TWO_PACKAGE_PIPELINE_FAILURES'&&stop.controls?.packageFailureCount===2&&stop.controls?.thirdPackageAttemptForbidden===true&&stop.controls?.requestCreationForbidden===true&&stop.controls?.hostingDeployForbidden===true);
  add('CANDIDATE_PRESERVED',stop.releaseCandidate?.hash==='4bf3c8025654f43f6e4af20e5d16115bdc0851352ccddc6f099649405883cf3b'&&stop.releaseCandidate?.criticalAssets===43&&stop.publicParity?.assetsExpected===26&&stop.publicParity?.assetsMatched===24&&stop.publicParity?.mismatchCount===2&&JSON.stringify(stop.publicParity?.mismatchPaths)===JSON.stringify(['sw.js','core/session-multirol-visibility-v20260716.js']));
  add('NO_REQUEST',!fs.existsSync(path.join(ROOT,REQUEST)));
  add('SAFETY',stop.safety?.secretsRead===false&&stop.safety?.firestoreRead===false&&stop.safety?.firestoreWrites===0&&stop.safety?.operationalWrites===0&&stop.safety?.runtime===false&&stop.safety?.browser===false&&stop.safety?.hostingDeployExecutions===0&&stop.safety?.functionsDeploy===false&&stop.safety?.rulesDeploy===false&&stop.safety?.production===false);
}catch(error){add('STOP_STATE_EXCEPTION',false,error&&error.message||error);}
const failed=checks.filter(row=>!row.ok),profile={secrets:false,firestoreRead:false,writes:false,runtime:false,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false};
const out={schemaVersion:'orbit360-gate-contract-preflight-m5-lab-hosting-stop-530-v1',gateId:GATE,contractVersion:VERSION,validatorRevision:VERSION,executionPhase:'M5_VALIDATOR_REDESIGN_STATIC',status:failed.length?'VALIDATOR_STALE':'M5_LAB_HOSTING_530_STOPPED_AFTER_TWO_PACKAGE_PIPELINE_FAILURES',classification:'PIPELINE_MECHANISM_FAILURE',total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(row=>row.id),checks,activationMode:'stopped_after_two_package_failures',executionAuthorized:false,allowedExecutions:0,releaseCandidateHash:'4bf3c8025654f43f6e4af20e5d16115bdc0851352ccddc6f099649405883cf3b',criticalAssets:43,remoteAssetsExpected:26,remoteAssetsMatchedKnown:24,mismatchCountKnown:2,mismatchPathsKnown:['sw.js','core/session-multirol-visibility-v20260716.js'],capabilityProfile:profile,sourceTransformed:false,dataAccess:false,secretAccess:false,secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,operationalWrites:0,rulesApplied:false,deployExecuted:false,productionTouched:false,requestCreationForbidden:true,thirdPackageAttemptForbidden:true,containsPII:false,containsSecrets:false};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n','utf8');console.log(JSON.stringify(out,null,2));if(failed.length)process.exit(41);
