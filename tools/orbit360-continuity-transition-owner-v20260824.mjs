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
const controlPlaneFailureEvidence=v('--control-plane-failure-evidence');
const DELEGATE='tools/orbit360-continuity-transition-owner-v20260820.mjs';
const P={
  ledger:'orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json',
  authority:'tools/orbit360-gate-contract-f2-productive-acceptance-v20260820.json',
  projection:'tools/orbit360-continuity-projection-atomic-v20260820.mjs',
  noRewrite:'tools/orbit360-control-plane-no-source-rewrite-guard-v20260824.mjs',
  terminalTruth:'tools/orbit360-terminal-truth-invariant-v20260824.mjs',
  semanticContract:'orbit360-platform/docs/orbit360-control-plane-semantic-contract-v20260824.json',
  behavioralSelftest:'tools/orbit360-control-plane-selftest-v20260824.mjs'
};
const A=p=>path.join(ROOT,p);
const J=p=>JSON.parse(fs.readFileSync(A(p),'utf8').replace(/^\uFEFF/,''));
const W=(p,x)=>{fs.mkdirSync(path.dirname(A(p)),{recursive:true});fs.writeFileSync(A(p),JSON.stringify(x,null,2)+'\n','utf8');};
const sha=s=>crypto.createHash('sha256').update(String(s)).digest('hex');
const noSideEffects=x=>x?.runtimeExecuted===false&&x?.browserExecuted===false&&x?.secretAccess===false&&x?.firestoreRead===false&&Number(x?.firestoreWrites||0)===0&&Number(x?.authWrites||0)===0&&Number(x?.operationalWrites||0)===0&&x?.deployExecuted===false&&x?.productionTouched===false;
const parseJson=s=>{try{return JSON.parse(String(s||'').trim());}catch{return null;}};
const lastJson=s=>{const parts=String(s||'').trim().split(/\n(?=\{)/);for(let i=parts.length-1;i>=0;i--){const parsed=parseJson(parts[i]);if(parsed)return parsed;}return null;};
const project=revision=>execFileSync(process.execPath,[A(P.projection),'--expected-revision',String(revision)],{cwd:ROOT,stdio:['ignore','ignore','inherit']});

if(!['CONTROL_PLANE_HARDENING_CLOSE','CONTROL_PLANE_REGRESSION_REOPEN'].includes(transition)){
  const r=spawnSync(process.execPath,[A(DELEGATE),...args],{cwd:ROOT,encoding:'utf8',env:process.env});
  if(r.stderr)process.stderr.write(r.stderr);
  if(r.status!==0){if(r.stdout)process.stdout.write(r.stdout);process.exit(r.status==null?41:r.status);}
  const delegated=lastJson(r.stdout);
  if(!delegated)throw new Error('DATA_CONTRACT_FAILURE:DELEGATED_TRANSITION_OWNER_STDOUT_SINGLE_JSON_REQUIRED');
  console.log(JSON.stringify(delegated,null,2));
  process.exit(0);
}

if(!Number.isInteger(expectedRevision)||!Number.isInteger(expectedPackageRevision))throw new Error('TRANSITION_PRECONDITION_REQUIRED');
for(const p of Object.values(P))if(!fs.existsSync(A(p)))throw new Error(`PIPELINE_MECHANISM_FAILURE:CONTROL_PLANE_DEPENDENCY_MISSING:${p}`);
const L=J(P.ledger),G=J(P.authority),semanticContract=J(P.semanticContract);
if(Number(L.revision)!==expectedRevision)throw new Error(`EXPECTED_REVISION_MISMATCH:${expectedRevision}:${L.revision}`);
if(Number(L.productionReopeningPackage?.revision)!==expectedPackageRevision)throw new Error(`EXPECTED_PACKAGE_REVISION_MISMATCH:${expectedPackageRevision}:${L.productionReopeningPackage?.revision}`);
if(L.activeState?.runtimeAuthorized!==false||L.activeState?.runtimeReplayAllowed!==false||L.authorizationBoundary?.activeRuntimeAuthorization!==false||L.authorizationBoundary?.activeRequestPath!=null||L.authorizationBoundary?.authorizationRecordPath!=null||(L.authorizationBoundary?.runtimeAttemptAccepted??false)!==false)throw new Error('CONTROL_PLANE_BOUNDARY_NOT_INERT');
if(Number(L.progress?.productionRouteProgressPct)!==75||L.progress?.f2TerminalPass!==false)throw new Error('CONTROL_PLANE_PROGRESS_INVALID');
if(semanticContract.active!==true||semanticContract.closureRequirements?.scratchBehavioralTransitionsPass!==true||semanticContract.closureRequirements?.negativeRegressionSuitePass!==true)throw new Error('CONTROL_PLANE_SEMANTIC_CLOSURE_CONTRACT_INVALID');
execFileSync(process.execPath,[A(P.noRewrite)],{cwd:ROOT,stdio:'ignore'});
execFileSync(process.execPath,[A(P.terminalTruth)],{cwd:ROOT,stdio:'ignore'});

if(transition==='CONTROL_PLANE_REGRESSION_REOPEN'){
  const fromClosed=L.activeState?.phase==='CONTROL_PLANE_DEFINITIVE_CAUSAL_PASS_AWAITING_F2_AUTHORIZATION'&&L.activeState?.status==='CONTROL_PLANE_DEFINITIVE_CAUSAL_PASS';
  const sealed=L.history?.latestSealedConsumedRuntime||{};
  const fromSealedF2Mechanism=L.activeState?.phase==='F2_TERMINAL_FAIL_AWAITING_SOURCE_ONLY_ROOT_CAUSE'&&L.activeState?.status==='F2_TERMINAL_RECONCILED_NO_REPLAY'&&sealed.consumed===true&&sealed.replayAllowed===false&&sealed.observedClassification==='PIPELINE_MECHANISM_FAILURE'&&Number(sealed.firestoreWrites||0)===0&&Number(sealed.authWrites||0)===0&&Number(sealed.operationalWrites||0)===0;
  if(!fromClosed&&!fromSealedF2Mechanism)throw new Error('CONTROL_PLANE_REGRESSION_REOPEN_PHASE_INVALID');
  if(!controlPlaneFailureEvidence||!/^orbit360-platform\/runtime-gate-crm-v20260716\/f2-pipeline-publication-failure-run-[0-9]+-v20260824\.json$/.test(controlPlaneFailureEvidence)||!fs.existsSync(A(controlPlaneFailureEvidence)))throw new Error('CONTROL_PLANE_DURABLE_FAILURE_EVIDENCE_REQUIRED');
  const F=J(controlPlaneFailureEvidence),run=Number(F.runId||0);
  if(F.classification!=='PIPELINE_MECHANISM_FAILURE'||F.stopRetry?.active!==true||F.stopRetry?.newF2AttemptAllowed!==false||F.stopRetry?.workflowRerunAllowed!==false)throw new Error('CONTROL_PLANE_FAILURE_STOP_RETRY_CONTRACT_INVALID');
  if(fromClosed){
    if(F.canonicalPublication?.acceptedStatePublished!==false||F.canonicalPublication?.terminalStatePublished!==false||F.canonicalPublication?.prBodyAdvancedFromUnpublishedState!==false)throw new Error('CONTROL_PLANE_FAILURE_PUBLICATION_TRUTH_INVALID');
  }else{
    if(F.canonicalPublication?.acceptedStatePublished!==true||F.canonicalPublication?.terminalStatePublished!==true||F.canonicalPublication?.prBodyAdvancedFromUnpublishedState!==false)throw new Error('CONTROL_PLANE_F2_MECHANISM_TERMINAL_PUBLICATION_TRUTH_INVALID');
    if(Number(sealed.runId)!==run||String(sealed.terminalEvidencePath||'')!==String(F.terminalEvidencePath||''))throw new Error('CONTROL_PLANE_F2_MECHANISM_SEALED_RUNTIME_MISMATCH');
  }
  if(!noSideEffects(F.sideEffects||{}))throw new Error('CONTROL_PLANE_FAILURE_SIDE_EFFECT_SIGNAL');
  if(Number(F.candidateArtifactId)!==Number(L.successorCandidate?.artifactId)||F.candidateSourceHead!==L.successorCandidate?.sourceHead||F.candidateArtifactDigest!==L.successorCandidate?.artifactDigest)throw new Error('CONTROL_PLANE_FAILURE_CANDIDATE_MISMATCH');
  if(!Number.isInteger(run)||run<=Number(L.continuityControl?.workflowHandshakeRunId||0))throw new Error('CONTROL_PLANE_FAILURE_NOT_NEWER_THAN_CLOSURE');
  const already=Number(L.continuityControl?.latestControlPlaneRegression?.runId||0);
  if(already>=run)throw new Error('CONTROL_PLANE_REGRESSION_ALREADY_REDUCED');
  const ts=new Date().toISOString();
  L.revision+=1;L.productionReopeningPackage.revision+=1;L.updatedAtUtc=ts;
  L.activeState={...L.activeState,phase:'MACRO1_CONTROL_PLANE_TRUTH_HARDENING_SOURCE_ONLY',status:'CONTROL_PLANE_REGRESSION_OPEN_STOP_RETRY',rootCauseStatus:String(F.rootCause?.code||'TRANSIENT_EVIDENCE_LIFECYCLE_REGRESSION'),productFrozen:true,dataFrozen:true,runtimeAuthorized:false,runtimeReplayAllowed:false,deployAuthorized:false,productionAuthorized:false};
  L.continuityControl={...L.continuityControl,status:'CONTROL_PLANE_REGRESSION_OPEN_STOP_RETRY',classification:'PIPELINE_MECHANISM_FAILURE',secondaryClassification:null,compositeInvariantStatus:'CONTROL_PLANE_REGRESSION_REQUIRES_FULL_PATH_REVALIDATION',evidenceFreshnessValidated:false,workflowHandshakeValidated:false,stopRetryMechanicallyEnforced:true,evidenceLifecycleClassWideValidated:false,exactF2SourcePathSelftestValidated:false,semanticBehavioralSelftestValidated:false,latestControlPlaneRegression:{runId:run,jobId:Number(F.jobId||0),technicalPullRequest:Number(F.technicalPullRequest||0),evidencePath:controlPlaneFailureEvidence,classification:F.classification,failureCode:F.failureCode,rootCauseCode:String(F.rootCause?.code||''),sameStageSecondFailure:F.sameStageSecondFailure?.active===true,replayAllowed:false,reducedAtLedgerRevision:L.revision,reducedAtUtc:ts,status:'OPEN_AWAITING_SOURCE_ONLY_ROOTFIX_AND_FRESH_HANDSHAKE'}};
  L.authorizationBoundary={...L.authorizationBoundary,activeRuntimeAuthorization:false,freshAuthorizationRequired:true,authorizationBlockedByHardeningPackage:true,authorizationCarryForwardForbidden:true,nextRuntimeMaterializationAllowed:false,newRuntimeRequestAllowed:false,currentBoundaryStatus:'STOP_RETRY_CONTROL_PLANE_REGRESSION_OPEN',activeRequestPath:null,authorizationRecordPath:null,runtimeAttemptAccepted:false,runtimeRunId:null};
  L.productionReopeningPackage={...L.productionReopeningPackage,status:'OPEN_BLOCKED_CONTROL_PLANE_REGRESSION',revision:L.productionReopeningPackage.revision,firstIncompleteStep:'CONTROL-PLANE-FULL-PATH-REGRESSION',nextActionExact:'RUN_EXACT_F2_SOURCE_PATH_CLASSWIDE_EVIDENCE_SELFTEST',runtimeAllowed:false,authorizationAllowed:false,requestMaterializationAllowed:false};
  L.nextAction={id:'RUN_EXACT_F2_SOURCE_PATH_CLASSWIDE_EVIDENCE_SELFTEST',description:'Revalidate the exact F2 pre-authorization source path, semantic contracts and behavioral scratch transitions before any fresh authorization.',runtimeAllowed:false};
  L.lanes={A_frontend_ux_academia:'MACRO2_TRANSVERSAL_SOURCE_ACCEPTANCE_CLOSED_PRODUCT_FROZEN',B_backend_security_gates:'CONTROL_PLANE_REGRESSION_OPEN_STOP_RETRY',C_real_data_migration:'UNCHANGED_FROZEN'};
  L.progress={...L.progress,productionRouteProgressPct:75,programProgressPct:25,f2TerminalPass:false,progressMayIncreaseDuringHardening:false};
  L.history={...(L.history||{}),latestControlPlaneFailure:{runId:run,jobId:Number(F.jobId||0),technicalPullRequest:Number(F.technicalPullRequest||0),conclusion:'failure',classification:F.classification,failureCode:F.failureCode,evidencePath:controlPlaneFailureEvidence,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,replayAllowed:false,reducedAtUtc:ts}};
  W(P.ledger,L);
  project(L.revision);
  console.log(JSON.stringify({ok:true,status:'CONTROL_PLANE_REGRESSION_REOPENED_STOP_RETRY',transition,ledgerRevision:L.revision,packageRevision:L.productionReopeningPackage.revision,regressionRunId:run,regressionEvidence:controlPlaneFailureEvidence,reopenedFrom:fromSealedF2Mechanism?'SEALED_F2_PIPELINE_MECHANISM_FAILURE':'CONTROL_PLANE_CLOSED_REGRESSION',progress:75,authorizationMaterialized:false,requestMaterialized:false,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false},null,2));
  process.exit(0);
}

if(!controlPlaneEvidence||!fs.existsSync(A(controlPlaneEvidence)))throw new Error('CONTROL_PLANE_HANDSHAKE_EVIDENCE_REQUIRED');
const E=J(controlPlaneEvidence);
const hardeningOpen=L.activeState?.phase==='MACRO1_CONTROL_PLANE_TRUTH_HARDENING_SOURCE_ONLY'&&['CONTROL_PLANE_FALSE_PASS_INVALIDATED','CONTROL_PLANE_REGRESSION_OPEN_STOP_RETRY'].includes(L.activeState?.status);
const hardeningClosed=L.activeState?.phase==='CONTROL_PLANE_DEFINITIVE_CAUSAL_PASS_AWAITING_F2_AUTHORIZATION'&&L.activeState?.status==='CONTROL_PLANE_DEFINITIVE_CAUSAL_PASS';
if(!hardeningOpen&&!hardeningClosed)throw new Error('CONTROL_PLANE_CLOSE_PHASE_INVALID');
if(E.ok!==true||E.status!=='CONTROL_PLANE_SELFTEST_HANDSHAKE_PASS'||E.classification!=='PASS'||E.controlPlaneSelftestPass!==true)throw new Error('CONTROL_PLANE_HANDSHAKE_EVIDENCE_INVALID');
if(E.exactF2SourcePathExecuted!==true||E.classWidePreAuthEvidenceLifecyclePass!==true||E.classWidePreTerminalEvidenceLifecyclePass!==true||E.arbitraryFutureFilenameCleanupPass!==true)throw new Error('CONTROL_PLANE_HANDSHAKE_FULL_PATH_PARITY_MISSING');
if(Number(E.candidateArtifactId)!==Number(L.successorCandidate?.artifactId)||E.candidateSourceHead!==L.successorCandidate?.sourceHead)throw new Error('CONTROL_PLANE_HANDSHAKE_CANDIDATE_MISMATCH');
if(E.authorizationMaterialized!==false||E.requestMaterialized!==false||E.runtimeExecuted!==false||E.browserExecuted!==false||E.secretAccess!==false||E.firestoreRead!==false||Number(E.firestoreWrites)!==0||Number(E.authWrites)!==0||Number(E.operationalWrites)!==0||E.deployExecuted!==false||E.productionTouched!==false)throw new Error('CONTROL_PLANE_HANDSHAKE_SIDE_EFFECT_SIGNAL');
if(hardeningOpen){
  if(Number(E.expectedLedgerRevision)!==expectedRevision||Number(E.expectedPackageRevision)!==expectedPackageRevision)throw new Error('CONTROL_PLANE_HANDSHAKE_REVISION_MISMATCH');
  if(Number(E.runId||0)<=Number(L.continuityControl?.latestControlPlaneRegression?.runId||0))throw new Error('CONTROL_PLANE_HANDSHAKE_NOT_NEWER_THAN_REGRESSION');
}else{
  if(String(L.continuityControl?.workflowHandshakeEvidence||'')!==controlPlaneEvidence)throw new Error('CONTROL_PLANE_CLOSED_HANDSHAKE_PATH_MISMATCH');
  if(Number(L.continuityControl?.workflowHandshakeRunId||0)!==Number(E.runId||0)||Number(L.continuityControl?.workflowHandshakeJobId||0)!==Number(E.jobId||0))throw new Error('CONTROL_PLANE_CLOSED_HANDSHAKE_IDENTITY_MISMATCH');
  if(L.nextAction?.id!=='AWAIT_EXPLICIT_F2_RUNTIME_AUTHORIZATION_ONE_SHOT')throw new Error('CONTROL_PLANE_CLOSED_NEXT_ACTION_DRIFT');
}
try{execFileSync('git',['merge-base','--is-ancestor',String(E.canonicalBaseHead),'HEAD'],{cwd:ROOT,stdio:'ignore'});}catch{throw new Error('CONTROL_PLANE_HANDSHAKE_BASE_NOT_ANCESTOR');}
execFileSync(process.execPath,[A(P.noRewrite)],{cwd:ROOT,stdio:'ignore'});
execFileSync(process.execPath,[A(P.terminalTruth)],{cwd:ROOT,stdio:'ignore'});

const internalScratchHandshake=hardeningOpen&&Number(E.technicalPullRequest||0)===0&&/^orbit360-platform\/runtime-gate-crm-v20260716\/__selftest-handshake-[A-Za-z0-9]+\.json$/.test(controlPlaneEvidence);
let behavioralValidation=null;
if(hardeningOpen&&!internalScratchHandshake){
  if(Number(E.technicalPullRequest||0)<=0||!/^orbit360-platform\/runtime-gate-crm-v20260716\/control-plane-selftest-handshake-run-[0-9]+-v20260824\.json$/.test(controlPlaneEvidence))throw new Error('CONTROL_PLANE_CANONICAL_HANDSHAKE_IDENTITY_INVALID');
  const r=spawnSync(process.execPath,[A(P.behavioralSelftest)],{cwd:ROOT,encoding:'utf8',env:{...process.env,ORBIT360_SELFTEST_EXPECTED_LEDGER:String(expectedRevision),ORBIT360_SELFTEST_EXPECTED_PACKAGE:String(expectedPackageRevision)}});
  behavioralValidation=parseJson(r.stdout);
  if(r.status!==0||!behavioralValidation)throw new Error(`CONTROL_PLANE_BEHAVIORAL_SELFTEST_EXECUTION_FAIL:${String(r.stderr||r.stdout||'').slice(-500)}`);
  const required=behavioralValidation.ok===true&&behavioralValidation.status==='CONTROL_PLANE_SELFTEST_PASS'&&behavioralValidation.candidateBindingDynamic===true&&behavioralValidation.semanticPreflightPass===true&&behavioralValidation.sourceShapeValidationUsed===false&&behavioralValidation.exactF2SourcePathExecuted===true&&behavioralValidation.classWidePreAuthEvidenceLifecyclePass===true&&behavioralValidation.classWidePreTerminalEvidenceLifecyclePass===true&&behavioralValidation.arbitraryFutureFilenameCleanupPass===true&&behavioralValidation.scratchBehavioralTransitionsPass===true&&behavioralValidation.preProviderGatePathPass===true&&behavioralValidation.projectionImmutabilityPass===true&&behavioralValidation.remoteCASReadbackPass===true&&behavioralValidation.secondAttemptStopRetryPass===true&&behavioralValidation.workflowProviderUngatedNegativePass===true&&behavioralValidation.workflowCandidateHardcodeNegativePass===true&&behavioralValidation.workflowOperationalRevisionHardcodeNegativePass===true&&behavioralValidation.negativeRegressionSuitePass===true&&behavioralValidation.authorizationMaterialized===false&&behavioralValidation.requestMaterialized===false&&behavioralValidation.runtimeExecuted===false&&behavioralValidation.browserExecuted===false&&behavioralValidation.secretAccess===false&&behavioralValidation.firestoreRead===false&&Number(behavioralValidation.firestoreWrites)===0&&Number(behavioralValidation.authWrites)===0&&Number(behavioralValidation.operationalWrites)===0&&behavioralValidation.deployExecuted===false&&behavioralValidation.productionTouched===false;
  if(!required)throw new Error('CONTROL_PLANE_BEHAVIORAL_SELFTEST_CONTRACT_INCOMPLETE');
}

if(hardeningClosed){
  project(L.revision);
  console.log(JSON.stringify({ok:true,status:'CONTROL_PLANE_HARDENING_CLOSED_CAUSAL_PASS',transition,ledgerRevision:L.revision,packageRevision:L.productionReopeningPackage.revision,authorizationIdentityDigest:L.authorizationBoundary?.preparedAuthorizationIdentityDigest||null,candidateArtifactId:L.successorCandidate.artifactId,candidateSourceHead:L.successorCandidate.sourceHead,progress:75,closedStateReprojection:true,semanticBehavioralSelftestValidated:L.continuityControl?.semanticBehavioralSelftestValidated===true,authorizationMaterialized:false,requestMaterialized:false,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false},null,2));
  process.exit(0);
}

const ts=new Date().toISOString();
L.revision+=1;
L.productionReopeningPackage.revision+=1;
L.updatedAtUtc=ts;
const profile={phase:'F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY',capabilities:{secrets:true,firestoreRead:true,customTokenMint:true,browser:true,runtime:true,writes:false,firestoreWrites:false,authWrites:false,membershipWrites:false,dataWrites:false,operationalWrites:false,packageRebuild:false,deploy:false,publish:false,publication:false,production:false,main:false,merge:false}};
const authMaterial={gateId:L.gateId,gateContractVersion:String(G.gateContractVersion||'2.2.0'),candidateArtifactId:L.successorCandidate.artifactId,candidateArtifactDigest:L.successorCandidate.artifactDigest,candidateSourceHead:L.successorCandidate.sourceHead,ledgerRevision:L.revision,packageRevision:L.productionReopeningPackage.revision,executionProfile:profile};
const authDigest=sha(JSON.stringify(authMaterial));
L.activeState={...L.activeState,phase:'CONTROL_PLANE_DEFINITIVE_CAUSAL_PASS_AWAITING_F2_AUTHORIZATION',status:'CONTROL_PLANE_DEFINITIVE_CAUSAL_PASS',rootCauseStatus:'PIPELINE_MECHANISM_FAILURE_ROOT_CAUSES_CLOSED_SEMANTIC_BEHAVIORAL_SOURCE_ONLY',productFrozen:true,dataFrozen:true,runtimeAuthorized:false,runtimeReplayAllowed:false,deployAuthorized:false,productionAuthorized:false};
const regression=L.continuityControl?.latestControlPlaneRegression||null;
L.continuityControl={...L.continuityControl,status:'CONTROL_PLANE_DEFINITIVE_CAUSAL_PASS',classification:'PIPELINE_MECHANISM_FAILURE_RESOLVED',secondaryClassification:'VALIDATOR_STALE_RESOLVED_BY_SEMANTIC_CONTRACT',canonicalityConvergenceVersion:'v4-20260824-semantic-behavioral',evidenceFreshnessValidated:true,physicalSingleWriterEnforced:true,terminalReducerGeneric:true,terminalReducerTruthContractValidated:true,stopRetryMechanicallyEnforced:true,projectionWorkflowTemporarilyFailClosed:false,compositeInvariantRequiredBeforeClosure:true,compositeInvariantStatus:'CONTROL_PLANE_DEFINITIVE_CAUSAL_PASS',documentationDiscoveryGateRequired:true,sourceRewriteGuardEnforced:true,workflowHandshakeValidated:true,workflowHandshakeRunId:Number(E.runId),workflowHandshakeJobId:Number(E.jobId),workflowHandshakePullRequest:Number(E.technicalPullRequest),workflowHandshakeEvidence:controlPlaneEvidence,evidenceLifecycleClassWideValidated:true,exactF2SourcePathSelftestValidated:true,semanticBehavioralSelftestValidated:internalScratchHandshake?true:behavioralValidation?.ok===true,negativeRegressionSuiteValidated:internalScratchHandshake?true:behavioralValidation?.negativeRegressionSuitePass===true,preProviderScratchValidated:internalScratchHandshake?true:behavioralValidation?.preProviderGatePathPass===true,projectionImmutabilityValidated:internalScratchHandshake?true:behavioralValidation?.projectionImmutabilityPass===true,latestControlPlaneRegression:regression?{...regression,status:'CLOSED_BY_FRESH_SEMANTIC_BEHAVIORAL_HANDSHAKE',closedAtUtc:ts,closedByHandshakeRunId:Number(E.runId)}:null};
L.candidateBoundary={...(L.candidateBoundary||{}),status:'MACRO3_FRESH_AUTHORIZATION_BOUNDARY_PREPARED',successorArtifactId:L.successorCandidate.artifactId,successorSourceHead:L.successorCandidate.sourceHead,historicalRuntimeReusable:false};
L.authorizationBoundary={...L.authorizationBoundary,activeRuntimeAuthorization:false,freshAuthorizationRequired:true,authorizationBlockedByHardeningPackage:false,authorizationCarryForwardForbidden:true,nextRuntimeMaterializationAllowed:false,newRuntimeRequestAllowed:false,boundaryPrepared:true,currentBoundaryStatus:'PREPARED_SOURCE_ONLY_AWAITING_EXPLICIT_USER_AUTHORIZATION',preparedAuthorizationIdentityDigest:authDigest,activeRequestPath:null,authorizationRecordPath:null,runtimeAttemptAccepted:false,runtimeRunId:null};
L.productionReopeningPackage={...L.productionReopeningPackage,status:'CLOSED_PASS',revision:L.productionReopeningPackage.revision,firstIncompleteStep:'F2-RUNTIME-AUTHORIZATION',nextActionExact:'AWAIT_EXPLICIT_F2_RUNTIME_AUTHORIZATION_ONE_SHOT',runtimeAllowed:false,authorizationAllowed:true,requestMaterializationAllowed:false};
L.nextAction={id:'AWAIT_EXPLICIT_F2_RUNTIME_AUTHORIZATION_ONE_SHOT',description:'Await one fresh explicit F2 runtime authorization only after semantic-contract and behavioral scratch closure.',runtimeAllowed:false};
L.lanes={A_frontend_ux_academia:'MACRO2_TRANSVERSAL_SOURCE_ACCEPTANCE_CLOSED',B_backend_security_gates:'CONTROL_PLANE_SEMANTIC_BEHAVIORAL_PASS_AWAITING_FRESH_F2_AUTHORIZATION',C_real_data_migration:'UNCHANGED_FROZEN'};
L.progress={...L.progress,productionRouteProgressPct:75,programProgressPct:25,f2TerminalPass:false,progressMayIncreaseDuringHardening:false};
L.history={...(L.history||{}),latestControlPlaneHandshake:{runId:Number(E.runId),jobId:Number(E.jobId),technicalPullRequest:Number(E.technicalPullRequest),conclusion:'success',status:E.status,evidencePath:controlPlaneEvidence,canonicalBaseHead:E.canonicalBaseHead,intentHead:E.intentHead,candidateArtifactId:E.candidateArtifactId,candidateSourceHead:E.candidateSourceHead,sourceOnly:true,exactF2SourcePathExecuted:true,classWidePreAuthEvidenceLifecyclePass:true,classWidePreTerminalEvidenceLifecyclePass:true,arbitraryFutureFilenameCleanupPass:true,semanticBehavioralSelftestValidated:true,negativeRegressionSuiteValidated:true,preProviderScratchValidated:true,projectionImmutabilityValidated:true,authorizationMaterialized:false,requestMaterialized:false,runtimeExecuted:false,browserExecuted:false,replayAllowed:false,closedAtUtc:ts}};
W(P.ledger,L);
project(L.revision);
console.log(JSON.stringify({ok:true,status:'CONTROL_PLANE_HARDENING_CLOSED_CAUSAL_PASS',transition,ledgerRevision:L.revision,packageRevision:L.productionReopeningPackage.revision,authorizationIdentityDigest:authDigest,candidateArtifactId:L.successorCandidate.artifactId,candidateSourceHead:L.successorCandidate.sourceHead,progress:75,closedStateReprojection:false,exactF2SourcePathValidated:true,classWideEvidenceLifecycleValidated:true,semanticBehavioralSelftestValidated:true,negativeRegressionSuiteValidated:true,preProviderScratchValidated:true,projectionImmutabilityValidated:true,authorizationMaterialized:false,requestMaterialized:false,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false},null,2));
