#!/usr/bin/env node
'use strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const json=p=>JSON.parse(read(p).replace(/^\uFEFF/,''));
const MATRIX='tools/orbit360-fase-a-ops-leads-crm-auth-matrix-composed-v20260812.mjs';
const BLOCK1='tools/orbit360-block1-final-native-matrix-v20260811.mjs';
const BLOCK12='tools/orbit360-block12-cumulative-visual-v20260804.mjs';
const FIRST_MATRIX='tools/orbit360-fase-a-ops-leads-crm-auth-matrix-v20260812.mjs';
const STOP='orbit360-platform/runtime-gate-crm-v20260716/fase-a-ops-leads-crm-pipeline-stage-stop-v20260812.json';
const OUT='orbit360-platform/runtime-gate-crm-v20260716/fase-a-ops-leads-crm-composed-source-sanitized-v20260812.json';
const checks=[];const add=(id,ok,detail='')=>checks.push({id,ok:Boolean(ok),detail:String(detail||'').slice(0,500)});
let result;
try{
  const m=read(MATRIX),b1=read(BLOCK1),b12=read(BLOCK12),first=read(FIRST_MATRIX),stop=json(STOP);
  add('PIPELINE_STOP_BOUND',stop.ok===true&&stop.decision==='STOP_PIPELINE_STAGE_AFTER_TWO_RUNTIME_FAILURES'&&stop.classification==='PIPELINE_MECHANISM_FAILURE'&&stop.rootCause==='HARNESS_CONTRACT_COMPOSITION_FAILURE'&&stop.samePipelineMechanismRetryForbidden===true&&stop.newComposedMechanismRequiresSourceOnlyPass===true);
  add('TWO_FAILURES_BOUND',Array.isArray(stop.runtimeFailures)&&stop.runtimeFailures.length===2&&stop.runtimeFailures[0].runId===31644988994&&stop.runtimeFailures[1].runId===31646214850);
  add('COMPOSED_SCHEMA',m.includes("SCHEMA='orbit360-fase-a-ops-leads-crm-auth-matrix-v3-composed'")&&m.includes("COMPOSITION_REVISION='block12-transport-plus-block1-auth-readiness-v20260812'"));
  add('OWNERS_SEPARATED',m.includes("TRANSPORT_OWNER='BLOCK12_EXISTING_LAB_TRANSPORT'")&&m.includes("AUTH_READINESS_OWNER='BLOCK1_SEGMENTED_AUTH_MEMBERSHIP_ROUTER'"));
  add('TRANSPORT_PRECEDENT_BLOCK12',b12.includes("waitUntil: 'commit', timeout: 90000")||b12.includes("waitUntil:'commit',timeout:90000"));
  add('TRANSPORT_PRECEDENT_FIRST_RUNTIME',first.includes("waitUntil:'commit',timeout:90000")||first.includes("waitUntil: 'commit', timeout: 90000"));
  add('TRANSPORT_BUDGET_COMPOSED',m.includes('TRANSPORT_BUDGET_MS=90000')&&m.includes("page.goto(BASE_URL+'#/inicio',{waitUntil:'commit',timeout:TRANSPORT_BUDGET_MS})"));
  add('AUTH_OWNER_BLOCK1',b1.includes("bootstrapNavigationOwner:'document-commit-login-form-firebase-sdk-default-app-auth-readiness-segmented'")&&b1.includes("await page.waitForSelector('#login-form',{state:'attached',timeout:15000})")&&b1.includes("app.name==='[DEFAULT]'")&&b1.includes("Orbit.auth.productUser.__labMembershipProjection===true")&&b1.includes('async function waitRouterReady'));
  add('AUTH_BUDGETS_SEPARATE',m.includes('LOGIN_FORM_BUDGET_MS=15000')&&m.includes('FIREBASE_BUDGET_MS=30000')&&m.includes('AUTH_READY_BUDGET_MS=35000')&&m.includes('ROUTE_BUDGET_MS=45000'));
  add('AUTH_SEGMENTS_COMPOSED',m.includes("checkpoint(prefix+'_AUTH_INSIDE_WAIT')")&&m.includes("checkpoint(prefix+'_MEMBERSHIP_PROJECTION_WAIT')")&&m.includes("Orbit.auth.productUser.__labMembershipProjection===true")&&m.includes('await waitRouterReady(page,role)'));
  add('NO_15S_TRANSPORT_COUPLING',!m.includes("page.goto(BASE_URL+'#/inicio',{waitUntil:'commit',timeout:15000})"));
  add('ROUTES_UNCHANGED',m.includes("ROUTES=Object.freeze(['ops','leads','cliente360'])"));
  add('ROLES_UNCHANGED',m.includes("{role:'Direccion',width:1440,height:1000")&&m.includes("{role:'Operativo',width:1024,height:768")&&m.includes("{role:'Asesor',width:390,height:844"));
  add('FAIL_CLOSED',m.includes('AUTHORIZATION_REQUIRED:RUNTIME_NOT_AUTHORIZED'));
  add('ZERO_WRITE_BOUNDARY',m.includes('firestoreWrites:0')&&m.includes('authWrites:0')&&m.includes('operationalWrites:0')&&m.includes('deploys:0')&&m.includes('productionTouched:false'));
  add('NO_DEPLOY_COMMAND',!m.includes('firebase deploy')&&!m.includes('hosting:channel:deploy')&&!m.includes('functions:deploy'));
  add('NO_PRODUCT_PATCH_OWNER',stop.correctionContract?.deployAuthorized===false&&stop.correctionContract?.writesAuthorized===0&&stop.correctionContract?.transportOwner==='BLOCK12_EXISTING_LAB_TRANSPORT'&&stop.correctionContract?.authReadinessOwner==='BLOCK1_SEGMENTED_AUTH_MEMBERSHIP_ROUTER');
  const failed=checks.filter(x=>!x.ok);
  result={schemaVersion:'orbit360-fase-a-ops-leads-crm-composed-source-v1',gateId:'fase-a-ops-leads-crm-release-lab-v20260812',contractVersion:'1.0.0',status:failed.length?'STOP_COMPOSED_SOURCE':'PASS_FASE_A_COMPOSED_HARNESS_SOURCE',classification:failed.length?'PIPELINE_MECHANISM_FAILURE':'PIPELINE_ROOT_CAUSE_CORRECTED_SOURCE',rootCause:'HARNESS_CONTRACT_COMPOSITION_FAILURE',transportOwner:'BLOCK12_EXISTING_LAB_TRANSPORT',authReadinessOwner:'BLOCK1_SEGMENTED_AUTH_MEMBERSHIP_ROUTER',checksPassed:checks.length-failed.length,checksFailed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,browserExecuted:false,deployExecuted:false,productionTouched:false,runtimeAuthorized:false,containsPII:false,containsSecrets:false,ok:failed.length===0};
}catch(e){result={schemaVersion:'orbit360-fase-a-ops-leads-crm-composed-source-v1',status:'STOP_COMPOSED_SOURCE',classification:'PIPELINE_MECHANISM_FAILURE',error:String(e&&e.message||e).slice(0,600),secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,browserExecuted:false,deployExecuted:false,productionTouched:false,runtimeAuthorized:false,containsPII:false,containsSecrets:false,ok:false};}
fs.mkdirSync('orbit360-platform/runtime-gate-crm-v20260716',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n','utf8');console.log(JSON.stringify(result,null,2));if(!result.ok)process.exit(41);
