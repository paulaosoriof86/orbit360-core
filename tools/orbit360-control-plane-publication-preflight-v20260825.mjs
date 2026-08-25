#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const LEDGER='orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json';
const REGISTRY='orbit360-platform/docs/orbit360-continuity-writer-registry-v20260820.json';
const EVIDENCE_DIR='orbit360-platform/runtime-gate-crm-v20260716';
const args=process.argv.slice(2);
const valueFor=flag=>{const i=args.indexOf(flag);return i>=0?String(args[i+1]||''):'';};
const publishTransaction=valueFor('--publish-validated');
const A=p=>path.join(ROOT,p);
const readJson=p=>JSON.parse(fs.readFileSync(A(p),'utf8').replace(/^\uFEFF/,''));
const run=(gitArgs,opts={})=>execFileSync('git',gitArgs,{cwd:ROOT,encoding:'utf8',maxBuffer:16*1024*1024,...opts});
class PublicationError extends Error{constructor(code,detail=''){super(code);this.name='PublicationError';this.publicationCode=code;this.detail=String(detail||'').slice(0,1600);}}
const fail=(code,detail='')=>{throw new PublicationError(code,detail);};
const redact=(value,secret)=>secret?String(value||'').split(secret).join('[redacted]'):String(value||'');
const emit=(obj,stream=process.stdout)=>stream.write(JSON.stringify(obj,null,2)+'\n');
const emitFailure=(error)=>{const code=error instanceof PublicationError?error.publicationCode:'PUBLICATION_TRANSACTION_UNEXPECTED';const detail=error instanceof PublicationError?error.detail:String(error?.stack||error?.message||error).slice(0,1600);emit({ok:false,status:'CONTROL_PLANE_PUBLICATION_TRANSACTION_FAIL',classification:'PIPELINE_MECHANISM_FAILURE',code,detail,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false},process.stderr);process.exitCode=41;};
const zlist=gitArgs=>String(run(gitArgs)).split('\0').map(x=>x.trim()).filter(Boolean);
const changedSurface=()=>[...new Set([...zlist(['diff','--name-only','-z']),...zlist(['diff','--cached','--name-only','-z']),...zlist(['ls-files','--others','--exclude-standard','-z'])])].sort();
const isEvidence=p=>p===EVIDENCE_DIR||p.startsWith(`${EVIDENCE_DIR}/`);
const match=p=>({
  f2Auth:/^\.github\/orbit360-authorizations\/f2-productive-acceptance-runtime-browser-readonly-auth-[^/]+\.json$/.test(p),
  f2Request:/^\.github\/orbit360-requests\/f2-productive-acceptance-runtime-browser-readonly-successor-[^/]+\.json$/.test(p),
  f2Terminal:/^orbit360-platform\/runtime-gate-crm-v20260716\/f2-runtime-terminal-inline-[0-9]+\.json$/.test(p)
});
const publicationClass=String(process.env.ORBIT360_PUBLICATION_CLASS||'GENERIC_PROJECTION').trim();
const txnOut=String(process.env.ORBIT360_PUBLICATION_TRANSACTION_OUT||'').trim();
const message=String(process.env.ORBIT360_PUBLICATION_COMMIT_MESSAGE||'orbit360 validated publication').trim();

function allowedSurface(registry,allChanged,selftestMode,closeState){
  const projections=new Set([registry.sourceOfTruth,...(Array.isArray(registry.projectionTargets)?registry.projectionTargets:[])]);
  let changed=allChanged;
  let ignoredSelftestEvidence=[];
  const classAllows=p=>{
    if(projections.has(p))return true;
    const m=match(p);
    if(publicationClass==='F2_AUTH_ACCEPT')return m.f2Auth||m.f2Request;
    if(publicationClass==='F2_TERMINAL')return m.f2Auth||m.f2Request||m.f2Terminal;
    return false;
  };
  if(selftestMode&&publicationClass==='CONTROL_PLANE_CLOSE'){
    const unexpected=allChanged.filter(p=>!classAllows(p)&&!isEvidence(p));
    if(unexpected.length)fail('SELFTEST_PUBLICATION_NON_EVIDENCE_RESIDUE',unexpected.join(','));
    ignoredSelftestEvidence=allChanged.filter(p=>!classAllows(p)&&isEvidence(p));
    changed=allChanged.filter(classAllows);
    if(!changed.includes(registry.sourceOfTruth))fail('SELFTEST_PUBLICATION_LEDGER_NOT_CHANGED',allChanged.join(','));
  }else if(closeState||publicationClass==='CONTROL_PLANE_CLOSE'||publicationClass==='F2_AUTH_ACCEPT'||publicationClass==='F2_TERMINAL'){
    const offenders=allChanged.filter(p=>!classAllows(p));
    if(offenders.length)fail(`PUBLICATION_SURFACE_${publicationClass}`,offenders.join(','));
  }
  return {changed,ignoredSelftestEvidence};
}

function prepareTransaction(){
  for(const p of [LEDGER,REGISTRY])if(!fs.existsSync(A(p)))fail('PUBLICATION_TRANSACTION_DEPENDENCY_MISSING',p);
  const ledger=readJson(LEDGER),registry=readJson(REGISTRY);
  const allChanged=changedSurface();
  if(!allChanged.length){
    const out={ok:true,status:'CONTROL_PLANE_PUBLICATION_TRANSACTION_PASS_NO_CHANGES',classification:'PASS',mode:'PREPARE',publicationClass,changedCount:0,remoteCASPass:false,pushDryRunPass:false,canonicalRunner:false,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
    if(txnOut)fs.writeFileSync(txnOut,JSON.stringify(out,null,2)+'\n','utf8');
    emit(out);return;
  }
  const selftestMode=Boolean(process.env.ORBIT360_SELFTEST_EXPECTED_LEDGER);
  const closeState=ledger.activeState?.status==='CONTROL_PLANE_DEFINITIVE_CAUSAL_PASS'&&ledger.activeState?.phase==='CONTROL_PLANE_DEFINITIVE_CAUSAL_PASS_AWAITING_F2_AUTHORIZATION';
  const {changed,ignoredSelftestEvidence}=allowedSurface(registry,allChanged,selftestMode,closeState);
  if(!changed.length)fail('PUBLICATION_TRANSACTION_EMPTY_SURFACE',allChanged.join(','));

  const tempDir=fs.mkdtempSync(path.join(os.tmpdir(),'orbit360-publication-transaction-'));
  const indexFile=path.join(tempDir,'index');
  const env={...process.env,GIT_INDEX_FILE:indexFile,GIT_AUTHOR_NAME:'orbit360-publication-owner',GIT_AUTHOR_EMAIL:'orbit360-publication-owner@users.noreply.github.com',GIT_COMMITTER_NAME:'orbit360-publication-owner',GIT_COMMITTER_EMAIL:'orbit360-publication-owner@users.noreply.github.com'};
  try{
    const baseHead=run(['rev-parse','HEAD']).trim();
    run(['read-tree','HEAD'],{env});
    for(const p of changed)run(['add','-A','--',p],{env});
    try{run(['diff','--cached','--check'],{env});}catch(error){fail('PUBLICATION_TRANSACTION_DIFF_CHECK',String(error?.stdout||error?.stderr||error?.message||error));}
    let treeSha='',commitSha='';
    try{
      treeSha=run(['write-tree'],{env}).trim();
      commitSha=run(['commit-tree',treeSha,'-p',baseHead],{env,input:`${message}\n`}).trim();
    }catch(error){fail('PUBLICATION_TRANSACTION_COMMIT_TREE',String(error?.stdout||error?.stderr||error?.message||error));}
    if(!/^[a-f0-9]{40}$/.test(treeSha)||!/^[a-f0-9]{40}$/.test(commitSha))fail('PUBLICATION_TRANSACTION_OBJECT_ID_INVALID',`${treeSha}:${commitSha}`);
    const hasRunner=process.env.GITHUB_ACTIONS==='true';
    const repo=String(process.env.GITHUB_REPOSITORY||'').trim();
    const token=String(process.env.GH_TOKEN||'').trim();
    const canonicalRunner=Boolean(hasRunner&&!selftestMode&&repo&&token);
    let remoteCASPass=false,pushDryRunPass=false;
    const branch=String(ledger.branch||'').trim();
    if(canonicalRunner){
      if(!branch)fail('PUBLICATION_TRANSACTION_BRANCH_MISSING');
      try{
        run(['fetch','--no-tags','origin',branch]);
        const remote=run(['rev-parse','FETCH_HEAD']).trim();
        if(remote!==baseHead)fail('PUBLICATION_TRANSACTION_REMOTE_CAS_MISMATCH',`${remote}:${baseHead}`);
        remoteCASPass=true;
      }catch(error){if(error instanceof PublicationError)throw error;fail('PUBLICATION_TRANSACTION_REMOTE_CAS',String(error?.stdout||error?.stderr||error?.message||error));}
      const url=`https://x-access-token:${token}@github.com/${repo}.git`;
      try{run(['push','--dry-run',url,`${commitSha}:refs/heads/${branch}`],{stdio:['ignore','pipe','pipe']});pushDryRunPass=true;}catch(error){fail('PUBLICATION_TRANSACTION_PUSH_DRY_RUN',redact(error?.stdout||error?.stderr||error?.message||error,token));}
    }
    const out={ok:true,status:'CONTROL_PLANE_PUBLICATION_TRANSACTION_PREPARED',classification:'PASS',mode:'PREPARE',publicationClass,selftestMode,closeState,baseHead,treeSha,commitSha,branch,allChangedCount:allChanged.length,changedCount:changed.length,changed,ignoredSelftestEvidence,diffCheckPass:true,commitTreePass:true,remoteCASPass,pushDryRunPass,canonicalRunner,ledgerRevision:ledger.revision,packageRevision:ledger.productionReopeningPackage?.revision,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
    if(txnOut)fs.writeFileSync(txnOut,JSON.stringify(out,null,2)+'\n','utf8');
    emit(out);
  }finally{try{fs.rmSync(tempDir,{recursive:true,force:true});}catch{}}
}

function publishValidatedTransaction(file){
  if(!file||!fs.existsSync(file))fail('PUBLICATION_TRANSACTION_FILE_REQUIRED',file);
  const txn=JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
  if(txn.ok!==true||txn.status!=='CONTROL_PLANE_PUBLICATION_TRANSACTION_PREPARED'||txn.mode!=='PREPARE')fail('PUBLICATION_TRANSACTION_PREPARE_INVALID',file);
  const token=String(process.env.GH_TOKEN||'').trim(),repo=String(process.env.GITHUB_REPOSITORY||'').trim();
  if(process.env.GITHUB_ACTIONS!=='true'||!token||!repo)fail('PUBLICATION_TRANSACTION_CANONICAL_RUNNER_REQUIRED');
  if(txn.canonicalRunner!==true||txn.remoteCASPass!==true||txn.pushDryRunPass!==true)fail('PUBLICATION_TRANSACTION_REMOTE_PREFLIGHT_INCOMPLETE');
  const ledger=readJson(LEDGER),registry=readJson(REGISTRY);
  if(String(txn.branch)!==String(ledger.branch||''))fail('PUBLICATION_TRANSACTION_BRANCH_DRIFT');
  const head=run(['rev-parse','HEAD']).trim();
  if(head!==txn.baseHead)fail('PUBLICATION_TRANSACTION_LOCAL_BASE_DRIFT',`${head}:${txn.baseHead}`);
  const now=changedSurface();
  const expected=[...(txn.changed||[])].sort();
  if(JSON.stringify(now)!==JSON.stringify(expected))fail('PUBLICATION_TRANSACTION_WORKTREE_DRIFT',JSON.stringify({expected,now}));
  const tempDir=fs.mkdtempSync(path.join(os.tmpdir(),'orbit360-publication-verify-'));
  const indexFile=path.join(tempDir,'index');
  const env={...process.env,GIT_INDEX_FILE:indexFile};
  try{
    run(['read-tree','HEAD'],{env});
    for(const p of expected)run(['add','-A','--',p],{env});
    run(['diff','--cached','--check'],{env});
    const tree=run(['write-tree'],{env}).trim();
    if(tree!==txn.treeSha)fail('PUBLICATION_TRANSACTION_TREE_DRIFT',`${tree}:${txn.treeSha}`);
  }finally{try{fs.rmSync(tempDir,{recursive:true,force:true});}catch{}}
  const commitType=run(['cat-file','-t',txn.commitSha]).trim();
  if(commitType!=='commit')fail('PUBLICATION_TRANSACTION_COMMIT_MISSING',txn.commitSha);
  run(['fetch','--no-tags','origin',txn.branch]);
  const remoteBefore=run(['rev-parse','FETCH_HEAD']).trim();
  if(remoteBefore!==txn.baseHead)fail('PUBLICATION_TRANSACTION_REMOTE_CAS_MISMATCH',`${remoteBefore}:${txn.baseHead}`);
  const url=`https://x-access-token:${token}@github.com/${repo}.git`;
  try{run(['push',url,`${txn.commitSha}:refs/heads/${txn.branch}`],{stdio:['ignore','pipe','pipe']});}catch(error){fail('PUBLICATION_TRANSACTION_PUSH_FAILED',redact(error?.stdout||error?.stderr||error?.message||error,token));}
  run(['fetch','--no-tags','origin',txn.branch]);
  const remoteAfter=run(['rev-parse','FETCH_HEAD']).trim();
  if(remoteAfter!==txn.commitSha)fail('PUBLICATION_TRANSACTION_REMOTE_READBACK_MISMATCH',`${remoteAfter}:${txn.commitSha}`);
  try{run(['reset','--hard',txn.commitSha],{stdio:['ignore','pipe','pipe']});}catch(error){fail('PUBLICATION_TRANSACTION_LOCAL_READBACK_RESET_FAIL',String(error?.stdout||error?.stderr||error?.message||error));}
  if(changedSurface().length)fail('PUBLICATION_TRANSACTION_LOCAL_POSTPUBLISH_DIRTY',changedSurface().join(','));
  emit({ok:true,status:'CONTROL_PLANE_PUBLICATION_TRANSACTION_PUBLISHED',classification:'PASS',mode:'PUBLISH_VALIDATED',publicationClass:txn.publicationClass,baseHead:txn.baseHead,treeSha:txn.treeSha,commitSha:txn.commitSha,branch:txn.branch,remoteCASPass:true,pushDryRunPass:true,pushPass:true,remoteReadbackPass:true,localReadbackPass:true,changedCount:txn.changedCount,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false});
}

try{
  if(publishTransaction)publishValidatedTransaction(publishTransaction);
  else prepareTransaction();
}catch(error){emitFailure(error);}
