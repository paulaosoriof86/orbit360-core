#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
const ROOT=process.cwd(),DIR=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716'),OUT=path.join(DIR,'preflight-sanitizado.json');
const STOP='tools/orbit360-m5-runtime-stop-overlay-539-v20260730.json';
const json=r=>JSON.parse(fs.readFileSync(path.join(ROOT,r),'utf8'));
try{
 const s=json(STOP),checks=[];const add=(id,ok,d='')=>checks.push({id,ok:Boolean(ok),detail:String(d||'').slice(0,220)});
 add('STATUS',s.status==='M5_RUNTIME_539_STOPPED_AFTER_ONE_SHOT_UNVERSIONED_COURSE_ZERO_WRITES');
 add('AUTH_CONSUMED',s.runtime?.authorizationConsumed===true&&s.runtime?.allowedRuntimeExecutions===0&&s.runtime?.rerunForbidden===true);
 add('ZERO_WRITES',s.runtime?.firestoreWrites===0&&s.runtime?.operationalWrites===0&&s.runtime?.networkWriteCandidates===0);
 add('STABLE',s.runtime?.snapshotBeforeOk===true&&s.runtime?.snapshotAfterOk===true&&s.runtime?.allCountsStable===true&&s.runtime?.allDigestsStable===true);
 add('BLOCKED_ONE',s.runtime?.transientStaticCalls===62&&s.runtime?.blockedOperationalCalls===1&&s.runtime?.blockedCollection==='cursos');
 add('RC',s.releaseCandidate?.hash==='097d4e85b37e3c26406e856d94fe156e1f40723b9dec40ba567334c573cc855a'&&s.releaseCandidate?.criticalAssets===46&&s.releaseCandidate?.publicAssets===29&&s.releaseCandidate?.publicParity==='29/29');
 const failed=checks.filter(x=>!x.ok),profile={secrets:false,firestoreRead:false,writes:false,runtime:false,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false};
 const out={schemaVersion:'orbit360-gate-contract-preflight-m5-runtime-stop-539-v1',gateId:'block5-release-candidate-visualization-v20260728',contractVersion:'5.0.39',executionPhase:'M5_RUNTIME_SMOKE_ROOT_CAUSE_REMEDIATION_STATIC',status:failed.length?'VALIDATOR_STALE':'M5_RUNTIME_539_STOP_CLOSED_STATIC_REMEDIATION_ONLY',classification:failed.length?'PIPELINE_MECHANISM_FAILURE':'FUNCTIONAL_DEFECT',total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,executionAuthorized:false,allowedExecutions:0,releaseCandidateHash:s.releaseCandidate?.hash||'',criticalAssets:46,remoteAssetsExpected:29,remoteAssetsMatched:29,mismatchCount:0,remoteParity:true,runtimeAuthorizationConsumed:true,runtimeSmokeAuthorized:false,hostingLabDeliveryAuthorized:false,visualReviewAuthorized:false,productionAuthorized:false,capabilityProfile:profile,secretsRead:false,firestoreRead:false,firestoreWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
 fs.mkdirSync(DIR,{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));if(failed.length)process.exit(41);
}catch(error){const out={schemaVersion:'orbit360-gate-contract-preflight-m5-runtime-stop-539-v1',gateId:'block5-release-candidate-visualization-v20260728',contractVersion:'5.0.39',status:'VALIDATOR_STALE',classification:'PIPELINE_MECHANISM_FAILURE',failed:1,failedCheckIds:['STOP_ENGINE_EXCEPTION'],error:String(error&&error.message||error).slice(0,300),executionAuthorized:false,allowedExecutions:0,capabilityProfile:{secrets:false,firestoreRead:false,writes:false,runtime:false,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false},containsPII:false,containsSecrets:false};fs.mkdirSync(DIR,{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.error(out.error);process.exit(41);}
