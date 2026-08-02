#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';

const ROOT=process.cwd();
const BASE='820d1bb942e371104b481dde467485820bc8d103';
const OWNER='orbit360-platform/data/academia-v1230-operational-directory-v20260722.js';
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/gate711-cumulative-visual-manifest-academia-rootfix-v20260802.json');
const ROOTS=['orbit360-platform/index.html','orbit360-platform/modules','orbit360-platform/core','orbit360-platform/styles','orbit360-platform/data'];
const OLD={trackedFileCount:309,pathDigest:'517056dee1200503b2e7295a333cb804bc71271bbaa87847fa762da025f276f1',contentDigest:'83cc01dacf180b8ca9693df7117030228479992d6db4c59fab53def2e94acafd',indexDigest:'b57b6581ee02d2dde42a8a2c1272d57f19b7ad6809d13a1d25111f3d71a96074'};
const sha=value=>crypto.createHash('sha256').update(String(value)).digest('hex');
const git=(...args)=>execFileSync('git',args,{cwd:ROOT,encoding:'utf8'}).trim();
const files=git('ls-files','--',...ROOTS).split(/\r?\n/).map(x=>x.trim()).filter(Boolean).filter(file=>!file.includes('/runtime-gate-')).sort();
const rows=files.map(file=>({file,digest:sha(fs.readFileSync(path.join(ROOT,file)))}));
const manifest={trackedFileCount:rows.length,pathDigest:sha(rows.map(row=>row.file).join('\n')),contentDigest:sha(rows.map(row=>`${row.file}:${row.digest}`).join('\n')),indexDigest:rows.find(row=>row.file==='orbit360-platform/index.html')?.digest||''};
const changed=git('diff','--name-only',BASE,'HEAD','--',...ROOTS).split(/\r?\n/).map(x=>x.trim()).filter(Boolean).filter(file=>!file.includes('/runtime-gate-')).sort();
const ownerSource=fs.readFileSync(path.join(ROOT,OWNER),'utf8');
const checks=[
  {id:'BASE_EXISTS',ok:Boolean(git('cat-file','-t',BASE)==='commit')},
  {id:'TRACKED_COUNT_UNCHANGED',ok:manifest.trackedFileCount===OLD.trackedFileCount},
  {id:'PATH_DIGEST_UNCHANGED',ok:manifest.pathDigest===OLD.pathDigest},
  {id:'INDEX_DIGEST_UNCHANGED',ok:manifest.indexDigest===OLD.indexDigest},
  {id:'CONTENT_DIGEST_CHANGED',ok:manifest.contentDigest!==OLD.contentDigest},
  {id:'ONLY_OWNER_VISUAL_CHANGED',ok:changed.length===1&&changed[0]===OWNER},
  {id:'OWNER_ROOT_FIX_MARKER',ok:ownerSource.includes("F='20260802.1'")&&ownerSource.includes('sessionChangeWrites:false')},
  {id:'OWNER_NO_SESSION_LISTENER',ok:!ownerSource.includes("addEventListener('orbit:session'")},
  {id:'OWNER_TARGET_ONLY_IDEMPOTENT',ok:ownerSource.includes('targetOnlyIdempotentUpsert:true')},
  {id:'NO_FRAGMENTATION',ok:files.includes('orbit360-platform/index.html')&&files.includes(OWNER)}
];
const failed=checks.filter(item=>!item.ok);
const payload={schemaVersion:'orbit360-gate711-cumulative-visual-manifest-rootfix-v1',gateId:'block7-canonical-runtime-cumulative-visual-lab-v20260801',status:failed.length?'GATE711_CUMULATIVE_VISUAL_MANIFEST_ROOTFIX_FAIL':'GATE711_CUMULATIVE_VISUAL_MANIFEST_ROOTFIX_PASS',classification:failed.length?'DATA_CONTRACT_FAILURE':'GO_STATIC_CUMULATIVE_VISUAL_MANIFEST_ROOTFIX',baseHead:BASE,auditedHead:git('rev-parse','HEAD'),owner:OWNER,oldManifest:OLD,newManifest:manifest,changedVisualPaths:changed,checks,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(item=>item.id),secretAccess:false,firestoreRead:false,firestoreWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,reimportExecuted:false,deployExecuted:false,production:false,containsPII:false,containsValues:false,containsSecrets:false,ok:failed.length===0};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n','utf8');console.log(JSON.stringify(payload,null,2));process.exit(payload.ok?0:41);
