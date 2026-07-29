#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process');
const ROOT=process.cwd(),PLAT=path.join(ROOT,'orbit360-platform');
const OLD_RC='b25bf2750548651a719526bc4dadf7662def2255876c4c2e5e32bdf90f93a091';
const OUT=path.join(PLAT,'runtime-gate-crm-v20260716/m5-runtime-smoke-509-remediation-static-contract-summary.json');
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const checks=[];const check=(id,ok,detail='')=>checks.push({id,ok:Boolean(ok),detail:String(detail||'').slice(0,260)});
const runNode=rel=>cp.spawnSync(process.execPath,[rel],{cwd:ROOT,encoding:'utf8',maxBuffer:32*1024*1024});
const unchangedSinceBaseline=rel=>cp.spawnSync('git',['diff','--quiet','610229dcead42162f1e22b34894b4a3f8230684f','HEAD','--',rel],{cwd:ROOT}).status===0;
try{
  const attempt=json('orbit360-platform/runtime-gate-crm-v20260716/m5-runtime-smoke-508-attempt-closure.json');
  const globalFreeze=json('tools/orbit360-m5-release-candidate-freeze-v20260728.json');
  const lifecycle=json('tools/orbit360-validator-lifecycle-contract-m5-runtime-smoke-509-remediation-static-v20260729.json');
  const overlay=json('tools/orbit360-gate-contract-overlay-m5-runtime-smoke-509-remediation-static-v20260729.json');
  const registry=json('tools/orbit360-gate-contract-registry-extension-m5-runtime-smoke-509-remediation-static-v20260729.json');
  const index=read('orbit360-platform/index.html');
  const owner=read('orbit360-platform/core/academia-static-content-write-policy-v20260729.js');
  const normalizer=read('tools/orbit360-gate-bootstrap-auth-legal-normalized-v20260729.mjs');
  const oldRunner=read('tools/orbit360-m5-runtime-smoke-508-browser-v20260729.mjs');
  const oldStaticContract=read('tools/orbit360-m5-runtime-smoke-remediation-static-contract-v20260729.cjs');

  check('ATTEMPT_STOP_LINE',attempt.status==='M5_RUNTIME_SMOKE_LAB_FAILED_STOP_LINE'&&attempt.runtimeAttempt?.runId===30420738744&&attempt.runtimeAttempt?.authorizationConsumed===true);
  check('ATTEMPT_ZERO_WRITES',attempt.writes?.firestoreWrites===0&&attempt.writes?.operationalWrites===0&&attempt.evidence?.countsStable===true&&attempt.evidence?.digestsStable===true);
  check('ATTEMPT_ROOT_CAUSES',Array.isArray(attempt.rootCauses)&&attempt.rootCauses.length===3);
  check('GLOBAL_FREEZE',globalFreeze.status==='M5_RUNTIME_SMOKE_508_STOP_LINE_STATIC_REMEDIATION_REQUIRED'&&globalFreeze.authorization?.runtimeSmokeAuthorized===false&&globalFreeze.authorization?.allowedRuntimeSmokeExecutions===0);
  check('LIFECYCLE',lifecycle.gateContractVersion==='5.0.9'&&lifecycle.executionProfile?.phase==='M5_RUNTIME_SMOKE_ROOT_CAUSE_REMEDIATION_STATIC');
  check('LIFECYCLE_ZERO_CAPABILITIES',Object.values(lifecycle.executionProfile?.capabilities||{}).every(value=>value===false));
  check('OVERLAY',overlay.contractVersion==='5.0.9'&&overlay.required?.runtimeAttemptRunId===30420738744&&overlay.capabilityBoundary?.runtime===false&&overlay.capabilityBoundary?.browser===false);
  check('REGISTRY',registry.gates?.length===1&&registry.gates[0]?.contractVersion==='5.0.9'&&registry.gates[0]?.phase==='M5_RUNTIME_SMOKE_ROOT_CAUSE_REMEDIATION_STATIC');

  const baseStore=index.indexOf('data/store.js?v1291');
  const policy=index.indexOf('core/academia-static-content-write-policy-v20260729.js?v=20260729-2');
  const labStore=index.indexOf('data/store-firestore-lab.local.js?v=lab-store-20260703');
  const seed=index.indexOf('data/seed.js?v1291');
  const academia=index.indexOf('data/academia-plus.js?v1356');
  check('INDEX_LOAD_ORDER_PRESENT',[baseStore,policy,labStore,seed,academia].every(value=>value>=0));
  check('INDEX_POLICY_AFTER_BASE_STORE',baseStore<policy);
  check('INDEX_POLICY_BEFORE_LAB_STORE',policy<labStore);
  check('INDEX_POLICY_BEFORE_SEED',policy<seed);
  check('INDEX_POLICY_BEFORE_ACADEMIA',policy<academia);
  check('INDEX_POLICY_SINGLE_LOAD',(index.match(/core\/academia-static-content-write-policy-v20260729\.js\?v=20260729-2/g)||[]).length===1);
  check('PROTECTED_FIRESTORE_STORE_UNCHANGED',unchangedSinceBaseline('orbit360-platform/data/store-firestore-lab.local.js'));
  check('PROTECTED_LAB_LOADER_UNCHANGED',unchangedSinceBaseline('orbit360-platform/core/backend-lab-loader.js'));
  check('OWNER_VERSION',owner.includes("VERSION='20260729.2'"));
  check('OWNER_WATCH_ASSIGNMENT',owner.includes("Object.defineProperty(Orbit,'store'")&&owner.includes('set:function(value){current=value;try{install();}catch(e){}}'));
  check('OWNER_STATIC_COLLECTIONS',owner.includes("col==='lecciones'||col==='evaluaciones'")&&owner.includes("col==='config'&&key==='academia'"));
  check('OWNER_USER_PROGRESS_DURABLE',owner.includes("'progreso','certificado','completado','avance'")&&owner.includes("mode:'durable_operational'"));

  check('NORMALIZER_EXPORT',normalizer.includes('export function normalizeScriptEvidence'));
  check('NORMALIZER_STRING_OR_OBJECT',normalizer.includes("typeof item==='string'")&&normalizer.includes("typeof item==='object'"));
  check('NORMALIZER_CONTINUOUS_DURING_BOOTSTRAP',normalizer.includes('setInterval(()=>normalizeScriptEvidence(report),5)')&&normalizer.includes('waitForBaseProductBootstrap'));
  check('OLD_RUNNER_FAILURE_REPRODUCED',oldRunner.includes('parsedScripts.push(parsedPath)')&&oldRunner.includes("from './orbit360-gate-bootstrap-auth-legal-v20260717.mjs'"));
  check('OLD_STATIC_GATE_GAP_RECORDED',oldStaticContract.includes("ACADEMIA_INSTALLS_BEFORE_APPLY")&&!oldStaticContract.includes('INDEX_POLICY_BEFORE_LAB_STORE'));

  for(const rel of ['tools/orbit360-m5-academia-static-bootstrap-load-order-fixture-v20260729.mjs','tools/orbit360-m5-bootstrap-evidence-normalizer-fixture-v20260729.mjs','tools/orbit360-m5-release-candidate-readiness-v20260728.mjs']){
    const syntax=cp.spawnSync(process.execPath,['--check',rel],{cwd:ROOT,encoding:'utf8'});
    check('SYNTAX:'+rel,syntax.status===0,(syntax.stderr||'').slice(0,180));
  }
  const loadOrderRun=runNode('tools/orbit360-m5-academia-static-bootstrap-load-order-fixture-v20260729.mjs');
  check('LOAD_ORDER_FIXTURE_PROCESS',loadOrderRun.status===0,(loadOrderRun.stderr||'').slice(0,220));
  const loadOrder=json('orbit360-platform/runtime-gate-crm-v20260716/m5-academia-static-bootstrap-load-order-test.json');
  check('LOAD_ORDER_FIXTURE_PASS',loadOrder.ok===true&&loadOrder.status==='M5_ACADEMIA_STATIC_BOOTSTRAP_LOAD_ORDER_PASS'&&loadOrder.failed===0&&loadOrder.passed===loadOrder.total);
  const normalizerRun=runNode('tools/orbit360-m5-bootstrap-evidence-normalizer-fixture-v20260729.mjs');
  check('NORMALIZER_FIXTURE_PROCESS',normalizerRun.status===0,(normalizerRun.stderr||'').slice(0,220));
  const normalizerTest=json('orbit360-platform/runtime-gate-crm-v20260716/m5-bootstrap-evidence-normalizer-test.json');
  check('NORMALIZER_FIXTURE_PASS',normalizerTest.ok===true&&normalizerTest.status==='M5_BOOTSTRAP_EVIDENCE_NORMALIZER_PASS'&&normalizerTest.failed===0&&normalizerTest.passed===normalizerTest.total);

  const readinessRun=runNode('tools/orbit360-m5-release-candidate-readiness-v20260728.mjs');
  check('READINESS_PROCESS',readinessRun.status===41||readinessRun.status===0,(readinessRun.stderr||'').slice(0,220));
  const readiness=json('orbit360-platform/runtime-gate-crm-v20260716/m5-release-candidate-readiness-summary.json');
  const newHash=String(readiness.releaseCandidate&&readiness.releaseCandidate.hash||'');
  check('NEW_RC_HASH_PRESENT',/^[a-f0-9]{64}$/.test(newHash),newHash);
  check('NEW_RC_DIFFERS',newHash!==OLD_RC,newHash);
  check('NEW_RC_CRITICAL_ASSETS',readiness.releaseCandidate?.criticalAssetCount===42&&readiness.releaseCandidate?.allCriticalAssetsPresent===true);
  check('REMOTE_EXPECTED',readiness.remoteLab?.assetsExpected===25&&readiness.remoteLab?.assetsChecked===25);
  check('REMOTE_ONLY_INDEX_MISMATCH',readiness.remoteLab?.assetsMatched===24&&readiness.remoteLab?.mismatchCount===1&&readiness.remoteLab?.rows?.filter(row=>!row.match).length===1&&readiness.remoteLab.rows.find(row=>!row.match)?.path==='index.html');
  check('READY_FOR_HOSTING_DELIVERY',readiness.status==='M5_RC_READY_LAB_DELIVERY_REQUIRED'&&readiness.approvalReadyForLabDelivery===true&&readiness.approvalReadyForRuntimeSmoke===false);
  check('NO_SENSITIVE_CAPABILITIES',!process.env.GOOGLE_APPLICATION_CREDENTIALS&&!process.env.ORBIT360_LAB_LOGIN_PASSWORD);

  const failed=checks.filter(item=>!item.ok);
  const out={schemaVersion:'orbit360-m5-runtime-smoke-509-remediation-static-contract-v1',gateId:'block5-release-candidate-visualization-v20260728',contractVersion:'5.0.9',ok:failed.length===0,status:failed.length?'M5_RUNTIME_SMOKE_509_REMEDIATION_STATIC_CONTRACT_FAIL':'M5_RUNTIME_SMOKE_509_REMEDIATION_STATIC_CONTRACT_PASS',passed:checks.length-failed.length,total:checks.length,failed:failed.length,failedCheckIds:failed.map(item=>item.id),checks,priorReleaseCandidateHash:OLD_RC,releaseCandidateHash:newHash||'',criticalAssets:readiness.releaseCandidate?.criticalAssetCount||0,remoteAssetsExpected:readiness.remoteLab?.assetsExpected||0,remoteAssetsMatched:readiness.remoteLab?.assetsMatched||0,mismatchCount:readiness.remoteLab?.mismatchCount??25,remoteParity:Boolean(readiness.remoteLab?.remoteParity),approvalReadyForLabDelivery:Boolean(readiness.approvalReadyForLabDelivery),secrets:false,firestoreRead:false,firestoreWrites:0,operationalWrites:0,runtime:false,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false,containsPII:false,containsSecrets:false};
  fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));if(!out.ok)process.exit(41);
}catch(error){
  const out={schemaVersion:'orbit360-m5-runtime-smoke-509-remediation-static-contract-v1',gateId:'block5-release-candidate-visualization-v20260728',contractVersion:'5.0.9',ok:false,status:'M5_RUNTIME_SMOKE_509_REMEDIATION_STATIC_CONTRACT_FAIL',passed:0,total:1,failed:1,failedCheckIds:['CONTRACT_EXCEPTION'],error:String(error&&error.stack||error).slice(0,500),secrets:false,firestoreRead:false,firestoreWrites:0,operationalWrites:0,runtime:false,browser:false,deploy:false,containsPII:false,containsSecrets:false};
  fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.error(JSON.stringify(out,null,2));process.exit(41);
}
