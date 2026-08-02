#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const GATE='block7-canonical-runtime-cumulative-visual-lab-v20260801';
const VERSION='7.11.0';
const LIFECYCLE='tools/orbit360-validator-lifecycle-contract-canonical-runtime-cumulative-visual-lab-v20260801.json';
const REQUEST='.github/orbit360-requests/canonical-runtime-cumulative-visual-lab-v20260801.json';
const GATE79='tools/orbit360-validator-lifecycle-contract-policies-full-canonical-revalidation-readonly-v20260801.json';
const GATE710='tools/orbit360-validator-lifecycle-contract-canonical-store-cumulative-adapter-static-v20260801.json';
const CUMULATIVE='tools/orbit360-cumulative-visual-candidate-contract-v20260801.json';
const BROWSER='tools/orbit360-validar-canonical-runtime-cumulative-visual-lab-v20260801.mjs';
const IDENTITY='tools/orbit360-preparar-identidad-browser-canonica-readonly-v20260801.mjs';
const REVALIDATOR='tools/orbit360-revalidar-policies-full-canonical-readonly-v20260801.mjs';
const WORKFLOW='.github/workflows/orbit360-canonical-runtime-cumulative-visual-lab-v20260801.yml';
const DIGEST='19e1927d39f6b713ee12504f8762bc42ead9de6e365bb0f12162d2a0c8f8469b';
const PATH_DIGEST='517056dee1200503b2e7295a333cb804bc71271bbaa87847fa762da025f276f1';
const CONTENT_DIGEST='83cc01dacf180b8ca9693df7117030228479992d6db4c59fab53def2e94acafd';
const INDEX_DIGEST='b57b6581ee02d2dde42a8a2c1272d57f19b7ad6809d13a1d25111f3d71a96074';

function read(rel){return JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8'));}
function save(payload){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n','utf8');}
const checks=[];const add=(id,ok)=>checks.push({id,ok:Boolean(ok)});
try{
  add('GATE',process.argv[2]===GATE);
  const required=[LIFECYCLE,REQUEST,GATE79,GATE710,CUMULATIVE,BROWSER,IDENTITY,REVALIDATOR,WORKFLOW,'tools/orbit360-validar-gate-contracts-v20260717.mjs','orbit360-platform/index.html','orbit360-platform/data/store-firestore-lab.local.js','orbit360-platform/core/backend-lab-auth-guard.js'];
  const missing=required.filter(rel=>!fs.existsSync(path.join(ROOT,rel)));add('FILES',missing.length===0);if(missing.length)throw new Error('PIPELINE_MECHANISM_FAILURE:FILES:'+missing.join(','));
  const lifecycle=read(LIFECYCLE),request=read(REQUEST),gate79=read(GATE79),gate710=read(GATE710),cumulative=read(CUMULATIVE);
  add('LIFECYCLE',lifecycle.gateId===GATE&&lifecycle.gateContractVersion===VERSION&&lifecycle.status==='CANONICAL_RUNTIME_CUMULATIVE_VISUAL_LAB_AUTHORIZED');
  add('PHASE',lifecycle.executionProfile?.phase==='LAB_RUNTIME_GATE');
  const c=lifecycle.executionProfile?.capabilities||{};
  add('CAPABILITIES',c.secrets===true&&c.firestoreRead===true&&c.writes===false&&c.runtime===true&&c.browser===true&&c.deploy===false&&c.functionsDeploy===false&&c.rulesDeploy===false&&c.production===false);
  const lifecycleAuthorizationRef=String(lifecycle.authorization?.authorizationRef||'').trim();
  const requestAuthorizationRef=String(request.authorizationRef||'').trim();
  add('AUTHORIZATION',lifecycle.authorization?.explicit===true&&lifecycle.authorization?.allowedExecutions===1&&lifecycle.authorization?.consumed===false&&lifecycle.authorization?.macroBlockWithoutMicroAuthorizations===true&&lifecycleAuthorizationRef.length>0&&requestAuthorizationRef===lifecycleAuthorizationRef);
  add('REQUEST',request.schemaVersion==='orbit360-canonical-runtime-cumulative-visual-lab-request-v1'&&request.gateId===GATE&&request.contractVersion===VERSION&&request.approved===true&&request.allowedExecutions===1&&request.consumed===false);
  add('BRANCH',request.branch==='ays/backend-tenant-lab-v99-20260703'&&request.pullRequest===5&&request.projectId==='ays-orbit-360-lab'&&request.tenantId==='alianzas-soluciones');
  add('GATE_79',gate79.status==='POLICIES_FULL_CANONICAL_REVALIDATION_READONLY_CLOSED'&&gate79.sealedState?.canonicalSnapshotDigest===DIGEST&&gate79.guards?.additionalExecutionsAllowed===false);
  add('GATE_710',gate710.status==='CANONICAL_STORE_CUMULATIVE_ADAPTER_STATIC_CLOSED'&&gate710.solution?.singleReadOwner==='Orbit.store'&&gate710.guards?.additionalExecutionsAllowed===false&&gate710.authorization?.requestReplayBlocked===true);
  add('CUMULATIVE',cumulative.status==='CUMULATIVE_VISUAL_CANDIDATE_MANIFEST_SEALED'&&cumulative.manifest?.trackedFileCount===309&&cumulative.manifest?.pathDigest===PATH_DIGEST&&cumulative.manifest?.contentDigest===CONTENT_DIGEST&&cumulative.manifest?.indexDigest===INDEX_DIGEST&&cumulative.canonicalReadModel?.singleReadOwner==='Orbit.store');
  add('DIGESTS',request.canonicalSnapshotDigest===DIGEST&&request.cumulativeManifest?.trackedFileCount===309&&request.cumulativeManifest?.pathDigest===PATH_DIGEST&&request.cumulativeManifest?.contentDigest===CONTENT_DIGEST&&request.cumulativeManifest?.indexDigest===INDEX_DIGEST);
  add('COUNTS',request.expectedOperationalCounts?.clientes===430&&request.expectedOperationalCounts?.aseguradoras===30&&request.expectedOperationalCounts?.polizas===1373&&request.expectedOperationalCounts?.vehiculos===1032&&request.expectedOperationalCounts?.recibosEsperados===1294&&request.expectedOperationalCounts?.carteraPrimas===673&&request.expectedOperationalCounts?.cobros===5&&request.expectedOperationalCounts?.asesores===7);
  add('IDENTITY',request.identity?.existingOnly===true&&request.identity?.createUser===false&&request.identity?.updateUser===false&&request.identity?.customTokenEphemeral===true&&request.identity?.expectedUid==='woJlxR1iFEeiQZvTscPj4qQ5Qc73'&&request.identity?.expectedEmail==='orbit.lab@demo.com');
  add('VISUAL_SCOPE',request.scope?.exactCheckoutLocalServe===true&&request.scope?.snapshotBeforeAfter===true&&request.scope?.browserWriteGuard===true&&request.scope?.roles===3&&request.scope?.viewports===3&&request.scope?.routes===3&&request.scope?.sanitizedScreenshots===true&&request.scope?.singleCumulativeVisualReview===true);
  add('NO_WRITES',request.capabilities?.secrets===true&&request.capabilities?.firestoreRead===true&&request.capabilities?.writes===false&&request.capabilities?.runtime===true&&request.capabilities?.browser===true&&request.capabilities?.deploy===false&&request.capabilities?.production===false&&lifecycle.guards?.firestoreDataWritesAllowed===false&&lifecycle.guards?.operationalWritesAllowed===0&&lifecycle.guards?.reimportAllowed===false&&lifecycle.guards?.hostingDeployAllowed===false&&lifecycle.guards?.previewDeployAllowed===false&&lifecycle.guards?.productionAllowed===false);
  add('APPROVAL_BOUNDARY',lifecycle.humanApproval?.clientes===true&&lifecycle.humanApproval?.polizas===false&&lifecycle.humanApproval?.vehiculos===false&&lifecycle.humanApproval?.recibos===false&&lifecycle.humanApproval?.cartera===false&&lifecycle.humanApproval?.automatedGateMaySetApproval===false);
  const failed=checks.filter(x=>!x.ok);
  const result={schemaVersion:'orbit360-canonical-runtime-cumulative-visual-lab-preflight-v1',gateId:GATE,contractVersion:VERSION,executionPhase:'LAB_RUNTIME_GATE',status:failed.length?'VALIDATOR_STALE':'GO_GATE_CONTRACT',classification:failed.length?'PIPELINE_MECHANISM_FAILURE':'CANONICAL_RUNTIME_CUMULATIVE_VISUAL_LAB_READY',total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,authorizationBinding:{lifecycleRefPresent:lifecycleAuthorizationRef.length>0,requestMatchesLifecycle:requestAuthorizationRef===lifecycleAuthorizationRef},executionAuthorized:failed.length===0,secretAccessAuthorized:failed.length===0,firestoreReadAuthorized:failed.length===0,writeAuthorized:false,runtimeAuthorized:failed.length===0,browserAuthorized:failed.length===0,previewAuthorized:false,deployAuthorized:false,productionAuthorized:false,firestoreDataWrites:0,operationalWrites:0,dataAccess:false,secretAccess:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,previewExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
  save(result);console.log(JSON.stringify(result,null,2));process.exit(failed.length?41:0);
}catch(error){const failed=checks.filter(x=>!x.ok);const result={schemaVersion:'orbit360-canonical-runtime-cumulative-visual-lab-preflight-v1',gateId:GATE,contractVersion:VERSION,executionPhase:'LAB_RUNTIME_GATE',status:'VALIDATOR_STALE',classification:String(error&&error.message||error).split(':')[0]||'PIPELINE_MECHANISM_FAILURE',failed:Math.max(1,failed.length),failedCheckIds:failed.map(x=>x.id),error:String(error&&error.message||error).slice(0,600),executionAuthorized:false,secretAccessAuthorized:false,firestoreReadAuthorized:false,writeAuthorized:false,runtimeAuthorized:false,browserAuthorized:false,previewAuthorized:false,deployAuthorized:false,productionAuthorized:false,firestoreDataWrites:0,operationalWrites:0,dataAccess:false,secretAccess:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,previewExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};save(result);console.log(JSON.stringify(result,null,2));process.exit(41);}
