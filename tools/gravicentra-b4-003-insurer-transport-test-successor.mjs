// Additive binding of the Preview workflow to the current source Guard/test.
// Previously frozen source, receipts, readback helper and product stay exact.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const D='artifacts/orbit360-recovery/release-control/';
export const insurerTransportTestContract=Object.freeze({
  parent:'68695847f0eafeb6fec6f48977b09488952f052b',
  control:D+'CONTROL_PLANE.json',
  key:'b4003InsurerPreviewTransportTestRoute20261031',
  receipt:D+'I6_5_B4_003_INSURER_PREVIEW_TRANSPORT_TEST_ROUTE_20261031.json',
  priorReceipt:D+'I6_5_B4_003_INSURER_TRANSPORT_READBACK_BINDING_20261031.json',
  guard:'tools/gravicentra-i6-control-plane-guard-v1.mjs',
  validator:'tools/gravicentra-b4-003-insurer-transport-test-successor.mjs',
  test:'tools/gravicentra-b4-003-insurer-transport-test-successor.test.mjs',
  workflow:'.github/workflows/gravicentra-b4-003-cumulative-safe-read-preview-20261029.yml',
  status:'CURRENT_SUCCESSOR_TEST_ROUTE_FOR_EXACT_READ_ONLY_PREVIEW',
  failedRunId:41221868357,
  workflowMessage:'build(i6.5 B4-003): trigger cumulative safe-read isolated Preview only'
});
const k=insurerTransportTestContract;
export const insurerTransportTestPaths=[k.control,k.receipt,k.guard,k.validator,k.test].sort();
export const insurerTransportTestGuardPrefix="import {runInsurerTransportTestGuard} from './gravicentra-b4-003-insurer-transport-test-successor.mjs';\nif (runInsurerTransportTestGuard()) process.exit(0);\n\n";
const git=(...a)=>execFileSync('git',a,{encoding:'utf8',maxBuffer:64*1024*1024}).trim();
const show=(ref,f)=>execFileSync('git',['show',ref+':'+f],{encoding:'utf8'});
const blob=(ref,f)=>git('rev-parse',ref+':'+f);
const hash=f=>git('hash-object',f);
const json=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const lines=s=>s.split(/\r?\n/).filter(Boolean),sorted=a=>a.slice().sort();
const stable=x=>x===null||typeof x!=='object'?x:Array.isArray(x)?x.map(stable):Object.fromEntries(Object.keys(x).sort().map(p=>[p,stable(x[p])]));
const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
const need=(ok,code)=>{if(!ok)throw Error('B4_003_INSURER_TRANSPORT_TEST_ROUTE_'+code);};

export function expectedInsurerTransportTestWorkflow(){
  let s=show(k.parent,k.workflow);
  const replacements=[
    ["import {collectInsurerTimestampSuccessorModel,validateInsurerTimestampSuccessorModel} from './tools/gravicentra-b4-003-insurer-timestamp-successor.mjs';",
      "import {collectInsurerTransportTestModel,validateInsurerTransportTestModel} from './tools/gravicentra-b4-003-insurer-transport-test-successor.mjs';"],
    ["const k=insurerResumeContract,m=collectInsurerTimestampSuccessorModel();\n        validateInsurerTimestampSuccessorModel(m);",
      "const k=insurerResumeContract,m=collectInsurerTransportTestModel();\n        validateInsurerTransportTestModel(m);"],
    ['node --test tools/gravicentra-b4-003-insurer-timestamp-successor.test.mjs',
      'node --test tools/gravicentra-b4-003-insurer-transport-test-successor.test.mjs']
  ];
  for(const [oldText,newText]of replacements){need(s.includes(oldText)&&s.indexOf(oldText)===s.lastIndexOf(oldText),
    'FROZEN_WORKFLOW_ANCHOR_MISSING');s=s.replace(oldText,newText);}
  return s;
}

export function collectInsurerTransportTestModel(){
  const C=json(k.control),R=json(k.receipt),head=git('rev-parse','HEAD'),B=JSON.parse(show(k.parent,k.control));
  const untracked=lines(git('ls-files','--others','--exclude-standard'));
  const delta=sorted([...new Set([...lines(git('diff','--name-only',k.parent)),...untracked])]);
  const sourceCommit=lines(git('log','--all','--format=%H','--',k.receipt)).find(c=>blob(c,k.receipt)===hash(k.receipt))||null;
  const currentBlobs=Object.fromEntries([...new Set([...delta,k.priorReceipt,k.workflow])].map(f=>
    [f,fs.existsSync(f)&&fs.lstatSync(f).isFile()&&!fs.lstatSync(f).isSymbolicLink()?hash(f):'ABSENT']));
  const sourceDelta=sourceCommit?sorted(lines(git('diff','--name-only',k.parent,sourceCommit))):null;
  const transport=sourceCommit&&head!==sourceCommit?{
    sha:head,parent:git('rev-parse','HEAD^'),message:git('show','-s','--format=%s','HEAD'),
    paths:sorted(lines(git('diff','--name-only','HEAD^','HEAD')))
  }:null;
  return {kind:'INSURER_PREVIEW_EXACT_TEST_ROUTE',control:C,receipt:R,parentControl:B,head,delta,untracked,sourceCommit,sourceDelta,transport,
    currentBlobs,authorityReceiptPath:k.receipt,authorityReceiptBlobSha:hash(k.receipt),
    parentGuardBlob:blob(k.parent,k.guard),guardText:fs.readFileSync(k.guard,'utf8'),parentGuardText:show(k.parent,k.guard),
    priorReceiptBlob:blob(k.parent,k.priorReceipt)};
}

export function validateInsurerTransportTestModel(m){
  const C=m.control,B=m.parentControl,R=m.receipt,P=C[k.key];
  need(m.kind==='INSURER_PREVIEW_EXACT_TEST_ROUTE'&&git('merge-base',k.parent,m.head)===k.parent,'PARENT_ANCESTRY_REQUIRED');
  need(Object.keys(B).length===425&&Object.keys(C).length===426&&Object.keys(B).every(x=>same(B[x],C[x]))&&
    same(Object.keys(C).filter(x=>!(x in B)),[k.key]),'PREVIOUS_CONTROL_NOT_FROZEN');
  need(P?.schema==='GRAVICENTRA_I65_B4003_INSURER_PREVIEW_TEST_ROUTE_POINTER_V1'&&P.status===k.status&&
    P.parentHead===k.parent&&P.gate==='I6.5/B4-003'&&P.receiptPath===k.receipt&&P.receiptBlobSha===m.authorityReceiptBlobSha&&
    same(P.atomicPaths,insurerTransportTestPaths)&&P.newProductionPermission===false&&P.newP0Closure===false,
    'POINTER_INVALID');
  need(R.schema==='GRAVICENTRA_I65_B4003_INSURER_PREVIEW_TEST_ROUTE_V1'&&R.status===k.status&&R.gate===P.gate&&
    R.parentHead===k.parent&&R.repository===C.repository&&R.branch===C.branch&&same(R.atomicPaths,insurerTransportTestPaths)&&
    R.priorReceiptPath===k.priorReceipt&&R.priorReceiptBlobSha===m.priorReceiptBlob&&m.currentBlobs[k.priorReceipt]===m.priorReceiptBlob&&
    R.parentGuardBlobSha===m.parentGuardBlob&&m.guardText===insurerTransportTestGuardPrefix+m.parentGuardText,
    'PREVIOUS_EVIDENCE_BYTES_CHANGED');
  need(R.knownPrevalidationFailure?.runId===k.failedRunId&&R.knownPrevalidationFailure?.code==='EXACT_RESUME_TRANSPORT_REQUIRED'&&
    R.knownPrevalidationFailure?.metadataOnlyFixNotAccepted===true&&R.knownPrevalidationFailure?.insurerUatRan===false&&
    R.correction?.transportShaFieldBound===true&&R.correction?.testRunsAgainstCurrentSuccessor===true&&
    R.correction?.sourceProductAndBackendUnchanged===true&&R.correction?.exactWorkflowReplacements===3,
    'CAUSAL_PREVIEW_ROUTE_NOT_PROVEN');
  need(['liveDeployment','authIamRules','configurationPatch','backendDeployment','realBusinessWrites','cleanup','findingClosure',
    'b4003Closure','productionAcceptance','sourceProofBypass'].every(f=>R.boundaries?.[f]===false),
    'SOURCE_OR_PRODUCTION_SCOPE_EXPANDED');
  for(const f of [k.guard,k.validator,k.test])need(R.governanceBlobs?.[f]===m.currentBlobs[f]&&/^[a-f0-9]{40}$/.test(m.currentBlobs[f]),
    'CURRENT_GOVERNANCE_BLOB_MISMATCH:'+f);
  need(same(m.delta,m.transport?[...insurerTransportTestPaths,k.workflow].sort():insurerTransportTestPaths),
    'EXACT_SOURCE_AND_WORKFLOW_DIFF_REQUIRED');
  need(!m.untracked.length||(m.sourceCommit===null&&same(m.untracked,[k.receipt,k.validator,k.test].sort())),
    'UNTRACKED_CONTENT_FORBIDDEN');
  if(m.sourceCommit){
    need(git('rev-parse',m.sourceCommit+'^')===k.parent&&git('merge-base',m.sourceCommit,m.head)===m.sourceCommit&&
      same(m.sourceDelta,insurerTransportTestPaths)&&insurerTransportTestPaths.every(f=>m.currentBlobs[f]===blob(m.sourceCommit,f)),
      'ATOMIC_SOURCE_COMMIT_INVALID');
    if(m.transport)need(m.transport.parent===m.sourceCommit&&m.transport.message===k.workflowMessage&&
      same(m.transport.paths,[k.workflow])&&fs.readFileSync(k.workflow,'utf8')===expectedInsurerTransportTestWorkflow(),
      'EXACT_SINGLE_WORKFLOW_PREVIEW_REQUIRED');
    else need(m.head===m.sourceCommit,'SOURCE_HEAD_INVALID');
  }else need(m.head===k.parent,'PREPUBLICATION_PARENT_INVALID');
  if(!m.transport)need(m.currentBlobs[k.workflow]===blob(k.parent,k.workflow),'WORKFLOW_CHANGED_BEFORE_TRANSPORT');
  return {status:'CURRENT_SOURCE_TEST_ROUTE_VALIDATED',frozenControlKeys:425,formalI6Percent:50,
    p0Closed:1,p0Total:6,globalReadinessPercent:null,productSourceChanged:false,productionAccepted:false};
}

export function runInsurerTransportTestGuard(){
  const C=json(k.control);if(!C[k.key]&&!fs.existsSync(k.receipt))return false;
  need(C[k.key]&&fs.existsSync(k.receipt),'POINTER_AND_RECEIPT_REQUIRED');
  const mode=(process.argv.find(x=>x.startsWith('--mode='))||'--mode=governance').slice(7);
  need(['governance','governance:1','i6'].includes(mode),'MODE_NOT_AUTHORIZED');
  const m=collectInsurerTransportTestModel(),result=validateInsurerTransportTestModel(m);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gi-insurer-transport-test-parent-'));let added=false;
  try{
    execFileSync('git',['worktree','add','--detach',dir,k.parent],{stdio:'pipe'});added=true;
    const out=execFileSync(process.execPath,[k.guard,'--mode=governance'],{cwd:dir,encoding:'utf8',maxBuffer:24*1024*1024});
    need(out.includes('GRAVICENTRA_I6_CONTROL_PLANE_GUARD=PASS')&&out.includes('PRODUCT_SOURCE_DRIFT=false'),
      'FROZEN_PREDECESSOR_GUARD_FAILED');
  }finally{if(added)execFileSync('git',['worktree','remove','--force',dir],{stdio:'pipe'});else fs.rmSync(dir,{recursive:true,force:true});}
  execFileSync(process.execPath,['--test',k.test],{stdio:'pipe',maxBuffer:16*1024*1024});
  validateInsurerTransportTestModel(collectInsurerTransportTestModel());
  console.log('B4_003_INSURER_TRANSPORT_TEST_ROUTE='+JSON.stringify(result));
  console.log('GRAVICENTRA_I6_CONTROL_PLANE_GUARD=PASS');
  console.log('PRODUCT_SOURCE_DRIFT=false');return true;
}
