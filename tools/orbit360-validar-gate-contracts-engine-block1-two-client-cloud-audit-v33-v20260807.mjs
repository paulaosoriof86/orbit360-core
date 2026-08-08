#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
const ROOT=process.cwd();
const L='tools/orbit360-validator-lifecycle-block1-two-client-cloud-audit-v33-v20260807.json';
const E='orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json';
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8').replace(/^\uFEFF/,''));
const l=read(L);const source=l.currentPhase==='SOURCE_ONLY_TWO_CLIENT_CLOUD_AUDIT_V33';
const req=process.env.ORBIT360_REQUEST_FILE||'.github/orbit360-requests/block1-client360-insurers-v33-two-client-cloud-audit-authorization.json';
const expected=process.env.ORBIT360_EXPECTED_REQUEST_VERSION||'NONE_PENDING_FRESH_AUTHORIZATION';
const checks={
 gate:l.gateId==='block1-client360-insurers-lab-v20260717',
 version:l.gateContractVersion==='1.0.41',
 owner:l.ownerReferenceVersion==='20260807.23-native-source-canonical-owner-1.0.41',
 base:l.authorizedBaseHead==='84d6daf66c99bba8fe6b4df5c9e327c05ec469dc',
 phase:source,
 targets:Array.isArray(l.targetFingerprints)&&l.targetFingerprints.length===2&&new Set(l.targetFingerprints).size===2,
 service:l.auditContract?.authoritativeService==='firestore.googleapis.com',
 source:l.auditContract?.authoritativeSource==='Google Cloud Audit Logs / Logging API',
 privacy:l.auditContract?.rawLogEntriesPersisted===false&&l.auditContract?.resourceNamesPersisted===false&&l.auditContract?.principalEmailsPersisted===false&&l.auditContract?.callerIpsPersisted===false,
 writes:l.runtimeReadContract?.writesAuthorized===0&&l.protectedState?.writesAuthorized===0,
 requestAbsent:!fs.existsSync(path.join(ROOT,req))&&expected==='NONE_PENDING_FRESH_AUTHORIZATION'
};
const failed=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k);const ok=failed.length===0;
const out={schemaVersion:'orbit360-gate-contract-preflight-block1-v33-v1',gateId:l.gateId,contractVersion:l.gateContractVersion,authorizationGeneration:l.authorizationGeneration,executionPhase:l.currentPhase,status:ok?'PASS_GATE_CONTRACT_SOURCE_V33':'VALIDATOR_STALE',classification:ok?'DATA_CONTRACT_EXTERNAL_AUDIT_SOURCE_VALID':'PIPELINE_MECHANISM_FAILURE',total:Object.keys(checks).length,passed:Object.keys(checks).length-failed.length,failed:failed.length,failedCheckIds:failed,targetFingerprintCount:2,executionAuthorized:false,secretAccessAuthorized:false,firestoreReadAuthorized:false,loggingReadAuthorized:false,firestoreWriteAuthorized:false,authReadAuthorized:false,authWriteAuthorized:false,browserAuthorized:false,hostingAuthorized:false,functionsDeployAuthorized:false,rulesDeployAuthorized:false,productionAuthorized:false,writesAuthorized:0,dataAccess:false,secretAccess:false,secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false,ok};
fs.mkdirSync(path.dirname(E),{recursive:true});fs.writeFileSync(E,JSON.stringify(out,null,2)+'\n','utf8');console.log(JSON.stringify(out,null,2));process.exit(ok?0:41);
