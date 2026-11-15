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
    assert.equal(String(row.release?.version?.name || ''), a.expectedHostingVersion,
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
