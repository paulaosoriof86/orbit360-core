#!/usr/bin/env node
'use strict';
// Compatibility entrypoint retained for the canonical workflow.
// The former self-referential scratch lifecycle harness was retired from the
// production critical path after repeated PIPELINE_MECHANISM_FAILURE loops.
// Initial F2 readiness is now owned by the deterministic source-only controller.
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const OWNER=path.join(ROOT,'tools/orbit360-release-readiness-minimal-v20260826.mjs');
const r=spawnSync(process.execPath,[OWNER],{cwd:ROOT,encoding:'utf8',env:process.env});
if(r.stdout)process.stdout.write(r.stdout);
if(r.stderr)process.stderr.write(r.stderr);
process.exitCode=Number.isInteger(r.status)?r.status:41;
