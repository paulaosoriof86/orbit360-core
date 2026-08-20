#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const p=(...x)=>path.join(ROOT,...x);
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const writeJson=(file,obj)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(obj,null,2)+'\n');};
const now='2026-08-20T00:54:00.000Z';
const candidate={artifactId:9387820198,sourceHead:'fc46bd85783d8b4d524cbeb0fee54ee9a2c774af',zipSha256:'58fcbe6e8d7d3a425509c87f229b1cb12dd35a99133d46c757544cc75c55aacc',manifestSha256:'b18422fdf82830d28e82f657f83b4fd5c10ea134a4735263fa2587a2ddd808cb',fileCount:194};
const run={request:'REQUEST10',requestCommit:'c3482f65b3f8deb911d756fb09383497e59cb702',runId:32318415706,jobId:96275510663,evidenceArtifactId:9388976113,evidenceArtifactDigest:'sha256:290efe30949aed9bb9d61c8cfdb659ec796dd265fa0dc27361e79ac27e47e7da'};
const rootCause='VALIDATOR_STALE:F2_ROUTE_VISIBLE_WAIT_CONTRADICTS_CAPTURED_DOM_STATE';
const sourcefixCommit='b3b06778d45edb15fc5bdddcd8f5cd504b57c7f0';
const checkpoint='orbit360-platform/docs/CHECKPOINT-F2-REQUEST10-CONSUMED-VISIBILITY-VALIDATOR-STALE-ROOTFIX-PASS-REQUEST11-AUTH-PENDING-20260820.md';
const academia='orbit360-platform/docs/ACADEMIA-ACTUALIZACION-F2-REQUEST10-VISIBILITY-VALIDATOR-STALE-20260820.md';
const closure='orbit360-platform/runtime-gate-crm-v20260716/f2-request10-consumed-validator-stale-rootfix-closure-v20260820.json';
const sourcefixEvidence='orbit360-platform/runtime-gate-crm-v20260716/f2-request10-route-visibility-validator-sourcefix-v20260820.json';
const boundary='F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V1:REQUEST11:EXACT_ARTIFACT_9387820198';

const livePath=p('orbit360-platform/docs/orbit360-live-state-v1.json');
const indexPath=p('orbit360-platform/docs/ORBIT360-CURRENT-DOCUMENTATION-INDEX-v1.json');
const lifecyclePath=p('tools/orbit360-validator-lifecycle-contract-f2-productive-acceptance-runtime-v20260819.json');
const live=readJson(livePath), index=readJson(indexPath), lifecycle=readJson(lifecyclePath);

const request10State={
  request:'REQUEST10',requestCommit:run.requestCommit,runId:run.runId,jobId:run.jobId,evidenceArtifactId:run.evidenceArtifactId,
  consumed:true,replayAllowed:false,status:'CONSUMED_STOP_VALIDATOR_STALE_ROUTE_VISIBILITY',classification:'VALIDATOR_STALE',code:'F2_ROUTE_VISIBLE_WAIT_CONTRADICTS_CAPTURED_DOM_STATE',
  gatePass:true,candidateVerificationPass:true,identityReadOnlyPass:true,runtimeExecuted:true,browserExecuted:true,integrityBeforeAfterPass:true,
  exactObservedLocation:'desktopDirection:polizas',observedHost:{exists:true,childElementCount:1,textLength:18141,display:'block',visibility:'visible',width:1192,height:7866,bodyPreAuth:false,loginHidden:true,hash:'#/polizas'},
  pageErrors:0,consoleErrors:0,writeSignals:0,firestoreWrites:0,authWrites:0,membershipWrites:0,dataWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,
  sourcefix:{status:'CLOSED_SOURCE_ONLY_PASS',commit:sourcefixCommit,evidence:sourcefixEvidence,productMutation:false,candidateRebuild:false,dataMutation:false},
  nextRequest:'REQUEST11_FRESH_AUTHORIZATION_REQUIRED'
};

live.stateVersion='20260820.f2.request10-consumed-visibility-validator-stale-rootfix-pass-request11-auth-pending.current';
live.updatedAt=now;
live.phase='F2_REQUEST10_CONSUMED_VISIBILITY_VALIDATOR_STALE_ROOTFIX_PASS_REQUEST11_AUTH_PENDING';
live.currentCheckpoint=checkpoint;
live.nextAuthorizationBoundary=boundary;
live.f2Runtime10=request10State;
live.rootCauseState=live.rootCauseState||{};
live.rootCauseState.f2Runtime10VisibilityValidatorStale={classification:'VALIDATOR_STALE',code:'F2_ROUTE_VISIBLE_WAIT_CONTRADICTS_CAPTURED_DOM_STATE',status:'CLOSED_SOURCE_ONLY_ROOTFIX_PASS',request10RunId:run.runId,evidenceArtifactId:run.evidenceArtifactId,sourcefixCommit,productAffected:false,dataAffected:false,integrityBeforeAfterPass:true,preventiveControl:'EXPLICIT_ROUTE_READINESS_CONTRACT_PLUS_CAPTURED_STATE_CONTRADICTION_GUARD'};
live.rootCauseState.currentBlockingFact={code:'F2_REQUEST11_RUNTIME_FRESH_AUTHORIZATION_REQUIRED',status:'FRESH_AUTHORIZATION_REQUIRED',candidateArtifactId:candidate.artifactId,candidateSourceHead:candidate.sourceHead,priorRequest:'REQUEST10_CONSUMED',priorRunId:run.runId};
live.f2SourceOnly=live.f2SourceOnly||{};
live.f2SourceOnly.status='CLOSED_PASS'; live.f2SourceOnly.candidateArtifactId=candidate.artifactId; live.f2SourceOnly.candidateSourceHead=candidate.sourceHead;
live.f2SourceOnly.runtimeWorkflowPrepared=true; live.f2SourceOnly.requestCreated=false; live.f2SourceOnly.runtimeAuthorized=false; live.f2SourceOnly.browserAuthorized=false;

index.updatedAt=now;
index.operationalCurrent=index.operationalCurrent||{};
Object.assign(index.operationalCurrent,{
  resumePointer:checkpoint,currentCheckpoint:checkpoint,currentPhase:'F2_REQUEST10_CONSUMED_VISIBILITY_VALIDATOR_STALE_ROOTFIX_PASS_REQUEST11_AUTHORIZATION_PENDING',
  currentPhaseInternalPercent:0,currentPhaseInternalMethod:'request10_consumed_visibility_validator_stale_rootfix_pass_request11_fresh_authorization_pending',
  goLiveRoutePercentClosed:50,integratedProgramPercentClosed:25,
  currentBlocker:'Fresh explicit authorization is required for Request11. Request10 was consumed by a validator-stale visibility contradiction at desktop Dirección / pólizas; candidate 9387820198 remains frozen and unchanged.',
  f2SourceOnlyStatus:'CLOSED_PASS',f2SourceOnlyGateId:'f2-productive-acceptance-exact-successor-v20260818',f2SourceOnlyContractVersion:'2.1.0',
  f2RuntimeRequestCreated:false,f2RuntimeAuthorizationGranted:false,
  successorCandidateArtifactId:candidate.artifactId,successorSourceHead:candidate.sourceHead,successorZipSha256:candidate.zipSha256,successorManifestSha256:candidate.manifestSha256,successorFileCount:candidate.fileCount,successorPublished:false,
  latestRuntimeEvidence:closure,latestTerminalEvidence:closure,latestRequestConsumptionEvidence:closure,latestValidatorSourcefixEvidence:sourcefixEvidence,latestAcademiaUpdate:academia,
  nextAuthorizationBoundary:boundary,
  request10Created:true,request10AuthorizationGranted:true,request10Consumed:true,request10ReplayAllowed:false,request10RunId:run.runId,request10JobId:run.jobId,request10EvidenceArtifactId:run.evidenceArtifactId,
  request10Status:'CONSUMED_STOP_VALIDATOR_STALE_ROUTE_VISIBILITY',request10RootCause:rootCause,request10IntegrityBeforeAfterPass:true,request10GatePass:true,request10CandidateVerificationPass:true,request10IdentityReadOnlyPass:true,
  request10SourcefixCommit:sourcefixCommit,request10SourcefixStatus:'CLOSED_SOURCE_ONLY_PASS',request11Created:false,request11Authorized:false
});
index.resumePointer=checkpoint;
index.currentCheckpoint=checkpoint;
index.latestRuntimeEvidence=closure;
index.latestTerminalEvidence=closure;
index.latestRequestConsumptionEvidence=closure;
index.latestValidatorSourcefix=sourcefixEvidence;
index.latestAcademiaUpdate=academia;
index.f2Runtime10=request10State;
index.f2SuccessorRebind=index.f2SuccessorRebind||{};
index.f2SuccessorRebind.status='CLOSED_PASS'; index.f2SuccessorRebind.contractVersion='2.1.0'; index.f2SuccessorRebind.candidateArtifactId=candidate.artifactId; index.f2SuccessorRebind.sourceLifecycle='tools/orbit360-validator-lifecycle-contract-f2-productive-acceptance-source-v20260819.json'; index.f2SuccessorRebind.runtimeLifecycle='tools/orbit360-validator-lifecycle-contract-f2-productive-acceptance-runtime-v20260819.json'; index.f2SuccessorRebind.runtimeAuthorized=false; index.f2SuccessorRebind.productionTouched=false;
index.f2SuccessorSourceClosure=index.f2SuccessorSourceClosure||{};
index.f2SuccessorSourceClosure.status='CLOSED_PASS'; index.f2SuccessorSourceClosure.gateId='f2-productive-acceptance-exact-successor-v20260818'; index.f2SuccessorSourceClosure.candidateArtifactId=candidate.artifactId; index.f2SuccessorSourceClosure.sourceValidationRunId=32316010103; index.f2SuccessorSourceClosure.evidenceArtifactId=9388061716; index.f2SuccessorSourceClosure.nextBoundary='REQUEST11_FRESH_AUTHORIZATION_REQUIRED';
if(Array.isArray(index.frozenPlanPhases)){const f2=index.frozenPlanPhases.find(x=>x&&x.id==='F2');if(f2){f2.status='IN_PROGRESS_REQUEST10_CONSUMED_VALIDATOR_STALE_ROOTFIX_PASS_REQUEST11_AUTH_PENDING';f2.internalPercent=0;f2.internalMethod='request10_consumed_visibility_validator_stale_rootfix_pass_request11_fresh_authorization_pending';}}
index.requiredResumeProtocol=[
  'Read ORBIT360-CURRENT-DOCUMENTATION-INDEX-v1.json and orbit360-live-state-v1.json first',
  'Confirm actual HEAD and PR #5 draft/open on ays/backend-tenant-lab-v99-20260703',
  'Read the current Request10 checkpoint and validator sourcefix evidence',
  'Treat Request10 as consumed and non-replayable',
  'Keep candidate 9387820198 frozen; do not rebuild or modify product to resolve the Request10 visibility verdict',
  'Require fresh explicit authorization for F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V1 / REQUEST11 / EXACT_ARTIFACT_9387820198',
  'Do not deploy, publish, merge, reimport, reset passwords or write product data without their own explicit authorization'
];

lifecycle.f2ValidatorRevision='f2-productive-acceptance-request10-route-readiness-validator-rootfix-v1-20260820';
lifecycle.status='F2_RUNTIME_PENDING_FRESH_AUTHORIZATION';
lifecycle.authorization={requiredForExecution:true,activeRequest:false,request:'DYNAMIC:ORBIT360_REQUEST_FILE',allowedExecutions:0,consumed:false,authorizationFrozen:true,replayAllowed:false};
lifecycle.lastExecution=request10State;
lifecycle.routeReadinessValidatorRootfix={classification:'VALIDATOR_STALE',code:'F2_ROUTE_VISIBLE_WAIT_CONTRADICTS_CAPTURED_DOM_STATE',status:'CLOSED_SOURCE_ONLY_PASS',commit:sourcefixCommit,evidence:sourcefixEvidence,explicitRouteReadiness:true,contradictoryCapturedStateGuard:true,crossTenantPassPreservation:true,localWriteGuardPreservation:true,productMutation:false,candidateRebuild:false};

const closureEvidence={schemaVersion:'orbit360-f2-request10-consumed-validator-stale-rootfix-closure-v1',ok:true,status:'F2_REQUEST10_CONSUMED_VALIDATOR_STALE_ROOTFIX_CLOSED_SOURCE_ONLY_PASS',classification:'VALIDATOR_STALE',rootCause,request:run.request,requestCommit:run.requestCommit,runId:run.runId,jobId:run.jobId,evidenceArtifactId:run.evidenceArtifactId,evidenceArtifactDigest:run.evidenceArtifactDigest,candidateArtifactId:candidate.artifactId,candidateSourceHead:candidate.sourceHead,gatePass:true,candidateVerificationPass:true,identityReadOnlyPass:true,runtimeExecuted:true,browserExecuted:true,observedLocation:'desktopDirection:polizas',capturedDom:{hostExists:true,childElementCount:1,textLength:18141,hostDisplay:'block',hostVisibility:'visible',hostWidth:1192,hostHeight:7866,bodyPreAuth:false,loginHidden:true,hash:'#/polizas'},integrityBeforeAfterPass:true,countsIdentical:true,digestsIdentical:true,pageErrors:0,consoleErrors:0,writeSignals:0,crossTenantCheckReachedAndPassedBeforeRoleMatrix:true,localWriteGuardReachedAndPassedBeforeRoleMatrix:true,sourcefixCommit,sourcefixEvidence,productMutation:false,candidateRebuild:false,dataMutation:false,firestoreWrites:0,authWrites:0,membershipWrites:0,dataWrites:0,operationalWrites:0,deployExecuted:false,publicationExecuted:false,productionTouched:false,request10Consumed:true,request10ReplayAllowed:false,request11Created:false,request11Authorized:false,nextAuthorizationBoundary:boundary,containsPII:false,containsSecrets:false,generatedAt:now};
writeJson(p(closure),closureEvidence);

const checkpointText=`# CHECKPOINT — F2 Request10 consumido · VALIDATOR_STALE cerrado source-only · Request11 pendiente\n\nFecha canónica: 2026-08-20 UTC.\n\n## Estado\n- Rama obligatoria: \`ays/backend-tenant-lab-v99-20260703\`.\n- PR #5: draft/open, sin merge.\n- F1: CLOSED_PASS.\n- F2 SOURCE: CLOSED_PASS.\n- Candidata congelada: artifact \`9387820198\`, source \`fc46bd85783d8b4d524cbeb0fee54ee9a2c774af\`, 194 archivos.\n- Ruta a producción: 50%. Programa integral: 25%.\n\n## Request10 — consumido\n- Request commit: \`c3482f65b3f8deb911d756fb09383497e59cb702\`.\n- Run: \`32318415706\`. Job: \`96275510663\`.\n- Evidence artifact: \`9388976113\`.\n- Gate canónico, candidata exacta, provider, identidad protegida e integridad before/after: PASS.\n- Firestore/Auth/membership/data/operational writes: 0. Deploy/publicación/producción: 0.\n- Replay/rerun de Request10: prohibido.\n\n## Causa raíz\nEl runner reportó \`FUNCTIONAL_DEFECT:F2_ROUTE_NOT_VISIBLE:desktopDirection:polizas\`, pero su propia captura mostró \`#host\` renderizado con 1 hijo, 18,141 caracteres, \`display:block\`, \`visibility:visible\`, 1192×7866, login oculto y hash \`#/polizas\`. Por metodología, el veredicto funcional se reclasifica a:\n\n\`VALIDATOR_STALE:F2_ROUTE_VISIBLE_WAIT_CONTRADICTS_CAPTURED_DOM_STATE\`\n\nNo se modificó Pólizas ni la candidata. El rootfix source-only quedó persistido en \`${sourcefixCommit}\`: readiness explícito de ruta/DOM, trazas y preservación de cross-tenant/write-guard ya aprobados.\n\n## Carriles\n- A producto/UX: FROZEN_CANDIDATE_9387820198_SOURCE_CLOSED_PASS.\n- B backend/security/gates: REQUEST10_CONSUMED_VALIDATOR_STALE_ROOTFIX_PASS_REQUEST11_FRESH_AUTH_PENDING.\n- C datos A&S: UNTOUCHED_ZERO_CHANGES.\n\n## Siguiente frontera exacta\n\`F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V1 / REQUEST11 / EXACT_ARTIFACT_9387820198\`\n\nRequest11 no existe y no está autorizado. No crear ni ejecutar sin autorización humana fresca.\n`;
fs.writeFileSync(p(checkpoint),checkpointText);

const academiaText=`# Academia — Actualización F2 Request10 · diferencia entre defecto funcional y VALIDATOR_STALE\n\nFecha: 2026-08-20.\n\n## Aprendizaje obligatorio\nRequest10 enseña por qué Orbit 360 no debe convertir automáticamente un timeout del validador en defecto funcional. El runner informó que Pólizas no estaba visible, pero la evidencia capturada en ese mismo instante mostraba contenido renderizado, dimensiones no nulas y visibilidad CSS activa. El producto quedó congelado y se corrigió el validador.\n\n### Patrón reusable\n1. Ejecutar el gate canónico antes de browser/secrets.\n2. Si una prueba falla, conservar vista, rol, ruta, hash, estado DOM, authStage y geometría.\n3. Contrastar el veredicto con la evidencia capturada.\n4. Si el criterio del validador contradice esa evidencia, clasificar \`VALIDATOR_STALE\` y congelar producto.\n5. No perder checks ya aprobados: cross-tenant y write-guard deben conservarse aunque falle una etapa posterior.\n6. Una autorización runtime es de un solo uso; Request10 quedó consumido y Request11 requiere autorización fresca.\n\n### Roles y seguridad\nLa prueba seguía la matriz Dirección desktop / Operativo tablet / Asesor móvil. El bloqueo ocurrió en Dirección → Pólizas. Antes de esa matriz ya habían pasado los controles de aislamiento cross-tenant y bloqueo local de escrituras. La integridad before/after quedó idéntica y no hubo writes.\n\n### Estado de enseñanza\n- Defecto funcional demostrado en Pólizas: no.\n- Validador obsoleto/inconsistente: sí, corregido source-only.\n- Candidata reconstruida: no.\n- Datos A&S modificados: no.\n- Próxima frontera: Request11 sobre la misma candidata exacta \`9387820198\`, únicamente con autorización fresca.\n`;
fs.writeFileSync(p(academia),academiaText);

writeJson(livePath,live); writeJson(indexPath,index); writeJson(lifecyclePath,lifecycle);

const checks={
  livePhase:live.phase==='F2_REQUEST10_CONSUMED_VISIBILITY_VALIDATOR_STALE_ROOTFIX_PASS_REQUEST11_AUTH_PENDING',
  liveBlocker:live.rootCauseState?.currentBlockingFact?.code==='F2_REQUEST11_RUNTIME_FRESH_AUTHORIZATION_REQUIRED',
  liveCandidate:live.rootCauseState?.currentBlockingFact?.candidateArtifactId===candidate.artifactId,
  liveRequest10:live.f2Runtime10?.runId===run.runId&&live.f2Runtime10?.consumed===true&&live.f2Runtime10?.replayAllowed===false,
  indexCheckpoint:index.operationalCurrent?.currentCheckpoint===checkpoint&&index.currentCheckpoint===checkpoint,
  indexRuntime:index.operationalCurrent?.latestRuntimeEvidence===closure&&index.latestRuntimeEvidence===closure,
  indexConsumption:index.operationalCurrent?.latestRequestConsumptionEvidence===closure&&index.latestRequestConsumptionEvidence===closure,
  indexSourcefix:index.operationalCurrent?.latestValidatorSourcefixEvidence===sourcefixEvidence&&index.latestValidatorSourcefix===sourcefixEvidence,
  indexCandidate:index.operationalCurrent?.successorCandidateArtifactId===candidate.artifactId&&index.f2SuccessorRebind?.candidateArtifactId===candidate.artifactId,
  indexBoundary:index.operationalCurrent?.nextAuthorizationBoundary===boundary&&index.f2SuccessorSourceClosure?.nextBoundary==='REQUEST11_FRESH_AUTHORIZATION_REQUIRED',
  indexRequest10:index.operationalCurrent?.request10Consumed===true&&index.operationalCurrent?.request10ReplayAllowed===false,
  indexRequest11:index.operationalCurrent?.request11Created===false&&index.operationalCurrent?.request11Authorized===false,
  lifecyclePending:lifecycle.status==='F2_RUNTIME_PENDING_FRESH_AUTHORIZATION'&&lifecycle.authorization?.allowedExecutions===0,
  lifecycleRequest10:lifecycle.lastExecution?.request==='REQUEST10'&&lifecycle.lastExecution?.runId===run.runId&&lifecycle.lastExecution?.classification==='VALIDATOR_STALE',
  lifecycleRootfix:lifecycle.routeReadinessValidatorRootfix?.status==='CLOSED_SOURCE_ONLY_PASS'&&lifecycle.routeReadinessValidatorRootfix?.commit===sourcefixCommit,
  closurePass:closureEvidence.ok===true&&closureEvidence.request10Consumed===true&&closureEvidence.integrityBeforeAfterPass===true,
  docsExist:fs.existsSync(p(checkpoint))&&fs.existsSync(p(academia))
};
if(!Object.values(checks).every(Boolean)){console.error(JSON.stringify({ok:false,checks},null,2));process.exit(41);}
console.log(JSON.stringify({ok:true,status:'F2_REQUEST10_CANONICAL_DOCSYNC_READY',checks},null,2));
