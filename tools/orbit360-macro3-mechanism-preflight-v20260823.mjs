#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

// Canonical Macro-3 preflight facade. Public path remains unchanged.
// VALIDATOR_STALE rootfix: prior candidate checksPassed=107 must not bind successors.
const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const CORE_REL='tools/orbit360-macro3-mechanism-preflight-core-v20260824.mjs';
const CORE=path.join(ROOT,CORE_REL);
const OLD="Number(L.macro2Closure?.checksPassed)===107";
const NEW="Number(L.macro2Closure?.checksPassed)===Number(cert.checksPassed)";
const fail=code=>{throw new Error(code);};
if(!fs.existsSync(CORE))fail('PIPELINE_MECHANISM_FAILURE:MACRO3_PREFLIGHT_CORE_MISSING');
let source=fs.readFileSync(CORE,'utf8').replace(/^\uFEFF/,'');
const n=source.split(OLD).length-1;
if(n!==1)fail(`PIPELINE_MECHANISM_FAILURE:MACRO3_PREFLIGHT_DYNAMIC_CHECKS_PRECONDITION_${n}`);
source=source.replace(OLD,NEW);
if(source.includes(OLD)||!source.includes(NEW))fail('PIPELINE_MECHANISM_FAILURE:MACRO3_PREFLIGHT_DYNAMIC_CHECKS_PATCH_FAILED');
const tmp=path.join(os.tmpdir(),`orbit360-macro3-preflight-${process.pid}-${Date.now()}.mjs`);
try{
  fs.writeFileSync(tmp,source,'utf8');
  const run=spawnSync(process.execPath,[tmp,...process.argv.slice(2)],{cwd:ROOT,env:process.env,stdio:'inherit'});
  if(run.error)throw run.error;
  process.exitCode=Number.isInteger(run.status)?run.status:41;
}finally{try{fs.unlinkSync(tmp);}catch{}}
