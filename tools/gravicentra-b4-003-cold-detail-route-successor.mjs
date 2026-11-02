// Additive I6.5/B4-003 cold-route successor. Preserve the historical guard and
// all frozen authorities; this proof never grants production or data mutations.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const ROOT='artifacts/orbit360-recovery/release-control/';
const BASE='9f2b978704912fff64593a6e51a31d2cd30583a6';
const REVIEW_PARENT='5b66682eaca3c0684786ade48960915bba32122a';
const SOURCE='ae5fb39612f7dd30e2f9ca875da5800d2bf251dc';
const KEY='b4003ColdDetailRouteSuccessor20261101';
const CONTROL=ROOT+'CONTROL_PLANE.json';
const RECEIPT=ROOT+'I6_5_B4_003_COLD_DETAIL_ROUTE_SOURCE_SUCCESSOR_20261101.json';
const GUARD='tools/gravicentra-i6-control-plane-guard-v1.mjs';
const SELF='tools/gravicentra-b4-003-cold-detail-route-successor.mjs';
const TEST='tools/gravicentra-b4-003-policy-client-scope-link.test.cjs';
const WORKFLOW='.github/workflows/gravicentra-b4-003-cold-detail-hosting-preview-20261101.yml';
const SOURCE_BLOBS={
  'orbit360-platform/modules/policy-receipts-v1199-detail-guard.js':'9e9a3f44f862e4be6cdc2d4658be39dddfd3e652',
  [TEST]:'250116244c6a708c4e194ce8adc732b6ec0a4465'
};
const SOURCE_PATHS=Object.keys(SOURCE_BLOBS).sort();
const GOVERNANCE_PATHS=[CONTROL,RECEIPT,GUARD,SELF].sort();
const PREFIX=
  "import {runB4003ColdDetailRouteSuccessorGuard} from './gravicentra-b4-003-cold-detail-route-successor.mjs';\n"+
  'if (runB4003ColdDetailRouteSuccessorGuard()) process.exit(0);\n\n';
const fail=code=>{throw Error('B4_003_COLD_DETAIL_ROUTE_GUARD_'+code);};
const need=(condition,code)=>{if(!condition)fail(code);};
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:64*1024*1024}).trim();
const show=(ref,file)=>execFileSync('git',['show',ref+':'+file],{encoding:'utf8',maxBuffer:64*1024*1024});
const blob=(ref,file)=>git('rev-parse',ref+':'+file);
const hash=file=>git('hash-object',file);
const json=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const changed=(a,b)=>git('diff','--name-only',a,b).split(/\r?\n/).filter(Boolean).sort();
const stable=v=>v===null||typeof v!=='object'?v:Array.isArray(v)?v.map(stable):
  Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));
const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));

function predecessorGuardPasses(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gi-b4003-cold-predecessor-'));
  let added=false;
  try {
    execFileSync('git',['worktree','add','--detach',dir,BASE],{stdio:'pipe'});
    added=true;
    const result=execFileSync(process.execPath,[GUARD,'--mode=governance'],
      {cwd:dir,encoding:'utf8',maxBuffer:32*1024*1024});
    need(result.includes('GRAVICENTRA_I6_CONTROL_PLANE_GUARD=PASS') &&
      result.includes('PRODUCT_SOURCE_DRIFT=false'),'PREDECESSOR_GOVERNANCE_NOT_PASS');
  } finally {
    if(added)execFileSync('git',['worktree','remove','--force',dir],{stdio:'pipe'});
    else fs.rmSync(dir,{recursive:true,force:true});
  }
}

export function runB4003ColdDetailRouteSuccessorGuard(){
  const current=json(CONTROL),pointer=current[KEY];
  if(!pointer)return false;
  const mode=(process.argv.find(x=>x.startsWith('--mode='))||'--mode=governance').slice(7);
  need(['governance','governance:1','i6'].includes(mode),'MODE_DENIED');
  const head=git('rev-parse','HEAD'),hasWorkflow=fs.existsSync(WORKFLOW);
  need(git('rev-parse',SOURCE+'^')===REVIEW_PARENT,'SOURCE_PARENT_CHANGED');
  need(git('merge-base',REVIEW_PARENT,BASE)===REVIEW_PARENT,'CANONICAL_ANCESTRY_CHANGED');
  need(changed(REVIEW_PARENT,BASE).length===0,'CANONICAL_BASE_FILE_DRIFT');
  need(git('merge-base',SOURCE,head)===SOURCE,'SOURCE_NOT_ANCESTOR');
  need(same(changed(REVIEW_PARENT,SOURCE),SOURCE_PATHS),'SOURCE_PATH_SCOPE_CHANGED');
  const expectedGovernanceDelta=GOVERNANCE_PATHS.concat(hasWorkflow?[WORKFLOW]:[]).sort();
  need(same(changed(SOURCE,head),expectedGovernanceDelta),'GOVERNANCE_PATH_SCOPE_CHANGED');
  need(same(changed(BASE,head),SOURCE_PATHS.concat(expectedGovernanceDelta).sort()),
    'TOTAL_PATH_SCOPE_CHANGED');
  for(const [file,sha] of Object.entries(SOURCE_BLOBS))
    need(blob(SOURCE,file)===sha&&blob(head,file)===sha&&hash(file)===sha,
      'SOURCE_BYTES_CHANGED:'+file);
  if(hasWorkflow)need(blob(head,WORKFLOW)===hash(WORKFLOW),'WORKFLOW_BYTES_DRIFT');
  need(fs.readFileSync(GUARD,'utf8')===PREFIX+show(BASE,GUARD),
    'HISTORICAL_GUARD_NOT_PRESERVED_APPEND_ONLY');
  for(const file of [
    ROOT+'I6_FINDINGS_LEDGER_20260924.json',
    ROOT+'I6_5_OPEN_FINDINGS_CARRY_FORWARD_REGISTER_20261003.json',
    ROOT+'I6_CANONICAL_ACCUMULATIVE_COMPOSITION_LOCK_20260924.json',
    ROOT+'I6_PENDING_CLOSURE_MASTER_PLAN_LOCK_20261004.json'
  ])need(blob(BASE,file)===blob(head,file)&&blob(BASE,file)===hash(file),
    'HISTORICAL_FROZEN_BYTES_CHANGED:'+file);
  for(const file of GOVERNANCE_PATHS)
    need(blob(head,file)===hash(file),'UNCOMMITTED_GOVERNANCE_DRIFT:'+file);

  const before=JSON.parse(show(BASE,CONTROL)),receipt=json(RECEIPT);
  need(Object.keys(before).length===432&&Object.keys(current).length===433,
    'CONTROL_KEY_CARDINALITY');
  need(Object.keys(before).every(k=>same(before[k],current[k])),
    'HISTORICAL_CONTROL_MUTATED');
  need(same(Object.keys(current).filter(k=>!(k in before)),[KEY]),
    'UNAUTHORIZED_CONTROL_ADDITION');
  need(pointer.schema==='GRAVICENTRA_I65_B4003_COLD_DETAIL_ROUTE_POINTER_V1'&&
    pointer.gate==='I6.5/B4-003'&&
    pointer.recordType==='ADDITIVE_COLD_DETAIL_SOURCE_REPAIR_NO_RELEASE_AUTHORITY'&&
    pointer.status==='SOURCE_QA_PASS_PROTECTED_HOSTING_PREVIEW_AND_CARLOS_UAT_PENDING'&&
    pointer.canonicalParentHead===BASE&&pointer.reviewSourceParent===REVIEW_PARENT&&
    pointer.sourceCommit===SOURCE&&pointer.receiptPath===RECEIPT&&
    pointer.existingPrNumber===159&&pointer.regressionCasesPassed===19&&
    pointer.formalI6Percent===50&&pointer.priorityP0Closed===1&&pointer.priorityP0Total===6&&
    pointer.temporaryRulesRiskExceptionPreserved===true&&
    pointer.securityCertifiedPass===false&&pointer.backendNegativeUidUatPass===false&&
    pointer.restoreDrillAccepted===false&&pointer.authenticatedColdRouteUatPass===false&&
    pointer.productionAuthorized===false&&pointer.b4003Closed===false&&
    pointer.dataWrites===0&&pointer.rulesAuthIamChanged===false&&
    pointer.functionsOrLiveDeployed===false,'POINTER_OR_RELEASE_HOLD_INVALID');

  need(receipt.schema==='GRAVICENTRA_I65_B4003_COLD_DETAIL_SOURCE_SUCCESSOR_V1'&&
    receipt.gate==='I6.5/B4-003'&&receipt.repository==='paulaosoriof86/orbit360-core'&&
    receipt.canonicalBranch==='recovery/fase-a-clean-20260831'&&
    receipt.canonicalParentHead===BASE&&receipt.reviewSourceParent===REVIEW_PARENT&&
    receipt.sourceCommit===SOURCE&&same(receipt.sourceBlobs,SOURCE_BLOBS)&&
    receipt.existingPrNumber===159&&receipt.previousPreview?.runId===41265194465&&
    receipt.previousPreview?.sourceSha===BASE&&
    receipt.authenticatedCarlosUat?.vehicleColdReloadFailureObserved===true&&
    receipt.authenticatedCarlosUat?.historyCoColdReloadPass===true&&
    receipt.authenticatedCarlosUat?.inicioFourOfFivePending===true&&
    receipt.fix?.regressionCasesPassed===19&&
    receipt.fix?.verificationIdentity==='synthetic_only'&&
    receipt.releaseBoundary?.temporaryRulesRiskExceptionPreserved===true&&
    receipt.releaseBoundary?.securityCertifiedPass===false&&
    receipt.releaseBoundary?.backendNegativeUidUatPass===false&&
    receipt.releaseBoundary?.restoreDrillAccepted===false&&
    receipt.releaseBoundary?.newSourcePreviewUatPass===false&&
    receipt.releaseBoundary?.productionAuthorized===false&&
    receipt.releaseBoundary?.b4003Closed===false&&
    receipt.releaseBoundary?.dataWrites===0&&
    receipt.releaseBoundary?.rulesAuthIamChanged===false&&
    receipt.releaseBoundary?.functionsOrLiveDeployed===false,
    'RECEIPT_OR_RELEASE_HOLD_INVALID');
  need(!git('ls-files','--others','--exclude-standard'),'UNTRACKED_SOURCE');
  predecessorGuardPasses();
  execFileSync(process.execPath,[TEST],{stdio:'pipe',maxBuffer:16*1024*1024});
  execFileSync(process.execPath,['tools/gravicentra-b4-003-scoped-related-reader.test.cjs'],
    {stdio:'pipe',maxBuffer:16*1024*1024});
  execFileSync(process.execPath,['--test','tests/goal-participation.test.cjs',
    'tests/goal-participation-modal.test.cjs','tests/goal-participation-preview-boundary.test.cjs',
    'tests/goal-participation-isolated-routing.test.cjs',
    'tests/goal-participation-uat-regressions.test.cjs'],
    {stdio:'pipe',maxBuffer:16*1024*1024});
  console.log('B4_003_COLD_DETAIL_GOVERNANCE=PASS source_regressions=19 historical_guard_intact=true');
  console.log('B4_003_SECURITY_AND_RELEASE=HOLD');
  console.log('GRAVICENTRA_I6_CONTROL_PLANE_GUARD=PASS');
  console.log('PRODUCT_SOURCE_DRIFT=false');
  return true;
}
