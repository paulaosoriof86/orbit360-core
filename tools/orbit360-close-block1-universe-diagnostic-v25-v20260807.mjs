#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const REQUEST=process.env.ORBIT360_V25_REQUEST_FILE || '.github/orbit360-requests/block1-client360-insurers-v25-diagnostic-authorization.json';
const LIFECYCLE='tools/orbit360-validator-lifecycle-block1-universe-diagnostic-v25-v20260807.json';
const DIAG=process.env.ORBIT360_V25_DIAGNOSTIC_EVIDENCE || 'orbit360-platform/runtime-gate-crm-v20260716/v25-block1-universe-differential-sanitized-v20260807.json';
const FINAL=process.env.ORBIT360_V25_FINAL_EVIDENCE || 'orbit360-platform/runtime-gate-crm-v20260716/v25-block1-final-sanitized-v20260807.json';
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8').replace(/^\uFEFF/,''));
const write=(p,v)=>{const a=path.join(ROOT,p);fs.mkdirSync(path.dirname(a),{recursive:true});fs.writeFileSync(a,JSON.stringify(v,null,2)+'\n','utf8');};

const request=read(REQUEST); const lifecycle=read(LIFECYCLE); const diag=fs.existsSync(path.join(ROOT,DIAG))?read(DIAG):null;
const runId=process.env.GITHUB_RUN_ID || '';
const attempt=Number(process.env.GITHUB_RUN_ATTEMPT || 1);
let decision='STOP_RETRY', classification='PIPELINE_MECHANISM_FAILURE', checkpoint='DIAGNOSTIC_EVIDENCE_MISSING';
if (diag?.ok === true && ['VALIDATOR_STALE','DATA_CONTRACT_FAILURE','REQUIERE_VALIDACION','PASS_DATA_CONTRACT'].includes(diag.decision)) {
  decision=diag.decision; classification=diag.decision; checkpoint='UNIVERSE_DIAGNOSTIC_COMPLETE';
}
request.status=`CONSUMED_${decision}`;
request.allowedExecutions=0; request.consumed=true; request.authorizationFrozen=true; request.replayAllowed=false;
request.consumedByRunId=runId; request.consumedByAttempt=attempt; request.consumedAt=new Date().toISOString();
request.executionResult={ decision, classification, checkpoint, runId, attempt, firestoreReads:diag?.firestoreReads ?? 0, firestoreWrites:0, authReads:0, authWrites:0, operationalWrites:0, hostingTouched:false, browserExecuted:false, productionTouched:false };
write(REQUEST,request);

lifecycle.status=`CLOSED_${decision}`; lifecycle.classification=classification; lifecycle.currentPhase='CLOSED_UNIVERSE_DIAGNOSTIC_V25'; lifecycle.stopRetryActive=decision==='STOP_RETRY'; lifecycle.authorizationReserved=false; lifecycle.authorizationFrozen=true; lifecycle.allowedExecutions=0; lifecycle.activeRequest=false; lifecycle.requestConsumed=true; lifecycle.replayAllowed=false; lifecycle.executionAuthorized=false;
lifecycle.executionProfile={ mode:'CLOSED_NO_RUNTIME', phase:'CLOSED_UNIVERSE_DIAGNOSTIC_V25', capabilities:{ secrets:false, firestoreRead:false, firestoreWrite:false, authRead:false, authWrite:false, browser:false, hosting:false, functionsDeploy:false, rulesDeploy:false, reimport:false, production:false } };
lifecycle.diagnosticResult={ runId, attempt, decision, classification, checkpoint, observed:diag?.observed || null, domainDecision:diag?.domainDecision || null, differentialCounts:diag?{clientes:diag.differential?.clientes?.length||0,aseguradoras:diag.differential?.aseguradoras?.length||0}:null, nextTreatment:diag?.nextTreatment || null, firestoreReads:diag?.firestoreReads ?? 0, writes:0 };
lifecycle.nextAction=decision==='VALIDATOR_STALE'?'AUTHORIZE_CONTRACT_UPDATE_ONLY_NO_DATA_WRITE':decision==='DATA_CONTRACT_FAILURE'?'AUTHORIZE_TARGETED_DATA_CONTRACT_REPAIR_PLAN_NO_WRITE':decision==='REQUIERE_VALIDACION'?'OBTAIN_OBJECTIVE_PROVENANCE_FOR_UNRESOLVED_DIFFERENTIAL_NO_WRITE':'UNIVERSE_RECONCILED_PREPARE_FRESH_VISUAL_RUNTIME_AUTHORIZATION';
write(LIFECYCLE,lifecycle);

const final={ schemaVersion:'orbit360-block1-universe-diagnostic-v25-final-v1', gateId:'block1-client360-insurers-lab-v20260717', contractVersion:'1.0.41', authorizationGeneration:'v25-differential-universe-diagnosis', decision, classification, checkpoint, runId, attempt, observed:diag?.observed || null, domainDecision:diag?.domainDecision || null, differential:diag?.differential || {clientes:[],aseguradoras:[]}, nextTreatment:diag?.nextTreatment || null, requestConsumed:true, authorizationFrozen:true, replayAllowed:false, firestoreReads:diag?.firestoreReads ?? 0, firestoreWrites:0, authReads:0, authWrites:0, operationalWrites:0, reimport:false, hostingTouched:false, browserExecuted:false, productionTouched:false, containsPII:false, containsNames:false, containsEmails:false, containsDocuments:false, containsSecrets:false, ok:diag?.ok===true };
write(FINAL,final); console.log(JSON.stringify(final,null,2));
process.exit(final.ok?0:42);
