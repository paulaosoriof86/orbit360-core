#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ROUTER = path.join(ROOT, 'tools/orbit360-validar-gate-contracts-v20260717.mjs');
let source = fs.readFileSync(ROUTER, 'utf8');
const token = '"block12-runtime-hang-rescue-lab-v20260804"';
if (!source.includes(token)) {
  const before = '"block12-operational-runtime-lab-v20260804":{contractVersion:"12.0.2",lifecycle:"tools/orbit360-validator-lifecycle-contract-block12-operational-runtime-lab-v20260804.json",engine:"tools/orbit360-validar-gate-contracts-engine-block12-operational-runtime-lab-v20260804.mjs"}';
  const after = before + ',\n  "block12-runtime-hang-rescue-lab-v20260804":{contractVersion:"12.0.3",lifecycle:"tools/orbit360-validator-lifecycle-contract-block12-runtime-hang-rescue-lab-v20260804.json",engine:"tools/orbit360-validar-gate-contracts-engine-block12-runtime-hang-rescue-lab-v20260804.mjs"}';
  if (!source.includes(before)) throw new Error('VALIDATOR_STALE:BLOCK12_1202_ROUTER_ENTRY_NOT_FOUND');
  source = source.replace(before, after);
  fs.writeFileSync(ROUTER, source, 'utf8');
}
const required = [
  'tools/orbit360-validator-lifecycle-contract-block12-runtime-hang-rescue-lab-v20260804.json',
  'tools/orbit360-validar-gate-contracts-engine-block12-runtime-hang-rescue-lab-v20260804.mjs',
  'tools/orbit360-block12-runtime-hang-rescue-v20260804.mjs',
  '.github/workflows/orbit360-block12-runtime-hang-rescue-lab-v20260804.yml'
];
for (const rel of required) if (!fs.existsSync(path.join(ROOT, rel))) throw new Error(`PIPELINE_MECHANISM_FAILURE:REQUIRED_FILE_MISSING:${rel}`);
if (!fs.readFileSync(ROUTER, 'utf8').includes(token)) throw new Error('VALIDATOR_STALE:RESCUE_GATE_NOT_REGISTERED');
console.log(JSON.stringify({ schemaVersion:'orbit360-block12-runtime-hang-rescue-materialization-v1', status:'RUNTIME_HANG_RESCUE_GATE_MATERIALIZED', gateId:'block12-runtime-hang-rescue-lab-v20260804', contractVersion:'12.0.3', targetRunId:30956309298, secretAccess:false, firestoreRead:false, deployExecuted:false, ok:true }, null, 2));
