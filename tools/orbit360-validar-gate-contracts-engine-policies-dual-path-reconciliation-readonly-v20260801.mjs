#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const GATE='block7-policies-dual-path-reconciliation-readonly-v20260801';
const VERSION='7.2.0';
const LIFECYCLE='tools/orbit360-validator-lifecycle-contract-policies-dual-path-reconciliation-readonly-v20260801.json';
const REQUEST='.github/orbit360-requests/policies-dual-path-reconciliation-readonly-v20260801.json';
const CUMULATIVE='tools/orbit360-cumulative-visual-candidate-contract-v20260801.json';
const CLOSURE='orbit360-platform/docs/CIERRE-CAUSA-RAIZ-POLIZAS-DOBLE-RUTA-CANONICA-LEGACY-20260801.md';
const VERIFIER='tools/orbit360-reconciliar-policies-dual-path-readonly-v20260801.mjs';
const WORKFLOW='.github/workflows/orbit360-policies-dual-path-reconciliation-readonly-v20260801.yml';
const COLLECTIONS=['clientes','aseguradoras','polizas','vehiculos','recibosEsperados','carteraPrimas','cobros'];
const LEGACY_EXPECTED={clientes:430,aseguradoras:30,polizas:1373,vehiculos:1032,recibosEsperados:1294,carteraPrimas:673,cobros:5};
function read(rel){return JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8'));}
function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function save(payload){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n','utf8');}
const checks=[];const add=(id,ok)=>checks.push({id,ok:Boolean(ok)});
try{
  add('GATE',process.argv[2]===GATE);
  const required=[LIFECYCLE,REQUEST,CUMULATIVE,CLOSURE,VERIFIER,WORKFLOW,'tools/orbit360-validar-gate-contracts-v20260717.mjs'];
  const missing=required.filter(rel=>!fs.existsSync(path.join(ROOT,rel)));add('FILES',missing.length===0);if(missing.length)throw new Error('PIPELINE_MECHANISM_FAILURE:FILES:'+missing.join(','));
  const lifecycle=read(LIFECYCLE),request=read(REQUEST),cumulative=read(CUMULATIVE);
  add('LIFECYCLE',lifecycle.gateId===GATE&&lifecycle.gateContractVersion===VERSION&&lifecycle.status==='POLICIES_DUAL_PATH_RECONCILIATION_READONLY_AUTHORIZED');
  add('PHASE',lifecycle.executionProfile?.phase==='LAB_DATA_CONTRACT_REPAIR_DRYRUN');
  const c=lifecycle.executionProfile?.capabilities||{};
  add('CAPABILITIES',c.secrets===true&&c.firestoreRead===true&&c.writes===false&&c.runtime===false&&c.browser===false&&c.deploy===false&&c.functionsDeploy===false&&c.rulesDeploy===false&&c.production===false);
  add('AUTHORIZATION',lifecycle.authorization?.explicit===true&&lifecycle.authorization?.allowedExecutions===1&&lifecycle.authorization?.consumed===false&&lifecycle.authorization?.authorizationRef==='user_authorized_dual_path_reconciliation_readonly_20260801');
  add('REQUEST',request.schemaVersion==='orbit360-policies-dual-path-reconciliation-readonly-request-v1'&&request.gateId===GATE&&request.contractVersion===VERSION&&request.approved===true&&request.allowedExecutions===1&&request.consumed===false);
  add('BRANCH',request.branch==='ays/backend-tenant-lab-v99-20260703'&&request.pullRequest===5&&lifecycle.cumulativeVisualGuard?.requiredBranch===request.branch);
  add('COLLECTIONS',same(request.scope?.collections,COLLECTIONS)&&same(lifecycle.scope?.collections,COLLECTIONS));
  add('PATHS',request.scope?.canonicalPathTemplate==='tenants/{tenantId}/data/{collection}/items'&&request.scope?.legacyPathTemplate==='tenantId/{tenantId}/{collection}'&&lifecycle.scope?.canonicalPathTemplate===request.scope.canonicalPathTemplate&&lifecycle.scope?.legacyPathTemplate===request.scope.legacyPathTemplate);
  add('COMPARISON',request.scope?.countryFilterApplied===false&&request.scope?.compareCounts===true&&request.scope?.compareIds===true&&request.scope?.compareDigests===true&&request.scope?.compareSchemas===true&&request.scope?.declareAuthoritativePath===false);
  add('BASELINE',same(request.legacyExpectedBaseline,LEGACY_EXPECTED)&&same(lifecycle.legacyExpectedBaseline,LEGACY_EXPECTED));
  add('NO_WRITES',request.capabilities?.firestoreRead===true&&request.capabilities?.writes===false&&request.capabilities?.runtime===false&&request.capabilities?.browser===false&&request.capabilities?.preview===false&&request.capabilities?.deploy===false&&request.capabilities?.rulesDeploy===false&&request.capabilities?.functionsDeploy===false&&request.capabilities?.production===false);
  add('NO_AUTHORITY',lifecycle.authorityDecision?.declared===false&&lifecycle.authorityDecision?.decisionAuthorized===false&&request.authorityDecision?.declared===false&&request.authorityDecision?.decisionAuthorized===false);
  add('CUMULATIVE_CONTRACT',cumulative.schemaVersion==='orbit360-cumulative-visual-candidate-contract-v1'&&cumulative.requiredBranch===request.branch&&cumulative.compositionPolicy?.singleCandidate===true&&cumulative.compositionPolicy?.parallelCandidatesAllowed===false&&cumulative.compositionPolicy?.partialModuleSelectionAllowed===false&&cumulative.compositionPolicy?.reducedShellAllowed===false&&cumulative.futureVisualizationBarrier?.mustPreserveAllTrackedModules===true);
  add('CUMULATIVE_REQUEST',request.cumulativeVisualGuard?.required===true&&request.cumulativeVisualGuard?.noParallelShell===true&&request.cumulativeVisualGuard?.noReducedShell===true&&request.cumulativeVisualGuard?.noModuleFragmentation===true&&request.cumulativeVisualGuard?.noModuleDowngrade===true&&request.cumulativeVisualGuard?.futureVisualCandidateMustUseCurrentHeadOrAuditedDescendant===true);
  add('HUMAN_APPROVAL_BARRIER',lifecycle.humanApproval?.clientes===true&&lifecycle.humanApproval?.polizas===false&&lifecycle.humanApproval?.vehiculos===false&&lifecycle.humanApproval?.recibos===false&&lifecycle.humanApproval?.cartera===false&&lifecycle.humanApproval?.automatedGateMaySetApproval===false);
  const failed=checks.filter(x=>!x.ok);
  const out={schemaVersion:'orbit360-policies-dual-path-reconciliation-preflight-v1',gateId:GATE,contractVersion:VERSION,executionPhase:'LAB_DATA_CONTRACT_REPAIR_DRYRUN',status:failed.length?'VALIDATOR_STALE':'GO_GATE_CONTRACT',classification:failed.length?'PIPELINE_MECHANISM_FAILURE':'POLICIES_DUAL_PATH_RECONCILIATION_READONLY_READY',total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,executionAuthorized:failed.length===0,allowedExecutions:failed.length?0:1,firestoreReadAuthorized:failed.length===0,writeAuthorized:false,browserAuthorized:false,previewAuthorized:false,deployAuthorized:false,authorityDecisionAuthorized:false,countryFilterApplied:false,collections:COLLECTIONS,legacyExpectedBaseline:LEGACY_EXPECTED,cumulativeVisualGuardRequired:true,humanApproval:{clientes:true,polizas:false,vehiculos:false,recibos:false,cartera:false,restoCrm:false,automatedGateMaySetApproval:false},firestoreDataWrites:0,operationalWrites:0,dataAccess:false,secretAccess:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,previewExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
  save(out);console.log(JSON.stringify(out,null,2));process.exit(failed.length?41:0);
}catch(error){const failed=checks.filter(x=>!x.ok);const out={schemaVersion:'orbit360-policies-dual-path-reconciliation-preflight-v1',gateId:GATE,contractVersion:VERSION,executionPhase:'LAB_DATA_CONTRACT_REPAIR_DRYRUN',status:'VALIDATOR_STALE',classification:String(error&&error.message||error).split(':')[0]||'PIPELINE_MECHANISM_FAILURE',failed:Math.max(1,failed.length),failedCheckIds:failed.map(x=>x.id),error:String(error&&error.message||error).slice(0,600),executionAuthorized:false,firestoreReadAuthorized:false,writeAuthorized:false,browserAuthorized:false,previewAuthorized:false,deployAuthorized:false,authorityDecisionAuthorized:false,countryFilterApplied:false,firestoreDataWrites:0,operationalWrites:0,dataAccess:false,secretAccess:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,previewExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};save(out);console.log(JSON.stringify(out,null,2));process.exit(41);}
