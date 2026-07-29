#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const ROOT=process.cwd(),GATE='block5-release-candidate-visualization-v20260728',VERSION='5.0.31';
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const files={
  lifecycle:'tools/orbit360-validator-lifecycle-contract-m5-hosting-control-plane-531-v20260729.json',
  packageInput:'tools/orbit360-m5-hosting-package-input-531-v20260729.json',
  evidenceLedger:'tools/orbit360-m5-hosting-evidence-ledger-531-v20260729.json',
  pureContract:'tools/orbit360-m5-hosting-control-plane-contract-531-v20260729.mjs',
  fixture:'tools/orbit360-m5-hosting-control-plane-fixture-531-v20260729.mjs',
  stopOverlay:'tools/orbit360-m5-release-candidate-hosting-stop-overlay-530-v20260729.json',
  auth530:'tools/orbit360-m5-lab-hosting-delivery-authorization-530-v20260729.json',
  descriptor:'tools/orbit360-m5-release-candidate-descriptor-530-v20260729.json'
};
const checks=[];const add=(id,ok,detail='')=>checks.push({id,ok:!!ok,detail:String(detail||'').slice(0,220)});const json=rel=>JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8'));
Object.entries(files).forEach(([key,rel])=>add('FILE:'+key,fs.existsSync(path.join(ROOT,rel)),rel));
try{
  const lifecycle=json(files.lifecycle),input=json(files.packageInput),ledger=json(files.evidenceLedger),stop=json(files.stopOverlay),auth=json(files.auth530),descriptor=json(files.descriptor);
  add('GATE',lifecycle.gateId===GATE&&input.gateId===GATE&&ledger.gateId===GATE&&stop.gateId===GATE&&descriptor.gateId===GATE);
  add('VERSION',lifecycle.gateContractVersion===VERSION&&input.contractVersion===VERSION&&ledger.contractVersion===VERSION);
  add('PHASE',lifecycle.executionProfile?.phase==='M5_VALIDATOR_REDESIGN_STATIC');
  const cap=lifecycle.executionProfile?.capabilities||{};add('ZERO_CAPABILITIES',cap.secrets===false&&cap.firestoreRead===false&&cap.writes===false&&cap.runtime===false&&cap.browser===false&&cap.deploy===false&&cap.functionsDeploy===false&&cap.rulesDeploy===false&&cap.production===false);
  add('STOP_530',stop.status==='M5_LAB_HOSTING_530_STOPPED_AFTER_TWO_PACKAGE_PIPELINE_FAILURES'&&stop.stopVerification?.status==='PASS'&&stop.authorization?.hostingLabDeliveryAuthorized===false&&stop.authorization?.allowedExecutions===0);
  add('AUTH_530_INVALIDATED',auth.hostingLabDeliveryAuthorized===false&&auth.allowedExecutions===0&&auth.requestCreated===false&&auth.authorizationInvalidated===true&&auth.deploy===false&&auth.secrets===false);
  add('INPUT_LEDGER_SEPARATE',input.immutableAfterCreation===true&&ledger.appendOnly===true&&ledger.packageInput==='tools/orbit360-m5-hosting-package-input-531-v20260729.json');
  add('INPUT_CANDIDATE',input.expectedCandidateHash==='4bf3c8025654f43f6e4af20e5d16115bdc0851352ccddc6f099649405883cf3b'&&input.criticalAssets===43&&input.remoteAssetsExpected===26);
  add('DESCRIPTOR_43_26',descriptor.criticalAssets?.length===43&&descriptor.remoteAssets?.length===26&&descriptor.remoteAssets?.includes('core/session-multirol-visibility-v20260716.js'));
  for(const rel of [files.pureContract,files.fixture]){const run=spawnSync(process.execPath,['--check',rel],{cwd:ROOT,encoding:'utf8'});add('SYNTAX:'+rel,run.status===0,(run.stderr||'').slice(0,180));}
  const fixtureRun=spawnSync(process.execPath,[files.fixture],{cwd:ROOT,encoding:'utf8',maxBuffer:8*1024*1024});add('FIXTURE_PROCESS',fixtureRun.status===0,(fixtureRun.stderr||'').slice(0,220));
  const summaryRel='orbit360-platform/runtime-gate-crm-v20260716/m5-hosting-control-plane-fixture-531-summary.json';add('FIXTURE_SUMMARY',fs.existsSync(path.join(ROOT,summaryRel)),summaryRel);
  if(fs.existsSync(path.join(ROOT,summaryRel))){const s=json(summaryRel);add('FIXTURE_PASS',s.ok===true&&s.status==='M5_HOSTING_CONTROL_PLANE_531_FIXTURE_PASS'&&s.failed===0&&s.packageInputImmutable===true&&s.evidenceLedgerSeparate===true&&s.packageResultStableAfterEvidence===true&&s.candidateHash==='4bf3c8025654f43f6e4af20e5d16115bdc0851352ccddc6f099649405883cf3b'&&s.criticalAssets===43&&s.remoteAssetsExpected===26);}
  add('NO_HOSTING_REQUEST_530',!fs.existsSync(path.join(ROOT,'tools/orbit360-m5-lab-hosting-delivery-request-530-v20260729.json')));
  add('NO_HOSTING_REQUEST_531',!fs.existsSync(path.join(ROOT,'tools/orbit360-m5-lab-hosting-delivery-request-531-v20260729.json')));
}catch(error){add('ENGINE_EXCEPTION',false,error&&error.message||error);}
const failed=checks.filter(row=>!row.ok),profile={secrets:false,firestoreRead:false,writes:false,runtime:false,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false};
const out={schemaVersion:'orbit360-gate-contract-preflight-m5-hosting-control-plane-531-v1',gateId:GATE,contractVersion:VERSION,validatorRevision:VERSION,executionPhase:'M5_VALIDATOR_REDESIGN_STATIC',status:failed.length?'VALIDATOR_STALE':'M5_HOSTING_CONTROL_PLANE_531_STATIC_PASS',classification:failed.length?'PIPELINE_MECHANISM_FAILURE':null,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(row=>row.id),checks,executionAuthorized:false,allowedExecutions:0,releaseCandidateHash:'4bf3c8025654f43f6e4af20e5d16115bdc0851352ccddc6f099649405883cf3b',criticalAssets:43,remoteAssetsExpected:26,knownRemoteAssetsMatched:24,capabilityProfile:profile,sourceTransformed:false,dataAccess:false,secretAccess:false,secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,operationalWrites:0,rulesApplied:false,deployExecuted:false,productionTouched:false,hostingAuthorizationRequiredAfterPass:failed.length===0,containsPII:false,containsSecrets:false};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n','utf8');console.log(JSON.stringify(out,null,2));if(failed.length)process.exit(41);
