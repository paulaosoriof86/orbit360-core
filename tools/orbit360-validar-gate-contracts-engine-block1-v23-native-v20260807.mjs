#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const GATE_ID = 'block1-client360-insurers-lab-v20260717';
const CONTRACT = '1.0.41';
const EVIDENCE_REL = 'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json';
const OVERLAY_REL = 'tools/orbit360-gate-contract-block1-v23-native-v20260807.json';
const LIFECYCLE_REL = 'tools/orbit360-validator-lifecycle-block1-v23-native-v20260807.json';
const FREEZE_REL = 'tools/orbit360-incident-freeze-v20260721.json';
const MATRIX_REL = 'tools/orbit360-block1-native-matrix-v23-canonical-v20260807.mjs';
const IMPLEMENTATION_REL = 'tools/orbit360-block1-native-matrix-v23-v20260807.mjs';
const OBSERVER_REL = 'tools/orbit360-event-driven-render-observer-v23.mjs';
const ADJUDICATOR_REL = 'tools/orbit360-adjudicate-block1-universe-readonly-v23-v20260807.mjs';
const SOURCE_TEST_REL = 'tools/orbit360-test-v23-native-block1-source-v20260807.mjs';
const SOURCE_WORKFLOW_REL = '.github/workflows/orbit360-sourcecheck-v23-native-block1-v20260807.yml';
const RUNTIME_WORKFLOW_REL = '.github/workflows/orbit360-registered-relay-v23-native-block1-v20260807.yml';
const REQUEST_REL = process.env.ORBIT360_REQUEST_FILE || '.github/orbit360-requests/block1-client360-insurers-v23-authorization.json';
const EXPECTED_REQUEST_VERSION = process.env.ORBIT360_EXPECTED_REQUEST_VERSION || 'NONE_PENDING_FRESH_AUTHORIZATION';
const CANONICAL_BRANCH = 'ays/backend-tenant-lab-v99-20260703';
const AUTHORIZED_BASE = 'ef9e0e1e738ce407025ed159067d8b3cc4d2683b';
const SOURCE_PHASE = 'SOURCE_ONLY_NATIVE_MATRIX_VALIDATION';
const RUNTIME_PHASE = 'BLOCK1_NATIVE_MATRIX_RUNTIME_V23';
const SOURCE_CAPS = { secrets:false, firestoreRead:false, writes:false, runtime:false, browser:false, deploy:false, functionsDeploy:false, rulesDeploy:false, production:false };
const RUNTIME_CAPS = { secrets:true, firestoreRead:true, writes:false, runtime:true, browser:true, deploy:true, functionsDeploy:false, rulesDeploy:false, production:false };

const readJson = rel => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/^\uFEFF/, ''));
const exists = rel => fs.existsSync(path.join(ROOT, rel));
const exact = (a,b) => JSON.stringify(a || {}) === JSON.stringify(b || {});
const safe = value => String(value == null ? '' : value).replace(/[\w.+-]+@[\w.-]+/g,'[email]').slice(0,900);
function write(value){ const file=path.join(ROOT,EVIDENCE_REL); fs.mkdirSync(path.dirname(file),{recursive:true}); fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8'); }
function git(args){ return spawnSync('git',args,{cwd:ROOT,encoding:'utf8'}); }
function stop(id,detail,phase=''){
  const output={schemaVersion:'orbit360-gate-contract-preflight-v23-native-block1',gateId:GATE_ID,contractVersion:CONTRACT,diagnosticRevision:'native-block1-matrix-owner-20260807-v2',executionPhase:phase||'UNKNOWN',status:'VALIDATOR_STALE',classification:'VALIDATOR_STALE',total:1,passed:0,failed:1,failedCheckIds:[id],detail:safe(detail),sourceTransformed:false,dataAccess:false,secretAccess:false,secretsRead:false,firestoreRead:false,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false,ok:false}; write(output); console.log(JSON.stringify(output,null,2)); process.exit(41);
}

for(const rel of [OVERLAY_REL,LIFECYCLE_REL,FREEZE_REL,MATRIX_REL,IMPLEMENTATION_REL,OBSERVER_REL,ADJUDICATOR_REL,SOURCE_TEST_REL,SOURCE_WORKFLOW_REL,RUNTIME_WORKFLOW_REL]) if(!exists(rel)) stop('V23_REQUIRED_FILE_MISSING',rel);
const overlay=readJson(OVERLAY_REL); const lifecycle=readJson(LIFECYCLE_REL); const freeze=readJson(FREEZE_REL);
const phase=lifecycle.currentPhase || lifecycle.executionProfile && lifecycle.executionProfile.phase || '';
if(overlay.gateId!==GATE_ID || overlay.contractVersion!==CONTRACT || overlay.predecessorContractVersion!=='1.0.40' || overlay.block!==1) stop('V23_OVERLAY_IDENTITY_MISMATCH',`${overlay.gateId}:${overlay.contractVersion}`,phase);
if(lifecycle.gateId!==GATE_ID || lifecycle.gateContractVersion!==CONTRACT) stop('V23_LIFECYCLE_IDENTITY_MISMATCH',`${lifecycle.gateId}:${lifecycle.gateContractVersion}`,phase);
if(!overlay.mechanism || overlay.mechanism.nativeRuntimeArtifact!==MATRIX_REL || overlay.mechanism.nativeImplementation!==IMPLEMENTATION_REL || overlay.mechanism.generatedFromPriorArtifact!==false || overlay.mechanism.textualTransform!==false || overlay.mechanism.sourceSurgery!==false) stop('V23_NATIVE_MECHANISM_INVALID','overlay mechanism',phase);
if(JSON.stringify(overlay.blockingRoutes)!==JSON.stringify(['inicio','cliente360','aseguradoras'])) stop('V23_BLOCKING_SCOPE_INVALID',JSON.stringify(overlay.blockingRoutes),phase);
if(!(overlay.universe && overlay.universe.expected && overlay.universe.expected.clientes===414 && overlay.universe.expected.aseguradoras===26 && overlay.universe.expected.asesores===7 && overlay.universe.executeAfterGoBeforeHosting===true && overlay.universe.requiresValidationExcluded===false)) stop('V23_UNIVERSE_CONTRACT_INVALID','expected 414/26/7',phase);
if(!(freeze.stateClarification && freeze.stateClarification.m1Closed===true && freeze.stateClarification.m2Closed===true && freeze.m2RuntimeAuthorization && freeze.m2RuntimeAuthorization.active===false && freeze.m2RuntimeAuthorization.allowedExecutions===0)) stop('V23_FREEZE_HISTORY_NOT_CLOSED','M1/M2 historical closure required',phase);
if(!(freeze.preservedClosures && freeze.preservedClosures.clients===414 && freeze.preservedClosures.insurers===26 && freeze.preservedClosures.advisors===7)) stop('V23_PRESERVED_UNIVERSE_MISMATCH',JSON.stringify(freeze.preservedClosures||{}),phase);

const syntaxFiles=[MATRIX_REL,IMPLEMENTATION_REL,OBSERVER_REL,ADJUDICATOR_REL,SOURCE_TEST_REL];
for(const rel of syntaxFiles){ const check=spawnSync(process.execPath,['--check',rel],{cwd:ROOT,encoding:'utf8'}); if(check.status!==0) stop('V23_NATIVE_SOURCE_SYNTAX',`${rel}:${check.stderr||check.stdout}`,phase); }
const importCheck=spawnSync(process.execPath,[MATRIX_REL],{cwd:ROOT,encoding:'utf8',env:{...process.env,ORBIT360_MATRIX_ARTIFACT_VALIDATE_ONLY:'1'}});
if(importCheck.status!==0 || !/PASS_V23_NATIVE_MATRIX_IMPORT/.test(importCheck.stdout||'') || !/1\.0\.41/.test(importCheck.stdout||'')) stop('V23_EXACT_NATIVE_IMPORT_FAILED',importCheck.stderr||importCheck.stdout,phase);

if(phase===SOURCE_PHASE){
  if(!exact(lifecycle.executionProfile && lifecycle.executionProfile.capabilities,SOURCE_CAPS) || lifecycle.executionAuthorized!==false || lifecycle.allowedExecutions!==1 || lifecycle.authorizationReserved!==true || lifecycle.authorizationFrozen!==false) stop('V23_SOURCE_CAPABILITIES_INVALID',JSON.stringify(lifecycle.executionProfile||{}),phase);
  if(exists(REQUEST_REL)) stop('V23_REQUEST_EXISTS_BEFORE_SOURCE_PASS',REQUEST_REL,phase);
  const head=git(['rev-parse','HEAD']); if(head.status!==0) stop('V23_SOURCE_HEAD_UNRESOLVED',head.stderr,phase);
  const ancestry=git(['merge-base','--is-ancestor',AUTHORIZED_BASE,String(head.stdout||'').trim()]); if(ancestry.status!==0) stop('V23_AUTHORIZED_BASE_NOT_ANCESTOR',AUTHORIZED_BASE,phase);
  const sourceTest=spawnSync(process.execPath,[SOURCE_TEST_REL],{cwd:ROOT,encoding:'utf8',env:process.env,maxBuffer:32*1024*1024});
  if(sourceTest.status!==0 || !/PASS_V23_NATIVE_BLOCK1_SOURCE_ONLY/.test(sourceTest.stdout||'')) stop('V23_SOURCE_TEST_FAILED',sourceTest.stderr||sourceTest.stdout,phase);
  const output={schemaVersion:'orbit360-gate-contract-preflight-v23-native-block1',gateId:GATE_ID,contractVersion:CONTRACT,diagnosticRevision:'native-block1-matrix-owner-20260807-v2',executionPhase:SOURCE_PHASE,status:'PASS_GATE_CONTRACT_SOURCE_V23',classification:'VALIDATOR_STALE_CORRECTED_SOURCE_ONLY',total:20,passed:20,failed:0,failedCheckIds:[],canonicalOwnerScope:'v23_native_overlay_replace_historical_css_owner',runtimeContractScope:'v23_exact_canonical_entrypoint',sourceTransformed:false,nativeRuntimeArtifact:MATRIX_REL,nativeImplementation:IMPLEMENTATION_REL,sharedObserver:OBSERVER_REL,universeAdjudicator:ADJUDICATOR_REL,authorizedBaseHead:AUTHORIZED_BASE,requestPresent:false,executionAuthorized:false,secretAccessAuthorized:false,firestoreReadAuthorized:false,writeAuthorized:false,runtimeAuthorized:false,browserAuthorized:false,hostingDeployAuthorized:false,hostingDeploysMaximum:0,functionsDeployAuthorized:false,rulesDeployAuthorized:false,productionAuthorized:false,dataAccess:false,secretAccess:false,secretsRead:false,firestoreRead:false,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false,ok:true}; write(output); console.log(JSON.stringify(output,null,2)); process.exit(0);
}

if(phase!==RUNTIME_PHASE) stop('V23_LIFECYCLE_PHASE_UNSUPPORTED',phase,phase);
if(!exact(lifecycle.executionProfile && lifecycle.executionProfile.capabilities,RUNTIME_CAPS) || lifecycle.executionAuthorized!==true || lifecycle.allowedExecutions!==1 || lifecycle.stopRetryActive!==false) stop('V23_RUNTIME_CAPABILITIES_INVALID',JSON.stringify(lifecycle.executionProfile||{}),phase);
if(EXPECTED_REQUEST_VERSION!=='20260807.23-native-block1-runtime') stop('V23_EXPECTED_REQUEST_VERSION_INVALID',EXPECTED_REQUEST_VERSION,phase);
if(!exists(REQUEST_REL)) stop('V23_RUNTIME_REQUEST_MISSING',REQUEST_REL,phase);
const request=readJson(REQUEST_REL);
if(!(request.requestVersion===EXPECTED_REQUEST_VERSION && request.gateId===GATE_ID && request.contractVersion===CONTRACT && request.status==='AUTHORIZED_ONCE' && request.approved===true && request.allowedExecutions===1 && request.consumed===false && request.authorizationFrozen===false && request.replayAllowed===false)) stop('V23_RUNTIME_REQUEST_INVALID',request.status||'',phase);
if(!(request.scope && request.scope.universeAdjudicationAfterGoBeforeHosting===true && request.scope.hostingDeploysMaximum===1 && request.scope.firestoreWrites===false && request.scope.authWrites===false && request.scope.operationalWrites===false && request.scope.reimport===false && request.scope.production===false && request.scope.main===false && request.scope.merge===false)) stop('V23_RUNTIME_SCOPE_INVALID','request scope',phase);
const branch=process.env.ORBIT360_BRANCH || process.env.GITHUB_HEAD_REF || '';
if(branch && branch!==CANONICAL_BRANCH) stop('V23_RUNTIME_BRANCH_MISMATCH',branch,phase);
const output={schemaVersion:'orbit360-gate-contract-preflight-v23-native-block1',gateId:GATE_ID,contractVersion:CONTRACT,diagnosticRevision:'native-block1-matrix-owner-20260807-v2',executionPhase:RUNTIME_PHASE,status:'GO_GATE_CONTRACT',classification:'GO_NATIVE_BLOCK1_RUNTIME_V23',total:24,passed:24,failed:0,failedCheckIds:[],canonicalOwnerScope:'v23_native_overlay_replace_historical_css_owner',runtimeContractScope:'v23_exact_canonical_entrypoint',sourceTransformed:false,nativeRuntimeArtifact:MATRIX_REL,nativeImplementation:IMPLEMENTATION_REL,sharedObserver:OBSERVER_REL,universeAdjudicator:ADJUDICATOR_REL,requestVersion:EXPECTED_REQUEST_VERSION,executionAuthorized:true,secretAccessAuthorized:true,firestoreReadAuthorized:true,writeAuthorized:false,runtimeAuthorized:true,browserAuthorized:true,hostingDeployAuthorized:true,hostingDeploysMaximum:1,hostingBackupCloneAuthorized:true,hostingRollbackCloneAuthorizedOnFailure:true,functionsDeployAuthorized:false,rulesDeployAuthorized:false,productionAuthorized:false,firestoreWritesAuthorized:0,authWritesAuthorized:0,operationalWritesAuthorized:0,universeAdjudicationRequiredBeforeHosting:true,dataAccess:false,secretAccess:false,secretsRead:false,firestoreRead:false,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false,ok:true}; write(output); console.log(JSON.stringify(output,null,2)); process.exit(0);