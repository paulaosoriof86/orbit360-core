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
const PHRASE='AUTORIZO ARMAR Y EJECUTAR GATE 10.9 COBROS LAB CINCO CASOS SIN DEPLOY NI PRODUCCION';
const PACKAGE_SHA='15a573e16514d702066b2500a43d714b382830638fc1e253a1a704b9e0616576';
const PACKAGE_LOGICAL='997bfc0614b4a65e8c4b5e7832996fbbe6b0063f9f0efdf3ca99b57aa79f4ff8';

function readJson(rel){return JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8'));}
function write(payload){const target=path.join(ROOT,CANONICAL_EVIDENCE);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(payload,null,2)+'\n','utf8');}
function armedPayload(){
  if(!fs.existsSync(path.join(ROOT,REQUEST)))throw new Error('AUTHORIZED_REQUEST_MISSING');
  const request=readJson(REQUEST),refs=request.authorizationRefs||[];
  if(request.schemaVersion!=='orbit360-cobros-controlled-write-lab-request-v1'||request.gateId!==GATE||request.contractVersion!==VERSION||request.approved!==true||request.phrase!==PHRASE)throw new Error('AUTHORIZED_REQUEST_INVALID');
  if(request.tenantId!=='alianzas-soluciones'||request.projectId!=='ays-orbit-360-lab'||request.consumed!==false)throw new Error('AUTHORIZED_REQUEST_SCOPE');
  if(request.scope?.cases!==5||request.scope?.direct!==4||request.scope?.historical!==1||request.scope?.snapshots!==11||request.scope?.operations!==10||request.scope?.rollbacks!==11||request.scope?.cobros!==5||request.scope?.receiptUpdates!==4||request.scope?.receiptCreates!==1||request.scope?.policyWrites!==0||request.scope?.finmovs!==0)throw new Error('AUTHORIZED_REQUEST_COUNTS');
  if(refs.length!==5||new Set(refs).size!==5||!refs.every(x=>/^cob-auth-[a-f0-9]{24}$/.test(x)))throw new Error('AUTHORIZED_REQUEST_REFS');
  if(request.privatePackage?.driveFileId!=='1FGpp_v6ZTs52VEeOnsH2IxoNCqWwVoAD'||request.privatePackage?.sha256!==PACKAGE_SHA||request.privatePackage?.logicalSha256!==PACKAGE_LOGICAL)throw new Error('AUTHORIZED_PACKAGE_MISMATCH');
  if(request.capabilities?.secrets!==true||request.capabilities?.firestoreRead!==true||request.capabilities?.writes!==true||request.capabilities?.runtime!==false||request.capabilities?.browser!==false||request.capabilities?.deploy!==false||request.capabilities?.functionsDeploy!==false||request.capabilities?.rulesDeploy!==false||request.capabilities?.production!==false)throw new Error('AUTHORIZED_CAPABILITIES_MISMATCH');
  return {schemaVersion:'orbit360-cobros-controlled-write-canonical-armed-v1',gateId:GATE,contractVersion:VERSION,status:'GO_GATE_CONTRACT',classification:'AUTHORIZED_LAB_WRITE_CONTRACT_READY',canonicalPhase:'LAB_DATA_CONTRACT_REPAIR_APPLY',phase:'ARMED_BY_EXPLICIT_LAB_AUTHORIZATION',requestExists:true,requestState:'EXACT_AUTHORIZED_REQUIRED',privatePackageVerifiedByContract:true,packageCanonicalization:'node-json-stable-sort-v1',plan:{cases:5,direct:4,historical:1,atomicGroups:5,snapshots:11,operations:10,rollbacks:11,cobros:5,receiptUpdates:4,receiptCreates:1,policyWrites:0,finmovs:0},executionAuthorized:true,labWriteAuthorized:true,writeEligible:5,genericWriterRemainsBlockedForCobros:true,failed:0,failedCheckIds:[],dataAccess:false,secretAccess:false,operationalWrites:0,evidenceWrites:1,secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsPolicyNumbers:false,containsAmounts:false,containsSecrets:false};
}
try{
  if(process.argv[2]!==GATE)throw new Error('GATE_ID_MISMATCH');
  if(String(process.env.ORBIT360_BRANCH||'')!=='ays/backend-tenant-lab-v99-20260703')throw new Error('BRANCH_MISMATCH');
  const lifecycle=readJson(LIFECYCLE);let payload;
  if(lifecycle.currentPhase==='ARMED_BY_EXPLICIT_LAB_AUTHORIZATION')payload=armedPayload();
  else{
    const run=spawnSync(process.execPath,[SPECIFIC],{cwd:ROOT,encoding:'utf8',maxBuffer:16*1024*1024});if(run.status!==0)throw new Error('SPECIFIC_VALIDATOR_FAILED_'+run.status);
    const sourcePath=path.join(ROOT,SPECIFIC_EVIDENCE);if(!fs.existsSync(sourcePath))throw new Error('SPECIFIC_EVIDENCE_MISSING');
    const source=JSON.parse(fs.readFileSync(sourcePath,'utf8'));if(source.gateId!==GATE||source.contractVersion!==VERSION||source.status!=='GO_GATE_CONTRACT'||source.failed!==0)throw new Error('SPECIFIC_EVIDENCE_INVALID');
    payload={...source,schemaVersion:'orbit360-cobros-controlled-write-canonical-preflight-v1',gateId:GATE,contractVersion:VERSION,status:'GO_GATE_CONTRACT',classification:'STATIC_CONTRACT_READY',canonicalPhase:'STATIC_PREFLIGHT',dataAccess:false,secretAccess:false,operationalWrites:0,evidenceWrites:1,secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
  }
  write(payload);console.log(JSON.stringify(payload,null,2));
}catch(error){const payload={schemaVersion:'orbit360-cobros-controlled-write-canonical-v1',gateId:GATE,contractVersion:VERSION,status:'VALIDATOR_STALE',classification:'PIPELINE_MECHANISM_FAILURE',failed:1,failedCheckIds:['CANONICAL_ENGINE'],error:String(error&&error.message||error).slice(0,500),dataAccess:false,secretAccess:false,operationalWrites:0,evidenceWrites:1,secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};write(payload);console.error(JSON.stringify(payload,null,2));process.exit(41);}
