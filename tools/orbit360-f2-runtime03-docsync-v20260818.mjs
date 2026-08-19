#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const LIVE_REL='orbit360-platform/docs/orbit360-live-state-v1.json';
const INDEX_REL='orbit360-platform/docs/ORBIT360-CURRENT-DOCUMENTATION-INDEX-v1.json';
const CHECKPOINT_REL='orbit360-platform/docs/CHECKPOINT-F2-RUNTIME03-LEGAL-READINESS-VALIDATOR-STALE-ROOTFIX-PASS-20260818.md';
const STOP_REL='orbit360-platform/runtime-gate-crm-v20260716/f2-runtime03-legal-readiness-validator-stale-stop-v20260818.json';
const ROOTFIX_REL='orbit360-platform/runtime-gate-crm-v20260716/f2-legal-readiness-rootfix-source-only-v20260818.json';
const SELFTEST_REL='orbit360-platform/runtime-gate-crm-v20260716/f2-legal-readiness-phase-aware-selftest-v20260818.json';
const REQUEST_REL='.github/orbit360-requests/f2-productive-acceptance-runtime-browser-readonly-runbound-20260818-03.json';
const POSTSYNC_REL='orbit360-platform/runtime-gate-crm-v20260716/f2-runtime03-postsync-source-only-v20260818.json';
const GATE='f2-productive-acceptance-exact-successor-v20260818';
const REQUEST_VERSION='F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V1';
const ARTIFACT=9345207863;
const RUNTIME_RUN=32207049146;
const ROOTFIX_RUN=32207309204;
const POSTSYNC_RUN=Number(process.env.ORBIT360_DOCSYNC_POSTSYNC_RUN_ID||0);
const TRIGGER_SHA=String(process.env.ORBIT360_DOCSYNC_TRIGGER_SHA||'').trim();
const now=new Date().toISOString();

const readJson=rel=>JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8').replace(/^\uFEFF/,''));
const writeJson=(rel,obj)=>fs.writeFileSync(path.join(ROOT,rel),JSON.stringify(obj,null,2)+'\n','utf8');
const need=(ok,code)=>{if(!ok)throw new Error(code);};

for(const rel of [LIVE_REL,INDEX_REL,STOP_REL,ROOTFIX_REL,SELFTEST_REL,REQUEST_REL]) need(fs.existsSync(path.join(ROOT,rel)),`DOCSYNC_OWNER_MISSING:${rel}`);
need(POSTSYNC_RUN>0,'DOCSYNC_POSTSYNC_RUN_ID_REQUIRED');
need(TRIGGER_SHA.length===40,'DOCSYNC_TRIGGER_SHA_REQUIRED');

const live=readJson(LIVE_REL),index=readJson(INDEX_REL),stop=readJson(STOP_REL),rootfix=readJson(ROOTFIX_REL),selftest=readJson(SELFTEST_REL),request=readJson(REQUEST_REL);
need(stop.classification==='VALIDATOR_STALE'&&stop.runtimeRunId===RUNTIME_RUN&&stop.rootCauseCode==='BLOCKING_GATE_HARD_TIMEOUT_INCLUDED_SUCCESSFUL_DETACH_PHASE','DOCSYNC_RUNTIME03_STOP_EVIDENCE_INVALID');
need(rootfix.ok===true&&rootfix.legalReadinessRootfixSourceRunId===String(ROOTFIX_RUN)&&rootfix.request03Replayed===false,'DOCSYNC_LEGAL_ROOTFIX_EVIDENCE_INVALID');
need(selftest.ok===true&&selftest.status==='F2_LEGAL_READINESS_PHASE_AWARE_SELFTEST_PASS'&&selftest.legacyFailureShapeReproduced?.accepted===1&&selftest.legacyFailureShapeReproduced?.remaining===0&&selftest.phaseAwareResult?.ok===true,'DOCSYNC_LEGAL_SELFTEST_INVALID');
need(request.status==='CONSUMED_STOP_RETRY'&&request.allowedExecutions===0&&request.consumed===true&&request.authorizationFrozen===true&&request.replayAllowed===false&&request.runtimeRunId===RUNTIME_RUN,'DOCSYNC_REQUEST03_NOT_FROZEN');

live.stateVersion='20260818.f2-runtime03-consumed.legal-readiness-validator-stale-rootfix-pass.current';
live.updatedAt=now;
live.phase='F2_SOURCE_ONLY_PASS_RUNTIME_AUTHORIZATION_PENDING';
live.f2SourceOnly={...(live.f2SourceOnly||{}),canonicalRouterVersion:'v10.5-f2-stable-boundary-contract',legalReadinessValidatorRootfix:{classification:'VALIDATOR_STALE',code:'BLOCKING_GATE_HARD_TIMEOUT_INCLUDED_SUCCESSFUL_DETACH_PHASE',status:'CLOSED_SOURCE_ONLY_PASS',runId:ROOTFIX_RUN,selftest:SELFTEST_REL,evidence:ROOTFIX_REL,productAffected:false}};
live.rootCauseState={...(live.rootCauseState||{}),f2Runtime03LegalReadinessValidatorStale:{classification:'VALIDATOR_STALE',code:'BLOCKING_GATE_HARD_TIMEOUT_INCLUDED_SUCCESSFUL_DETACH_PHASE',status:'CLOSED_SOURCE_ONLY_ROOTFIX_PASS_RUN_32207309204',observedRuntimeClassification:'FUNCTIONAL_DEFECT',reclassifiedAfterRootCause:true,productAffected:false,observedAccepted:1,observedRemaining:0,integrityBeforeAfterPass:true,preventiveControl:'PHASE_AWARE_GATE_READINESS_PLUS_POST_DOCSYNC_CANONICAL_SOURCE_GATE'},currentBlockingFact:{code:'F2_RUNTIME03_CONSUMED_LEGAL_READINESS_ROOTFIX_PASS_POSTSYNC_GATE_PASS_FRESH_AUTHORIZATION_REQUIRED',status:'F2_RUNTIME_BROWSER_READONLY_REQUEST04_NOT_AUTHORIZED'}};
live.documentationControl={...(live.documentationControl||{}),currentCheckpoint:CHECKPOINT_REL,transactionStatus:'F2_RUNTIME03_CONSUMED_VALIDATOR_STALE_ROOTFIX_POSTSYNC_SOURCE_PASS_FRESH_AUTH_PENDING'};
if(live.frozenPlan){
  live.frozenPlan.currentPhase='F2';
  live.frozenPlan.currentPhaseInternalPercent=0;
  live.frozenPlan.currentPhaseInternalMethod='F2_runtime03_reached_browser_legal_readiness_validator_stale_rootfix_pass_runtime_acceptance_incomplete';
  live.frozenPlan.currentPhaseSubphases={...(live.frozenPlan.currentPhaseSubphases||{}),F2_runtime_browser_readonly_acceptance:'PENDING_FRESH_EXPLICIT_AUTHORIZATION_REQUEST04',F2_runtime03_preflight_and_artifact_identity_integrity:'PASS_THROUGH_LEGAL_STAGE_RUN_32207049146',F2_runtime03_legal_readiness_stop:'CONSUMED_VALIDATOR_STALE_RUN_32207049146',F2_runtime03_legal_readiness_rootfix:'CLOSED_SOURCE_ONLY_PASS_RUN_32207309204',F2_runtime03_postsync_source_gate:`CLOSED_SOURCE_ONLY_PASS_RUN_${POSTSYNC_RUN}`};
}
live.lanes={...(live.lanes||{}),A_frontend_UX:'FROZEN_NO_CHANGES',B_backend_security_gates:'F2_RUNTIME03_LEGAL_READINESS_VALIDATOR_STALE_ROOTFIX_POSTSYNC_SOURCE_PASS_FRESH_AUTHORIZATION_PENDING',C_real_data_migration:'UNTOUCHED_ZERO_CHANGES'};
live.writes={...(live.writes||{}),firestore:0,auth:0,operational:0};
live.authorization={...(live.authorization||{}),browserAuthorizedNow:false,runtimeAuthorizedNow:false,publicationAuthorizedNow:false,deployAuthorizedNow:false,authChangesAuthorized:false,membershipChangesAuthorized:false,dataChangesAuthorized:false,mainMergeAuthorized:false,f2AuthorizationStatus:'RUNTIME03_CONSUMED_LEGAL_READINESS_VALIDATOR_STALE_ROOTFIX_PASS_FRESH_AUTH_REQUIRED'};
live.goLive={...(live.goLive||{}),status:'F2_RUNTIME03_LEGAL_READINESS_ROOTFIX_POSTSYNC_SOURCE_PASS_FRESH_AUTHORIZATION_PENDING',successorPublished:false,productionOperationalDeclared:false,sensitiveWritesRemainRestricted:true};
live.stopRetry={...(live.stopRetry||{}),f2Runtime03MayBeRerun:false,f2Runtime03RequestReplayAllowed:false,f2LegalReadinessRootfixSourceMayBeRerun:false};
live.nextActionExact={stage:'F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_REQUEST04_AUTHORIZATION_BOUNDARY',gateId:GATE,requestVersion:REQUEST_VERSION,requestOrdinal:4,candidateArtifactId:ARTIFACT,stableBoundaryRootfixSourcePass:true,legalReadinessRootfixSourcePass:true,postSyncSourceGatePass:true,postSyncSourceGateRunId:POSTSYNC_RUN,authorizationRequired:true,authorizationGranted:false,requestCreated:false,allows:['secret_access_after_canonical_GO','firestore_read','resolve_existing_identity','ephemeral_custom_token','runtime_loopback','browser_Direccion_desktop_Operativo_tablet_Asesor_mobile','read_only_integrity_before_after'],forbids:['firestore_writes','auth_writes','membership_writes','data_writes','password_reset','package_rebuild','deploy','publication','production_mutation','main_merge']};
live.resumeProtocol=['Read ORBIT360-CURRENT-DOCUMENTATION-INDEX-v1.json','Read this live-state','Confirm actual HEAD and PR #5','Read Runtime03 legal-readiness validator-stale evidence and phase-aware rootfix evidence','Do not rerun Request01/run 32205144735, Request02/run 32206449703 or Request03/run 32207049146','Do not repeat F1.4/F1.4B/F1.4C/F1.4D','Do not rederive F2 source contract','Treat Runtime03 observed FUNCTIONAL_DEFECT classification as historical pre-root-cause classification; canonical classification is VALIDATOR_STALE','Require canonical source-only PASS after this documentation sync before any fresh runtime request','Do not create Request04 without fresh explicit authorization','Bind Request04 only to exact artifact 9345207863'];
live.f2Runtime03={status:'CONSUMED_STOP_VALIDATOR_STALE',requestPath:REQUEST_REL,requestCommit:'809228b1e8d65282f553881b0e2b4dd5e1974e2a',runId:RUNTIME_RUN,runAttempt:1,terminalArtifactId:9349486089,candidateArtifactId:ARTIFACT,canonicalGateGo:true,candidateArtifactVerified:true,identityReadOnlyPass:true,integrityBeforePass:true,browserExecuted:true,runtimeExecuted:true,browserAcceptanceCompleted:false,roleMatrixCompleted:false,crossTenantCheckReached:false,serviceWorkerCheckReached:false,observedRuntimeClassification:'FUNCTIONAL_DEFECT',canonicalClassification:'VALIDATOR_STALE',rootCauseCode:'BLOCKING_GATE_HARD_TIMEOUT_INCLUDED_SUCCESSFUL_DETACH_PHASE',observedLegalGate:{sawGate:true,accepted:1,remaining:0,quietWindowSatisfied:false,timeout:true,elapsedMs:16045},integrityAfterPass:true,integrityBeforeAfterPass:true,countsIdentical:true,digestsIdentical:true,firestoreWrites:0,authWrites:0,membershipWrites:0,dataWrites:0,operationalWrites:0,packageRebuilt:false,deployExecuted:false,publicationExecuted:false,productionTouched:false,requestConsumed:true,allowedExecutions:0,replayAllowed:false,rootfix:{status:'CLOSED_SOURCE_ONLY_PASS',runId:ROOTFIX_RUN,selftest:SELFTEST_REL,evidence:ROOTFIX_REL},postSyncSourceGate:{status:'CLOSED_SOURCE_ONLY_PASS',runId:POSTSYNC_RUN,evidence:POSTSYNC_REL}};

const op=index.operationalCurrent||(index.operationalCurrent={});
index.updatedAt=now;
op.resumePointer=CHECKPOINT_REL;
op.latestRuntimeEvidence=STOP_REL;
op.latestTerminalEvidence=STOP_REL;
op.latestPreflightEvidence=POSTSYNC_REL;
op.latestRequestConsumptionEvidence=STOP_REL;
op.currentCheckpoint=CHECKPOINT_REL;
op.currentPhase='F2_SOURCE_ONLY_PASS_RUNTIME_AUTHORIZATION_PENDING';
op.currentPhaseInternalPercent=0;
op.currentPhaseInternalMethod='runtime03_reached_browser_legal_readiness_validator_stale_rootfix_postsync_pass_runtime_acceptance_incomplete';
op.goLiveRoutePercentClosed=50;
op.integratedProgramPercentClosed=25;
op.currentBlocker='Runtime03 reached browser but stopped at stale legal-readiness helper; phase-aware rootfix and post-docsync canonical source gate PASS; fresh Request04 authorization required';
op.f2RuntimeRequestCreated=false;
op.f2RuntimeAuthorizationGranted=false;
op.nextAuthorizationBoundary='F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V1 / REQUEST04 / EXACT_ARTIFACT_9345207863 / NOT_GRANTED';
op.f2Runtime03RunId=String(RUNTIME_RUN);
op.f2Runtime03RequestCommit='809228b1e8d65282f553881b0e2b4dd5e1974e2a';
op.f2Runtime03Status='CONSUMED_STOP_VALIDATOR_STALE_LEGAL_READINESS';
op.f2Runtime03RequestConsumed=true;
op.f2Runtime03ReplayAllowed=false;
op.f2Runtime03TerminalArtifactId='9349486089';
op.f2Runtime03CanonicalGateGo=true;
op.f2Runtime03ArtifactVerified=true;
op.f2Runtime03IdentityReadOnlyPass=true;
op.f2Runtime03IntegrityBeforeAfterPass=true;
op.f2Runtime03RoleMatrixCompleted=false;
op.f2Runtime03CrossTenantCheckReached=false;
op.f2Runtime03ServiceWorkerCheckReached=false;
op.f2LegalReadinessRootfixRunId=String(ROOTFIX_RUN);
op.f2LegalReadinessRootfixStatus='CLOSED_SOURCE_ONLY_PASS';
op.f2LegalReadinessRootCause='BLOCKING_GATE_HARD_TIMEOUT_INCLUDED_SUCCESSFUL_DETACH_PHASE';
op.f2Runtime03PostSyncSourceGateStatus='CLOSED_PASS';
op.f2Runtime03PostSyncSourceGateRunId=String(POSTSYNC_RUN);
index.requiredResumeProtocol=['Read this index','Read orbit360-live-state-v1.json','Confirm actual HEAD and PR #5','Read Runtime03 validator-stale STOP, phase-aware legal readiness self-test, rootfix source evidence and post-docsync source evidence','Do not rerun Request01/run 32205144735, Request02/run 32206449703 or Request03/run 32207049146','Do not repeat F1 runtime closures','F2 source-only contract remains closed PASS; do not rederive it','Treat legal-readiness helper root cause as VALIDATOR_STALE, not product defect','Require post-docsync canonical source-only PASS before fresh runtime request','Do not create Request04 without fresh explicit authorization','Bind Request04 only to exact artifact 9345207863'];
const f2Phase=(index.frozenPlanPhases||[]).find(x=>x.id==='F2');
if(f2Phase){f2Phase.status='IN_PROGRESS_RUNTIME03_VALIDATOR_STALE_ROOTFIX_POSTSYNC_PASS_FRESH_AUTH_PENDING';f2Phase.internalPercent=0;f2Phase.internalMethod='runtime03_reached_browser_but_role_matrix_not_completed_legal_readiness_validator_stale_closed_source_only';}

const checkpoint=`# CHECKPOINT — F2 RUNTIME03 · LEGAL READINESS VALIDATOR_STALE ROOTFIX PASS\n\nFecha: 2026-08-18\nRama: \`ays/backend-tenant-lab-v99-20260703\`\nPR: #5 draft/open\nGate: \`${GATE}\`\nArtifact bloqueado: \`${ARTIFACT}\`\n\n## Runtime03 — único intento consumido\n\nRequest03 commit \`809228b1e8d65282f553881b0e2b4dd5e1974e2a\`, run \`${RUNTIME_RUN}\`, attempt 1. Request03 quedó consumido, allowedExecutions 0 y replay false.\n\nRuntime03 superó el gate canónico, verificó íntegramente el artifact exacto, resolvió la identidad existente read-only y obtuvo snapshot de integridad before. Entró al navegador, pero se detuvo en el helper de readiness legal antes de completar la matriz de roles, cross-tenant y service-worker.\n\n## Hallazgo y reclasificación\n\nEl runtime emitió inicialmente \`FUNCTIONAL_DEFECT:F2_LEGAL_GATE_NOT_IDEMPOTENT\`. La evidencia real fue: una sola aceptación legal, \`accepted=1\`, \`remaining=0\`, sin page errors, sin console errors y sin señales de write. La integridad after comparó conteos y digests idénticos.\n\nLa causa raíz canónica es \`VALIDATOR_STALE / BLOCKING_GATE_HARD_TIMEOUT_INCLUDED_SUCCESSFUL_DETACH_PHASE\`: el helper contaba el tiempo de detach exitoso dentro del hard timeout y podía devolver timeout antes de conceder la quiet window posterior. No se demostró reaparición del modal ni defecto funcional del owner legal.\n\n## Rootfix source-only\n\nEl helper \`tools/orbit360-browser-blocking-gate-readiness-v20260730.mjs\` quedó phase-aware. El self-test reproduce el patrón legacy cruzando el hard timeout con \`accepted=1 / remaining=0\` y ahora termina \`quietWindowSatisfied=true\`. Rootfix source-only run \`${ROOTFIX_RUN}\`: PASS. Request03 no fue reproducido.\n\n## Integridad e invariantes\n\n- candidate artifact: verificado;\n- identidad: read-only PASS;\n- integrity before/after: PASS, countsIdentical=true, digestsIdentical=true;\n- Firestore/Auth/membership/data/operational writes: 0;\n- rebuild/deploy/publicación/producción: 0/no;\n- role matrix completa: no;\n- cross-tenant: no alcanzado;\n- service-worker/cache: no alcanzado;\n- F2: todavía abierto.\n\nRuta inmediata a producción: 50%. Programa integral: 25%. Carril A congelado; Carril B rootfix + post-docsync source gate PASS; Carril C sin cambios.\n\n## Control post-docsync\n\nEste mismo cierre se valida con gate canónico source-only después de modificar live-state/índice/checkpoint. Run source-only esperado del cierre: \`${POSTSYNC_RUN}\`. Si ese gate no pasa, estos documentos no se persisten como estado canónico.\n\n## Siguiente frontera\n\n\`F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V1 / REQUEST04 / EXACT_ARTIFACT_9345207863\`. Request04 no existe ni está autorizado. Requiere autorización explícita fresca y conserva los mismos límites read-only.\n\n## Claude / Academia\n\n\`REPLICABLE_CLAUDE_ACUMULADO\`: readiness phase-aware y separación entre resultado observable del helper y defecto funcional del owner; sin backend protegido, secretos ni datos reales.\n\n\`ACADEMIA_ACTUALIZAR\`: un timeout del validador no equivale a falta de idempotencia si la evidencia registra una aceptación y cero gates restantes; root cause antes de rerun; post-docsync source gate obligatorio.\n`;

writeJson(LIVE_REL,live);
writeJson(INDEX_REL,index);
fs.writeFileSync(path.join(ROOT,CHECKPOINT_REL),checkpoint,'utf8');
console.log(JSON.stringify({ok:true,status:'F2_RUNTIME03_DOCSYNC_PREPARED_FOR_POSTSYNC_CANONICAL_GATE',postSyncRunId:POSTSYNC_RUN,triggerSha:TRIGGER_SHA,checkpoint:CHECKPOINT_REL,request04Created:false,runtimeAuthorized:false,writes:0},null,2));
