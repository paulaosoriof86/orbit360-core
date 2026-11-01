// B4-003 additive successor: certify the published, authenticated UAT source
// without rewriting an earlier frozen receipt or granting a LIVE release.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const ROOT='artifacts/orbit360-recovery/release-control/';
const BASE='0a25c5a2bf58bbe06537be42388b8530802f9c49';
const SOURCE='f598a65f7cdbbfe358ba54d71e48598aa6174107';
const PREVIEW='1a43289b1648bfb5ff936c3c63dadda85770ff71';
const KEY='b4003AuthenticatedUatSuccessor20261101';
const CONTROL=ROOT+'CONTROL_PLANE.json';
const RECEIPT=ROOT+'I6_5_B4_003_AUTHENTICATED_UAT_GOVERNANCE_SUCCESSOR_20261101.json';
const GUARD='tools/gravicentra-i6-control-plane-guard-v1.mjs';
const SELF='tools/gravicentra-b4-003-authenticated-uat-successor.mjs';
const TEST='tools/gravicentra-b4-003-authenticated-uat-successor.test.mjs';
const WORKFLOW='.github/workflows/gravicentra-b4-003-uat-successor-preview-20261101.yml';
const FROZEN=[
  ROOT+'I6_FINDINGS_LEDGER_20260924.json',
  ROOT+'I6_5_OPEN_FINDINGS_CARRY_FORWARD_REGISTER_20261003.json',
  ROOT+'I6_CANONICAL_ACCUMULATIVE_COMPOSITION_LOCK_20260924.json',
  ROOT+'I6_PENDING_CLOSURE_MASTER_PLAN_LOCK_20261004.json'
];
const SOURCE_BLOBS={
  'orbit360-platform/modules/equipo-onboarding-v20260804-bridge.js':'7b0e5cee941f8289a32fc53d2081f1a381fb6974',
  'orbit360-platform/modules/equipo.js':'411b8200a29dedf734e1640576319ccb88fc5c1a',
  'orbit360-platform/modules/inicio.js':'51eeabf680f219f50b4784a030aff8a5b55c9720',
  'tests/goal-participation-uat-regressions.test.cjs':'eaabd90816631b199a440bd93115e5d829a13010'
};
const WORKFLOW_BLOB='29ef8ee9f54d29cdd35ee58811c98fa524b1088b';
const GOVERNANCE_PATHS=[CONTROL,RECEIPT,GUARD,SELF,TEST].sort();
const SOURCE_PATHS=Object.keys(SOURCE_BLOBS).sort();
const ALL_PATHS=[...SOURCE_PATHS,WORKFLOW,...GOVERNANCE_PATHS].sort();
const PREFIX=
  "import {runB4003AuthenticatedUatSuccessorGuard} from './gravicentra-b4-003-authenticated-uat-successor.mjs';\n"+
  'if (runB4003AuthenticatedUatSuccessorGuard()) process.exit(0);\n\n';
const fail=code=>{throw Error('B4_003_AUTH_UAT_GUARD_'+code);};
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

export const authenticatedUatGuardSpec=Object.freeze({
  base:BASE,source:SOURCE,preview:PREVIEW,key:KEY,control:CONTROL,receipt:RECEIPT,
  guard:GUARD,validator:SELF,test:TEST,workflow:WORKFLOW,
  sourceBlobs:Object.freeze(SOURCE_BLOBS),workflowBlob:WORKFLOW_BLOB,
  sourcePaths:Object.freeze(SOURCE_PATHS),governancePaths:Object.freeze(GOVERNANCE_PATHS),
  allPaths:Object.freeze(ALL_PATHS),frozen:Object.freeze(FROZEN),prefix:PREFIX
});

// Pure model checks are negative-tested independently from Git and Firebase.
export function checkAuthenticatedUatReadModel(before,current,receipt,pointer){
  need(Object.keys(before).length===429&&Object.keys(current).length===430,
    'CONTROL_KEY_CARDINALITY');
  need(Object.keys(before).every(k=>same(before[k],current[k])),
    'HISTORICAL_CONTROL_MUTATED');
  need(same(Object.keys(current).filter(k=>!(k in before)),[KEY]),
    'UNAUTHORIZED_CONTROL_ADDITION');
  need(same(current[KEY],pointer)&&pointer?.schema==='GRAVICENTRA_I65_B4003_AUTHENTICATED_UAT_POINTER_V1'&&
    pointer.gate==='I6.5/B4-003'&&pointer.status==='UAT_THREE_OF_THREE_PASS_RELEASE_HOLD'&&
    pointer.recordType==='ADDITIVE_VERIFIED_SOURCE_AND_ISOLATED_LAB_PREVIEW_NO_LIVE_AUTHORITY'&&
    pointer.canonicalParentHead===BASE&&pointer.uatSourceCommit===SOURCE&&
    pointer.previewWorkflowHead===PREVIEW&&pointer.receiptPath===RECEIPT&&
    pointer.verifiedSourceRegressions===3&&pointer.verifiedAutomatedTests===5&&
    pointer.previewRunId===41257740341&&pointer.isolatedLabPreviewPublished===true&&
    pointer.authenticatedUatThreeOfThreePass===true&&
    pointer.independentAdvisorUidUatPass===false&&pointer.advisorRecordsClassified===0&&
    pointer.preliminaryFreelancersNotWritten===true&&pointer.firestoreRulesP0Closed===false&&
    pointer.restoreDrillAccepted===false&&pointer.businessDataWrites===0&&
    pointer.sharedRulesAuthIamMutation===false&&pointer.liveHostingDeployed===false&&
    pointer.liveFunctionsDeployed===false&&pointer.productionAuthorized===false&&
    pointer.b4003Closed===false&&pointer.formalI6Percent===50&&
    pointer.priorityP0Closed===1&&pointer.priorityP0Total===6&&
    pointer.currentGlobalImplementationPercent===null,'POINTER_SCOPE_OR_RELEASING');
  need(receipt?.schema==='GRAVICENTRA_I65_B4003_AUTHENTICATED_UAT_GOVERNANCE_SUCCESSOR_V1'&&
    receipt.status==='THREE_OF_THREE_AUTHENTICATED_UAT_PASS_PRODUCTION_NO_GO'&&
    receipt.recordType==='ADDITIVE_RELEASE_HOLD_WITH_REPRODUCIBLE_UAT_SOURCE'&&
    receipt.repository==='paulaosoriof86/orbit360-core'&&
    receipt.canonicalBranch==='recovery/fase-a-clean-20260831'&&
    receipt.canonicalParentHead===BASE&&receipt.verifiedSourceCommit===SOURCE&&
    receipt.verifiedPreviewWorkflowHead===PREVIEW&&
    same(receipt.sourceDeltaPaths,SOURCE_PATHS)&&same(receipt.sourceBlobs,SOURCE_BLOBS)&&
    receipt.isolatedPreview?.workflowPath===WORKFLOW&&
    receipt.isolatedPreview.workflowBlob===WORKFLOW_BLOB&&
    receipt.isolatedPreview.workflowCommitHead===PREVIEW&&
    receipt.isolatedPreview.runId===41257740341&&
    receipt.isolatedPreview.runConclusion==='success'&&
    receipt.isolatedPreview.hostingOnly===true&&
    receipt.isolatedPreview.sourceBytesMatchReadback===true&&
    receipt.isolatedPreview.liveOriginsBeforeAfterUnchanged===true&&
    receipt.isolatedPreview.ttlDays===7&&
    receipt.isolatedPreview.url.startsWith('https://ays-orbit-360-lab--')&&
    receipt.authenticatedUat?.passed===3&&receipt.authenticatedUat.total===3&&
    receipt.authenticatedUat.verifiedScenarios.length===3&&
    new Set(receipt.authenticatedUat.verifiedScenarios).size===3&&
    receipt.authenticatedUat.independentCarlosSamuelUidProof===false&&
    receipt.authenticatedUat.issue===154&&receipt.authenticatedUat.issueCommentId===6551126535&&
    receipt.automation?.nodeTestFile===SOURCE_PATHS.find(p=>p.startsWith('tests/'))&&
    receipt.automation.passing===5&&receipt.automation.total===5&&
    receipt.automation.writeScope==='SYNTHETIC_LOCAL_ONLY'&&
    receipt.frozenGovernance?.controlPlaneBeforeBlob==='9962b3bfee0099470107b23c37f0245a672806f7'&&
    receipt.frozenGovernance.guardBeforeBlob==='d329eed6679196d2ec34f75868e6fee663250cd9'&&
    receipt.frozenGovernance.previousControlKeys===429&&
    receipt.frozenGovernance.priorReceiptsRewritten===false,'RECEIPT_EVIDENCE_INVALID');
  const b=receipt.releaseBoundary;
  need(b&&b.formalI6Percent===50&&b.priorityP0Closed===1&&b.priorityP0Total===6&&
    b.globalImplementationPercent===null&&b.advisorClassificationsChanged===0&&
    same(b.freelancersPreliminaryOnly,['Johanna','Nicole','Braulio'])&&
    b.businessDataWrites===0&&b.sharedRulesAuthIamChanged===false&&
    b.functionsDeployed===false&&b.liveHostingDeployed===false&&
    b.securityRulesP0Closed===false&&b.independentUidUatPassed===false&&
    b.restoreDrillAccepted===false&&b.b4003Closed===false&&
    b.productionAuthorized===false,'RELEASE_HOLD_REMOVED');
  return {governance:'PASS',uat:'3/3',automated:'5/5',formalI6Percent:50,
    p0Closed:'1/6',productionAuthorized:false,advisorRecordsChanged:0};
}

function verifyHistoricalCanonicalGuard(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gi-auth-uat-base-'));
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

export function runB4003AuthenticatedUatSuccessorGuard(){
  const current=json(CONTROL),pointer=current[KEY];
  if(!pointer)return false;
  const mode=(process.argv.find(x=>x.startsWith('--mode='))||'--mode=governance').slice(7);
  need(['governance','governance:1','i6'].includes(mode),'MODE_DENIED');
  const head=git('rev-parse','HEAD');
  need(git('rev-parse',SOURCE+'^')===BASE,'SOURCE_PARENT_CHANGED');
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
  need(blob(BASE,CONTROL)==='9962b3bfee0099470107b23c37f0245a672806f7'&&
    blob(BASE,GUARD)==='d329eed6679196d2ec34f75868e6fee663250cd9',
    'CANONICAL_BASE_CHANGED');
  for(const file of FROZEN){
    need(blob(BASE,file)===blob(SOURCE,file)&&blob(BASE,file)===blob(head,file)&&
      blob(BASE,file)===hash(file),'HISTORICAL_FROZEN_BYTES_CHANGED:'+file);
  }
  for(const file of GOVERNANCE_PATHS){
    need(blob(head,file)===hash(file),'UNCOMMITTED_GOVERNANCE_DRIFT:'+file);
    need(!git('ls-tree','--name-only',PREVIEW,file)||file===CONTROL||file===GUARD,
      'EXPECTED_ADDITIVE_FILE_MISSING:'+file);
  }
  const before=JSON.parse(show(BASE,CONTROL));
  const receipt=json(RECEIPT);
  const result=checkAuthenticatedUatReadModel(before,current,receipt,pointer);
  need(!git('ls-files','--others','--exclude-standard'),'UNTRACKED_SOURCE');
  verifyHistoricalCanonicalGuard();
  execFileSync(process.execPath,['--test',...SOURCE_PATHS.filter(p=>p.endsWith('.test.cjs'))],
    {stdio:'pipe',maxBuffer:24*1024*1024});
  execFileSync(process.execPath,['--test','tests/goal-participation.test.cjs',
    'tests/goal-participation-modal.test.cjs','tests/goal-participation-preview-boundary.test.cjs',
    'tests/goal-participation-isolated-routing.test.cjs',
    'tests/goal-participation-uat-regressions.test.cjs'],
    {stdio:'pipe',maxBuffer:24*1024*1024});
  execFileSync(process.execPath,['--test',TEST],{stdio:'pipe',maxBuffer:16*1024*1024});
  console.log('B4_003_AUTHENTICATED_UAT_GOVERNANCE='+JSON.stringify(result));
  console.log('B4_003_SECURITY_AND_RELEASE=HOLD');
  console.log('GRAVICENTRA_I6_CONTROL_PLANE_GUARD=PASS');
  console.log('PRODUCT_SOURCE_DRIFT=false');
  return true;
}
