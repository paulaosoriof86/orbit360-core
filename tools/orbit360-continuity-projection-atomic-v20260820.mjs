#!/usr/bin/env node
'use strict';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
await import('./orbit360-continuity-projection-core-v20260825.mjs');
try{
  execFileSync(process.execPath,[path.join(ROOT,'tools/orbit360-control-plane-publication-preflight-v20260825.mjs')],{cwd:ROOT,stdio:'inherit',env:process.env});
}catch{
  process.exit(41);
}
