#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/gate711-post-rootfix-manifest-v20260802.json');
const OLD_PRODUCT='997fca628f95dd397dba347700a6bc644fe840f0';
const NEW_PRODUCT='267f7231b46d65b80c167f54567a67503b6a6793';
const roots=['orbit360-platform/index.html','orbit360-platform/modules','orbit360-platform/core','orbit360-platform/styles','orbit360-platform/data'];
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const lines=value=>String(value||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
const files=lines(execFileSync('git',['ls-files','--',...roots],{cwd:ROOT,encoding:'utf8'})).filter(file=>!file.includes('/runtime-gate-')).sort();
const rows=files.map(file=>({file,digest:sha(fs.readFileSync(path.join(ROOT,file)))}));
const changed=lines(execFileSync('git',['diff','--name-only',OLD_PRODUCT,'HEAD','--',...roots],{cwd:ROOT,encoding:'utf8'})).filter(file=>!file.includes('/runtime-gate-')).sort();
const expectedChanged=['orbit360-platform/index.html','orbit360-platform/modules/crm-v1198-operational-bridge.js'];
const rootCounts={
 index:files.filter(f=>f==='orbit360-platform/index.html').length,
 modules:files.filter(f=>f.startsWith('orbit360-platform/modules/')).length,
 core:files.filter(f=>f.startsWith('orbit360-platform/core/')).length,
 styles:files.filter(f=>f.startsWith('orbit360-platform/styles/')).length,
 data:files.filter(f=>f.startsWith('orbit360-platform/data/')).length
};
const payload={
 schemaVersion:'orbit360-gate711-post-rootfix-manifest-evidence-v1',
 gateId:'block7-canonical-runtime-cumulative-visual-lab-v20260801',
 oldProductHead:OLD_PRODUCT,
 productHead:NEW_PRODUCT,
 status:'GATE711_POST_ROOTFIX_MANIFEST_PASS',
 trackedFileCount:rows.length,
 rootCounts,
 pathDigest:sha(rows.map(row=>row.file).join('\n')),
 contentDigest:sha(rows.map(row=>`${row.file}:${row.digest}`).join('\n')),
 indexDigest:rows.find(row=>row.file==='orbit360-platform/index.html')?.digest||'',
 changedProductPaths:changed,
 expectedChangedProductPaths:expectedChanged,
 rootFixPresent:fs.readFileSync(path.join(ROOT,'orbit360-platform/modules/crm-v1198-operational-bridge.js'),'utf8').includes('Orbit.__crmV1198GuardRegistry'),
 unsafeInternalRegistryAbsent:!fs.readFileSync(path.join(ROOT,'orbit360-platform/modules/crm-v1198-operational-bridge.js'),'utf8').includes('mod.__guardV1198[actionName]'),
 indexVersionPresent:fs.readFileSync(path.join(ROOT,'orbit360-platform/index.html'),'utf8').includes('modules/crm-v1198-operational-bridge.js?v=20260802-1'),
 secretsAccessed:false,firestoreReads:0,firestoreWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false,ok:false
};
payload.ok=payload.trackedFileCount===309&&JSON.stringify(payload.rootCounts)===JSON.stringify({index:1,modules:62,core:183,styles:10,data:53})&&payload.pathDigest==='517056dee1200503b2e7295a333cb804bc71271bbaa87847fa762da025f276f1'&&JSON.stringify(changed)===JSON.stringify(expectedChanged)&&payload.rootFixPresent&&payload.unsafeInternalRegistryAbsent&&payload.indexVersionPresent;
if(!payload.ok)payload.status='GATE711_POST_ROOTFIX_MANIFEST_FAIL';
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n','utf8');console.log(JSON.stringify(payload,null,2));process.exit(payload.ok?0:41);
