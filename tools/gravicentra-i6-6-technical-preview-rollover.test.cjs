'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const guard = require('./gravicentra-i6-6-preview-channel-reuse-guard.cjs');
const candidateGuard = require('./gravicentra-i6-6-operational-release-candidate.cjs');
const api = guard.technicalRollover;
const pin = guard.technicalRolloverCandidatePin();
const receiptText = fs.readFileSync(path.join(__dirname, '..', pin.receiptPath), 'utf8');
const receipt = JSON.parse(receiptText);
// Name every immutable historical receipt explicitly. A new successor must not
// rebind old ENOENT/hydration/retention tests by changing their chain depth.
const reloadReceiptPath = 'artifacts/orbit360-recovery/release-control/I6_6_TECHNICAL_PREVIEW_SOURCE_INTAKE_RELOAD_REBUILD_20261117.json';
const reloadReceiptText = fs.readFileSync(path.join(__dirname, '..', reloadReceiptPath), 'utf8');
const reloadReceipt = JSON.parse(reloadReceiptText);
const precisionReceiptPath = 'artifacts/orbit360-recovery/release-control/I6_6_TECHNICAL_PREVIEW_SOURCE_INTAKE_PRECISION_REBUILD_20261117.json';
const precisionReceiptText = fs.readFileSync(path.join(__dirname, '..', precisionReceiptPath), 'utf8');
const precisionReceipt = JSON.parse(precisionReceiptText);
const documentedReceiptPath = 'artifacts/orbit360-recovery/release-control/I6_6_TECHNICAL_PREVIEW_DOCUMENTED_SOURCE_AND_TRANSPORT_REBUILD_20261117.json';
const documentedReceiptText = fs.readFileSync(path.join(__dirname, '..', documentedReceiptPath), 'utf8');
const documentedReceipt = JSON.parse(documentedReceiptText);
const hydrationReceiptPath = 'artifacts/orbit360-recovery/release-control/I6_6_TECHNICAL_PREVIEW_HYDRATION_AND_BALANCE_REBUILD_20261117.json';
const hydrationReceiptText = fs.readFileSync(path.join(__dirname, '..', hydrationReceiptPath), 'utf8');
const hydrationReceipt = JSON.parse(hydrationReceiptText);
const retentionReceiptPath = 'artifacts/orbit360-recovery/release-control/I6_6_TECHNICAL_PREVIEW_DIAGNOSTIC_RETENTION_REBUILD_20261117.json';
const retentionReceiptText = fs.readFileSync(path.join(__dirname, '..', retentionReceiptPath), 'utf8');
const retentionReceipt = JSON.parse(retentionReceiptText);
const observabilityReceiptPath = 'artifacts/orbit360-recovery/release-control/I6_6_TECHNICAL_PREVIEW_OBSERVABILITY_REBUILD_20261116.json';
const observabilityReceiptText = fs.readFileSync(path.join(__dirname, '..', observabilityReceiptPath), 'utf8');
const observabilityReceipt = JSON.parse(observabilityReceiptText);
// Historical failed-residual tests stay bound to their original immutable
// receipt, independently of how many successful Preview backups follow it.
const residualReceiptPath = 'artifacts/orbit360-recovery/release-control/I6_6_TECHNICAL_PREVIEW_ROLLOVER_CAUSAL_RETRY_20261116.json';
const residualReceiptText = fs.readFileSync(path.join(__dirname, '..', residualReceiptPath), 'utf8');
const residualReceipt = JSON.parse(residualReceiptText);
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
  const expected = clone(residualReceipt.previousCandidate);
  const run = { id: expected.buildRunId, head_sha: expected.sourceSha, head_branch: a.branch,
    path: '.github/workflows/gravicentra-release-delta-66-package.yml', status: 'completed', conclusion: 'failure', run_attempt: 1 };
  const artifact = { id: expected.artifactId, name: 'gi-i66-immutable-' + expected.sourceSha,
    digest: expected.artifactDigest, expired: false, size_in_bytes: 1024,
    workflow_run: { id: expected.buildRunId, head_sha: expected.sourceSha, head_branch: a.branch } };
  const candidate = { sourceSha: 'a'.repeat(40), buildRunId: 44020000001, previewChannelId: a.channel.id,
    previewUrl: a.channel.origin, previewRollover: clone(pin) };
  return { a, control, inventory, expected, run, artifact, candidate,
    residualBackupProof: api.validateResidualBackup(residualFixture()) };
}

// Contract fixtures model the caller's already rehashed archive/inventory
// arguments. They do not claim that synthetic rows have the real archive hash.
// Runtime independently calculates those hashes before calling this validator.
function residualFixture() {
  const p = residualReceipt.previousCandidate, boundary = p.backupOnlyPostDeployFailure;
  const run = { id: p.buildRunId, run_attempt: 1, head_sha: p.sourceSha, head_branch: receipt.branch,
    path: '.github/workflows/gravicentra-release-delta-66-package.yml', status: 'completed', conclusion: 'failure' };
  const artifact = { id: boundary.evidenceArtifactId, name: 'gi-i66-technical-preview-rollover-' + p.buildRunId,
    digest: boundary.evidenceArtifactDigest, expired: false, size_in_bytes: 16290215,
    workflow_run: { id: p.buildRunId, head_sha: p.sourceSha, head_branch: receipt.branch } };
  const steps = boundary.requiredSuccessSteps.map(number => ({ number, name: 'successful-step-' + number,
    status: 'completed', conclusion: 'success' }));
  steps.push({ number: 13, name: boundary.failedStepName, status: 'completed', conclusion: 'failure' });
  steps.push({ number: 27, name: 'Post Run actions/setup-node@v4', status: 'completed', conclusion: 'skipped' });
  steps.sort((a, b) => a.number - b.number);
  const jobs = [
    { id: 133824937377, run_id: p.buildRunId, name: 'gate', status: 'completed', conclusion: 'success' },
    { id: boundary.jobId, run_id: p.buildRunId, name: 'immutable-package', status: 'completed', conclusion: 'failure', steps },
    { id: 133825038076, run_id: p.buildRunId, name: 'protected-conciliaciones-reader-preview', status: 'completed', conclusion: 'skipped' }
  ];
  const common = { channelId: receipt.channel.id, sourceSha: p.sourceSha, buildRunId: p.buildRunId,
    receiptSha256: boundary.priorReceiptSha256, productAccepted: false, liveWrites: 0, backendWrites: 0,
    businessDataWrites: 0, channelDeletions: 0, authRulesIamWrites: 0 };
  const before = { ...common, schema: 'GI_I66_TECHNICAL_PREVIEW_BEFORE_V1', status: 'PREPARED_READONLY_NOT_ACCEPTED',
    previewWrites: 0, newCandidate: { sourceSha: p.sourceSha, buildRunId: p.buildRunId,
      artifactId: p.artifactId, artifactDigest: p.artifactDigest }, inventorySha256: boundary.beforeInventorySha256 };
  const after = { ...common, schema: 'GI_I66_TECHNICAL_PREVIEW_AFTER_V1', status: 'HOLD',
    failureCode: 'I66_TECHNICAL_ROLLOVER_RUNTIME_HOLD', readOnlyVerifierWrites: 0, signedFunctionalPass: false };
  const inventory = { result: { channels: Array.from({ length: 51 }, (_, i) => ({ channelId: 'fixture-' + i })) } };
  return { run, jobs, artifact, archiveDigest: artifact.digest, before, after,
    inventorySha256: before.inventorySha256, inventory };
}

function acceptedBackupFixture() {
  const f = fixture(), expected = clone(receipt.previousCandidate);
  return { ...f, expected, run: { ...f.run, id: expected.buildRunId, head_sha: expected.sourceSha,
    conclusion: 'success', run_attempt: expected.buildRunAttempt }, artifact: { ...f.artifact,
    id: expected.artifactId, name: 'gi-i66-immutable-' + expected.sourceSha, digest: expected.artifactDigest,
    workflow_run: { id: expected.buildRunId, head_sha: expected.sourceSha, head_branch: receipt.branch } } };
}
function manifest() {
  return ['index.html', '__recovery__/build.json', ...Array.from({ length: 221 }, (_, i) => 'files/' + i + '.js')]
    .map(name => 'a'.repeat(64) + '  ' + name).join('\n') + '\n';
}

test('exact independently authorized technical receipt has immutable bytes, not legal authorization', () => {
  assert.equal(pin.receiptPath, 'artifacts/orbit360-recovery/release-control/I6_6_TECHNICAL_PREVIEW_NETWORK_DIAGNOSTIC_REBUILD_20261117.json');
  assert.equal(digest(receiptText), '42b558b0720fdb5d8c8a907a8ed5415cb769232e2409efbb4dde9fdaef724c04');
  assert.equal(pin.receiptSha256, digest(receiptText));
  assert.equal(receipt.executionAuthority.newLegalConsentGrantUsedForHosting, false);
  assert.equal(api.validateAuthorization(fixture().control, receiptText).channel.id, 'gi-i66-rc-44009981499');
});
test('documented source successor preserves all exact prior receipts and the historical failed build', () => {
  assert.equal(digest(reloadReceiptText), 'ae6d48b0260af9e9db7b7ba69e799a4a17e7adf23a24f1893168079dce05bf35');
  assert.equal(digest(precisionReceiptText), '25ad1090222d97dcc86d0670088658f92e8e33cb459b4fdaaa669b66ad84d7ba');
  assert.equal(digest(documentedReceiptText), 'dc85b2690778aa92452663f03e3f5e5c1c3df50d37f7914aeb6fef1d83577d41');
  assert.equal(digest(hydrationReceiptText), '6db064d9494103f4cd31ecf9a34e589f66455d2a818f3c0b945839872b1c6e8a');
  assert.equal(digest(retentionReceiptText), '2ebd606814ca551e548bbc7537fc6016b7e0926d4806083957aa9fc65e70b8ab');
  assert.equal(digest(observabilityReceiptText), '215bfcc8fc5cffdf5c630a6696944791ea8859f0ffdd4cf35e8ba98e231eee41');
  assert.equal(digest(residualReceiptText), 'f0c17d2597caa8d83b281fa5b42d02016c6223035a34d894fc8e65bea687cd5d');
  for (const [successor, historicalPath, historicalText] of [
    [receipt, reloadReceiptPath, reloadReceiptText],
    [reloadReceipt, precisionReceiptPath, precisionReceiptText],
    [precisionReceipt, documentedReceiptPath, documentedReceiptText],
    [documentedReceipt, hydrationReceiptPath, hydrationReceiptText],
    [hydrationReceipt, retentionReceiptPath, retentionReceiptText],
    [retentionReceipt, observabilityReceiptPath, observabilityReceiptText],
    [observabilityReceipt, residualReceiptPath, residualReceiptText]
  ]) {
    assert.deepEqual(successor.priorRolloverReceipt,
      { path: historicalPath, sha256: digest(historicalText), preserveBytes: true });
  }
  assert.equal(residualReceipt.causalRetry.failedRunRemainsFailed, true);
  assert.equal(receipt.causalRetry.newSourceRequiresNewBuildDigest, true);
  assert.equal(residualReceipt.previousCandidate.backupOnlyPostDeployFailure.noFunctionalAcceptance, true);
  assert.equal(residualReceipt.previousCandidate.backupOnlyPostDeployFailure.neverEligibleForLive, true);
  assert.equal(receipt.previousCandidate.backupOnlyPostDeployFailure, undefined);
  assert.equal(receipt.causalRetry.doNotRetroactivelyClassifyConsole, true);
  assert.equal(receipt.causalRetry.preserveFunctionalChecksAndCleanup, true);
});
test('candidate pin is a fresh exact object with the recoverable previous artifact', () => {
  const changed = guard.technicalRolloverCandidatePin(); changed.channel = 'live';
  assert.equal(guard.technicalRolloverCandidatePin().channel, 'gi-i66-rc-44009981499');
  assert.equal(pin.previousArtifactId, 14369500963);
  assert.equal(api.validateCandidateReuse(fixture().candidate).receiptSha256, pin.receiptSha256);
});
test('historical documented source rebuild retains exact signed aa200 package and metadata source', () => {
  assert.equal(documentedReceipt.sourceBaseHead, 'e73cdb18deca517580490e28b56c646b693095fe');
  assert.deepEqual(documentedReceipt.previousCandidate, {
    sourceSha: 'aa200b1de0aa5c654338b2f7de8bec9e38af86ec', buildRunId: 44040873624,
    buildRunAttempt: 1, artifactId: 14309566018,
    artifactDigest: 'sha256:06567c6f22974677d314ddc51e63896cca02c95ed762da24a7874cf9deafa72b',
    expectedSiteFileCount: 223,
    runtimeProofRequired: 'DOWNLOAD_HASH_ARCHIVE_VALIDATE_MANIFEST_AND_COMPARE_EVERY_HOSTED_FILE_INCLUDING_BUILD_JSON_BEFORE_REPLACEMENT'
  });
  assert.equal(documentedReceipt.channel.expectedVersion, 'sites/ays-orbit-360-lab/versions/0036a44c481df7ee');
  assert.equal(documentedReceipt.freshInventoryEvidence.totalChannels, 51);
  assert.equal(documentedReceipt.freshInventoryEvidence.otherChannelsIdenticalFullMetadata, 50);
  assert.equal(documentedReceipt.freshInventoryEvidence.freshRuntimeInventoryRequiredAgain, true);
  assert.equal(documentedReceipt.freshInventoryEvidence.afterInventorySha256,
    '21750b8644c121746258d05efad90601c7e8d72f4405c3a4abf375ef8d12e4be');
  assert.equal(documentedReceipt.freshInventoryEvidence.runId, 44040873624);
  assert.equal(documentedReceipt.freshInventoryEvidence.runAttempt, 1);
  assert.equal(documentedReceipt.freshInventoryEvidence.jobId, 133894973811);
  assert.equal(documentedReceipt.freshInventoryEvidence.rolloverEvidenceArtifactId, 14310135272);
  assert.equal(documentedReceipt.freshInventoryEvidence.rolloverEvidenceArtifactDigest,
    'sha256:1709891d5d7b609ce77bc46b8d74829db4fc94314f87c13a412de70f94f8bc7f');
  assert.deepEqual(documentedReceipt.protectedLive, hydrationReceipt.protectedLive);
});
test('historical source intake reload rebuild preserves 6b6 backup, e71 source and exact full channel inventory', () => {
  assert.equal(reloadReceipt.sourceBaseHead, 'e71b3deffda0143cfef0e0ecd1153921277c3d52');
  assert.deepEqual(reloadReceipt.previousCandidate, {
    sourceSha: '6b6e8bbba3371b32a1bfb80b903c40377e11d727', buildRunId: 44052221474,
    buildRunAttempt: 1, artifactId: 14314985190,
    artifactDigest: 'sha256:e97f86355181a8c685b8dd800626a4885f8e34b45222f178d15355d76cbf499f',
    expectedSiteFileCount: 223,
    runtimeProofRequired: 'DOWNLOAD_HASH_ARCHIVE_VALIDATE_MANIFEST_AND_COMPARE_EVERY_HOSTED_FILE_INCLUDING_BUILD_JSON_BEFORE_REPLACEMENT'
  });
  assert.equal(reloadReceipt.channel.expectedVersion, 'sites/ays-orbit-360-lab/versions/0964cef6b576a2ad');
  assert.deepEqual(reloadReceipt.freshInventoryEvidence, {
    runId: 44052221474, runAttempt: 1, jobId: 133932744471,
    totalChannels: 51, inventoryStep: 'SUCCESS', wholeJob: 'SUCCESS',
    rolloverEvidenceArtifactId: 14314815423,
    rolloverEvidenceArtifactDigest: 'sha256:e21b2db71930cd866f2d1870012a3353c09fc62790fdaa18428c52e526fe63b5',
    afterInventorySha256: '43f892b0006b0a0d606bacf08b89b931ede062cc7205f00729a9bb742a69a2e5',
    comparison: 'FULL_OTHER_FIFTY_CHANNEL_METADATA_EXACT_BEFORE_AFTER',
    otherChannelsIdenticalFullMetadata: 50, writes: 0, freshRuntimeInventoryRequiredAgain: true
  });
});
test('current passive network diagnostic rebuild pins 62d500 backup and the observed full channel inventory', () => {
  assert.equal(receipt.sourceBaseHead, '181264419c614c9a8a0843fc834a95542e0f297a');
  assert.deepEqual(receipt.previousCandidate, {
    sourceSha: '62d50052a9b9196ebce8c4acd1bc66778ae89c06', buildRunId: 44173813709,
    buildRunAttempt: 1, artifactId: 14369500963,
    artifactDigest: 'sha256:e31583c35aa76e2fcd904ffd1caa61bf589c9ada9acc4dd307a30e731e814c81',
    expectedSiteFileCount: 223,
    runtimeProofRequired: 'DOWNLOAD_HASH_ARCHIVE_VALIDATE_MANIFEST_AND_COMPARE_EVERY_HOSTED_FILE_INCLUDING_BUILD_JSON_BEFORE_REPLACEMENT'
  });
  assert.equal(receipt.channel.expectedVersion, 'sites/ays-orbit-360-lab/versions/0edf4cfe763bf50a');
  assert.deepEqual(receipt.freshInventoryEvidence, {
    runId: 44173813709, runAttempt: 1, jobId: 134359885977,
    totalChannels: 51, inventoryStep: 'SUCCESS', wholeJob: 'SUCCESS',
    rolloverEvidenceArtifactId: 14369695981,
    rolloverEvidenceArtifactDigest: 'sha256:fc5300210d9902dfcdef34e58fc1d0b6979e8f3e4e6f825e3399a31493615fe8',
    afterInventorySha256: '9f0925f33cfdcfa29838818807a38cd04d011ef03fd1494ff2df1bffcf1353c8',
    comparison: 'FULL_OTHER_FIFTY_CHANNEL_METADATA_EXACT_BEFORE_AFTER',
    otherChannelsIdenticalFullMetadata: 50, writes: 0, freshRuntimeInventoryRequiredAgain: true
  });
  assert.equal(receipt.previousPreviewReadback.files, 223);
  assert.equal(receipt.previousPreviewReadback.manifestSha256, '4bdd76cbfe0722343c1a9a909bc0b3d6c25cb386cf152a70275fb4e03aee4d85');
  assert.equal(receipt.previousPreviewReadback.runtimeFullReadbackRequiredAgain, true);
  assert.equal(receipt.causalRetry.failedPreviewRunId, 44175297317);
  assert.equal(receipt.causalRetry.readonlyLoggingRunId, 44178934101);
  assert.equal(receipt.causalRetry.readonlyLoggingHttpStatus, 403);
  assert.equal(receipt.causalRetry.readonlyLoggingPagesRead, 0);
  assert.equal(receipt.causalRetry.historicalRootCauseProven, false);
});
test('current network diagnostic rebuild preserves exact LIVE847 without authorizing LIVE changes', () => {
  assert.deepEqual(receipt.protectedLive, {
    sourceSha: '84769378eb2014addebfefdbdd63091bddc4b817', buildRunId: 43503721126,
    artifactId: 14075022275,
    artifactDigest: 'sha256:b0f3bacb68511cdfc91ac934602c51f55afec5c1d6428d886d13a72a706ee283',
    liveRunId: 43506971214, version: 'sites/ays-orbit-360-lab/versions/0766db29b338befc',
    origins: ['https://ays-orbit-360-lab.web.app', 'https://app.aysseguros.com']
  });
  for (const historical of [reloadReceipt, precisionReceipt, documentedReceipt, hydrationReceipt, retentionReceipt, observabilityReceipt, residualReceipt])
    assert.deepEqual(receipt.protectedLive, historical.protectedLive);
  assert.equal(receipt.phase, 'PREVIEW');
  assert.equal(receipt.constraints.noLiveChanges, true);
  assert.equal(receipt.constraints.noBusinessDataWrites, true);
  assert.equal(receipt.causalRetry.noLiveOrRealPaymentAuthority, true);
  assert.deepEqual(receipt.notAcceptance, documentedReceipt.notAcceptance);
});
test('causal successor preserves the actual 28ab signed HOLD without inventing the missing collection', () => {
  assert.equal(hydrationReceipt.causalRetry.failedSignedRunId, 44036302099);
  assert.equal(hydrationReceipt.causalRetry.failedSignedRunAttempt, 1);
  assert.equal(hydrationReceipt.causalRetry.failedSignedJobId, 133879992708);
  assert.equal(hydrationReceipt.causalRetry.failedSignedRunRemainsFailed, true);
  assert.equal(hydrationReceipt.causalRetry.failedDiagnosticArtifactId, 14308105281);
  assert.equal(hydrationReceipt.causalRetry.failedDiagnosticArtifactDigest,
    'sha256:16374d7c199531c075b49d5d677d37cfa04c0aa76285069dab9e8292e296f391');
  assert.equal(hydrationReceipt.causalRetry.observedStage, 'FINANCE_UI_HYDRATION');
  assert.equal(hydrationReceipt.causalRetry.observedContext, 'Global driver stage; only Direction navigates Finance, Operativo remains at Inicio with deferred hydration; collection not retained.');
  assert.equal(hydrationReceipt.causalRetry.observedEndpoint, 'orbit360ScopedPolicyReadPreview');
  assert.deepEqual(hydrationReceipt.causalRetry.observedHttpStatusCodes, [403, 403]);
  assert.equal(hydrationReceipt.causalRetry.observedHttpErrorCount, 2);
  assert.equal(hydrationReceipt.causalRetry.observedConsoleErrorCount, 2);
  assert.equal(hydrationReceipt.causalRetry.observedPageErrorCount, 0);
  assert.equal(hydrationReceipt.causalRetry.historicalRequestedCollectionRetained, false);
  assert.equal(hydrationReceipt.causalRetry.historicalRequestedCollection, null);
  assert.equal(hydrationReceipt.causalRetry.proposalDriverExecuted, false);
  assert.equal(hydrationReceipt.causalRetry.unexpectedErrorsRemainHold, true);
  assert.equal(hydrationReceipt.causalRetry.doNotRetroactivelyClassifyConsole, true);
  assert.equal(hydrationReceipt.causalRetry.noBackendOrFinancialRulesChange, true);
  assert.equal(hydrationReceipt.causalRetry.frontendDiagnosticOnly, undefined);
  assert.equal(hydrationReceipt.causalRetry.frontendReadModelAndHydrationOnly, true);
  assert.equal(hydrationReceipt.causalRetry.noProductRuntimeOrFinancialRulesChange, undefined);
  assert.equal(hydrationReceipt.causalRetry.noLiveOrRealPaymentAuthority, true);
  assert.deepEqual(receipt.notAcceptance, hydrationReceipt.notAcceptance);
});

test('failed LIVE layout never becomes acceptance or bypasses a fresh signed Preview', () => {
  assert.equal(documentedReceipt.causalRetry.failedLiveRunId, 44043379496);
  assert.equal(documentedReceipt.causalRetry.failedLiveJobId, 133903202885);
  assert.equal(documentedReceipt.causalRetry.observedFailureCode, 'ENOENT');
  assert.equal(documentedReceipt.causalRetry.failedBeforeCredentialsAndDeploy, true);
  assert.equal(documentedReceipt.causalRetry.failedRunRemainsFailed, true);
  assert.equal(documentedReceipt.causalRetry.newSourceRequiresNewBuildDigest, true);
  assert.equal(documentedReceipt.causalRetry.noReuseOfPriorPreviewPassForNewSource, true);
  assert.equal(documentedReceipt.causalRetry.priorSignedPreview.runId, 44041870642);
  assert.equal(documentedReceipt.causalRetry.priorSignedPreview.artifactId, 14310490418);
  assert.equal(documentedReceipt.causalRetry.priorSignedPreview.status, 'SIGNED_DRIVERS_DURABLE_READBACK_RELOAD_RESTORE_PASS');
});

test('failed CEF42 helper remains HOLD with unknown cleanup and cannot become LIVE acceptance', () => {
  const receipt = precisionReceipt;
  assert.equal(receipt.causalRetry.failedPreviewRunId, 44048179414);
  assert.equal(receipt.causalRetry.failedPreviewRunAttempt, 1);
  assert.equal(receipt.causalRetry.diagnosticArtifactId, 14312547286);
  assert.equal(receipt.causalRetry.diagnosticArtifactDigest,
    'sha256:3256551e8363132605f8dbb4c7a27c273f89bb5f142fb7d1aa74dc9d5d3b0553');
  assert.equal(receipt.causalRetry.failedRunRemainsFailed, true);
  assert.equal(receipt.causalRetry.lastProvenStage,
    'DOCUMENTED_ASSIGNMENT_NATIVE_UI_PREVIEW_CONFIRM_RELOAD_REPLAY_COMPENSATION_PRESERVES_ALL_FINANCIAL_RELATIONS');
  assert.equal(receipt.causalRetry.helperRuntimeFailureCodeNotRetained, true);
  assert.equal(receipt.causalRetry.locallyReproducedCode, 'I66_DOCUMENTED_TERMS_UI_PREVIEW_MISMATCH');
  assert.equal(receipt.causalRetry.previousHelperCleanupNotDemonstrated, true);
  assert.equal(receipt.causalRetry.preserveFunctionalChecksAndCleanup, true);
  assert.equal(receipt.causalRetry.unexpectedErrorsRemainHold, true);
  assert.equal(receipt.causalRetry.noReuseOfPriorPreviewPassForNewSource, true);
  assert.equal(receipt.causalRetry.noRebuildOfCertifiedArtifactInPlace, true);
  assert.equal(receipt.causalRetry.noLiveOrRealPaymentAuthority, true);
  assert.equal(receipt.notAcceptance.hostingReplacementIsNotSignedFunctionalPass, true);
  assert.equal(receipt.notAcceptance.hostingReplacementIsNotProductionAcceptance, true);
  const f = fixture();
  assert.equal(api.validateAuthorization(f.control, receiptText).phase, 'PREVIEW');
  f.control.livePromotionAuthorized = true;
  assert.throws(() => api.validateAuthorization(f.control, receiptText), /SCOPE_DRIFT/);
});

test('failed 6b6 source-intake reload remains HOLD with preserved cleanup and unproven historical cause', () => {
  const receipt = reloadReceipt;
  assert.equal(receipt.causalRetry.failedPreviewRunId, 44149681372);
  assert.equal(receipt.causalRetry.failedPreviewJobId, 134274317530);
  assert.equal(receipt.causalRetry.diagnosticArtifactId, 14359840043);
  assert.equal(receipt.causalRetry.diagnosticArtifactDigest,
    'sha256:19fb4390b1b15274372eb974ab28bb0839e99a750f20ea0618385708ef50a657');
  assert.equal(receipt.causalRetry.observedFailureStage, 'SOURCE_INTAKE_RELOAD_READBACK');
  assert.equal(receipt.causalRetry.historicalRootCauseProven, false);
  assert.equal(receipt.causalRetry.observedPageErrors, 1);
  assert.equal(receipt.causalRetry.priorSyntheticCleanup, 'PASS');
  assert.equal(receipt.causalRetry.priorSyntheticRemaining, 0);
  assert.equal(receipt.causalRetry.priorProposalOwnedRecordsRemoved, 26);
  assert.equal(receipt.causalRetry.priorRealControlUnchanged, true);
  assert.equal(receipt.causalRetry.failedRunRemainsFailed, true);
  assert.equal(receipt.causalRetry.unexpectedErrorsRemainHold, true);
  assert.equal(receipt.causalRetry.noReuseOfPriorPreviewPassForNewSource, true);
  assert.equal(receipt.notAcceptance.hostingReplacementIsNotProductionAcceptance, true);
});

test('stale successful backup receipt or stale before version cannot authorize the current rollover', () => {
  const f = fixture();
  assert.throws(() => api.validateAuthorization(f.control, documentedReceiptText), /EXACT_RECEIPT_BYTES_REQUIRED/);
  f.inventory.result[0].release.version.name = documentedReceipt.channel.expectedVersion;
  assert.throws(() => api.validateChannels(f.control, receiptText, f.inventory), /PREVIEW_VERSION_DRIFT/);
});
test('current backup requires build success and never borrows historical residual or signed-QA failure', () => {
  const f = acceptedBackupFixture();
  f.run.conclusion = 'failure';
  assert.throws(() => api.validateArtifact(f.run, f.artifact, f.expected,
    { residualBackupProof: f.residualBackupProof }), /BACKUP_BUILD_NOT_SUCCESS/);
  assert.throws(() => candidateGuard.validateArtifact(f.expected, f.run, f.artifact));
  f.run.id = 44036302099;
  assert.throws(() => api.validateArtifact(f.run, f.artifact, f.expected), /BUILD_ID_DRIFT/);
});
test('new receipt and retained diagnostic test are pinned immutable owners and existing build triggers', () => {
  const workflow = fs.readFileSync(path.join(__dirname, '..', '.github/workflows/gravicentra-release-delta-66-package.yml'), 'utf8');
  const paths = workflow.split('\npermissions:')[0];
  for (const owner of [pin.receiptPath, 'tools/gravicentra-i6-6-preview-failure-diagnostics-retention.test.cjs']) {
    assert.equal(candidateGuard.PINNED_OWNER_PATHS.filter(value => value === owner).length, 1);
    assert.equal(paths.split('\n').filter(line => line.trim() === '- ' + owner).length, 1);
  }
  assert.ok(workflow.includes('node --test tools/gravicentra-i6-6-preview-failure-diagnostics-retention.test.cjs'));
});
test('both new regressions and protected hydration fixtures are pinned without changing the gate', () => {
  for (const owner of [
    'tools/gravicentra-i6-6-receipt-current-balance.test.cjs',
    'tools/gravicentra-i6-6-protected-role-policy-hydration.test.cjs',
    'tools/gravicentra-b4-003-protected-hydration.test.cjs',
    'tools/gravicentra-b4-003-post-auth-bootstrap-diagnostic.test.cjs'
  ]) assert.equal(candidateGuard.PINNED_OWNER_PATHS.filter(value => value === owner).length, 1);
  const workflow = fs.readFileSync(path.join(__dirname, '..', '.github/workflows/gravicentra-release-delta-66-package.yml'), 'utf8');
  assert.ok(workflow.includes('node --test tools/gravicentra-b4-003-protected-hydration.test.cjs tools/gravicentra-b4-003-post-auth-bootstrap-diagnostic.test.cjs'));
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
test('current backup must be its exact successful whole build and unexpired artifact', () => {
  const f = acceptedBackupFixture(); assert.equal(api.validateArtifact(f.run, f.artifact, f.expected).artifactId, 14369500963);
});
for (const key of ['id', 'head_sha', 'head_branch', 'path', 'status', 'conclusion', 'run_attempt']) {
  test('previous artifact rejects build provenance drift ' + key, () => {
    const f = fixture(); f.run[key] = 'different';
    assert.throws(() => api.validateArtifact(f.run, f.artifact, f.expected, { residualBackupProof: f.residualBackupProof }));
  });
}
for (const key of ['id', 'name', 'digest', 'expired', 'size_in_bytes']) test('backup artifact requires exact ' + key, () => {
  const f = fixture(); f.artifact[key] = key === 'expired' ? true : 'different';
  assert.throws(() => api.validateArtifact(f.run, f.artifact, f.expected, { residualBackupProof: f.residualBackupProof }));
});
for (const key of ['id', 'head_sha', 'head_branch']) test('artifact workflow identity cannot drift ' + key, () => {
  const f = fixture(); f.artifact.workflow_run[key] = 'different';
  assert.throws(() => api.validateArtifact(f.run, f.artifact, f.expected, { residualBackupProof: f.residualBackupProof }));
});
test('new artifact provenance allows only the current running immutable build, not failed or completed', () => {
  const f = acceptedBackupFixture(); f.run.status = 'in_progress'; f.run.conclusion = null;
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
  const f = fixture(), marker = { product: 'Gravicentra Insurance', gate: 'I6.6', sourceSha: f.expected.sourceSha, buildId: 'gi-i66-3820817d8fca-57f234755dc1' };
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

test('exact failed residual yields backup-only proof and never functional or release acceptance', () => {
  const f = residualFixture(), p = residualReceipt.previousCandidate;
  const proof = api.validateResidualBackup(f);
  assert.deepEqual(proof, { purpose: 'RECOVERABLE_UNACCEPTED_PREVIEW_BACKUP_ONLY', sourceSha: p.sourceSha,
    buildRunId: p.buildRunId, artifactId: p.artifactId, artifactDigest: p.artifactDigest,
    evidenceArtifactId: p.backupOnlyPostDeployFailure.evidenceArtifactId,
    evidenceArtifactDigest: p.backupOnlyPostDeployFailure.evidenceArtifactDigest,
    productAccepted: false, releaseEligible: false });
  const source = fixture();
  assert.equal(api.validateArtifact(source.run, source.artifact, source.expected, { residualBackupProof: proof }), source.expected);
  assert.equal(source.run.conclusion, 'failure');
});

for (const key of ['run', 'jobs', 'artifact', 'archiveDigest', 'before', 'after', 'inventorySha256', 'inventory']) {
  test('residual proof rejects missing required input ' + key, () => {
    const f = residualFixture(); delete f[key]; assert.throws(() => api.validateResidualBackup(f));
  });
}

for (const key of ['id', 'run_attempt', 'status', 'conclusion', 'head_sha', 'head_branch', 'path']) {
  test('residual proof rejects exact failed run identity drift ' + key, () => {
    const f = residualFixture(); f.run[key] = key === 'conclusion' ? 'success' : 'drift';
    assert.throws(() => api.validateResidualBackup(f));
  });
}

for (const key of ['id', 'name', 'digest', 'expired']) {
  test('residual evidence metadata is pinned ' + key, () => {
    const f = residualFixture(); f.artifact[key] = key === 'expired' ? true : 'drift';
    assert.throws(() => api.validateResidualBackup(f));
  });
}
for (const key of ['id', 'head_sha', 'head_branch']) {
  test('residual evidence artifact belongs to the exact failed build ' + key, () => {
    const f = residualFixture(); f.artifact.workflow_run[key] = 'drift';
    assert.throws(() => api.validateResidualBackup(f));
  });
}
for (const value of ['sha256:' + 'a'.repeat(64), receipt.previousCandidate.artifactDigest, '', undefined]) {
  test('residual evidence rejects recalculated archive digest ' + String(value).slice(0, 20), () => {
    const f = residualFixture(); f.archiveDigest = value; assert.throws(() => api.validateResidualBackup(f));
  });
}

for (const [label, mutate] of [
  ['missing job', f => f.jobs.pop()],
  ['extra job', f => f.jobs.push({ name: 'unexpected', conclusion: 'success' })],
  ['duplicate name', f => { f.jobs[2] = clone(f.jobs[0]); }],
  ['unknown gate', f => { f.jobs[0].name = 'another-gate'; }],
  ['gate failed', f => { f.jobs[0].conclusion = 'failure'; }],
  ['gate skipped', f => { f.jobs[0].conclusion = 'skipped'; }],
  ['reader succeeded instead of skipped', f => { f.jobs[2].conclusion = 'success'; }],
  ['reader failed', f => { f.jobs[2].conclusion = 'failure'; }],
  ['missing immutable job', f => { f.jobs[1].name = 'another-build'; }]
]) test('residual proof rejects job-set drift: ' + label, () => {
  const f = residualFixture(); mutate(f); assert.throws(() => api.validateResidualBackup(f));
});

for (const key of ['id', 'run_id', 'status', 'conclusion']) {
  test('residual build job is exact and still failed ' + key, () => {
    const f = residualFixture(); f.jobs[1][key] = 'drift'; assert.throws(() => api.validateResidualBackup(f));
  });
}
for (const number of residualReceipt.previousCandidate.backupOnlyPostDeployFailure.requiredSuccessSteps) {
  for (const conclusion of ['failure', 'skipped', null]) {
    test('residual backup requires successful step ' + number + ', rejects ' + conclusion, () => {
      const f = residualFixture(); f.jobs[1].steps.find(s => s.number === number).conclusion = conclusion;
      assert.throws(() => api.validateResidualBackup(f));
    });
  }
  test('residual backup requires present successful step ' + number, () => {
    const f = residualFixture(); f.jobs[1].steps = f.jobs[1].steps.filter(s => s.number !== number);
    assert.throws(() => api.validateResidualBackup(f));
  });
}
for (const [label, mutate] of [
  ['failure absent', f => { f.jobs[1].steps.find(s => s.number === 13).conclusion = 'success'; }],
  ['wrong failed number', f => { f.jobs[1].steps.find(s => s.number === 13).number = 99; }],
  ['wrong failed name', f => { f.jobs[1].steps.find(s => s.number === 13).name = 'Publish a different artifact'; }],
  ['second failed step', f => f.jobs[1].steps.push({ number: 77, name: 'unexpected failure', conclusion: 'failure' })],
  ['duplicate failure', f => f.jobs[1].steps.push(clone(f.jobs[1].steps.find(s => s.number === 13)))]
]) test('residual backup permits only the exact known verifier failure: ' + label, () => {
  const f = residualFixture(); mutate(f); assert.throws(() => api.validateResidualBackup(f));
});

for (const side of ['before', 'after']) {
  for (const key of ['channelId', 'sourceSha', 'buildRunId', 'receiptSha256']) {
    test('residual receipt ' + side + ' exact identity ' + key, () => {
      const f = residualFixture(); f[side][key] = 'drift'; assert.throws(() => api.validateResidualBackup(f));
    });
  }
  test('residual receipt ' + side + ' cannot claim product acceptance', () => {
    const f = residualFixture(); f[side].productAccepted = true; assert.throws(() => api.validateResidualBackup(f));
  });
  for (const key of ['liveWrites', 'backendWrites', 'businessDataWrites', 'channelDeletions', 'authRulesIamWrites']) {
    for (const value of [1, '0', undefined]) {
      test('residual receipt ' + side + ' requires numeric zero ' + key + ': ' + typeof value + '/' + value, () => {
        const f = residualFixture(); f[side][key] = value; assert.throws(() => api.validateResidualBackup(f));
      });
    }
  }
}

for (const key of ['schema', 'status', 'previewWrites', 'inventorySha256']) {
  test('residual before proof exact ' + key, () => {
    const f = residualFixture(); f.before[key] = 'drift'; assert.throws(() => api.validateResidualBackup(f));
  });
}
for (const key of ['sourceSha', 'buildRunId', 'artifactId', 'artifactDigest']) {
  test('residual before newCandidate matches the residual immutable artifact ' + key, () => {
    const f = residualFixture(); f.before.newCandidate[key] = 'drift'; assert.throws(() => api.validateResidualBackup(f));
  });
}
test('residual before cannot add acceptance scope to the exact candidate record', () => {
  const f = residualFixture(); f.before.newCandidate.productAccepted = true;
  assert.throws(() => api.validateResidualBackup(f));
});
test('residual inventory requires independently recalculated original bytes digest', () => {
  const f = residualFixture(); f.inventorySha256 = 'a'.repeat(64);
  assert.throws(() => api.validateResidualBackup(f));
});
for (const [label, inventory] of [
  ['absent', undefined], ['null', null], ['unrecognized shape', {}],
  ['empty', { result: [] }], ['not array', { result: { channels: '51' } }],
  ['50 rows', { result: Array.from({ length: 50 }, () => ({})) }],
  ['52 rows', { result: Array.from({ length: 52 }, () => ({})) }]
]) test('residual inventory cannot be missing or change cardinality: ' + label, () => {
  const f = residualFixture(); f.inventory = inventory; assert.throws(() => api.validateResidualBackup(f));
});

for (const [key, value] of [['schema', 'different'], ['status', 'PASS'], ['failureCode', 'OTHER_FAILURE'],
  ['readOnlyVerifierWrites', 1], ['signedFunctionalPass', true], ['hostingVersion', 'sites/ays-orbit-360-lab/versions/invented'],
  ['readbacks', []]]) test('residual after preserves HOLD without invented evidence: ' + key, () => {
  const f = residualFixture(); f.after[key] = value; assert.throws(() => api.validateResidualBackup(f));
});

for (const proof of [undefined, null, {}, { productAccepted: false }, false]) {
  test('failed residual artifact is not recoverable with absent or incomplete proof ' + JSON.stringify(proof), () => {
    const f = fixture();
    assert.throws(() => api.validateArtifact(f.run, f.artifact, f.expected, { residualBackupProof: proof }), /RESIDUAL_BACKUP_PROVENANCE_REQUIRED/);
  });
}
for (const key of Object.keys(api.validateResidualBackup(residualFixture()))) {
  test('failed residual artifact cannot borrow altered backup proof ' + key, () => {
    const f = fixture(); f.residualBackupProof[key] = typeof f.residualBackupProof[key] === 'boolean' ? true : 'drift';
    assert.throws(() => api.validateArtifact(f.run, f.artifact, f.expected, { residualBackupProof: f.residualBackupProof }), /RESIDUAL_BACKUP_PROVENANCE_REQUIRED/);
  });
}
test('backup-only proof never makes a failed ordinary backup or operational candidate accepted', () => {
  const f = fixture(), p = { buildRunId: f.expected.buildRunId, sourceSha: f.expected.sourceSha,
    artifactId: f.expected.artifactId, artifactDigest: f.expected.artifactDigest };
  assert.throws(() => candidateGuard.validateArtifact(p, f.run, f.artifact));
  const ordinary = clone(f.expected); delete ordinary.backupOnlyPostDeployFailure;
  assert.throws(() => api.validateArtifact(f.run, f.artifact, ordinary, { residualBackupProof: f.residualBackupProof }), /BACKUP_BUILD_NOT_SUCCESS/);
  const historical = acceptedBackupFixture(); historical.run.conclusion = 'failure';
  assert.throws(() => api.validateArtifact(historical.run, historical.artifact, historical.expected,
    { residualBackupProof: f.residualBackupProof }), /BACKUP_BUILD_NOT_SUCCESS/);
});
for (const key of ['sourceSha', 'buildRunId', 'artifactId', 'artifactDigest']) {
  test('backup-only failed profile cannot be generalized to another artifact ' + key, () => {
    const f = fixture(); f.expected[key] = 'drift';
    assert.throws(() => api.validateArtifact(f.run, f.artifact, f.expected, { residualBackupProof: f.residualBackupProof }));
  });
}
test('runtime metadata refuses using the residual failed profile as the new running build', async () => {
  const filename = path.join(__dirname, 'gravicentra-i6-6-preview-channel-reuse-guard.cjs');
  const f = fixture(), mod = { exports: {} }, requests = [];
  const noNetwork = async url => {
    requests.push(url);
    return { ok: true, json: async () => clone(url.includes('/runs/') ? f.run : f.artifact) };
  };
  const make = Function('module', 'exports', 'require', '__dirname', 'process', 'Buffer', 'fetch',
    fs.readFileSync(filename, 'utf8') + '\nreturn technicalRuntimeIo;')
    (mod, mod.exports, require, __dirname, process, Buffer, noNetwork);
  const io = make({ GH_TOKEN: 'fixture-only-no-network' }, '/fixture/no-writes');
  await assert.rejects(io.metadata(f.expected, { currentBuild: true }), /RESIDUAL_BACKUP_CANNOT_BE_NEW_BUILD/);
  assert.equal(requests.length, 2);
  assert.ok(requests.every(url => /^https:\/\/api\.github\.com\/repos\/paulaosoriof86\/orbit360-core\/actions\/(?:runs|artifacts)\//.test(url)));
});

// Offline child-process fixture of Firebase CLI v14.10.1's requireConfig and
// detectProjectRoot behavior. --project does not locate firebase.json, and the
// lookup walks parents, not candidate children. No Firebase credentials/network.
const inventoryRunner = `
const fs=require('node:fs'),path=require('node:path');
const filename=process.argv[1],env=JSON.parse(process.argv[2]),mod={exports:{}};
const code=fs.readFileSync(filename,'utf8');
const read=Function('module','exports','require','__dirname','process','Buffer',
  code+'\\nreturn env=>technicalRuntimeIo(env,"unused").inventory();')
  (mod,mod.exports,require,path.dirname(filename),process,Buffer);
try { process.stdout.write(JSON.stringify(read(env))); }
catch(error) { process.stdout.write(error.message); process.exitCode=1; }
`;

function inventoryProcessFixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gi-i66-inventory-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const runner = path.join(root, 'runner'), workspace = path.join(root, 'workspace');
  const bundle = path.join(runner, 'gi-i66-package', 'bundle');
  fs.mkdirSync(bundle, { recursive: true }); fs.mkdirSync(path.join(workspace, 'candidate'), { recursive: true });
  const config = path.join(bundle, 'firebase.json'), cli = path.join(root, 'firebase-fixture.cjs');
  fs.writeFileSync(config, JSON.stringify({ hosting: { site: 'ays-orbit-360-lab', public: 'site' } }));
  fs.writeFileSync(path.join(workspace, 'candidate', 'firebase.json'), '{"hosting":{"site":"not-the-bundle"}}');
  fs.writeFileSync(cli, `
const fs=require('node:fs'),path=require('node:path'),args=process.argv.slice(2);
const mode=process.env.GI_I66_INVENTORY_FIXTURE_MODE;
if(mode==='invalid-json') { console.log('not-json PRIVATE_FIXTURE_TOKEN'); process.exit(0); }
if(mode==='error-json') { console.log(JSON.stringify({status:'error',error:'PRIVATE_FIXTURE_TOKEN'})); process.exit(0); }
if(mode) { console.error(mode+' Bearer PRIVATE_FIXTURE_TOKEN fixture@example.invalid'); process.exit(1); }
const at=args.indexOf('--config');
let root=process.cwd(),config;
if(at>=0) {
  config=path.resolve(root,args[at+1]);
  if(!fs.existsSync(config)) { console.error('Could not load config file '+config+'.'); process.exit(1); }
} else {
  while(!fs.existsSync(path.join(root,'firebase.json'))&&path.dirname(root)!==root)root=path.dirname(root);
  config=path.join(root,'firebase.json');
  if(!fs.existsSync(config)) { console.error('Not in a Firebase project directory (could not locate firebase.json)'); process.exit(1); }
}
console.log(JSON.stringify({status:'success',result:{channels:[{channelId:'live'}]},fixture:{cwd:process.cwd(),config,args}}));
`);
  const env = { RUNNER_TEMP: runner, FIREBASE_CLI_BIN: cli };
  const execute = (cwd, mode) => execFileSync(process.execPath, ['-e', inventoryRunner,
    path.join(__dirname, 'gravicentra-i6-6-preview-channel-reuse-guard.cjs'), JSON.stringify(env)],
  { cwd, encoding: 'utf8', stdio: 'pipe', env: { ...process.env, GI_I66_INVENTORY_FIXTURE_MODE: mode || '' } });
  return { root, workspace, bundle, config, cli, execute };
}

test('pre-fix invocation reproduces prepare success and finish config failure in real offline child processes', t => {
  const f = inventoryProcessFixture(t);
  const args = [f.cli, 'hosting:channel:list', '--project', 'ays-orbit-360-lab', '--non-interactive', '--json'];
  assert.equal(JSON.parse(execFileSync(process.execPath, args, { cwd: f.bundle, encoding: 'utf8', stdio: 'pipe' })).status, 'success');
  assert.throws(() => execFileSync(process.execPath, args, { cwd: f.workspace, encoding: 'utf8', stdio: 'pipe' }),
    /Not in a Firebase project directory \(could not locate firebase\.json\)/);
});

for (const phase of ['prepare-bundle', 'finish-workspace']) test('runtime inventory pins the same bundle config, cwd and site from ' + phase, t => {
  const f = inventoryProcessFixture(t);
  const result = JSON.parse(f.execute(phase === 'prepare-bundle' ? f.bundle : f.workspace));
  assert.equal(result.status, 'success');
  assert.equal(result.fixture.cwd, f.bundle); assert.equal(result.fixture.config, f.config);
  assert.deepEqual(result.fixture.args, ['hosting:channel:list', '--config', f.config,
    '--project', 'ays-orbit-360-lab', '--site', 'ays-orbit-360-lab', '--non-interactive', '--json']);
});

test('runtime inventory cannot borrow an ambient workspace Firebase config', t => {
  const f = inventoryProcessFixture(t);
  fs.writeFileSync(path.join(f.workspace, 'firebase.json'), '{"hosting":{"site":"foreign-site"}}');
  assert.equal(JSON.parse(f.execute(f.workspace)).fixture.config, f.config);
  fs.unlinkSync(f.config);
  assert.throws(() => f.execute(f.workspace), error => {
    assert.equal(error.stdout, 'I66_TECHNICAL_ROLLOVER_INVENTORY_CONFIG_UNAVAILABLE'); return true;
  });
});

for (const [mode, code] of [
  ['Not in a Firebase project directory (could not locate firebase.json)', 'INVENTORY_CONFIG_NOT_FOUND'],
  ['Could not load config file fixture.', 'INVENTORY_CONFIG_UNAVAILABLE'],
  ['HTTP Error: 403, Permission denied', 'INVENTORY_ACCESS_DENIED'],
  ['Unexpected CLI failure', 'INVENTORY_CLI_FAILED'],
  ['invalid-json', 'INVENTORY_JSON_INVALID'],
  ['error-json', 'INVENTORY_CLI_ERROR_RESULT']
]) test('inventory fails closed with safe diagnostic ' + code, t => {
  const f = inventoryProcessFixture(t);
  assert.throws(() => f.execute(f.workspace, mode), error => {
    assert.equal(error.stdout, 'I66_TECHNICAL_ROLLOVER_' + code);
    assert.equal(error.stderr, '');
    assert.ok(!error.stdout.includes('PRIVATE_FIXTURE_TOKEN') && !error.stdout.includes('fixture@example'));
    return true;
  });
});

for (const [childCode, safeCode] of [['ETIMEDOUT', 'INVENTORY_CLI_TIMEOUT'], ['ENOENT', 'INVENTORY_CLI_UNAVAILABLE']]) {
  test('inventory preserves hold on child process ' + childCode, () => {
    const filename = path.join(__dirname, 'gravicentra-i6-6-preview-channel-reuse-guard.cjs'), mod = { exports: {} };
    const requireFixture = id => id === 'node:child_process' ? { execFileSync() {
      throw Object.assign(new Error('PRIVATE_FIXTURE_TOKEN'), { code: childCode });
    } } : require(id);
    const read = Function('module', 'exports', 'require', '__dirname', 'process', 'Buffer',
      fs.readFileSync(filename, 'utf8') + '\nreturn env=>technicalRuntimeIo(env,"unused").inventory();')
      (mod, mod.exports, requireFixture, __dirname, process, Buffer);
    assert.throws(() => read({ RUNNER_TEMP: '/fixture/runner', FIREBASE_CLI_BIN: '/fixture/cli' }),
      error => error.message === 'I66_TECHNICAL_ROLLOVER_' + safeCode);
  });
}

// Current physical E3 / v24 successor: these sanitized fixtures are contract
// tests only. The complete observed inventory remains in the pinned Actions
// artifact; its full canonical digest is checked against fresh Cloud reads.
const physicalPin = guard.currentPhysicalRolloverCandidatePin();
const physicalText = fs.readFileSync(path.join(__dirname, '..', physicalPin.receiptPath), 'utf8');
const physicalReceipt = JSON.parse(physicalText);
const physicalV2Path = 'artifacts/orbit360-recovery/release-control/I6_6_CURRENT_PHYSICAL_PREVIEW_V24_ROLLOVER_V2_20261124.json';
const physicalV2Text = fs.readFileSync(path.join(__dirname, '..', physicalV2Path), 'utf8');
const physicalV2Receipt = JSON.parse(physicalV2Text);
function physicalFixture() {
  const a = clone(physicalReceipt), live = a.protectedLive;
  return { a, control: {
    schema: 'GRAVICENTRA_I6_6_SINGLE_ARTIFACT_RELEASE_TRANSPORT_V1', gate: 'I6.6', historicalClosedGate: 'B4-007',
    status: 'OPERATIONAL_EXACT_LIVE_ACCEPTED_LOCKED', livePromotionAuthorized: false, previewApproved: false,
    forbidBackendFunctionDeploy: true, backendFunctionPreviewOnly: false, forbidBackendLiveFunctionDeploy: true,
    noHostingPromotion: true, forbidFirestoreRulesDataAuthWrites: true,
    currentTechnicalPreviewRollover: { receiptPath: physicalPin.receiptPath, receiptSha256: physicalPin.receiptSha256 },
    frontendPreviewRequest: { version: 28, mode: 'A13_A14_BALANCE_COMPOSITE_ARTIFACT_HOSTING_PREVIEW_ONLY',
      previousReceiptBlob: live.receiptGitBlobSha, realDataWritesAllowed: false, realCustomerWritesAllowed: false,
      liveDeployAuthorized: false, releaseAfterPreviewAllowed: false, backendLiveDeployAllowed: false },
    currentPhysicalHostingRelease: { sourceSha: live.sourceSha, previewRunId: live.buildRunId, artifactId: live.artifactId,
      artifactDigest: live.artifactDigest, liveCloneRunId: live.liveRunId, liveHostingVersion: live.version,
      readbackEachOrigin: 224, receipt: live.receiptPath, status: 'COMPOSITE_LIVE_SIGNED_UI_VERIFIED', scope: 'COMPOSITE', backendFunctionsChanged: 4 }
  }, candidate: { sourceSha: 'd'.repeat(40), buildRunId: 45460000001,
    previewChannelId: physicalPin.channel, previewUrl: physicalPin.origin, previewRollover: clone(physicalPin) } };
}
function sanitizedInventoryFixture() {
  const inventory = { status: 'success', result: [
    { name: 'sites/ays-orbit-360-lab/channels/live', release: { version: { name: 'sites/ays-orbit-360-lab/versions/synthetic-live' } } },
    { name: 'sites/ays-orbit-360-lab/channels/synthetic-preview', createTime: '2026-11-24T00:00:00Z',
      release: { version: { name: 'sites/ays-orbit-360-lab/versions/synthetic-preview' }, type: 'DEPLOY' } }
  ] };
  return { inventory, evidence: { totalChannels: 2, orderedChannelMetadataSha256: api.inventoryDigest(inventory) } };
}
function privateRuntimeExports(overrides = {}) {
  const filename = path.join(__dirname, 'gravicentra-i6-6-preview-channel-reuse-guard.cjs'), mod = { exports: {} };
  return new Function('require', 'module', 'exports', '__dirname', 'fetch',
    fs.readFileSync(filename, 'utf8') + '\nreturn {io:technicalRuntimeIo,load:technicalLoadBundle,profile:technicalProfile};')(
    name => overrides[name] || require(name), mod, mod.exports, __dirname, overrides.fetch || (() => { throw Error('UNEXPECTED_NETWORK'); }));
}

test('current physical successor pins unaccepted v27 residual and E3 without changing historical acceptance', () => {
  assert.equal(digest(physicalText), physicalPin.receiptSha256);
  assert.equal(physicalReceipt.profile, 'I66_CURRENT_PHYSICAL_E3_PREVIEW_V27_RESIDUAL_SUCCESSOR_V3');
  assert.equal(api.validateAuthorization(physicalFixture().control, physicalText).channel.id, 'gi-i66-rc-45448470011');
  assert.equal(physicalReceipt.freshInventoryEvidence.artifactId, 14954585181);
  assert.equal(physicalReceipt.freshInventoryEvidence.runAttempt, 2);
  assert.equal(physicalReceipt.freshInventoryEvidence.totalChannels, 51);
  assert.equal(physicalReceipt.freshInventoryEvidence.afterInventorySha256, undefined);
  assert.equal(physicalReceipt.freshInventoryEvidence.orderedChannelMetadataSha256, 'db6944a2d60644d15ed55611f379e4452d9c85afc81e6d5ae569e28802b674d9');
  assert.equal(physicalReceipt.freshInventoryEvidence.inventoryPath, undefined);
  assert.equal(physicalReceipt.protectedLive.sourceSha, '65c825b2808a615ca4195bdde6689dbdbe3193b2');
  assert.equal(physicalReceipt.protectedLive.expectedSiteFileCount, 224);
  assert.equal(physicalReceipt.causalRetry.failedBuildRunId, 45460310493);
  assert.equal(physicalReceipt.causalRetry.causeProvenRetrospectively, false);
  assert.equal(physicalReceipt.previousCandidate.backupOnlyPostDeployFailure.neverEligibleForLive, true);
  assert.equal(physicalReceipt.priorRolloverReceipt.path, physicalV2Path);
  assert.equal(physicalReceipt.priorRolloverReceipt.sha256, digest(physicalV2Text));
  assert.equal(physicalReceipt.causalRetry.failedRunRemainsFailed, true);
  assert.equal(physicalReceipt.causalRetry.reuseFailedBuildAsPass, false);
  assert.equal(physicalReceipt.productAccepted, false);
  assert.equal(digest(receiptText), pin.receiptSha256);
});
test('both independently closed receipt profiles coexist without rebinding historical defaults', () => {
  assert.equal(api.validateCandidateReuse(physicalFixture().candidate).receiptSha256, physicalPin.receiptSha256);
  assert.equal(api.validateCandidateReuse(fixture().candidate).receiptSha256, pin.receiptSha256);
  assert.notEqual(physicalPin.receiptSha256, pin.receiptSha256);
  assert.throws(() => api.validateAuthorization(fixture().control, physicalText));
  assert.throws(() => api.validateAuthorization(physicalFixture().control, receiptText));
  assert.equal(privateRuntimeExports().profile().expectedSiteFileCount, 223);
  assert.equal(privateRuntimeExports().profile(physicalPin).expectedSiteFileCount, 224);
  assert.ok(candidateGuard.PINNED_OWNER_PATHS.includes(physicalPin.receiptPath));
});
for (const key of ['realDataWritesAllowed', 'realCustomerWritesAllowed', 'liveDeployAuthorized', 'releaseAfterPreviewAllowed', 'backendLiveDeployAllowed'])
  test('physical successor denies new write scope ' + key, () => {
    const f = physicalFixture(); f.control.frontendPreviewRequest[key] = true;
    assert.throws(() => api.validateAuthorization(f.control, physicalText), /SUCCESSOR_SCOPE_DRIFT/);
  });
for (const key of ['livePromotionAuthorized', 'previewApproved', 'forbidBackendFunctionDeploy', 'backendFunctionPreviewOnly',
  'forbidBackendLiveFunctionDeploy', 'noHostingPromotion', 'forbidFirestoreRulesDataAuthWrites'])
  test('physical successor preserves existing terminal write boundary ' + key, () => {
    const f = physicalFixture(); f.control[key] = !f.control[key];
    assert.throws(() => api.validateAuthorization(f.control, physicalText), /SCOPE_DRIFT/);
  });
for (const key of Object.keys(physicalFixture().control.currentPhysicalHostingRelease))
  test('physical successor rejects physical E3 pointer drift ' + key, () => {
    const f = physicalFixture(); f.control.currentPhysicalHostingRelease[key] = 'different';
    assert.throws(() => api.validateAuthorization(f.control, physicalText), /PHYSICAL_LIVE_POINTER_DRIFT/);
  });
test('physical successor cannot borrow stale request, historical gate or pending backend/live authority', () => {
  for (const mutate of [c => c.frontendPreviewRequest.version = 26, c => c.status = 'PREVIEW_BUILD_REQUESTED',
    c => c.scopedBackendPreviewI66 = {}, c => c.operationalReleaseCandidate = {}]) {
    const f = physicalFixture(); mutate(f.control); assert.throws(() => api.validateAuthorization(f.control, physicalText));
  }
  for (const changed of [physicalText + ' ', JSON.stringify({ ...physicalReceipt, expectedNewSiteFileCount: 223 })])
    assert.throws(() => api.validateAuthorization(physicalFixture().control, changed), /EXACT_RECEIPT_BYTES_REQUIRED/);
});
for (const key of Object.keys(physicalPin)) test('physical candidate requires exact successor pin ' + key, () => {
  const f = physicalFixture(); f.candidate.previewRollover[key] = 'different';
  assert.throws(() => guard.validateTechnicalRolloverCandidate(f.candidate));
});
test('physical successor cannot recycle failed v25/v26 or previous/live source and build', () => {
  for (const [key, values] of Object.entries({
    sourceSha: [physicalReceipt.sourceBaseHead, '478c045c168c2e1b80f28a94094f4dbbbfdf1f81', physicalReceipt.previousCandidate.sourceSha, physicalReceipt.protectedLive.sourceSha],
    buildRunId: [45458031865, 45452721643, physicalReceipt.previousCandidate.buildRunId, physicalReceipt.protectedLive.buildRunId],
    previewChannelId: ['live', pin.channel], previewUrl: ['https://app.aysseguros.com', pin.origin]
  })) for (const value of values) {
    const f = physicalFixture(); f.candidate[key] = value;
    assert.throws(() => guard.validateTechnicalRolloverCandidate(f.candidate));
  }
});
test('historical v24 backup still requires its whole successful build without borrowing the v27 residual exception', () => {
  const expected = physicalV2Receipt.previousCandidate;
  const run = { id: expected.buildRunId, head_sha: expected.sourceSha, head_branch: physicalReceipt.branch,
    path: '.github/workflows/gravicentra-release-delta-66-package.yml', status: 'completed', conclusion: 'success', run_attempt: 1 };
  const artifact = { id: expected.artifactId, name: 'gi-i66-immutable-' + expected.sourceSha, digest: expected.artifactDigest,
    expired: false, size_in_bytes: 1024, workflow_run: { id: expected.buildRunId, head_sha: expected.sourceSha, head_branch: physicalReceipt.branch } };
  assert.equal(api.validateArtifact(run, artifact, expected), expected);
  assert.throws(() => api.validateArtifact({ ...run, conclusion: 'failure' }, artifact, expected), /BACKUP_BUILD_NOT_SUCCESS/);
  assert.throws(() => api.validateArtifact(run, { ...artifact, expired: true }, expected), /ARTIFACT_EXPIRED/);
});
test('complete inventory preimage canonicalizes only key/row order and preserves every metadata value', () => {
  const f = sanitizedInventoryFixture(); assert.equal(api.validateInventoryPreimage(f.inventory, f.evidence), true);
  const reorder = { result: clone(f.inventory.result).reverse(), status: 'success' };
  reorder.result[0] = Object.fromEntries(Object.entries(reorder.result[0]).reverse());
  assert.equal(api.validateInventoryPreimage(reorder, f.evidence), true);
  for (const mutate of [i => i.result[0].release.version.name += '-drift', i => i.result[1].createTime = 'different',
    i => i.result[1].release.type = 'different', i => i.result[0].unexpectedMetadata = 'changed',
    i => i.result.push(clone(i.result[0])), i => i.result.pop(), i => i.result[1].name = 'sites/other/channels/synthetic-preview',
    i => i.nextPageToken = 'more', i => i.result = { channels: i.result, nextPageToken: 'more' }, i => i.status = 'error']) {
    const changed = clone(f.inventory); mutate(changed);
    assert.throws(() => api.validateInventoryPreimage(changed, f.evidence));
  }
});
test('223 historical and 224 physical manifests remain disjoint exact profiles', () => {
  const current = manifest() + 'a'.repeat(64) + '  files/extra.js\n';
  assert.equal(api.parseManifest(manifest()).length, 223);
  assert.equal(api.parseManifest(current, 224).length, 224);
  assert.throws(() => api.parseManifest(current), /FILE_COUNT_DRIFT/);
  assert.throws(() => api.parseManifest(manifest(), 224), /FILE_COUNT_DRIFT/);
  assert.throws(() => api.parseManifest(current, 225), /FILE_COUNT_PROFILE_DENIED/);
});
test('runtime readback reports 224 current files and rejects historical/foreign origins', async () => {
  const bytes = Buffer.from('synthetic bytes only'), hash = digest(bytes), urls = [];
  const bundle = { manifest: Array.from({ length: 224 }, (_, n) => ({ hash, relative: n + '.txt' })), manifestSha256: 'a'.repeat(64), marker: { synthetic: true } };
  const io = privateRuntimeExports({ fetch: async (url, options) => {
    urls.push(url); assert.equal(options.redirect, 'error'); return { ok: true, arrayBuffer: async () => bytes };
  } }).io({}, '/unused', physicalReceipt);
  assert.equal((await io.readback(physicalPin.origin, bundle)).files, 224);
  assert.equal(urls.length, 224); assert.ok(urls.every(url => url.startsWith(physicalPin.origin + '/')));
  await assert.rejects(io.readback(pin.origin, bundle), /READBACK_ORIGIN_DENIED/);
  await assert.rejects(io.readback('https://example.invalid', bundle), /READBACK_ORIGIN_DENIED/);
});
test('physical runtime validates E3 exact LIVE workflow/head/attempt, preserving historical validator', async () => {
  const p = physicalReceipt.protectedLive, run = { id: p.liveRunId, head_branch: physicalReceipt.branch,
    path: p.liveWorkflowPath, head_sha: p.liveRunHeadSha, run_attempt: p.liveRunAttempt, status: 'completed', conclusion: 'success' };
  const makeIo = result => privateRuntimeExports({ fetch: async () => ({ ok: true, json: async () => result }) }).io({ GH_TOKEN: 'fixture-only' }, '/unused', physicalReceipt);
  await makeIo(run).validateAcceptedLive(physicalReceipt);
  for (const [key, value] of [['path', '.github/workflows/other.yml'], ['head_sha', 'e'.repeat(40)], ['run_attempt', 2], ['conclusion', 'failure']])
    await assert.rejects(makeIo({ ...run, [key]: value }).validateAcceptedLive(physicalReceipt));
});
test('physical V2 preserves the failed V1 receipt and requires E3 successful build attempt2', () => {
  assert.equal(digest(physicalV2Text), '07b445794fa1135f994308ee8ec29fddb3d0946d620405848a7bc6ed7eba78ea');
  assert.equal(physicalV2Receipt.profile, 'I66_CURRENT_PHYSICAL_E3_PREVIEW_V24_SUCCESSOR_V2');
  const oldPath = path.join(__dirname, '..', physicalV2Receipt.priorRolloverReceipt.path);
  const oldText = fs.readFileSync(oldPath, 'utf8'), old = JSON.parse(oldText);
  assert.equal(digest(oldText), 'cd80787cd2560939c0384ebca49ee58b4a06acbad5ba201d78b681029458368d');
  assert.equal(physicalV2Receipt.priorRolloverReceipt.sha256, digest(oldText));
  assert.equal(old.protectedLive.buildRunAttempt, 1);
  assert.equal(physicalV2Receipt.protectedLive.buildRunAttempt, 2);
  assert.deepEqual(physicalReceipt.protectedLive, physicalV2Receipt.protectedLive);
  const expected = physicalReceipt.protectedLive;
  const run = { id: 45287432665, head_sha: expected.sourceSha, head_branch: physicalReceipt.branch,
    path: '.github/workflows/gravicentra-release-delta-66-package.yml', status: 'completed', conclusion: 'success', run_attempt: 2 };
  const artifact = { id: 14873426438, name: 'gi-i66-immutable-' + expected.sourceSha, digest: expected.artifactDigest,
    expired: false, size_in_bytes: 1824240, created_at: '2026-11-23T23:31:23Z',
    workflow_run: { id: run.id, head_sha: expected.sourceSha, head_branch: physicalReceipt.branch } };
  assert.equal(api.validateArtifact(run, artifact, expected), expected);
  assert.throws(() => api.validateArtifact({ ...run, conclusion: 'failure', run_attempt: 1 }, artifact, old.protectedLive), /BACKUP_BUILD_NOT_SUCCESS/);
  assert.throws(() => api.validateArtifact(run, artifact, old.protectedLive), /BUILD_ATTEMPT_DRIFT/);
  assert.throws(() => api.validateArtifact({ ...run, conclusion: 'failure' }, artifact, expected), /BACKUP_BUILD_NOT_SUCCESS/);
  assert.ok(Date.parse(artifact.created_at) >= Date.parse(physicalV2Receipt.causalRetry.correctAttemptStartedAt));
  assert.ok(Date.parse(artifact.created_at) <= Date.parse(physicalV2Receipt.causalRetry.correctAttemptCompletedAt));
  assert.equal(physicalV2Receipt.causalRetry.failedBuildRunId, 45458031865);
  assert.equal(physicalV2Receipt.causalRetry.failedRunRemainsFailed, true);
  assert.equal(physicalV2Receipt.freshInventoryEvidence.laterExactReadOnlyPreimage.previewWrites, 0);
});
test('finish fallback uses the successfully prepared channel/origin, never a historical hardcoded target', () => {
  const source = fs.readFileSync(path.join(__dirname, '../.github/workflows/gravicentra-release-delta-66-package.yml'), 'utf8');
  const finish = source.slice(source.indexOf('- name: Verify current technical Preview rollover and preserve every other channel'), source.indexOf('- name: Retain actual technical Preview before-after'));
  assert.match(finish, /before\.json.*channelId/); assert.match(finish, /before\.json.*channelOrigin/);
  assert.doesNotMatch(finish, /gi-i66-rc-44009981499/);
  assert.ok(source.includes(physicalPin.receiptPath));
});

// Sanitized 51-channel fixture. The two allowed fields are Hosting statistics,
// not release identity or file-content proof. No actor from Cloud is copied here.
function afterInventoriesFixture() {
  const channelId = 'synthetic-preview', createdAt = '2026-11-24T00:00:00Z';
  const resource = id => 'sites/ays-orbit-360-lab/channels/' + id;
  const version = id => 'sites/ays-orbit-360-lab/versions/' + id;
  const initial = { status: 'success', result: Array.from({ length: 51 }, (_, n) => ({
    name: resource(n === 0 ? channelId : n === 1 ? 'live' : 'untouched-' + n),
    createTime: createdAt, expireTime: '2040-11-24T00:00:00Z',
    release: { name: resource(n === 0 ? channelId : n === 1 ? 'live' : 'untouched-' + n) + '/releases/old-' + n,
      type: 'DEPLOY', releaseTime: '2026-11-24T00:00:01Z',
      releaseUser: { email: 'synthetic-release-actor@example.invalid' },
      version: { name: version('initial-' + n), status: 'FINALIZED',
        config: { rewrites: [{ glob: '**', path: '/index.html' }] },
        labels: { synthetic: 'true' } } }
  })) };
  const first = clone(initial);
  Object.assign(first.result[0].release, { name: resource(channelId) + '/releases/new', releaseTime: '2026-11-24T01:00:00Z' });
  first.result[0].release.version.name = version('next-preview');
  const final = clone(first);
  const authorization = { profile: 'I66_CURRENT_PHYSICAL_E3_PREVIEW_V27_RESIDUAL_SUCCESSOR_V3',
    channel: { id: channelId, createdAt, expectedVersion: initial.result[0].release.version.name },
    freshInventoryEvidence: { totalChannels: 51 } };
  return { initial, first, final, authorization };
}
const validateAfter = f => api.validateAfterInventories(f.initial, f.first, f.final, f.authorization);
test('after inventories retain all 50 untouched channels and the exact finalized target without mutating input', () => {
  const f = afterInventoriesFixture(), before = clone(f), result = validateAfter(f);
  assert.deepEqual(result, { otherChannelsUnchanged: 50,
    targetVersion: 'sites/ays-orbit-360-lab/versions/next-preview', statisticsTransitions: [] });
  assert.deepEqual(f, before);
});
test('after inventories preserve row and key order independence without dropping metadata', () => {
  const f = afterInventoriesFixture();
  f.final.result.reverse();
  f.final.result = f.final.result.map(row => Object.fromEntries(Object.entries(row).reverse()));
  assert.equal(validateAfter(f).otherChannelsUnchanged, 50);
});
test('only target fileCount/versionBytes appearance is allowed and reported with original presence and values', () => {
  const f = afterInventoriesFixture();
  Object.assign(f.final.result[0].release.version, { fileCount: '224', versionBytes: '1824240' });
  const before = clone(f), result = validateAfter(f);
  assert.deepEqual(result.statisticsTransitions, [
    { path: 'release.version.fileCount', before: { present: false }, after: { present: true, value: '224' } },
    { path: 'release.version.versionBytes', before: { present: false }, after: { present: true, value: '1824240' } }
  ]);
  assert.deepEqual(f, before);
});
test('target statistics changes retain both exact string int64 values, including values above JS safe integer', () => {
  const f = afterInventoriesFixture();
  Object.assign(f.first.result[0].release.version, { fileCount: '0', versionBytes: '9007199254740992' });
  Object.assign(f.final.result[0].release.version, { fileCount: '224', versionBytes: '9223372036854775807' });
  assert.deepEqual(validateAfter(f).statisticsTransitions, [
    { path: 'release.version.fileCount', before: { present: true, value: '0' }, after: { present: true, value: '224' } },
    { path: 'release.version.versionBytes', before: { present: true, value: '9007199254740992' }, after: { present: true, value: '9223372036854775807' } }
  ]);
});
test('unchanged target statistics do not produce invented transitions', () => {
  const f = afterInventoriesFixture();
  for (const inventory of [f.first, f.final]) Object.assign(inventory.result[0].release.version, { fileCount: '224', versionBytes: '1824240' });
  assert.deepEqual(validateAfter(f).statisticsTransitions, []);
});
for (const [label, mutate] of [
  ['version identity', row => { row.release.version.name += '-other'; }],
  ['release identity', row => { row.release.name += '-other'; }],
  ['release time', row => { row.release.releaseTime = '2026-11-24T02:00:00Z'; }],
  ['release type', row => { row.release.type = 'ROLLBACK'; }],
  ['release actor', row => { row.release.releaseUser.email = 'different-synthetic-actor@example.invalid'; }],
  ['version config', row => { row.release.version.config.rewrites[0].path = '/other.html'; }],
  ['expiry', row => { row.expireTime = '2040-11-25T00:00:00Z'; }],
  ['channel creation', row => { row.createTime = '2026-11-23T00:00:00Z'; }],
  ['version labels', row => { row.release.version.labels.synthetic = 'different'; }],
  ['unknown target metadata', row => { row.newMetadata = 'different'; }],
  ['unknown version metadata', row => { row.release.version.newMetadata = 'different'; }],
  ['lookalike root statistics', row => { row.fileCount = '224'; }],
  ['lookalike release statistics', row => { row.release.versionBytes = '1824240'; }],
  ['lookalike config statistics', row => { row.release.version.config.fileCount = '224'; }]
]) test('after inventories reject target ' + label + ' drift even alongside valid statistics', () => {
  const f = afterInventoriesFixture();
  Object.assign(f.final.result[0].release.version, { fileCount: '224', versionBytes: '1824240' });
  mutate(f.final.result[0]);
  assert.throws(() => validateAfter(f));
});
for (const stage of ['first', 'final']) {
  test(stage + ' inventory requires target FINALIZED before any statistics exception', () => {
    const f = afterInventoriesFixture(); f[stage].result[0].release.version.status = 'CREATED';
    assert.throws(() => validateAfter(f));
  });
  for (const [label, mutate] of [
    ['one missing channel', rows => rows.pop()],
    ['one extra channel', rows => rows.push({ ...clone(rows[2]), name: 'sites/ays-orbit-360-lab/channels/unexpected' })],
    ['duplicate untouched identity', rows => { rows[2] = clone(rows[3]); }],
    ['duplicate target identity', rows => { rows[2] = clone(rows[0]); }],
    ['foreign resource', rows => { rows[0].name = 'projects/other/sites/ays-orbit-360-lab/channels/synthetic-preview'; }],
    ['untouched metadata', rows => { rows[2].release.version.config.rewrites[0].path = '/other.html'; }],
    ['untouched statistics', rows => { rows[2].release.version.fileCount = '224'; }],
    ['live release', rows => { rows[1].release.version.name += '-other'; }]
  ]) test(stage + ' inventory rejects ' + label, () => {
    const f = afterInventoriesFixture(); mutate(f[stage].result); assert.throws(() => validateAfter(f));
  });
}
test('matching foreign changes in both post inventories cannot supersede the untouched initial metadata', () => {
  const f = afterInventoriesFixture();
  for (const inventory of [f.first, f.final]) inventory.result[2].release.version.versionBytes = '224';
  assert.throws(() => validateAfter(f));
});
test('unchanged original target version is not an accepted new Preview', () => {
  const f = afterInventoriesFixture();
  for (const inventory of [f.first, f.final]) inventory.result[0].release.version.name = f.authorization.channel.expectedVersion;
  assert.throws(() => validateAfter(f));
});
for (const [label, value] of [['numeric', 224], ['negative', '-1'], ['fraction', '1.5'], ['exponent', '1e3'],
  ['empty', ''], ['null', null], ['boolean', true], ['map', {}], ['array', []],
  ['signed plus', '+1'], ['whitespace', ' 1'], ['int64 overflow', '9223372036854775808']])
  test('target statistics reject ' + label + ' values in either post inventory', () => {
    for (const stage of ['first', 'final']) for (const key of ['fileCount', 'versionBytes']) {
      const f = afterInventoriesFixture(); f[stage].result[0].release.version[key] = clone(value);
      assert.throws(() => validateAfter(f), stage + ':' + key);
    }
  });
for (const stage of ['initial', 'first', 'final']) test(stage + ' inventory cannot hide API errors or incomplete pagination', () => {
  for (const mutate of [i => { i.status = 'error'; }, i => { i.error = { message: 'synthetic error' }; },
    i => { i.nextPageToken = 'more'; }, i => { i.result = { channels: i.result, nextPageToken: 'more' }; }]) {
    const f = afterInventoriesFixture(); mutate(f[stage]); assert.throws(() => validateAfter(f));
  }
});

// As for the historical fixture above, archive and raw-inventory digests here
// model independently verified runtime inputs. These synthetic rows are never
// presented as a Cloud archive or an accepted candidate.
function physicalResidualFixture() {
  const p = physicalReceipt.previousCandidate, boundary = p.backupOnlyPostDeployFailure;
  const run = { id: p.buildRunId, run_attempt: p.buildRunAttempt, head_sha: p.sourceSha,
    head_branch: physicalReceipt.branch, path: '.github/workflows/gravicentra-release-delta-66-package.yml',
    status: 'completed', conclusion: 'failure' };
  const metadata = (id, digest, name) => ({ id, digest, name, expired: false, size_in_bytes: 1024,
    workflow_run: { id: p.buildRunId, head_sha: p.sourceSha, head_branch: physicalReceipt.branch } });
  const artifact = metadata(boundary.evidenceArtifactId, boundary.evidenceArtifactDigest, 'gi-i66-technical-preview-rollover-' + p.buildRunId);
  const readbackArtifact = metadata(boundary.readbackArtifactId, boundary.readbackArtifactDigest, 'gi-i66-preview-package-readback-' + p.buildRunId);
  const steps = boundary.requiredSuccessSteps.map(number => ({ number, name: 'synthetic-success-' + number, status: 'completed', conclusion: 'success' }));
  steps.push({ number: boundary.failedStepNumber, name: boundary.failedStepName, status: 'completed', conclusion: 'failure' });
  const jobs = [
    { id: 1, run_id: p.buildRunId, name: 'gate', status: 'completed', conclusion: 'success' },
    { id: boundary.jobId, run_id: p.buildRunId, name: 'immutable-package', status: 'completed', conclusion: 'failure', steps },
    { id: 3, run_id: p.buildRunId, name: 'protected-conciliaciones-reader-preview', status: 'completed', conclusion: 'skipped' }
  ];
  const common = { channelId: physicalReceipt.channel.id, channelOrigin: physicalReceipt.channel.origin,
    sourceSha: p.sourceSha, buildRunId: p.buildRunId, receiptSha256: boundary.priorReceiptSha256,
    productAccepted: false, liveWrites: 0, backendWrites: 0, businessDataWrites: 0, channelDeletions: 0, authRulesIamWrites: 0 };
  const before = { ...common, schema: 'GI_I66_TECHNICAL_PREVIEW_BEFORE_V1', status: 'PREPARED_READONLY_NOT_ACCEPTED', previewWrites: 0,
    newCandidate: { sourceSha: p.sourceSha, buildRunId: p.buildRunId, artifactId: p.artifactId, artifactDigest: p.artifactDigest, expectedSiteFileCount: 224 },
    inventorySha256: boundary.beforeInventorySha256 };
  const marker = sourceSha => ({ product: 'Gravicentra Insurance', gate: 'I6.6', sourceSha,
    buildId: 'gi-i66-' + sourceSha.slice(0, 12) + '-57f234755dc1' });
  const after = { ...common, schema: 'GI_I66_TECHNICAL_PREVIEW_AFTER_V1', status: 'HOLD',
    failureCode: boundary.failureCode, readOnlyVerifierWrites: 0, signedFunctionalPass: false,
    readbacks: [
      { origin: physicalReceipt.channel.origin, files: 224, manifestSha256: physicalReceipt.previousPreviewReadback.manifestSha256, marker: marker(p.sourceSha) },
      ...physicalReceipt.protectedLive.origins.map(origin => ({ origin, files: 224,
        manifestSha256: 'da40e7ad3f453107a44fdc868a58ff469f91139252c0204f9fc298a8d9f02905', marker: marker(physicalReceipt.protectedLive.sourceSha) }))
    ] };
  const inventory = { result: Array.from({ length: 51 }, (_, n) => ({ channelId: 'synthetic-' + n })) };
  const hash = 'a'.repeat(64), readback = { schema: 'GI_I66_PREVIEW_PACKAGE_READBACK_V1', status: 'PASS', stage: 'COMPLETE',
    sourceSha: p.sourceSha, artifactId: p.artifactId, artifactDigest: p.artifactDigest,
    previewChannel: physicalReceipt.channel.id, previewUrl: physicalReceipt.channel.origin,
    expectedFiles: 224, verifiedFiles: 224, manifestSha256: physicalReceipt.previousPreviewReadback.manifestSha256,
    noDeploymentPerformed: true, noArtifactMutation: true,
    files: Array.from({ length: 224 }, (_, n) => ({ path: 'synthetic/' + n + '.txt', status: 'PASS', expectedSha256: hash,
      attempts: [{ status: 200, sha256: hash }] })),
    live: ['FIREBASE_LIVE', 'STAFF_LIVE'].map(label => ({ label, status: 'PASS', beforeSha256: hash, afterSha256: hash,
      attempts: [{ status: 200, sha256: hash }] })) };
  return { run, jobs, artifact, archiveDigest: artifact.digest, before, after, inventorySha256: boundary.beforeInventorySha256,
    inventory, readbackArtifact, readbackArchiveDigest: readbackArtifact.digest, readback };
}
test('exact failed v27 can be proven recoverable only as backup with release eligibility false', () => {
  const f = physicalResidualFixture(), before = clone(f), proof = api.validatePhysicalResidualBackup(f), p = physicalReceipt.previousCandidate;
  assert.equal(proof.purpose, 'RECOVERABLE_UNACCEPTED_PREVIEW_BACKUP_ONLY');
  assert.equal(proof.sourceSha, p.sourceSha); assert.equal(proof.buildRunId, p.buildRunId); assert.equal(proof.artifactId, p.artifactId);
  assert.equal(proof.readbackArtifactId, f.readbackArtifact.id); assert.equal(proof.productAccepted, false); assert.equal(proof.releaseEligible, false);
  assert.deepEqual(f, before);
  const immutable = { ...f.artifact, id: p.artifactId, name: 'gi-i66-immutable-' + p.sourceSha, digest: p.artifactDigest };
  assert.equal(api.validateArtifact(f.run, immutable, p, { residualBackupProof: proof }), p);
  assert.throws(() => api.validateArtifact(f.run, immutable, p), /RESIDUAL_BACKUP_PROVENANCE_REQUIRED/);
  assert.throws(() => api.validateArtifact(f.run, immutable, p, { currentBuild: true, residualBackupProof: proof }), /RESIDUAL_BACKUP_CANNOT_BE_NEW_BUILD/);
  assert.throws(() => api.validateArtifact({ ...f.run, conclusion: 'success' }, immutable, p, { residualBackupProof: proof }));
  assert.throws(() => api.validateArtifact(f.run, immutable, p, { residualBackupProof: { ...proof, releaseEligible: true } }));
});
for (const key of ['run', 'jobs', 'artifact', 'archiveDigest', 'before', 'after', 'inventorySha256', 'inventory', 'readbackArtifact', 'readbackArchiveDigest', 'readback'])
  test('v27 residual requires independently supplied ' + key, () => {
    const f = physicalResidualFixture(); delete f[key]; assert.throws(() => api.validatePhysicalResidualBackup(f));
  });
for (const [label, mutate] of [
  ['another source', f => { f.run.head_sha = '0'.repeat(40); }],
  ['successful build substitution', f => { f.run.conclusion = 'success'; }],
  ['another run attempt', f => { f.run.run_attempt = 2; }],
  ['another workflow', f => { f.run.path = '.github/workflows/other.yml'; }],
  ['missing successful step', f => { f.jobs[1].steps = f.jobs[1].steps.filter(s => s.number !== 13); }],
  ['another failed step', f => { f.jobs[1].steps.push({ number: 99, conclusion: 'failure', name: 'unexpected' }); }],
  ['another failure code', f => { f.after.failureCode = 'SOMETHING_ELSE'; }],
  ['accepted after state', f => { f.after.status = 'PASS'; }],
  ['invented hosted version', f => { f.after.hostingVersion = physicalReceipt.channel.expectedVersion; }],
  ['signed functional claim', f => { f.after.signedFunctionalPass = true; }],
  ['business writes', f => { f.after.businessDataWrites = 1; }],
  ['different diagnostic archive bytes', f => { f.archiveDigest = 'sha256:' + '0'.repeat(64); }],
  ['different readback archive bytes', f => { f.readbackArchiveDigest = 'sha256:' + '0'.repeat(64); }],
  ['expired readback artifact', f => { f.readbackArtifact.expired = true; }],
  ['different readback artifact owner', f => { f.readbackArtifact.workflow_run.head_sha = '0'.repeat(40); }],
  ['different original inventory bytes', f => { f.inventorySha256 = '0'.repeat(64); }],
  ['missing inventory channel', f => { f.inventory.result.pop(); }],
  ['missing dual LIVE readback', f => { f.after.readbacks.pop(); }],
  ['foreign origin readback', f => { f.after.readbacks[0].origin = 'https://example.invalid'; }],
  ['incorrect Preview marker', f => { f.after.readbacks[0].marker.sourceSha = '0'.repeat(40); }],
  ['incorrect LIVE manifest', f => { f.after.readbacks[1].manifestSha256 = '0'.repeat(64); }],
  ['partial file count', f => { f.readback.verifiedFiles = 223; }],
  ['missing actual file response', f => { f.readback.files[0].attempts = []; }],
  ['mismatched actual file bytes', f => { f.readback.files[0].attempts[0].sha256 = '0'.repeat(64); }],
  ['duplicate file path', f => { f.readback.files[0].path = f.readback.files[1].path; }],
  ['changed LIVE bytes', f => { f.readback.live[0].afterSha256 = '0'.repeat(64); }],
  ['readback artifact mutation', f => { f.readback.noArtifactMutation = false; }]
]) test('v27 residual rejects ' + label, () => {
  const f = physicalResidualFixture(); mutate(f); assert.throws(() => api.validatePhysicalResidualBackup(f));
});
