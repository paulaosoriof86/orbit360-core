#!/usr/bin/env node
'use strict';
import fs from 'node:fs';

const P={
  ledger:'orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json',
  pkg:'orbit360-platform/docs/orbit360-production-reopening-package-v20260820.json',
  authority:'tools/orbit360-gate-contract-f2-productive-acceptance-v20260820.json',
  lifecycle:'tools/orbit360-validator-lifecycle-contract-f2-productive-acceptance-runtime-v20260819.json',
  boundary:'orbit360-platform/docs/orbit360-f2-runtime-authorization-boundary-v20260820.json'
};
const json=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const L=json(P.ledger),pkg=json(P.pkg),A=json(P.authority),life=json(P.lifecycle),B=json(P.boundary);
const failures=[]; const c=(v,id)=>{if(!v)failures.push(id);};
const cp11=(pkg.steps||[]).find(s=>s.id==='CP-11');
c(pkg.status==='CLOSED_PASS','PACKAGE_CLOSED_PASS');
c(pkg.controlPlaneClosure?.status==='CLOSED_PASS_RECONCILED','CONTROL_PLANE_RECONCILED');
c(cp11?.status==='PASS','CP11_PASS');
c(pkg.resumeProtocol?.firstIncompleteStep==='F2-RUNTIME-AUTHORIZATION','NEXT_AUTHORIZATION_BOUNDARY');
c(pkg.resumeProtocol?.nextActionExact==='AWAIT_EXPLICIT_F2_RUNTIME_AUTHORIZATION_ONE_SHOT','NEXT_ACTION');
c(L.nextAction?.id==='AWAIT_EXPLICIT_F2_RUNTIME_AUTHORIZATION_ONE_SHOT','LEDGER_NEXT_ACTION');
c(L.productionReopeningPackage?.revision===pkg.revision,'LEDGER_PACKAGE_REVISION');
c(B.status==='PREPARED_SOURCE_ONLY_AWAITING_EXPLICIT_USER_AUTHORIZATION','BOUNDARY_STATUS');
c(B.authorized===false&&B.authorizationPersisted===false&&B.requestMaterialized===false&&B.runtimeAllowed===false,'BOUNDARY_INERT');
c(B.gate?.id===A.gateId&&B.gate?.contractVersion===A.gateContractVersion,'BOUNDARY_GATE');
c(B.candidate?.artifactId===A.candidate?.artifactId&&B.candidate?.artifactDigest===A.candidate?.artifactDigest&&B.candidate?.sourceHead===A.candidate?.sourceHead,'BOUNDARY_CANDIDATE');
c(B.controlPlane?.ledgerRevision===L.revision&&B.controlPlane?.packageRevision===pkg.revision,'BOUNDARY_REVISIONS');
c(Array.isArray(B.authorizationIdentity?.boundFields)&&['gateId','gateContractVersion','candidateArtifactId','candidateArtifactDigest','candidateSourceHead','ledgerRevision','packageRevision','executionProfile'].every(x=>B.authorizationIdentity.boundFields.includes(x)),'BOUND_IDENTITY_FIELDS');
c(typeof B.authorizationIdentity?.digest==='string'&&/^[a-f0-9]{64}$/.test(B.authorizationIdentity.digest),'BOUND_IDENTITY_DIGEST');
c(B.authorizationIdentity?.requestOrdinalHasOperationalSemantics===false&&B.authorizationIdentity?.authorizationCarryForwardAllowed===false&&B.authorizationIdentity?.historicalRequestBindingAllowed===false,'BOUND_ORDINAL_FREE');
const req=B.requestedExecutionProfile?.capabilities||{};
c(req.runtime===true&&req.browser===true&&req.secrets===true&&req.firestoreRead===true&&req.customTokenMint===true,'REQUESTED_READONLY_RUNTIME_CAPABILITIES');
c(req.writes===false&&req.firestoreWrites===false&&req.authWrites===false&&req.membershipWrites===false&&req.dataWrites===false&&req.operationalWrites===false&&req.deploy===false&&req.production===false&&req.main===false&&req.merge===false,'REQUESTED_WRITE_GUARDS');
const eff=B.effectiveCapabilitiesUntilExplicitAuthorization||{};
c(Object.values(eff).every(v=>v===false),'EFFECTIVE_CAPABILITIES_MUST_REMAIN_FALSE');
c(life.executionProfile?.blockedBy==='EXPLICIT_F2_RUNTIME_AUTHORIZATION_NOT_PERSISTED','LIFECYCLE_BLOCK_REASON');
c(Object.values(life.executionProfile?.capabilities||{}).every(v=>v===false),'LIFECYCLE_EFFECTIVE_CAPABILITIES_FALSE');
c(life.authorization?.activeRequest===false&&life.authorization?.freshAuthorizationRequired===true&&life.authorization?.nextRuntimeMaterializationAllowed===false&&life.authorization?.newRuntimeRequestAllowed===false,'LIFECYCLE_AUTHORIZATION_BOUNDARY');
const active=JSON.stringify({pkg:pkg.resumeProtocol,ledger:L.nextAction,boundary:{status:B.status,identity:B.authorizationIdentity}});
c(!/requestOrdinal\s*[:=]\s*\d+/i.test(active),'NO_OPERATIONAL_REQUEST_ORDINAL');
c(!active.includes('9387820198'),'NO_ACTIVE_HISTORICAL_ARTIFACT');
const result={ok:failures.length===0,status:failures.length?'CP11_AUTHORIZATION_BOUNDARY_AUDIT_FAIL':'CP11_AUTHORIZATION_BOUNDARY_AUDIT_PASS',failures,gateId:A.gateId,gateContractVersion:A.gateContractVersion,candidateArtifactId:A.candidate.artifactId,candidateSourceHead:A.candidate.sourceHead,ledgerRevision:L.revision,packageRevision:pkg.revision,authorizationIdentitySha256:B.authorizationIdentity?.digest||null,authorized:false,requestMaterialized:false,runtimeAllowed:false,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,writes:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
console.log(JSON.stringify(result,null,2));
if(!result.ok)process.exit(41);
