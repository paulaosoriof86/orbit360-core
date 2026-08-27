#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';

const args=process.argv.slice(2);
const val=f=>{const i=args.indexOf(f);return i>=0?String(args[i+1]||''):'';};
const intentPath=val('--intent')||process.env.ORBIT360_EXECUTION_INTENT||'';
const executionRunId=Number(val('--run-id')||process.env.ORBIT360_EXECUTION_RUN_ID||0);
const terminalOut=val('--terminal-out')||process.env.ORBIT360_TERMINAL_EVIDENCE||'';
const LEDGER='orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json';
const ROOTFIX='POST_GO_LIVE_SEMANTIC_SINGLE_STATE_ROOTFIX_VALIDATE_AND_SEAL';
const RECOVERY='CONTROL_PLANE_RECOVER_ORPHANED_SOURCE_ONLY_TERMINAL';
const stable=v=>Array.isArray(v)?v.map(stable):(v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v);
const digest=v=>createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
let I=null;
let p=null;

function writeFailureEvidence(code,transitionId,runId,statePatch){
  if(!terminalOut||!transitionId||!Number.isInteger(runId)||runId<=0||!statePatch)return false;
  const evidence={
    schemaVersion:'orbit360-semantic-single-state-rootfix-terminal-v3',
    transitionId,
    runId,
    ok:false,
    classification:'PIPELINE_MECHANISM_FAILURE',
    failureCode:code,
    status:'SEMANTIC_SINGLE_STATE_ROOTFIX_SOURCE_ONLY_FAIL',
    privilegedRiskObserved:false,
    secretAccess:false,
    firestoreRead:false,
    resetLinksGenerated:0,
    firestoreWrites:0,
    authWrites:0,
    operationalWrites:0,
    deployExecuted:false,
    productionTouched:false,
    runtimeExecuted:false,
    browserExecuted:false,
    statePatchDigest:digest(statePatch),
    statePatch,
    productMutation:false,
    dataMutation:false,
    goLiveReopened:false,
    containsPII:false,
    containsSecrets:false,
    evidencePath:`actions-artifact:orbit360-single-state-${executionRunId}/orbit360-terminal.json`
  };
  fs.writeFileSync(terminalOut,JSON.stringify(evidence,null,2)+'\n','utf8');
  return true;
}
function fail(code,transitionId=I?.transitionId,runId=executionRunId,statePatch=p){
  const terminalEvidencePrepared=writeFailureEvidence(code,transitionId,runId,statePatch);
  console.error(JSON.stringify({ok:false,status:'SEMANTIC_SINGLE_STATE_ROOTFIX_SOURCE_ONLY_FAIL',classification:'PIPELINE_MECHANISM_FAILURE',code,terminalEvidencePrepared,containsPII:false,containsSecrets:false}));
  process.exit(41);
}
function assertZeroScope(scope={}){
  for(const key of ['runtime','browser','secrets','firestoreRead','deploy','production','firestoreWrites','authWrites','operationalWrites','dataWrites']){
    if(scope[key]!==false)fail(`ROOTFIX_HANDLER_SCOPE_NOT_SOURCE_ONLY:${key}`);
  }
}
function loadLedger(){
  if(!fs.existsSync(LEDGER))fail('ROOTFIX_HANDLER_LEDGER_MISSING');
  return JSON.parse(fs.readFileSync(LEDGER,'utf8').replace(/^\uFEFF/,''));
}

if(!intentPath||!terminalOut||!Number.isInteger(executionRunId)||executionRunId<=0||!fs.existsSync(intentPath))fail('ROOTFIX_HANDLER_ARGS_INVALID');
I=JSON.parse(fs.readFileSync(intentPath,'utf8').replace(/^\uFEFF/,''));
assertZeroScope(I.scope||{});
const L=loadLedger();

if(I.transitionId===RECOVERY){
  const r=I.recovery||{};
  p=r.originalStatePatch;
  const claim=L.executionClaim||{};
  if(claim.active!==true)fail('ORPHAN_RECOVERY_ACTIVE_CLAIM_REQUIRED',String(r.claimedTransitionId||''),Number(r.claimedRunId||0),p);
  if(claim.capabilityClass!=='SOURCE_ONLY')fail('ORPHAN_RECOVERY_NON_SOURCE_ONLY_CLAIM_FORBIDDEN',String(claim.transitionId||''),Number(claim.runId||0),p);
  if(L.activeState?.runtimeAuthorized!==false||L.authorizationBoundary?.privilegedRiskBoundaryEntered===true||L.authorizationBoundary?.authorizationConsumed===true)fail('ORPHAN_RECOVERY_PRIVILEGED_RISK_FORBIDDEN',String(claim.transitionId||''),Number(claim.runId||0),p);
  if(String(r.claimedTransitionId||'')!==String(claim.transitionId||'')||Number(r.claimedRunId)!==Number(claim.runId)||String(r.claimCanonicalBaseHead||'')!==String(claim.canonicalBaseHead||''))fail('ORPHAN_RECOVERY_CLAIM_IDENTITY_MISMATCH',String(claim.transitionId||''),Number(claim.runId||0),p);
  if(!p||p.schemaVersion!=='orbit360-operational-state-patch-v1'||p.containsPII!==false||p.containsSecrets!==false||!p.values||typeof p.values!=='object'||Array.isArray(p.values))fail('ORPHAN_RECOVERY_STATE_PATCH_INVALID',String(claim.transitionId||''),Number(claim.runId||0),p);
  if(JSON.stringify(p).length>24000)fail('ORPHAN_RECOVERY_STATE_PATCH_SIZE_INVALID',String(claim.transitionId||''),Number(claim.runId||0),p);
  if(!/^[a-f0-9]{64}$/.test(String(claim.statePatchDigest||''))||digest(p)!==String(claim.statePatchDigest))fail('ORPHAN_RECOVERY_STATE_PATCH_DIGEST_MISMATCH',String(claim.transitionId||''),Number(claim.runId||0),p);
  const failureCode=String(r.failureCode||'PIPELINE_MECHANISM_FAILURE_ORPHANED_SOURCE_ONLY_CLAIM');
  if(!/^[A-Z0-9_.:-]{1,180}$/.test(failureCode))fail('ORPHAN_RECOVERY_FAILURE_CODE_INVALID',String(claim.transitionId||''),Number(claim.runId||0),p);
  const prepared=writeFailureEvidence(failureCode,String(claim.transitionId),Number(claim.runId),p);
  if(!prepared)fail('ORPHAN_RECOVERY_TERMINAL_EVIDENCE_NOT_PREPARED',String(claim.transitionId||''),Number(claim.runId||0),p);
  console.log(JSON.stringify({ok:true,status:'ORPHANED_SOURCE_ONLY_CLAIM_TERMINAL_EVIDENCE_PREPARED',classification:'PIPELINE_MECHANISM_FAILURE',recoveryRunId:executionRunId,claimedRunId:Number(claim.runId),claimedTransitionId:String(claim.transitionId),privilegedRiskObserved:false,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false},null,2));
  process.exit(0);
}

if(I.transitionId!==ROOTFIX)fail('ROOTFIX_HANDLER_TRANSITION_INVALID');
p=I.statePatch;
if(!p||p.schemaVersion!=='orbit360-operational-state-patch-v1'||p.containsPII!==false||p.containsSecrets!==false||!p.values||typeof p.values!=='object'||Array.isArray(p.values))fail('ROOTFIX_HANDLER_STATE_PATCH_INVALID');
if(JSON.stringify(p).length>24000)fail('ROOTFIX_HANDLER_STATE_PATCH_SIZE_INVALID');
const claim=L.executionClaim||{};
if(claim.active!==true||claim.transitionId!==I.transitionId||Number(claim.runId)!==executionRunId||claim.capabilityClass!=='SOURCE_ONLY')fail('ROOTFIX_HANDLER_ACTIVE_CLAIM_MISMATCH');
if(L.activeState?.runtimeAuthorized!==false||L.authorizationBoundary?.privilegedRiskBoundaryEntered===true||L.authorizationBoundary?.authorizationConsumed===true)fail('ROOTFIX_HANDLER_PRIVILEGED_RISK_STATE_INVALID');
const statePatchDigest=digest(p);
if(!/^[a-f0-9]{64}$/.test(String(claim.statePatchDigest||''))||claim.statePatchDigest!==statePatchDigest)fail('ROOTFIX_HANDLER_STATE_PATCH_DIGEST_MISMATCH');

const evidence={
  schemaVersion:'orbit360-semantic-single-state-rootfix-terminal-v3',
  transitionId:I.transitionId,
  runId:executionRunId,
  ok:true,
  classification:'PASS',
  status:'SEMANTIC_SINGLE_STATE_CLASSWIDE_ROOTFIX_SOURCE_ONLY_PASS',
  privilegedRiskObserved:false,
  secretAccess:false,
  firestoreRead:false,
  resetLinksGenerated:0,
  firestoreWrites:0,
  authWrites:0,
  operationalWrites:0,
  deployExecuted:false,
  productionTouched:false,
  runtimeExecuted:false,
  browserExecuted:false,
  statePatchDigest,
  statePatch:p,
  antiStaleContract:'DYNAMIC_MODULE_STATE_ONLY_LEDGER_OR_APPEND_ONLY_EVIDENCE',
  handlerUsesOwnerValidatedClaimDigest:true,
  duplicateKeywordSanitizationForbidden:true,
  failureAlwaysPreparesTerminalEvidenceAfterValidatedIntent:true,
  orphanSourceOnlyClaimRecoverySupported:true,
  productMutation:false,
  dataMutation:false,
  goLiveReopened:false,
  containsPII:false,
  containsSecrets:false,
  evidencePath:`actions-artifact:orbit360-single-state-${executionRunId}/orbit360-terminal.json`
};
fs.writeFileSync(terminalOut,JSON.stringify(evidence,null,2)+'\n','utf8');
console.log(JSON.stringify({ok:true,status:evidence.status,classification:'PASS',runId:executionRunId,statePatchDigest,handlerUsesOwnerValidatedClaimDigest:true,failureAlwaysPreparesTerminalEvidenceAfterValidatedIntent:true,orphanSourceOnlyClaimRecoverySupported:true,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false},null,2));
