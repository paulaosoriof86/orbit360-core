// Exact real read-only aggregate evidence, appended to the ONE canonical
// candidate. It does not authorize data normalization, role changes or LIVE.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const BASE='e576728c7e171ecaa78e30a88a5df747163731ae';
const KEY='b4003PhysicalClientJoinAggregateEvidence20261102';
const ROOT='artifacts/orbit360-recovery/release-control/';
const CONTROL=ROOT+'CONTROL_PLANE.json';
const RECEIPT=ROOT+'I6_5_B4_003_PHYSICAL_JOIN_AUDIT_EVIDENCE_SUCCESSOR_20261102.json';
const AGGREGATE=ROOT+'I6_5_B4_003_PHYSICAL_POLICY_CLIENT_INSURER_JOIN_AGGREGATE_20261102.json';
const GUARD='tools/gravicentra-i6-control-plane-guard-v1.mjs';
const SELF='tools/gravicentra-b4-003-physical-join-evidence-successor.mjs';
const GOV_PATHS=[CONTROL,RECEIPT,AGGREGATE,GUARD,SELF].sort();
const PREFIX="import {runB4003PhysicalJoinEvidenceSuccessorGuard} from './gravicentra-b4-003-physical-join-evidence-successor.mjs';\n"+
 'if (runB4003PhysicalJoinEvidenceSuccessorGuard()) process.exit(0);\n\n';
const fail=why=>{throw Error('B4_003_PHYSICAL_JOIN_EVIDENCE_GUARD_'+why);};
const need=(condition,why)=>{if(!condition)fail(why);};
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:64*1024*1024}).trim();
const show=(ref,file)=>execFileSync('git',['show',ref+':'+file],{encoding:'utf8',maxBuffer:64*1024*1024});
const blob=(ref,file)=>git('rev-parse',ref+':'+file);
const hash=file=>git('hash-object',file);
const json=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const changed=(a,b)=>git('diff','--name-only',a,b).split(/\r?\n/).filter(Boolean).sort();
const stable=x=>x===null||typeof x!=='object'?x:Array.isArray(x)?x.map(stable):
 Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])]));
const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));

function verifyControl(){
 const before=JSON.parse(show(BASE,CONTROL)),current=json(CONTROL),pointer=current[KEY];
 need(Object.keys(before).length===437&&Object.keys(current).length===438,
  'CONTROL_ADDITIVE_CARDINALITY');
 need(Object.keys(before).every(key=>same(before[key],current[key])),
  'FROZEN_CONTROL_CHANGED');
 need(same(Object.keys(current).filter(key=>!(key in before)),[KEY]),
  'UNAUTHORIZED_CONTROL_CHANGE');
 const expected={
  schema:'GRAVICENTRA_I65_B4003_PHYSICAL_CLIENT_JOIN_EVIDENCE_POINTER_V1',
  gate:'I6.5/B4-003',
  status:'REAL_READONLY_JOIN_PASS_COUNTRY_AND_SCOPE_CAUSES_QUANTIFIED_RELEASE_HOLD',
  recordType:'ADDITIVE_VERIFIED_PHYSICAL_SOURCE_AGGREGATES_NO_DATA_OR_PRODUCT_MUTATION',
  canonicalParentHead:BASE,receiptPath:RECEIPT,exactAggregatePath:AGGREGATE,
  githubActionsRunId:41389449069,githubActionsConclusion:'success',
  readOnlyPhysicalJoinCompleted:true,clientsPhysical:443,policiesPhysical:1425,
  insurersPhysical:33,clientCountryInsurerInferredGT:33,clientCountryInsurerInferredCO:31,
  clientCountryUnresolved:3,physicalPolicyLinksMissingClient:3,
  clientCountryValidCrossBorderLinks:1,operativoCOScopeAsymmetryObserved:true,
  rolloutToPreviewCompleted:false,indexedCountryMaterializationAccepted:false,
  multiUidAuthenticatedCountryRoleUatPassed:false,independentBackendNegativeUidUatPassed:false,
  firestoreRulesP0Closed:false,restoreDrillAccepted:false,sevenAdvisorsClassified:false,
  dataWrites:0,sharedRulesAuthIamMutation:false,liveHostingDeployed:false,
  liveFunctionsDeployed:false,productionAuthorized:false,b4003Closed:false,
  formalI6Percent:50,priorityP0Closed:1,priorityP0Total:6,
  currentGlobalImplementationPercent:null
 };
 need(pointer&&Object.entries(expected).every(([k,v])=>same(pointer[k],v)),
  'AGGREGATE_POINTER_INVALID');
 const receipt=json(RECEIPT);
 need(receipt.schema==='GRAVICENTRA_I65_B4003_PHYSICAL_JOIN_AUDIT_EVIDENCE_SUCCESSOR_V1'&&
  receipt.status===pointer.status&&receipt.recordType===pointer.recordType&&
  receipt.repository==='paulaosoriof86/orbit360-core'&&
  receipt.canonicalBranch==='recovery/fase-a-clean-20260831'&&
  receipt.canonicalParentHead===BASE&&
  receipt.githubActionsRun?.id===41389449069&&
  receipt.githubActionsRun?.conclusion==='success'&&
  receipt.githubActionsRun?.headSha===BASE&&
  receipt.githubActionsRun?.writes===0&&
  receipt.githubActionsRun?.exportedPii===false&&
  receipt.archive?.artifactId===13116865695&&
  receipt.archive?.zipSha256==='6f54c13df5321f18187e307ed14321d516450756c1f6488ed3fe08eb7c86b03d'&&
  receipt.archive?.exactAggregatePath===AGGREGATE&&
  receipt.archive?.aggregateGitBlobSha==='0fa6674201a0f33bec1fd08ea84d3bfadeaa5409'&&
  receipt.archive?.aggregateSha256==='7a842713f7edc95f305b0f4647d07917160ed4c1801cc06567766f30f6a85439'&&
  receipt.governanceDecision?.neverWidenAdvisorScopeSilently===true&&
  receipt.governanceDecision?.indexMaterializationStillRequiresDryrunBackupRollbackAndExplicitApproval===true&&
  receipt.releaseHold?.productionAuthorized===false&&
  receipt.releaseHold?.B4003Closed===false&&
  receipt.releaseHold?.formalI6Percent===50&&
  receipt.releaseHold?.priorityP0Closed===1&&
  receipt.releaseHold?.priorityP0Total===6,
  'AGGREGATE_RECEIPT_OR_HOLD_INVALID');
}
function verifyAggregate(){
 const report=json(AGGREGATE),rbytes=fs.readFileSync(AGGREGATE);
 need(hash(AGGREGATE)==='0fa6674201a0f33bec1fd08ea84d3bfadeaa5409'&&
  createHash('sha256').update(rbytes).digest('hex')===
   '7a842713f7edc95f305b0f4647d07917160ed4c1801cc06567766f30f6a85439',
  'PHYSICAL_AGGREGATE_BYTES_DRIFT');
 need(same(Object.keys(report).sort(),[
  'authWrites','caveats','clientCountryAuthority','counts','effectiveScopeMatrix',
  'gate','mode','physicalJoin','production','project','schema','securityChanges','tenant','writes'
 ].sort()),'UNEXPECTED_EXPORTED_FIELDS');
 const c=report.counts,pc=report.clientCountryAuthority,j=report.physicalJoin;
 need(report.schema==='GRAVICENTRA_B4_003_PHYSICAL_POLICY_CLIENT_JOIN_READONLY_V1'&&
  report.project==='ays-orbit-360-lab'&&report.tenant==='alianzas-soluciones'&&
  report.gate==='B4_003_HOLD'&&report.production==='NO_GO'&&
  report.writes===0&&report.authWrites===0&&report.securityChanges===0&&
  c.clients===443&&c.policies===1425&&c.insurers===33&&c.memberships===8&&
  c.roleCountryContexts===31&&c.distinctPolicyClientRefs===408&&
  c.distinctMissingPhysicalClientRefs===3&&
  pc.explicit.GT===359&&pc.explicit.CO===17&&
  pc.inferred.GT===33&&pc.inferred.CO===31&&
  pc.unresolved.COMPLETE_POLICY_RELATION_REQUIRED===3&&pc.readProjectionBoundExceeded===0&&
  j.clientIdMissing===0&&j.physicalClientMissing===3&&
  j.linkedClientExplicitSameCountry===1292&&j.linkedClientExplicitOtherCountry===1&&
  j.linkedClientInsurerFallbackEligible===129&&j.linkedClientCountryUnresolved===0&&
  report.effectiveScopeMatrix.length===17,
  'PHYSICAL_READBACK_METRICS_INVALID');
 need(pc.explicit.GT+pc.explicit.CO+pc.inferred.GT+pc.inferred.CO+
  pc.unresolved.COMPLETE_POLICY_RELATION_REQUIRED===c.clients,
  'CLIENT_COUNTRY_TOTAL_RECONCILIATION_INVALID');
 const one=(role,country,policyScope,clientScope)=>report.effectiveScopeMatrix.find(m=>
  m.role===role&&m.country===country&&m.policyScope===policyScope&&m.clientScope===clientScope);
 const own=one('Operativo','CO','all','own'),all=one('Dirección','CO','all','all');
 need(own?.contexts===1&&own.authorizedPolicies===124&&own.authorizedClientRows===0&&
  own.policyLinks?.clientWrongAdvisorOrModule===104&&
  own.policyLinks?.clientRequiresCountryIndex===20&&
  all?.contexts===1&&all.authorizedPolicies===124&&all.authorizedClientRows===17&&
  all.policyLinks?.clientReadable===75&&all.policyLinks?.clientRequiresCountryIndex===49,
  'OPERATIONAL_ROLE_AND_COUNTRY_SCOPE_EVIDENCE_DRIFT');
}
export function runB4003PhysicalJoinEvidenceSuccessorGuard(){
 if(!json(CONTROL)[KEY])return false;
 const mode=(process.argv.find(x=>x.startsWith('--mode='))||'--mode=governance').slice(7);
 need(['governance','governance:1','i6'].includes(mode),'MODE_DENIED');
 const head=git('rev-parse','HEAD');
 need(git('rev-parse',BASE+'^{tree}')==='eaabea7801c0c50cdd53ab8cb358ea1e2bbe18f9',
  'PREDECESSOR_TREE_CHANGED');
 need(git('merge-base',BASE,head)===BASE,'CANONICAL_PREDECESSOR_NOT_ANCESTOR');
 need(same(changed(BASE,head),GOV_PATHS),'GOVERNANCE_ONLY_SCOPE_CHANGED');
 need(fs.readFileSync(GUARD,'utf8')===PREFIX+show(BASE,GUARD),
  'HISTORICAL_GUARD_NOT_APPEND_ONLY');
 const frozen={
  [CONTROL]:'7cffa28c76b208885d882ebe6df710b608d943ac',
  [GUARD]:'a46d1c94a4ea4ce9703c12361266b19ec8f6728a',
  [ROOT+'I6_5_B4_003_JOIN_WORKFLOW_CONTEXT_REPAIR_SUCCESSOR_20261102.json']:'586d6b7fc6e8e4d11a4efcee73a31b7954436e41',
  'tools/gravicentra-b4-003-client-join-workflow-context-repair-successor.mjs':'db660b74b28e19f17ce54d47b1244feb7379cb09'
 };
 for(const [file,sha] of Object.entries(frozen))
  need(blob(BASE,file)===sha,'FROZEN_PREDECESSOR_CHANGED:'+file);
 for(const file of GOV_PATHS)need(blob(head,file)===hash(file),
  'UNCOMMITTED_GOVERNANCE_DRIFT:'+file);
 for(const file of ['functions/b4-003-client-country-authority.js',
  'functions/b4-003-client-country-list-projection.js',
  'functions/b4-003-scoped-related-reader.js',
  '.github/workflows/gravicentra-b4-003-client-country-physical-readonly-20261102.yml',
  'tools/gravicentra-b4-003-policy-client-join-audit-readonly.cjs'])
  need(blob(BASE,file)===blob(head,file)&&blob(BASE,file)===hash(file),
   'PRODUCT_OR_READONLY_SOURCE_DRIFT:'+file);
 need(!git('ls-files','--others','--exclude-standard'),'UNTRACKED_SOURCE');
 verifyControl();verifyAggregate();
 console.log('B4_003_REAL_PHYSICAL_JOIN_EVIDENCE_GOVERNANCE=PASS 443_clients 1425_policies inferred_country_64 role_scope_mismatch=PROVEN');
 console.log('B4_003_SECURITY_AND_RELEASE=HOLD');
 console.log('GRAVICENTRA_I6_CONTROL_PLANE_GUARD=PASS');
 console.log('PRODUCT_SOURCE_DRIFT=false');
 return true;
}
