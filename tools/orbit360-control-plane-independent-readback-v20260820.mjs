#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const json=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const text=p=>fs.readFileSync(p,'utf8');
const expectedStep=process.argv.includes('--expected-step')?process.argv[process.argv.indexOf('--expected-step')+1]:null;
const expectedStatus=process.argv.includes('--expected-package-status')?process.argv[process.argv.indexOf('--expected-package-status')+1]:null;
const L=json('orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json');
const P=json('orbit360-platform/docs/orbit360-production-reopening-package-v20260820.json');
const W=json('orbit360-platform/docs/orbit360-continuity-writer-registry-v20260820.json');
const live=json('orbit360-platform/docs/orbit360-live-state-v1.json');
const idx=json('orbit360-platform/docs/ORBIT360-CURRENT-DOCUMENTATION-INDEX-v1.json');
const life=json('tools/orbit360-validator-lifecycle-contract-f2-productive-acceptance-runtime-v20260819.json');
const pr=text('orbit360-platform/docs/ORBIT360-PR5-CURRENT-STATE.md');
const checkpoint=text('orbit360-platform/docs/CHECKPOINT-CONTROL-PLANE-HARDENING-20260820.md');
const currentHead=String(process.env.ORBIT360_CONTROL_PLANE_HEAD||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'})).trim();
const atomicProjection='tools/orbit360-continuity-projection-atomic-v20260820.mjs', composite='tools/orbit360-control-plane-composite-invariant-v20260820.mjs';
const failures=[]; const c=(v,id)=>{if(!v)failures.push(id);};
c(L.productionReopeningPackage?.revision===P.revision,'LEDGER_PACKAGE_REVISION'); c(L.productionReopeningPackage?.status===P.status,'LEDGER_PACKAGE_STATUS'); c(L.productionReopeningPackage?.firstIncompleteStep===P.resumeProtocol?.firstIncompleteStep,'LEDGER_PACKAGE_STEP');
if(expectedStep)c(P.resumeProtocol?.firstIncompleteStep===expectedStep,'EXPECTED_STEP'); if(expectedStatus)c(P.status===expectedStatus,'EXPECTED_PACKAGE_STATUS');
c(W.soleProjectionLogic===atomicProjection&&W.compositeInvariant===composite&&W.transitionOwner==='tools/orbit360-continuity-transition-owner-v20260820.mjs','WRITER_OWNERS');
c(live.stateVersion===L.stateVersion&&live.canonicalCurrent?.status===L.activeState.status&&live.canonicalCurrent?.rootCauseStatus===L.activeState.rootCauseStatus,'LIVE_PROJECTION');
c(idx.canonicalCurrent?.stateVersion===L.stateVersion&&idx.operationalCurrent?.nextActionId===L.nextAction.id&&idx.operationalCurrent?.successorCandidateArtifactId===L.successorCandidate?.artifactId,'INDEX_PROJECTION');
c(life.status===L.activeState.status&&life.nextActionExact===L.nextAction.id&&life.continuity?.stateVersion===L.stateVersion&&life.continuity?.sync===atomicProjection&&life.continuity?.invariant===composite,'LIFECYCLE_PROJECTION');
c(pr.includes(L.stateVersion)&&pr.includes(String(L.successorCandidate?.artifactId))&&pr.includes(L.nextAction.id),'PR_STATE_PROJECTION');
c(checkpoint.includes(L.stateVersion)&&checkpoint.includes(String(L.revision))&&checkpoint.includes(String(P.revision))&&checkpoint.includes(P.resumeProtocol.nextActionExact),'CHECKPOINT_PROJECTION');
c(L.successorCandidate?.sourceHead!==currentHead,'CONTROL_PLANE_HEAD_MUST_DIFFER_FROM_CANDIDATE_SOURCE_HEAD'); c(L.authorizationBoundary?.activeRuntimeAuthorization===false&&L.authorizationBoundary?.nextRuntimeMaterializationAllowed===false&&L.authorizationBoundary?.newRuntimeRequestAllowed===false,'RUNTIME_BOUNDARY_FAIL_CLOSED');
const active=JSON.stringify({a:L.activeState,n:L.nextAction,b:L.authorizationBoundary}); c(!/Request\d+/i.test(active),'ACTIVE_REQUEST_ORDINAL_PRESENT'); c(!active.includes('9387820198'),'ACTIVE_HISTORICAL_ARTIFACT_PRESENT');
if(P.status==='CLOSED_PASS'){
  c(P.controlPlaneClosure?.status==='CLOSED_PASS_RECONCILED','CLOSED_PACKAGE_RECONCILIATION_RECORD'); c(L.continuityControl?.syncTool===atomicProjection&&L.continuityControl?.invariant===composite,'LEDGER_CLOSED_OWNER_REFS'); c(L.continuityControl?.projectionWorkflowTemporarilyFailClosed===false,'LEDGER_STALE_TEMP_LOCK'); c(L.continuityControl?.compositeInvariantStatus==='PASS','LEDGER_COMPOSITE_PASS'); c(L.productionReopeningPackage?.authorizationAllowed===true,'LEDGER_CP11_AUTHORIZATION_BOUNDARY'); c(P.lock?.authorizationAllowed===true&&P.lock?.runtimeAllowed===false&&P.lock?.requestMaterializationAllowed===false,'PACKAGE_CP11_BOUNDARY');
}
const result={ok:failures.length===0,status:failures.length?'CONTROL_PLANE_INDEPENDENT_READBACK_FAIL':'CONTROL_PLANE_INDEPENDENT_READBACK_PASS',failures,controlPlaneHead:currentHead,candidateSourceHead:L.successorCandidate?.sourceHead,ledgerRevision:L.revision,packageRevision:P.revision,packageStatus:P.status,firstIncompleteStep:P.resumeProtocol?.firstIncompleteStep,runtimeAuthorized:false,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false}; console.log(JSON.stringify(result,null,2)); if(!result.ok)process.exit(41);
