#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const LEDGER='orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json';
const REGISTRY='orbit360-platform/docs/orbit360-continuity-writer-registry-v20260820.json';
const args=process.argv.slice(2);
const val=f=>{const i=args.indexOf(f);return i>=0?String(args[i+1]||''):'';};
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8').replace(/^\uFEFF/,''));
const fail=(code,detail='')=>{throw new Error(code+(detail?`:${detail}`:''));};
const ZERO_KEYS=['firestoreWrites','authWrites','operationalWrites','dataWrites','main','merge'];

export function validatePrivilegedPreflight(intent,ledger,registry,runId){
  const transition=String(intent?.transitionId||''),spec=registry?.executionTransitions?.[transition];
  if(!transition||!spec)fail('PRIVILEGED_PREFLIGHT_TRANSITION_UNREGISTERED');
  if(spec.capabilityClass==='SOURCE_ONLY')fail('PRIVILEGED_PREFLIGHT_SOURCE_ONLY_FORBIDDEN');
  if(spec.stateMutation!=='CLAIM_TERMINAL')fail('PRIVILEGED_PREFLIGHT_STATE_MUTATION_INVALID');
  if(spec.requiresExplicitUserAuthorization===true&&(intent?.explicitUserAuthorization!==true||!/^[a-f0-9]{64}$/.test(String(intent?.authorizationDigest||''))))fail('PRIVILEGED_PREFLIGHT_AUTHORIZATION_INVALID');
  for(const [k,v] of Object.entries(spec.requiredScope||{}))if(intent?.scope?.[k]!==v)fail('PRIVILEGED_PREFLIGHT_SCOPE_MISMATCH',k);
  for(const k of ZERO_KEYS)if(intent?.scope?.[k]!==false)fail('PRIVILEGED_PREFLIGHT_WRITE_OR_MAIN_SCOPE_FORBIDDEN',k);
  const claim=ledger?.executionClaim||{},boundary=ledger?.authorizationBoundary||{};
  if(claim.active!==true||claim.transitionId!==transition||Number(claim.runId)!==Number(runId))fail('PRIVILEGED_PREFLIGHT_ACTIVE_CLAIM_MISMATCH');
  if(String(claim.authorizationDigest||'')!==String(intent?.authorizationDigest||''))fail('PRIVILEGED_PREFLIGHT_AUTHORIZATION_DIGEST_MISMATCH');
  if(claim.replayAllowed!==false||Number(claim.allowedExecutions)!==1||claim.consumed===true)fail('PRIVILEGED_PREFLIGHT_ONE_SHOT_STATE_INVALID');
  if(ledger?.activeState?.runtimeAuthorized!==true||ledger?.activeState?.runtimeReplayAllowed!==false)fail('PRIVILEGED_PREFLIGHT_RUNTIME_STATE_INVALID');
  if(boundary.activeRuntimeAuthorization!==true||boundary.authorizationReserved!==true||boundary.authorizationConsumed===true||boundary.runtimeAttemptAccepted!==true||Number(boundary.runtimeRunId)!==Number(runId))fail('PRIVILEGED_PREFLIGHT_BOUNDARY_INVALID');
  if(spec.capabilityClass==='RELEASE'&&(ledger?.activeState?.deployAuthorized!==true||ledger?.activeState?.productionAuthorized!==true))fail('PRIVILEGED_PREFLIGHT_RELEASE_STATE_INVALID');
  if(spec.capabilityClass!=='RELEASE'&&(intent?.scope?.deploy!==false||intent?.scope?.production!==false))fail('PRIVILEGED_PREFLIGHT_NON_RELEASE_DEPLOY_SCOPE_FORBIDDEN');
  return {ok:true,status:'SINGLE_STATE_PRIVILEGED_PREFLIGHT_PASS',classification:'PASS',transitionId:transition,capabilityClass:spec.capabilityClass,runId:Number(runId),claimBound:true,authorizationBound:true,scopeBound:true,replayAllowed:false,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
}

function selftest(){
  const intent={transitionId:'TEST_RELEASE',explicitUserAuthorization:true,authorizationDigest:'a'.repeat(64),scope:{runtime:true,browser:true,secrets:true,firestoreRead:true,deploy:true,production:true,firestoreWrites:false,authWrites:false,operationalWrites:false,dataWrites:false,main:false,merge:false}};
  const registry={executionTransitions:{TEST_RELEASE:{capabilityClass:'RELEASE',stateMutation:'CLAIM_TERMINAL',requiresExplicitUserAuthorization:true,requiredScope:{...intent.scope}}}};
  const ledger={activeState:{runtimeAuthorized:true,runtimeReplayAllowed:false,deployAuthorized:true,productionAuthorized:true},authorizationBoundary:{activeRuntimeAuthorization:true,authorizationReserved:true,authorizationConsumed:false,runtimeAttemptAccepted:true,runtimeRunId:77},executionClaim:{active:true,transitionId:'TEST_RELEASE',runId:77,authorizationDigest:'a'.repeat(64),allowedExecutions:1,consumed:false,replayAllowed:false}};
  const pass=validatePrivilegedPreflight(intent,ledger,registry,77).ok===true;
  let staleClaimBlocked=false,writeScopeBlocked=false,consumedBlocked=false;
  try{validatePrivilegedPreflight(intent,{...ledger,executionClaim:{...ledger.executionClaim,runId:76}},registry,77);}catch{staleClaimBlocked=true;}
  try{validatePrivilegedPreflight({...intent,scope:{...intent.scope,firestoreWrites:true}},ledger,registry,77);}catch{writeScopeBlocked=true;}
  try{validatePrivilegedPreflight(intent,{...ledger,authorizationBoundary:{...ledger.authorizationBoundary,authorizationConsumed:true}},registry,77);}catch{consumedBlocked=true;}
  const ok=pass&&staleClaimBlocked&&writeScopeBlocked&&consumedBlocked;
  console.log(JSON.stringify({ok,status:ok?'SINGLE_STATE_PRIVILEGED_PREFLIGHT_SELFTEST_PASS':'SINGLE_STATE_PRIVILEGED_PREFLIGHT_SELFTEST_FAIL',staleClaimBlocked,writeScopeBlocked,consumedBlocked,secretAccess:false,runtimeExecuted:false,deployExecuted:false,productionTouched:false},null,2));
  if(!ok)process.exit(41);
}

try{
  if(args.includes('--selftest')){selftest();process.exit(0);}
  const intentPath=val('--intent')||process.env.ORBIT360_EXECUTION_INTENT||'';
  const runId=Number(val('--run-id')||process.env.ORBIT360_EXECUTION_RUN_ID||0);
  if(!intentPath||!fs.existsSync(intentPath)||!runId)fail('PRIVILEGED_PREFLIGHT_INPUT_MISSING');
  const out=validatePrivilegedPreflight(JSON.parse(fs.readFileSync(intentPath,'utf8').replace(/^\uFEFF/,'')),read(LEDGER),read(REGISTRY),runId);
  console.log(JSON.stringify(out,null,2));
}catch(error){console.error(JSON.stringify({ok:false,status:'SINGLE_STATE_PRIVILEGED_PREFLIGHT_FAIL',classification:'SECURITY_FAILURE',code:String(error?.message||error),secretAccess:false,runtimeExecuted:false,browserExecuted:false,firestoreRead:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false},null,2));process.exit(41);}
