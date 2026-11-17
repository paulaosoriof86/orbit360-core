'use strict';

const assert = require('node:assert/strict');

// Existing I6.6 transport only. A full channel quota may reuse one known,
// current-LIVE-backed Preview; it may never authorize channel deletion or LIVE.
const CHANNEL = 'gi-i66-rc-42868854629';
const PREVIEW = 'https://ays-orbit-360-lab--gi-i66-rc-42868854629-abj14q6n.web.app';
const SITE = 'ays-orbit-360-lab';
const BUILD_WORKFLOW = '.github/workflows/gravicentra-release-delta-66-package.yml';

function validateAuthorization(control) {
  const c = control || {};
  const a = c.previewChannelReuseAuthorization || {};
  const current = c.currentExactHostingRelease || {};
  assert.equal(c.schema, 'GRAVICENTRA_I6_6_SINGLE_ARTIFACT_RELEASE_TRANSPORT_V1');
  assert.equal(c.gate, 'I6.6');
  assert.equal(c.historicalClosedGate, 'B4-007');
  assert.equal(c.status, 'PREVIEW_BUILD_REQUESTED', 'I66_QUOTA_RECOVERY_GATE_NOT_REQUESTED');
  for (const [key, value] of Object.entries({
    livePromotionAuthorized: false, previewApproved: false,
    forbidBackendFunctionDeploy: true, forbidBackendLiveFunctionDeploy: true,
    noHostingPromotion: true, forbidFirestoreRulesDataAuthWrites: true
  })) assert.equal(c[key], value, 'I66_QUOTA_RECOVERY_WRITE_BOUNDARY_DRIFT:' + key);
  assert.equal(a.status, 'CURRENT_LIVE_BACKED_SINGLE_PREVIEW_REUSE_AUTHORIZED');
  assert.equal(a.approvedByDirection, true, 'I66_QUOTA_RECOVERY_DIRECTION_AUTHORITY_MISSING');
  assert.equal(a.authorizedChannelId, CHANNEL);
  assert.equal(a.expectedPreviewUrl, PREVIEW);
  for (const key of ['noLiveChanges', 'noBusinessDataWrites', 'noChannelDeletion', 'stopOnIdentityDrift']) {
    assert.equal(a[key], true, 'I66_QUOTA_RECOVERY_SCOPE_DRIFT:' + key);
  }
  assert.match(current.sourceSha || '', /^[a-f0-9]{40}$/);
  assert.match(current.liveHostingVersion || '', /^sites\/ays-orbit-360-lab\/versions\/[a-zA-Z0-9_-]+$/);
  assert.match(current.artifactDigest || '', /^sha256:[a-f0-9]{64}$/);
  assert.match(current.status || '', /^PUBLISHED_EXACT_/);
  assert.ok(Number.isSafeInteger(current.previewRunId) && current.previewRunId > 0);
  assert.ok(Number.isSafeInteger(current.liveCloneRunId) && current.liveCloneRunId > 0);
  assert.ok(Number.isSafeInteger(current.artifactId) && current.artifactId > 0);
  assert.ok(Number.isSafeInteger(current.readbackEachOrigin) && current.readbackEachOrigin >= 200);
  assert.equal(a.expectedSourceSha, current.sourceSha, 'I66_QUOTA_RECOVERY_STALE_SOURCE');
  assert.equal(a.expectedHostingVersion, current.liveHostingVersion, 'I66_QUOTA_RECOVERY_STALE_VERSION');
  assert.equal(a.recoverableBuildRunId, current.previewRunId, 'I66_QUOTA_RECOVERY_STALE_BUILD');
  assert.equal(a.recoverableArtifactId, current.artifactId, 'I66_QUOTA_RECOVERY_STALE_ARTIFACT');
  assert.equal(a.recoverableArtifactDigest, current.artifactDigest, 'I66_QUOTA_RECOVERY_STALE_DIGEST');
  return { ...a, site: SITE, buildWorkflow: BUILD_WORKFLOW };
}

function validateChannels(control, inventory) {
  const a = validateAuthorization(control);
  const rows = Array.isArray(inventory?.result) ? inventory.result : inventory?.result?.channels;
  assert.ok(Array.isArray(rows), 'I66_REUSE_CHANNEL_INVENTORY_MISSING');
  const id = value => String(value.channelId || value.name || '').split('/').pop();
  const targets = rows.filter(row => id(row) === a.authorizedChannelId);
  const live = rows.filter(row => id(row) === 'live');
  assert.equal(targets.length, 1, 'I66_REUSE_EXACT_PREVIEW_NOT_UNIQUE');
  assert.equal(live.length, 1, 'I66_REUSE_LIVE_NOT_UNIQUE');
  for (const row of [targets[0], live[0]]) {
    // Firebase may return the same version with its exact project-qualified
    // resource name. Strip only this project's literal prefix, never arbitrary
    // project/site segments or just the final version ID.
    const name = String(row.release?.version?.name || '');
    const projectPrefix = 'projects/' + SITE + '/';
    const version = name.startsWith(projectPrefix) ? name.slice(projectPrefix.length) : name;
    assert.equal(version, a.expectedHostingVersion,
      'I66_REUSE_CURRENT_PREVIEW_OR_LIVE_VERSION_CHANGED_STOP');
  }
  assert.ok(String(targets[0].createTime || '').startsWith('2026-11-10T'),
    'I66_REUSE_KNOWN_PREVIEW_IDENTITY_CHANGED');
  return a;
}

function validateRecoverableArtifact(control, { buildRun, artifact, previewBuild, liveRun }) {
  const a = validateAuthorization(control);
  assert.equal(buildRun?.id, a.recoverableBuildRunId);
  assert.equal(buildRun?.head_sha, a.expectedSourceSha);
  assert.equal(buildRun?.conclusion, 'success');
  assert.equal(buildRun?.path, BUILD_WORKFLOW, 'I66_REUSE_BACKUP_BUILD_WORKFLOW_DRIFT');
  assert.equal(artifact?.id, a.recoverableArtifactId);
  assert.equal(artifact?.workflow_run?.id, a.recoverableBuildRunId);
  assert.equal(artifact?.workflow_run?.head_sha, a.expectedSourceSha);
  assert.equal(artifact?.digest, a.recoverableArtifactDigest);
  assert.equal(artifact?.expired, false);
  assert.equal(previewBuild?.sourceSha, a.expectedSourceSha);
  assert.equal(previewBuild?.gate, 'I6.6');
  assert.equal(liveRun?.id, control.currentExactHostingRelease.liveCloneRunId);
  assert.equal(liveRun?.conclusion, 'success', 'I66_REUSE_CURRENT_LIVE_NOT_ACCEPTED');
  return a;
}

module.exports = { validateAuthorization, validateChannels, validateRecoverableArtifact };

// Independent, exact current-task Preview rollover. The historical R11-backed
// authorization and validators above intentionally retain their behavior.
// This profile only prepares backups and verifies bytes; it never publishes,
// restores, deletes channels or calls any backend/data/identity endpoint.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const TECHNICAL_RECEIPT_PATH = 'artifacts/orbit360-recovery/release-control/I6_6_TECHNICAL_PREVIEW_ROLLOVER_CAUSAL_RETRY_20261116.json';
const TECHNICAL_RECEIPT_SHA256 = 'f0c17d2597caa8d83b281fa5b42d02016c6223035a34d894fc8e65bea687cd5d';
const TECHNICAL_CHANNEL = 'gi-i66-rc-44009981499';
const TECHNICAL_ORIGIN = 'https://ays-orbit-360-lab--gi-i66-rc-44009981499-d08psr2y.web.app';
const TECHNICAL_REPO = 'paulaosoriof86/orbit360-core';
const TECHNICAL_BRANCH = 'recovery/fase-a-clean-20260831';
const TECHNICAL_BASE = '3820817d8fcac86a99229cefdc46dfc03e1a8c36';
const TECHNICAL_OLD_SOURCE = TECHNICAL_BASE;
const TECHNICAL_OLD_BUILD = 44019383153;
const TECHNICAL_OLD_ARTIFACT = 14300731005;
const TECHNICAL_OLD_DIGEST = 'sha256:78aa4879a9836e1fe2e64d298833f36afb4a7a71a98ef4bdda0f9941d7b95fbb';
const TECHNICAL_RESIDUAL_EVIDENCE = 14300467008;
const TECHNICAL_RESIDUAL_DIGEST = 'sha256:9c0cacb543674cf2e222e1ffdf65cec0f0cadccbf7052ef4536b1a766f27e5ae';
const TECHNICAL_PRIOR_RECEIPT_SHA256 = 'db754d7a0b26f6396e4320c7d60e09c3aba608b5ad29a32abaf03fe3d8157fb7';
const TECHNICAL_LIVE_ORIGINS = Object.freeze(['https://ays-orbit-360-lab.web.app', 'https://app.aysseguros.com']);
const technicalSha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const technicalFail = (condition, code) => assert.ok(condition, 'I66_TECHNICAL_ROLLOVER_' + code);
const technicalDigest = value => {
  const result = String(value || '').replace(/^sha256:/, '');
  technicalFail(/^[a-f0-9]{64}$/.test(result), 'DIGEST_INVALID');
  return 'sha256:' + result;
};

function technicalRolloverCandidatePin() {
  return {
    receiptPath: TECHNICAL_RECEIPT_PATH, receiptSha256: TECHNICAL_RECEIPT_SHA256,
    channel: TECHNICAL_CHANNEL, origin: TECHNICAL_ORIGIN,
    previousSourceSha: TECHNICAL_OLD_SOURCE, previousArtifactId: TECHNICAL_OLD_ARTIFACT,
    previousArtifactDigest: TECHNICAL_OLD_DIGEST
  };
}

function validateTechnicalRolloverCandidate(p) {
  assert.deepEqual(p?.previewRollover, technicalRolloverCandidatePin(), 'I66_TECHNICAL_ROLLOVER_CANDIDATE_PIN_DRIFT');
  assert.equal(p.previewChannelId, TECHNICAL_CHANNEL, 'I66_TECHNICAL_ROLLOVER_CANDIDATE_CHANNEL_DRIFT');
  assert.equal(p.previewUrl, TECHNICAL_ORIGIN, 'I66_TECHNICAL_ROLLOVER_CANDIDATE_ORIGIN_DRIFT');
  technicalFail(/^[a-f0-9]{40}$/.test(p.sourceSha || '') && p.sourceSha !== TECHNICAL_OLD_SOURCE, 'NEW_SOURCE_REQUIRED');
  technicalFail(Number.isSafeInteger(p.buildRunId) && p.buildRunId > 0 && ![44009981499, TECHNICAL_OLD_BUILD].includes(p.buildRunId), 'NEW_BUILD_RUN_REQUIRED');
  return technicalRolloverCandidatePin();
}

function validateTechnicalAuthorization(control, receiptText) {
  technicalFail(typeof receiptText === 'string' && technicalSha(receiptText) === TECHNICAL_RECEIPT_SHA256, 'EXACT_RECEIPT_BYTES_REQUIRED');
  const a = JSON.parse(receiptText), c = control || {};
  assert.deepEqual(c.currentTechnicalPreviewRollover,
    { receiptPath: TECHNICAL_RECEIPT_PATH, receiptSha256: TECHNICAL_RECEIPT_SHA256 }, 'I66_TECHNICAL_ROLLOVER_CONTROL_PIN_DRIFT');
  assert.equal(c.schema, 'GRAVICENTRA_I6_6_SINGLE_ARTIFACT_RELEASE_TRANSPORT_V1');
  assert.equal(c.gate, 'I6.6'); assert.equal(c.historicalClosedGate, 'B4-007');
  assert.equal(c.status, 'PREVIEW_BUILD_REQUESTED', 'I66_TECHNICAL_ROLLOVER_BUILD_GATE_REQUIRED');
  for (const [key, value] of Object.entries({ livePromotionAuthorized: false, previewApproved: false,
    forbidBackendFunctionDeploy: true, forbidBackendLiveFunctionDeploy: true,
    noHostingPromotion: true, forbidFirestoreRulesDataAuthWrites: true }))
    assert.equal(c[key], value, 'I66_TECHNICAL_ROLLOVER_SCOPE_DRIFT_' + key);
  assert.equal(a.schema, 'GI_I66_CURRENT_TECHNICAL_PREVIEW_ROLLOVER_V1');
  assert.equal(a.executionAuthority.newLegalConsentGrantUsedForHosting, false);
  assert.equal(a.channel.id, TECHNICAL_CHANNEL); assert.equal(a.channel.origin, TECHNICAL_ORIGIN);
  assert.equal(a.sourceBaseHead, TECHNICAL_BASE);
  for (const value of Object.values(a.constraints)) assert.equal(value, true, 'I66_TECHNICAL_ROLLOVER_CONSTRAINT_REQUIRED');
  const current = c.currentExactHostingRelease || {}, live = a.protectedLive;
  for (const [field, expected] of Object.entries({ sourceSha: live.sourceSha, previewRunId: live.buildRunId,
    artifactId: live.artifactId, artifactDigest: live.artifactDigest, liveCloneRunId: live.liveRunId,
    liveHostingVersion: live.version, readbackEachOrigin: 223 }))
    assert.equal(current[field], expected, 'I66_TECHNICAL_ROLLOVER_LIVE_POINTER_DRIFT_' + field);
  technicalFail(/^PUBLISHED_EXACT_/.test(current.status || ''), 'ACCEPTED_LIVE_POINTER_REQUIRED');
  return a;
}

function technicalRows(inventory) {
  const rows = Array.isArray(inventory?.result) ? inventory.result : inventory?.result?.channels;
  technicalFail(Array.isArray(rows) && rows.length > 0, 'INVENTORY_MISSING');
  return rows;
}
const technicalChannelId = row => String(row.channelId || row.name || '').split('/').pop();
function technicalChannelIdentity(row) {
  const id = technicalChannelId(row);
  technicalFail(/^[A-Za-z0-9_-]+$/.test(id), 'CHANNEL_RESOURCE_DENIED');
  if (row.channelId !== undefined) assert.equal(row.channelId, id, 'I66_TECHNICAL_ROLLOVER_CHANNEL_ID_SCOPE_DENIED');
  if (row.name !== undefined) technicalFail([
    'sites/' + SITE + '/channels/' + id,
    'projects/' + SITE + '/sites/' + SITE + '/channels/' + id
  ].includes(row.name), 'CHANNEL_RESOURCE_SCOPE_DENIED');
  return id;
}
const technicalVersion = row => {
  const raw = String(row.release?.version?.name || ''), prefix = 'projects/' + SITE + '/';
  const version = raw.startsWith(prefix) ? raw.slice(prefix.length) : raw;
  technicalFail(/^sites\/ays-orbit-360-lab\/versions\/[a-zA-Z0-9_-]+$/.test(version), 'VERSION_SCOPE_DENIED');
  return version;
};
const technicalOrderedRows = inventory => technicalRows(inventory).slice().sort((a, b) => technicalChannelId(a).localeCompare(technicalChannelId(b)));

function validateTechnicalChannels(control, receiptText, inventory) {
  const a = validateTechnicalAuthorization(control, receiptText), rows = technicalRows(inventory);
  const ids = rows.map(technicalChannelIdentity);
  technicalFail(ids.every(Boolean) && new Set(ids).size === ids.length, 'DUPLICATE_OR_EMPTY_CHANNEL');
  assert.equal(rows.length, a.freshInventoryEvidence.totalChannels, 'I66_TECHNICAL_ROLLOVER_CHANNEL_COUNT_DRIFT');
  const target = rows.find(row => technicalChannelId(row) === TECHNICAL_CHANNEL);
  const live = rows.find(row => technicalChannelId(row) === 'live');
  technicalFail(target && live, 'REQUIRED_CHANNEL_MISSING');
  assert.equal(target.createTime, a.channel.createdAt, 'I66_TECHNICAL_ROLLOVER_CREATE_TIME_DRIFT');
  assert.equal(technicalVersion(target), a.channel.expectedVersion, 'I66_TECHNICAL_ROLLOVER_PREVIEW_VERSION_DRIFT');
  assert.equal(technicalVersion(live), a.protectedLive.version, 'I66_TECHNICAL_ROLLOVER_LIVE_VERSION_DRIFT');
  return a;
}

function validateTechnicalArtifact(run, artifact, expected, { currentBuild = false, residualBackupProof } = {}) {
  assert.equal(run?.id, expected.buildRunId, 'I66_TECHNICAL_ROLLOVER_BUILD_ID_DRIFT');
  assert.equal(run.head_sha, expected.sourceSha, 'I66_TECHNICAL_ROLLOVER_BUILD_SOURCE_DRIFT');
  assert.equal(run.head_branch, TECHNICAL_BRANCH, 'I66_TECHNICAL_ROLLOVER_BUILD_BRANCH_DRIFT');
  assert.equal(run.path, BUILD_WORKFLOW, 'I66_TECHNICAL_ROLLOVER_BUILD_WORKFLOW_DRIFT');
  if (currentBuild) {
    technicalFail(run.status === 'in_progress' && run.conclusion === null, 'CURRENT_BUILD_NOT_RUNNING');
  } else if (expected.backupOnlyPostDeployFailure) {
    // This is a recoverable residual Preview, never an accepted build. The
    // release-candidate validator still requires a wholly successful new run.
    assert.equal(expected.sourceSha, TECHNICAL_OLD_SOURCE);
    assert.equal(expected.buildRunId, TECHNICAL_OLD_BUILD);
    assert.equal(expected.artifactId, TECHNICAL_OLD_ARTIFACT);
    assert.equal(expected.artifactDigest, TECHNICAL_OLD_DIGEST);
    assert.equal(run.status, 'completed'); assert.equal(run.conclusion, 'failure');
    assert.deepEqual(residualBackupProof, technicalResidualProof(), 'I66_TECHNICAL_ROLLOVER_RESIDUAL_BACKUP_PROVENANCE_REQUIRED');
  } else {
    assert.equal(run.status, 'completed', 'I66_TECHNICAL_ROLLOVER_BACKUP_BUILD_INCOMPLETE');
    assert.equal(run.conclusion, 'success', 'I66_TECHNICAL_ROLLOVER_BACKUP_BUILD_NOT_SUCCESS');
  }
  if (expected.buildRunAttempt !== undefined)
    assert.equal(run.run_attempt, expected.buildRunAttempt, 'I66_TECHNICAL_ROLLOVER_BUILD_ATTEMPT_DRIFT');
  assert.equal(artifact?.id, expected.artifactId, 'I66_TECHNICAL_ROLLOVER_ARTIFACT_ID_DRIFT');
  assert.equal(artifact.name, 'gi-i66-immutable-' + expected.sourceSha, 'I66_TECHNICAL_ROLLOVER_ARTIFACT_NAME_DRIFT');
  assert.equal(artifact.digest, expected.artifactDigest, 'I66_TECHNICAL_ROLLOVER_ARTIFACT_DIGEST_DRIFT');
  assert.equal(artifact.expired, false, 'I66_TECHNICAL_ROLLOVER_ARTIFACT_EXPIRED');
  technicalFail(Number.isSafeInteger(artifact.size_in_bytes) && artifact.size_in_bytes > 0 && artifact.size_in_bytes < 50 * 1024 * 1024, 'ARTIFACT_SIZE_INVALID');
  assert.equal(artifact.workflow_run?.id, expected.buildRunId, 'I66_TECHNICAL_ROLLOVER_ARTIFACT_RUN_DRIFT');
  assert.equal(artifact.workflow_run?.head_sha, expected.sourceSha, 'I66_TECHNICAL_ROLLOVER_ARTIFACT_SOURCE_DRIFT');
  assert.equal(artifact.workflow_run?.head_branch, TECHNICAL_BRANCH, 'I66_TECHNICAL_ROLLOVER_ARTIFACT_BRANCH_DRIFT');
  return expected;
}

function technicalResidualProof() {
  return { purpose: 'RECOVERABLE_UNACCEPTED_PREVIEW_BACKUP_ONLY', sourceSha: TECHNICAL_OLD_SOURCE,
    buildRunId: TECHNICAL_OLD_BUILD, artifactId: TECHNICAL_OLD_ARTIFACT, artifactDigest: TECHNICAL_OLD_DIGEST,
    evidenceArtifactId: TECHNICAL_RESIDUAL_EVIDENCE, evidenceArtifactDigest: TECHNICAL_RESIDUAL_DIGEST,
    productAccepted: false, releaseEligible: false };
}

function validateTechnicalResidualBackup({ run, jobs, artifact, archiveDigest, before, after, inventorySha256, inventory }) {
  assert.equal(run.id, TECHNICAL_OLD_BUILD); assert.equal(run.run_attempt, 1);
  assert.equal(run.status, 'completed'); assert.equal(run.conclusion, 'failure');
  assert.equal(run.head_sha, TECHNICAL_OLD_SOURCE); assert.equal(run.head_branch, TECHNICAL_BRANCH);
  assert.equal(run.path, BUILD_WORKFLOW);
  assert.equal(artifact.id, TECHNICAL_RESIDUAL_EVIDENCE); assert.equal(artifact.expired, false);
  assert.equal(artifact.digest, TECHNICAL_RESIDUAL_DIGEST); assert.equal(archiveDigest, artifact.digest);
  assert.equal(artifact.name, 'gi-i66-technical-preview-rollover-' + TECHNICAL_OLD_BUILD);
  assert.equal(artifact.workflow_run?.id, TECHNICAL_OLD_BUILD);
  assert.equal(artifact.workflow_run?.head_sha, TECHNICAL_OLD_SOURCE);
  assert.equal(artifact.workflow_run?.head_branch, TECHNICAL_BRANCH);
  assert.equal(jobs.length, 3, 'I66_TECHNICAL_ROLLOVER_RESIDUAL_JOB_SET_DRIFT');
  const exactJobs = new Map(jobs.map(j => [j.name, j]));
  assert.equal(exactJobs.size, 3); assert.equal(exactJobs.get('gate')?.conclusion, 'success');
  assert.equal(exactJobs.get('protected-conciliaciones-reader-preview')?.conclusion, 'skipped');
  const job = exactJobs.get('immutable-package');
  assert.equal(job?.id, 133825035748); assert.equal(job.run_id, TECHNICAL_OLD_BUILD);
  assert.equal(job.status, 'completed'); assert.equal(job.conclusion, 'failure');
  const failed = job.steps.filter(s => s.conclusion === 'failure');
  assert.equal(failed.length, 1, 'I66_TECHNICAL_ROLLOVER_RESIDUAL_OTHER_FAILURE');
  assert.equal(failed[0].number, 13);
  assert.equal(failed[0].name, 'Verify current technical Preview rollover and preserve every other channel');
  for (const number of [1,2,3,4,5,6,7,8,9,10,11,12,14,28,29])
    assert.equal(job.steps.find(s => s.number === number)?.conclusion, 'success', 'I66_TECHNICAL_ROLLOVER_RESIDUAL_STEP_NOT_SUCCESS');
  for (const value of [before, after]) {
    assert.equal(value.channelId, TECHNICAL_CHANNEL); assert.equal(value.sourceSha, TECHNICAL_OLD_SOURCE);
    assert.equal(value.buildRunId, TECHNICAL_OLD_BUILD); assert.equal(value.receiptSha256, TECHNICAL_PRIOR_RECEIPT_SHA256);
    assert.equal(value.productAccepted, false);
    for (const key of ['liveWrites', 'backendWrites', 'businessDataWrites', 'channelDeletions', 'authRulesIamWrites']) assert.equal(value[key], 0);
  }
  assert.equal(before.schema, 'GI_I66_TECHNICAL_PREVIEW_BEFORE_V1');
  assert.equal(before.status, 'PREPARED_READONLY_NOT_ACCEPTED'); assert.equal(before.previewWrites, 0);
  assert.deepEqual(before.newCandidate, { sourceSha: TECHNICAL_OLD_SOURCE, buildRunId: TECHNICAL_OLD_BUILD,
    artifactId: TECHNICAL_OLD_ARTIFACT, artifactDigest: TECHNICAL_OLD_DIGEST });
  assert.equal(before.inventorySha256, '676b2c90bc876b223cd0b904c4b9caaaef4720be9bbbece3e4ce0d952ec87820');
  assert.equal(inventorySha256, before.inventorySha256);
  assert.equal(technicalRows(inventory).length, 51);
  assert.equal(after.schema, 'GI_I66_TECHNICAL_PREVIEW_AFTER_V1'); assert.equal(after.status, 'HOLD');
  assert.equal(after.failureCode, 'I66_TECHNICAL_ROLLOVER_RUNTIME_HOLD');
  assert.equal(after.readOnlyVerifierWrites, 0); assert.equal(after.signedFunctionalPass, false);
  assert.equal(after.hostingVersion, undefined); assert.equal(after.readbacks, undefined);
  return technicalResidualProof();
}

function technicalParseManifest(text) {
  const lines = String(text).trim().split(/\r?\n/), seen = new Set();
  assert.equal(lines.length, 223, 'I66_TECHNICAL_ROLLOVER_FILE_COUNT_DRIFT');
  const result = lines.map(line => {
    const match = line.match(/^([a-f0-9]{64})  ([A-Za-z0-9_./-]+)$/);
    technicalFail(match, 'MANIFEST_ENTRY_INVALID');
    const [, hash, relative] = match, segments = relative.split('/');
    technicalFail(!relative.startsWith('/') && segments.every(part => part && part !== '.' && part !== '..') && !seen.has(relative), 'MANIFEST_PATH_DENIED');
    seen.add(relative); return { hash, relative };
  });
  technicalFail(seen.has('__recovery__/build.json') && seen.has('index.html'), 'MANIFEST_ENTRYPOINT_OR_MARKER_MISSING');
  return result;
}

function technicalValidateMarker(marker, expected) {
  assert.equal(marker?.product, 'Gravicentra Insurance', 'I66_TECHNICAL_ROLLOVER_MARKER_PRODUCT_DRIFT');
  assert.equal(marker.gate, 'I6.6', 'I66_TECHNICAL_ROLLOVER_MARKER_GATE_DRIFT');
  assert.equal(marker.sourceSha, expected.sourceSha, 'I66_TECHNICAL_ROLLOVER_MARKER_SOURCE_DRIFT');
  technicalFail(typeof marker.buildId === 'string' && marker.buildId === marker.buildId.trim() &&
    new RegExp('^gi-i66-' + expected.sourceSha.slice(0, 12) + '-[0-9a-f]{12}$').test(marker.buildId), 'MARKER_BUILD_ID_DRIFT');
  return marker;
}

function technicalLoadBundle(dir, expected) {
  const site = path.join(dir, 'bundle/site');
  const text = fs.readFileSync(path.join(dir, 'evidence/site-manifest.sha256'), 'utf8');
  const manifest = technicalParseManifest(text);
  const actual = [];
  function walk(folder, relative = '') {
    for (const name of fs.readdirSync(folder)) {
      const target = path.join(folder, name), st = fs.lstatSync(target), rel = relative ? relative + '/' + name : name;
      technicalFail(!st.isSymbolicLink(), 'SITE_LINK_DENIED');
      if (st.isDirectory()) walk(target, rel);
      else { technicalFail(st.isFile(), 'SITE_NONFILE_DENIED'); actual.push(rel); }
    }
  }
  walk(site);
  assert.deepEqual(actual.sort(), manifest.map(x => x.relative).sort(), 'I66_TECHNICAL_ROLLOVER_MANIFEST_COVERAGE_DRIFT');
  for (const file of manifest)
    assert.equal(technicalSha(fs.readFileSync(path.join(site, file.relative))), file.hash, 'I66_TECHNICAL_ROLLOVER_LOCAL_FILE_BYTES_DRIFT');
  const marker = technicalValidateMarker(JSON.parse(fs.readFileSync(path.join(site, '__recovery__/build.json'), 'utf8')), expected);
  return { site, manifest, manifestSha256: technicalSha(text), marker };
}

function technicalEnvironment(env) {
  assert.equal(env.GITHUB_ACTIONS, 'true', 'I66_TECHNICAL_ROLLOVER_WORKFLOW_ONLY');
  assert.equal(env.GITHUB_REPOSITORY, TECHNICAL_REPO, 'I66_TECHNICAL_ROLLOVER_REPOSITORY_DENIED');
  assert.equal(env.GITHUB_REF, 'refs/heads/' + TECHNICAL_BRANCH, 'I66_TECHNICAL_ROLLOVER_BRANCH_DENIED');
  assert.equal(env.GITHUB_WORKFLOW, 'Gravicentra I6.6 Build Immutable Release Package', 'I66_TECHNICAL_ROLLOVER_WORKFLOW_DENIED');
  assert.equal(env.PROJECT_ID, SITE, 'I66_TECHNICAL_ROLLOVER_PROJECT_DENIED');
  technicalFail(env.RUNNER_TEMP && path.isAbsolute(env.RUNNER_TEMP), 'RUNNER_TEMP_REQUIRED');
  technicalFail(env.FIREBASE_CLI_BIN && path.isAbsolute(env.FIREBASE_CLI_BIN), 'PINNED_CLI_REQUIRED');
  technicalFail(/^[a-f0-9]{40}$/.test(env.SOURCE_SHA || '') && env.SOURCE_SHA !== TECHNICAL_OLD_SOURCE, 'SOURCE_INVALID');
  technicalFail(Number.isSafeInteger(Number(env.GITHUB_RUN_ID)) && Number(env.GITHUB_RUN_ID) > 0 && ![44009981499, TECHNICAL_OLD_BUILD].includes(Number(env.GITHUB_RUN_ID)), 'RUN_ID_INVALID');
  const repo = path.resolve(__dirname, '..');
  technicalFail(env.GITHUB_WORKSPACE && [path.resolve(env.GITHUB_WORKSPACE), path.resolve(env.GITHUB_WORKSPACE, 'candidate')].includes(repo), 'CHECKOUT_PATH_DRIFT');
  assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8', stdio: 'pipe' }).trim(), env.SOURCE_SHA, 'I66_TECHNICAL_ROLLOVER_CHECKOUT_SOURCE_DRIFT');
  execFileSync('git', ['merge-base', '--is-ancestor', TECHNICAL_BASE, env.SOURCE_SHA], { cwd: repo, stdio: 'pipe' });
  const receiptText = fs.readFileSync(path.join(repo, TECHNICAL_RECEIPT_PATH), 'utf8');
  const control = JSON.parse(fs.readFileSync(path.join(repo, 'artifacts/orbit360-recovery/release-control/I6_6_RELEASE_TRANSPORT_CONTROL_20261110.json'), 'utf8'));
  const authorization = validateTechnicalAuthorization(control, receiptText);
  return { repo, receiptText, control, authorization, root: path.join(env.RUNNER_TEMP, 'gi-i66-technical-preview-rollover') };
}

function technicalRuntimeIo(env, root) {
  const api = 'https://api.github.com/repos/' + TECHNICAL_REPO + '/actions/';
  const get = async (url, options = {}) => {
    const r = await fetch(url, { ...options, signal: AbortSignal.timeout(30000) });
    technicalFail(r.ok, 'READ_UNAVAILABLE'); return r;
  };
  const apiGet = suffix => {
    technicalFail(env.GH_TOKEN, 'CONFIGURED_GITHUB_CREDENTIAL_REQUIRED');
    return get(api + suffix, { headers: { Authorization: 'Bearer ' + env.GH_TOKEN, Accept: 'application/vnd.github+json', 'User-Agent': 'GI-I66-Technical-Preview-ReadOnly' } });
  };
  const json = async suffix => (await apiGet(suffix)).json();
  const io = {
    inventory() {
      // prepare inherits the deploy step's bundle cwd; finish runs in a new
      // workspace step. --project alone does not satisfy Firebase's requireConfig.
      // Both reads must select the SAME packaged config, independent of caller cwd.
      const bundle = path.join(env.RUNNER_TEMP, 'gi-i66-package', 'bundle');
      const config = path.join(bundle, 'firebase.json');
      let output;
      try {
        output = execFileSync(process.execPath, [env.FIREBASE_CLI_BIN, 'hosting:channel:list',
          '--config', config, '--project', SITE, '--site', SITE, '--non-interactive', '--json'],
        { cwd: bundle, encoding: 'utf8', stdio: 'pipe', maxBuffer: 5 * 1024 * 1024, timeout: 30000 });
      } catch (error) {
        // Closed diagnostic codes only: never emit CLI arguments, raw stdout,
        // stderr, credentials, or the original child-process Error object.
        const diagnostic = [error?.message, error?.stdout, error?.stderr]
          .map(value => typeof value === 'string' ? value.slice(0, 8192)
            : Buffer.isBuffer(value) ? value.toString('utf8', 0, 8192) : '').join('\n');
        const code = /Not in a Firebase project directory \(could not locate firebase\.json\)/i.test(diagnostic)
          ? 'INVENTORY_CONFIG_NOT_FOUND'
          : /Could not load config file/i.test(diagnostic) ? 'INVENTORY_CONFIG_UNAVAILABLE'
          : error?.code === 'ETIMEDOUT' ? 'INVENTORY_CLI_TIMEOUT'
          : error?.code === 'ENOENT' ? 'INVENTORY_CLI_UNAVAILABLE'
          : /HTTP Error:\s*(?:401|403)\b|permission denied|insufficient permissions/i.test(diagnostic)
            ? 'INVENTORY_ACCESS_DENIED' : 'INVENTORY_CLI_FAILED';
        throw new Error('I66_TECHNICAL_ROLLOVER_' + code);
      }
      let inventory;
      try { inventory = JSON.parse(output); }
      catch (_) { throw new Error('I66_TECHNICAL_ROLLOVER_INVENTORY_JSON_INVALID'); }
      technicalFail(inventory && inventory.status !== 'error', 'INVENTORY_CLI_ERROR_RESULT');
      return inventory;
    },
    async metadata(expected, options = {}) {
      const runPath = 'runs/' + expected.buildRunId + (expected.buildRunAttempt ? '/attempts/' + expected.buildRunAttempt : '');
      const [run, artifact] = await Promise.all([json(runPath), json('artifacts/' + expected.artifactId)]);
      let residualBackupProof, residualInventory;
      if (expected.backupOnlyPostDeployFailure) {
        technicalFail(!options.currentBuild, 'RESIDUAL_BACKUP_CANNOT_BE_NEW_BUILD');
        assert.equal(expected.buildRunId, TECHNICAL_OLD_BUILD);
        assert.equal(expected.sourceSha, TECHNICAL_OLD_SOURCE);
        const [jobData, evidenceArtifact] = await Promise.all([
          json('runs/' + TECHNICAL_OLD_BUILD + '/attempts/1/jobs?per_page=100'),
          json('artifacts/' + TECHNICAL_RESIDUAL_EVIDENCE)
        ]);
        technicalFail(Number.isSafeInteger(evidenceArtifact.size_in_bytes) && evidenceArtifact.size_in_bytes > 0 && evidenceArtifact.size_in_bytes < 50 * 1024 * 1024, 'RESIDUAL_EVIDENCE_SIZE_INVALID');
        const bytes = Buffer.from(await (await apiGet('artifacts/' + TECHNICAL_RESIDUAL_EVIDENCE + '/zip')).arrayBuffer());
        assert.equal(bytes.length, evidenceArtifact.size_in_bytes);
        const archiveDigest = 'sha256:' + technicalSha(bytes);
        assert.equal(archiveDigest, TECHNICAL_RESIDUAL_DIGEST, 'I66_TECHNICAL_ROLLOVER_RESIDUAL_EVIDENCE_BYTES_DRIFT');
        const dir = path.join(root, 'prior-finish-hold'); fs.mkdirSync(dir, { mode: 0o700 });
        const zip = path.join(dir, 'verified-evidence.zip'); fs.writeFileSync(zip, bytes, { flag: 'wx', mode: 0o600 });
        const names = execFileSync('unzip', ['-Z1', zip], { encoding: 'utf8', stdio: 'pipe', maxBuffer: 1024 * 1024 }).trim().split(/\r?\n/);
        const entries = {};
        for (const name of ['before.json', 'after.json', 'inventory-before.json']) {
          assert.equal(names.filter(n => n === name).length, 1, 'I66_TECHNICAL_ROLLOVER_RESIDUAL_ENTRY_NOT_UNIQUE');
          entries[name] = execFileSync('unzip', ['-p', zip, name], { encoding: 'utf8', stdio: 'pipe', maxBuffer: 5 * 1024 * 1024 });
        }
        assert.equal(names.includes('inventory-after.json'), false);
        residualBackupProof = validateTechnicalResidualBackup({ run, jobs: jobData.jobs, artifact: evidenceArtifact,
          archiveDigest, before: JSON.parse(entries['before.json']), after: JSON.parse(entries['after.json']),
          inventorySha256: technicalSha(entries['inventory-before.json']), inventory: JSON.parse(entries['inventory-before.json']) });
        residualInventory = JSON.parse(entries['inventory-before.json']);
        technicalWriteJson(path.join(dir, 'backup-only-proof.json'), residualBackupProof);
      }
      validateTechnicalArtifact(run, artifact, expected, { ...options, residualBackupProof });
      return { run, artifact, residualBackupProof, residualInventory };
    },
    async backup(expected, label, artifact) {
      const bytes = Buffer.from(await (await apiGet('artifacts/' + expected.artifactId + '/zip')).arrayBuffer());
      assert.equal(bytes.length, artifact.size_in_bytes, 'I66_TECHNICAL_ROLLOVER_ZIP_SIZE_DRIFT');
      assert.equal('sha256:' + technicalSha(bytes), expected.artifactDigest, 'I66_TECHNICAL_ROLLOVER_ZIP_DIGEST_DRIFT');
      const dir = path.join(root, label); fs.mkdirSync(dir, { mode: 0o700 });
      const zip = path.join(dir, 'verified-backup.zip'); fs.writeFileSync(zip, bytes, { flag: 'wx', mode: 0o600 });
      const entries = execFileSync('unzip', ['-Z1', zip], { encoding: 'utf8', stdio: 'pipe' }).trim().split(/\r?\n/).sort();
      assert.deepEqual(entries, ['gi-i66-exact-package.sha256', 'gi-i66-exact-package.tar.gz'], 'I66_TECHNICAL_ROLLOVER_ZIP_ENTRIES_DENIED');
      for (const entry of entries) fs.writeFileSync(path.join(dir, entry), execFileSync('unzip', ['-p', zip, entry], { stdio: 'pipe', maxBuffer: 50 * 1024 * 1024 }), { flag: 'wx', mode: 0o600 });
      const tar = path.join(dir, 'gi-i66-exact-package.tar.gz');
      const sum = fs.readFileSync(path.join(dir, 'gi-i66-exact-package.sha256'), 'utf8').match(/^([a-f0-9]{64})\s+[^\r\n]+\r?\n?$/)?.[1];
      technicalFail(sum && technicalSha(fs.readFileSync(tar)) === sum, 'TAR_DIGEST_DRIFT');
      const listing = execFileSync('tar', ['-tzf', tar], { encoding: 'utf8', stdio: 'pipe', maxBuffer: 1024 * 1024 }).trim().split(/\r?\n/);
      technicalFail(listing.length > 223 && listing.length < 2000 && listing.every(p => /^(?:bundle|evidence)(?:\/[A-Za-z0-9_.-]+)*\/?$/.test(p) && !p.split('/').some(x => x === '.' || x === '..')), 'TAR_PATH_DENIED');
      technicalFail(new Set(listing.map(p => p.replace(/\/$/, ''))).size === listing.length, 'TAR_DUPLICATE_DENIED');
      const types = execFileSync('tar', ['-tvzf', tar], { encoding: 'utf8', stdio: 'pipe', maxBuffer: 1024 * 1024 }).trim().split(/\r?\n/);
      technicalFail(types.length === listing.length && types.every(line => /^[d-]/.test(line)), 'TAR_LINK_DENIED');
      execFileSync('tar', ['-xzf', tar, '--no-same-owner', '--no-same-permissions', '-C', dir], { stdio: 'pipe' });
      return { ...technicalLoadBundle(dir, expected), zipSha256: technicalSha(bytes), tarSha256: sum, artifactId: expected.artifactId };
    },
    async readback(origin, bundle) {
      technicalFail([TECHNICAL_ORIGIN, ...TECHNICAL_LIVE_ORIGINS].includes(origin), 'READBACK_ORIGIN_DENIED');
      for (let i = 0; i < bundle.manifest.length; i += 8) await Promise.all(bundle.manifest.slice(i, i + 8).map(async file => {
        const response = await get(origin + '/' + file.relative, { redirect: 'error', headers: { 'cache-control': 'no-cache' } });
        assert.equal(technicalSha(Buffer.from(await response.arrayBuffer())), file.hash, 'I66_TECHNICAL_ROLLOVER_HOSTED_BYTES_DRIFT');
      }));
      return { origin, files: 223, manifestSha256: bundle.manifestSha256, marker: bundle.marker };
    },
    async validateAcceptedLive(a) {
      const run = await json('runs/' + a.protectedLive.liveRunId);
      assert.equal(run.id, a.protectedLive.liveRunId);
      assert.equal(run.head_branch, TECHNICAL_BRANCH);
      assert.equal(run.path, '.github/workflows/gravicentra-i66-r11-renewal-drive-frontend-exact-live-promotion.yml');
      assert.equal(run.status, 'completed'); assert.equal(run.conclusion, 'success', 'I66_TECHNICAL_ROLLOVER_LIVE_ACCEPTANCE_MISSING');
    }
  };
  return io;
}

const technicalSafeFailure = error => String(error?.message || '').match(/I66_TECHNICAL_ROLLOVER_[A-Z_]+/)?.[0] || 'I66_TECHNICAL_ROLLOVER_RUNTIME_HOLD';
const technicalWriteJson = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });

async function runtimePrepareTechnicalRollover(env = process.env) {
  const { receiptText, control, authorization: a, root } = technicalEnvironment(env);
  const failure = fs.readFileSync(path.join(env.RUNNER_TEMP, 'gi-i66-preview-result.json'), 'utf8');
  technicalFail(/HTTP Error:\s*429[^\r\n]*channel quota/i.test(failure), 'EXACT_NEW_CHANNEL_QUOTA_FAILURE_REQUIRED');
  const expectedNew = { sourceSha: env.SOURCE_SHA, buildRunId: Number(env.GITHUB_RUN_ID), artifactId: Number(env.ARTIFACT_ID), artifactDigest: technicalDigest(env.ARTIFACT_DIGEST) };
  technicalFail(Number.isSafeInteger(expectedNew.artifactId) && expectedNew.artifactId > 0 && ![a.previousCandidate.artifactId, a.protectedLive.artifactId].includes(expectedNew.artifactId), 'NEW_ARTIFACT_REQUIRED');
  fs.mkdirSync(root, { mode: 0o700 }); // Never overwrite a prior prepare or silently retry.
  const report = { schema: 'GI_I66_TECHNICAL_PREVIEW_BEFORE_V1', status: 'HOLD', channelId: TECHNICAL_CHANNEL,
    receiptPath: TECHNICAL_RECEIPT_PATH, receiptSha256: TECHNICAL_RECEIPT_SHA256, sourceSha: env.SOURCE_SHA,
    buildRunId: Number(env.GITHUB_RUN_ID), newCandidate: expectedNew, previewWrites: 0, liveWrites: 0,
    backendWrites: 0, businessDataWrites: 0, channelDeletions: 0, authRulesIamWrites: 0, productAccepted: false, checks: [] };
  const io = technicalRuntimeIo(env, root);
  try {
    const initial = io.inventory(); validateTechnicalChannels(control, receiptText, initial);
    report.totalChannels = technicalRows(initial).length;
    const initialText = JSON.stringify(initial, null, 2) + '\n';
    fs.writeFileSync(path.join(root, 'inventory-before.json'), initialText, { flag: 'wx', mode: 0o600 });
    report.inventorySha256 = technicalSha(initialText);
    const [oldMeta, liveMeta, newMeta] = await Promise.all([io.metadata(a.previousCandidate), io.metadata(a.protectedLive), io.metadata(expectedNew, { currentBuild: true })]);
    if (oldMeta.residualInventory) {
      const untouched = value => technicalOrderedRows(value).filter(row => technicalChannelId(row) !== TECHNICAL_CHANNEL);
      assert.deepEqual(untouched(initial), untouched(oldMeta.residualInventory), 'I66_TECHNICAL_ROLLOVER_RESIDUAL_OTHER_CHANNEL_DRIFT');
      report.previousCandidateBackupOnly = oldMeta.residualBackupProof;
    }
    await io.validateAcceptedLive(a);
    const previous = await io.backup(a.previousCandidate, 'previous-preview', oldMeta.artifact);
    const live = await io.backup(a.protectedLive, 'protected-live', liveMeta.artifact);
    const next = await io.backup(expectedNew, 'new-candidate', newMeta.artifact);
    const local = technicalLoadBundle(path.join(env.RUNNER_TEMP, 'gi-i66-package'), expectedNew);
    assert.deepEqual(local.manifest, next.manifest, 'I66_TECHNICAL_ROLLOVER_NEW_PACKAGE_MANIFEST_DRIFT');
    assert.deepEqual(local.marker, next.marker, 'I66_TECHNICAL_ROLLOVER_NEW_PACKAGE_MARKER_DRIFT');
    assert.equal(technicalSha(fs.readFileSync(path.join(env.RUNNER_TEMP, 'gi-i66-exact-package.tar.gz'))), next.tarSha256, 'I66_TECHNICAL_ROLLOVER_NEW_PACKAGE_ARCHIVE_DRIFT');
    report.backups = { previous: { artifactId: previous.artifactId, zipSha256: previous.zipSha256, tarSha256: previous.tarSha256, marker: previous.marker },
      live: { artifactId: live.artifactId, zipSha256: live.zipSha256, tarSha256: live.tarSha256, marker: live.marker },
      next: { artifactId: next.artifactId, zipSha256: next.zipSha256, tarSha256: next.tarSha256, marker: next.marker } };
    report.readbacks = [await io.readback(TECHNICAL_ORIGIN, previous)];
    for (const origin of TECHNICAL_LIVE_ORIGINS) report.readbacks.push(await io.readback(origin, live));
    const fresh = io.inventory(); validateTechnicalChannels(control, receiptText, fresh);
    assert.deepEqual(technicalOrderedRows(fresh), technicalOrderedRows(initial), 'I66_TECHNICAL_ROLLOVER_CONCURRENT_BEFORE_CHANGE');
    report.checks = ['EXACT_AUTHORITY_AND_QUOTA', 'PREVIOUS_LIVE_AND_NEW_ARCHIVES_DIGEST_VERIFIED', 'PREVIOUS_AND_DUAL_LIVE_223_FILES_EACH_EXACT', 'NEW_LOCAL_PACKAGE_EQUALS_UPLOADED_ARCHIVE', 'FRESH_INVENTORY_UNCHANGED'];
    report.status = 'PREPARED_READONLY_NOT_ACCEPTED'; report.recordedAtUtc = new Date().toISOString();
  } catch (error) { report.failureCode = technicalSafeFailure(error); throw error; }
  finally { technicalWriteJson(path.join(root, 'before.json'), report); }
  console.log('I66_TECHNICAL_PREVIEW_ROLLOVER_PREPARED_READONLY channel=' + TECHNICAL_CHANNEL + ' total=' + report.totalChannels + ' writes=0');
  return report;
}

async function runtimeFinishTechnicalRollover(env = process.env) {
  const { receiptText, control, authorization: a, root } = technicalEnvironment(env);
  assert.equal(env.PREVIEW_CHANNEL, TECHNICAL_CHANNEL, 'I66_TECHNICAL_ROLLOVER_FINISH_CHANNEL_DRIFT');
  assert.equal(env.PREVIEW_URL, TECHNICAL_ORIGIN, 'I66_TECHNICAL_ROLLOVER_FINISH_ORIGIN_DRIFT');
  const before = JSON.parse(fs.readFileSync(path.join(root, 'before.json'), 'utf8'));
  assert.equal(before.status, 'PREPARED_READONLY_NOT_ACCEPTED', 'I66_TECHNICAL_ROLLOVER_PREPARE_NOT_PROVEN');
  assert.equal(before.receiptSha256, TECHNICAL_RECEIPT_SHA256); assert.equal(before.sourceSha, env.SOURCE_SHA);
  assert.equal(before.buildRunId, Number(env.GITHUB_RUN_ID)); assert.equal(before.channelId, TECHNICAL_CHANNEL);
  const initialText = fs.readFileSync(path.join(root, 'inventory-before.json'), 'utf8');
  assert.equal(technicalSha(initialText), before.inventorySha256, 'I66_TECHNICAL_ROLLOVER_BEFORE_INVENTORY_BYTES_DRIFT');
  const initial = JSON.parse(initialText); validateTechnicalChannels(control, receiptText, initial);
  const expectedNew = before.newCandidate;
  assert.equal(expectedNew.sourceSha, env.SOURCE_SHA); assert.equal(expectedNew.buildRunId, Number(env.GITHUB_RUN_ID));
  for (const [label, expected] of [['previous-preview', a.previousCandidate], ['protected-live', a.protectedLive], ['new-candidate', expectedNew]])
    assert.equal('sha256:' + technicalSha(fs.readFileSync(path.join(root, label, 'verified-backup.zip'))), expected.artifactDigest, 'I66_TECHNICAL_ROLLOVER_SAVED_BACKUP_BYTES_DRIFT');
  const live = technicalLoadBundle(path.join(root, 'protected-live'), a.protectedLive), next = technicalLoadBundle(path.join(root, 'new-candidate'), expectedNew);
  const local = technicalLoadBundle(path.join(env.RUNNER_TEMP, 'gi-i66-package'), expectedNew);
  assert.deepEqual(local.manifest, next.manifest, 'I66_TECHNICAL_ROLLOVER_POST_NEW_PACKAGE_DRIFT');
  const report = { schema: 'GI_I66_TECHNICAL_PREVIEW_AFTER_V1', status: 'HOLD', channelId: TECHNICAL_CHANNEL,
    sourceSha: env.SOURCE_SHA, receiptSha256: TECHNICAL_RECEIPT_SHA256, buildRunId: Number(env.GITHUB_RUN_ID),
    readOnlyVerifierWrites: 0, liveWrites: 0, backendWrites: 0, businessDataWrites: 0, channelDeletions: 0,
    authRulesIamWrites: 0, productAccepted: false, signedFunctionalPass: false };
  const io = technicalRuntimeIo(env, root);
  try {
    const after = io.inventory(), rows = technicalRows(after), target = rows.filter(row => technicalChannelIdentity(row) === TECHNICAL_CHANNEL);
    assert.equal(rows.length, technicalRows(initial).length, 'I66_TECHNICAL_ROLLOVER_AFTER_CHANNEL_COUNT_DRIFT');
    assert.equal(target.length, 1, 'I66_TECHNICAL_ROLLOVER_AFTER_TARGET_NOT_UNIQUE');
    assert.equal(target[0].createTime, a.channel.createdAt, 'I66_TECHNICAL_ROLLOVER_AFTER_CREATED_AT_DRIFT');
    const untouched = inventory => technicalOrderedRows(inventory).filter(row => technicalChannelId(row) !== TECHNICAL_CHANNEL);
    assert.deepEqual(untouched(after), untouched(initial), 'I66_TECHNICAL_ROLLOVER_OTHER_CHANNEL_CHANGED');
    technicalFail(technicalVersion(target[0]) !== a.channel.expectedVersion, 'NEW_PREVIEW_VERSION_NOT_VISIBLE');
    report.readbacks = [await io.readback(TECHNICAL_ORIGIN, next)];
    for (const origin of TECHNICAL_LIVE_ORIGINS) report.readbacks.push(await io.readback(origin, live));
    const finalInventory = io.inventory();
    assert.deepEqual(technicalOrderedRows(finalInventory), technicalOrderedRows(after), 'I66_TECHNICAL_ROLLOVER_CONCURRENT_AFTER_CHANGE');
    technicalWriteJson(path.join(root, 'inventory-after.json'), finalInventory);
    report.hostingVersion = technicalVersion(target[0]); report.totalChannels = rows.length;
    report.newArtifactId = expectedNew.artifactId; report.newArtifactDigest = expectedNew.artifactDigest;
    report.inventorySha256 = technicalSha(fs.readFileSync(path.join(root, 'inventory-after.json')));
    report.status = 'EXACT_PREVIEW_REPLACEMENT_READBACK_PASS_NOT_FUNCTIONAL_ACCEPTANCE'; report.recordedAtUtc = new Date().toISOString();
  } catch (error) { report.failureCode = technicalSafeFailure(error); throw error; }
  finally { technicalWriteJson(path.join(root, 'after.json'), report); }
  console.log('I66_TECHNICAL_PREVIEW_ROLLOVER_AFTER_EXACT_223_DUAL_LIVE_UNCHANGED_NO_OTHER_CHANNEL_CHANGES');
  return report;
}

module.exports.technicalRolloverCandidatePin = technicalRolloverCandidatePin;
module.exports.validateTechnicalRolloverCandidate = validateTechnicalRolloverCandidate;
module.exports.technicalRollover = Object.freeze({
  validateAuthorization: validateTechnicalAuthorization, validateChannels: validateTechnicalChannels,
  validateArtifact: validateTechnicalArtifact, validateCandidateReuse: validateTechnicalRolloverCandidate,
  validateResidualBackup: validateTechnicalResidualBackup,
  parseManifest: technicalParseManifest, validateMarker: technicalValidateMarker,
  runtimePrepare: runtimePrepareTechnicalRollover, runtimeFinish: runtimeFinishTechnicalRollover
});
if (require.main === module) {
  const command = process.argv.slice(2);
  technicalFail(command.length === 1 && ['--prepare-technical-rollover', '--finish-technical-rollover'].includes(command[0]), 'CLI_MODE_DENIED');
  const run = command[0] === '--prepare-technical-rollover' ? runtimePrepareTechnicalRollover : runtimeFinishTechnicalRollover;
  run().catch(error => { console.error(technicalSafeFailure(error)); process.exitCode = 1; });
}
