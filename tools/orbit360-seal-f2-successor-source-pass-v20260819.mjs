#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const GATE='f2-productive-acceptance-exact-successor-v20260818';
const REQUEST_VERSION='F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V1';
const CANDIDATE={
  artifactId:9385306424,
  sourceHead:'b94b2ae86d26586a68d33be9edba8715e956b02e',
  zipSha256:'81a96f476fd0fdfd814b3f047951ce653fd324bef8a6d96d6ee6fe44dd7bdcf4',
  manifestSha256:'cc6170121ed61fd6d9cde867dfcae8a3dd23d29777c6ee28c240d70e49843eef',
  manifestStatus:'FASE_A_PRODUCT_F2_REQUEST06_ROOTFIX_SUCCESSOR_CERTIFIED',
  fileCount:194
};
const SOURCE_RUN=32310630524;
const SOURCE_EVIDENCE_ARTIFACT=9386304228;
const ROOTFIX_RUN=32310462537;
const FAILED_SOURCE_RUN=32310148537;
const UPDATED='2026-08-19T22:52:00.000Z';
const SOURCE='tools/orbit360-validator-lifecycle-contract-f2-productive-acceptance-source-v20260819.json';
const RUNTIME='tools/orbit360-validator-lifecycle-contract-f2-productive-acceptance-runtime-v20260819.json';
const REGISTRY='tools/orbit360-gate-contract-registry-v20260717.json';
const LIVE='orbit360-platform/docs/orbit360-live-state-v1.json';
const INDEX='orbit360-platform/docs/ORBIT360-CURRENT-DOCUMENTATION-INDEX-v1.json';
const ACADEMIA='orbit360-platform/docs/ACADEMIA-DELTA-F2-VALIDATOR-STALE-REBIND-20260819.md';
const CHECKPOINT='orbit360-platform/docs/CHECKPOINT-F2-REQUEST06-ROOTFIX-SUCCESSOR-SOURCE-PASS-20260819.md';
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8').replace(/^\uFEFF/,'');
const write=(p,c)=>{const a=path.join(ROOT,p);fs.mkdirSync(path.dirname(a),{recursive:true});fs.writeFileSync(a,c,'utf8');};
const json=p=>JSON.parse(read(p));
const writeJson=(p,v)=>write(p,JSON.stringify(v,null,2)+'\n');
const need=(ok,code)=>{if(!ok)throw new Error(code);};
const guardMatches=g=>Number(g?.candidateArtifactId)===CANDIDATE.artifactId&&g?.candidateSourceHead===CANDIDATE.sourceHead&&g?.candidateZipSha256===CANDIDATE.zipSha256&&g?.candidateManifestSha256===CANDIDATE.manifestSha256&&g?.candidateManifestStatus===CANDIDATE.manifestStatus&&Number(g?.candidateFileCount)===CANDIDATE.fileCount;

const source=json(SOURCE), runtime=json(RUNTIME), registry=json(REGISTRY), live=json(LIVE), index=json(INDEX);
need(source.gateId===GATE&&source.status==='F2_SOURCE_ONLY_REBIND_PENDING','SOURCE_LIFECYCLE_NOT_PENDING_REBIND');
need(runtime.gateId===GATE&&runtime.status==='F2_RUNTIME_BLOCKED_PENDING_SOURCE_REBIND','RUNTIME_LIFECYCLE_NOT_BLOCKED_PENDING_SOURCE');
need(guardMatches(source.guards)&&guardMatches(runtime.guards),'CANDIDATE_GUARD_MISMATCH');
need(live?.f2SourceOnly?.status==='PENDING_REBIND_SOURCE_ONLY','LIVE_SOURCE_NOT_PENDING');
need(Number(live?.f2SourceOnly?.candidateArtifactId)===CANDIDATE.artifactId,'LIVE_CANDIDATE_MISMATCH');
need(index?.operationalCurrent?.f2SourceOnlyStatus==='PENDING_REBIND_SOURCE_ONLY','INDEX_SOURCE_NOT_PENDING');
need(Number(index?.operationalCurrent?.successorCandidateArtifactId)===CANDIDATE.artifactId,'INDEX_CANDIDATE_MISMATCH');
const gate=Array.isArray(registry.gates)?registry.gates.find(g=>g?.gateId===GATE):null;
need(gate&&Number(gate?.candidate?.artifactId)===CANDIDATE.artifactId,'REGISTRY_F2_CANDIDATE_MISMATCH');

source.status='F2_SOURCE_ONLY_PASS';
source.authorization={...(source.authorization||{}),requiredForExecution:false,activeRequest:false,allowedExecutions:0,consumed:false,authorizationFrozen:true,replayAllowed:false};
source.sourceOnlyResult={
  ok:true,
  status:'CLOSED_PASS',
  classification:'PASS',
  predecessorArtifactId:9345207863,
  candidateArtifactId:CANDIDATE.artifactId,
  candidateSourceHead:CANDIDATE.sourceHead,
  candidateZipSha256:CANDIDATE.zipSha256,
  candidateManifestSha256:CANDIDATE.manifestSha256,
  candidateManifestStatus:CANDIDATE.manifestStatus,
  candidateFileCount:CANDIDATE.fileCount,
  sourceValidationRunId:SOURCE_RUN,
  sourceEvidenceArtifactId:SOURCE_EVIDENCE_ARTIFACT,
  canonicalRouterRootfixRunId:ROOTFIX_RUN,
  priorValidatorStaleSourceRunId:FAILED_SOURCE_RUN,
  canonicalRouterRegistered:true,
  canonicalLifecycleComposition:'phase-capability-contract-v2-source-rebind',
  canonicalRouterVersion:'v10.7-f2-lifecycle-composition-profile-aware',
  fullRehashPass:true,
  inicioFiniteRootfixPass:true,
  exactCandidateBound:true,
  surfaceTopologyBound:true,
  runtimeWorkflowPrepared:true,
  runtimeFreshAuthorizationRequired:true,
  requestCreated:false,
  runtimeExecuted:false,
  browserExecuted:false,
  secretAccess:false,
  dataAccess:false,
  writes:0,
  firestoreWrites:0,
  authWrites:0,
  operationalWrites:0,
  deployExecuted:false,
  publicationExecuted:false,
  productionTouched:false
};
writeJson(SOURCE,source);

runtime.status='F2_RUNTIME_PENDING_FRESH_AUTHORIZATION';
runtime.authorization={...(runtime.authorization||{}),requiredForExecution:true,activeRequest:false,request:'DYNAMIC:ORBIT360_REQUEST_FILE',allowedExecutions:0,consumed:false,authorizationFrozen:true,replayAllowed:false};
runtime.sourceOnlyPrerequisite={status:'CLOSED_PASS',runId:SOURCE_RUN,evidenceArtifactId:SOURCE_EVIDENCE_ARTIFACT,candidateArtifactId:CANDIDATE.artifactId,fullRehashPass:true,inicioFiniteRootfixPass:true};
writeJson(RUNTIME,runtime);

gate.status='SOURCE_CLOSED_RUNTIME_PENDING_FRESH_AUTHORIZATION';
gate.classification='PASS_SOURCE_ONLY';
gate.diagnosticRevision='f2-successor-source-closed-pass-v3';
gate.sourceStatus='CLOSED_PASS';
gate.runtimeStatus='PENDING_FRESH_AUTHORIZATION';
gate.runtimeAuthorization=false;
gate.sourceValidationRunId=SOURCE_RUN;
gate.sourceEvidenceArtifactId=SOURCE_EVIDENCE_ARTIFACT;
gate.sourceFullRehashPass=true;
gate.inicioFiniteRootfixPass=true;
gate.lastFailedSourceRunId=FAILED_SOURCE_RUN;
gate.lastFailedSourceCode='CANONICAL_LIFECYCLE_REVISION_MISMATCH_RESOLVED';
gate.rootCause='Request06 visible non-finite Inicio defect fixed in exact successor; validator-stale rebind and lifecycle-composition root causes closed by SOURCE-only PASS.';
writeJson(REGISTRY,registry);

live.updatedAt=UPDATED;
live.stateVersion='20260819.f2.request06-rootfix-successor-source-closed-runtime-auth-pending.current';
live.phase='F2_SUCCESSOR_SOURCE_ONLY_CLOSED_RUNTIME_AUTH_PENDING';
live.f2SourceOnly={...(live.f2SourceOnly||{}),status:'CLOSED_PASS',candidateArtifactId:CANDIDATE.artifactId,candidateSourceHead:CANDIDATE.sourceHead,candidateZipSha256:CANDIDATE.zipSha256,candidateManifestSha256:CANDIDATE.manifestSha256,candidateManifestStatus:CANDIDATE.manifestStatus,candidateFileCount:CANDIDATE.fileCount,fullRehashPass:true,inicioFiniteRootfixPass:true,sourceValidationRunId:SOURCE_RUN,sourceEvidenceArtifactId:SOURCE_EVIDENCE_ARTIFACT,canonicalRouterVersion:'v10.7-f2-lifecycle-composition-profile-aware',runtimeWorkflowPrepared:true,requestCreated:false,runtimeAuthorized:false,browserAuthorized:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,publicationExecuted:false,productionTouched:false};
live.f2SuccessorSourceClosure={status:'CLOSED_PASS',gateId:GATE,candidateArtifactId:CANDIDATE.artifactId,sourceValidationRunId:SOURCE_RUN,sourceEvidenceArtifactId:SOURCE_EVIDENCE_ARTIFACT,fileCount:CANDIDATE.fileCount,fullRehashPass:true,inicioFiniteRootfixPass:true,rootfixRunId:ROOTFIX_RUN,runtimeFreshAuthorizationRequired:true};
live.rootCauseState=live.rootCauseState||{};
if(live.rootCauseState.f2SuccessorGateRebind) live.rootCauseState.f2SuccessorGateRebind.status='CLOSED_SOURCE_ONLY_PASS';
if(live.rootCauseState.f2SuccessorLifecycleComposition) live.rootCauseState.f2SuccessorLifecycleComposition.status='CLOSED_SOURCE_ONLY_PASS';
live.rootCauseState.currentBlockingFact={code:'F2_REQUEST07_RUNTIME_FRESH_AUTHORIZATION_REQUIRED',status:'FRESH_AUTHORIZATION_REQUIRED',candidateArtifactId:CANDIDATE.artifactId};
live.nextActionExact={action:'PREPARE_REQUEST07_RUNTIME_AUTHORIZATION_BOUNDARY',gateId:GATE,requestVersion:REQUEST_VERSION,candidateArtifactId:CANDIDATE.artifactId,candidateSourceHead:CANDIDATE.sourceHead,status:'FRESH_AUTHORIZATION_REQUIRED',runtimeAuthorizationRequired:true,runtimeExecuted:false};
live.authorization=live.authorization||{};
live.authorization.f2AuthorizationStatus='FRESH_AUTHORIZATION_REQUIRED_REQUEST07_EXACT_ARTIFACT_9385306424';
live.goLive=live.goLive||{};
live.goLive.status='BLOCKED_F2_REQUEST07_FRESH_AUTHORIZATION_REQUIRED';
writeJson(LIVE,live);

index.updatedAt=UPDATED;
index.operationalCurrent=index.operationalCurrent||{};
Object.assign(index.operationalCurrent,{f2SourceOnlyStatus:'CLOSED_PASS',f2SourceOnlyGateId:GATE,successorCandidateArtifactId:CANDIDATE.artifactId,successorCandidateSourceHead:CANDIDATE.sourceHead,successorCandidateZipSha256:CANDIDATE.zipSha256,successorCandidateManifestSha256:CANDIDATE.manifestSha256,successorCandidateManifestStatus:CANDIDATE.manifestStatus,successorCandidateFileCount:CANDIDATE.fileCount,nextAuthorizationBoundary:`FRESH_AUTHORIZATION_REQUIRED:${REQUEST_VERSION}:REQUEST07:EXACT_ARTIFACT_${CANDIDATE.artifactId}`});
index.f2SuccessorRebind={...(index.f2SuccessorRebind||{}),status:'CLOSED_PASS',classification:'PASS_SOURCE_ONLY',sourceValidationRunId:SOURCE_RUN,sourceEvidenceArtifactId:SOURCE_EVIDENCE_ARTIFACT,sourceFullRehashPass:true,inicioFiniteRootfixPass:true,runtimeAuthorized:false,productionTouched:false};
index.f2SuccessorSourceClosure={status:'CLOSED_PASS',gateId:GATE,candidateArtifactId:CANDIDATE.artifactId,sourceValidationRunId:SOURCE_RUN,evidenceArtifactId:SOURCE_EVIDENCE_ARTIFACT,nextBoundary:'REQUEST07_FRESH_AUTHORIZATION_REQUIRED'};
writeJson(INDEX,index);

let academy=fs.existsSync(path.join(ROOT,ACADEMIA))?read(ACADEMIA):'# Academia Orbit 360 — delta F2 2026-08-19\n';
if(!academy.includes('SOURCE-only de la candidata 9385306424 quedó CLOSED_PASS')) academy += `\n## Cierre del caso\n\nEl SOURCE-only de la candidata 9385306424 quedó CLOSED_PASS en run ${SOURCE_RUN}: 194/194 archivos rehashed, \`inicioFiniteRootfixPass:true\`, topología completa, cero secretos/datos/runtime/browser/writes/deploy/producción. Este cierre no autoriza runtime. La siguiente frontera es una autorización humana fresca para Request07 sobre el artifact exacto 9385306424.\n`;
write(ACADEMIA,academy);
write(CHECKPOINT,`# Orbit 360 — F2 Request06 rootfix successor SOURCE PASS\n\nFecha: 2026-08-19\nGate: \`${GATE}\`\nCandidate artifact: \`${CANDIDATE.artifactId}\`\nSource: \`${CANDIDATE.sourceHead}\`\nSOURCE run: \`${SOURCE_RUN}\`\nEvidence artifact: \`${SOURCE_EVIDENCE_ARTIFACT}\`\n\n## Resultado\n\`CLOSED_PASS\`. El canonical gate pasó con lifecycle composition \`phase-capability-contract-v2-source-rebind\`. La candidata fue descargada y verificada por ZIP/manifest hash; 194/194 archivos fueron rehashed; \`inicioFiniteRootfixPass:true\`; Inicio, Cliente360, Aseguradoras, Ops, Leads, Pólizas y Cobros quedaron ligados; Vehículos y Recibos/cartera quedaron validados como superficies integradas.\n\n## Invariantes\n- secretos: 0\n- Firestore/data access: 0\n- writes: 0\n- browser/runtime: 0\n- deploy/publicación/producción: 0\n\n## Causas cerradas\n- \`FUNCTIONAL_DEFECT:F2_UNDEFINED_NAN_VISIBLE\` → corregido en la candidata.\n- \`VALIDATOR_STALE:F2_GATE_OWNERS_PINNED_PREDECESSOR\` → rebind cerrado.\n- \`CANONICAL_LIFECYCLE_REVISION_MISMATCH\` → router profile-aware cerrado.\n\n## Siguiente frontera\nNo existe Request07 todavía. Runtime permanece bloqueado hasta autorización humana fresca para \`${REQUEST_VERSION} / REQUEST07 / EXACT_ARTIFACT_${CANDIDATE.artifactId}\`.\n`);

console.log(JSON.stringify({ok:true,status:'F2_SUCCESSOR_SOURCE_CLOSED_PASS_SEALED',classification:'PASS',gateId:GATE,candidateArtifactId:CANDIDATE.artifactId,sourceValidationRunId:SOURCE_RUN,evidenceArtifactId:SOURCE_EVIDENCE_ARTIFACT,fileCount:CANDIDATE.fileCount,fullRehashPass:true,inicioFiniteRootfixPass:true,runtimeStatus:'PENDING_FRESH_AUTHORIZATION',runtimeAuthorized:false,request07Created:false,secrets:false,dataAccess:false,writes:false,deploy:false,production:false},null,2));
