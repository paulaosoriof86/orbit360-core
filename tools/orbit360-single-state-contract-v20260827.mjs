'use strict';
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
