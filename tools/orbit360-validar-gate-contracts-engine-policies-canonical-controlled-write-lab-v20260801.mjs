#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
const ROOT=process.cwd();
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const GATE='block7-policies-canonical-controlled-write-lab-v20260801';
const VERSION='7.5.0';
const LIFECYCLE='tools/orbit360-validator-lifecycle-contract-policies-canonical-controlled-write-lab-v20260801.json';
const REQUEST='.github/orbit360-requests/policies-canonical-controlled-write-lab-v20260801.json';
const PREVIOUS='tools/orbit360-validator-lifecycle-contract-policies-authority-canonical-dryrun-readonly-v20260801.json';
const WRITER='tools/orbit360-ejecutar-policies-canonical-controlled-write-lab-v20260801.mjs';
const WORKFLOW='.github/workflows/orbit360-policies-canonical-controlled-write-lab-v20260801.yml';
const CUMULATIVE='tools/orbit360-cumulative-visual-candidate-contract-v20260801.json';
const EXPECTED={source:'88b8e16b0d4531b2f5c0ce2b1a21068837853080943f7584f6f3fab0cc2ff18d',target:'9ec5e02509d6fa3cfc1450de8db42e0fd71c0d52e612bd6d9c0119186fc5f3d8',plan:'bd1852e73c21c61d98baed4bda129b027cd1a3ec2a265b6749dbc7c0eb25df47'};
function read(rel){return JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8'));}
function save(payload){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n','utf8');}
const checks=[];const add=(id,ok)=>checks.push({id,ok:Boolean(ok)});
try{
  add('GATE',process.argv[2]===GATE);
  const required=[LIFECYCLE,REQUEST,PREVIOUS,WRITER,WORKFLOW,CUMULATIVE,'tools/orbit360-validar-gate-contracts-v20260717.mjs'];
  const missing=required.filter(rel=>!fs.existsSync(path.join(ROOT,rel)));add('FILES',missing.length===0);if(missing.length)throw new Error('PIPELINE_MECHANISM_FAILURE:FILES:'+missing.join(','));
  const lifecycle=read(LIFECYCLE),request=read(REQUEST),previous=read(PREVIOUS),cumulative=read(CUMULATIVE);
  add('LIFECYCLE',lifecycle.gateId===GATE&&lifecycle.gateContractVersion===VERSION&&lifecycle.status==='POLICIES_CANONICAL_CONTROLLED_WRITE_AUTHORIZED');
  add('PHASE',lifecycle.executionProfile?.phase==='LAB_DATA_CONTRACT_REPAIR_APPLY');
  const c=lifecycle.executionProfile?.capabilities||{};
  add('CAPABILITIES',c.secrets===true&&c.firestoreRead===true&&c.writes===true&&c.runtime===false&&c.browser===false&&c.deploy===false&&c.functionsDeploy===false&&c.rulesDeploy===false&&c.production===false);
  add('AUTHORIZATION',lifecycle.authorization?.explicit===true&&lifecycle.authorization?.allowedExecutions===1&&lifecycle.authorization?.consumed===false&&lifecycle.authorization?.authorizationRef==='user_authorized_canonical_controlled_write_4377_20260801');
  add('REQUEST',request.schemaVersion==='orbit360-policies-canonical-controlled-write-request-v1'&&request.gateId===GATE&&request.contractVersion===VERSION&&request.approved===true&&request.allowedExecutions===1&&request.consumed===false);
  add('BRANCH',request.branch==='ays/backend-tenant-lab-v99-20260703'&&request.pullRequest===5);
  add('PREVIOUS_CLOSED',previous.status==='POLICIES_AUTHORITY_CANONICAL_DRYRUN_READONLY_CLOSED'&&previous.executionResult?.run===30726233391&&previous.executionResult?.artifact===8826436742&&previous.executionResult?.artifactDigest==='sha256:96a31790713ffc1ffa71db23bfdc34134e4ddb23555c1ce67ca3870eb17dd48a');
  add('DIGESTS',lifecycle.sourceDryRun?.sourceSnapshotDigest===EXPECTED.source&&lifecycle.sourceDryRun?.targetSnapshotDigest===EXPECTED.target&&lifecycle.sourceDryRun?.planSetDigest===EXPECTED.plan&&request.digests?.sourceSnapshot===EXPECTED.source&&request.digests?.targetSnapshot===EXPECTED.target&&request.digests?.planSet===EXPECTED.plan);
  add('WRITE_PLAN',lifecycle.writePlan?.createOnly===true&&lifecycle.writePlan?.createDocuments===4377&&lifecycle.writePlan?.updateDocuments===0&&lifecycle.writePlan?.omitEquivalentDocuments===440&&lifecycle.writePlan?.holdDocuments===25&&request.scope?.createDocuments===4377&&request.scope?.omitEquivalentDocuments===440&&request.scope?.holdDocuments===25);
  add('HOLDS',request.scope?.holdAdditionalClients===16&&request.scope?.holdAdditionalInsurers===4&&request.scope?.holdCanonicalSeeds===5&&request.scope?.writeHoldDocuments===false&&request.scope?.deleteSeeds===false);
  add('BATCH_REFS',request.scope?.unresolvedImportBatchReferences===440&&request.scope?.writeUnresolvedImportBatchReferences===false);
  add('CONTROL',lifecycle.transactionControl?.snapshotRequired===true&&lifecycle.transactionControl?.idempotencyRequired===true&&lifecycle.transactionControl?.createPreconditionRequired===true&&lifecycle.transactionControl?.chunkedCompensatingRollbackRequired===true&&lifecycle.transactionControl?.postVerificationRequired===true&&lifecycle.transactionControl?.rollbackVerificationRequired===true&&lifecycle.transactionControl?.maxBatchWrites===400);
  add('NO_EXTRA',request.capabilities?.writes===true&&request.capabilities?.firestoreRead===true&&request.capabilities?.runtime===false&&request.capabilities?.browser===false&&request.capabilities?.preview===false&&request.capabilities?.deploy===false&&request.capabilities?.rulesDeploy===false&&request.capabilities?.functionsDeploy===false&&request.capabilities?.production===false&&request.capabilities?.main===false&&request.capabilities?.merge===false);
  add('CUMULATIVE',cumulative.status==='CUMULATIVE_VISUAL_CANDIDATE_MANIFEST_SEALED'&&cumulative.manifest?.trackedFileCount===308&&cumulative.manifest?.pathDigest==='0c3dbf222646ea46b57e838359ac56fff3994268a97e0d682508bd747a29f3c4'&&cumulative.manifest?.contentDigest==='5b32b90815929acc341cfd4ae7c1e5f76d819e1a6a1b4091d13800508ab9b647');
  add('HUMAN_APPROVAL',lifecycle.humanApproval?.clientes===true&&lifecycle.humanApproval?.polizas===false&&lifecycle.humanApproval?.vehiculos===false&&lifecycle.humanApproval?.recibos===false&&lifecycle.humanApproval?.cartera===false&&lifecycle.humanApproval?.automatedGateMaySetApproval===false);
  const failed=checks.filter(x=>!x.ok);
  const result={schemaVersion:'orbit360-policies-canonical-controlled-write-preflight-v1',gateId:GATE,contractVersion:VERSION,executionPhase:'LAB_DATA_CONTRACT_REPAIR_APPLY',status:failed.length?'VALIDATOR_STALE':'GO_GATE_CONTRACT',classification:failed.length?'PIPELINE_MECHANISM_FAILURE':'POLICIES_CANONICAL_CONTROLLED_WRITE_READY',total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,executionAuthorized:failed.length===0,allowedExecutions:failed.length?0:1,firestoreReadAuthorized:failed.length===0,writeAuthorized:failed.length===0,operationalWritesAllowed:failed.length?0:4377,snapshotRequired:true,idempotencyRequired:true,postVerificationRequired:true,rollbackRequired:true,browserAuthorized:false,previewAuthorized:false,deployAuthorized:false,productionAuthorized:false,frontendAdaptationAuthorized:false,dataAccess:false,secretAccess:false,firestoreRead:false,firestoreDataWrites:0,operationalWrites:0,browserExecuted:false,previewExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
  save(result);console.log(JSON.stringify(result,null,2));process.exit(failed.length?41:0);
}catch(error){const failed=checks.filter(x=>!x.ok);const result={schemaVersion:'orbit360-policies-canonical-controlled-write-preflight-v1',gateId:GATE,contractVersion:VERSION,status:'VALIDATOR_STALE',classification:String(error&&error.message||error).split(':')[0]||'PIPELINE_MECHANISM_FAILURE',failed:Math.max(1,failed.length),failedCheckIds:failed.map(x=>x.id),error:String(error&&error.message||error).slice(0,700),executionAuthorized:false,firestoreReadAuthorized:false,writeAuthorized:false,operationalWritesAllowed:0,firestoreDataWrites:0,operationalWrites:0,dataAccess:false,secretAccess:false,browserExecuted:false,previewExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};save(result);console.log(JSON.stringify(result,null,2));process.exit(41);}
