#!/usr/bin/env node
'use strict';

const clone=x=>JSON.parse(JSON.stringify(x));
const fail=code=>{throw new Error(code);};

export function reserveOneShotRecord(record,{run,isRequest=false,ts=new Date().toISOString()}={}){
  const x=clone(record||{});
  if(!Number.isInteger(Number(run))||Number(run)<=0)fail('RUNTIME_RUN_ID_REQUIRED');
  if(x.consumed===true||x.historical===true||Number(x.allowedExecutions)!==1||x.runtimeAttemptAccepted!==false)fail('AUTH_REQUEST_NOT_AVAILABLE_FOR_ONE_SHOT_RESERVATION');
  x.allowedExecutions=1;
  x.consumed=false;
  x.historical=false;
  x.replayAllowed=false;
  x.runtimeAttemptAccepted=true;
  x.runtimeAttemptReserved=true;
  x.privilegedRiskBoundaryEntered=false;
  x.runtimeAttemptCount=0;
  x.runtimeRunId=Number(run);
  x.runtimeAttemptAcceptedAt=ts;
  x.status=isRequest?'RUNTIME_ATTEMPT_RESERVED_PREFLIGHT_PENDING':'RUNTIME_ATTEMPT_RESERVED_ONE_SHOT_UNCONSUMED';
  return x;
}

export function privilegedRiskObserved({terminal={},identityEvidenceExists=false,integrityBeforeExists=false}={}){
  return terminal.runtimeExecuted===true||terminal.browserExecuted===true||terminal.secretAccess===true||terminal.firestoreRead===true||identityEvidenceExists===true||integrityBeforeExists===true;
}

export function consumeReservedRecordAtRiskBoundary(record,{run,isRequest=false,ts=new Date().toISOString()}={}){
  const x=clone(record||{});
  if(!Number.isInteger(Number(run))||Number(run)<=0)fail('RUNTIME_RUN_ID_REQUIRED');
  if(x.consumed===true||x.historical===true||Number(x.allowedExecutions)!==1||x.runtimeAttemptAccepted!==true||x.runtimeAttemptReserved!==true||Number(x.runtimeRunId)!==Number(run))fail('AUTH_REQUEST_NOT_RESERVED_FOR_PRIVILEGED_RISK');
  x.allowedExecutions=0;
  x.runtimeAttemptCount=1;
  x.privilegedRiskBoundaryEntered=true;
  x.privilegedRiskBoundaryEnteredAt=ts;
  x.status=isRequest?'PRIVILEGED_RISK_ENTERED_ONE_SHOT_CONSUMPTION_PENDING_TERMINAL':'PRIVILEGED_RISK_ENTERED_ONE_SHOT_CONSUMPTION_PENDING_TERMINAL';
  return x;
}

export function preserveAuthorizationAfterPreRiskFailure(record,{run,isRequest=false,classification='PIPELINE_MECHANISM_FAILURE',failureCode='PRE_RISK_FAILURE',ts=new Date().toISOString()}={}){
  const x=clone(record||{});
  if(x.consumed===true||x.historical===true||Number(x.allowedExecutions)!==1||x.runtimeAttemptAccepted!==true||x.runtimeAttemptReserved!==true||Number(x.runtimeRunId)!==Number(run))fail('AUTH_REQUEST_NOT_RESERVED_FOR_PRE_RISK_PRESERVATION');
  x.allowedExecutions=1;
  x.consumed=false;
  x.historical=false;
  x.replayAllowed=false;
  x.runtimeAttemptAccepted=false;
  x.runtimeAttemptReserved=false;
  x.privilegedRiskBoundaryEntered=false;
  x.runtimeAttemptCount=0;
  x.runtimeRunId=null;
  x.runtimeAttemptAcceptedAt=null;
  x.status=isRequest?'PRE_RISK_FAIL_REQUEST_REUSABLE':'PRE_RISK_FAIL_AUTHORIZATION_REUSABLE';
  x.lastPreRiskFailure={runId:Number(run),classification:String(classification),failureCode:String(failureCode),at:ts};
  return x;
}

function selftest(){
  const base={allowedExecutions:1,consumed:false,historical:false,replayAllowed:false,runtimeAttemptAccepted:false,runtimeAttemptCount:0};
  const runA=32902848794,runB=32904415944;
  const reservedA=reserveOneShotRecord(base,{run:runA});
  const reservationDoesNotConsume=reservedA.allowedExecutions===1&&reservedA.consumed===false&&reservedA.runtimeAttemptReserved===true&&reservedA.privilegedRiskBoundaryEntered===false;
  let secondReservationStopRetry=false;
  try{reserveOneShotRecord(reservedA,{run:runA});}catch(error){secondReservationStopRetry=String(error?.message||'').includes('AUTH_REQUEST_NOT_AVAILABLE_FOR_ONE_SHOT_RESERVATION');}
  const riskA=privilegedRiskObserved({terminal:{runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false},identityEvidenceExists:false,integrityBeforeExists:false});
  const preservedA=preserveAuthorizationAfterPreRiskFailure(reservedA,{run:runA,failureCode:'PIPELINE_MECHANISM_FAILURE:GOOGLE_APPLICATION_CREDENTIALS_NOT_BOUND_TO_CURRENT_PROVIDER_PROCESS'});
  const historicalRun329028PreservesAuthorization=riskA===false&&preservedA.allowedExecutions===1&&preservedA.consumed===false&&preservedA.runtimeAttemptAccepted===false&&preservedA.status==='PRE_RISK_FAIL_AUTHORIZATION_REUSABLE';
  const reservedB=reserveOneShotRecord(base,{run:runB});
  const riskB=privilegedRiskObserved({terminal:{runtimeExecuted:true,browserExecuted:true,secretAccess:true,firestoreRead:true},identityEvidenceExists:true,integrityBeforeExists:true});
  const consumedB=consumeReservedRecordAtRiskBoundary(reservedB,{run:runB});
  const historicalRun329044ConsumesAfterRisk=riskB===true&&consumedB.allowedExecutions===0&&consumedB.privilegedRiskBoundaryEntered===true&&consumedB.runtimeAttemptCount===1;
  const ok=reservationDoesNotConsume&&secondReservationStopRetry&&historicalRun329028PreservesAuthorization&&historicalRun329044ConsumesAfterRisk;
  const out={schemaVersion:'orbit360-f2-authorization-lifecycle-selftest-v1',ok,status:ok?'F2_AUTHORIZATION_LIFECYCLE_SELFTEST_PASS':'F2_AUTHORIZATION_LIFECYCLE_SELFTEST_FAIL',reservationDoesNotConsume,secondReservationStopRetry,historicalRun329028PreservesAuthorization,historicalRun329044ConsumesAfterRisk,oneShotConsumptionPolicy:'ONLY_AFTER_OBSERVED_PRIVILEGED_RISK',runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
  console.log(JSON.stringify(out,null,2));
  if(!ok)process.exit(41);
}

if(import.meta.url===`file://${process.argv[1]}`)selftest();
