// Immutable physical country-index delta from successful bounded LAB read.
// Freeze aggregate-only evidence into the ONE candidate, never authorize
// document updates, Preview verification, or production.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const BASE='bcb909ae3f34d16880ec5289a7963fc2c41624f9';
const BASE_TREE='a3a7c3bf0e73c7ca1d64b4d0fd3ca602b900a816';
// The evidence successor was CERTIFIED at this immutable commit. All later
// canonical commits must descend from it, but their own changed-file sets
// must NOT be mistaken for the single historical receipt's changed-file set.
const CERTIFIED='9d1839da8717757baf9adbf1fdfad83cddc41791';
const CERTIFIED_TREE='433b096bc755fe35b2ab032cc9a45e5350a00deb';
const ROOT='artifacts/orbit360-recovery/release-control/';
const CONTROL=ROOT+'CONTROL_PLANE.json';
const RECEIPT=ROOT+'I6_5_B4_003_REAL_COUNTRY_INDEX_DRYRUN_EVIDENCE_SUCCESSOR_20261102.json';
const AGGREGATE=ROOT+'I6_5_B4_003_REAL_COUNTRY_INDEX_DRYRUN_AGGREGATE_20261102.json';
const GUARD='tools/gravicentra-i6-control-plane-guard-v1.mjs';
const SELF='tools/gravicentra-b4-003-real-country-index-evidence-successor.mjs';
const KEY='b4003PhysicalCountryIndexDryrunEvidence20261102';
const GOV_PATHS=[CONTROL,RECEIPT,AGGREGATE,GUARD,SELF].sort();
const AGG_BLOB='efbd4ff061cbfd0ba964677c4f5b2cac64e3c001';
const AGG_SHA256='0ef085d8ca90d6b80708bda8b8e6698767dd9905325bc4be6dc8b6ccfc06989d';
const PREFIX="import {runB4003RealCountryIndexEvidenceSuccessorGuard} from './gravicentra-b4-003-real-country-index-evidence-successor.mjs';\n"+
 'if (runB4003RealCountryIndexEvidenceSuccessorGuard()) process.exit(0);\n\n';
const fail=why=>{throw Error('B4_003_REAL_COUNTRY_INDEX_EVIDENCE_GUARD_'+why);};
const need=(ok,why)=>{if(!ok)fail(why);};
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:64*1024*1024}).trim();
const show=(ref,file)=>execFileSync('git',['show',ref+':'+file],{encoding:'utf8',maxBuffer:64*1024*1024});
const blob=(ref,file)=>git('rev-parse',ref+':'+file);
const hash=file=>git('hash-object',file);
const json=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const changed=(a,b)=>git('diff','--name-only',a,b).split(/\r?\n/).filter(Boolean).sort();
const stable=x=>x===null||typeof x!=='object'?x:Array.isArray(x)?x.map(stable):
 Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])]));
const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
// Only historical entries are owned by this guard. Other successor guards
// independently authorize new keys; preserving them must not regress B4-003.
export function frozenEntriesUnchanged(frozen,current){
 return !!frozen&&!!current&&typeof frozen==='object'&&typeof current==='object'&&
  Object.keys(frozen).every(k=>Object.prototype.hasOwnProperty.call(current,k)&&
   same(frozen[k],current[k]));
}
function verifyAggregate(){
 const a=json(AGGREGATE),bytes=fs.readFileSync(AGGREGATE);
 need(hash(AGGREGATE)===AGG_BLOB&&
  createHash('sha256').update(bytes).digest('hex')===AGG_SHA256,
  'PHYSICAL_AGGREGATE_BYTES_DRIFT');
 need(same(Object.keys(a).sort(),[
  'schema','mode','tenant','counts','indexedAlready','indexUpdateCandidates',
  'candidateAuthority','unresolvable','perClientPolicyBoundExceeded',
  'distinctPolicyRefsMissingClient','sourceCountryNotCanonical',
  'crossBorderClientExplicitPreserved','requiresBackupAndRollback',
  'requiresSignedRoleCountryUat','applyAuthorized',
  'executablePatchesExported','writes','authWrites','rulesWrites',
  'hostingDeploys','gate','production'].sort()),
  'AGGREGATE_UNEXPECTED_FIELDS');
 need(a.schema==='GRAVICENTRA_B4003_CLIENT_COUNTRY_INDEX_DRYRUN_AGGREGATE_V1'&&
  a.mode==='REAL_READONLY_OR_SYNTHETIC_PLAN_NO_APPLY'&&
  a.tenant==='alianzas-soluciones'&&
  a.counts?.clients===443&&a.counts?.policies===1425&&a.counts?.insurers===33&&
  a.indexedAlready?.GT===391&&a.indexedAlready?.CO===17&&
  a.indexUpdateCandidates?.GT===1&&a.indexUpdateCandidates?.CO===31&&
  a.candidateAuthority?.client===376&&a.candidateAuthority?.insurer===64&&
  a.unresolvable?.COMPLETE_POLICY_RELATION_REQUIRED===3&&
  a.perClientPolicyBoundExceeded===0&&a.distinctPolicyRefsMissingClient===3&&
  a.sourceCountryNotCanonical===5&&a.crossBorderClientExplicitPreserved===1&&
  a.requiresBackupAndRollback===true&&
  a.requiresSignedRoleCountryUat===true&&
  a.applyAuthorized===false&&a.executablePatchesExported===false&&
  a.writes===0&&a.authWrites===0&&a.rulesWrites===0&&a.hostingDeploys===0&&
  a.gate==='B4_003_HOLD'&&a.production==='NO_GO',
  'PHYSICAL_INDEX_AGGREGATE_INVALID');
 need(a.indexedAlready.GT+a.indexedAlready.CO+
  a.indexUpdateCandidates.GT+a.indexUpdateCandidates.CO+
  a.unresolvable.COMPLETE_POLICY_RELATION_REQUIRED===a.counts.clients,
  'PHYSICAL_INDEX_443_RECONCILIATION_FAILED');
 need(a.candidateAuthority.client+a.candidateAuthority.insurer+
  a.unresolvable.COMPLETE_POLICY_RELATION_REQUIRED===a.counts.clients,
  'PHYSICAL_AUTHORITY_443_RECONCILIATION_FAILED');
}
function verifyControl(){
 const before=JSON.parse(show(BASE,CONTROL));
 const certified=JSON.parse(show(CERTIFIED,CONTROL));
 const after=json(CONTROL),p=after[KEY];
 need(Object.keys(before).length===441&&Object.keys(certified).length===442&&
  Object.keys(after).length>=442,'CERTIFIED_CONTROL_APPEND_CARDINALITY');
 need(frozenEntriesUnchanged(before,certified)&&
  frozenEntriesUnchanged(certified,after),'HISTORICAL_CONTROL_CHANGED');
 need(same(Object.keys(certified).filter(k=>!(k in before)),[KEY]),
  'CERTIFIED_CONTROL_KEY_SET_INVALID');
 const expected={
  schema:'GRAVICENTRA_I65_B4003_REAL_COUNTRY_INDEX_DRYRUN_EVIDENCE_POINTER_V1',
  gate:'I6.5/B4-003',recordedDate:'2026-11-02',
  recordType:'ADDITIVE_IMMUTABLE_REAL_LAB_INDEX_AGGREGATE_READ_ONLY_NO_MIGRATION',
  status:'REAL_LAB_COUNTRY_INDEX_DRYRUN_PASS_408_INDEXED_32_CANDIDATE_3_UNRESOLVED_RELEASE_HOLD',
  canonicalParentHead:BASE,receiptPath:RECEIPT,aggregatePath:AGGREGATE,
  githubActionsRunId:41462171976,githubActionsConclusion:'success',
  physicalClients:443,physicalPolicies:1425,physicalInsurers:33,
  indexedAlreadyGT:391,indexedAlreadyCO:17,
  indexUpdateCandidateGT:1,indexUpdateCandidateCO:31,
  insurerInferredCountryClients:64,clientCountriesUnresolved:3,
  distinctPolicyRefsMissingClient:3,crossBorderClientDomicilePreserved:1,
  readOnlyPhysicalIndexDryrunCompleted:true,countryIndexMaterializationAccepted:false,
  migrationApplyAuthorized:false,authenticatedMultiUidPreviewUatPassed:false,
  independentBackendNegativeUidUatPassed:false,firestoreRulesP0Closed:false,
  restoreDrillAccepted:false,sevenAdvisorsClassified:false,
  dataWrites:0,sharedRulesAuthIamMutation:false,liveHostingDeployed:false,
  liveFunctionsDeployed:false,productionAuthorized:false,b4003Closed:false,
  formalI6Percent:50,priorityP0Closed:1,priorityP0Total:6,
  currentGlobalImplementationPercent:null
 };
 need(p&&Object.entries(expected).every(([k,v])=>same(p[k],v)),
  'CONTROL_POINTER_MISMATCH');
 const r=json(RECEIPT);
 need(r.schema==='GRAVICENTRA_I65_B4003_REAL_COUNTRY_INDEX_DRYRUN_EVIDENCE_SUCCESSOR_V1'&&
  r.repository==='paulaosoriof86/orbit360-core'&&
  r.canonicalBranch==='recovery/fase-a-clean-20260831'&&
  r.status===p.status&&r.recordType===p.recordType&&
  r.canonicalParentHead===BASE&&r.physicalProject==='ays-orbit-360-lab'&&
  r.physicalTenant==='alianzas-soluciones'&&
  r.githubActionsRun?.id===41462171976&&
  r.githubActionsRun?.conclusion==='success'&&
  r.githubActionsRun?.headSha===BASE&&
  r.githubActionsRun?.writes===0&&
  r.githubActionsRun?.exportedPii===false&&
  r.archive?.artifactId===13149476587&&
  r.archive?.zipSha256==='26ec4633fae484e6382ff9ccf70fadc8e54109f0bc886570ad5d6aec57b32e1b'&&
  r.archive?.aggregateTextSha256==='c585dc669d0b00691bf4c7502a043101dfdddaca251f06c0136acd7f2ad51308'&&
  r.archive?.aggregateGitBlobSha===AGG_BLOB&&
  r.archive?.aggregateJsonSha256===AGG_SHA256&&
  r.archive?.exactAggregatePath===AGGREGATE&&
  r.archive?.exportedClientIds===false&&
  r.archive?.exportedAdvisorUids===false&&
  r.verifiedIndexReconciliation?.all443AccountedFor===true&&
  r.verifiedIndexReconciliation?.indexUpdateCandidatesTotal===32&&
  r.verifiedIndexReconciliation?.indexedAlreadyTotal===408&&
  r.migrationDecision?.requiresSeparateExplicitApproval===true&&
  r.migrationDecision?.applyAuthorized===false&&
  r.releaseHold?.productionAuthorized===false&&
  r.releaseHold?.B4003Closed===false&&
  r.releaseHold?.formalI6Percent===50&&
  r.releaseHold?.priorityP0Closed===1&&
  r.releaseHold?.priorityP0Total===6&&
  r.releaseHold?.dataWrites===0&&
  r.releaseHold?.liveHostingDeployed===false&&
  r.releaseHold?.liveFunctionsDeployed===false,
  'RECEIPT_OR_RELEASE_HOLD_DRIFT');
}
export function runB4003RealCountryIndexEvidenceSuccessorGuard(){
 if(!json(CONTROL)[KEY])return false;
 const mode=(process.argv.find(x=>x.startsWith('--mode='))||'--mode=governance').slice(7);
 need(['governance','governance:1','i6'].includes(mode),'MODE_DENIED');
 const head=git('rev-parse','HEAD');
 need(git('rev-parse',BASE+'^{tree}')===BASE_TREE,'PREDECESSOR_TREE_DRIFT');
 need(git('rev-parse',CERTIFIED+'^{tree}')===CERTIFIED_TREE,'CERTIFIED_EVIDENCE_TREE_DRIFT');
 need(git('merge-base',BASE,head)===BASE,'CANONICAL_PREDECESSOR_NOT_ANCESTOR');
 need(git('merge-base',CERTIFIED,head)===CERTIFIED,'CERTIFIED_EVIDENCE_NOT_ANCESTOR');
 need(same(changed(BASE,CERTIFIED),GOV_PATHS),'FROZEN_EVIDENCE_COMMIT_SCOPE_DRIFT');
 need(show(CERTIFIED,GUARD)===PREFIX+show(BASE,GUARD),
  'CERTIFIED_HISTORICAL_GUARD_NOT_APPEND_ONLY');
 for(const file of [RECEIPT,AGGREGATE])
  need(blob(head,file)===blob(CERTIFIED,file),'FROZEN_EVIDENCE_MUTATED:'+file);
 for(const file of GOV_PATHS)
  need(blob(head,file)===hash(file),'UNCOMMITTED_GOVERNANCE_DRIFT:'+file);
 need(!git('ls-files','--others','--exclude-standard'),'UNTRACKED_SOURCE');
 verifyControl();verifyAggregate();
 console.log('B4_003_REAL_COUNTRY_INDEX_DRYRUN_EVIDENCE=PASS 443_clients indexed_408 correction_candidates_32 unresolved_3');
 console.log('B4_003_COUNTRY_INDEX_MIGRATION=NOT_AUTHORIZED B4_003_PRODUCTION=NO_GO');
 console.log('GRAVICENTRA_I6_CONTROL_PLANE_GUARD=PASS');
 console.log('PRODUCT_SOURCE_DRIFT=false');
 return true;
}
