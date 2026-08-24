#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const CONTRACT='orbit360-platform/docs/orbit360-control-plane-semantic-contract-v20260824.json';
const A=p=>path.join(ROOT,p);
const failures=[];
if(!fs.existsSync(A(CONTRACT)))failures.push(`MISSING:${CONTRACT}`);
let contract={};
if(!failures.length){
  try{contract=JSON.parse(fs.readFileSync(A(CONTRACT),'utf8').replace(/^\uFEFF/,''));}
  catch{failures.push('SEMANTIC_CONTRACT_INVALID_JSON');}
}
const scope=Array.isArray(contract.sourceRewriteGuardScope)?contract.sourceRewriteGuardScope:[];
if(contract.active!==true||contract.behavioralContractPolicy?.sourceTextMayNotProveBehavior!==true)failures.push('SEMANTIC_CONTRACT_POLICY_INVALID');
if(scope.length<10)failures.push('SOURCE_REWRITE_SCOPE_NOT_CLASS_WIDE');
const forbidden=[
  /\bapplyOnce\b/,
  /\bsource\.replace\s*\(/,
  /\bpatched\s*=\s*[^;]*\.replace\s*\(/,
  /\bos\.tmpdir\s*\(/,
  /spawnSync\s*\(\s*process\.execPath\s*,\s*\[\s*tmp\b/,
  /pathToFileURL\s*\(\s*tmp\s*\)/,
  /CORE_REL\s*=/,
  /-core-v202608(?:20|24)\.mjs/
];
for(const rel of scope){
  if(typeof rel!=='string'||!rel.startsWith('tools/')){failures.push(`INVALID_SCOPE_ENTRY:${String(rel)}`);continue;}
  const abs=A(rel);
  if(!fs.existsSync(abs)){failures.push(`MISSING:${rel}`);continue;}
  const text=fs.readFileSync(abs,'utf8').replace(/^\uFEFF/,'');
  for(const rx of forbidden){if(rx.test(text))failures.push(`ACTIVE_SOURCE_REWRITE_FORBIDDEN:${rel}:${rx.source}`);}
}
const out={
  schemaVersion:'orbit360-control-plane-no-source-rewrite-guard-v3-contract-derived',
  ok:failures.length===0,
  status:failures.length?'CONTROL_PLANE_NO_SOURCE_REWRITE_FAIL':'CONTROL_PLANE_NO_SOURCE_REWRITE_PASS',
  classification:failures.length?'PIPELINE_MECHANISM_FAILURE':'PASS',
  scopeSource:CONTRACT,
  scopeMode:'MACHINE_READABLE_CONTRACT_DERIVED',
  activePaths:scope,
  activePathCount:scope.length,
  failures:[...new Set(failures)],
  runtimeExecuted:false,
  browserExecuted:false,
  secretAccess:false,
  firestoreRead:false,
  firestoreWrites:0,
  authWrites:0,
  operationalWrites:0,
  deployExecuted:false,
  productionTouched:false,
  containsPII:false,
  containsSecrets:false
};
console.log(JSON.stringify(out,null,2));if(!out.ok)process.exit(41);
