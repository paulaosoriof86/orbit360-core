#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const args=process.argv.slice(2),v=f=>{const i=args.indexOf(f);return i>=0?args[i+1]:'';};
const expectedRevision=Number(v('--expected-revision')),expectedPackageRevision=Number(v('--expected-package-revision')),transition=v('--transition');
const metadataPath=v('--candidate-metadata')||'orbit360-platform/runtime-gate-crm-v20260716/macro2-candidate-artifact-metadata-v20260821.json';
const attestationPath=v('--artifact-attestation'),authIdentity=v('--authorization-identity'),parentHead=v('--parent-head'),terminalEvidence=v('--terminal-evidence');
const runtimeRunId=v('--runtime-run-id');
if(!Number.isInteger(expectedRevision)||!Number.isInteger(expectedPackageRevision)||!transition)throw new Error('TRANSITION_PRECONDITION_REQUIRED');

const P={
 ledger:'orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json',
 pkg:'orbit360-platform/docs/orbit360-production-reopening-package-v20260820.json',
 boundary:'orbit360-platform/docs/orbit360-f2-runtime-authorization-boundary-v20260820.json',
 projection:'tools/orbit360-continuity-projection-atomic-v20260820.mjs'
};
const A=p=>path.join(ROOT,p),T=p=>fs.readFileSync(A(p),'utf8').replace(/^\uFEFF/,''),J=p=>JSON.parse(T(p));
const W=(p,x)=>{fs.mkdirSync(path.dirname(A(p)),{recursive:true});fs.writeFileSync(A(p),JSON.stringify(x,null,2)+'\n','utf8');};
const L=J(P.ledger),pkg=J(P.pkg);
if(L.revision!==expectedRevision)throw new Error(`EXPECTED_REVISION_MISMATCH:${expectedRevision}:${L.revision}`);
if(Number(pkg.revision)!==expectedPackageRevision||Number(L.productionReopeningPackage?.revision)!==expectedPackageRevision)throw new Error('EXPECTED_PACKAGE_REVISION_MISMATCH');
const before=T(P.ledger),now=()=>new Date().toISOString(),sha=s=>crypto.createHash('sha256').update(String(s)).digest('hex');
const bump=()=>{L.revision+=1;L.productionReopeningPackage.revision+=1;L.updatedAtUtc=now();return L.updatedAtUtc;};
const project=()=>execFileSync(process.execPath,[A(P.projection),'--expected-revision',String(L.revision)],{cwd:ROOT,stdio:'inherit'});
const profile={phase:'F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY',capabilities:{secrets:true,firestoreRead:true,customTokenMint:true,browser:true,runtime:true,writes:false,firestoreWrites:false,authWrites:false,membershipWrites:false,dataWrites:false,operationalWrites:false,packageRebuild:false,deploy:false,publish:false,publication:false,production:false,main:false,merge:false}};
let out={};

if(transition==='CONTROL_PLANE_EVIDENCE_RECONCILE'){
  if(!fs.existsSync(A(metadataPath))||!attestationPath||!fs.existsSync(A(attestationPath)))throw new Error('DURABLE_CANDIDATE_EVIDENCE_REQUIRED');
  const M=J(metadataPath),att=J(attestationPath);
  if(M.status!=='CANDIDATE_ARTIFACT_PUBLISHED_SOURCE_ONLY'||M.sourcePublished!==true||M.fileCount!==194||M.deltaCount!==9||M.unchangedFileCount!==185)throw new Error('DURABLE_CANDIDATE_METADATA_INVALID');
  if(M.runtimeExecuted!==false||M.browserExecuted!==false||M.secretAccess!==false||M.firestoreRead!==false||Number(M.writes)!==0||M.deployExecuted!==false||M.productionTouched!==false)throw new Error('DURABLE_CANDIDATE_SIDE_EFFECT_SIGNAL');
  if(Number(att.id)!==Number(M.artifactId)||att.expired!==false||String(att.digest)!==String(M.artifactDigest))throw new Error('DURABLE_ARTIFACT_ATTESTATION_MISMATCH');
  try{execFileSync('git',['merge-base','--is-ancestor',M.sourceHead,'HEAD'],{cwd:ROOT,stdio:'ignore'});}catch{throw new Error('DURABLE_SOURCE_NOT_ANCESTOR');}
  const previous={artifactId:L.successorCandidate?.artifactId,sourceHead:L.successorCandidate?.sourceHead},ts=bump(),packageRevision=L.productionReopeningPackage.revision;
  const candidate={status:'CERTIFIED_SOURCE_ONLY_TRANSVERSAL_SOURCE_ACCEPTANCE',artifactId:M.artifactId,artifactDigest:M.artifactDigest,sourceHead:M.sourceHead,zipSha256:M.zipSha256,manifestSha256:M.manifestSha256,fileCount:M.fileCount,runtimeAuthorized:false,rebuildAllowed:false};
  const authMaterial={gateId:L.gateId,gateContractVersion:'2.2.0',candidateArtifactId:M.artifactId,candidateArtifactDigest:M.artifactDigest,candidateSourceHead:M.sourceHead,ledgerRevision:L.revision,packageRevision,executionProfile:profile};
  const authDigest=sha(JSON.stringify(authMaterial));
  L.successorCandidate=candidate;
  L.activeState={...L.activeState,phase:'MACRO2_TRANSVERSAL_SOURCE_ACCEPTANCE_PASS_AWAITING_FRESH_F2_AUTHORIZATION',status:'TRANSVERSAL_SOURCE_ACCEPTANCE_PASS',rootCauseStatus:'FUNCTIONAL_DEFECT_VISIBLE_VALUE_READMODEL_FAMILY_FIXED_SOURCE_ONLY',productFrozen:true,dataFrozen:true,runtimeAuthorized:false,runtimeReplayAllowed:false,deployAuthorized:false,productionAuthorized:false};
  L.candidateBoundary={...(L.candidateBoundary||{}),priorCertifiedArtifactId:previous.artifactId,priorCertifiedSourceHead:previous.sourceHead,status:'MACRO3_FRESH_AUTHORIZATION_BOUNDARY_PREPARED',successorArtifactId:M.artifactId,successorSourceHead:M.sourceHead,historicalRuntimeReusable:false};
  L.macro2Closure={status:'TRANSVERSAL_SOURCE_ACCEPTANCE_PASS',closedBy:'CONTROL_PLANE_EVIDENCE_RECONCILE',runId:M.runId,sourceHead:M.sourceHead,candidateArtifactId:M.artifactId,artifactDigest:M.artifactDigest,evidencePath:metadataPath,checksPassed:107,deltaCount:9,fileCount:194,unchangedFileCount:185,closedAtUtc:ts};
  L.continuityControl={...(L.continuityControl||{}),status:'CONTROL_PLANE_DEFINITIVE_PASS',classification:'PIPELINE_MECHANISM_FAILURE_RESOLVED',secondaryClassification:'DOCUMENTATION_STATE_DRIFT_RESOLVED',physicalSingleWriterEnforced:true,terminalReducerGeneric:true,stopRetryMechanicallyEnforced:true,evidenceFreshnessValidated:true,canonicalityConvergenceVersion:'v1-20260822',latestDurableEvidence:{type:'MACRO2_CANDIDATE_ARTIFACT',path:metadataPath,runId:M.runId,artifactId:M.artifactId,sourceHead:M.sourceHead,artifactDigest:M.artifactDigest,reducedAtLedgerRevision:L.revision}};
  L.authorizationBoundary={...(L.authorizationBoundary||{}),activeRuntimeAuthorization:false,freshAuthorizationRequired:true,nextRuntimeMaterializationAllowed:false,newRuntimeRequestAllowed:false,boundaryPrepared:true,currentBoundaryStatus:'PREPARED_SOURCE_ONLY_AWAITING_EXPLICIT_USER_AUTHORIZATION',preparedAuthorizationIdentityDigest:authDigest,activeRequestPath:null,authorizationRecordPath:null,runtimeAttemptAccepted:false,runtimeRunId:null};
  L.productionReopeningPackage={...(L.productionReopeningPackage||{}),status:'CLOSED_PASS',revision:packageRevision,firstIncompleteStep:'F2-RUNTIME-AUTHORIZATION',nextActionExact:'AWAIT_EXPLICIT_F2_RUNTIME_AUTHORIZATION_ONE_SHOT',runtimeAllowed:false,authorizationAllowed:true,requestMaterializationAllowed:false};
  L.nextAction={id:'AWAIT_EXPLICIT_F2_RUNTIME_AUTHORIZATION_ONE_SHOT',description:'Await one fresh explicit F2 runtime authorization bound to the certified Macro-2 candidate. No request is materialized yet.',runtimeAllowed:false};
  L.lanes={A_frontend_ux_academia:'MACRO2_TRANSVERSAL_SOURCE_ACCEPTANCE_CLOSED',B_backend_security_gates:'AWAITING_FRESH_F2_RUNTIME_AUTHORIZATION',C_real_data_migration:'UNCHANGED_FROZEN'};
  L.progress={...L.progress,productionRouteProgressPct:75,programProgressPct:25,f2TerminalPass:false,progressMayIncreaseDuringHardening:false};
  L.history={...(L.history||{}),latestMacro2SourceOnly:{runId:M.runId,conclusion:'SOURCE_ACCEPTANCE_PASS_PROMOTION_MECHANISM_RECONCILED',candidateArtifactId:M.artifactId,candidateSourceHead:M.sourceHead,artifactDigest:M.artifactDigest,fileCount:194,deltaCount:9,unchangedFileCount:185,replayAllowed:false}};
  W(P.ledger,L);project();
  out={ok:true,status:'CONTROL_PLANE_EVIDENCE_RECONCILED_AND_MACRO2_PROMOTED',ledgerRevision:L.revision,packageRevision,candidateArtifactId:M.artifactId,candidateSourceHead:M.sourceHead,authorizationIdentityDigest:authDigest,progress:75,runtimeAllowed:false};

}else if(transition==='F2_RUNTIME_AUTHORIZATION_PERSIST'){
  if(authIdentity!==L.authorizationBoundary?.preparedAuthorizationIdentityDigest||!/^[a-f0-9]{64}$/.test(authIdentity))throw new Error('AUTHORIZATION_IDENTITY_MISMATCH');
  if(!L.productionReopeningPackage?.authorizationAllowed)throw new Error('AUTHORIZATION_NOT_ALLOWED');
  if(L.authorizationBoundary?.activeRuntimeAuthorization||L.authorizationBoundary?.activeRequestPath||L.authorizationBoundary?.runtimeAttemptAccepted)throw new Error('AUTHORIZATION_BOUNDARY_NOT_INERT');
  const authPath=`.github/orbit360-authorizations/f2-productive-acceptance-runtime-browser-readonly-auth-${authIdentity.slice(0,12)}-v20260820.json`;
  if(fs.existsSync(A(authPath)))throw new Error('AUTHORIZATION_RECORD_ALREADY_EXISTS');
  const ts=bump();
  W(authPath,{schemaVersion:'orbit360-f2-runtime-authorization-v3',status:'PERSISTED_SOURCE_ONLY_AWAITING_REQUEST_MATERIALIZATION',approved:true,authorizationIdentityDigest:authIdentity,gateId:L.gateId,gateContractVersion:'2.2.0',branch:L.branch,pullRequest:L.pullRequest,authorizedAt:ts,allowedExecutions:1,consumed:false,authorizationFrozen:true,replayAllowed:false,historical:false,runtimeAttemptAccepted:false,runtimeAttemptCount:0,candidateArtifactId:L.successorCandidate.artifactId,candidateSourceHead:L.successorCandidate.sourceHead,candidateArtifactDigest:L.successorCandidate.artifactDigest,scopeAuthorized:profile.capabilities,containsPII:false,containsSecrets:false});
  L.authorizationBoundary.activeRuntimeAuthorization=true;
  L.authorizationBoundary.freshAuthorizationRequired=false;
  L.authorizationBoundary.authorizationRecordPath=authPath;
  L.authorizationBoundary.runtimeAttemptAccepted=false;
  L.authorizationBoundary.runtimeRunId=null;
  L.authorizationBoundary.currentBoundaryStatus='AUTHORIZED_SOURCE_ONLY_AWAITING_REQUEST_MATERIALIZATION';
  L.productionReopeningPackage.authorizationAllowed=false;
  L.productionReopeningPackage.requestMaterializationAllowed=true;
  L.productionReopeningPackage.firstIncompleteStep='F2-RUNTIME-REQUEST-MATERIALIZATION';
  L.productionReopeningPackage.nextActionExact='MATERIALIZE_SINGLE_F2_RUNTIME_REQUEST_SOURCE_ONLY';
  L.nextAction={id:L.productionReopeningPackage.nextActionExact,description:'Materialize exactly one immutable F2 runtime request.',runtimeAllowed:false};
  L.activeState.phase='F2_RUNTIME_AUTHORIZATION_PERSISTED_AWAITING_REQUEST_MATERIALIZATION';
  L.activeState.status='F2_RUNTIME_AUTHORIZATION_PERSISTED_SOURCE_ONLY';
  W(P.ledger,L);project();
  out={ok:true,status:'ORBIT360_F2_RUNTIME_AUTHORIZATION_PERSISTED_SOURCE_ONLY',authorizationRecordPath:authPath,ledgerRevision:L.revision,packageRevision:L.productionReopeningPackage.revision};

}else if(transition==='F2_RUNTIME_REQUEST_MATERIALIZE'){
  if(authIdentity!==L.authorizationBoundary?.preparedAuthorizationIdentityDigest||!/^[a-f0-9]{64}$/.test(authIdentity))throw new Error('AUTHORIZATION_IDENTITY_MISMATCH');
  if(!/^[a-f0-9]{40}$/.test(parentHead))throw new Error('PARENT_HEAD_REQUIRED');
  const authPath=L.authorizationBoundary?.authorizationRecordPath;
  if(!authPath||!fs.existsSync(A(authPath))||L.authorizationBoundary?.activeRequestPath||L.authorizationBoundary?.runtimeAttemptAccepted)throw new Error('BOUNDARY_NOT_READY_FOR_REQUEST');
  const auth=J(authPath);
  if(auth.consumed||auth.historical||auth.allowedExecutions!==1||auth.runtimeAttemptAccepted!==false)throw new Error('AUTHORIZATION_NOT_ACTIVE');
  const requestPath=`.github/orbit360-requests/f2-productive-acceptance-runtime-browser-readonly-successor-${authIdentity.slice(0,12)}-v20260820.json`;
  if(fs.existsSync(A(requestPath)))throw new Error('REQUEST_ALREADY_EXISTS');
  const ts=bump();
  W(requestPath,{schemaVersion:'orbit360-f2-productive-acceptance-runtime-browser-readonly-request-v3',requestId:`F2-${authIdentity.slice(0,12)}`,status:'MATERIALIZED_SOURCE_ONLY_AWAITING_PREFLIGHT',approved:true,allowedExecutions:1,consumed:false,authorizationFrozen:true,replayAllowed:false,historical:false,runtimeAttemptAccepted:false,runtimeAttemptCount:0,branch:L.branch,pullRequest:L.pullRequest,parentHead,candidateArtifactId:L.successorCandidate.artifactId,candidateSourceHead:L.successorCandidate.sourceHead,candidateArtifactDigest:L.successorCandidate.artifactDigest,authorizationRecordPath:authPath,authorizationIdentityDigest:authIdentity,materializedAt:ts,containsPII:false,containsSecrets:false});
  L.authorizationBoundary.activeRequestPath=requestPath;
  L.authorizationBoundary.nextRuntimeMaterializationAllowed=false;
  L.authorizationBoundary.newRuntimeRequestAllowed=false;
  L.authorizationBoundary.runtimeAttemptAccepted=false;
  L.authorizationBoundary.currentBoundaryStatus='REQUEST_MATERIALIZED_SOURCE_ONLY_AWAITING_PREFLIGHT';
  L.productionReopeningPackage.requestMaterializationAllowed=false;
  L.productionReopeningPackage.firstIncompleteStep='F2-RUNTIME-ATTEMPT-ACCEPT';
  L.productionReopeningPackage.nextActionExact='ACCEPT_SINGLE_F2_RUNTIME_ATTEMPT';
  L.nextAction={id:L.productionReopeningPackage.nextActionExact,description:'Atomically accept the single F2 runtime attempt before preflight. Replay remains forbidden.',runtimeAllowed:false};
  L.activeState.phase='F2_RUNTIME_REQUEST_MATERIALIZED_AWAITING_ATTEMPT_ACCEPT';
  L.activeState.status='F2_RUNTIME_REQUEST_MATERIALIZED_SOURCE_ONLY';
  W(P.ledger,L);project();
  out={ok:true,status:'ORBIT360_F2_RUNTIME_REQUEST_MATERIALIZED_SOURCE_ONLY',requestPath,ledgerRevision:L.revision,packageRevision:L.productionReopeningPackage.revision};

}else if(transition==='F2_RUNTIME_ATTEMPT_ACCEPT'){
  if(!/^\d+$/.test(runtimeRunId))throw new Error('RUNTIME_RUN_ID_REQUIRED');
  const authPath=L.authorizationBoundary?.authorizationRecordPath,requestPath=L.authorizationBoundary?.activeRequestPath;
  if(!authPath||!requestPath||!fs.existsSync(A(authPath))||!fs.existsSync(A(requestPath)))throw new Error('ACTIVE_AUTH_REQUEST_REQUIRED');
  if(L.authorizationBoundary?.runtimeAttemptAccepted)throw new Error('RUNTIME_ATTEMPT_ALREADY_ACCEPTED_STOP_RETRY');
  const auth=J(authPath),req=J(requestPath);
  if(auth.consumed||req.consumed||auth.historical||req.historical||auth.allowedExecutions!==1||req.allowedExecutions!==1||auth.runtimeAttemptAccepted!==false||req.runtimeAttemptAccepted!==false)throw new Error('AUTH_REQUEST_NOT_AVAILABLE_FOR_ONE_SHOT_ACCEPT');
  const ts=bump(),run=Number(runtimeRunId);
  for(const [p,x,isReq] of [[authPath,auth,false],[requestPath,req,true]]){
    x.allowedExecutions=0;
    x.runtimeAttemptAccepted=true;
    x.runtimeAttemptCount=1;
    x.runtimeRunId=run;
    x.runtimeAttemptAcceptedAt=ts;
    x.status=isReq?'RUNTIME_ATTEMPT_ACCEPTED_PREFLIGHT_PENDING':'RUNTIME_ATTEMPT_ACCEPTED_ONE_SHOT';
    W(p,x);
  }
  L.authorizationBoundary.runtimeAttemptAccepted=true;
  L.authorizationBoundary.runtimeRunId=run;
  L.authorizationBoundary.currentBoundaryStatus='RUNTIME_ATTEMPT_ACCEPTED_ONE_SHOT_PREFLIGHT_PENDING';
  L.activeState.phase='F2_RUNTIME_ATTEMPT_ACCEPTED_PREFLIGHT_PENDING';
  L.activeState.status='F2_RUNTIME_ATTEMPT_ACCEPTED_ONE_SHOT';
  L.activeState.runtimeAuthorized=false;
  L.activeState.runtimeReplayAllowed=false;
  L.productionReopeningPackage.firstIncompleteStep='F2-RUNTIME-PREFLIGHT';
  L.productionReopeningPackage.nextActionExact='RUN_F2_SOURCE_AND_RUNTIME_PREFLIGHT_FAIL_CLOSED';
  L.productionReopeningPackage.runtimeAllowed=false;
  L.nextAction={id:L.productionReopeningPackage.nextActionExact,description:'Execute the already accepted one-shot F2 preflight. A second runtime attempt is mechanically forbidden.',runtimeAllowed:false};
  W(P.ledger,L);project();
  out={ok:true,status:'ORBIT360_F2_RUNTIME_ATTEMPT_ACCEPTED_ONE_SHOT',runtimeRunId:run,requestPath,ledgerRevision:L.revision,packageRevision:L.productionReopeningPackage.revision,replayAllowed:false};

}else if(transition==='F2_RUNTIME_TERMINAL_RECONCILE_GENERIC'){
  if(!terminalEvidence||!fs.existsSync(A(terminalEvidence)))throw new Error('TERMINAL_EVIDENCE_REQUIRED');
  const Tm=J(terminalEvidence),classification=Tm.ok===true?'PASS':String(Tm.classification||'');
  const allowed=new Set(['PASS','FUNCTIONAL_DEFECT','VALIDATOR_STALE','DATA_CONTRACT_FAILURE','ENVIRONMENT_FAILURE','PIPELINE_MECHANISM_FAILURE','SECURITY_FAILURE']);
  if(!allowed.has(classification))throw new Error('TERMINAL_CLASSIFICATION_UNSUPPORTED');
  if(Number(Tm.firestoreWrites)!==0||Number(Tm.authWrites)!==0||Number(Tm.operationalWrites)!==0||Tm.deployExecuted!==false||Tm.productionHostingTouched!==false)throw new Error('TERMINAL_FORBIDDEN_SIDE_EFFECT');
  const authPath=L.authorizationBoundary?.authorizationRecordPath,requestPath=L.authorizationBoundary?.activeRequestPath;
  if(!authPath||!requestPath||!fs.existsSync(A(authPath))||!fs.existsSync(A(requestPath)))throw new Error('ACTIVE_AUTH_REQUEST_REQUIRED');
  const auth=J(authPath),req=J(requestPath),run=Number(Tm.runId);
  if(!Number.isInteger(run)||run<=0||Number(L.authorizationBoundary?.runtimeRunId)!==run||Number(auth.runtimeRunId)!==run||Number(req.runtimeRunId)!==run)throw new Error('TERMINAL_RUNTIME_RUN_ID_MISMATCH');
  if(auth.consumed||req.consumed||auth.historical||req.historical||auth.allowedExecutions!==0||req.allowedExecutions!==0||auth.runtimeAttemptAccepted!==true||req.runtimeAttemptAccepted!==true)throw new Error('AUTH_REQUEST_NOT_ACCEPTED_ONE_SHOT');
  const ts=bump();
  for(const [p,x] of [[authPath,auth],[requestPath,req]]){
    x.status=classification==='PASS'?'CONSUMED_PASS':`CONSUMED_FAIL_${classification}`;
    x.consumed=true;x.historical=true;x.replayAllowed=false;x.consumedAt=ts;x.terminalEvidencePath=terminalEvidence;
    W(p,x);
  }
  L.authorizationBoundary={...L.authorizationBoundary,activeRuntimeAuthorization:false,freshAuthorizationRequired:classification!=='PASS',nextRuntimeMaterializationAllowed:false,newRuntimeRequestAllowed:false,activeRequestPath:null,authorizationRecordPath:null,runtimeAttemptAccepted:false,runtimeRunId:null,currentBoundaryStatus:classification==='PASS'?'CONSUMED_PASS_AWAITING_GO_LIVE':'CONSUMED_FAIL_AWAITING_SOURCE_ONLY_ROOT_CAUSE'};
  L.history={...(L.history||{}),latestSealedConsumedRuntime:{requestPath,authorizationPath:authPath,runId:run,conclusion:classification==='PASS'?'success':'failure',observedClassification:classification,observedFailureCode:String(Tm.failureCode||Tm.error||classification),allowedExecutions:0,consumed:true,replayAllowed:false,firestoreWrites:0,authWrites:0,operationalWrites:0,terminalEvidencePath}};
  if(classification==='PASS'){
    L.activeState.phase='F2_TERMINAL_PASS_AWAITING_AUTHORIZED_GO_LIVE';L.activeState.status='F2_TERMINAL_PASS';L.activeState.runtimeAuthorized=false;L.activeState.runtimeReplayAllowed=false;
    L.progress.productionRouteProgressPct=85;L.progress.f2TerminalPass=true;
    L.productionReopeningPackage.firstIncompleteStep='MACRO4-GO-LIVE-AUTHORIZATION';L.productionReopeningPackage.nextActionExact='AWAIT_EXPLICIT_GO_LIVE_AUTHORIZATION';L.productionReopeningPackage.runtimeAllowed=false;
    L.nextAction={id:L.productionReopeningPackage.nextActionExact,description:'Await separate explicit go-live authorization.',runtimeAllowed:false};
  }else{
    L.activeState.phase='F2_TERMINAL_FAIL_AWAITING_SOURCE_ONLY_ROOT_CAUSE';L.activeState.status='F2_TERMINAL_RECONCILED_NO_REPLAY';L.activeState.runtimeAuthorized=false;L.activeState.runtimeReplayAllowed=false;
    L.productionReopeningPackage.firstIncompleteStep='F2-SOURCE-ROOT-CAUSE';L.productionReopeningPackage.nextActionExact='DIAGNOSE_ROOT_CAUSE_BEFORE_ANY_FRESH_AUTHORIZATION';L.productionReopeningPackage.runtimeAllowed=false;
    L.nextAction={id:L.productionReopeningPackage.nextActionExact,description:'Diagnose source-only root cause. No replay.',runtimeAllowed:false};
  }
  W(P.ledger,L);project();
  out={ok:true,status:'F2_RUNTIME_TERMINAL_RECONCILED_GENERIC',classification,ledgerRevision:L.revision,packageRevision:L.productionReopeningPackage.revision,replayAllowed:false};

}else throw new Error(`UNKNOWN_TRANSITION:${transition}`);

if(T(P.ledger)===before)throw new Error('TRANSITION_DID_NOT_MUTATE_LEDGER');
console.log(JSON.stringify({...out,transition,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false},null,2));
