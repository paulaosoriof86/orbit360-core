#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
const ROOT=process.cwd(),PLAT=path.join(ROOT,'orbit360-platform'),OUT=path.join(PLAT,'runtime-gate-crm-v20260716/preflight-sanitizado.json');
const GATE='block5-release-candidate-visualization-v20260728',VERSION='5.0.42',RC='9bd2c847a2884be900283f86802dbbd0390ae5bc6ccc17b3a5cf4d389c78a4ee';
const REQUEST='tools/orbit360-m5-runtime-final-542-request-v20260730.json',OVERLAY='tools/orbit360-m5-release-candidate-control-overlay-541-v20260730.json',DESC='tools/orbit360-m5-release-candidate-descriptor-540-v20260730.json',REG='tools/orbit360-gate-contract-registry-extension-m5-runtime-final-542-v20260730.json';
const read=r=>fs.readFileSync(path.join(ROOT,r),'utf8'),json=r=>JSON.parse(read(r)),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const checks=[];const add=(id,ok,d='')=>checks.push({id,ok:Boolean(ok),detail:String(d||'').slice(0,240)});
let activationMode='request_missing',executionAuthorized=false,allowedExecutions=0;
try{
 const request=json(REQUEST),overlay=json(OVERLAY),descriptor=json(DESC),registry=json(REG),parent=execFileSync('git',['rev-parse','HEAD^'],{cwd:ROOT,encoding:'utf8'}).trim();
 const rows=descriptor.criticalAssets.map(rel=>{const p=path.join(PLAT,rel);return{path:rel,present:fs.existsSync(p),sha256:fs.existsSync(p)?sha(fs.readFileSync(p)):''};});
 const computed=sha(JSON.stringify(rows.map(r=>({path:r.path,sha256:r.sha256}))));
 const reg=Array.isArray(registry.gates)?registry.gates[0]:null;
 add('GATE',request.gateId===GATE&&reg?.gateId===GATE);
 add('VERSION',request.contractVersion===VERSION&&reg?.contractVersion===VERSION);
 add('BRANCH',request.branch==='ays/backend-tenant-lab-v99-20260703'&&process.env.ORBIT360_BRANCH==='ays/backend-tenant-lab-v99-20260703');
 add('OVERLAY_541',overlay.status==='M5_HOSTING_541_CLOSED_29_OF_29_READY_TO_REQUEST_RUNTIME_AUTHORIZATION'&&overlay.releaseCandidate?.hash===RC&&overlay.publicParity?.assetsExpected===29&&overlay.publicParity?.assetsMatched===29&&overlay.publicParity?.mismatchCount===0&&overlay.publicParity?.remoteParity===true&&overlay.authorization?.runtimeSmokeAuthorized===false&&overlay.authorization?.allowedRuntimeExecutions===0&&overlay.authorization?.runtimeRequestCreated===false);
 add('AUTHORIZATION',request.authorizationSource==='user_autorizado_runtime_final_m5_20260730'&&request.explicitAuthorization===true&&request.runtimeSmokeAuthorized===true&&request.allowedExecutions===1&&request.authorizationConsumed===false);
 add('REQUEST',request.schemaVersion==='orbit360-m5-runtime-final-542-request-v1'&&request.authorizedBaseCommit===parent&&request.releaseCandidateHash===RC&&request.criticalAssets===46&&request.remoteAssetsExpected===29&&request.remoteAssetsMatched===29&&request.immutableAfterCreation===true);
 add('REGISTRY',reg?.phase==='LAB_RUNTIME_GATE'&&reg?.activation==='immutable_request_present'&&reg?.allowedExecutions===1&&reg?.singleWorkflow===true);
 add('DESCRIPTOR',descriptor.contractVersion==='5.0.40'&&descriptor.criticalAssets?.length===46&&descriptor.remoteAssets?.length===29&&descriptor.requiredBindings?.academiaStaticWritePolicyVersion==='20260730.1'&&descriptor.requiredBindings?.baseSeedExplicitStaticMarker===true);
 add('RC',rows.length===46&&rows.every(r=>r.present)&&computed===RC,computed);
 add('TARGET',request.projectId==='ays-orbit-360-lab'&&request.canonicalUrl==='https://ays-orbit-360-lab--orbit360-ays-lab-fj1zxnk2.web.app'&&request.reviewUrl==='https://ays-orbit-360-lab--orbit360-ays-lab-fj1zxnk2.web.app/ays-lab-preview.html');
 add('SCOPE',request.secrets===true&&request.firestoreRead===true&&request.firestoreWrite===false&&request.operationalWrites===false&&request.runtime===true&&request.browser===true&&request.deploy===false&&request.hostingDeploy===false&&request.functionsDeploy===false&&request.rulesDeploy===false&&request.production===false&&request.mergeMain===false&&request.policies===false&&request.visualReview===false&&request['pólizas']===false&&request.containsPII===false&&request.containsSecrets===false);
 const failed=checks.filter(x=>!x.ok);if(!failed.length){activationMode='immutable_request_present';executionAuthorized=true;allowedExecutions=1;}
 const profile={secrets:true,firestoreRead:true,writes:false,runtime:true,browser:true,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false};
 const out={schemaVersion:'orbit360-gate-contract-preflight-m5-runtime-final-542-v1',gateId:GATE,contractVersion:VERSION,candidateContractVersion:'5.0.40',executionPhase:'LAB_RUNTIME_GATE',status:failed.length?'VALIDATOR_STALE':'GO_GATE_CONTRACT',classification:failed.length?'PIPELINE_MECHANISM_FAILURE':null,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,activationMode,executionAuthorized,allowedExecutions,releaseCandidateHash:RC,criticalAssets:46,remoteAssetsExpected:29,remoteAssetsMatched:29,remoteParity:true,capabilityProfile:profile,dataAccess:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
 fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));if(failed.length)process.exit(41);
}catch(error){const profile={secrets:true,firestoreRead:true,writes:false,runtime:true,browser:true,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false};const out={schemaVersion:'orbit360-gate-contract-preflight-m5-runtime-final-542-v1',gateId:GATE,contractVersion:VERSION,executionPhase:'LAB_RUNTIME_GATE',status:'VALIDATOR_STALE',classification:'PIPELINE_MECHANISM_FAILURE',failed:1,failedCheckIds:['PREFLIGHT_EXCEPTION'],error:String(error&&error.message||error).slice(0,300),activationMode,executionAuthorized:false,allowedExecutions:0,releaseCandidateHash:RC,criticalAssets:46,remoteAssetsExpected:29,capabilityProfile:profile,dataAccess:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.error(out.error);process.exit(41);}
