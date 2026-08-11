#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const GATE_ID='block1-client360-insurers-lab-v20260717';
const CONTRACT_VERSION='1.0.41';
const LIFECYCLE='tools/orbit360-validator-lifecycle-block1-release-universe-exception-runtime-v20260810.json';
const POLICY='tools/orbit360-block1-controlled-provenance-exception-policy-v20260810.json';
const IMPACT='orbit360-platform/runtime-gate-crm-v20260716/block1-controlled-provenance-exception-impact-sanitized-v20260810.json';
const EVIDENCE='orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json';
const EXPECTED_CAPS={secrets:true,firestoreRead:true,writes:false,runtime:true,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false};
const readJson=rel=>JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8').replace(/^\uFEFF/,''));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function seal(payload){fs.mkdirSync(path.dirname(path.join(ROOT,EVIDENCE)),{recursive:true});fs.writeFileSync(path.join(ROOT,EVIDENCE),JSON.stringify(payload,null,2)+'\n','utf8');}
function stop(error){const out={schemaVersion:'orbit360-block1-release-universe-exception-preflight-v1',gateId:GATE_ID,contractVersion:CONTRACT_VERSION,status:'STOP_RETRY',classification:'PIPELINE_MECHANISM_FAILURE',checkpoint:'BLOCK1_RELEASE_UNIVERSE_EXCEPTION_PREFLIGHT',rootCause:String(error?.message||error).slice(0,220),failed:1,executionAuthorized:false,secretAccessAuthorized:false,firestoreReadAuthorized:false,firestoreWritesAuthorized:0,operationalWritesAuthorized:0,runtimeExecuted:false,secretAccess:false,firestoreRead:false,operationalWrites:0,browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false,ok:false};seal(out);console.log(JSON.stringify(out));process.exit(41);}
try{
  const lifecycle=readJson(LIFECYCLE),policy=readJson(POLICY),impact=readJson(IMPACT);
  const requestFile=process.env.ORBIT360_REQUEST_FILE||'';
  const expectedVersion=process.env.ORBIT360_EXPECTED_REQUEST_VERSION||'';
  const expectedParent=process.env.ORBIT360_EXPECTED_PARENT_HEAD||'';
  if(!requestFile||!fs.existsSync(path.join(ROOT,requestFile)))throw new Error('REQUEST_FILE_MISSING');
  const request=readJson(requestFile);
  if(lifecycle.gateId!==GATE_ID||lifecycle.gateContractVersion!==CONTRACT_VERSION||lifecycle.currentPhase!=='BLOCK1_RELEASE_UNIVERSE_WITH_CONTROLLED_EXCEPTIONS_READONLY')throw new Error('LIFECYCLE_CONTRACT_MISMATCH');
  if(!same(lifecycle.executionProfile?.capabilities,EXPECTED_CAPS))throw new Error('LIFECYCLE_CAPABILITY_MISMATCH');
  if(policy.decision!=='GO_PRODUCTION_PATH_WITH_2_CONTROLLED_CLIENT_PROVENANCE_EXCEPTIONS'||policy.authorizedByUser!==true||policy.baselineContract?.clientes!==414||policy.baselineContract?.aseguradoras!==26||policy.baselineContract?.asesores!==7||policy.baselineContract?.changedByException!==false)throw new Error('CONTROLLED_EXCEPTION_POLICY_INVALID');
  if(impact.decision!=='CONTROLLED_EXCEPTION_IMPACT_PASS'||impact.classification!=='PASS_CONTROLLED_RELEASE_EXCEPTION_IMPACT'||impact.targetsLocated!==2||impact.releaseEligible!==true||impact.nextDecision!=='RELEASE_UNIVERSE_ACCEPTED_WITH_2_CLIENT_PROVENANCE_EXCEPTIONS'||impact.firestoreWrites!==0||impact.operationalWrites!==0||impact.baselineContractChanged!==false||impact.ok!==true)throw new Error('CONTROLLED_EXCEPTION_IMPACT_PREREQUISITE_NOT_PASS');
  if(request.schemaVersion!=='orbit360-runtime-request-v1'||request.gateId!==GATE_ID||request.contractVersion!==CONTRACT_VERSION||request.requestVersion!==expectedVersion)throw new Error('REQUEST_GATE_OR_VERSION_MISMATCH');
  if(request.status!=='AUTHORIZED_ONCE'||request.approved!==true||request.authorizedByUser!==true||request.allowedExecutions!==1||request.consumed!==false||request.authorizationFrozen!==false||request.replayAllowed!==false)throw new Error('REQUEST_NOT_ACTIVE_EXCLUSIVE');
  if(request.parentHead!==expectedParent||request.authorizedBaseHead!==expectedParent)throw new Error('REQUEST_PARENT_BINDING_MISMATCH');
  if(request.operation!=='BLOCK1_RELEASE_UNIVERSE_WITH_CONTROLLED_EXCEPTIONS_READONLY'||request.maximumLogicalFirestoreOperations!==3||request.firestoreReadAuthorized!==true||request.firestoreWritesAuthorized!==0||request.authReadsAuthorized!==0||request.authWritesAuthorized!==0||request.loggingReadsAuthorized!==0||request.iamReadsAuthorized!==0||request.operationalWritesAuthorized!==0)throw new Error('REQUEST_SCOPE_OR_CAPABILITY_MISMATCH');
  if(request.reimportAuthorized!==false||request.hostingAuthorized!==false||request.browserAuthorized!==false||request.deployAuthorized!==false||request.productionAuthorized!==false||request.mainAuthorized!==false||request.mergeAuthorized!==false||request.persistDocumentIds!==false||request.persistPII!==false||request.persistSecrets!==false)throw new Error('REQUEST_FORBIDDEN_CAPABILITY');
  const out={schemaVersion:'orbit360-block1-release-universe-exception-preflight-v1',gateId:GATE_ID,contractVersion:CONTRACT_VERSION,status:'GO_GATE_CONTRACT_RELEASE_UNIVERSE_EXCEPTION',classification:'PASS_RELEASE_UNIVERSE_EXCEPTION_PREFLIGHT',checkpoint:'BLOCK1_RELEASE_UNIVERSE_EXCEPTION_PREFLIGHT',failed:0,executionAuthorized:true,secretAccessAuthorized:true,firestoreReadAuthorized:true,maximumLogicalFirestoreOperations:3,firestoreWritesAuthorized:0,authReadsAuthorized:0,loggingReadsAuthorized:0,iamReadsAuthorized:0,operationalWritesAuthorized:0,reimportAuthorized:false,hostingAuthorized:false,browserAuthorized:false,deployAuthorized:false,productionAuthorized:false,mainAuthorized:false,mergeAuthorized:false,baselineContract:{clientes:414,aseguradoras:26,asesores:7},controlledExceptionCount:2,runtimeExecuted:false,secretAccess:false,firestoreRead:false,operationalWrites:0,browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false,ok:true};
  seal(out);console.log(JSON.stringify(out));process.exit(0);
}catch(e){stop(e);}
