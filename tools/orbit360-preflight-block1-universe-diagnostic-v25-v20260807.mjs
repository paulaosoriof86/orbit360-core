#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const MODE = process.argv[2] || 'source';
const GATE_ID = 'block1-client360-insurers-lab-v20260717';
const CONTRACT_VERSION = '1.0.41';
const GENERATION = 'v25-differential-universe-diagnosis';
const REQUEST_VERSION = '20260807.25-differential-universe-diagnosis';
const LIFECYCLE = 'tools/orbit360-validator-lifecycle-block1-universe-diagnostic-v25-v20260807.json';
const REQUEST = process.env.ORBIT360_V25_REQUEST_FILE || '.github/orbit360-requests/block1-client360-insurers-v25-diagnostic-authorization.json';
const V24_FINAL = 'orbit360-platform/runtime-gate-crm-v20260716/v24-block1-final-sanitized-v20260807.json';
const V24_REQUEST = '.github/orbit360-requests/block1-client360-insurers-v24-authorization.json';
const V24_LIFECYCLE = 'tools/orbit360-validator-lifecycle-block1-v23-native-v20260807.json';
const TOOL = 'tools/orbit360-diagnose-block1-universe-differential-v25-v20260807.mjs';
const TEST = 'tools/orbit360-test-block1-universe-differential-v25-source-v20260807.mjs';
const EVIDENCE = process.env.ORBIT360_V25_PREFLIGHT_EVIDENCE || 'orbit360-platform/runtime-gate-crm-v20260716/v25-block1-diagnostic-preflight-sanitized-v20260807.json';

const abs = rel => path.join(ROOT, rel);
const exists = rel => fs.existsSync(abs(rel));
const read = rel => JSON.parse(fs.readFileSync(abs(rel),'utf8').replace(/^\uFEFF/,''));
function persist(out) { fs.mkdirSync(path.dirname(abs(EVIDENCE)),{recursive:true}); fs.writeFileSync(abs(EVIDENCE),JSON.stringify(out,null,2)+'\n','utf8'); console.log(JSON.stringify(out,null,2)); }
function fail(code, detail='') {
  const out = { schemaVersion:'orbit360-block1-v25-diagnostic-preflight-v1', gateId:GATE_ID, contractVersion:CONTRACT_VERSION, authorizationGeneration:GENERATION, mode:MODE, status:'STOP_RETRY_V25_PREFLIGHT', classification:'VALIDATOR_STALE', failedCheckId:code, detail:String(detail).slice(0,500), executionAuthorized:false, secretAccessAuthorized:false, firestoreReadAuthorized:false, firestoreWriteAuthorized:false, authReadAuthorized:false, authWriteAuthorized:false, browserAuthorized:false, hostingAuthorized:false, functionsDeployAuthorized:false, rulesDeployAuthorized:false, reimportAuthorized:false, productionAuthorized:false, writesAuthorized:0, containsPII:false, containsSecrets:false, ok:false };
  persist(out); process.exit(41);
}

for (const file of [LIFECYCLE,V24_FINAL,V24_REQUEST,V24_LIFECYCLE,TOOL,TEST]) if (!exists(file)) fail('V25_REQUIRED_FILE_MISSING',file);
const lifecycle = read(LIFECYCLE);
const v24Final = read(V24_FINAL);
const v24Request = read(V24_REQUEST);
const v24Lifecycle = read(V24_LIFECYCLE);

if (v24Final.gateId !== GATE_ID || v24Final.contractVersion !== CONTRACT_VERSION || v24Final.decision !== 'STOP_RETRY' || v24Final.classification !== 'DATA_CONTRACT_FAILURE' || v24Final.checkpoint !== 'UNIVERSE_ADJUDICATION' || v24Final.requestConsumed !== true || v24Final.authorizationFrozen !== true || v24Final.replayAllowed !== false) fail('V25_V24_TERMINAL_EVIDENCE_INVALID');
if (JSON.stringify(v24Final.observedRaw) !== JSON.stringify({clientes:430,aseguradoras:30,asesores:7}) || JSON.stringify(v24Final.observedEffective) !== JSON.stringify({clientes:430,aseguradoras:25,asesores:7})) fail('V25_V24_OBSERVED_UNIVERSE_DRIFT');
if (!(v24Request.consumed === true && v24Request.authorizationFrozen === true && v24Request.allowedExecutions === 0 && v24Request.replayAllowed === false)) fail('V25_V24_REQUEST_NOT_FROZEN');
if (!(v24Lifecycle.stopRetryActive === true && v24Lifecycle.authorizationFrozen === true && v24Lifecycle.allowedExecutions === 0 && v24Lifecycle.executionAuthorized === false)) fail('V25_V24_LIFECYCLE_NOT_FROZEN');
if (lifecycle.gateId !== GATE_ID || lifecycle.gateContractVersion !== CONTRACT_VERSION || lifecycle.authorizationGeneration !== GENERATION || lifecycle.expectedRequestVersion !== REQUEST_VERSION || lifecycle.diagnosticTool !== TOOL) fail('V25_LIFECYCLE_IDENTITY_INVALID');
if (!(lifecycle.protectedState?.productFrozen === true && lifecycle.protectedState?.owner1041Frozen === true && lifecycle.protectedState?.matrixFrozen === true && lifecycle.protectedState?.observerFrozen === true && lifecycle.protectedState?.authFrozen === true && lifecycle.protectedState?.storeFrozen === true && lifecycle.protectedState?.importersFrozen === true && lifecycle.protectedState?.rulesFrozen === true && lifecycle.protectedState?.backendProtectedFrozen === true && lifecycle.protectedState?.writesAuthorized === 0 && lifecycle.protectedState?.hostingAuthorized === false && lifecycle.protectedState?.browserAuthorized === false)) fail('V25_PROTECTED_STATE_NOT_FAIL_CLOSED');

if (MODE === 'source') {
  if (exists(REQUEST)) fail('V25_REQUEST_MUST_BE_ABSENT_DURING_SOURCE');
  if (!(lifecycle.status === 'SOURCE_VALIDATION_PENDING' && lifecycle.currentPhase === 'SOURCE_ONLY_UNIVERSE_DIAGNOSTIC_V25' && lifecycle.executionAuthorized === false && lifecycle.executionProfile?.capabilities?.secrets === false && lifecycle.executionProfile?.capabilities?.firestoreRead === false && lifecycle.executionProfile?.capabilities?.firestoreWrite === false && lifecycle.executionProfile?.capabilities?.browser === false && lifecycle.executionProfile?.capabilities?.hosting === false)) fail('V25_SOURCE_LIFECYCLE_NOT_FAIL_CLOSED');
  const out = { schemaVersion:'orbit360-block1-v25-diagnostic-preflight-v1', gateId:GATE_ID, contractVersion:CONTRACT_VERSION, authorizationGeneration:GENERATION, mode:MODE, status:'PASS_V25_SOURCE_PREFLIGHT', classification:'DATA_CONTRACT_FAILURE_ROOT_CAUSE_DIAGNOSTIC_SOURCE_ONLY', expectedPriorObserved:{raw:{clientes:430,aseguradoras:30,asesores:7},effective:{clientes:430,aseguradoras:25,asesores:7}}, baselineContract:{clientes:414,aseguradoras:26,asesores:7,batchTemplateHash:'source-manifest-controlled'}, executionAuthorized:false, secretAccessAuthorized:false, firestoreReadAuthorized:false, firestoreWriteAuthorized:false, authReadAuthorized:false, authWriteAuthorized:false, browserAuthorized:false, hostingAuthorized:false, functionsDeployAuthorized:false, rulesDeployAuthorized:false, reimportAuthorized:false, productionAuthorized:false, writesAuthorized:0, containsPII:false, containsSecrets:false, ok:true };
  persist(out); process.exit(0);
}

if (MODE !== 'diagnostic') fail('V25_PREFLIGHT_MODE_INVALID',MODE);
if (!exists(REQUEST)) fail('V25_DIAGNOSTIC_REQUEST_MISSING');
const request = read(REQUEST);
const caps = lifecycle.executionProfile?.capabilities || {};
if (!(lifecycle.status === 'AUTHORIZED_ONCE_PENDING_EXCLUSIVE_REQUEST' && lifecycle.currentPhase === 'BLOCK1_UNIVERSE_DIAGNOSTIC_V25' && lifecycle.executionAuthorized === true && lifecycle.allowedExecutions === 1 && lifecycle.authorizationFrozen === false && lifecycle.replayAllowed === false)) fail('V25_DIAGNOSTIC_LIFECYCLE_INVALID',lifecycle.status);
if (!(caps.secrets === true && caps.firestoreRead === true && caps.firestoreWrite === false && caps.authRead === false && caps.authWrite === false && caps.browser === false && caps.hosting === false && caps.functionsDeploy === false && caps.rulesDeploy === false && caps.reimport === false && caps.production === false)) fail('V25_DIAGNOSTIC_CAPABILITIES_INVALID',JSON.stringify(caps));
if (!(request.requestVersion === REQUEST_VERSION && request.authorizationGeneration === GENERATION && request.gateId === GATE_ID && request.contractVersion === CONTRACT_VERSION && request.status === 'AUTHORIZED_ONCE' && request.approved === true && request.allowedExecutions === 1 && request.consumed === false && request.authorizationFrozen === false && request.replayAllowed === false)) fail('V25_DIAGNOSTIC_REQUEST_INVALID',request.status);
if (!(request.scope?.firestoreReadsMaximum === 3 && request.scope?.firestoreWrites === false && request.scope?.authReads === false && request.scope?.authWrites === false && request.scope?.hosting === false && request.scope?.browser === false && request.scope?.reimport === false && request.scope?.production === false && request.scope?.main === false && request.scope?.merge === false)) fail('V25_DIAGNOSTIC_REQUEST_SCOPE_INVALID');
const out = { schemaVersion:'orbit360-block1-v25-diagnostic-preflight-v1', gateId:GATE_ID, contractVersion:CONTRACT_VERSION, authorizationGeneration:GENERATION, mode:MODE, status:'GO_V25_DIAGNOSTIC_READONLY', classification:'GO_DATA_CONTRACT_ROOT_CAUSE_DIAGNOSTIC_READONLY', executionAuthorized:true, secretAccessAuthorized:true, firestoreReadAuthorized:true, firestoreReadsMaximum:3, firestoreWriteAuthorized:false, authReadAuthorized:false, authWriteAuthorized:false, browserAuthorized:false, hostingAuthorized:false, functionsDeployAuthorized:false, rulesDeployAuthorized:false, reimportAuthorized:false, productionAuthorized:false, writesAuthorized:0, containsPII:false, containsSecrets:false, ok:true };
persist(out); process.exit(0);
