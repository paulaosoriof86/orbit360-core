#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
const J=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const T=p=>fs.readFileSync(p,'utf8');
const P={ledger:'orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json',pkg:'orbit360-platform/docs/orbit360-production-reopening-package-v20260820.json',boundary:'orbit360-platform/docs/orbit360-f2-runtime-authorization-boundary-v20260820.json',writer:'orbit360-platform/docs/orbit360-continuity-writer-registry-v20260820.json',authority:'tools/orbit360-gate-contract-f2-productive-acceptance-v20260820.json',life:'tools/orbit360-validator-lifecycle-contract-f2-productive-acceptance-runtime-v20260819.json',workflow:'.github/workflows/orbit360-continuity-canonical-source-only-v20260820.yml'};
const L=J(P.ledger),pkg=J(P.pkg),B=J(P.boundary),W=J(P.writer),G=J(P.authority),life=J(P.life),wf=T(P.workflow),failed=[];const c=(v,id)=>{if(!v)failed.push(id);};
const same=(a,b)=>Number(a?.artifactId)===Number(b?.artifactId)&&a?.sourceHead===b?.sourceHead&&a?.artifactDigest===b?.artifactDigest;
c(L.repository===pkg.repository&&L.branch===pkg.branch&&L.pullRequest===pkg.pullRequest,'REPO_BINDING');
c(L.productionReopeningPackage?.revision===pkg.revision,'LEDGER_PACKAGE_REVISION');
c(L.productionReopeningPackage?.firstIncompleteStep===pkg.resumeProtocol?.firstIncompleteStep,'LEDGER_PACKAGE_STEP');
c(L.productionReopeningPackage?.nextActionExact===pkg.resumeProtocol?.nextActionExact,'LEDGER_PACKAGE_NEXT');
c(L.nextAction?.id===pkg.resumeProtocol?.nextActionExact,'LEDGER_NEXT_ACTION');
c(B.controlPlane?.ledgerRevision===L.revision&&B.controlPlane?.packageRevision===pkg.revision,'BOUNDARY_REVISION');
c(same(L.successorCandidate,pkg.candidate)&&same(L.successorCandidate,G.candidate),'CANDIDATE_SINGLE_AUTHORITY');
c(W.transitionOwner==='tools/orbit360-continuity-transition-owner-v20260820.mjs','TRANSITION_OWNER');
c(W.soleProjectionLogic==='tools/orbit360-continuity-projection-atomic-v20260820.mjs','PROJECTION_OWNER');
c(W.canonicalWorkflow===P.workflow,'CANONICAL_WORKFLOW');
c(/contents:\s*write/i.test(wf),'CANONICAL_WRITER_PERMISSION');
c(!/git\s+pull\s+--rebase/i.test(wf),'NO_CANONICAL_PULL_REBASE');
const activeText=JSON.stringify({activeState:L.activeState,authorizationBoundary:L.authorizationBoundary,productionReopeningPackage:L.productionReopeningPackage,nextAction:L.nextAction});
c(!/Request\d+/i.test(activeText),'ACTIVE_REQUEST_ORDINAL_FREE');
c(!activeText.includes('9387820198')&&!activeText.includes('9395391426'),'ACTIVE_HISTORICAL_ARTIFACT_FREE');
c(Boolean(B.authorized)===Boolean(L.authorizationBoundary?.activeRuntimeAuthorization),'AUTH_ACTIVE_DERIVATION');
c(Boolean(B.requestMaterialized)===Boolean(L.authorizationBoundary?.activeRequestPath),'REQUEST_ACTIVE_DERIVATION');
c(B.runtimeAllowed===false,'RUNTIME_FAIL_CLOSED');
c(B.materializationRules?.replayAllowed===false,'REPLAY_FORBIDDEN');
c(life.status===L.activeState.status&&life.currentPhase===L.activeState.phase&&life.nextActionExact===L.nextAction.id,'LIFECYCLE_DERIVED_STATE');
c(Number(life.guards?.successorCandidateArtifactId)===Number(L.successorCandidate.artifactId)&&life.guards?.successorCandidateSourceHead===L.successorCandidate.sourceHead,'LIFECYCLE_CANDIDATE');
const latest=L.history?.latestSealedConsumedRuntime;if(latest&&latest.conclusion==='failure'){c(latest.allowedExecutions===0&&latest.consumed===true&&latest.replayAllowed===false,'LATEST_TERMINAL_SEALED');c(pkg.lock?.stopRetry===true,'STOP_RETRY_ENFORCED');c(pkg.rootCause?.macro2MaterializationMechanism?.sameStageRetryBudgetRemaining===0,'RETRY_BUDGET_ZERO');}
if(L.activeState.status==='CONTROL_PLANE_DEFINITIVE_PASS'){
 c(pkg.status==='CLOSED_PASS'&&pkg.controlPlaneClosure?.status==='CONTROL_PLANE_DEFINITIVE_PASS','DEFINITIVE_PACKAGE_PASS');
 c(B.authorized===false&&B.authorizationPersisted===false&&B.requestMaterialized===false&&B.runtimeAllowed===false,'DEFINITIVE_BOUNDARY_INERT');
 c(L.continuityControl?.physicalSingleWriterEnforced===true&&L.continuityControl?.terminalReducerGeneric===true&&L.continuityControl?.stopRetryMechanicallyEnforced===true,'DEFINITIVE_MECHANISM_FLAGS');
 c(Number(L.progress?.productionRouteProgressPct)===62,'DEFINITIVE_PROGRESS_62');
 c(pkg.resumeProtocol?.firstIncompleteStep==='MACRO2-TRANSVERSAL-SOURCE-ACCEPTANCE','DEFINITIVE_NEXT_MACRO2');
}
const out={schemaVersion:'orbit360-control-plane-composite-invariant-v2',ok:failed.length===0,status:failed.length?'CONTROL_PLANE_COMPOSITE_INVARIANT_FAIL':'CONTROL_PLANE_COMPOSITE_INVARIANT_PASS',failed,phase:L.activeState.phase,activeStatus:L.activeState.status,ledgerRevision:L.revision,packageRevision:pkg.revision,candidateArtifactId:L.successorCandidate.artifactId,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};console.log(JSON.stringify(out,null,2));if(!out.ok)process.exit(41);
