#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const args=process.argv.slice(2);
const v=f=>{const i=args.indexOf(f);return i>=0?args[i+1]:'';};
const transition=v('--transition');
const expectedRevision=Number(v('--expected-revision'));
const expectedPackageRevision=Number(v('--expected-package-revision'));
const controlPlaneEvidence=v('--control-plane-evidence');
const DELEGATE='tools/orbit360-continuity-transition-owner-v20260820.mjs';
const P={
  ledger:'orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json',
  authority:'tools/orbit360-gate-contract-f2-productive-acceptance-v20260820.json',
  projection:'tools/orbit360-continuity-projection-atomic-v20260820.mjs',
  noRewrite:'tools/orbit360-control-plane-no-source-rewrite-guard-v20260824.mjs',
  terminalTruth:'tools/orbit360-terminal-truth-invariant-v20260824.mjs'
};
const A=p=>path.join(ROOT,p);
const J=p=>JSON.parse(fs.readFileSync(A(p),'utf8').replace(/^\uFEFF/,''));
const W=(p,x)=>{fs.mkdirSync(path.dirname(A(p)),{recursive:true});fs.writeFileSync(A(p),JSON.stringify(x,null,2)+'\n','utf8');};
const sha=s=>crypto.createHash('sha256').update(String(s)).digest('hex');

if(transition!=='CONTROL_PLANE_HARDENING_CLOSE'){
  const r=spawnSync(process.execPath,[A(DELEGATE),...args],{cwd:ROOT,stdio:'inherit',env:process.env});
  process.exit(r.status==null?41:r.status);
}

if(!Number.isInteger(expectedRevision)||!Number.isInteger(expectedPackageRevision))throw new Error('TRANSITION_PRECONDITION_REQUIRED');
for(const p of Object.values(P))if(!fs.existsSync(A(p)))throw new Error(`PIPELINE_MECHANISM_FAILURE:CONTROL_PLANE_CLOSE_DEPENDENCY_MISSING:${p}`);
if(!controlPlaneEvidence||!fs.existsSync(A(controlPlaneEvidence)))throw new Error('CONTROL_PLANE_HANDSHAKE_EVIDENCE_REQUIRED');
const L=J(P.ledger),G=J(P.authority),E=J(controlPlaneEvidence);
if(Number(L.revision)!==expectedRevision)throw new Error(`EXPECTED_REVISION_MISMATCH:${expectedRevision}:${L.revision}`);
if(Number(L.productionReopeningPackage?.revision)!==expectedPackageRevision)throw new Error(`EXPECTED_PACKAGE_REVISION_MISMATCH:${expectedPackageRevision}:${L.productionReopeningPackage?.revision}`);
const hardeningOpen=L.activeState?.phase==='MACRO1_CONTROL_PLANE_TRUTH_HARDENING_SOURCE_ONLY'&&L.activeState?.status==='CONTROL_PLANE_FALSE_PASS_INVALIDATED';
const hardeningClosed=L.activeState?.phase==='CONTROL_PLANE_DEFINITIVE_CAUSAL_PASS_AWAITING_F2_AUTHORIZATION'&&L.activeState?.status==='CONTROL_PLANE_DEFINITIVE_CAUSAL_PASS';
if(!hardeningOpen&&!hardeningClosed)throw new Error('CONTROL_PLANE_CLOSE_PHASE_INVALID');
if(L.activeState?.runtimeAuthorized!==false||L.activeState?.runtimeReplayAllowed!==false||L.authorizationBoundary?.activeRuntimeAuthorization!==false||L.authorizationBoundary?.activeRequestPath!=null||L.authorizationBoundary?.authorizationRecordPath!=null||(L.authorizationBoundary?.runtimeAttemptAccepted??false)!==false)throw new Error('CONTROL_PLANE_CLOSE_BOUNDARY_NOT_INERT');
if(Number(L.progress?.productionRouteProgressPct)!==75||L.progress?.f2TerminalPass!==false)throw new Error('CONTROL_PLANE_CLOSE_PROGRESS_INVALID');
if(E.ok!==true||E.status!=='CONTROL_PLANE_SELFTEST_HANDSHAKE_PASS'||E.classification!=='PASS'||E.controlPlaneSelftestPass!==true)throw new Error('CONTROL_PLANE_HANDSHAKE_EVIDENCE_INVALID');
if(Number(E.candidateArtifactId)!==Number(L.successorCandidate?.artifactId)||E.candidateSourceHead!==L.successorCandidate?.sourceHead)throw new Error('CONTROL_PLANE_HANDSHAKE_CANDIDATE_MISMATCH');
if(E.authorizationMaterialized!==false||E.requestMaterialized!==false||E.runtimeExecuted!==false||E.browserExecuted!==false||E.secretAccess!==false||E.firestoreRead!==false||Number(E.firestoreWrites)!==0||Number(E.authWrites)!==0||Number(E.operationalWrites)!==0||E.deployExecuted!==false||E.productionTouched!==false)throw new Error('CONTROL_PLANE_HANDSHAKE_SIDE_EFFECT_SIGNAL');
if(hardeningOpen){
  if(Number(E.expectedLedgerRevision)!==expectedRevision||Number(E.expectedPackageRevision)!==expectedPackageRevision)throw new Error('CONTROL_PLANE_HANDSHAKE_REVISION_MISMATCH');
}else{
  if(String(L.continuityControl?.workflowHandshakeEvidence||'')!==controlPlaneEvidence)throw new Error('CONTROL_PLANE_CLOSED_HANDSHAKE_PATH_MISMATCH');
  if(Number(L.continuityControl?.workflowHandshakeRunId||0)!==Number(E.runId||0)||Number(L.continuityControl?.workflowHandshakeJobId||0)!==Number(E.jobId||0))throw new Error('CONTROL_PLANE_CLOSED_HANDSHAKE_IDENTITY_MISMATCH');
  if(L.nextAction?.id!=='AWAIT_EXPLICIT_F2_RUNTIME_AUTHORIZATION_ONE_SHOT')throw new Error('CONTROL_PLANE_CLOSED_NEXT_ACTION_DRIFT');
}
try{execFileSync('git',['merge-base','--is-ancestor',String(E.canonicalBaseHead),'HEAD'],{cwd:ROOT,stdio:'ignore'});}catch{throw new Error('CONTROL_PLANE_HANDSHAKE_BASE_NOT_ANCESTOR');}
execFileSync(process.execPath,[A(P.noRewrite)],{cwd:ROOT,stdio:'ignore'});
execFileSync(process.execPath,[A(P.terminalTruth)],{cwd:ROOT,stdio:'ignore'});

if(hardeningClosed){
  execFileSync(process.execPath,[A(P.projection),'--expected-revision',String(L.revision)],{cwd:ROOT,stdio:'inherit'});
  console.log(JSON.stringify({ok:true,status:'CONTROL_PLANE_HARDENING_CLOSED_CAUSAL_PASS',transition,ledgerRevision:L.revision,packageRevision:L.productionReopeningPackage.revision,authorizationIdentityDigest:L.authorizationBoundary?.preparedAuthorizationIdentityDigest||null,candidateArtifactId:L.successorCandidate.artifactId,candidateSourceHead:L.successorCandidate.sourceHead,progress:75,closedStateReprojection:true,authorizationMaterialized:false,requestMaterialized:false,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false},null,2));
  process.exit(0);
}

const ts=new Date().toISOString();
L.revision+=1;
L.productionReopeningPackage.revision+=1;
L.updatedAtUtc=ts;
const profile={phase:'F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY',capabilities:{secrets:true,firestoreRead:true,customTokenMint:true,browser:true,runtime:true,writes:false,firestoreWrites:false,authWrites:false,membershipWrites:false,dataWrites:false,operationalWrites:false,packageRebuild:false,deploy:false,publish:false,publication:false,production:false,main:false,merge:false}};
const authMaterial={gateId:L.gateId,gateContractVersion:String(G.gateContractVersion||'2.2.0'),candidateArtifactId:L.successorCandidate.artifactId,candidateArtifactDigest:L.successorCandidate.artifactDigest,candidateSourceHead:L.successorCandidate.sourceHead,ledgerRevision:L.revision,packageRevision:L.productionReopeningPackage.revision,executionProfile:profile};
const authDigest=sha(JSON.stringify(authMaterial));
L.activeState={...L.activeState,phase:'CONTROL_PLANE_DEFINITIVE_CAUSAL_PASS_AWAITING_F2_AUTHORIZATION',status:'CONTROL_PLANE_DEFINITIVE_CAUSAL_PASS',rootCauseStatus:'PIPELINE_MECHANISM_FAILURE_AND_VALIDATOR_STALE_ROOT_CAUSES_CLOSED_SOURCE_ONLY',productFrozen:true,dataFrozen:true,runtimeAuthorized:false,runtimeReplayAllowed:false,deployAuthorized:false,productionAuthorized:false};
L.continuityControl={...L.continuityControl,status:'CONTROL_PLANE_DEFINITIVE_CAUSAL_PASS',classification:'PIPELINE_MECHANISM_FAILURE_RESOLVED',secondaryClassification:'VALIDATOR_STALE_RESOLVED',canonicalityConvergenceVersion:'v2-20260824-causal',evidenceFreshnessValidated:true,physicalSingleWriterEnforced:true,terminalReducerGeneric:true,terminalReducerTruthContractValidated:true,stopRetryMechanicallyEnforced:true,projectionWorkflowTemporarilyFailClosed:false,compositeInvariantRequiredBeforeClosure:true,compositeInvariantStatus:'CONTROL_PLANE_DEFINITIVE_CAUSAL_PASS',documentationDiscoveryGateRequired:true,sourceRewriteGuardEnforced:true,workflowHandshakeValidated:true,workflowHandshakeRunId:Number(E.runId),workflowHandshakeJobId:Number(E.jobId),workflowHandshakePullRequest:Number(E.technicalPullRequest),workflowHandshakeEvidence:controlPlaneEvidence};
L.candidateBoundary={...(L.candidateBoundary||{}),status:'MACRO3_FRESH_AUTHORIZATION_BOUNDARY_PREPARED',successorArtifactId:L.successorCandidate.artifactId,successorSourceHead:L.successorCandidate.sourceHead,historicalRuntimeReusable:false};
L.authorizationBoundary={...L.authorizationBoundary,activeRuntimeAuthorization:false,freshAuthorizationRequired:true,authorizationBlockedByHardeningPackage:false,authorizationCarryForwardForbidden:true,nextRuntimeMaterializationAllowed:false,newRuntimeRequestAllowed:false,boundaryPrepared:true,currentBoundaryStatus:'PREPARED_SOURCE_ONLY_AWAITING_EXPLICIT_USER_AUTHORIZATION',preparedAuthorizationIdentityDigest:authDigest,activeRequestPath:null,authorizationRecordPath:null,runtimeAttemptAccepted:false,runtimeRunId:null};
L.productionReopeningPackage={...L.productionReopeningPackage,status:'CLOSED_PASS',revision:L.productionReopeningPackage.revision,firstIncompleteStep:'F2-RUNTIME-AUTHORIZATION',nextActionExact:'AWAIT_EXPLICIT_F2_RUNTIME_AUTHORIZATION_ONE_SHOT',runtimeAllowed:false,authorizationAllowed:true,requestMaterializationAllowed:false};
L.nextAction={id:'AWAIT_EXPLICIT_F2_RUNTIME_AUTHORIZATION_ONE_SHOT',description:'Await one fresh explicit F2 runtime authorization bound to the certified candidate after causal control-plane closure.',runtimeAllowed:false};
L.lanes={A_frontend_ux_academia:'MACRO2_TRANSVERSAL_SOURCE_ACCEPTANCE_CLOSED',B_backend_security_gates:'CONTROL_PLANE_CAUSAL_PASS_AWAITING_FRESH_F2_AUTHORIZATION',C_real_data_migration:'UNCHANGED_FROZEN'};
L.progress={...L.progress,productionRouteProgressPct:75,programProgressPct:25,f2TerminalPass:false,progressMayIncreaseDuringHardening:false};
L.history={...(L.history||{}),latestControlPlaneHandshake:{runId:Number(E.runId),jobId:Number(E.jobId),technicalPullRequest:Number(E.technicalPullRequest),conclusion:'success',status:E.status,evidencePath:controlPlaneEvidence,canonicalBaseHead:E.canonicalBaseHead,intentHead:E.intentHead,candidateArtifactId:E.candidateArtifactId,candidateSourceHead:E.candidateSourceHead,sourceOnly:true,authorizationMaterialized:false,requestMaterialized:false,runtimeExecuted:false,browserExecuted:false,replayAllowed:false,closedAtUtc:ts}};
W(P.ledger,L);
execFileSync(process.execPath,[A(P.projection),'--expected-revision',String(L.revision)],{cwd:ROOT,stdio:'inherit'});
console.log(JSON.stringify({ok:true,status:'CONTROL_PLANE_HARDENING_CLOSED_CAUSAL_PASS',transition,ledgerRevision:L.revision,packageRevision:L.productionReopeningPackage.revision,authorizationIdentityDigest:authDigest,candidateArtifactId:L.successorCandidate.artifactId,candidateSourceHead:L.successorCandidate.sourceHead,progress:75,closedStateReprojection:false,authorizationMaterialized:false,requestMaterialized:false,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false},null,2));
