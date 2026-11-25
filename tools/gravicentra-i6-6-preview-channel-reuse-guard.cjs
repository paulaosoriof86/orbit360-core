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
const TECHNICAL_RECEIPT_PATH = 'artifacts/orbit360-recovery/release-control/I6_6_TECHNICAL_PREVIEW_NETWORK_DIAGNOSTIC_REBUILD_20261117.json';
const TECHNICAL_RECEIPT_SHA256 = '42b558b0720fdb5d8c8a907a8ed5415cb769232e2409efbb4dde9fdaef724c04';
const TECHNICAL_CHANNEL = 'gi-i66-rc-44009981499';
const TECHNICAL_ORIGIN = 'https://ays-orbit-360-lab--gi-i66-rc-44009981499-d08psr2y.web.app';
const TECHNICAL_REPO = 'paulaosoriof86/orbit360-core';
const TECHNICAL_BRANCH = 'recovery/fase-a-clean-20260831';
const TECHNICAL_BASE = '181264419c614c9a8a0843fc834a95542e0f297a';
// Back up the exact 62d500 Preview before its passive network diagnostic successor.
// Its signed QA remained HOLD; exact Hosting bytes are not functional acceptance.
const TECHNICAL_PREVIOUS_SOURCE = '62d50052a9b9196ebce8c4acd1bc66778ae89c06';
const TECHNICAL_PREVIOUS_BUILD = 44173813709;
const TECHNICAL_PREVIOUS_ARTIFACT = 14369500963;
const TECHNICAL_PREVIOUS_DIGEST = 'sha256:e31583c35aa76e2fcd904ffd1caa61bf589c9ada9acc4dd307a30e731e814c81';
// Historical failed-residual exception remains byte/identity scoped to 382.
// It is not activated by the current successful-package backup.
const TECHNICAL_OLD_SOURCE = '3820817d8fcac86a99229cefdc46dfc03e1a8c36';
const TECHNICAL_OLD_BUILD = 44019383153;
const TECHNICAL_OLD_ARTIFACT = 14300731005;
const TECHNICAL_OLD_DIGEST = 'sha256:78aa4879a9836e1fe2e64d298833f36afb4a7a71a98ef4bdda0f9941d7b95fbb';
const TECHNICAL_RESIDUAL_EVIDENCE = 14300467008;
const TECHNICAL_RESIDUAL_DIGEST = 'sha256:9c0cacb543674cf2e222e1ffdf65cec0f0cadccbf7052ef4536b1a766f27e5ae';
const TECHNICAL_PRIOR_RECEIPT_SHA256 = 'db754d7a0b26f6396e4320c7d60e09c3aba608b5ad29a32abaf03fe3d8157fb7';
const TECHNICAL_LIVE_ORIGINS = Object.freeze(['https://ays-orbit-360-lab.web.app', 'https://app.aysseguros.com']);
// Closed successor of the current physical release. Historical R11 and
// network-diagnostic profiles retain their original pins and 223-file contract.
const PHYSICAL_RECEIPT_PATH = 'artifacts/orbit360-recovery/release-control/I6_6_CURRENT_PHYSICAL_PREVIEW_V27_RESIDUAL_ROLLOVER_V3_20261124.json';
const PHYSICAL_RECEIPT_SHA256 = 'adb38e8b94c32ab83cb447c9cfeb9c14f86cd88f2e26c34326d2ced37e373df7';
const PHYSICAL_PROFILE = 'I66_CURRENT_PHYSICAL_E3_PREVIEW_V27_RESIDUAL_SUCCESSOR_V3';
const PHYSICAL_BASE = 'fbe7f289ce60cb3a8232d9c5886441c180cb72d4';
const PHYSICAL_CHANNEL = 'gi-i66-rc-45448470011';
const PHYSICAL_ORIGIN = 'https://ays-orbit-360-lab--gi-i66-rc-45448470011-hrham9ah.web.app';
const PHYSICAL_PREVIOUS_SOURCE = 'fbe7f289ce60cb3a8232d9c5886441c180cb72d4';
const PHYSICAL_PREVIOUS_BUILD = 45460310493;
const PHYSICAL_PREVIOUS_ARTIFACT = 14950444825;
const PHYSICAL_PREVIOUS_DIGEST = 'sha256:dcfcd046d203c5ec9c2c8f59f798acf9483fbdbf6cd692fe9766f0088b53d87e';
// V4 backs up the wholly successful v28 immutable build. V3 remains an
// independently closed historical profile, including its exact failed27 proof.
const PHYSICAL_V4_RECEIPT_PATH = 'artifacts/orbit360-recovery/release-control/I6_6_CURRENT_PHYSICAL_PREVIEW_V28_ROLLOVER_V4_20261124.json';
const PHYSICAL_V4_RECEIPT_SHA256 = 'dd56c0a2a9ea19e261da36f53a62b3b7a29fbf7a9a54f20ad24dfa24d505c971';
const PHYSICAL_V4_PROFILE = 'I66_CURRENT_PHYSICAL_E3_PREVIEW_V28_SUCCESSOR_V4';
const PHYSICAL_V4_SOURCE = '74ae28c6e6e6b40f845567c9b00738a58307b3cb';
const PHYSICAL_V4_BUILD = 45464287026;
const PHYSICAL_V4_ARTIFACT = 14953553588;
const PHYSICAL_V4_DIGEST = 'sha256:8dae2c413cc774be504e3aa224b4333e2968c176fc74116c6c5f42c0a6a46290';
// One independently observed settlement of V28's output-only statistics. This
// source pin is not a generic exclusion of fileCount/versionBytes from identity.
const PHYSICAL_V4_STATISTICS_RECEIPT = 'artifacts/orbit360-recovery/release-control/I6_6_V4_OBSERVED_PREVIEW_STATISTICS_CAUSAL_SOURCE_20261125.json';
const PHYSICAL_V4_STATISTICS_SHA256 = '596a1b80bbf82b7e56dcfd4809942e25cc6bbedce2fecfa477833e92a2b636c2';
const PHYSICAL_V4_STATISTICS_BLOB = '2057d981ce6c71650ebae491d6b85a179e5baea3';
const isPhysicalProfile = a => [PHYSICAL_PROFILE, PHYSICAL_V4_PROFILE].includes(a?.profile);
const PHYSICAL_LIVE_SOURCE = '65c825b2808a615ca4195bdde6689dbdbe3193b2';
const PHYSICAL_LIVE_WORKFLOW = '.github/workflows/gravicentra-i66-privileged-role-exact-live-promotion.yml';
const technicalSha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const technicalFail = (condition, code) => assert.ok(condition, 'I66_TECHNICAL_ROLLOVER_' + code);
const technicalDigest = value => {
  const result = String(value || '').replace(/^sha256:/, '');
  technicalFail(/^[a-f0-9]{64}$/.test(result), 'DIGEST_INVALID');
  return 'sha256:' + result;
};

function readV4StatisticsEvidence(readText = relative => fs.readFileSync(path.join(__dirname, '..', relative), 'utf8')) {
  const text = readText(PHYSICAL_V4_STATISTICS_RECEIPT), bytes = Buffer.from(text);
  assert.equal(technicalSha(bytes), PHYSICAL_V4_STATISTICS_SHA256, 'I66_TECHNICAL_ROLLOVER_STATISTICS_RECEIPT_SHA_DRIFT');
  assert.equal(crypto.createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex'),
    PHYSICAL_V4_STATISTICS_BLOB, 'I66_TECHNICAL_ROLLOVER_STATISTICS_RECEIPT_BLOB_DRIFT');
  const receipt = JSON.parse(text), failure = receipt.failedBuild31;
  assert.equal(receipt.schema, 'GI_I66_V4_EXACT_OUTPUT_STATISTICS_SETTLEMENT_V1');
  const failureText = readText(failure.receiptPath), failureBytes = Buffer.from(failureText);
  assert.equal(technicalSha(failureBytes), failure.receiptSha256, 'I66_TECHNICAL_ROLLOVER_STATISTICS_FAILURE_RECEIPT_SHA_DRIFT');
  assert.equal(crypto.createHash('sha1').update('blob ' + failureBytes.length + '\0').update(failureBytes).digest('hex'),
    failure.receiptGitBlobSha, 'I66_TECHNICAL_ROLLOVER_STATISTICS_FAILURE_RECEIPT_BLOB_DRIFT');
  return receipt;
}

function technicalRolloverCandidatePin() {
  return {
    receiptPath: TECHNICAL_RECEIPT_PATH, receiptSha256: TECHNICAL_RECEIPT_SHA256,
    channel: TECHNICAL_CHANNEL, origin: TECHNICAL_ORIGIN,
    previousSourceSha: TECHNICAL_PREVIOUS_SOURCE, previousArtifactId: TECHNICAL_PREVIOUS_ARTIFACT,
    previousArtifactDigest: TECHNICAL_PREVIOUS_DIGEST
  };
}

function residualPhysicalRolloverCandidatePin() {
  return {
    receiptPath: PHYSICAL_RECEIPT_PATH, receiptSha256: PHYSICAL_RECEIPT_SHA256,
    channel: PHYSICAL_CHANNEL, origin: PHYSICAL_ORIGIN,
    previousSourceSha: PHYSICAL_PREVIOUS_SOURCE, previousArtifactId: PHYSICAL_PREVIOUS_ARTIFACT,
    previousArtifactDigest: PHYSICAL_PREVIOUS_DIGEST
  };
}

function currentPhysicalRolloverCandidatePin() {
  return {
    receiptPath: PHYSICAL_V4_RECEIPT_PATH, receiptSha256: PHYSICAL_V4_RECEIPT_SHA256,
    channel: PHYSICAL_CHANNEL, origin: PHYSICAL_ORIGIN,
    previousSourceSha: PHYSICAL_V4_SOURCE, previousArtifactId: PHYSICAL_V4_ARTIFACT,
    previousArtifactDigest: PHYSICAL_V4_DIGEST
  };
}

function physicalReleaseProfile(pin) {
  const current = pin?.receiptPath === PHYSICAL_V4_RECEIPT_PATH;
  if (!current && pin?.receiptPath !== PHYSICAL_RECEIPT_PATH) return null;
  const candidatePin = current ? currentPhysicalRolloverCandidatePin() : residualPhysicalRolloverCandidatePin();
  return { ...candidatePin, candidatePin, sourceBaseHead: current ? PHYSICAL_V4_SOURCE : PHYSICAL_BASE,
    profileName: current ? PHYSICAL_V4_PROFILE : PHYSICAL_PROFILE, requestVersion: current ? 29 : 28,
    previousBuildRunId: current ? PHYSICAL_V4_BUILD : PHYSICAL_PREVIOUS_BUILD,
    residualPreviousBuild: !current, expectedSiteFileCount: 224,
    deniedSources: [...(current ? [PHYSICAL_V4_SOURCE] : []), PHYSICAL_BASE, 'cb3b8f5d505a53bfbafca80a9334d873d712d73e',
      '478c045c168c2e1b80f28a94094f4dbbbfdf1f81', '60ac1ae2d765484ed40c820a942dcc0966385da7',
      PHYSICAL_PREVIOUS_SOURCE, PHYSICAL_LIVE_SOURCE],
    deniedBuilds: [...(current ? [PHYSICAL_V4_BUILD] : []), 45460310493, 45458031865, 45452721643, 45448470011,
      PHYSICAL_PREVIOUS_BUILD, 45287432665] };
}

function technicalProfile(pin) {
  return physicalReleaseProfile(pin) || {
    ...technicalRolloverCandidatePin(), sourceBaseHead: TECHNICAL_BASE, expectedSiteFileCount: 223,
    deniedSources: [TECHNICAL_OLD_SOURCE, TECHNICAL_PREVIOUS_SOURCE],
    deniedBuilds: [44009981499, TECHNICAL_OLD_BUILD, TECHNICAL_PREVIOUS_BUILD] };
}

function validateTechnicalRolloverCandidate(p) {
  const profile = physicalReleaseProfile(p?.previewRollover);
  if (profile) {
    assert.deepEqual(p.previewRollover, profile.candidatePin, 'I66_TECHNICAL_ROLLOVER_CANDIDATE_PIN_DRIFT');
    assert.equal(p.previewChannelId, profile.channel, 'I66_TECHNICAL_ROLLOVER_CANDIDATE_CHANNEL_DRIFT');
    assert.equal(p.previewUrl, profile.origin, 'I66_TECHNICAL_ROLLOVER_CANDIDATE_ORIGIN_DRIFT');
    technicalFail(/^[a-f0-9]{40}$/.test(p.sourceSha || '') && !profile.deniedSources.includes(p.sourceSha), 'NEW_SOURCE_REQUIRED');
    technicalFail(Number.isSafeInteger(p.buildRunId) && p.buildRunId > 0 && !profile.deniedBuilds.includes(p.buildRunId), 'NEW_BUILD_RUN_REQUIRED');
    return profile.candidatePin;
  }
  assert.deepEqual(p?.previewRollover, technicalRolloverCandidatePin(), 'I66_TECHNICAL_ROLLOVER_CANDIDATE_PIN_DRIFT');
  assert.equal(p.previewChannelId, TECHNICAL_CHANNEL, 'I66_TECHNICAL_ROLLOVER_CANDIDATE_CHANNEL_DRIFT');
  assert.equal(p.previewUrl, TECHNICAL_ORIGIN, 'I66_TECHNICAL_ROLLOVER_CANDIDATE_ORIGIN_DRIFT');
  technicalFail(/^[a-f0-9]{40}$/.test(p.sourceSha || '') && ![TECHNICAL_OLD_SOURCE, TECHNICAL_PREVIOUS_SOURCE].includes(p.sourceSha), 'NEW_SOURCE_REQUIRED');
  technicalFail(Number.isSafeInteger(p.buildRunId) && p.buildRunId > 0 && ![44009981499, TECHNICAL_OLD_BUILD, TECHNICAL_PREVIOUS_BUILD].includes(p.buildRunId), 'NEW_BUILD_RUN_REQUIRED');
  return technicalRolloverCandidatePin();
}

function validateTechnicalAuthorization(control, receiptText, retryIo) {
  if (physicalReleaseProfile(control?.currentTechnicalPreviewRollover) ||
      (typeof receiptText === 'string' && [PHYSICAL_RECEIPT_SHA256, PHYSICAL_V4_RECEIPT_SHA256].includes(technicalSha(receiptText))))
    return validatePhysicalAuthorization(control, receiptText, retryIo);
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

// V4's first request is 29. A failed build may advance that same request only
// through the already recorded, contiguous history; it does not grant a new
// channel, product delta, backend scope or acceptance to a failed artifact.
function validatePhysicalRetryChain(control, profile, suppliedIo = {}) {
  const request = control.frontendPreviewRequest, first = profile.requestVersion;
  const version = request?.version, attempts = control.failedImmutableBuildAttempts || [];
  technicalFail(Number.isSafeInteger(version) && version >= first && Array.isArray(attempts), 'SUCCESSOR_REQUEST_REQUIRED');
  technicalFail(!attempts.some(row => row.version >= version), 'FAILED_REQUEST_REPLAY');
  if (version === first) return;
  const failures = attempts.filter(row => row.version >= first);
  technicalFail(failures.length === version - first &&
    new Set(failures.map(row => row.version)).size === failures.length, 'SUCCESSOR_REQUEST_REQUIRED');
  const repo = path.resolve(__dirname, '..');
  const git = suppliedIo.git || ((...args) => execFileSync('git', args,
    { cwd: repo, encoding: 'utf8', stdio: 'pipe', maxBuffer: 5 * 1024 * 1024 }).trim());
  const readText = suppliedIo.readText || (relative => fs.readFileSync(path.join(repo, relative), 'utf8'));
  const transportPath = 'artifacts/orbit360-recovery/release-control/I6_6_RELEASE_TRANSPORT_CONTROL_20261110.json';
  const roots = ['orbit360-platform', 'functions', 'firebase.json', 'storage.rules', 'firestore.rules',
    'database.rules.json', 'tools/gravicentra-i6-1-preview-package.mjs',
    ':(exclude)orbit360-platform/docs/recovery/orbit360-recovery-state-v1.json'];
  const scope = original => {
    const result = structuredClone(original);
    // These fields are recertified by the existing source/build admission gate.
    // Financial/cancellation QA receipts may be resealed without product edits.
    for (const key of ['version', 'sourceQaHead', 'manifestBlob', 'sourceQaRunId', 'guardRunId',
      'releaseMechanismSourceSha', 'reason']) delete result[key];
    for (const key of ['financialRecovery', 'financialRecoveryQa', 'cancellationRecovery', 'cancellationRecoveryQa'])
      if (result[key]) delete result[key].receiptBlob;
    return result;
  };
  technicalFail(/^[a-f0-9]{40}$/.test(request.sourceQaHead || ''), 'RETRY_SOURCE_QA_REQUIRED');
  git('merge-base', '--is-ancestor', request.sourceQaHead, 'HEAD');
  git('diff', '--quiet', request.sourceQaHead, 'HEAD', '--', ...roots);
  const usedSources = new Set(), usedRuns = new Set();
  let lastFailureSource;
  for (let previous = first; previous < version; previous++) {
    const keys = Object.keys(control).filter(key => new RegExp('^priorFrontendPreviewRequestBeforeV' +
      (previous + 1) + '_[0-9]{8}$').test(key));
    technicalFail(keys.length === 1 && control[keys[0]]?.version === previous, 'RETRY_HISTORY_REQUIRED');
    const archived = control[keys[0]], failed = failures.find(row => row.version === previous);
    technicalFail(failed && /^[a-f0-9]{40}$/.test(failed.sourceSha || '') &&
      Number.isSafeInteger(failed.runId) && failed.runId > 0 &&
      Number.isSafeInteger(failed.attempt) && failed.attempt > 0, 'RETRY_FAILURE_IDENTITY_REQUIRED');
    technicalFail(!usedSources.has(failed.sourceSha) && !usedRuns.has(failed.runId), 'RETRY_FAILURE_REPLAY');
    usedSources.add(failed.sourceSha); usedRuns.add(failed.runId);
    const pin = failed.receipt || {};
    technicalFail(/^artifacts\/orbit360-recovery\/release-control\/I6_6_[A-Z0-9_]+\.json$/.test(pin.path || '') &&
      /^[a-f0-9]{40}$/.test(pin.gitBlobSha || '') && /^[a-f0-9]{64}$/.test(pin.sha256 || ''), 'RETRY_FAILURE_PIN_REQUIRED');
    const text = readText(pin.path), bytes = Buffer.from(text);
    assert.equal(technicalSha(bytes), pin.sha256, 'I66_TECHNICAL_ROLLOVER_RETRY_RECEIPT_SHA_DRIFT');
    assert.equal(crypto.createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex'),
      pin.gitBlobSha, 'I66_TECHNICAL_ROLLOVER_RETRY_RECEIPT_BLOB_DRIFT');
    const receipt = JSON.parse(text);
    for (const [key, expected] of Object.entries({ gate: 'I6.6', requestVersion: previous,
      sourceSha: failed.sourceSha, buildRunId: failed.runId, attempt: failed.attempt, conclusion: 'failure',
      hostingDeployments: 0, backendDeployments: 0, realDataWrites: 0,
      acceptedPhysicalLiveUnchanged: true, acceptedGeneration: 'E3', fullI66ProductionAccepted: false }))
      assert.equal(receipt[key], expected, 'I66_TECHNICAL_ROLLOVER_RETRY_FAILURE_FACT_DRIFT_' + key);
    technicalFail(/^[a-f0-9]{64}$/.test(receipt.logEvidence?.sha256 || ''), 'RETRY_FAILURE_LOG_REQUIRED');
    const knownInventoryFailure = previous === 31 || receipt.failureCode === 'I66_TECHNICAL_ROLLOVER_AUTHORIZED_INVENTORY_DRIFT';
    if (knownInventoryFailure) {
      const exact = readV4StatisticsEvidence(readText).failedBuild31;
      assert.deepEqual(pin, { path: exact.receiptPath, gitBlobSha: exact.receiptGitBlobSha, sha256: exact.receiptSha256 },
        'I66_TECHNICAL_ROLLOVER_RETRY_EXACT_INVENTORY_FAILURE_REQUIRED');
      assert.deepEqual([previous, failed.sourceSha, failed.runId, failed.attempt, receipt.jobId, receipt.failureCode, failed.status],
        [exact.requestVersion, exact.sourceSha, exact.buildRunId, exact.attempt, exact.jobId, exact.failureCode, 'FAILED_BEFORE_PREVIEW_OVERWRITE'],
        'I66_TECHNICAL_ROLLOVER_RETRY_INVENTORY_FAILURE_IDENTITY_DRIFT');
    }
    if (failed.status === 'FAILED_BEFORE_PACKAGE') {
      assert.equal(failed.artifactCreated, false, 'I66_TECHNICAL_ROLLOVER_RETRY_ARTIFACT_FACT_DRIFT');
      assert.equal(receipt.schema, 'GI_I66_PREPACKAGE_QA_FAILURE_V1');
      assert.equal(receipt.status, 'FAILED_BEFORE_ARTIFACT_OR_DEPLOY');
      assert.equal(receipt.artifacts, 0); assert.equal(receipt.build29Artifact, null);
    } else {
      assert.equal(failed.status, 'FAILED_BEFORE_PREVIEW_OVERWRITE', 'I66_TECHNICAL_ROLLOVER_RETRY_FAILURE_PHASE_DENIED');
      assert.equal(failed.artifactCreated, true, 'I66_TECHNICAL_ROLLOVER_RETRY_ARTIFACT_FACT_DRIFT');
      assert.equal(receipt.schema, 'GI_I66_ROLLOVER_PREOVERWRITE_FAILURE_V1');
      assert.equal(receipt.status, 'FAILED_AFTER_ARTIFACT_BEFORE_PREVIEW_OVERWRITE');
      if (!knownInventoryFailure) assert.equal(receipt.failureCode, 'I66_TECHNICAL_ROLLOVER_SUCCESSOR_REQUEST_REQUIRED');
      assert.equal(receipt.previewOverwriteStarted, false, 'I66_TECHNICAL_ROLLOVER_RETRY_PREVIEW_OVERWRITE_DENIED');
      assert.equal(receipt.exactReadbackCompleted, false, 'I66_TECHNICAL_ROLLOVER_RETRY_COMPLETED_READBACK_DENIED');
      assert.equal(receipt.artifacts, 1);
      technicalFail(Number.isSafeInteger(receipt.artifact?.id) && receipt.artifact.id > 0 &&
        /^sha256:[a-f0-9]{64}$/.test(receipt.artifact?.digest || ''), 'RETRY_FAILED_ARTIFACT_IDENTITY_REQUIRED');
      assert.deepEqual(receipt.rolloverReceipt,
        { path: profile.receiptPath, sha256: profile.receiptSha256 }, 'I66_TECHNICAL_ROLLOVER_RETRY_PHYSICAL_RECEIPT_DRIFT');
    }
    const sourceControl = JSON.parse(git('show', failed.sourceSha + ':' + transportPath));
    assert.deepEqual(archived, sourceControl.frontendPreviewRequest, 'I66_TECHNICAL_ROLLOVER_RETRY_ARCHIVED_REQUEST_DRIFT');
    assert.deepEqual(sourceControl.currentTechnicalPreviewRollover, control.currentTechnicalPreviewRollover,
      'I66_TECHNICAL_ROLLOVER_RETRY_ROLLOVER_SCOPE_DRIFT');
    assert.deepEqual(sourceControl.currentPhysicalHostingRelease, control.currentPhysicalHostingRelease,
      'I66_TECHNICAL_ROLLOVER_RETRY_LIVE_POINTER_DRIFT');
    assert.deepEqual(scope(archived), scope(request), 'I66_TECHNICAL_ROLLOVER_RETRY_REQUEST_SCOPE_DRIFT');
    if (lastFailureSource) git('merge-base', '--is-ancestor', lastFailureSource, failed.sourceSha);
    git('merge-base', '--is-ancestor', failed.sourceSha, request.sourceQaHead);
    git('diff', '--quiet', failed.sourceSha, request.sourceQaHead, '--', ...roots);
    lastFailureSource = failed.sourceSha;
  }
}

function validatePhysicalAuthorization(control, receiptText, retryIo) {
  const profile = physicalReleaseProfile(control?.currentTechnicalPreviewRollover);
  technicalFail(profile && typeof receiptText === 'string' && technicalSha(receiptText) === profile.receiptSha256, 'EXACT_RECEIPT_BYTES_REQUIRED');
  const a = JSON.parse(receiptText), c = control || {};
  assert.deepEqual(c.currentTechnicalPreviewRollover,
    { receiptPath: profile.receiptPath, receiptSha256: profile.receiptSha256 }, 'I66_TECHNICAL_ROLLOVER_CONTROL_PIN_DRIFT');
  assert.equal(c.schema, 'GRAVICENTRA_I6_6_SINGLE_ARTIFACT_RELEASE_TRANSPORT_V1');
  assert.equal(c.gate, 'I6.6'); assert.equal(c.historicalClosedGate, 'B4-007');
  assert.equal(c.status, 'OPERATIONAL_EXACT_LIVE_ACCEPTED_LOCKED', 'I66_TECHNICAL_ROLLOVER_PHYSICAL_GATE_REQUIRED');
  const request = c.frontendPreviewRequest;
  if (profile.profileName === PHYSICAL_V4_PROFILE) validatePhysicalRetryChain(c, profile, retryIo);
  else assert.equal(request?.version, profile.requestVersion, 'I66_TECHNICAL_ROLLOVER_SUCCESSOR_REQUEST_REQUIRED');
  assert.equal(request.mode, 'A13_A14_BALANCE_COMPOSITE_ARTIFACT_HOSTING_PREVIEW_ONLY');
  assert.equal(request.previousReceiptBlob, '11fdb3bee494541513482666d6215f45cbad0567');
  for (const key of ['realDataWritesAllowed', 'realCustomerWritesAllowed', 'liveDeployAuthorized',
    'releaseAfterPreviewAllowed', 'backendLiveDeployAllowed'])
    assert.equal(request[key], false, 'I66_TECHNICAL_ROLLOVER_SUCCESSOR_SCOPE_DRIFT_' + key);
  for (const [key, value] of Object.entries({ livePromotionAuthorized: false, previewApproved: false,
    forbidBackendFunctionDeploy: true, backendFunctionPreviewOnly: false, forbidBackendLiveFunctionDeploy: true,
    noHostingPromotion: true, forbidFirestoreRulesDataAuthWrites: true }))
    assert.equal(c[key], value, 'I66_TECHNICAL_ROLLOVER_SCOPE_DRIFT_' + key);
  assert.equal(c.scopedBackendPreviewI66, undefined, 'I66_TECHNICAL_ROLLOVER_PENDING_BACKEND_AUTHORITY');
  assert.equal(c.operationalReleaseCandidate, undefined, 'I66_TECHNICAL_ROLLOVER_PENDING_LIVE_AUTHORITY');
  assert.equal(a.schema, 'GI_I66_CURRENT_TECHNICAL_PREVIEW_ROLLOVER_V1');
  assert.equal(a.profile, profile.profileName); assert.equal(a.phase, 'PREVIEW');
  assert.equal(a.sourceBaseHead, profile.sourceBaseHead);
  assert.equal(a.channel.id, PHYSICAL_CHANNEL); assert.equal(a.channel.origin, PHYSICAL_ORIGIN);
  assert.equal(a.executionAuthority.newLegalConsentGrantUsedForHosting, false);
  for (const value of Object.values(a.constraints)) assert.equal(value, true, 'I66_TECHNICAL_ROLLOVER_CONSTRAINT_REQUIRED');
  const current = c.currentPhysicalHostingRelease || {}, live = a.protectedLive;
  for (const [field, expected] of Object.entries({ sourceSha: live.sourceSha, previewRunId: live.buildRunId,
    artifactId: live.artifactId, artifactDigest: live.artifactDigest, liveCloneRunId: live.liveRunId,
    liveHostingVersion: live.version, readbackEachOrigin: 224, receipt: live.receiptPath,
    status: 'COMPOSITE_LIVE_SIGNED_UI_VERIFIED', scope: 'COMPOSITE', backendFunctionsChanged: 4 }))
    assert.equal(current[field], expected, 'I66_TECHNICAL_ROLLOVER_PHYSICAL_LIVE_POINTER_DRIFT_' + field);
  assert.equal(live.sourceSha, PHYSICAL_LIVE_SOURCE); assert.equal(live.expectedSiteFileCount, 224);
  assert.equal(live.liveWorkflowPath, PHYSICAL_LIVE_WORKFLOW);
  assert.deepEqual(live.origins, TECHNICAL_LIVE_ORIGINS);
  assert.equal(a.previousCandidate.sourceSha, profile.previousSourceSha);
  assert.equal(a.previousCandidate.buildRunId, profile.previousBuildRunId);
  assert.equal(a.previousCandidate.artifactId, profile.previousArtifactId);
  assert.equal(a.previousCandidate.artifactDigest, profile.previousArtifactDigest);
  assert.equal(a.previousCandidate.expectedSiteFileCount, 224);
  if (profile.residualPreviousBuild) {
    assert.equal(a.previousCandidate.backupOnlyPostDeployFailure.purpose, 'RECOVERABLE_UNACCEPTED_PREVIEW_BACKUP_ONLY');
    assert.equal(a.previousCandidate.backupOnlyPostDeployFailure.neverEligibleForLive, true);
    assert.equal(a.previousCandidate.backupOnlyPostDeployFailure.buildConclusionMustRemainFailure, true);
  } else {
    assert.equal(a.previousCandidate.backupOnlyPostDeployFailure, undefined);
    assert.equal(a.previousCandidate.buildRunAttempt, 1);
    assert.equal(a.previousCandidate.wholeBuildConclusionRequired, 'success');
    assert.equal(a.previousCandidate.purpose, 'RECOVERABLE_UNACCEPTED_PREVIEW_BACKUP_ONLY');
    assert.equal(a.previousCandidate.productAccepted, false);
    assert.equal(a.previousCandidate.releaseEligibleByThisReceipt, false);
  }
  assert.equal(a.expectedNewSiteFileCount, 224);
  return a;
}

function technicalRows(inventory) {
  const rows = Array.isArray(inventory?.result) ? inventory.result : inventory?.result?.channels;
  technicalFail(Array.isArray(rows) && rows.length > 0, 'INVENTORY_MISSING');
  technicalFail((!inventory.status || inventory.status === 'success') && !inventory.error && !inventory.result?.error &&
    !inventory.errors?.length && !inventory.result?.errors?.length, 'INVENTORY_API_ERROR');
  technicalFail(!inventory.nextPageToken && !inventory.result?.nextPageToken, 'INVENTORY_PAGINATION_INCOMPLETE');
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
const technicalCanonical = value => Array.isArray(value) ? value.map(technicalCanonical)
  : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, technicalCanonical(value[key])])) : value;
const technicalInventoryDigest = inventory => technicalSha(JSON.stringify(technicalCanonical(technicalOrderedRows(inventory))));

// The caller supplies only the receipt whose bytes were source-pinned above.
// Even the observed settled digest must reduce to the COMPLETE original digest
// after removing exactly these two target fields. Inputs remain unchanged.
function validateObservedV4Statistics(inventory, evidence, receipt) {
  assert.deepEqual(evidence, receipt.baselineEvidence, 'I66_TECHNICAL_ROLLOVER_STATISTICS_BASELINE_EVIDENCE_DRIFT');
  assert.equal(technicalInventoryDigest(inventory), receipt.observed.orderedChannelMetadataSha256,
    'I66_TECHNICAL_ROLLOVER_UNOBSERVED_INVENTORY_DRIFT');
  const copy = structuredClone(inventory), rows = technicalRows(copy);
  const targets = rows.filter(row => technicalChannelIdentity(row) === receipt.target.channelId);
  assert.equal(targets.length, 1, 'I66_TECHNICAL_ROLLOVER_STATISTICS_TARGET_NOT_UNIQUE');
  const target = targets[0], version = target.release?.version;
  assert.equal(technicalVersion(target), receipt.target.version, 'I66_TECHNICAL_ROLLOVER_STATISTICS_VERSION_DRIFT');
  assert.equal(version?.status, 'FINALIZED', 'I66_TECHNICAL_ROLLOVER_STATISTICS_TARGET_NOT_FINALIZED');
  for (const key of ['fileCount', 'versionBytes']) {
    assert.equal(version[key], receipt.transition.after[key], 'I66_TECHNICAL_ROLLOVER_UNOBSERVED_STATISTIC_' + key);
    delete version[key];
  }
  assert.equal(technicalInventoryDigest(copy), evidence.orderedChannelMetadataSha256,
    'I66_TECHNICAL_ROLLOVER_STATISTICS_NORMALIZED_BASELINE_DRIFT');
  return true;
}

function validateTechnicalInventoryPreimage(inventory, evidence) {
  technicalFail((!inventory.status || inventory.status === 'success') && !inventory.error &&
    !inventory.result?.error, 'INVENTORY_API_ERROR');
  technicalFail(!inventory.nextPageToken && !inventory.result?.nextPageToken, 'INVENTORY_PAGINATION_INCOMPLETE');
  const rows = technicalRows(inventory), ids = rows.map(technicalChannelIdentity);
  technicalFail(new Set(ids).size === ids.length, 'DUPLICATE_OR_EMPTY_CHANNEL');
  assert.equal(rows.length, evidence.totalChannels, 'I66_TECHNICAL_ROLLOVER_CHANNEL_COUNT_DRIFT');
  const actual = technicalInventoryDigest(inventory);
  if (actual !== evidence.orderedChannelMetadataSha256 &&
      evidence.orderedChannelMetadataSha256 === 'cb29e689c3908709a446817a26dd6e56eba608f977295946732621c137ddc6f8')
    return validateObservedV4Statistics(inventory, evidence, readV4StatisticsEvidence());
  assert.equal(actual, evidence.orderedChannelMetadataSha256, 'I66_TECHNICAL_ROLLOVER_AUTHORIZED_INVENTORY_DRIFT');
  return true;
}

function validateTechnicalChannels(control, receiptText, inventory) {
  const a = validateTechnicalAuthorization(control, receiptText), rows = technicalRows(inventory);
  const ids = rows.map(technicalChannelIdentity);
  technicalFail(ids.every(Boolean) && new Set(ids).size === ids.length, 'DUPLICATE_OR_EMPTY_CHANNEL');
  assert.equal(rows.length, a.freshInventoryEvidence.totalChannels, 'I66_TECHNICAL_ROLLOVER_CHANNEL_COUNT_DRIFT');
  const target = rows.find(row => technicalChannelId(row) === a.channel.id);
  const live = rows.find(row => technicalChannelId(row) === 'live');
  technicalFail(target && live, 'REQUIRED_CHANNEL_MISSING');
  assert.equal(target.createTime, a.channel.createdAt, 'I66_TECHNICAL_ROLLOVER_CREATE_TIME_DRIFT');
  assert.equal(technicalVersion(target), a.channel.expectedVersion, 'I66_TECHNICAL_ROLLOVER_PREVIEW_VERSION_DRIFT');
  assert.equal(technicalVersion(live), a.protectedLive.version, 'I66_TECHNICAL_ROLLOVER_LIVE_VERSION_DRIFT');
  if (isPhysicalProfile(a)) {
    validateTechnicalInventoryPreimage(inventory, a.freshInventoryEvidence);
    technicalFail(Number.isFinite(Date.parse(target.expireTime || target.expirationTime)) &&
      Date.parse(target.expireTime || target.expirationTime) > Date.now(), 'PREVIOUS_PREVIEW_EXPIRED');
  }
  return a;
}

function technicalMetadataDifferences(first, final) {
  const changes = [];
  function walk(a, b, location) {
    if (JSON.stringify(technicalCanonical(a)) === JSON.stringify(technicalCanonical(b))) return;
    const objects = value => value && typeof value === 'object' && !Array.isArray(value);
    if (objects(a) && objects(b)) {
      for (const key of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort())
        walk(a[key], b[key], location + '/' + key.replace(/~/g, '~0').replace(/\//g, '~1'));
      return;
    }
    const hash = value => technicalSha(JSON.stringify(value === undefined ? { present: false } : { present: true, value: technicalCanonical(value) }));
    changes.push({ path: location, beforeSha256: hash(a), afterSha256: hash(b) });
  }
  const byId = value => Object.fromEntries(technicalRows(value).map(row => [technicalChannelId(row), row]));
  walk(byId(first), byId(final), '/channels');
  return changes;
}

// Firebase Version documents fileCount/versionBytes as output-only int64 values
// computed after FINALIZED. Only those two fields in the exact target may settle;
// version/release/config/identity and every field of every other channel remain exact.
// https://firebase.google.com/docs/reference/hosting/rest/v1beta1/sites.versions
function validateTechnicalAfterInventories(initial, first, final, authorization) {
  const a = authorization;
  technicalFail(isPhysicalProfile(a), 'AFTER_PROFILE_DENIED');
  const inventories = [initial, first, final], selections = [];
  for (const inventory of inventories) {
    const rows = technicalRows(inventory), ids = rows.map(technicalChannelIdentity);
    assert.equal(new Set(ids).size, ids.length, 'I66_TECHNICAL_ROLLOVER_DUPLICATE_OR_EMPTY_CHANNEL');
    assert.equal(rows.length, a.freshInventoryEvidence.totalChannels, 'I66_TECHNICAL_ROLLOVER_AFTER_CHANNEL_COUNT_DRIFT');
    const target = rows.filter(row => technicalChannelId(row) === a.channel.id);
    assert.equal(target.length, 1, 'I66_TECHNICAL_ROLLOVER_AFTER_TARGET_NOT_UNIQUE');
    assert.equal(target[0].createTime, a.channel.createdAt, 'I66_TECHNICAL_ROLLOVER_AFTER_CREATED_AT_DRIFT');
    selections.push(target[0]);
  }
  const untouched = inventory => technicalOrderedRows(inventory).filter(row => technicalChannelId(row) !== a.channel.id);
  for (const inventory of [first, final])
    assert.deepEqual(untouched(inventory), untouched(initial), 'I66_TECHNICAL_ROLLOVER_OTHER_CHANNEL_CHANGED');
  const [oldTarget, firstTarget, finalTarget] = selections;
  assert.equal(technicalVersion(oldTarget), a.channel.expectedVersion, 'I66_TECHNICAL_ROLLOVER_PREVIEW_VERSION_DRIFT');
  technicalFail(technicalVersion(firstTarget) !== a.channel.expectedVersion, 'NEW_PREVIEW_VERSION_NOT_VISIBLE');
  const statisticKeys = ['fileCount', 'versionBytes'];
  for (const target of [firstTarget, finalTarget]) {
    assert.equal(target.release?.version?.status, 'FINALIZED', 'I66_TECHNICAL_ROLLOVER_TARGET_NOT_FINALIZED');
    for (const key of statisticKeys) {
      const value = target.release.version[key];
      if (value === undefined) continue;
      technicalFail(typeof value === 'string' && /^(?:0|[1-9][0-9]*)$/.test(value) &&
        BigInt(value) <= 9223372036854775807n, 'VERSION_STATISTIC_INT64_INVALID');
    }
  }
  const contentIdentity = target => {
    const copy = structuredClone(target);
    for (const key of statisticKeys) delete copy.release.version[key];
    return copy;
  };
  assert.deepEqual(contentIdentity(finalTarget), contentIdentity(firstTarget),
    'I66_TECHNICAL_ROLLOVER_TARGET_CONTENT_IDENTITY_CHANGED');
  const statisticsTransitions = [];
  for (const key of statisticKeys) {
    const beforeValue = firstTarget.release.version[key], afterValue = finalTarget.release.version[key];
    if (beforeValue === afterValue) continue;
    const observed = value => value === undefined ? { present: false } : { present: true, value };
    statisticsTransitions.push({ path: 'release.version.' + key, before: observed(beforeValue), after: observed(afterValue) });
  }
  return { otherChannelsUnchanged: a.freshInventoryEvidence.totalChannels - 1,
    targetVersion: technicalVersion(finalTarget), statisticsTransitions };
}

function validateTechnicalArtifact(run, artifact, expected, { currentBuild = false, residualBackupProof } = {}) {
  assert.equal(run?.id, expected.buildRunId, 'I66_TECHNICAL_ROLLOVER_BUILD_ID_DRIFT');
  assert.equal(run.head_sha, expected.sourceSha, 'I66_TECHNICAL_ROLLOVER_BUILD_SOURCE_DRIFT');
  assert.equal(run.head_branch, TECHNICAL_BRANCH, 'I66_TECHNICAL_ROLLOVER_BUILD_BRANCH_DRIFT');
  assert.equal(run.path, BUILD_WORKFLOW, 'I66_TECHNICAL_ROLLOVER_BUILD_WORKFLOW_DRIFT');
  if (currentBuild) {
    technicalFail(!expected.backupOnlyPostDeployFailure, 'RESIDUAL_BACKUP_CANNOT_BE_NEW_BUILD');
    technicalFail(run.status === 'in_progress' && run.conclusion === null, 'CURRENT_BUILD_NOT_RUNNING');
  } else if (expected.backupOnlyPostDeployFailure && expected.sourceSha === PHYSICAL_PREVIOUS_SOURCE) {
    assert.equal(expected.buildRunId, PHYSICAL_PREVIOUS_BUILD);
    assert.equal(expected.artifactId, PHYSICAL_PREVIOUS_ARTIFACT);
    assert.equal(expected.artifactDigest, PHYSICAL_PREVIOUS_DIGEST);
    assert.equal(run.status, 'completed'); assert.equal(run.conclusion, 'failure');
    assert.deepEqual(residualBackupProof, physicalResidualProof(), 'I66_TECHNICAL_ROLLOVER_RESIDUAL_BACKUP_PROVENANCE_REQUIRED');
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

function physicalResidualDefinition() {
  const bytes = fs.readFileSync(path.join(__dirname, '..', PHYSICAL_RECEIPT_PATH));
  assert.equal(technicalSha(bytes), PHYSICAL_RECEIPT_SHA256, 'I66_TECHNICAL_ROLLOVER_EXACT_RECEIPT_BYTES_REQUIRED');
  return JSON.parse(bytes).previousCandidate;
}
function physicalResidualProof() {
  const p = physicalResidualDefinition(), boundary = p.backupOnlyPostDeployFailure;
  return { purpose: 'RECOVERABLE_UNACCEPTED_PREVIEW_BACKUP_ONLY', sourceSha: PHYSICAL_PREVIOUS_SOURCE,
    buildRunId: PHYSICAL_PREVIOUS_BUILD, artifactId: PHYSICAL_PREVIOUS_ARTIFACT, artifactDigest: PHYSICAL_PREVIOUS_DIGEST,
    evidenceArtifactId: boundary.evidenceArtifactId, evidenceArtifactDigest: boundary.evidenceArtifactDigest,
    readbackArtifactId: boundary.readbackArtifactId, readbackArtifactDigest: boundary.readbackArtifactDigest,
    productAccepted: false, releaseEligible: false };
}
function validatePhysicalResidualBackup({ run, jobs, artifact, archiveDigest, before, after,
  inventorySha256, inventory, readbackArtifact, readbackArchiveDigest, readback }) {
  const p = physicalResidualDefinition(), boundary = p.backupOnlyPostDeployFailure;
  assert.equal(run.id, PHYSICAL_PREVIOUS_BUILD); assert.equal(run.run_attempt, 1);
  assert.equal(run.status, 'completed'); assert.equal(run.conclusion, 'failure');
  assert.equal(run.head_sha, PHYSICAL_PREVIOUS_SOURCE); assert.equal(run.head_branch, TECHNICAL_BRANCH);
  assert.equal(run.path, BUILD_WORKFLOW);
  for (const [value, id, digest, name, actualDigest] of [
    [artifact, boundary.evidenceArtifactId, boundary.evidenceArtifactDigest, 'gi-i66-technical-preview-rollover-' + PHYSICAL_PREVIOUS_BUILD, archiveDigest],
    [readbackArtifact, boundary.readbackArtifactId, boundary.readbackArtifactDigest, 'gi-i66-preview-package-readback-' + PHYSICAL_PREVIOUS_BUILD, readbackArchiveDigest]
  ]) {
    assert.equal(value.id, id); assert.equal(value.name, name); assert.equal(value.expired, false);
    assert.equal(value.digest, digest); assert.equal(actualDigest, digest);
    assert.equal(value.workflow_run?.id, PHYSICAL_PREVIOUS_BUILD);
    assert.equal(value.workflow_run?.head_sha, PHYSICAL_PREVIOUS_SOURCE);
    assert.equal(value.workflow_run?.head_branch, TECHNICAL_BRANCH);
  }
  assert.equal(jobs.length, 3, 'I66_TECHNICAL_ROLLOVER_RESIDUAL_JOB_SET_DRIFT');
  const exactJobs = new Map(jobs.map(job => [job.name, job]));
  assert.equal(exactJobs.size, 3); assert.equal(exactJobs.get('gate')?.conclusion, 'success');
  assert.equal(exactJobs.get('protected-conciliaciones-reader-preview')?.conclusion, 'skipped');
  const job = exactJobs.get('immutable-package');
  assert.equal(job?.id, boundary.jobId); assert.equal(job.run_id, PHYSICAL_PREVIOUS_BUILD);
  assert.equal(job.status, 'completed'); assert.equal(job.conclusion, 'failure');
  const failed = job.steps.filter(step => step.conclusion === 'failure');
  assert.equal(failed.length, 1, 'I66_TECHNICAL_ROLLOVER_RESIDUAL_OTHER_FAILURE');
  assert.equal(failed[0].number, boundary.failedStepNumber);
  assert.equal(failed[0].name, boundary.failedStepName);
  for (const number of boundary.requiredSuccessSteps)
    assert.equal(job.steps.find(step => step.number === number)?.conclusion, 'success', 'I66_TECHNICAL_ROLLOVER_RESIDUAL_STEP_NOT_SUCCESS');
  for (const value of [before, after]) {
    assert.equal(value.channelId, PHYSICAL_CHANNEL); assert.equal(value.channelOrigin, PHYSICAL_ORIGIN);
    assert.equal(value.sourceSha, PHYSICAL_PREVIOUS_SOURCE); assert.equal(value.buildRunId, PHYSICAL_PREVIOUS_BUILD);
    assert.equal(value.receiptSha256, boundary.priorReceiptSha256); assert.equal(value.productAccepted, false);
    for (const key of ['liveWrites', 'backendWrites', 'businessDataWrites', 'channelDeletions', 'authRulesIamWrites'])
      assert.equal(value[key], 0);
  }
  assert.equal(before.schema, 'GI_I66_TECHNICAL_PREVIEW_BEFORE_V1');
  assert.equal(before.status, 'PREPARED_READONLY_NOT_ACCEPTED'); assert.equal(before.previewWrites, 0);
  assert.deepEqual(before.newCandidate, { sourceSha: PHYSICAL_PREVIOUS_SOURCE, buildRunId: PHYSICAL_PREVIOUS_BUILD,
    artifactId: PHYSICAL_PREVIOUS_ARTIFACT, artifactDigest: PHYSICAL_PREVIOUS_DIGEST, expectedSiteFileCount: 224 });
  assert.equal(before.inventorySha256, boundary.beforeInventorySha256);
  assert.equal(inventorySha256, boundary.beforeInventorySha256); assert.equal(technicalRows(inventory).length, 51);
  assert.equal(after.schema, 'GI_I66_TECHNICAL_PREVIEW_AFTER_V1'); assert.equal(after.status, 'HOLD');
  assert.equal(after.failureCode, boundary.failureCode); assert.equal(after.readOnlyVerifierWrites, 0);
  assert.equal(after.signedFunctionalPass, false); assert.equal(after.hostingVersion, undefined);
  const expectedReadbacks = [
    [PHYSICAL_ORIGIN, PHYSICAL_PREVIOUS_SOURCE, '87a2072160fcf661ceb962d983b1bb11e1823489fcc06db9c76951310e615699'],
    ...TECHNICAL_LIVE_ORIGINS.map(origin => [origin, PHYSICAL_LIVE_SOURCE, 'da40e7ad3f453107a44fdc868a58ff469f91139252c0204f9fc298a8d9f02905'])
  ];
  assert.equal(after.readbacks?.length, 3);
  for (const [origin, sourceSha, manifestSha256] of expectedReadbacks) {
    const matches = after.readbacks.filter(value => value.origin === origin);
    assert.equal(matches.length, 1); assert.equal(matches[0].files, 224);
    assert.equal(matches[0].manifestSha256, manifestSha256);
    technicalValidateMarker(matches[0].marker, { sourceSha });
  }
  for (const [key, value] of Object.entries({ schema: 'GI_I66_PREVIEW_PACKAGE_READBACK_V1', status: 'PASS', stage: 'COMPLETE',
    sourceSha: PHYSICAL_PREVIOUS_SOURCE, artifactId: PHYSICAL_PREVIOUS_ARTIFACT, artifactDigest: PHYSICAL_PREVIOUS_DIGEST,
    previewChannel: PHYSICAL_CHANNEL, previewUrl: PHYSICAL_ORIGIN, expectedFiles: 224, verifiedFiles: 224,
    manifestSha256: expectedReadbacks[0][2], noDeploymentPerformed: true, noArtifactMutation: true }))
    assert.equal(readback[key], value, 'I66_TECHNICAL_ROLLOVER_RESIDUAL_READBACK_DRIFT_' + key);
  assert.equal(readback.files?.length, 224);
  assert.equal(new Set(readback.files.map(file => file.path)).size, 224);
  for (const file of readback.files) {
    assert.equal(file.status, 'PASS'); assert.match(file.expectedSha256, /^[a-f0-9]{64}$/);
    technicalFail(file.attempts?.some(attempt => attempt.status === 200 && attempt.sha256 === file.expectedSha256),
      'RESIDUAL_FILE_READBACK_MISSING');
  }
  assert.equal(readback.live?.length, 2);
  assert.deepEqual(readback.live.map(value => value.label).sort(), ['FIREBASE_LIVE', 'STAFF_LIVE']);
  for (const live of readback.live) {
    assert.equal(live.status, 'PASS'); assert.equal(live.beforeSha256, live.afterSha256);
    technicalFail(live.attempts?.some(attempt => attempt.status === 200 && attempt.sha256 === live.afterSha256),
      'RESIDUAL_LIVE_READBACK_MISSING');
  }
  return physicalResidualProof();
}

function technicalParseManifest(text, expectedSiteFileCount = 223) {
  const lines = String(text).trim().split(/\r?\n/), seen = new Set();
  technicalFail([223, 224].includes(expectedSiteFileCount), 'FILE_COUNT_PROFILE_DENIED');
  assert.equal(lines.length, expectedSiteFileCount, 'I66_TECHNICAL_ROLLOVER_FILE_COUNT_DRIFT');
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
  const manifest = technicalParseManifest(text, expected.expectedSiteFileCount);
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
  const repo = path.resolve(__dirname, '..');
  technicalFail(env.GITHUB_WORKSPACE && [path.resolve(env.GITHUB_WORKSPACE), path.resolve(env.GITHUB_WORKSPACE, 'candidate')].includes(repo), 'CHECKOUT_PATH_DRIFT');
  assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8', stdio: 'pipe' }).trim(), env.SOURCE_SHA, 'I66_TECHNICAL_ROLLOVER_CHECKOUT_SOURCE_DRIFT');
  const control = JSON.parse(fs.readFileSync(path.join(repo, 'artifacts/orbit360-recovery/release-control/I6_6_RELEASE_TRANSPORT_CONTROL_20261110.json'), 'utf8'));
  const profile = technicalProfile(control.currentTechnicalPreviewRollover);
  technicalFail(/^[a-f0-9]{40}$/.test(env.SOURCE_SHA || '') && !profile.deniedSources.includes(env.SOURCE_SHA), 'SOURCE_INVALID');
  technicalFail(Number.isSafeInteger(Number(env.GITHUB_RUN_ID)) && Number(env.GITHUB_RUN_ID) > 0 && !profile.deniedBuilds.includes(Number(env.GITHUB_RUN_ID)), 'RUN_ID_INVALID');
  execFileSync('git', ['merge-base', '--is-ancestor', profile.sourceBaseHead, env.SOURCE_SHA], { cwd: repo, stdio: 'pipe' });
  const receiptText = fs.readFileSync(path.join(repo, profile.receiptPath), 'utf8');
  const authorization = validateTechnicalAuthorization(control, receiptText);
  if (isPhysicalProfile(authorization)) {
    const physical = require('./gravicentra-i66-frontend-control.cjs');
    const readFileSync = (relative, encoding) => fs.readFileSync(path.join(repo, relative), encoding);
    const head = physical.physicalGuard(JSON.parse(readFileSync(physical.P.cp, 'utf8')),
      JSON.parse(readFileSync(physical.P.state, 'utf8')), control, { readFileSync });
    assert.equal(head.generation, 3, 'I66_TECHNICAL_ROLLOVER_PHYSICAL_GENERATION_DRIFT');
    assert.equal(head.receiptGitBlobSha, authorization.protectedLive.receiptGitBlobSha);
    assert.equal(physical.blob(readFileSync(authorization.previousCandidate.receiptPath)), authorization.previousCandidate.receiptGitBlobSha,
      'I66_TECHNICAL_ROLLOVER_PREVIOUS_RECEIPT_BYTES_DRIFT');
  }
  return { repo, receiptText, control, authorization, profile, root: path.join(env.RUNNER_TEMP, 'gi-i66-technical-preview-rollover') };
}

function technicalRuntimeIo(env, root, authorization) {
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
      if (expected.backupOnlyPostDeployFailure && expected.sourceSha === PHYSICAL_PREVIOUS_SOURCE) {
        technicalFail(!options.currentBuild, 'RESIDUAL_BACKUP_CANNOT_BE_NEW_BUILD');
        assert.deepEqual(expected, physicalResidualDefinition(), 'I66_TECHNICAL_ROLLOVER_RESIDUAL_DEFINITION_DRIFT');
        const boundary = expected.backupOnlyPostDeployFailure;
        const [jobData, evidenceArtifact, readbackArtifact] = await Promise.all([
          json('runs/' + PHYSICAL_PREVIOUS_BUILD + '/attempts/1/jobs?per_page=100'),
          json('artifacts/' + boundary.evidenceArtifactId), json('artifacts/' + boundary.readbackArtifactId)
        ]);
        const dir = path.join(root, 'prior-v27-finish-hold'); fs.mkdirSync(dir, { mode: 0o700 });
        async function evidenceZip(artifact, id, digest, name) {
          assert.equal(artifact.id, id); assert.equal(artifact.digest, digest); assert.equal(artifact.expired, false);
          technicalFail(Number.isSafeInteger(artifact.size_in_bytes) && artifact.size_in_bytes > 0 && artifact.size_in_bytes < 50 * 1024 * 1024,
            'RESIDUAL_EVIDENCE_SIZE_INVALID');
          const bytes = Buffer.from(await (await apiGet('artifacts/' + id + '/zip')).arrayBuffer());
          assert.equal(bytes.length, artifact.size_in_bytes);
          const actualDigest = 'sha256:' + technicalSha(bytes);
          assert.equal(actualDigest, digest, 'I66_TECHNICAL_ROLLOVER_RESIDUAL_EVIDENCE_BYTES_DRIFT');
          const zip = path.join(dir, name); fs.writeFileSync(zip, bytes, { flag: 'wx', mode: 0o600 });
          const names = execFileSync('unzip', ['-Z1', zip], { encoding: 'utf8', stdio: 'pipe', maxBuffer: 1024 * 1024 }).trim().split(/\r?\n/);
          return { zip, names, actualDigest };
        }
        const [proofZip, readbackZip] = await Promise.all([
          evidenceZip(evidenceArtifact, boundary.evidenceArtifactId, boundary.evidenceArtifactDigest, 'verified-rollover-evidence.zip'),
          evidenceZip(readbackArtifact, boundary.readbackArtifactId, boundary.readbackArtifactDigest, 'verified-readback-evidence.zip')
        ]);
        function entry(archive, name, expectedSha) {
          assert.equal(archive.names.filter(value => value === name).length, 1, 'I66_TECHNICAL_ROLLOVER_RESIDUAL_ENTRY_NOT_UNIQUE');
          const text = execFileSync('unzip', ['-p', archive.zip, name], { encoding: 'utf8', stdio: 'pipe', maxBuffer: 5 * 1024 * 1024 });
          assert.equal(technicalSha(text), expectedSha, 'I66_TECHNICAL_ROLLOVER_RESIDUAL_ENTRY_BYTES_DRIFT');
          fs.writeFileSync(path.join(dir, name), text, { flag: 'wx', mode: 0o600 });
          return JSON.parse(text);
        }
        const before = entry(proofZip, 'before.json', boundary.beforeReportSha256);
        const after = entry(proofZip, 'after.json', boundary.afterReportSha256);
        residualInventory = entry(proofZip, 'inventory-before.json', boundary.beforeInventorySha256);
        const readback = entry(readbackZip, 'gi-i66-preview-package-readback.json', boundary.readbackReportSha256);
        assert.equal(proofZip.names.includes('inventory-after.json'), false);
        residualBackupProof = validatePhysicalResidualBackup({ run, jobs: jobData.jobs, artifact: evidenceArtifact,
          archiveDigest: proofZip.actualDigest, before, after, inventorySha256: boundary.beforeInventorySha256,
          inventory: residualInventory, readbackArtifact, readbackArchiveDigest: readbackZip.actualDigest, readback });
        technicalWriteJson(path.join(dir, 'backup-only-proof.json'), residualBackupProof);
      } else if (expected.backupOnlyPostDeployFailure) {
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
      technicalFail([authorization?.channel?.origin || TECHNICAL_ORIGIN, ...TECHNICAL_LIVE_ORIGINS].includes(origin), 'READBACK_ORIGIN_DENIED');
      for (let i = 0; i < bundle.manifest.length; i += 8) await Promise.all(bundle.manifest.slice(i, i + 8).map(async file => {
        const response = await get(origin + '/' + file.relative, { redirect: 'error', headers: { 'cache-control': 'no-cache' } });
        assert.equal(technicalSha(Buffer.from(await response.arrayBuffer())), file.hash, 'I66_TECHNICAL_ROLLOVER_HOSTED_BYTES_DRIFT');
      }));
      return { origin, files: bundle.manifest.length, manifestSha256: bundle.manifestSha256, marker: bundle.marker };
    },
    async validateAcceptedLive(a) {
      const run = await json('runs/' + a.protectedLive.liveRunId);
      assert.equal(run.id, a.protectedLive.liveRunId);
      assert.equal(run.head_branch, TECHNICAL_BRANCH);
      assert.equal(run.path, isPhysicalProfile(a) ? PHYSICAL_LIVE_WORKFLOW
        : '.github/workflows/gravicentra-i66-r11-renewal-drive-frontend-exact-live-promotion.yml');
      if (isPhysicalProfile(a)) {
        assert.equal(run.head_sha, a.protectedLive.liveRunHeadSha);
        assert.equal(run.run_attempt, a.protectedLive.liveRunAttempt);
      }
      assert.equal(run.status, 'completed'); assert.equal(run.conclusion, 'success', 'I66_TECHNICAL_ROLLOVER_LIVE_ACCEPTANCE_MISSING');
    }
  };
  return io;
}

const technicalSafeFailure = error => String(error?.message || '').match(/I66_TECHNICAL_ROLLOVER_[A-Z_]+/)?.[0] || 'I66_TECHNICAL_ROLLOVER_RUNTIME_HOLD';
const technicalWriteJson = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });

async function runtimePrepareTechnicalRollover(env = process.env) {
  const { receiptText, control, authorization: a, profile, root } = technicalEnvironment(env);
  const failure = fs.readFileSync(path.join(env.RUNNER_TEMP, 'gi-i66-preview-result.json'), 'utf8');
  technicalFail(/HTTP Error:\s*429[^\r\n]*channel quota/i.test(failure), 'EXACT_NEW_CHANNEL_QUOTA_FAILURE_REQUIRED');
  const expectedNew = { sourceSha: env.SOURCE_SHA, buildRunId: Number(env.GITHUB_RUN_ID), artifactId: Number(env.ARTIFACT_ID), artifactDigest: technicalDigest(env.ARTIFACT_DIGEST),
    ...(a.expectedNewSiteFileCount ? { expectedSiteFileCount: a.expectedNewSiteFileCount } : {}) };
  technicalFail(Number.isSafeInteger(expectedNew.artifactId) && expectedNew.artifactId > 0 && ![a.previousCandidate.artifactId, a.protectedLive.artifactId].includes(expectedNew.artifactId), 'NEW_ARTIFACT_REQUIRED');
  fs.mkdirSync(root, { mode: 0o700 }); // Never overwrite a prior prepare or silently retry.
  const report = { schema: 'GI_I66_TECHNICAL_PREVIEW_BEFORE_V1', status: 'HOLD', channelId: a.channel.id, channelOrigin: a.channel.origin,
    receiptPath: profile.receiptPath, receiptSha256: profile.receiptSha256, sourceSha: env.SOURCE_SHA,
    buildRunId: Number(env.GITHUB_RUN_ID), newCandidate: expectedNew, previewWrites: 0, liveWrites: 0,
    backendWrites: 0, businessDataWrites: 0, channelDeletions: 0, authRulesIamWrites: 0, productAccepted: false, checks: [] };
  const io = technicalRuntimeIo(env, root, a);
  try {
    const initial = io.inventory();
    const initialText = JSON.stringify(initial, null, 2) + '\n';
    fs.writeFileSync(path.join(root, 'inventory-before.json'), initialText, { flag: 'wx', mode: 0o600 });
    report.inventorySha256 = technicalSha(initialText);
    validateTechnicalChannels(control, receiptText, initial);
    report.totalChannels = technicalRows(initial).length;
    const [oldMeta, liveMeta, newMeta] = await Promise.all([io.metadata(a.previousCandidate), io.metadata(a.protectedLive), io.metadata(expectedNew, { currentBuild: true })]);
    if (oldMeta.residualInventory) {
      const untouched = value => technicalOrderedRows(value).filter(row => technicalChannelId(row) !== a.channel.id);
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
    report.readbacks = [await io.readback(a.channel.origin, previous)];
    for (const origin of TECHNICAL_LIVE_ORIGINS) report.readbacks.push(await io.readback(origin, live));
    const fresh = io.inventory();
    technicalWriteJson(path.join(root, 'inventory-before-fresh.json'), fresh);
    report.freshInventorySha256 = technicalSha(fs.readFileSync(path.join(root, 'inventory-before-fresh.json')));
    validateTechnicalChannels(control, receiptText, fresh);
    assert.deepEqual(technicalOrderedRows(fresh), technicalOrderedRows(initial), 'I66_TECHNICAL_ROLLOVER_CONCURRENT_BEFORE_CHANGE');
    report.checks = ['EXACT_AUTHORITY_AND_QUOTA', 'PREVIOUS_LIVE_AND_NEW_ARCHIVES_DIGEST_VERIFIED', 'PREVIOUS_AND_DUAL_LIVE_' + profile.expectedSiteFileCount + '_FILES_EACH_EXACT', 'NEW_LOCAL_PACKAGE_EQUALS_UPLOADED_ARCHIVE', 'FRESH_INVENTORY_UNCHANGED'];
    report.status = 'PREPARED_READONLY_NOT_ACCEPTED'; report.recordedAtUtc = new Date().toISOString();
  } catch (error) { report.failureCode = technicalSafeFailure(error); throw error; }
  finally { technicalWriteJson(path.join(root, 'before.json'), report); }
  console.log('I66_TECHNICAL_PREVIEW_ROLLOVER_PREPARED_READONLY channel=' + a.channel.id + ' total=' + report.totalChannels + ' writes=0');
  return report;
}

async function runtimeFinishTechnicalRollover(env = process.env) {
  const { receiptText, control, authorization: a, profile, root } = technicalEnvironment(env);
  assert.equal(env.PREVIEW_CHANNEL, a.channel.id, 'I66_TECHNICAL_ROLLOVER_FINISH_CHANNEL_DRIFT');
  assert.equal(env.PREVIEW_URL, a.channel.origin, 'I66_TECHNICAL_ROLLOVER_FINISH_ORIGIN_DRIFT');
  const before = JSON.parse(fs.readFileSync(path.join(root, 'before.json'), 'utf8'));
  assert.equal(before.status, 'PREPARED_READONLY_NOT_ACCEPTED', 'I66_TECHNICAL_ROLLOVER_PREPARE_NOT_PROVEN');
  assert.equal(before.receiptSha256, profile.receiptSha256); assert.equal(before.sourceSha, env.SOURCE_SHA);
  assert.equal(before.buildRunId, Number(env.GITHUB_RUN_ID)); assert.equal(before.channelId, a.channel.id);
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
  const report = { schema: 'GI_I66_TECHNICAL_PREVIEW_AFTER_V1', status: 'HOLD', channelId: a.channel.id, channelOrigin: a.channel.origin,
    sourceSha: env.SOURCE_SHA, receiptSha256: profile.receiptSha256, buildRunId: Number(env.GITHUB_RUN_ID),
    readOnlyVerifierWrites: 0, liveWrites: 0, backendWrites: 0, businessDataWrites: 0, channelDeletions: 0,
    authRulesIamWrites: 0, productAccepted: false, signedFunctionalPass: false };
  const io = technicalRuntimeIo(env, root, a);
  try {
    const after = io.inventory();
    technicalWriteJson(path.join(root, 'inventory-after-first.json'), after);
    report.firstInventorySha256 = technicalSha(fs.readFileSync(path.join(root, 'inventory-after-first.json')));
    const rows = technicalRows(after), target = rows.filter(row => technicalChannelIdentity(row) === a.channel.id);
    assert.equal(rows.length, technicalRows(initial).length, 'I66_TECHNICAL_ROLLOVER_AFTER_CHANNEL_COUNT_DRIFT');
    assert.equal(target.length, 1, 'I66_TECHNICAL_ROLLOVER_AFTER_TARGET_NOT_UNIQUE');
    assert.equal(target[0].createTime, a.channel.createdAt, 'I66_TECHNICAL_ROLLOVER_AFTER_CREATED_AT_DRIFT');
    const untouched = inventory => technicalOrderedRows(inventory).filter(row => technicalChannelId(row) !== a.channel.id);
    assert.deepEqual(untouched(after), untouched(initial), 'I66_TECHNICAL_ROLLOVER_OTHER_CHANNEL_CHANGED');
    technicalFail(technicalVersion(target[0]) !== a.channel.expectedVersion, 'NEW_PREVIEW_VERSION_NOT_VISIBLE');
    report.readbacks = [await io.readback(a.channel.origin, next)];
    for (const origin of TECHNICAL_LIVE_ORIGINS) report.readbacks.push(await io.readback(origin, live));
    const finalInventory = io.inventory();
    technicalWriteJson(path.join(root, 'inventory-after-final.json'), finalInventory);
    report.finalInventorySha256 = technicalSha(fs.readFileSync(path.join(root, 'inventory-after-final.json')));
    report.inventoryMetadataDifferences = technicalMetadataDifferences(after, finalInventory);
    if (isPhysicalProfile(a)) report.inventoryComparison = validateTechnicalAfterInventories(initial, after, finalInventory, a);
    else assert.deepEqual(technicalOrderedRows(finalInventory), technicalOrderedRows(after), 'I66_TECHNICAL_ROLLOVER_CONCURRENT_AFTER_CHANGE');
    technicalWriteJson(path.join(root, 'inventory-after.json'), finalInventory);
    report.hostingVersion = technicalVersion(target[0]); report.totalChannels = rows.length;
    report.newArtifactId = expectedNew.artifactId; report.newArtifactDigest = expectedNew.artifactDigest;
    report.inventorySha256 = technicalSha(fs.readFileSync(path.join(root, 'inventory-after.json')));
    report.status = 'EXACT_PREVIEW_REPLACEMENT_READBACK_PASS_NOT_FUNCTIONAL_ACCEPTANCE'; report.recordedAtUtc = new Date().toISOString();
  } catch (error) { report.failureCode = technicalSafeFailure(error); throw error; }
  finally { technicalWriteJson(path.join(root, 'after.json'), report); }
  console.log('I66_TECHNICAL_PREVIEW_ROLLOVER_AFTER_EXACT_' + profile.expectedSiteFileCount + '_DUAL_LIVE_UNCHANGED_NO_OTHER_CHANNEL_CHANGES');
  return report;
}

module.exports.technicalRolloverCandidatePin = technicalRolloverCandidatePin;
module.exports.currentPhysicalRolloverCandidatePin = currentPhysicalRolloverCandidatePin;
module.exports.validateTechnicalRolloverCandidate = validateTechnicalRolloverCandidate;
module.exports.technicalRollover = Object.freeze({
  validateAuthorization: validateTechnicalAuthorization, validateChannels: validateTechnicalChannels,
  validateArtifact: validateTechnicalArtifact, validateCandidateReuse: validateTechnicalRolloverCandidate,
  validateResidualBackup: validateTechnicalResidualBackup,
  validatePhysicalResidualBackup,
  validateAfterInventories: validateTechnicalAfterInventories,
  parseManifest: technicalParseManifest, validateMarker: technicalValidateMarker,
  inventoryDigest: technicalInventoryDigest, validateInventoryPreimage: validateTechnicalInventoryPreimage,
  runtimePrepare: runtimePrepareTechnicalRollover, runtimeFinish: runtimeFinishTechnicalRollover
});
if (require.main === module) {
  const command = process.argv.slice(2);
  technicalFail(command.length === 1 && ['--prepare-technical-rollover', '--finish-technical-rollover'].includes(command[0]), 'CLI_MODE_DENIED');
  const run = command[0] === '--prepare-technical-rollover' ? runtimePrepareTechnicalRollover : runtimeFinishTechnicalRollover;
  run().catch(error => { console.error(technicalSafeFailure(error)); process.exitCode = 1; });
}
