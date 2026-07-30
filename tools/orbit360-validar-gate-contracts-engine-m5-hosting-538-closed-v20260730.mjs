#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
const ROOT=process.cwd(),OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const GATE='block5-release-candidate-visualization-v20260728',VERSION='5.0.38',HASH='097d4e85b37e3c26406e856d94fe156e1f40723b9dec40ba567334c573cc855a';
const read=r=>fs.readFileSync(path.join(ROOT,r),'utf8'),json=r=>JSON.parse(read(r));
const checks=[];const add=(id,ok,detail='')=>checks.push({id,ok:!!ok,detail:String(detail||'').slice(0,220)});
try{
  const control=json('tools/orbit360-m5-release-candidate-control-overlay-538-v20260730.json');
  const freeze=json('tools/orbit360-m5-hosting-delivery-538-freeze-v20260730.json');
  const ledger=json('tools/orbit360-m5-hosting-evidence-ledger-538-v20260730.json');
  const auth=json('tools/orbit360-m5-hosting-authorization-538-v20260730.json');
  const deliveryWorkflow=read('.github/workflows/orbit360-m5-hosting-delivery-538-v20260730.yml');
  const packageWorkflow=read('.github/workflows/orbit360-m5-hosting-package-538-v20260730.yml');
  const delivery=(ledger.entries||[]).find(e=>e.kind==='hosting_delivery_success'&&e.sourceVersion==='5.0.38'&&e.runId===30503145325);
  const pkg=(ledger.entries||[]).find(e=>e.kind==='hosting_package_pass'&&e.sourceVersion==='5.0.38'&&e.runId===30502809297);
  add('CONTROL',control.authoritativeForCurrentM5ControlState===true&&control.status==='M5_HOSTING_538_CLOSED_29_OF_29_READY_TO_REQUEST_RUNTIME_AUTHORIZATION');
  add('CANDIDATE',control.releaseCandidate?.hash===HASH&&control.releaseCandidate?.criticalAssets===46&&control.releaseCandidate?.publicAssets===29);
  add('PARITY',control.publicParity?.assetsExpected===29&&control.publicParity?.assetsMatched===29&&control.publicParity?.mismatchCount===0&&control.publicParity?.remoteParity===true&&control.publicParity?.hostingDeliveryRequired===false);
  add('FREEZE',freeze.status==='M5_HOSTING_538_DELIVERED_AND_29_OF_29_VERIFIED_CLOSED'&&freeze.delivery?.hostingDeployExecutions===1&&freeze.delivery?.remoteAssetsMatchedAfter===29&&freeze.delivery?.mismatchCountAfter===0&&freeze.delivery?.remoteParityAfter===true);
  add('PACKAGE',!!pkg&&pkg.status==='PASS'&&pkg.candidateHash===HASH&&pkg.remoteAssetsMatched===28&&pkg.mismatchCount===1&&JSON.stringify(pkg.mismatchPaths||[])===JSON.stringify(['data/academia-v1197-bridge.js']));
  add('DELIVERY',!!delivery&&delivery.status==='M5_HOSTING_538_DELIVERED_AND_29_OF_29_VERIFIED'&&delivery.candidateHash===HASH&&delivery.remoteAssetsBefore===28&&delivery.remoteAssetsAfter===29&&delivery.mismatchCountAfter===0&&delivery.hostingDeployExecutions===1);
  add('ZERO_WRITES',delivery?.firestoreRead===false&&delivery?.firestoreWrites===0&&delivery?.operationalWrites===0&&delivery?.runtime===false&&delivery?.browser===false&&delivery?.functionsDeploy===false&&delivery?.rulesDeploy===false&&delivery?.production===false);
  add('AUTH_CONSUMED',auth.schemaVersion==='orbit360-m5-hosting-authorization-538-v2'&&auth.hostingLabDeliveryAuthorized===false&&auth.allowedExecutions===0&&auth.authorizationConsumed===true&&auth.requestCreated===true);
  add('RUNTIME_NOT_AUTHORIZED',control.authorization?.runtimeSmokeAuthorized===false&&control.authorization?.allowedRuntimeExecutions===0&&control.authorization?.runtimeRequestCreated===false);
  add('VISUAL_PROD_BLOCKED',control.authorization?.visualReviewAuthorized===false&&control.authorization?.productionAuthorized===false&&control.safety?.pólizas===false);
  add('WORKFLOWS_FROZEN',deliveryWorkflow.includes('FROZEN')&&deliveryWorkflow.includes('rerun forbidden')&&packageWorkflow.includes('FROZEN')&&packageWorkflow.includes('rerun forbidden'));
  add('SANITIZED',control.containsPII===false&&control.containsSecrets===false&&freeze.containsPII===false&&freeze.containsSecrets===false&&ledger.containsPII===false&&ledger.containsSecrets===false);
  const failed=checks.filter(x=>!x.ok),profile={secrets:false,firestoreRead:false,writes:false,runtime:false,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false};
  const out={schemaVersion:'orbit360-gate-contract-preflight-m5-hosting-538-closed-v1',gateId:GATE,contractVersion:VERSION,candidateContractVersion:'5.0.37',validatorRevision:'5.0.38-closed',executionPhase:'M5_POST_ACCESS_RC_READINESS_STATIC',status:failed.length?'VALIDATOR_STALE':'M5_HOSTING_538_CLOSED_29_OF_29_READY_TO_REQUEST_RUNTIME_AUTHORIZATION',classification:failed.length?'PIPELINE_MECHANISM_FAILURE':null,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,executionAuthorized:false,allowedExecutions:0,releaseCandidateHash:HASH,criticalAssets:46,remoteAssetsExpected:29,remoteAssetsMatched:29,mismatchCount:0,remoteParity:true,hostingDeployExecutions:1,hostingAuthorizationConsumed:true,hostingLabDeliveryAuthorized:false,allowedHostingExecutions:0,runtimeSmokeAuthorized:false,allowedRuntimeExecutions:0,runtimeRequestCreated:false,visualReviewAuthorized:false,productionAuthorized:false,capabilityProfile:profile,dataAccess:false,secretAccess:false,secretsRead:false,firestoreRead:false,firestoreWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,deployExecuted:false,functionsDeploy:false,rulesDeploy:false,productionTouched:false,containsPII:false,containsSecrets:false};
  fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));if(failed.length)process.exit(41);
}catch(error){const profile={secrets:false,firestoreRead:false,writes:false,runtime:false,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false};const out={schemaVersion:'orbit360-gate-contract-preflight-m5-hosting-538-closed-v1',gateId:GATE,contractVersion:VERSION,executionPhase:'M5_POST_ACCESS_RC_READINESS_STATIC',status:'VALIDATOR_STALE',classification:'PIPELINE_MECHANISM_FAILURE',failed:1,failedCheckIds:['CLOSURE_EXCEPTION'],error:String(error&&error.message||error).slice(0,300),executionAuthorized:false,allowedExecutions:0,releaseCandidateHash:HASH,criticalAssets:46,remoteAssetsExpected:29,capabilityProfile:profile,secretsRead:false,firestoreRead:false,firestoreWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.error(out.error);process.exit(41);}
