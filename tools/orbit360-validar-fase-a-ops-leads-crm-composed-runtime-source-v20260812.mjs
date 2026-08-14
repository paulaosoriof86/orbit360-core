#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const json=p=>JSON.parse(read(p).replace(/^\uFEFF/,''));
const LIFECYCLE='tools/orbit360-validator-lifecycle-fase-a-ops-leads-crm-composed-runtime-v20260812.json';
const EXT='tools/orbit360-gate-contract-registry-extension-fase-a-ops-leads-crm-composed-runtime-v20260812.json';
const ENGINE='tools/orbit360-validar-gate-contracts-engine-fase-a-ops-leads-crm-composed-runtime-v20260812.mjs';
const WORKFLOW='.github/workflows/orbit360-fase-a-ops-leads-crm-composed-runtime-v20260812.yml';
const MATRIX='tools/orbit360-fase-a-ops-leads-crm-auth-matrix-composed-v20260812.mjs';
const SOURCE='orbit360-platform/runtime-gate-crm-v20260716/fase-a-ops-leads-crm-composed-source-closure-v20260812.json';
const STOP='orbit360-platform/runtime-gate-crm-v20260716/fase-a-ops-leads-crm-pipeline-stage-stop-v20260812.json';
const REQUEST='.github/orbit360-requests/fase-a-ops-leads-crm-composed-runtime-20260812-authorization.json';
const OUT='orbit360-platform/runtime-gate-crm-v20260716/fase-a-ops-leads-crm-composed-runtime-source-sanitized-v20260812.json';
const checks=[];const add=(id,ok)=>checks.push({id,ok:Boolean(ok)});let result;
try{
 const lifecycle=json(LIFECYCLE),ext=json(EXT),source=json(SOURCE),stop=json(STOP),engine=read(ENGINE),workflow=read(WORKFLOW),matrix=read(MATRIX);
 const requestFilePresent=fs.existsSync(REQUEST);
 const request=requestFilePresent?json(REQUEST):null;
 const requestExecutable=Boolean(request&&request.approved===true&&request.authorizedByUser===true&&Number(request.allowedExecutions)>0&&request.consumed!==true&&request.authorizationFrozen!==true&&request.replayAllowed!==false);
 add('REQUEST_ABSENT',!requestExecutable);
 add('SOURCE_CLOSED',source.ok===true&&source.sourceRunId===31648662017&&source.sourceArtifactId===9161727489&&source.sourceArtifactDigest==='sha256:064ee3b03391b5c0d1d1dd21cde1ef4b4b91b9acea265b91d35ce82e8d5b49f2');
 add('STOP_PRESERVED',stop.decision==='STOP_PIPELINE_STAGE_AFTER_TWO_RUNTIME_FAILURES'&&stop.rootCause==='HARNESS_CONTRACT_COMPOSITION_FAILURE'&&stop.samePipelineMechanismRetryForbidden===true);
 add('LIFECYCLE_READY',lifecycle.status==='COMPOSED_RUNTIME_READY_AWAITING_REQUEST'&&lifecycle.request?.status==='ABSENT_UNTIL_EXPLICIT_AUTHORIZATION'&&lifecycle.antiLoop?.maximumComposedRuntimeExecutions===1&&lifecycle.integrity?.snapshotMustRemainIdentical===true);
 add('REGISTRY_READY',ext.status==='COMPOSED_RUNTIME_PROFILE_READY_AWAITING_REQUEST'&&ext.engine===ENGINE&&ext.workflow===WORKFLOW&&ext.requestPath===REQUEST&&ext.maximumComposedRuntimeExecutions===1);
 add('ENGINE_FAIL_CLOSED',engine.includes("GO_GATE_CONTRACT_FASE_A_OPS_LEADS_CRM_COMPOSED_RUNTIME")&&engine.includes('REQUEST_PARENT_BOUND')&&engine.includes('SOURCE_CLOSURE')&&engine.includes('MATRIX_COMPOSITION')&&engine.includes('firestoreWritesAuthorized:0')&&engine.includes('productionAuthorized:false'));
 add('WORKFLOW_ONE_REQUEST',workflow.includes("paths:\n      - '.github/orbit360-requests/fase-a-ops-leads-crm-composed-runtime-20260812-authorization.json'")&&workflow.includes('git diff --name-only HEAD^ HEAD')&&workflow.includes('allowedExecutions==1'));
 add('WORKFLOW_GATE_BEFORE_SECRETS',workflow.indexOf('Canonical source gate first')<workflow.indexOf('Install runtime-only test dependencies')&&workflow.indexOf('Composed runtime GO gate')<workflow.indexOf('Install runtime-only test dependencies'));
 add('WORKFLOW_NO_DEPLOY',!workflow.includes('firebase deploy')&&!workflow.includes('hosting:channel:deploy')&&!workflow.includes('functions:deploy'));
 add('WORKFLOW_MATRIX_COMPOSED',workflow.includes('orbit360-fase-a-ops-leads-crm-auth-matrix-composed-v20260812.mjs')&&workflow.includes('PASS_FASE_A_OPS_LEADS_CRM_AUTH_MATRIX')&&workflow.includes('VERIFIED_UNCHANGED'));
 add('MATRIX_COMPOSED',matrix.includes("SCHEMA='orbit360-fase-a-ops-leads-crm-auth-matrix-v3-composed'")&&matrix.includes('TRANSPORT_BUDGET_MS=90000')&&matrix.includes("AUTH_READINESS_OWNER='BLOCK1_SEGMENTED_AUTH_MEMBERSHIP_ROUTER'"));
 const failed=checks.filter(x=>!x.ok);result={schemaVersion:'orbit360-fase-a-ops-leads-crm-composed-runtime-source-v2-active-request-semantics',gateId:'fase-a-ops-leads-crm-release-lab-v20260812',status:failed.length?'STOP_COMPOSED_RUNTIME_SOURCE':'PASS_FASE_A_COMPOSED_RUNTIME_PACKAGE_SOURCE',classification:failed.length?'PIPELINE_MECHANISM_FAILURE':'RUNTIME_PACKAGE_READY_REQUEST_ABSENT',checksPassed:checks.length-failed.length,checksFailed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,requestPresent:requestExecutable,requestFilePresent,requestStatus:request?.status||null,requestAllowedExecutions:Number(request?.allowedExecutions||0),requestConsumed:request?.consumed===true,requestAuthorizationFrozen:request?.authorizationFrozen===true,requestReplayAllowed:request?.replayAllowed===true,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,browserExecuted:false,deployExecuted:false,productionTouched:false,ok:failed.length===0};
}catch(e){result={schemaVersion:'orbit360-fase-a-ops-leads-crm-composed-runtime-source-v2-active-request-semantics',status:'STOP_COMPOSED_RUNTIME_SOURCE',classification:'PIPELINE_MECHANISM_FAILURE',error:String(e&&e.message||e).slice(0,600),requestPresent:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,browserExecuted:false,deployExecuted:false,productionTouched:false,ok:false};}
fs.mkdirSync('orbit360-platform/runtime-gate-crm-v20260716',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n','utf8');console.log(JSON.stringify(result,null,2));if(!result.ok)process.exit(41);
