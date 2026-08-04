#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const write = (rel, value) => fs.writeFileSync(path.join(ROOT, rel), value, 'utf8');
function replaceExact(source, before, after, code) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) throw new Error(`PIPELINE_MECHANISM_FAILURE:${code}`);
  return source.replace(before, () => after);
}

{
  const rel = 'orbit360-platform/core/backend-lab-loader.js';
  let source = read(rel);
  source = replaceExact(source, 'Backend LAB loader v1.113', 'Backend LAB loader v1.114', 'LOADER_VERSION');
  source = replaceExact(
    source,
    "    write('https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js');\n    write('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js');\n    write(configSource);",
    "    write('https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js');\n    write('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js');\n    write('https://www.gstatic.com/firebasejs/9.23.0/firebase-functions-compat.js');\n    write(configSource);",
    'FUNCTIONS_COMPAT_SDK'
  );
  source = replaceExact(
    source,
    "loaderVersion: 'v1.113-synthetic-verification-fail-closed',",
    "loaderVersion: 'v1.114-callable-sdk-fail-closed',",
    'LOADER_RUNTIME_VERSION'
  );
  write(rel, source);
}

{
  const rel = 'orbit360-platform/index.html';
  let source = read(rel);
  source = replaceExact(
    source,
    'backend-lab-loader.js?v=20260804-operational-rootfix8',
    'backend-lab-loader.js?v=20260804-operational-rootfix9',
    'INDEX_LOADER_CACHE_BUST'
  );
  source = replaceExact(
    source,
    'backend-lab-init.js?v=20260804-operational-rootfix8',
    'backend-lab-init.js?v=20260804-operational-rootfix9',
    'INDEX_INIT_CACHE_BUST'
  );
  write(rel, source);
}

{
  const rel = 'tools/orbit360-validar-gate-contracts-v20260717.mjs';
  let source = read(rel);
  source = replaceExact(
    source,
    '"block12-operational-runtime-lab-v20260804":{contractVersion:"12.0.7",lifecycle:"tools/orbit360-validator-lifecycle-contract-block12-operational-runtime-lab-v20260804.json",engine:"tools/orbit360-validar-gate-contracts-engine-block12-operational-runtime-lab-v20260804.mjs"}',
    '"block12-operational-runtime-lab-v20260804":{contractVersion:"12.0.8",lifecycle:"tools/orbit360-validator-lifecycle-contract-block12-operational-runtime-lab-v20260804.json",engine:"tools/orbit360-validar-gate-contracts-engine-block12-operational-runtime-lab-v20260804.mjs"}',
    'ROUTER_VERSION_1208'
  );
  write(rel, source);
}

{
  const rel = 'tools/orbit360-validar-gate-contracts-engine-block12-operational-runtime-lab-v20260804.mjs';
  let source = read(rel);
  source = replaceExact(source, "const VERSION = '12.0.7';", "const VERSION = '12.0.8';", 'ENGINE_VERSION_1208');
  source = replaceExact(
    source,
    "const REQUEST = process.env.ORBIT360_REQUEST_FILE || '.github/orbit360-requests/block12-operational-runtime-lab-rootfix8-v20260804.json';",
    "const REQUEST = process.env.ORBIT360_REQUEST_FILE || '.github/orbit360-requests/block12-operational-runtime-lab-rootfix9-v20260804.json';",
    'ENGINE_REQUEST_ROOTFIX9'
  );
  source = replaceExact(
    source,
    "  '.github/workflows/orbit360-block12-operational-runtime-lab-rootfix8-v20260804.yml',",
    "  '.github/workflows/orbit360-block12-operational-runtime-lab-rootfix9-v20260804.yml',",
    'ENGINE_WORKFLOW_REQUIRED_ROOTFIX9'
  );
  source = replaceExact(
    source,
    "lifecycle.status === 'OPERATIONAL_RUNTIME_LAB_SYNTHETIC_LOADER_MATERIALIZER_ROOTFIX_READY'",
    "lifecycle.status === 'OPERATIONAL_RUNTIME_LAB_FUNCTIONS_SDK_ROOTFIX_READY'",
    'ENGINE_LIFECYCLE_ROOTFIX9'
  );
  source = replaceExact(
    source,
    "  const rootfixWorkflow = readText('.github/workflows/orbit360-block12-operational-runtime-lab-rootfix8-v20260804.yml');",
    "  const rootfixWorkflow = readText('.github/workflows/orbit360-block12-operational-runtime-lab-rootfix9-v20260804.yml');",
    'ENGINE_WORKFLOW_READ_ROOTFIX9'
  );
  source = replaceExact(
    source,
    "index.includes('backend-lab-loader.js?v=20260804-operational-rootfix8')",
    "index.includes('backend-lab-loader.js?v=20260804-operational-rootfix9')",
    'ENGINE_INDEX_ROOTFIX9'
  );
  const anchor = "  add('MATERIALIZER_REPLACEMENT_SAFE', scope.materializerUsesFunctionReplacement === true && scope.engineSyntaxPassRequired === true && loaderMaterializer.includes('return source.replace(before, () => after);'));";
  const addition = anchor + "\n  add('FUNCTIONS_SDK_CONTRACT', scope.firebaseFunctionsCompatSdkRequired === true && scope.callableSdkReadinessRequired === true && loader.includes('firebase-functions-compat.js') && center.includes(\"typeof firebase.functions !== 'function'\") && rootfixWorkflow.includes('callableSdkReady'));";
  source = replaceExact(source, anchor, addition, 'ENGINE_FUNCTIONS_SDK_CHECK');
  write(rel, source);
}

const assertions = [
  ['orbit360-platform/core/backend-lab-loader.js', 'firebase-functions-compat.js'],
  ['orbit360-platform/core/backend-lab-loader.js', 'v1.114-callable-sdk-fail-closed'],
  ['orbit360-platform/index.html', 'backend-lab-loader.js?v=20260804-operational-rootfix9'],
  ['tools/orbit360-validar-gate-contracts-v20260717.mjs', 'contractVersion:"12.0.8"'],
  ['tools/orbit360-validar-gate-contracts-engine-block12-operational-runtime-lab-v20260804.mjs', "const VERSION = '12.0.8'"],
  ['tools/orbit360-validar-gate-contracts-engine-block12-operational-runtime-lab-v20260804.mjs', 'FUNCTIONS_SDK_CONTRACT']
];
for (const [rel, token] of assertions) {
  if (!read(rel).includes(token)) throw new Error(`PIPELINE_MECHANISM_FAILURE:FUNCTIONS_SDK_ROOTFIX_ASSERTION:${rel}:${token}`);
}
console.log(JSON.stringify({
  schemaVersion: 'orbit360-block12-functions-sdk-rootfix-materialization-v1',
  status: 'BLOCK12_FUNCTIONS_SDK_ROOTFIX_MATERIALIZED',
  gateContractVersion: '12.0.8',
  previousRuntimeRunId: 30960978418,
  previousFailure: 'OP-001',
  rootCause: 'FIREBASE_FUNCTIONS_COMPAT_SDK_NOT_LOADED',
  functionsCompatSdkLoaded: true,
  callableSdkGateCheck: true,
  secretAccess: false,
  firestoreRead: false,
  deployExecuted: false,
  ok: true
}, null, 2));
