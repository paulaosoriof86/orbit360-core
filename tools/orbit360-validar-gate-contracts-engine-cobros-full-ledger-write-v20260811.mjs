#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const ROOT=process.cwd();
const GATE='block10.10-cobros-full-ledger-write-lab-v20260805';
const VERSION='10.10.2';
const STATIC_LIFECYCLE='tools/orbit360-validator-lifecycle-contract-cobros-full-ledger-write-lab-v20260805.json';
const RUNTIME_LIFECYCLE='tools/orbit360-validator-lifecycle-contract-cobros-full-ledger-write-runtime-v20260811.json';
const REQUEST='.github/orbit360-requests/cobros-full-ledger-write-lab-v20260811.json';
const REQUEST_VERSION='cobros-full-ledger-write-lab-v20260811-r1';
const CONTRACT='tools/orbit360-cobros-full-ledger-write-contract-v20260805.json';
const STATIC_EVIDENCE='orbit360-platform/runtime-gate-crm-v20260716/cobros-full-ledger-write-static-preflight-sanitized-v20260805.json';
const PLANNER_EVIDENCE='orbit360-platform/runtime-gate-crm-v20260716/cobros-full-ledger-planner-source-test-sanitized-v20260805.json';
const BLOCK1_EVIDENCE='orbit360-platform/runtime-gate-crm-v20260716/block1-final-visual-closure-sanitized-v20260810.json';
const OUT='orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json';
const PACKAGE_SHA='9769d7a952e9b2a15c27821da9098e5899466b0558ba8b68e021689864ad8cfe';
const PACKAGE_LOGICAL='a999977e31c73feebb8aafe3ca380a536e1ca60047d57fcdb6d9a592bd829654';
const LEDGER_DIGEST='96d7105912234de14deb5ad0190e537c1b71570519d086616acc9122cb2ca381';

function read(rel){return JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8').replace(/^\uFEFF/,''));}
function write(payload){const p=path.join(ROOT,OUT);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(payload,null,2)+'\n','utf8');}
function fail(code){throw new Error(code);}
function capabilitiesZero(p){return p&&p.secrets===false&&p.firestoreRead===false&&p.writes===false&&p.runtime===false&&p.browser===false&&p.deploy===false&&p.functionsDeploy===false&&p.rulesDeploy===false&&p.production===false;}
function capabilitiesRuntime(p){return p&&p.secrets===true&&p.firestoreRead===true&&p.writes===true&&p.runtime===true&&p.browser===false&&p.deploy===false&&p.functionsDeploy===false&&p.rulesDeploy===false&&p.production===false;}
function base(){return {gateId:GATE,contractVersion:VERSION,failed:0,failedCheckIds:[],dataAccess:false,secretAccess:false,operationalWrites:0,evidenceWrites:1,secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false,ok:true};}
function validateStaticPrereqs(){
  const contract=read(CONTRACT),staticEv=read(STATIC_EVIDENCE),plannerEv=read(PLANNER_EVIDENCE),block1=read(BLOCK1_EVIDENCE);
  if(contract.gateId!==GATE||contract.contractVersion!==VERSION||contract.source?.rowLedgerCount!==365||contract.source?.rowLedgerDigest!==LEDGER_DIGEST)fail('DATA_CONTRACT_FAILURE_CONTRACT_IDENTITY');
  if(contract.durablePlan?.pagosReportados!==365||contract.durablePlan?.evidenciasCobro!==365||contract.durablePlan?.propuestasConciliacion!==132||contract.durablePlan?.conciliacionHolds!==233||contract.durablePlan?.maximumWrites!==1098)fail('DATA_CONTRACT_FAILURE_DURABLE_PLAN');
  if(contract.durablePlan?.newCobros!==0||contract.durablePlan?.receiptWrites!==0||contract.durablePlan?.policyWrites!==0||contract.durablePlan?.finmovWrites!==0)fail('SECURITY_FAILURE_BUSINESS_WRITE_SCOPE');
  if(staticEv.status!=='PASS_COBROS_FULL_LEDGER_WRITE_STATIC_CONTRACT'||staticEv.contractVersion!==VERSION||staticEv.failed!==0||staticEv.plannedWritesMaximum!==1098||staticEv.stageDocuments!==1095||staticEv.packageSha256!==PACKAGE_SHA||staticEv.packageLogicalSha256!==PACKAGE_LOGICAL||staticEv.ok!==true)fail('VALIDATOR_STALE_STATIC_EVIDENCE');
  if(plannerEv.status!=='PASS_COBROS_FULL_LEDGER_PLANNER_SOURCE'||plannerEv.failed!==0||plannerEv.passed!==18||plannerEv.ok!==true||plannerEv.firestoreWrites!==0)fail('VALIDATOR_STALE_PLANNER_EVIDENCE');
  if(block1.decision!=='PASS_VISUAL_POST_AUTH'||block1.block1CloseEligible!==true||block1.ok!==true||block1.firestoreWrites!==0||block1.authWrites!==0||block1.operationalWrites!==0)fail('DATA_CONTRACT_FAILURE_BLOCK1_DEPENDENCY');
  return {contract,staticEv,plannerEv,block1};
}
function validateRuntimeRequest(){
  if(!fs.existsSync(path.join(ROOT,REQUEST)))fail('FRESH_RUNTIME_REQUEST_MISSING');
  const req=read(REQUEST);
  if(req.schemaVersion!=='orbit360-cobros-full-ledger-write-runtime-request-v1'||req.gateId!==GATE||req.contractVersion!==VERSION||req.requestVersion!==REQUEST_VERSION)fail('RUNTIME_REQUEST_IDENTITY');
  if(req.approved!==true||req.status!=='AUTHORIZED_ONCE'||req.allowedExecutions!==1||req.consumed!==false||req.authorizationFrozen!==false||req.replayAllowed!==false)fail('RUNTIME_REQUEST_STATE');
  if(req.branch!=='ays/backend-tenant-lab-v99-20260703'||req.pullRequest!==5||req.projectId!=='ays-orbit-360-lab'||req.tenantId!=='alianzas-soluciones')fail('RUNTIME_REQUEST_SCOPE');
  if(req.scope?.sourceLedgerCount!==365||req.scope?.pagosReportados!==365||req.scope?.evidenciasCobro!==365||req.scope?.propuestasConciliacion!==132||req.scope?.conciliacionHolds!==233||req.scope?.stageDocuments!==1095||req.scope?.maximumForwardWrites!==1098)fail('RUNTIME_REQUEST_COUNTS');
  if(req.scope?.newCobros!==0||req.scope?.receiptWrites!==0||req.scope?.policyWrites!==0||req.scope?.finmovWrites!==0)fail('SECURITY_FAILURE_RUNTIME_BUSINESS_SCOPE');
  if(req.privatePackage?.sha256!==PACKAGE_SHA||req.privatePackage?.logicalSha256!==PACKAGE_LOGICAL||req.privatePackage?.sourceLedgerDigest!==LEDGER_DIGEST)fail('RUNTIME_REQUEST_PACKAGE');
  if(!capabilitiesRuntime(req.capabilities))fail('RUNTIME_REQUEST_CAPABILITIES');
  const changed=execFileSync('git',['diff-tree','--no-commit-id','--name-only','-r','HEAD'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
  if(changed.length!==1||changed[0]!==REQUEST)fail('RUNTIME_REQUEST_NOT_EXCLUSIVE_COMMIT');
  const parent=execFileSync('git',['rev-parse','HEAD^'],{encoding:'utf8'}).trim();
  if(req.parentHead!==parent)fail('RUNTIME_REQUEST_PARENT_MISMATCH');
  return req;
}

try{
  if(process.argv[2]!==GATE)fail('GATE_ID_MISMATCH');
  validateStaticPrereqs();
  const profile=String(process.env.ORBIT360_GATE_PROFILE||'');
  if(profile==='cobros-10102-runtime'){
    const life=read(RUNTIME_LIFECYCLE),req=validateRuntimeRequest();
    if(life.gateId!==GATE||life.gateContractVersion!==VERSION||life.currentPhase!=='COBROS_FULL_LEDGER_WRITE_RUNTIME'||life.status!=='RUNTIME_REQUEST_REQUIRED'||!capabilitiesRuntime(life.executionProfile?.capabilities))fail('RUNTIME_LIFECYCLE_INVALID');
    if(life.maximumForwardWrites!==1098||life.stageDocuments!==1095||life.newCobrosAuthorized!==0||life.receiptWritesAuthorized!==0||life.policyWritesAuthorized!==0||life.finmovWritesAuthorized!==0||life.replayAllowed!==false)fail('RUNTIME_LIFECYCLE_SCOPE');
    const payload={schemaVersion:'orbit360-cobros-full-ledger-write-canonical-runtime-preflight-v1',status:'GO_GATE_CONTRACT',classification:'AUTHORIZED_LAB_RUN_SCOPED_LEDGER_WRITE_READY',canonicalPhase:'COBROS_FULL_LEDGER_WRITE_RUNTIME',phase:'AUTHORIZED_ONCE',requestExists:true,requestState:'EXACT_FRESH_PARENT_BOUND_IMMUTABLE',requestVersion:REQUEST_VERSION,requestParentHead:req.parentHead,executionAuthorized:true,secretAccessAuthorized:true,firestoreReadAuthorized:true,labWriteAuthorized:true,writeAuthorized:true,maximumForwardWrites:1098,stageDocuments:1095,newCobros:0,receiptWrites:0,policyWrites:0,finmovWrites:0,sourceLedgerCount:365,sourceLedgerDigest:LEDGER_DIGEST,packageSha256:PACKAGE_SHA,packageLogicalSha256:PACKAGE_LOGICAL,passVisualPostAuth:true,...base()};
    write(payload);console.log(JSON.stringify(payload,null,2));
  } else {
    const life=read(STATIC_LIFECYCLE);
    if(life.gateId!==GATE||life.gateContractVersion!==VERSION||life.status!=='STATIC_PREFLIGHT_PASS_NOT_AUTHORIZED'||life.currentPhase!=='STATIC_PREFLIGHT_PASS'||!capabilitiesZero(life.executionProfile?.capabilities))fail('STATIC_LIFECYCLE_INVALID');
    if(life.staticRequest?.consumed!==true||life.staticRequest?.result!=='PASS'||life.activeRequest!==false||life.allowedExecutions!==0||life.executionAuthorized!==false||life.writeAuthorized!==false||life.replayAllowed!==false)fail('STATIC_LIFECYCLE_AUTH_BOUNDARY');
    const payload={schemaVersion:'orbit360-cobros-full-ledger-write-canonical-source-preflight-v1',status:'GO_GATE_CONTRACT',classification:'SOURCE_CONTROL_PLANE_READY_NO_ACCESS',canonicalPhase:'STATIC_PREFLIGHT_PASS',phase:'STATIC_PREFLIGHT_PASS',requestExists:false,requestState:'FRESH_RUNTIME_REQUEST_REQUIRED',executionAuthorized:false,secretAccessAuthorized:false,firestoreReadAuthorized:false,labWriteAuthorized:false,writeAuthorized:false,maximumForwardWrites:1098,stageDocuments:1095,newCobros:0,receiptWrites:0,policyWrites:0,finmovWrites:0,sourceLedgerCount:365,sourceLedgerDigest:LEDGER_DIGEST,packageSha256:PACKAGE_SHA,packageLogicalSha256:PACKAGE_LOGICAL,passVisualPostAuth:true,...base()};
    write(payload);console.log(JSON.stringify(payload,null,2));
  }
}catch(error){
  const payload={schemaVersion:'orbit360-cobros-full-ledger-write-canonical-preflight-v1',gateId:GATE,contractVersion:VERSION,status:'VALIDATOR_STALE',classification:'PIPELINE_MECHANISM_FAILURE',failed:1,failedCheckIds:['COBROS_10102_CANONICAL_ENGINE'],error:String(error?.message||error).slice(0,500),dataAccess:false,secretAccess:false,operationalWrites:0,evidenceWrites:1,secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false,ok:false};
  write(payload);console.error(JSON.stringify(payload,null,2));process.exit(41);
}
