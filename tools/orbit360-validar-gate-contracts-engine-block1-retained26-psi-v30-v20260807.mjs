#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const E='orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json';
const L='tools/orbit360-validator-lifecycle-block1-retained26-psi-v30-v20260807.json';
const EXPORT_REQUEST='.github/orbit360-requests/block1-client360-insurers-v30-retained26-encrypted-export-authorization.json';
const req=process.env.ORBIT360_REQUEST_FILE||EXPORT_REQUEST;
const expected=process.env.ORBIT360_EXPECTED_REQUEST_VERSION||'NONE_PENDING_FRESH_AUTHORIZATION';
const readJson=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8').replace(/^\uFEFF/,''));
const l=readJson(L);const phase=String(l.currentPhase||'');
const source=phase==='SOURCE_ONLY_RETAINED26_PSI_V30';
const exportRuntime=phase==='BLOCK1_RETAINED26_ENCRYPTED_EXPORT_READONLY_V30';
const checks={
 gate:l.gateId==='block1-client360-insurers-lab-v20260717',
 version:l.gateContractVersion==='1.0.41',
 revision:l.validatorLifecycleRevision==='phase-capability-contract-v1',
 owner:l.ownerReferenceVersion==='20260807.23-native-source-canonical-owner-1.0.41',
 base:l.authorizedBaseHead==='127d1bab8aca09ccdc47c368bd402d8bd2d638a1',
 target:l.targetFingerprintCount===16,
 retained:l.retainedSourceContract?.requiresValidation===26&&l.retainedSourceContract?.exactDuplicateRecords===16&&l.retainedSourceContract?.probableDuplicateRecords===10,
 privacy:l.privacyContract?.encryptedArtifactOnly===true&&l.privacyContract?.privateKeyInRepo===false&&l.privacyContract?.plaintextSource26InRepo===false,
 phase:source||exportRuntime
};
let request=null;
if(source){checks.requestAbsent=!fs.existsSync(path.join(ROOT,req))&&expected==='NONE_PENDING_FRESH_AUTHORIZATION';}
else{
 checks.requestPath=req===EXPORT_REQUEST;
 request=readJson(req);
 checks.requestVersion=request.requestVersion===expected;
 checks.requestActive=request.status==='AUTHORIZED_ONCE'&&request.allowedExecutions===1&&request.consumed===false&&request.authorizationFrozen===false&&request.replayAllowed===false;
}
const failed=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k);const ok=failed.length===0;
const status=source?'PASS_GATE_CONTRACT_SOURCE_V30':'GO_GATE_CONTRACT';
const classification=source?'DATA_CONTRACT_RETAINED26_PSI_SOURCE_VALID':'GO_BLOCK1_RETAINED26_ENCRYPTED_EXPORT_READONLY_V30';
const out={schemaVersion:'orbit360-gate-contract-preflight-block1-v30-v1',gateId:l.gateId,contractVersion:l.gateContractVersion,authorizationGeneration:l.authorizationGeneration,executionPhase:phase,status:ok?status:'VALIDATOR_STALE',classification:ok?classification:'PIPELINE_MECHANISM_FAILURE',total:Object.keys(checks).length,passed:Object.keys(checks).length-failed.length,failed:failed.length,failedCheckIds:failed,requestVersion:request?.requestVersion||null,targetFingerprintCount:16,executionAuthorized:!source&&ok,secretAccessAuthorized:!source&&ok,firestoreReadAuthorized:!source&&ok,firestoreWriteAuthorized:false,authReadAuthorized:false,authWriteAuthorized:false,browserAuthorized:false,hostingAuthorized:false,functionsDeployAuthorized:false,rulesDeployAuthorized:false,productionAuthorized:false,writesAuthorized:0,dataAccess:false,secretAccess:false,secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false,ok};
fs.mkdirSync(path.dirname(E),{recursive:true});fs.writeFileSync(E,JSON.stringify(out,null,2)+'\n','utf8');console.log(JSON.stringify(out,null,2));process.exit(ok?0:41);
