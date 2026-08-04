#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ROUTER = path.join(ROOT, 'tools/orbit360-validar-gate-contracts-v20260717.mjs');
let source = fs.readFileSync(ROUTER, 'utf8');
function replaceExact(before, after, code) {
  if (source.includes(after)) return;
  if (!source.includes(before)) throw new Error(`VALIDATOR_STALE:${code}`);
  source = source.replace(before, after);
}
replaceExact(
  '"block12-runtime-hang-rescue-lab-v20260804":{contractVersion:"12.0.3",lifecycle:"tools/orbit360-validator-lifecycle-contract-block12-runtime-hang-rescue-lab-v20260804.json",engine:"tools/orbit360-validar-gate-contracts-engine-block12-runtime-hang-rescue-lab-v20260804.mjs"}',
  '"block12-runtime-hang-rescue-lab-v20260804":{contractVersion:"12.0.4",lifecycle:"tools/orbit360-validator-lifecycle-contract-block12-runtime-hang-rescue-lab-v20260804.json",engine:"tools/orbit360-validar-gate-contracts-engine-block12-runtime-hang-rescue-lab-v20260804.mjs"}',
  'RESCUE_GATE_VERSION'
);
replaceExact(
  '"OPERATIONAL_RUNTIME_LAB_EXECUTION":{secrets:true,firestoreRead:true,writes:true,runtime:true,browser:true,deploy:true,functionsDeploy:true,rulesDeploy:false,production:false}\n});',
  '"OPERATIONAL_RUNTIME_LAB_EXECUTION":{secrets:true,firestoreRead:true,writes:true,runtime:true,browser:true,deploy:true,functionsDeploy:true,rulesDeploy:false,production:false},\n  "RUNTIME_HANG_RESCUE_LAB_EXECUTION":{secrets:true,firestoreRead:true,writes:true,runtime:false,browser:false,deploy:true,functionsDeploy:true,rulesDeploy:false,production:false}\n});',
  'RESCUE_PHASE_PROFILE'
);
fs.writeFileSync(ROUTER, source, 'utf8');
for (const token of ['contractVersion:"12.0.4"','"RUNTIME_HANG_RESCUE_LAB_EXECUTION"']) {
  if (!source.includes(token)) throw new Error(`VALIDATOR_STALE:RESCUE_ROOTFIX_TOKEN_MISSING:${token}`);
}
console.log(JSON.stringify({
  schemaVersion:'orbit360-block12-runtime-hang-rescue-rootfix-materialization-v1',
  status:'RUNTIME_HANG_RESCUE_ROOTFIX_MATERIALIZED',
  gateId:'block12-runtime-hang-rescue-lab-v20260804',
  contractVersion:'12.0.4',
  canonicalPhase:'RUNTIME_HANG_RESCUE_LAB_EXECUTION',
  previousRescueRunId:30959160007,
  previousFailure:'CANONICAL_LIFECYCLE_PHASE_MISMATCH',
  secretAccess:false,
  firestoreRead:false,
  deployExecuted:false,
  ok:true
}, null, 2));
