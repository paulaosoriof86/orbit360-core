import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const ROOT='artifacts/orbit360-recovery/release-control';
const CONTROL=`${ROOT}/CONTROL_PLANE.json`;
const LEDGER=`${ROOT}/CAPABILITY_STATUS_LEDGER.json`;
const REGISTRY=`${ROOT}/I4A_PROOF_REGISTRY.json`;
const INTENT=`${ROOT}/I4A_EXECUTION_INTENT.json`;
const need=(ok,code)=>{if(!ok)throw new Error(code);};
const read=p=>fs.readFileSync(p,'utf8');
const json=p=>JSON.parse(read(p));
const exists=p=>fs.existsSync(p);
for(const p of [CONTROL,LEDGER,REGISTRY,INTENT])need(exists(p),'I4A_PROOF_REQUIRED_FILE_MISSING:'+p);
const c=json(CONTROL),r=json(REGISTRY),i=json(INTENT);
need(r.schemaVersion==='gravicentra-i4a-proof-registry-v1','I4A_PROOF_REGISTRY_SCHEMA_INVALID');
need(r.authorityType==='DERIVED_MONOTONIC_EVIDENCE_REGISTRY','I4A_PROOF_REGISTRY_AUTHORITY_INVALID');
need(r.mayGovernGate===false&&r.mayGovernReleaseIdentity===false,'I4A_PROOF_REGISTRY_MUST_NOT_GOVERN_RELEASE');
const b=r.releaseBinding||{},cc=c.certifiedCandidate||{};
need(b.sourceSha===cc.sourceSha,'I4A_PROOF_RELEASE_SOURCE_MISMATCH');
need(b.buildId===cc.buildId,'I4A_PROOF_RELEASE_BUILD_MISMATCH');
need(Number(b.artifactId)===Number(cc.artifactId),'I4A_PROOF_RELEASE_ARTIFACT_MISMATCH');
need(b.previewUrl===cc.previewUrl,'I4A_PROOF_RELEASE_PREVIEW_MISMATCH');
need(b.hostedPayloadDigest===cc.hostedPayloadDigest,'I4A_PROOF_HOSTED_DIGEST_MISMATCH');
need(b.backendSourceDigest===cc.backendSourceDigest,'I4A_PROOF_BACKEND_DIGEST_MISMATCH');
const policy=r.policy||{};
for(const k of ['passIsMonotonicWithinRelease','passReexecutionForbiddenWithoutCausalInvalidation','validatorFailureCannotInvalidatePriorPass','qaOnlyChangeCannotInvalidatePriorPass','conversationCannotInvalidatePriorPass','causalInvalidationRequiresProductSourceDelta','openProofsOnlyExecution','gateSealRequiresAtomicControlPlaneLedgerRegistryCommit'])need(policy[k]===true,'I4A_PROOF_POLICY_MISSING:'+k);
const proofs=Array.isArray(r.proofs)?r.proofs:[];
need(proofs.length>0,'I4A_PROOF_REGISTRY_EMPTY');
const byId=new Map();
for(const p of proofs){
  need(typeof p.proofId==='string'&&p.proofId.length>2,'I4A_PROOF_ID_INVALID');
  need(!byId.has(p.proofId),'I4A_PROOF_DUPLICATE:'+p.proofId);byId.set(p.proofId,p);
  need(['PASS','OPEN','INVALIDATED'].includes(p.status),'I4A_PROOF_STATUS_INVALID:'+p.proofId);
  if(p.status==='PASS'){
    const x=p.receipt||{};
    need(Number.isInteger(Number(x.runId))&&Number(x.runId)>0,'I4A_PASS_RUN_MISSING:'+p.proofId);
    need(Number.isInteger(Number(x.artifactId))&&Number(x.artifactId)>0,'I4A_PASS_ARTIFACT_MISSING:'+p.proofId);
    need(/^sha256:[0-9a-f]{64}$/.test(String(x.artifactDigest||'')),'I4A_PASS_DIGEST_INVALID:'+p.proofId);
    need(x.sourceSha===b.sourceSha,'I4A_PASS_SOURCE_MISMATCH:'+p.proofId);
    need(x.buildId===b.buildId,'I4A_PASS_BUILD_MISMATCH:'+p.proofId);
    need(typeof p.contractVersion==='string'&&p.contractVersion.length>3,'I4A_PASS_CONTRACT_VERSION_MISSING:'+p.proofId);
  }
}
const invalidations=Array.isArray(r.causalInvalidations)?r.causalInvalidations:[];
function activeInvalidation(id){return invalidations.find(x=>x&&x.proofId===id&&x.status==='ACTIVE');}
for(const x of invalidations){
  need(byId.has(x.proofId),'I4A_INVALIDATION_UNKNOWN_PROOF:'+x.proofId);
  need(x.productSourceDelta===true,'I4A_INVALIDATION_REQUIRES_PRODUCT_SOURCE_DELTA:'+x.proofId);
  need(/^[0-9a-f]{40}$/.test(String(x.fromSourceSha||''))&&/^[0-9a-f]{40}$/.test(String(x.toSourceSha||''))&&x.fromSourceSha!==x.toSourceSha,'I4A_INVALIDATION_SOURCE_DELTA_INVALID:'+x.proofId);
  need(typeof x.causalEvidence==='string'&&x.causalEvidence.length>8,'I4A_INVALIDATION_CAUSAL_EVIDENCE_MISSING:'+x.proofId);
}

let parentRegistry=null;
try{
  const raw=execFileSync('git',['show',`HEAD^:${REGISTRY}`],{encoding:'utf8',stdio:['ignore','pipe','ignore']});
  parentRegistry=JSON.parse(raw);
}catch{}
if(parentRegistry?.releaseBinding?.sourceSha===b.sourceSha){
  const prev=new Map((parentRegistry.proofs||[]).map(p=>[p.proofId,p]));
  for(const p of proofs){
    const old=prev.get(p.proofId);
    if(old?.status==='PASS'){
      const inv=activeInvalidation(p.proofId);
      need(p.status==='PASS'||!!inv,'I4A_MONOTONIC_PASS_REOPEN_FORBIDDEN:'+p.proofId);
      if(p.status==='PASS')need(JSON.stringify(p)===JSON.stringify(old),'I4A_SEALED_PASS_RECEIPT_MUTATED:'+p.proofId);
    }
  }
}

if(i.schemaVersion==='gravicentra-execution-intent-v2'){
  need(i.nonAuthoritative===true&&i.gate==='I4A','I4A_INTENT_V2_IDENTITY_INVALID');
  need(i.certifiedSourceSha===b.sourceSha&&i.buildId===b.buildId&&i.previewUrl===b.previewUrl,'I4A_INTENT_V2_RELEASE_MISMATCH');
  need(i.productSourceMutationAuthorized===false,'I4A_INTENT_V2_PRODUCT_MUTATION_FORBIDDEN');
  const scope=i.executionScope||{};
  need(scope.mode==='OPEN_PROOFS_ONLY','I4A_INTENT_V2_SCOPE_MODE_INVALID');
  const requested=Array.isArray(scope.proofIds)?scope.proofIds:[];
  need(requested.length>0,'I4A_INTENT_V2_PROOF_IDS_EMPTY');
  const preserved=new Set(Array.isArray(scope.preserveProofIds)?scope.preserveProofIds:[]);
  for(const id of requested){
    const p=byId.get(id);need(!!p,'I4A_INTENT_V2_UNKNOWN_PROOF:'+id);
    need(p.status==='OPEN'||!!activeInvalidation(id),'I4A_INTENT_REEXECUTES_SEALED_PASS:'+id);
  }
  for(const p of proofs.filter(x=>x.status==='PASS'))need(preserved.has(p.proofId),'I4A_INTENT_V2_OMITS_PRESERVED_PASS:'+p.proofId);
}

const open=proofs.filter(p=>p.status==='OPEN').map(p=>p.proofId);
if(c.gateState?.gates?.I4A?.status==='PASS'){
  need(open.length===0,'I4A_GATE_PASS_WITH_OPEN_PROOFS:'+open.join(','));
  need(r.stateSealPending===false,'I4A_GATE_PASS_WITH_PENDING_STATE_SEAL');
  let changed=[];try{changed=execFileSync('git',['diff-tree','--no-commit-id','--name-only','-r','HEAD'],{encoding:'utf8'}).trim().split(/\n+/).filter(Boolean);}catch{}
  for(const p of [CONTROL,LEDGER,REGISTRY])need(changed.includes(p),'I4A_GATE_SEAL_NOT_ATOMIC_MISSING:'+p);
}else{
  need(c.gateState?.gates?.I4A?.status==='IN_PROGRESS','I4A_PROOF_REGISTRY_ACTIVE_OUTSIDE_I4A');
}
console.log('GRAVICENTRA_I4A_PROOF_REGISTRY_GUARD=PASS');
console.log('I4A_PROOF_RELEASE_SOURCE='+b.sourceSha);
console.log('I4A_PROOF_PASS_COUNT='+proofs.filter(p=>p.status==='PASS').length);
console.log('I4A_PROOF_OPEN='+open.join(','));
console.log('I4A_STATE_SEAL_PENDING='+String(r.stateSealPending===true));
