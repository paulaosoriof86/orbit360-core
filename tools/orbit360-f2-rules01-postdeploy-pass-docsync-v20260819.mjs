#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const P = {
  live: 'orbit360-platform/docs/orbit360-live-state-v1.json',
  index: 'orbit360-platform/docs/ORBIT360-CURRENT-DOCUMENTATION-INDEX-v1.json',
  request: '.github/orbit360-requests/f2-rules01-postdeploy-probe-readonly-v20260818-01.json',
  observer: 'orbit360-platform/runtime-gate-crm-v20260716/f2-rules01-postdeploy-probe-run-observer-v20260819.json',
  sanitized: 'orbit360-platform/runtime-gate-crm-v20260716/f2-rules01-postdeploy-probe-pass-v20260819.json',
  postsync: 'orbit360-platform/runtime-gate-crm-v20260716/f2-rules01-postdeploy-pass-postsync-source-only-v20260819.json',
  checkpoint: 'orbit360-platform/docs/CHECKPOINT-F2-RULES01-POSTDEPLOY-CROSS-TENANT-PROBE-PASS-REQUEST06-AUTH-PENDING-20260819.md'
};
const EXACT_ARTIFACT=9345207863, RUN_ID=32272580947, RUN_ARTIFACT_ID=9372746151;
const RUN_ARTIFACT_DIGEST='sha256:c087ad3bae277f990c760eb04edcce96ef2746add36120040ba6da5f4d55a860';
const GATE_ID='f2-productive-acceptance-exact-successor-v20260818';
const NEXT_REQUEST_VERSION='F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V1';
const PHASE='F2_RULES01_POSTDEPLOY_PROBE_PASS_REQUEST06_AUTHORIZATION_PENDING';
const read=(p)=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const write=(p,v)=>fs.writeFileSync(path.join(ROOT,p),JSON.stringify(v,null,2)+'\n','utf8');
const need=(c,m)=>{if(!c) throw new Error(m);};
const a=(n)=>{const i=process.argv.indexOf(n);return i>=0?process.argv[i+1]:null;};

const terminalArg=a('--terminal');
need(terminalArg,'DOCSYNC_TERMINAL_EVIDENCE_ARGUMENT_REQUIRED');
const terminal=JSON.parse(fs.readFileSync(path.resolve(ROOT,terminalArg),'utf8'));
const live=read(P.live), index=read(P.index), request=read(P.request), observer=read(P.observer);

need(live.schemaVersion==='orbit360-live-state-v1','DOCSYNC_LIVE_SCHEMA');
need(index.schemaVersion==='orbit360-current-documentation-index-v1','DOCSYNC_INDEX_SCHEMA');
need(request.requestVersion==='F2_RULES01_POSTDEPLOY_CROSS_TENANT_PROBE_READONLY_V1'&&request.requestOrdinal===1,'DOCSYNC_REQUEST_BOUNDARY');
need(request.status==='CONSUMED_PASS'&&request.consumed===true&&request.allowedExecutions===0&&request.replayAllowed===false,'DOCSYNC_REQUEST_CONSUMPTION');
need(request.candidateArtifactId===EXACT_ARTIFACT,'DOCSYNC_REQUEST_ARTIFACT');
need(request.terminal?.runId===RUN_ID&&request.terminal?.runAttempt===1&&request.terminal?.conclusion==='success','DOCSYNC_REQUEST_RUN');
need(request.terminal?.artifactId===RUN_ARTIFACT_ID&&request.terminal?.artifactDigest===RUN_ARTIFACT_DIGEST,'DOCSYNC_REQUEST_RUN_ARTIFACT');
need(request.terminal?.responseStatus===403&&request.terminal?.responseErrorStatus==='PERMISSION_DENIED'&&request.terminal?.crossTenantDenied===true,'DOCSYNC_REQUEST_DENY');
need(request.terminal?.integrityBeforeAfterPass===true&&request.terminal?.rulesRedeployExecuted===false,'DOCSYNC_REQUEST_INTEGRITY');
for(const k of ['firestoreDocumentWrites','authWrites','membershipWrites','dataWrites']) need(request.terminal?.[k]===0,`DOCSYNC_REQUEST_WRITE_${k}`);
for(const k of ['hostingDeploy','functionsDeploy','packageRebuild','publication','production']) need(request.terminal?.[k]===false,`DOCSYNC_REQUEST_EFFECT_${k}`);
need(observer.ok===true&&observer.uniquenessCount===1&&observer.probeRunFound===true,'DOCSYNC_OBSERVER_UNIQUENESS');
need(Number(observer.run?.id)===RUN_ID&&observer.run?.run_attempt===1&&observer.run?.status==='completed'&&observer.run?.conclusion==='success','DOCSYNC_OBSERVER_RUN');
need(observer.runtimeReplay===false&&observer.rulesRedeploy===false,'DOCSYNC_OBSERVER_EFFECT');
need(terminal.ok===true&&terminal.status==='F2_RULES01_POSTDEPLOY_CROSS_TENANT_PROBE_PASS','DOCSYNC_TERMINAL_STATUS');
need(Number(terminal.runId)===RUN_ID&&terminal.requestOrdinal===1&&terminal.candidateArtifactId===EXACT_ARTIFACT,'DOCSYNC_TERMINAL_BOUNDARY');
need(terminal.probe?.responseStatus===403&&terminal.probe?.responseErrorStatus==='PERMISSION_DENIED'&&terminal.probe?.crossTenantDenied===true,'DOCSYNC_TERMINAL_DENY');
need(terminal.integrity?.integrityBeforeAfterPass===true&&terminal.integrity?.countsIdentical===true&&terminal.integrity?.digestsIdentical===true,'DOCSYNC_TERMINAL_INTEGRITY');
need(terminal.scope?.rulesRedeployExecuted===false,'DOCSYNC_TERMINAL_REDEPLOY');
for(const k of ['firestoreDocumentWrites','authWrites','membershipWrites','dataWrites']) need(terminal.scope?.[k]===0,`DOCSYNC_TERMINAL_WRITE_${k}`);
need(terminal.scope?.hostingDeploy===false&&terminal.scope?.functionsDeploy===false&&terminal.scope?.packageRebuilt===false&&terminal.scope?.publicationExecuted===false&&terminal.scope?.productionHostingTouched===false,'DOCSYNC_TERMINAL_EFFECT');

const now=new Date().toISOString();
const observerRootCause={classification:'PIPELINE_MECHANISM_FAILURE',code:'F2_POSTDEPLOY_PROBE_OBSERVER_OVERCONSTRAINED_BY_ACTIONS_PATH_FIELD',status:'CLOSED_BY_PROVEN_SHA_WORKFLOW_EVENT_MATCH_CONTRACT',productAffected:false,probeReplayed:false};
write(P.sanitized,{schemaVersion:'orbit360-f2-rules01-postdeploy-probe-pass-v1',ok:true,status:'F2_RULES01_POSTDEPLOY_CROSS_TENANT_PROBE_PASS',classification:'SECURITY_CONTROL_PASS',canonicalGateId:GATE_ID,candidateArtifactId:EXACT_ARTIFACT,request:{path:P.request,ordinal:1,status:'CONSUMED_PASS',replayAllowed:false},run:{id:RUN_ID,attempt:1,conclusion:'success',artifactId:RUN_ARTIFACT_ID,artifactDigest:RUN_ARTIFACT_DIGEST},serverForcedProbe:{httpStatus:403,errorStatus:'PERMISSION_DENIED',crossTenantDenied:true},integrity:{beforeAfterPass:true,countsIdentical:true,digestsIdentical:true},writes:{firestoreDocument:0,auth:0,membership:0,data:0},forbiddenEffects:{rulesRedeploy:false,hostingDeploy:false,functionsDeploy:false,packageRebuild:false,publication:false,production:false,mainMerge:false},observer:{evidence:P.observer,uniquenessCount:1,runtimeReplay:false},observerRootCauseClosed:observerRootCause,successorPublication:{published:false,productionOperationalDeclared:false},containsPII:false,containsSecrets:false,generatedAt:now});

live.stateVersion='20260819.f2.rules01-postdeploy-probe-pass.request06-auth-pending.current';
live.updatedAt=now; live.phase=PHASE;
live.rootCauseState=live.rootCauseState||{};
live.rootCauseState.currentBlockingFact={code:'F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V1_REQUEST06_REQUIRED',status:'FRESH_AUTHORIZATION_PENDING'};
for(const k of ['authIsCurrentBlocker','passwordIsCurrentBlocker','membershipExistenceIsCurrentBlocker','tenantIsCurrentBlocker','hostDimeIsCurrentBlocker','dataReimportIsCurrentBlocker']) live.rootCauseState[k]=false;
live.rootCauseState.f2PostdeployProbeObserver=observerRootCause;
live.goLive=live.goLive||{}; Object.assign(live.goLive,{status:PHASE,publishedPackagePreserved:true,successorPublished:false,productionOperationalDeclared:false});
live.stopRetry=live.stopRetry||{}; Object.assign(live.stopRetry,{f2Runtime05MayBeRerun:false,f2Runtime05RequestReplayAllowed:false,f2Rules01MayBeRedeployedForThisProof:false,f2PostdeployProbeRequestMayBeRerun:false,request06MayBeCreatedWithoutFreshAuthorization:false});
live.nextActionExact={stage:'F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V1_REQUEST06_AUTHORIZATION_BOUNDARY',gateId:GATE_ID,requestVersion:NEXT_REQUEST_VERSION,runtimeRequestOrdinalAfterRepair:6,candidateArtifactId:EXACT_ARTIFACT,securityRepairRequired:false,rulesSourceMutationRequired:false,rulesRedeployAllowed:false,rulesRedeployRequired:false,postdeployProbePassed:true,postdeployProbeRunId:RUN_ID,postdeployProbeRequestConsumed:true,request06Created:false,authorizationRequired:true,allowsAfterFreshRuntimeAuthorization:['mandatory_canonical_gate_before_secrets','exact_artifact_verification','provider_and_identity_readonly','integrity_before_after','browser_role_matrix_direccion_operativo_asesor','cross_tenant_server_deny_confirmation','service_worker_cache_validation','readonly_runtime_acceptance'],forbids:['firestore_document_writes','auth_writes','membership_writes','data_writes','password_reset','rules_redeploy','hosting_deploy','functions_deploy','package_rebuild','publication','production_mutation','main_merge','request01_to_request05_replay','postdeploy_probe_replay']};
live.resumeProtocol=['Read ORBIT360-CURRENT-DOCUMENTATION-INDEX-v1.json','Read orbit360-live-state-v1.json','Confirm actual HEAD and PR #5 remain draft/open/unmerged','Read the F2 RULES01 postdeploy probe PASS checkpoint and sanitized evidence','Do not rerun Request01-Request05 or the postdeploy probe Request01','Do not redeploy Firestore rules: server-forced cross-tenant deny is already proven','Do not reopen authentication, password, membership existence, HostDime or data reimport as current blockers','Certified successor artifact 9345207863 remains unpublished; public URL is not evidence of the certified successor until publication is explicitly authorized','Create Request06 only after fresh explicit authorization','Request06 must run the canonical F2 gate before secrets and remain fully read-only'];
live.f2Rules01=live.f2Rules01||{}; live.f2Rules01.status='POSTDEPLOY_PROBE_PASS_REQUEST06_AUTH_PENDING'; live.f2Rules01.requestConsumed=true; live.f2Rules01.replayAllowed=false; live.f2Rules01.postdeployProbe={workflowPrepared:true,requestPath:P.request,requestCreated:true,requestConsumed:true,authorized:false,runId:RUN_ID,runAttempt:1,terminalArtifactId:RUN_ARTIFACT_ID,status:'PASS',serverForced:true,responseStatus:403,responseErrorStatus:'PERMISSION_DENIED',crossTenantDenied:true,integrityBeforeAfterPass:true,rulesRedeployAllowed:false,rulesRedeployExecuted:false,firestoreDocumentWrites:0,authWrites:0,membershipWrites:0,dataWrites:0,evidence:P.sanitized}; live.f2Rules01.request06Created=false;
write(P.live,live);

index.updatedAt=now; index.operationalCurrent=index.operationalCurrent||{};
Object.assign(index.operationalCurrent,{resumePointer:P.checkpoint,currentCheckpoint:P.checkpoint,latestRuntimeEvidence:P.sanitized,latestTerminalEvidence:P.sanitized,latestRequestConsumptionEvidence:P.sanitized,latestPreflightEvidence:P.postsync,currentPhase:PHASE,currentPhaseInternalPercent:0,currentPhaseInternalMethod:'rules01_postdeploy_probe_pass_request06_authorization_pending',goLiveRoutePercentClosed:50,integratedProgramPercentClosed:25,currentBlocker:'F2 security parity is closed: server-forced cross-tenant read returned 403/PERMISSION_DENIED with identical integrity. F2 remains open only for full runtime/browser acceptance Request06; fresh explicit authorization is required. Certified successor is still unpublished.',f2RuntimeRequestCreated:false,f2RuntimeAuthorizationGranted:false,successorPublished:false,nextAuthorizationBoundary:'F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V1 / REQUEST06 / EXACT_ARTIFACT_9345207863 / FRESH_AUTHORIZATION_REQUIRED',request06Created:false,f2Rules01Status:'POSTDEPLOY_PROBE_PASS_REQUEST06_AUTH_PENDING',f2Rules01RulesRedeployRequired:false,f2PostdeployProbeRequestCreated:true,f2PostdeployProbeAuthorizationGranted:false,f2PostdeployProbeRequestConsumed:true,f2PostdeployProbeStatus:'CLOSED_PASS_CONSUMED',f2PostdeployProbeRunId:String(RUN_ID),f2PostdeployProbeTerminalArtifactId:String(RUN_ARTIFACT_ID),f2PostdeployProbeCrossTenantDenied:true,f2PostdeployProbeIntegrityBeforeAfterPass:true,f2PostdeployProbeReplayAllowed:false,f2PostdeployProbeObserverRootCause:'F2_POSTDEPLOY_PROBE_OBSERVER_OVERCONSTRAINED_BY_ACTIONS_PATH_FIELD',f2PostdeployProbeObserverRootCauseStatus:'CLOSED',f2PostdeployProbeEvidence:P.sanitized,f2PostdeployProbePostSyncEvidence:P.postsync});
write(P.index,index);

const cp=`# CHECKPOINT — F2 RULES01 POSTDEPLOY CROSS-TENANT PROBE PASS · REQUEST06 AUTH PENDING · 2026-08-19\n\n## Bloque\nF2 Productive Acceptance — control de paridad de reglas cerrado y frontera limpia para Request06.\n\n## Fuente / baseline\n- Rama \`ays/backend-tenant-lab-v99-20260703\`; PR #5 debe permanecer draft/open/unmerged.\n- Gate \`${GATE_ID}\`; artefacto exacto \`${EXACT_ARTIFACT}\`, certificado y todavía **no publicado**.\n- Request postdeploy consumido PASS y no reproducible.\n\n## Evidencia\nRun único \`${RUN_ID}\`, attempt 1, success; artifact \`${RUN_ARTIFACT_ID}\` digest \`${RUN_ARTIFACT_DIGEST}\`. Probe forzado a servidor: **403 / PERMISSION_DENIED**, \`crossTenantDenied=true\`. Integridad before/after PASS con counts/digests idénticos. Firestore document/Auth/membership/data writes = **0**. Sin redeploy de reglas, Hosting, Functions, rebuild, publicación ni producción.\n\n## Causa raíz del atasco de observabilidad\n\`PIPELINE_MECHANISM_FAILURE / F2_POSTDEPLOY_PROBE_OBSERVER_OVERCONSTRAINED_BY_ACTIONS_PATH_FIELD\`. El observer inicial añadió un match por \`path\` no necesario; quedó sustituido por SHA exacto + workflow exacto + event push, con unicidad 1/attempt 1. El probe **no** se repitió.\n\n## Cerrado\nAutenticación/password, membership/tenant, Cliente 360, HostDime y reimportación de datos no son el bloqueo actual. El deny cross-tenant ya está probado server-backed. No redeploy ni replay de Request01–Request05.\n\n## Go-live\nEl sucesor \`${EXACT_ARTIFACT}\` sigue \`unpublished\` y \`productionOperationalDeclared=false\`. Por eso la URL pública todavía no constituye evidencia visual del sucesor certificado.\n\n## Carriles / avance\nA=FROZEN_NO_CHANGES; B=F2_RULES01_POSTDEPLOY_PROBE_PASS_REQUEST06_AUTHORIZATION_PENDING; C=UNTOUCHED_ZERO_CHANGES. Ruta inmediata **50%**; programa integral **25%** hasta cierre runtime de F2.\n\n## Siguiente acción exacta\n\`F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V1 / REQUEST06 / EXACT_ARTIFACT_9345207863\`, con autorización fresca. Gate canónico primero; luego artefacto exacto, identidad read-only, matriz Dirección/Operativo/Asesor, deny cross-tenant, Service Worker/cache e integridad before/after. Cero writes, cero redeploy, cero publicación/producción.\n\n## Reuso / Academia\n\`BACKEND_PROTEGIDO_NO_CLAUDE\`: enforcement/probe real. \`REPLICABLE_CLAUDE_ACUMULADO\`: observer SHA+workflow+event. \`ACADEMIA_ACTUALIZAR\`: diferenciar SECURITY_FAILURE de PIPELINE_MECHANISM_FAILURE de observabilidad.\n`;
fs.writeFileSync(path.join(ROOT,P.checkpoint),cp,'utf8');
console.log(JSON.stringify({ok:true,status:'F2_RULES01_POSTDEPLOY_PASS_DOCSYNC_PREPARED',phase:PHASE,runId:RUN_ID,crossTenantDenied:true,integrityBeforeAfterPass:true,request06Created:false,successorPublished:false,writes:0},null,2));
