#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const REG='orbit360-platform/docs/orbit360-post-go-live-successor-source-registry-v20260828.json';
const PRES='tools/orbit360-certified-product-preservation-v20260827.mjs';
const TRANSITION='POST_GO_LIVE_PRODUCT_SUCCESSOR_SOURCE_STAGE';
const args=process.argv.slice(2);const val=f=>{const i=args.indexOf(f);return i>=0?String(args[i+1]||''):'';};
const intentPath=val('--intent')||process.env.ORBIT360_EXECUTION_INTENT||'';
const terminalOut=val('--terminal-out')||process.env.ORBIT360_TERMINAL_EVIDENCE||'';
const runId=Number(val('--run-id')||process.env.ORBIT360_EXECUTION_RUN_ID||0);
const selftest=args.includes('--source-only-selftest');
const A=p=>path.join(ROOT,p);const readJson=p=>JSON.parse(fs.readFileSync(A(p),'utf8').replace(/^\uFEFF/,''));
const git=(argv,cwd=ROOT)=>execFileSync('git',argv,{cwd,encoding:'utf8',maxBuffer:16*1024*1024}).trim();
const sha=v=>createHash('sha256').update(v).digest('hex');
const ensure=p=>fs.mkdirSync(path.dirname(p),{recursive:true});
const write=(p,x)=>{if(!p)return;ensure(p);fs.writeFileSync(p,JSON.stringify(x,null,2)+'\n','utf8');};
const zero=extra=>({privilegedRiskObserved:false,secretAccess:false,firestoreRead:false,resetLinksGenerated:0,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,runtimeExecuted:false,browserExecuted:false,productMutation:false,dataMutation:false,containsPII:false,containsSecrets:false,...extra});
function fail(code,detail={}){const out=zero({schemaVersion:'orbit360-product-git-stage-terminal-v2',transitionId:TRANSITION,runId:Number.isInteger(runId)?runId:0,ok:false,status:'POST_GO_LIVE_PRODUCT_GIT_STAGE_FAIL',classification:'PIPELINE_MECHANISM_FAILURE',failureCode:code,...detail,evidencePath:runId>0?`actions-artifact:orbit360-single-state-${runId}/orbit360-terminal.json`:''});write(terminalOut,out);console.error(JSON.stringify(out));process.exit(41);}
function scopeZero(s={}){for(const k of ['runtime','browser','secrets','firestoreRead','deploy','production','firestoreWrites','authWrites','operationalWrites','dataWrites','main','merge'])if(s[k]!==false)throw new Error(`PRODUCT_GIT_STAGE_SCOPE_NOT_ZERO:${k}`);}
function loadRegistry(){const R=readJson(REG);if(R.schemaVersion!=='orbit360-post-go-live-successor-source-registry-v4-git-bound-overlay'||R.status!=='ACTIVE_SOURCE_ONLY_GIT_BOUND_EXPLICIT_BASELINE_ACCEPTANCE'||R.stateBearing!==false||R.dynamicStateForbidden!==true||R.transitionId!==TRANSITION||R.handler!=='tools/orbit360-post-go-live-successor-source-stage-v20260828.mjs')throw new Error('PRODUCT_GIT_STAGE_REGISTRY_INVALID');return R;}
function ensureCandidate(head,branch){try{git(['cat-file','-e',`${head}^{commit}`]);return;}catch{}if(!/^[A-Za-z0-9._\/-]{1,240}$/.test(branch)||branch.includes('..'))throw new Error('PRODUCT_GIT_STAGE_BRANCH_INVALID');git(['fetch','--no-tags','origin',`${branch}:refs/remotes/origin/orbit360-product-candidate`]);git(['cat-file','-e',`${head}^{commit}`]);}
function allowed(pathName,R){if((R.forbiddenProductPrefixes||[]).some(p=>pathName===p||pathName.startsWith(p)))return false;return (R.allowedProductPrefixes||[]).some(p=>p.endsWith('/')?pathName.startsWith(p):pathName===p);}
function diffRows(base,head,R){const raw=git(['diff','--name-status','--find-renames=100%',base,head,'--']);const rows=raw?raw.split(/\r?\n/).filter(Boolean).map(line=>{const parts=line.split('\t');return{status:parts[0],path:parts[parts.length-1]};}):[];if(!rows.length)throw new Error('PRODUCT_GIT_STAGE_EMPTY_DIFF');if(rows.length>Number(R.candidateContract?.maxChangedFiles||30))throw new Error('PRODUCT_GIT_STAGE_TOO_MANY_FILES');for(const row of rows){if(!/^M$|^A$/.test(row.status))throw new Error(`PRODUCT_GIT_STAGE_CHANGE_TYPE_FORBIDDEN:${row.status}:${row.path}`);if(!allowed(row.path,R))throw new Error(`PRODUCT_GIT_STAGE_TARGET_FORBIDDEN:${row.path}`);}const sorted=rows.map(r=>r.path).sort();return sorted.map(p=>{let before='ABSENT';try{before=git(['rev-parse',`${base}:${p}`]);}catch{}const after=git(['rev-parse',`${head}:${p}`]);return{path:p,beforeGitBlobSha:before,afterGitBlobSha:after};});}
function digestRows(rows){return sha(Buffer.from(JSON.stringify(rows.map(r=>({path:r.path,beforeGitBlobSha:r.beforeGitBlobSha,afterGitBlobSha:r.afterGitBlobSha})).sort((a,b)=>a.path.localeCompare(b.path))),'utf8')).toString('hex');}
function validateProfile(head,profile,R){const spec=R.validationProfiles?.[profile];if(!spec||!Array.isArray(spec.validators)||!spec.validators.length)throw new Error('PRODUCT_GIT_STAGE_VALIDATION_PROFILE_INVALID');const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'orbit360-product-candidate-'));try{git(['worktree','add','--detach',tmp,head]);const results=[];for(const script of spec.validators){const r=spawnSync(process.execPath,[path.join(tmp,script),tmp],{cwd:tmp,encoding:'utf8',env:{...process.env,ORBIT360_ROOT:tmp}});let out={};try{out=JSON.parse(String(r.stdout||'').trim());}catch{}if(r.status!==0||out.ok!==true)throw new Error(`PRODUCT_GIT_STAGE_VALIDATOR_FAIL:${script}:${out.status||r.status}`);results.push({path:script,status:out.status,ok:true});}return results;}finally{try{git(['worktree','remove','--force',tmp]);}catch{}try{fs.rmSync(tmp,{recursive:true,force:true});}catch{}}}
function preservationPass(){const r=spawnSync(process.execPath,[A(PRES)],{cwd:ROOT,encoding:'utf8',env:{...process.env,ORBIT360_ROOT:ROOT}});let out={};try{out=JSON.parse(String(r.stdout||'').trim());}catch{}if(r.status!==0||out.ok!==true||out.status!=='CERTIFIED_PRODUCT_BASELINE_PRESERVATION_PASS'||out.contractVersion!=='v3-static-product-integrity'||out.overlayContractVersion!=='v4-explicit-overlay-integrity'||Number(out.changedProductFilesSinceBaseline)!==0||Number(out.unexpectedProductFilesSinceBaseline)!==0)throw new Error('PRODUCT_GIT_STAGE_CURRENT_BASELINE_NOT_PRESERVED');return out;}
if(selftest){console.log(JSON.stringify(zero({ok:true,status:'POST_GO_LIVE_PRODUCT_GIT_STAGE_SELFTEST_PASS',classification:'PASS',transitionId:TRANSITION,gitCommitBindingRequired:true,stagedBaseMayPrecedeLedgerClaimCommits:true,perFileBlobBindingRequired:true,sourceOnly:true}),null,2));process.exit(0);}
try{
  if(!intentPath||!terminalOut||!Number.isInteger(runId)||runId<=0||!fs.existsSync(intentPath))throw new Error('PRODUCT_GIT_STAGE_ARGS_INVALID');
  const R=loadRegistry(),I=JSON.parse(fs.readFileSync(intentPath,'utf8'));
  if(I.schemaVersion!=='orbit360-execution-intent-v1'||I.transitionId!==TRANSITION)throw new Error('PRODUCT_GIT_STAGE_INTENT_INVALID');scopeZero(I.scope||{});
  const C=I.gitCandidate||{},head=String(C.candidateHead||''),branch=String(C.candidateBranch||''),profile=String(C.validationProfile||''),base=String(I.canonicalBaseHead||'');
  if(!/^[a-f0-9]{40}$/.test(head)||!/^[a-f0-9]{40}$/.test(base))throw new Error('PRODUCT_GIT_STAGE_HEAD_INVALID');
  const current=git(['rev-parse','HEAD']);git(['cat-file','-e',`${base}^{commit}`]);try{git(['merge-base','--is-ancestor',base,current]);}catch{throw new Error('PRODUCT_GIT_STAGE_BASE_NOT_ANCESTOR_OF_CLAIM_HEAD');}
  preservationPass();ensureCandidate(head,branch);if(git(['merge-base',base,head])!==base)throw new Error('PRODUCT_GIT_STAGE_CANDIDATE_NOT_DESCENDANT');
  const rows=diffRows(base,head,R),spec=R.validationProfiles?.[profile];if(spec?.exactChangedTargets===true){const got=rows.map(x=>x.path).sort(),want=[...(spec.requiredChangedTargets||[])].sort();if(JSON.stringify(got)!==JSON.stringify(want))throw new Error(`PRODUCT_GIT_STAGE_PROFILE_TARGET_MISMATCH:${got.join(',')}`);}
  const validators=validateProfile(head,profile,R),diffDigest=digestRows(rows);
  const terminal=zero({schemaVersion:'orbit360-product-git-stage-terminal-v2',transitionId:TRANSITION,runId,ok:true,status:'POST_GO_LIVE_PRODUCT_GIT_STAGE_PASS',classification:'PASS',candidateHead:head,candidateBranch:branch,baseHead:base,claimHead:current,validationProfile:profile,diffDigest,changedTargetCount:rows.length,changedTargetPaths:rows.map(x=>x.path),targetBindings:rows,validators,sourceOnly:true,evidencePath:`actions-artifact:orbit360-single-state-${runId}/orbit360-terminal.json`});write(terminalOut,terminal);console.log(JSON.stringify(terminal,null,2));
}catch(error){fail(String(error?.message||error));}
