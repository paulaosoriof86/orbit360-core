#!/usr/bin/env node
'use strict';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const TARGET=path.join(ROOT,'tools/orbit360-f2-gate-semantic-v20260824.mjs');
const run=spawnSync(process.execPath,[TARGET,...process.argv.slice(2)],{cwd:ROOT,env:process.env,stdio:'inherit'});
if(run.error)throw run.error;
process.exitCode=Number.isInteger(run.status)?run.status:41;
