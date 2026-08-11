#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const GATE_ID='block1-client360-insurers-lab-v20260717';
const CONTRACT_VERSION='1.0.41';
const LIFECYCLE='tools/orbit360-validator-lifecycle-block1-controlled-provenance-exception-runtime-v20260810.json';
const POLICY='tools/orbit360-block1-controlled-provenance-exception-policy-v20260810.json';
const EVIDENCE='orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json';
const EXPECTED_TARGETS=['43a8841d19f7fec03ad6','a96956c63fdf22d44cfe'];
const EXPECTED_CAPS={secrets:true,firestoreRead:true,writes:false,runtime:true,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false};

const readJson=rel=>JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8').replace(/^\uFEFF/,''));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function seal(payload){fs.mkdirSync(path.dirname(path.join(ROOT,EVIDENCE)),{recursive:true});fs.writeFileSync(path.join(ROOT,EVIDENCE),JSON.stringify(payload,null,2)+'\n','utf8');}
function stop(error){const out={schemaVersion:'orbit360-block1-controlled-provenance-exception-preflight-v1',gateId:GATE_ID,contractVersion:CONTRACT_VERSION,status:'STOP_RETRY',classification:'PIPELINE_MECHANISM_FAILURE',checkpoint:'CONTROLLED_PROVENANCE_EXCEPTION_PREFLIGHT',rootCause:String(error?.message||error).slice(0,220),executionAuthorized:false,secretAccessAuthorized:false,firestoreReadAuthorized:false,firestoreWritesAuthorized:0,authReadsAuthorized:0,loggingReadsAuthorized:0,iamReadsAuthorized:0,operationalWritesAuthorized:0,runtimeExecuted:false,secretAccess:false,firestoreRead:false,operationalWrites:0,browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false,ok:false};seal(out);console.log(JSON.stringify(out));process.exit(41);}
try{
  const lifecycle=readJson(LIFECYCLE);
  const policy=readJson(POLICY);
  const requestFile=process.env.ORBIT360_REQUEST_FILE||'';
  const expectedVersion=process.env.ORBIT360_EXPECTED_REQUEST_VERSION||'';
  const expectedParent=process.env.ORBIT360_EXPECTED_PARENT_HEAD||'';
  if(!requestFile||!fs.existsSync(path.join(ROOT,requestFile)))throw new Error('REQUEST_FILE_MISSING');
  const request=readJson(requestFile);
  if(lifecycle.gateId!==GATE_ID||lifecycle.gateContractVersion!==CONTRACT_VERSION)throw new Error('LIFECYCLE_GATE_OR_VERSION_MISMATCH');
  if(lifecycle.currentPhase!=='BLOCK1_CONTROLLED_PROVENANCE_EXCEPTION_IMPACT_READONLY')throw new Error('LIFECYCLE_PHASE_MISMATCH');
  if(!same(lifecycle.executionProfile?.capabilities,EXPECTED_CAPS))throw new Error('LIFECYCLE_CAPABILITY_MISMATCH');
  if(policy.gateId!==GATE_ID||policy.contractVersion!==CONTRACT_VERSION)throw new Error('POLICY_GATE_OR_VERSION_MISMATCH');
  if(policy.decision!=='GO_PRODUCTION_PATH_WITH_2_CONTROLLED_CLIENT_PROVENANCE_EXCEPTIONS'||policy.authorizedByUser!==true)throw new Error('POLICY_DECISION_NOT_AUTHORIZED');
  if(policy.baselineContract?.clientes!==414||policy.baselineContract?.aseguradoras!==26||policy.baselineContract?.asesores!==7||policy.baselineContract?.changedByException!==false)throw new Error('BASELINE_CONTRACT_MUTATED');
  if(!same(policy.sourceEvidence?.unresolvedFingerprints,EXPECTED_TARGETS)||policy.sourceEvidence?.unresolvedCount!==2)throw new Error('POLICY_TARGET_SET_MISMATCH');
  if(policy.releaseTreatment?.deleteClients!==false||policy.releaseTreatment?.hideClients!==false||policy.releaseTreatment?.mergeClients!==false||policy.releaseTreatment?.reimportClients!==false||policy.releaseTreatment?.mutateClients!==false||policy.releaseTreatment?.changeContractCountsToForcePass!==false)throw new Error('POLICY_UNSAFE_TREATMENT');
  if(request.schemaVersion!=='orbit360-runtime-request-v1'||request.gateId!==GATE_ID||request.contractVersion!==CONTRACT_VERSION)throw new Error('REQUEST_GATE_OR_VERSION_MISMATCH');
  if(request.requestVersion!==expectedVersion||request.status!=='AUTHORIZED_ONCE'||request.approved!==true||request.authorizedByUser!==true||request.allowedExecutions!==1||request.consumed!==false||request.authorizationFrozen!==false||request.replayAllowed!==false)throw new Error('REQUEST_NOT_ACTIVE_EXCLUSIVE');
  if(request.parentHead!==expectedParent||request.authorizedBaseHead!==expectedParent)throw new Error('REQUEST_PARENT_BINDING_MISMATCH');
  if(request.operation!=='CONTROLLED_PROVENANCE_EXCEPTION_IMPACT_READONLY'||request.targetCount!==2||!same(request.targetFingerprints,EXPECTED_TARGETS))throw new Error('REQUEST_SCOPE_MISMATCH');
  if(request.maximumLogicalFirestoreOperations!==6||request.firestoreReadAuthorized!==true||request.firestoreWritesAuthorized!==0||request.authReadsAuthorized!==0||request.authWritesAuthorized!==0||request.loggingReadsAuthorized!==0||request.iamReadsAuthorized!==0||request.operationalWritesAuthorized!==0)throw new Error('REQUEST_CAPABILITY_MISMATCH');
  if(request.reimportAuthorized!==false||request.hostingAuthorized!==false||request.browserAuthorized!==false||request.deployAuthorized!==false||request.productionAuthorized!==false||request.mainAuthorized!==false||request.mergeAuthorized!==false)throw new Error('REQUEST_FORBIDDEN_CAPABILITY');
  if(request.persistDocumentIds!==false||request.persistPII!==false||request.persistSecrets!==false||request.containsPII!==false||request.containsSecrets!==false)throw new Error('REQUEST_PRIVACY_MISMATCH');
  const out={schemaVersion:'orbit360-block1-controlled-provenance-exception-preflight-v1',gateId:GATE_ID,contractVersion:CONTRACT_VERSION,status:'GO_GATE_CONTRACT_CONTROLLED_PROVENANCE_EXCEPTION',classification:'PASS_CONTROLLED_RELEASE_EXCEPTION_PREFLIGHT',checkpoint:'CONTROLLED_PROVENANCE_EXCEPTION_PREFLIGHT',executionAuthorized:true,secretAccessAuthorized:true,firestoreReadAuthorized:true,maximumLogicalFirestoreOperations:6,targetCount:2,targetFingerprints:EXPECTED_TARGETS,firestoreWritesAuthorized:0,authReadsAuthorized:0,loggingReadsAuthorized:0,iamReadsAuthorized:0,operationalWritesAuthorized:0,reimportAuthorized:false,hostingAuthorized:false,browserAuthorized:false,deployAuthorized:false,productionAuthorized:false,mainAuthorized:false,mergeAuthorized:false,runtimeExecuted:false,secretAccess:false,firestoreRead:false,operationalWrites:0,browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false,ok:true};
  seal(out);console.log(JSON.stringify(out));process.exit(0);
}catch(e){stop(e);}
