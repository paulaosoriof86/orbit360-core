#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const TARGET=path.join(ROOT,'tools/orbit360-preparar-identidad-browser-canonica-readonly-v20260801.mjs');
const WORKFLOW=path.join(ROOT,'.github/workflows/orbit360-gate711-write-owner-diagnostic-runtime-v20260802.yml');
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/gate711-identity-ephemeral-path-static-v20260802.json');
const source=fs.readFileSync(TARGET,'utf8');
const workflow=fs.readFileSync(WORKFLOW,'utf8');

const checks=[
  {id:'CONFIG_ENV_HONORED',ok:source.includes('process.env.ORBIT360_LOCAL_FIREBASE_CONFIG_FILE')&&source.includes('explicitConfigPathHonored')},
  {id:'TOKEN_ENV_HONORED',ok:source.includes('process.env.ORBIT360_CUSTOM_TOKEN_FILE')&&source.includes('explicitTokenPathHonored')},
  {id:'CONFIG_BOUNDED_TO_CORE',ok:source.includes("path.join(ROOT,'orbit360-platform/core')")&&source.includes('CONFIG_PATH_OUTSIDE_ALLOWED_ROOT')},
  {id:'TOKEN_BOUNDED_TO_RUNNER_TEMP',ok:source.includes("process.env.RUNNER_TEMP||'/tmp'")&&source.includes('TOKEN_PATH_OUTSIDE_RUNNER_TEMP')},
  {id:'DIRECTORIES_CREATED',ok:source.includes('fs.mkdirSync(path.dirname(CONFIG),{recursive:true})')&&source.includes('fs.mkdirSync(path.dirname(TOKEN),{recursive:true})')},
  {id:'TOKEN_PERMISSIONS_0600',ok:source.includes('fs.chmodSync(TOKEN,0o600)')},
  {id:'SAME_STEP_EXPORT_SUPPORTED',ok:source.includes('ORBIT360_CUSTOM_TOKEN_FILE=${TOKEN}')&&source.includes('ORBIT360_LOCAL_FIREBASE_CONFIG_FILE=${CONFIG}')},
  {id:'WORKFLOW_EXPORTS_EXPLICIT_PATHS',ok:workflow.includes('export ORBIT360_CUSTOM_TOKEN_FILE="$TOKEN_FILE"')&&workflow.includes('export ORBIT360_LOCAL_FIREBASE_CONFIG_FILE="$CONFIG_FILE"')},
  {id:'WORKFLOW_TESTS_EXPLICIT_FILES',ok:workflow.includes('test -s "$TOKEN_FILE"')&&workflow.includes('test -s "$CONFIG_FILE"')},
  {id:'IDENTITY_ZERO_WRITES',ok:source.includes('authWrites:0')&&source.includes('firestoreWrites:0')&&source.includes('operationalWrites:0')},
  {id:'SANITIZED_EVIDENCE',ok:source.includes('containsPII:false')&&source.includes('containsSecrets:false')},
  {id:'NO_DEPLOY_LOGIC',ok:!source.includes('firebase deploy')&&!source.includes('gcloud deploy')&&!source.includes('hosting:deploy')}
];
const failed=checks.filter(item=>!item.ok);
const payload={schemaVersion:'orbit360-gate711-identity-ephemeral-path-static-v1',gateId:'block7-canonical-runtime-cumulative-visual-lab-v20260801',status:failed.length?'GATE711_IDENTITY_EPHEMERAL_PATH_STATIC_FAIL':'GATE711_IDENTITY_EPHEMERAL_PATH_STATIC_PASS',classification:failed.length?'VALIDATOR_STALE':'GO_STATIC_IDENTITY_EPHEMERAL_PATH',checks,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(item=>item.id),secretAccess:false,firestoreRead:false,firestoreWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,deployExecuted:false,production:false,containsPII:false,containsSecrets:false,ok:failed.length===0};
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n','utf8');
console.log(JSON.stringify(payload,null,2));
process.exit(payload.ok?0:41);
