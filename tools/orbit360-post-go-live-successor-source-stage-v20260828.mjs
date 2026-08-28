#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const REGISTRY_REL='orbit360-platform/docs/orbit360-post-go-live-successor-source-registry-v20260828.json';
const PRESERVATION='tools/orbit360-certified-product-preservation-v20260827.mjs';
const TRANSITION='POST_GO_LIVE_PRODUCT_SUCCESSOR_SOURCE_STAGE';
const args=process.argv.slice(2);
const val=f=>{const i=args.indexOf(f);return i>=0?String(args[i+1]||''):'';};
const intentPath=val('--intent')||process.env.ORBIT360_EXECUTION_INTENT||'';
const runId=Number(val('--run-id')||process.env.ORBIT360_EXECUTION_RUN_ID||0);
const terminalOut=val('--terminal-out')||process.env.ORBIT360_TERMINAL_EVIDENCE||'';
const evidenceOut=val('--evidence-out')||process.env.ORBIT360_SUCCESSOR_EVIDENCE||'';
const selftest=args.includes('--source-only-selftest');
const A=p=>path.join(ROOT,p);
const readJson=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const shaBuffer=b=>createHash('sha256').update(b).digest('hex');
const shaFile=p=>shaBuffer(fs.readFileSync(p));
const safeRel=p=>typeof p==='string'&&p.length>0&&p.length<360&&!path.isAbsolute(p)&&!p.split(/[\\/]+/).includes('..')&&/^[A-Za-z0-9._/\-]+$/.test(p);
const ensureParent=p=>fs.mkdirSync(path.dirname(p),{recursive:true});
const stable=v=>Array.isArray(v)?v.map(stable):(v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v);
const digest=v=>shaBuffer(Buffer.from(JSON.stringify(stable(v)),'utf8'));

function sourceOnlyShape(extra={}){
  return {privilegedRiskObserved:false,secretAccess:false,firestoreRead:false,resetLinksGenerated:0,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,runtimeExecuted:false,browserExecuted:false,productMutation:false,dataMutation:false,containsPII:false,containsSecrets:false,...extra};
}
function writeTerminal(payload){
  if(!terminalOut)return;
  ensureParent(terminalOut);
  fs.writeFileSync(terminalOut,JSON.stringify(payload,null,2)+'\n','utf8');
}
function fail(code,meta={}){
  const payload=sourceOnlyShape({schemaVersion:'orbit360-post-go-live-successor-source-terminal-v1',transitionId:TRANSITION,runId:Number.isInteger(runId)?runId:0,ok:false,classification:'PIPELINE_MECHANISM_FAILURE',status:'POST_GO_LIVE_PRODUCT_SUCCESSOR_SOURCE_STAGE_FAIL',failureCode:code,evidencePath:runId>0?`actions-artifact:orbit360-single-state-${runId}/orbit360-terminal.json`:'',...meta});
  writeTerminal(payload);
  console.error(JSON.stringify({ok:false,status:payload.status,classification:payload.classification,code,containsPII:false,containsSecrets:false}));
  process.exit(41);
}
function loadRegistry(root=ROOT){
  const p=path.join(root,REGISTRY_REL);
  if(!fs.existsSync(p))throw new Error('SUCCESSOR_SOURCE_REGISTRY_MISSING');
  const r=readJson(p);
  if(r.schemaVersion!=='orbit360-post-go-live-successor-source-registry-v1'||r.status!=='ACTIVE_SOURCE_ONLY_STAGING_NO_ACCEPTANCE'||r.sourceOnly!==true||r.runtimeAllowed!==false||r.deployAllowed!==false||r.productionAllowed!==false||r.baselineAcceptanceSeparate!==true||r.mutatesCertifiedBaseline!==false)throw new Error('SUCCESSOR_SOURCE_REGISTRY_INVALID');
  return r;
}
function assertScope(scope={}){
  for(const k of ['runtime','browser','secrets','firestoreRead','deploy','production','firestoreWrites','authWrites','operationalWrites','dataWrites','main','merge'])if(scope[k]!==false)throw new Error(`SUCCESSOR_SOURCE_SCOPE_NOT_ZERO:${k}`);
}
function assertPatchIntent(I,R){
  if(I.schemaVersion!=='orbit360-execution-intent-v1'||I.transitionId!==TRANSITION)throw new Error('SUCCESSOR_SOURCE_INTENT_INVALID');
  assertScope(I.scope||{});
  const s=I.successorPatch||{};
  if(!/^[A-Za-z0-9._-]{1,120}$/.test(String(s.candidateId||'')))throw new Error('SUCCESSOR_SOURCE_CANDIDATE_ID_INVALID');
  if(!safeRel(s.patchManifestPath)||!String(s.patchManifestPath).startsWith(R.patchRoot+'/'))throw new Error('SUCCESSOR_SOURCE_PATCH_PATH_INVALID');
  if(!/^[a-f0-9]{64}$/.test(String(s.patchManifestSha256||'')))throw new Error('SUCCESSOR_SOURCE_PATCH_DIGEST_INVALID');
  return s;
}
function allowedTarget(target,R){
  if(!safeRel(target))return false;
  return (R.allowedTargetPrefixes||[]).some(prefix=>target===prefix||target.startsWith(prefix.endsWith('/')?prefix:prefix+'/'));
}
function listFiles(dir,base=dir,out=[]){
  if(!fs.existsSync(dir))return out;
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,ent.name);
    if(ent.isDirectory())listFiles(full,base,out);
    else if(ent.isFile())out.push(path.relative(base,full).split(path.sep).join('/'));
  }
  return out;
}
function copyBaseline(root,candidateRoot,R){
  for(const rel of R.baselineCopyPaths||[]){
    const src=path.join(root,rel);if(!fs.existsSync(src))throw new Error(`SUCCESSOR_BASELINE_PATH_MISSING:${rel}`);
    const dst=path.join(candidateRoot,rel);ensureParent(dst);
    fs.cpSync(src,dst,{recursive:true,errorOnExist:false,force:true});
  }
}
function validatePatch(root,R,s){
  const manifestAbs=path.join(root,s.patchManifestPath);
  if(!fs.existsSync(manifestAbs))throw new Error('SUCCESSOR_PATCH_MANIFEST_MISSING');
  if(shaFile(manifestAbs)!==s.patchManifestSha256)throw new Error('SUCCESSOR_PATCH_MANIFEST_DIGEST_MISMATCH');
  const M=readJson(manifestAbs);
  if(M.schemaVersion!=='orbit360-post-go-live-product-patch-v1'||M.candidateId!==s.candidateId||M.baseSourceHead!==R.certifiedBaseline.sourceHead||M.baseManifestSha256!==R.certifiedBaseline.manifestSha256||M.classification!=='FUNCTIONAL_DEFECT'||M.containsPII!==false||M.containsSecrets!==false)throw new Error('SUCCESSOR_PATCH_MANIFEST_CONTRACT_INVALID');
  if(!Array.isArray(M.targets)||!M.targets.length||M.targets.length>20)throw new Error('SUCCESSOR_PATCH_TARGETS_INVALID');
  const seen=new Set();
  for(const t of M.targets){
    if(!allowedTarget(t.targetPath,R)||seen.has(t.targetPath))throw new Error(`SUCCESSOR_PATCH_TARGET_INVALID:${t.targetPath}`);seen.add(t.targetPath);
    if(!safeRel(t.payloadPath)||!t.payloadPath.startsWith(R.patchRoot+'/'))throw new Error(`SUCCESSOR_PATCH_PAYLOAD_PATH_INVALID:${t.targetPath}`);
    const payloadAbs=path.join(root,t.payloadPath);if(!fs.existsSync(payloadAbs)||shaFile(payloadAbs)!==t.afterSha256)throw new Error(`SUCCESSOR_PATCH_PAYLOAD_DIGEST_MISMATCH:${t.targetPath}`);
    const targetAbs=path.join(root,t.targetPath);
    if(t.beforeSha256==='ABSENT'){if(fs.existsSync(targetAbs))throw new Error(`SUCCESSOR_PATCH_EXPECTED_ABSENT:${t.targetPath}`);}
    else if(!/^[a-f0-9]{64}$/.test(String(t.beforeSha256||''))||!fs.existsSync(targetAbs)||shaFile(targetAbs)!==t.beforeSha256)throw new Error(`SUCCESSOR_PATCH_BASE_DIGEST_MISMATCH:${t.targetPath}`);
  }
  return M;
}
function applyPatch(root,candidateRoot,M){
  for(const t of M.targets){const src=path.join(root,t.payloadPath),dst=path.join(candidateRoot,t.targetPath);ensureParent(dst);fs.copyFileSync(src,dst);if(shaFile(dst)!==t.afterSha256)throw new Error(`SUCCESSOR_PATCH_APPLY_DIGEST_MISMATCH:${t.targetPath}`);}
}
function candidateManifest(candidateRoot,M,R){
  const files=listFiles(candidateRoot).sort().map(rel=>({path:rel,sha256:shaFile(path.join(candidateRoot,rel)),bytes:fs.statSync(path.join(candidateRoot,rel)).size}));
  const changed=M.targets.map(t=>({path:t.targetPath,beforeSha256:t.beforeSha256,afterSha256:t.afterSha256}));
  const out={schemaVersion:'orbit360-post-go-live-successor-candidate-manifest-v1',candidateId:M.candidateId,status:'STAGED_SOURCE_ONLY_PENDING_EXPLICIT_ACCEPTANCE',certifiedBaseline:R.certifiedBaseline,changedTargets:changed,fileCount:files.length,files,sourceOnly:true,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,deployExecuted:false,productionTouched:false,mutatesCertifiedBaseline:false,baselineAcceptanceSeparate:true,containsPII:false,containsSecrets:false};
  return {...out,manifestSha256:digest(out)};
}
function runPreservation(){
  const p=A(PRESERVATION);if(!fs.existsSync(p))throw new Error('SUCCESSOR_PRESERVATION_TOOL_MISSING');
  const r=spawnSync(process.execPath,[p],{cwd:ROOT,encoding:'utf8',env:process.env});
  if(r.status!==0)throw new Error('SUCCESSOR_CERTIFIED_BASELINE_PRESERVATION_FAIL');
  let j={};try{j=JSON.parse(String(r.stdout||'').trim());}catch{throw new Error('SUCCESSOR_PRESERVATION_OUTPUT_INVALID');}
  if(j.ok!==true||j.status!=='CERTIFIED_PRODUCT_BASELINE_PRESERVATION_PASS'||Number(j.changedProductFilesSinceBaseline)!==0)throw new Error('SUCCESSOR_CERTIFIED_BASELINE_NOT_PRESERVED');
  return j;
}
function selfTest(){
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'orbit360-successor-selftest-'));
  try{
    const root=path.join(tmp,'root'),candidate=path.join(tmp,'candidate');fs.mkdirSync(root,{recursive:true});
    const R={schemaVersion:'orbit360-post-go-live-successor-source-registry-v1',status:'ACTIVE_SOURCE_ONLY_STAGING_NO_ACCEPTANCE',sourceOnly:true,runtimeAllowed:false,deployAllowed:false,productionAllowed:false,baselineAcceptanceSeparate:true,mutatesCertifiedBaseline:false,patchRoot:'tools/orbit360-post-go-live-patches',allowedTargetPrefixes:['orbit360-platform/core','functions'],baselineCopyPaths:['orbit360-platform/core','functions/index.js'],certifiedBaseline:{sourceHead:'8c9668d6d423e82826b0295431ec699390d79b4b',manifestSha256:'b1c98c1faf644b5d83cfe6e6bb1a602927c438cd85b7855cb0b1a6b98c08053c'}};
    fs.mkdirSync(path.join(root,'orbit360-platform/core'),{recursive:true});fs.writeFileSync(path.join(root,'orbit360-platform/core/a.js'),'old\n');fs.mkdirSync(path.join(root,'functions'),{recursive:true});fs.writeFileSync(path.join(root,'functions/index.js'),'server\n');
    const payload='new\n',payloadRel='tools/orbit360-post-go-live-patches/test/payload/orbit360-platform/core/a.js';const payloadAbs=path.join(root,payloadRel);ensureParent(payloadAbs);fs.writeFileSync(payloadAbs,payload);
    const M={schemaVersion:'orbit360-post-go-live-product-patch-v1',candidateId:'test',classification:'FUNCTIONAL_DEFECT',baseSourceHead:R.certifiedBaseline.sourceHead,baseManifestSha256:R.certifiedBaseline.manifestSha256,targets:[{targetPath:'orbit360-platform/core/a.js',payloadPath:payloadRel,beforeSha256:shaFile(path.join(root,'orbit360-platform/core/a.js')),afterSha256:shaFile(payloadAbs)}],containsPII:false,containsSecrets:false};
    const manifestRel='tools/orbit360-post-go-live-patches/test/manifest.json',manifestAbs=path.join(root,manifestRel);ensureParent(manifestAbs);fs.writeFileSync(manifestAbs,JSON.stringify(M));
    const s={candidateId:'test',patchManifestPath:manifestRel,patchManifestSha256:shaFile(manifestAbs)};const I={schemaVersion:'orbit360-execution-intent-v1',transitionId:TRANSITION,scope:Object.fromEntries(['runtime','browser','secrets','firestoreRead','deploy','production','firestoreWrites','authWrites','operationalWrites','dataWrites','main','merge'].map(k=>[k,false])),successorPatch:s};
    assertPatchIntent(I,R);const read=validatePatch(root,R,s);copyBaseline(root,candidate,R);applyPatch(root,candidate,read);const C=candidateManifest(candidate,read,R);
    if(shaFile(path.join(candidate,'orbit360-platform/core/a.js'))!==M.targets[0].afterSha256||C.changedTargets.length!==1||C.status!=='STAGED_SOURCE_ONLY_PENDING_EXPLICIT_ACCEPTANCE')throw new Error('SUCCESSOR_SELFTEST_STAGE_INVALID');
    fs.writeFileSync(payloadAbs,'tampered\n');let rejected=false;try{validatePatch(root,R,s);}catch{rejected=true;}if(!rejected)throw new Error('SUCCESSOR_SELFTEST_TAMPER_NOT_REJECTED');
    console.log(JSON.stringify(sourceOnlyShape({ok:true,status:'POST_GO_LIVE_PRODUCT_SUCCESSOR_SOURCE_STAGE_SELFTEST_PASS',classification:'PASS',baselineImmutable:true,tamperRejected:true,explicitAcceptanceSeparate:true}),null,2));
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
}

if(selftest){selfTest();process.exit(0);}
try{
  if(!intentPath||!terminalOut||!evidenceOut||!Number.isInteger(runId)||runId<=0||!fs.existsSync(intentPath))throw new Error('SUCCESSOR_SOURCE_HANDLER_ARGS_INVALID');
  const R=loadRegistry();
  const I=readJson(intentPath);const s=assertPatchIntent(I,R);
  const preservation=runPreservation();
  const M=validatePatch(ROOT,R,s);
  const candidateRoot=fs.mkdtempSync(path.join(os.tmpdir(),`orbit360-successor-${s.candidateId}-`));
  copyBaseline(ROOT,candidateRoot,R);applyPatch(ROOT,candidateRoot,M);
  const C=candidateManifest(candidateRoot,M,R);
  ensureParent(evidenceOut);fs.writeFileSync(evidenceOut,JSON.stringify(C,null,2)+'\n','utf8');
  const terminal=sourceOnlyShape({schemaVersion:'orbit360-post-go-live-successor-source-terminal-v1',transitionId:TRANSITION,runId,ok:true,classification:'PASS',status:'POST_GO_LIVE_PRODUCT_SUCCESSOR_SOURCE_STAGE_PASS',candidateId:s.candidateId,patchManifestSha256:s.patchManifestSha256,candidateManifestSha256:C.manifestSha256,changedTargetCount:C.changedTargets.length,candidateFileCount:C.fileCount,certifiedBaselinePreserved:preservation.ok===true,baselineSourceHead:R.certifiedBaseline.sourceHead,baselineManifestSha256:R.certifiedBaseline.manifestSha256,baselineAcceptanceSeparate:true,stagedCandidateStatus:C.status,evidencePath:`actions-artifact:orbit360-single-state-${runId}/orbit360-terminal.json`,candidateEvidencePath:`actions-artifact:orbit360-single-state-${runId}/post-go-live-successor-candidate.json`});
  writeTerminal(terminal);
  console.log(JSON.stringify({ok:true,status:terminal.status,classification:'PASS',candidateId:s.candidateId,changedTargetCount:C.changedTargets.length,candidateManifestSha256:C.manifestSha256,certifiedBaselinePreserved:true,baselineAcceptanceSeparate:true,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false},null,2));
}catch(e){fail(String(e&&e.message||e));}
