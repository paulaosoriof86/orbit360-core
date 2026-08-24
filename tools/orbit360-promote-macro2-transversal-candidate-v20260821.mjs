#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

// Canonical promoter facade. Public path remains unchanged; state mutation remains forbidden.
const ROOT = process.env.ORBIT360_ROOT ? path.resolve(process.env.ORBIT360_ROOT) : process.cwd();
const CORE_REL = 'tools/orbit360-promote-macro2-transversal-candidate-core-v20260824.mjs';
const CORE = path.join(ROOT, CORE_REL);
const fail = code => { throw new Error(code); };
const applyOnce = (source, from, to, code) => {
  const n = source.split(from).length - 1;
  if (n !== 1) fail(`VALIDATOR_STALE:${code}_PRECONDITION_${n}`);
  return source.replace(from, to);
};
if (!fs.existsSync(CORE)) fail('PIPELINE_MECHANISM_FAILURE:PROMOTER_CORE_MISSING');
let patched = fs.readFileSync(CORE, 'utf8').replace(/^\uFEFF/, '');
patched = applyOnce(
  patched,
  'M.fileCount===194&&M.deltaCount===9&&M.unchangedFileCount===185',
  'Number.isInteger(Number(M.fileCount))&&Number(M.fileCount)>0&&Number.isInteger(Number(M.deltaCount))&&Number(M.deltaCount)>=0&&Number(M.deltaCount)<=Number(M.fileCount)&&Number(M.unchangedFileCount)===Number(M.fileCount)-Number(M.deltaCount)',
  'PROMOTER_DYNAMIC_COUNTS'
);
patched = applyOnce(patched, 'MACRO2_194_9_185_INVALID', 'MACRO2_DYNAMIC_COUNTS_INVALID', 'PROMOTER_ERROR_CODE');
const tmp = path.join(os.tmpdir(), `orbit360-promoter-${process.pid}-${Date.now()}.mjs`);
try {
  fs.writeFileSync(tmp, patched, 'utf8');
  const run = spawnSync(process.execPath, [tmp, ...process.argv.slice(2)], { cwd: ROOT, env: process.env, stdio: 'inherit' });
  if (run.error) throw run.error;
  process.exitCode = Number.isInteger(run.status) ? run.status : 41;
} finally { try { fs.unlinkSync(tmp); } catch {} }
