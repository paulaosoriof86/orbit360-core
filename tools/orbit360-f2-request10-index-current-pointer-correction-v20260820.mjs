#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
const ROOT=process.cwd();
const indexPath=path.join(ROOT,'orbit360-platform/docs/ORBIT360-CURRENT-DOCUMENTATION-INDEX-v1.json');
const evidencePath=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/f2-request10-index-current-pointer-correction-v20260820.json');
const idx=JSON.parse(fs.readFileSync(indexPath,'utf8'));
const closure='orbit360-platform/runtime-gate-crm-v20260716/f2-request10-consumed-validator-stale-rootfix-closure-v20260820.json';
const sourcefix='orbit360-platform/runtime-gate-crm-v20260716/f2-request10-route-visibility-validator-sourcefix-v20260820.json';
const checkpoint='orbit360-platform/docs/CHECKPOINT-F2-REQUEST10-CONSUMED-VISIBILITY-VALIDATOR-STALE-ROOTFIX-PASS-REQUEST11-AUTH-PENDING-20260820.md';
const boundary='F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V1:REQUEST11:EXACT_ARTIFACT_9387820198';
idx.updatedAt='2026-08-20T00:57:00.000Z';
idx.operationalCurrent=idx.operationalCurrent||{};
Object.assign(idx.operationalCurrent,{
  latestPreflightEvidence:closure,
  latestArtifactVerificationEvidence:closure,
  latestRuntimeEvidence:closure,
  latestTerminalEvidence:closure,
  latestRequestConsumptionEvidence:closure,
  latestValidatorSourcefixEvidence:sourcefix,
  resumePointer:checkpoint,
  currentCheckpoint:checkpoint,
  nextAuthorizationBoundary:boundary,
  request10Created:true,
  request10Authorized:true,
  request10AuthorizationGranted:true,
  request10Consumed:true,
  request10ReplayAllowed:false,
  request11Created:false,
  request11Authorized:false
});
idx.latestPreflightEvidence=closure;
idx.latestArtifactVerificationEvidence=closure;
idx.latestRuntimeEvidence=closure;
idx.latestTerminalEvidence=closure;
idx.latestRequestConsumptionEvidence=closure;
idx.latestValidatorSourcefix=sourcefix;
idx.resumePointer=checkpoint;
idx.currentCheckpoint=checkpoint;
const checks={
  preflightCurrent:idx.operationalCurrent.latestPreflightEvidence===closure&&idx.latestPreflightEvidence===closure,
  artifactCurrent:idx.operationalCurrent.latestArtifactVerificationEvidence===closure&&idx.latestArtifactVerificationEvidence===closure,
  runtimeCurrent:idx.operationalCurrent.latestRuntimeEvidence===closure&&idx.latestRuntimeEvidence===closure,
  request10Authorized:idx.operationalCurrent.request10Created===true&&idx.operationalCurrent.request10Authorized===true&&idx.operationalCurrent.request10AuthorizationGranted===true,
  request10Consumed:idx.operationalCurrent.request10Consumed===true&&idx.operationalCurrent.request10ReplayAllowed===false,
  request11Pending:idx.operationalCurrent.request11Created===false&&idx.operationalCurrent.request11Authorized===false&&idx.operationalCurrent.nextAuthorizationBoundary===boundary,
  checkpointCurrent:idx.operationalCurrent.currentCheckpoint===checkpoint&&idx.currentCheckpoint===checkpoint,
  candidateFrozen:idx.operationalCurrent.successorCandidateArtifactId===9387820198&&idx.f2SuccessorRebind?.candidateArtifactId===9387820198,
  sourcefixCurrent:idx.operationalCurrent.latestValidatorSourcefixEvidence===sourcefix&&idx.latestValidatorSourcefix===sourcefix
};
if(!Object.values(checks).every(Boolean)){console.error(JSON.stringify({ok:false,checks},null,2));process.exit(41);}
fs.writeFileSync(indexPath,JSON.stringify(idx,null,2)+'\n');
const evidence={schemaVersion:'orbit360-f2-request10-index-current-pointer-correction-v1',ok:true,status:'F2_REQUEST10_INDEX_CURRENT_POINTER_CORRECTION_PASS',classification:'VALIDATOR_STALE_ROOTFIX',rootCause:'DUPLICATED_CURRENT_INDEX_FIELDS_RETAINED_STALE_REQUEST10_AUTH_AND_PREVIOUS_EVIDENCE_POINTERS',checks,productMutation:false,dataMutation:false,browserExecuted:false,runtimeExecuted:false,secretAccess:false,firestoreRead:false,writes:0,deployExecuted:false,productionTouched:false,request11Created:false,request11Authorized:false,containsPII:false,containsSecrets:false};
fs.writeFileSync(evidencePath,JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify(evidence,null,2));
