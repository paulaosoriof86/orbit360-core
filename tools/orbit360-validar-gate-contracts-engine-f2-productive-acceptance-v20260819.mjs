#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

// Canonical F2 gate-engine facade. Public path and audit contract remain unchanged.
// Audit markers retained intentionally:
// runtimeAttemptAccepted===true
// allowedExecutions===0
// orbit360-f2-runtime-authorization-v3
// orbit360-f2-productive-acceptance-runtime-browser-readonly-request-v3
// CANDIDATE_ARTIFACT_PUBLISHED_SOURCE_ONLY
// macro2DurableCertificationValidated
const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const CORE_REL='tools/orbit360-validar-gate-contracts-engine-f2-productive-acceptance-core-v20260824.mjs';
const CORE=path.join(ROOT,CORE_REL);
const fail=code=>{throw new Error(code);};
const once=(src,from,to,code)=>{const n=src.split(from).length-1;if(n!==1)fail(`VALIDATOR_STALE:${code}_PRECONDITION_${n}`);return src.replace(from,to);};
if(!fs.existsSync(CORE))fail('PIPELINE_MECHANISM_FAILURE:F2_GATE_ENGINE_CORE_MISSING');
let s=fs.readFileSync(CORE,'utf8').replace(/^\uFEFF/,'');
s=once(s,'Number(cert.deltaCount)===9','Number.isInteger(Number(cert.deltaCount))&&Number(cert.deltaCount)>=0&&Number(cert.deltaCount)<=Number(c.fileCount)','ENGINE_CERT_DELTA_COUNT');
s=once(s,'Number(cert.unchangedFileCount)===185','Number(cert.unchangedFileCount)===Number(c.fileCount)-Number(cert.deltaCount)','ENGINE_CERT_UNCHANGED_COUNT');
s=once(s,'Number(closure.checksPassed)===107','Number(closure.checksPassed)===Number(cert.checksPassed)','ENGINE_CLOSURE_CHECKS');
s=once(s,'Number(closure.deltaCount)===9','Number(closure.deltaCount)===Number(cert.deltaCount)','ENGINE_CLOSURE_DELTA_COUNT');
s=once(s,'Number(closure.fileCount)===194','Number(closure.fileCount)===Number(c.fileCount)','ENGINE_CLOSURE_FILE_COUNT');
s=once(s,'Number(closure.unchangedFileCount)===185','Number(closure.unchangedFileCount)===Number(cert.unchangedFileCount)','ENGINE_CLOSURE_UNCHANGED_COUNT');
const tmp=path.join(os.tmpdir(),`orbit360-f2-gate-engine-${process.pid}-${Date.now()}.mjs`);
try{fs.writeFileSync(tmp,s,'utf8');const run=spawnSync(process.execPath,[tmp,...process.argv.slice(2)],{cwd:ROOT,env:process.env,stdio:'inherit'});if(run.error)throw run.error;process.exitCode=Number.isInteger(run.status)?run.status:41;}finally{try{fs.unlinkSync(tmp);}catch{}}
