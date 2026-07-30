#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
const ROOT=process.cwd(),PLAT=path.join(ROOT,'orbit360-platform'),OUT=path.join(PLAT,'runtime-gate-crm-v20260716/preflight-sanitizado.json');
const GATE='block5-release-candidate-visualization-v20260728',VERSION='5.0.44',RC='eb4c5ba04c424667f2b27aa2daab05b16a7369ab6e227b4210e8b61f8b76d5de';
const REQUEST='tools/orbit360-m5-corrective-delivery-runtime-544-request-v20260730.json',DESC='tools/orbit360-m5-release-candidate-descriptor-543-v20260730.json',REG='tools/orbit360-gate-contract-registry-extension-m5-corrective-delivery-runtime-544-v20260730.json';
const read=r=>fs.readFileSync(path.join(ROOT,r),'utf8'),json=r=>JSON.parse(read(r)),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const checks=[];const add=(id,ok,d='')=>checks.push({id,ok:Boolean(ok),detail:String(d||'').slice(0,240)});
try{
 const request=json(REQUEST),descriptor=json(DESC),registry=json(REG),parent=execFileSync('git',['rev-parse','HEAD^'],{cwd:ROOT,encoding:'utf8'}).trim(),reg=registry.gates?.[0];
 const rows=descriptor.criticalAssets.map(rel=>{const p=path.join(PLAT,rel);return{path:rel,present:fs.existsSync(p),sha256:fs.existsSync(p)?sha(fs.readFileSync(p)):''};});
 const computed=sha(JSON.stringify(rows.map(r=>({path:r.path,sha256:r.sha256}))));
 add('GATE',request.gateId===GATE&&reg?.gateId===GATE);
 add('VERSION',request.contractVersion===VERSION&&reg?.contractVersion===VERSION&&request.candidateContractVersion==='5.0.43');
 add('BRANCH',request.branch==='ays/backend-tenant-lab-v99-20260703'&&process.env.ORBIT360_BRANCH==='ays/backend-tenant-lab-v99-20260703');
 add('REQUEST_PARENT',request.authorizedBaseCommit===parent,parent);
 add('AUTHORIZATION',request.authorizationSource==='user_authorized_combined_hosting_runtime_m5_544'&&request.explicitAuthorization===true&&request.allowedExecutions===1&&request.authorizationConsumed===false&&request.hostingLabDeliveryAuthorized===true&&request.runtimeSmokeAuthorized===true&&request.combinedRiskBlock===true);
 add('REGISTRY',reg?.phase==='M5_LAB_CORRECTIVE_DELIVERY_RUNTIME'&&reg?.activation==='immutable_combined_request_present'&&reg?.allowedExecutions===1&&reg?.singleWorkflow===true&&reg?.hostingThenRuntimeSameWorkflow===true);
 add('DESCRIPTOR',descriptor.contractVersion==='5.0.43'&&descriptor.criticalAssets?.length===47&&descriptor.remoteAssets?.length===30&&descriptor.criticalAssets.includes('modules/portal-v1142-copyfix.js')&&descriptor.remoteAssets.includes('modules/portal-v1142-copyfix.js')&&descriptor.requiredBindings?.portalMigrationHonestaStaticCourseVersion===150&&descriptor.requiredBindings?.portalMigrationHonestaStaticMarker===true);
 add('RC',rows.length===47&&rows.every(r=>r.present)&&computed===RC,computed);
 add('TARGET',request.target?.projectId==='ays-orbit-360-lab'&&request.target?.channel==='orbit360-ays-lab'&&request.target?.canonicalUrl==='https://ays-orbit-360-lab--orbit360-ays-lab-fj1zxnk2.web.app');
 add('SCOPE',request.secrets===true&&request.firestoreRead===true&&request.firestoreWrite===false&&request.operationalWrites===false&&request.runtime===true&&request.browser===true&&request.deploy===true&&request.hostingDeploy===true&&request.functionsDeploy===false&&request.rulesDeploy===false&&request.production===false&&request.main===false&&request.merge===false&&request.polizas===false&&request.visualReview===false&&request.immutableAfterCreation===true&&request.containsPII===false&&request.containsSecrets===false);
 const failed=checks.filter(x=>!x.ok),profile={secrets:true,firestoreRead:true,writes:false,runtime:true,browser:true,deploy:true,functionsDeploy:false,rulesDeploy:false,production:false};
 const out={schemaVersion:'orbit360-gate-contract-preflight-m5-corrective-delivery-runtime-544-v1',gateId:GATE,contractVersion:VERSION,candidateContractVersion:'5.0.43',executionPhase:'M5_LAB_CORRECTIVE_DELIVERY_RUNTIME',status:failed.length?'VALIDATOR_STALE':'GO_GATE_CONTRACT',classification:failed.length?'PIPELINE_MECHANISM_FAILURE':null,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,activationMode:failed.length?'request_invalid':'immutable_combined_request_present',executionAuthorized:failed.length===0,allowedExecutions:failed.length?0:1,releaseCandidateHash:RC,criticalAssets:47,remoteAssetsExpected:30,expectedRemoteAssetsMatchedBefore:29,expectedMismatchOnly:'modules/portal-v1142-copyfix.js',capabilityProfile:profile,dataAccess:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
 fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));if(failed.length)process.exit(41);
}catch(error){const out={schemaVersion:'orbit360-gate-contract-preflight-m5-corrective-delivery-runtime-544-v1',gateId:GATE,contractVersion:VERSION,status:'VALIDATOR_STALE',classification:'PIPELINE_MECHANISM_FAILURE',failed:1,failedCheckIds:['PREFLIGHT_EXCEPTION'],error:String(error&&error.message||error).slice(0,300),executionAuthorized:false,allowedExecutions:0,releaseCandidateHash:RC,dataAccess:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.error(out.error);process.exit(41);}
