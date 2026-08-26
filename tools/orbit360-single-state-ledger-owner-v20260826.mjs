#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const LEDGER='orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json';
const REGISTRY='orbit360-platform/docs/orbit360-continuity-writer-registry-v20260820.json';
const A=p=>path.join(ROOT,p);
const readJson=p=>JSON.parse(fs.readFileSync(A(p),'utf8').replace(/^\uFEFF/,''));
const writeJson=(p,x)=>fs.writeFileSync(A(p),JSON.stringify(x,null,2)+'\n','utf8');
const clone=x=>JSON.parse(JSON.stringify(x));
const fail=code=>{throw new Error(code);};
const args=process.argv.slice(2);
const val=f=>{const i=args.indexOf(f);return i>=0?String(args[i+1]||''):'';};
const now=()=>new Date().toISOString();
const allowedTerminalClasses=new Set(['PASS','FUNCTIONAL_DEFECT','VALIDATOR_STALE','DATA_CONTRACT_FAILURE','ENVIRONMENT_FAILURE','PIPELINE_MECHANISM_FAILURE','SECURITY_FAILURE']);

function milestoneKind(L){
  const phase=String(L.activeState?.phase||''),status=String(L.activeState?.status||''),progress=Number(L.progress?.productionRouteProgressPct),next=String(L.nextAction?.id||'');
  if(phase==='F2_TERMINAL_PASS_AWAITING_AUTHORIZED_GO_LIVE'&&status==='F2_TERMINAL_PASS'&&progress===85&&next==='AWAIT_EXPLICIT_GO_LIVE_AUTHORIZATION')return 'LEGACY_WAITING_FIXTURE';
  if(phase==='F2_TERMINAL_PASS_P1_SOURCE_ONLY_REQUIRED_BEFORE_GO_LIVE'&&status==='F2_TERMINAL_PASS'&&progress===85&&next==='P1_FIX_SINGLE_STATE_DUPLICATE_CLAIM_AND_SEPARATE_STATIC_INVARIANT_FROM_BEHAVIORAL_SELFTEST_SOURCE_ONLY')return 'P1_REQUIRED';
  if(phase==='SINGLE_STATE_ROOTFIX_PASS_P2_RELEASE_HANDLER_REQUIRED'&&status==='SINGLE_STATE_ROOTFIX_PASS'&&progress===88&&next==='P2_IMPLEMENT_GO_LIVE_RELEASE_HANDLER_AND_PROVE_DRY_RUN_ROLLBACK_SOURCE_ONLY')return 'P1_PASS';
  if(phase==='GO_LIVE_RELEASE_HANDLER_READY_P3_HANDSHAKE_REQUIRED'&&status==='GO_LIVE_RELEASE_HANDLER_READY'&&progress===91&&next==='P3_RUN_FINAL_SOURCE_ONLY_HANDSHAKE_AND_SEAL_CONTROL_PLANE_BASELINE')return 'P2_PASS';
  if(phase==='AUTHORIZED_RELEASE_WINDOW_RUNNING'&&status==='AUTHORIZED_RELEASE_WINDOW_CLAIMED'&&(progress===85||progress===93)&&next==='RUN_AUTHORIZED_RELEASE_WINDOW')return 'CLAIMED';
  if(phase==='PRODUCTION_SMOKE_PASS'&&status==='PRODUCTION_GO_LIVE_PASS'&&progress===100&&next==='POST_GO_LIVE_MONITORING')return 'RELEASE_PASS';
  if(phase==='AUTHORIZED_RELEASE_WINDOW_FAILED'&&status==='RELEASE_TERMINAL_FAIL_NO_REPLAY'&&(progress===85||progress===93)&&next==='DIAGNOSE_RELEASE_ROOT_CAUSE_AND_VERIFY_ROLLBACK')return 'RELEASE_FAIL';
  return '';
}
function assertLedger(L){
  if(!L||L.schemaVersion!=='orbit360-continuity-ledger-v3')fail('SINGLE_STATE_LEDGER_SCHEMA_INVALID');
  if(L.branch!=='ays/backend-tenant-lab-v99-20260703'||Number(L.pullRequest)!==5)fail('SINGLE_STATE_LEDGER_REPO_BINDING_INVALID');
  if(!Number.isInteger(Number(L.revision))||Number(L.revision)<1)fail('SINGLE_STATE_LEDGER_REVISION_INVALID');
  if(L.progress?.f2TerminalPass===true){
    const kind=milestoneKind(L);
    if(!kind)fail(`SINGLE_STATE_F2_MILESTONE_PHASE_INVALID:${L.activeState?.phase}:${L.activeState?.status}:${L.progress?.productionRouteProgressPct}:${L.nextAction?.id}`);
    if(['LEGACY_WAITING_FIXTURE','P1_REQUIRED','P1_PASS','P2_PASS'].includes(kind)&&(L.authorizationBoundary?.activeRuntimeAuthorization!==false||L.authorizationBoundary?.activeRequestPath!=null||L.authorizationBoundary?.authorizationRecordPath!=null))fail('SINGLE_STATE_F2_PASS_ACTIVE_AUTH_INVALID');
  }
  return true;
}
function registry(){const R=readJson(REGISTRY);if(R.active!==true||R.sourceOfTruth!==LEDGER)fail('SINGLE_STATE_REGISTRY_INVALID');return R;}
function specFor(id){const R=registry(),s=R.executionTransitions?.[id];if(!s)fail(`SINGLE_STATE_TRANSITION_UNREGISTERED:${id}`);return s;}
function exactScope(actual={},required={}){for(const [k,v] of Object.entries(required))if(actual?.[k]!==v)fail(`SINGLE_STATE_SCOPE_MISMATCH:${k}`);}
function assertCanonicalBase(intent,expected){if(String(intent?.canonicalBaseHead||'')!==String(expected||''))fail(`SINGLE_STATE_CANONICAL_BASE_MISMATCH:${intent?.canonicalBaseHead}:${expected}`);}
function inspectIntent(intent,L=readJson(LEDGER)){
  assertLedger(L);
  if(intent?.schemaVersion!=='orbit360-execution-intent-v1')fail('SINGLE_STATE_INTENT_SCHEMA_INVALID');
  const s=specFor(String(intent.transitionId||''));
  if(Number(intent.expectedLedgerRevision)!==Number(L.revision))fail(`SINGLE_STATE_EXPECTED_REVISION_MISMATCH:${intent.expectedLedgerRevision}:${L.revision}`);
  if(!/^[a-f0-9]{40}$/.test(String(intent.canonicalBaseHead||'')))fail('SINGLE_STATE_CANONICAL_BASE_HEAD_INVALID');
  if(intent.oneShotOnly!==true||intent.replayAllowed!==false)fail('SINGLE_STATE_INTENT_ONE_SHOT_INVALID');
  if(s.requiresExplicitUserAuthorization===true){
    if(intent.explicitUserAuthorization!==true||!/^[a-f0-9]{64}$/.test(String(intent.authorizationDigest||'')))fail('SINGLE_STATE_EXPLICIT_AUTHORIZATION_REQUIRED');
  }
  exactScope(intent.scope||{},s.requiredScope||{});
  if(s.bindCandidate===true){
    if(Number(intent.candidateArtifactId)!==Number(L.successorCandidate?.artifactId)||String(intent.candidateSourceHead||'')!==String(L.successorCandidate?.sourceHead||''))fail('SINGLE_STATE_INTENT_CANDIDATE_MISMATCH');
  }
  return {ok:true,status:'SINGLE_STATE_INTENT_VALID',transitionId:intent.transitionId,capabilityClass:s.capabilityClass,stateMutation:s.stateMutation,handler:s.handler||null,handlerReady:s.handlerReady===true,expectedLedgerRevision:L.revision};
}
function assertFrom(L,s){const f=s.from||{};if(f.phase&&L.activeState?.phase!==f.phase)fail(`SINGLE_STATE_FROM_PHASE_MISMATCH:${L.activeState?.phase}:${f.phase}`);if(f.status&&L.activeState?.status!==f.status)fail(`SINGLE_STATE_FROM_STATUS_MISMATCH:${L.activeState?.status}:${f.status}`);if(Number.isInteger(f.progress)&&Number(L.progress?.productionRouteProgressPct)!==f.progress)fail('SINGLE_STATE_FROM_PROGRESS_MISMATCH');}
function bump(L){L.revision=Number(L.revision)+1;if(Number.isInteger(Number(L.productionReopeningPackage?.revision)))L.productionReopeningPackage.revision=Number(L.productionReopeningPackage.revision)+1;L.updatedAtUtc=now();}
function claimPure(input,intent,runId){
  const L=clone(input);assertLedger(L);
  if(L.executionClaim?.active===true)fail('SINGLE_STATE_EXECUTION_ALREADY_CLAIMED_STOP_RETRY');
  const i=inspectIntent(intent,L),s=specFor(i.transitionId);
  if(s.stateMutation!=='CLAIM_TERMINAL')fail('SINGLE_STATE_TRANSITION_DOES_NOT_CLAIM');
  assertFrom(L,s);
  const run=Number(runId);if(!Number.isInteger(run)||run<=0)fail('SINGLE_STATE_RUN_ID_REQUIRED');
  bump(L);const c=s.claimState||{};
  L.activeState={...L.activeState,phase:c.phase,status:c.status,rootCauseStatus:c.rootCauseStatus||L.activeState.rootCauseStatus,productFrozen:true,dataFrozen:true,runtimeAuthorized:s.capabilityClass!=='SOURCE_ONLY',runtimeReplayAllowed:false,deployAuthorized:s.capabilityClass==='RELEASE',productionAuthorized:s.capabilityClass==='RELEASE'};
  L.authorizationBoundary={...L.authorizationBoundary,activeRuntimeAuthorization:true,freshAuthorizationRequired:false,nextRuntimeMaterializationAllowed:false,newRuntimeRequestAllowed:false,currentBoundaryStatus:`RESERVED:${i.transitionId}`,activeRequestPath:null,authorizationRecordPath:null,runtimeAttemptAccepted:true,runtimeRunId:run,privilegedRiskBoundaryEntered:false,authorizationReserved:true,authorizationConsumed:false,authorizationPreserved:true};
  L.executionClaim={active:true,transitionId:i.transitionId,capabilityClass:s.capabilityClass,runId:run,authorizationDigest:String(intent.authorizationDigest||''),canonicalBaseHead:String(intent.canonicalBaseHead),claimedAtUtc:L.updatedAtUtc,allowedExecutions:1,consumed:false,historical:false,replayAllowed:false};
  L.productionReopeningPackage={...L.productionReopeningPackage,firstIncompleteStep:c.firstIncompleteStep||i.transitionId,nextActionExact:c.nextAction,runtimeAllowed:s.capabilityClass!=='SOURCE_ONLY',authorizationAllowed:false,requestMaterializationAllowed:false,authorizationReuseAllowed:false};
  L.nextAction={id:c.nextAction,description:c.description||c.nextAction,runtimeAllowed:s.capabilityClass!=='SOURCE_ONLY',userActionRequired:false};
  L.lanes={...(L.lanes||{}),B_backend_security_gates:c.laneB||`EXECUTION_CLAIMED_${i.transitionId}`};
  assertLedger(L);return L;
}
function terminalPure(input,evidence){
  const L=clone(input);assertLedger(L);const claim=L.executionClaim;if(claim?.active!==true)fail('SINGLE_STATE_ACTIVE_EXECUTION_CLAIM_REQUIRED');const s=specFor(claim.transitionId);
  const run=Number(evidence?.runId);if(!Number.isInteger(run)||run!==Number(claim.runId))fail('SINGLE_STATE_TERMINAL_RUN_MISMATCH');
  if(String(evidence?.transitionId||'')!==String(claim.transitionId))fail('SINGLE_STATE_TERMINAL_TRANSITION_MISMATCH');
  const cls=String(evidence?.classification||'');if(!allowedTerminalClasses.has(cls))fail('SINGLE_STATE_TERMINAL_CLASSIFICATION_INVALID');
  if(evidence.containsPII!==false||evidence.containsSecrets!==false)fail('SINGLE_STATE_TERMINAL_SANITIZATION_INVALID');
  if(Number(evidence.firestoreWrites||0)!==0||Number(evidence.authWrites||0)!==0||Number(evidence.operationalWrites||0)!==0)fail('SINGLE_STATE_TERMINAL_DATA_WRITE_FORBIDDEN');
  const privileged=evidence.privilegedRiskObserved===true;
  const pass=evidence.ok===true&&cls==='PASS';
  if(pass&&s.capabilityClass==='RELEASE'){
    if(!privileged||evidence.deployExecuted!==true||evidence.productionTouched!==true||evidence.productionSmokePass!==true||evidence.rollbackRequired!==false)fail('SINGLE_STATE_RELEASE_PASS_EVIDENCE_INCOMPLETE');
  }
  bump(L);const t=pass?s.terminalPassState:s.terminalFailState;if(!t)fail('SINGLE_STATE_TERMINAL_STATE_MISSING');
  L.activeState={...L.activeState,phase:t.phase,status:t.status,rootCauseStatus:pass?'PASS':String(evidence.failureCode||cls),productFrozen:!pass,dataFrozen:!pass,runtimeAuthorized:false,runtimeReplayAllowed:false,deployAuthorized:false,productionAuthorized:false};
  L.progress={...L.progress,productionRouteProgressPct:Number(t.progress),f2TerminalPass:L.progress?.f2TerminalPass===true};
  L.authorizationBoundary={...L.authorizationBoundary,activeRuntimeAuthorization:false,freshAuthorizationRequired:false,nextRuntimeMaterializationAllowed:false,newRuntimeRequestAllowed:false,currentBoundaryStatus:privileged?(pass?`CONSUMED_PASS:${claim.transitionId}`:`CONSUMED_FAIL:${claim.transitionId}`):`PRESERVED_PRE_RISK_FAIL:${claim.transitionId}`,activeRequestPath:null,authorizationRecordPath:null,runtimeAttemptAccepted:false,runtimeRunId:null,privilegedRiskBoundaryEntered:privileged,authorizationReserved:false,authorizationConsumed:privileged,authorizationPreserved:!privileged};
  L.executionClaim={...claim,active:false,allowedExecutions:0,consumed:privileged,historical:true,replayAllowed:false,consumedAtUtc:privileged?L.updatedAtUtc:null,terminalEvidencePath:String(evidence.evidencePath||''),terminalClassification:cls,privilegedRiskObserved:privileged,authorizationPreserved:!privileged};
  L.productionReopeningPackage={...L.productionReopeningPackage,firstIncompleteStep:t.firstIncompleteStep,nextActionExact:t.nextAction,runtimeAllowed:false,authorizationAllowed:false,requestMaterializationAllowed:false,authorizationReuseAllowed:false};
  L.nextAction={id:t.nextAction,description:t.description||t.nextAction,runtimeAllowed:false,userActionRequired:Boolean(t.userActionRequired)};
  L.lanes={...(L.lanes||{}),B_backend_security_gates:t.laneB||t.status};
  L.history={...(L.history||{}),latestExecutionTerminal:{transitionId:claim.transitionId,runId:run,classification:cls,ok:pass,evidencePath:String(evidence.evidencePath||''),replayAllowed:false,privilegedRiskObserved:privileged,authorizationConsumed:privileged,authorizationPreserved:!privileged,firestoreWrites:0,authWrites:0,operationalWrites:0,reducedAtUtc:L.updatedAtUtc}};
  assertLedger(L);return L;
}
function selftest(){
  const base={schemaVersion:'orbit360-continuity-ledger-v3',revision:87,updatedAtUtc:'2026-08-26T17:02:59.000Z',repository:'paulaosoriof86/orbit360-core',branch:'ays/backend-tenant-lab-v99-20260703',pullRequest:5,activeState:{phase:'F2_TERMINAL_PASS_AWAITING_AUTHORIZED_GO_LIVE',status:'F2_TERMINAL_PASS',runtimeAuthorized:false,runtimeReplayAllowed:false,deployAuthorized:false,productionAuthorized:false},successorCandidate:{artifactId:9504702901,sourceHead:'8c9668d6d423e82826b0295431ec699390d79b4b'},authorizationBoundary:{activeRuntimeAuthorization:false,activeRequestPath:null,authorizationRecordPath:null},productionReopeningPackage:{revision:81},nextAction:{id:'AWAIT_EXPLICIT_GO_LIVE_AUTHORIZATION'},progress:{productionRouteProgressPct:85,f2TerminalPass:true},lanes:{}};
  const intent={schemaVersion:'orbit360-execution-intent-v1',transitionId:'GO_LIVE_RELEASE_WINDOW',canonicalBaseHead:'523b57335524884f0cae56af5c818af7a25bc015',expectedLedgerRevision:87,oneShotOnly:true,replayAllowed:false,explicitUserAuthorization:true,authorizationDigest:'a'.repeat(64),candidateArtifactId:9504702901,candidateSourceHead:'8c9668d6d423e82826b0295431ec699390d79b4b',scope:{runtime:true,browser:true,secrets:true,firestoreRead:true,deploy:true,production:true,firestoreWrites:false,authWrites:false,operationalWrites:false,dataWrites:false,main:false,merge:false}};
  let staleRevisionBlocked=false;try{claimPure(base,{...intent,expectedLedgerRevision:86},123456);}catch(e){staleRevisionBlocked=String(e.message).includes('EXPECTED_REVISION_MISMATCH');}
  let staleBaseBlocked=false;try{assertCanonicalBase(intent,'623b57335524884f0cae56af5c818af7a25bc015');}catch(e){staleBaseBlocked=String(e.message).includes('CANONICAL_BASE_MISMATCH');}
  let candidateMismatchBlocked=false;try{claimPure(base,{...intent,candidateArtifactId:9504702902},123456);}catch(e){candidateMismatchBlocked=String(e.message).includes('INTENT_CANDIDATE_MISMATCH');}
  const claimed=claimPure(base,intent,123456);
  const reservedBeforeRisk=claimed.executionClaim?.consumed===false&&claimed.authorizationBoundary?.authorizationConsumed===false&&claimed.authorizationBoundary?.authorizationPreserved===true;
  const claimedSnapshot=JSON.stringify(claimed);
  let secondClaimBlocked=false;try{claimPure(claimed,{...intent,expectedLedgerRevision:88},123457);}catch(e){secondClaimBlocked=String(e.message).includes('STOP_RETRY');}
  const duplicateNoSideEffects=JSON.stringify(claimed)===claimedSnapshot;
  const preRiskTerminal=terminalPure(claimed,{transitionId:'GO_LIVE_RELEASE_WINDOW',runId:123456,ok:false,classification:'PIPELINE_MECHANISM_FAILURE',failureCode:'FIXTURE_PRE_RISK_FAIL',deployExecuted:false,productionTouched:false,productionSmokePass:false,rollbackRequired:false,privilegedRiskObserved:false,firestoreWrites:0,authWrites:0,operationalWrites:0,containsPII:false,containsSecrets:false,evidencePath:'fixture-pre-risk.json'});
  const preRiskAuthorizationPreserved=preRiskTerminal.executionClaim?.consumed===false&&preRiskTerminal.authorizationBoundary?.authorizationConsumed===false&&preRiskTerminal.authorizationBoundary?.authorizationPreserved===true;
  const terminal=terminalPure(claimed,{transitionId:'GO_LIVE_RELEASE_WINDOW',runId:123456,ok:true,classification:'PASS',deployExecuted:true,productionTouched:true,productionSmokePass:true,rollbackRequired:false,privilegedRiskObserved:true,firestoreWrites:0,authWrites:0,operationalWrites:0,containsPII:false,containsSecrets:false,evidencePath:'fixture-pass.json'});
  const privilegedAuthorizationConsumedOnce=terminal.executionClaim?.consumed===true&&terminal.authorizationBoundary?.authorizationConsumed===true&&terminal.authorizationBoundary?.authorizationPreserved===false;
  let doubleTerminalBlocked=false;try{terminalPure(terminal,{transitionId:'GO_LIVE_RELEASE_WINDOW',runId:123456,ok:true,classification:'PASS',deployExecuted:true,productionTouched:true,productionSmokePass:true,rollbackRequired:false,privilegedRiskObserved:true,firestoreWrites:0,authWrites:0,operationalWrites:0,containsPII:false,containsSecrets:false,evidencePath:'fixture-double.json'});}catch(e){doubleTerminalBlocked=String(e.message).includes('ACTIVE_EXECUTION_CLAIM_REQUIRED');}
  let replayBlocked=false;try{claimPure(terminal,{...intent,expectedLedgerRevision:89},123458);}catch(e){replayBlocked=true;}
  const ok=claimed.revision===88&&claimed.executionClaim?.active===true&&reservedBeforeRisk&&secondClaimBlocked&&duplicateNoSideEffects&&staleRevisionBlocked&&staleBaseBlocked&&candidateMismatchBlocked&&preRiskAuthorizationPreserved&&privilegedAuthorizationConsumedOnce&&doubleTerminalBlocked&&replayBlocked&&terminal.revision===89&&terminal.progress.productionRouteProgressPct===100&&terminal.nextAction?.id==='POST_GO_LIVE_MONITORING';
  console.log(JSON.stringify({ok,status:ok?'SINGLE_STATE_CONTROL_PLANE_SELFTEST_PASS':'SINGLE_STATE_CONTROL_PLANE_SELFTEST_FAIL',singleMutableOperationalState:LEDGER,projectionWrites:0,firstClaimPass:claimed.executionClaim?.active===true,secondClaimBlocked,duplicateNoSideEffects,staleRevisionBlocked,staleBaseBlocked,candidateMismatchBlocked,reservedBeforeRisk,preRiskAuthorizationPreserved,privilegedAuthorizationConsumedOnce,doubleTerminalBlocked,replayBlocked,claimRevision:claimed.revision,terminalRevision:terminal.revision,terminalProgress:terminal.progress.productionRouteProgressPct,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false},null,2));if(!ok)process.exit(41);
}

try{
  if(args.includes('--selftest')){selftest();process.exit(0);}
  const inspectPath=val('--inspect-intent');if(inspectPath){const out=inspectIntent(JSON.parse(fs.readFileSync(inspectPath,'utf8')));console.log(JSON.stringify(out,null,2));process.exit(0);}
  const claimPath=val('--claim');if(claimPath){const L=readJson(LEDGER),intent=JSON.parse(fs.readFileSync(claimPath,'utf8')),out=claimPure(L,intent,Number(val('--run-id')));writeJson(LEDGER,out);console.log(JSON.stringify({ok:true,status:'SINGLE_STATE_EXECUTION_CLAIMED',transitionId:intent.transitionId,ledgerRevision:out.revision,runId:out.executionClaim.runId,authorizationConsumed:out.executionClaim.consumed===true},null,2));process.exit(0);}
  const terminalPath=val('--terminal');if(terminalPath){const L=readJson(LEDGER),e=JSON.parse(fs.readFileSync(terminalPath,'utf8')),out=terminalPure(L,e);writeJson(LEDGER,out);console.log(JSON.stringify({ok:true,status:'SINGLE_STATE_EXECUTION_TERMINAL_RECONCILED',transitionId:e.transitionId,classification:e.classification,ledgerRevision:out.revision,progress:out.progress.productionRouteProgressPct,authorizationConsumed:out.executionClaim.consumed===true,authorizationPreserved:out.executionClaim.authorizationPreserved===true},null,2));process.exit(0);}
  assertLedger(readJson(LEDGER));console.log(JSON.stringify({ok:true,status:'SINGLE_STATE_LEDGER_ASSERT_PASS',ledger:LEDGER},null,2));
}catch(error){console.error(JSON.stringify({ok:false,status:'SINGLE_STATE_CONTROL_PLANE_FAIL',classification:'PIPELINE_MECHANISM_FAILURE',code:String(error?.message||error),containsPII:false,containsSecrets:false}));process.exit(41);}
