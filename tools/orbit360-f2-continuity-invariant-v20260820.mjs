#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const a=p=>path.join(ROOT,p);
const txt=p=>fs.readFileSync(a(p),'utf8').replace(/^\uFEFF/,'');
const json=p=>JSON.parse(txt(p));
const exists=p=>typeof p==='string'&&p.length>0&&fs.existsSync(a(p));
const LPATH='orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json';
const LIVE='orbit360-platform/docs/orbit360-live-state-v1.json';
const INDEX='orbit360-platform/docs/ORBIT360-CURRENT-DOCUMENTATION-INDEX-v1.json';
const LIFE='tools/orbit360-validator-lifecycle-contract-f2-productive-acceptance-runtime-v20260819.json';
const README='README.md';
const CHANGELOG='orbit360-platform/CHANGELOG.md';
const OUT=a(process.env.ORBIT360_CONTINUITY_OUT||'orbit360-platform/runtime-gate-crm-v20260716/f2-continuity-audit-v20260820.json');
const prFile=String(process.env.ORBIT360_PR_BODY_FILE||'').trim();
const requirePr=String(process.env.ORBIT360_CONTINUITY_REQUIRE_PR||'false')==='true';

const L=json(LPATH),R=json(L.currentRuntime.requestPath),A=json(L.currentRuntime.authorizationPath),live=json(LIVE),idx=json(INDEX),life=json(LIFE);
const readme=txt(README),change=txt(CHANGELOG),checkpoint=txt(L.checkpoint),academia=txt(L.academiaUpdate),pr=prFile&&fs.existsSync(prFile)?fs.readFileSync(prFile,'utf8'):'';
const sv=L.stateVersion,run=L.currentRuntime.runId,ord=L.currentRuntime.requestOrdinal,artifact=L.frozenCandidate.artifactId,root=L.currentRootCause||{};
const current=o=>o?.canonicalCurrent?.stateVersion===sv&&o?.canonicalCurrent?.currentRuntime?.requestOrdinal===ord&&o?.canonicalCurrent?.currentRuntime?.runId===run&&o?.canonicalCurrent?.currentRootCause?.status===root.status;
const noStale=s=>!s.includes('No Request12 has been materialized')&&!s.includes('REQUEST11_AUTHORIZED_PENDING_MATERIALIZATION')&&!s.includes('MATERIALIZE_REQUEST11_FROM_PERSISTED_AUTHORIZATION_ON_EXACT_CURRENT_HEAD');
const rootClosed=root.rootCauseConcluded===true;
const causal=rootClosed&&exists(root.causalProofPath)?json(root.causalProofPath):null;
const rootfix=rootClosed&&exists(root.rootfixEvidencePath)?json(root.rootfixEvidencePath):null;

const checks={
  ledgerSchema:L.schemaVersion==='orbit360-continuity-ledger-v1',
  ledgerBoundary:L.repository==='paulaosoriof86/orbit360-core'&&L.branch==='ays/backend-tenant-lab-v99-20260703'&&L.pullRequest===5,
  requestSealed:R.requestOrdinal===ord&&R.allowedExecutions===0&&R.consumed===true&&R.replayAllowed===false&&R.runtimeRunId===run,
  authorizationSealed:A.requestOrdinal===ord&&A.allowedExecutions===0&&A.consumed===true&&A.replayAllowed===false&&A.runtimeRunId===run,
  evidenceBinding:R.evidenceArtifactId===L.currentRuntime.evidenceArtifactId&&A.evidenceArtifactId===L.currentRuntime.evidenceArtifactId&&R.evidenceArtifactDigest===L.currentRuntime.evidenceArtifactDigest&&A.evidenceArtifactDigest===L.currentRuntime.evidenceArtifactDigest,
  liveCanonical:current(live),
  indexCanonical:current(idx),
  liveCheckpoint:live.currentCheckpoint===L.checkpoint&&live.documentationControl?.canonicalStateVersion===sv,
  indexCheckpoint:idx.currentCheckpoint===L.checkpoint&&idx.operationalCurrent?.currentCheckpoint===L.checkpoint,
  liveAuthorization:live.authorization?.currentRuntimeRequestOrdinal===ord&&live.authorization?.currentRunId===run&&live.authorization?.allowedExecutions===0&&live.authorization?.consumed===true&&live.authorization?.replayAllowed===false&&live.authorization?.request13Authorized===false,
  indexRuntime:idx.operationalCurrent?.currentRuntimeRequestOrdinal===ord&&idx.operationalCurrent?.currentRunId===run&&idx.operationalCurrent?.request12Consumed===true&&idx.operationalCurrent?.request12ReplayAllowed===false&&idx.operationalCurrent?.request13Authorized===false,
  lifecycle:life.continuity?.stateVersion===sv&&life.authorization?.activeRequest===false&&life.authorization?.requestOrdinal===ord&&life.authorization?.allowedExecutions===0&&life.authorization?.consumed===true&&life.authorization?.replayAllowed===false&&life.lastExecution?.runId===run&&life.lastExecution?.rootCauseStatus===root.status,
  readmeState:readme.includes(sv)&&readme.includes('Request12')&&readme.includes('Request13')&&noStale(readme),
  changelogState:change.includes(sv)&&change.includes(String(run)),
  checkpointState:checkpoint.includes(sv)&&checkpoint.includes(String(run))&&checkpoint.includes('Request13'),
  academiaState:academia.includes(sv)&&academia.includes('FUNCTIONAL_DEFECT'),
  prAvailable:!requirePr||pr.length>0,
  prCurrent:!requirePr||(pr.includes(sv)&&pr.includes(String(run))&&pr.includes('Request12')&&pr.includes('Request13')&&pr.includes(root.status)&&noStale(pr)),
  noDangerousStaleActive:noStale(JSON.stringify({phase:live.phase,authorization:live.authorization,nextActionExact:live.nextActionExact,documentationControl:live.documentationControl,operationalCurrent:idx.operationalCurrent,lifecycleStatus:life.status,lifecycleAuthorization:life.authorization,lifecycleLastExecution:life.lastExecution})),
  rootStateCoherent:rootClosed ? root.status==='CLOSED_SOURCEONLY_VERIFIED'&&root.finalClassification==='FUNCTIONAL_DEFECT'&&root.finalCode==='F2_PRODUCT_READONLY_GET_FULL_COLLECTION_CLONE_AMPLIFICATION' : root.status==='OPEN_SECOND_SAME_FAMILY_FAILURE',
  causalProof:!rootClosed||(causal?.ok===true&&causal?.status===root.causalProofStatus&&causal?.code===root.finalCode),
  rootfixProof:!rootClosed||(rootfix?.ok===true&&rootfix?.status===root.rootfixEvidenceStatus&&rootfix?.resolvedCode===root.finalCode&&rootfix?.apiPreserved===true&&rootfix?.cloneIsolationPreserved===true&&rootfix?.writesRemainBlocked===true),
  oldCandidateBlocked:!rootClosed||(L.frozenCandidate?.runtimeReusable===false&&L.frozenCandidate?.status==='SUPERSEDED_FOR_NEXT_RUNTIME_BY_SOURCE_ROOTFIX'),
  successorGuard:live.nextActionExact?.request13Allowed===false&&live.stopRetry?.request12ReplayAllowed===false&&live.stopRetry?.request13MayBeMaterialized===false
};
const failed=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k),ok=failed.length===0;
const evidence={schemaVersion:'orbit360-f2-continuity-audit-v1',ok,status:ok?'F2_CONTINUITY_ANTI_LOOP_AUDIT_PASS':'F2_CONTINUITY_ANTI_LOOP_AUDIT_FAIL',classification:ok?'PASS':'PIPELINE_MECHANISM_FAILURE',code:ok?null:'DOCUMENTATION_STATE_DRIFT_OR_CONTINUITY_OWNER_MISMATCH',stateVersion:sv,gateId:L.gateId,requestOrdinal:ord,runId:run,candidateArtifactId:artifact,rootCauseStatus:root.status,rootCauseConcluded:rootClosed,rootCauseFinalCode:root.finalCode||null,checks,failed,prChecked:requirePr,productMutation:false,dataMutation:false,browserExecuted:false,runtimeExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,membershipWrites:0,dataWrites:0,operationalWrites:0,deployExecuted:false,publicationExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(evidence,null,2)+'\n','utf8');
console.log(JSON.stringify(evidence,null,2));
if(!ok)process.exit(41);
