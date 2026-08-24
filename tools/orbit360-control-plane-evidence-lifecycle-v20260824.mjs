#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const EVIDENCE_DIR='orbit360-platform/runtime-gate-crm-v20260716';
const args=process.argv.slice(2);
const value=flag=>{const i=args.indexOf(flag);return i>=0?args[i+1]:'';};
const phase=value('--phase')||'pre-auth';
const preserve=value('--preserve');
const assertOnly=args.includes('--assert-only');

if(!['pre-auth','pre-terminal'].includes(phase)){
  console.error(JSON.stringify({ok:false,status:'CONTROL_PLANE_EVIDENCE_LIFECYCLE_FAIL',classification:'PIPELINE_MECHANISM_FAILURE',error:`UNSUPPORTED_PHASE:${phase}`},null,2));
  process.exit(41);
}

const runGit=(gitArgs,options={})=>execFileSync('git',gitArgs,{cwd:ROOT,encoding:'utf8',stdio:['ignore','pipe','pipe'],...options}).trim();
const normalize=p=>String(p||'').replace(/\\/g,'/').replace(/^\.\//,'');
const underEvidence=p=>p===EVIDENCE_DIR||p.startsWith(`${EVIDENCE_DIR}/`);
const lines=s=>String(s||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
const currentChanges=()=>{
  const worktree=lines(runGit(['diff','--name-only','--',EVIDENCE_DIR]));
  const staged=lines(runGit(['diff','--cached','--name-only','--',EVIDENCE_DIR]));
  const untracked=lines(runGit(['ls-files','--others','--exclude-standard','--',EVIDENCE_DIR]));
  return [...new Set([...worktree,...staged,...untracked].map(normalize).filter(underEvidence))].sort();
};
const isTracked=p=>{
  try{execFileSync('git',['ls-files','--error-unmatch','--',p],{cwd:ROOT,stdio:'ignore'});return true;}catch{return false;}
};
const removeUntracked=p=>{
  const abs=path.resolve(ROOT,p);
  const evidenceAbs=path.resolve(ROOT,EVIDENCE_DIR)+path.sep;
  if(!(abs+path.sep).startsWith(evidenceAbs)&&!abs.startsWith(evidenceAbs))throw new Error(`PATH_ESCAPE:${p}`);
  fs.rmSync(abs,{recursive:true,force:true});
};

const preservePath=normalize(preserve);
if(preservePath&&(!underEvidence(preservePath)||!/^orbit360-platform\/runtime-gate-crm-v20260716\/f2-runtime-terminal-inline-[0-9]+\.json$/.test(preservePath))){
  console.error(JSON.stringify({ok:false,status:'CONTROL_PLANE_EVIDENCE_LIFECYCLE_FAIL',classification:'PIPELINE_MECHANISM_FAILURE',error:`INVALID_PRESERVE_PATH:${preservePath}`},null,2));
  process.exit(41);
}
if(phase==='pre-terminal'&&!preservePath){
  console.error(JSON.stringify({ok:false,status:'CONTROL_PLANE_EVIDENCE_LIFECYCLE_FAIL',classification:'PIPELINE_MECHANISM_FAILURE',error:'PRE_TERMINAL_PRESERVE_REQUIRED'},null,2));
  process.exit(41);
}

let publicationLineageReset=false;
let publicationLineageRemoteHead=null;
let publicationLineageLocalHead=null;
if(phase==='pre-terminal'&&!assertOnly&&process.env.GITHUB_ACTIONS==='true'&&String(process.env.ORBIT360_BRANCH||'').trim()){
  try{
    publicationLineageLocalHead=runGit(['rev-parse','HEAD']);
    runGit(['fetch','--no-tags','origin',String(process.env.ORBIT360_BRANCH).trim()]);
    publicationLineageRemoteHead=runGit(['rev-parse','FETCH_HEAD']);
    if(publicationLineageLocalHead!==publicationLineageRemoteHead){
      try{execFileSync('git',['merge-base','--is-ancestor',publicationLineageRemoteHead,publicationLineageLocalHead],{cwd:ROOT,stdio:'ignore'});}
      catch{throw new Error(`REMOTE_CANONICAL_DIVERGED:${publicationLineageRemoteHead}:${publicationLineageLocalHead}`);}
      execFileSync('git',['reset','--mixed',publicationLineageRemoteHead],{cwd:ROOT,stdio:'ignore'});
      publicationLineageReset=true;
    }
  }catch(error){
    console.error(JSON.stringify({ok:false,status:'CONTROL_PLANE_EVIDENCE_LIFECYCLE_FAIL',classification:'PIPELINE_MECHANISM_FAILURE',phase,error:`PUBLICATION_LINEAGE_NORMALIZATION_FAILED:${String(error?.message||error).slice(0,300)}`,publicationLineageLocalHead,publicationLineageRemoteHead},null,2));
    process.exit(41);
  }
}

const before=currentChanges();
const cleaned=[];
if(!assertOnly){
  for(const rel of before){
    if(preservePath&&rel===preservePath)continue;
    try{
      if(isTracked(rel)){
        try{execFileSync('git',['restore','--staged','--worktree','--',rel],{cwd:ROOT,stdio:'ignore'});}catch{execFileSync('git',['restore','--worktree','--',rel],{cwd:ROOT,stdio:'ignore'});}
      }else{
        removeUntracked(rel);
      }
      cleaned.push(rel);
    }catch(error){
      console.error(JSON.stringify({ok:false,status:'CONTROL_PLANE_EVIDENCE_LIFECYCLE_FAIL',classification:'PIPELINE_MECHANISM_FAILURE',phase,error:`CLEANUP_FAILED:${rel}:${String(error?.message||error).slice(0,300)}`,before,cleaned},null,2));
      process.exit(41);
    }
  }
}

const remaining=currentChanges();
const expected=phase==='pre-auth'?[]:[preservePath];
const ok=JSON.stringify(remaining)===JSON.stringify(expected);
const out={
  schemaVersion:'orbit360-control-plane-evidence-lifecycle-v2-classwide-publication-lineage',
  ok,
  status:ok?'CONTROL_PLANE_EVIDENCE_LIFECYCLE_PASS':'CONTROL_PLANE_EVIDENCE_LIFECYCLE_FAIL',
  classification:ok?'PASS':'PIPELINE_MECHANISM_FAILURE',
  phase,
  evidenceDirectory:EVIDENCE_DIR,
  strategy:'GIT_CHANGED_SURFACE_CLASS_WIDE_NOT_FILENAME_LIST',
  assertOnly,
  preservePath:preservePath||null,
  publicationLineageReset,
  publicationLineageLocalHead,
  publicationLineageRemoteHead,
  before,
  cleaned,
  remaining,
  expectedRemaining:expected,
  runtimeExecuted:false,
  browserExecuted:false,
  secretAccess:false,
  firestoreRead:false,
  writes:0,
  deployExecuted:false,
  productionTouched:false,
  containsPII:false,
  containsSecrets:false
};
console.log(JSON.stringify(out,null,2));
if(!ok)process.exit(41);
