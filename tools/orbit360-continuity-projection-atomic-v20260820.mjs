#!/usr/bin/env node
'use strict';
// SINGLE_STATE_COMPATIBILITY_NO_MUTATION
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
execFileSync(process.execPath,[path.join(ROOT,'tools/orbit360-single-state-invariant-v20260826.mjs')],{cwd:ROOT,stdio:'inherit'});
console.log(JSON.stringify({ok:true,status:'SINGLE_STATE_COMPATIBILITY_NO_MUTATION',stateMutation:false,projectionWrites:0,containsPII:false,containsSecrets:false},null,2));
