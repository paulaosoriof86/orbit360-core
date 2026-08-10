#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const L='tools/orbit360-validator-lifecycle-block1-logging-iam-capability-runtime-v34-v20260810.json';
const E='orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json';
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8').replace(/^\uFEFF/,''));
const l=read(L);
const req=process.env.ORBIT360_REQUEST_FILE||'.github/orbit360-requests/block1-client360-insurers-v34-logging-iam-capability-authorization.json';
const expected=process.env.ORBIT360_EXPECTED_REQUEST_VERSION||'';
const expectedParent=process.env.ORBIT360_EXPECTED_PARENT_HEAD||'';
let request=null;
try{request=read(req);}catch{}
const required=['logging.logEntries.list','logging.privateLogEntries.list'];
const same=a=>Array.isArray(a)&&a.length===2&&required.every(x=>a.includes(x));
const checks={
 gate:l.gateId==='block1-client360-insurers-lab-v20260717',
 version:l.gateContractVersion==='1.0.41',
 phase:l.currentPhase==='BLOCK1_LOGGING_IAM_CAPABILITY_READONLY_V34',
 mode:l.executionProfile?.mode==='RUNTIME_READONLY',
 lifecycleCaps:l.executionProfile?.capabilities?.secrets===true&&l.executionProfile?.capabilities?.firestoreRead===false&&l.executionProfile?.capabilities?.writes===false&&l.executionProfile?.capabilities?.runtime===true&&l.executionProfile?.capabilities?.browser===false&&l.executionProfile?.capabilities?.deploy===false&&l.executionProfile?.capabilities?.production===false,
 permissions:same(l.diagnosticContract?.permissions),
 method:l.diagnosticContract?.method==='cloudresourcemanager.projects.testIamPermissions',
 scope:l.diagnosticContract?.networkOperationsMaximum===1&&l.diagnosticContract?.readsTargetClientData===false&&l.diagnosticContract?.readsAuditLogEntries===false&&l.diagnosticContract?.readsFirestore===false&&l.diagnosticContract?.readsAuth===false&&l.diagnosticContract?.readsIamPolicyBindings===false,
 noWrites:l.diagnosticContract?.modifiesIam===false&&l.diagnosticContract?.grantsRoles===false&&l.diagnosticContract?.iamWritesAuthorized===0&&l.diagnosticContract?.operationalWritesAuthorized===0&&l.protectedState?.writesAuthorized===0,
 requestPresent:!!request,
 requestVersion:!!request&&request.requestVersion===expected&&expected.length>0,
 requestState:!!request&&request.status==='AUTHORIZED_ONCE'&&request.approved===true&&request.allowedExecutions===1&&request.consumed===false&&request.authorizationFrozen===false&&request.replayAllowed===false,
 requestGeneration:!!request&&request.authorizationGeneration==='v34-logging-iam-capability-runtime',
 requestOperation:!!request&&request.operation==='LOGGING_IAM_TEST_PERMISSIONS_READONLY',
 requestPermissions:!!request&&same(request.permissions),
 requestBounds:!!request&&request.networkOperationsMaximum===1&&request.firestoreReadsAuthorized===0&&request.authReadsAuthorized===0&&request.auditLogReadsAuthorized===0&&request.iamPolicyBindingReadsAuthorized===0&&request.iamWritesAuthorized===0&&request.operationalWritesAuthorized===0&&request.hostingAuthorized===false&&request.browserAuthorized===false&&request.productionAuthorized===false&&request.mainAuthorized===false&&request.mergeAuthorized===false,
 parentBinding:!!request&&expectedParent.length>0&&request.parentHead===expectedParent&&request.authorizedBaseHead===expectedParent,
 privacy:!!request&&request.containsPII===false&&request.containsSecrets===false&&l.containsPII===false&&l.containsSecrets===false
};
const failed=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k);
const ok=failed.length===0;
const out={
 schemaVersion:'orbit360-gate-contract-preflight-block1-v34-runtime-v1',
 gateId:l.gateId,
 contractVersion:l.gateContractVersion,
 authorizationGeneration:l.authorizationGeneration,
 executionPhase:l.currentPhase,
 status:ok?'GO_GATE_CONTRACT_RUNTIME_V34':'VALIDATOR_STALE',
 classification:ok?'ENVIRONMENT_IAM_CAPABILITY_DIAGNOSTIC_AUTHORIZED_READONLY':'PIPELINE_MECHANISM_FAILURE',
 total:Object.keys(checks).length,
 passed:Object.keys(checks).length-failed.length,
 failed:failed.length,
 failedCheckIds:failed,
 executionAuthorized:ok,
 secretAccessAuthorized:ok,
 networkOperationsMaximum:1,
 loggingLogEntriesListPermissionRequested:true,
 loggingPrivateLogEntriesListPermissionRequested:true,
 firestoreReadAuthorized:false,
 authReadAuthorized:false,
 auditLogReadAuthorized:false,
 iamPolicyBindingReadAuthorized:false,
 iamWriteAuthorized:false,
 operationalWriteAuthorized:false,
 browserAuthorized:false,
 hostingAuthorized:false,
 productionAuthorized:false,
 writesAuthorized:0,
 secretAccess:false,
 firestoreRead:false,
 authRead:false,
 auditLogRead:false,
 iamPolicyBindingRead:false,
 iamWrite:false,
 runtimeExecuted:false,
 browserExecuted:false,
 deployExecuted:false,
 productionTouched:false,
 containsPII:false,
 containsSecrets:false,
 ok
};
fs.mkdirSync(path.dirname(E),{recursive:true});fs.writeFileSync(E,JSON.stringify(out,null,2)+'\n','utf8');console.log(JSON.stringify(out,null,2));process.exit(ok?0:41);
