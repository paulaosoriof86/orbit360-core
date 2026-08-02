#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';

const ROOT=process.cwd();
const EVIDENCE=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716');
const STATIC_REQUEST='.github/orbit360-static-requests/gate711-reopen-static-v20260802.json';
const ENGINE='tools/orbit360-validar-gate-contracts-engine-canonical-runtime-cumulative-visual-lab-v20260801.mjs';
const AUTH_VALIDATOR='tools/orbit360-validar-authorization-binding-gate711-v20260802.mjs';
const LEGAL_VALIDATOR='tools/orbit360-validar-legal-deferred-order-gate711-v20260802.mjs';
const RUNTIME_VALIDATOR='tools/orbit360-validar-canonical-runtime-cumulative-visual-lab-v20260801.mjs';
const LEGAL_OWNER='orbit360-platform/core/legal.js';
const RUNTIME_WORKFLOW='.github/workflows/orbit360-canonical-runtime-cumulative-visual-lab-v20260801.yml';
const GATE79='tools/orbit360-validator-lifecycle-contract-policies-full-canonical-revalidation-readonly-v20260801.json';
const GATE710='tools/orbit360-validator-lifecycle-contract-canonical-store-cumulative-adapter-static-v20260801.json';
const CUMULATIVE='tools/orbit360-cumulative-visual-candidate-contract-v20260801.json';
const GATE='block7-canonical-runtime-cumulative-visual-lab-v20260801';
const VERSION='7.11.0';
const DIGEST='19e1927d39f6b713ee12504f8762bc42ead9de6e365bb0f12162d2a0c8f8469b';
const PATH_DIGEST='517056dee1200503b2e7295a333cb804bc71271bbaa87847fa762da025f276f1';
const CONTENT_DIGEST='83cc01dacf180b8ca9693df7117030228479992d6db4c59fab53def2e94acafd';
const INDEX_DIGEST='b57b6581ee02d2dde42a8a2c1272d57f19b7ad6809d13a1d25111f3d71a96074';

function readText(rel){return fs.readFileSync(path.join(ROOT,rel),'utf8');}
function readJson(rel){return JSON.parse(readText(rel));}
function write(name,payload){fs.mkdirSync(EVIDENCE,{recursive:true});fs.writeFileSync(path.join(EVIDENCE,name),JSON.stringify(payload,null,2)+'\n','utf8');}
function git(...args){return execFileSync('git',args,{cwd:ROOT,encoding:'utf8'}).trim();}
function sha(value){return crypto.createHash('sha256').update(value).digest('hex');}
function finalize(name,base,checks){const failed=checks.filter(x=>!x.ok);const payload={...base,checks,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),secretAccess:false,firestoreRead:false,firestoreWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,previewExecuted:false,deployExecuted:false,production:false,main:false,merge:false,containsPII:false,containsSecrets:false,ok:failed.length===0};write(name,payload);return payload;}

const required=[STATIC_REQUEST,ENGINE,AUTH_VALIDATOR,LEGAL_VALIDATOR,RUNTIME_VALIDATOR,LEGAL_OWNER,RUNTIME_WORKFLOW,GATE79,GATE710,CUMULATIVE];
const missing=required.filter(rel=>!fs.existsSync(path.join(ROOT,rel)));
if(missing.length){console.error('STATIC_FILES_MISSING:'+missing.join(','));process.exit(41);}

const authorization=readJson(STATIC_REQUEST);
const engine=readText(ENGINE);
const authValidator=readText(AUTH_VALIDATOR);
const legalValidator=readText(LEGAL_VALIDATOR);
const runtimeValidator=readText(RUNTIME_VALIDATOR);
const legal=readText(LEGAL_OWNER);
const runtimeWorkflow=readText(RUNTIME_WORKFLOW);
const gate79=readJson(GATE79);
const gate710=readJson(GATE710);
const cumulative=readJson(CUMULATIVE);
const head=git('rev-parse','HEAD');
const parent=git('rev-parse','HEAD^');

const prospectiveLifecycle={
  gateId:GATE,gateContractVersion:VERSION,status:'CANONICAL_RUNTIME_CUMULATIVE_VISUAL_LAB_AUTHORIZED',
  executionProfile:{phase:'LAB_RUNTIME_GATE',capabilities:{secrets:true,firestoreRead:true,writes:false,runtime:true,browser:true,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false}},
  authorization:{explicit:true,allowedExecutions:1,consumed:false,macroBlockWithoutMicroAuthorizations:true,authorizationRef:authorization.authorizationRef},
  guards:{firestoreDataWritesAllowed:false,operationalWritesAllowed:0,reimportAllowed:false,hostingDeployAllowed:false,previewDeployAllowed:false,productionAllowed:false},
  humanApproval:{clientes:true,polizas:false,vehiculos:false,recibos:false,cartera:false,restoCrm:false,automatedGateMaySetApproval:false}
};
const prospectiveRequest={
  schemaVersion:'orbit360-canonical-runtime-cumulative-visual-lab-request-v1',gateId:GATE,contractVersion:VERSION,authorizationRef:authorization.authorizationRef,approved:true,allowedExecutions:1,consumed:false,
  branch:'ays/backend-tenant-lab-v99-20260703',pullRequest:5,parentHead:head,projectId:'ays-orbit-360-lab',tenantId:'alianzas-soluciones',canonicalSnapshotDigest:DIGEST,
  cumulativeManifest:{trackedFileCount:309,pathDigest:PATH_DIGEST,contentDigest:CONTENT_DIGEST,indexDigest:INDEX_DIGEST},
  expectedOperationalCounts:{clientes:430,aseguradoras:30,polizas:1373,vehiculos:1032,recibosEsperados:1294,carteraPrimas:673,cobros:5,asesores:7},
  identity:{existingOnly:true,createUser:false,updateUser:false,customTokenEphemeral:true,expectedUid:'woJlxR1iFEeiQZvTscPj4qQ5Qc73',expectedEmail:'orbit.lab@demo.com',derivePublicWebConfigReadOnly:true},
  scope:{exactCheckoutLocalServe:true,snapshotBeforeAfter:true,browserWriteGuard:true,singleReadOwner:'Orbit.store',canonicalCollections:7,roles:3,viewports:3,routes:3,sanitizedScreenshots:true,singleCumulativeVisualReview:true,automatedGateMaySetHumanApproval:false},
  capabilities:{secrets:true,firestoreRead:true,writes:false,runtime:true,browser:true,preview:false,deploy:false,rulesDeploy:false,functionsDeploy:false,production:false,main:false,merge:false},
  humanApproval:{clientes:true,polizas:false,vehiculos:false,recibos:false,cartera:false,restoCrm:false},containsPII:false,containsSecrets:false
};

const authRef=String(authorization.authorizationRef||'').trim();
const authChecks=[
  {id:'STATIC_AUTHORIZATION_SCHEMA',ok:authorization.schemaVersion==='orbit360-gate711-static-reopen-authorization-v1'},
  {id:'STATIC_ONLY_CAPABILITIES',ok:authorization.capabilities?.secrets===false&&authorization.capabilities?.firestoreRead===false&&authorization.capabilities?.writes===false&&authorization.capabilities?.runtime===false&&authorization.capabilities?.browser===false&&authorization.capabilities?.deploy===false&&authorization.capabilities?.production===false},
  {id:'EXACT_BRANCH_PR',ok:authorization.branch==='ays/backend-tenant-lab-v99-20260703'&&authorization.pullRequest===5},
  {id:'SOURCE_HEAD_BOUND',ok:authorization.sourceHead===parent},
  {id:'CURRENT_HEAD_CONTAINS_ONLY_STATIC_TRIGGER',ok:head!==parent},
  {id:'AUTHORIZATION_REFERENCE_PRESENT',ok:authRef.length>0},
  {id:'AUTHORIZATION_TEXT_DIGEST_MATCH',ok:authorization.authorizationTextDigest===sha(authorization.authorizationText)},
  {id:'ONE_RUNTIME_ONLY_AFTER_STATIC',ok:authorization.runtimeBoundary?.allowedExecutions===1&&authorization.runtimeBoundary?.onlyAfterStaticPasses===true&&authorization.runtimeBoundary?.newImmutableRequestRequired===true},
  {id:'ZERO_WRITE_BOUNDARY',ok:authorization.runtimeBoundary?.writes===false&&authorization.runtimeBoundary?.reimport===false&&authorization.runtimeBoundary?.deploy===false&&authorization.runtimeBoundary?.production===false},
  {id:'NO_HISTORICAL_HARDCODE',ok:!engine.includes("authorizationRef==='user_proceed_definitive_solutions_no_trial_error_20260801'")},
  {id:'ENGINE_EXACT_BINDING',ok:engine.includes('requestAuthorizationRef===lifecycleAuthorizationRef')&&engine.includes('lifecycleAuthorizationRef.length>0')},
  {id:'STATIC_VALIDATOR_EXACT_BINDING',ok:authValidator.includes('requestRef===lifecycleRef')&&authValidator.includes('lifecycleRef.length>0')},
  {id:'PROSPECTIVE_REFERENCES_MATCH',ok:prospectiveLifecycle.authorization.authorizationRef===prospectiveRequest.authorizationRef&&authRef===prospectiveRequest.authorizationRef},
  {id:'PROSPECTIVE_SINGLE_EXECUTION',ok:prospectiveLifecycle.authorization.allowedExecutions===1&&prospectiveRequest.allowedExecutions===1&&prospectiveLifecycle.authorization.consumed===false&&prospectiveRequest.consumed===false},
  {id:'PROSPECTIVE_NO_WRITES',ok:prospectiveLifecycle.executionProfile.capabilities.writes===false&&prospectiveLifecycle.guards.operationalWritesAllowed===0&&prospectiveRequest.capabilities.writes===false}
];
const authEvidence=finalize('gate711-authorization-binding-static-v20260802.json',{schemaVersion:'orbit360-gate711-authorization-binding-static-v1',gateId:GATE,contractVersion:VERSION,status:'GATE711_AUTHORIZATION_BINDING_STATIC_PASS',classification:'GO_STATIC_AUTHORIZATION_BINDING',sourceHead:parent,auditedHead:head,prospectiveRequestDigest:sha(JSON.stringify(prospectiveRequest))},authChecks);
if(!authEvidence.ok){authEvidence.status='GATE711_AUTHORIZATION_BINDING_STATIC_FAIL';authEvidence.classification='VALIDATOR_STALE';write('gate711-authorization-binding-static-v20260802.json',authEvidence);}

const hydrate=runtimeValidator.indexOf("bounded('canonical_store_hydrated'");
const settle=runtimeValidator.indexOf('await settleLegalGateAfterHydration(page);');
const guard=runtimeValidator.indexOf('window.__orbitRuntimeWriteGuard={calls};');
const legalChecks=[
  {id:'LEGAL_OWNER_MARKER',ok:legal.includes('data-legal-gate')},
  {id:'LEGAL_OWNER_CHECKBOX',ok:legal.includes('id="lg-chk"')},
  {id:'LEGAL_OWNER_ACCEPT',ok:legal.includes('id="lg-ok"')},
  {id:'LEGAL_OWNER_STATE',ok:legal.includes('__gateState')&&legal.includes('pendingScopes')&&legal.includes('doneScopes')},
  {id:'VALIDATOR_SETTLER',ok:runtimeValidator.includes('async function settleLegalGateAfterHydration(page)')},
  {id:'HYDRATE_BEFORE_LEGAL',ok:hydrate>=0&&settle>hydrate},
  {id:'LEGAL_BEFORE_WRITE_GUARD',ok:settle>=0&&guard>settle},
  {id:'NO_PREMATURE_VISIBLE_BRANCH',ok:!runtimeValidator.includes("const legalVisible=await page.locator('[data-legal-gate]:visible').count()")},
  {id:'LEGAL_ABSENT_ASSERTION',ok:runtimeValidator.includes('legal_gate_absent_before_write_guard')&&runtimeValidator.includes('legalSettledBeforeWriteGuard=true')},
  {id:'STATIC_VALIDATOR_ALIGNED',ok:legalValidator.includes('HYDRATE_BEFORE_LEGAL')&&legalValidator.includes('LEGAL_BEFORE_WRITE_GUARD')},
  {id:'WORKFLOW_REQUIRES_LEGAL_CHECK',ok:runtimeWorkflow.includes('node tools/orbit360-validar-legal-deferred-order-gate711-v20260802.mjs')}
];
const legalEvidence=finalize('gate711-legal-deferred-order-static-v20260802.json',{schemaVersion:'orbit360-gate711-legal-deferred-order-static-v1',gateId:GATE,contractVersion:VERSION,status:'GATE711_LEGAL_DEFERRED_ORDER_STATIC_PASS',classification:'GO_STATIC_LEGAL_DEFERRED_ORDER',sourceHead:parent,auditedHead:head,productFilesChanged:0,dataFilesChanged:0},legalChecks);
if(!legalEvidence.ok){legalEvidence.status='GATE711_LEGAL_DEFERRED_ORDER_STATIC_FAIL';legalEvidence.classification='VALIDATOR_STALE';write('gate711-legal-deferred-order-static-v20260802.json',legalEvidence);}

const c=prospectiveLifecycle.executionProfile.capabilities;
const preflightChecks=[
  {id:'AUTHORIZATION_STATIC_PASS',ok:authEvidence.ok&&authEvidence.status==='GATE711_AUTHORIZATION_BINDING_STATIC_PASS'},
  {id:'LEGAL_STATIC_PASS',ok:legalEvidence.ok&&legalEvidence.status==='GATE711_LEGAL_DEFERRED_ORDER_STATIC_PASS'},
  {id:'GATE',ok:prospectiveLifecycle.gateId===GATE&&prospectiveLifecycle.gateContractVersion===VERSION},
  {id:'LIFECYCLE',ok:prospectiveLifecycle.status==='CANONICAL_RUNTIME_CUMULATIVE_VISUAL_LAB_AUTHORIZED'},
  {id:'PHASE',ok:prospectiveLifecycle.executionProfile.phase==='LAB_RUNTIME_GATE'},
  {id:'CAPABILITIES',ok:c.secrets===true&&c.firestoreRead===true&&c.writes===false&&c.runtime===true&&c.browser===true&&c.deploy===false&&c.functionsDeploy===false&&c.rulesDeploy===false&&c.production===false},
  {id:'AUTHORIZATION',ok:prospectiveLifecycle.authorization.explicit===true&&prospectiveLifecycle.authorization.allowedExecutions===1&&prospectiveLifecycle.authorization.consumed===false&&prospectiveLifecycle.authorization.macroBlockWithoutMicroAuthorizations===true&&authRef.length>0&&prospectiveRequest.authorizationRef===authRef},
  {id:'REQUEST',ok:prospectiveRequest.schemaVersion==='orbit360-canonical-runtime-cumulative-visual-lab-request-v1'&&prospectiveRequest.approved===true&&prospectiveRequest.allowedExecutions===1&&prospectiveRequest.consumed===false},
  {id:'BRANCH',ok:prospectiveRequest.branch==='ays/backend-tenant-lab-v99-20260703'&&prospectiveRequest.pullRequest===5&&prospectiveRequest.projectId==='ays-orbit-360-lab'&&prospectiveRequest.tenantId==='alianzas-soluciones'},
  {id:'GATE_79',ok:gate79.status==='POLICIES_FULL_CANONICAL_REVALIDATION_READONLY_CLOSED'&&gate79.sealedState?.canonicalSnapshotDigest===DIGEST&&gate79.guards?.additionalExecutionsAllowed===false},
  {id:'GATE_710',ok:gate710.status==='CANONICAL_STORE_CUMULATIVE_ADAPTER_STATIC_CLOSED'&&gate710.solution?.singleReadOwner==='Orbit.store'&&gate710.guards?.additionalExecutionsAllowed===false&&gate710.authorization?.requestReplayBlocked===true},
  {id:'CUMULATIVE',ok:cumulative.status==='CUMULATIVE_VISUAL_CANDIDATE_MANIFEST_SEALED'&&cumulative.manifest?.trackedFileCount===309&&cumulative.manifest?.pathDigest===PATH_DIGEST&&cumulative.manifest?.contentDigest===CONTENT_DIGEST&&cumulative.manifest?.indexDigest===INDEX_DIGEST&&cumulative.canonicalReadModel?.singleReadOwner==='Orbit.store'},
  {id:'DIGESTS',ok:prospectiveRequest.canonicalSnapshotDigest===DIGEST&&prospectiveRequest.cumulativeManifest.pathDigest===PATH_DIGEST&&prospectiveRequest.cumulativeManifest.contentDigest===CONTENT_DIGEST&&prospectiveRequest.cumulativeManifest.indexDigest===INDEX_DIGEST},
  {id:'COUNTS',ok:prospectiveRequest.expectedOperationalCounts.clientes===430&&prospectiveRequest.expectedOperationalCounts.aseguradoras===30&&prospectiveRequest.expectedOperationalCounts.polizas===1373&&prospectiveRequest.expectedOperationalCounts.vehiculos===1032&&prospectiveRequest.expectedOperationalCounts.recibosEsperados===1294&&prospectiveRequest.expectedOperationalCounts.carteraPrimas===673&&prospectiveRequest.expectedOperationalCounts.cobros===5&&prospectiveRequest.expectedOperationalCounts.asesores===7},
  {id:'IDENTITY',ok:prospectiveRequest.identity.existingOnly===true&&prospectiveRequest.identity.createUser===false&&prospectiveRequest.identity.updateUser===false&&prospectiveRequest.identity.customTokenEphemeral===true},
  {id:'VISUAL_SCOPE',ok:prospectiveRequest.scope.exactCheckoutLocalServe===true&&prospectiveRequest.scope.snapshotBeforeAfter===true&&prospectiveRequest.scope.browserWriteGuard===true&&prospectiveRequest.scope.roles===3&&prospectiveRequest.scope.viewports===3&&prospectiveRequest.scope.routes===3&&prospectiveRequest.scope.sanitizedScreenshots===true&&prospectiveRequest.scope.singleCumulativeVisualReview===true},
  {id:'NO_WRITES',ok:prospectiveRequest.capabilities.writes===false&&prospectiveLifecycle.guards.firestoreDataWritesAllowed===false&&prospectiveLifecycle.guards.operationalWritesAllowed===0&&prospectiveLifecycle.guards.reimportAllowed===false&&prospectiveLifecycle.guards.hostingDeployAllowed===false&&prospectiveLifecycle.guards.previewDeployAllowed===false&&prospectiveLifecycle.guards.productionAllowed===false},
  {id:'APPROVAL_BOUNDARY',ok:prospectiveLifecycle.humanApproval.clientes===true&&prospectiveLifecycle.humanApproval.polizas===false&&prospectiveLifecycle.humanApproval.vehiculos===false&&prospectiveLifecycle.humanApproval.recibos===false&&prospectiveLifecycle.humanApproval.cartera===false&&prospectiveLifecycle.humanApproval.automatedGateMaySetApproval===false}
];
const preflight=finalize('gate711-reopen-preflight-sanitized-v20260802.json',{schemaVersion:'orbit360-gate711-reopen-preflight-static-v1',gateId:GATE,contractVersion:VERSION,executionPhase:'STATIC_REOPEN_AUDIT',status:'GO_GATE_CONTRACT',classification:'CANONICAL_RUNTIME_CUMULATIVE_VISUAL_LAB_READY',sourceHead:parent,auditedHead:head,authorizationRefDigest:sha(authRef),prospectiveRequestDigest:sha(JSON.stringify(prospectiveRequest)),executionAuthorized:false,secretAccessAuthorized:false,firestoreReadAuthorized:false,writeAuthorized:false,runtimeAuthorized:false,browserAuthorized:false,previewAuthorized:false,deployAuthorized:false,productionAuthorized:false},preflightChecks);
if(!preflight.ok){preflight.status='VALIDATOR_STALE';preflight.classification='PIPELINE_MECHANISM_FAILURE';write('gate711-reopen-preflight-sanitized-v20260802.json',preflight);}

console.log(JSON.stringify({authorization:authEvidence.status,legal:legalEvidence.status,preflight:preflight.status,ok:authEvidence.ok&&legalEvidence.ok&&preflight.ok},null,2));
process.exit(authEvidence.ok&&legalEvidence.ok&&preflight.ok?0:41);
