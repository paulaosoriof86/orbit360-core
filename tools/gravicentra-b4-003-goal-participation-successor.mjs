// Exact additive source successor; historical B4-003 evidence remains frozen.
// This guard authorizes source lineage only. It never deploys Preview or LIVE.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const ROOT='artifacts/orbit360-recovery/release-control/';
const BASE='f1ef4db50401763096a81429fabc116963dabd2f';
const KEY='b4003GoalParticipationSourceSuccessor20261031';
const CONTROL=ROOT+'CONTROL_PLANE.json';
const SOURCE=ROOT+'I6_5_B4_003_GOAL_PARTICIPATION_SOURCE_SUCCESSOR_20261031.json';
const RECEIPT=ROOT+'I6_5_B4_003_GOAL_PARTICIPATION_GUARD_SUCCESSOR_20261031.json';
const GUARD='tools/gravicentra-i6-control-plane-guard-v1.mjs';
const SELF='tools/gravicentra-b4-003-goal-participation-successor.mjs';
const TEST='tools/gravicentra-b4-003-goal-participation-successor.test.mjs';
const SCOPE_TEST='tools/gravicentra-b4-003-scoped-boundary.test.cjs';
const FROZEN=[
  ROOT+'I6_FINDINGS_LEDGER_20260924.json',
  ROOT+'I6_5_OPEN_FINDINGS_CARRY_FORWARD_REGISTER_20261003.json',
  ROOT+'I6_CANONICAL_ACCUMULATIVE_COMPOSITION_LOCK_20260924.json',
  ROOT+'I6_PENDING_CLOSURE_MASTER_PLAN_LOCK_20261004.json'
];
const NEW_PREFIX=
  "import {runGoalParticipationSuccessorGuard} from './gravicentra-b4-003-goal-participation-successor.mjs';\n"+
  "if (runGoalParticipationSuccessorGuard()) process.exit(0);\n\n";

const fail=code=>{throw Error('B4_003_GOAL_PARTICIPATION_'+code);};
const need=(ok,code)=>{if(!ok)fail(code);};
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:64*1024*1024}).trim();
const show=(ref,file)=>execFileSync('git',['show',ref+':'+file],{encoding:'utf8',maxBuffer:64*1024*1024});
const blob=(ref,file)=>git('rev-parse',ref+':'+file);
const hash=file=>git('hash-object',file);
const json=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const sorted=v=>[...v].sort();
const changed=(a,b)=>git('diff','--name-only',a,b).split(/\r?\n/).filter(Boolean).sort();
const stable=v=>v===null||typeof v!=='object'?v:Array.isArray(v)?v.map(stable):
  Object.fromEntries(Object.keys(v).sort().map(key=>[key,stable(v[key])]));
const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
const isSha=v=>/^[0-9a-f]{40}$/.test(String(v||''));

export const goalParticipationGuardSpec=Object.freeze({
  base:BASE,key:KEY,control:CONTROL,source:SOURCE,receipt:RECEIPT,
  guard:GUARD,validator:SELF,test:TEST,scopeTest:SCOPE_TEST,
  frozen:Object.freeze(FROZEN),prefix:NEW_PREFIX
});

export function checkGoalParticipationReadModel(base,current,receipt,source,pointer){
  need(Object.keys(base).length===428&&Object.keys(current).length===429,'CONTROL_KEY_COUNTS');
  need(Object.keys(base).every(k=>same(base[k],current[k])),'HISTORICAL_CONTROL_MUTATED');
  need(same(Object.keys(current).filter(k=>!(k in base)),[KEY]),'UNAUTHORIZED_CONTROL_KEYS');
  need(pointer.schema==='GRAVICENTRA_I65_B4003_GOAL_PARTICIPATION_POINTER_V1'&&
    pointer.status==='SOURCE_QA_GUARDED_PREVIEW_UAT_PENDING'&&
    pointer.recordType==='ADDITIVE_SOURCE_ONLY_NO_RELEASE_AUTHORITY'&&
    pointer.gate==='I6.5/B4-003'&&pointer.parentHead===BASE&&
    pointer.sourceReceiptPath===SOURCE&&pointer.guardReceiptPath===RECEIPT&&
    isSha(pointer.sourceCommit)&&isSha(pointer.sourceReceiptBlob)&&
    isSha(pointer.guardReceiptBlob),'POINTER_INVALID');
  need(source.schema==='GRAVICENTRA_I65_B4003_GOAL_PARTICIPATION_SOURCE_SUCCESSOR_V1'&&
    source.parentHead===BASE&&source.status==='SOURCE_QA_PASS_PREVIEW_NOT_DEPLOYED_B4_003_HOLD'&&
    source.boundaries?.dataWrites===0&&source.boundaries?.previewDeploy===false&&
    source.boundaries?.prodHostingDeploy===false&&source.boundaries?.prodFunctionsDeploy===false&&
    source.boundaries?.authIamRulesMutation===false&&
    source.boundaries?.classifiedAdvisorRecordsChanged===false&&
    source.boundaries?.b4003Closed===false&&source.boundaries?.productionAuthorized===false&&
    source.decision?.sevenAdvisorProfilesAutoClassified===0&&
    source.decision?.preliminaryNamesWrittenToRecords===false&&
    source.previewIsolation?.realAdvisorMutationPreviewAllowed===false,
    'SOURCE_CLAIMS_OR_BOUNDARIES');
  need(receipt.schema==='GRAVICENTRA_I65_B4003_GOAL_PARTICIPATION_GUARD_SUCCESSOR_V1'&&
    receipt.status==='SOURCE_LINEAGE_PROTECTED_RELEASE_HOLD'&&
    receipt.parentHead===BASE&&receipt.sourceCommit===pointer.sourceCommit&&
    receipt.sourceReceiptBlob===pointer.sourceReceiptBlob&&
    receipt.baseControlPlaneBlob===blob(BASE,CONTROL)&&
    receipt.oldGuardBlob===blob(BASE,GUARD)&&
    receipt.noProductionAuthorization===true&&
    receipt.noPreviewDeployment===true&&receipt.currentFormalI6Percent===50&&
    receipt.currentClosedP0===1&&receipt.currentTotalP0===6,
    'RECEIPT_INVALID');
  need(pointer.productionAuthorized===false&&pointer.previewDeployed===false&&
    pointer.authIamRulesChanged===false&&pointer.businessDataWrites===0&&
    pointer.advisorRecordsClassified===0&&pointer.b4003Closed===false&&
    pointer.formalI6Percent===50&&pointer.priorityP0Closed===1&&
    pointer.currentGlobalImplementationPercent===null,'POINTER_SCOPE_INVALID');
  return {formalI6Percent:50,priorityP0Closed:1,priorityP0Total:6,
    advisorRecordsChanged:0,previewDeployed:false,productionAuthorized:false};
}

function verifyFrozenBase(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gi-goals-guard-base-'));
  let attached=false;
  try{
    execFileSync('git',['worktree','add','--detach',dir,BASE],{stdio:'pipe'});
    attached=true;
    const out=execFileSync(process.execPath,[GUARD,'--mode=i6'],
      {cwd:dir,encoding:'utf8',maxBuffer:24*1024*1024});
    need(out.includes('GRAVICENTRA_I6_CONTROL_PLANE_GUARD=PASS')&&
      out.includes('PRODUCT_SOURCE_DRIFT=false'),'HISTORICAL_GUARD_NOT_PASS');
  }finally{
    if(attached)execFileSync('git',['worktree','remove','--force',dir],{stdio:'pipe'});
    else fs.rmSync(dir,{recursive:true,force:true});
  }
}
export function runGoalParticipationSuccessorGuard(){
  const current=json(CONTROL),pointer=current[KEY];
  if(!pointer)return false;
  const mode=(process.argv.find(x=>x.startsWith('--mode='))||'--mode=governance').slice(7);
  need(['governance','governance:1','i6'].includes(mode),'MODE_DENIED');
  const head=git('rev-parse','HEAD'),sourceCommit=git('rev-parse','HEAD^');
  need(git('rev-parse','HEAD^^')===BASE&&sourceCommit===pointer.sourceCommit,
    'EXACT_SUCCESSOR_LINEAGE_REQUIRED');
  const source=json(SOURCE),receipt=json(RECEIPT),before=JSON.parse(show(BASE,CONTROL));
  need(hash(SOURCE)===pointer.sourceReceiptBlob&&
    blob(sourceCommit,SOURCE)===pointer.sourceReceiptBlob&&
    hash(RECEIPT)===pointer.guardReceiptBlob,'RECEIPT_PHYSICAL_BYTES');
  const sourcePaths=sorted([...Object.keys(source.sourceFiles||{}),SOURCE]);
  const guardPaths=sorted([CONTROL,RECEIPT,GUARD,SELF,TEST,SCOPE_TEST]);
  need(same(changed(BASE,sourceCommit),sourcePaths),'SOURCE_DELTA_MISMATCH');
  need(same(changed(sourceCommit,head),guardPaths),'GUARD_DELTA_MISMATCH');
  need(same(receipt.sourcePaths,sourcePaths)&&same(receipt.guardPaths,guardPaths),
    'RECEIPT_PATHS_MISMATCH');
  need(fs.readFileSync(GUARD,'utf8')===NEW_PREFIX+show(BASE,GUARD)&&
    blob(sourceCommit,GUARD)===blob(BASE,GUARD),'FROZEN_GUARD_NOT_EXTENDED');
  need(blob(sourceCommit,CONTROL)===blob(BASE,CONTROL),'EARLY_CONTROL_MUTATION');
  for(const p of FROZEN){
    need(blob(BASE,p)===blob(sourceCommit,p)&&
      blob(BASE,p)===blob(head,p)&&
      hash(p)===blob(BASE,p),'FROZEN_PROOF_CHANGED:'+p);
  }
  for(const [p,entry] of Object.entries(source.sourceFiles||{})){
    need((entry.beforeBlob===null||blob(BASE,p)===entry.beforeBlob)&&
      blob(sourceCommit,p)===entry.afterBlob&&
      blob(head,p)===entry.afterBlob&&hash(p)===entry.afterBlob,
      'PRODUCT_SOURCE_MISMATCH:'+p);
    if(entry.beforeBlob===null)
      need(!git('ls-tree','--name-only',BASE,p),'NEW_FILE_EXPECTED:'+p);
  }
  need(same(receipt.frozenBlobs,source.frozenBlobs),'FROZEN_RECEIPT_BINDING');
  need(same(receipt.sourceBlobs,
    Object.fromEntries(Object.entries(source.sourceFiles).map(([p,v])=>[p,v.afterBlob]))),
    'SOURCE_BLOBS_NOT_BOUND');
  const result=checkGoalParticipationReadModel(before,current,receipt,source,pointer);
  need(!git('ls-files','--others','--exclude-standard'),'UNTRACKED_SOURCE');
  verifyFrozenBase();
  const checks=[
    'tests/goal-participation.test.cjs',
    'tests/goal-participation-modal.test.cjs',
    'tests/goal-participation-preview-boundary.test.cjs',
    'tests/goal-participation-isolated-routing.test.cjs',
    'tools/gravicentra-b4-003-role-first-paint-and-team-regression.test.cjs',
    'tools/gravicentra-b4-003-inicio-personal-recaudo.test.cjs',
    'tools/gravicentra-b4-003-inicio-role-country-team.test.cjs',
    SCOPE_TEST
  ];
  for(const file of checks){
    execFileSync(process.execPath,[file],{stdio:'pipe',maxBuffer:32*1024*1024});
  }
  execFileSync(process.execPath,['--test',TEST],{stdio:'pipe',maxBuffer:16*1024*1024});
  console.log('B4_003_GOAL_PARTICIPATION_SOURCE_SUCCESSOR='+JSON.stringify(result));
  console.log('GRAVICENTRA_I6_CONTROL_PLANE_GUARD=PASS');
  console.log('PRODUCT_SOURCE_DRIFT=false');
  return true;
}
