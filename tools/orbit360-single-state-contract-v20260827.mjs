'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const STATIC_GATE_REGISTRY='tools/orbit360-gate-contract-registry-v20260717.json';
const STATIC_GATE_CANONICAL_ROUTER='tools/orbit360-validar-gate-contracts-v20260717.mjs';
const STATIC_GATE_LEGACY_ROUTER='tools/orbit360-validar-gate-contracts-legacy-v20260717.mjs';
const STATIC_GATE_ENGINE_FENCE='tools/orbit360-historical-gate-engine-fence-v20260827.mjs';
const STATIC_GATE_WORKFLOW='.github/workflows/orbit360-continuity-canonical-source-only-v20260820.yml';
const STATIC_GATE_F2_AUTHORITY='tools/orbit360-gate-contract-f2-productive-acceptance-v20260820.json';
const STATIC_GATE_LEDGER='orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json';
const STATIC_GATE_WRITER_REGISTRY='orbit360-platform/docs/orbit360-continuity-writer-registry-v20260820.json';
const STATIC_GATE_INVARIANT='tools/orbit360-single-state-invariant-v20260827.mjs';
const STATIC_GATE_STATE_CONTRACT='tools/orbit360-single-state-contract-v20260827.mjs';
const HISTORICAL_BINDING_COUNT=16;
const HISTORICAL_EXECUTION_MODE='HISTORICAL_FROZEN_NO_EXECUTION';
const HISTORICAL_LIFECYCLE_STATUS='HISTORICAL_FROZEN_NON_AUTHORITATIVE';
const CANONICAL_ROUTER_FENCE='HISTORICAL_GATE_EXECUTION_FORBIDDEN_SINGLE_STATE_LEDGER_ONLY';
const LEGACY_ROUTER_FENCE='LEGACY_GATE_EXECUTION_FORBIDDEN_SINGLE_STATE_LEDGER_ONLY';
const ENGINE_FENCE='HISTORICAL_GATE_ENGINE_EXECUTION_FORBIDDEN_SINGLE_STATE_LEDGER_ONLY';
const FORBIDDEN_LIFECYCLE_STATE_KEYS=new Set(['currentPhase','authorization','authorizations','executionAuthorization','allowedExecutions','runId','runtimeResult','result','runtimeSnapshot','claim','claims','requestMaterialized','authorizationPersisted','consumedAt','executionCount']);

function gitBlobSha(buffer){
  const header=Buffer.from(`blob ${buffer.length}\0`,'utf8');
  return createHash('sha1').update(header).update(buffer).digest('hex');
}
function walkForbiddenState(value,prefix='',hits=[]){
  if(!value||typeof value!=='object')return hits;
  if(Array.isArray(value)){value.forEach((v,i)=>walkForbiddenState(v,`${prefix}[${i}]`,hits));return hits;}
  for(const [k,v] of Object.entries(value)){
    const p=prefix?`${prefix}.${k}`:k;
    if(FORBIDDEN_LIFECYCLE_STATE_KEYS.has(k))hits.push(p);
    walkForbiddenState(v,p,hits);
  }
  return hits;
}
function collectIssues(root,R){
  const issues=[];
  const A=p=>path.join(root,p);
  const exists=p=>fs.existsSync(A(p));
  const read=p=>fs.readFileSync(A(p));
  const text=p=>read(p).toString('utf8').replace(/^\uFEFF/,'');
  const json=p=>JSON.parse(text(p));
  const need=p=>{if(!exists(p))issues.push(`CONTROL_DEPENDENCY_MISSING:${p}`);};
  [STATIC_GATE_REGISTRY,STATIC_GATE_CANONICAL_ROUTER,STATIC_GATE_LEGACY_ROUTER,STATIC_GATE_ENGINE_FENCE,STATIC_GATE_WORKFLOW,STATIC_GATE_F2_AUTHORITY,STATIC_GATE_LEDGER,STATIC_GATE_WRITER_REGISTRY,STATIC_GATE_INVARIANT,STATIC_GATE_STATE_CONTRACT].forEach(need);
  if(issues.length)return issues;
  const C=R.canonicalControlPlane||{},F=R.compatibilityFingerprint||{},P=R.policies||{};
  if(R.schemaVersion!=='orbit360-gate-contract-registry-v3-single-state-static-authority'||R.status!=='ACTIVE_STATIC_CONFIGURATION_SINGLE_STATE_LEDGER_ONLY'||R.stateBearing!==false||R.dynamicStateForbidden!==true||R.historicalExecutionForbidden!==true||R.currentStateAuthority!==STATIC_GATE_LEDGER)issues.push('REGISTRY_CONTRACT_STALE');
  if(C.workflow!==STATIC_GATE_WORKFLOW||C.stateContract!==STATIC_GATE_STATE_CONTRACT||C.singleStateInvariant!==STATIC_GATE_INVARIANT||C.writerRegistry!==STATIC_GATE_WRITER_REGISTRY||C.canonicalGatePreflight!==STATIC_GATE_CANONICAL_ROUTER||C.legacyDelegate!==STATIC_GATE_LEGACY_ROUTER||C.historicalEngineFence!==STATIC_GATE_ENGINE_FENCE)issues.push('CONTROL_PLANE_BINDING_DRIFT');
  const actual={canonicalRouterBlobSha:gitBlobSha(read(STATIC_GATE_CANONICAL_ROUTER)),legacyRouterBlobSha:gitBlobSha(read(STATIC_GATE_LEGACY_ROUTER)),historicalEngineFenceBlobSha:gitBlobSha(read(STATIC_GATE_ENGINE_FENCE)),canonicalWorkflowBlobSha:gitBlobSha(read(STATIC_GATE_WORKFLOW)),f2AuthorityBlobSha:gitBlobSha(read(STATIC_GATE_F2_AUTHORITY)),singleStateInvariantBlobSha:gitBlobSha(read(STATIC_GATE_INVARIANT)),writerRegistryBlobSha:gitBlobSha(read(STATIC_GATE_WRITER_REGISTRY)),stateContractBlobSha:gitBlobSha(read(STATIC_GATE_STATE_CONTRACT))};
  for(const [k,v] of Object.entries(actual))if(String(F[k]||'')!==v)issues.push(`COMPATIBILITY_FINGERPRINT_DRIFT:${k}`);
  const router=text(STATIC_GATE_CANONICAL_ROUTER),legacy=text(STATIC_GATE_LEGACY_ROUTER),fence=text(STATIC_GATE_ENGINE_FENCE),workflow=text(STATIC_GATE_WORKFLOW);
  if(!router.includes(CANONICAL_ROUTER_FENCE)||/from ['"]node:child_process|require\(['"](?:node:)?child_process|spawnSync\(|execSync\(/i.test(router))issues.push('CANONICAL_ROUTER_NOT_INERT');
  if(!legacy.includes(LEGACY_ROUTER_FENCE)||/from ['"]node:child_process|require\(['"](?:node:)?child_process|spawnSync\(|execSync\(/i.test(legacy))issues.push('LEGACY_ROUTER_NOT_INERT');
  if(!fence.includes(ENGINE_FENCE)||!/process\.exit\(41\)/.test(fence)||/from ['"]node:child_process|require\(['"](?:node:)?child_process|spawnSync\(|execSync\(/i.test(fence))issues.push('HISTORICAL_ENGINE_FENCE_NOT_INERT');
  const bindings=Array.isArray(R.historicalBindings)?R.historicalBindings:[];
  if(bindings.length!==HISTORICAL_BINDING_COUNT)issues.push(`HISTORICAL_BINDING_COUNT_INVALID:${bindings.length}`);
  if(Array.isArray(R.routerBindings)&&R.routerBindings.length)issues.push('ACTIVE_ROUTER_BINDINGS_FORBIDDEN');
  const seen=new Set();let lifecycleCount=0,authorityCount=0;
  for(const b of bindings){
    const profile=b.profile||'default',key=`${b.gateId||''}::${profile}`;
    if(!b.gateId||!b.contractVersion||seen.has(key))issues.push(`BINDING_INVALID:${key}`);else seen.add(key);
    if(b.executionMode!==HISTORICAL_EXECUTION_MODE||b.activeAuthority!==false)issues.push(`BINDING_EXECUTION_NOT_FROZEN:${key}`);
    if(b.authorityArtifact){
      authorityCount++;
      if(b.authorityArtifact!==STATIC_GATE_F2_AUTHORITY||!exists(b.authorityArtifact))issues.push(`AUTHORITY_ARTIFACT_INVALID:${key}`);
      else{
        const a=json(b.authorityArtifact);
        if(String(a.gateId||'')!==String(b.gateId)||String(a.gateContractVersion||'')!==String(b.contractVersion)||a.stateBearing!==false||a.currentStateAuthority!==STATIC_GATE_LEDGER)issues.push(`AUTHORITY_CONTRACT_DRIFT:${key}`);
        if(String(b.authorityBlobSha||'')!==gitBlobSha(read(b.authorityArtifact)))issues.push(`AUTHORITY_FINGERPRINT_DRIFT:${key}`);
      }
      continue;
    }
    lifecycleCount++;
    if(!b.lifecycleArtifact||!b.engineArtifact){issues.push(`HISTORICAL_ARTIFACT_BINDING_INCOMPLETE:${key}`);continue;}
    if(!exists(b.lifecycleArtifact)){issues.push(`LIFECYCLE_ARTIFACT_MISSING:${key}`);}else{
      const l=json(b.lifecycleArtifact);
      if(l.schemaVersion!=='orbit360-validator-lifecycle-historical-tombstone-v1'||l.status!==HISTORICAL_LIFECYCLE_STATUS||l.stateBearing!==false||l.dynamicStateForbidden!==true||l.executionAuthority!==false||l.runtimeAllowed!==false||l.currentStateAuthority!==STATIC_GATE_LEDGER)issues.push(`LIFECYCLE_NOT_STATIC_TOMBSTONE:${key}`);
      if('gateId' in l||'gateContractVersion' in l||'profile' in l)issues.push(`LIFECYCLE_DUPLICATES_STATIC_AUTHORITY:${key}`);
      const hits=walkForbiddenState(l);if(hits.length)issues.push(`LIFECYCLE_MUTABLE_STATE_PRESENT:${key}:${hits.join(',')}`);
      if(String(b.lifecycleBlobSha||'')!==gitBlobSha(read(b.lifecycleArtifact)))issues.push(`LIFECYCLE_FINGERPRINT_DRIFT:${key}`);
    }
    if(!exists(b.engineArtifact)){issues.push(`ENGINE_ARTIFACT_MISSING:${key}`);}else{
      const e=text(b.engineArtifact);
      if(!e.includes("import './orbit360-historical-gate-engine-fence-v20260827.mjs'"))issues.push(`ENGINE_NOT_FENCED:${key}`);
      if(String(b.engineBlobSha||'')!==gitBlobSha(read(b.engineArtifact)))issues.push(`ENGINE_FINGERPRINT_DRIFT:${key}`);
    }
    if(workflow.includes(String(b.lifecycleArtifact))||workflow.includes(String(b.engineArtifact)))issues.push(`CANONICAL_WORKFLOW_REFERENCES_HISTORICAL_ARTIFACT:${key}`);
  }
  if(lifecycleCount!==15||authorityCount!==1)issues.push(`HISTORICAL_BINDING_KIND_COUNT_INVALID:${lifecycleCount}:${authorityCount}`);
  const LR=R.legacyRouting||{};
  if(LR.status!=='HISTORICAL_FROZEN_NO_EXECUTION'||LR.delegate!==STATIC_GATE_LEGACY_ROUTER||LR.activeAuthority!==false||LR.mayCarryMutableState!==false||LR.executionForbidden!==true)issues.push('LEGACY_ROUTING_NOT_FROZEN');
  if(P.singleStaticGateRegistry!==true||P.singleMutableStateLedger!==true||P.dynamicStateMustComeFromLedger!==true||P.historicalLifecycleStateForbidden!==true||P.historicalEngineExecutionForbidden!==true||P.newGateMustUseSingleStateControlPlane!==true||P.productMutationOnParityFailure!==false||P.dataMutationOnParityFailure!==false||P.runtimeOnParityFailure!==false||P.deployOnParityFailure!==false)issues.push('FAIL_CLOSED_POLICY_INVALID');
  return issues;
}

export function assertStaticGateContractParity(root=process.cwd(),fail=(code)=>{throw new Error(code);}){
  const p=path.join(root,STATIC_GATE_REGISTRY);
  if(!fs.existsSync(p))fail(`STATIC_GATE_CONTROL_DEPENDENCY_MISSING:${STATIC_GATE_REGISTRY}`);
  let R;try{R=JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));}catch(e){fail(`STATIC_GATE_REGISTRY_INVALID_JSON:${String(e?.message||e)}`);}
  const issues=collectIssues(root,R);
  if(issues.length)fail(`STATIC_GATE_CONTROL_PLANE_PARITY_FAIL:${issues.slice(0,64).join('|')}`);
  const drift=structuredClone(R);
  if(!Array.isArray(drift.historicalBindings)||!drift.historicalBindings.length)fail('STATIC_GATE_SYNTHETIC_DRIFT_FIXTURE_MISSING');
  drift.historicalBindings[0].executionMode='ACTIVE_EXECUTION';
  const driftIssues=collectIssues(root,drift);
  if(!driftIssues.some(x=>x.startsWith('BINDING_EXECUTION_NOT_FROZEN:')))fail('STATIC_GATE_SYNTHETIC_DRIFT_NOT_BLOCKED');
  return {ok:true,status:'STATIC_GATE_CONTROL_PLANE_PARITY_PASS',bindingCount:R.historicalBindings.length,historicalLifecycleTombstones:15,historicalAuthorityArtifacts:1,syntheticDrift:'FAIL_CLOSED_CONFIRMED',currentStateAuthority:STATIC_GATE_LEDGER};
}

export const RELEASE_PHASE='PRODUCTION_SMOKE_PASS';
export const RELEASE_STATUS='PRODUCTION_GO_LIVE_PASS';
export const RELEASE_PROGRESS=100;
export const ACCESS_RECOVERY={gateId:'block-auth-paula-reset-link-handoff-lab-v20260817',projectId:'ays-orbit-360-lab',tenantId:'alianzas-soluciones',advisorId:'ase-paula-osorio',targetEmailHash:'9b663847979724e9491e1c655da32a7cb17a5f6ed26dba352de1eb811254b23f',forbiddenDemoEmailHash:'df9b0695cd8953be630689ec343ab3f25e3a7d400a8c2370a485e319f3e93d04',maxTargets:1,maxResetLinks:1};
const releaseNext=new Set(['POST_GO_LIVE_MONITORING','AWAIT_EXPLICIT_HUMAN_ACCESS_RECOVERY_AUTHORIZATION','VERIFY_HUMAN_EMAIL_PASSWORD_LOGIN_AND_START_POST_GO_LIVE_FUNCTIONAL_VALIDATION','DIAGNOSE_HUMAN_ACCESS_RECOVERY_ROOT_CAUSE_NO_GO_LIVE_REOPEN','DIAGNOSE_ACCESS_RECOVERY_SOURCE_PREP_NO_GO_LIVE_REOPEN']);
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
export function assertRecoveryTarget(intent,fail){const t=intent?.target||{};if(String(t.projectId||'')!==ACCESS_RECOVERY.projectId)fail('ACCESS_RECOVERY_PROJECT_MISMATCH');if(String(t.tenantId||'')!==ACCESS_RECOVERY.tenantId)fail('ACCESS_RECOVERY_TENANT_MISMATCH');if(String(t.advisorId||'')!==ACCESS_RECOVERY.advisorId)fail('ACCESS_RECOVERY_ADVISOR_MISMATCH');if(String(t.emailHash||'')!==ACCESS_RECOVERY.targetEmailHash)fail('ACCESS_RECOVERY_TARGET_EMAIL_MISMATCH');if(String(t.emailHash||'')===ACCESS_RECOVERY.forbiddenDemoEmailHash)fail('ACCESS_RECOVERY_DEMO_IDENTITY_FORBIDDEN');if(Number(t.targetCount)!==1)fail('ACCESS_RECOVERY_TARGET_COUNT_INVALID');}
export function assertReleaseMilestoneFrozen(L,fail){const m=L.releaseMilestone;if(!m)return;if(m.closed!==true||m.immutable!==true||m.phase!==RELEASE_PHASE||m.status!==RELEASE_STATUS||Number(m.progress)!==100)fail('GO_LIVE_RELEASE_MILESTONE_REOPENED');}
export function freezeReleaseMilestone(L){if(!L.releaseMilestone)L.releaseMilestone={closed:true,immutable:true,phase:RELEASE_PHASE,status:RELEASE_STATUS,progress:100,closedAtUtc:L.history?.latestExecutionTerminal?.reducedAtUtc||L.updatedAtUtc||null};return L;}
export function assertFollowupConsistency(L,fail){const f=L.postGoLiveAccessRecovery;if(!f)return;if(['POST_GO_LIVE_ACCESS_RECOVERY_SOURCE_PREP_RUNNING','POST_GO_LIVE_ACCESS_RECOVERY_RUNNING','POST_GO_LIVE_CONTROL_PLANE_METADATA_RECONCILE_RUNNING'].includes(String(L.activeState?.phase||'')))return;const next=String(L.nextAction?.id||'');if(f.status==='SOURCE_PREPARED_AWAITING_AUTHORIZATION'&&next!=='AWAIT_EXPLICIT_HUMAN_ACCESS_RECOVERY_AUTHORIZATION')fail('ACCESS_RECOVERY_NEXT_ACTION_DESYNC');if(f.status==='RESET_LINK_READY_FOR_PRIVATE_HANDOFF'&&next!=='VERIFY_HUMAN_EMAIL_PASSWORD_LOGIN_AND_START_POST_GO_LIVE_FUNCTIONAL_VALIDATION')fail('ACCESS_RECOVERY_NEXT_ACTION_DESYNC');if(f.goLiveReopened===true)fail('ACCESS_RECOVERY_MUST_NOT_REOPEN_GO_LIVE');}
