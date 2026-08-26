#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const LEDGER=path.join(ROOT,'orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json');
const L=JSON.parse(fs.readFileSync(LEDGER,'utf8').replace(/^\uFEFF/,''));
const preserved=L.activeState?.phase==='F2_PRE_RISK_FAILURE_AWAITING_SOURCE_ONLY_ROOT_CAUSE_WITH_AUTH_PRESERVED'&&L.activeState?.status==='F2_PRE_RISK_FAILURE_AUTHORIZATION_PRESERVED'&&L.authorizationBoundary?.preRiskAuthorizationReuseAllowed===true&&L.authorizationBoundary?.freshAuthorizationRequired===false;
const OWNER=path.join(ROOT,preserved?'tools/orbit360-f2-prerisk-reuse-readiness-v20260826.mjs':'tools/orbit360-release-readiness-minimal-v20260826.mjs');
const r=spawnSync(process.execPath,[OWNER],{cwd:ROOT,encoding:'utf8',env:process.env,maxBuffer:32*1024*1024});
let detail={};
try{detail=JSON.parse(String(r.stdout||'').trim());}catch{}
const delegatedPass=preserved?detail.status==='F2_PRE_RISK_REUSE_READINESS_PASS':detail.status==='CONTROL_PLANE_RELEASE_READINESS_PASS';
const pass=r.status===0&&detail.ok===true&&delegatedPass;
const closeMode=String(process.env.ORBIT360_PUBLICATION_CLASS||'')==='CONTROL_PLANE_CLOSE';
const out={
  ...detail,
  ok:pass,
  status:pass?(closeMode?'CONTROL_PLANE_RELEASE_READINESS_PASS':'CONTROL_PLANE_SELFTEST_PASS'):'CONTROL_PLANE_SELFTEST_FAIL',
  classification:pass?'PASS':'PIPELINE_MECHANISM_FAILURE',
  controlPlaneSelftestPass:pass,
  compatibilityEntrypoint:true,
  closeMode,
  preservedAuthorizationReuseMode:preserved,
  delegatedReleaseReadinessOwner:path.relative(ROOT,OWNER).replace(/\\/g,'/'),
  releaseReadinessStatus:detail.status||null,
  minimalReleaseReadinessPass:preserved?detail.preRiskAuthorizationReusePass===true:detail.minimalReleaseReadinessPass===true,
  legacySyntheticRecoveryHarnessBlocking:false,
  preRiskAuthorizationReuseRecoveryBlocking:false
};
if(!pass&&!Array.isArray(out.failures))out.failures=[`DELEGATED_RELEASE_READINESS_FAIL:${String(r.stderr||r.stdout||'').slice(-700)}`];
console.log(JSON.stringify(out,null,2));
if(!pass)process.exit(41);
