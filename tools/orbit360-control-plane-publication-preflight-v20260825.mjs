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
const A=p=>path.join(ROOT,p);
const readJson=p=>JSON.parse(fs.readFileSync(A(p),'utf8').replace(/^\uFEFF/,''));
const run=(args,opts={})=>execFileSync('git',args,{cwd:ROOT,encoding:'utf8',maxBuffer:16*1024*1024,...opts});
const fail=(code,detail='')=>{const out={ok:false,status:'CONTROL_PLANE_PUBLICATION_PREFLIGHT_FAIL',classification:'PIPELINE_MECHANISM_FAILURE',code,detail:String(detail||'').slice(0,1200),runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};process.stderr.write(JSON.stringify(out,null,2)+'\n');process.exit(41);};
const zlist=args=>String(run(args)).split('\0').map(x=>x.trim()).filter(Boolean);
const isEvidence=p=>p===EVIDENCE_DIR||p.startsWith(`${EVIDENCE_DIR}/`);

try{
  for(const p of [LEDGER,REGISTRY])if(!fs.existsSync(A(p)))fail('PUBLICATION_PREFLIGHT_DEPENDENCY_MISSING',p);
  const ledger=readJson(LEDGER),registry=readJson(REGISTRY);
  const allChanged=[...new Set([...zlist(['diff','--name-only','-z']),...zlist(['diff','--cached','--name-only','-z']),...zlist(['ls-files','--others','--exclude-standard','-z'])])].sort();
  if(!allChanged.length){process.stderr.write(JSON.stringify({ok:true,status:'CONTROL_PLANE_PUBLICATION_PREFLIGHT_PASS_NO_CHANGES',classification:'PASS',changedCount:0,remoteCASChecked:false,pushDryRunChecked:false},null,2)+'\n');process.exit(0);}

  const selftestMode=Boolean(process.env.ORBIT360_SELFTEST_EXPECTED_LEDGER);
  const closeState=ledger.activeState?.status==='CONTROL_PLANE_DEFINITIVE_CAUSAL_PASS'&&ledger.activeState?.phase==='CONTROL_PLANE_DEFINITIVE_CAUSAL_PASS_AWAITING_F2_AUTHORIZATION';
  const publicationAllowed=new Set([registry.sourceOfTruth,...(Array.isArray(registry.projectionTargets)?registry.projectionTargets:[])]);
  let changed=allChanged;
  let ignoredSelftestEvidence=[];
  if(closeState){
    if(selftestMode){
      const unexpected=allChanged.filter(p=>!publicationAllowed.has(p)&&!isEvidence(p));
      if(unexpected.length)fail('SELFTEST_PUBLICATION_NON_EVIDENCE_RESIDUE',unexpected.join(','));
      ignoredSelftestEvidence=allChanged.filter(p=>!publicationAllowed.has(p)&&isEvidence(p));
      changed=allChanged.filter(p=>publicationAllowed.has(p));
      if(!changed.includes(registry.sourceOfTruth))fail('SELFTEST_PUBLICATION_LEDGER_NOT_CHANGED',allChanged.join(','));
    }else{
      const offenders=allChanged.filter(p=>!publicationAllowed.has(p));
      if(offenders.length)fail('CONTROL_PLANE_CLOSE_PUBLICATION_SURFACE',offenders.join(','));
    }
  }
  if(!changed.length)fail('PUBLICATION_PREFLIGHT_EMPTY_PUBLICATION_SURFACE',allChanged.join(','));

  const tempDir=fs.mkdtempSync(path.join(os.tmpdir(),'orbit360-publication-preflight-'));
  const indexFile=path.join(tempDir,'index');
  const env={...process.env,GIT_INDEX_FILE:indexFile,GIT_AUTHOR_NAME:'orbit360-publication-preflight',GIT_AUTHOR_EMAIL:'orbit360-publication-preflight@users.noreply.github.com',GIT_COMMITTER_NAME:'orbit360-publication-preflight',GIT_COMMITTER_EMAIL:'orbit360-publication-preflight@users.noreply.github.com'};
  let tree='',commit='',diffCheckPass=false,commitTreePass=false,remoteCASPass=false,pushDryRunPass=false;
  try{
    run(['read-tree','HEAD'],{env});
    for(const p of changed)run(['add','-A','--',p],{env});
    try{run(['diff','--cached','--check'],{env});diffCheckPass=true;}catch(error){fail('PUBLICATION_PREFLIGHT_DIFF_CHECK',String(error?.stdout||error?.stderr||error?.message||error));}
    try{tree=run(['write-tree'],{env}).trim();commit=run(['commit-tree',tree,'-p',run(['rev-parse','HEAD']).trim()],{env,input:'orbit360 publication preflight\n'}).trim();commitTreePass=/^[a-f0-9]{40}$/.test(commit);}catch(error){fail('PUBLICATION_PREFLIGHT_COMMIT_TREE',String(error?.stdout||error?.stderr||error?.message||error));}
    if(!commitTreePass)fail('PUBLICATION_PREFLIGHT_COMMIT_TREE_INVALID',commit);

    const canonicalRunner=process.env.GITHUB_ACTIONS==='true'&&!selftestMode&&String(process.env.GITHUB_REPOSITORY||'').trim()&&String(process.env.GH_TOKEN||'').trim();
    if(canonicalRunner){
      const branch=String(ledger.branch||'').trim(),repo=String(process.env.GITHUB_REPOSITORY||'').trim(),token=String(process.env.GH_TOKEN||'').trim(),head=run(['rev-parse','HEAD']).trim();
      if(!branch)fail('PUBLICATION_PREFLIGHT_BRANCH_MISSING');
      try{run(['fetch','--no-tags','origin',branch]);const remote=run(['rev-parse','FETCH_HEAD']).trim();if(remote!==head)fail('PUBLICATION_PREFLIGHT_REMOTE_CAS_MISMATCH',`${remote}:${head}`);remoteCASPass=true;}catch(error){if(String(error?.message||'').includes('PUBLICATION_PREFLIGHT'))throw error;fail('PUBLICATION_PREFLIGHT_REMOTE_CAS',String(error?.stdout||error?.stderr||error?.message||error));}
      const url=`https://x-access-token:${token}@github.com/${repo}.git`;
      try{run(['push','--dry-run',url,`${commit}:refs/heads/${branch}`],{stdio:['ignore','pipe','pipe']});pushDryRunPass=true;}catch(error){fail('PUBLICATION_PREFLIGHT_PUSH_DRY_RUN',String(error?.stdout||error?.stderr||error?.message||error).replace(token,'[redacted]'));}
    }
    const result={ok:true,status:'CONTROL_PLANE_PUBLICATION_PREFLIGHT_PASS',classification:'PASS',selftestMode,closeState,allChangedCount:allChanged.length,changedCount:changed.length,changed,ignoredSelftestEvidence,diffCheckPass,commitTreePass,remoteCASPass,pushDryRunPass,canonicalRunner,ledgerRevision:ledger.revision,packageRevision:ledger.productionReopeningPackage?.revision,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
    process.stderr.write(JSON.stringify(result,null,2)+'\n');
  }finally{try{fs.rmSync(tempDir,{recursive:true,force:true});}catch{}}
}catch(error){if(Number(error?.code)===41||Number(error?.status)===41)throw error;fail('PUBLICATION_PREFLIGHT_UNEXPECTED',String(error?.stack||error?.message||error));}
