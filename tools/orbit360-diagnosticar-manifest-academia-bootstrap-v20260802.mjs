#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {sha} from './orbit360-policies-dual-path-provenance-lib-v20260801.mjs';
const ROOT=process.cwd();
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/gate711-academia-bootstrap-manifest-diagnostic-v20260802.json');
const roots=['orbit360-platform/index.html','orbit360-platform/modules','orbit360-platform/core','orbit360-platform/styles','orbit360-platform/data'];
const files=execFileSync('git',['ls-files','--',...roots],{cwd:ROOT,encoding:'utf8'}).split(/\r?\n/).map(x=>x.trim()).filter(Boolean).filter(file=>!file.includes('/runtime-gate-')).sort();
const rows=files.map(file=>({file,digest:sha(fs.readFileSync(path.join(ROOT,file)))}));
const changed=execFileSync('git',['diff','--name-only','6ebcb7e82545a6a6810ecf55d2cc8b8ad2783979','HEAD','--',...roots],{cwd:ROOT,encoding:'utf8'}).split(/\r?\n/).map(x=>x.trim()).filter(Boolean).filter(file=>!file.includes('/runtime-gate-')).sort();
const payload={schemaVersion:'orbit360-gate711-academia-bootstrap-manifest-diagnostic-v1',gateId:'block7-canonical-runtime-cumulative-visual-lab-v20260801',status:'GATE711_ACADEMIA_BOOTSTRAP_MANIFEST_DIAGNOSTIC_PASS',trackedFileCount:rows.length,pathDigest:sha(rows.map(row=>row.file).join('\n')),contentDigest:sha(rows.map(row=>`${row.file}:${row.digest}`).join('\n')),indexDigest:rows.find(row=>row.file==='orbit360-platform/index.html')?.digest||'',changedVisualPaths:changed,expectedChangedVisualPaths:['orbit360-platform/core/academia-static-content-write-policy-v20260729.js'],bootstrapOwnerPathPresent:fs.readFileSync(path.join(ROOT,'orbit360-platform/core/academia-static-content-write-policy-v20260729.js'),'utf8').includes('data/academia-v1230-operational-directory-v20260722.js?v=20260802-2'),secretAccess:false,firestoreRead:false,firestoreWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,reimportExecuted:false,deployExecuted:false,production:false,containsPII:false,containsValues:false,containsSecrets:false,ok:false};
payload.ok=payload.changedVisualPaths.length===1&&payload.changedVisualPaths[0]===payload.expectedChangedVisualPaths[0]&&payload.bootstrapOwnerPathPresent===true;
if(!payload.ok)payload.status='GATE711_ACADEMIA_BOOTSTRAP_MANIFEST_DIAGNOSTIC_FAIL';
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n','utf8');console.log(JSON.stringify(payload,null,2));process.exit(payload.ok?0:41);
