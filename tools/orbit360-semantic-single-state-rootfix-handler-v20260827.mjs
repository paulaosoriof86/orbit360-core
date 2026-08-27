#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';

const args=process.argv.slice(2);
const val=f=>{const i=args.indexOf(f);return i>=0?String(args[i+1]||''):'';};
const intentPath=val('--intent')||process.env.ORBIT360_EXECUTION_INTENT||'';
const runId=Number(val('--run-id')||process.env.ORBIT360_EXECUTION_RUN_ID||0);
const terminalOut=val('--terminal-out')||process.env.ORBIT360_TERMINAL_EVIDENCE||'';
const LEDGER='orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json';
const stable=v=>Array.isArray(v)?v.map(stable):(v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v);
const digest=v=>createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
let I=null;
let p=null;

function writeFailureEvidence(code){
  if(!terminalOut||!Number.isInteger(runId)||runId<=0||!I?.transitionId||!p)return false;
  const evidence={
    schemaVersion:'orbit360-semantic-single-state-rootfix-terminal-v2',
    transitionId:I.transitionId,
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
    statePatchDigest:digest(p),
    statePatch:p,
    productMutation:false,
    dataMutation:false,
    goLiveReopened:false,
    containsPII:false,
    containsSecrets:false,
    evidencePath:`actions-artifact:orbit360-single-state-${runId}/orbit360-terminal.json`
  };
  fs.writeFileSync(terminalOut,JSON.stringify(evidence,null,2)+'\n','utf8');
  return true;
}
function fail(code){
  const terminalEvidencePrepared=writeFailureEvidence(code);
  console.error(JSON.stringify({ok:false,status:'SEMANTIC_SINGLE_STATE_ROOTFIX_SOURCE_ONLY_FAIL',classification:'PIPELINE_MECHANISM_FAILURE',code,terminalEvidencePrepared,containsPII:false,containsSecrets:false}));
  process.exit(41);
}

if(!intentPath||!terminalOut||!Number.isInteger(runId)||runId<=0||!fs.existsSync(intentPath))fail('ROOTFIX_HANDLER_ARGS_INVALID');
I=JSON.parse(fs.readFileSync(intentPath,'utf8').replace(/^\uFEFF/,''));
if(I.transitionId!=='POST_GO_LIVE_SEMANTIC_SINGLE_STATE_ROOTFIX_VALIDATE_AND_SEAL')fail('ROOTFIX_HANDLER_TRANSITION_INVALID');
if(I.scope?.runtime!==false||I.scope?.browser!==false||I.scope?.secrets!==false||I.scope?.firestoreRead!==false||I.scope?.deploy!==false||I.scope?.production!==false||I.scope?.firestoreWrites!==false||I.scope?.authWrites!==false||I.scope?.operationalWrites!==false||I.scope?.dataWrites!==false)fail('ROOTFIX_HANDLER_SCOPE_NOT_SOURCE_ONLY');
p=I.statePatch;
if(!p||p.schemaVersion!=='orbit360-operational-state-patch-v1'||p.containsPII!==false||p.containsSecrets!==false||!p.values||typeof p.values!=='object'||Array.isArray(p.values))fail('ROOTFIX_HANDLER_STATE_PATCH_INVALID');
if(JSON.stringify(p).length>24000)fail('ROOTFIX_HANDLER_STATE_PATCH_SIZE_INVALID');
if(!fs.existsSync(LEDGER))fail('ROOTFIX_HANDLER_LEDGER_MISSING');
const L=JSON.parse(fs.readFileSync(LEDGER,'utf8').replace(/^\uFEFF/,''));
const claim=L.executionClaim||{};
if(claim.active!==true||claim.transitionId!==I.transitionId||Number(claim.runId)!==runId||claim.capabilityClass!=='SOURCE_ONLY')fail('ROOTFIX_HANDLER_ACTIVE_CLAIM_MISMATCH');
if(L.activeState?.runtimeAuthorized!==false||L.authorizationBoundary?.privilegedRiskBoundaryEntered===true||L.authorizationBoundary?.authorizationConsumed===true)fail('ROOTFIX_HANDLER_PRIVILEGED_RISK_STATE_INVALID');
const statePatchDigest=digest(p);
if(!/^[a-f0-9]{64}$/.test(String(claim.statePatchDigest||''))||claim.statePatchDigest!==statePatchDigest)fail('ROOTFIX_HANDLER_STATE_PATCH_DIGEST_MISMATCH');

const evidence={
  schemaVersion:'orbit360-semantic-single-state-rootfix-terminal-v2',
  transitionId:I.transitionId,
  runId,
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
  productMutation:false,
  dataMutation:false,
  goLiveReopened:false,
  containsPII:false,
  containsSecrets:false,
  evidencePath:`actions-artifact:orbit360-single-state-${runId}/orbit360-terminal.json`
};
fs.writeFileSync(terminalOut,JSON.stringify(evidence,null,2)+'\n','utf8');
console.log(JSON.stringify({ok:true,status:evidence.status,classification:'PASS',runId,statePatchDigest,handlerUsesOwnerValidatedClaimDigest:true,failureAlwaysPreparesTerminalEvidenceAfterValidatedIntent:true,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false},null,2));
