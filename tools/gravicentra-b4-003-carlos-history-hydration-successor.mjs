// Additive B4-003 governance successor for the Carlos authenticated cold-history
// regression. It certifies a bounded source/Preview without granting LIVE.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const ROOT='artifacts/orbit360-recovery/release-control/';
const BASE='f2ff33506aae4dcc9556ef8b063169bbdac4ecf2';
const SOURCE='bde43a5ea982e832bc937d6ba0f85352d6f64a7f';
const PREVIEW='04600fcd3db340749fc65e7b77e9c62878e42d64';
const KEY='b4003CarlosHistoryHydrationSuccessor20261101';
const CONTROL=ROOT+'CONTROL_PLANE.json';
const RECEIPT=ROOT+'I6_5_B4_003_CARLOS_HISTORY_HYDRATION_SUCCESSOR_20261101.json';
const GUARD='tools/gravicentra-i6-control-plane-guard-v1.mjs';
const SELF='tools/gravicentra-b4-003-carlos-history-hydration-successor.mjs';
const TEST='tools/gravicentra-b4-003-carlos-history-hydration-successor.test.mjs';
const WORKFLOW='.github/workflows/gravicentra-b4-003-carlos-historial-hydration-preview-20261101.yml';
const SOURCE_BLOBS={
  'orbit360-platform/modules/historial.js':'4db071720d4df5a167d3b246e6581e49267e4e73',
  'tools/gravicentra-b4-003-historial-country-selection.test.cjs':'e308e4c97da9a8a882410ed0fd0ddcb29bdf56cb'
};
const WORKFLOW_BLOB='24e771f21f6010962c63d0dcf2e2936e47d3a366';
const SOURCE_PATHS=Object.keys(SOURCE_BLOBS).sort();
const GOVERNANCE_PATHS=[CONTROL,RECEIPT,GUARD,SELF,TEST].sort();
const ALL_PATHS=[...SOURCE_PATHS,WORKFLOW,...GOVERNANCE_PATHS].sort();
const PREFIX=
  "import {runB4003CarlosHistoryHydrationSuccessorGuard} from './gravicentra-b4-003-carlos-history-hydration-successor.mjs';\n"+
  'if (runB4003CarlosHistoryHydrationSuccessorGuard()) process.exit(0);\n\n';
const fail=code=>{throw Error('B4_003_CARLOS_HISTORY_GUARD_'+code);};
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

export const carlosHistorySuccessorSpec=Object.freeze({
  base:BASE,source:SOURCE,preview:PREVIEW,key:KEY,control:CONTROL,receipt:RECEIPT,
  guard:GUARD,validator:SELF,test:TEST,workflow:WORKFLOW,
  sourcePaths:Object.freeze(SOURCE_PATHS),sourceBlobs:Object.freeze(SOURCE_BLOBS),
  workflowBlob:WORKFLOW_BLOB,governancePaths:Object.freeze(GOVERNANCE_PATHS),
  allPaths:Object.freeze(ALL_PATHS),prefix:PREFIX
});

export function checkCarlosHistorySuccessorReadModel(before,current,receipt,pointer){
  need(Object.keys(before).length===430&&Object.keys(current).length===431,
    'CONTROL_KEY_CARDINALITY');
  need(Object.keys(before).every(k=>same(before[k],current[k])),
    'HISTORICAL_CONTROL_MUTATED');
  need(same(Object.keys(current).filter(k=>!(k in before)),[KEY]),
    'UNAUTHORIZED_CONTROL_ADDITION');
  need(same(current[KEY],pointer)&&
    pointer?.schema==='GRAVICENTRA_I65_B4003_CARLOS_HISTORY_HYDRATION_POINTER_V1'&&
    pointer.gate==='I6.5/B4-003'&&
    pointer.recordType==='ADDITIVE_LAB_HYDRATION_FIX_NO_LIVE_AUTHORITY'&&
    pointer.status==='HISTORY_COLD_HYDRATION_FIXED_PREVIEW_PASS_RELEASE_HOLD'&&
    pointer.canonicalParentHead===BASE&&pointer.sourceCommit===SOURCE&&
    pointer.previewWorkflowHead===PREVIEW&&pointer.receiptPath===RECEIPT&&
    pointer.previewRunId===41261663411&&pointer.isolatedLabPreviewPublished===true&&
    pointer.carlosAuthenticatedPriorUat===true&&
    pointer.carlosNewPreviewRerunVerified===false&&
    pointer.historyFalseZeroReproductionBefore===0&&
    pointer.historyCanonicalServerScopeAfter===1&&
    pointer.newHydrationRegressionsPassed===true&&
    pointer.client360PolicyCrossCountryGapResolved===false&&
    pointer.firestoreRulesP0Closed===false&&pointer.independentBackendNegativeUidUatPass===false&&
    pointer.restoreDrillAccepted===false&&pointer.advisorRecordsClassified===0&&
    pointer.businessDataWrites===0&&pointer.liveHostingDeployed===false&&
    pointer.liveFunctionsDeployed===false&&pointer.sharedRulesAuthIamMutation===false&&
    pointer.productionAuthorized===false&&pointer.b4003Closed===false&&
    pointer.formalI6Percent===50&&pointer.priorityP0Closed===1&&
    pointer.priorityP0Total===6&&pointer.currentGlobalImplementationPercent===null,
    'POINTER_SCOPE_OR_RELEASING');
  need(receipt?.schema==='GRAVICENTRA_I65_B4003_CARLOS_HISTORY_HYDRATION_SUCCESSOR_V1'&&
    receipt.recordType==='ADDITIVE_VERIFIED_HISTORY_SOURCE_AND_HOSTING_PREVIEW'&&
    receipt.status==='HISTORY_COLD_HYDRATION_FIXED_LAB_PREVIEW_PRODUCTION_HOLD'&&
    receipt.repository==='paulaosoriof86/orbit360-core'&&
    receipt.canonicalBranch==='recovery/fase-a-clean-20260831'&&
    receipt.canonicalParentHead===BASE&&receipt.sourceCommit===SOURCE&&
    receipt.previewWorkflowHead===PREVIEW&&receipt.gate==='I6.5/B4-003'&&
    same(receipt.sourcePaths,SOURCE_PATHS)&&same(receipt.sourceBlobs,SOURCE_BLOBS)&&
    receipt.preview?.workflowPath===WORKFLOW&&
    receipt.preview.workflowBlob===WORKFLOW_BLOB&&
    receipt.preview.runId===41261663411&&
    receipt.preview.runConclusion==='success'&&receipt.preview.hostingOnly===true&&
    receipt.preview.sourceBytesMatchReadback===true&&
    receipt.preview.liveOriginsBeforeAfterUnchanged===true&&
    receipt.preview.ttlDays===7&&receipt.preview.url.startsWith('https://ays-orbit-360-lab--')&&
    receipt.carlosUat?.independentAuthenticationPassed===true&&
    receipt.carlosUat.oldPreviewHistorialColdZeroReproduced===true&&
    receipt.carlosUat.newPreviewRerunVerified===false&&
    receipt.carlosUat.oldPreviewPolicyClientScopeGapHeld===true&&
    receipt.carlosUat.issue===154&&
    receipt.regression?.reproducedBefore===0&&
    receipt.regression.fixedAfter===1&&
    receipt.regression.protectedCanonicalCountryOnly===true&&
    receipt.regression.legacyUnprotectedRelationPriorityUnchanged===true&&
    receipt.regression.syntheticOnly===true&&
    receipt.regression.firebaseWrites===0&&
    receipt.releaseBoundary?.formalI6Percent===50&&
    receipt.releaseBoundary.priorityP0Closed===1&&
    receipt.releaseBoundary.priorityP0Total===6&&
    receipt.releaseBoundary.globalImplementationPercent===null&&
    receipt.releaseBoundary.advisorClassificationsChanged===0&&
    receipt.releaseBoundary.realBusinessWrites===0&&
    receipt.releaseBoundary.sharedRulesAuthIamChanged===false&&
    receipt.releaseBoundary.functionsDeployed===false&&
    receipt.releaseBoundary.liveHostingDeployed===false&&
    receipt.releaseBoundary.backendNegativeUidAccepted===false&&
    receipt.releaseBoundary.restoreDrillAccepted===false&&
    receipt.releaseBoundary.b4003Closed===false&&
    receipt.releaseBoundary.productionAuthorized===false,
    'RECEIPT_EVIDENCE_OR_RELEASE_HOLD_INVALID');
  return {governance:'PASS',bugReproduction:'0->1',preview:'hosting-only',
    formalI6Percent:50,p0Closed:'1/6',productionAuthorized:false,b4003Closed:false};
}

function verifyHistoricalCanonicalGuard(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gi-carlos-history-base-'));
  let attached=false;
  try{
    execFileSync('git',['worktree','add','--detach',dir,BASE],{stdio:'pipe'});
    attached=true;
    const out=execFileSync(process.execPath,[GUARD,'--mode=i6'],
      {cwd:dir,encoding:'utf8',maxBuffer:32*1024*1024});
    need(out.includes('GRAVICENTRA_I6_CONTROL_PLANE_GUARD=PASS')&&
      out.includes('PRODUCT_SOURCE_DRIFT=false'),'PREDECESSOR_GUARD_FAILED');
  }finally{
    if(attached)execFileSync('git',['worktree','remove','--force',dir],{stdio:'pipe'});
    else fs.rmSync(dir,{recursive:true,force:true});
  }
}

export function runB4003CarlosHistoryHydrationSuccessorGuard(){
  const current=json(CONTROL),pointer=current[KEY];
  if(!pointer)return false;
  const mode=(process.argv.find(x=>x.startsWith('--mode='))||'--mode=governance').slice(7);
  need(['governance','governance:1','i6'].includes(mode),'MODE_DENIED');
  const head=git('rev-parse','HEAD');
  need(git('rev-parse',SOURCE+'^')===BASE,'SOURCE_PARENT_CHANGED');
  need(git('rev-parse',PREVIEW+'^')===SOURCE,'PREVIEW_PARENT_CHANGED');
  need(git('merge-base',PREVIEW,head)===PREVIEW,'PREVIEW_NOT_ANCESTOR');
  need(same(changed(BASE,SOURCE),SOURCE_PATHS),'SOURCE_SCOPE_CHANGED');
  need(same(changed(SOURCE,PREVIEW),[WORKFLOW]),'PREVIEW_WORKFLOW_SCOPE_CHANGED');
  need(same(changed(PREVIEW,head),GOVERNANCE_PATHS),'GOVERNANCE_DELTA_CHANGED');
  need(same(changed(BASE,head),ALL_PATHS),'TOTAL_DELTA_CHANGED');
  for(const [file,sha] of Object.entries(SOURCE_BLOBS)){
    need(blob(SOURCE,file)===sha&&blob(PREVIEW,file)===sha&&
      blob(head,file)===sha&&hash(file)===sha,'SOURCE_BYTES_CHANGED:'+file);
  }
  need(blob(PREVIEW,WORKFLOW)===WORKFLOW_BLOB&&
    blob(head,WORKFLOW)===WORKFLOW_BLOB&&hash(WORKFLOW)===WORKFLOW_BLOB,
    'WORKFLOW_BYTES_CHANGED');
  need(fs.readFileSync(GUARD,'utf8')===PREFIX+show(BASE,GUARD),
    'HISTORICAL_GUARD_NOT_APPEND_ONLY');
  for(const file of [ROOT+'I6_FINDINGS_LEDGER_20260924.json',
    ROOT+'I6_5_OPEN_FINDINGS_CARRY_FORWARD_REGISTER_20261003.json',
    ROOT+'I6_CANONICAL_ACCUMULATIVE_COMPOSITION_LOCK_20260924.json',
    ROOT+'I6_PENDING_CLOSURE_MASTER_PLAN_LOCK_20261004.json']){
    need(blob(BASE,file)===blob(head,file)&&blob(BASE,file)===hash(file),
      'HISTORICAL_FROZEN_BYTES_CHANGED:'+file);
  }
  for(const file of GOVERNANCE_PATHS)
    need(blob(head,file)===hash(file),'UNCOMMITTED_GOVERNANCE_DRIFT:'+file);
  const before=JSON.parse(show(BASE,CONTROL)),receipt=json(RECEIPT);
  const result=checkCarlosHistorySuccessorReadModel(before,current,receipt,pointer);
  need(!git('ls-files','--others','--exclude-standard'),'UNTRACKED_SOURCE');
  verifyHistoricalCanonicalGuard();
  execFileSync(process.execPath,['tools/gravicentra-b4-003-historial-country-selection.test.cjs'],
    {stdio:'pipe',maxBuffer:24*1024*1024});
  execFileSync(process.execPath,['tools/gravicentra-b4-003-scoped-related-reader.test.cjs'],
    {stdio:'pipe',maxBuffer:24*1024*1024});
  execFileSync(process.execPath,['tools/gravicentra-b4-003-protected-hydration.test.cjs'],
    {stdio:'pipe',maxBuffer:24*1024*1024});
  execFileSync(process.execPath,['--test','tests/goal-participation.test.cjs',
    'tests/goal-participation-modal.test.cjs','tests/goal-participation-preview-boundary.test.cjs',
    'tests/goal-participation-isolated-routing.test.cjs',
    'tests/goal-participation-uat-regressions.test.cjs'],
    {stdio:'pipe',maxBuffer:24*1024*1024});
  execFileSync(process.execPath,['--test',TEST],{stdio:'pipe',maxBuffer:16*1024*1024});
  console.log('B4_003_CARLOS_HISTORY_GOVERNANCE='+JSON.stringify(result));
  console.log('B4_003_SECURITY_AND_RELEASE=HOLD');
  console.log('GRAVICENTRA_I6_CONTROL_PLANE_GUARD=PASS');
  console.log('PRODUCT_SOURCE_DRIFT=false');
  return true;
}
