// Append-only bounded fix for the read-only GitHub Actions audit workflow.
// No product logic, server credentials, data, or release authority changed.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const BASE='eb87295e97a292b0f5b17b0865445df6500b083b';
const SOURCE='1a1ae425f7fe2e18351612b5d4fb350f7658d216';
const TREE='9a40a7aad08a7a827edf95816a3fb7d1cf35c925';
const KEY='b4003ClientJoinWorkflowContextRepair20261102';
const ROOT='artifacts/orbit360-recovery/release-control/';
const CONTROL=ROOT+'CONTROL_PLANE.json';
const RECEIPT=ROOT+'I6_5_B4_003_JOIN_WORKFLOW_CONTEXT_REPAIR_SUCCESSOR_20261102.json';
const GUARD='tools/gravicentra-i6-control-plane-guard-v1.mjs';
const SELF='tools/gravicentra-b4-003-client-join-workflow-context-repair-successor.mjs';
const WORKFLOW='.github/workflows/gravicentra-b4-003-client-country-physical-readonly-20261102.yml';
const SOURCE_BLOBS={[WORKFLOW]:'54af99c94548ff9a2dd1c6eddc941bf78bb0f291'};
const SOURCE_PATHS=[WORKFLOW];
const GOV_PATHS=[CONTROL,RECEIPT,GUARD,SELF].sort();
const ALL_PATHS=[...SOURCE_PATHS,...GOV_PATHS].sort();
const PREFIX="import {runB4003ClientJoinWorkflowContextRepairGuard} from './gravicentra-b4-003-client-join-workflow-context-repair-successor.mjs';\n"+
 'if (runB4003ClientJoinWorkflowContextRepairGuard()) process.exit(0);\n\n';
const fail=reason=>{throw Error('B4_003_JOIN_WORKFLOW_REPAIR_GUARD_'+reason);};
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

function verifyControl(){
 const before=JSON.parse(show(BASE,CONTROL)),current=json(CONTROL),pointer=current[KEY];
 need(Object.keys(before).length===436&&Object.keys(current).length===437,
  'CONTROL_ADDITIVE_CARDINALITY');
 need(Object.keys(before).every(k=>same(before[k],current[k])),
  'HISTORICAL_CONTROL_MUTATED');
 need(same(Object.keys(current).filter(k=>!(k in before)),[KEY]),
  'UNAUTHORIZED_CONTROL_CHANGE');
 const expected={
  schema:'GRAVICENTRA_I65_B4003_CLIENT_JOIN_WORKFLOW_CONTEXT_REPAIR_POINTER_V1',
  gate:'I6.5/B4-003',recordType:'ADDITIVE_GITHUB_ACTIONS_RUNNER_CONTEXT_LOCATION_ONLY_NO_RELEASE_AUTHORITY',
  status:'READONLY_ACTIONS_WORKFLOW_CONTEXT_REPAIRED_REAL_JOIN_RETRY_PENDING',
  canonicalParentHead:BASE,sourceCommit:SOURCE,sourceTreeSha:TREE,receiptPath:RECEIPT,
  failedGitHubActionsRunId:41388870022,failedRunHadNoJobs:true,
  invalidRunnerContextMovedFromJobEnvToStepEnv:true,previousClientListLogicUnchanged:true,
  newSyntheticChecksPassed:27,previousCountryChecksPassed:38,previousServerReaderChecksPassed:132,
  realPhysicalJoinReadOnlyCompleted:false,realJoinReadOnlyWorkflowCorrected:true,
  indexedCountryMaterializationAccepted:false,multiUidAuthenticatedCountryRoleUatPassed:false,
  independentBackendNegativeUidUatPassed:false,firestoreRulesP0Closed:false,
  restoreDrillAccepted:false,sevenAdvisorsClassified:false,
  dataWrites:0,sharedRulesAuthIamMutation:false,liveHostingDeployed:false,
  liveFunctionsDeployed:false,productionAuthorized:false,b4003Closed:false,
  formalI6Percent:50,priorityP0Closed:1,priorityP0Total:6,
  currentGlobalImplementationPercent:null
 };
 need(pointer&&Object.entries(expected).every(([k,v])=>same(pointer[k],v)),
  'NEW_WORKFLOW_REPAIR_POINTER_INVALID');
 const receipt=json(RECEIPT);
 need(receipt.schema==='GRAVICENTRA_I65_B4003_CLIENT_JOIN_WORKFLOW_CONTEXT_REPAIR_SUCCESSOR_V1'&&
  receipt.recordType===pointer.recordType&&receipt.status===pointer.status&&
  receipt.repository==='paulaosoriof86/orbit360-core'&&
  receipt.canonicalBranch==='recovery/fase-a-clean-20260831'&&
  receipt.canonicalParentHead===BASE&&receipt.sourceCommit===SOURCE&&
  same(receipt.sourceBlobs,SOURCE_BLOBS)&&
  receipt.transport?.method==='AUTHORIZED_GITHUB_GIT_DATABASE_CONNECTOR'&&
  receipt.transport?.remoteSourceCommit===SOURCE&&
  receipt.transport?.exactSourceTreeSha===TREE&&
  receipt.transport?.sourceBlobBytesIdentical===true&&
  receipt.previousFailureEvidence?.runId===41388870022&&
  receipt.previousFailureEvidence?.jobsReturned===0&&
  receipt.sourceFix?.change==='MOVE_B4_003_JOIN_AUDIT_OUT_FROM_JOB_ENV_TO_EXECUTION_STEP_ENV'&&
  receipt.sourceFix?.productCodeChanged===false&&
  receipt.sourceFix?.firestoreReadScriptChanged===false&&
  receipt.sourceFix?.newClientListChecksStillPassed===27&&
  receipt.sourceFix?.existingCountryChecksStillPassed===38&&
  receipt.sourceFix?.existingServerReaderChecksStillPassed===132&&
  receipt.releaseHold?.productionAuthorized===false&&
  receipt.releaseHold?.correctedRealPhysicalJoinRunCompleted===false&&
  receipt.releaseHold?.dataWrites===0&&receipt.releaseHold?.b4003Closed===false&&
  receipt.releaseHold?.formalI6Percent===50&&
  receipt.releaseHold?.priorityP0Closed===1&&receipt.releaseHold?.priorityP0Total===6,
  'WORKFLOW_REPAIR_RECEIPT_OR_RELEASE_HOLD_INVALID');
}
function verifyPreviousFrozenProof(){
 need(git('rev-parse',BASE+'^{tree}')==='85927df477e2aa1b1cce6807a6a281a415c31c16',
  'PREDECESSOR_TREE_CHANGED');
 const frozen={
  [CONTROL]:'3fa3fa66cb71d32d6d45b3c59a34f09a1e2ea62e',
  [GUARD]:'57155849ca199c3f113c5f75deb9c152d002dd85',
  [ROOT+'I6_5_B4_003_TRANSVERSAL_CLIENT_LIST_SOURCE_SUCCESSOR_20261102.json']:'b27660ac26a470ddfbc2653313630d52ee3a835a',
  'tools/gravicentra-b4-003-client-list-transversal-successor.mjs':'c308565a6c58f4ccacf6d0edefd0ae8436556412'
 };
 for(const [file,sha] of Object.entries(frozen))
  need(blob(BASE,file)===sha,'PREVIOUS_PROOF_CHANGED:'+file);
 const previous=JSON.parse(show(BASE,CONTROL)).b4003ClientListTransversalSource20261102;
 need(previous?.status==='SOURCE_QA_PASS_PREVIEW_GATED_CLIENT_LIST_REAL_JOIN_PENDING_RELEASE_HOLD'&&
  previous?.productionAuthorized===false&&previous?.b4003Closed===false&&
  previous?.formalI6Percent===50&&previous?.priorityP0Closed===1&&
  previous?.priorityP0Total===6,'PREVIOUS_RELEASE_HOLD_CHANGED');
}
export function runB4003ClientJoinWorkflowContextRepairGuard(){
 if(!json(CONTROL)[KEY])return false;
 const mode=(process.argv.find(x=>x.startsWith('--mode='))||'--mode=governance').slice(7);
 need(['governance','governance:1','i6'].includes(mode),'MODE_DENIED');
 const head=git('rev-parse','HEAD');
 need(git('rev-parse',SOURCE+'^')===BASE,'SOURCE_PARENT_CHANGED');
 need(git('rev-parse',SOURCE+'^{tree}')===TREE,'SOURCE_TREE_CHANGED');
 need(git('merge-base',SOURCE,head)===SOURCE,'SOURCE_NOT_ANCESTOR');
 need(same(changed(BASE,SOURCE),SOURCE_PATHS),'SOURCE_SCOPE_CHANGED');
 need(same(changed(SOURCE,head),GOV_PATHS),'GOVERNANCE_SCOPE_CHANGED');
 need(same(changed(BASE,head),ALL_PATHS),'TOTAL_SCOPE_CHANGED');
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
   'FROZEN_LEDGER_OR_PLAN_CHANGED:'+file);
 for(const file of GOV_PATHS)need(blob(head,file)===hash(file),
  'UNCOMMITTED_GOVERNANCE_DRIFT:'+file);
 need(!git('ls-files','--others','--exclude-standard'),'UNTRACKED_SOURCE');
 verifyControl();verifyPreviousFrozenProof();
 const workflow=fs.readFileSync(WORKFLOW,'utf8');
 const jobEnv=(workflow.split('    env:\n')[1]||'').split('    steps:\n')[0];
 const stepEnv=(workflow.split('      - name: Execute one bounded physical join and export aggregates only\n')[1]||'').split('        run: |\n')[0];
 need(!jobEnv.includes('runner.temp')&&
  stepEnv.includes('        env:\n          B4_003_JOIN_AUDIT_OUT: ${{ runner.temp }}/b4-003-physical-join-aggregate.json')&&
  workflow.includes('branches: [recovery/fase-a-clean-20260831]')&&
  workflow.includes('contents: read')&&workflow.includes('--real-readonly')&&
  !workflow.includes('firebase deploy'),
  'GITHUB_ACTIONS_CONTEXT_OR_READONLY_SCOPE_INVALID');
 const run=(file)=>execFileSync(process.execPath,[file],{encoding:'utf8',maxBuffer:16*1024*1024});
 need(run('tools/gravicentra-b4-003-client-list-transversal-readonly.test.cjs')
  .includes('B4_003_TRANSVERSAL_CLIENT_LIST_READONLY_PASS checks=27'),
  'PREVIOUS_TRANSVERSAL_QA_FAILED');
 need(run('tools/gravicentra-b4-003-client-country-authority.test.cjs')
  .includes('B4_003_CLIENT_COUNTRY_INSURER_AUTHORITY_PASS checks=38'),
  'PREVIOUS_COUNTRY_QA_FAILED');
 need(run('tools/gravicentra-b4-003-scoped-related-reader.test.cjs')
  .includes('B4_003_RELATED_DOCUMENT_SERVER_SCOPE_MOCK_PASS checks=132'),
  'PREVIOUS_SERVER_QA_FAILED');
 console.log('B4_003_READONLY_JOIN_WORKFLOW_CONTEXT_REPAIR=PASS source_exact=true previous_source_immutable=true');
 console.log('B4_003_SECURITY_AND_RELEASE=HOLD');
 console.log('GRAVICENTRA_I6_CONTROL_PLANE_GUARD=PASS');
 console.log('PRODUCT_SOURCE_DRIFT=false');
 return true;
}
