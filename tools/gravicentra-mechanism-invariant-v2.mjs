import fs from 'node:fs';

const need=(ok,code)=>{if(!ok)throw new Error(code)};
const read=p=>fs.readFileSync(p,'utf8');
const json=p=>JSON.parse(read(p));
const exists=p=>fs.existsSync(p);
const root='artifacts/orbit360-recovery/release-control';
const cp=json(`${root}/CONTROL_PLANE.json`);
const reg=json(`${root}/I4A_PROOF_REGISTRY.json`);
const freeze=read(`${root}/MECHANISM_FREEZE_V4_20260910.md`);
const central=read('.github/workflows/gravicentra-release-lock-sync.yml');
const canonicalPreflight='tools/gravicentra-governance-preflight-v1.mjs';

const executors={
  I2:'.github/workflows/gravicentra-recovery-i2-source-contract.yml',
  I3:'.github/workflows/gravicentra-recovery-i3-preview-v2.yml',
  I4A:'.github/workflows/gravicentra-recovery-i4a-public-browser.yml',
  I4B:'.github/workflows/gravicentra-recovery-i4b-transversal.yml',
  I5:'.github/workflows/gravicentra-recovery-i5-production.yml'
};
const statusToGate={
  I2_IN_PROGRESS:'I2',I3_IN_PROGRESS:'I3',I4A_IN_PROGRESS:'I4A',I4B_IN_PROGRESS:'I4B',I5_IN_PROGRESS:'I5'
};

need(cp.mechanismRules?.singleMutableAuthority==='THIS_FILE','V5_SINGLE_AUTHORITY_MISSING');
need(cp.mechanismFreeze?.status==='FROZEN','V5_V3_BASE_NOT_FROZEN');
need(cp.mechanismFreeze?.reentryI2I3OnlyOnProvenProductSourceChange===true,'V5_I2I3_REENTRY_RULE_MISSING');
need(freeze.includes('Estado: `FROZEN`')&&freeze.includes('PASS es monotónico')&&freeze.includes('executionScope.proofIds')&&freeze.includes('commit atómico'),'V5_FREEZE_CONTRACT_MISSING');
need(reg.schemaVersion==='gravicentra-i4a-proof-registry-v1','V5_REGISTRY_SCHEMA_INVALID');
need(reg.authorityType==='DERIVED_MONOTONIC_EVIDENCE_REGISTRY'&&reg.mayGovernGate===false&&reg.mayGovernReleaseIdentity===false,'V5_REGISTRY_AUTHORITY_LEAK');
for(const k of ['passIsMonotonicWithinRelease','passReexecutionForbiddenWithoutCausalInvalidation','validatorFailureCannotInvalidatePriorPass','qaOnlyChangeCannotInvalidatePriorPass','conversationCannotInvalidatePriorPass','causalInvalidationRequiresProductSourceDelta','openProofsOnlyExecution','gateSealRequiresAtomicControlPlaneLedgerRegistryCommit']) need(reg.policy?.[k]===true,'V5_POLICY_MISSING:'+k);
need(exists(canonicalPreflight),'V5_CANONICAL_PREFLIGHT_MISSING');

for(const gate of ['I2','I3','I4A']) need(exists(executors[gate]),'V5_EXECUTOR_MISSING:'+gate);
const i2=read(executors.I2), i3=read(executors.I3), i4a=read(executors.I4A);
for(const wf of [i2,i3]) need(wf.includes('fetch-depth: 0')&&wf.includes('gravicentra-control-plane-guard-v2.mjs'),'V5_I2I3_EXECUTOR_DRIFT');
need(!/^\s*SOURCE_SHA:\s*[0-9a-f]{40}\s*$/m.test(i2+i3+i4a),'V5_HARDCODED_SOURCE_FORBIDDEN');
need(i4a.includes('gravicentra-i4a-proof-registry-guard-v1.mjs'),'V5_I4A_PROOF_GUARD_MISSING');
for(const marker of ['gravicentra-execution-intent-v2','OPEN_PROOFS_ONLY','proofIds','preserveProofIds','I4A_PASS_REEXECUTION_FORBIDDEN','gatePassClaimed']) need(i4a.includes(marker),'V5_I4A_SCOPE_MARKER_MISSING:'+marker);
need(!i4a.includes('authoritativePass')&&!i4a.includes('Fail closed only after all probe evidence was collected'),'V5_MONOLITHIC_I4A_REINTRODUCED');

const activeGate=statusToGate[cp.status]||null;
if(activeGate){
  const p=executors[activeGate];
  need(exists(p),'V5_ACTIVE_GATE_EXECUTOR_MISSING:'+activeGate+':'+p);
  const wf=read(p);
  need(wf.includes(`gravicentra-governance-preflight-v1.mjs --mode=${activeGate.toLowerCase()}`),'V5_ACTIVE_GATE_CANONICAL_PREFLIGHT_MISSING:'+activeGate);
  need(wf.includes('fetch-depth: 0'),'V5_ACTIVE_GATE_SHALLOW_CHECKOUT:'+activeGate);
  if(activeGate==='I4B'){
    for(const marker of ['I4B_IN_PROGRESS','gravicentra-i4b-transversal-v1.mjs','productionTouched','dataTouched','writesExecuted']) need(wf.includes(marker),'V5_I4B_EXECUTOR_MARKER_MISSING:'+marker);
    need(!/firebase\s+deploy|firebase\.cmd\s+deploy/i.test(wf),'V5_I4B_DEPLOY_FORBIDDEN');
  }
  if(activeGate==='I5'){
    for(const marker of ['I5_IN_PROGRESS','I3_ARTIFACT_ID','sameFrontendArtifactPreviewToProductionRequired']) need(wf.includes(marker),'V5_I5_EXECUTOR_MARKER_MISSING:'+marker);
  }
}

let i5SuccessorReady=false;
if(activeGate==='I4B'||activeGate==='I5'){
  need(exists(executors.I5),'V5_I5_SUCCESSOR_EXECUTOR_MISSING');
  const i5=read(executors.I5);
  for(const marker of [
    'I5_IN_PROGRESS','fetch-depth: 0','gravicentra-governance-preflight-v1.mjs --mode=i5',
    'I3_ARTIFACT_ID','actions/download-artifact@v4','sameFrontendArtifactPreviewToProductionRequired',
    'sameBackendSourcePackageRequiredForI5','sourceMutatedAfterBuild','productionDeployAuthorized',
    'controlledWritesAuthorized','rollbackPrepared','I5_NO_REBUILD=true'
  ]) need(i5.includes(marker),'V5_I5_SUCCESSOR_READINESS_MARKER_MISSING:'+marker);
  need(i5.includes('artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json'),'V5_I5_SUCCESSOR_NOT_CONTROL_PLANE_TRIGGERED');
  need(!/npm\s+(?:run\s+)?build|vite\s+build|webpack\s+--mode\s+production/i.test(i5),'V5_I5_REBUILD_PATH_FORBIDDEN');
  i5SuccessorReady=true;
}

const names=fs.readdirSync('.github/workflows').filter(x=>x.endsWith('.yml')||x.endsWith('.yaml'));
for(const gate of ['i2','i3','i4a','i4b','i5']){
  const rx=new RegExp(`(?:^|-)${gate}(?:-|\\.)`,'i');
  const candidates=names.filter(x=>x.startsWith('gravicentra-')&&rx.test(x));
  if(gate==='i4a') need(candidates.length===1&&candidates[0]==='gravicentra-recovery-i4a-public-browser.yml','V5_PARALLEL_I4A_EXECUTOR:'+candidates.join(','));
  if(gate==='i4b'&&activeGate==='I4B') need(candidates.length===1&&candidates[0]==='gravicentra-recovery-i4b-transversal.yml','V5_PARALLEL_I4B_EXECUTOR:'+candidates.join(','));
  if(gate==='i5'&&(activeGate==='I4B'||activeGate==='I5')) need(candidates.length===1&&candidates[0]==='gravicentra-recovery-i5-production.yml','V5_PARALLEL_I5_EXECUTOR:'+candidates.join(','));
}

need(central.includes('Gravicentra Control Plane Guard v5'),'V5_CENTRAL_GUARD_VERSION_MISSING');
need(central.includes('gravicentra-governance-preflight-v1.mjs --mode=governance'),'V5_CENTRAL_CANONICAL_PREFLIGHT_MISSING');

const next=cp.gateState?.nextFrozenIteration||'';
need(!activeGate||next===activeGate,'V5_CONTROL_GATE_EXECUTOR_GATE_DIVERGENCE:'+String(activeGate)+':'+String(next));

console.log('GRAVICENTRA_MECHANISM_INVARIANT=PASS');
console.log('MECHANISM_INVARIANT_VERSION=V2_CANONICAL_PREFLIGHT_SUCCESSOR_READY');
console.log('ACTIVE_GATE='+(activeGate||'NONE'));
console.log('ACTIVE_EXECUTOR='+(activeGate?executors[activeGate]:'NONE'));
console.log('CANONICAL_PREFLIGHT='+canonicalPreflight);
console.log('CONTROL_NEXT_FROZEN_ITERATION='+next);
console.log('I5_SUCCESSOR_READY='+String(i5SuccessorReady));
console.log('PRODUCT_SOURCE_MUTATION=false');
console.log('PRODUCTION_TOUCHED=false');
console.log('DATA_TOUCHED=false');
