#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const A=p=>path.join(ROOT,p);
const T=p=>fs.readFileSync(A(p),'utf8').replace(/^\uFEFF/,'');
const J=p=>JSON.parse(T(p));
const fail=c=>{throw new Error(c);};
const LEDGER='orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json';
const REG='orbit360-platform/docs/orbit360-continuity-writer-registry-v20260820.json';
const CAN='orbit360-platform/docs/orbit360-control-plane-canonicality-contract-v20260822.json';
const SEM='orbit360-platform/docs/orbit360-control-plane-semantic-contract-v20260824.json';
const TRANS='tools/orbit360-control-plane-transport-contract-v20260826.json';
const WF='.github/workflows/orbit360-continuity-canonical-source-only-v20260820.yml';
const PROJ='tools/orbit360-continuity-projection-core-v20260825.mjs';
const PROJA='tools/orbit360-continuity-projection-atomic-v20260820.mjs';
const BINDER='tools/orbit360-bind-f2-browser-evidence-run-v20260824.mjs';
const BROWSER='tools/orbit360-f2-productive-acceptance-runtime-browser-readonly-v20260818.mjs';
const INTEGRITY='tools/orbit360-f2-data-integrity-readonly-v20260818.mjs';
const pointers=['orbit360-platform/docs/orbit360-production-reopening-package-v20260820.json','orbit360-platform/docs/orbit360-f2-runtime-authorization-boundary-v20260820.json','orbit360-platform/docs/orbit360-live-state-v1.json','orbit360-platform/docs/ORBIT360-CURRENT-DOCUMENTATION-INDEX-v1.json','orbit360-platform/docs/ORBIT360-PR5-CURRENT-STATE.md','orbit360-platform/docs/CHECKPOINT-CONTROL-PLANE-HARDENING-20260820.md','README.md'];

function validCurrentMilestone(L){
  const phase=String(L.activeState?.phase||''),status=String(L.activeState?.status||''),progress=Number(L.progress?.productionRouteProgressPct),next=String(L.nextAction?.id||'');
  const p1Required=phase==='F2_TERMINAL_PASS_P1_SOURCE_ONLY_REQUIRED_BEFORE_GO_LIVE'&&status==='F2_TERMINAL_PASS'&&progress===85&&next==='P1_FIX_SINGLE_STATE_DUPLICATE_CLAIM_AND_SEPARATE_STATIC_INVARIANT_FROM_BEHAVIORAL_SELFTEST_SOURCE_ONLY';
  const p1Pass=phase==='SINGLE_STATE_ROOTFIX_PASS_P2_RELEASE_HANDLER_REQUIRED'&&status==='SINGLE_STATE_ROOTFIX_PASS'&&progress===88&&next==='P2_IMPLEMENT_GO_LIVE_RELEASE_HANDLER_AND_PROVE_DRY_RUN_ROLLBACK_SOURCE_ONLY';
  const p2Pass=phase==='GO_LIVE_RELEASE_HANDLER_READY_P3_HANDSHAKE_REQUIRED'&&status==='GO_LIVE_RELEASE_HANDLER_READY'&&progress===91&&next==='P3_RUN_FINAL_SOURCE_ONLY_HANDSHAKE_AND_SEAL_CONTROL_PLANE_BASELINE';
  const p3Pass=phase==='CONTROL_PLANE_FROZEN_BASELINE_AWAITING_GO_LIVE_AUTHORIZATION'&&status==='FINAL_RELEASE_HANDSHAKE_PASS'&&progress===93&&next==='AWAIT_EXPLICIT_GO_LIVE_AUTHORIZATION';
  const releaseFail=phase==='AUTHORIZED_RELEASE_WINDOW_FAILED'&&status==='RELEASE_TERMINAL_FAIL_NO_REPLAY'&&progress===93&&next==='DIAGNOSE_RELEASE_ROOT_CAUSE_AND_VERIFY_ROLLBACK';
  const legacy=phase==='F2_TERMINAL_PASS_AWAITING_AUTHORIZED_GO_LIVE'&&status==='F2_TERMINAL_PASS'&&progress===85&&next==='AWAIT_EXPLICIT_GO_LIVE_AUTHORIZATION';
  return p1Required||p1Pass||p2Pass||p3Pass||releaseFail||legacy;
}

try{
  for(const p of [LEDGER,REG,CAN,SEM,TRANS,WF,PROJ,PROJA,BINDER,BROWSER,INTEGRITY,...pointers])if(!fs.existsSync(A(p)))fail(`SINGLE_STATE_DEPENDENCY_MISSING:${p}`);
  const L=J(LEDGER),R=J(REG),C=J(CAN),S=J(SEM),Tr=J(TRANS),wf=T(WF),binder=T(BINDER),browser=T(BROWSER),integrity=T(INTEGRITY),releaseContract=R.executionTransitions?.GO_LIVE_RELEASE_WINDOW?.releaseHandlerContract||{};
  if(R.sourceOfTruth!==LEDGER||JSON.stringify(R.stateBearingFiles)!==JSON.stringify([LEDGER])||!Array.isArray(R.projectionTargets)||R.projectionTargets.length!==0)fail('SINGLE_STATE_REGISTRY_STATE_SURFACE_INVALID');
  if(releaseContract.browserConsoleAttributionCurrentRunOnly!==true||releaseContract.browserNetworkCausalAttributionRequired!==true||releaseContract.secondaryBrowserReproductionForbidden!==true||releaseContract.ambiguousConsoleSignalMustNotBeFunctionalDefect!==true)fail('SINGLE_STATE_REGISTRY_BROWSER_CAUSAL_CONTRACT_INVALID');
  if(C.singleMutableOperationalState!==LEDGER||JSON.stringify(C.stateBearingFiles)!==JSON.stringify([LEDGER])||C.actualPrBodyStateBearing!==false)fail('SINGLE_STATE_CANONICALITY_INVALID');
  if(S.singleMutableOperationalState!==LEDGER||S.dynamicStateMustBeReadFromLedger!==true)fail('SINGLE_STATE_SEMANTIC_CONTRACT_INVALID');
  if(Tr.transport!=='EPHEMERAL_EXECUTION_BRANCH_SINGLE_PUSH'||Tr.statePublication!=='LEDGER_ONLY_REMOTE_CAS')fail('SINGLE_STATE_TRANSPORT_INVALID');
  if(!wf.includes("branches:\n      - 'ays/orbit360-exec-*'")||wf.includes('pull_request:')||wf.includes('PR_STATE')||wf.includes('CHANGELOG')||wf.includes('continuity-projection'))fail('SINGLE_STATE_WORKFLOW_SURFACE_INVALID');
  if(!wf.includes('F2_BROWSER_BINDER_CURRENT_RUN_CAUSAL_SELFTEST_PASS')||!wf.includes('secondaryBrowserReproductionRequired==false'))fail('SINGLE_STATE_WORKFLOW_BROWSER_CAUSAL_SELFTEST_NOT_ENFORCED');
  if(!T(PROJ).includes('SINGLE_STATE_COMPATIBILITY_NO_MUTATION')||!T(PROJA).includes('SINGLE_STATE_COMPATIBILITY_NO_MUTATION'))fail('SINGLE_STATE_PROJECTION_NOT_RETIRED');
  if(!binder.includes('out.runId=Number(runId)')||!binder.includes('out.browserRunId=Number(runId)')||!binder.includes("out.evidenceFreshness='current-run-only'")||!binder.includes('secondaryBrowserReproductionRequired:false')||binder.includes('execFileSync'))fail('SINGLE_STATE_BROWSER_EVIDENCE_BINDER_CONTRACT_INVALID');
  if(!browser.includes('classifyCrossTenantProbeSignals')||!browser.includes("currentNetworkPhase='crossTenantDenied'")||!browser.includes('EXPECTED_CROSS_TENANT_DENIAL_SIGNAL_CAUSALLY_ATTRIBUTED_CURRENT_RUN')||!browser.includes('networkFailures'))fail('SINGLE_STATE_BROWSER_CURRENT_RUN_CAUSAL_ATTRIBUTION_CONTRACT_INVALID');
  if(!integrity.includes('F2_BROWSER_EVIDENCE_RUN_BINDER')||!integrity.includes('orbit360-bind-f2-browser-evidence-run-v20260824.mjs')||!integrity.includes('bindBrowserEvidence()')||!integrity.includes("b.evidenceFreshness!=='current-run-only'")||!integrity.includes('F2_DATA_INTEGRITY_AFTER_BROWSER_RUN_MISMATCH'))fail('SINGLE_STATE_BROWSER_INTEGRITY_RUN_BINDING_CONTRACT_INVALID');
  for(const p of pointers){const t=T(p);if(/"ledgerRevision"|"packageRevision"|productionRouteProgressPct|AWAIT_EXPLICIT_GO_LIVE_AUTHORIZATION|F2_TERMINAL_PASS_AWAITING_AUTHORIZED_GO_LIVE/.test(t))fail(`SINGLE_STATE_POINTER_CONTAINS_DYNAMIC_STATE:${p}`);}
  if(L.progress?.f2TerminalPass===true){
    if(!validCurrentMilestone(L))fail('SINGLE_STATE_LEDGER_F2_P1_P2_P3_OR_RELEASE_RECOVERY_STATE_INVALID');
    if(L.authorizationBoundary?.activeRuntimeAuthorization!==false||L.authorizationBoundary?.activeRequestPath!=null||L.authorizationBoundary?.authorizationRecordPath!=null)fail('SINGLE_STATE_LEDGER_ACTIVE_AUTH_INVALID');
    const e=L.continuityControl?.latestDurableEvidence;
    if(Number(e?.runId)!==32920087220||e?.type!=='F2_TERMINAL_PASS_ARTIFACT')fail('SINGLE_STATE_LEDGER_TERMINAL_POINTER_INVALID');
    const E=J(e.path);
    if(E.ok!==true||E.classification!=='PASS'||Number(E.runId)!==32920087220||Number(E.browserRunId)!==32920087220||Number(E.integrityRunId)!==32920087220||Number(E.firestoreWrites)!==0||Number(E.authWrites)!==0||Number(E.operationalWrites)!==0||E.deployExecuted!==false||E.productionHostingTouched!==false)fail('SINGLE_STATE_TERMINAL_EVIDENCE_INVALID');
  }
  console.log(JSON.stringify({ok:true,status:'SINGLE_STATE_CONTROL_PLANE_STATIC_INVARIANT_PASS',singleMutableOperationalState:LEDGER,stateBearingFileCount:1,projectionTargets:0,prBodyStateBearing:false,technicalPrTransport:false,workflowWritesHumanProjections:false,releaseFailureRecoveryAdmitted:true,registryBrowserCausalContractPass:true,browserEvidenceBinderContractPass:true,browserCurrentRunCausalAttributionContractPass:true,secondaryBrowserReproductionRequired:false,browserIntegrityRunBindingContractPass:true,binder:BINDER,browserHarness:BROWSER,integrityValidator:INTEGRITY,behavioralSelftestDelegated:true,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false},null,2));
}catch(error){console.error(JSON.stringify({ok:false,status:'SINGLE_STATE_CONTROL_PLANE_STATIC_INVARIANT_FAIL',classification:'PIPELINE_MECHANISM_FAILURE',code:String(error?.message||error),containsPII:false,containsSecrets:false}));process.exit(41);}
