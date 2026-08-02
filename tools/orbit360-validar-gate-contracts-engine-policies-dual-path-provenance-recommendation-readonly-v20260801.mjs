#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
const ROOT=process.cwd();
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const GATE='block7-policies-dual-path-provenance-recommendation-readonly-v20260801';
const VERSION='7.3.0';
const LIFECYCLE='tools/orbit360-validator-lifecycle-contract-policies-dual-path-provenance-recommendation-readonly-v20260801.json';
const REQUEST='.github/orbit360-requests/policies-dual-path-provenance-recommendation-readonly-v20260801.json';
const PREVIOUS='tools/orbit360-validator-lifecycle-contract-policies-dual-path-reconciliation-readonly-v20260801.json';
const CUMULATIVE='tools/orbit360-cumulative-visual-candidate-contract-v20260801.json';
const ANALYZER='tools/orbit360-analizar-policies-dual-path-provenance-recommendation-readonly-v20260801.mjs';
const WORKFLOW='.github/workflows/orbit360-policies-dual-path-provenance-recommendation-readonly-v20260801.yml';
const COLLECTIONS=['clientes','aseguradoras','polizas','vehiculos','recibosEsperados','carteraPrimas','cobros'];
const EXPECTED={clientes:{canonical:414,legacy:430,shared:414,onlyCanonical:0,onlyLegacy:16},aseguradoras:{canonical:26,legacy:30,shared:26,onlyCanonical:0,onlyLegacy:4},polizas:{canonical:2,legacy:1373,shared:0,onlyCanonical:2,onlyLegacy:1373},vehiculos:{canonical:1,legacy:1032,shared:0,onlyCanonical:1,onlyLegacy:1032},recibosEsperados:{canonical:0,legacy:1294,shared:0,onlyCanonical:0,onlyLegacy:1294},carteraPrimas:{canonical:0,legacy:673,shared:0,onlyCanonical:0,onlyLegacy:673},cobros:{canonical:2,legacy:5,shared:0,onlyCanonical:2,onlyLegacy:5}};
function read(rel){return JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8'));}
function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function save(payload){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n','utf8');}
const checks=[];const add=(id,ok)=>checks.push({id,ok:Boolean(ok)});
try{
 add('GATE',process.argv[2]===GATE);
 const required=[LIFECYCLE,REQUEST,PREVIOUS,CUMULATIVE,ANALYZER,WORKFLOW,'tools/orbit360-validar-gate-contracts-v20260717.mjs'];
 const missing=required.filter(rel=>!fs.existsSync(path.join(ROOT,rel)));add('FILES',missing.length===0);if(missing.length)throw new Error('PIPELINE_MECHANISM_FAILURE:FILES:'+missing.join(','));
 const lifecycle=read(LIFECYCLE),request=read(REQUEST),previous=read(PREVIOUS),cumulative=read(CUMULATIVE);
 add('LIFECYCLE',lifecycle.gateId===GATE&&lifecycle.gateContractVersion===VERSION&&lifecycle.status==='POLICIES_DUAL_PATH_PROVENANCE_RECOMMENDATION_READONLY_AUTHORIZED');
 add('PHASE',lifecycle.executionProfile?.phase==='LAB_DATA_CONTRACT_REPAIR_DRYRUN');
 const c=lifecycle.executionProfile?.capabilities||{};
 add('CAPABILITIES',c.secrets===true&&c.firestoreRead===true&&c.writes===false&&c.runtime===false&&c.browser===false&&c.deploy===false&&c.functionsDeploy===false&&c.rulesDeploy===false&&c.production===false);
 add('AUTHORIZATION',lifecycle.authorization?.explicit===true&&lifecycle.authorization?.allowedExecutions===1&&lifecycle.authorization?.consumed===false&&lifecycle.authorization?.authorizationRef==='user_authorized_dual_path_provenance_recommendation_readonly_20260801');
 add('REQUEST',request.schemaVersion==='orbit360-policies-dual-path-provenance-recommendation-readonly-request-v1'&&request.gateId===GATE&&request.contractVersion===VERSION&&request.approved===true&&request.allowedExecutions===1&&request.consumed===false);
 add('BRANCH',request.branch==='ays/backend-tenant-lab-v99-20260703'&&request.pullRequest===5);
 add('PREVIOUS_CLOSED',previous.status==='POLICIES_DUAL_PATH_RECONCILIATION_READONLY_CLOSED'&&previous.executionResult?.run===30724917136&&previous.executionResult?.artifact===8825989653&&previous.executionResult?.artifactDigest==='sha256:19b9cddbd5a08af61655f0d59423608329fd3fda39da8786ab5c31940fb28885'&&previous.executionResult?.head==='c1bbe8e8f446747c51eaa3672e0b59fb2823d08c');
 add('PREVIOUS_COUNTS',same(request.sourceReconciliation?.counts,EXPECTED)&&same(lifecycle.sourceReconciliation?.counts,EXPECTED));
 add('SCOPE',same(request.scope?.collections,COLLECTIONS)&&request.scope?.classifyCanonicalOnly===5&&request.scope?.classifyLegacyOnlyClients===16&&request.scope?.classifyLegacyOnlyInsurers===4&&request.scope?.classifySharedDivergences===440&&request.scope?.inspectSourceRefs===true&&request.scope?.inspectSourceTrace===true&&request.scope?.inspectImportBatchRefs===true&&request.scope?.inspectValidationStatus===true);
 add('RECOMMENDATION_BOUNDARY',request.recommendationBoundary?.recommendationAllowed===true&&request.recommendationBoundary?.authorityDeclarationAllowed===false&&request.recommendationBoundary?.migrationPlanAllowed===false&&request.recommendationBoundary?.adapterPlanAllowed===false&&request.recommendationBoundary?.frontendChangeAllowed===false&&request.authorityDecision?.declared===false&&request.authorityDecision?.decisionAuthorized===false&&request.authorityDecision?.recommendationAuthorized===true);
 add('NO_WRITES',request.capabilities?.firestoreRead===true&&request.capabilities?.writes===false&&request.capabilities?.runtime===false&&request.capabilities?.browser===false&&request.capabilities?.preview===false&&request.capabilities?.deploy===false&&request.capabilities?.rulesDeploy===false&&request.capabilities?.functionsDeploy===false&&request.capabilities?.production===false);
 add('CUMULATIVE',cumulative.status==='CUMULATIVE_VISUAL_CANDIDATE_MANIFEST_SEALED'&&cumulative.manifest?.trackedFileCount===308&&cumulative.manifest?.pathDigest==='0c3dbf222646ea46b57e838359ac56fff3994268a97e0d682508bd747a29f3c4'&&cumulative.manifest?.contentDigest==='5b32b90815929acc341cfd4ae7c1e5f76d819e1a6a1b4091d13800508ab9b647'&&request.cumulativeVisualGuard?.noModuleFragmentation===true&&request.cumulativeVisualGuard?.noModuleDowngrade===true);
 add('HUMAN_APPROVAL',lifecycle.humanApproval?.clientes===true&&lifecycle.humanApproval?.polizas===false&&lifecycle.humanApproval?.vehiculos===false&&lifecycle.humanApproval?.recibos===false&&lifecycle.humanApproval?.cartera===false&&lifecycle.humanApproval?.automatedGateMaySetApproval===false);
 const failed=checks.filter(x=>!x.ok);
 const result={schemaVersion:'orbit360-policies-dual-path-provenance-recommendation-preflight-v1',gateId:GATE,contractVersion:VERSION,executionPhase:'LAB_DATA_CONTRACT_REPAIR_DRYRUN',status:failed.length?'VALIDATOR_STALE':'GO_GATE_CONTRACT',classification:failed.length?'PIPELINE_MECHANISM_FAILURE':'POLICIES_DUAL_PATH_PROVENANCE_RECOMMENDATION_READONLY_READY',total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,executionAuthorized:failed.length===0,allowedExecutions:failed.length?0:1,firestoreReadAuthorized:failed.length===0,writeAuthorized:false,browserAuthorized:false,previewAuthorized:false,deployAuthorized:false,recommendationAuthorized:failed.length===0,authorityDecisionAuthorized:false,migrationAuthorized:false,frontendAdaptationAuthorized:false,cumulativeVisualGuardRequired:true,firestoreDataWrites:0,operationalWrites:0,dataAccess:false,secretAccess:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,previewExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
 save(result);console.log(JSON.stringify(result,null,2));process.exit(failed.length?41:0);
}catch(error){const failed=checks.filter(x=>!x.ok);const result={schemaVersion:'orbit360-policies-dual-path-provenance-recommendation-preflight-v1',gateId:GATE,contractVersion:VERSION,executionPhase:'LAB_DATA_CONTRACT_REPAIR_DRYRUN',status:'VALIDATOR_STALE',classification:String(error&&error.message||error).split(':')[0]||'PIPELINE_MECHANISM_FAILURE',failed:Math.max(1,failed.length),failedCheckIds:failed.map(x=>x.id),error:String(error&&error.message||error).slice(0,600),executionAuthorized:false,firestoreReadAuthorized:false,writeAuthorized:false,browserAuthorized:false,previewAuthorized:false,deployAuthorized:false,recommendationAuthorized:false,authorityDecisionAuthorized:false,migrationAuthorized:false,frontendAdaptationAuthorized:false,firestoreDataWrites:0,operationalWrites:0,dataAccess:false,secretAccess:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,previewExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};save(result);console.log(JSON.stringify(result,null,2));process.exit(41);}
