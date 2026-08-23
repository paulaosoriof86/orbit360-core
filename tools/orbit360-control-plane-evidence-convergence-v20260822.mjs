#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const args=process.argv.slice(2);
const val=f=>{const i=args.indexOf(f);return i>=0?args[i+1]:'';};
const prBodyFile=val('--pr-body-file');
const repoOnly=args.includes('--repo-only');
const P={
 contract:'orbit360-platform/docs/orbit360-control-plane-canonicality-contract-v20260822.json',
 audit:'orbit360-platform/runtime-gate-crm-v20260716/control-plane-canonicality-convergence-audit-v20260822.json',
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
 metadata:'orbit360-platform/runtime-gate-crm-v20260716/macro2-candidate-artifact-metadata-v20260821.json',
 workflow:'.github/workflows/orbit360-continuity-canonical-source-only-v20260820.yml',
 preflight:'tools/orbit360-macro2-pipeline-preflight-v20260821.mjs',
 promoter:'tools/orbit360-promote-macro2-transversal-candidate-v20260821.mjs'
};
const A=p=>path.join(ROOT,p);const exists=p=>fs.existsSync(A(p));
const txt=p=>fs.readFileSync(A(p),'utf8').replace(/^\uFEFF/,'');
const J=p=>JSON.parse(txt(p));
const sha=s=>crypto.createHash('sha256').update(String(s)).digest('hex');
const same=(a,b)=>Number(a?.artifactId)===Number(b?.artifactId)&&a?.sourceHead===b?.sourceHead&&String(a?.artifactDigest||a?.digest||'')===String(b?.artifactDigest||b?.digest||'');
const failures=[];const c=(v,id)=>{if(!v)failures.push(id);};
for(const p of Object.values(P)) if(!['prBodyFile'].includes(p)) c(exists(p),`MISSING:${p}`);
if(failures.length){console.log(JSON.stringify({ok:false,status:'CONTROL_PLANE_EVIDENCE_CONVERGENCE_FAIL',failures,repairable:false},null,2));process.exit(41);}
const C=J(P.contract),A0=J(P.audit),L=J(P.ledger),pkg=J(P.pkg),B=J(P.boundary),G=J(P.authority),SL=J(P.sourceLife),RL=J(P.runtimeLife),live=J(P.live),idx=J(P.index),ptr=J(P.pointer),M=J(P.metadata);
const workflow=txt(P.workflow),preflight=txt(P.preflight),promoter=txt(P.promoter);
const cand=L.successorCandidate||{};
const stateCore={stateVersion:L.stateVersion,ledgerRevision:L.revision,packageRevision:L.productionReopeningPackage?.revision,phase:L.activeState?.phase,status:L.activeState?.status,nextAction:L.nextAction?.id,artifactId:cand.artifactId,artifactDigest:cand.artifactDigest,sourceHead:cand.sourceHead,progress:L.progress?.productionRouteProgressPct};
const fingerprint=sha(JSON.stringify(stateCore));
const metadataSafe=M.status==='CANDIDATE_ARTIFACT_PUBLISHED_SOURCE_ONLY'&&M.sourcePublished===true&&M.fileCount===194&&M.deltaCount===9&&M.unchangedFileCount===185&&M.runtimeExecuted===false&&M.browserExecuted===false&&M.secretAccess===false&&M.firestoreRead===false&&Number(M.writes)===0&&M.deployExecuted===false&&M.productionTouched===false;
let sourceAncestor=false;try{execFileSync('git',['merge-base','--is-ancestor',M.sourceHead,'HEAD'],{cwd:ROOT,stdio:'ignore'});sourceAncestor=true;}catch{}
const ledgerFresh=same(cand,{artifactId:M.artifactId,artifactDigest:M.artifactDigest,sourceHead:M.sourceHead});
const pointerSafe=(ptr.status==='IDLE'&&ptr.mode==='IDLE'&&Number(ptr.allowedExecutions)===0&&ptr.replayAllowed===false&&ptr.reopenAllowed===false);
const repairable=!ledgerFresh&&metadataSafe&&sourceAncestor&&pointerSafe&&A0.status==='CONTROL_PLANE_CANONICALITY_CONVERGENCE_FAIL'&&A0.rootCause?.code==='STALE_LEDGER_CAN_PASS_SELF_CONSISTENCY_WITHOUT_DURABLE_EVIDENCE_FRESHNESS';
if(!ledgerFresh){
  const out={schemaVersion:'orbit360-control-plane-evidence-convergence-v1',ok:false,status:'CONTROL_PLANE_EVIDENCE_CONVERGENCE_FAIL',failures:['LEDGER_NOT_REDUCED_DURABLE_CANDIDATE'],repairable,repairReason:repairable?'DURABLE_CANDIDATE_SAFE_FOR_CANONICAL_OWNER_REDUCTION':'UNSAFE_OR_AMBIGUOUS_STALE_LEDGER',durableCandidate:{artifactId:M.artifactId,sourceHead:M.sourceHead,artifactDigest:M.artifactDigest,runId:M.runId},ledgerCandidate:{artifactId:cand.artifactId,sourceHead:cand.sourceHead,artifactDigest:cand.artifactDigest},stateFingerprint:fingerprint,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,writes:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
  console.log(JSON.stringify(out,null,2));process.exit(41);
}

c(C.status==='ACTIVE_CANONICAL_CONVERGENCE_CONTRACT','CONTRACT_NOT_ACTIVE');
c(C.singleMutableOperationalState===P.ledger,'LEDGER_AUTHORITY_CONTRACT');
c(metadataSafe,'DURABLE_METADATA_UNSAFE');c(sourceAncestor,'DURABLE_SOURCE_NOT_ANCESTOR');c(pointerSafe,'POINTER_NOT_INERT');
c(L.continuityControl?.evidenceFreshnessValidated===true,'LEDGER_EVIDENCE_FRESHNESS_FLAG');
c(L.continuityControl?.canonicalityConvergenceVersion==='v1-20260822','LEDGER_CONVERGENCE_VERSION');
c(Number(L.progress?.productionRouteProgressPct)>=75,'LEDGER_PROGRESS_NOT_PROMOTED');
c(L.activeState?.status==='TRANSVERSAL_SOURCE_ACCEPTANCE_PASS','LEDGER_MACRO2_STATUS');
c(L.productionReopeningPackage?.firstIncompleteStep==='F2-RUNTIME-AUTHORIZATION','LEDGER_NEXT_STEP');
c(L.nextAction?.id==='AWAIT_EXPLICIT_F2_RUNTIME_AUTHORIZATION_ONE_SHOT','LEDGER_NEXT_ACTION');
c(Number(pkg.revision)===Number(L.productionReopeningPackage?.revision),'PACKAGE_REVISION');c(same(pkg.candidate,cand),'PACKAGE_CANDIDATE');c(pkg.phase===L.activeState.phase,'PACKAGE_PHASE');c(pkg.resumeProtocol?.firstIncompleteStep===L.productionReopeningPackage?.firstIncompleteStep,'PACKAGE_STEP');c(pkg.resumeProtocol?.nextActionExact===L.nextAction?.id,'PACKAGE_NEXT');
c(Number(B.controlPlane?.ledgerRevision)===Number(L.revision)&&Number(B.controlPlane?.packageRevision)===Number(pkg.revision),'BOUNDARY_REVISION');c(same(B.candidate,cand),'BOUNDARY_CANDIDATE');c(B.authorized===false&&B.authorizationPersisted===false&&B.requestMaterialized===false&&B.runtimeAllowed===false,'BOUNDARY_NOT_INERT');
c(same(G.candidate,cand),'AUTHORITY_CANDIDATE');c(G.requestBinding?.activeRequest==null,'AUTHORITY_ACTIVE_REQUEST');
c(Number(SL.guards?.candidateArtifactId)===Number(cand.artifactId)&&SL.guards?.candidateSourceHead===cand.sourceHead,'SOURCE_LIFECYCLE_CANDIDATE');c(SL.currentPhase===L.activeState.phase&&SL.status===L.activeState.status,'SOURCE_LIFECYCLE_STATE');
c(Number(RL.guards?.successorCandidateArtifactId)===Number(cand.artifactId)&&RL.guards?.successorCandidateSourceHead===cand.sourceHead,'RUNTIME_LIFECYCLE_CANDIDATE');c(RL.currentPhase===L.activeState.phase&&RL.status===L.activeState.status,'RUNTIME_LIFECYCLE_STATE');
c(live.canonicalStateFingerprint===fingerprint&&live.canonicalCurrent?.artifactId===cand.artifactId,'LIVE_FINGERPRINT');c(idx.canonicalStateFingerprint===fingerprint&&idx.operationalCurrent?.artifactId===cand.artifactId,'INDEX_FINGERPRINT');
for(const p of [P.prState,P.checkpoint,P.readme,P.changelog]) c(txt(p).includes(`CANONICAL_STATE_FINGERPRINT: ${fingerprint}`),`DOCUMENT_FINGERPRINT:${p}`);
c(workflow.includes('CONTROL_PLANE_CONVERGENCE_V1')&&workflow.includes('CONTROL_PLANE_EVIDENCE_CONVERGENCE_PASS'),'WORKFLOW_CONVERGENCE_CONTRACT');
c(preflight.includes('CONTROL_PLANE_CONVERGENCE_V1'),'PREFLIGHT_CONVERGENCE_CONTRACT');
c(promoter.includes('PROMOTER_STATE_MUTATION_FORBIDDEN')&&!promoter.includes("req.status==='MATERIALIZED_SOURCE_ONLY'"),'PROMOTER_STALE_STATE_MUTATION');
c(!/L\.revision\s*===\s*29|pkg\.revision\s*===\s*23/.test(promoter),'PROMOTER_STALE_REVISION_LITERAL');
c(!workflow.includes("git pull --rebase"),'WORKFLOW_REBASE_FORBIDDEN');
c(!txt(P.prState).match(/HEAD can[oó]nico:\s*`[a-f0-9]{40}`/i),'PERSISTED_BRANCH_HEAD_FORBIDDEN');
// Logical single-owner audit over the active control-plane surface. Historical/inactive tools are not operational owners.
const activeToolPaths=[
  'tools/orbit360-continuity-transition-owner-v20260820.mjs',
  'tools/orbit360-continuity-projection-atomic-v20260820.mjs',
  'tools/orbit360-control-plane-composite-invariant-v20260820.mjs',
  'tools/orbit360-control-plane-independent-readback-v20260820.mjs',
  'tools/orbit360-documentation-state-discovery-v20260821.mjs',
  'tools/orbit360-macro2-pipeline-preflight-v20260821.mjs',
  'tools/orbit360-promote-macro2-transversal-candidate-v20260821.mjs',
  'tools/orbit360-control-plane-evidence-convergence-v20260822.mjs'
];
const logicalOffenders=[];for(const rel of activeToolPaths){const t=txt(rel);const mentionsState=t.includes(P.ledger)||t.includes(P.pkg)||t.includes(P.boundary)||t.includes(P.authority)||t.includes(P.sourceLife)||t.includes(P.runtimeLife);const mutates=/writeFileSync|renameSync|\.writeFile\b/.test(t);if(mentionsState&&mutates&&!['tools/orbit360-continuity-transition-owner-v20260820.mjs','tools/orbit360-continuity-projection-atomic-v20260820.mjs'].includes(rel))logicalOffenders.push(rel);}
c(logicalOffenders.length===0,'UNAUTHORIZED_LOGICAL_STATE_MUTATOR:'+logicalOffenders.join(','));
const projectionText=txt('tools/orbit360-continuity-projection-atomic-v20260820.mjs');
c(!/W\(P\.ledger/.test(projectionText),'PROJECTION_MAY_NOT_MUTATE_LEDGER');
if(prBodyFile){const body=fs.readFileSync(prBodyFile,'utf8');c(body.includes(`CANONICAL_STATE_FINGERPRINT: ${fingerprint}`),'ACTUAL_PR_BODY_FINGERPRINT');c(body.includes(String(cand.artifactId))&&body.includes(cand.sourceHead),'ACTUAL_PR_BODY_CANDIDATE');c(body.includes(`${L.progress.productionRouteProgressPct}%`),'ACTUAL_PR_BODY_PROGRESS');}
else if(!repoOnly)c(false,'ACTUAL_PR_BODY_NOT_VALIDATED');
const out={schemaVersion:'orbit360-control-plane-evidence-convergence-v1',ok:failures.length===0,status:failures.length?'CONTROL_PLANE_EVIDENCE_CONVERGENCE_FAIL':'CONTROL_PLANE_EVIDENCE_CONVERGENCE_PASS',failures,repairable:false,stateFingerprint:fingerprint,ledgerRevision:L.revision,packageRevision:pkg.revision,candidateArtifactId:cand.artifactId,candidateSourceHead:cand.sourceHead,productionRouteProgressPct:L.progress.productionRouteProgressPct,prBodyValidated:Boolean(prBodyFile),runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,writes:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
console.log(JSON.stringify(out,null,2));if(!out.ok)process.exit(41);
