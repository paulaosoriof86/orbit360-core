#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {POSTDEPLOY_EVIDENCE_CONTRACT_VERSION} from './orbit360-f2-postdeploy-evidence-contract-v20260819.mjs';

const ROOT=process.cwd();
const LIVE='orbit360-platform/docs/orbit360-live-state-v1.json';
const INDEX='orbit360-platform/docs/ORBIT360-CURRENT-DOCUMENTATION-INDEX-v1.json';
const REQUEST='.github/orbit360-requests/f2-rules01-postdeploy-probe-readonly-v20260818-01.json';
const OBSERVER='orbit360-platform/runtime-gate-crm-v20260716/f2-rules01-postdeploy-probe-run-observer-v20260819.json';
const CHECKPOINT='orbit360-platform/docs/CHECKPOINT-F2-PRE-REQUEST06-KNOWN-ROOTFIXES-PASS-20260819.md';
const COMPOSITE_REL='orbit360-platform/runtime-gate-crm-v20260716/f2-rules01-postdeploy-composite-evidence-v20260819.json';
const ROOTFIX_REL='orbit360-platform/runtime-gate-crm-v20260716/f2-full-runtime-cross-tenant-validator-stale-rootfix-source-only-v20260819.json';
const SELFTEST_REL='orbit360-platform/runtime-gate-crm-v20260716/f2-full-runtime-known-rootfixes-selftest-v20260819.json';
const POSTSYNC_REL='orbit360-platform/runtime-gate-crm-v20260716/f2-pre-request06-postsync-source-only-v20260819.json';
const GATE='f2-productive-acceptance-exact-successor-v20260818';
const ARTIFACT=9345207863;
const REQUEST_VERSION='F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V1';
const PHASE='F2_PRE_REQUEST06_KNOWN_ROOTFIXES_SOURCE_AUDIT_PASS_AUTHORIZATION_PENDING';
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const write=(p,v)=>fs.writeFileSync(path.join(ROOT,p),JSON.stringify(v,null,2)+'\n','utf8');
const need=(ok,code)=>{if(!ok)throw new Error(code);};
const arg=n=>{const i=process.argv.indexOf(n);return i>=0?process.argv[i+1]:'';};

const compositePath=arg('--composite');
need(compositePath,'PIPELINE_MECHANISM_FAILURE:PRE_REQUEST06_COMPOSITE_ARGUMENT_REQUIRED');
const composite=JSON.parse(fs.readFileSync(path.resolve(ROOT,compositePath),'utf8'));
const request=read(REQUEST),observer=read(OBSERVER),live=read(LIVE),index=read(INDEX);

need(composite.evidenceContractVersion===POSTDEPLOY_EVIDENCE_CONTRACT_VERSION&&composite.ok===true&&composite.status==='F2_RULES01_POSTDEPLOY_COMPOSITE_EVIDENCE_PASS','PIPELINE_MECHANISM_FAILURE:PRE_REQUEST06_COMPOSITE_NOT_PASS');
need(Number(composite.runId)===32272580947&&Number(composite.artifactId)===9372746151&&Number(composite.candidateArtifactId)===ARTIFACT,'PIPELINE_MECHANISM_FAILURE:PRE_REQUEST06_COMPOSITE_BOUNDARY_MISMATCH');
need(composite.probe?.serverForced===true&&composite.probe?.pathValid===true&&Number(composite.probe?.responseStatus)===403&&composite.probe?.responseErrorStatus==='PERMISSION_DENIED'&&composite.probe?.crossTenantDenied===true,'SECURITY_FAILURE:PRE_REQUEST06_CROSS_TENANT_NOT_PROVEN');
need(composite.integrity?.beforeAfterPass===true&&composite.integrity?.countsIdentical===true&&composite.integrity?.digestsIdentical===true,'SECURITY_FAILURE:PRE_REQUEST06_INTEGRITY_NOT_PROVEN');
need(Object.values(composite.writes||{}).every(v=>Number(v)===0),'SECURITY_FAILURE:PRE_REQUEST06_WRITES_NONZERO');
need(Object.values(composite.forbiddenEffects||{}).every(v=>v===false),'SECURITY_FAILURE:PRE_REQUEST06_FORBIDDEN_EFFECT_PRESENT');
need(request.status==='CONSUMED_PASS'&&request.consumed===true&&request.allowedExecutions===0&&request.replayAllowed===false&&Number(request.candidateArtifactId)===ARTIFACT&&Number(request.terminal?.runId)===32272580947,'DATA_CONTRACT_FAILURE:PRE_REQUEST06_REQUEST_NOT_CONSUMED_PASS');
need(observer.ok===true&&observer.uniquenessCount===1&&observer.probeRunFound===true&&Number(observer.run?.id)===32272580947&&observer.run?.run_attempt===1&&observer.run?.conclusion==='success'&&observer.runtimeReplay===false&&observer.rulesRedeploy===false,'PIPELINE_MECHANISM_FAILURE:PRE_REQUEST06_OBSERVER_EVIDENCE_INVALID');
need(live.f2SourceOnly?.status==='CLOSED_PASS'&&live.f2SourceOnly?.gateId===GATE&&Number(live.f2SourceOnly?.candidateArtifactId)===ARTIFACT,'DATA_CONTRACT_FAILURE:PRE_REQUEST06_F2_SOURCE_NOT_CLOSED');
need(index.operationalCurrent?.f2SourceOnlyStatus==='CLOSED_PASS'&&index.operationalCurrent?.f2SourceOnlyGateId===GATE&&Number(index.operationalCurrent?.successorCandidateArtifactId)===ARTIFACT,'DATA_CONTRACT_FAILURE:PRE_REQUEST06_INDEX_SOURCE_NOT_CLOSED');

const now=new Date().toISOString();
live.stateVersion='20260819.f2.pre-request06-known-rootfixes-pass.authorization-pending.current';
live.updatedAt=now;
live.phase=PHASE;
live.rootCauseState=live.rootCauseState||{};
live.rootCauseState.currentBlockingFact={code:'F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V1_REQUEST06_REQUIRED',status:'FRESH_AUTHORIZATION_PENDING'};
for(const k of ['authIsCurrentBlocker','passwordIsCurrentBlocker','membershipExistenceIsCurrentBlocker','tenantIsCurrentBlocker','hostDimeIsCurrentBlocker','dataReimportIsCurrentBlocker']) live.rootCauseState[k]=false;
live.rootCauseState.f2PostdeployProbeObserver={classification:'PIPELINE_MECHANISM_FAILURE',code:'F2_POSTDEPLOY_PROBE_OBSERVER_OVERCONSTRAINED_BY_ACTIONS_PATH_FIELD',status:'CLOSED'};
live.rootCauseState.f2PostdeployEvidenceAssembly={classification:'PIPELINE_MECHANISM_FAILURE',code:'POSTDEPLOY_CLOSURE_INFERRED_ARTIFACT_SCHEMA_INSTEAD_OF_PRODUCER_CONTRACT',status:'CLOSED_BY_F2_POSTDEPLOY_EVIDENCE_PRODUCER_CONTRACT_V1'};
live.rootCauseState.f2FullRuntimeCrossTenant={classification:'VALIDATOR_STALE',code:'F2_FULL_RUNTIME_CROSS_TENANT_PROBE_STILL_USES_RESERVED_INVALID_DOCUMENT_ID_AFTER_RULES01_VALID_PATH_ROOTFIX',status:'CLOSED_SOURCE_ONLY_SHARED_CONTRACT_V2'};

live.goLive=live.goLive||{};
Object.assign(live.goLive,{status:PHASE,successorPublished:false,productionOperationalDeclared:false,publishedPackagePreserved:true});
live.stopRetry=live.stopRetry||{};
Object.assign(live.stopRetry,{f2Runtime05MayBeRerun:false,f2Runtime05RequestReplayAllowed:false,f2Rules01MayBeRedeployedForThisProof:false,f2PostdeployProbeRequestMayBeRerun:false,request06MayBeCreatedWithoutFreshAuthorization:false});

live.nextActionExact={stage:'F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V1_REQUEST06_AUTHORIZATION_BOUNDARY',gateId:GATE,requestVersion:REQUEST_VERSION,runtimeRequestOrdinalAfterRepair:6,candidateArtifactId:ARTIFACT,securityRepairRequired:false,validatorRepairRequired:false,rulesSourceMutationRequired:false,rulesRedeployAllowed:false,rulesRedeployRequired:false,postdeployProbePassed:true,postdeployProbeRunId:32272580947,postdeployProbeRequestConsumed:true,knownRootfixSourceAuditRequired:false,knownRootfixSourceAuditPassed:true,request06Created:false,authorizationRequired:true,allowsAfterFreshRuntimeAuthorization:['mandatory_canonical_gate_before_secrets','exact_artifact_verification','provider_and_identity_readonly','integrity_before_after','browser_role_matrix_direccion_operativo_asesor','cross_tenant_valid_path_v2_confirmation','service_worker_cache_validation','readonly_runtime_acceptance'],forbids:['firestore_document_writes','auth_writes','membership_writes','data_writes','password_reset','rules_redeploy','hosting_deploy','functions_deploy','package_rebuild','publication','production_mutation','main_merge','request01_to_request05_replay','postdeploy_probe_replay']};

live.resumeProtocol=['Read ORBIT360-CURRENT-DOCUMENTATION-INDEX-v1.json','Read orbit360-live-state-v1.json','Confirm actual HEAD and PR #5 remain draft/open/unmerged','Read CHECKPOINT-F2-PRE-REQUEST06-KNOWN-ROOTFIXES-PASS-20260819.md','Read F2 postdeploy composite evidence producer contract PASS','Do not rerun Request01-Request05 or postdeploy Request01','Do not redeploy Firestore rules','Do not reopen authentication, password, membership existence, Cliente 360, HostDime or data reimport as current blockers','Do not use reserved Firestore IDs in the full F2 runtime probe; it is now bound to F2_CROSS_TENANT_PROBE_VALID_PATH_V2','Certified successor artifact 9345207863 remains unpublished; the public URL is not yet the certified successor','Create Request06 only after fresh explicit authorization','Request06 canonical gate and known-rootfix selftest must pass before secrets/browser'];

live.f2Rules01=live.f2Rules01||{};
live.f2Rules01.status='POSTDEPLOY_PROBE_PASS_CONSUMED';
live.f2Rules01.requestConsumed=true;
live.f2Rules01.replayAllowed=false;
live.f2Rules01.postdeployProbe={requestPath:REQUEST,requestCreated:true,requestConsumed:true,authorized:false,runId:32272580947,runAttempt:1,terminalArtifactId:9372746151,status:'PASS',serverForced:true,responseStatus:403,responseErrorStatus:'PERMISSION_DENIED',crossTenantDenied:true,integrityBeforeAfterPass:true,rulesRedeployAllowed:false,rulesRedeployExecuted:false,firestoreDocumentWrites:0,authWrites:0,membershipWrites:0,dataWrites:0,evidence:COMPOSITE_REL,evidenceContractVersion:POSTDEPLOY_EVIDENCE_CONTRACT_VERSION};
live.f2Rules01.request06Created=false;
write(LIVE,live);

index.updatedAt=now;
index.operationalCurrent=index.operationalCurrent||{};
Object.assign(index.operationalCurrent,{resumePointer:CHECKPOINT,currentCheckpoint:CHECKPOINT,latestRuntimeEvidence:COMPOSITE_REL,latestTerminalEvidence:COMPOSITE_REL,latestRequestConsumptionEvidence:COMPOSITE_REL,latestPreflightEvidence:POSTSYNC_REL,currentPhase:PHASE,currentPhaseInternalPercent:0,currentPhaseInternalMethod:'pre_request06_known_rootfixes_source_audit_pass_authorization_pending',goLiveRoutePercentClosed:50,integratedProgramPercentClosed:25,currentBlocker:'All known F2 source/tooling blockers are closed. Fresh explicit authorization is the only current boundary for Request06. Certified successor artifact 9345207863 remains unpublished.',f2RuntimeRequestCreated:false,f2RuntimeAuthorizationGranted:false,successorPublished:false,nextAuthorizationBoundary:'F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V1 / REQUEST06 / EXACT_ARTIFACT_9345207863 / FRESH_AUTHORIZATION_REQUIRED',request06Created:false,f2Rules01Status:'POSTDEPLOY_PROBE_PASS_CONSUMED',f2Rules01RulesRedeployRequired:false,f2PostdeployProbeRequestCreated:true,f2PostdeployProbeAuthorizationGranted:false,f2PostdeployProbeRequestConsumed:true,f2PostdeployProbeStatus:'CLOSED_PASS_CONSUMED',f2PostdeployProbeRunId:'32272580947',f2PostdeployProbeTerminalArtifactId:'9372746151',f2PostdeployProbeCrossTenantDenied:true,f2PostdeployProbeIntegrityBeforeAfterPass:true,f2PostdeployProbeReplayAllowed:false,f2PostdeployProbeEvidence:COMPOSITE_REL,f2PostdeployEvidenceContractVersion:POSTDEPLOY_EVIDENCE_CONTRACT_VERSION,f2KnownRootfixSourceAuditStatus:'PASS',f2KnownRootfixSourceAuditEvidence:SELFTEST_REL,f2FullRuntimeCrossTenantRootfixEvidence:ROOTFIX_REL,f2PostdeployProbePostSyncEvidence:POSTSYNC_REL});
write(INDEX,index);

const checkpoint=`# CHECKPOINT — F2 PRE-REQUEST06 KNOWN ROOTFIXES PASS · 2026-08-19\n\n## Bloque\nF2 Productive Acceptance — auditoría preventiva completa antes de Request06.\n\n## Evidencia cerrada\n- Postdeploy RULES01 run único \`32272580947\`, artefacto \`9372746151\`.\n- Probe server-forced: **403 / PERMISSION_DENIED** sobre \`tenants/orbit360-f2-cross-tenant-probe/system/config\`.\n- Integridad before/after: counts y digests idénticos.\n- Writes Firestore/Auth/membership/data/operational: **0**.\n- Sin redeploy de reglas, Hosting, Functions, rebuild, publicación ni producción.\n- Contrato de evidencia: \`${POSTDEPLOY_EVIDENCE_CONTRACT_VERSION}\`; no se infiere el esquema: compone los tres producers reales (terminal plano + probe + integridad).\n\n## Rootfixes conocidos revalidados en source\n1. Autenticación productiva del sucesor: provider browser real con password sign-in presente.\n2. Legal gate: quiet window posterior al detach preservado.\n3. Roles: SuperAdmin resuelve vista Dirección; AdminTenant no.\n4. Topología: Inicio, Cliente 360, Aseguradoras, Ops, Leads, Pólizas y Cobros; Vehículos y Recibos/cartera integrados.\n5. Cross-tenant: runner completo comparte \`F2_CROSS_TENANT_PROBE_VALID_PATH_V2\`; ID reservado eliminado.\n6. Lifecycle: request dinámico run-bound, sin acople a ordinal histórico.\n7. PWA/Service Worker: build del sucesor congelado consistente y limpieza de caches anteriores presente.\n8. Artefacto exacto \`9345207863\` preservado; workflow runtime sin comandos de deploy.\n\n## Por qué Paula todavía no ve estos fixes\nEl sucesor certificado permanece **unpublished** y \`productionOperationalDeclared=false\`. La URL pública todavía no es evidencia del sucesor certificado. Esto no reabre autenticación ni Cliente 360.\n\n## Estado\nCarril A: FROZEN_NO_CHANGES. Carril B: \`${PHASE}\`. Carril C: UNTOUCHED_ZERO_CHANGES. Ruta inmediata: **50%**; programa integral: **25%** hasta cerrar F2 runtime.\n\n## Siguiente acción exacta\n\`F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V1 / REQUEST06 / EXACT_ARTIFACT_9345207863\`. Solo requiere autorización fresca. El workflow volverá a ejecutar el self-test de rootfixes y el gate canónico **antes** de secretos/browser. No puede escribir, redeplegar reglas, publicar ni tocar producción.\n\n## Anti-regresión\nNo repetir Request01–05, RULES01 ni postdeploy Request01. No volver a diagnosticar autenticación/Cliente360/HostDime como bloqueadores sin evidencia nueva. Si Request06 falla en un código ya corregido, STOP inmediato y diagnóstico de integración del rootfix; no Request07 automático.\n`;
fs.writeFileSync(path.join(ROOT,CHECKPOINT),checkpoint,'utf8');
console.log(JSON.stringify({ok:true,status:'F2_PRE_REQUEST06_DOCSYNC_V2_PREPARED',phase:PHASE,postdeployEvidenceContract:POSTDEPLOY_EVIDENCE_CONTRACT_VERSION,request06Created:false,successorPublished:false,writes:0},null,2));
