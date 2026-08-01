#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const ROOT=process.cwd();
const GATE='block10.9-cobros-controlled-write-lab-v20260801';
const VERSION='10.9.0';
const SPECIFIC='tools/orbit360-validar-cobros-controlled-write-preflight-static-v20260801.mjs';
const SPECIFIC_EVIDENCE='orbit360-platform/runtime-gate-crm-v20260716/cobros-controlled-write-preflight-static-v20260801.json';
const CANONICAL_EVIDENCE='orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json';
const LIFECYCLE='tools/orbit360-validator-lifecycle-contract-cobros-controlled-write-lab-v20260801.json';
const REQUEST='.github/orbit360-requests/cobros-controlled-write-lab-v20260801.json';
const DIAGNOSIS='.github/orbit360-diagnostics/cobros-controlled-write-lab-v20260801.json';
const POST_CLOSE='.github/orbit360-diagnostics/cobros-post-close-relations-readonly-v20260801.json';
const PHRASE='AUTORIZO ARMAR Y EJECUTAR GATE 10.9 COBROS LAB CINCO CASOS SIN DEPLOY NI PRODUCCION';
const PACKAGE_SHA='beebdac90668291686f55610bdc2d8853ae5f2de4ae17b73732bb03812218911';
const PACKAGE_LOGICAL='fccae1f73d254a0fca8e1a0208a92f4a9a601bc83c8f8e26cb027be165f354bb';

function readJson(rel){return JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8'));}
function write(payload){const target=path.join(ROOT,CANONICAL_EVIDENCE);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(payload,null,2)+'\n','utf8');}
function validateRequest(){
  if(!fs.existsSync(path.join(ROOT,REQUEST)))throw new Error('AUTHORIZED_REQUEST_MISSING');
  const request=readJson(REQUEST),refs=request.authorizationRefs||[];
  if(request.schemaVersion!=='orbit360-cobros-controlled-write-lab-request-v1'||request.gateId!==GATE||request.contractVersion!==VERSION||request.approved!==true||request.phrase!==PHRASE)throw new Error('AUTHORIZED_REQUEST_INVALID');
  if(request.tenantId!=='alianzas-soluciones'||request.projectId!=='ays-orbit-360-lab'||request.consumed!==false)throw new Error('AUTHORIZED_REQUEST_SCOPE');
  if(request.scope?.cases!==5||request.scope?.direct!==4||request.scope?.historical!==1||request.scope?.snapshots!==11||request.scope?.operations!==10||request.scope?.rollbacks!==11||request.scope?.cobros!==5||request.scope?.receiptUpdates!==4||request.scope?.receiptCreates!==1||request.scope?.policyWrites!==0||request.scope?.finmovs!==0)throw new Error('AUTHORIZED_REQUEST_COUNTS');
  if(refs.length!==5||new Set(refs).size!==5||!refs.every(x=>/^cob-auth-[a-f0-9]{24}$/.test(x)))throw new Error('AUTHORIZED_REQUEST_REFS');
  if(request.privatePackage?.driveFileId!=='1FGpp_v6ZTs52VEeOnsH2IxoNCqWwVoAD'||request.privatePackage?.sha256!==PACKAGE_SHA||request.privatePackage?.logicalSha256!==PACKAGE_LOGICAL)throw new Error('AUTHORIZED_PACKAGE_MISMATCH');
  if(request.capabilities?.secrets!==true||request.capabilities?.firestoreRead!==true||request.capabilities?.writes!==true||request.capabilities?.runtime!==false||request.capabilities?.browser!==false||request.capabilities?.deploy!==false||request.capabilities?.functionsDeploy!==false||request.capabilities?.rulesDeploy!==false||request.capabilities?.production!==false)throw new Error('AUTHORIZED_CAPABILITIES_MISMATCH');
  return request;
}
function base(plan){return {gateId:GATE,contractVersion:VERSION,plan,genericWriterRemainsBlockedForCobros:true,failed:0,failedCheckIds:[],dataAccess:false,secretAccess:false,operationalWrites:0,evidenceWrites:1,secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsPolicyNumbers:false,containsAmounts:false,containsSecrets:false};}
function plan(){return {cases:5,direct:4,historical:1,atomicGroups:5,snapshots:11,operations:10,rollbacks:11,cobros:5,receiptUpdates:4,receiptCreates:1,policyWrites:0,finmovs:0};}
function armedPayload(){validateRequest();return {schemaVersion:'orbit360-cobros-controlled-write-canonical-armed-v1',status:'GO_GATE_CONTRACT',classification:'AUTHORIZED_LAB_WRITE_CONTRACT_READY',canonicalPhase:'LAB_DATA_CONTRACT_REPAIR_APPLY',phase:'ARMED_BY_EXPLICIT_LAB_AUTHORIZATION',requestExists:true,requestState:'EXACT_AUTHORIZED_REQUIRED',privatePackageVerifiedByContract:true,packageCanonicalization:'node-json-stable-sort-v1',executionAuthorized:true,labWriteAuthorized:true,writeEligible:5,...base(plan())};}
function diagnosisPayload(lifecycle){
  validateRequest();if(!fs.existsSync(path.join(ROOT,DIAGNOSIS)))throw new Error('DIAGNOSIS_REQUEST_MISSING');const d=readJson(DIAGNOSIS);
  if(d.schemaVersion!=='orbit360-cobros-controlled-write-lab-diagnosis-request-v1'||d.gateId!==GATE||d.contractVersion!==VERSION||d.mode!=='READ_ONLY_ROOT_CAUSE_DIAGNOSIS'||d.approved!==true)throw new Error('DIAGNOSIS_REQUEST_INVALID');
  if(d.capabilities?.secrets!==true||d.capabilities?.firestoreRead!==true||d.capabilities?.writes!==false||d.capabilities?.runtime!==false||d.capabilities?.browser!==false||d.capabilities?.deploy!==false||d.capabilities?.functionsDeploy!==false||d.capabilities?.rulesDeploy!==false||d.capabilities?.production!==false)throw new Error('DIAGNOSIS_CAPABILITIES_MISMATCH');
  if(lifecycle.status!=='ROOT_CAUSE_DIAGNOSIS_ACTIVE'||lifecycle.executionProfile?.mode!=='READ_ONLY_ROOT_CAUSE_DIAGNOSIS'||lifecycle.writeAuthorized!==false||lifecycle.thirdExecutionProhibited!==true||lifecycle.diagnosisAuthorized!==true)throw new Error('DIAGNOSIS_LIFECYCLE_INVALID');
  return {schemaVersion:'orbit360-cobros-controlled-write-canonical-diagnosis-v1',status:'GO_GATE_CONTRACT',classification:'READ_ONLY_ROOT_CAUSE_DIAGNOSIS_READY',canonicalPhase:'LAB_DATA_CONTRACT_REPAIR_DIAGNOSIS',phase:'READ_ONLY_ROOT_CAUSE_DIAGNOSIS',requestExists:true,requestState:'WRITE_FROZEN_DIAGNOSIS_ONLY',privatePackageVerifiedByContract:true,packageCanonicalization:'node-json-stable-sort-v1',executionAuthorized:false,labWriteAuthorized:false,writeEligible:0,diagnosisAuthorized:true,diagnosisCaseOrdinal:3,thirdExecutionProhibited:true,...base(plan())};
}
function postClosePayload(lifecycle){
  validateRequest();if(!fs.existsSync(path.join(ROOT,POST_CLOSE)))throw new Error('POST_CLOSE_REQUEST_MISSING');const d=readJson(POST_CLOSE);
  if(d.schemaVersion!=='orbit360-cobros-post-close-relations-readonly-request-v1'||d.gateId!==GATE||d.contractVersion!==VERSION||d.mode!=='READ_ONLY_POST_CLOSE_RELATION_VERIFICATION'||d.approved!==true)throw new Error('POST_CLOSE_REQUEST_INVALID');
  if(d.capabilities?.secrets!==true||d.capabilities?.firestoreRead!==true||d.capabilities?.writes!==false||d.capabilities?.runtime!==false||d.capabilities?.browser!==false||d.capabilities?.deploy!==false||d.capabilities?.functionsDeploy!==false||d.capabilities?.rulesDeploy!==false||d.capabilities?.production!==false)throw new Error('POST_CLOSE_CAPABILITIES_MISMATCH');
  if(lifecycle.status!=='POST_CLOSE_READONLY_VERIFICATION_ACTIVE'||lifecycle.executionProfile?.mode!=='READ_ONLY_POST_CLOSE_VERIFICATION'||lifecycle.executionProfile?.phase!=='LAB_DATA_CONTRACT_REPAIR_DRYRUN'||lifecycle.writeAuthorized!==false||lifecycle.additionalExecutionProhibited!==true||lifecycle.requestSemanticallyConsumed!==true)throw new Error('POST_CLOSE_LIFECYCLE_INVALID');
  return {schemaVersion:'orbit360-cobros-post-close-canonical-readonly-v1',status:'GO_GATE_CONTRACT',classification:'READ_ONLY_POST_CLOSE_RELATION_VERIFICATION_READY',canonicalPhase:'LAB_DATA_CONTRACT_REPAIR_DRYRUN',phase:'READ_ONLY_POST_CLOSE_RELATION_VERIFICATION',requestExists:true,requestState:'SEALED_NO_REPLAY',privatePackageVerifiedByContract:true,packageCanonicalization:'node-json-stable-sort-v1',executionAuthorized:false,labWriteAuthorized:false,writeEligible:0,postCloseReadOnlyAuthorized:true,requestReplayBlocked:true,...base(plan())};
}
function closedPayload(lifecycle){
  if(lifecycle.status!=='CLOSED_WRITE_PASS'||lifecycle.writeAuthorized!==false||lifecycle.additionalExecutionProhibited!==true||lifecycle.requestSemanticallyConsumed!==true)throw new Error('CLOSED_LIFECYCLE_INVALID');
  return {schemaVersion:'orbit360-cobros-controlled-write-canonical-closed-v1',status:'GO_GATE_CONTRACT',classification:'CLOSED_WRITE_PASS_NO_ACCESS',canonicalPhase:'VERIFIED_OR_ROLLED_BACK',phase:'CLOSED_WRITE_PASS',requestExists:true,requestState:'SEALED_NO_REPLAY',executionAuthorized:false,labWriteAuthorized:false,writeEligible:0,requestReplayBlocked:true,...base(plan())};
}
try{
  if(process.argv[2]!==GATE)throw new Error('GATE_ID_MISMATCH');
  if(String(process.env.ORBIT360_BRANCH||'')!=='ays/backend-tenant-lab-v99-20260703')throw new Error('BRANCH_MISMATCH');
  const lifecycle=readJson(LIFECYCLE);let payload;
  if(lifecycle.status==='POST_CLOSE_READONLY_VERIFICATION_ACTIVE')payload=postClosePayload(lifecycle);
  else if(lifecycle.status==='CLOSED_WRITE_PASS')payload=closedPayload(lifecycle);
  else if(lifecycle.status==='ROOT_CAUSE_DIAGNOSIS_ACTIVE')payload=diagnosisPayload(lifecycle);
  else if(lifecycle.currentPhase==='ARMED_BY_EXPLICIT_LAB_AUTHORIZATION')payload=armedPayload();
  else{
    const run=spawnSync(process.execPath,[SPECIFIC],{cwd:ROOT,encoding:'utf8',maxBuffer:16*1024*1024});if(run.status!==0)throw new Error('SPECIFIC_VALIDATOR_FAILED_'+run.status);
    const sourcePath=path.join(ROOT,SPECIFIC_EVIDENCE);if(!fs.existsSync(sourcePath))throw new Error('SPECIFIC_EVIDENCE_MISSING');
    const source=JSON.parse(fs.readFileSync(sourcePath,'utf8'));if(source.gateId!==GATE||source.contractVersion!==VERSION||source.status!=='GO_GATE_CONTRACT'||source.failed!==0)throw new Error('SPECIFIC_EVIDENCE_INVALID');
    payload={...source,schemaVersion:'orbit360-cobros-controlled-write-canonical-preflight-v1',gateId:GATE,contractVersion:VERSION,status:'GO_GATE_CONTRACT',classification:'STATIC_CONTRACT_READY',canonicalPhase:'STATIC_PREFLIGHT',dataAccess:false,secretAccess:false,operationalWrites:0,evidenceWrites:1,secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
  }
  write(payload);console.log(JSON.stringify(payload,null,2));
}catch(error){const payload={schemaVersion:'orbit360-cobros-controlled-write-canonical-v1',gateId:GATE,contractVersion:VERSION,status:'VALIDATOR_STALE',classification:'PIPELINE_MECHANISM_FAILURE',failed:1,failedCheckIds:['CANONICAL_ENGINE'],error:String(error&&error.message||error).slice(0,500),dataAccess:false,secretAccess:false,operationalWrites:0,evidenceWrites:1,secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};write(payload);console.error(JSON.stringify(payload,null,2));process.exit(41);}
