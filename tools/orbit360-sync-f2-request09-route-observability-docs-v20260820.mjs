#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const LIVE='orbit360-platform/docs/orbit360-live-state-v1.json';
const INDEX='orbit360-platform/docs/ORBIT360-CURRENT-DOCUMENTATION-INDEX-v1.json';
const RUNTIME='tools/orbit360-validator-lifecycle-contract-f2-productive-acceptance-runtime-v20260819.json';
const CHECKPOINT='orbit360-platform/docs/CHECKPOINT-F2-REQUEST09-CONSUMED-ROUTE-OBSERVABILITY-ROOTFIX-PASS-REQUEST10-AUTH-PENDING-20260820.md';
const ACADEMIA='orbit360-platform/docs/ACADEMIA-ACTUALIZACION-F2-REQUEST09-ROUTE-OBSERVABILITY-20260820.md';
const EVIDENCE='orbit360-platform/runtime-gate-crm-v20260716/f2-request09-canonical-docsync-v20260820.json';
const GATE='f2-productive-acceptance-exact-successor-v20260818';
const REQUEST_VERSION='F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V1';
const CANDIDATE=9387820198;
const SOURCE='fc46bd85783d8b4d524cbeb0fee54ee9a2c774af';
const ZIP='orbit360-fase-a-product-f2-request08-router-readiness-successor-fc46bd85783d.zip';
const ZIP_SHA='58fcbe6e8d7d3a425509c87f229b1cb12dd35a99133d46c757544cc75c55aacc';
const MANIFEST_SHA='b18422fdf82830d28e82f657f83b4fd5c10ea134a4735263fa2587a2ddd808cb';
const MANIFEST_STATUS='FASE_A_PRODUCT_F2_REQUEST08_ROUTER_READINESS_SUCCESSOR_CERTIFIED';
const REQUEST09_RUN=32316883621;
const REQUEST09_JOB=96270948026;
const REQUEST09_ARTIFACT=9388429058;
const SOURCEFIX_RUN=32317619703;
const DISCOVERY='orbit360-platform/runtime-gate-crm-v20260716/f2-request09-runtime-discovery-v20260820.json';
const SOURCEFIX='orbit360-platform/runtime-gate-crm-v20260716/f2-request09-route-observability-rootfix-source-v20260820.json';
const now=new Date().toISOString();
const readJson=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8').replace(/^\uFEFF/,''));
const writeJson=(p,o)=>{fs.mkdirSync(path.dirname(path.join(ROOT,p)),{recursive:true});fs.writeFileSync(path.join(ROOT,p),JSON.stringify(o,null,2)+'\n','utf8');};

for(const p of [LIVE,INDEX,RUNTIME,DISCOVERY,SOURCEFIX]) if(!fs.existsSync(path.join(ROOT,p))) throw new Error('DOCSYNC_OWNER_MISSING:'+p);
const discovery=readJson(DISCOVERY),sourcefix=readJson(SOURCEFIX);
if(discovery.targetRunId!==REQUEST09_RUN||discovery.targetRunConclusion!=='failure'||discovery.matchCount!==1||discovery.multipleRuns!==false) throw new Error('DOCSYNC_REQUEST09_DISCOVERY_INVALID');
if(sourcefix.ok!==true||sourcefix.status!=='F2_REQUEST09_ROUTE_OBSERVABILITY_ROOTFIX_SOURCE_APPLIED'||sourcefix.candidateArtifactId!==CANDIDATE) throw new Error('DOCSYNC_SOURCEFIX_INVALID');

const live=readJson(LIVE);
live.stateVersion='20260820.f2.request09-consumed-route-observability-rootfix-pass-request10-auth-pending.current';
live.updatedAt=now;
live.phase='F2_REQUEST09_CONSUMED_ROUTE_OBSERVABILITY_ROOTFIX_PASS_REQUEST10_AUTH_PENDING';
live.f2SourceOnly={...(live.f2SourceOnly||{}),status:'CLOSED_PASS',gateId:GATE,candidateArtifactId:CANDIDATE,candidateSourceHead:SOURCE,candidateZipSha256:ZIP_SHA,candidateManifestSha256:MANIFEST_SHA,candidateManifestStatus:MANIFEST_STATUS,candidateFileCount:194,fullRehashPass:true,inicioFiniteRootfixPass:true,routerReadinessRootfixPass:true,sourceValidationRunId:32316010103,sourceEvidenceArtifactId:9388061716};
live.rootCauseState=live.rootCauseState||{};
live.rootCauseState.currentBlockingFact={code:'F2_REQUEST10_RUNTIME_FRESH_AUTHORIZATION_REQUIRED',status:'FRESH_AUTHORIZATION_REQUIRED',candidateArtifactId:CANDIDATE,candidateSourceHead:SOURCE,priorRequest:'REQUEST09_CONSUMED',priorRunId:REQUEST09_RUN};
live.rootCauseState.request09RouteObservability={classification:'PIPELINE_MECHANISM_FAILURE',code:'F2_BROWSER_ROUTE_WAIT_UNLABELED',status:'CLOSED_SOURCE_ONLY_PASS',observedRuntimeClassification:'locator.waitFor',observedError:'locator #host visibility wait timed out without route/view label',request09RunId:REQUEST09_RUN,request09JobId:REQUEST09_JOB,request09EvidenceArtifactId:REQUEST09_ARTIFACT,candidateArtifactId:CANDIDATE,candidateSourceHead:SOURCE,gatePass:true,candidateVerificationPass:true,identityReadOnlyPass:true,runtimeExecuted:true,browserExecuted:true,integrityBeforeAfterPass:true,zeroWrites:true,productCandidateFrozen:true,productMutationRequired:false,perRouteProductCause:'UNDETERMINED_UNTIL_FRESH_RUNTIME_WITH_STRUCTURED_ROUTE_EVIDENCE',dataAffected:false,sourcefixRunId:SOURCEFIX_RUN,sourcefixStatus:'F2_REQUEST09_ROUTE_OBSERVABILITY_ROOTFIX_SOURCE_APPLIED',preventiveControl:'Preserve strict visible-host acceptance while labeling view/route and capturing rendered-vs-visible, authStage, pre-auth and geometry.',request09ReplayAllowed:false};
live.authorization={...(live.authorization||{}),f2AuthorizationStatus:'FRESH_AUTHORIZATION_REQUIRED_REQUEST10_EXACT_ARTIFACT_9387820198',runtimeAuthorized:false,browserAuthorized:false,secretAccessAuthorized:false,firestoreReadAuthorized:false,request10Created:false,request10Authorized:false};
live.goLive={...(live.goLive||{}),status:'BLOCKED_F2_REQUEST10_FRESH_AUTHORIZATION_REQUIRED'};
live.stopRetry={...(live.stopRetry||{}),request09MayBeRerun:false,request09RequestReplayAllowed:false,request10MayBeCreatedWithoutFreshAuthorization:false};
live.nextActionExact={action:'OBTAIN_FRESH_AUTHORIZATION_REQUEST10_RUNTIME_BROWSER_READONLY',gateId:GATE,requestVersion:REQUEST_VERSION,candidateArtifactId:CANDIDATE,candidateSourceHead:SOURCE,status:'FRESH_AUTHORIZATION_REQUIRED',runtimeAuthorizationRequired:true,runtimeExecuted:false};
live.lanes={...(live.lanes||{}),A_frontend_UX:'FROZEN_CANDIDATE_9387820198_SOURCE_CLOSED_PASS',B_backend_security_gates:'REQUEST09_CONSUMED_ROUTE_OBSERVABILITY_ROOTFIX_PASS_REQUEST10_FRESH_AUTH_PENDING',C_real_data_migration:'UNTOUCHED_ZERO_CHANGES'};
live.f2Runtime09={requestVersion:REQUEST_VERSION,requestOrdinal:9,status:'CONSUMED_STOP_PIPELINE_MECHANISM_ROUTE_UNLABELED',requestCommit:'196c9efcb0bcbbfac5f74c839ba307601f8fe25b',runId:REQUEST09_RUN,jobId:REQUEST09_JOB,evidenceArtifactId:REQUEST09_ARTIFACT,candidateArtifactId:CANDIDATE,candidateSourceHead:SOURCE,gatePass:true,candidateVerificationPass:true,identityReadOnlyPass:true,browserExecuted:true,runtimeExecuted:true,integrityBeforeAfterPass:true,firestoreWrites:0,authWrites:0,membershipWrites:0,dataWrites:0,operationalWrites:0,deployExecuted:false,publicationExecuted:false,productionTouched:false,replayAllowed:false,rootCause:'PIPELINE_MECHANISM_FAILURE:F2_BROWSER_ROUTE_WAIT_UNLABELED',routeObservabilitySourcefixRunId:SOURCEFIX_RUN};
live.documentationControl={...(live.documentationControl||{}),currentCheckpoint:CHECKPOINT,transactionStatus:'F2_REQUEST09_CONSUMED_ROUTE_OBSERVABILITY_ROOTFIX_PASS_REQUEST10_AUTH_PENDING',latestAcademiaUpdate:ACADEMIA,latestRuntimeEvidence:DISCOVERY,latestSourcefixEvidence:SOURCEFIX};
writeJson(LIVE,live);

const index=readJson(INDEX);
index.updatedAt=now;
index.resumePointer=CHECKPOINT;
index.currentCheckpoint=CHECKPOINT;
index.latestRuntimeEvidence=DISCOVERY;
index.latestTerminalEvidence=DISCOVERY;
index.latestRequestConsumptionEvidence=DISCOVERY;
index.latestValidatorSourcefix=SOURCEFIX;
index.latestAcademiaUpdate=ACADEMIA;
index.operationalCurrent=index.operationalCurrent||{};
Object.assign(index.operationalCurrent,{currentPhase:'F2_REQUEST09_CONSUMED_ROUTE_OBSERVABILITY_ROOTFIX_PASS_REQUEST10_AUTHORIZATION_PENDING',currentBlocker:'Fresh explicit authorization is required for Request10 after Request09 was consumed by an unlabeled #host visibility wait. Candidate 9387820198 remains frozen; zero writes/deploy/production.',f2SourceOnlyStatus:'CLOSED_PASS',f2SourceOnlyGateId:GATE,successorCandidateArtifactId:CANDIDATE,successorSourceHead:SOURCE,successorZip:ZIP,successorZipSha256:ZIP_SHA,successorManifestSha256:MANIFEST_SHA,successorCandidateManifestStatus:MANIFEST_STATUS,successorFileCount:194,nextAuthorizationBoundary:`${REQUEST_VERSION}:REQUEST10:EXACT_ARTIFACT_${CANDIDATE}`,request09Created:true,request09Consumed:true,request09ReplayAllowed:false,request09RunId:REQUEST09_RUN,request09JobId:REQUEST09_JOB,request09EvidenceArtifactId:REQUEST09_ARTIFACT,request09GatePass:true,request09CandidateVerificationPass:true,request09IdentityReadOnlyPass:true,request09IntegrityBeforeAfterPass:true,request09RootCause:'PIPELINE_MECHANISM_FAILURE:F2_BROWSER_ROUTE_WAIT_UNLABELED',request09RouteObservabilitySourcefixRunId:SOURCEFIX_RUN,request09RouteObservabilitySourcefixPass:true,request10Created:false,request10Authorized:false});
index.f2Runtime09={requestVersion:REQUEST_VERSION,runId:REQUEST09_RUN,jobId:REQUEST09_JOB,evidenceArtifactId:REQUEST09_ARTIFACT,status:'CONSUMED_STOP_PIPELINE_MECHANISM_ROUTE_UNLABELED',candidateArtifactId:CANDIDATE,candidateSourceHead:SOURCE,integrityBeforeAfterPass:true,zeroWrites:true,replayAllowed:false,sourcefixRunId:SOURCEFIX_RUN,sourcefixPass:true};
writeJson(INDEX,index);

const runtime=readJson(RUNTIME);
runtime.status='F2_RUNTIME_PENDING_FRESH_AUTHORIZATION';
runtime.authorization={...(runtime.authorization||{}),requiredForExecution:true,activeRequest:false,request:'DYNAMIC:ORBIT360_REQUEST_FILE',allowedExecutions:0,consumed:false,authorizationFrozen:true,replayAllowed:false};
runtime.guards={...(runtime.guards||{}),candidateArtifactId:CANDIDATE,candidateZipSha256:ZIP_SHA,candidateManifestSha256:MANIFEST_SHA,candidateSourceHead:SOURCE,candidateManifestStatus:MANIFEST_STATUS,candidateFileCount:194,predecessorArtifactId:9385306424};
runtime.sourceOnlyPrerequisite={...(runtime.sourceOnlyPrerequisite||{}),status:'CLOSED_PASS',runId:32316010103,evidenceArtifactId:9388061716,candidateArtifactId:CANDIDATE,candidateSourceHead:SOURCE,fullRehashPass:true,inicioFiniteRootfixPass:true,routerReadinessRootfixPass:true};
runtime.lastExecution={request:'REQUEST09',requestCommit:'196c9efcb0bcbbfac5f74c839ba307601f8fe25b',runId:REQUEST09_RUN,jobId:REQUEST09_JOB,evidenceArtifactId:REQUEST09_ARTIFACT,consumed:true,replayAllowed:false,status:'STOP_PIPELINE_MECHANISM_ROUTE_UNLABELED',classification:'PIPELINE_MECHANISM_FAILURE',code:'F2_BROWSER_ROUTE_WAIT_UNLABELED',gatePass:true,candidateVerificationPass:true,identityReadOnlyPass:true,runtimeExecuted:true,browserExecuted:true,integrityBeforeAfterPass:true,firestoreWrites:0,authWrites:0,membershipWrites:0,dataWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,routeObservabilitySourcefixRunId:SOURCEFIX_RUN,routeObservabilitySourcefixPass:true,nextRequest:'REQUEST10_FRESH_AUTHORIZATION_REQUIRED'};
writeJson(RUNTIME,runtime);

const checkpoint=`# CHECKPOINT — F2 Request09 consumido · route observability rootfix PASS · Request10 autorización pendiente\n\nFecha: 2026-08-20\n\n## Estado canónico\n- F1: CLOSED_PASS.\n- F2 SOURCE: CLOSED_PASS sobre artifact **${CANDIDATE}**, source \`${SOURCE}\`.\n- Request09: consumido una sola vez; replay prohibido.\n- Request10: no creado, no autorizado.\n- Ruta inmediata a producción: **50%** hasta F2 runtime/browser terminal PASS.\n- PR #5: debe permanecer draft/open; sin main/merge/deploy/producción.\n\n## Request09\n- request commit: \`196c9efcb0bcbbfac5f74c839ba307601f8fe25b\`\n- run: \`${REQUEST09_RUN}\`\n- job: \`${REQUEST09_JOB}\`\n- evidence artifact: \`${REQUEST09_ARTIFACT}\`\n- gate canónico: PASS / GO\n- candidata exacta: PASS\n- identidad protegida read-only: PASS\n- integridad before/after: PASS, conteos y digests idénticos\n- writes Firestore/Auth/membership/data/operational: 0\n- deploy/publicación/producción: 0\n\n## Bloqueo diagnosticado\nLa aceptación browser se detuvo en un \`locator('#host').waitFor({state:'visible'})\` sin registrar vista/rol/ruta ni estado DOM. Como Request09 ya fue consumido, no se reejecutó. La causa del mecanismo queda clasificada como:\n\n\`PIPELINE_MECHANISM_FAILURE:F2_BROWSER_ROUTE_WAIT_UNLABELED\`\n\nEsto **no declara** todavía si la ruta concreta tenía un defecto funcional: Request09 perdió ese dato. La candidata permanece congelada y no se reconstruyó.\n\n## Rootfix source-only\nRun \`${SOURCEFIX_RUN}\`: PASS. El runner sigue exigiendo host visible, pero cualquier timeout posterior ahora distingue \`F2_ROUTE_NOT_RENDERED\` vs \`F2_ROUTE_NOT_VISIBLE\` e incluye vista/ruta, authStage, pre-auth y geometría. No se ejecutaron browser/runtime/secrets/Firestore ni se modificó producto.\n\n## Carriles\n- A: candidata ${CANDIDATE} congelada; SOURCE CLOSED_PASS.\n- B: Request09 consumido; observabilidad de ruta corregida; Request10 requiere autorización fresca.\n- C: datos A&S sin cambios.\n\n## Siguiente acción exacta\nAutorización humana fresca para:\n\n\`${REQUEST_VERSION} / REQUEST10 / EXACT_ARTIFACT_${CANDIDATE}\`\n\nNo reejecutar Request09. No crear Request10 sin autorización fresca.\n`;
fs.writeFileSync(path.join(ROOT,CHECKPOINT),checkpoint,'utf8');

const academia=`# Academia Orbit 360 — actualización F2 Request09 / observabilidad de ruta\n\nFecha: 2026-08-20\n\n## Qué debe enseñar este caso\n1. **Readiness de producto no equivale a aceptación visual completa.** Product App puede terminar \`started:true\` y aun así una ruta posterior de la matriz puede fallar su requisito visual.\n2. **Un error de herramienta sin contexto no debe convertirse automáticamente en defecto funcional.** Si Playwright solo informa \`#host no visible\` sin vista/ruta/DOM, el primer problema es de observabilidad del pipeline.\n3. **No se debilita el gate para hacerlo pasar.** El rootfix conserva \`state:'visible'\`; agrega evidencia estructurada para separar no-renderizado de no-visible.\n4. **Una autorización runtime de un solo uso se consume incluso cuando el resultado es fallo.** Request09 no se repite; cualquier nueva ejecución requiere Request10 y autorización fresca.\n5. **Integridad before/after es independiente del resultado visual.** Request09 probó cero writes y snapshots idénticos aunque la matriz browser no cerró PASS.\n6. **Clasificación correcta:** \`PIPELINE_MECHANISM_FAILURE:F2_BROWSER_ROUTE_WAIT_UNLABELED\` hasta que una ejecución fresca identifique la vista/ruta y permita decidir si existe \`FUNCTIONAL_DEFECT\`, \`VALIDATOR_STALE\` u otra causa.\n\n## Patrón reutilizable\nPara cualquier gate browser: etiquetar \`vista + rol + ruta\`; capturar existencia, contenido, display, visibility, dimensiones, authStage y estado pre-auth; preservar la condición de aceptación original; y evitar replay de una autorización consumida.\n\nClasificación Claude: **REPLICABLE_CLAUDE_INMEDIATO** para arquitectura de validadores/observabilidad. No incluye datos reales, secretos ni backend protegido.\n`;
fs.writeFileSync(path.join(ROOT,ACADEMIA),academia,'utf8');

writeJson(EVIDENCE,{schemaVersion:'orbit360-f2-request09-canonical-docsync-v1',ok:true,status:'F2_REQUEST09_CANONICAL_DOCSYNC_PASS',classification:'PASS',request09RunId:REQUEST09_RUN,request09JobId:REQUEST09_JOB,request09EvidenceArtifactId:REQUEST09_ARTIFACT,request09Consumed:true,request09ReplayAllowed:false,candidateArtifactId:CANDIDATE,candidateSourceHead:SOURCE,sourceClosedPass:true,integrityBeforeAfterPass:true,routeObservabilityRootCause:'PIPELINE_MECHANISM_FAILURE:F2_BROWSER_ROUTE_WAIT_UNLABELED',routeObservabilitySourcefixRunId:SOURCEFIX_RUN,routeObservabilitySourcefixPass:true,currentBlockingFact:'F2_REQUEST10_RUNTIME_FRESH_AUTHORIZATION_REQUIRED',request10Created:false,request10Authorized:false,liveStateSynchronized:true,currentIndexSynchronized:true,runtimeLifecycleSynchronized:true,checkpointSynchronized:true,academiaSynchronized:true,productMutation:false,dataMutation:false,browserExecuted:false,runtimeExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,membershipWrites:0,dataWrites:0,operationalWrites:0,deployExecuted:false,publicationExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false,generatedAt:now});
console.log(JSON.stringify({ok:true,status:'F2_REQUEST09_CANONICAL_DOCSYNC_READY',files:[LIVE,INDEX,RUNTIME,CHECKPOINT,ACADEMIA,EVIDENCE]},null,2));
