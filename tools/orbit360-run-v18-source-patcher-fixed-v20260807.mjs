#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const sourceFile = 'tools/orbit360-apply-v18-hydration-transactional-rootfix-v20260807.mjs';
const source = fs.readFileSync(sourceFile, 'utf8');
const needle = 'run=${GITHUB_RUN_ID:-local}';
if (!source.includes(needle)) {
  console.error('STOP_V18_PATCHER_ESCAPE_ANCHOR_MISSING');
  process.exit(41);
}
const fixed = source.replace(needle, 'run=\\${GITHUB_RUN_ID:-local}');
const temp = path.join(os.tmpdir(), `orbit360-v18-patcher-${process.pid}.mjs`);
fs.writeFileSync(temp, fixed, 'utf8');
const syntax = spawnSync(process.execPath, ['--check', temp], { encoding: 'utf8' });
if (syntax.status !== 0) {
  console.error(syntax.stderr || syntax.stdout || 'STOP_V18_PATCHER_STILL_INVALID');
  process.exit(42);
}
const run = spawnSync(process.execPath, [temp], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
if (run.stdout) process.stdout.write(run.stdout);
if (run.stderr) process.stderr.write(run.stderr);
try { fs.unlinkSync(temp); } catch {}
process.exit(run.status == null ? 43 : run.status);