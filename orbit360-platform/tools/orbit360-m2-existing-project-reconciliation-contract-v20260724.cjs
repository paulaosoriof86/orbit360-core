#!/usr/bin/env node
'use strict';
const fs=require('fs');
const files={
 workflow:'.github/workflows/orbit360-m2-product-readonly-runtime-gate-v20260723.yml',
 request:'tools/orbit360-m2-existing-project-reconciliation-request-v20260724.json',
 authorization:'tools/orbit360-m2-existing-project-reconciliation-authorization-v20260724.json',
 freeze:'tools/orbit360-incident-freeze-v20260721.json',
 script:'tools/orbit360-m2-existing-project-reconciliation-v20260724.mjs'
};
const checks=[];const check=(id,ok,detail='')=>checks.push({id,ok:!!ok,detail:String(detail||'')});
for(const [id,p] of Object.entries(files)) check('FILE_'+id.toUpperCase(),fs.existsSync(p),p);
const workflow=fs.existsSync(files.workflow)?fs.readFileSync(files.workflow,'utf8'):'';
const request=fs.existsSync(files.request)?JSON.parse(fs.readFileSync(files.request,'utf8')):{};
const auth=fs.existsSync(files.authorization)?JSON.parse(fs.readFileSync(files.authorization,'utf8')):{};
const freeze=fs.existsSync(files.freeze)?JSON.parse(fs.readFileSync(files.freeze,'utf8')):{};
check('WORKFLOW_EXISTING_SECRET_ALIASES',workflow.includes('FIREBASE_SERVICE_ACCOUNT_ORBIT360_LAB')&&workflow.includes('FIREBASE_SERVICE_ACCOUNT_ORBIT_360_LAB')&&workflow.includes('FIREBASE_SERVICE_ACCOUNT'),files.workflow);
check('WORKFLOW_EXPECTED_PROJECT',workflow.includes('ays-orbit-360-lab'),files.workflow);
check('WORKFLOW_NO_NEW_ENVIRONMENT',!workflow.includes('environment: orbit360-product-readonly'),files.workflow);
check('WORKFLOW_NO_RULES_DEPLOY',!workflow.includes('firestore:rules')&&!workflow.includes('storage.product-readonly')&&!workflow.includes('firebase-tools deploy'),files.workflow);
check('WORKFLOW_NO_WRITES',workflow.includes('No Writes')&&!workflow.includes('createUser(')&&!workflow.includes('.set(')&&!workflow.includes('.update('),files.workflow);
check('REQUEST_ONCE',request.explicitAuthorization===true&&request.allowedExecutions===1&&request.readOnlyDiagnostic===true,JSON.stringify(request));
check('REQUEST_SCOPE',request.createProject===false&&request.createAuthUser===false&&request.createMembership===false&&request.applyRules===false&&request.operationalWrites===false,JSON.stringify(request));
check('AUTH_EXISTING_PROJECT',auth.status==='AUTHORIZED_READ_ONLY_RECONCILIATION_ONCE'&&auth.expectedProjectId==='ays-orbit-360-lab',auth.status);
check('FREEZE_CLASSIFICATION',freeze.classification==='PIPELINE_MECHANISM_FAILURE',freeze.classification);
check('FREEZE_AUTHORIZED_ONCE',freeze.m2ReconciliationAuthorization&&freeze.m2ReconciliationAuthorization.active===true&&freeze.m2ReconciliationAuthorization.allowedExecutions===1,freeze.status);
const failed=checks.filter(x=>!x.ok);const out={schemaVersion:'orbit360-m2-existing-project-reconciliation-contract-v1',status:failed.length?'M2_EXISTING_PROJECT_RECONCILIATION_CONTRACT_FAILED':'M2_EXISTING_PROJECT_RECONCILIATION_CONTRACT_PASS',ok:failed.length===0,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,secretAccess:false,firestoreRead:false,operationalWrites:0,rulesChanged:false,runtimeExecuted:false,containsPII:false,containsSecrets:false};
console.log(JSON.stringify(out,null,2));process.exit(failed.length?41:0);
