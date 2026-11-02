// Append-only source and release hold: one cumulative canonical branch.
// The existing country-document successor is immutable; the client list and
// physical read-only audit add a new independently checked source successor.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const BASE='a28f584343199dbf1e12b520a080b83e6371fce2';
const SOURCE='dfe1a55995c07cb158ef94a8c39496ac142be90b';
const TREE='167a343d5f91d37f0a8e983fcd23702717248ce1';
const KEY='b4003ClientListTransversalSource20261102';
const ROOT='artifacts/orbit360-recovery/release-control/';
const CONTROL=ROOT+'CONTROL_PLANE.json';
const RECEIPT=ROOT+'I6_5_B4_003_TRANSVERSAL_CLIENT_LIST_SOURCE_SUCCESSOR_20261102.json';
const GUARD='tools/gravicentra-i6-control-plane-guard-v1.mjs';
const SELF='tools/gravicentra-b4-003-client-list-transversal-successor.mjs';
const TEST='tools/gravicentra-b4-003-client-list-transversal-readonly.test.cjs';
const WORKFLOW='.github/workflows/gravicentra-b4-003-client-country-physical-readonly-20261102.yml';
const SOURCE_BLOBS={
 [WORKFLOW]:'99d431d4088db970e11077ee544e99576af20241',
 'functions/b4-003-client-country-authority.js':'cbf80ecb0cb80f02b013194eb18a8b3dc1e89492',
 'functions/b4-003-client-country-list-projection.js':'fbc60071f5e974b574b6adc123982c7207767faa',
 'functions/b4-003-scoped-related-reader.js':'faf54f6697fcd33c97208586848d2d0ff538ef31',
 [TEST]:'83c257a18dd63a55587b531bb02f9f6c3dc42d75',
 'tools/gravicentra-b4-003-policy-client-join-audit-readonly.cjs':'db0374cdb5207ba315a810e0a9ed096d0a5f2a1e'
};
const SOURCE_PATHS=Object.keys(SOURCE_BLOBS).sort();
const GOV_PATHS=[CONTROL,RECEIPT,GUARD,SELF].sort();
const ALL_PATHS=[...SOURCE_PATHS,...GOV_PATHS].sort();
const PREFIX="import {runB4003TransversalClientListSuccessorGuard} from './gravicentra-b4-003-client-list-transversal-successor.mjs';\n"+
 'if (runB4003TransversalClientListSuccessorGuard()) process.exit(0);\n\n';
const fail=reason=>{throw Error('B4_003_TRANSVERSAL_LIST_GUARD_'+reason);};
const need=(condition,reason)=>{if(!condition)fail(reason);};
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:64*1024*1024}).trim();
const show=(ref,file)=>execFileSync('git',['show',ref+':'+file],{encoding:'utf8',maxBuffer:64*1024*1024});
const blob=(ref,file)=>git('rev-parse',ref+':'+file);
const hash=file=>git('hash-object',file);
const json=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const changed=(before,after)=>git('diff','--name-only',before,after).split(/\r?\n/).filter(Boolean).sort();
const stable=x=>x===null||typeof x!=='object'?x:Array.isArray(x)?x.map(stable):
 Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])]));
const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));

function verifyFrozenControl(){
 const before=JSON.parse(show(BASE,CONTROL)),current=json(CONTROL),pointer=current[KEY];
 need(Object.keys(before).length===435&&Object.keys(current).length===436,
  'CONTROL_ADDITIVE_CARDINALITY');
 need(Object.keys(before).every(k=>same(before[k],current[k])),
  'HISTORICAL_CONTROL_REWRITTEN');
 need(same(Object.keys(current).filter(k=>!(k in before)),[KEY]),
  'UNAPPROVED_CONTROL_MUTATION');
 const expected={
  schema:'GRAVICENTRA_I65_B4003_TRANSVERSAL_CLIENT_LIST_POINTER_V1',
  gate:'I6.5/B4-003',
  recordType:'ADDITIVE_ONE_CANONICAL_BRANCH_TRANSVERSAL_COUNTRY_LIST_NO_RELEASE_AUTHORITY',
  status:'SOURCE_QA_PASS_PREVIEW_GATED_CLIENT_LIST_REAL_JOIN_PENDING_RELEASE_HOLD',
  canonicalParentHead:BASE,sourceCommit:SOURCE,sourceTreeSha:TREE,receiptPath:RECEIPT,
  newSyntheticChecksPassed:27,previousCountryChecksPassed:38,
  previousServerReaderChecksPassed:132,existingPolicyClientNavigationChecksPassed:19,
  insurerFallbackClientListPreviewSourceImplemented:true,
  previewRolloutControlledServerSide:true,liveFunctionUnchanged:true,
  realPhysicalJoinReadOnlyCompleted:false,realJoinReadOnlyWorkflowPrepared:true,
  indexedCountryMaterializationAccepted:false,
  multiUidAuthenticatedCountryRoleUatPassed:false,
  independentBackendNegativeUidUatPassed:false,firestoreRulesP0Closed:false,
  restoreDrillAccepted:false,sevenAdvisorsClassified:false,
  dataWrites:0,sharedRulesAuthIamMutation:false,liveHostingDeployed:false,
  liveFunctionsDeployed:false,productionAuthorized:false,b4003Closed:false,
  formalI6Percent:50,priorityP0Closed:1,priorityP0Total:6,
  currentGlobalImplementationPercent:null
 };
 need(pointer&&Object.entries(expected).every(([k,v])=>same(pointer[k],v)),
  'ADDITIVE_COUNTRY_LIST_POINTER_INVALID');
 const receipt=json(RECEIPT);
 need(receipt.schema==='GRAVICENTRA_I65_B4003_TRANSVERSAL_CLIENT_LIST_SOURCE_SUCCESSOR_V1'&&
  receipt.recordType===pointer.recordType&&receipt.status===pointer.status&&
  receipt.repository==='paulaosoriof86/orbit360-core'&&
  receipt.canonicalBranch==='recovery/fase-a-clean-20260831'&&
  receipt.canonicalParentHead===BASE&&receipt.sourceCommit===SOURCE&&
  same(receipt.sourceBlobs,SOURCE_BLOBS)&&
  receipt.transport?.method==='AUTHORIZED_GITHUB_GIT_DATABASE_CONNECTOR'&&
  receipt.transport?.remoteSourceCommit===SOURCE&&
  receipt.transport?.exactSourceTreeSha===TREE&&
  receipt.transport?.sourceBlobBytesIdentical===true&&
  receipt.sourceFix?.clientListReadOnlyReconciliationImplemented===true&&
  receipt.sourceFix?.productionReaderDefaultPreservesPreviousIndexedPagination===true&&
  receipt.sourceFix?.newSyntheticMultiIdentityRoleCountryChecks===27&&
  receipt.sourceFix?.existingClientCountrySourceChecks===38&&
  receipt.sourceFix?.existingServerRelatedReaderChecks===132&&
  receipt.sourceFix?.existingPolicyClientNavigationCases===19&&
  receipt.physicalJoinAudit?.workflowPath===WORKFLOW&&
  receipt.physicalJoinAudit?.realPhysicalJoinCompleted===false&&
  receipt.physicalJoinAudit?.personIdentitiesOrRecordsExported===false&&
  receipt.releaseHold?.productionScaleIndexReadAndWriteInvariantsProven===false&&
  receipt.releaseHold?.newPreviewCallableDeployedAndAuthenticatedMultiUidUatPassed===false&&
  receipt.releaseHold?.productionAuthorized===false&&
  receipt.releaseHold?.dataWrites===0&&
  receipt.releaseHold?.b4003Closed===false&&
  receipt.releaseHold?.formalI6Percent===50&&
  receipt.releaseHold?.priorityP0Closed===1&&
  receipt.releaseHold?.priorityP0Total===6,
  'CLIENT_LIST_RECEIPT_OR_RELEASE_HOLD_INVALID');
}
function verifyImmutablePredecessor(){
 need(git('cat-file','-t',BASE)==='commit','PREDECESSOR_NOT_COMMIT');
 need(git('rev-parse',BASE+'^{tree}')==='bb2a9b89af425841f296e69a7c9d1218000ee383',
  'PREDECESSOR_TREE_DRIFT');
 const frozen={
  [CONTROL]:'9b214f4886e39edb0c610ada35d29827c3facdd3',
  [GUARD]:'99aeb0c76d5a784cd817fd940529c3cc4c47b41e',
  [ROOT+'I6_5_B4_003_CLIENT_COUNTRY_AUTHORITY_SOURCE_SUCCESSOR_20261102.json']:'ab97be5eedd5924c5df41bd2b19afeabf532269f',
  'tools/gravicentra-b4-003-client-country-authority-successor.mjs':'991ba3794f8bfaf23b17ef24d562e647fc3ee977'
 };
 for(const [file,sha] of Object.entries(frozen))
  need(blob(BASE,file)===sha,'HISTORICAL_PREDECESSOR_CHANGED:'+file);
 const previous=JSON.parse(show(BASE,CONTROL)).b4003ClientCountryAuthoritySuccessor20261102;
 need(previous?.status==='SOURCE_QA_PASS_COUNTRY_CLIENT_LIST_AND_PHYSICAL_JOIN_HOLD'&&
  previous?.productionAuthorized===false&&previous?.b4003Closed===false&&
  previous?.formalI6Percent===50&&previous?.priorityP0Closed===1&&
  previous?.priorityP0Total===6,'PREDECESSOR_RELEASE_HOLD_CHANGED');
}
export function runB4003TransversalClientListSuccessorGuard(){
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
   'SOURCE_BLOB_DRIFT:'+file);
 need(fs.readFileSync(GUARD,'utf8')===PREFIX+show(BASE,GUARD),
  'HISTORICAL_GUARD_NOT_APPEND_ONLY');
 for(const file of [ROOT+'I6_FINDINGS_LEDGER_20260924.json',
  ROOT+'I6_5_OPEN_FINDINGS_CARRY_FORWARD_REGISTER_20261003.json',
  ROOT+'I6_CANONICAL_ACCUMULATIVE_COMPOSITION_LOCK_20260924.json',
  ROOT+'I6_PENDING_CLOSURE_MASTER_PLAN_LOCK_20261004.json'])
  need(blob(BASE,file)===blob(head,file)&&blob(BASE,file)===hash(file),
   'HISTORICAL_FROZEN_BYTES_CHANGED:'+file);
 for(const file of GOV_PATHS)need(blob(head,file)===hash(file),
  'UNCOMMITTED_GOVERNANCE_DRIFT:'+file);
 need(!git('ls-files','--others','--exclude-standard'),'UNTRACKED_SOURCE');
 verifyFrozenControl();verifyImmutablePredecessor();
 const workflow=fs.readFileSync(WORKFLOW,'utf8');
 need(workflow.includes('branches: [recovery/fase-a-clean-20260831]')&&
  workflow.includes('contents: read')&&
  workflow.includes('--real-readonly')&&
  workflow.includes('report.writes!==0')&&
  !workflow.includes('firebase deploy')&&
  !workflow.includes('firebase hosting:channel:deploy'),
  'READONLY_WORKFLOW_SAFETY_CONTRACT');
 const run=(file)=>execFileSync(process.execPath,[file],{encoding:'utf8',maxBuffer:16*1024*1024});
 need(run(TEST).includes('B4_003_TRANSVERSAL_CLIENT_LIST_READONLY_PASS checks=27'),
  'TRANSVERSAL_MULTI_UID_QA_FAILED');
 const prior=run('tools/gravicentra-b4-003-client-country-authority.test.cjs');
 need(prior.includes('B4_003_CLIENT_COUNTRY_INSURER_AUTHORITY_PASS checks=38'),
  'PREVIOUS_COUNTRY_AUTHORITY_QA_FAILED');
 need(run('tools/gravicentra-b4-003-scoped-related-reader.test.cjs')
  .includes('B4_003_RELATED_DOCUMENT_SERVER_SCOPE_MOCK_PASS checks=132'),
  'PREVIOUS_SCOPED_READER_QA_FAILED');
 need(run('tools/gravicentra-b4-003-policy-client-scope-link.test.cjs')
  .includes('B4_003_POLICY_VEHICLE_CLIENT_LINK_SCOPED_REGRESSION_PASS cases=19'),
  'PREVIOUS_NAVIGATION_SCOPE_QA_FAILED');
 console.log('B4_003_TRANSVERSAL_CLIENT_LIST_GOVERNANCE=PASS one_canonical_source=true preview_gate=CONTROLLED physical_join=AWAITING_CI');
 console.log('B4_003_SECURITY_AND_RELEASE=HOLD');
 console.log('GRAVICENTRA_I6_CONTROL_PLANE_GUARD=PASS');
 console.log('PRODUCT_SOURCE_DRIFT=false');
 return true;
}
