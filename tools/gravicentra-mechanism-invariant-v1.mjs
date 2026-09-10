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
const I2='.github/workflows/gravicentra-recovery-i2-source-contract.yml';
const I3='.github/workflows/gravicentra-recovery-i3-preview-v2.yml';
const I4A='.github/workflows/gravicentra-recovery-i4a-public-browser.yml';
const I2_INTENT='artifacts/orbit360-recovery/release-control/I2_EXECUTION_INTENT.json';
const I3_INTENT='artifacts/orbit360-recovery/release-control/I3_EXECUTION_INTENT.json';
const I4A_INTENT='artifacts/orbit360-recovery/release-control/I4A_EXECUTION_INTENT.json';
const CENTRAL='.github/workflows/gravicentra-release-lock-sync.yml';
const HARNESS='tools/gravicentra-i4a-authenticated-browser-v2.mjs';

for(const p of [CONTROL,STATE,LOCK,OLD_GUARD,NEW_GUARD,I2,I3,I4A,CENTRAL,HARNESS]) need(exists(p),'MECHANISM_REQUIRED_FILE_MISSING:'+p);
const c=json(CONTROL);
need(c.mechanismRules?.singleMutableAuthority==='THIS_FILE','MECHANISM_SINGLE_MUTABLE_AUTHORITY_NOT_DECLARED');
need(c.mechanismRules?.hardcodedReleaseIdentityInWorkflowsForbidden===true,'MECHANISM_HARDCODE_RULE_NOT_DECLARED');
need(c.mechanismRules?.qaHarnessSelfPatchForbidden===true,'MECHANISM_QA_SELF_PATCH_RULE_NOT_DECLARED');
need(c.mechanismRules?.oneGateExecutorAtATime===true,'MECHANISM_SINGLE_EXECUTOR_RULE_NOT_DECLARED');
need(c.mechanismRules?.i2I3ScopedIntentExecution===true,'MECHANISM_I2_I3_SCOPED_INTENT_RULE_NOT_DECLARED');
need(c.mechanismRules?.completeAncestryForControlCheckouts===true,'MECHANISM_COMPLETE_ANCESTRY_RULE_NOT_DECLARED');
need(c.mechanismRules?.i3MustConsumeNextCandidateDuringSuccessorLifecycle===true,'MECHANISM_I3_SUCCESSOR_RULE_NOT_DECLARED');
need(c.mechanismRules?.centralGuardBroadGravicentraWatch===true,'MECHANISM_CENTRAL_BROAD_WATCH_RULE_NOT_DECLARED');

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

function validateScopedExecutor(path,intent,mode,label){
  const t=read(path);
  need(t.includes('workflow_dispatch:'),label+'_DISPATCH_TRIGGER_MISSING');
  const scoped="push:\n    branches:\n      - recovery/fase-a-clean-20260831\n    paths:\n      - "+intent;
  need(t.includes(scoped),label+'_SCOPED_INTENT_TRIGGER_MISSING');
  need((t.match(/\n\s*push\s*:/g)||[]).length===1,label+'_MULTIPLE_PUSH_TRIGGERS_FORBIDDEN');
  need(t.includes('non-authoritative '+label+' intent')||t.includes('non-authoritative '+label.toLowerCase()+' intent')||t.includes('non-authoritative I'+label.slice(1)+' intent'),label+'_INTENT_VALIDATOR_MISSING');
  need(t.includes('x.nonAuthoritative===true'),label+'_INTENT_NONAUTHORITATIVE_ASSERTION_MISSING');
  need(t.includes('x.sourceSha===c.nextCandidate.sourceSha'),label+'_INTENT_SOURCE_BINDING_MISSING');
  need(t.includes('x.sourceTree===c.nextCandidate.sourceTree'),label+'_INTENT_TREE_BINDING_MISSING');
  need(t.includes('fetch-depth: 0'),label+'_CONTROL_COMPLETE_ANCESTRY_MISSING');
  need(t.includes('gravicentra-control-plane-guard-v2.mjs --mode='+mode),label+'_CONTROL_PLANE_GUARD_MISSING');
  need(!t.includes('gravicentra-release-lineage-guard.mjs'),label+'_OLD_GUARD_REFERENCE_FORBIDDEN');
  need(!t.includes('RECOVERY_STATE.json')&&!t.includes('ACTIVE_RELEASE_LOCK.json'),label+'_SPLIT_AUTHORITY_REFERENCE_FORBIDDEN');
  need(!/^\s*SOURCE_SHA:\s*[0-9a-f]{40}\s*$/m.test(t),label+'_HARDCODED_SOURCE_FORBIDDEN');
}
validateScopedExecutor(I2,I2_INTENT,'i2','I2');
validateScopedExecutor(I3,I3_INTENT,'i3','I3');
const i2=read(I2), i3=read(I3);
need(i2.includes('ref: ${{ steps.candidate.outputs.source_sha }}'),'I2_EXACT_CANDIDATE_CHECKOUT_MISSING');
need(i3.includes('ref: ${{ steps.release.outputs.source_sha }}'),'I3_EXACT_SUCCESSOR_CHECKOUT_MISSING');
need(!/^\s*BUILD_ID:\s*gi-i3-/m.test(i3),'I3_HARDCODED_BUILD_FORBIDDEN');
need(!/^\s*PREVIEW_URL:\s*https:\/\//m.test(i3),'I3_HARDCODED_PREVIEW_FORBIDDEN');

const guard=read(NEW_GUARD);
need(guard.includes("const successorMode=MODE==='i2'||MODE==='i3'"),'CONTROL_GUARD_I3_SUCCESSOR_MODE_MISSING');
need(guard.includes("? {SOURCE_SHA:String(N.sourceSha)}"),'CONTROL_GUARD_I3_NEXT_CANDIDATE_EXPORT_MISSING');
need(guard.includes("['I2_IN_PROGRESS','I3_IN_PROGRESS'].includes(C.status)"),'CONTROL_GUARD_SUCCESSOR_LIFECYCLE_MISSING');

const i4a=read(I4A);
need(i4a.includes('workflow_dispatch:'),'I4A_DISPATCH_TRIGGER_MISSING');
const scopedI4a="push:\n    branches:\n      - recovery/fase-a-clean-20260831\n    paths:\n      - "+I4A_INTENT;
need(i4a.includes(scopedI4a),'I4A_SCOPED_INTENT_TRIGGER_MISSING');
need((i4a.match(/\n\s*push\s*:/g)||[]).length===1,'I4A_MULTIPLE_PUSH_TRIGGERS_FORBIDDEN');
need(i4a.includes('gravicentra-control-plane-guard-v2.mjs --mode=i4a'),'I4A_CONTROL_PLANE_GUARD_MISSING');
need(!i4a.includes('RECOVERY_STATE.json')&&!i4a.includes('ACTIVE_RELEASE_LOCK.json'),'I4A_SPLIT_AUTHORITY_REFERENCE_FORBIDDEN');
need(!/^\s*SOURCE_SHA:\s*[0-9a-f]{40}\s*$/m.test(i4a),'I4A_HARDCODED_SOURCE_FORBIDDEN');
need(!/^\s*BUILD_ID:\s*gi-i3-/m.test(i4a),'I4A_HARDCODED_BUILD_FORBIDDEN');
need(!/^\s*PREVIEW_URL:\s*https:\/\//m.test(i4a),'I4A_HARDCODED_PREVIEW_FORBIDDEN');
need(i4a.includes('jobs:\n  i4a-authoritative:'),'I4A_SINGLE_AUTHORITATIVE_JOB_MISSING');
for(const stale of ['public-browser:','bootstrap-diagnostic:','authenticated-browser:','Correct authenticated discriminants','QA_PATCH_']) need(!i4a.includes(stale),'I4A_STALE_PARALLEL_OR_PATCH_PATTERN:'+stale);
need(!i4a.includes("Path('tools/gravicentra-i4a-authenticated-browser-v2.mjs')"),'I4A_RUNTIME_HARNESS_REWRITE_FORBIDDEN');
need(!i4a.includes('p.write_text(s'),'I4A_RUNTIME_HARNESS_WRITE_FORBIDDEN');

const harness=read(HARNESS);
need(harness.includes('qaHarnessPatchedAtRuntime:false'),'I4A_HARNESS_COMMITTED_IDENTITY_MARKER_MISSING');
need(harness.includes('waitFinanceReadModels'),'I4A_HARNESS_FINANCE_READMODEL_DISCRIMINANT_MISSING');
need(harness.includes('CLIENTE360_EVENT_LOOP_BLOCKED_STABLE'),'I4A_HARNESS_CLIENTE_STABLE_HEARTBEAT_MISSING');
need(harness.includes('POLIZAS_EVENT_LOOP_BLOCKED_STABLE'),'I4A_HARNESS_POLIZAS_STABLE_HEARTBEAT_MISSING');
need(harness.includes('COBROS_VISIBLE_ROWS_EXCEED_SCOPED_COBROS'),'I4A_HARNESS_COBROS_SEMANTIC_ASSERTION_MISSING');

const names=fs.readdirSync(WF).filter(x=>x.endsWith('.yml')||x.endsWith('.yaml'));
const i4aExecutors=names.filter(x=>x.startsWith('gravicentra-i4a-')||x.startsWith('gravicentra-recovery-i4a-'));
need(i4aExecutors.length===1&&i4aExecutors[0]==='gravicentra-recovery-i4a-public-browser.yml','PARALLEL_I4A_EXECUTOR_REINTRODUCED:'+i4aExecutors.join(','));

const central=read(CENTRAL);
for(const pattern of [".github/workflows/gravicentra-*","tools/gravicentra-*","artifacts/orbit360-recovery/release-control/**","artifacts/orbit360-recovery/project-sources-v2/**"]) need(central.includes(pattern),'CENTRAL_BROAD_WATCH_MISSING:'+pattern);
need(central.includes('fetch-depth: 0'),'CENTRAL_COMPLETE_ANCESTRY_MISSING');
need(central.includes('node tools/gravicentra-mechanism-invariant-v1.mjs'),'CENTRAL_MECHANISM_INVARIANT_EXECUTION_MISSING');
need(central.includes('node tools/gravicentra-evergreen-sources-invariant-v1.mjs'),'CENTRAL_EVERGREEN_INVARIANT_EXECUTION_MISSING');
need(!central.includes('Gate executors I2/I3/I4A: state-gated and manual'),'CENTRAL_STALE_MANUAL_EXECUTOR_DOCUMENTATION');

const gravicentraFiles=names.filter(x=>x.startsWith('gravicentra-'));
for(const name of gravicentraFiles){
  const text=read(`${WF}/${name}`);
  if(name!=='gravicentra-release-lock-sync.yml'){
    need(!text.includes('RECOVERY_STATE.json')&&!text.includes('ACTIVE_RELEASE_LOCK.json'),'GRAVICENTRA_WORKFLOW_SPLIT_AUTHORITY_CONSUMPTION:'+name);
    need(!text.includes('gravicentra-release-lineage-guard.mjs'),'GRAVICENTRA_WORKFLOW_OLD_GUARD_REFERENCE:'+name);
  }
}

console.log('GRAVICENTRA_MECHANISM_INVARIANT=PASS');
console.log('CANONICAL_MUTABLE_AUTHORITY='+CONTROL);
console.log('I2_TRIGGER=SCOPED_NONAUTHORITATIVE_INTENT_OR_MANUAL_ESCAPE');
console.log('I3_TRIGGER=SCOPED_NONAUTHORITATIVE_INTENT_OR_MANUAL_ESCAPE');
console.log('I3_SUCCESSOR_SOURCE=NEXT_CANDIDATE');
console.log('CONTROL_CHECKOUT_ANCESTRY=COMPLETE');
console.log('CENTRAL_GUARD_WATCH=BROAD_GRAVICENTRA');
console.log('I4A_EXECUTOR_COUNT='+i4aExecutors.length);
console.log('I4A_RUNTIME_SELF_PATCH=false');
console.log('SPLIT_AUTHORITY_ACTIVE=false');
