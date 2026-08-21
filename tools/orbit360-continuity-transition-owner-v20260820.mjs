#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const P={
 ledger:'orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json',
 pkg:'orbit360-platform/docs/orbit360-production-reopening-package-v20260820.json',
 boundary:'orbit360-platform/docs/orbit360-f2-runtime-authorization-boundary-v20260820.json'
};
const A=r=>path.join(ROOT,r), text=r=>fs.readFileSync(A(r),'utf8').replace(/^\uFEFF/,''), json=r=>JSON.parse(text(r));
const sha=v=>crypto.createHash('sha256').update(String(v)).digest('hex');
const args=process.argv.slice(2), value=f=>{const i=args.indexOf(f);return i>=0?args[i+1]:'';};
const expectedRevision=Number(value('--expected-revision'));
const expectedPackageRevision=Number(value('--expected-package-revision'));
const transition=String(value('--transition')||'');
const terminalEvidence=String(value('--terminal-evidence')||'');
const expectedRuntimeRunId=String(value('--expected-runtime-run-id')||'');
const authorizationIdentity=String(value('--authorization-identity')||'');
const parentHead=String(value('--parent-head')||'');
const evidenceList=String(value('--closure-evidence')||'').split(',').map(x=>x.trim()).filter(Boolean);
if(!Number.isInteger(expectedRevision)||!Number.isInteger(expectedPackageRevision)||!transition)throw new Error('TRANSITION_PRECONDITION_REQUIRED');
const before={ledger:text(P.ledger),pkg:text(P.pkg),boundary:text(P.boundary)};
const L=JSON.parse(before.ledger), pkg=JSON.parse(before.pkg), B=JSON.parse(before.boundary);
if(L.revision!==expectedRevision)throw new Error(`EXPECTED_REVISION_MISMATCH:${expectedRevision}:${L.revision}`);
if(pkg.revision!==expectedPackageRevision)throw new Error(`EXPECTED_PACKAGE_REVISION_MISMATCH:${expectedPackageRevision}:${pkg.revision}`);
if(L.productionReopeningPackage?.revision!==pkg.revision)throw new Error('LEDGER_PACKAGE_REVISION_DRIFT');
const write=(r,o)=>{fs.mkdirSync(path.dirname(A(r)),{recursive:true});const t=A(r)+`.tmp-${process.pid}`;fs.writeFileSync(t,JSON.stringify(o,null,2)+'\n','utf8');fs.renameSync(t,A(r));};
const assertUnchanged=()=>{if(text(P.ledger)!==before.ledger||text(P.pkg)!==before.pkg||text(P.boundary)!==before.boundary)throw new Error('CONCURRENT_LOCAL_STATE_MUTATION');};
const bump=()=>{const now=new Date().toISOString();L.revision+=1;pkg.revision+=1;L.updatedAtUtc=now;pkg.updatedAtUtc=now;L.productionReopeningPackage.revision=pkg.revision;B.controlPlane.ledgerRevision=L.revision;B.controlPlane.packageRevision=pkg.revision;return now;};
const sameCandidate=(x,y)=>Number(x?.artifactId)===Number(y?.artifactId)&&x?.sourceHead===y?.sourceHead&&x?.artifactDigest===y?.artifactDigest;
const allowedFailures=new Set(['FUNCTIONAL_DEFECT','VALIDATOR_STALE','DATA_CONTRACT_FAILURE','ENVIRONMENT_FAILURE','PIPELINE_MECHANISM_FAILURE','SECURITY_FAILURE']);
const sealCode=c=>c==='PASS'?'PASS':`FAIL_${c}`;
const closeRecords=(authPath,requestPath,terminal,now,classification)=>{
 const auth=json(authPath), req=json(requestPath);
 if(!auth.approved||auth.consumed||auth.historical||auth.allowedExecutions!==1||auth.replayAllowed!==false)throw new Error('AUTHORIZATION_NOT_ACTIVE_ONE_SHOT');
 if(!req.approved||req.consumed||req.historical||req.allowedExecutions!==1||req.replayAllowed!==false)throw new Error('REQUEST_NOT_ACTIVE_ONE_SHOT');
 if(auth.authorizationIdentityDigest!==req.authorizationIdentityDigest)throw new Error('AUTH_REQUEST_IDENTITY_DRIFT');
 const status=`CONSUMED_${sealCode(classification)}`;
 for(const x of [auth,req])Object.assign(x,{status,allowedExecutions:0,consumed:true,historical:true,replayAllowed:false,consumedAt:now,runtimeRunId:Number(terminal.runId),terminalEvidencePath:terminalEvidence,disposition:`NO_REPLAY_TERMINAL_${classification}`});
 write(authPath,auth);write(requestPath,req);return{auth,req};
};
let result={};

if(transition==='F2_RUNTIME_TERMINAL_RECONCILE_GENERIC'){
 if(!terminalEvidence||!fs.existsSync(A(terminalEvidence)))throw new Error('TERMINAL_EVIDENCE_REQUIRED');
 const T=json(terminalEvidence), classification=T.ok===true?'PASS':String(T.classification||'');
 if(classification!=='PASS'&&!allowedFailures.has(classification))throw new Error(`TERMINAL_CLASSIFICATION_UNSUPPORTED:${classification}`);
 if(!/^\d+$/.test(String(T.runId||'')))throw new Error('TERMINAL_RUN_ID_REQUIRED');
 if(expectedRuntimeRunId&&String(T.runId)!==expectedRuntimeRunId)throw new Error('TERMINAL_RUN_ID_MISMATCH');
 if(Number(T.firestoreWrites)!==0||Number(T.authWrites)!==0||Number(T.operationalWrites)!==0)throw new Error('TERMINAL_WRITE_SIGNAL_PRESENT');
 if(T.deployExecuted!==false||T.publicationExecuted!==false||T.productionHostingTouched!==false)throw new Error('TERMINAL_FORBIDDEN_SIDE_EFFECT');
 if(T.containsPII!==false||T.containsSecrets!==false)throw new Error('TERMINAL_EVIDENCE_UNSAFE');
 const authPath=B.authorizationRecordPath||L.authorizationBoundary?.authorizationRecordPath;
 const requestPath=B.activeRequestPath||L.authorizationBoundary?.activeRequestPath;
 if(!authPath||!requestPath||!fs.existsSync(A(authPath))||!fs.existsSync(A(requestPath)))throw new Error('ACTIVE_AUTH_REQUEST_REQUIRED');
 const req=json(requestPath);
 if(T.request&&T.request!==requestPath)throw new Error('TERMINAL_REQUEST_BINDING_MISMATCH');
 if(Number(T.candidateArtifactId)!==Number(req.candidateArtifactId))throw new Error('TERMINAL_CANDIDATE_ARTIFACT_MISMATCH');
 if(T.candidateSourceHead&&T.candidateSourceHead!==req.candidateSourceHead)throw new Error('TERMINAL_CANDIDATE_SOURCE_MISMATCH');
 if(!sameCandidate({artifactId:req.candidateArtifactId,sourceHead:req.candidateSourceHead,artifactDigest:req.candidateArtifactDigest},L.successorCandidate))throw new Error('REQUEST_LEDGER_CANDIDATE_DRIFT');
 const now=bump(); closeRecords(authPath,requestPath,T,now,classification);
 const failureCode=String(T.error||T.failureCode||classification);
 const fingerprint=sha(`${T.status||'F2_TERMINAL'}|${failureCode}|${req.candidateArtifactId}|${req.authorizationIdentityDigest}`);
 B.status=classification==='PASS'?'CONSUMED_PASS_AWAITING_GO_LIVE':'CONSUMED_FAIL_AWAITING_SOURCE_ONLY_ROOT_CAUSE';
 B.authorized=false;B.authorizationPersisted=false;B.requestMaterialized=false;B.runtimeAllowed=false;
 B.historicalAuthorizationRecordPath=authPath;B.historicalRequestPath=requestPath;B.terminalEvidencePath=terminalEvidence;B.terminalRunId=Number(T.runId);B.terminalClassification=classification;B.retryFingerprint=fingerprint;
 delete B.authorizationRecordPath;delete B.activeRequestPath;
 Object.assign(L.authorizationBoundary,{activeRuntimeAuthorization:false,freshAuthorizationRequired:classification!=='PASS',nextRuntimeMaterializationAllowed:false,newRuntimeRequestAllowed:false,historicalAuthorizationRecordPath:authPath,historicalRequestPath:requestPath,terminalEvidencePath:terminalEvidence,terminalRunId:Number(T.runId)});
 delete L.authorizationBoundary.authorizationRecordPath;delete L.authorizationBoundary.activeRequestPath;
 L.history.latestSealedConsumedRuntime={requestId:req.requestId||null,requestPath,authorizationPath:authPath,runId:Number(T.runId),conclusion:classification==='PASS'?'success':'failure',requestStatus:`CONSUMED_${sealCode(classification)}`,authorizationStatus:`CONSUMED_${sealCode(classification)}`,allowedExecutions:0,consumed:true,replayAllowed:false,observedClassification:classification,observedFailureCode:failureCode,preGateFailure:Boolean(T.preGateFailure),secretAccess:Boolean(T.secretAccess),firestoreRead:Boolean(T.firestoreRead),browserExecuted:Boolean(T.browserExecuted),runtimeExecuted:Boolean(T.runtimeExecuted),firestoreWrites:0,authWrites:0,operationalWrites:0,terminalEvidencePath,retryFingerprint:fingerprint};
 pkg.authorizationBoundary={path:P.boundary,status:B.status,ledgerRevision:L.revision,packageRevision:pkg.revision,authorized:false,authorizationPersisted:false,requestMaterialized:false,runtimeAllowed:false,historicalAuthorizationRecordPath:authPath,historicalRequestPath:requestPath,terminalEvidencePath,terminalRunId:Number(T.runId)};
 pkg.lock.authorizationAllowed=false;pkg.lock.requestMaterializationAllowed=false;pkg.lock.runtimeAllowed=false;pkg.lock.secretAccessAllowed=false;pkg.lock.firestoreReadAllowed=false;pkg.lock.browserAllowed=false;pkg.lock.newRuntimeOrdinalAllowed=false;pkg.lock.stopRetry=classification!=='PASS';
 pkg.rootCause.latestTerminal={classification,failureCode,runId:Number(T.runId),candidateArtifactId:req.candidateArtifactId,retryFingerprint:fingerprint,status:'RECONCILED_ONE_SHOT_CONSUMED'};
 if(pkg.rootCause?.macro2MaterializationMechanism)pkg.rootCause.macro2MaterializationMechanism.sameStageRetryBudgetRemaining=0;
 if(classification==='PASS'){
   L.activeState={...L.activeState,phase:'F2_TERMINAL_PASS_AWAITING_AUTHORIZED_GO_LIVE',status:'F2_TERMINAL_PASS',rootCauseStatus:'CLOSED_PASS',runtimeAuthorized:false,runtimeReplayAllowed:false};
   pkg.phase='F2_TERMINAL_PASS_AWAITING_AUTHORIZED_GO_LIVE';pkg.resumeProtocol.firstIncompleteStep='MACRO4-GO-LIVE-AUTHORIZATION';pkg.resumeProtocol.nextActionExact='AWAIT_EXPLICIT_GO_LIVE_AUTHORIZATION';
   L.nextAction={id:pkg.resumeProtocol.nextActionExact,description:'Await separate explicit go-live authorization. F2 authorization is consumed and cannot authorize deploy.',runtimeAllowed:false};
 }else{
   L.activeState={...L.activeState,phase:'MACRO1_CONTROL_PLANE_REPAIR_IN_PROGRESS',status:'F2_TERMINAL_RECONCILED_NO_REPLAY',rootCauseStatus:`${classification}:${failureCode}`,runtimeAuthorized:false,runtimeReplayAllowed:false,productFrozen:true,dataFrozen:true};
   pkg.phase='MACRO1_CONTROL_PLANE_REPAIR_IN_PROGRESS';pkg.resumeProtocol.firstIncompleteStep='MACRO1-CONTROL-PLANE-CLOSE';pkg.resumeProtocol.nextActionExact='CLOSE_DEFINITIVE_CONTROL_PLANE_AFTER_GLOBAL_AUDITS';
   L.nextAction={id:pkg.resumeProtocol.nextActionExact,description:'Complete source-only control-plane repair and global audits. Runtime remains closed.',runtimeAllowed:false};
 }
 L.productionReopeningPackage.firstIncompleteStep=pkg.resumeProtocol.firstIncompleteStep;L.productionReopeningPackage.nextActionExact=pkg.resumeProtocol.nextActionExact;L.productionReopeningPackage.authorizationAllowed=false;L.productionReopeningPackage.requestMaterializationAllowed=false;
 L.lanes.B_backend_security_gates=classification==='PASS'?'F2_TERMINAL_PASS_AWAITING_GO_LIVE':'MACRO1_CONTROL_PLANE_REPAIR_IN_PROGRESS';
 assertUnchanged();write(P.ledger,L);write(P.pkg,pkg);write(P.boundary,B);
 result={ok:true,status:'F2_RUNTIME_TERMINAL_RECONCILED_GENERIC',classification,runId:Number(T.runId),retryFingerprint:fingerprint,ledgerRevision:L.revision,packageRevision:pkg.revision,replayAllowed:false,runtimeAllowed:false};

}else if(transition==='MACRO1_CONTROL_PLANE_CLOSE'){
 if(L.activeState?.status!=='F2_TERMINAL_RECONCILED_NO_REPLAY')throw new Error('MACRO1_CLOSE_REQUIRES_RECONCILED_TERMINAL');
 if(evidenceList.length<4)throw new Error('MACRO1_CLOSURE_EVIDENCE_REQUIRED');
 for(const rel of evidenceList){if(!fs.existsSync(A(rel)))throw new Error(`CLOSURE_EVIDENCE_MISSING:${rel}`);const e=json(rel);if(e.ok!==true)throw new Error(`CLOSURE_EVIDENCE_NOT_PASS:${rel}:${e.status||''}`);}
 const now=bump();
 L.activeState={...L.activeState,phase:'MACRO1_CONTROL_PLANE_DEFINITIVE_PASS_AWAITING_TRANSVERSAL_SOURCE_ACCEPTANCE',status:'CONTROL_PLANE_DEFINITIVE_PASS',rootCauseStatus:'PIPELINE_MECHANISM_FAILURE_RESOLVED_SOURCE_ONLY',runtimeAuthorized:false,runtimeReplayAllowed:false,productFrozen:true,dataFrozen:true};
 L.continuityControl={...L.continuityControl,status:'CONTROL_PLANE_DEFINITIVE_PASS',classification:'PIPELINE_MECHANISM_FAILURE_RESOLVED',secondaryClassification:'DOCUMENTATION_STATE_DRIFT_RESOLVED',projectionWorkflowTemporarilyFailClosed:false,compositeInvariantRequiredBeforeClosure:true,compositeInvariantStatus:'PASS',physicalSingleWriterEnforced:true,stopRetryMechanicallyEnforced:true,documentationDiscoveryGateRequired:true,terminalReducerGeneric:true};
 pkg.phase=L.activeState.phase;pkg.status='CLOSED_PASS';pkg.rootCause.definitiveMechanismRepair={status:'CLOSED_PASS',classification:'PIPELINE_MECHANISM_FAILURE',terminalReducerGeneric:true,projectionDerived:true,dynamicInvariant:true,physicalSingleWriter:true,stopRetryEnforced:true,documentationDiscovery:true,closedAtUtc:now};
 pkg.lock.active=true;pkg.lock.authorizationAllowed=false;pkg.lock.requestMaterializationAllowed=false;pkg.lock.runtimeAllowed=false;pkg.lock.secretAccessAllowed=false;pkg.lock.firestoreReadAllowed=false;pkg.lock.browserAllowed=false;pkg.lock.stopRetry=true;pkg.lock.releaseCondition='TRANSVERSAL_SOURCE_ACCEPTANCE_PASS_AND_FRESH_AUTHORIZATION_BOUNDARY';
 pkg.resumeProtocol.firstIncompleteStep='MACRO2-TRANSVERSAL-SOURCE-ACCEPTANCE';pkg.resumeProtocol.nextActionExact='EXECUTE_MACRO2_TRANSVERSAL_SOURCE_ACCEPTANCE_AND_SINGLE_CANDIDATE';
 pkg.controlPlaneClosure={...pkg.controlPlaneClosure,status:'CONTROL_PLANE_DEFINITIVE_PASS',runtimeAuthorized:false,physicalSingleWriter:true,terminalReducerGeneric:true,documentationDiscovery:true,stopRetryEnforced:true};
 L.productionReopeningPackage={...L.productionReopeningPackage,status:'CLOSED_PASS',revision:pkg.revision,firstIncompleteStep:pkg.resumeProtocol.firstIncompleteStep,nextActionExact:pkg.resumeProtocol.nextActionExact,runtimeAllowed:false,authorizationAllowed:false,requestMaterializationAllowed:false};
 L.nextAction={id:pkg.resumeProtocol.nextActionExact,description:'Execute transversal source-only visible-value/performance acceptance and produce at most one successor candidate. No runtime authorization yet.',runtimeAllowed:false};
 L.lanes={A_frontend_ux_academia:'MACRO2_SOURCE_ONLY_TRANSVERSAL_HARDENING',B_backend_security_gates:'CONTROL_PLANE_DEFINITIVE_PASS_RUNTIME_CLOSED',C_real_data_migration:'UNCHANGED_FROZEN'};
 L.progress={...L.progress,productionRouteProgressPct:62,f2TerminalPass:false,progressMayIncreaseDuringHardening:false};
 pkg.progress={...pkg.progress,productionRouteProgressPct:62,f2TerminalPass:false,progressMayIncreaseDuringHardening:false};
 B.status='INERT_AFTER_CONSUMED_F2_AWAITING_TRANSVERSAL_SOURCE_ACCEPTANCE';B.authorized=false;B.authorizationPersisted=false;B.requestMaterialized=false;B.runtimeAllowed=false;B.controlPlane.ledgerRevision=L.revision;B.controlPlane.packageRevision=pkg.revision;
 pkg.authorizationBoundary={...pkg.authorizationBoundary,status:B.status,ledgerRevision:L.revision,packageRevision:pkg.revision,authorized:false,authorizationPersisted:false,requestMaterialized:false,runtimeAllowed:false};
 assertUnchanged();write(P.ledger,L);write(P.pkg,pkg);write(P.boundary,B);
 result={ok:true,status:'CONTROL_PLANE_DEFINITIVE_PASS',ledgerRevision:L.revision,packageRevision:pkg.revision,productionRouteProgressPct:62,runtimeAllowed:false,authorizationAllowed:false,replayAllowed:false};

}else if(transition==='F2_RUNTIME_AUTHORIZATION_PERSIST'){
 if(!/^[a-f0-9]{64}$/.test(authorizationIdentity)||authorizationIdentity!==B.authorizationIdentity?.digest)throw new Error('AUTHORIZATION_IDENTITY_MISMATCH');
 if(B.authorized||B.authorizationPersisted||B.requestMaterialized)throw new Error('AUTHORIZATION_BOUNDARY_NOT_INERT');
 if(pkg.lock?.authorizationAllowed!==true)throw new Error('AUTHORIZATION_NOT_ALLOWED_BY_PACKAGE');
 const authPath=`.github/orbit360-authorizations/f2-productive-acceptance-runtime-browser-readonly-auth-${authorizationIdentity.slice(0,12)}-v20260820.json`;
 if(fs.existsSync(A(authPath)))throw new Error('AUTHORIZATION_RECORD_ALREADY_EXISTS');
 const now=bump();const auth={schemaVersion:'orbit360-f2-runtime-authorization-v2',status:'PERSISTED_SOURCE_ONLY_AWAITING_REQUEST_MATERIALIZATION',approved:true,authorizationIdentityDigest:authorizationIdentity,gateId:B.gate.id,gateContractVersion:B.gate.contractVersion,branch:B.branch,pullRequest:B.pullRequest,authorizedAt:now,allowedExecutions:1,consumed:false,authorizationFrozen:true,replayAllowed:false,historical:false,candidateArtifactId:B.candidate.artifactId,candidateSourceHead:B.candidate.sourceHead,candidateArtifactDigest:B.candidate.artifactDigest,scopeAuthorized:B.requestedExecutionProfile.capabilities,containsPII:false,containsSecrets:false};
 write(authPath,auth);B.status='AUTHORIZED_SOURCE_ONLY_AWAITING_REQUEST_MATERIALIZATION';B.authorized=true;B.authorizationPersisted=true;B.authorizationRecordPath=authPath;B.runtimeAllowed=false;pkg.phase='F2_RUNTIME_AUTHORIZATION_PERSISTED_AWAITING_REQUEST_MATERIALIZATION';pkg.resumeProtocol.firstIncompleteStep='F2-RUNTIME-REQUEST-MATERIALIZATION';pkg.resumeProtocol.nextActionExact='MATERIALIZE_SINGLE_F2_RUNTIME_REQUEST_SOURCE_ONLY';L.activeState.phase=pkg.phase;L.activeState.status='F2_RUNTIME_AUTHORIZATION_PERSISTED_SOURCE_ONLY';L.authorizationBoundary.activeRuntimeAuthorization=true;L.authorizationBoundary.freshAuthorizationRequired=false;L.authorizationBoundary.authorizationRecordPath=authPath;L.nextAction={id:pkg.resumeProtocol.nextActionExact,description:'Materialize exactly one immutable F2 request.',runtimeAllowed:false};L.productionReopeningPackage.revision=pkg.revision;L.productionReopeningPackage.firstIncompleteStep=pkg.resumeProtocol.firstIncompleteStep;L.productionReopeningPackage.nextActionExact=pkg.resumeProtocol.nextActionExact;assertUnchanged();write(P.ledger,L);write(P.pkg,pkg);write(P.boundary,B);result={ok:true,status:'ORBIT360_F2_RUNTIME_AUTHORIZATION_PERSISTED_SOURCE_ONLY',authorizationRecordPath:authPath,ledgerRevision:L.revision,packageRevision:pkg.revision};

}else if(transition==='F2_RUNTIME_REQUEST_MATERIALIZE'){
 if(!/^[a-f0-9]{64}$/.test(authorizationIdentity)||authorizationIdentity!==B.authorizationIdentity?.digest)throw new Error('AUTHORIZATION_IDENTITY_MISMATCH');
 if(!/^[a-f0-9]{40}$/.test(parentHead))throw new Error('PARENT_HEAD_REQUIRED');
 if(!B.authorized||!B.authorizationPersisted||B.requestMaterialized)throw new Error('BOUNDARY_NOT_READY_FOR_REQUEST');
 const authPath=B.authorizationRecordPath, auth=json(authPath);if(auth.consumed||auth.historical||auth.allowedExecutions!==1)throw new Error('AUTHORIZATION_NOT_ACTIVE');
 const requestPath=`.github/orbit360-requests/f2-productive-acceptance-runtime-browser-readonly-successor-${authorizationIdentity.slice(0,12)}-v20260820.json`;if(fs.existsSync(A(requestPath)))throw new Error('REQUEST_ALREADY_EXISTS');
 const now=bump();const req={schemaVersion:'orbit360-f2-productive-acceptance-runtime-browser-readonly-request-v2',requestVersion:'F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V2',requestId:`F2-${authorizationIdentity.slice(0,12)}`,gateId:B.gate.id,gateContractVersion:B.gate.contractVersion,rcId:'RC-AYS-LAB-CANONICA-01',status:'MATERIALIZED_SOURCE_ONLY_AWAITING_PREFLIGHT',approved:true,allowedExecutions:1,consumed:false,authorizationFrozen:true,replayAllowed:false,historical:false,branch:B.branch,pullRequest:B.pullRequest,projectId:'ays-orbit-360-lab',tenantId:'alianzas-soluciones',parentHead,candidateArtifactId:B.candidate.artifactId,candidateSourceHead:B.candidate.sourceHead,candidateArtifactDigest:B.candidate.artifactDigest,authorizationRecordPath:authPath,authorizationIdentityDigest:authorizationIdentity,materializedAt:now,containsPII:false,containsSecrets:false};write(requestPath,req);B.status='REQUEST_MATERIALIZED_SOURCE_ONLY_AWAITING_PREFLIGHT';B.requestMaterialized=true;B.activeRequestPath=requestPath;B.runtimeAllowed=false;pkg.phase='F2_RUNTIME_REQUEST_MATERIALIZED_AWAITING_PREFLIGHT';pkg.resumeProtocol.firstIncompleteStep='F2-RUNTIME-PREFLIGHT';pkg.resumeProtocol.nextActionExact='RUN_F2_SOURCE_AND_RUNTIME_PREFLIGHT_FAIL_CLOSED';L.activeState.phase=pkg.phase;L.activeState.status='F2_RUNTIME_REQUEST_MATERIALIZED_SOURCE_ONLY';L.authorizationBoundary.activeRequestPath=requestPath;L.authorizationBoundary.nextRuntimeMaterializationAllowed=false;L.authorizationBoundary.newRuntimeRequestAllowed=false;L.nextAction={id:pkg.resumeProtocol.nextActionExact,description:'Run canonical fail-closed F2 preflight.',runtimeAllowed:false};L.productionReopeningPackage.revision=pkg.revision;L.productionReopeningPackage.firstIncompleteStep=pkg.resumeProtocol.firstIncompleteStep;L.productionReopeningPackage.nextActionExact=pkg.resumeProtocol.nextActionExact;assertUnchanged();write(P.ledger,L);write(P.pkg,pkg);write(P.boundary,B);result={ok:true,status:'ORBIT360_F2_RUNTIME_REQUEST_MATERIALIZED_SOURCE_ONLY',requestPath,ledgerRevision:L.revision,packageRevision:pkg.revision};
}else throw new Error(`UNKNOWN_TRANSITION:${transition}`);

console.log(JSON.stringify({...result,transition,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false},null,2));
