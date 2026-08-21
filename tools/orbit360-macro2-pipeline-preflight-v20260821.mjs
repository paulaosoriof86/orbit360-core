#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';

const ROOT = process.env.ORBIT360_ROOT ? path.resolve(process.env.ORBIT360_ROOT) : process.cwd();
const workflowPath = process.env.ORBIT360_MACRO2_WORKFLOW || '.github/workflows/orbit360-continuity-canonical-source-only-v20260820.yml';
const requestPath = process.env.ORBIT360_MACRO2_REQUEST || '';
const read = p => fs.readFileSync(path.join(ROOT,p),'utf8').replace(/^\uFEFF/,'');
const bin = p => fs.readFileSync(path.join(ROOT,p));
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const failures=[];
const need=(ok,code)=>{if(!ok)failures.push(code);};

need(Boolean(requestPath),'REQUEST_PATH_REQUIRED');
need(fs.existsSync(path.join(ROOT,workflowPath)),'WORKFLOW_MISSING');
need(Boolean(requestPath)&&fs.existsSync(path.join(ROOT,requestPath)),'REQUEST_MISSING');
if (failures.length) {
  console.log(JSON.stringify({ok:false,status:'MACRO2_PIPELINE_PREFLIGHT_FAIL',classification:'PIPELINE_MECHANISM_FAILURE',failures},null,2));
  process.exit(41);
}

const workflow=read(workflowPath);
const req=JSON.parse(read(requestPath));
need(req.schemaVersion==='orbit360-macro2-source-recovery-request-v2','REQUEST_SCHEMA_V2_REQUIRED');
need(req.status==='MATERIALIZED_SOURCE_ONLY','PROMOTER_COMPATIBLE_REQUEST_STATUS_REQUIRED');
need(req.sourceOnly===true&&req.allowedExecutions===1&&req.consumed===false&&req.historical===false&&req.replayAllowed===false,'REQUEST_ONE_SHOT_CONTRACT');
need(req.reopenedAfterStopRetry===true&&req.rootCausePreflightRequired===true,'STOP_RETRY_REOPEN_GUARD');
need(/^[a-f0-9]{40}$/.test(String(req.expectedParentHead||'')),'EXPECTED_PARENT_SHA');
need(req.runtime===false&&req.browser===false&&req.secrets===false&&req.firestoreRead===false&&req.writes===false&&req.deploy===false&&req.production===false&&req.main===false&&req.merge===false,'SOURCE_ONLY_CAPABILITIES');
need(Array.isArray(req.patchSets)&&req.patchSets.length===3,'PATCHSET_COUNT');

need(!/\$PRI\b/.test(workflow),'STALE_PRI_VARIABLE_FORBIDDEN');
need((workflow.match(/unzip -q "\$INNER" -d "\$PRE"/g)||[]).length===1,'PREDECESSOR_EXTRACT_TARGET_EXACTLY_ONCE');
need(workflow.includes("ORBIT360_MACRO2_REQUEST=$MACRO2_REQUEST node tools/orbit360-macro2-pipeline-preflight-v20260821.mjs"),'SELF_PREFLIGHT_REQUIRED');
need(workflow.includes("sed -i \"s#request:'.github/orbit360-requests/macro2-transversal-source-apply-v20260821.json'#request:'$MACRO2_REQUEST'#\""),'PROMOTER_REQUEST_REBIND_REQUIRED');
need(workflow.includes('git add -- "$MACRO2_REQUEST"'),'RECOVERY_REQUEST_MUST_BE_PERSISTED');
need(!workflow.includes('git pull --rebase'),'SILENT_REBASE_FORBIDDEN');
need((workflow.match(/git push origin/g)||[]).length===1,'EXACTLY_ONE_REMOTE_PUSH');
need(!/FIREBASE_SERVICE_ACCOUNT|GOOGLE_APPLICATION_CREDENTIALS|playwright|firestoreRead:\s*true|runtime:\s*true|browser:\s*true/.test(workflow),'RUNTIME_SECRET_BROWSER_SURFACE_FORBIDDEN');

for (const p of req.patchSets||[]) {
  const abs=path.join(ROOT,p.gzipPath||'');
  need(Boolean(p.gzipPath)&&fs.existsSync(abs),`PATCH_GZIP_MISSING:${p.name||''}`);
  if (!fs.existsSync(abs)) continue;
  const gz=bin(p.gzipPath);
  need(sha(gz)===p.gzipSha256,`PATCH_GZIP_SHA:${p.name||''}`);
  let raw;
  try { raw=zlib.gunzipSync(gz); } catch { raw=null; }
  need(Boolean(raw),`PATCH_GZIP_DECOMPRESS:${p.name||''}`);
  if (raw) need(sha(raw)===p.sha256,`PATCH_RAW_SHA:${p.name||''}`);
  if (p.name==='tools'&&raw) {
    const txt=raw.toString('utf8');
    need(txt.includes("req.status==='MATERIALIZED_SOURCE_ONLY'"),'PROMOTER_STATUS_LITERAL_DISCOVERED');
    need(txt.includes("request:'.github/orbit360-requests/macro2-transversal-source-apply-v20260821.json'"),'PROMOTER_DEFAULT_REQUEST_BINDING_DISCOVERED');
  }
}

const result={
  ok:failures.length===0,
  status:failures.length?'MACRO2_PIPELINE_PREFLIGHT_FAIL':'MACRO2_PIPELINE_PREFLIGHT_PASS',
  classification:failures.length?'PIPELINE_MECHANISM_FAILURE':'PASS',
  workflowPath,requestPath,failures,
  stopRetryReopenValidated:failures.length===0,
  sourceOnly:true,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,writes:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false
};
console.log(JSON.stringify(result,null,2));
if(!result.ok)process.exit(41);
