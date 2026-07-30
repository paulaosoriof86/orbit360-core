#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
const ROOT=process.cwd(),PLAT=path.join(ROOT,'orbit360-platform'),OUT=path.join(PLAT,'runtime-gate-crm-v20260716/preflight-sanitizado.json');
const GATE='block6-go-live-product-v20260730',VERSION='6.1.0',REQUEST='tools/orbit360-m6-go-live-request-v20260730.json';
const PROJECT='ays-orbit-360-lab',TENANT='alianzas-soluciones';
const files=[
 'orbit360-platform/product-runtime-config.js','orbit360-platform/core/product-prebootstrap-store-p0.js','orbit360-platform/core/product-runtime-browser-providers-p0.js','orbit360-platform/core/auth-product-runtime-p0.js','orbit360-platform/core/product-app-runtime-p0.js','orbit360-platform/core/product-config-session-overlay-p0.js','orbit360-platform/data/store-firestore-product-readonly-p0.js','orbit360-platform/core/backend-product-readonly-bootstrap-p0.js','tools/orbit360-m6-build-product-shell-v20260730.mjs','tools/orbit360-m6-generate-product-runtime-config-v20260730.mjs','tools/orbit360-m6-product-browser-smoke-v20260730.mjs','tools/orbit360-m6-product-data-snapshot-readonly-v20260730.mjs','firebase.product-go-live.json','firestore.product-readonly.rules','storage.product-readonly.rules','firebase.product-rollback-safe.json','firestore.product-deny-all.rules','storage.product-deny-all.rules','orbit360-platform/rollback-safe/index.html'
];
const checks=[];const add=(id,ok,detail='')=>checks.push({id,ok:Boolean(ok),detail:String(detail||'').slice(0,240)});
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const localStorageOperational=source=>/(?:localStorage\s*\.|localStorage\s*\[|window\.localStorage)/.test(source);
try{
 const request=JSON.parse(read(REQUEST));const parent=execFileSync('git',['rev-parse','HEAD^'],{cwd:ROOT,encoding:'utf8'}).trim();
 add('GATE',process.argv[2]===GATE&&request.gateId===GATE&&request.contractVersion===VERSION);
 add('BRANCH',request.branch==='ays/backend-tenant-lab-v99-20260703'&&process.env.ORBIT360_BRANCH===request.branch);
 add('BINDING',request.authorizedBaseCommit===parent,parent);
 add('AUTHORIZATION',request.explicitAuthorization===true&&request.authorizationSource==='user_authorized_m6_product_go_live_single_block_20260730'&&request.allowedExecutions===1&&request.authorizationConsumed===false&&request.singleRiskBlock===true);
 add('M5_CLOSED',request.m5SuccessfulRun===30513413235&&request.m5VisualApproved===true&&request.staticPreparationRun===30514717995);
 add('TARGET',request.target&&request.target.projectId===PROJECT&&request.target.tenantId===TENANT&&request.target.liveUrl===`https://${PROJECT}.web.app`&&request.createProject===false);
 add('SCOPE',request.secrets===true&&request.firestoreRead===true&&request.firestoreDataWrites===false&&request.runtime===true&&request.browser===true&&request.hostingDeploy===true&&request.firestoreRulesDeploy===true&&request.storageRulesDeploy===true&&request.functionsDeploy===false&&request.production===true&&request.merge===false&&request.main===false&&request.polizas===false&&request.rollbackOnFailure===true);
 add('FILES',files.every(rel=>fs.existsSync(path.join(ROOT,rel))),files.filter(rel=>!fs.existsSync(path.join(ROOT,rel))).join(','));
 for(const rel of files.filter(x=>/\.(?:js|mjs)$/.test(x)))execFileSync(process.execPath,['--check',rel],{cwd:ROOT,stdio:'pipe'});
 add('SYNTAX',true);
 const auth=read('orbit360-platform/core/auth-product-runtime-p0.js'),providers=read('orbit360-platform/core/product-runtime-browser-providers-p0.js'),pre=read('orbit360-platform/core/product-prebootstrap-store-p0.js'),overlay=read('orbit360-platform/core/product-config-session-overlay-p0.js');
 add('PRODUCT_OWNERS',auth.includes('paintIdentity')&&auth.includes('noLocalSession:true')&&!auth.includes('Andrea Beltrán')&&!localStorageOperational(auth)&&providers.includes("tenantSource:'membership_only'")&&providers.includes('MEMBERSHIP_IDENTITY_MISMATCH')&&!localStorageOperational(providers)&&pre.includes('volatile:true')&&!localStorageOperational(pre)&&overlay.includes('noLocalStorageFallback:true')&&!localStorageOperational(overlay));
 const go=JSON.parse(read('firebase.product-go-live.json')),rollback=JSON.parse(read('firebase.product-rollback-safe.json'));
 add('GO_LIVE_CONFIG',go.firestore&&go.firestore.rules==='firestore.product-readonly.rules'&&go.storage&&go.storage.rules==='storage.product-readonly.rules'&&go.hosting&&go.hosting.public==='orbit360-platform');
 add('ROLLBACK_CONFIG',rollback.firestore&&rollback.firestore.rules==='firestore.product-deny-all.rules'&&rollback.storage&&rollback.storage.rules==='storage.product-deny-all.rules'&&rollback.hosting&&rollback.hosting.public==='orbit360-platform/rollback-safe');
 const roF=read('firestore.product-readonly.rules'),roS=read('storage.product-readonly.rules'),denyF=read('firestore.product-deny-all.rules'),denyS=read('storage.product-deny-all.rules');
 add('RULES',roF.includes('activeMembership')&&roF.includes('allow create, update, delete: if false')&&roS.includes('activeMembership')&&roS.includes('allow write: if false')&&denyF.includes('allow read, write: if false')&&denyS.includes('allow read, write: if false'));
 const build=JSON.parse(execFileSync(process.execPath,['tools/orbit360-m6-build-product-shell-v20260730.mjs'],{cwd:ROOT,encoding:'utf8'}));
 const generated=read('orbit360-platform/runtime-gate-crm-v20260716/m6-product-index.generated.html');
 const banned=['backend-lab-loader.js','backend-lab-init.js','store-firestore-lab.local.js','data/seed.js','core/auth.js','Orbit.store.init(Orbit.SEED)','admin@demo.com','orbit.lab@demo.com','demo123'];
 add('SHELL',build.ok===true&&banned.every(x=>!generated.includes(x))&&generated.includes('auth-product-runtime-p0.js')&&generated.includes('product-app-runtime-p0.js')&&generated.includes('Orbit.productAppP0.init();'),build.productSha256||'');
 const packageRows=files.map(rel=>({path:rel,sha256:sha(fs.readFileSync(path.join(ROOT,rel)))}));const packageHash=sha(JSON.stringify(packageRows));
 const failed=checks.filter(x=>!x.ok),profile={secrets:true,firestoreRead:true,writes:false,runtime:true,browser:true,deploy:true,functionsDeploy:false,rulesDeploy:true,production:true};
 const out={schemaVersion:'orbit360-gate-contract-preflight-m6-go-live-v1',gateId:GATE,contractVersion:VERSION,executionPhase:'M6_PRODUCT_GO_LIVE_EXECUTION',status:failed.length?'VALIDATOR_STALE':'GO_GATE_CONTRACT',classification:failed.length?'PIPELINE_MECHANISM_FAILURE':null,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,executionAuthorized:failed.length===0,allowedExecutions:failed.length?0:1,packageHash,productShellHash:build.productSha256||'',projectIdentityExpected:PROJECT,tenantExpected:TENANT,m5SuccessfulRun:30513413235,m5VisualApproved:true,staticPreparationRun:30514717995,rollbackReady:true,capabilityProfile:profile,dataAccess:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
 fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));if(failed.length)process.exit(41);
}catch(error){const out={schemaVersion:'orbit360-gate-contract-preflight-m6-go-live-v1',gateId:GATE,contractVersion:VERSION,status:'VALIDATOR_STALE',classification:'PIPELINE_MECHANISM_FAILURE',failed:1,failedCheckIds:['M6_GO_LIVE_PREFLIGHT_EXCEPTION'],error:String(error&&error.message||error).slice(0,500),executionAuthorized:false,allowedExecutions:0,dataAccess:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.error(out.error);process.exit(41);}
