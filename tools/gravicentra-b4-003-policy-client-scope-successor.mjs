// Additive I6.5/B4-003 successor: authenticated policy detail must not offer
// a client deep-link that the active client role cannot read. No LIVE grant.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const ROOT='artifacts/orbit360-recovery/release-control/';
const BASE='79f7992626ec3e2ab6ab5a81b53cff575bb0213f';
const SOURCE='0fbbed87f5b6d5d7533264f169c46592fb1aa04c';
const KEY='b4003PolicyClientScopeLinkSuccessor20261101';
const CONTROL=ROOT+'CONTROL_PLANE.json';
const RECEIPT=ROOT+'I6_5_B4_003_POLICY_CLIENT_SCOPE_LINK_SUCCESSOR_20261101.json';
const GUARD='tools/gravicentra-i6-control-plane-guard-v1.mjs';
const SELF='tools/gravicentra-b4-003-policy-client-scope-successor.mjs';
const TEST='tools/gravicentra-b4-003-policy-client-scope-link.test.cjs';
const SOURCE_BLOBS={
  'orbit360-platform/modules/policy-receipts-v1199-detail-guard.js':'64d8ab2faac0524b8670fc06f2cea5d0cb306041',
  [TEST]:'15667f79efde1d93fbaeff9cf77ab84bad0abada'
};
const SOURCE_PATHS=Object.keys(SOURCE_BLOBS).sort();
const GOVERNANCE_PATHS=[CONTROL,RECEIPT,GUARD,SELF].sort();
const ALL_PATHS=[...SOURCE_PATHS,...GOVERNANCE_PATHS].sort();
const PREFIX=
  "import {runB4003PolicyClientScopeSuccessorGuard} from './gravicentra-b4-003-policy-client-scope-successor.mjs';\n"+
  'if (runB4003PolicyClientScopeSuccessorGuard()) process.exit(0);\n\n';
const fail=code=>{throw Error('B4_003_POLICY_CLIENT_SCOPE_GUARD_'+code);};
const need=(ok,code)=>{if(!ok)fail(code);};
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:64*1024*1024}).trim();
const show=(ref,file)=>execFileSync('git',['show',ref+':'+file],{encoding:'utf8',maxBuffer:64*1024*1024});
const blob=(ref,file)=>git('rev-parse',ref+':'+file);
const hash=file=>git('hash-object',file);
const json=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const changed=(a,b)=>git('diff','--name-only',a,b).split(/\r?\n/).filter(Boolean).sort();
const stable=v=>v===null||typeof v!=='object'?v:Array.isArray(v)?v.map(stable):
  Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));
const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));

function verifyReceipt(before,current,receipt,pointer){
  need(Object.keys(before).length===431&&Object.keys(current).length===432,
    'CONTROL_KEY_CARDINALITY');
  need(Object.keys(before).every(k=>same(before[k],current[k])),
    'HISTORICAL_CONTROL_MUTATED');
  need(same(Object.keys(current).filter(k=>!(k in before)),[KEY]),
    'UNAUTHORIZED_CONTROL_ADDITION');
  need(same(current[KEY],pointer)&&
    pointer.schema==='GRAVICENTRA_I65_B4003_POLICY_CLIENT_SCOPE_LINK_POINTER_V1'&&
    pointer.recordType==='ADDITIVE_SCOPED_NAVIGATION_FIX_NO_RELEASE_AUTHORITY'&&
    pointer.status==='SOURCE_REGRESSIONS_PASS_PREVIEW_NOT_YET_VERIFIED_RELEASE_HOLD'&&
    pointer.gate==='I6.5/B4-003'&&pointer.canonicalParentHead===BASE&&
    pointer.sourceCommit===SOURCE&&pointer.receiptPath===RECEIPT&&
    pointer.sourceRegressionsPassed===10&&pointer.policyClientGapUnresolved===true&&
    pointer.authenticatedNewFixUatPassed===false&&
    pointer.newFixHostingPreviewPublished===false&&
    pointer.carlosHistoryNewPreviewRerunVerified===false&&
    pointer.physicalClientRecordAbsenceProven===false&&
    pointer.independentBackendNegativeUidUatPass===false&&
    pointer.firestoreRulesP0Closed===false&&pointer.restoreDrillAccepted===false&&
    pointer.advisorRecordsClassified===0&&pointer.dataWrites===0&&
    pointer.sharedRulesAuthIamMutation===false&&
    pointer.liveHostingDeployed===false&&pointer.liveFunctionsDeployed===false&&
    pointer.productionAuthorized===false&&pointer.b4003Closed===false&&
    pointer.formalI6Percent===50&&pointer.priorityP0Closed===1&&
    pointer.priorityP0Total===6&&pointer.currentGlobalImplementationPercent===null,
    'POINTER_EVIDENCE_OR_RELEASE_HOLD_INVALID');
  need(receipt.schema==='GRAVICENTRA_I65_B4003_POLICY_CLIENT_SCOPE_LINK_SUCCESSOR_V1'&&
    receipt.gate==='I6.5/B4-003'&&receipt.recordType===pointer.recordType&&
    receipt.status===pointer.status&&
    receipt.repository==='paulaosoriof86/orbit360-core'&&
    receipt.canonicalBranch==='recovery/fase-a-clean-20260831'&&
    receipt.canonicalParentHead===BASE&&receipt.sourceCommit===SOURCE&&
    same(receipt.sourceBlobs,SOURCE_BLOBS)&&
    receipt.transport?.method==='AUTHORIZED_GITHUB_GIT_DATABASE_CONNECTOR'&&
    receipt.transport.originalLocalSourceCommit==='fd78b874f7af149aae80ba60073148c74259b421'&&
    receipt.transport.remoteSourceCommit===SOURCE&&
    receipt.transport.exactSourceTreeSha==='1acf8db89b20e0aa28dbf27dcab5417c29c1646a'&&
    receipt.transport.sourceBlobBytesIdentical===true&&
    receipt.transport.differentCommitMetadataAcknowledged===true&&
    receipt.observedReadOnlyUat.identity==='Carlos Castro'&&
    receipt.observedReadOnlyUat.role==='Operativo'&&
    receipt.observedReadOnlyUat.selectedCountry==='CO'&&
    receipt.observedReadOnlyUat.policiesVisible===124&&
    receipt.observedReadOnlyUat.activePoliciesVisible===27&&
    receipt.observedReadOnlyUat.policyLinkedClientsOutsideSameCountryList===124&&
    receipt.observedReadOnlyUat.linkedClientsVisibleInAnotherCountry===12&&
    receipt.observedReadOnlyUat.linkedClientsUnavailableInCurrentScope===112&&
    receipt.observedReadOnlyUat.physicalClientRecordAbsenceProven===false&&
    receipt.observedReadOnlyUat.clientDeepLinkDeniedReproduced===true&&
    receipt.observedReadOnlyUat.vehicleDetailOpens===true&&
    receipt.observedReadOnlyUat.newFixAuthenticatedUatPassed===false&&
    receipt.observedReadOnlyUat.newFixHostingPreviewPublished===false&&
    receipt.fix.regressionCasesPassed===10&&
    receipt.fix.serverScopeMockChecksPassed===132&&
    receipt.fix.goalParticipationTestCountPassed===5&&
    receipt.fix.testIdentity==='synthetic_only'&&
    receipt.fix.dataWrites===0&&receipt.fix.identityOrClassificationWrites===0&&
    receipt.fix.securityRuleOrIAMChanges===false&&
    receipt.fix.firebaseHostingOrFunctionsDeployed===false&&
    receipt.remainingReleaseGates.sourceMergedIntoCanonical===false&&
    receipt.remainingReleaseGates.newFixAuthenticatedRoleCountryUat===false&&
    receipt.remainingReleaseGates.physicalPolicyClientJoinAudit===false&&
    receipt.remainingReleaseGates.independentNegativeUidBackendUat===false&&
    receipt.remainingReleaseGates.firestoreRulesP0Closed===false&&
    receipt.remainingReleaseGates.restoreDrillAccepted===false&&
    receipt.remainingReleaseGates.sevenAdvisorsClassified===false&&
    receipt.remainingReleaseGates.productionAuthorized===false&&
    receipt.remainingReleaseGates.b4003Closed===false&&
    receipt.remainingReleaseGates.formalI6Percent===50&&
    receipt.remainingReleaseGates.priorityP0Closed===1&&
    receipt.remainingReleaseGates.priorityP0Total===6&&
    receipt.remainingReleaseGates.globalImplementationPercent===null,
    'RECEIPT_EVIDENCE_OR_RELEASE_HOLD_INVALID');
}

function verifyPredecessor(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gi-policy-client-predecessor-'));
  let added=false;
  try {
    execFileSync('git',['worktree','add','--detach',dir,BASE],{stdio:'pipe'});
    added=true;
    const output=execFileSync(process.execPath,[GUARD,'--mode=i6'],
      {cwd:dir,encoding:'utf8',maxBuffer:32*1024*1024});
    need(output.includes('GRAVICENTRA_I6_CONTROL_PLANE_GUARD=PASS')&&
      output.includes('PRODUCT_SOURCE_DRIFT=false'),'PREDECESSOR_GUARD_FAILED');
  } finally {
    if(added)execFileSync('git',['worktree','remove','--force',dir],{stdio:'pipe'});
    else fs.rmSync(dir,{recursive:true,force:true});
  }
}

export function runB4003PolicyClientScopeSuccessorGuard(){
  const current=json(CONTROL),pointer=current[KEY];
  if(!pointer)return false;
  const mode=(process.argv.find(x=>x.startsWith('--mode='))||'--mode=governance').slice(7);
  need(['governance','governance:1','i6'].includes(mode),'MODE_DENIED');
  const head=git('rev-parse','HEAD');
  need(git('rev-parse',SOURCE+'^')===BASE,'SOURCE_PARENT_CHANGED');
  need(git('merge-base',SOURCE,head)===SOURCE,'SOURCE_NOT_ANCESTOR');
  need(same(changed(BASE,SOURCE),SOURCE_PATHS),'SOURCE_PATH_SCOPE_CHANGED');
  need(same(changed(SOURCE,head),GOVERNANCE_PATHS),'GOVERNANCE_PATH_SCOPE_CHANGED');
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
  for(const file of GOVERNANCE_PATHS)
    need(blob(head,file)===hash(file),'UNCOMMITTED_GOVERNANCE_DRIFT:'+file);
  verifyReceipt(JSON.parse(show(BASE,CONTROL)),current,json(RECEIPT),pointer);
  need(!git('ls-files','--others','--exclude-standard'),'UNTRACKED_SOURCE');
  verifyPredecessor();
  execFileSync(process.execPath,[TEST],{stdio:'pipe',maxBuffer:16*1024*1024});
  execFileSync(process.execPath,['tools/gravicentra-b4-003-scoped-related-reader.test.cjs'],
    {stdio:'pipe',maxBuffer:16*1024*1024});
  execFileSync(process.execPath,['--test','tests/goal-participation.test.cjs',
    'tests/goal-participation-modal.test.cjs','tests/goal-participation-preview-boundary.test.cjs',
    'tests/goal-participation-isolated-routing.test.cjs',
    'tests/goal-participation-uat-regressions.test.cjs'],
    {stdio:'pipe',maxBuffer:16*1024*1024});
  console.log('B4_003_POLICY_CLIENT_SCOPE_GOVERNANCE=PASS linked_client_navigation_guard cases=10');
  console.log('B4_003_SECURITY_AND_RELEASE=HOLD');
  console.log('GRAVICENTRA_I6_CONTROL_PLANE_GUARD=PASS');
  console.log('PRODUCT_SOURCE_DRIFT=false');
  return true;
}
