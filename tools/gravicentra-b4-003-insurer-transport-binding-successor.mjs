// Exact successor for a Preview workflow-only field-name mismatch.
// No product bytes, historical source attestations or backend authority change.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const D='artifacts/orbit360-recovery/release-control/';
export const insurerTransportBindingContract=Object.freeze({
  parent:'c7bbe49144e27f86b61ac0172ebb25f992afd2d1',
  key:'b4003InsurerTransportReadbackBinding20261031',
  control:D+'CONTROL_PLANE.json',
  receipt:D+'I6_5_B4_003_INSURER_TRANSPORT_READBACK_BINDING_20261031.json',
  priorReceipt:D+'I6_5_B4_003_INSURER_OPERATION_TIMESTAMP_READBACK_20261031.json',
  guard:'tools/gravicentra-i6-control-plane-guard-v1.mjs',
  validator:'tools/gravicentra-b4-003-insurer-transport-binding-successor.mjs',
  test:'tools/gravicentra-b4-003-insurer-transport-binding-successor.test.mjs',
  workflow:'.github/workflows/gravicentra-b4-003-cumulative-safe-read-preview-20261029.yml',
  status:'EXACT_PREVIEW_TRANSPORT_MODEL_FIELD_BINDING_REPAIRED_READ_ONLY_RETRY_PENDING',
  failedRunId:41221868357,
  failedStep:'Require exact recovery successor, immutable product and source Guards PASS',
  failedCode:'EXACT_RESUME_TRANSPORT_REQUIRED',
  transportMessage:'build(i6.5 B4-003): trigger cumulative safe-read isolated Preview only'
});
const k=insurerTransportBindingContract;
export const insurerTransportSourcePaths=[k.control,k.receipt,k.guard,k.validator,k.test].sort();
export const insurerTransportGuardPrefix="import {runInsurerTransportBindingGuard} from './gravicentra-b4-003-insurer-transport-binding-successor.mjs';\nif (runInsurerTransportBindingGuard()) process.exit(0);\n\n";
const sorted=a=>a.slice().sort(),lines=s=>s.split(/\r?\n/).filter(Boolean);
const stable=x=>x===null||typeof x!=='object'?x:Array.isArray(x)?x.map(stable):Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])]));
const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
const need=(ok,why)=>{if(!ok)throw Error('B4_003_INSURER_TRANSPORT_BINDING_'+why);};
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:64*1024*1024}).trim();
const show=(ref,f)=>execFileSync('git',['show',ref+':'+f],{encoding:'utf8'});
const blob=(ref,f)=>git('rev-parse',ref+':'+f);
const hash=f=>git('hash-object',f);
const file=f=>JSON.parse(fs.readFileSync(f,'utf8'));

export function expectedInsurerTransportBindingWorkflow(){
  const original=show(k.parent,k.workflow);
  const replacements=[
    ["import {collectInsurerTimestampSuccessorModel,validateInsurerTimestampSuccessorModel} from './tools/gravicentra-b4-003-insurer-timestamp-successor.mjs';",
      "import {collectInsurerTransportBindingModel,validateInsurerTransportBindingModel} from './tools/gravicentra-b4-003-insurer-transport-binding-successor.mjs';"],
    ["const k=insurerResumeContract,m=collectInsurerTimestampSuccessorModel();\n        validateInsurerTimestampSuccessorModel(m);",
      "const k=insurerResumeContract,m=collectInsurerTransportBindingModel();\n        validateInsurerTransportBindingModel(m);"]
  ];
  let target=original;
  for(const [a,b]of replacements){need(target.includes(a)&&target.indexOf(a)===target.lastIndexOf(a),'FROZEN_WORKFLOW_ANCHOR_CHANGED');target=target.replace(a,b);}
  return target;
}

export function collectInsurerTransportBindingModel(){
  const C=file(k.control),R=file(k.receipt),head=git('rev-parse','HEAD'),B=JSON.parse(show(k.parent,k.control));
  const untracked=lines(git('ls-files','--others','--exclude-standard'));
  const delta=sorted([...new Set([...lines(git('diff','--name-only',k.parent)),...untracked])]);
  const sourceCommit=lines(git('log','--all','--format=%H','--',k.receipt)).find(c=>blob(c,k.receipt)===hash(k.receipt))||null;
  const currentBlobs=Object.fromEntries([...new Set([...delta,k.priorReceipt,k.workflow])].map(f=>
    [f,fs.existsSync(f)&&fs.lstatSync(f).isFile()&&!fs.lstatSync(f).isSymbolicLink()?hash(f):'ABSENT']));
  const sourceDelta=sourceCommit?sorted(lines(git('diff','--name-only',k.parent,sourceCommit))):null;
  const transport=sourceCommit&&head!==sourceCommit?{
    sha:head,parent:git('rev-parse','HEAD^'),message:git('show','-s','--format=%s','HEAD'),paths:sorted(lines(git('diff','--name-only','HEAD^','HEAD')))
  }:null;
  return {kind:'INSURER_EXACT_PREVIEW_TRANSPORT_BINDING',control:C,receipt:R,parentControl:B,head,untracked,delta,sourceCommit,sourceDelta,transport,
    currentBlobs,authorityReceiptPath:k.receipt,authorityReceiptBlobSha:hash(k.receipt),
    guardText:fs.readFileSync(k.guard,'utf8'),parentGuardText:show(k.parent,k.guard),
    parentGuardBlob:blob(k.parent,k.guard),priorReceiptBlob:blob(k.parent,k.priorReceipt)};
}

export function validateInsurerTransportBindingModel(m){
  const C=m.control,B=m.parentControl,R=m.receipt,P=C[k.key];
  need(m.kind==='INSURER_EXACT_PREVIEW_TRANSPORT_BINDING'&&git('merge-base',k.parent,m.head)===k.parent,'PREDECESSOR_ANCESTRY_REQUIRED');
  need(Object.keys(B).length===424&&Object.keys(C).length===425&&Object.keys(B).every(x=>same(B[x],C[x]))&&
    same(Object.keys(C).filter(x=>!(x in B)),[k.key]),'HISTORICAL_CONTROL_CHANGED');
  need(P?.schema==='GRAVICENTRA_I65_B4003_INSURER_TRANSPORT_BINDING_POINTER_V1'&&P.gate==='I6.5/B4-003'&&
    P.status===k.status&&P.parentHead===k.parent&&P.receiptPath===k.receipt&&P.receiptBlobSha===m.authorityReceiptBlobSha&&
    same(P.atomicSourcePaths,insurerTransportSourcePaths)&&P.backendMutationAuthorized===false&&P.livePromotionAuthorized===false&&
    P.previousRealProgressPointerPreserved===true,'TRANSPORT_POINTER_INVALID');
  need(R.schema==='GRAVICENTRA_I65_B4003_INSURER_TRANSPORT_BINDING_SUCCESSOR_V1'&&R.status===k.status&&
    R.gate===P.gate&&R.parentHead===k.parent&&R.repository===C.repository&&R.branch===C.branch&&
    same(R.atomicSourcePaths,insurerTransportSourcePaths)&&R.priorReceiptPath===k.priorReceipt&&
    R.priorReceiptBlobSha===m.priorReceiptBlob&&m.currentBlobs[k.priorReceipt]===m.priorReceiptBlob&&
    R.parentGuardBlobSha===m.parentGuardBlob&&m.guardText===insurerTransportGuardPrefix+m.parentGuardText,
    'FROZEN_PREVIOUS_PROOFS_CHANGED');
  need(R.failedAttempt?.runId===k.failedRunId&&R.failedAttempt.workflowStep===k.failedStep&&
    R.failedAttempt.failureCode===k.failedCode&&R.failedAttempt.remoteMutationRequests===0&&
    R.failedAttempt.sourceHead==='b37c1e3950bc1b10615cb8e3e365955cfacd2ac7'&&
    R.failedAttempt.transportHead===k.parent,'EXACT_FAILED_WORKFLOW_UNBOUND');
  need(R.correction?.previousTransportField==='head'&&R.correction?.requiredTransportField==='sha'&&
    R.correction.sourceFileChangeForbidden===true&&R.correction.workflowChangesRestrictedToTwoBindings===true&&
    R.correction.readOnlyBackendProofPreserved===true&&R.correction.exactSourceBytesRequired===66,
    'REPAIR_SCOPE_INVALID');
  need(['livePromotion','authIamRules','configPatch','backendDeployment','businessWrites','cleanup','findingClosure','b4003Closure','productionAcceptance'].every(f=>R.boundaries?.[f]===false),
    'MUTATION_OR_CLOSURE_AUTHORIZED');
  for(const f of [k.guard,k.validator,k.test])need(R.governanceBlobs?.[f]===m.currentBlobs[f]&&/^[a-f0-9]{40}$/.test(m.currentBlobs[f]),'BLOB_BINDING_MISMATCH:'+f);
  need(m.currentBlobs[k.guard]!==m.parentGuardBlob,'NEW_GUARD_PREFIX_MISSING');
  need(same(m.delta,m.transport?[...insurerTransportSourcePaths,k.workflow].sort():insurerTransportSourcePaths),
    'EXACT_FIVE_FILE_SOURCE_AND_ONE_FILE_TRANSPORT_REQUIRED');
  need(!m.untracked.length||(m.sourceCommit===null&&same(m.untracked,[k.receipt,k.validator,k.test].sort())),
    'UNTRACKED_FILES_NOT_AUTHORIZED');
  if(m.sourceCommit){
    need(git('rev-parse',m.sourceCommit+'^')===k.parent&&git('merge-base',m.sourceCommit,m.head)===m.sourceCommit&&
      same(m.sourceDelta,insurerTransportSourcePaths)&&insurerTransportSourcePaths.every(f=>m.currentBlobs[f]===blob(m.sourceCommit,f)),
      'EXACT_SOURCE_COMMIT_REQUIRED');
    if(m.transport)need(m.transport.parent===m.sourceCommit&&m.transport.message===k.transportMessage&&same(m.transport.paths,[k.workflow])&&
      fs.readFileSync(k.workflow,'utf8')===expectedInsurerTransportBindingWorkflow(),
      'EXACT_READ_ONLY_PREVIEW_TRIGGER_REQUIRED');
    else need(m.head===m.sourceCommit,'SOURCE_HEAD_REQUIRED');
  }else need(m.head===k.parent,'PREPUBLICATION_HEAD_CHANGED');
  if(!m.transport)need(m.currentBlobs[k.workflow]===blob(k.parent,k.workflow),'WORKFLOW_PREMATURELY_MUTATED');
  return {status:'EXACT_PREVIEW_TRANSPORT_FIELD_BINDING_VALIDATED',priorControlKeysPreserved:424,
    formalI6Percent:50,priorityP0Closed:1,priorityP0Total:6,productSourceChanged:false,productionAccepted:false};
}

export function runInsurerTransportBindingGuard(){
  const C=file(k.control);if(!C[k.key]&&!fs.existsSync(k.receipt))return false;
  need(C[k.key]&&fs.existsSync(k.receipt),'POINTER_AND_RECEIPT_REQUIRED');
  const mode=(process.argv.find(x=>x.startsWith('--mode='))||'--mode=governance').slice(7);
  need(['governance','governance:1','i6'].includes(mode),'MODE_NOT_AUTHORIZED');
  const m=collectInsurerTransportBindingModel(),result=validateInsurerTransportBindingModel(m);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gi-insurer-transport-frozen-'));let added=false;
  try{
    execFileSync('git',['worktree','add','--detach',dir,k.parent],{stdio:'pipe'});added=true;
    const out=execFileSync(process.execPath,[k.guard,'--mode=governance'],{cwd:dir,encoding:'utf8',maxBuffer:16*1024*1024});
    need(out.includes('GRAVICENTRA_I6_CONTROL_PLANE_GUARD=PASS')&&out.includes('PRODUCT_SOURCE_DRIFT=false'),
      'FROZEN_PREVIEW_PARENT_GUARD_FAILED');
  }finally{if(added)execFileSync('git',['worktree','remove','--force',dir],{stdio:'pipe'});else fs.rmSync(dir,{recursive:true,force:true});}
  execFileSync(process.execPath,['--test',k.test],{stdio:'pipe',maxBuffer:16*1024*1024});
  validateInsurerTransportBindingModel(collectInsurerTransportBindingModel());
  console.log('B4_003_INSURER_TRANSPORT_BINDING='+JSON.stringify(result));
  console.log('GRAVICENTRA_I6_CONTROL_PLANE_GUARD=PASS');
  console.log('PRODUCT_SOURCE_DRIFT=false');return true;
}
