// Append-only B4-003 governance: narrow read-only client-country document
// fallback. This attestation does NOT close the client list or release gate.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const BASE='209ad2f38a9e0b0e1855f651665e4ac6fab09603';
const SOURCE='ddc5929db6c5d2a8eabad421b1ff496d9ac58f31';
const TREE='bb81a9d0308fb2dc135e45fcd8aeebbc2f87067f';
const KEY='b4003ClientCountryAuthoritySuccessor20261102';
const ROOT='artifacts/orbit360-recovery/release-control/';
const CONTROL=ROOT+'CONTROL_PLANE.json';
const RECEIPT=ROOT+'I6_5_B4_003_CLIENT_COUNTRY_AUTHORITY_SOURCE_SUCCESSOR_20261102.json';
const GUARD='tools/gravicentra-i6-control-plane-guard-v1.mjs';
const SELF='tools/gravicentra-b4-003-client-country-authority-successor.mjs';
const TEST='tools/gravicentra-b4-003-client-country-authority.test.cjs';
const SOURCE_BLOBS={
 'functions/b4-003-client-country-authority.js':'7e6caf8ed1acd0324fda9a64293c870ce97f28bf',
 'functions/b4-003-scoped-related-reader.js':'09698be31c4669e0413f4ef5fde524beb8a08e88',
 [TEST]:'8ab5137ef81f29401cfbab4151b79a96818e6755',
 'tools/gravicentra-b4-003-policy-client-join-audit-readonly.cjs':'e8a3207b29571a0547f6a360ded83e95f36d4884'
};
const SOURCE_PATHS=Object.keys(SOURCE_BLOBS).sort();
const GOV_PATHS=[CONTROL,RECEIPT,GUARD,SELF].sort();
const ALL_PATHS=[...SOURCE_PATHS,...GOV_PATHS].sort();
const PREFIX="import {runB4003ClientCountryAuthoritySuccessorGuard} from './gravicentra-b4-003-client-country-authority-successor.mjs';\n"+
 'if (runB4003ClientCountryAuthoritySuccessorGuard()) process.exit(0);\n\n';
const fail=s=>{throw Error('B4_003_CLIENT_COUNTRY_AUTHORITY_GUARD_'+s);};
const need=(ok,code)=>{if(!ok)fail(code);};
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:64*1024*1024}).trim();
const show=(ref,file)=>execFileSync('git',['show',ref+':'+file],{encoding:'utf8',maxBuffer:64*1024*1024});
const blob=(ref,file)=>git('rev-parse',ref+':'+file);
const hash=file=>git('hash-object',file);
const json=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const changed=(before,after)=>git('diff','--name-only',before,after).split(/\r?\n/).filter(Boolean).sort();
const stable=x=>x===null||typeof x!=='object'?x:Array.isArray(x)?x.map(stable):
 Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])]));
const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));

function verifyControl(){
 const before=JSON.parse(show(BASE,CONTROL)),current=json(CONTROL),pointer=current[KEY];
 need(Object.keys(before).length===434&&Object.keys(current).length===435,
  'CONTROL_CARDINALITY');
 need(Object.keys(before).every(k=>same(before[k],current[k])),
  'HISTORICAL_CONTROL_MUTATED');
 need(same(Object.keys(current).filter(k=>!(k in before)),[KEY]),
  'UNAUTHORIZED_CONTROL_CHANGE');
 const expected={
  schema:'GRAVICENTRA_I65_B4003_CLIENT_COUNTRY_AUTHORITY_POINTER_V1',
  gate:'I6.5/B4-003',status:'SOURCE_QA_PASS_COUNTRY_CLIENT_LIST_AND_PHYSICAL_JOIN_HOLD',
  recordType:'ADDITIVE_TRANSVERSAL_INSURER_COUNTRY_DOCUMENT_FIX_NO_RELEASE_AUTHORITY',
  canonicalParentHead:BASE,sourceCommit:SOURCE,receiptPath:RECEIPT,
  sourceRegressionsPassed:38,existingServerReaderRegressionsPassed:132,
  insurerCountryDocumentFallbackImplemented:true,
  countryClientListFallbackClosed:false,realPhysicalJoinReadOnlyCompleted:false,
  authenticatedMultiUidCountryRoleUatPass:false,independentBackendNegativeUidUatPass:false,
  firestoreRulesP0Closed:false,restoreDrillAccepted:false,sevenAdvisorsClassified:false,
  dataWrites:0,sharedRulesAuthIamMutation:false,liveHostingDeployed:false,
  liveFunctionsDeployed:false,productionAuthorized:false,b4003Closed:false,
  formalI6Percent:50,priorityP0Closed:1,priorityP0Total:6,
  currentGlobalImplementationPercent:null
 };
 need(pointer&&Object.entries(expected).every(([k,v])=>same(pointer[k],v)),
  'COUNTRY_POINTER_LOCK_INVALID');
 const receipt=json(RECEIPT);
 need(receipt.schema==='GRAVICENTRA_I65_B4003_CLIENT_COUNTRY_AUTHORITY_SOURCE_SUCCESSOR_V1'&&
  receipt.status===pointer.status&&receipt.recordType===pointer.recordType&&
  receipt.canonicalParentHead===BASE&&receipt.sourceCommit===SOURCE&&
  receipt.canonicalBranch==='recovery/fase-a-clean-20260831'&&
  receipt.repository==='paulaosoriof86/orbit360-core'&&
  same(receipt.sourceBlobs,SOURCE_BLOBS)&&
  receipt.transport?.method==='AUTHORIZED_GITHUB_GIT_DATABASE_CONNECTOR'&&
  receipt.transport?.remoteSourceCommit===SOURCE&&
  receipt.transport?.exactSourceTreeSha===TREE&&
  receipt.transport?.sourceBlobBytesIdentical===true&&
  receipt.sourceFix?.serverClientDocumentReadProjectionOnly===true&&
  receipt.sourceFix?.serverClientListFallbackEnabled===false&&
  receipt.sourceFix?.realPhysicalJoinAuditExecuted===false&&
  receipt.sourceFix?.newSyntheticContractChecks===38&&
  receipt.sourceFix?.existingServerRelatedReaderChecks===132&&
  receipt.existingAuthenticatedEvidence20261101?.countryCOPolicies===124&&
  receipt.existingAuthenticatedEvidence20261101?.physicalClientRecordAbsenceProven===false&&
  receipt.releaseHold?.countryClientListFallbackClosed===false&&
  receipt.releaseHold?.productionAuthorized===false&&
  receipt.releaseHold?.b4003Closed===false&&
  receipt.releaseHold?.dataWrites===0&&
  receipt.releaseHold?.formalI6Percent===50&&
  receipt.releaseHold?.priorityP0Closed===1&&
  receipt.releaseHold?.priorityP0Total===6,
  'COUNTRY_RECEIPT_EVIDENCE_OR_RELEASE_HOLD_INVALID');
}
function verifyPredecessor(){
 // Exact predecessor's *Git tree and four frozen governance blobs* are
 // checked without executing its guard. The old implementation spawned a
 // nested worktree/guard for each historical successor, recursively.
 // The previous PR #160 guard PASS is a frozen historical attestation;
 // this check proves its bytes/commit lineage remain identical, not a
 // fresh re-execution of every historical browser/runtime test.
 need(git('cat-file','-t',BASE)==='commit','PREDECESSOR_NOT_A_COMMIT');
 need(git('rev-parse',BASE+'^{tree}')==='3b50bb6521d753c1451904957fb1d373d961dfce',
  'PREDECESSOR_TREE_CHANGED');
 const frozen={
  [CONTROL]:'282c2f1e695ab95ed18fab275c53e55505590405',
  [GUARD]:'58400706cc6065c8aefaf626eaa8c7f020280187',
  [ROOT+'I6_5_B4_003_FORBIDDEN_ROUTE_BOOT_SOURCE_SUCCESSOR_20261102.json']:'c3995aab414b5b43d63fd6872d21b9352506f9bf',
  'tools/gravicentra-b4-003-forbidden-route-boot-successor.mjs':'0a3630c30957bb8b94a12efb4733d2834c1775b4'
 };
 for(const [file,sha] of Object.entries(frozen))
  need(blob(BASE,file)===sha,'FROZEN_PREDECESSOR_BLOB_CHANGED:'+file);
 const previous=JSON.parse(show(BASE,CONTROL));
 const locked=previous.b4003ForbiddenRouteBootSuccessor20261102;
 need(locked?.gate==='I6.5/B4-003'&&
  locked.status==='SOURCE_QA_PASS_HOSTING_PREVIEW_PARTIAL_UAT_RELEASE_HOLD'&&
  locked.productionAuthorized===false&&locked.b4003Closed===false&&
  locked.formalI6Percent===50&&locked.priorityP0Closed===1&&
  locked.priorityP0Total===6,'PREDECESSOR_RELEASE_HOLD_CHANGED');
}
export function runB4003ClientCountryAuthoritySuccessorGuard(){
 if(!json(CONTROL)[KEY])return false;
 const mode=(process.argv.find(x=>x.startsWith('--mode='))||'--mode=governance').slice(7);
 need(['governance','governance:1','i6'].includes(mode),'MODE_DENIED');
 const head=git('rev-parse','HEAD');
 need(git('rev-parse',SOURCE+'^')===BASE,'SOURCE_PARENT_CHANGED');
 need(git('rev-parse',SOURCE+'^{tree}')===TREE,'SOURCE_TREE_CHANGED');
 need(git('merge-base',SOURCE,head)===SOURCE,'SOURCE_NOT_ANCESTOR');
 need(same(changed(BASE,SOURCE),SOURCE_PATHS),'SOURCE_PATH_SCOPE_CHANGED');
 need(same(changed(SOURCE,head),GOV_PATHS),'GOVERNANCE_PATH_SCOPE_CHANGED');
 need(same(changed(BASE,head),ALL_PATHS),'TOTAL_PATH_SCOPE_CHANGED');
 for(const [file,sha] of Object.entries(SOURCE_BLOBS))
  need(blob(SOURCE,file)===sha&&blob(head,file)===sha&&hash(file)===sha,
   'SOURCE_BYTES_CHANGED:'+file);
 need(fs.readFileSync(GUARD,'utf8')===PREFIX+show(BASE,GUARD),
  'HISTORICAL_GUARD_NOT_APPEND_ONLY');
 for(const file of [ROOT+'I6_FINDINGS_LEDGER_20260924.json',
  ROOT+'I6_5_OPEN_FINDINGS_CARRY_FORWARD_REGISTER_20261003.json',
  ROOT+'I6_CANONICAL_ACCUMULATIVE_COMPOSITION_LOCK_20260924.json',
  ROOT+'I6_PENDING_CLOSURE_MASTER_PLAN_LOCK_20261004.json'])
  need(blob(BASE,file)===blob(head,file)&&blob(BASE,file)===hash(file),
   'HISTORICAL_FROZEN_BYTES_CHANGED:'+file);
 for(const file of GOV_PATHS)need(blob(head,file)===hash(file),'UNCOMMITTED_GOVERNANCE_DRIFT:'+file);
 need(!git('ls-files','--others','--exclude-standard'),'UNTRACKED_SOURCE');
 verifyControl();verifyPredecessor();
 const output=execFileSync(process.execPath,[TEST],{encoding:'utf8',maxBuffer:16*1024*1024});
 need(output.includes('B4_003_CLIENT_COUNTRY_INSURER_AUTHORITY_PASS checks=38')&&
  output.includes('B4_003_CLIENT_LIST_COUNTRY_FALLBACK=HOLD'),
  'COUNTRY_SYNTHETIC_SECURITY_QA_FAILED');
 const related=execFileSync(process.execPath,['tools/gravicentra-b4-003-scoped-related-reader.test.cjs'],
  {encoding:'utf8',maxBuffer:16*1024*1024});
 need(related.includes('B4_003_RELATED_DOCUMENT_SERVER_SCOPE_MOCK_PASS checks=132'),
  'EXISTING_SERVER_SCOPE_QA_FAILED');
 const policy=execFileSync(process.execPath,['tools/gravicentra-b4-003-policy-client-scope-link.test.cjs'],
  {encoding:'utf8',maxBuffer:16*1024*1024});
 need(policy.includes('B4_003_POLICY_VEHICLE_CLIENT_LINK_SCOPED_REGRESSION_PASS cases=19'),
  'EXISTING_POLICY_CLIENT_SCOPE_QA_FAILED');
 console.log('B4_003_CLIENT_COUNTRY_AUTHORITY_GOVERNANCE=PASS source_only document_fallback=PASS client_list=HOLD');
 console.log('B4_003_SECURITY_AND_RELEASE=HOLD');
 console.log('GRAVICENTRA_I6_CONTROL_PLANE_GUARD=PASS');
 console.log('PRODUCT_SOURCE_DRIFT=false');
 return true;
}
