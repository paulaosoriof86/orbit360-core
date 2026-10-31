// Additive, bounded successor to the frozen 2026-10-30 insurer operation proof.
// This corrects timestamp snapshot semantics without altering its original
// receipt, any product source, runtime policy, or the previously accepted guard.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const D='artifacts/orbit360-recovery/release-control/';
export const insurerTimestampContract=Object.freeze({
  parent:'dec47b170dce38baf80d3092736963120100ecfe',
  key:'b4003InsurerOperationTimestampReadback20261031',
  control:D+'CONTROL_PLANE.json',
  receipt:D+'I6_5_B4_003_INSURER_OPERATION_TIMESTAMP_READBACK_20261031.json',
  guard:'tools/gravicentra-i6-control-plane-guard-v1.mjs',
  validator:'tools/gravicentra-b4-003-insurer-timestamp-successor.mjs',
  test:'tools/gravicentra-b4-003-insurer-timestamp-successor.test.mjs',
  readback:'tools/gravicentra-b4-003-insurer-reader-postpatch-readback.cjs',
  readbackTest:'tools/gravicentra-b4-003-insurer-reader-postpatch-readback.test.cjs',
  workflow:'.github/workflows/gravicentra-b4-003-cumulative-safe-read-preview-20261029.yml',
  oldReceipt:D+'I6_5_B4_003_INSURER_POST_RESTORATION_READBACK_SUCCESSOR_20261030.json',
  status:'TIMESTAMP_SNAPSHOT_FALSE_HOLD_CORRECTED_READ_ONLY_PREVIEW_PENDING',
  priorFailedRunId:41155578413,
  priorFailedArtifactId:13024808884,
  priorFailedArtifactDigest:'1e1bc58f0ed849bc80e2f79207cbaaabb9cfc3bbf5f9b8b4cb66cfad3499eb9e',
  originalOperation:'projects/ays-orbit-360-lab/locations/us-east1/operations/operation-1793408711390-65f18812df446-eb3d2d80-cd121490',
  workflowMessage:'build(i6.5 B4-003): trigger cumulative safe-read isolated Preview only'
});
const k=insurerTimestampContract;
export const insurerTimestampSourcePaths=[k.control,k.receipt,k.guard,k.validator,k.test,k.readback,k.readbackTest].sort();
export const insurerTimestampGuardPrefix="import {runInsurerTimestampSuccessorGuard} from './gravicentra-b4-003-insurer-timestamp-successor.mjs';\nif (runInsurerTimestampSuccessorGuard()) process.exit(0);\n\n";
const stable=v=>v===null||typeof v!=='object'?v:Array.isArray(v)?v.map(stable):Object.fromEntries(Object.keys(v).sort().map(x=>[x,stable(v[x])]));
const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
const need=(ok,why)=>{if(!ok)throw Error('B4_003_TIMESTAMP_SUCCESSOR_'+why);};
const lines=s=>s.split(/\r?\n/).filter(Boolean);
const sorted=a=>a.slice().sort();
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:64*1024*1024}).trim();
const file=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const hash=f=>git('hash-object',f);
const blob=(ref,f)=>git('rev-parse',ref+':'+f);
const ancestors=(a,b)=>git('merge-base',a,b)===a;
const oldWorkflow=()=>execFileSync('git',['show',k.parent+':'+k.workflow],{encoding:'utf8'});
export function expectedTimestampTransportWorkflow(){
  const previous=oldWorkflow();
  const replaces=[
    ["import {collectInsurerPreviewResumeModel,validateInsurerPreviewResumeModel,insurerResumeContract} from './tools/gravicentra-b4-003-insurer-preview-resume.mjs';",
      "import {insurerResumeContract} from './tools/gravicentra-b4-003-insurer-preview-resume.mjs';\n        import {collectInsurerTimestampSuccessorModel,validateInsurerTimestampSuccessorModel} from './tools/gravicentra-b4-003-insurer-timestamp-successor.mjs';"],
    ["const k=insurerResumeContract,m=collectInsurerPreviewResumeModel();\n        validateInsurerPreviewResumeModel(m);",
      "const k=insurerResumeContract,m=collectInsurerTimestampSuccessorModel();\n        validateInsurerTimestampSuccessorModel(m);"],
    ['node --test tools/gravicentra-b4-003-insurer-preview-resume.test.mjs',
      'node --test tools/gravicentra-b4-003-insurer-timestamp-successor.test.mjs']
  ];
  let result=previous;
  for(const [before,after]of replaces){need(result.includes(before)&&result.indexOf(before)===result.lastIndexOf(before),
    'FROZEN_WORKFLOW_ANCHOR_CHANGED');result=result.replace(before,after);}
  return result;
}

export function collectInsurerTimestampSuccessorModel(){
  const control=file(k.control),receipt=file(k.receipt),head=git('rev-parse','HEAD');
  const parentControl=JSON.parse(git('show',k.parent+':'+k.control));
  const untracked=lines(git('ls-files','--others','--exclude-standard'));
  const delta=sorted([...new Set([...lines(git('diff','--name-only',k.parent)),...untracked])]);
  const sourceCommit=lines(git('log','--all','--format=%H','--',k.receipt)).find(c=>blob(c,k.receipt)===hash(k.receipt))||null;
  const currentBlobs=Object.fromEntries([...new Set([...delta,k.oldReceipt,k.workflow])].map(f=>
    [f,fs.existsSync(f)&&fs.lstatSync(f).isFile()&&!fs.lstatSync(f).isSymbolicLink()?hash(f):'ABSENT']));
  const sourceDelta=sourceCommit?sorted(lines(git('diff','--name-only',k.parent,sourceCommit))):null;
  const transport=sourceCommit&&head!==sourceCommit?{
    head,parent:git('rev-parse','HEAD^'),message:git('show','-s','--format=%s','HEAD'),
    paths:sorted(lines(git('diff','--name-only','HEAD^','HEAD')))
  }:null;
  return {kind:'INSURER_TIMESTAMP_SNAPSHOT_SUCCESSOR',control,receipt,head,parentControl,untracked,delta,sourceCommit,sourceDelta,transport,
    currentBlobs,authorityReceiptPath:k.receipt,authorityReceiptBlobSha:hash(k.receipt),
    guardText:fs.readFileSync(k.guard,'utf8'),frozenGuardText:execFileSync('git',['show',k.parent+':'+k.guard],{encoding:'utf8'}),
    sourceGuard:blob(k.parent,k.guard),oldReceiptBlob:blob(k.parent,k.oldReceipt)};
}

export function validateInsurerTimestampSuccessorModel(m){
  const C=m.control,B=m.parentControl,R=m.receipt,P=C[k.key];
  need(m.kind==='INSURER_TIMESTAMP_SNAPSHOT_SUCCESSOR'&&ancestors(k.parent,m.head),'EXACT_PREDECESSOR_REQUIRED');
  need(Object.keys(B).length===423&&Object.keys(C).length===424&&Object.keys(B).every(x=>same(B[x],C[x]))&&
    same(Object.keys(C).filter(x=>!(x in B)),[k.key]),'FROZEN_CONTROL_FIELDS_CHANGED');
  need(C.repository==='paulaosoriof86/orbit360-core'&&C.branch==='recovery/fase-a-clean-20260831'&&
    P?.schema==='GRAVICENTRA_I65_B4003_INSURER_OPERATION_TIMESTAMP_SUCCESSOR_V1'&&P.status===k.status&&
    P.gate==='I6.5/B4-003'&&P.parentHead===k.parent&&P.receiptPath===k.receipt&&P.receiptBlobSha===m.authorityReceiptBlobSha&&
    same(P.exactSourcePaths,insurerTimestampSourcePaths),'CONTROL_POINTER_INVALID');
  need(P.progress?.formalI6MiniGates?.completed===5&&P.progress.formalI6MiniGates.total===10&&P.progress.formalI6MiniGates.percent===50&&
    P.progress.priorityP0?.closed===1&&P.progress.priorityP0?.open===5&&P.progress.priorityP0?.total===6&&P.progress.priorityP0.percentClosed===16.67&&
    P.progress.priorityP0.percentOpen===83.33&&P.progress.currentOverallImplementationPercent===null&&
    P.progress.historicalForensicPercent===96&&P.progress.historicalForensicIsCurrentReadiness===false&&
    P.progress.currentB4003Closed===false&&P.progress.productionAccepted===false,
    'CURRENT_PROGRESS_DENOMINATORS_INVALID');
  need(R.schema==='GRAVICENTRA_I65_B4003_INSURER_OPERATION_TIMESTAMP_SUCCESSOR_V1'&&R.status===k.status&&R.gate===P.gate&&
    R.parentHead===k.parent&&R.repository===C.repository&&R.branch===C.branch&&
    same(R.exactSourcePaths,insurerTimestampSourcePaths)&&R.priorReadbackReceiptPath===k.oldReceipt&&
    R.priorReadbackReceiptBlobSha===m.oldReceiptBlob&&m.currentBlobs[k.oldReceipt]===m.oldReceiptBlob&&
    R.previousGuardBlobSha===m.sourceGuard&&m.guardText===insurerTimestampGuardPrefix+m.frozenGuardText,
    'FROZEN_GOVERNANCE_NOT_PRESERVED');
  need(R.failureEvidence?.runId===k.priorFailedRunId&&R.failureEvidence.artifactId===k.priorFailedArtifactId&&
    R.failureEvidence.artifactSha256===k.priorFailedArtifactDigest&&R.failureEvidence.failureCode==='OPERATION_RESPONSE_DOES_NOT_BIND_CURRENT'&&
    R.failureEvidence.operationDone===true&&R.failureEvidence.operationResponsePresent===true&&
    R.failureEvidence.operationResponseUpdateTime==='2026-10-31T01:05:12.368285930Z'&&
    R.failureEvidence.currentFunctionUpdateTime==='2026-10-31T01:05:54.833741414Z'&&
    same(R.failureEvidence.differingFields,['updateTime'])&&R.failureEvidence.remoteMutationRequests===0,
    'FAILED_READBACK_CAUSE_UNBOUND');
  need(R.correctedContract?.operationName===k.originalOperation&&
    R.correctedContract.operationResponseRequiresAllStableFunctionFieldsEqual===true&&
    R.correctedContract.updateTimeRequiresValidMonotonicTimestamp===true&&
    R.correctedContract.finalLiveFunctionMustStayByteStableDuringReadback===true&&
    R.correctedContract.exactBackendSourceComparisonsRequired===66&&
    R.correctedContract.immutableHostingFilesReused===218&&
    R.correctedContract.readOnlyMethodsOnly===true,
    'READBACK_CONTRACT_WEAKENED');
  need(['productionPromotion','liveDeployment','authIamRulesChange','businessDataWrites','backendCodeDeployment','configurationPatch',
    'cleanup','findingClosed','b4003Closed','productionAccepted','authenticatedUatAccepted'].every(x=>R.boundaries?.[x]===false),
    'SCOPE_EXPANDED');
  for(const f of [k.guard,k.validator,k.test,k.readback,k.readbackTest]){
    need(R.governanceBlobs?.[f]===m.currentBlobs[f]&&/^[a-f0-9]{40}$/.test(R.governanceBlobs[f]),'SOURCE_BLOB_MISMATCH:'+f);
    if(![k.validator,k.test].includes(f))need(m.currentBlobs[f]!==blob(k.parent,f),'SOURCE_CHANGE_NOT_PRESENT:'+f);
  }
  need(same(m.delta,m.transport?[...insurerTimestampSourcePaths,k.workflow].sort():insurerTimestampSourcePaths),
    'EXACT_ATOMIC_SOURCE_AND_TRANSPORT_DIFF_REQUIRED');
  need(m.untracked.length===(m.sourceCommit?0:3)&&(!m.untracked.length||same(m.untracked,[k.receipt,k.validator,k.test].sort())),
    'UNEXPECTED_UNTRACKED_CONTENT');
  if(m.sourceCommit){
    need(git('rev-parse',m.sourceCommit+'^')===k.parent&&ancestors(m.sourceCommit,m.head)&&
      same(m.sourceDelta,insurerTimestampSourcePaths)&&insurerTimestampSourcePaths.every(f=>m.currentBlobs[f]===blob(m.sourceCommit,f)),
      'EXACT_SOURCE_COMMIT_REQUIRED');
    if(m.transport){
      need(m.transport.parent===m.sourceCommit&&m.transport.message===k.workflowMessage&&
        same(m.transport.paths,[k.workflow])&&fs.readFileSync(k.workflow,'utf8')===expectedTimestampTransportWorkflow(),
        'EXACT_PREVIEW_TRIGGER_COMMIT_REQUIRED');
    }else need(m.head===m.sourceCommit,'SOURCE_HEAD_REQUIRED');
  }else need(m.head===k.parent&&m.currentBlobs[k.workflow]===blob(k.parent,k.workflow),
    'PREPUBLICATION_SOURCE_PARENT_REQUIRED');
  if(!m.transport)need(m.currentBlobs[k.workflow]===blob(k.parent,k.workflow),'PREVIEW_WORKFLOW_NOT_PREMATURELY_CHANGED');
  return {status:'TIMESTAMP_SNAPSHOT_CONTRACT_VALIDATED',historicalControlKeysPreserved:423,
    priorityP0Closed:1,priorityP0Total:6,formalI6Percent:50,globalProductPercent:null,
    productSourceChanged:false,productionAccepted:false};
}

export function runInsurerTimestampSuccessorGuard(){
  const control=file(k.control);
  if(!control[k.key]&&!fs.existsSync(k.receipt))return false;
  need(control[k.key]&&fs.existsSync(k.receipt),'POINTER_OR_RECEIPT_MISSING');
  const mode=(process.argv.find(x=>x.startsWith('--mode='))||'--mode=governance').slice(7);
  need(['governance','governance:1','i6'].includes(mode),'MODE_NOT_AUTHORIZED');
  const m=collectInsurerTimestampSuccessorModel(),result=validateInsurerTimestampSuccessorModel(m);
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'gi-insurer-timestamp-frozen-'));let added=false;
  try{
    execFileSync('git',['worktree','add','--detach',tmp,k.parent],{stdio:'pipe'});added=true;
    const out=execFileSync(process.execPath,[k.guard,'--mode=governance'],{cwd:tmp,encoding:'utf8',maxBuffer:32*1024*1024});
    need(out.includes('GRAVICENTRA_I6_CONTROL_PLANE_GUARD=PASS')&&out.includes('PRODUCT_SOURCE_DRIFT=false'),
      'EXACT_PREDECESSOR_GUARD_FAILED');
  }finally{
    if(added)execFileSync('git',['worktree','remove','--force',tmp],{stdio:'pipe'});
    else fs.rmSync(tmp,{recursive:true,force:true});
  }
  for(const [f,args] of [[k.readbackTest,[k.readbackTest]],[k.test,['--test',k.test]]])
    execFileSync(process.execPath,args,{stdio:'pipe',maxBuffer:16*1024*1024});
  validateInsurerTimestampSuccessorModel(collectInsurerTimestampSuccessorModel());
  console.log('B4_003_INSURER_TIMESTAMP_SUCCESSOR='+JSON.stringify(result));
  console.log('GRAVICENTRA_I6_CONTROL_PLANE_GUARD=PASS');
  console.log('PRODUCT_SOURCE_DRIFT=false');return true;
}
