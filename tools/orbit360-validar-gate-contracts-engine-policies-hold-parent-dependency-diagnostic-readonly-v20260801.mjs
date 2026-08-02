#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
const ROOT=process.cwd();
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const GATE='block7-policies-hold-parent-dependency-diagnostic-readonly-v20260801';
const VERSION='7.7.0';
const LIFECYCLE='tools/orbit360-validator-lifecycle-contract-policies-hold-parent-dependency-diagnostic-readonly-v20260801.json';
const REQUEST='.github/orbit360-requests/policies-hold-parent-dependency-diagnostic-readonly-v20260801.json';
const FROZEN='tools/orbit360-validator-lifecycle-contract-policies-canonical-postwrite-revalidation-readonly-v20260801.json';
const WRITE='tools/orbit360-validator-lifecycle-contract-policies-canonical-controlled-write-lab-v20260801.json';
const EXECUTOR='tools/orbit360-diagnosticar-policies-hold-parent-dependencies-readonly-v20260801.mjs';
const WORKFLOW='.github/workflows/orbit360-policies-hold-parent-dependency-diagnostic-readonly-v20260801.yml';
const CUMULATIVE='tools/orbit360-cumulative-visual-candidate-contract-v20260801.json';
function read(rel){return JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8'));}
function save(payload){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n','utf8');}
const checks=[];const add=(id,ok)=>checks.push({id,ok:Boolean(ok)});
try{
  add('GATE',process.argv[2]===GATE);
  const required=[LIFECYCLE,REQUEST,FROZEN,WRITE,EXECUTOR,WORKFLOW,CUMULATIVE,'tools/orbit360-validar-gate-contracts-v20260717.mjs','tools/orbit360-policies-dual-path-provenance-lib-v20260801.mjs','tools/orbit360-policies-authority-canonical-dryrun-lib-v20260801.mjs'];
  const missing=required.filter(rel=>!fs.existsSync(path.join(ROOT,rel)));add('FILES',missing.length===0);if(missing.length)throw new Error('PIPELINE_MECHANISM_FAILURE:FILES:'+missing.join(','));
  const lifecycle=read(LIFECYCLE),request=read(REQUEST),frozen=read(FROZEN),write=read(WRITE),cumulative=read(CUMULATIVE);
  add('LIFECYCLE',lifecycle.gateId===GATE&&lifecycle.gateContractVersion===VERSION&&lifecycle.status==='POLICIES_HOLD_PARENT_DEPENDENCY_DIAGNOSTIC_READONLY_AUTHORIZED');
  add('PHASE',lifecycle.executionProfile?.phase==='LAB_DATA_CONTRACT_REPAIR_DRYRUN');
  const c=lifecycle.executionProfile?.capabilities||{};
  add('CAPABILITIES',c.secrets===true&&c.firestoreRead===true&&c.writes===false&&c.runtime===false&&c.browser===false&&c.deploy===false&&c.functionsDeploy===false&&c.rulesDeploy===false&&c.production===false);
  add('AUTHORIZATION',lifecycle.authorization?.explicit===true&&lifecycle.authorization?.allowedExecutions===1&&lifecycle.authorization?.consumed===false&&lifecycle.authorization?.authorizationRef==='user_authorized_hold_parent_dependency_diagnostic_readonly_20260801');
  add('REQUEST',request.schemaVersion==='orbit360-policies-hold-parent-dependency-diagnostic-request-v1'&&request.gateId===GATE&&request.contractVersion===VERSION&&request.approved===true&&request.allowedExecutions===1&&request.consumed===false);
  add('BRANCH',request.branch==='ays/backend-tenant-lab-v99-20260703'&&request.pullRequest===5);
  add('FROZEN_GATE',frozen.status==='POLICIES_CANONICAL_POSTWRITE_REVALIDATION_FROZEN_DATA_CONTRACT_FAILURE'&&frozen.authorization?.frozenAfterSecondFailure===true&&frozen.guards?.additionalAttemptsAllowed===false&&frozen.rootCause?.code==='CANONICAL_POLICIES_REFERENCE_EXCLUDED_VALIDATION_PARENTS');
  add('WRITE_GATE',write.status==='POLICIES_CANONICAL_CONTROLLED_WRITE_CLOSED'&&write.executionResult?.run===30726870258&&write.executionResult?.createdDocuments===4377&&write.executionResult?.postVerificationPassed===true);
  add('DIGESTS',request.digests?.sourceSnapshot==='88b8e16b0d4531b2f5c0ce2b1a21068837853080943f7584f6f3fab0cc2ff18d'&&request.digests?.targetSnapshotAfter==='724e1efbbc29f60791350ea180ef54230ecf888f9914b98fc70fda62ca6ac305');
  add('SCOPE',request.scope?.heldClients===16&&request.scope?.heldInsurers===4&&request.scope?.countAffectedPolicies===true&&request.scope?.measureIntersection===true&&request.scope?.traceVehicles===true&&request.scope?.traceReceipts===true&&request.scope?.tracePortfolio===true&&request.scope?.traceCollections===true&&request.scope?.compareStrategies===true);
  add('NO_WRITES',request.capabilities?.firestoreRead===true&&request.capabilities?.writes===false&&request.capabilities?.runtime===false&&request.capabilities?.browser===false&&request.capabilities?.preview===false&&request.capabilities?.deploy===false&&request.capabilities?.rulesDeploy===false&&request.capabilities?.functionsDeploy===false&&request.capabilities?.production===false&&lifecycle.guards?.firestoreDataWritesAllowed===false&&lifecycle.guards?.operationalWritesAllowed===0&&lifecycle.guards?.reopenFrozenGateAllowed===false);
  add('CUMULATIVE',cumulative.status==='CUMULATIVE_VISUAL_CANDIDATE_MANIFEST_SEALED'&&cumulative.manifest?.trackedFileCount===308&&cumulative.manifest?.pathDigest==='0c3dbf222646ea46b57e838359ac56fff3994268a97e0d682508bd747a29f3c4'&&cumulative.manifest?.contentDigest==='5b32b90815929acc341cfd4ae7c1e5f76d819e1a6a1b4091d13800508ab9b647'&&request.cumulativeVisualGuard?.noModuleFragmentation===true&&request.cumulativeVisualGuard?.noModuleDowngrade===true);
  add('HUMAN_APPROVAL',lifecycle.humanApproval?.clientes===true&&lifecycle.humanApproval?.polizas===false&&lifecycle.humanApproval?.vehiculos===false&&lifecycle.humanApproval?.recibos===false&&lifecycle.humanApproval?.cartera===false&&lifecycle.humanApproval?.automatedGateMaySetApproval===false);
  const failed=checks.filter(x=>!x.ok);
  const result={schemaVersion:'orbit360-policies-hold-parent-dependency-diagnostic-preflight-v1',gateId:GATE,contractVersion:VERSION,executionPhase:'LAB_DATA_CONTRACT_REPAIR_DRYRUN',status:failed.length?'VALIDATOR_STALE':'GO_GATE_CONTRACT',classification:failed.length?'PIPELINE_MECHANISM_FAILURE':'POLICIES_HOLD_PARENT_DEPENDENCY_DIAGNOSTIC_READONLY_READY',total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,executionAuthorized:failed.length===0,firestoreReadAuthorized:failed.length===0,writeAuthorized:false,frontendAdaptationAuthorized:false,browserAuthorized:false,previewAuthorized:false,deployAuthorized:false,productionAuthorized:false,frozenGateReopenAuthorized:false,firestoreDataWrites:0,operationalWrites:0,dataAccess:false,secretAccess:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,previewExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
  save(result);console.log(JSON.stringify(result,null,2));process.exit(failed.length?41:0);
}catch(error){const failed=checks.filter(x=>!x.ok);const result={schemaVersion:'orbit360-policies-hold-parent-dependency-diagnostic-preflight-v1',gateId:GATE,contractVersion:VERSION,executionPhase:'LAB_DATA_CONTRACT_REPAIR_DRYRUN',status:'VALIDATOR_STALE',classification:String(error&&error.message||error).split(':')[0]||'PIPELINE_MECHANISM_FAILURE',failed:Math.max(1,failed.length),failedCheckIds:failed.map(x=>x.id),error:String(error&&error.message||error).slice(0,600),executionAuthorized:false,firestoreReadAuthorized:false,writeAuthorized:false,frontendAdaptationAuthorized:false,browserAuthorized:false,previewAuthorized:false,deployAuthorized:false,productionAuthorized:false,frozenGateReopenAuthorized:false,firestoreDataWrites:0,operationalWrites:0,dataAccess:false,secretAccess:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,previewExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};save(result);console.log(JSON.stringify(result,null,2));process.exit(41);}
