#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process');
const ROOT=process.cwd(),OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/m5-runtime-smoke-remediation-static-contract-summary.json');
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const checks=[];const check=(id,ok,detail='')=>checks.push({id,ok:Boolean(ok),detail:String(detail||'').slice(0,220)});
function unchangedSinceBaseline(rel){const r=cp.spawnSync('git',['diff','--quiet','610229dcead42162f1e22b34894b4a3f8230684f','HEAD','--',rel],{cwd:ROOT});return r.status===0;}
try{
 const owner=read('orbit360-platform/core/academia-static-content-write-policy-v20260729.js');
 const academia=read('orbit360-platform/data/academia-v1230-operational-directory-v20260722.js');
 const preview=read('orbit360-platform/ays-lab-preview.html');
 const loader=read('orbit360-platform/core/backend-lab-loader.js');
 const browser=read('tools/orbit360-m5-runtime-smoke-browser-v20260729.mjs');
 const readiness=read('tools/orbit360-m5-release-candidate-readiness-v20260728.mjs');
 const contract=read('orbit360-platform/core/m5-release-candidate-contract-p0.js');
 const stop=json('orbit360-platform/runtime-gate-crm-v20260716/m5-runtime-smoke-505-closure.json');
 const policyTest=json('orbit360-platform/runtime-gate-crm-v20260716/m5-academia-static-write-policy-test.json');
 check('STOP_LINE_CLOSED',stop.status==='M5_RUNTIME_SMOKE_LAB_FAILED_STOP_LINE'&&stop.authorizationConsumed===true&&stop.writes?.firestoreWrites===0&&stop.writes?.operationalWrites===0);
 check('PROTECTED_LAB_LOADER_RESTORED',unchangedSinceBaseline('orbit360-platform/core/backend-lab-loader.js'));
 check('PROTECTED_STORE_UNCHANGED',unchangedSinceBaseline('orbit360-platform/data/store-firestore-lab.local.js'));
 check('OWNER_VERSION',owner.includes("VERSION='20260729.2'"));
 check('OWNER_LAB_ONLY',owner.includes("store.__firestoreLabExplicit!==true"));
 check('OWNER_SEED_TRANSIENT',owner.includes('function hydrateSeed')&&owner.includes('static_seed_'));
 check('OWNER_PRESERVES_PROGRESS',owner.includes("'progreso','certificado','completado','avance'"));
 check('OWNER_STATIC_NO_DURABLE',owner.includes('durableWritesBypassedForStaticContent:true')&&owner.includes("mode:'transient_static_content'"));
 check('OWNER_OPERATIONAL_DURABLE',owner.includes("mode:'durable_operational'"));
 check('ACADEMIA_INSTALLS_OWNER',academia.includes('academia-static-content-write-policy-v20260729.js?v=20260729-2'));
 check('ACADEMIA_INSTALLS_BEFORE_APPLY',academia.indexOf('academia-static-content-write-policy-v20260729.js')<academia.indexOf('function apply()'));
 check('ACADEMIA_STATIC_DECLARATION',academia.includes("staticContentPersistence: 'transient_session_only_in_lab'"));
 check('PREVIEW_BACKEND_RUNTIME',preview.includes('orbit-backend-runtime')&&preview.includes("var LAB_RUNTIME = '20260717-2'"));
 check('PREVIEW_VISUAL_REVISION_SEPARATE',preview.includes("var SW_BUILD = '20260723-10'")&&preview.includes("var CRITICAL_RELEASE = 'block1-critical-runtime-20260723-10'"));
 check('PREVIEW_WARMS_OWNER',preview.includes('academia-static-content-write-policy-v20260729.js?v=20260729-2'));
 check('LOADER_CANONICAL_VERSION',loader.includes("loaderVersion: 'v1.111'")&&!loader.includes('academia-static-content-write-policy'));
 check('POLICY_FIXTURES_PASS',policyTest.ok===true&&policyTest.failed===0&&policyTest.total>=15);
 check('FUTURE_BROWSER_POLICY',browser.includes("EXPECTED_POLICY_VERSION='20260729.2'"));
 check('FUTURE_BROWSER_RUNTIME',browser.includes("runtime==='20260717-2'"));
 check('FUTURE_BROWSER_BLOCKS_DURABLE',browser.includes('M5_RUNTIME_DURABLE_WRITE_BLOCKED')&&browser.includes('blockedOperationalCalls.length===0'));
 check('FUTURE_BROWSER_ALLOWS_ONLY_TRANSIENT',browser.includes("decision.mode==='transient_static_content'")&&browser.includes('transientStaticCalls.length>0'));
 check('READINESS_VERSION',readiness.includes("CONTRACT_VERSION='5.0.6'"));
 check('READINESS_COUNTS',readiness.includes('assets.length===42')&&readiness.includes('remoteRows.length===25'));
 check('READINESS_OWNER_BOUND',readiness.includes('core/academia-static-content-write-policy-v20260729.js'));
 check('CONTRACT_COUNTS',contract.includes('criticalAssetCount)!==42')&&contract.includes('assetsExpected)!==25'));
 check('NO_FORBIDDEN_RUNTIME',!process.env.ORBIT360_LAB_LOGIN_PASSWORD&&!process.env.GOOGLE_APPLICATION_CREDENTIALS);
}catch(error){check('CONTRACT_EXCEPTION',false,error&&error.message||error);}
const failed=checks.filter(x=>!x.ok);const out={schemaVersion:'orbit360-m5-runtime-smoke-remediation-static-contract-v1',gateId:'block5-release-candidate-visualization-v20260728',contractVersion:'5.0.6',ok:failed.length===0,status:failed.length?'M5_RUNTIME_SMOKE_REMEDIATION_STATIC_CONTRACT_FAIL':'M5_RUNTIME_SMOKE_REMEDIATION_STATIC_CONTRACT_PASS',passed:checks.length-failed.length,total:checks.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,secrets:false,firestoreRead:false,runtime:false,browser:false,deploy:false,operationalWrites:0,containsPII:false,containsSecrets:false};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));if(!out.ok)process.exit(41);
