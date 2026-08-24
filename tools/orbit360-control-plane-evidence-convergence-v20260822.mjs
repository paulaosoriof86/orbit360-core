#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const args=process.argv.slice(2),val=f=>{const i=args.indexOf(f);return i>=0?args[i+1]:'';};
const prBodyFile=val('--pr-body-file'),repoOnly=args.includes('--repo-only');
const P={
 contract:'orbit360-platform/docs/orbit360-control-plane-canonicality-contract-v20260822.json',
 ledger:'orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json',
 pkg:'orbit360-platform/docs/orbit360-production-reopening-package-v20260820.json',
 boundary:'orbit360-platform/docs/orbit360-f2-runtime-authorization-boundary-v20260820.json',
 authority:'tools/orbit360-gate-contract-f2-productive-acceptance-v20260820.json',
 sourceLife:'tools/orbit360-validator-lifecycle-contract-f2-productive-acceptance-source-v20260819.json',
 runtimeLife:'tools/orbit360-validator-lifecycle-contract-f2-productive-acceptance-runtime-v20260819.json',
 live:'orbit360-platform/docs/orbit360-live-state-v1.json',
 index:'orbit360-platform/docs/ORBIT360-CURRENT-DOCUMENTATION-INDEX-v1.json',
 prState:'orbit360-platform/docs/ORBIT360-PR5-CURRENT-STATE.md',
 checkpoint:'orbit360-platform/docs/CHECKPOINT-CONTROL-PLANE-HARDENING-20260820.md',
 readme:'README.md',
 changelog:'orbit360-platform/CHANGELOG.md',
 pointer:'.github/orbit360-requests/macro2-canonical-source-activation-pointer-v20260821.json',
 workflow:'.github/workflows/orbit360-continuity-canonical-source-only-v20260820.yml',
 owner:'tools/orbit360-continuity-transition-owner-v20260820.mjs',
 projection:'tools/orbit360-continuity-projection-atomic-v20260820.mjs',
 noRewrite:'tools/orbit360-control-plane-no-source-rewrite-guard-v20260824.mjs'
};
const A=p=>path.join(ROOT,p),exists=p=>fs.existsSync(A(p)),txt=p=>fs.readFileSync(A(p),'utf8').replace(/^\uFEFF/,''),J=p=>JSON.parse(txt(p));
const sha=s=>crypto.createHash('sha256').update(String(s)).digest('hex');
const same=(a,b)=>Number(a?.artifactId)===Number(b?.artifactId)&&a?.sourceHead===b?.sourceHead&&String(a?.artifactDigest||a?.digest||'')===String(b?.artifactDigest||b?.digest||'');
const failures=[],need=(v,id)=>{if(!v)failures.push(id);};
for(const p of Object.values(P))need(exists(p),`MISSING:${p}`);
if(failures.length){console.log(JSON.stringify({ok:false,status:'CONTROL_PLANE_EVIDENCE_CONVERGENCE_FAIL',classification:'PIPELINE_MECHANISM_FAILURE',failures,repairable:false},null,2));process.exit(41);}

const C=J(P.contract),L=J(P.ledger),pkg=J(P.pkg),B=J(P.boundary),G=J(P.authority),SL=J(P.sourceLife),RL=J(P.runtimeLife),live=J(P.live),idx=J(P.index),ptr=J(P.pointer);
const metadataPath=String(G.candidateCertificationEvidence||'').trim();
need(Boolean(metadataPath)&&exists(metadataPath),'DURABLE_METADATA_POINTER_MISSING');
const M=metadataPath&&exists(metadataPath)?J(metadataPath):{};
const cand=L.successorCandidate||{};
const authActive=Boolean(L.authorizationBoundary?.activeRuntimeAuthorization);
const activeRequestPath=L.authorizationBoundary?.activeRequestPath||null;
const requestActive=Boolean(activeRequestPath);
const authorizationRecordPath=L.authorizationBoundary?.authorizationRecordPath||null;
const authorizationPersisted=Boolean(authorizationRecordPath);
const runtimeAllowed=Boolean(L.activeState?.runtimeAuthorized);
const attemptAccepted=Boolean(L.authorizationBoundary?.runtimeAttemptAccepted);
const runtimeRunId=L.authorizationBoundary?.runtimeRunId==null?null:Number(L.authorizationBoundary.runtimeRunId);
const stateCore={stateVersion:L.stateVersion,ledgerRevision:L.revision,packageRevision:L.productionReopeningPackage?.revision,phase:L.activeState?.phase,status:L.activeState?.status,nextAction:L.nextAction?.id,artifactId:cand.artifactId,artifactDigest:cand.artifactDigest,sourceHead:cand.sourceHead,progress:L.progress?.productionRouteProgressPct};
const fingerprint=sha(JSON.stringify(stateCore));
const expectedFirst=L.productionReopeningPackage?.firstIncompleteStep;
const expectedNext=L.nextAction?.id;

const mf=Number(M.fileCount),md=Number(M.deltaCount),mu=Number(M.unchangedFileCount),mc=Number(M.checksPassed);
const metadataCounts=Number.isInteger(mf)&&mf>0&&Number.isInteger(md)&&md>=0&&md<=mf&&mu===mf-md&&Number.isInteger(mc)&&mc>0;
const metadataSafe=M.status==='CANDIDATE_ARTIFACT_PUBLISHED_SOURCE_ONLY'&&M.sourcePublished===true&&metadataCounts&&M.runtimeExecuted===false&&M.browserExecuted===false&&M.secretAccess===false&&M.firestoreRead===false&&Number(M.writes)===0&&M.deployExecuted===false&&M.productionTouched===false;
let sourceAncestor=false;try{if(M.sourceHead)execFileSync('git',['merge-base','--is-ancestor',M.sourceHead,'HEAD'],{cwd:ROOT,stdio:'ignore'});sourceAncestor=Boolean(M.sourceHead);}catch{}
const ledgerFresh=same(cand,{artifactId:M.artifactId,artifactDigest:M.artifactDigest,sourceHead:M.sourceHead});
const pointerSafe=ptr.status==='IDLE'&&ptr.mode==='IDLE'&&Number(ptr.allowedExecutions)===0&&ptr.replayAllowed===false&&ptr.reopenAllowed===false&&ptr.macro2Closed===true;

need(C.status==='ACTIVE_CANONICAL_CONVERGENCE_CONTRACT','CONTRACT_NOT_ACTIVE');
need(C.singleMutableOperationalState===P.ledger,'LEDGER_AUTHORITY_CONTRACT');
need(metadataSafe,'DURABLE_METADATA_UNSAFE');need(sourceAncestor,'DURABLE_SOURCE_NOT_ANCESTOR');need(ledgerFresh,'LEDGER_NOT_REDUCED_DURABLE_CANDIDATE');need(pointerSafe,'POINTER_NOT_INERT');
need(L.continuityControl?.evidenceFreshnessValidated===true,'LEDGER_EVIDENCE_FRESHNESS_FLAG');
need(L.activeState?.runtimeReplayAllowed===false,'LEDGER_RUNTIME_REPLAY_OPEN');
need(L.activeState?.deployAuthorized===false&&L.activeState?.productionAuthorized===false,'LEDGER_FORBIDDEN_CAPABILITY_OPEN');

need(Number(pkg.revision)===Number(L.productionReopeningPackage?.revision),'PACKAGE_REVISION');
need(same(pkg.candidate,cand),'PACKAGE_CANDIDATE');
need(pkg.phase===L.activeState?.phase,'PACKAGE_PHASE');
need(pkg.resumeProtocol?.firstIncompleteStep===expectedFirst,'PACKAGE_STEP');
need(pkg.resumeProtocol?.nextActionExact===expectedNext,'PACKAGE_NEXT');
need(pkg.lock?.writesAllowed===false&&pkg.lock?.deployAllowed===false&&pkg.lock?.productionAllowed===false&&pkg.lock?.mainAllowed===false&&pkg.lock?.mergeAllowed===false,'PACKAGE_FORBIDDEN_CAPABILITY_OPEN');
need(Boolean(pkg.lock?.runtimeAllowed)===runtimeAllowed,'PACKAGE_RUNTIME_DERIVATION');

need(Number(B.controlPlane?.ledgerRevision)===Number(L.revision)&&Number(B.controlPlane?.packageRevision)===Number(pkg.revision),'BOUNDARY_REVISION');
need(same(B.candidate,cand),'BOUNDARY_CANDIDATE');
need(Boolean(B.authorized)===authActive,'BOUNDARY_AUTH_DERIVATION');
need(Boolean(B.authorizationPersisted)===authorizationPersisted,'BOUNDARY_AUTH_PERSIST_DERIVATION');
need(Boolean(B.requestMaterialized)===requestActive,'BOUNDARY_REQUEST_DERIVATION');
need(Boolean(B.runtimeAllowed)===runtimeAllowed,'BOUNDARY_RUNTIME_DERIVATION');
need((B.activeRequestPath||null)===activeRequestPath,'BOUNDARY_ACTIVE_REQUEST_PATH');
need((B.authorizationRecordPath||null)===authorizationRecordPath,'BOUNDARY_AUTH_RECORD_PATH');

need(same(G.candidate,cand),'AUTHORITY_CANDIDATE');
need((G.requestBinding?.activeRequest||null)===activeRequestPath,'AUTHORITY_ACTIVE_REQUEST');
need(Boolean(G.capabilityLockWhilePackageOpen?.runtime)===runtimeAllowed,'AUTHORITY_RUNTIME_DERIVATION');
need(G.capabilityLockWhilePackageOpen?.writes===false&&G.capabilityLockWhilePackageOpen?.deploy===false&&G.capabilityLockWhilePackageOpen?.production===false,'AUTHORITY_FORBIDDEN_CAPABILITY_OPEN');

need(Number(SL.guards?.candidateArtifactId)===Number(cand.artifactId)&&SL.guards?.candidateSourceHead===cand.sourceHead,'SOURCE_LIFECYCLE_CANDIDATE');
need(SL.currentPhase===L.activeState?.phase&&SL.status===L.activeState?.status,'SOURCE_LIFECYCLE_STATE');
need(Number(RL.guards?.successorCandidateArtifactId)===Number(cand.artifactId)&&RL.guards?.successorCandidateSourceHead===cand.sourceHead,'RUNTIME_LIFECYCLE_CANDIDATE');
need(RL.currentPhase===L.activeState?.phase&&RL.status===L.activeState?.status,'RUNTIME_LIFECYCLE_STATE');
need(Boolean(RL.authorization?.activeRequest)===requestActive,'RUNTIME_LIFECYCLE_REQUEST_DERIVATION');
need(RL.authorization?.replayAllowed===false,'RUNTIME_LIFECYCLE_REPLAY_OPEN');

need(live.canonicalStateFingerprint===fingerprint&&Number(live.canonicalCurrent?.artifactId)===Number(cand.artifactId),'LIVE_FINGERPRINT');
need(idx.canonicalStateFingerprint===fingerprint&&Number(idx.operationalCurrent?.artifactId)===Number(cand.artifactId),'INDEX_FINGERPRINT');
for(const p of [P.prState,P.checkpoint,P.readme,P.changelog])need(txt(p).includes(`CANONICAL_STATE_FINGERPRINT: ${fingerprint}`),`DOCUMENT_FINGERPRINT:${p}`);

const wf=txt(P.workflow),owner=txt(P.owner),projection=txt(P.projection);
need(wf.includes('CONTROL_PLANE_CONVERGENCE_V1')&&wf.includes('GENERIC_INTENT_ROUTER_V1'),'WORKFLOW_CONVERGENCE_CONTRACT');
need(!wf.includes('workflow_run:'),'WORKFLOW_RUN_CHAINING_FORBIDDEN');
need(!wf.includes('/dispatches'),'WORKFLOW_DISPATCH_CHAINING_FORBIDDEN');
need(!wf.includes('git pull --rebase'),'WORKFLOW_REBASE_FORBIDDEN');
need(owner.includes("transition==='F2_RUNTIME_TERMINAL_RECONCILE_GENERIC'")&&owner.includes("transition==='F2_RUNTIME_ATTEMPT_ACCEPT'"),'OWNER_MACRO3_TRANSITIONS_MISSING');
need(!/W\(P\.ledger\b/.test(projection),'PROJECTION_MAY_NOT_MUTATE_LEDGER');
try{execFileSync(process.execPath,[A(P.noRewrite)],{cwd:ROOT,stdio:'ignore'});}catch{need(false,'ACTIVE_SOURCE_REWRITE_GUARD_FAIL');}

if(authActive){need(authorizationPersisted,'ACTIVE_AUTH_WITHOUT_RECORD');need(authorizationRecordPath&&exists(authorizationRecordPath),'ACTIVE_AUTH_RECORD_MISSING');}
if(requestActive){need(authActive&&authorizationPersisted,'ACTIVE_REQUEST_WITHOUT_AUTH');need(activeRequestPath&&exists(activeRequestPath),'ACTIVE_REQUEST_FILE_MISSING');}
if(attemptAccepted){
  need(authActive&&requestActive,'ATTEMPT_ACCEPT_WITHOUT_ACTIVE_BINDINGS');
  need(Number.isInteger(runtimeRunId)&&runtimeRunId>0,'ATTEMPT_ACCEPT_RUN_ID_MISSING');
  const req=J(activeRequestPath),auth=J(authorizationRecordPath);
  need(req.runtimeAttemptAccepted===true&&auth.runtimeAttemptAccepted===true,'ATTEMPT_ACCEPT_RECORD_DRIFT');
  need(Number(req.runtimeRunId)===runtimeRunId&&Number(auth.runtimeRunId)===runtimeRunId,'ATTEMPT_RUN_ID_DRIFT');
  need(req.allowedExecutions===0&&auth.allowedExecutions===0,'ATTEMPT_BUDGET_NOT_ZERO');
  need(req.replayAllowed===false&&auth.replayAllowed===false,'ATTEMPT_REPLAY_OPEN');
}
if(!authActive)need(!requestActive&&!authorizationPersisted&&!attemptAccepted,'INERT_BOUNDARY_HAS_ACTIVE_BINDING');

if(prBodyFile){
  const body=fs.readFileSync(prBodyFile,'utf8');
  need(body.includes(`CANONICAL_STATE_FINGERPRINT: ${fingerprint}`),'ACTUAL_PR_BODY_FINGERPRINT');
  need(body.includes(String(cand.artifactId))&&body.includes(cand.sourceHead),'ACTUAL_PR_BODY_CANDIDATE');
  need(body.includes(`${L.progress.productionRouteProgressPct}%`),'ACTUAL_PR_BODY_PROGRESS');
}else if(!repoOnly)need(false,'ACTUAL_PR_BODY_NOT_VALIDATED');

const out={schemaVersion:'orbit360-control-plane-evidence-convergence-v3-direct',ok:failures.length===0,status:failures.length?'CONTROL_PLANE_EVIDENCE_CONVERGENCE_FAIL':'CONTROL_PLANE_EVIDENCE_CONVERGENCE_PASS',classification:failures.length?'PIPELINE_MECHANISM_FAILURE':'PASS',failures:[...new Set(failures)],repairable:false,stateFingerprint:fingerprint,ledgerRevision:L.revision,packageRevision:pkg.revision,phase:L.activeState?.phase,statusCurrent:L.activeState?.status,nextAction:expectedNext,firstIncompleteStep:expectedFirst,candidateArtifactId:cand.artifactId,candidateSourceHead:cand.sourceHead,candidateCertificationEvidence:metadataPath,productionRouteProgressPct:L.progress?.productionRouteProgressPct,authorized:authActive,authorizationPersisted,requestMaterialized:requestActive,runtimeAttemptAccepted:attemptAccepted,runtimeRunId,runtimeAllowed,prBodyValidated:Boolean(prBodyFile)&&failures.length===0,noSourceRewriteGuard:true,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,writes:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
console.log(JSON.stringify(out,null,2));if(!out.ok)process.exit(41);
