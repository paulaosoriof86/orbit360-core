#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
const mode=process.argv[2]||'source';
const lifecycle=JSON.parse(fs.readFileSync('tools/orbit360-validator-lifecycle-block1-retained26-psi-v30-v20260807.json','utf8'));
const phase=String(lifecycle.currentPhase||'');
const source=mode==='source',exp=mode==='export';
let ok=lifecycle.gateId==='block1-client360-insurers-lab-v20260717'&&lifecycle.gateContractVersion==='1.0.41'&&lifecycle.targetFingerprintCount===16&&lifecycle.retainedSourceContract?.requiresValidation===26&&lifecycle.privacyContract?.encryptedArtifactOnly===true;
if(source)ok=ok&&phase==='SOURCE_ONLY_RETAINED26_PSI_V30';
if(exp)ok=ok&&phase==='BLOCK1_RETAINED26_ENCRYPTED_EXPORT_READONLY_V30';
const out={schemaVersion:'orbit360-block1-v30-preflight-v1',gateId:lifecycle.gateId,contractVersion:lifecycle.gateContractVersion,mode,status:ok?(source?'PASS_V30_SOURCE_PREFLIGHT':'GO_V30_ENCRYPTED_EXPORT_READONLY'):'STOP_RETRY',classification:ok?'RETAINED26_PSI_V30_VALID':'PIPELINE_MECHANISM_FAILURE',targetFingerprintCount:16,firestoreReadOperationsMaximum:exp?2:0,executionAuthorized:!source&&ok,secretAccessAuthorized:!source&&ok,firestoreReadAuthorized:!source&&ok,firestoreWriteAuthorized:false,authReadAuthorized:false,authWriteAuthorized:false,browserAuthorized:false,hostingAuthorized:false,functionsDeployAuthorized:false,rulesDeployAuthorized:false,reimportAuthorized:false,productionAuthorized:false,writesAuthorized:0,containsPII:false,containsSecrets:false,ok};
const p=process.env.ORBIT360_V30_PREFLIGHT_EVIDENCE||'orbit360-platform/runtime-gate-crm-v20260716/v30-block1-preflight-sanitized-v20260807.json';fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(out,null,2)+'\n','utf8');console.log(JSON.stringify(out,null,2));process.exit(ok?0:41);
