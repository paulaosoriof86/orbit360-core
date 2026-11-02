// Cumulative B4-003 source proof for the existing #160 review branch.
// The prior canonical guard is executed on its own immutable merge commit.
// Neither this successor nor a successful synthetic test authorizes LIVE.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const ROOT='artifacts/orbit360-recovery/release-control/';
const BASE='0fa860638809c4a8beb82c25158434bcac884d01';
const REVIEW_PARENT='ce50d1fc6cc66ad0fc451b25f01b6aeb18aa5064';
const SOURCE='3644429f08f6bbdbec3ae023e287ad97c4616001';
const KEY='b4003ForbiddenRouteBootSuccessor20261102';
const CONTROL=ROOT+'CONTROL_PLANE.json';
const RECEIPT=ROOT+'I6_5_B4_003_FORBIDDEN_ROUTE_BOOT_SOURCE_SUCCESSOR_20261102.json';
const GUARD='tools/gravicentra-i6-control-plane-guard-v1.mjs';
const SELF='tools/gravicentra-b4-003-forbidden-route-boot-successor.mjs';
const TEST='tests/b4-003-forbidden-route-bootstrap.test.cjs';
const SOURCE_BLOBS={
  'orbit360-platform/core/product-hydration-required-optional-p0.js':'4eb68250d46f11f1c8e9c139d03f0ec005d81401',
  [TEST]:'c65385a99967719f3f3b7ef7b77580423ffaf446'
};
const SOURCE_PATHS=Object.keys(SOURCE_BLOBS).sort();
const GOVERNANCE_PATHS=[CONTROL,RECEIPT,GUARD,SELF].sort();
const PREFIX=
  "import {runB4003ForbiddenRouteBootSuccessorGuard} from './gravicentra-b4-003-forbidden-route-boot-successor.mjs';\n"+
  'if (runB4003ForbiddenRouteBootSuccessorGuard()) process.exit(0);\n\n';
const fail=code=>{throw Error('B4_003_FORBIDDEN_ROUTE_GUARD_'+code);};
const need=(ok,code)=>{if(!ok)fail(code);};
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:64*1024*1024}).trim();
const show=(ref,file)=>execFileSync('git',['show',ref+':'+file],{encoding:'utf8',maxBuffer:64*1024*1024});
const blob=(ref,file)=>git('rev-parse',ref+':'+file);
const hash=file=>git('hash-object',file);
const json=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const changed=(a,b)=>git('diff','--name-only',a,b).split(/\r?\n/).filter(Boolean).sort();
const stable=value=>value===null||typeof value!=='object'?value:Array.isArray(value)?value.map(stable):
  Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])]));
const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));

function predecessorGuardPasses(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gi-b4003-forbidden-predecessor-'));
  let added=false;
  try{
    execFileSync('git',['worktree','add','--detach',dir,BASE],{stdio:'pipe'});
    added=true;
    const output=execFileSync(process.execPath,[GUARD,'--mode=governance'],{
      cwd:dir,encoding:'utf8',timeout:300000,maxBuffer:32*1024*1024
    });
    need(output.includes('GRAVICENTRA_I6_CONTROL_PLANE_GUARD=PASS')&&
      output.includes('PRODUCT_SOURCE_DRIFT=false')&&
      output.includes('B4_003_SECURITY_AND_RELEASE=HOLD'),
      'PREDECESSOR_GOVERNANCE_NOT_PASS');
  }finally{
    if(added)execFileSync('git',['worktree','remove','--force',dir],{stdio:'pipe'});
    else fs.rmSync(dir,{recursive:true,force:true});
  }
}

export function runB4003ForbiddenRouteBootSuccessorGuard(){
  const current=json(CONTROL),pointer=current[KEY];
  if(!pointer)return false;
  const mode=(process.argv.find(arg=>arg.startsWith('--mode='))||'--mode=governance').slice(7);
  need(['governance','governance:1','i6'].includes(mode),'MODE_DENIED');
  const head=git('rev-parse','HEAD');
  need(git('merge-base',REVIEW_PARENT,BASE)===REVIEW_PARENT&&
    git('rev-parse',REVIEW_PARENT+'^{tree}')===git('rev-parse',BASE+'^{tree}'),
    'CANONICAL_TREE_DIVERGED_FROM_REVIEW_PARENT');
  need(git('merge-base',REVIEW_PARENT,SOURCE)===REVIEW_PARENT&&
    git('merge-base',SOURCE,head)===SOURCE,'SOURCE_ANCESTRY_INVALID');
  need(same(changed(REVIEW_PARENT,SOURCE),SOURCE_PATHS),'SOURCE_PATH_SCOPE_CHANGED');
  need(same(changed(SOURCE,head),GOVERNANCE_PATHS),'GOVERNANCE_PATH_SCOPE_CHANGED');
  need(same(changed(BASE,head),SOURCE_PATHS.concat(GOVERNANCE_PATHS).sort()),
    'CUMULATIVE_PATH_SCOPE_CHANGED');
  for(const [file,sha] of Object.entries(SOURCE_BLOBS))
    need(blob(SOURCE,file)===sha&&blob(head,file)===sha&&hash(file)===sha,
      'SOURCE_BYTES_CHANGED:'+file);
  need(fs.readFileSync(GUARD,'utf8')===PREFIX+show(BASE,GUARD),
    'PREDECESSOR_GUARD_NOT_BYTE_PRESERVED');
  for(const file of [
    ROOT+'I6_FINDINGS_LEDGER_20260924.json',
    ROOT+'I6_5_OPEN_FINDINGS_CARRY_FORWARD_REGISTER_20261003.json',
    ROOT+'I6_CANONICAL_ACCUMULATIVE_COMPOSITION_LOCK_20260924.json',
    ROOT+'I6_PENDING_CLOSURE_MASTER_PLAN_LOCK_20261004.json'
  ])need(blob(BASE,file)===blob(head,file)&&blob(BASE,file)===hash(file),
    'FROZEN_AUTHORITY_CHANGED:'+file);
  need(git('rev-parse',BASE+':functions')===git('rev-parse',head+':functions')&&
    git('rev-parse',BASE+':.github/workflows')===git('rev-parse',head+':.github/workflows')&&
    blob(BASE,'orbit360-platform/data/store-firestore-product-operational-p0.js')===
      blob(head,'orbit360-platform/data/store-firestore-product-operational-p0.js'),
    'BACKEND_OR_RELEASE_WORKFLOW_DRIFT');
  for(const file of GOVERNANCE_PATHS)
    need(blob(head,file)===hash(file),'UNCOMMITTED_GOVERNANCE_DRIFT:'+file);
  need(!git('ls-files','--others','--exclude-standard'),'UNTRACKED_SOURCE');

  const before=JSON.parse(show(BASE,CONTROL)),receipt=json(RECEIPT);
  need(Object.keys(before).length===433&&Object.keys(current).length===434&&
    Object.keys(before).every(key=>same(before[key],current[key]))&&
    same(Object.keys(current).filter(key=>!(key in before)),[KEY]),
    'PREDECESSOR_CONTROL_MUTATED');
  need(pointer.schema==='GRAVICENTRA_I65_B4003_FORBIDDEN_ROUTE_BOOT_POINTER_V1'&&
    pointer.gate==='I6.5/B4-003'&&
    pointer.status==='SOURCE_QA_PASS_HOSTING_PREVIEW_PARTIAL_UAT_RELEASE_HOLD'&&
    pointer.recordType==='ADDITIVE_CUMULATIVE_SOURCE_PROOF_NO_RELEASE_AUTHORITY'&&
    pointer.canonicalBaseHead===BASE&&pointer.reviewSourceParent===REVIEW_PARENT&&
    pointer.sourceCommit===SOURCE&&pointer.receiptPath===RECEIPT&&
    pointer.existingPrNumber===160&&pointer.regressionCasesPassed===9&&
    pointer.hostingOnlyPreviewRunId===41339702566&&
    pointer.formalI6Percent===50&&pointer.priorityP0Closed===1&&pointer.priorityP0Total===6,
    'CONTROL_POINTER_INVALID');
  need(receipt.schema==='GRAVICENTRA_I65_B4003_FORBIDDEN_ROUTE_BOOT_SOURCE_SUCCESSOR_V1'&&
    receipt.gate===pointer.gate&&receipt.repository==='paulaosoriof86/orbit360-core'&&
    receipt.canonicalBranch==='recovery/fase-a-clean-20260831'&&
    receipt.canonicalBaseHead===BASE&&receipt.reviewSourceParent===REVIEW_PARENT&&
    receipt.sourceCommit===SOURCE&&receipt.existingPrNumber===160&&
    same(receipt.sourceBlobs,SOURCE_BLOBS)&&receipt.regression?.path===TEST&&
    receipt.regression.tests===9&&receipt.regression.passed===9&&
    receipt.regression.syntheticOnly===true&&
    receipt.regression.serverRoleMatrixAsserted===true&&
    receipt.regression.predecessorRedCaseAsserted===true&&
    receipt.regression.noFirebaseNoWrites===true&&
    receipt.previousHostingOnlyPreview?.runId===41339702566&&
    receipt.previousHostingOnlyPreview.sourceSha===SOURCE&&
    receipt.previousHostingOnlyPreview.workflowResult==='SUCCESS'&&
    receipt.previousHostingOnlyPreview.productionDeployment===false,
    'SOURCE_RECEIPT_INVALID');
  for(const boundary of [pointer,receipt.releaseBoundary])
    need(boundary.temporaryRulesRiskExceptionPreserved===true&&
      boundary.securityCertifiedPass===false&&boundary.backendNegativeUidUatPass===false&&
      boundary.restoreDrillAccepted===false&&boundary.countryClient360ReconciliationPass===false&&
      boundary.fullAuthenticatedUatPass===false&&boundary.productionAuthorized===false&&
      boundary.b4003Closed===false&&boundary.dataWrites===0&&
      boundary.rulesAuthIamChanged===false&&boundary.functionsOrLiveDeployed===false,
      'RELEASE_HOLD_BROKEN');
  predecessorGuardPasses();
  const result=execFileSync(process.execPath,['--test',TEST],{
    encoding:'utf8',timeout:30000,maxBuffer:16*1024*1024
  });
  need(/\btests\s+9\b/.test(result)&&/\bpass\s+9\b/.test(result)&&
    /\bfail\s+0\b/.test(result),'FORBIDDEN_ROUTE_REGRESSION_NOT_PASS');
  console.log('B4_003_FORBIDDEN_ROUTE_CUMULATIVE_GOVERNANCE=PASS source_regressions=9 predecessor_guard_pass=true');
  console.log('B4_003_SECURITY_AND_RELEASE=HOLD');
  console.log('GRAVICENTRA_I6_CONTROL_PLANE_GUARD=PASS');
  console.log('PRODUCT_SOURCE_DRIFT=false');
  return true;
}
