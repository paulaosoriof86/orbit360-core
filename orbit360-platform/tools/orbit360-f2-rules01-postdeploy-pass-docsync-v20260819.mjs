#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const LIVE_PATH = path.join(ROOT, 'docs/orbit360-live-state-v1.json');
const INDEX_PATH = path.join(ROOT, 'docs/ORBIT360-CURRENT-DOCUMENTATION-INDEX-v1.json');
const REQUEST_PATH = path.join(ROOT, '../.github/orbit360-requests/f2-rules01-postdeploy-probe-readonly-v20260818-01.json');
const OBSERVER_PATH = path.join(ROOT, 'runtime-gate-crm-v20260716/f2-rules01-postdeploy-probe-run-observer-v20260819.json');
const SANITIZED_PATH = path.join(ROOT, 'runtime-gate-crm-v20260716/f2-rules01-postdeploy-probe-pass-v20260819.json');
const POSTSYNC_REL = 'orbit360-platform/runtime-gate-crm-v20260716/f2-rules01-postdeploy-pass-postsync-source-only-v20260819.json';
const CHECKPOINT_REL = 'orbit360-platform/docs/CHECKPOINT-F2-RULES01-POSTDEPLOY-CROSS-TENANT-PROBE-PASS-REQUEST06-AUTH-PENDING-20260819.md';
const CHECKPOINT_PATH = path.join(ROOT, 'docs/CHECKPOINT-F2-RULES01-POSTDEPLOY-CROSS-TENANT-PROBE-PASS-REQUEST06-AUTH-PENDING-20260819.md');
const EVIDENCE_REL = 'orbit360-platform/runtime-gate-crm-v20260716/f2-rules01-postdeploy-probe-pass-v20260819.json';
const OBSERVER_REL = 'orbit360-platform/runtime-gate-crm-v20260716/f2-rules01-postdeploy-probe-run-observer-v20260819.json';
const REQUEST_REL = '.github/orbit360-requests/f2-rules01-postdeploy-probe-readonly-v20260818-01.json';
const EXACT_ARTIFACT = 9345207863;
const RUN_ID = 32272580947;
const RUN_ARTIFACT_ID = 9372746151;
const RUN_ARTIFACT_DIGEST = 'sha256:c087ad3bae277f990c760eb04edcce96ef2746add36120040ba6da5f4d55a860';
const GATE_ID = 'f2-productive-acceptance-exact-successor-v20260818';
const NEXT_REQUEST_VERSION = 'F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V1';
const NEXT_ORDINAL = 6;
const PHASE = 'F2_RULES01_POSTDEPLOY_PROBE_PASS_REQUEST06_AUTHORIZATION_PENDING';

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeJson = (p, value) => fs.writeFileSync(p, JSON.stringify(value, null, 2) + '\n', 'utf8');
const need = (cond, code) => { if (!cond) throw new Error(code); };
const arg = (name) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; };

const terminalArg = arg('--terminal');
need(terminalArg, 'DOCSYNC_TERMINAL_EVIDENCE_ARGUMENT_REQUIRED');
const terminalPath = path.resolve(ROOT, terminalArg);
need(fs.existsSync(terminalPath), 'DOCSYNC_TERMINAL_EVIDENCE_NOT_FOUND');

const live = readJson(LIVE_PATH);
const index = readJson(INDEX_PATH);
const request = readJson(REQUEST_PATH);
const observer = readJson(OBSERVER_PATH);
const terminal = readJson(terminalPath);

need(live.schemaVersion === 'orbit360-live-state-v1', 'DOCSYNC_LIVE_STATE_SCHEMA_MISMATCH');
need(index.schemaVersion === 'orbit360-current-documentation-index-v1', 'DOCSYNC_INDEX_SCHEMA_MISMATCH');
need(request.requestVersion === 'F2_RULES01_POSTDEPLOY_CROSS_TENANT_PROBE_READONLY_V1' && request.requestOrdinal === 1, 'DOCSYNC_REQUEST_BOUNDARY_MISMATCH');
need(request.status === 'CONSUMED_PASS' && request.consumed === true && request.allowedExecutions === 0 && request.replayAllowed === false, 'DOCSYNC_REQUEST_NOT_CONSUMED_PASS');
need(request.candidateArtifactId === EXACT_ARTIFACT, 'DOCSYNC_REQUEST_ARTIFACT_MISMATCH');
need(request.terminal?.runId === RUN_ID && request.terminal?.runAttempt === 1 && request.terminal?.conclusion === 'success', 'DOCSYNC_REQUEST_TERMINAL_RUN_MISMATCH');
need(request.terminal?.artifactId === RUN_ARTIFACT_ID && request.terminal?.artifactDigest === RUN_ARTIFACT_DIGEST, 'DOCSYNC_REQUEST_TERMINAL_ARTIFACT_MISMATCH');
need(request.terminal?.responseStatus === 403 && request.terminal?.responseErrorStatus === 'PERMISSION_DENIED' && request.terminal?.crossTenantDenied === true, 'DOCSYNC_REQUEST_DENY_PROOF_MISMATCH');
need(request.terminal?.integrityBeforeAfterPass === true && request.terminal?.rulesRedeployExecuted === false, 'DOCSYNC_REQUEST_INTEGRITY_OR_REDEPLOY_MISMATCH');
for (const k of ['firestoreDocumentWrites','authWrites','membershipWrites','dataWrites']) need(request.terminal?.[k] === 0, `DOCSYNC_WRITE_NONZERO_${k}`);
for (const k of ['hostingDeploy','functionsDeploy','packageRebuild','publication','production']) need(request.terminal?.[k] === false, `DOCSYNC_FORBIDDEN_EFFECT_${k}`);

need(observer.ok === true && observer.uniquenessCount === 1 && observer.probeRunFound === true, 'DOCSYNC_OBSERVER_NOT_UNIQUE_PASS');
need(Number(observer.run?.id) === RUN_ID && observer.run?.run_attempt === 1 && observer.run?.status === 'completed' && observer.run?.conclusion === 'success', 'DOCSYNC_OBSERVER_RUN_MISMATCH');
need(observer.runtimeReplay === false && observer.rulesRedeploy === false, 'DOCSYNC_OBSERVER_REPLAY_OR_REDEPLOY');

need(terminal.ok === true && terminal.status === 'F2_RULES01_POSTDEPLOY_CROSS_TENANT_PROBE_PASS', 'DOCSYNC_TERMINAL_NOT_PASS');
need(Number(terminal.runId) === RUN_ID && terminal.requestOrdinal === 1 && terminal.candidateArtifactId === EXACT_ARTIFACT, 'DOCSYNC_TERMINAL_BOUNDARY_MISMATCH');
need(terminal.probe?.responseStatus === 403 && terminal.probe?.responseErrorStatus === 'PERMISSION_DENIED' && terminal.probe?.crossTenantDenied === true, 'DOCSYNC_TERMINAL_SERVER_DENY_MISMATCH');
need(terminal.integrity?.integrityBeforeAfterPass === true && terminal.integrity?.countsIdentical === true && terminal.integrity?.digestsIdentical === true, 'DOCSYNC_TERMINAL_INTEGRITY_MISMATCH');
need(terminal.scope?.rulesRedeployExecuted === false, 'DOCSYNC_TERMINAL_RULES_REDEPLOYED');
for (const k of ['firestoreDocumentWrites','authWrites','membershipWrites','dataWrites']) need(terminal.scope?.[k] === 0, `DOCSYNC_TERMINAL_WRITE_NONZERO_${k}`);
need(terminal.scope?.hostingDeploy === false && terminal.scope?.functionsDeploy === false && terminal.scope?.packageRebuilt === false && terminal.scope?.publicationExecuted === false && terminal.scope?.productionHostingTouched === false, 'DOCSYNC_TERMINAL_FORBIDDEN_EFFECT');

const now = new Date().toISOString();
const sanitized = {
  schemaVersion: 'orbit360-f2-rules01-postdeploy-probe-pass-v1', ok: true,
  status: 'F2_RULES01_POSTDEPLOY_CROSS_TENANT_PROBE_PASS', classification: 'SECURITY_CONTROL_PASS',
  canonicalGateId: GATE_ID, candidateArtifactId: EXACT_ARTIFACT,
  request: { path: REQUEST_REL, ordinal: 1, status: 'CONSUMED_PASS', replayAllowed: false },
  run: { id: RUN_ID, attempt: 1, conclusion: 'success', artifactId: RUN_ARTIFACT_ID, artifactDigest: RUN_ARTIFACT_DIGEST },
  serverForcedProbe: { httpStatus: 403, errorStatus: 'PERMISSION_DENIED', crossTenantDenied: true },
  integrity: { beforeAfterPass: true, countsIdentical: true, digestsIdentical: true },
  writes: { firestoreDocument: 0, auth: 0, membership: 0, data: 0 },
  forbiddenEffects: { rulesRedeploy: false, hostingDeploy: false, functionsDeploy: false, packageRebuild: false, publication: false, production: false, mainMerge: false },
  observer: { evidence: OBSERVER_REL, uniquenessCount: 1, runtimeReplay: false },
  observerRootCauseClosed: { classification: 'PIPELINE_MECHANISM_FAILURE', code: 'F2_POSTDEPLOY_PROBE_OBSERVER_OVERCONSTRAINED_BY_ACTIONS_PATH_FIELD', disposition: 'CLOSED_BY_PROVEN_SHA_WORKFLOW_EVENT_MATCH_CONTRACT', productAffected: false, probeReplayed: false },
  successorPublication: { published: false, productionOperationalDeclared: false },
  containsPII: false, containsSecrets: false, generatedAt: now
};
writeJson(SANITIZED_PATH, sanitized);

live.stateVersion = '20260819.f2.rules01-postdeploy-probe-pass.request06-auth-pending.current';
live.updatedAt = now;
live.phase = PHASE;
live.rootCauseState = live.rootCauseState || {};
live.rootCauseState.currentBlockingFact = { code: 'F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V1_REQUEST06_REQUIRED', status: 'FRESH_AUTHORIZATION_PENDING' };
for (const k of ['authIsCurrentBlocker','passwordIsCurrentBlocker','membershipExistenceIsCurrentBlocker','tenantIsCurrentBlocker','hostDimeIsCurrentBlocker','dataReimportIsCurrentBlocker']) live.rootCauseState[k] = false;
live.rootCauseState.f2PostdeployProbeObserver = sanitized.observerRootCauseClosed;

live.goLive = live.goLive || {};
live.goLive.status = PHASE;
live.goLive.successorPublished = false;
live.goLive.productionOperationalDeclared = false;
live.goLive.publishedPackagePreserved = true;

live.stopRetry = live.stopRetry || {};
live.stopRetry.f2Runtime05MayBeRerun = false;
live.stopRetry.f2Runtime05RequestReplayAllowed = false;
live.stopRetry.f2Rules01MayBeRedeployedForThisProof = false;
live.stopRetry.f2PostdeployProbeRequestMayBeRerun = false;
live.stopRetry.request06MayBeCreatedWithoutFreshAuthorization = false;

live.nextActionExact = {
  stage: 'F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V1_REQUEST06_AUTHORIZATION_BOUNDARY',
  gateId: GATE_ID, requestVersion: NEXT_REQUEST_VERSION, runtimeRequestOrdinalAfterRepair: NEXT_ORDINAL,
  candidateArtifactId: EXACT_ARTIFACT, securityRepairRequired: false, rulesSourceMutationRequired: false,
  rulesRedeployAllowed: false, rulesRedeployRequired: false, postdeployProbePassed: true,
  postdeployProbeRunId: RUN_ID, postdeployProbeRequestConsumed: true, request06Created: false, authorizationRequired: true,
  allowsAfterFreshRuntimeAuthorization: ['mandatory_canonical_gate_before_secrets','exact_artifact_verification','provider_and_identity_readonly','integrity_before_after','browser_role_matrix_direccion_operativo_asesor','cross_tenant_server_deny_confirmation','service_worker_cache_validation','readonly_runtime_acceptance'],
  forbids: ['firestore_document_writes','auth_writes','membership_writes','data_writes','password_reset','rules_redeploy','hosting_deploy','functions_deploy','package_rebuild','publication','production_mutation','main_merge','request01_to_request05_replay','postdeploy_probe_replay']
};

live.resumeProtocol = [
  'Read ORBIT360-CURRENT-DOCUMENTATION-INDEX-v1.json', 'Read orbit360-live-state-v1.json',
  'Confirm actual HEAD and PR #5 remain draft/open/unmerged',
  'Read the F2 RULES01 postdeploy probe PASS checkpoint and sanitized evidence',
  'Do not rerun Request01-Request05 or the postdeploy probe Request01',
  'Do not redeploy Firestore rules: server-forced cross-tenant deny is already proven',
  'Do not reopen authentication, password, membership existence, HostDime or data reimport as current blockers',
  'Certified successor artifact 9345207863 remains unpublished; public URL is not evidence of the certified successor until publication is explicitly authorized',
  'Create Request06 only after fresh explicit authorization',
  'Request06 must run the canonical F2 gate before secrets and remain fully read-only'
];

live.f2Rules01 = live.f2Rules01 || {};
live.f2Rules01.status = 'POSTDEPLOY_PROBE_PASS_REQUEST06_AUTH_PENDING';
live.f2Rules01.requestConsumed = true;
live.f2Rules01.replayAllowed = false;
live.f2Rules01.postdeployProbe = {
  workflowPrepared: true, requestPath: REQUEST_REL, requestCreated: true, requestConsumed: true, authorized: false,
  runId: RUN_ID, runAttempt: 1, terminalArtifactId: RUN_ARTIFACT_ID, status: 'PASS', serverForced: true,
  responseStatus: 403, responseErrorStatus: 'PERMISSION_DENIED', crossTenantDenied: true, integrityBeforeAfterPass: true,
  rulesRedeployAllowed: false, rulesRedeployExecuted: false, firestoreDocumentWrites: 0, authWrites: 0, membershipWrites: 0, dataWrites: 0,
  evidence: EVIDENCE_REL
};
live.f2Rules01.request06Created = false;
writeJson(LIVE_PATH, live);

index.updatedAt = now;
index.operationalCurrent = index.operationalCurrent || {};
Object.assign(index.operationalCurrent, {
  resumePointer: CHECKPOINT_REL, currentCheckpoint: CHECKPOINT_REL,
  latestRuntimeEvidence: EVIDENCE_REL, latestTerminalEvidence: EVIDENCE_REL, latestRequestConsumptionEvidence: EVIDENCE_REL,
  latestPreflightEvidence: POSTSYNC_REL, currentPhase: PHASE, currentPhaseInternalPercent: 0,
  currentPhaseInternalMethod: 'rules01_postdeploy_probe_pass_request06_authorization_pending',
  goLiveRoutePercentClosed: 50, integratedProgramPercentClosed: 25,
  currentBlocker: 'F2 security parity is closed: server-forced cross-tenant read returned 403/PERMISSION_DENIED with identical integrity. F2 remains open only for full runtime/browser acceptance Request06; fresh explicit authorization is required. Certified successor is still unpublished.',
  f2RuntimeRequestCreated: false, f2RuntimeAuthorizationGranted: false, successorPublished: false,
  nextAuthorizationBoundary: 'F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V1 / REQUEST06 / EXACT_ARTIFACT_9345207863 / FRESH_AUTHORIZATION_REQUIRED',
  request06Created: false, f2Rules01Status: 'POSTDEPLOY_PROBE_PASS_REQUEST06_AUTH_PENDING', f2Rules01RulesRedeployRequired: false,
  f2PostdeployProbeRequestCreated: true, f2PostdeployProbeAuthorizationGranted: false, f2PostdeployProbeRequestConsumed: true,
  f2PostdeployProbeStatus: 'CLOSED_PASS_CONSUMED', f2PostdeployProbeRunId: String(RUN_ID),
  f2PostdeployProbeTerminalArtifactId: String(RUN_ARTIFACT_ID), f2PostdeployProbeCrossTenantDenied: true,
  f2PostdeployProbeIntegrityBeforeAfterPass: true, f2PostdeployProbeReplayAllowed: false,
  f2PostdeployProbeObserverRootCause: 'F2_POSTDEPLOY_PROBE_OBSERVER_OVERCONSTRAINED_BY_ACTIONS_PATH_FIELD',
  f2PostdeployProbeObserverRootCauseStatus: 'CLOSED', f2PostdeployProbeEvidence: EVIDENCE_REL,
  f2PostdeployProbePostSyncEvidence: POSTSYNC_REL
});
writeJson(INDEX_PATH, index);

const checkpoint = `# CHECKPOINT — F2 RULES01 POSTDEPLOY CROSS-TENANT PROBE PASS · REQUEST06 AUTH PENDING · 2026-08-19\n\n## Bloque\nF2 Productive Acceptance — cierre del control de paridad de reglas y frontera limpia para Request06.\n\n## Fuente / baseline\n- Rama: \`ays/backend-tenant-lab-v99-20260703\`.\n- PR #5: debe permanecer draft/open/unmerged.\n- Gate: \`${GATE_ID}\`.\n- Artefacto exacto: \`${EXACT_ARTIFACT}\` (certificado y todavía **no publicado**).\n- Request postdeploy: \`${REQUEST_REL}\`, consumido PASS y no reproducible.\n\n## Evidencia productiva de seguridad\n- Run único: \`${RUN_ID}\`, attempt 1, conclusion success.\n- Artifact evidencia: \`${RUN_ARTIFACT_ID}\`, digest \`${RUN_ARTIFACT_DIGEST}\`.\n- Probe forzado a servidor: **403 / PERMISSION_DENIED**; \`crossTenantDenied=true\`.\n- Integridad before/after: PASS; counts y digests idénticos.\n- Firestore document/Auth/membership/data writes: **0**.\n- Redeploy de reglas: **no**. Hosting/Functions/rebuild/publicación/producción: **no**.\n\n## Causa raíz del bloqueo de observabilidad\nClasificación: \`PIPELINE_MECHANISM_FAILURE\`. Código: \`F2_POSTDEPLOY_PROBE_OBSERVER_OVERCONSTRAINED_BY_ACTIONS_PATH_FIELD\`. El primer observer añadió una condición \`path\` no necesaria al match de Actions. Se sustituyó por el patrón ya probado: **SHA exacto + nombre exacto del workflow + evento push**, con unicidad 1 y attempt 1. El probe no fue repetido.\n\n## Qué queda cerrado\nAutenticación/password, membership/tenant, Cliente 360, HostDime y reimportación de datos **no son el bloqueo actual**. La paridad de Firestore rules / deny cross-tenant queda cerrada por evidencia server-backed. No corresponde redeploy de reglas ni repetir Request01–Request05.\n\n## Distinción indispensable para go-live\nEl sucesor certificado \`${EXACT_ARTIFACT}\` permanece **unpublished** y \`productionOperationalDeclared=false\`. Por tanto, que la URL pública no muestre todavía los fixes certificados no reabre autenticación: publicación es una etapa distinta y aún no ha sido autorizada/ejecutada.\n\n## Estado\n- Carril A: FROZEN_NO_CHANGES.\n- Carril B: F2_RULES01_POSTDEPLOY_PROBE_PASS_REQUEST06_AUTHORIZATION_PENDING.\n- Carril C: UNTOUCHED_ZERO_CHANGES.\n- Ruta inmediata: **50%** hasta cierre runtime de F2. Programa integral: **25%**.\n\n## Próxima acción exacta\n\`F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V1 / REQUEST06 / EXACT_ARTIFACT_9345207863\`. Requiere autorización fresca. Request06 no existe al generar este checkpoint. Debe ejecutar primero gate canónico, luego artefacto exacto, identidad/read-only, matriz Dirección/Operativo/Asesor, deny cross-tenant, Service Worker/cache e integridad before/after; cero writes, cero redeploy, cero publicación y cero producción.\n\n## Reuso / Academia\n- \`BACKEND_PROTEGIDO_NO_CLAUDE\`: enforcement real de reglas y provider-backed probe.\n- \`REPLICABLE_CLAUDE_ACUMULADO\`: observer de Actions por SHA + workflow + event.\n- \`ACADEMIA_ACTUALIZAR\`: distinguir SECURITY_FAILURE real de PIPELINE_MECHANISM_FAILURE de observabilidad; un control se cierra por respuesta server-backed + integridad, no por el estado visual de un observer.\n`;
fs.writeFileSync(CHECKPOINT_PATH, checkpoint, 'utf8');

console.log(JSON.stringify({ ok: true, status: 'F2_RULES01_POSTDEPLOY_PASS_DOCSYNC_PREPARED', phase: PHASE, runId: RUN_ID, crossTenantDenied: true, integrityBeforeAfterPass: true, request06Created: false, successorPublished: false, writes: 0 }, null, 2));
