// Narrow governance successor for the dated B4-003 progress read model.
// The previously certified strict guard is executed at its immutable commit.
// No product, workflow, release, Auth/Rules or business-data changes are allowed.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const ROOT='artifacts/orbit360-recovery/release-control/';
export const progressSyncContract=Object.freeze({
  baselineHead:'2cea88d4fd2de841c6e5e81a51a85afdd66f84e6',
  publishedProgressHead:'9edd576a07e58217e0b25758b6d13bf111343c7a',
  control:ROOT+'CONTROL_PLANE.json',
  ledger:ROOT+'I6_FINDINGS_LEDGER_20260924.json',
  carry:ROOT+'I6_5_OPEN_FINDINGS_CARRY_FORWARD_REGISTER_20261003.json',
  master:ROOT+'I6_PENDING_CLOSURE_MASTER_PLAN_LOCK_20261004.json',
  composition:ROOT+'I6_CANONICAL_ACCUMULATIVE_COMPOSITION_LOCK_20260924.json',
  dashboard:ROOT+'I6_5_B4_003_CURRENT_OPERATIONAL_DASHBOARD_20261031.md',
  progressReceipt:ROOT+'I6_5_B4_003_CURRENT_OPERATIONAL_TRUTH_SYNC_20261031.json',
  guardReceipt:ROOT+'I6_5_B4_003_OPERATIONAL_TRUTH_GUARD_SUCCESSOR_20261031.json',
  guard:'tools/gravicentra-i6-control-plane-guard-v1.mjs',
  validator:'tools/gravicentra-b4-003-operational-truth-guard-successor.mjs',
  test:'tools/gravicentra-b4-003-operational-truth-guard-successor.test.mjs',
  controlKey:'b4003CurrentOperationalTruth20261031'
});
const k=progressSyncContract;
export const progressSyncDocsPaths=[k.control,k.dashboard,k.progressReceipt].sort();
export const progressSyncGuardPaths=[k.guard,k.validator,k.test,k.guardReceipt].sort();
export const progressSyncGuardPrefix=
  "import {runB4003OperationalTruthGuardSuccessor} from './gravicentra-b4-003-operational-truth-guard-successor.mjs';\n"+
  "if (runB4003OperationalTruthGuardSuccessor()) process.exit(0);\n\n";

const fail=code=>{throw Error('B4_003_OPERATIONAL_TRUTH_'+code);};
const need=(ok,code)=>{if(!ok)fail(code);};
const sha=x=>/^[0-9a-f]{40}$/.test(String(x||''));
const stable=x=>x===null||typeof x!=='object'?x:Array.isArray(x)?x.map(stable):
  Object.fromEntries(Object.keys(x).sort().map(name=>[name,stable(x[name])]));
const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
const lines=s=>String(s||'').split(/\r?\n/).filter(Boolean).sort();
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:64*1024*1024}).trim();
const show=(ref,file)=>execFileSync('git',['show',ref+':'+file],{encoding:'utf8',maxBuffer:64*1024*1024});
const blob=(ref,file)=>git('rev-parse',ref+':'+file);
const hash=file=>git('hash-object',file);
const json=file=>JSON.parse(fs.readFileSync(file,'utf8'));

export function validateProgressSyncData({before,current,ledger,receipt,guardReceipt,
  originalControlBlob,progressReceiptBlob,dashboardBlob,ledgerBlob,carryBlob,
  masterBlob,compositionBlob,guardBlob,validatorBlob,testBlob}) {
  need(Object.keys(before).length===426&&Object.keys(current).length===427,
    'HISTORICAL_CONTROL_KEY_COUNTS_INVALID');
  need(Object.keys(before).every(name=>same(before[name],current[name]))&&
    same(Object.keys(current).filter(name=>!(name in before)),[k.controlKey]),
    'HISTORICAL_CONTROL_MUTATED');
  const p=current[k.controlKey],s=receipt.metrics||{};
  need(p?.schema==='GRAVICENTRA_B4003_CURRENT_OPERATIONAL_TRUTH_POINTER_V1'&&
    p.status==='CURRENT_EVIDENCE_RECONCILED_B4_003_AND_NEW_LIVE_PROMOTION_HOLD'&&
    p.receiptPath===k.progressReceipt&&p.dashboardPath===k.dashboard&&
    p.receiptBlobSha===progressReceiptBlob&&p.dashboardBlobSha===dashboardBlob&&
    p.existingControlPlaneBlobBeforeSuccessor===originalControlBlob&&
    p.sourceHeadBeforeSuccessor===k.baselineHead&&
    p.previouslyExistingControlKeysPreserved===426&&p.newFindingIds===0&&
    p.frozenHistoricalFieldMutation===false&&p.newGateOrReleaseAuthorization===false,
    'CURRENT_POINTER_INVALID');
  need(receipt.schema==='GRAVICENTRA_I65_B4003_CURRENT_OPERATIONAL_TRUTH_SYNC_V1'&&
    receipt.status==='CURRENT_EVIDENCE_SYNCHRONIZED_RELEASE_HOLD_NO_GATE_ADVANCE'&&
    receipt.baseHead===k.baselineHead&&receipt.gate==='I6.5/B4-003'&&
    receipt.dashboard?.path===k.dashboard&&receipt.dashboard.blobSha===dashboardBlob&&
    receipt.binding?.controlPlaneBeforeBlobSha===originalControlBlob&&
    receipt.binding?.ledgerBlobSha===ledgerBlob&&
    receipt.binding?.carryBlobSha===carryBlob&&
    receipt.binding?.frozenMasterPlanBlobSha===masterBlob&&
    receipt.binding?.controlGuardPath===k.guard&&
    receipt.binding?.previousOperationalOverlayKey==='b4003RealProgressReconciliation20261030',
    'PROGRESS_RECEIPT_INVALID');
  need(ledger.findings?.length===295&&
    new Set(ledger.findings.map(f=>f.id)).size===295&&
    ledger.currentSixPriorityP0Closure?.resolved===1&&
    ledger.currentSixPriorityP0Closure?.open===5&&
    ledger.currentSixPriorityP0Closure?.total===6&&
    ledger.currentSixPriorityP0Closure?.b4003Closed===false,
    'FINDING_LEDGER_DRIFT');
  const goals=ledger.findings.find(f=>f.id==='B4-003-P0-20261012-INSTITUTIONAL-GOALS');
  need(goals?.status==='RESOLVED_AUTHENTICATED_RUNTIME_PASS'&&
    receipt.priorityP0?.length===6&&
    receipt.priorityP0.every(f=>ledger.findings.some(row=>row.id===f.id&&row.status===f.ledgerStatus))&&
    receipt.priorityP0.filter(f=>f.fullFindingClosed).length===1,
    'PRIORITY_P0_STATUS_DRIFT');
  need(s.formalI6?.closed===5&&s.formalI6.total===10&&s.formalI6.percent===50&&
    s.priorityP0?.closed===1&&s.priorityP0.total===6&&s.priorityP0.percentClosed===16.67&&
    s.globalImplementation?.percent===null&&
    p.currentInterpretation?.currentGlobalImplementationPercent===null&&
    p.currentInterpretation?.controlledLivePromotionAuthorized===false,
    'PROGRESS_PERCENT_INVENTED_OR_GATE_ADVANCED');
  need(guardReceipt?.schema==='GRAVICENTRA_I65_B4003_OPERATIONAL_TRUTH_GUARD_SUCCESSOR_V1'&&
    guardReceipt.status==='EXACT_GOVERNANCE_SUCCESSOR_PRESERVES_FROZEN_PREDECESSOR'&&
    guardReceipt.baselineHead===k.baselineHead&&
    guardReceipt.progressCommit===k.publishedProgressHead&&
    guardReceipt.progressReceiptBlobSha===progressReceiptBlob&&
    guardReceipt.dashboardBlobSha===dashboardBlob&&
    guardReceipt.originalControlBlobSha===originalControlBlob&&
    guardReceipt.ledgerBlobSha===ledgerBlob&&guardReceipt.carryBlobSha===carryBlob&&
    guardReceipt.masterPlanBlobSha===masterBlob&&
    guardReceipt.compositionBlobSha===compositionBlob&&
    same(guardReceipt.expectedSourcePaths,progressSyncDocsPaths)&&
    same(guardReceipt.expectedGuardPaths,progressSyncGuardPaths)&&
    guardReceipt.governanceBlobs?.[k.guard]===guardBlob&&
    guardReceipt.governanceBlobs?.[k.validator]===validatorBlob&&
    guardReceipt.governanceBlobs?.[k.test]===testBlob,
    'SUCCESSOR_RECEIPT_OR_GOVERNANCE_SHA_INVALID');
  need(guardReceipt.boundaries?.livePromotion===false&&
    guardReceipt.boundaries?.businessDataWrite===false&&
    guardReceipt.boundaries?.authIamRulesChange===false&&
    guardReceipt.boundaries?.findingClosure===false&&
    guardReceipt.boundaries?.frozenArtifactRewrite===false&&
    guardReceipt.boundaries?.productSourceChanged===false&&
    guardReceipt.boundaries?.workflowChanged===false,
    'SCOPE_EXPANDED');
  return {controlKeysPreserved:426,findingsPreserved:295,priorityP0Closed:1,
    formalI6Percent:50,productSourceChanged:false,productionAccepted:false};
}

function validatePhysicalSuccessor() {
  const head=git('rev-parse','HEAD');
  need(head!==k.publishedProgressHead&&
    git('rev-parse','HEAD^')===k.publishedProgressHead&&
    git('rev-parse',k.publishedProgressHead+'^')===k.baselineHead&&
    git('merge-base',k.baselineHead,head)===k.baselineHead,
    'EXACT_TWO_COMMIT_LINEAGE_REQUIRED');
  need(same(lines(git('diff','--name-only',k.baselineHead,k.publishedProgressHead)),progressSyncDocsPaths)&&
    same(lines(git('diff','--name-only',k.publishedProgressHead,'HEAD')),progressSyncGuardPaths),
    'EXACT_DOCS_AND_GOVERNANCE_DELTAS_REQUIRED');
  need(blob(k.baselineHead,k.guard)===blob(k.publishedProgressHead,k.guard)&&
    fs.readFileSync(k.guard,'utf8')===progressSyncGuardPrefix+show(k.publishedProgressHead,k.guard),
    'CERTIFIED_GUARD_REWRITTEN');
  for(const file of [k.ledger,k.carry,k.master,k.composition])
    need(blob(k.baselineHead,file)===blob(k.publishedProgressHead,file)&&
      blob(k.baselineHead,file)===hash(file),'FROZEN_FILE_MUTATED:'+file);
  const before=JSON.parse(show(k.baselineHead,k.control));
  const current=json(k.control),ledger=json(k.ledger),receipt=json(k.progressReceipt);
  const guardReceipt=json(k.guardReceipt);
  const result=validateProgressSyncData({before,current,ledger,receipt,guardReceipt,
    originalControlBlob:blob(k.baselineHead,k.control),
    progressReceiptBlob:hash(k.progressReceipt),dashboardBlob:hash(k.dashboard),
    ledgerBlob:hash(k.ledger),carryBlob:hash(k.carry),masterBlob:hash(k.master),
    compositionBlob:hash(k.composition),guardBlob:hash(k.guard),
    validatorBlob:hash(k.validator),testBlob:hash(k.test)});
  need(blob(k.publishedProgressHead,k.control)===hash(k.control)&&
    blob(k.publishedProgressHead,k.progressReceipt)===hash(k.progressReceipt)&&
    blob(k.publishedProgressHead,k.dashboard)===hash(k.dashboard),
    'PROGRESS_PUBLICATION_BYTES_CHANGED');
  need(!lines(git('ls-files','--others','--exclude-standard')).length,
    'UNTRACKED_CONTENT_FORBIDDEN');
  return result;
}

function verifyFrozenGuard() {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gi-b4-progress-guard-'));
  let attached=false;
  try {
    execFileSync('git',['worktree','add','--detach',dir,k.baselineHead],{stdio:'pipe'});
    attached=true;
    const out=execFileSync(process.execPath,[k.guard,'--mode=governance'],
      {cwd:dir,encoding:'utf8',maxBuffer:24*1024*1024});
    need(out.includes('GRAVICENTRA_I6_CONTROL_PLANE_GUARD=PASS')&&
      out.includes('PRODUCT_SOURCE_DRIFT=false'),'FROZEN_PREDECESSOR_GUARD_FAILED');
  } finally {
    if(attached)execFileSync('git',['worktree','remove','--force',dir],{stdio:'pipe'});
    else fs.rmSync(dir,{recursive:true,force:true});
  }
}

export function runB4003OperationalTruthGuardSuccessor() {
  if(!fs.existsSync(k.progressReceipt)&&!fs.existsSync(k.guardReceipt))return false;
  need(fs.existsSync(k.progressReceipt)&&fs.existsSync(k.guardReceipt),
    'PROGRESS_AND_GUARD_RECEIPTS_REQUIRED');
  const mode=(process.argv.find(x=>x.startsWith('--mode='))||'--mode=governance').slice(7);
  need(['governance','governance:1','i6'].includes(mode),'MODE_NOT_AUTHORIZED');
  const result=validatePhysicalSuccessor();
  verifyFrozenGuard();
  execFileSync(process.execPath,['--test',k.test],{stdio:'pipe',maxBuffer:16*1024*1024});
  validatePhysicalSuccessor();
  console.log('B4_003_OPERATIONAL_TRUTH_READ_MODEL='+JSON.stringify(result));
  console.log('GRAVICENTRA_I6_CONTROL_PLANE_GUARD=PASS');
  console.log('PRODUCT_SOURCE_DRIFT=false');
  return true;
}
