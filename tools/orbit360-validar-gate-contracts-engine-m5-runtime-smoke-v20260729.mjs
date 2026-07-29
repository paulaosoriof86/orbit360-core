#!/usr/bin/env node
'use strict';
import fs from 'node:fs';import path from 'node:path';import {spawnSync,execFileSync} from 'node:child_process';
const ROOT=process.cwd(),GATE_ID=process.argv[2]||'',EXPECTED_GATE='block5-release-candidate-visualization-v20260728',VERSION='5.0.5';
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const checks=[];const check=(id,ok)=>checks.push({id,ok:!!ok});const readJson=rel=>JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8'));
try{
 const lifecycle=readJson('tools/orbit360-validator-lifecycle-contract-m5-runtime-smoke-v20260729.json');
 const auth=readJson('tools/orbit360-m5-runtime-smoke-authorization-v20260729.json');
 const freeze=readJson('tools/orbit360-m5-runtime-smoke-freeze-v20260729.json');
 const globalFreeze=readJson('tools/orbit360-m5-release-candidate-freeze-v20260728.json');
 const hosting=readJson('orbit360-platform/runtime-gate-crm-v20260716/m5-lab-hosting-delivery-504-closure.json');
 const requestPath='tools/orbit360-m5-runtime-smoke-request-v20260729.json';
 const requestPresent=fs.existsSync(path.join(ROOT,requestPath));const request=requestPresent?readJson(requestPath):{};
 const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();const parent=execFileSync('git',['rev-parse','HEAD^'],{encoding:'utf8'}).trim();
 check('GATE_ID',GATE_ID===EXPECTED_GATE);
 check('BRANCH',(process.env.ORBIT360_BRANCH||'')==='ays/backend-tenant-lab-v99-20260703');
 check('LIFECYCLE',lifecycle.gateId===EXPECTED_GATE&&lifecycle.gateContractVersion===VERSION&&lifecycle.executionProfile?.phase==='LAB_RUNTIME_GATE');
 const c=lifecycle.executionProfile?.capabilities||{};check('CAPABILITIES',c.secrets===true&&c.firestoreRead===true&&c.writes===false&&c.runtime===true&&c.browser===true&&c.deploy===false&&c.functionsDeploy===false&&c.rulesDeploy===false&&c.production===false);
 check('AUTHORIZATION',auth.explicitAuthorization===true&&auth.runtimeSmokeAuthorized===true&&auth.allowedExecutions===1&&auth.requestCreated===true&&auth.releaseCandidateHash==='d90ec601d17c8e750cbba6f19197d3f906b29a1377817f53fb73f0779e843045');
 check('FREEZE',freeze.status==='REQUEST_CREATED_AWAITING_ONE_RUNTIME_SMOKE_LAB'&&freeze.authorization?.runtimeSmokeAuthorized===true&&freeze.authorization?.allowedExecutions===1&&freeze.authorization?.requestCreated===true);
 check('GLOBAL_FREEZE',globalFreeze.status==='M5_RUNTIME_SMOKE_AUTHORIZED_ONCE_REQUEST_CREATED'&&globalFreeze.authorization?.runtimeSmokeAuthorized===true&&globalFreeze.authorization?.allowedRuntimeSmokeExecutions===1);
 check('HOSTING_CLOSED',hosting.status==='M5_LAB_HOSTING_DELIVERED_AND_24_OF_24_VERIFIED'&&hosting.remoteParity?.assetsMatched===24&&hosting.remoteParity?.remoteParity===true&&hosting.approvalReadyForRuntimeSmoke===true);
 check('REQUEST_PRESENT',requestPresent);
 check('REQUEST_SCHEMA',request.schemaVersion==='orbit360-m5-runtime-smoke-request-v1'&&request.gateId===EXPECTED_GATE&&request.contractVersion===VERSION);
 check('REQUEST_BINDING',request.authorizedBaseCommit===parent&&request.allowedExecutions===1&&request.runtimeSmoke===true);
 check('REQUEST_TARGET',request.projectId==='ays-orbit-360-lab'&&request.canonicalUrl==='https://ays-orbit-360-lab--orbit360-ays-lab-fj1zxnk2.web.app'&&request.reviewUrl==='https://ays-orbit-360-lab--orbit360-ays-lab-fj1zxnk2.web.app/ays-lab-preview.html');
 check('REQUEST_HASH',request.releaseCandidateHash==='d90ec601d17c8e750cbba6f19197d3f906b29a1377817f53fb73f0779e843045');
 check('REQUEST_CAPABILITIES',request.secrets===true&&request.firestoreRead===true&&request.firestoreWrite===false&&request.operationalWrites===false&&request.runtime===true&&request.browser===true&&request.deploy===false&&request.hostingDeploy===false&&request.functionsDeploy===false&&request.rulesDeploy===false&&request.production===false&&request.mergeMain===false&&request.policies===false&&request.visualReview===false);
 check('REQUEST_HEAD_DISTINCT',head!==parent);
 const run=spawnSync(process.execPath,['tools/orbit360-m5-runtime-smoke-contract-v20260729.cjs'],{cwd:ROOT,encoding:'utf8',maxBuffer:16*1024*1024});
 check('EXECUTABLE_CONTRACT',run.status===0);
 const contractPath='orbit360-platform/runtime-gate-crm-v20260716/m5-runtime-smoke-contract-summary.json';const contract=fs.existsSync(path.join(ROOT,contractPath))?readJson(contractPath):{};
 check('CONTRACT_PASS',contract.ok===true&&contract.status==='M5_RUNTIME_SMOKE_CONTRACT_PASS'&&contract.failed===0&&contract.releaseCandidateHash==='d90ec601d17c8e750cbba6f19197d3f906b29a1377817f53fb73f0779e843045'&&contract.criticalAssets===41);
 const failed=checks.filter(x=>!x.ok);const out={schemaVersion:'orbit360-gate-contract-preflight-m5-runtime-smoke-v1',gateId:EXPECTED_GATE,contractVersion:VERSION,status:failed.length?'NO_GO_GATE_CONTRACT':'GO_GATE_CONTRACT',classification:failed.length?'PIPELINE_MECHANISM_FAILURE':null,executionPhase:'LAB_RUNTIME_GATE',validatorRevision:VERSION,activationMode:requestPresent?'immutable_request_present':'package_without_request',passed:checks.length-failed.length,total:checks.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),capabilityProfile:{secrets:true,firestoreRead:true,writes:false,runtime:true,browser:true,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false},releaseCandidateHash:'d90ec601d17c8e750cbba6f19197d3f906b29a1377817f53fb73f0779e843045',criticalAssets:41,remoteAssetsExpected:24,projectId:'ays-orbit-360-lab',sourceTransformed:false,dataAccess:false,secretAccess:false,operationalWrites:0,secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,functionsDeployed:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
 fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));if(failed.length)process.exit(41);
}catch(error){const out={schemaVersion:'orbit360-gate-contract-preflight-m5-runtime-smoke-v1',gateId:EXPECTED_GATE,contractVersion:VERSION,status:'VALIDATOR_STALE',classification:'PIPELINE_MECHANISM_FAILURE',passed:0,total:1,failed:1,failedCheckIds:['ENGINE_EXCEPTION'],error:String(error&&error.message||error).slice(0,300),capabilityProfile:{secrets:true,firestoreRead:true,writes:false,runtime:true,browser:true,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false},sourceTransformed:false,dataAccess:false,secretAccess:false,operationalWrites:0,secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,functionsDeployed:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.error(JSON.stringify(out,null,2));process.exit(41)}
