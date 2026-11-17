'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const guard = require('./gravicentra-i6-6-preview-channel-reuse-guard.cjs');
const api = guard.technicalRollover;
const pin = guard.technicalRolloverCandidatePin();
const receiptText = fs.readFileSync(path.join(__dirname, '..', pin.receiptPath), 'utf8');
const receipt = JSON.parse(receiptText);
const clone = value => structuredClone(value);
const digest = text => crypto.createHash('sha256').update(text).digest('hex');

function fixture() {
  const a = clone(receipt), p = a.protectedLive;
  const control = {
    schema: 'GRAVICENTRA_I6_6_SINGLE_ARTIFACT_RELEASE_TRANSPORT_V1', gate: 'I6.6', historicalClosedGate: 'B4-007',
    status: 'PREVIEW_BUILD_REQUESTED', livePromotionAuthorized: false, previewApproved: false,
    forbidBackendFunctionDeploy: true, forbidBackendLiveFunctionDeploy: true,
    noHostingPromotion: true, forbidFirestoreRulesDataAuthWrites: true,
    currentTechnicalPreviewRollover: { receiptPath: pin.receiptPath, receiptSha256: pin.receiptSha256 },
    currentExactHostingRelease: { status: 'PUBLISHED_EXACT_R11_223_FILES_SIGNED_FRONTEND_HOSTING_ONLY_PARTIAL',
      sourceSha: p.sourceSha, previewRunId: p.buildRunId, artifactId: p.artifactId,
      artifactDigest: p.artifactDigest, liveCloneRunId: p.liveRunId, liveHostingVersion: p.version, readbackEachOrigin: 223 }
  };
  const inventory = { result: [
    { channelId: a.channel.id, createTime: a.channel.createdAt, release: { version: { name: a.channel.expectedVersion } } },
    { channelId: 'live', release: { version: { name: p.version } } },
    ...Array.from({ length: 49 }, (_, i) => ({ channelId: 'untouched-' + i, release: { version: { name: 'sites/ays-orbit-360-lab/versions/untouched-' + i } } }))
  ] };
  const expected = a.previousCandidate;
  const run = { id: expected.buildRunId, head_sha: expected.sourceSha, head_branch: a.branch,
    path: '.github/workflows/gravicentra-release-delta-66-package.yml', status: 'completed', conclusion: 'success', run_attempt: 2 };
  const artifact = { id: expected.artifactId, name: 'gi-i66-immutable-' + expected.sourceSha,
    digest: expected.artifactDigest, expired: false, size_in_bytes: 1024,
    workflow_run: { id: expected.buildRunId, head_sha: expected.sourceSha, head_branch: a.branch } };
  const candidate = { sourceSha: 'a'.repeat(40), buildRunId: 44020000001, previewChannelId: a.channel.id,
    previewUrl: a.channel.origin, previewRollover: clone(pin) };
  return { a, control, inventory, expected, run, artifact, candidate };
}
function manifest() {
  return ['index.html', '__recovery__/build.json', ...Array.from({ length: 221 }, (_, i) => 'files/' + i + '.js')]
    .map(name => 'a'.repeat(64) + '  ' + name).join('\n') + '\n';
}

test('exact independently authorized technical receipt has immutable bytes, not legal authorization', () => {
  assert.equal(digest(receiptText), 'db754d7a0b26f6396e4320c7d60e09c3aba608b5ad29a32abaf03fe3d8157fb7');
  assert.equal(receipt.executionAuthority.newLegalConsentGrantUsedForHosting, false);
  assert.equal(api.validateAuthorization(fixture().control, receiptText).channel.id, 'gi-i66-rc-44009981499');
});
test('candidate pin is a fresh exact object with the recoverable previous artifact', () => {
  const changed = guard.technicalRolloverCandidatePin(); changed.channel = 'live';
  assert.equal(guard.technicalRolloverCandidatePin().channel, 'gi-i66-rc-44009981499');
  assert.equal(pin.previousArtifactId, 14296328231);
  assert.equal(api.validateCandidateReuse(fixture().candidate).receiptSha256, pin.receiptSha256);
});
test('fixed current Preview and accepted R11 channels validate, including project-qualified resources', () => {
  const f = fixture();
  assert.equal(api.validateChannels(f.control, receiptText, f.inventory).channel.id, f.a.channel.id);
  for (const row of f.inventory.result) {
    row.name = 'projects/ays-orbit-360-lab/sites/ays-orbit-360-lab/channels/' + row.channelId;
    row.release.version.name = 'projects/ays-orbit-360-lab/' + row.release.version.name;
    delete row.channelId;
  }
  assert.doesNotThrow(() => api.validateChannels(f.control, receiptText, { result: { channels: f.inventory.result } }));
});
for (const flag of ['livePromotionAuthorized', 'previewApproved', 'forbidBackendFunctionDeploy', 'forbidBackendLiveFunctionDeploy', 'noHostingPromotion', 'forbidFirestoreRulesDataAuthWrites']) {
  test('technical authorization rejects scope weakening ' + flag, () => {
    const f = fixture(); f.control[flag] = !f.control[flag];
    assert.throws(() => api.validateAuthorization(f.control, receiptText), /SCOPE_DRIFT/);
  });
}
for (const key of ['receiptPath', 'receiptSha256']) test('control requires exact technical pin ' + key, () => {
  const f = fixture(); f.control.currentTechnicalPreviewRollover[key] = 'different';
  assert.throws(() => api.validateAuthorization(f.control, receiptText), /CONTROL_PIN_DRIFT/);
});
test('legacy authority or legal consent alone never enables current technical rollover', () => {
  const f = fixture(); delete f.control.currentTechnicalPreviewRollover;
  f.control.previewChannelReuseAuthorization = { approvedByDirection: true };
  f.control.directionPreviewLegalAcceptance = { approved: true };
  assert.throws(() => api.validateAuthorization(f.control, receiptText), /CONTROL_PIN_DRIFT/);
});
test('receipt field edits, whitespace edits and missing bytes all fail closed', () => {
  const f = fixture();
  for (const value of [undefined, '', receiptText + ' ', JSON.stringify({ ...receipt, status: 'APPROVED' })])
    assert.throws(() => api.validateAuthorization(f.control, value), /EXACT_RECEIPT_BYTES_REQUIRED/);
});
test('wrong active gate is not authorized by otherwise valid receipt', () => {
  const f = fixture(); f.control.status = 'OPERATIONAL_BACKEND_PREVIEW_AUTHORIZED';
  assert.throws(() => api.validateAuthorization(f.control, receiptText), /BUILD_GATE_REQUIRED/);
});
for (const key of ['sourceSha', 'previewRunId', 'artifactId', 'artifactDigest', 'liveCloneRunId', 'liveHostingVersion', 'readbackEachOrigin']) {
  test('technical rollover preserves exact current LIVE pointer ' + key, () => {
    const f = fixture(); f.control.currentExactHostingRelease[key] = 'drift';
    assert.throws(() => api.validateAuthorization(f.control, receiptText), /LIVE_POINTER_DRIFT/);
  });
}
test('current technical channel count, identity and version may not drift', () => {
  for (const mutate of [
    f => f.inventory.result.pop(),
    f => f.inventory.result.push({ channelId: 'unexpected' }),
    f => { f.inventory.result[0].createTime = '2026-11-17T00:00:00Z'; },
    f => { f.inventory.result[0].release.version.name = 'sites/ays-orbit-360-lab/versions/changed'; },
    f => { f.inventory.result[1].release.version.name = 'sites/ays-orbit-360-lab/versions/changed'; },
    f => { f.inventory.result[2] = clone(f.inventory.result[0]); },
    f => { f.inventory.result[0].channelId = 'gi-i66-rc-42868854629'; },
    f => { f.inventory.result[0].channelId = 'live'; }
  ]) { const f = fixture(); mutate(f); assert.throws(() => api.validateChannels(f.control, receiptText, f.inventory)); }
});
test('another project or site cannot be normalized into the exact target', () => {
  for (const prefix of ['projects/other/', 'projects/ays-orbit-360-lab-other/', '/']) {
    const f = fixture(); f.inventory.result[0].release.version.name = prefix + f.a.channel.expectedVersion;
    assert.throws(() => api.validateChannels(f.control, receiptText, f.inventory), /VERSION_SCOPE_DENIED/);
  }
  const f = fixture(); f.inventory.result[0].name = 'projects/other/sites/ays-orbit-360-lab/channels/' + f.a.channel.id;
  assert.throws(() => api.validateChannels(f.control, receiptText, f.inventory), /CHANNEL_RESOURCE_SCOPE_DENIED/);
});
test('previous build must be its exact successful second attempt and unexpired artifact', () => {
  const f = fixture(); assert.equal(api.validateArtifact(f.run, f.artifact, f.expected).artifactId, 14296328231);
});
for (const key of ['id', 'head_sha', 'head_branch', 'path', 'status', 'conclusion', 'run_attempt']) {
  test('previous artifact rejects build provenance drift ' + key, () => {
    const f = fixture(); f.run[key] = 'different';
    assert.throws(() => api.validateArtifact(f.run, f.artifact, f.expected));
  });
}
for (const key of ['id', 'name', 'digest', 'expired', 'size_in_bytes']) test('backup artifact requires exact ' + key, () => {
  const f = fixture(); f.artifact[key] = key === 'expired' ? true : 'different';
  assert.throws(() => api.validateArtifact(f.run, f.artifact, f.expected));
});
for (const key of ['id', 'head_sha', 'head_branch']) test('artifact workflow identity cannot drift ' + key, () => {
  const f = fixture(); f.artifact.workflow_run[key] = 'different';
  assert.throws(() => api.validateArtifact(f.run, f.artifact, f.expected));
});
test('new artifact provenance allows only the current running immutable build, not failed or completed', () => {
  const f = fixture(); f.run.status = 'in_progress'; f.run.conclusion = null;
  assert.doesNotThrow(() => api.validateArtifact(f.run, f.artifact, f.expected, { currentBuild: true }));
  for (const status of ['queued', 'completed', 'failure']) {
    f.run.status = status;
    assert.throws(() => api.validateArtifact(f.run, f.artifact, f.expected, { currentBuild: true }), /CURRENT_BUILD_NOT_RUNNING/);
  }
});
for (const key of Object.keys(pin)) test('candidate reuse cannot borrow or alter pin ' + key, () => {
  const f = fixture(); f.candidate.previewRollover[key] = 'different';
  assert.throws(() => guard.validateTechnicalRolloverCandidate(f.candidate), /CANDIDATE_PIN_DRIFT/);
});
test('new candidate cannot masquerade as old source/build, another channel or another origin', () => {
  for (const [key, value] of [['sourceSha', receipt.previousCandidate.sourceSha], ['sourceSha', 'invalid'],
    ['buildRunId', receipt.previousCandidate.buildRunId], ['buildRunId', '44020000001'],
    ['previewChannelId', 'live'], ['previewChannelId', 'gi-i66-rc-42868854629'],
    ['previewUrl', 'https://app.aysseguros.com'], ['previewUrl', receipt.channel.origin + '/']]) {
    const f = fixture(); f.candidate[key] = value; assert.throws(() => guard.validateTechnicalRolloverCandidate(f.candidate));
  }
});
test('complete exact 223-file manifest requires unique safe paths and build marker', () => {
  assert.equal(api.parseManifest(manifest()).length, 223);
  for (const value of [manifest().replace('files/0.js', '../0.js'), manifest().replace('files/0.js', '/0.js'),
    manifest().replace('files/0.js', 'files/1.js'), manifest().replace('files/0.js', 'files//0.js'),
    manifest().replace('files/0.js', 'files/./0.js'), manifest().replace('__recovery__/build.json', 'missing.json'),
    manifest().replace('index.html', 'missing-index.html'), manifest().trim().split('\n').slice(1).join('\n')])
    assert.throws(() => api.parseManifest(value));
});
test('actual build marker is source-bound and preserves full artifact equality for runtime readback', () => {
  const f = fixture(), marker = { product: 'Gravicentra Insurance', gate: 'I6.6', sourceSha: f.expected.sourceSha, buildId: 'gi-i66-d5e64e2f4ab9-57f234755dc1' };
  assert.deepEqual(api.validateMarker(marker, f.expected), marker);
  for (const [key, value] of [['product', 'other'], ['gate', 'LIVE'], ['sourceSha', 'a'.repeat(40)], ['buildId', 'gi-i66-aaaaaaaaaaaa-57f234755dc1'],
    ['buildId', marker.buildId + '\n'], ['buildId', marker.buildId + ' ']]) {
    const changed = clone(marker); changed[key] = value; assert.throws(() => api.validateMarker(changed, f.expected));
  }
});
test('runtime entrypoints cannot execute outside the authorized existing build workflow', async () => {
  await assert.rejects(api.runtimePrepare({}), /WORKFLOW_ONLY/);
  await assert.rejects(api.runtimeFinish({}), /WORKFLOW_ONLY/);
});
test('technical helper has no cloud mutation commands and preserves old public exports', () => {
  for (const name of ['validateAuthorization', 'validateChannels', 'validateRecoverableArtifact']) assert.equal(typeof guard[name], 'function');
  const text = fs.readFileSync(path.join(__dirname, 'gravicentra-i6-6-preview-channel-reuse-guard.cjs'), 'utf8').split('// Independent, exact current-task Preview rollover.')[1];
  assert.ok(text.includes("'hosting:channel:list'"));
  for (const forbidden of ['hosting:channel:delete', 'hosting:channel:deploy', 'hosting:clone', 'functions:delete', "'POST'", "'PATCH'", "'DELETE'", 'firebase-admin']) assert.ok(!text.includes(forbidden), forbidden);
  for (const required of ['verified-backup.zip', 'site-manifest.sha256', 'inventory-before.json', 'inventory-after.json', "'before.json'", "'after.json'", 'PREPARED_READONLY_NOT_ACCEPTED', 'CONCURRENT_BEFORE_CHANGE', 'OTHER_CHANNEL_CHANGED']) assert.ok(text.includes(required), required);
});
