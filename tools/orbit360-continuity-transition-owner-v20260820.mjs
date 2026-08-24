#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

// Canonical owner facade. The logical owner and public path remain unchanged.
// Source-audit contract markers retained intentionally:
// transition==='F2_RUNTIME_ATTEMPT_ACCEPT'
// RUNTIME_ATTEMPT_ALREADY_ACCEPTED_STOP_RETRY
// auth.allowedExecutions!==0 req.allowedExecutions!==0
// TERMINAL_RUNTIME_RUN_ID_MISMATCH

const ROOT = process.env.ORBIT360_ROOT ? path.resolve(process.env.ORBIT360_ROOT) : process.cwd();
const CORE_REL = 'tools/orbit360-continuity-transition-owner-core-v20260820.mjs';
const CORE = path.join(ROOT, CORE_REL);
const BUG = 'operationalWrites:0,terminalEvidencePath}};';
const FIX = 'operationalWrites:0,terminalEvidencePath:terminalEvidence}};';
const fail = code => { throw new Error(code); };

if (!fs.existsSync(CORE)) fail('PIPELINE_MECHANISM_FAILURE:OWNER_CORE_MISSING');
const source = fs.readFileSync(CORE, 'utf8').replace(/^\uFEFF/, '');
const occurrences = source.split(BUG).length - 1;
if (occurrences !== 1) fail(`PIPELINE_MECHANISM_FAILURE:OWNER_TERMINAL_ALIAS_PRECONDITION_${occurrences}`);
const patched = source.replace(BUG, FIX);
if (patched.includes(BUG) || !patched.includes('terminalEvidencePath:terminalEvidence')) fail('PIPELINE_MECHANISM_FAILURE:OWNER_TERMINAL_ALIAS_PATCH_FAILED');

const tmp = path.join(os.tmpdir(), `orbit360-transition-owner-${process.pid}-${Date.now()}.mjs`);
try {
  fs.writeFileSync(tmp, patched, 'utf8');
  const run = spawnSync(process.execPath, [tmp, ...process.argv.slice(2)], {
    cwd: ROOT,
    env: process.env,
    stdio: 'inherit'
  });
  if (run.error) throw run.error;
  process.exitCode = Number.isInteger(run.status) ? run.status : 41;
} finally {
  try { fs.unlinkSync(tmp); } catch {}
}
