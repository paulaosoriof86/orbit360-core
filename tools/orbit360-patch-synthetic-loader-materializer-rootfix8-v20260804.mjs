#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const rel = 'tools/orbit360-materializar-block12-synthetic-loader-rootfix-v20260804.mjs';
const file = path.join(ROOT, rel);
let source = fs.readFileSync(file, 'utf8');
function replaceExact(before, after, code) {
  if (source.includes(after)) return;
  if (!source.includes(before)) throw new Error(`PIPELINE_MECHANISM_FAILURE:${code}`);
  source = source.replace(before, () => after);
}
replaceExact('return source.replace(before, after);', 'return source.replace(before, () => after);', 'FUNCTION_REPLACEMENT');
source = source.replaceAll('rootfix7-v20260804', 'rootfix8-v20260804');
source = source.replaceAll('ROOTFIX7', 'ROOTFIX8');
source = source.replaceAll('rootfix7', 'rootfix8');
source = source.replaceAll('12.0.6', '12.0.7');
source = source.replaceAll('OPERATIONAL_RUNTIME_LAB_SYNTHETIC_LOADER_ROOTFIX_READY', 'OPERATIONAL_RUNTIME_LAB_SYNTHETIC_LOADER_MATERIALIZER_ROOTFIX_READY');
source = source.replaceAll('orbit360-block12-operational-runtime-lab-rootfix7-request-v1', 'orbit360-block12-operational-runtime-lab-rootfix8-request-v1');
source = source.replaceAll('AUTHORIZED_AFTER_SYNTHETIC_LOADER_ROOTFIX', 'AUTHORIZED_AFTER_MATERIALIZER_SAFE_SYNTHETIC_LOADER_ROOTFIX');
source = source.replaceAll('backend-lab-loader.js?v=20260804-operational-rootfix7', 'backend-lab-loader.js?v=20260804-operational-rootfix8');
source = source.replaceAll('backend-lab-init.js?v=20260804-operational-rootfix7', 'backend-lab-init.js?v=20260804-operational-rootfix8');
const requestAnchor = "request.previousRuntimeRunId === 30959959221 && request.previousRuntimeStatus === 'failure' && request.previousFailureClassification === 'DATA_CONTRACT_FAILURE' && request.previousFailureCode === 'SYNTHETIC_TENANT_BLOCKED_BY_LAB_LOADER_ALLOWLIST'";
const requestReplacement = requestAnchor + " && request.previousStaticRunId === 30960388102 && request.previousStaticFailureClassification === 'PIPELINE_MECHANISM_FAILURE' && request.previousStaticFailureCode === 'STRING_REPLACEMENT_DOLLAR_APOSTROPHE_CORRUPTED_ENGINE' && request.previousStaticRunStoppedBeforeGate === true";
replaceExact(requestAnchor, requestReplacement, 'REQUEST_STATIC_FAILURE_BINDING');
fs.writeFileSync(file, source, 'utf8');
const requiredTokens = [
  'return source.replace(before, () => after);',
  'rootfix8-v20260804',
  "const VERSION = '12.0.7'",
  'OPERATIONAL_RUNTIME_LAB_SYNTHETIC_LOADER_MATERIALIZER_ROOTFIX_READY',
  'AUTHORIZED_AFTER_MATERIALIZER_SAFE_SYNTHETIC_LOADER_ROOTFIX',
  'previousStaticRunId === 30960388102',
  'backend-lab-loader.js?v=20260804-operational-rootfix8'
];
for (const token of requiredTokens) if (!source.includes(token)) throw new Error(`PIPELINE_MECHANISM_FAILURE:ROOTFIX8_PATCH_MISSING:${token}`);
console.log(JSON.stringify({
  schemaVersion:'orbit360-synthetic-loader-materializer-rootfix8-patch-v1',
  status:'SYNTHETIC_LOADER_MATERIALIZER_REPLACEMENT_SAFE',
  previousStaticRunId:30960388102,
  previousFailure:'STRING_REPLACEMENT_DOLLAR_APOSTROPHE_CORRUPTED_ENGINE',
  functionReplacement:true,
  targetContractVersion:'12.0.7',
  secretAccess:false,
  firestoreRead:false,
  deployExecuted:false,
  ok:true
}, null, 2));
