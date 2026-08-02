#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
const ROOT=process.cwd();
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const GATE='block7-policies-authority-canonical-dryrun-readonly-v20260801';
const VERSION='7.4.0';
const LIFECYCLE='tools/orbit360-validator-lifecycle-contract-policies-authority-canonical-dryrun-readonly-v20260801.json';
const REQUEST='.github/orbit360-requests/policies-authority-canonical-dryrun-readonly-v20260801.json';
const PREVIOUS='tools/orbit360-validator-lifecycle-contract-policies-dual-path-provenance-recommendation-readonly-v20260801.json';
const DECLARATION='orbit360-platform/docs/DECLARACION-AUTORIDAD-OPERATIVA-RUTA-HEREDADA-Y-DESTINO-CANONICO-20260801.md';
const CUMULATIVE='tools/orbit360-cumulative-visual-candidate-contract-v20260801.json';
const LIB='tools/orbit360-policies-authority-canonical-dryrun-lib-v20260801.mjs';
const PLANNER='tools/orbit360-preparar-policies-authority-canonical-dryrun-readonly-v20260801.mjs';
const WORKFLOW='.github/workflows/orbit360-policies-authority-canonical-dryrun-readonly-v20260801.yml';
function read(rel){return JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8'));}
function save(payload){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n','utf8');}
const checks=[];const add=(id,ok)=>checks.push({id,ok:Boolean(ok)});
try{
  add('GATE',process.argv[2]===GATE);
  const required=[LIFECYCLE,REQUEST,PREVIOUS,DECLARATION,CUMULATIVE,LIB,PLANNER,WORKFLOW,'tools/orbit360-validar-gate-contracts-v20260717.mjs'];
  const missing=required.filter(rel=>!fs.existsSync(path.join(ROOT,rel)));add('FILES',missing.length===0);if(missing.length)throw new Error('PIPELINE_MECHANISM_FAILURE:FILES:'+missing.join(','));
  const lifecycle=read(LIFECYCLE),request=read(REQUEST),previous=read(PREVIOUS),cumulative=read(CUMULATIVE);
  add('LIFECYCLE',lifecycle.gateId===GATE&&lifecycle.gateContractVersion===VERSION&&lifecycle.status==='POLICIES_AUTHORITY_CANONICAL_DRYRUN_READONLY_AUTHORIZED');
  add('PHASE',lifecycle.executionProfile?.phase==='LAB_DATA_CONTRACT_REPAIR_DRYRUN');
  const c=lifecycle.executionProfile?.capabilities||{};
  add('CAPABILITIES',c.secrets===true&&c.firestoreRead===true&&c.writes===false&&c.runtime===false&&c.browser===false&&c.deploy===false&&c.functionsDeploy===false&&c.rulesDeploy===false&&c.production===false);
  add('AUTHORIZATION',lifecycle.authorization?.explicit===true&&lifecycle.authorization?.allowedExecutions===1&&lifecycle.authorization?.consumed===false&&lifecycle.authorization?.authorizationRef==='user_authorized_legacy_authority_and_canonical_dryrun_readonly_20260801');
  add('REQUEST',request.schemaVersion==='orbit360-policies-authority-canonical-dryrun-readonly-request-v1'&&request.gateId===GATE&&request.contractVersion===VERSION&&request.approved===true&&request.allowedExecutions===1&&request.consumed===false);
  add('BRANCH',request.branch==='ays/backend-tenant-lab-v99-20260703'&&request.pullRequest===5);
  add('PREVIOUS_CLOSED',previous.status==='POLICIES_DUAL_PATH_PROVENANCE_RECOMMENDATION_READONLY_CLOSED'&&previous.executionResult?.run===30725611682&&previous.executionResult?.artifact===8826213716&&previous.executionResult?.artifactDigest==='sha256:b2501961cb362cbaf84114cd511627cb6e0a7530ee662ed6d756b5c707b6ea78'&&previous.executionResult?.head==='fee83234c4850f37769fd15590de25689037ef20');
  add('AUTHORITY_DECLARED',lifecycle.authorityDecision?.declared===true&&lifecycle.authorityDecision?.authoritativeRoute==='tenantId/{tenantId}/{collection}'&&lifecycle.authorityDecision?.canonicalRoute==='tenants/{tenantId}/data/{collection}/items'&&lifecycle.authorityDecision?.authorityDeclarationWritesData===false&&request.authorityDecision?.declared===true&&request.authorityDecision?.migrationAuthorized===false);
  add('SCOPE',request.scope?.calculateCreate===true&&request.scope?.calculateUpdate===true&&request.scope?.calculateOmit===true&&request.scope?.calculateHold===true&&request.scope?.preserveRequiresValidationClients===16&&request.scope?.preserveRequiresValidationInsurers===4&&request.scope?.canonicalSeedsToProposeQuarantine===5&&request.scope?.deleteSeedsAllowed===false&&request.scope?.verifyRelationships===true);
  add('BASELINE',lifecycle.expectedBaseline?.canonicalTotal===445&&lifecycle.expectedBaseline?.legacyTotal===4837&&lifecycle.expectedBaseline?.planItemsExpected===4842&&request.expectedBaseline?.canonicalTotal===445&&request.expectedBaseline?.legacyTotal===4837&&request.expectedBaseline?.planItemsExpected===4842);
  add('NO_WRITES',request.capabilities?.firestoreRead===true&&request.capabilities?.writes===false&&request.capabilities?.runtime===false&&request.capabilities?.browser===false&&request.capabilities?.preview===false&&request.capabilities?.deploy===false&&request.capabilities?.rulesDeploy===false&&request.capabilities?.functionsDeploy===false&&request.capabilities?.production===false&&lifecycle.guards?.firestoreDataWritesAllowed===false&&lifecycle.guards?.operationalWritesAllowed===0);
  add('CUMULATIVE',cumulative.status==='CUMULATIVE_VISUAL_CANDIDATE_MANIFEST_SEALED'&&cumulative.manifest?.trackedFileCount===308&&cumulative.manifest?.pathDigest==='0c3dbf222646ea46b57e838359ac56fff3994268a97e0d682508bd747a29f3c4'&&cumulative.manifest?.contentDigest==='5b32b90815929acc341cfd4ae7c1e5f76d819e1a6a1b4091d13800508ab9b647'&&request.cumulativeVisualGuard?.noModuleFragmentation===true&&request.cumulativeVisualGuard?.noModuleDowngrade===true);
  add('HUMAN_APPROVAL',lifecycle.humanApproval?.clientes===true&&lifecycle.humanApproval?.polizas===false&&lifecycle.humanApproval?.vehiculos===false&&lifecycle.humanApproval?.recibos===false&&lifecycle.humanApproval?.cartera===false&&lifecycle.humanApproval?.automatedGateMaySetApproval===false);
  const failed=checks.filter(x=>!x.ok);
  const result={schemaVersion:'orbit360-policies-authority-canonical-dryrun-preflight-v1',gateId:GATE,contractVersion:VERSION,executionPhase:'LAB_DATA_CONTRACT_REPAIR_DRYRUN',status:failed.length?'VALIDATOR_STALE':'GO_GATE_CONTRACT',classification:failed.length?'PIPELINE_MECHANISM_FAILURE':'POLICIES_AUTHORITY_CANONICAL_DRYRUN_READONLY_READY',total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,executionAuthorized:failed.length===0,allowedExecutions:failed.length?0:1,firestoreReadAuthorized:failed.length===0,authorityDeclared:true,dryrunAuthorized:failed.length===0,writeAuthorized:false,seedDeletionAuthorized:false,browserAuthorized:false,previewAuthorized:false,deployAuthorized:false,migrationApplyAuthorized:false,frontendAdaptationAuthorized:false,cumulativeVisualGuardRequired:true,firestoreDataWrites:0,operationalWrites:0,dataAccess:false,secretAccess:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,previewExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
  save(result);console.log(JSON.stringify(result,null,2));process.exit(failed.length?41:0);
}catch(error){const failed=checks.filter(x=>!x.ok);const result={schemaVersion:'orbit360-policies-authority-canonical-dryrun-preflight-v1',gateId:GATE,contractVersion:VERSION,executionPhase:'LAB_DATA_CONTRACT_REPAIR_DRYRUN',status:'VALIDATOR_STALE',classification:String(error&&error.message||error).split(':')[0]||'PIPELINE_MECHANISM_FAILURE',failed:Math.max(1,failed.length),failedCheckIds:failed.map(x=>x.id),error:String(error&&error.message||error).slice(0,600),executionAuthorized:false,firestoreReadAuthorized:false,authorityDeclared:true,dryrunAuthorized:false,writeAuthorized:false,seedDeletionAuthorized:false,browserAuthorized:false,previewAuthorized:false,deployAuthorized:false,migrationApplyAuthorized:false,frontendAdaptationAuthorized:false,firestoreDataWrites:0,operationalWrites:0,dataAccess:false,secretAccess:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,previewExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};save(result);console.log(JSON.stringify(result,null,2));process.exit(41);}
