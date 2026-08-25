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
if(contract.behavioralContractPolicy?.activeSourceFileWritesForbidden!==true)failures.push('ACTIVE_SOURCE_WRITE_POLICY_MISSING');
if(contract.behavioralContractPolicy?.temporaryInfrastructureUsageAllowed!==true)failures.push('TEMPORARY_INFRASTRUCTURE_POLICY_MISSING');
if(scope.length<10)failures.push('SOURCE_REWRITE_SCOPE_NOT_CLASS_WIDE');

// Static layer: reject only explicit write targets that are active JavaScript source.
// Temporary directories, detached worktrees, spawn/import helpers and variable names
// are not source mutations by themselves and must not be treated as behavioral proof.
const forbiddenSourceWrites=[
  /fs\.(?:writeFileSync|appendFileSync)\s*\(\s*(?:ROUTER|SOURCE|CORE|TARGET|[A-Z_]*_SOURCE)\b/,
  /fs\.(?:writeFileSync|appendFileSync)\s*\(\s*['"][^'"]+\.(?:mjs|cjs|js)['"]/,
  /fs\.(?:writeFileSync|appendFileSync)\s*\(\s*(?:path\.join|A)\([^\n)]*['"][^'"]+\.(?:mjs|cjs|js)['"]/,
  /fs\.(?:renameSync|copyFileSync)\s*\([^\n,]+,\s*['"][^'"]+\.(?:mjs|cjs|js)['"]/,
  /fs\.(?:renameSync|copyFileSync)\s*\([^\n,]+,\s*(?:path\.join|A)\([^\n)]*['"][^'"]+\.(?:mjs|cjs|js)['"]/,
  /fs\.promises\.(?:writeFile|appendFile|rename|copyFile)\s*\(\s*['"][^'"]+\.(?:mjs|cjs|js)['"]/,
  /await\s+fs\.promises\.(?:writeFile|appendFile)\s*\(\s*(?:ROUTER|SOURCE|CORE|TARGET|[A-Z_]*_SOURCE)\b/
];
for(const rel of scope){
  if(typeof rel!=='string'||!rel.startsWith('tools/')){failures.push(`INVALID_SCOPE_ENTRY:${String(rel)}`);continue;}
  const abs=A(rel);
  if(!fs.existsSync(abs)){failures.push(`MISSING:${rel}`);continue;}
  const text=fs.readFileSync(abs,'utf8').replace(/^\uFEFF/,'');
  for(const rx of forbiddenSourceWrites){if(rx.test(text))failures.push(`ACTIVE_SOURCE_WRITE_FORBIDDEN:${rel}:${rx.source}`);}
}
const out={
  schemaVersion:'orbit360-control-plane-no-source-rewrite-guard-v5-source-write-target-semantic',
  ok:failures.length===0,
  status:failures.length?'CONTROL_PLANE_NO_SOURCE_REWRITE_FAIL':'CONTROL_PLANE_NO_SOURCE_REWRITE_PASS',
  classification:failures.length?'PIPELINE_MECHANISM_FAILURE':'PASS',
  scopeSource:CONTRACT,
  scopeMode:'MACHINE_READABLE_CONTRACT_DERIVED',
  validationMode:'SOURCE_WRITE_TARGET_STATIC_GUARD_PLUS_BEHAVIORAL_IMMUTABILITY_TEST',
  activePaths:scope,
  activePathCount:scope.length,
  sourceWritePatternsForbidden:true,
  temporaryInfrastructureAllowed:true,
  contextFreeTemporaryUsageHeuristicsForbidden:true,
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
