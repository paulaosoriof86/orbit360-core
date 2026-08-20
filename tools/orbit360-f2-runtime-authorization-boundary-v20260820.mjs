#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import crypto from 'node:crypto';

const P={
  ledger:'orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json',
  pkg:'orbit360-platform/docs/orbit360-production-reopening-package-v20260820.json',
  authority:'tools/orbit360-gate-contract-f2-productive-acceptance-v20260820.json',
  lifecycle:'tools/orbit360-validator-lifecycle-contract-f2-productive-acceptance-runtime-v20260819.json',
  out:'orbit360-platform/docs/orbit360-f2-runtime-authorization-boundary-v20260820.json'
};
const json=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const L=json(P.ledger), pkg=json(P.pkg), A=json(P.authority), life=json(P.lifecycle);
if(pkg.status!=='CLOSED_PASS') throw new Error('PACKAGE_CLOSED_PASS_REQUIRED');
if(pkg.controlPlaneClosure?.status!=='CLOSED_PASS_RECONCILED') throw new Error('CONTROL_PLANE_RECONCILED_REQUIRED');
if(pkg.resumeProtocol?.firstIncompleteStep!=='F2-RUNTIME-AUTHORIZATION') throw new Error('CP11_TRANSITION_REQUIRED');
const cp11=(pkg.steps||[]).find(s=>s.id==='CP-11');
if(cp11?.status!=='PASS') throw new Error('CP11_PASS_REQUIRED');
if(L.productionReopeningPackage?.revision!==pkg.revision) throw new Error('LEDGER_PACKAGE_REVISION_DRIFT');
if(L.nextAction?.id!=='AWAIT_EXPLICIT_F2_RUNTIME_AUTHORIZATION_ONE_SHOT') throw new Error('LEDGER_NEXT_ACTION_MISMATCH');
if(A.gateId!==L.gateId||A.gateContractVersion!=='2.2.0') throw new Error('GATE_AUTHORITY_MISMATCH');
if(A.candidate?.artifactId!==L.successorCandidate?.artifactId||A.candidate?.artifactDigest!==L.successorCandidate?.artifactDigest||A.candidate?.sourceHead!==L.successorCandidate?.sourceHead) throw new Error('CANDIDATE_BINDING_MISMATCH');

const requestedExecutionProfile={
  phase:'F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY',
  capabilities:{
    secrets:true,
    firestoreRead:true,
    customTokenMint:true,
    browser:true,
    runtime:true,
    writes:false,
    firestoreWrites:false,
    authWrites:false,
    membershipWrites:false,
    dataWrites:false,
    operationalWrites:false,
    packageRebuild:false,
    deploy:false,
    publish:false,
    publication:false,
    production:false,
    main:false,
    merge:false
  }
};
const identityCore={
  gateId:A.gateId,
  gateContractVersion:A.gateContractVersion,
  candidateArtifactId:A.candidate.artifactId,
  candidateArtifactDigest:A.candidate.artifactDigest,
  candidateSourceHead:A.candidate.sourceHead,
  ledgerRevision:L.revision,
  packageRevision:pkg.revision,
  executionProfile:requestedExecutionProfile
};
const identitySha256=crypto.createHash('sha256').update(JSON.stringify(identityCore)).digest('hex');
const boundary={
  schemaVersion:'orbit360-f2-runtime-authorization-boundary-v1',
  boundaryId:'ORBIT360-F2-RUNTIME-AUTHORIZATION-BOUNDARY-CURRENT',
  status:'PREPARED_SOURCE_ONLY_AWAITING_EXPLICIT_USER_AUTHORIZATION',
  preparedAtUtc:new Date().toISOString(),
  repository:L.repository,
  branch:L.branch,
  pullRequest:L.pullRequest,
  authorized:false,
  authorizationPersisted:false,
  requestMaterialized:false,
  runtimeAllowed:false,
  gate:{id:A.gateId,contractVersion:A.gateContractVersion,authority:P.authority},
  candidate:{
    artifactId:A.candidate.artifactId,
    artifactDigest:A.candidate.artifactDigest,
    sourceHead:A.candidate.sourceHead,
    zipSha256:A.candidate.zipSha256,
    manifestSha256:A.candidate.manifestSha256,
    fileCount:A.candidate.fileCount
  },
  controlPlane:{
    stateVersion:L.stateVersion,
    ledgerRevision:L.revision,
    packageRevision:pkg.revision,
    packageStatus:pkg.status,
    controlPlaneClosure:pkg.controlPlaneClosure.status
  },
  requestedExecutionProfile,
  effectiveCapabilitiesUntilExplicitAuthorization:{
    secrets:false,
    firestoreRead:false,
    customTokenMint:false,
    browser:false,
    runtime:false,
    writes:false,
    deploy:false,
    production:false
  },
  authorizationIdentity:{
    algorithm:'sha256',
    digest:identitySha256,
    boundFields:['gateId','gateContractVersion','candidateArtifactId','candidateArtifactDigest','candidateSourceHead','ledgerRevision','packageRevision','executionProfile'],
    requestOrdinalHasOperationalSemantics:false,
    authorizationCarryForwardAllowed:false,
    historicalRequestBindingAllowed:false
  },
  materializationRules:{
    explicitUserAuthorizationRequired:true,
    authorizationMustBindIdentityDigest:true,
    preflightRequiredBeforeSecretAccess:true,
    preflightRequiredBeforeBrowser:true,
    runtimeRequestMayBeCreatedOnlyAfterAuthorization:true,
    oneShotOnly:true,
    replayAllowed:false,
    deployAllowed:false,
    productionAllowed:false,
    mainAllowed:false,
    mergeAllowed:false
  },
  lifecycleAtPreparation:{
    path:P.lifecycle,
    currentPhase:life.currentPhase,
    activeRequest:false
  },
  containsPII:false,
  containsSecrets:false
};
fs.writeFileSync(P.out,JSON.stringify(boundary,null,2)+'\n','utf8');
console.log(JSON.stringify({ok:true,status:'F2_RUNTIME_AUTHORIZATION_BOUNDARY_PREPARED_SOURCE_ONLY',path:P.out,authorizationIdentitySha256:identitySha256,ledgerRevision:L.revision,packageRevision:pkg.revision,authorized:false,runtimeAllowed:false,requestMaterialized:false,secretAccess:false,firestoreRead:false,browserExecuted:false,writes:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false},null,2));
