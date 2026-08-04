#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const file = path.join(process.cwd(), 'tools/orbit360-validar-gate-contracts-engine-block12-operational-runtime-lab-v20260804.mjs');
let source = fs.readFileSync(file, 'utf8');
const before = "harness.includes('if (browser) await browser.close().catch') && center.includes('withTimeout') && rootfixWorkflow.includes('timeout --signal=TERM --kill-after=15s 420s')";
const after = "harness.includes('if (browser) await browser.close().catch') && readText('orbit360-platform/core/runtime-verification-center-v20260804.js').includes('withTimeout') && rootfixWorkflow.includes('timeout --signal=TERM --kill-after=15s 420s')";
if (!source.includes(after)) {
  if (!source.includes(before)) throw new Error('VALIDATOR_STALE:BROWSER_HARNESS_CHECK_REFERENCE_NOT_FOUND');
  source = source.replace(before, after);
  fs.writeFileSync(file, source, 'utf8');
}
if (!source.includes(after)) throw new Error('VALIDATOR_STALE:BROWSER_HARNESS_CHECK_NOT_ORDER_SAFE');
console.log(JSON.stringify({
  schemaVersion:'orbit360-block12-browser-harness-engine-fix-v1',
  status:'BROWSER_HARNESS_GATE_CHECK_ORDER_SAFE',
  secretAccess:false,
  firestoreRead:false,
  deployExecuted:false,
  ok:true
}, null, 2));
