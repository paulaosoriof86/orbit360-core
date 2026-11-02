// Source-only bounded LAB read-only CI workflow; additively frozen into the
// ONE canonical candidate. No security, data, Auth, Hosting, or LIVE writes.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const BASE='6db3bc1e3c6064f0b9ef2464a154b6cd5814c0cd';
const BASE_TREE='454bfedf099a882d0ea7e6c9692032fd9d22b7c5';
const SOURCE='fdae20214f4db3169222c4584c606d5cc123752c';
const SOURCE_TREE='292e51a0887aa3be1f999ea5e92f672265cfa7e0';
const SOURCE_FILE='.github/workflows/gravicentra-b4-003-client-index-dryrun-readonly-20261102.yml';
const SOURCE_BLOB='ba813b2b176b977c290c86192f9085bfc2ebb21d';
const ROOT='artifacts/orbit360-recovery/release-control/';
const CONTROL=ROOT+'CONTROL_PLANE.json';
const RECEIPT=ROOT+'I6_5_B4_003_CLIENT_COUNTRY_INDEX_DRYRUN_CI_SUCCESSOR_20261102.json';
const GUARD='tools/gravicentra-i6-control-plane-guard-v1.mjs';
const SELF='tools/gravicentra-b4-003-country-index-dryrun-workflow-successor.mjs';
const KEY='b4003ClientCountryIndexDryrunCICanonical20261102';
const GOV_PATHS=[CONTROL,RECEIPT,GUARD,SELF].sort();
const PREFIX="import {runB4003CountryIndexDryrunWorkflowSuccessorGuard} from './gravicentra-b4-003-country-index-dryrun-workflow-successor.mjs';\n"+
 'if (runB4003CountryIndexDryrunWorkflowSuccessorGuard()) process.exit(0);\n\n';
const fail=why=>{throw Error('B4_003_CLIENT_INDEX_DRYRUN_CI_GUARD_'+why);};
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
 const before=JSON.parse(show(BASE,CONTROL)),after=json(CONTROL),pointer=after[KEY];
 need(Object.keys(before).length===439&&Object.keys(after).length===440,
  'CONTROL_APPEND_CARDINALITY');
 need(Object.keys(before).every(k=>same(before[k],after[k])),
  'HISTORICAL_CONTROL_MUTATION');
 need(same(Object.keys(after).filter(k=>!(k in before)),[KEY]),
  'UNAUTHORIZED_NEW_CONTROL_KEY');
 const expected={
  schema:'GRAVICENTRA_I65_B4003_CLIENT_COUNTRY_INDEX_READONLY_CI_POINTER_V1',
  gate:'I6.5/B4-003',recordedDate:'2026-11-02',
  recordType:'ADDITIVE_AUTOMATIC_LAB_DRYRUN_ONLY_NO_FIRESTORE_OR_PRODUCTION_WRITES',
  status:'GUARDED_CANONICAL_ONLY_LAB_READONLY_INDEX_DELTA_WORKFLOW_READY_RUN_PENDING_HOLD',
  canonicalParentHead:BASE,workflowSourceCommit:SOURCE,workflowSourceTree:SOURCE_TREE,
  receiptPath:RECEIPT,workflowPath:SOURCE_FILE,
  canonicalBranchTriggerOnly:true,existingLabReadCredentialOnly:true,
  aggregateOnlyOutputNoPersonalIdentifiers:true,realIndexDryrunCompleted:false,
  migrationApplyAuthorized:false,backupRestoreApproved:false,
  multiUidAuthenticatedPreviewUatPassed:false,independentBackendNegativeUidUatPassed:false,
  firestoreRulesP0Closed:false,restoreDrillAccepted:false,sevenAdvisorsClassified:false,
  dataWrites:0,sharedRulesAuthIamMutation:false,liveHostingDeployed:false,
  liveFunctionsDeployed:false,productionAuthorized:false,b4003Closed:false,
  formalI6Percent:50,priorityP0Closed:1,priorityP0Total:6,
  currentGlobalImplementationPercent:null
 };
 need(pointer&&Object.entries(expected).every(([k,v])=>same(pointer[k],v)),
  'CONTROL_POINTER_MISMATCH');
 const receipt=json(RECEIPT);
 need(receipt.schema==='GRAVICENTRA_I65_B4003_CLIENT_COUNTRY_INDEX_DRYRUN_CI_SUCCESSOR_V1'&&
  receipt.repository==='paulaosoriof86/orbit360-core'&&
  receipt.canonicalBranch==='recovery/fase-a-clean-20260831'&&
  receipt.status===pointer.status&&receipt.canonicalParentHead===BASE&&
  receipt.workflowSourceCommit===SOURCE&&receipt.workflowSourceTree===SOURCE_TREE&&
  receipt.workflowPath===SOURCE_FILE&&receipt.workflowGitBlobSha===SOURCE_BLOB&&
  receipt.preexistingPhysicalReadAuthority?.project==='ays-orbit-360-lab'&&
  receipt.preexistingPhysicalReadAuthority?.tenant==='alianzas-soluciones'&&
  receipt.preexistingPhysicalReadAuthority?.newCredentialAuthorized===false&&
  receipt.restrictions?.permissions==='contents:read'&&
  receipt.restrictions?.checkoutPersistCredentials===false&&
  receipt.restrictions?.boundedTimeoutSeconds===180&&
  receipt.restrictions?.firestoreWrites===0&&
  receipt.restrictions?.migrationApplyAuthorized===false&&
  receipt.notYetProven?.realIndexDryrunCompleted===false&&
  receipt.notYetProven?.physicalCandidateGT===null&&
  receipt.notYetProven?.physicalCandidateCO===null&&
  receipt.releaseHold?.productionAuthorized===false&&
  receipt.releaseHold?.B4003Closed===false&&
  receipt.releaseHold?.formalI6Percent===50&&
  receipt.releaseHold?.priorityP0Closed===1&&
  receipt.releaseHold?.priorityP0Total===6&&
  receipt.releaseHold?.dataWrites===0&&
  receipt.releaseHold?.liveHostingDeployed===false&&
  receipt.releaseHold?.liveFunctionsDeployed===false,
  'WORKFLOW_RECEIPT_OR_RELEASE_HOLD_MISMATCH');
}
export function runB4003CountryIndexDryrunWorkflowSuccessorGuard(){
 if(!json(CONTROL)[KEY])return false;
 const mode=(process.argv.find(x=>x.startsWith('--mode='))||'--mode=governance').slice(7);
 need(['governance','governance:1','i6'].includes(mode),'MODE_DENIED');
 const head=git('rev-parse','HEAD');
 need(git('rev-parse',BASE+'^{tree}')===BASE_TREE,'PREDECESSOR_TREE_DRIFT');
 need(git('rev-parse',SOURCE+'^{tree}')===SOURCE_TREE,'SOURCE_TREE_DRIFT');
 need(git('rev-parse',SOURCE+'^')===BASE,'SOURCE_PARENT_DRIFT');
 need(git('merge-base',SOURCE,head)===SOURCE,'SOURCE_NOT_ANCESTOR');
 need(same(changed(BASE,SOURCE),[SOURCE_FILE]),'SOURCE_CHANGE_SET_DRIFT');
 need(same(changed(SOURCE,head),GOV_PATHS),'GOVERNANCE_CHANGE_SET_DRIFT');
 need(same(changed(BASE,head),[SOURCE_FILE,...GOV_PATHS].sort()),'TOTAL_CHANGE_SET_DRIFT');
 need(blob(SOURCE,SOURCE_FILE)===SOURCE_BLOB&&blob(head,SOURCE_FILE)===SOURCE_BLOB&&
  hash(SOURCE_FILE)===SOURCE_BLOB,'WORKFLOW_SOURCE_DRIFT');
 need(fs.readFileSync(GUARD,'utf8')===PREFIX+show(SOURCE,GUARD),
  'HISTORICAL_GUARD_NOT_APPEND_ONLY');
 for(const file of GOV_PATHS)
  need(blob(head,file)===hash(file),'UNCOMMITTED_GOVERNANCE_DRIFT:'+file);
 need(!git('ls-files','--others','--exclude-standard'),'UNTRACKED_SOURCE');
 verifyControl();
 const proof=execFileSync('node',['tools/gravicentra-b4-003-client-country-index-dryrun-readonly.test.cjs'],
  {encoding:'utf8',maxBuffer:1024*1024});
 need(proof.includes('cases=18'),'SYNTHETIC_INDEX_DRYRUN_QA_FAILED');
 console.log('B4_003_CLIENT_INDEX_DRYRUN_CI_WORKFLOW=PASS canonical_only aggregate_only zero_writes');
 console.log('B4_003_REAL_INDEX_DRYRUN=RUN_PENDING MIGRATION_APPLY=NOT_AUTHORIZED');
 console.log('B4_003_SECURITY_AND_RELEASE=HOLD');
 console.log('GRAVICENTRA_I6_CONTROL_PLANE_GUARD=PASS');
 console.log('PRODUCT_SOURCE_DRIFT=false');
 return true;
}
