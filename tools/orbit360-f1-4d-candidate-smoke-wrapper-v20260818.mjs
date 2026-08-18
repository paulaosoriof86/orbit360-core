#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const ROOT=process.cwd();
const SOURCE=path.join(ROOT,'tools/orbit360-r4-certified-product-smoke-wrapper-v20260815.mjs');
const TEMP=path.join(ROOT,'tools/.orbit360-f1-4d-candidate-smoke-wrapper.runtime.mjs');
let s=fs.readFileSync(SOURCE,'utf8');
function once(from,to,label){const n=s.split(from).length-1;if(n!==1)throw new Error(`${label}_COUNT_INVALID:${n}`);s=s.replace(from,to);}
once('tools/orbit360-r4-certified-product-contract-v20260815.json','tools/orbit360-f1-4d-candidate-contract-v20260818.json','F1_4D_CONTRACT_PATH');
once("    'FASE_A_PRODUCT_R4S9C_CONTRACT_RECOVERY_CERTIFIED'\n  ]);","    'FASE_A_PRODUCT_R4S9C_CONTRACT_RECOVERY_CERTIFIED',\n    'FASE_A_PRODUCT_F1_4C_SUCCESSOR_CERTIFIED'\n  ]);",'F1_4D_MANIFEST_STATUS_ALLOWLIST');
once('r4-certified-validator-rootfix-source-v20260815.json','f1-4d-candidate-wrapper-source-only-v20260818.json','F1_4D_SELF_EVIDENCE');
const oldToken="const tokenPrecondition = \"if (!TARGET.startsWith('https://') || !EMAIL || CUSTOM_TOKEN.length < 100 || !/^[a-f0-9]{64}$/.test(EXPECTED_AUTH_SHA256)) throw new ClassifiedError('PIPELINE_MECHANISM_FAILURE', 'R4_CUSTOM_TOKEN_SMOKE_PRECONDITION_NOT_BOUND');\";";
const newToken="const tokenPrecondition = \"if (!(TARGET.startsWith('https://') || TARGET.startsWith('http://127.0.0.1:') || TARGET.startsWith('http://localhost:')) || !EMAIL || CUSTOM_TOKEN.length < 100 || !/^[a-f0-9]{64}$/.test(EXPECTED_AUTH_SHA256)) throw new ClassifiedError('PIPELINE_MECHANISM_FAILURE', 'R4_CUSTOM_TOKEN_SMOKE_PRECONDITION_NOT_BOUND');\";";
once(oldToken,newToken,'F1_4D_LOOPBACK_TARGET');
fs.writeFileSync(TEMP,s,'utf8');
try{
  const run=spawnSync(process.execPath,[TEMP,...process.argv.slice(2)],{cwd:ROOT,env:process.env,stdio:'inherit',encoding:'utf8',maxBuffer:64*1024*1024});
  if(run.error)throw run.error;
  process.exitCode=Number.isInteger(run.status)?run.status:41;
}finally{try{fs.unlinkSync(TEMP);}catch{}}
