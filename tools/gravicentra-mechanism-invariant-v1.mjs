import fs from 'node:fs';

const need=(ok,code)=>{if(!ok)throw new Error(code);};
const read=p=>fs.readFileSync(p,'utf8');
const json=p=>JSON.parse(read(p));
const exists=p=>fs.existsSync(p);
const WF='.github/workflows';
const CONTROL='artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json';
const STATE='artifacts/orbit360-recovery/release-control/RECOVERY_STATE.json';
const LOCK='artifacts/orbit360-recovery/release-control/ACTIVE_RELEASE_LOCK.json';
const OLD_GUARD='tools/gravicentra-release-lineage-guard.mjs';
const NEW_GUARD='tools/gravicentra-control-plane-guard-v2.mjs';
const I3='.github/workflows/gravicentra-recovery-i3-preview-v2.yml';
const I4A='.github/workflows/gravicentra-recovery-i4a-public-browser.yml';
const CENTRAL='.github/workflows/gravicentra-release-lock-sync.yml';
const HARNESS='tools/gravicentra-i4a-authenticated-browser-v2.mjs';

for(const p of [CONTROL,STATE,LOCK,OLD_GUARD,NEW_GUARD,I3,I4A,CENTRAL,HARNESS]) need(exists(p),'MECHANISM_REQUIRED_FILE_MISSING:'+p);
const c=json(CONTROL);
need(c.mechanismRules?.singleMutableAuthority==='THIS_FILE','MECHANISM_SINGLE_MUTABLE_AUTHORITY_NOT_DECLARED');
need(c.mechanismRules?.hardcodedReleaseIdentityInWorkflowsForbidden===true,'MECHANISM_HARDCODE_RULE_NOT_DECLARED');
need(c.mechanismRules?.qaHarnessSelfPatchForbidden===true,'MECHANISM_QA_SELF_PATCH_RULE_NOT_DECLARED');
need(c.mechanismRules?.oneGateExecutorAtATime===true,'MECHANISM_SINGLE_EXECUTOR_RULE_NOT_DECLARED');

for(const p of [STATE,LOCK]){
  const d=json(p);
  need(d.schemaVersion==='gravicentra-deprecated-authority-v1','DEPRECATED_AUTHORITY_SCHEMA_INVALID:'+p);
  need(d.status==='DEPRECATED_NON_AUTHORITATIVE','DEPRECATED_AUTHORITY_REACTIVATED:'+p);
  need(d.canonicalAuthority===CONTROL,'DEPRECATED_AUTHORITY_POINTER_DRIFT:'+p);
  need(d.mayGovernWorkflow===false,'DEPRECATED_AUTHORITY_MAY_GOVERN:'+p);
}
const oldGuard=read(OLD_GUARD);
need(oldGuard.includes('DEPRECATED_RELEASE_LINEAGE_GUARD'),'OLD_GUARD_NOT_FAIL_CLOSED');
need(!oldGuard.includes('ACTIVE_RELEASE_LOCK.json'),'OLD_GUARD_STILL_CONSUMES_RELEASE_LOCK');
need(!oldGuard.includes('RECOVERY_STATE.json'),'OLD_GUARD_STILL_CONSUMES_RECOVERY_STATE');

const i3=read(I3);
need(i3.includes('workflow_dispatch:'),'I3_DISPATCH_TRIGGER_MISSING');
need(!/\n\s*push\s*:/.test(i3),'I3_AUTOMATIC_PUSH_TRIGGER_FORBIDDEN');
need(i3.includes('gravicentra-control-plane-guard-v2.mjs --mode=i3'),'I3_CONTROL_PLANE_GUARD_MISSING');
need(!i3.includes('gravicentra-release-lineage-guard.mjs'),'I3_OLD_GUARD_REFERENCE_FORBIDDEN');
need(!i3.includes('RECOVERY_STATE.json')&&!i3.includes('ACTIVE_RELEASE_LOCK.json'),'I3_SPLIT_AUTHORITY_REFERENCE_FORBIDDEN');
need(!/^\s*SOURCE_SHA:\s*[0-9a-f]{40}\s*$/m.test(i3),'I3_HARDCODED_SOURCE_FORBIDDEN');
need(!/^\s*BUILD_ID:\s*gi-i3-/m.test(i3),'I3_HARDCODED_BUILD_FORBIDDEN');
need(!/^\s*PREVIEW_URL:\s*https:\/\//m.test(i3),'I3_HARDCODED_PREVIEW_FORBIDDEN');

const i4a=read(I4A);
need(i4a.includes('workflow_dispatch:'),'I4A_DISPATCH_TRIGGER_MISSING');
need(!/\n\s*push\s*:/.test(i4a),'I4A_AUTOMATIC_PUSH_TRIGGER_FORBIDDEN');
need(i4a.includes('gravicentra-control-plane-guard-v2.mjs --mode=i4a'),'I4A_CONTROL_PLANE_GUARD_MISSING');
need(!i4a.includes('gravicentra-release-lineage-guard.mjs'),'I4A_OLD_GUARD_REFERENCE_FORBIDDEN');
need(!i4a.includes('RECOVERY_STATE.json')&&!i4a.includes('ACTIVE_RELEASE_LOCK.json'),'I4A_SPLIT_AUTHORITY_REFERENCE_FORBIDDEN');
need(!/^\s*SOURCE_SHA:\s*[0-9a-f]{40}\s*$/m.test(i4a),'I4A_HARDCODED_SOURCE_FORBIDDEN');
need(!/^\s*BUILD_ID:\s*gi-i3-/m.test(i4a),'I4A_HARDCODED_BUILD_FORBIDDEN');
need(!/^\s*PREVIEW_URL:\s*https:\/\//m.test(i4a),'I4A_HARDCODED_PREVIEW_FORBIDDEN');
need(i4a.includes('jobs:\n  i4a-authoritative:'),'I4A_SINGLE_AUTHORITATIVE_JOB_MISSING');
for(const stale of ['public-browser:','bootstrap-diagnostic:','authenticated-browser:','Correct authenticated discriminants','QA_PATCH_']) need(!i4a.includes(stale),'I4A_STALE_PARALLEL_OR_PATCH_PATTERN:'+stale);
need(!i4a.includes("Path('tools/gravicentra-i4a-authenticated-browser-v2.mjs')"),'I4A_RUNTIME_HARNESS_REWRITE_FORBIDDEN');
need(!i4a.includes('p.write_text(s'),'I4A_RUNTIME_HARNESS_WRITE_FORBIDDEN');

const harness=read(HARNESS);
need(!harness.includes('fb09b03bc5e45a68e129237eae6e47f1023164dc'),'I4A_HARNESS_OLD_SOURCE_PIN_FORBIDDEN');
need(harness.includes('qaHarnessPatchedAtRuntime:false'),'I4A_HARNESS_COMMITTED_IDENTITY_MARKER_MISSING');
need(harness.includes('waitFinanceReadModels'),'I4A_HARNESS_FINANCE_READMODEL_DISCRIMINANT_MISSING');
need(harness.includes('CLIENTE360_EVENT_LOOP_BLOCKED_STABLE'),'I4A_HARNESS_CLIENTE_STABLE_HEARTBEAT_MISSING');
need(harness.includes('POLIZAS_EVENT_LOOP_BLOCKED_STABLE'),'I4A_HARNESS_POLIZAS_STABLE_HEARTBEAT_MISSING');
need(harness.includes('COBROS_VISIBLE_ROWS_EXCEED_SCOPED_COBROS'),'I4A_HARNESS_COBROS_SEMANTIC_ASSERTION_MISSING');

const names=fs.readdirSync(WF).filter(x=>x.endsWith('.yml')||x.endsWith('.yaml'));
const i4aExecutors=names.filter(x=>x.startsWith('gravicentra-i4a-')||x.startsWith('gravicentra-recovery-i4a-'));
need(i4aExecutors.length===1&&i4aExecutors[0]==='gravicentra-recovery-i4a-public-browser.yml','PARALLEL_I4A_EXECUTOR_REINTRODUCED:'+i4aExecutors.join(','));

const gravicentraFiles=names.filter(x=>x.startsWith('gravicentra-'));
for(const name of gravicentraFiles){
  const text=read(`${WF}/${name}`);
  if(name!=='gravicentra-release-lock-sync.yml'){
    need(!text.includes('RECOVERY_STATE.json')&&!text.includes('ACTIVE_RELEASE_LOCK.json'),'GRAVICENTRA_WORKFLOW_SPLIT_AUTHORITY_CONSUMPTION:'+name);
  }else{
    need(text.includes('RECOVERY_STATE.json')&&text.includes('ACTIVE_RELEASE_LOCK.json'),'CENTRAL_TOMBSTONE_WATCH_MISSING');
    need(!text.includes('GRAVICENTRA_RECOVERY_STATE')&&!text.includes('GRAVICENTRA_RELEASE_LOCK'),'CENTRAL_TOMBSTONE_CONSUMPTION_FORBIDDEN');
  }
  need(!text.includes('gravicentra-release-lineage-guard.mjs'),'GRAVICENTRA_WORKFLOW_OLD_GUARD_REFERENCE:'+name);
}

console.log('GRAVICENTRA_MECHANISM_INVARIANT=PASS');
console.log('CANONICAL_MUTABLE_AUTHORITY='+CONTROL);
console.log('I4A_EXECUTOR_COUNT='+i4aExecutors.length);
console.log('I3_PUSH_TRIGGER=false');
console.log('I4A_PUSH_TRIGGER=false');
console.log('I4A_RUNTIME_SELF_PATCH=false');
console.log('SPLIT_AUTHORITY_ACTIVE=false');
console.log('TOMBSTONE_WATCH_ACTIVE=true');
