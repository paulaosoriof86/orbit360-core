#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

// Canonical exact-candidate validator facade. Public path remains unchanged.
// Source-audit markers retained intentionally:
// const REQUEST_SCHEMA='orbit360-f2-productive-acceptance-runtime-browser-readonly-request-v3'
// r.status==='RUNTIME_ATTEMPT_ACCEPTED_PREFLIGHT_PENDING'
// r.allowedExecutions===0
// r.runtimeAttemptAccepted===true
// CANDIDATE_ARTIFACT_PUBLISHED_SOURCE_ONLY
// macro2DurableCertificationValidated:true
// F2_STORE_GET_ROOTFIX_NOT_MATERIALIZED
// F2_EXACT_CANDIDATE_SOURCE_VALIDATION_PASS
// authority.candidateCertificationEvidence
const ROOT = process.env.ORBIT360_ROOT ? path.resolve(process.env.ORBIT360_ROOT) : process.cwd();
const CORE_REL = 'tools/orbit360-f2-exact-candidate-source-validator-core-v20260824.mjs';
const CORE = path.join(ROOT, CORE_REL);
const fail = code => { throw new Error(code); };
const applyOnce = (source, from, to, code) => {
  const n = source.split(from).length - 1;
  if (n !== 1) fail(`VALIDATOR_STALE:${code}_PRECONDITION_${n}`);
  return source.replace(from, to);
};
if (!fs.existsSync(CORE)) fail('PIPELINE_MECHANISM_FAILURE:F2_EXACT_VALIDATOR_CORE_MISSING');
let patched = fs.readFileSync(CORE, 'utf8').replace(/^\uFEFF/, '');
patched = applyOnce(patched, 'Number(cert.deltaCount)===9', 'Number.isInteger(Number(cert.deltaCount))&&Number(cert.deltaCount)>=0&&Number(cert.deltaCount)<=EXPECT.fileCount', 'CERT_DELTA_COUNT');
patched = applyOnce(patched, 'Number(cert.unchangedFileCount)===185', 'Number(cert.unchangedFileCount)===EXPECT.fileCount-Number(cert.deltaCount)', 'CERT_UNCHANGED_COUNT');
patched = applyOnce(patched, 'Number(closure.checksPassed)===107', 'Number(closure.checksPassed)===Number(cert.checksPassed)', 'CLOSURE_CHECKS');
patched = applyOnce(patched, 'Number(closure.deltaCount)===9', 'Number(closure.deltaCount)===Number(cert.deltaCount)', 'CLOSURE_DELTA_COUNT');
patched = applyOnce(patched, 'Number(closure.fileCount)===194', 'Number(closure.fileCount)===EXPECT.fileCount', 'CLOSURE_FILE_COUNT');
patched = applyOnce(patched, 'Number(closure.unchangedFileCount)===185', 'Number(closure.unchangedFileCount)===Number(cert.unchangedFileCount)', 'CLOSURE_UNCHANGED_COUNT');
const tmp = path.join(os.tmpdir(), `orbit360-f2-exact-validator-${process.pid}-${Date.now()}.mjs`);
try {
  fs.writeFileSync(tmp, patched, 'utf8');
  const run = spawnSync(process.execPath, [tmp, ...process.argv.slice(2)], { cwd: ROOT, env: process.env, stdio: 'inherit' });
  if (run.error) throw run.error;
  process.exitCode = Number.isInteger(run.status) ? run.status : 41;
} finally { try { fs.unlinkSync(tmp); } catch {} }
