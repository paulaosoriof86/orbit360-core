#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const ENGINE=path.join(ROOT,'tools/orbit360-validar-gate-contracts-engine-canonical-runtime-cumulative-visual-lab-v20260801.mjs');
const LIFECYCLE=path.join(ROOT,'tools/orbit360-validator-lifecycle-contract-canonical-runtime-cumulative-visual-lab-v20260801.json');
const REQUEST=path.join(ROOT,'.github/orbit360-requests/canonical-runtime-cumulative-visual-lab-v20260801.json');
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/gate711-authorization-binding-static-v20260802.json');

const engine=fs.readFileSync(ENGINE,'utf8');
const lifecycle=JSON.parse(fs.readFileSync(LIFECYCLE,'utf8'));
const request=JSON.parse(fs.readFileSync(REQUEST,'utf8'));
const lifecycleRef=String(lifecycle.authorization&&lifecycle.authorization.authorizationRef||'').trim();
const requestRef=String(request.authorizationRef||'').trim();
const checks=[
  {id:'NO_HISTORICAL_AUTHORIZATION_HARDCODE',ok:!engine.includes("authorizationRef==='user_proceed_definitive_solutions_no_trial_error_20260801'")},
  {id:'LIFECYCLE_REQUEST_EXACT_BINDING',ok:engine.includes('requestAuthorizationRef===lifecycleAuthorizationRef')},
  {id:'NON_EMPTY_AUTHORIZATION_REFERENCE',ok:engine.includes('lifecycleAuthorizationRef.length>0')},
  {id:'CURRENT_REFERENCES_MATCH',ok:lifecycleRef.length>0&&requestRef===lifecycleRef},
  {id:'SINGLE_EXECUTION_BOUNDARY',ok:lifecycle.authorization&&lifecycle.authorization.allowedExecutions===1&&request.allowedExecutions===1},
  {id:'NO_WRITE_CAPABILITY',ok:lifecycle.guards&&lifecycle.guards.firestoreDataWritesAllowed===false&&lifecycle.guards.operationalWritesAllowed===0&&request.capabilities&&request.capabilities.writes===false}
];
const failed=checks.filter(item=>!item.ok);
const payload={schemaVersion:'orbit360-gate711-authorization-binding-static-v1',gateId:'block7-canonical-runtime-cumulative-visual-lab-v20260801',contractVersion:'7.11.0',status:failed.length?'GATE711_AUTHORIZATION_BINDING_STATIC_FAIL':'GATE711_AUTHORIZATION_BINDING_STATIC_PASS',classification:failed.length?'VALIDATOR_STALE':'GO_STATIC_AUTHORIZATION_BINDING',checks,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(item=>item.id),secretAccess:false,firestoreRead:false,firestoreWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,production:false,main:false,merge:false,containsPII:false,containsSecrets:false,ok:failed.length===0};
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n','utf8');
console.log(JSON.stringify(payload,null,2));
process.exit(payload.ok?0:41);
