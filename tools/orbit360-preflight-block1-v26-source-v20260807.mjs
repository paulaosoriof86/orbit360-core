#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const GATE_ID='block1-client360-insurers-lab-v20260717';
const CONTRACT_VERSION='1.0.41';
const V25_POST='orbit360-platform/runtime-gate-crm-v20260716/v25-block1-postdiagnostic-source-adjudication-sanitized-v20260807.json';
const V25_LIFECYCLE='tools/orbit360-validator-lifecycle-block1-universe-diagnostic-v25-v20260807.json';
const V23_LIFECYCLE='tools/orbit360-validator-lifecycle-block1-v23-native-v20260807.json';
const CLIENT_EVIDENCE=process.env.ORBIT360_V26_CLIENT_EVIDENCE||'orbit360-platform/runtime-gate-crm-v20260716/v26-client-provenance-source-sanitized-v20260807.json';
const PREFLIGHT=process.env.ORBIT360_V26_PREFLIGHT_EVIDENCE||'orbit360-platform/runtime-gate-crm-v20260716/v26-block1-source-preflight-sanitized-v20260807.json';
const REQUEST='.github/orbit360-requests/block1-client360-insurers-v26-authorization.json';
const read=rel=>JSON.parse(fs.readFileSync(path.resolve(ROOT,rel),'utf8').replace(/^\uFEFF/,''));
function main(){
 const checks=[]; const c=(id,ok,detail='')=>checks.push({id,ok:!!ok,detail:ok?'':String(detail).slice(0,160)});
 const post=read(V25_POST); const lv25=read(V25_LIFECYCLE); const lv23=read(V23_LIFECYCLE); const clients=read(CLIENT_EVIDENCE);
 c('gate-id',post.gateId===GATE_ID,post.gateId); c('contract-version',post.contractVersion===CONTRACT_VERSION,post.contractVersion);
 c('v25-final-requires-validation',post.sourceAdjudicatedFinalDecision==='REQUIERE_VALIDACION',post.sourceAdjudicatedFinalDecision);
 c('v25-no-extra-lab-read',post.additionalLabReadPerformed===false && post.firestoreReadsAdditional===0);
 c('v25-request-frozen',lv25.authorizationFrozen===true&&lv25.allowedExecutions===0&&lv25.requestConsumed===true&&lv25.replayAllowed===false);
 c('canonical-owner-still-stop-frozen',lv23.status==='STOP_RETRY_UNIVERSE_ADJUDICATION'&&lv23.authorizationFrozen===true&&lv23.allowedExecutions===0);
 c('client-source-evidence-ok',clients.ok===true&&clients.firestoreReads===0&&clients.firestoreWrites===0);
 c('client-input-exact-16',clients.inputV25FingerprintCount===16,clients.inputV25FingerprintCount);
 c('no-v26-request',!fs.existsSync(path.resolve(ROOT,REQUEST)));
 c('no-runtime-caps',true);
 const failed=checks.filter(x=>!x.ok); const out={schemaVersion:'orbit360-block1-v26-source-preflight-v1',gateId:GATE_ID,contractVersion:CONTRACT_VERSION,authorizationGeneration:'v26-rootcause-close-source-only',status:failed.length?'STOP_V26_SOURCE_PREFLIGHT':'PASS_V26_SOURCE_PREFLIGHT',classification:failed.length?'PIPELINE_MECHANISM_FAILURE':'ROOT_CAUSE_SOURCE_PACKAGE_VALID',checks,clientClassification:clients.summary?.classification||'',clientUnresolved:clients.summary?.unresolved??null,requestExists:false,executionAuthorized:false,secretAccessAuthorized:false,firestoreReadAuthorized:false,firestoreWriteAuthorized:false,authReadAuthorized:false,authWriteAuthorized:false,browserAuthorized:false,hostingAuthorized:false,functionsDeployAuthorized:false,rulesDeployAuthorized:false,reimportAuthorized:false,productionAuthorized:false,writesAuthorized:0,containsPII:false,containsSecrets:false,ok:failed.length===0};
 fs.mkdirSync(path.dirname(path.resolve(ROOT,PREFLIGHT)),{recursive:true}); fs.writeFileSync(path.resolve(ROOT,PREFLIGHT),JSON.stringify(out,null,2)+'\n','utf8'); console.log(JSON.stringify(out,null,2)); process.exit(out.ok?0:41);
}
try{main();}catch(e){console.error(JSON.stringify({status:'STOP_V26_SOURCE_PREFLIGHT',classification:'PIPELINE_MECHANISM_FAILURE',error:String(e.message||e).slice(0,240),secretAccessAuthorized:false,firestoreReadAuthorized:false,writesAuthorized:0,ok:false}));process.exit(41);}
