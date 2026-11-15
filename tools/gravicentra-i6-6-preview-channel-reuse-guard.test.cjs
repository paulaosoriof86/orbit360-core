'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { validateAuthorization, validateChannels, validateRecoverableArtifact } = require('./gravicentra-i6-6-preview-channel-reuse-guard.cjs');

function fixture() {
  const current = {
    status: 'PUBLISHED_EXACT_R11_223_FILES_SIGNED_FRONTEND_HOSTING_ONLY_PARTIAL',
    sourceSha: '84769378eb2014addebfefdbdd63091bddc4b817',
    artifactId: 14075022275, artifactDigest: 'sha256:b0f3bacb68511cdfc91ac934602c51f55afec5c1d6428d886d13a72a706ee283',
    previewRunId: 43503721126, liveCloneRunId: 43506971214,
    liveHostingVersion: 'sites/ays-orbit-360-lab/versions/0766db29b338befc', readbackEachOrigin: 223
  };
  const control = {
    schema: 'GRAVICENTRA_I6_6_SINGLE_ARTIFACT_RELEASE_TRANSPORT_V1', gate: 'I6.6', historicalClosedGate: 'B4-007',
    status: 'PREVIEW_BUILD_REQUESTED', livePromotionAuthorized: false, previewApproved: false,
    forbidBackendFunctionDeploy: true, forbidBackendLiveFunctionDeploy: true,
    noHostingPromotion: true, forbidFirestoreRulesDataAuthWrites: true, currentExactHostingRelease: current,
    previewChannelReuseAuthorization: {
      status: 'CURRENT_LIVE_BACKED_SINGLE_PREVIEW_REUSE_AUTHORIZED', approvedByDirection: true,
      authorizedChannelId: 'gi-i66-rc-42868854629',
      expectedPreviewUrl: 'https://ays-orbit-360-lab--gi-i66-rc-42868854629-abj14q6n.web.app',
      expectedSourceSha: current.sourceSha, expectedHostingVersion: current.liveHostingVersion,
      recoverableBuildRunId: current.previewRunId, recoverableArtifactId: current.artifactId,
      recoverableArtifactDigest: current.artifactDigest, noLiveChanges: true, noBusinessDataWrites: true,
      noChannelDeletion: true, stopOnIdentityDrift: true
    }
  };
  const inventory = { result: [
    { channelId: 'gi-i66-rc-42868854629', createTime: '2026-11-10T12:00:00Z', release: { version: { name: current.liveHostingVersion } } },
    { channelId: 'live', release: { version: { name: current.liveHostingVersion } } }
  ] };
  const proofs = {
    buildRun: { id: current.previewRunId, head_sha: current.sourceSha, conclusion: 'success', path: '.github/workflows/gravicentra-release-delta-66-package.yml' },
    artifact: { id: current.artifactId, workflow_run: { id: current.previewRunId, head_sha: current.sourceSha }, digest: current.artifactDigest, expired: false },
    previewBuild: { sourceSha: current.sourceSha, gate: 'I6.6' },
    liveRun: { id: current.liveCloneRunId, conclusion: 'success' }
  };
  return { control, inventory, proofs };
}

test('current R11 exact Preview/LIVE backup is recoverable without R10 hardcode', () => {
  const f = fixture();
  assert.equal(validateChannels(f.control, f.inventory).expectedSourceSha, f.proofs.previewBuild.sourceSha);
  assert.equal(validateRecoverableArtifact(f.control, f.proofs).recoverableArtifactId, 14075022275);
});
for (const flag of ['forbidBackendFunctionDeploy', 'forbidBackendLiveFunctionDeploy', 'noHostingPromotion', 'forbidFirestoreRulesDataAuthWrites']) {
  test('rejects weakened scope ' + flag, () => { const f = fixture(); f.control[flag] = false; assert.throws(() => validateAuthorization(f.control)); });
}
for (const flag of ['livePromotionAuthorized', 'previewApproved']) {
  test('does not reuse under LIVE approval ' + flag, () => { const f = fixture(); f.control[flag] = true; assert.throws(() => validateAuthorization(f.control)); });
}
for (const key of ['expectedSourceSha', 'expectedHostingVersion', 'recoverableBuildRunId', 'recoverableArtifactId', 'recoverableArtifactDigest']) {
  test('rejects stale R10 anchor ' + key, () => { const f = fixture(); f.control.previewChannelReuseAuthorization[key] = 'stale'; assert.throws(() => validateAuthorization(f.control)); });
}
test('requires explicit direction reuse approval', () => { const f = fixture(); f.control.previewChannelReuseAuthorization.approvedByDirection = false; assert.throws(() => validateAuthorization(f.control)); });
test('never allows LIVE as reuse target', () => { const f = fixture(); f.control.previewChannelReuseAuthorization.authorizedChannelId = 'live'; assert.throws(() => validateChannels(f.control, f.inventory)); });
test('rejects changed or duplicate preview channel', () => {
  const f = fixture(); f.inventory.result[0].release.version.name += 'other'; assert.throws(() => validateChannels(f.control, f.inventory));
  const g = fixture(); g.inventory.result.push(g.inventory.result[0]); assert.throws(() => validateChannels(g.control, g.inventory));
});
test('rejects expired artifact, changed build source or failed LIVE', () => {
  const f = fixture(); f.proofs.artifact.expired = true; assert.throws(() => validateRecoverableArtifact(f.control, f.proofs));
  const g = fixture(); g.proofs.previewBuild.sourceSha = '0'.repeat(40); assert.throws(() => validateRecoverableArtifact(g.control, g.proofs));
  const h = fixture(); h.proofs.liveRun.conclusion = 'failure'; assert.throws(() => validateRecoverableArtifact(h.control, h.proofs));
});
test('same existing build workflow executes the tested guard before known-channel rollover', () => {
  const workflow = fs.readFileSync('.github/workflows/gravicentra-release-delta-66-package.yml', 'utf8');
  assert.ok(workflow.includes('gravicentra-i6-6-preview-channel-reuse-guard.test.cjs'));
  assert.ok(workflow.includes('validateChannels(control'));
  assert.ok(workflow.includes('validateRecoverableArtifact(control'));
  assert.ok(!workflow.includes("a.expectedCurrentSourceSha==='851d68441b819eac6dd37ec1d5d15fb971e35bf2'"));
});
