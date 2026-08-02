#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const GATE='block7-canonical-store-cumulative-adapter-static-v20260801';
const VERSION='7.10.0';
const LIFECYCLE='tools/orbit360-validator-lifecycle-contract-canonical-store-cumulative-adapter-static-v20260801.json';
const REQUEST='.github/orbit360-requests/canonical-store-cumulative-adapter-static-v20260801.json';
const GATE79='tools/orbit360-validator-lifecycle-contract-policies-full-canonical-revalidation-readonly-v20260801.json';
const FROZEN76='tools/orbit360-validator-lifecycle-contract-policies-canonical-postwrite-revalidation-readonly-v20260801.json';
const VALIDATOR='tools/orbit360-validar-canonical-store-cumulative-adapter-static-v20260801.mjs';
const WORKFLOW='.github/workflows/orbit360-canonical-store-cumulative-adapter-static-v20260801.yml';
const DIGEST='19e1927d39f6b713ee12504f8762bc42ead9de6e365bb0f12162d2a0c8f8469b';

function read(rel){return JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8'));}
function save(payload){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n','utf8');}
const checks=[];const add=(id,ok)=>checks.push({id,ok:Boolean(ok)});
try{
  add('GATE',process.argv[2]===GATE);
  const required=[LIFECYCLE,REQUEST,GATE79,FROZEN76,VALIDATOR,WORKFLOW,'tools/orbit360-validar-gate-contracts-v20260717.mjs','orbit360-platform/index.html','orbit360-platform/data/store-firestore-lab.local.js','orbit360-platform/core/backend-lab-init.js','orbit360-platform/core/backend-lab-canonical-view-sync.js','orbit360-platform/core/backend-lab-receipts-portfolio-native-bridge-v20260801.js'];
  const missing=required.filter(rel=>!fs.existsSync(path.join(ROOT,rel)));add('FILES',missing.length===0);if(missing.length)throw new Error('PIPELINE_MECHANISM_FAILURE:FILES:'+missing.join(','));
  const lifecycle=read(LIFECYCLE),request=read(REQUEST),gate79=read(GATE79),frozen=read(FROZEN76);
  add('LIFECYCLE',lifecycle.gateId===GATE&&lifecycle.gateContractVersion===VERSION&&lifecycle.status==='CANONICAL_STORE_CUMULATIVE_ADAPTER_STATIC_AUTHORIZED');
  add('PHASE',lifecycle.executionProfile?.phase==='STATIC_PREFLIGHT');
  const c=lifecycle.executionProfile?.capabilities||{};
  add('CAPABILITIES',c.secrets===false&&c.firestoreRead===false&&c.writes===false&&c.runtime===false&&c.browser===false&&c.deploy===false&&c.functionsDeploy===false&&c.rulesDeploy===false&&c.production===false);
  add('AUTHORIZATION',lifecycle.authorization?.explicit===true&&lifecycle.authorization?.allowedExecutions===2&&lifecycle.authorization?.attemptsUsed===1&&lifecycle.authorization?.resumeAttempt===2&&lifecycle.authorization?.consumed===false&&lifecycle.authorization?.authorizationRef==='user_proceed_definitive_solutions_no_trial_error_20260801');
  add('REQUEST',request.schemaVersion==='orbit360-canonical-store-cumulative-adapter-static-request-v1'&&request.gateId===GATE&&request.contractVersion===VERSION&&request.approved===true&&request.allowedExecutions===2&&request.attemptsUsed===1&&request.resumeAttempt===2&&request.consumed===false);
  add('FIRST_ATTEMPT',lifecycle.attempts?.first?.run===30732248630&&lifecycle.attempts?.first?.invalidated===true&&lifecycle.attempts?.first?.classification==='MIXED_VALIDATOR_STALE_AND_DORMANT_SCOPE_FALSE_POSITIVE'&&lifecycle.attempts?.first?.firestoreWrites===0);
  add('BRANCH',request.branch==='ays/backend-tenant-lab-v99-20260703'&&request.pullRequest===5&&request.baselineCommit==='a0c430d7ae2856b5fe45207fb0820dcd9bb45809');
  add('GATE_79',gate79.status==='POLICIES_FULL_CANONICAL_REVALIDATION_READONLY_CLOSED'&&gate79.sealedState?.canonicalSnapshotDigest===DIGEST&&gate79.executionResult?.closed===true&&gate79.guards?.additionalExecutionsAllowed===false);
  add('GATE_76_FROZEN',frozen.status==='POLICIES_CANONICAL_POSTWRITE_REVALIDATION_FROZEN_DATA_CONTRACT_FAILURE'&&frozen.authorization?.frozenAfterSecondFailure===true&&frozen.guards?.additionalAttemptsAllowed===false);
  add('DIGEST',request.canonicalSnapshotDigest===DIGEST&&lifecycle.sourceGate?.canonicalSnapshotDigest===DIGEST);
  add('SCOPE',request.scope?.canonicalCollections===7&&request.scope?.singleReadOwner==='Orbit.store'&&request.scope?.preservePublicApi===true&&request.scope?.excludeSeedsOperationally===true&&request.scope?.preserveRequiresValidation===true&&request.scope?.scanAllModules===true&&request.scope?.scanRuntimeModuleGraph===true&&request.scope?.allowedRuntimeDeltaFiles===5);
  add('NO_RUNTIME',request.capabilities?.secrets===false&&request.capabilities?.firestoreRead===false&&request.capabilities?.writes===false&&request.capabilities?.runtime===false&&request.capabilities?.browser===false&&request.capabilities?.preview===false&&request.capabilities?.deploy===false&&request.capabilities?.production===false);
  add('GUARDS',lifecycle.guards?.firestoreDataWritesAllowed===false&&lifecycle.guards?.operationalWritesAllowed===0&&lifecycle.guards?.reimportAllowed===false&&lifecycle.guards?.browserAllowed===false&&lifecycle.guards?.previewAllowed===false&&lifecycle.guards?.hostingDeployAllowed===false&&lifecycle.guards?.productionAllowed===false&&lifecycle.guards?.mainAllowed===false&&lifecycle.guards?.mergeAllowed===false);
  add('DELTA',Array.isArray(lifecycle.allowedRuntimeDelta)&&lifecycle.allowedRuntimeDelta.length===5&&request.allowedRuntimeDeltaDigest===request.expectedAllowedRuntimeDeltaDigest);
  add('APPROVAL_BOUNDARY',lifecycle.humanApproval?.clientes===true&&lifecycle.humanApproval?.polizas===false&&lifecycle.humanApproval?.automatedGateMaySetApproval===false);
  const failed=checks.filter(x=>!x.ok);
  const result={schemaVersion:'orbit360-canonical-store-cumulative-adapter-static-preflight-v1',gateId:GATE,contractVersion:VERSION,executionPhase:'STATIC_PREFLIGHT',attempt:2,status:failed.length?'VALIDATOR_STALE':'GO_GATE_CONTRACT',classification:failed.length?'PIPELINE_MECHANISM_FAILURE':'CANONICAL_STORE_CUMULATIVE_ADAPTER_STATIC_READY',total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,executionAuthorized:failed.length===0,staticValidationAuthorized:failed.length===0,secretAccessAuthorized:false,firestoreReadAuthorized:false,writeAuthorized:false,runtimeAuthorized:false,browserAuthorized:false,previewAuthorized:false,deployAuthorized:false,productionAuthorized:false,firestoreDataWrites:0,operationalWrites:0,dataAccess:false,secretAccess:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,previewExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
  save(result);console.log(JSON.stringify(result,null,2));process.exit(failed.length?41:0);
}catch(error){
  const failed=checks.filter(x=>!x.ok);const result={schemaVersion:'orbit360-canonical-store-cumulative-adapter-static-preflight-v1',gateId:GATE,contractVersion:VERSION,executionPhase:'STATIC_PREFLIGHT',attempt:2,status:'VALIDATOR_STALE',classification:String(error&&error.message||error).split(':')[0]||'PIPELINE_MECHANISM_FAILURE',failed:Math.max(1,failed.length),failedCheckIds:failed.map(x=>x.id),error:String(error&&error.message||error).slice(0,600),executionAuthorized:false,staticValidationAuthorized:false,secretAccessAuthorized:false,firestoreReadAuthorized:false,writeAuthorized:false,runtimeAuthorized:false,browserAuthorized:false,previewAuthorized:false,deployAuthorized:false,productionAuthorized:false,firestoreDataWrites:0,operationalWrites:0,dataAccess:false,secretAccess:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,previewExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};save(result);console.log(JSON.stringify(result,null,2));process.exit(41);
}
