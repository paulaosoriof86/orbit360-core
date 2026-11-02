// First real LAB index dry-run exposed an exact pre-read limit-key mismatch.
// This successor freezes only the bounded read-only fix, its regression and
// an automatic canonical CI re-run; never a physical migration or LIVE grant.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const BASE='796b1b5cf788cdc6d8bfd03401f889b4ee5a631f';
const BASE_TREE='dc060d8c04831db8b7ba9996d69480cfd9b9ea8d';
const SOURCE='76121163570b30909b99c0fe08e05f3f43861a02';
const SOURCE_TREE='678119f7797eee8f5498b58d9b0f2334b18ce781';
const SOURCE_BLOBS=Object.freeze({
 'tools/gravicentra-b4-003-client-country-index-dryrun-readonly.cjs':'3185d6b99f76457fed60238c31c1c86a75fe9a85',
 'tools/gravicentra-b4-003-client-country-index-dryrun-readonly.test.cjs':'9e9ccb287b87147bb86a0dba0d66677e050414c1',
 '.github/workflows/gravicentra-b4-003-client-index-dryrun-readonly-20261102.yml':'a85dea65fa018b8aff947a35d81c2b9daf3d6961'
});
const sourcePaths=Object.keys(SOURCE_BLOBS).sort();
const ROOT='artifacts/orbit360-recovery/release-control/';
const CONTROL=ROOT+'CONTROL_PLANE.json';
const RECEIPT=ROOT+'I6_5_B4_003_CLIENT_COUNTRY_INDEX_DRYRUN_LIMIT_REPAIR_20261102.json';
const GUARD='tools/gravicentra-i6-control-plane-guard-v1.mjs';
const SELF='tools/gravicentra-b4-003-client-index-limit-repair-successor.mjs';
const KEY='b4003ClientIndexDryrunLimitRepair20261102';
const GOV_PATHS=[CONTROL,RECEIPT,GUARD,SELF].sort();
const PREFIX="import {runB4003ClientIndexLimitRepairSuccessorGuard} from './gravicentra-b4-003-client-index-limit-repair-successor.mjs';\n"+
 'if (runB4003ClientIndexLimitRepairSuccessorGuard()) process.exit(0);\n\n';
const fail=why=>{throw Error('B4_003_INDEX_LIMIT_REPAIR_GUARD_'+why);};
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
function verifyControl(){
 const before=JSON.parse(show(BASE,CONTROL)),after=json(CONTROL),p=after[KEY];
 need(Object.keys(before).length===440&&Object.keys(after).length===441,
  'CONTROL_APPEND_CARDINALITY');
 need(Object.keys(before).every(k=>same(before[k],after[k])),
  'HISTORICAL_CONTROL_MUTATION');
 need(same(Object.keys(after).filter(k=>!(k in before)),[KEY]),
  'UNAUTHORIZED_NEW_CONTROL_KEY');
 const expected={
  schema:'GRAVICENTRA_I65_B4003_CLIENT_INDEX_DRYRUN_LIMIT_REPAIR_POINTER_V1',
  gate:'I6.5/B4-003',recordedDate:'2026-11-02',
  recordType:'ADDITIVE_READONLY_CI_PRE_READ_FAILURE_FIX_NO_DATA_OR_PRODUCTION_WRITES',
  status:'REAL_READONLY_INDEX_RUN_FAILED_PRE_READ_LIMIT_BUG_FIXED_SOURCE_PASS_RERUN_PENDING_HOLD',
  canonicalParentHead:BASE,sourceCommit:SOURCE,sourceTree:SOURCE_TREE,
  receiptPath:RECEIPT,failedReadOnlyWorkflowRunId:41461434671,
  failedBeforeFirestoreGet:true,
  rootCause:'physical_collection_name_to_bounded_limit_key_mismatch',
  fixedFiles:3,exactCollectionReadLimitsEnforced:true,
  newSyntheticDryrunCases:22,realIndexDryrunCompleted:false,
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
 need(r.schema==='GRAVICENTRA_I65_B4003_CLIENT_COUNTRY_INDEX_DRYRUN_LIMIT_REPAIR_V1'&&
  r.repository==='paulaosoriof86/orbit360-core'&&
  r.canonicalBranch==='recovery/fase-a-clean-20260831'&&
  r.status===p.status&&r.canonicalParentHead===BASE&&
  r.sourceCommit===SOURCE&&r.sourceTree===SOURCE_TREE&&
  r.failedWorkflowRun?.id===41461434671&&
  r.failedWorkflowRun?.conclusion==='failure'&&
  r.failedWorkflowRun?.failureBeforeFirestoreGet===true&&
  r.failedWorkflowRun?.anyRealClientRecordReadByFailedStep===false&&
  r.rootCauseAndFix?.dryrunSyntheticCases===22&&
  r.rootCauseAndFix?.workflowSourceChangeTriggersFreshCanonicalPushRun===true&&
  same(r.rootCauseAndFix?.sourceBlobs,SOURCE_BLOBS)&&
  same(r.rootCauseAndFix?.testedPhysicalReadLimits,
   {clientes:2500,polizas:5000,aseguradoras:1000})&&
  r.notYetProven?.realIndexDryrunCompleted===false&&
  r.notYetProven?.physicalCandidateGT===null&&
  r.notYetProven?.physicalCandidateCO===null&&
  r.releaseHold?.productionAuthorized===false&&
  r.releaseHold?.B4003Closed===false&&
  r.releaseHold?.formalI6Percent===50&&
  r.releaseHold?.priorityP0Closed===1&&
  r.releaseHold?.priorityP0Total===6&&
  r.releaseHold?.dataWrites===0&&
  r.releaseHold?.liveHostingDeployed===false&&
  r.releaseHold?.liveFunctionsDeployed===false,
  'REPAIR_RECEIPT_OR_RELEASE_HOLD_INVALID');
}
export function runB4003ClientIndexLimitRepairSuccessorGuard(){
 if(!json(CONTROL)[KEY])return false;
 const mode=(process.argv.find(x=>x.startsWith('--mode='))||'--mode=governance').slice(7);
 need(['governance','governance:1','i6'].includes(mode),'MODE_DENIED');
 const head=git('rev-parse','HEAD');
 need(git('rev-parse',BASE+'^{tree}')===BASE_TREE,'PREDECESSOR_TREE_DRIFT');
 need(git('rev-parse',SOURCE+'^{tree}')===SOURCE_TREE,'SOURCE_TREE_DRIFT');
 need(git('rev-parse',SOURCE+'^')===BASE,'SOURCE_PARENT_DRIFT');
 need(git('merge-base',SOURCE,head)===SOURCE,'SOURCE_NOT_ANCESTOR');
 need(same(changed(BASE,SOURCE),sourcePaths),'SOURCE_CHANGE_SET_DRIFT');
 need(same(changed(SOURCE,head),GOV_PATHS),'GOVERNANCE_CHANGE_SET_DRIFT');
 need(same(changed(BASE,head),[...sourcePaths,...GOV_PATHS].sort()),'TOTAL_CHANGE_SET_DRIFT');
 for(const [file,sha] of Object.entries(SOURCE_BLOBS))
  need(blob(SOURCE,file)===sha&&blob(head,file)===sha&&hash(file)===sha,
   'SOURCE_BLOB_CHANGED:'+file);
 need(fs.readFileSync(GUARD,'utf8')===PREFIX+show(SOURCE,GUARD),
  'HISTORICAL_GUARD_NOT_APPEND_ONLY');
 for(const file of GOV_PATHS)
  need(blob(head,file)===hash(file),'UNCOMMITTED_GOVERNANCE_DRIFT:'+file);
 need(!git('ls-files','--others','--exclude-standard'),'UNTRACKED_SOURCE');
 verifyControl();
 const test=execFileSync('node',['tools/gravicentra-b4-003-client-country-index-dryrun-readonly.test.cjs'],
  {encoding:'utf8',maxBuffer:1024*1024});
 need(test.includes('cases=22'),'PHYSICAL_READ_LIMIT_REGRESSION_FAILURE');
 console.log('B4_003_INDEX_DRYRUN_LIMIT_PRE_READ_FIX=PASS allowlisted_collections_and_bounds');
 console.log('B4_003_REAL_INDEX_DRYRUN=RERUN_PENDING MIGRATION_APPLY=NOT_AUTHORIZED');
 console.log('B4_003_SECURITY_AND_RELEASE=HOLD');
 console.log('GRAVICENTRA_I6_CONTROL_PLANE_GUARD=PASS');
 console.log('PRODUCT_SOURCE_DRIFT=false');
 return true;
}
