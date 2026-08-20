#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const p = (...parts) => path.join(root, ...parts);
const readJson = (file) => JSON.parse(fs.readFileSync(p(file), 'utf8'));
const need = (cond, code, details = {}) => {
  if (!cond) {
    console.error(JSON.stringify({ ok: false, classification: 'PIPELINE_MECHANISM_FAILURE', code, ...details }, null, 2));
    process.exit(1);
  }
};

const LIVE_PATH = 'orbit360-platform/docs/orbit360-live-state-v1.json';
const INDEX_PATH = 'orbit360-platform/docs/ORBIT360-CURRENT-DOCUMENTATION-INDEX-v1.json';

const live = readJson(LIVE_PATH);
const index = readJson(INDEX_PATH);

need(live?.schemaVersion === 'orbit360-live-state-v1', 'DOCSYNC_LIVE_SCHEMA_INVALID');
need(index?.schemaVersion === 'orbit360-current-documentation-index-v1', 'DOCSYNC_INDEX_SCHEMA_INVALID');
need(live?.repository === 'paulaosoriof86/orbit360-core', 'DOCSYNC_REPOSITORY_MISMATCH');
need(live?.branch === 'ays/backend-tenant-lab-v99-20260703', 'DOCSYNC_BRANCH_MISMATCH');
need(Number(live?.pr) === 5 && Number(index?.pullRequest) === 5, 'DOCSYNC_PR_MISMATCH');

const runtime = live?.f2RuntimeCurrent;
need(runtime && Number.isInteger(runtime.latestRequestOrdinal ?? runtime.requestOrdinal) || Number.isInteger(runtime?.latestRequestOrdinal), 'DOCSYNC_LIVE_RUNTIME_ORDINAL_MISSING');
const ordinal = Number(runtime.latestRequestOrdinal ?? runtime.requestOrdinal);
need(ordinal > 0, 'DOCSYNC_RUNTIME_ORDINAL_INVALID', { ordinal });
need(typeof runtime.requestPath === 'string' && runtime.requestPath.length > 0, 'DOCSYNC_REQUEST_PATH_MISSING');
need(typeof runtime.authorizationPath === 'string' && runtime.authorizationPath.length > 0, 'DOCSYNC_AUTH_PATH_MISSING');
need(fs.existsSync(p(runtime.requestPath)), 'DOCSYNC_REQUEST_FILE_MISSING', { path: runtime.requestPath });
need(fs.existsSync(p(runtime.authorizationPath)), 'DOCSYNC_AUTH_FILE_MISSING', { path: runtime.authorizationPath });

const request = readJson(runtime.requestPath);
const auth = readJson(runtime.authorizationPath);
const op = index?.operationalCurrent || {};

need(Number(request.requestOrdinal) === ordinal, 'DOCSYNC_REQUEST_ORDINAL_MISMATCH', { live: ordinal, request: request.requestOrdinal });
need(Number(auth.requestOrdinal) === ordinal, 'DOCSYNC_AUTH_ORDINAL_MISMATCH', { live: ordinal, auth: auth.requestOrdinal });
need(Number(op.latestRuntimeRequestOrdinal) === ordinal, 'DOCSYNC_INDEX_ORDINAL_MISMATCH', { live: ordinal, index: op.latestRuntimeRequestOrdinal });

for (const [name, obj] of [['request', request], ['authorization', auth]]) {
  need(obj.consumed === true, `DOCSYNC_${name.toUpperCase()}_NOT_CONSUMED`);
  need(Number(obj.allowedExecutions) === 0, `DOCSYNC_${name.toUpperCase()}_EXECUTIONS_NOT_ZERO`, { value: obj.allowedExecutions });
  need(obj.replayAllowed === false, `DOCSYNC_${name.toUpperCase()}_REPLAY_NOT_FALSE`);
}

need(runtime.consumed === true, 'DOCSYNC_LIVE_NOT_CONSUMED');
need(Number(runtime.allowedExecutions) === 0, 'DOCSYNC_LIVE_EXECUTIONS_NOT_ZERO');
need(runtime.replayAllowed === false, 'DOCSYNC_LIVE_REPLAY_NOT_FALSE');
need(op.request12Consumed === undefined || op.request12Consumed === true || ordinal !== 12, 'DOCSYNC_INDEX_REQUEST12_NOT_CONSUMED');
need(op.request12ReplayAllowed === undefined || op.request12ReplayAllowed === false || ordinal !== 12, 'DOCSYNC_INDEX_REQUEST12_REPLAY_NOT_FALSE');
need(op.latestRuntimeStatus === runtime.status, 'DOCSYNC_INDEX_STATUS_MISMATCH', { live: runtime.status, index: op.latestRuntimeStatus });
need(Number(op.latestRuntimeRunId) === Number(runtime.runtimeRunId), 'DOCSYNC_INDEX_RUN_MISMATCH', { live: runtime.runtimeRunId, index: op.latestRuntimeRunId });
need(Number(op.latestRuntimeArtifactId) === Number(runtime.terminalArtifactId), 'DOCSYNC_INDEX_ARTIFACT_MISMATCH', { live: runtime.terminalArtifactId, index: op.latestRuntimeArtifactId });

need(request.candidateArtifactId === live.baseline.candidateArtifactId, 'DOCSYNC_REQUEST_CANDIDATE_MISMATCH');
need(auth.candidateArtifactId === live.baseline.candidateArtifactId, 'DOCSYNC_AUTH_CANDIDATE_MISMATCH');
need(op.candidateArtifactId === live.baseline.candidateArtifactId, 'DOCSYNC_INDEX_CANDIDATE_MISMATCH');
need(request.candidateSourceHead === live.baseline.candidateSourceHead, 'DOCSYNC_REQUEST_SOURCE_MISMATCH');
need(auth.candidateSourceHead === live.baseline.candidateSourceHead, 'DOCSYNC_AUTH_SOURCE_MISMATCH');
need(op.candidateSourceHead === live.baseline.candidateSourceHead, 'DOCSYNC_INDEX_SOURCE_MISMATCH');

need(live.authorization?.request13Authorized === false, 'DOCSYNC_UNAUTHORIZED_SUCCESSOR_DECLARED');
need(op.request13Authorized === false, 'DOCSYNC_INDEX_UNAUTHORIZED_SUCCESSOR_DECLARED');
need(live.authorization?.deployAuthorized === false && live.authorization?.productionAuthorized === false, 'DOCSYNC_LIVE_PRODUCTION_AUTH_INVALID');
need(op.deployAuthorized === false && op.productionAuthorized === false, 'DOCSYNC_INDEX_PRODUCTION_AUTH_INVALID');

const liveRaw = fs.readFileSync(p(LIVE_PATH), 'utf8');
const indexRaw = fs.readFileSync(p(INDEX_PATH), 'utf8');
const stalePatterns = [
  /REQUEST10[_ -](CURRENT|PENDING|AUTH)/i,
  /REQUEST11[_ -](AUTHORIZATION[_ -]?PENDING|RUNTIME[_ -]?PENDING)/i,
  /REQUEST12[_ -](AUTHORIZATION[_ -]?PENDING|RUNTIME[_ -]?PENDING)/i,
  /fresh explicit authorization is required for Request11/i,
  /REQUEST11_FRESH_AUTHORIZATION_REQUIRED/i
];
for (const pattern of stalePatterns) {
  need(!pattern.test(liveRaw), 'DOCSYNC_STALE_TOKEN_IN_LIVE_STATE', { pattern: String(pattern) });
  need(!pattern.test(indexRaw), 'DOCSYNC_STALE_TOKEN_IN_INDEX', { pattern: String(pattern) });
}

need(live.rootCauseState?.documentationDrift?.code === 'DOCUMENTATION_CURRENT_STATE_DUPLICATION_AND_STALE_MIRRORS', 'DOCSYNC_ROOTCAUSE_RECORD_MISSING');
need(live.rootCauseState?.polizasReadiness?.status === 'ROOT_CAUSE_REOPENED_PER_SECOND_SAME_FAMILY_FAILURE', 'DOCSYNC_POLIZAS_ROOTCAUSE_STATE_MISMATCH');
need(live.nextActionExact?.request13CreationAllowedNow === false, 'DOCSYNC_SUCCESSOR_GUARD_MISSING');
need(Array.isArray(index.nextActionExact) && index.nextActionExact[0] === 'RUN_CURRENT_DOCUMENTATION_COHERENCE_VALIDATOR', 'DOCSYNC_INDEX_NEXT_ACTION_MISMATCH');

console.log(JSON.stringify({
  ok: true,
  status: 'CURRENT_DOCUMENTATION_COHERENCE_PASS',
  requestOrdinal: ordinal,
  requestStatus: request.status,
  authorizationStatus: auth.status,
  runtimeRunId: runtime.runtimeRunId,
  terminalArtifactId: runtime.terminalArtifactId,
  candidateArtifactId: live.baseline.candidateArtifactId,
  rootCause: live.rootCauseState.polizasReadiness.status,
  successorAuthorized: false,
  deployAuthorized: false,
  productionAuthorized: false
}, null, 2));
