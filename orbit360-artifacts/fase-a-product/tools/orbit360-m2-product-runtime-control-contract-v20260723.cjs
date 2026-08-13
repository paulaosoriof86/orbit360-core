#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..');
const checks = [];
function exists(rel){ return fs.existsSync(path.join(ROOT, rel)); }
function read(rel){ return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function json(rel){ return JSON.parse(read(rel)); }
function check(id, ok, detail){ checks.push({id,ok:Boolean(ok),detail:String(detail||'')}); }
function has(rel, token){ return exists(rel) && read(rel).includes(token); }

const requestRel='tools/orbit360-m2-product-readonly-runtime-request-v20260723.json';
const packageRel='tools/orbit360-m2-product-readonly-runtime-authorization-package-v20260723.json';
const freezeRel='tools/orbit360-incident-freeze-v20260721.json';
const workflowRel='.github/workflows/orbit360-m2-product-readonly-runtime-gate-v20260723.yml';
const smokeRel='tools/orbit360-m2-product-readonly-runtime-smoke-v20260723.mjs';
const firestoreRel='firestore.product-readonly.rules';
const storageRel='storage.product-readonly.rules';
const entryRel='orbit360-platform/product-readonly.html';
const storeRel='orbit360-platform/data/store-firestore-product-readonly-p0.js';

for(const rel of [requestRel,packageRel,freezeRel,workflowRel,smokeRel,firestoreRel,storageRel,entryRel,storeRel]) check('FILE:'+rel,exists(rel),rel);
let request={},pack={},freeze={};
try{request=json(requestRel);}catch(e){check('REQUEST_JSON',false,e.message);}
try{pack=json(packageRel);}catch(e){check('PACKAGE_JSON',false,e.message);}
try{freeze=json(freezeRel);}catch(e){check('FREEZE_JSON',false,e.message);}
check('REQUEST_AUTHORIZED',request.explicitAuthorization===true&&request.allowedExecutions===1,JSON.stringify(request));
check('REQUEST_SCOPE',request.readOnly===true&&request.operationalWrites===false&&request.hostingDeploy===false&&request.functionsDeploy===false&&request.imports===false&&request.policies===false&&request.m3===false&&request.mergeMain===false,JSON.stringify(request));
check('PACKAGE_AUTHORIZED_ONCE',pack.status==='AUTHORIZED_ONCE'&&pack.authorization&&pack.authorization.allowedExecutions===1,pack.status);
check('PACKAGE_NO_OPERATIONAL_WRITES',pack.authorization&&pack.authorization.operationalWrites===false,JSON.stringify(pack.authorization||{}));
check('FREEZE_AUTHORIZED_ONCE',freeze.status==='M2_PRODUCT_READONLY_RUNTIME_AUTHORIZED_ONCE'&&freeze.m2RuntimeAuthorization&&freeze.m2RuntimeAuthorization.active===true&&freeze.m2RuntimeAuthorization.allowedExecutions===1,freeze.status);

try{
  const parent=cp.execFileSync('git',['rev-parse','HEAD^'],{cwd:ROOT,encoding:'utf8'}).trim();
  check('REQUEST_PARENT_BINDING',request.authorizedBaseCommit===parent,`request=${request.authorizedBaseCommit};parent=${parent}`);
}catch(e){check('REQUEST_PARENT_BINDING',false,e.message);}

const workflow=exists(workflowRel)?read(workflowRel):'';
const preflight=workflow.indexOf('Preflight canónico antes de secretos');
const secret=workflow.indexOf('secrets.');
check('WORKFLOW_PREFLIGHT_BEFORE_SECRETS',preflight>=0&&secret>preflight,`preflight=${preflight};secret=${secret}`);
check('WORKFLOW_RULES_ONLY',workflow.includes('firestore:rules,storage')&&!workflow.includes('--only hosting')&&!workflow.includes('--only functions'),workflowRel);
check('WORKFLOW_NO_HOSTING',workflow.includes('No Hosting')&&!workflow.includes('hosting:channel:deploy'),workflowRel);
check('WORKFLOW_NO_FUNCTIONS',workflow.includes('No Functions'),workflowRel);
check('WORKFLOW_STATUS',workflow.includes('orbit360/m2-product-readonly-runtime-v1'),workflowRel);
check('WORKFLOW_ROLLBACK',workflow.includes('firebase.product-deny-all.json')&&workflow.includes(' rollback'),workflowRel);

check('FIRESTORE_MEMBERSHIP',has(firestoreRel,'activeMembership')&&has(firestoreRel,'allow get: if isSignedIn() && memberUid == request.auth.uid'),firestoreRel);
check('FIRESTORE_WRITES_DENIED',has(firestoreRel,'allow create, update, delete: if false')&&has(firestoreRel,'allow read, write: if false'),firestoreRel);
check('FIRESTORE_CREDENTIAL_REFS_DENIED',has(firestoreRel,'credentialRefs')&&has(firestoreRel,'allow read, write: if false'),firestoreRel);
check('STORAGE_WRITES_DENIED',has(storageRel,'allow write: if false')&&has(storageRel,'activeMembership'),storageRel);
check('SMOKE_CUSTOM_TOKEN',has(smokeRel,'createCustomToken')&&has(smokeRel,'signInWithCustomToken'),smokeRel);
check('SMOKE_CROSS_TENANT',has(smokeRel,'CROSS_TENANT_DENIED')&&has(smokeRel,'cross-tenant-denied-probe'),smokeRel);
check('SMOKE_ROLLBACK',has(smokeRel,'async function rollback()')&&has(smokeRel,'CONFIGURATION_ROLLBACK_COMPLETED'),smokeRel);
check('STORE_WRITES_BLOCKED',['insert: fail','update: fail','remove: fail','setPref: fail','reseed: fail'].every(t=>has(storeRel,t)),storeRel);
check('ENTRY_NO_FALLBACK',['backend-lab-loader.js','store-firestore-lab.local.js','data/seed.js','Orbit.SEED','URLSearchParams','location.search'].every(t=>!has(entryRel,t)),entryRel);

const failed=checks.filter(x=>!x.ok);
const output={
  schemaVersion:'orbit360-m2-product-runtime-control-contract-v1',
  status:failed.length?'M2_PRODUCT_RUNTIME_CONTROL_FAIL':'M2_PRODUCT_RUNTIME_CONTROL_PASS',
  ok:failed.length===0,total:checks.length,passed:checks.length-failed.length,failed:failed.length,
  failedCheckIds:failed.map(x=>x.id),checks,
  secretAccess:false,firestoreRead:false,controlledConfigurationWrites:0,operationalWrites:0,
  rulesApplied:false,runtimeExecuted:false,browserExecuted:false,hostingDeploy:false,functionsDeploy:false,
  imports:false,policies:false,productionTouched:false,containsPII:false,containsSecrets:false
};
console.log(JSON.stringify(output,null,2));
process.exit(failed.length?41:0);
