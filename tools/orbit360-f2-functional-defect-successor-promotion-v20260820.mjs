#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT=process.cwd();
const abs=p=>path.join(ROOT,p);
const read=p=>JSON.parse(fs.readFileSync(abs(p),'utf8').replace(/^\uFEFF/,''));
const write=(p,v)=>{const f=abs(p),t=f+'.tmp-'+process.pid;fs.writeFileSync(t,JSON.stringify(v,null,2)+'\n','utf8');fs.renameSync(t,f);};
const arg=n=>{const i=process.argv.indexOf(n);return i>=0?process.argv[i+1]:null;};
const expectedLedger=Number(arg('--expected-ledger'));
const expectedPackage=Number(arg('--expected-package'));
const evidencePath=String(arg('--evidence')||'');
if(!Number.isInteger(expectedLedger)||!Number.isInteger(expectedPackage)||!evidencePath)throw new Error('PROMOTION_ARGUMENTS_REQUIRED');

const P={
 ledger:'orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json',
 pkg:'orbit360-platform/docs/orbit360-production-reopening-package-v20260820.json',
 boundary:'orbit360-platform/docs/orbit360-f2-runtime-authorization-boundary-v20260820.json',
 authority:'tools/orbit360-gate-contract-f2-productive-acceptance-v20260820.json',
 registry:'tools/orbit360-gate-contract-registry-v20260717.json',
 sourceLife:'tools/orbit360-validator-lifecycle-contract-f2-productive-acceptance-source-v20260819.json',
 runtimeLife:'tools/orbit360-validator-lifecycle-contract-f2-productive-acceptance-runtime-v20260819.json'
};
const L=read(P.ledger),pkg=read(P.pkg),B=read(P.boundary),A=read(P.authority),R=read(P.registry),S=read(P.sourceLife),RT=read(P.runtimeLife),E=read(evidencePath);
if(L.revision!==expectedLedger||pkg.revision!==expectedPackage)throw new Error('PROMOTION_REVISION_MISMATCH');
if(pkg.status!=='CLOSED_PASS'||pkg.resumeProtocol?.firstIncompleteStep!=='F2-RUNTIME-PREFLIGHT')throw new Error('PROMOTION_F2_PREFLIGHT_STATE_REQUIRED');
if(L.successorCandidate?.artifactId!==A.candidate?.artifactId||L.successorCandidate?.artifactDigest!==A.candidate?.artifactDigest||L.successorCandidate?.sourceHead!==A.candidate?.sourceHead)throw new Error('PROMOTION_OLD_CANDIDATE_AUTHORITY_DRIFT');
if(E.ok!==true||E.status!=='F2_SUCCESSOR_CLIENT_PROJECTION_ROOTFIX_SOURCEONLY_CERTIFIED'||E.classification!=='PASS'||E.baseArtifactId!==A.candidate.artifactId||E.deltaCount!==1||E.deltaPaths?.[0]!=='core/crmkit.js'||E.unchangedFileCount!==193||E.fileCount!==194||E.syntheticRootfixPass!==true||E.fullRehashPass!==true||E.runtimeExecuted!==false||E.browserExecuted!==false||E.secretAccess!==false||E.firestoreRead!==false||E.writes!==0||E.deployExecuted!==false||E.productionTouched!==false)throw new Error('PROMOTION_CANDIDATE_EVIDENCE_INVALID');

const authPath=L.authorizationBoundary?.authorizationRecordPath||B.authorizationRecordPath;
const requestPath=L.authorizationBoundary?.activeRequestPath||B.activeRequestPath;
if(!authPath||!requestPath)throw new Error('PROMOTION_ACTIVE_HISTORY_PATHS_REQUIRED');
const auth=read(authPath),req=read(requestPath);
if(auth.status!=='CONSUMED_FAIL_FUNCTIONAL_DEFECT'||auth.consumed!==true||auth.historical!==true||auth.allowedExecutions!==0||auth.replayAllowed!==false)throw new Error('PROMOTION_AUTH_NOT_SEALED');
if(req.status!=='CONSUMED_FAIL_FUNCTIONAL_DEFECT'||req.consumed!==true||req.historical!==true||req.allowedExecutions!==0||req.replayAllowed!==false)throw new Error('PROMOTION_REQUEST_NOT_SEALED');
if(auth.authorizationIdentityDigest!==req.authorizationIdentityDigest||auth.authorizationIdentityDigest!==B.authorizationIdentity?.digest)throw new Error('PROMOTION_AUTH_IDENTITY_DRIFT');
const terminalPath=req.terminalEvidencePath||auth.terminalEvidencePath;
if(!terminalPath)throw new Error('PROMOTION_TERMINAL_PATH_REQUIRED');
const T=read(terminalPath);
if(T.status!=='F2_PRODUCTIVE_ACCEPTANCE_FAIL'||T.classification!=='FUNCTIONAL_DEFECT'||String(T.runId)!==String(req.runtimeRunId)||T.request!==requestPath||Number(T.candidateArtifactId)!==Number(A.candidate.artifactId)||T.firestoreWrites!==0||T.authWrites!==0||T.operationalWrites!==0||T.deployExecuted!==false||T.publicationExecuted!==false||T.productionHostingTouched!==false||T.containsPII!==false||T.containsSecrets!==false)throw new Error('PROMOTION_TERMINAL_INVALID');

const oldCandidate=JSON.parse(JSON.stringify(A.candidate));
const candidate={artifactId:E.candidateArtifactId,artifactDigest:E.artifactDigest,sourceHead:E.candidateSourceHead,zipSha256:E.candidateZipSha256,manifestSha256:E.candidateManifestSha256,fileCount:E.fileCount};
if(!Number.isInteger(candidate.artifactId)||!/^[a-f0-9]{64}$/.test(candidate.artifactDigest)||!/^[a-f0-9]{40}$/.test(candidate.sourceHead)||!/^[a-f0-9]{64}$/.test(candidate.zipSha256)||!/^[a-f0-9]{64}$/.test(candidate.manifestSha256)||candidate.fileCount!==194)throw new Error('PROMOTION_NEW_CANDIDATE_SHAPE_INVALID');

const now=new Date().toISOString();
L.revision+=1;L.updatedAtUtc=now;pkg.revision+=1;pkg.updatedAtUtc=now;
const targetLedger=L.revision,targetPackage=pkg.revision;
if(targetLedger!==expectedLedger+1||targetPackage!==expectedPackage+1)throw new Error('PROMOTION_TARGET_REVISION_INVALID');

A.candidate=candidate;A.status='F2_FUNCTIONAL_ROOTFIX_SOURCE_ONLY_CERTIFIED_AWAITING_RUNTIME_AUTHORIZATION';
const f2=(R.gates||[]).find(g=>g.gateId===A.gateId);if(!f2)throw new Error('PROMOTION_REGISTRY_F2_NOT_FOUND');f2.candidate=JSON.parse(JSON.stringify(candidate));f2.status='F2_FUNCTIONAL_ROOTFIX_SOURCE_ONLY_CERTIFIED_AWAITING_RUNTIME_AUTHORIZATION';f2.classification='FUNCTIONAL_DEFECT_ROOTFIX_CERTIFIED_SOURCE_ONLY';f2.rootCause=String(E.rootCause||T.error||'FUNCTIONAL_DEFECT');

Object.assign(S.guards,{candidateArtifactId:candidate.artifactId,candidateArtifactDigest:candidate.artifactDigest,candidateSourceHead:candidate.sourceHead,candidateZipSha256:candidate.zipSha256,candidateManifestSha256:candidate.manifestSha256,candidateFileCount:candidate.fileCount});
S.status='F2_FUNCTIONAL_ROOTFIX_SOURCE_ONLY_CERTIFIED';S.nextActionExact='AWAIT_EXPLICIT_F2_RUNTIME_AUTHORIZATION_ONE_SHOT';
Object.assign(RT.guards,{successorCandidateArtifactId:candidate.artifactId,successorCandidateSourceHead:candidate.sourceHead,successorCandidateArtifactDigest:candidate.artifactDigest});

L.successorCandidate={status:'CERTIFIED_SOURCE_ONLY_FUNCTIONAL_ROOTFIX',artifactId:candidate.artifactId,sourceHead:candidate.sourceHead,zipSha256:candidate.zipSha256,manifestSha256:candidate.manifestSha256,artifactDigest:candidate.artifactDigest,fileCount:candidate.fileCount,runtimeAuthorized:false,rebuildAllowed:false};
L.candidateBoundary.priorCertifiedArtifactId=oldCandidate.artifactId;L.candidateBoundary.priorCertifiedSourceHead=oldCandidate.sourceHead;L.candidateBoundary.status='SUCCESSOR_SOURCE_CANDIDATE_CERTIFIED_FROZEN';L.candidateBoundary.successorArtifactId=candidate.artifactId;L.candidateBoundary.successorSourceHead=candidate.sourceHead;
L.functionalRootfix={status:'VERIFIED_SOURCE_ONLY',classification:'FUNCTIONAL_DEFECT',code:'F2_UNDEFINED_NAN_VISIBLE_POLIZAS_CLIENT_CELL',rootfixCommit:candidate.sourceHead,rootfixPath:'orbit360-platform/core/crmkit.js',implementation:'clienteCell raw record -> clientProjection with honest fallbacks',baseArtifactId:oldCandidate.artifactId,successorArtifactId:candidate.artifactId,syntheticPass:true,fullRehashPass:true};
L.history=L.history||{};L.history.latestSealedConsumedRuntime={requestId:req.requestId,requestPath,authorizationPath:authPath,runId:Number(req.runtimeRunId),conclusion:'failure',requestStatus:req.status,authorizationStatus:auth.status,allowedExecutions:0,consumed:true,replayAllowed:false,observedClassification:'FUNCTIONAL_DEFECT',observedFailureCode:String(T.error||''),preGateFailure:false,secretAccess:true,firestoreRead:true,browserExecuted:true,runtimeExecuted:true,firestoreWrites:0,authWrites:0,operationalWrites:0,terminalEvidencePath:terminalPath};

pkg.candidate={frozen:true,...candidate,rebuildAllowed:false};pkg.phase='F2_RUNTIME_AUTHORIZATION_BOUNDARY_PREPARED_AWAITING_EXPLICIT_AUTHORIZATION';pkg.resumeProtocol.firstIncompleteStep='F2-RUNTIME-AUTHORIZATION';pkg.resumeProtocol.nextActionExact='AWAIT_EXPLICIT_F2_RUNTIME_AUTHORIZATION_ONE_SHOT';pkg.rootCause=pkg.rootCause||{};pkg.rootCause.latestFunctionalDefect={classification:'FUNCTIONAL_DEFECT',code:'F2_UNDEFINED_NAN_VISIBLE_POLIZAS_CLIENT_CELL',terminalRunId:Number(req.runtimeRunId),baseArtifactId:oldCandidate.artifactId,successorArtifactId:candidate.artifactId,rootfixPath:'orbit360-platform/core/crmkit.js',sourceOnlyCertified:true};Object.assign(pkg.lock,{runtimeAllowed:false,authorizationAllowed:true,requestMaterializationAllowed:false,secretAccessAllowed:false,firestoreReadAllowed:false,browserAllowed:false,writesAllowed:false,deployAllowed:false,publicationAllowed:false,productionAllowed:false,mainAllowed:false,mergeAllowed:false,historicalRuntimeReplayAllowed:false,newRuntimeOrdinalAllowed:false,stopRetry:false});

const executionProfile=JSON.parse(JSON.stringify(B.requestedExecutionProfile));const gate=JSON.parse(JSON.stringify(B.gate));
const identityMaterial={gateId:gate.id,gateContractVersion:gate.contractVersion,candidateArtifactId:candidate.artifactId,candidateArtifactDigest:candidate.artifactDigest,candidateSourceHead:candidate.sourceHead,ledgerRevision:targetLedger,packageRevision:targetPackage,executionProfile};
const freshDigest=crypto.createHash('sha256').update(JSON.stringify(identityMaterial)).digest('hex');
const freshBoundary={schemaVersion:'orbit360-f2-runtime-authorization-boundary-v1',boundaryId:'ORBIT360-F2-RUNTIME-AUTHORIZATION-BOUNDARY-CURRENT',status:'PREPARED_SOURCE_ONLY_AWAITING_EXPLICIT_USER_AUTHORIZATION',preparedAtUtc:now,repository:B.repository,branch:B.branch,pullRequest:B.pullRequest,authorized:false,authorizationPersisted:false,requestMaterialized:false,runtimeAllowed:false,gate,candidate,controlPlane:{stateVersion:L.stateVersion,ledgerRevision:targetLedger,packageRevision:targetPackage,packageStatus:pkg.status,controlPlaneClosure:pkg.controlPlaneClosure?.status||'CLOSED_PASS_RECONCILED'},requestedExecutionProfile:executionProfile,effectiveCapabilitiesUntilExplicitAuthorization:{secrets:false,firestoreRead:false,customTokenMint:false,browser:false,runtime:false,writes:false,deploy:false,production:false},authorizationIdentity:{algorithm:'sha256',digest:freshDigest,boundFields:['gateId','gateContractVersion','candidateArtifactId','candidateArtifactDigest','candidateSourceHead','ledgerRevision','packageRevision','executionProfile'],requestOrdinalHasOperationalSemantics:false,authorizationCarryForwardAllowed:false,historicalRequestBindingAllowed:false},materializationRules:{explicitUserAuthorizationRequired:true,authorizationMustBindIdentityDigest:true,preflightRequiredBeforeSecretAccess:true,preflightRequiredBeforeBrowser:true,runtimeRequestMayBeCreatedOnlyAfterAuthorization:true,oneShotOnly:true,replayAllowed:false,deployAllowed:false,productionAllowed:false,mainAllowed:false,mergeAllowed:false},lifecycleAtPreparation:{path:P.runtimeLife,currentPhase:'F2_RUNTIME_REOPENING_READY_AWAITING_EXPLICIT_AUTHORIZATION',activeRequest:false},previousTerminal:{authorizationRecordPath:authPath,requestPath,terminalEvidencePath:terminalPath,runtimeRunId:Number(req.runtimeRunId),classification:'FUNCTIONAL_DEFECT',replayAllowed:false},containsPII:false,containsSecrets:false};

L.activeState.phase=pkg.phase;L.activeState.status='F2_RUNTIME_AUTHORIZATION_NOT_YET_GRANTED';L.activeState.rootCauseStatus='FUNCTIONAL_DEFECT_POLIZAS_CLIENT_CELL_FIXED_SOURCE_ONLY_AWAITING_FRESH_AUTHORIZATION';L.activeState.productFrozen=true;L.activeState.dataFrozen=true;L.activeState.runtimeAuthorized=false;L.activeState.runtimeReplayAllowed=false;
Object.assign(L.authorizationBoundary,{activeRuntimeAuthorization:false,freshAuthorizationRequired:true,authorizationBlockedByHardeningPackage:false,authorizationCarryForwardForbidden:true,nextRuntimeMaterializationAllowed:false,newRuntimeRequestAllowed:false,deployAuthorized:false,publicationAuthorized:false,productionAuthorized:false,mainAuthorized:false,mergeAuthorized:false,boundaryPath:P.boundary,boundaryPrepared:true,authorizationIdentityRequired:true,historicalAuthorizationRecordPath:authPath,historicalRequestPath:requestPath,terminalEvidencePath:terminalPath,terminalRunId:Number(req.runtimeRunId),preparedAuthorizationIdentityDigest:freshDigest});delete L.authorizationBoundary.authorizationRecordPath;delete L.authorizationBoundary.activeRequestPath;
L.productionReopeningPackage={path:P.pkg,status:pkg.status,revision:targetPackage,firstIncompleteStep:'F2-RUNTIME-AUTHORIZATION',nextActionExact:'AWAIT_EXPLICIT_F2_RUNTIME_AUTHORIZATION_ONE_SHOT',runtimeAllowed:false,authorizationAllowed:true,requestMaterializationAllowed:false};L.nextAction={id:'AWAIT_EXPLICIT_F2_RUNTIME_AUTHORIZATION_ONE_SHOT',description:'Await one fresh explicit user authorization bound to the certified client-projection rootfix successor candidate.',runtimeAllowed:false};L.lanes.B_backend_security_gates='F2_FUNCTIONAL_ROOTFIX_CERTIFIED_AWAITING_FRESH_AUTHORIZATION';
pkg.authorizationBoundary={path:P.boundary,status:freshBoundary.status,ledgerRevision:targetLedger,packageRevision:targetPackage,authorizationIdentityDigest:freshDigest,authorized:false,authorizationPersisted:false,requestMaterialized:false,runtimeAllowed:false};

write(P.authority,A);write(P.registry,R);write(P.sourceLife,S);write(P.runtimeLife,RT);write(P.ledger,L);write(P.pkg,pkg);write(P.boundary,freshBoundary);
console.log(JSON.stringify({ok:true,status:'F2_FUNCTIONAL_DEFECT_SUCCESSOR_PROMOTED_SOURCE_ONLY',fromLedgerRevision:expectedLedger,toLedgerRevision:targetLedger,fromPackageRevision:expectedPackage,toPackageRevision:targetPackage,priorArtifactId:oldCandidate.artifactId,candidateArtifactId:candidate.artifactId,candidateSourceHead:candidate.sourceHead,authorizationIdentitySha256:freshDigest,authorizationGranted:false,requestMaterialized:false,runtimeAllowed:false,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,writes:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false},null,2));
