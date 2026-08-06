#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const FILE = 'tools/orbit360-prepare-visual-matrix-corrected-post-auth-gate-v20260805.mjs';
let source = fs.readFileSync(FILE, 'utf8');
const replacements = [
  ["'','','```text','run: '+final.runId", "'','','~~~text','run: '+final.runId"],
  ["'Functions/Rules/reimport/production/main/merge: 0','```','',pass?", "'Functions/Rules/reimport/production/main/merge: 0','~~~','',pass?"]
];
for (const [before, after] of replacements) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error('PIPELINE_MECHANISM_FAILURE_TEMPLATE_TOKEN_COUNT_' + count);
  source = source.replace(before, after);
}
fs.writeFileSync(FILE, source, 'utf8');
const check = spawnSync(process.execPath, ['--check', FILE], { encoding: 'utf8' });
if (check.status !== 0) {
  process.stderr.write(check.stderr || check.stdout || 'syntax check failed');
  process.exit(41);
}
console.log(JSON.stringify({
  status: 'PASS_PREPARER_TEMPLATE_REPAIR',
  classification: 'PIPELINE_MECHANISM_FAILURE_CLOSED_SOURCE_ONLY',
  replacements: replacements.length,
  secretsRead: false,
  browserExecuted: false,
  deployExecuted: false,
  ok: true
}, null, 2));
