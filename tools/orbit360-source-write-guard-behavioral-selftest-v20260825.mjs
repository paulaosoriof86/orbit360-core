#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const GUARD='tools/orbit360-control-plane-no-source-rewrite-guard-v20260824.mjs';
const TARGET='tools/orbit360-register-f2-productive-acceptance-runtime-v20260819.mjs';
const A=(root,p)=>path.join(root,p);
const parse=s=>{try{return JSON.parse(String(s||'').trim());}catch{return null;}};
const runGuard=root=>{const r=spawnSync(process.execPath,[A(root,GUARD)],{cwd:root,encoding:'utf8',env:{...process.env,ORBIT360_ROOT:root}});return{r,j:parse(r.stdout)};};
let scratch='',temp='',baselinePass=false,temporaryInfrastructureAllowedPass=false,actualSourceWriteNegativePass=false,cleanupPass=false;
try{
  const base=runGuard(ROOT);
  baselinePass=base.r.status===0&&base.j?.ok===true&&base.j?.temporaryInfrastructureAllowed===true&&base.j?.validationMode==='SOURCE_WRITE_TARGET_STATIC_GUARD_PLUS_BEHAVIORAL_IMMUTABILITY_TEST';
  if(!baselinePass)throw new Error(`BASE_GUARD_FAIL:${String(base.r.stderr||base.r.stdout||'').slice(-600)}`);
  // The active transition-precondition helper legitimately uses temp infrastructure.
  const helper=fs.readFileSync(A(ROOT,'tools/orbit360-control-plane-transition-precondition-owner-v20260825.mjs'),'utf8');
  temporaryInfrastructureAllowedPass=/os\.tmpdir\s*\(/.test(helper)&&/git'\s*,\s*\['worktree','add'/.test(helper)&&base.j?.temporaryInfrastructureAllowed===true;
  if(!temporaryInfrastructureAllowedPass)throw new Error('TEMP_INFRASTRUCTURE_BEHAVIOR_NOT_PROVEN');

  temp=fs.mkdtempSync(path.join(process.env.RUNNER_TEMP?path.resolve(process.env.RUNNER_TEMP):os.tmpdir(),'orbit360-source-write-guard-test-'));
  scratch=path.join(temp,'repo');
  execFileSync('git',['worktree','add','--detach',scratch,'HEAD'],{cwd:ROOT,stdio:'ignore'});
  const target=A(scratch,TARGET),original=fs.readFileSync(target,'utf8');
  // Construct the forbidden call dynamically so this selftest's own source does not match the static guard.
  const forbidden=`\n// selftest mutation fixture\nfs.`+`writeFileSync('tools/`+`__guard-negative-fixture.mjs','x');\n`;
  fs.writeFileSync(target,original+forbidden,'utf8');
  const negative=runGuard(scratch);
  actualSourceWriteNegativePass=negative.r.status!==0&&negative.j?.ok===false&&Array.isArray(negative.j?.failures)&&negative.j.failures.some(x=>String(x).startsWith(`ACTIVE_SOURCE_WRITE_FORBIDDEN:${TARGET}:`));
  if(!actualSourceWriteNegativePass)throw new Error(`REAL_SOURCE_WRITE_NOT_REJECTED:${String(negative.r.stderr||negative.r.stdout||'').slice(-600)}`);
}finally{
  try{if(scratch)execFileSync('git',['worktree','remove','--force',scratch],{cwd:ROOT,stdio:'ignore'});}catch{}
  try{if(temp)fs.rmSync(temp,{recursive:true,force:true});}catch{}
  try{const listed=String(execFileSync('git',['worktree','list','--porcelain'],{cwd:ROOT,encoding:'utf8'}));cleanupPass=!scratch||!listed.includes(scratch);}catch{cleanupPass=false;}
}
const ok=baselinePass&&temporaryInfrastructureAllowedPass&&actualSourceWriteNegativePass&&cleanupPass;
const out={schemaVersion:'orbit360-source-write-guard-behavioral-selftest-v1',ok,status:ok?'SOURCE_WRITE_GUARD_BEHAVIORAL_SELFTEST_PASS':'SOURCE_WRITE_GUARD_BEHAVIORAL_SELFTEST_FAIL',classification:ok?'PASS':'PIPELINE_MECHANISM_FAILURE',baselinePass,temporaryInfrastructureAllowedPass,actualSourceWriteNegativePass,cleanupPass,sourceWriteGuardMode:'STATIC_SOURCE_WRITE_TARGET_PLUS_BEHAVIORAL_NEGATIVE',runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
console.log(JSON.stringify(out,null,2));if(!ok)process.exit(41);
