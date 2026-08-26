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
const closeMode=String(process.env.ORBIT360_PUBLICATION_CLASS||'')==='CONTROL_PLANE_CLOSE';
const out={
  ...detail,
  ok:pass,
  status:pass?(closeMode?'CONTROL_PLANE_RELEASE_READINESS_PASS':'CONTROL_PLANE_SELFTEST_PASS'):'CONTROL_PLANE_SELFTEST_FAIL',
  classification:pass?'PASS':'PIPELINE_MECHANISM_FAILURE',
  controlPlaneSelftestPass:pass,
  compatibilityEntrypoint:true,
  closeMode,
  delegatedReleaseReadinessOwner:'tools/orbit360-release-readiness-minimal-v20260826.mjs',
  releaseReadinessStatus:detail.status||null,
  minimalReleaseReadinessPass:detail.minimalReleaseReadinessPass===true,
  legacySyntheticRecoveryHarnessBlocking:false,
  preRiskAuthorizationReuseRecoveryBlocking:false
};
if(!pass&&!Array.isArray(out.failures))out.failures=[`DELEGATED_RELEASE_READINESS_FAIL:${String(r.stderr||r.stdout||'').slice(-700)}`];
console.log(JSON.stringify(out,null,2));
if(!pass)process.exit(41);
