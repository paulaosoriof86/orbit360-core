#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const ACTIVE=[
  'tools/orbit360-continuity-transition-owner-v20260820.mjs',
  'tools/orbit360-control-plane-evidence-convergence-v20260822.mjs',
  'tools/orbit360-f2-exact-candidate-source-validator-v20260819.mjs',
  'tools/orbit360-test-f2-full-runtime-known-rootfixes-v20260819.mjs',
  'tools/orbit360-promote-macro2-transversal-candidate-v20260821.mjs'
];
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
const failures=[];
for(const rel of ACTIVE){
  const abs=path.join(ROOT,rel);
  if(!fs.existsSync(abs)){failures.push(`MISSING:${rel}`);continue;}
  const text=fs.readFileSync(abs,'utf8').replace(/^\uFEFF/,'');
  for(const rx of forbidden){if(rx.test(text))failures.push(`ACTIVE_SOURCE_REWRITE_FORBIDDEN:${rel}:${rx.source}`);}
}
const out={
  schemaVersion:'orbit360-control-plane-no-source-rewrite-guard-v1',
  ok:failures.length===0,
  status:failures.length?'CONTROL_PLANE_NO_SOURCE_REWRITE_FAIL':'CONTROL_PLANE_NO_SOURCE_REWRITE_PASS',
  classification:failures.length?'PIPELINE_MECHANISM_FAILURE':'PASS',
  activePaths:ACTIVE,
  failures:[...new Set(failures)],
  runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,
  firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,
  containsPII:false,containsSecrets:false
};
console.log(JSON.stringify(out,null,2));
if(!out.ok)process.exit(41);
