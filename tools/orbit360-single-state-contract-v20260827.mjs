'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const STATIC_GATE_REGISTRY='tools/orbit360-gate-contract-registry-v20260717.json';
const STATIC_GATE_CANONICAL_ROUTER='tools/orbit360-validar-gate-contracts-v20260717.mjs';
const STATIC_GATE_LEGACY_ROUTER='tools/orbit360-validar-gate-contracts-legacy-v20260717.mjs';
const STATIC_GATE_WORKFLOW='.github/workflows/orbit360-continuity-canonical-source-only-v20260820.yml';
const STATIC_GATE_F2_AUTHORITY='tools/orbit360-gate-contract-f2-productive-acceptance-v20260820.json';
const STATIC_GATE_LEDGER='orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json';
const STATIC_GATE_WRITER_REGISTRY='orbit360-platform/docs/orbit360-continuity-writer-registry-v20260820.json';
const STATIC_GATE_INVARIANT='tools/orbit360-single-state-invariant-v20260827.mjs';
const STATIC_GATE_STATE_CONTRACT='tools/orbit360-single-state-contract-v20260827.mjs';

function gitBlobSha(buffer){
  const header=Buffer.from(`blob ${buffer.length}\0`,'utf8');
  return createHash('sha1').update(header).update(buffer).digest('hex');
}

export function assertStaticGateContractParity(root=process.cwd(),fail=(code)=>{throw new Error(code);}){
  const A=p=>path.join(root,p),read=p=>fs.readFileSync(A(p)),json=p=>JSON.parse(read(p).toString('utf8').replace(/^\uFEFF/,''));
  const required=[STATIC_GATE_REGISTRY,STATIC_GATE_CANONICAL_ROUTER,STATIC_GATE_LEGACY_ROUTER,STATIC_GATE_WORKFLOW,STATIC_GATE_F2_AUTHORITY,STATIC_GATE_LEDGER,STATIC_GATE_WRITER_REGISTRY,STATIC_GATE_INVARIANT,STATIC_GATE_STATE_CONTRACT];
  for(const p of required)if(!fs.existsSync(A(p)))fail(`STATIC_GATE_CONTROL_DEPENDENCY_MISSING:${p}`);
  const R=json(STATIC_GATE_REGISTRY),C=R.canonicalControlPlane||{},F=R.compatibilityFingerprint||{},P=R.policies||{};
  if(R.schemaVersion!=='orbit360-gate-contract-registry-v2-single-control-plane'||R.status!=='ACTIVE_STATIC_CONFIGURATION_SINGLE_CONTROL_PLANE'||R.stateBearing!==false||R.dynamicStateForbidden!==true||R.currentStateAuthority!==STATIC_GATE_LEDGER)fail('STATIC_GATE_REGISTRY_CONTRACT_STALE');
  if(C.workflow!==STATIC_GATE_WORKFLOW||C.stateContract!==STATIC_GATE_STATE_CONTRACT||C.singleStateInvariant!==STATIC_GATE_INVARIANT||C.writerRegistry!==STATIC_GATE_WRITER_REGISTRY||C.canonicalGatePreflight!==STATIC_GATE_CANONICAL_ROUTER||C.legacyDelegate!==STATIC_GATE_LEGACY_ROUTER)fail('STATIC_GATE_CONTROL_PLANE_BINDING_DRIFT');
  const actualFingerprints={canonicalRouterBlobSha:gitBlobSha(read(STATIC_GATE_CANONICAL_ROUTER)),legacyRouterBlobSha:gitBlobSha(read(STATIC_GATE_LEGACY_ROUTER)),canonicalWorkflowBlobSha:gitBlobSha(read(STATIC_GATE_WORKFLOW)),f2AuthorityBlobSha:gitBlobSha(read(STATIC_GATE_F2_AUTHORITY))};
  for(const [k,v] of Object.entries(actualFingerprints))if(String(F[k]||'')!==v)fail(`STATIC_GATE_COMPATIBILITY_FINGERPRINT_DRIFT:${k}`);
  const bindings=Array.isArray(R.routerBindings)?R.routerBindings:[];
  if(bindings.length<1)fail('STATIC_GATE_ROUTER_BINDINGS_EMPTY');
  const seen=new Set(),routerText=read(STATIC_GATE_CANONICAL_ROUTER).toString('utf8');
  for(const b of bindings){
    const key=`${b.gateId}::${b.profile||'default'}`;
    if(!b.gateId||!b.contractVersion||seen.has(key))fail(`STATIC_GATE_BINDING_INVALID:${key}`);seen.add(key);
    if(b.authority){
      if(b.authority!==STATIC_GATE_F2_AUTHORITY)fail(`STATIC_GATE_EXTERNAL_AUTHORITY_UNREGISTERED:${key}`);
      const a=json(b.authority);
      if(String(a.gateId||'')!==String(b.gateId)||String(a.gateContractVersion||'')!==String(b.contractVersion))fail(`STATIC_GATE_AUTHORITY_VERSION_DRIFT:${key}`);
    }else{
      if(!b.lifecycle||!b.engine||!fs.existsSync(A(b.lifecycle))||!fs.existsSync(A(b.engine)))fail(`STATIC_GATE_BINDING_DEPENDENCY_MISSING:${key}`);
      const l=json(b.lifecycle);
      if(String(l.gateId||'')!==String(b.gateId)||String(l.gateContractVersion||'')!==String(b.contractVersion))fail(`STATIC_GATE_LIFECYCLE_VERSION_DRIFT:${key}`);
      if(!routerText.includes(String(b.lifecycle))||!routerText.includes(String(b.engine))||!routerText.includes(String(b.contractVersion)))fail(`STATIC_GATE_CANONICAL_ROUTER_BINDING_DRIFT:${key}`);
      if((b.profile||'default')!=='default'&&!routerText.includes(String(b.profile)))fail(`STATIC_GATE_CANONICAL_ROUTER_PROFILE_DRIFT:${key}`);
    }
  }
  const legacy=R.legacyRouting||{};
  if(legacy.status!=='HISTORICAL_ONLY_DELEGATED'||legacy.delegate!==STATIC_GATE_LEGACY_ROUTER||legacy.activeAuthority!==false||legacy.mayCarryMutableState!==false)fail('STATIC_GATE_LEGACY_ROUTING_NOT_FROZEN');
  if(P.singleStaticGateRegistry!==true||P.routerRegistryParityRequired!==true||P.authorityRegistryParityRequired!==true||P.dynamicStateMustComeFromLedger!==true||P.newGateMustBeRegisteredBeforeExecution!==true||P.staleRegistryFailsClosed!==true||P.staleRouterFailsClosed!==true||P.legacyRouteCannotBecomeActiveWithoutRegistryPromotion!==true||P.productMutationOnParityFailure!==false||P.dataMutationOnParityFailure!==false||P.runtimeOnParityFailure!==false||P.deployOnParityFailure!==false)fail('STATIC_GATE_FAIL_CLOSED_POLICY_INVALID');
  return {ok:true,status:'STATIC_GATE_CONTROL_PLANE_PARITY_PASS',bindingCount:bindings.length,...actualFingerprints};
}

export const RELEASE_PHASE='PRODUCTION_SMOKE_PASS';
export const RELEASE_STATUS='PRODUCTION_GO_LIVE_PASS';
export const RELEASE_PROGRESS=100;
export const ACCESS_RECOVERY={
  gateId:'block-auth-paula-reset-link-handoff-lab-v20260817',
  projectId:'ays-orbit-360-lab',tenantId:'alianzas-soluciones',advisorId:'ase-paula-osorio',
  targetEmailHash:'9b663847979724e9491e1c655da32a7cb17a5f6ed26dba352de1eb811254b23f',
  forbiddenDemoEmailHash:'df9b0695cd8953be630689ec343ab3f25e3a7d400a8c2370a485e319f3e93d04',
  maxTargets:1,maxResetLinks:1
};
const releaseNext=new Set([
  'POST_GO_LIVE_MONITORING',
  'AWAIT_EXPLICIT_HUMAN_ACCESS_RECOVERY_AUTHORIZATION',
  'VERIFY_HUMAN_EMAIL_PASSWORD_LOGIN_AND_START_POST_GO_LIVE_FUNCTIONAL_VALIDATION',
  'DIAGNOSE_HUMAN_ACCESS_RECOVERY_ROOT_CAUSE_NO_GO_LIVE_REOPEN',
  'DIAGNOSE_ACCESS_RECOVERY_SOURCE_PREP_NO_GO_LIVE_REOPEN'
]);
export function milestoneKind(L){
  assertStaticGateContractParity();
  const phase=String(L.activeState?.phase||''),status=String(L.activeState?.status||''),progress=Number(L.progress?.productionRouteProgressPct),next=String(L.nextAction?.id||'');
  if(phase==='F2_TERMINAL_PASS_AWAITING_AUTHORIZED_GO_LIVE'&&status==='F2_TERMINAL_PASS'&&progress===85&&next==='AWAIT_EXPLICIT_GO_LIVE_AUTHORIZATION')return 'LEGACY_WAITING_FIXTURE';
  if(phase==='F2_TERMINAL_PASS_P1_SOURCE_ONLY_REQUIRED_BEFORE_GO_LIVE'&&status==='F2_TERMINAL_PASS'&&progress===85)return 'P1_REQUIRED';
  if(phase==='SINGLE_STATE_ROOTFIX_PASS_P2_RELEASE_HANDLER_REQUIRED'&&status==='SINGLE_STATE_ROOTFIX_PASS'&&progress===88)return 'P1_PASS';
  if(phase==='GO_LIVE_RELEASE_HANDLER_READY_P3_HANDSHAKE_REQUIRED'&&status==='GO_LIVE_RELEASE_HANDLER_READY'&&progress===91)return 'P2_PASS';
  if(phase==='CONTROL_PLANE_FROZEN_BASELINE_AWAITING_GO_LIVE_AUTHORIZATION'&&status==='FINAL_RELEASE_HANDSHAKE_PASS'&&progress===93&&next==='AWAIT_EXPLICIT_GO_LIVE_AUTHORIZATION')return 'P3_PASS';
  if(phase==='AUTHORIZED_RELEASE_WINDOW_RUNNING'&&status==='AUTHORIZED_RELEASE_WINDOW_CLAIMED'&&progress===93)return 'RELEASE_CLAIMED';
  if(phase==='AUTHORIZED_RELEASE_WINDOW_FAILED'&&status==='RELEASE_TERMINAL_FAIL_NO_REPLAY'&&progress===93)return 'RELEASE_FAIL';
  if(phase===RELEASE_PHASE&&status===RELEASE_STATUS&&progress===100&&releaseNext.has(next))return 'RELEASE_PASS';
  if(phase==='POST_GO_LIVE_ACCESS_RECOVERY_SOURCE_PREP_RUNNING'&&status==='SOURCE_ONLY_CLAIMED'&&progress===100)return 'ACCESS_SOURCE_CLAIMED';
  if(phase==='POST_GO_LIVE_ACCESS_RECOVERY_RUNNING'&&status==='AUTHORIZED_RECOVERY_CLAIMED'&&progress===100)return 'ACCESS_RUNTIME_CLAIMED';
  if(phase==='POST_GO_LIVE_CONTROL_PLANE_METADATA_RECONCILE_RUNNING'&&status==='SOURCE_ONLY_CLAIMED'&&progress===100)return 'METADATA_RECONCILE_CLAIMED';
  return '';
}
export function assertRecoveryTarget(intent,fail){
  const t=intent?.target||{};
  if(String(t.projectId||'')!==ACCESS_RECOVERY.projectId)fail('ACCESS_RECOVERY_PROJECT_MISMATCH');
  if(String(t.tenantId||'')!==ACCESS_RECOVERY.tenantId)fail('ACCESS_RECOVERY_TENANT_MISMATCH');
  if(String(t.advisorId||'')!==ACCESS_RECOVERY.advisorId)fail('ACCESS_RECOVERY_ADVISOR_MISMATCH');
  if(String(t.emailHash||'')!==ACCESS_RECOVERY.targetEmailHash)fail('ACCESS_RECOVERY_TARGET_EMAIL_MISMATCH');
  if(String(t.emailHash||'')===ACCESS_RECOVERY.forbiddenDemoEmailHash)fail('ACCESS_RECOVERY_DEMO_IDENTITY_FORBIDDEN');
  if(Number(t.targetCount)!==1)fail('ACCESS_RECOVERY_TARGET_COUNT_INVALID');
}
export function assertReleaseMilestoneFrozen(L,fail){
  const m=L.releaseMilestone;
  if(!m)return;
  if(m.closed!==true||m.immutable!==true||m.phase!==RELEASE_PHASE||m.status!==RELEASE_STATUS||Number(m.progress)!==100)fail('GO_LIVE_RELEASE_MILESTONE_REOPENED');
}
export function freezeReleaseMilestone(L){
  if(!L.releaseMilestone)L.releaseMilestone={closed:true,immutable:true,phase:RELEASE_PHASE,status:RELEASE_STATUS,progress:100,closedAtUtc:L.history?.latestExecutionTerminal?.reducedAtUtc||L.updatedAtUtc||null};
  return L;
}
export function assertFollowupConsistency(L,fail){
  const f=L.postGoLiveAccessRecovery;if(!f)return;
  if(['POST_GO_LIVE_ACCESS_RECOVERY_SOURCE_PREP_RUNNING','POST_GO_LIVE_ACCESS_RECOVERY_RUNNING','POST_GO_LIVE_CONTROL_PLANE_METADATA_RECONCILE_RUNNING'].includes(String(L.activeState?.phase||'')))return;
  const next=String(L.nextAction?.id||'');
  if(f.status==='SOURCE_PREPARED_AWAITING_AUTHORIZATION'&&next!=='AWAIT_EXPLICIT_HUMAN_ACCESS_RECOVERY_AUTHORIZATION')fail('ACCESS_RECOVERY_NEXT_ACTION_DESYNC');
  if(f.status==='RESET_LINK_READY_FOR_PRIVATE_HANDOFF'&&next!=='VERIFY_HUMAN_EMAIL_PASSWORD_LOGIN_AND_START_POST_GO_LIVE_FUNCTIONAL_VALIDATION')fail('ACCESS_RECOVERY_NEXT_ACTION_DESYNC');
  if(f.goLiveReopened===true)fail('ACCESS_RECOVERY_MUST_NOT_REOPEN_GO_LIVE');
}
