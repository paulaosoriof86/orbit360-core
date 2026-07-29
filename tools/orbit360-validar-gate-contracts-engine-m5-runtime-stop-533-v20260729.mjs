#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
const ROOT=process.cwd(),OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const STOP='tools/orbit360-m5-runtime-stop-overlay-533-v20260729.json';
const json=r=>JSON.parse(fs.readFileSync(path.join(ROOT,r),'utf8'));
const s=json(STOP),checks=[];const c=(id,ok)=>checks.push({id,ok:Boolean(ok),detail:''});
c('STATUS',s.status==='M5_RUNTIME_533_STOPPED_AFTER_ONE_SHOT_FUNCTIONAL_DEFECT_ZERO_WRITES');
c('RC',s.releaseCandidate?.hash==='4bf3c8025654f43f6e4af20e5d16115bdc0851352ccddc6f099649405883cf3b'&&s.releaseCandidate?.criticalAssets===43&&s.releaseCandidate?.publicAssetsMatched===26&&s.releaseCandidate?.remoteParity===true);
c('ONE_SHOT_CONSUMED',s.authorization?.runtimeSmokeAuthorized===false&&s.authorization?.allowedRuntimeExecutions===0&&s.authorization?.runtimeAuthorizationConsumed===true&&s.authorization?.runtimeRerunForbidden===true);
c('ZERO_WRITES',s.runtime533?.allCountsStable===true&&s.runtime533?.allDigestsStable===true&&s.runtime533?.firestoreWrites===0&&s.runtime533?.operationalWrites===0&&s.runtime533?.networkWriteCandidates===0&&s.runtime533?.blockedOperationalCalls===1);
c('CLASSIFICATION',s.runtime533?.classification==='FUNCTIONAL_DEFECT'&&s.runtime533?.secondaryClassification==='VALIDATOR_STALE');
c('BLOCKS',s.authorization?.visualReviewAuthorized===false&&s.authorization?.productionAuthorized===false&&s.safety?.hostingDeploy===false&&s.safety?.functionsDeploy===false&&s.safety?.rulesDeploy===false&&s.safety?.production===false&&s.safety?.pólizas===false);
const failed=checks.filter(x=>!x.ok);const out={schemaVersion:'orbit360-gate-contract-preflight-m5-runtime-stop-533-v1',gateId:'block5-release-candidate-visualization-v20260728',contractVersion:'5.0.33',status:failed.length?'VALIDATOR_STALE':'M5_RUNTIME_533_STOPPED_AFTER_ONE_SHOT_FUNCTIONAL_DEFECT_ZERO_WRITES',classification:failed.length?'PIPELINE_MECHANISM_FAILURE':null,executionPhase:'M5_VALIDATOR_REDESIGN_STATIC',executionAuthorized:false,allowedExecutions:0,passed:checks.length-failed.length,total:checks.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,releaseCandidateHash:s.releaseCandidate?.hash||'',criticalAssets:43,remoteAssetsExpected:26,remoteAssetsMatched:26,remoteParity:true,runtimeAuthorizationConsumed:true,runtimeRerunForbidden:true,firestoreWrites:0,operationalWrites:0,capabilityProfile:{secrets:false,firestoreRead:false,writes:false,runtime:false,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false},sourceTransformed:false,dataAccess:false,secretAccess:false,secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,deployExecuted:false,productionTouched:false,visualReviewAuthorized:false,containsPII:false,containsSecrets:false};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n','utf8');console.log(JSON.stringify(out,null,2));if(failed.length)process.exit(41);
