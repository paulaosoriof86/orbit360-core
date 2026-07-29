#!/usr/bin/env node
'use strict';
import fs from 'node:fs';import path from 'node:path';import {spawnSync,execFileSync} from 'node:child_process';
const ROOT=process.cwd(),GATE_ID=process.argv[2]||'',EXPECTED_GATE='block5-release-candidate-visualization-v20260728',VERSION='5.0.4';
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const checks=[];const check=(id,ok)=>checks.push({id,ok:!!ok});const readJson=rel=>JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8'));
try{
 const lifecycle=readJson('tools/orbit360-validator-lifecycle-contract-m5-lab-hosting-delivery-v20260728.json');
 const auth=readJson('tools/orbit360-m5-lab-hosting-delivery-authorization-v20260728.json');
 const freeze=readJson('tools/orbit360-m5-lab-hosting-delivery-freeze-v20260728.json');
 const closure=readJson('orbit360-platform/runtime-gate-crm-v20260716/m5-post-access-readiness-503-closure.json');
 const requestPath='tools/orbit360-m5-lab-hosting-delivery-request-v20260728.json';
 const requestPresent=fs.existsSync(path.join(ROOT,requestPath));const request=requestPresent?readJson(requestPath):{};
 const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();const parent=execFileSync('git',['rev-parse','HEAD^'],{encoding:'utf8'}).trim();
 check('GATE_ID',GATE_ID===EXPECTED_GATE);
 check('BRANCH',(process.env.ORBIT360_BRANCH||'')==='ays/backend-tenant-lab-v99-20260703');
 check('LIFECYCLE',lifecycle.gateId===EXPECTED_GATE&&lifecycle.gateContractVersion===VERSION&&lifecycle.executionProfile?.phase==='M5_LAB_HOSTING_DELIVERY');
 const c=lifecycle.executionProfile?.capabilities||{};check('CAPABILITIES',c.secrets===true&&c.deploy===true&&c.firestoreRead===false&&c.writes===false&&c.runtime===false&&c.browser===false&&c.functionsDeploy===false&&c.rulesDeploy===false&&c.production===false);
 check('AUTHORIZATION',auth.explicitAuthorization===true&&auth.hostingLabDeliveryAuthorized===true&&auth.allowedExecutions===1&&auth.requestCreated===true&&auth.releaseCandidateHash==='d90ec601d17c8e750cbba6f19197d3f906b29a1377817f53fb73f0779e843045');
 check('FREEZE',freeze.status==='REQUEST_CREATED_AWAITING_ONE_HOSTING_LAB_DELIVERY'&&freeze.authorization?.hostingLabDeliveryAuthorized===true&&freeze.authorization?.allowedExecutions===1&&freeze.authorization?.requestCreated===true);
 check('PRIOR_CLOSURE',closure.status==='M5_RC_READY_LAB_DELIVERY_REQUIRED'&&closure.approvalReadyForLabDelivery===true&&closure.releaseCandidate?.hash==='d90ec601d17c8e750cbba6f19197d3f906b29a1377817f53fb73f0779e843045');
 check('REQUEST_PRESENT',requestPresent);
 check('REQUEST_SCHEMA',request.schemaVersion==='orbit360-m5-lab-hosting-delivery-request-v1'&&request.gateId===EXPECTED_GATE&&request.contractVersion===VERSION);
 check('REQUEST_BINDING',request.authorizedBaseCommit===parent&&request.allowedExecutions===1&&request.hostingLabDelivery===true);
 check('REQUEST_TARGET',request.projectId==='ays-orbit-360-lab'&&request.channel==='orbit360-ays-lab'&&request.canonicalUrl==='https://ays-orbit-360-lab--orbit360-ays-lab-fj1zxnk2.web.app');
 check('REQUEST_HASH',request.releaseCandidateHash==='d90ec601d17c8e750cbba6f19197d3f906b29a1377817f53fb73f0779e843045');
 check('REQUEST_CAPABILITIES',request.secrets===true&&request.deploy===true&&request.hostingOnly===true&&request.firestoreRead===false&&request.firestoreWrite===false&&request.operationalWrites===false&&request.browser===false&&request.runtimeSmoke===false&&request.functionsDeploy===false&&request.rulesDeploy===false&&request.production===false&&request.mergeMain===false&&request.policies===false);
 check('REQUEST_HEAD_DISTINCT',head!==parent);
 const run=spawnSync(process.execPath,['tools/orbit360-m5-lab-hosting-delivery-contract-v20260728.cjs'],{cwd:ROOT,encoding:'utf8',maxBuffer:16*1024*1024});
 check('EXECUTABLE_CONTRACT',run.status===0);
 const contractPath='orbit360-platform/runtime-gate-crm-v20260716/m5-lab-hosting-delivery-contract-summary.json';const contract=fs.existsSync(path.join(ROOT,contractPath))?readJson(contractPath):{};
 check('CONTRACT_PASS',contract.ok===true&&contract.status==='M5_LAB_HOSTING_DELIVERY_CONTRACT_PASS'&&contract.failed===0&&contract.releaseCandidateHash==='d90ec601d17c8e750cbba6f19197d3f906b29a1377817f53fb73f0779e843045'&&contract.criticalAssets===41&&contract.remoteAssets===24);
 const failed=checks.filter(x=>!x.ok);const out={schemaVersion:'orbit360-gate-contract-preflight-m5-lab-hosting-delivery-v1',gateId:EXPECTED_GATE,contractVersion:VERSION,status:failed.length?'NO_GO_GATE_CONTRACT':'GO_GATE_CONTRACT',classification:failed.length?'PIPELINE_MECHANISM_FAILURE':null,executionPhase:'M5_LAB_HOSTING_DELIVERY',validatorRevision:VERSION,activationMode:requestPresent?'immutable_request_present':'package_without_request',passed:checks.length-failed.length,total:checks.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),capabilityProfile:{secrets:true,firestoreRead:false,writes:false,runtime:false,browser:false,deploy:true,functionsDeploy:false,rulesDeploy:false,production:false},releaseCandidateHash:'d90ec601d17c8e750cbba6f19197d3f906b29a1377817f53fb73f0779e843045',criticalAssets:41,remoteAssetsExpected:24,projectId:'ays-orbit-360-lab',channel:'orbit360-ays-lab',sourceTransformed:false,dataAccess:false,secretAccess:false,operationalWrites:0,secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,functionsDeployed:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
 fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));if(failed.length)process.exit(41);
}catch(error){const out={schemaVersion:'orbit360-gate-contract-preflight-m5-lab-hosting-delivery-v1',gateId:EXPECTED_GATE,contractVersion:VERSION,status:'VALIDATOR_STALE',classification:'PIPELINE_MECHANISM_FAILURE',passed:0,total:1,failed:1,failedCheckIds:['ENGINE_EXCEPTION'],error:String(error&&error.message||error).slice(0,300),capabilityProfile:{secrets:true,firestoreRead:false,writes:false,runtime:false,browser:false,deploy:true,functionsDeploy:false,rulesDeploy:false,production:false},sourceTransformed:false,dataAccess:false,secretAccess:false,operationalWrites:0,secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,functionsDeployed:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.error(JSON.stringify(out,null,2));process.exit(41)}
