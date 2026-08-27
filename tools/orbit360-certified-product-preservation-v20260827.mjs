#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const REG='orbit360-platform/docs/orbit360-certified-product-preservation-registry-v20260827.json';
const LEDGER='orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json';
const A=p=>path.join(ROOT,p);
const read=p=>fs.readFileSync(A(p),'utf8').replace(/^\uFEFF/,'');
const json=p=>JSON.parse(read(p));
const fail=(code,detail={})=>{
  const out={ok:false,status:'CERTIFIED_PRODUCT_BASELINE_PRESERVATION_FAIL',classification:'PIPELINE_MECHANISM_FAILURE',code,...detail,sourceOnly:true,runtime:false,browser:false,secrets:false,firestoreRead:false,writes:false,deploy:false,productionTouched:false,containsPII:false,containsSecrets:false};
  console.error(JSON.stringify(out,null,2));
  process.exit(42);
};
const git=args=>execFileSync('git',args,{cwd:ROOT,encoding:'utf8'}).trim();

try{
  if(!fs.existsSync(A(REG))||!fs.existsSync(A(LEDGER))) fail('PRESERVATION_DEPENDENCY_MISSING');
  const R=json(REG),L=json(LEDGER),B=R.baseline||{},F=R.sourceFreeze||{};
  if(R.status!=='ACTIVE_SOURCE_ONLY_FAIL_CLOSED'||R.preservationRule?.approvedProductBaselineIsReference!==true||R.preservationRule?.historicalPassPlusSameArtifactMeansNoReprocess!==true||R.preservationRule?.visualAnomalyDoesNotAuthorizeRebuild!==true||R.preservationRule?.visualAnomalyDoesNotAuthorizeReimport!==true||R.preservationRule?.productDeltaRequiresNewExplicitlyAcceptedBaseline!==true) fail('PRESERVATION_RULE_INVALID');
  if(Number(B.artifactId)!==9504702901||B.sourceHead!=='8c9668d6d423e82826b0295431ec699390d79b4b'||B.manifestSha256!=='b1c98c1faf644b5d83cfe6e6bb1a602927c438cd85b7855cb0b1a6b98c08053c'||B.zipSha256!=='4a3660a18229a923412aa5a1bffc0817b1d5666c83ba96c81c92cea0fce9491c'||Number(B.fileCount)!==194||Number(R.approvedModuleScriptCount)!==53) fail('PRESERVATION_BASELINE_IDENTITY_INVALID');
  const S=L.successorCandidate||{};
  if(Number(S.artifactId)!==Number(B.artifactId)||String(S.sourceHead||'')!==B.sourceHead||String(S.manifestSha256||'')!==B.manifestSha256||String(S.zipSha256||'')!==B.zipSha256||Number(S.fileCount)!==Number(B.fileCount)) fail('LEDGER_CERTIFIED_BASELINE_DIVERGENCE');
  const head=git(['rev-parse','HEAD']);
  try{git(['merge-base','--is-ancestor',B.sourceHead,head]);}catch{fail('CERTIFIED_SOURCE_NOT_ANCESTOR',{head,baselineSourceHead:B.sourceHead});}
  const pathspecs=Array.isArray(F.paths)?F.paths:[];
  if(!pathspecs.length) fail('PRODUCT_SOURCE_FREEZE_PATHS_MISSING');
  const diff=git(['diff','--name-only',B.sourceHead,'HEAD','--',...pathspecs]);
  const changed=diff?diff.split(/\r?\n/).filter(Boolean):[];
  if(changed.length) fail('UNAPPROVED_PRODUCT_SOURCE_DELTA',{head,baselineSourceHead:B.sourceHead,changedFiles:changed});
  const missing=(R.approvedModuleScripts||[]).filter(p=>!fs.existsSync(A('orbit360-platform/'+p)));
  if(missing.length) fail('APPROVED_MODULE_SCRIPT_MISSING',{missing});
  const out={ok:true,status:'CERTIFIED_PRODUCT_BASELINE_PRESERVATION_PASS',classification:'PASS',baselineArtifactId:B.artifactId,baselineSourceHead:B.sourceHead,manifestSha256:B.manifestSha256,zipSha256:B.zipSha256,fileCount:B.fileCount,approvedModuleScriptCount:R.approvedModuleScriptCount,currentHead:head,changedProductFilesSinceBaseline:0,sourceStatus:'PASS_PRESERVED_SOURCE',liveVisualStatus:R.validationSemantics?.liveVisualStatus||'PENDING',noReprocess:true,noReimport:true,sourceOnly:true,runtime:false,browser:false,secrets:false,firestoreRead:false,writes:false,deploy:false,productionTouched:false,containsPII:false,containsSecrets:false};
  console.log(JSON.stringify(out,null,2));
}catch(error){
  fail('CERTIFIED_PRODUCT_PRESERVATION_UNEXPECTED',{detail:String(error?.message||error)});
}
