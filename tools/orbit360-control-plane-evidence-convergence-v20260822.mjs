#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.env.ORBIT360_ROOT ? path.resolve(process.env.ORBIT360_ROOT) : process.cwd();
const CORE = path.join(ROOT, 'tools/orbit360-control-plane-evidence-convergence-core-v20260824.mjs');
const fail = code => { throw new Error(code); };
const applyOnce = (source, from, to, code) => {
  const n = source.split(from).length - 1;
  if (n !== 1) fail(`VALIDATOR_STALE:${code}_PRECONDITION_${n}`);
  return source.replace(from, to);
};
if (!fs.existsSync(CORE)) fail('PIPELINE_MECHANISM_FAILURE:CONVERGENCE_CORE_MISSING');
let patched = fs.readFileSync(CORE, 'utf8').replace(/^\uFEFF/, '');
patched = applyOnce(
  patched,
  'M.fileCount===194&&M.deltaCount===9&&M.unchangedFileCount===185',
  'Number.isInteger(Number(M.fileCount))&&Number(M.fileCount)>0&&Number.isInteger(Number(M.deltaCount))&&Number(M.deltaCount)>=0&&Number(M.deltaCount)<=Number(M.fileCount)&&Number(M.unchangedFileCount)===Number(M.fileCount)-Number(M.deltaCount)',
  'CONVERGENCE_DYNAMIC_COUNTS'
);
const tmp = path.join(os.tmpdir(), `orbit360-convergence-${process.pid}-${Date.now()}.mjs`);
try {
  fs.writeFileSync(tmp, patched, 'utf8');
  await import(pathToFileURL(tmp).href);
} finally { try { fs.unlinkSync(tmp); } catch {} }
