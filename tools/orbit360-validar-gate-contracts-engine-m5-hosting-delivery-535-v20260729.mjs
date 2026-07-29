#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
const ROOT=process.cwd(),PLAT=path.join(ROOT,'orbit360-platform');
const OUT=path.join(PLAT,'runtime-gate-crm-v20260716/preflight-sanitizado.json');
const GATE='block5-release-candidate-visualization-v20260728',VERSION='5.0.35',HASH='401f87b148048f85db3f4956474258c51c29e2c9e7c9a59e52f425d491ab89e7';
const CONTROL='tools/orbit360-m5-release-candidate-control-overlay-534-v20260729.json',DESC='tools/orbit360-m5-release-candidate-descriptor-534-v20260729.json',INPUT='tools/orbit360-m5-hosting-package-input-535-v20260729.json',LEDGER='tools/orbit360-m5-hosting-evidence-ledger-535-v20260729.json',AUTH='tools/orbit360-m5-hosting-authorization-535-v20260729.json',REQUEST='tools/orbit360-m5-hosting-request-535-v20260729.json',OVERLAY='tools/orbit360-gate-contract-overlay-m5-hosting-delivery-535-v20260729.json',REGISTRY='tools/orbit360-gate-contract-registry-extension-m5-hosting-delivery-535-v20260729.json';
const read=r=>fs.readFileSync(path.join(ROOT,r),'utf8'),json=r=>JSON.parse(read(r)),sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const asset=rel=>{const p=path.join(PLAT,rel);return{path:rel,present:fs.existsSync(p),sha256:fs.existsSync(p)?sha(fs.readFileSync(p)):''};};
const checks=[];const add=(id,ok,detail='')=>checks.push({id,ok:!!ok,detail:String(detail||'').slice(0,240)});
let activationMode='active_request_invalid',executionAuthorized=false,allowedExecutions=0;
try{
  const control=json(CONTROL),d=json(DESC),input=json(INPUT),ledger=json(LEDGER),auth=json(AUTH),request=json(REQUEST),overlay=json(OVERLAY),registry=json(REGISTRY),firebase=json('firebase.json');
  const rows=(d.criticalAssets||[]).map(asset),computed=sha(JSON.stringify(rows.map(r=>({path:r.path,sha256:r.sha256}))));
  const pkg=(ledger.entries||[]).find(e=>e.kind==='hosting_package_pass'&&e.sourceVersion==='5.0.35'&&e.runId===30498488128);
  const parentRun=spawnSync('git',['rev-parse','HEAD^'],{cwd:ROOT,encoding:'utf8'}),parent=parentRun.status===0?String(parentRun.stdout).trim():'';
  const packageWorkflow=read('.github/workflows/orbit360-m5-hosting-package-535-v20260729.yml');
  add('GATE',request.gateId===GATE&&auth.gateId===GATE&&overlay.gateId===GATE&&registry.gates?.[0]?.gateId===GATE);
  add('VERSION',request.contractVersion===VERSION&&auth.contractVersion===VERSION&&overlay.contractVersion===VERSION&&registry.gates?.[0]?.contractVersion===VERSION);
  add('BRANCH',request.branch==='ays/backend-tenant-lab-v99-20260703'&&process.env.ORBIT360_BRANCH==='ays/backend-tenant-lab-v99-20260703');
  add('CONTROL_534',control.authoritativeForCurrentM5ControlState===true&&control.status==='M5_ACADEMIA_REMEDIATION_534_STATIC_PASS_NEW_RC_READY_TO_REQUEST_HOSTING_AUTHORIZATION');
  add('CONTROL_PARITY',control.publicParity?.assetsExpected===27&&control.publicParity?.assetsMatched===26&&control.publicParity?.mismatchCount===1&&JSON.stringify(control.publicParity?.mismatchPaths||[])===JSON.stringify(['data/academia-plus.js']));
  add('DESCRIPTOR',d.contractVersion==='5.0.34'&&d.criticalAssets?.length===44&&d.remoteAssets?.length===27&&computed===HASH&&rows.every(r=>r.present));
  add('PACKAGE_INPUT',input.schemaVersion==='orbit360-m5-hosting-package-input-535-v1'&&input.expectedCandidateHash===HASH&&input.criticalAssets===44&&input.remoteAssetsExpected===27&&input.remoteAssetsMatchedBefore===26&&input.immutableAfterCreation===true);
  add('LEDGER',ledger.appendOnly===true&&ledger.packageInput===INPUT);
  add('PACKAGE_EVIDENCE',!!pkg&&pkg.status==='PASS'&&pkg.candidateHash===HASH&&pkg.criticalAssets===44&&pkg.remoteAssetsExpected===27&&pkg.remoteAssetsMatched===26&&pkg.mismatchCount===1&&JSON.stringify(pkg.mismatchPaths||[])===JSON.stringify(['data/academia-plus.js'])&&pkg.hostingDeployExecuted===false);
  add('PACKAGE_WORKFLOW_FROZEN',packageWorkflow.includes('FROZEN')&&packageWorkflow.includes('workflow_dispatch')&&packageWorkflow.includes('rerun forbidden'));
  add('AUTH_SCHEMA',auth.schemaVersion==='orbit360-m5-hosting-authorization-535-v1'&&auth.explicitAuthorization===true&&auth.immutableAfterCreation===true&&auth.authorizationSource==='user_autorizado_hosting_5_0_34_20260729');
  add('AUTH_EXECUTION',auth.hostingLabDeliveryAuthorized===true&&auth.allowedExecutions===1&&auth.hostingOnly===true);
  add('AUTH_CANDIDATE',auth.releaseCandidateHash===HASH&&auth.criticalAssets===44&&auth.remoteAssetsExpected===27&&auth.remoteAssetsMatchedBefore===26);
  add('AUTH_SCOPE',auth.firestoreRead===false&&auth.firestoreWrite===false&&auth.operationalWrites===false&&auth.browser===false&&auth.runtimeSmoke===false&&auth.functionsDeploy===false&&auth.rulesDeploy===false&&auth.production===false&&auth.mergeMain===false&&auth.policies===false&&auth.pólizas===false&&auth.visualReview===false);
  add('REQUEST_SCHEMA',request.schemaVersion==='orbit360-m5-hosting-request-535-v1'&&request.allowedExecutions===1&&request.hostingLabDelivery===true);
  add('REQUEST_PARENT',request.authorizedBaseCommit===parent,parent);
  add('REQUEST_AUTH',request.authorization===AUTH&&request.authorizationSource===auth.authorizationSource);
  add('REQUEST_CANDIDATE',request.releaseCandidateHash===HASH&&request.criticalAssets===44&&request.remoteAssetsExpected===27&&request.remoteAssetsMatchedBefore===26&&JSON.stringify(request.mismatchPathsBefore||[])===JSON.stringify(['data/academia-plus.js']));
  add('REQUEST_TARGET',request.projectId==='ays-orbit-360-lab'&&request.channel==='orbit360-ays-lab'&&request.canonicalUrl==='https://ays-orbit-360-lab--orbit360-ays-lab-fj1zxnk2.web.app');
  add('REQUEST_SCOPE',request.secrets===true&&request.deploy===true&&request.hostingOnly===true&&request.firestoreRead===false&&request.firestoreWrite===false&&request.operationalWrites===false&&request.browser===false&&request.runtimeSmoke===false&&request.functionsDeploy===false&&request.rulesDeploy===false&&request.production===false&&request.mergeMain===false&&request.policies===false&&request.pólizas===false&&request.visualReview===false&&request.containsPII===false&&request.containsSecrets===false);
  add('OVERLAY',overlay.required?.releaseCandidateHash===HASH&&overlay.required?.criticalAssets===44&&overlay.required?.remoteAssetsExpected===27&&overlay.required?.remoteAssetsMatchedBefore===26&&overlay.required?.remoteAssetsMatchedAfter===27&&overlay.required?.hostingDeployExecutions===1&&overlay.required?.packageRunId===30498488128);
  add('REGISTRY',registry.gates?.length===1&&registry.gates[0]?.phase==='M5_LAB_HOSTING_DELIVERY'&&registry.gates[0]?.engine==='tools/orbit360-validar-gate-contracts-engine-m5-hosting-delivery-535-v20260729.mjs');
  add('FIREBASE_SCOPE',firebase.hosting?.public==='orbit360-platform'&&Array.isArray(firebase.hosting?.ignore)&&firebase.hosting.ignore.includes('docs/**')&&!firebase.hosting?.rewrites);
  add('SANITIZED',auth.containsPII===false&&auth.containsSecrets===false&&request.containsPII===false&&request.containsSecrets===false&&ledger.containsPII===false&&ledger.containsSecrets===false);
  const failed=checks.filter(x=>!x.ok);if(!failed.length){activationMode='immutable_request_present';executionAuthorized=true;allowedExecutions=1;}
  const profile={secrets:true,firestoreRead:false,writes:false,runtime:false,browser:false,deploy:true,functionsDeploy:false,rulesDeploy:false,production:false};
  const out={schemaVersion:'orbit360-gate-contract-preflight-m5-hosting-delivery-535-v1',gateId:GATE,contractVersion:VERSION,candidateContractVersion:'5.0.34',validatorRevision:VERSION,executionPhase:'M5_LAB_HOSTING_DELIVERY',status:failed.length?'VALIDATOR_STALE':'GO_GATE_CONTRACT',classification:failed.length?'PIPELINE_MECHANISM_FAILURE':null,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,activationMode,executionAuthorized,allowedExecutions,releaseCandidateHash:computed,criticalAssets:44,remoteAssetsExpected:27,remoteAssetsMatchedBefore:26,mismatchPathsBefore:['data/academia-plus.js'],capabilityProfile:profile,packageInputImmutable:true,evidenceLedgerSeparate:true,packageRunId:30498488128,packageJobId:90732671666,packageArtifactId:8742528376,sourceTransformed:false,dataAccess:false,secretAccess:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,operationalWrites:0,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
  fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));if(failed.length)process.exit(41);
}catch(error){const profile={secrets:true,firestoreRead:false,writes:false,runtime:false,browser:false,deploy:true,functionsDeploy:false,rulesDeploy:false,production:false};const out={schemaVersion:'orbit360-gate-contract-preflight-m5-hosting-delivery-535-v1',gateId:GATE,contractVersion:VERSION,executionPhase:'M5_LAB_HOSTING_DELIVERY',status:'VALIDATOR_STALE',classification:'PIPELINE_MECHANISM_FAILURE',failed:1,failedCheckIds:['PREFLIGHT_EXCEPTION'],error:String(error&&error.message||error).slice(0,300),activationMode:'active_request_invalid',executionAuthorized:false,allowedExecutions:0,releaseCandidateHash:HASH,criticalAssets:44,remoteAssetsExpected:27,remoteAssetsMatchedBefore:26,capabilityProfile:profile,dataAccess:false,secretAccess:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.error(out.error);process.exit(41);}
