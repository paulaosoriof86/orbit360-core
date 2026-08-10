#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
const ROOT=process.cwd();
const L='tools/orbit360-validator-lifecycle-block1-two-client-cloud-audit-runtime-v33-v20260810.json';
const E='orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json';
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8').replace(/^\uFEFF/,''));
const l=read(L);
const reqRel=process.env.ORBIT360_REQUEST_FILE||'.github/orbit360-requests/block1-client360-insurers-v33-two-client-cloud-audit-authorization.json';
const expectedVersion=process.env.ORBIT360_EXPECTED_REQUEST_VERSION||'';
const expectedParent=process.env.ORBIT360_EXPECTED_PARENT_HEAD||'';
let req=null;try{req=read(reqRel);}catch{}
const checks={
  gate:l.gateId==='block1-client360-insurers-lab-v20260717',
  version:l.gateContractVersion==='1.0.41',
  owner:l.ownerReferenceVersion==='20260807.23-native-source-canonical-owner-1.0.41',
  phase:l.currentPhase==='BLOCK1_TWO_CLIENT_CLOUD_AUDIT_READONLY_V33',
  sourceClosure:l.sourceControlPlaneRunId==='31403410005'&&l.sourceControlPlaneArtifactDigest==='sha256:52896dc18bfc3fe326a73d5b12f7b134379fe83899b79711f4a8b6c988f5fc71',
  targets:Array.isArray(l.targetFingerprints)&&l.targetFingerprints.length===2&&new Set(l.targetFingerprints).size===2,
  limits:l.runtimeReadContract?.firestoreLocatorReadOperationsMaximum===1&&l.runtimeReadContract?.loggingQueriesMaximum===1&&l.runtimeReadContract?.loggingReadOperationsMaximum===2&&l.runtimeReadContract?.loggingPaginationMaximumPages===2&&l.runtimeReadContract?.writesAuthorized===0,
  privacy:l.auditContract?.rawLogEntriesPersisted===false&&l.auditContract?.resourceNamesPersisted===false&&l.auditContract?.documentIdsPersisted===false&&l.auditContract?.principalEmailsPersisted===false&&l.auditContract?.callerIpsPersisted===false,
  requestPresent:!!req,
  requestSchema:req?.schemaVersion==='orbit360-runtime-request-v1',
  requestGeneration:req?.authorizationGeneration==='v33-two-client-cloud-audit-readonly-runtime',
  requestGate:req?.gateId==='block1-client360-insurers-lab-v20260717'&&req?.contractVersion==='1.0.41',
  requestVersion:expectedVersion!==''&&req?.requestVersion===expectedVersion,
  requestActive:req?.status==='AUTHORIZED_ONCE'&&req?.approved===true&&req?.allowedExecutions===1&&req?.consumed===false&&req?.authorizationFrozen===false&&req?.replayAllowed===false,
  parentBound:expectedParent!==''&&req?.parentHead===expectedParent&&req?.authorizedBaseHead===expectedParent,
  operation:req?.operation==='TWO_CLIENT_CLOUD_AUDIT_READONLY'&&req?.targetFingerprintCount===2,
  requestLimits:req?.firestoreLocatorReadOperationsMaximum===1&&req?.loggingQueriesMaximum===1&&req?.loggingReadOperationsMaximum===2&&req?.loggingPaginationMaximumPages===2,
  noWrites:req?.firestoreWritesAuthorized===0&&req?.authReadsAuthorized===0&&req?.authWritesAuthorized===0&&req?.operationalWritesAuthorized===0&&req?.reimportAuthorized===false,
  noDeploy:req?.functionsAuthorized===false&&req?.rulesAuthorized===false&&req?.hostingAuthorized===false&&req?.browserAuthorized===false&&req?.productionAuthorized===false&&req?.mainAuthorized===false&&req?.mergeAuthorized===false,
  userAuthorization:req?.authorizedByUser===true,
  noPayload:req?.containsPII===false&&req?.containsSecrets===false
};
const failed=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k);const ok=failed.length===0;
const out={
  schemaVersion:'orbit360-gate-contract-preflight-block1-v33-runtime-v1',gateId:l.gateId,contractVersion:l.gateContractVersion,
  authorizationGeneration:l.authorizationGeneration,executionPhase:l.currentPhase,status:ok?'GO_GATE_CONTRACT_RUNTIME_V33':'VALIDATOR_STALE',
  classification:ok?'DATA_CONTRACT_EXTERNAL_AUDIT_RUNTIME_AUTHORIZED_READONLY':'PIPELINE_MECHANISM_FAILURE',
  total:Object.keys(checks).length,passed:Object.keys(checks).length-failed.length,failed:failed.length,failedCheckIds:failed,
  targetFingerprintCount:2,executionAuthorized:ok,secretAccessAuthorized:ok,firestoreReadAuthorized:ok,loggingReadAuthorized:ok,
  firestoreLocatorReadOperationsMaximum:1,loggingQueriesMaximum:1,loggingReadOperationsMaximum:2,loggingPaginationMaximumPages:2,
  firestoreWriteAuthorized:false,authReadAuthorized:false,authWriteAuthorized:false,browserAuthorized:false,hostingAuthorized:false,
  functionsDeployAuthorized:false,rulesDeployAuthorized:false,productionAuthorized:false,writesAuthorized:0,
  dataAccess:false,secretAccess:false,secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,deployExecuted:false,productionTouched:false,
  containsPII:false,containsSecrets:false,ok
};
fs.mkdirSync(path.dirname(E),{recursive:true});fs.writeFileSync(E,JSON.stringify(out,null,2)+'\n','utf8');console.log(JSON.stringify(out,null,2));process.exit(ok?0:41);
