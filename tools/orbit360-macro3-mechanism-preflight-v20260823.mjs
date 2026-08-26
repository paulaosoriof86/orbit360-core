#!/usr/bin/env node
'use strict';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const OWNER=path.join(ROOT,'tools/orbit360-release-readiness-minimal-v20260826.mjs');
const r=spawnSync(process.execPath,[OWNER],{cwd:ROOT,encoding:'utf8',env:process.env,maxBuffer:32*1024*1024});
let detail={};
try{detail=JSON.parse(String(r.stdout||'').trim());}catch{}
const pass=r.status===0&&detail.ok===true&&detail.status==='CONTROL_PLANE_RELEASE_READINESS_PASS'&&detail.minimalReleaseReadinessPass===true;
const out={
  ...detail,
  schemaVersion:'orbit360-macro3-mechanism-preflight-v16-minimal-release-readiness',
  ok:pass,
  status:pass?'MACRO3_MECHANISM_PREFLIGHT_PASS':'MACRO3_MECHANISM_PREFLIGHT_FAIL',
  classification:pass?'PASS':'PIPELINE_MECHANISM_FAILURE',
  delegatedReleaseReadinessOwner:'tools/orbit360-release-readiness-minimal-v20260826.mjs',
  legacySyntheticRecoveryHarnessBlocking:false,
  syntheticPreRiskAuthorizationReuseBlocking:false,
  runtimeExecuted:false,
  browserExecuted:false,
  secretAccess:false,
  firestoreRead:false,
  firestoreWrites:0,
  authWrites:0,
  operationalWrites:0,
  deployExecuted:false,
  productionTouched:false,
  containsPII:false,
  containsSecrets:false
};
if(!pass&&!out.failures?.length)out.failures=[`DELEGATED_RELEASE_READINESS_FAIL:${String(r.stderr||r.stdout||'').slice(-700)}`];
console.log(JSON.stringify(out,null,2));
if(!pass)process.exit(41);
