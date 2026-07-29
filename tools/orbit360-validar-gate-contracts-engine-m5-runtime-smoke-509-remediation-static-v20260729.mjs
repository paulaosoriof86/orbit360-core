#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const ROOT=process.cwd();
const GATE_ID=process.argv[2]||'';
const EXPECTED_GATE='block5-release-candidate-visualization-v20260728';
const VERSION='5.0.9';
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const checks=[];const check=(id,ok,detail='')=>checks.push({id,ok:Boolean(ok),detail:String(detail||'').slice(0,220)});
const readJson=rel=>JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8'));
try{
  const lifecycle=readJson('tools/orbit360-validator-lifecycle-contract-m5-runtime-smoke-509-remediation-static-v20260729.json');
  const overlay=readJson('tools/orbit360-gate-contract-overlay-m5-runtime-smoke-509-remediation-static-v20260729.json');
  const registry=readJson('tools/orbit360-gate-contract-registry-extension-m5-runtime-smoke-509-remediation-static-v20260729.json');
  const attempt=readJson('orbit360-platform/runtime-gate-crm-v20260716/m5-runtime-smoke-508-attempt-closure.json');
  const freeze=readJson('tools/orbit360-m5-release-candidate-freeze-v20260728.json');
  check('GATE_ID',GATE_ID===EXPECTED_GATE);
  check('BRANCH',(process.env.ORBIT360_BRANCH||'')==='ays/backend-tenant-lab-v99-20260703');
  check('LIFECYCLE',lifecycle.gateId===EXPECTED_GATE&&lifecycle.gateContractVersion===VERSION&&lifecycle.executionProfile?.phase==='M5_RUNTIME_SMOKE_ROOT_CAUSE_REMEDIATION_STATIC');
  check('ZERO_CAPABILITIES',Object.values(lifecycle.executionProfile?.capabilities||{}).every(value=>value===false));
  check('OVERLAY',overlay.contractVersion===VERSION&&overlay.phase==='M5_RUNTIME_SMOKE_ROOT_CAUSE_REMEDIATION_STATIC'&&overlay.required?.runtimeAttemptRunId===30420738744);
  check('REGISTRY',registry.gates?.length===1&&registry.gates[0]?.contractVersion===VERSION&&registry.gates[0]?.phase==='M5_RUNTIME_SMOKE_ROOT_CAUSE_REMEDIATION_STATIC');
  check('ATTEMPT_CLOSED',attempt.status==='M5_RUNTIME_SMOKE_LAB_FAILED_STOP_LINE'&&attempt.runtimeAttempt?.authorizationConsumed===true&&attempt.writes?.firestoreWrites===0&&attempt.writes?.operationalWrites===0);
  check('FREEZE_STATIC_ONLY',freeze.status==='M5_RUNTIME_SMOKE_508_STOP_LINE_STATIC_REMEDIATION_REQUIRED'&&freeze.authorization?.runtimeSmokeAuthorized===false&&freeze.authorization?.allowedRuntimeSmokeExecutions===0);
  const files=['tools/orbit360-m5-runtime-smoke-509-remediation-static-contract-v20260729.cjs','tools/orbit360-m5-academia-static-bootstrap-load-order-fixture-v20260729.mjs','tools/orbit360-m5-bootstrap-evidence-normalizer-fixture-v20260729.mjs','tools/orbit360-gate-bootstrap-auth-legal-normalized-v20260729.mjs','tools/orbit360-m5-release-candidate-readiness-v20260728.mjs'];
  for(const rel of files){const run=spawnSync(process.execPath,['--check',rel],{cwd:ROOT,encoding:'utf8'});check('SYNTAX:'+rel,run.status===0,(run.stderr||'').slice(0,180));}
  const contractRun=spawnSync(process.execPath,['tools/orbit360-m5-runtime-smoke-509-remediation-static-contract-v20260729.cjs'],{cwd:ROOT,encoding:'utf8',maxBuffer:32*1024*1024});
  check('EXECUTABLE_CONTRACT',contractRun.status===0,(contractRun.stderr||'').slice(0,260));
  const contractPath='orbit360-platform/runtime-gate-crm-v20260716/m5-runtime-smoke-509-remediation-static-contract-summary.json';
  const contract=fs.existsSync(path.join(ROOT,contractPath))?readJson(contractPath):{};
  check('CONTRACT_PASS',contract.ok===true&&contract.status==='M5_RUNTIME_SMOKE_509_REMEDIATION_STATIC_CONTRACT_PASS'&&contract.failed===0&&contract.releaseCandidateHash&&contract.releaseCandidateHash!==contract.priorReleaseCandidateHash&&contract.criticalAssets===42&&contract.remoteAssetsExpected===25&&contract.remoteAssetsMatched===24&&contract.mismatchCount===1&&contract.approvalReadyForLabDelivery===true);
  const failed=checks.filter(item=>!item.ok);
  const out={schemaVersion:'orbit360-gate-contract-preflight-m5-runtime-remediation-static-v3',gateId:EXPECTED_GATE,contractVersion:VERSION,status:failed.length?'VALIDATOR_STALE':'GO_GATE_CONTRACT',classification:failed.length?'PIPELINE_MECHANISM_FAILURE':null,executionPhase:'M5_RUNTIME_SMOKE_ROOT_CAUSE_REMEDIATION_STATIC',validatorRevision:VERSION,activationMode:'static_package_once',executionAuthorized:true,allowedExecutions:1,passed:checks.length-failed.length,total:checks.length,failed:failed.length,failedCheckIds:failed.map(item=>item.id),checks,capabilityProfile:{secrets:false,firestoreRead:false,writes:false,runtime:false,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false},priorReleaseCandidateHash:contract.priorReleaseCandidateHash||'',releaseCandidateHash:contract.releaseCandidateHash||'',criticalAssets:contract.criticalAssets||0,remoteAssetsExpected:contract.remoteAssetsExpected||0,remoteAssetsMatched:contract.remoteAssetsMatched||0,mismatchCount:contract.mismatchCount??25,approvalReadyForLabDelivery:Boolean(contract.approvalReadyForLabDelivery),sourceTransformed:false,dataAccess:false,secretAccess:false,operationalWrites:0,secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,functionsDeployed:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
  fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));if(failed.length)process.exit(41);
}catch(error){
  const out={schemaVersion:'orbit360-gate-contract-preflight-m5-runtime-remediation-static-v3',gateId:EXPECTED_GATE,contractVersion:VERSION,status:'VALIDATOR_STALE',classification:'PIPELINE_MECHANISM_FAILURE',executionPhase:'M5_RUNTIME_SMOKE_ROOT_CAUSE_REMEDIATION_STATIC',passed:0,total:1,failed:1,failedCheckIds:['ENGINE_EXCEPTION'],error:String(error&&error.stack||error).slice(0,500),capabilityProfile:{secrets:false,firestoreRead:false,writes:false,runtime:false,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false},sourceTransformed:false,dataAccess:false,secretAccess:false,operationalWrites:0,secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,functionsDeployed:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
  fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.error(JSON.stringify(out,null,2));process.exit(41);
}
