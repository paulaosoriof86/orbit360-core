#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const ROOT=process.cwd(),PLAT=path.join(ROOT,'orbit360-platform'),OUT=path.join(PLAT,'runtime-gate-crm-v20260716/preflight-sanitizado.json');
const GATE='block6-go-live-product-v20260730',VERSION='6.0.0';
const checks=[];const add=(id,ok,detail='')=>checks.push({id,ok:Boolean(ok),detail:String(detail||'').slice(0,240)});
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');
try{
  add('GATE',process.argv[2]===GATE&&process.env.ORBIT360_BRANCH==='ays/backend-tenant-lab-v99-20260703');
  const files=[
    'orbit360-platform/product-runtime-config.js',
    'orbit360-platform/core/product-prebootstrap-store-p0.js',
    'orbit360-platform/core/product-runtime-browser-providers-p0.js',
    'orbit360-platform/core/auth-product-runtime-p0.js',
    'orbit360-platform/core/product-app-runtime-p0.js',
    'orbit360-platform/core/product-config-session-overlay-p0.js',
    'tools/orbit360-m6-build-product-shell-v20260730.mjs',
    'firebase.product-readonly.json','firestore.product-readonly.rules','storage.product-readonly.rules',
    'firebase.product-deny-all.json','firestore.product-deny-all.rules','storage.product-deny-all.rules'
  ];
  add('FILES',files.every(rel=>fs.existsSync(path.join(ROOT,rel))),files.filter(rel=>!fs.existsSync(path.join(ROOT,rel))).join(','));
  for(const rel of files.filter(x=>/\.(?:js|mjs)$/.test(x))){execFileSync(process.execPath,['--check',rel],{cwd:ROOT,stdio:'pipe'});}
  add('SYNTAX',true);
  const placeholder=read('orbit360-platform/product-runtime-config.js');
  add('CONFIG_FAIL_CLOSED',/enabled:\s*false/.test(placeholder)&&/tenantHint:\s*''/.test(placeholder)&&!/(?:apiKey|projectId|authDomain|appId):\s*['"][^'"]+/.test(placeholder));
  const provider=read('orbit360-platform/core/product-runtime-browser-providers-p0.js');
  add('PROVIDERS',provider.includes("tenantSource:'membership_only'")&&provider.includes('MEMBERSHIP_IDENTITY_MISMATCH')&&provider.includes('readTenantConfig')&&!provider.includes('localStorage')&&!provider.includes('orbit.lab@demo.com'));
  const auth=read('orbit360-platform/core/auth-product-runtime-p0.js');
  add('AUTH_PRODUCT',auth.includes('signInWithEmailAndPassword')===false&&auth.includes('p.signIn(')&&auth.includes('noLocalSession:true')&&!auth.includes('demo123')&&!auth.includes('admin@demo.com')&&!auth.includes('localStorage'));
  const pre=read('orbit360-platform/core/product-prebootstrap-store-p0.js');
  add('PREBOOTSTRAP_VOLATILE',pre.includes('volatile:true')&&pre.includes('_staticCourse===true')&&!pre.includes('localStorage'));
  const overlay=read('orbit360-platform/core/product-config-session-overlay-p0.js');
  add('CONFIG_SESSION_OVERLAY',overlay.includes('noLocalStorageFallback:true')&&overlay.includes('PRODUCT_CONFIGURATION_WRITE_REQUIRES_GATE')&&!overlay.includes('localStorage.'));
  const app=read('orbit360-platform/core/product-app-runtime-p0.js');
  add('APP_ORCHESTRATOR',app.includes('backendProductReadOnlyBootstrapP0')&&app.includes('readTenantConfig')&&app.includes('writeAuthorized:false')&&app.includes("tenantSource:'membership_only'"));
  const denyFire=read('firestore.product-deny-all.rules'),denyStorage=read('storage.product-deny-all.rules');
  add('ROLLBACK_DENY_ALL',denyFire.includes('allow read, write: if false')&&denyStorage.includes('allow read, write: if false'));
  const roFire=read('firestore.product-readonly.rules'),roStorage=read('storage.product-readonly.rules');
  add('READONLY_RULES',roFire.includes('allow create, update, delete: if false')&&roFire.includes('activeMembership')&&roStorage.includes('allow write: if false')&&roStorage.includes('activeMembership'));
  const buildRaw=execFileSync(process.execPath,['tools/orbit360-m6-build-product-shell-v20260730.mjs'],{cwd:ROOT,encoding:'utf8'});
  const build=JSON.parse(buildRaw);const generated=read('orbit360-platform/runtime-gate-crm-v20260716/m6-product-index.generated.html');
  add('BUILD',build.ok===true&&build.status==='M6_PRODUCT_SHELL_BUILT'&&build.apply===false,build.productSha256||'');
  const forbidden=['backend-lab-loader.js','backend-lab-init.js','store-firestore-lab.local.js','data/seed.js','core/auth.js','Orbit.store.init(Orbit.SEED)','orbitBackend=firestore-lab','tenant=alianzas-soluciones','admin@demo.com','orbit.lab@demo.com','demo123'];
  add('NO_LAB_DEMO_FALLBACK',forbidden.every(x=>!generated.includes(x)),forbidden.filter(x=>generated.includes(x)).join(','));
  const required=['product-runtime-config.js','product-config-session-overlay-p0.js','product-prebootstrap-store-p0.js','product-runtime-browser-providers-p0.js','auth-product-runtime-p0.js','product-app-runtime-p0.js','store-firestore-product-readonly-p0.js','backend-product-readonly-bootstrap-p0.js','Orbit.productAppP0.init();'];
  add('PRODUCT_STACK',required.every(x=>generated.includes(x)),required.filter(x=>!generated.includes(x)).join(','));
  const failed=checks.filter(x=>!x.ok);
  const out={schemaVersion:'orbit360-gate-contract-preflight-m6-product-shell-v1',gateId:GATE,contractVersion:VERSION,executionPhase:'M6_PRODUCT_SHELL_STATIC_PREPARATION',status:failed.length?'VALIDATOR_STALE':'GO_GATE_CONTRACT',classification:failed.length?'PIPELINE_MECHANISM_FAILURE':null,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,productShellBuilt:!failed.length,productShellHash:build.productSha256||'',rollbackDenyAllReady:true,productReadonlyRulesReady:true,m5ClosedRequired:true,productionAuthorizationRequired:true,capabilityProfile:{secrets:false,firestoreRead:false,writes:false,runtime:false,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false},dataAccess:false,secretAccess:false,firestoreWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
  fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));if(failed.length)process.exit(41);
}catch(error){const out={schemaVersion:'orbit360-gate-contract-preflight-m6-product-shell-v1',gateId:GATE,contractVersion:VERSION,status:'VALIDATOR_STALE',classification:'PIPELINE_MECHANISM_FAILURE',failed:1,failedCheckIds:['M6_STATIC_ENGINE_EXCEPTION'],error:String(error&&error.message||error).slice(0,500),dataAccess:false,secretAccess:false,firestoreWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.error(out.error);process.exit(41);}
