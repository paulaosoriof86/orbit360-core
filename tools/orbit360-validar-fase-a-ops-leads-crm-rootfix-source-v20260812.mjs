#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const json=p=>JSON.parse(read(p).replace(/^\uFEFF/,''));
const MATRIX='tools/orbit360-fase-a-ops-leads-crm-auth-matrix-segmented-v20260812.mjs';
const BLOCK1='tools/orbit360-block1-final-native-matrix-v20260811.mjs';
const FAILURE='orbit360-platform/runtime-gate-crm-v20260716/fase-a-ops-leads-crm-runtime-failure-31644988994-sanitized-v20260812.json';
const OUT='orbit360-platform/runtime-gate-crm-v20260716/fase-a-ops-leads-crm-rootfix-source-sanitized-v20260812.json';
const checks=[];const add=(id,ok)=>checks.push({id,ok:Boolean(ok)});
let result;
try{
  const m=read(MATRIX),b=read(BLOCK1),f=json(FAILURE);
  add('ROOTCAUSE_BOUND',f.runId===31644988994&&f.classification==='PIPELINE_MECHANISM_FAILURE'&&f.checkpoint==='OPERATIVO_AUTH_MEMBERSHIP_READY_WAIT'&&f.productDefectDemonstrated===false&&f.firestoreWrites===0&&f.authWrites===0&&f.operationalWrites===0&&f.deploys===0);
  add('BLOCK1_SEGMENTED_OWNER',b.includes("bootstrapNavigationOwner:'document-commit-login-form-firebase-sdk-default-app-auth-readiness-segmented'")&&b.includes("await page.waitForSelector('#login-form',{state:'attached',timeout:15000})")&&b.includes("app.name==='[DEFAULT]'")&&b.includes("Orbit.auth.productUser.__labMembershipProjection===true")&&b.includes("async function waitRouterReady"));
  add('ROOTFIX_SEGMENTED_REVISION',m.includes("BOOTSTRAP_REVISION='block1-segmented-late-ready-v20260811-exact-semantics'"));
  add('DOCUMENT_COMMIT_SEGMENT',m.includes("page.goto(BASE_URL+'#/inicio',{waitUntil:'commit',timeout:15000})"));
  add('LOGIN_FORM_SEGMENT',m.includes("page.waitForSelector('#login-form',{state:'attached',timeout:15000})"));
  add('FIREBASE_SDK_SEGMENT',m.includes("window.firebase&&typeof firebase.auth==='function'"));
  add('DEFAULT_APP_SEGMENT',m.includes("app.name==='[DEFAULT]'&&auth&&auth.app&&auth.app.name==='[DEFAULT]'"));
  add('CUSTOM_TOKEN_SEGMENT',m.includes('firebase.auth().signInWithCustomToken(t)'));
  add('AUTH_INSIDE_SEPARATE_WAIT',m.includes("checkpoint(prefix+'_AUTH_INSIDE_WAIT')")&&m.includes("AUTH_INSIDE_TIMEOUT"));
  add('MEMBERSHIP_SEPARATE_WAIT',m.includes("checkpoint(prefix+'_MEMBERSHIP_PROJECTION_WAIT')")&&m.includes("Orbit.auth.productUser.__labMembershipProjection===true")&&m.includes('MEMBERSHIP_PROJECTION_TIMEOUT'));
  add('ROUTER_LATE_READY_RECHECK',m.includes("await sleep(500);const state=await routerState(page);if(!routerReady(state))"));
  add('SECURITY_OVERLAY_REUSED',m.includes('Crea tu contraseña personal')&&m.includes("overlay.id!=='legal-gate'"));
  add('ROUTES_UNCHANGED',m.includes("ROUTES=Object.freeze(['ops','leads','cliente360'])"));
  add('ROLE_MATRIX_UNCHANGED',m.includes("{role:'Direccion',width:1440,height:1000")&&m.includes("{role:'Operativo',width:1024,height:768")&&m.includes("{role:'Asesor',width:390,height:844"));
  add('FAIL_CLOSED_RUNTIME_AUTH',m.includes("AUTHORIZATION_REQUIRED:RUNTIME_NOT_AUTHORIZED"));
  add('ZERO_WRITE_DECLARATION',m.includes('firestoreWrites:0')&&m.includes('authWrites:0')&&m.includes('operationalWrites:0')&&m.includes('deploys:0')&&m.includes('productionTouched:false'));
  add('NO_DEPLOY_COMMAND',!m.includes('firebase deploy')&&!m.includes('hosting:channel:deploy')&&!m.includes('functions:deploy'));
  add('OLD_COMBINED_AUTH_WAIT_RETIRED',!m.includes("return document.body.dataset.authStage==='inside'&&!document.body.classList.contains('pre-auth')&&s&&s.ready===true&&s.tenantBound===true;"));
  const failed=checks.filter(x=>!x.ok);
  result={schemaVersion:'orbit360-fase-a-ops-leads-crm-rootfix-source-v1',gateId:'fase-a-ops-leads-crm-release-lab-v20260812',status:failed.length?'STOP_ROOTFIX_SOURCE':'PASS_FASE_A_SEGMENTED_AUTH_ROOTFIX_SOURCE',classification:failed.length?'PIPELINE_MECHANISM_FAILURE':'PIPELINE_ROOTFIX_SOURCE_READY',rootfixOwner:'AUTHENTICATED_RELEASE_TEST_HARNESS',checksPassed:checks.length-failed.length,checksFailed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,browserExecuted:false,deployExecuted:false,productionTouched:false,runtimeAuthorized:false,ok:failed.length===0};
}catch(e){result={schemaVersion:'orbit360-fase-a-ops-leads-crm-rootfix-source-v1',status:'STOP_ROOTFIX_SOURCE',classification:'PIPELINE_MECHANISM_FAILURE',error:String(e&&e.message||e).slice(0,500),secretAccess:false,firestoreRead:false,firestoreWrites:0,browserExecuted:false,deployExecuted:false,productionTouched:false,runtimeAuthorized:false,ok:false};}
fs.mkdirSync('orbit360-platform/runtime-gate-crm-v20260716',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));if(!result.ok)process.exit(41);
