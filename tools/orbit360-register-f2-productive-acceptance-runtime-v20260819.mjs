#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const REQUEST=String(process.env.ORBIT360_REQUEST_FILE||'').trim();
const EXPECTED='F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V3';
const REQUEST_SCHEMA='orbit360-f2-productive-acceptance-runtime-browser-readonly-request-v3';
const GATE_ID='f2-productive-acceptance-exact-successor-v20260818';
const RUNTIME_PHASE='F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY';
const P={
  ledger:'orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json',
  authority:'tools/orbit360-gate-contract-f2-productive-acceptance-v20260820.json',
  lifecycle:'tools/orbit360-validator-lifecycle-contract-f2-productive-acceptance-runtime-v20260819.json'
};
const A=p=>path.join(ROOT,p);
const J=p=>JSON.parse(fs.readFileSync(A(p),'utf8').replace(/^\uFEFF/,''));
const need=(v,c)=>{if(!v)throw new Error(c);};

for(const p of Object.values(P))need(fs.existsSync(A(p)),`F2_RUNTIME_REGISTER_DEPENDENCY_MISSING:${p}`);
need(REQUEST&&fs.existsSync(A(REQUEST)),'F2_RUNTIME_REGISTER_REQUEST_REQUIRED');
need(String(process.env.ORBIT360_EXPECTED_REQUEST_VERSION||'')===EXPECTED,'F2_RUNTIME_REGISTER_REQUEST_VERSION_ENV_INVALID');

const req=J(REQUEST),ledger=J(P.ledger),authority=J(P.authority),life=J(P.lifecycle);
const runId=Number(process.env.GITHUB_RUN_ID||0);
const candidate=ledger.successorCandidate||{};

need(req.schemaVersion===REQUEST_SCHEMA&&req.status==='RUNTIME_ATTEMPT_ACCEPTED_PREFLIGHT_PENDING'&&req.allowedExecutions===0&&req.consumed===false&&req.authorizationFrozen===true&&req.replayAllowed===false&&req.historical===false&&req.runtimeAttemptAccepted===true&&Number(req.runtimeAttemptCount)===1,'F2_RUNTIME_REGISTER_REQUEST_NOT_ACCEPTED_V3');
need(runId>0&&Number(req.runtimeRunId)===runId,'F2_RUNTIME_REGISTER_RUN_BINDING_INVALID');
need(/^[a-f0-9]{64}$/.test(String(req.authorizationIdentityDigest||'')),'F2_RUNTIME_REGISTER_AUTH_IDENTITY_REQUIRED');
need(ledger.gateId===GATE_ID&&authority.gateId===GATE_ID&&life.gateId===GATE_ID,'F2_RUNTIME_REGISTER_GATE_MISMATCH');
need(authority.lifecycles?.runtime===P.lifecycle&&authority.runtimePhase===RUNTIME_PHASE,'F2_RUNTIME_REGISTER_RUNTIME_AUTHORITY_INVALID');
need(life.executionProfile?.phase===RUNTIME_PHASE,'F2_RUNTIME_REGISTER_RUNTIME_PROFILE_INVALID');
need(life.currentPhase===ledger.activeState?.phase&&life.status===ledger.activeState?.status,'F2_RUNTIME_REGISTER_LIFECYCLE_PROJECTION_DRIFT');
need(life.authorization?.activeRequest===true&&life.authorization?.replayAllowed===false,'F2_RUNTIME_REGISTER_LIFECYCLE_REQUEST_INACTIVE');
need(authority.requestBinding?.activeRequest===REQUEST,'F2_RUNTIME_REGISTER_AUTHORITY_REQUEST_DRIFT');
need(ledger.authorizationBoundary?.activeRequestPath===REQUEST&&ledger.authorizationBoundary?.runtimeAttemptAccepted===true&&Number(ledger.authorizationBoundary?.runtimeRunId)===runId,'F2_RUNTIME_REGISTER_LEDGER_BINDING_INVALID');
need(Number(candidate.artifactId)===Number(req.candidateArtifactId)&&candidate.sourceHead===req.candidateSourceHead&&candidate.artifactDigest===req.candidateArtifactDigest,'F2_RUNTIME_REGISTER_CANDIDATE_MISMATCH');
need(Number(life.guards?.successorCandidateArtifactId)===Number(candidate.artifactId)&&life.guards?.successorCandidateSourceHead===candidate.sourceHead&&life.guards?.successorCandidateArtifactDigest===candidate.artifactDigest,'F2_RUNTIME_REGISTER_LIFECYCLE_CANDIDATE_DRIFT');

console.log(JSON.stringify({
  ok:true,
  status:'F2_RUNTIME_REGISTER_READ_ONLY_VALIDATED_V4',
  classification:'PASS',
  gateId:GATE_ID,
  candidateArtifactId:Number(candidate.artifactId),
  candidateSourceHead:candidate.sourceHead,
  authorizationIdentityDigest:req.authorizationIdentityDigest,
  runtimeRunId:runId,
  runtimeAttemptAccepted:true,
  runtimePhaseContract:RUNTIME_PHASE,
  canonicalLifecycle:P.lifecycle,
  canonicalAuthority:P.authority,
  request:REQUEST,
  registerMode:'READ_ONLY_VALIDATOR',
  sourceMutationAllowed:false,
  persistentSourceChanged:false,
  runtimeExecuted:false,
  browserExecuted:false,
  secretAccess:false,
  firestoreRead:false,
  firestoreWrites:0,
  authWrites:0,
  operationalWrites:0,
  deployExecuted:false,
  productionTouched:false,
  containsPII:false,
  containsSecrets:false
},null,2));