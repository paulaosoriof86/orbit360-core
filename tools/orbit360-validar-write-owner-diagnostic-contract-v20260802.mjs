#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const TARGET=path.join(ROOT,'tools/orbit360-diagnosticar-browser-write-owner-gate711-v20260802.mjs');
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/gate711-write-owner-diagnostic-static-v20260802.json');
const source=fs.readFileSync(TARGET,'utf8');
const checks=[
  {id:'EXISTING_IDENTITY_ONLY',ok:source.includes('signInWithCustomToken')&&source.includes('EXPECTED_UID')&&source.includes('EXPECTED_EMAIL')},
  {id:'CANONICAL_STORE_REQUIRED',ok:source.includes('__canonicalReadModelV79===true')&&source.includes('__singleReadOwner===true')},
  {id:'LEGAL_BEFORE_GUARD',ok:source.indexOf('await settleLegal(page)')<source.indexOf("['insert','update','remove','setPref']")},
  {id:'ALL_WRITES_BLOCKED',ok:source.includes('blocked:true')&&source.includes('backendReached:false')&&source.includes('return null;')&&!source.includes("throw new Error('RUNTIME_WRITE_GUARD:'+name)")},
  {id:'ALL_ROLES_CONTINUE',ok:source.includes("for(const role of EXPECTED_ROLES)await selectRole(page,role)")&&source.includes('allRolesDiagnosed')},
  {id:'TRIGGER_ROLE_CAPTURED',ok:source.includes('triggerRole:String(diagnostic.triggerRole')&&source.includes('diagnostic.triggerRole=target')},
  {id:'COLLECTION_CAPTURED',ok:source.includes('collection:String(collection')},
  {id:'PAYLOAD_KEYS_ONLY',ok:source.includes('payloadKeys:payloadKeys(payload)')&&!source.includes('payload:payload')},
  {id:'ROLE_ROUTE_FRAME_CAPTURED',ok:source.includes('activeRole:Orbit.session')&&source.includes("route:String(location.hash")&&source.includes('topFrame:String(stack.find')},
  {id:'STACK_SANITIZED',ok:source.includes('sanitizeStack')&&source.includes("replace(/https?:\\/\\/[^/\\s]+/g,'')")},
  {id:'PII_DECLARED_FALSE',ok:source.includes('containsPII:false')},
  {id:'VALUES_DECLARED_FALSE',ok:source.includes('containsValues:false')},
  {id:'SECRETS_DECLARED_FALSE',ok:source.includes('containsSecrets:false')},
  {id:'NO_DEPLOY_PRODUCTION',ok:source.includes('deployExecuted:false')&&source.includes('production:false')},
  {id:'ZERO_WRITE_COUNTERS',ok:source.includes('firestoreWrites:0')&&source.includes('operationalWrites:0')},
  {id:'NO_AUTORUN_WORKFLOW',ok:!source.includes('workflow_dispatch')&&!source.includes('createCommitStatus')}
];
const failed=checks.filter(item=>!item.ok);
const payload={schemaVersion:'orbit360-gate711-write-owner-diagnostic-static-v2',gateId:'block7-canonical-runtime-cumulative-visual-lab-v20260801',contractVersion:'7.11.0',status:failed.length?'GATE711_WRITE_OWNER_DIAGNOSTIC_STATIC_FAIL':'GATE711_WRITE_OWNER_DIAGNOSTIC_STATIC_PASS',classification:failed.length?'VALIDATOR_STALE':'GO_STATIC_WRITE_OWNER_DIAGNOSTIC',checks,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(item=>item.id),secretAccess:false,firestoreRead:false,firestoreWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,deployExecuted:false,production:false,containsPII:false,containsValues:false,containsSecrets:false,ok:failed.length===0};
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n','utf8');
console.log(JSON.stringify(payload,null,2));
process.exit(payload.ok?0:41);
