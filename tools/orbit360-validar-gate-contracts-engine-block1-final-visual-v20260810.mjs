#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const GATE_ID='block1-client360-insurers-lab-v20260717';
const CONTRACT_VERSION='1.0.41';
const LIFECYCLE='tools/orbit360-validator-lifecycle-block1-final-visual-runtime-v20260810.json';
const UNIVERSE='orbit360-platform/runtime-gate-crm-v20260716/block1-release-universe-exception-sanitized-v20260810.json';
const EVIDENCE='orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json';
const BLOCKING=['inicio','cliente360','aseguradoras'];
const BASELINE='visual-matrix-corrected-backup-31135532118';
const EXPECTED_CAPS={secrets:true,firestoreRead:true,writes:false,runtime:true,browser:true,deploy:true,functionsDeploy:false,rulesDeploy:false,production:false};
const readJson=rel=>JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8').replace(/^\uFEFF/,''));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function seal(payload){fs.mkdirSync(path.dirname(path.join(ROOT,EVIDENCE)),{recursive:true});fs.writeFileSync(path.join(ROOT,EVIDENCE),JSON.stringify(payload,null,2)+'\n','utf8');}
function stop(error){const out={schemaVersion:'orbit360-block1-final-visual-preflight-v1',gateId:GATE_ID,contractVersion:CONTRACT_VERSION,status:'STOP_RETRY',classification:'PIPELINE_MECHANISM_FAILURE',checkpoint:'BLOCK1_FINAL_VISUAL_PREFLIGHT',rootCause:String(error?.message||error).slice(0,220),failed:1,executionAuthorized:false,secretAccessAuthorized:false,firestoreReadAuthorized:false,hostingDeployAuthorized:false,browserAuthorized:false,firestoreWritesAuthorized:0,authWritesAuthorized:0,operationalWritesAuthorized:0,runtimeExecuted:false,secretAccess:false,browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false,ok:false};seal(out);console.log(JSON.stringify(out));process.exit(41);}
try{
  const lifecycle=readJson(LIFECYCLE),universe=readJson(UNIVERSE);
  const requestFile=process.env.ORBIT360_REQUEST_FILE||'';
  const expectedVersion=process.env.ORBIT360_EXPECTED_REQUEST_VERSION||'';
  const expectedParent=process.env.ORBIT360_EXPECTED_PARENT_HEAD||'';
  if(!requestFile||!fs.existsSync(path.join(ROOT,requestFile)))throw new Error('REQUEST_FILE_MISSING');
  const request=readJson(requestFile);
  if(lifecycle.gateId!==GATE_ID||lifecycle.gateContractVersion!==CONTRACT_VERSION||lifecycle.currentPhase!=='BLOCK1_FINAL_VISUAL_MATRIX_AFTER_RELEASE_UNIVERSE')throw new Error('LIFECYCLE_CONTRACT_MISMATCH');
  if(!same(lifecycle.executionProfile?.capabilities,EXPECTED_CAPS))throw new Error('LIFECYCLE_CAPABILITY_MISMATCH');
  if(!same(lifecycle.blockingRoutes,BLOCKING)||lifecycle.baselineHostingChannel!==BASELINE||lifecycle.hostingDeploysMaximum!==1)throw new Error('LIFECYCLE_VISUAL_SCOPE_MISMATCH');
  if(universe.decision!=='RELEASE_UNIVERSE_ACCEPTED_WITH_2_CLIENT_PROVENANCE_EXCEPTIONS'||universe.classification!=='PASS_BLOCK1_RELEASE_UNIVERSE_WITH_CONTROLLED_EXCEPTIONS'||universe.releaseEligible!==true||universe.visualEligible!==true||universe.observed?.clientes?.raw!==430||universe.observed?.clientes?.baselineContract!==414||universe.observed?.clientes?.retained26Deferred!==14||universe.observed?.clientes?.controlledProvenanceExceptions!==2||universe.observed?.aseguradoras?.effective!==26||universe.observed?.asesores?.count!==7||universe.firestoreWrites!==0||universe.ok!==true)throw new Error('RELEASE_UNIVERSE_PREREQUISITE_NOT_PASS');
  if(request.schemaVersion!=='orbit360-runtime-request-v1'||request.gateId!==GATE_ID||request.contractVersion!==CONTRACT_VERSION||request.requestVersion!==expectedVersion)throw new Error('REQUEST_GATE_OR_VERSION_MISMATCH');
  if(request.status!=='AUTHORIZED_ONCE'||request.approved!==true||request.authorizedByUser!==true||request.allowedExecutions!==1||request.consumed!==false||request.authorizationFrozen!==false||request.replayAllowed!==false)throw new Error('REQUEST_NOT_ACTIVE_EXCLUSIVE');
  if(request.parentHead!==expectedParent||request.authorizedBaseHead!==expectedParent)throw new Error('REQUEST_PARENT_BINDING_MISMATCH');
  if(request.operation!=='BLOCK1_FINAL_VISUAL_MATRIX_AFTER_RELEASE_UNIVERSE'||!same(request.blockingRoutes,BLOCKING)||request.baselineHostingChannel!==BASELINE)throw new Error('REQUEST_VISUAL_SCOPE_MISMATCH');
  if(request.hostingSafetyBackupAuthorized!==true||request.hostingBaselineRestoreAuthorized!==true||request.hostingDeployAuthorized!==true||request.hostingDeploysMaximum!==1||request.hostingRollbackAuthorizedOnFailure!==true||request.browserAuthorized!==true||request.firestoreReadAuthorized!==true||request.maximumAdminFirestoreReadOperations!==30||request.authTokenMintAuthorized!==true)throw new Error('REQUEST_REQUIRED_CAPABILITY_MISSING');
  if(request.firestoreWritesAuthorized!==0||request.authWritesAuthorized!==0||request.operationalWritesAuthorized!==0||request.functionsDeployAuthorized!==false||request.rulesDeployAuthorized!==false||request.reimportAuthorized!==false||request.productionAuthorized!==false||request.mainAuthorized!==false||request.mergeAuthorized!==false)throw new Error('REQUEST_FORBIDDEN_CAPABILITY');
  if(request.screenshotsSanitizedPrivateArtifactOnly!==true||request.persistPII!==false||request.persistSecrets!==false||request.containsPII!==false||request.containsSecrets!==false)throw new Error('REQUEST_PRIVACY_MISMATCH');
  const out={schemaVersion:'orbit360-block1-final-visual-preflight-v1',gateId:GATE_ID,contractVersion:CONTRACT_VERSION,status:'GO_GATE_CONTRACT_BLOCK1_FINAL_VISUAL',classification:'PASS_BLOCK1_FINAL_VISUAL_PREFLIGHT',checkpoint:'BLOCK1_FINAL_VISUAL_PREFLIGHT',failed:0,executionAuthorized:true,secretAccessAuthorized:true,firestoreReadAuthorized:true,maximumAdminFirestoreReadOperations:30,authTokenMintAuthorized:true,firestoreWritesAuthorized:0,authWritesAuthorized:0,operationalWritesAuthorized:0,browserAuthorized:true,hostingSafetyBackupAuthorized:true,hostingBaselineRestoreAuthorized:true,baselineHostingChannel:BASELINE,hostingDeployAuthorized:true,hostingDeploysMaximum:1,hostingRollbackAuthorizedOnFailure:true,functionsDeployAuthorized:false,rulesDeployAuthorized:false,reimportAuthorized:false,productionAuthorized:false,mainAuthorized:false,mergeAuthorized:false,blockingRoutes:BLOCKING,releaseUniverseDecision:universe.decision,runtimeExecuted:false,secretAccess:false,browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false,ok:true};
  seal(out);console.log(JSON.stringify(out));process.exit(0);
}catch(e){stop(e);}
