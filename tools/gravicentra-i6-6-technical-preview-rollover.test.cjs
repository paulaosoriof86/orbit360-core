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
  assert.equal(pin.receiptPath, 'artifacts/orbit360-recovery/release-control/I6_6_TECHNICAL_PREVIEW_SOURCE_INTAKE_PRECISION_REBUILD_20261117.json');
  assert.equal(digest(receiptText), '25ad1090222d97dcc86d0670088658f92e8e33cb459b4fdaaa669b66ad84d7ba');
  assert.equal(pin.receiptSha256, digest(receiptText));
  assert.equal(receipt.executionAuthority.newLegalConsentGrantUsedForHosting, false);
  assert.equal(api.validateAuthorization(fixture().control, receiptText).channel.id, 'gi-i66-rc-44009981499');
});
test('documented source successor preserves all exact prior receipts and the historical failed build', () => {
  assert.equal(digest(documentedReceiptText), 'dc85b2690778aa92452663f03e3f5e5c1c3df50d37f7914aeb6fef1d83577d41');
  assert.equal(digest(hydrationReceiptText), '6db064d9494103f4cd31ecf9a34e589f66455d2a818f3c0b945839872b1c6e8a');
  assert.equal(digest(retentionReceiptText), '2ebd606814ca551e548bbc7537fc6016b7e0926d4806083957aa9fc65e70b8ab');
  assert.equal(digest(observabilityReceiptText), '215bfcc8fc5cffdf5c630a6696944791ea8859f0ffdd4cf35e8ba98e231eee41');
  assert.equal(digest(residualReceiptText), 'f0c17d2597caa8d83b281fa5b42d02016c6223035a34d894fc8e65bea687cd5d');
  for (const [successor, historicalPath, historicalText] of [
    [receipt, documentedReceiptPath, documentedReceiptText],
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
  assert.equal(pin.previousArtifactId, 14312141615);
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
test('current source intake precision rebuild pins CEF42 backup, a04 source and exact full channel inventory', () => {
  assert.equal(receipt.sourceBaseHead, 'a04f5c04680c797e938009cca3e1f595eff1315c');
  assert.deepEqual(receipt.previousCandidate, {
    sourceSha: 'cef42d7713aa83c73f1f0d0e35afb38a9165e433', buildRunId: 44047311664,
    buildRunAttempt: 1, artifactId: 14312141615,
    artifactDigest: 'sha256:5389e7d1c32db4eb02056b4d7d2b04cf10de10e539df739b8cca4fe7d7b60731',
    expectedSiteFileCount: 223,
    runtimeProofRequired: 'DOWNLOAD_HASH_ARCHIVE_VALIDATE_MANIFEST_AND_COMPARE_EVERY_HOSTED_FILE_INCLUDING_BUILD_JSON_BEFORE_REPLACEMENT'
  });
  assert.equal(receipt.channel.expectedVersion, 'sites/ays-orbit-360-lab/versions/02be9eaa1b58e335');
  assert.deepEqual(receipt.freshInventoryEvidence, {
    runId: 44047311664, runAttempt: 1, jobId: 133916268189,
    totalChannels: 51, inventoryStep: 'SUCCESS', wholeJob: 'SUCCESS',
    rolloverEvidenceArtifactId: 14311489044,
    rolloverEvidenceArtifactDigest: 'sha256:7da370e97f2dba69a976e6a38559b38ebfed69f81d81de66a24424ef1ec59c7f',
    afterInventorySha256: '89089a45d40da050eec991690fe88a1a20abb96c3e8ef44c33fa42e61819980a',
    comparison: 'FULL_OTHER_FIFTY_CHANNEL_METADATA_EXACT_BEFORE_AFTER',
    otherChannelsIdenticalFullMetadata: 50, writes: 0, freshRuntimeInventoryRequiredAgain: true
  });
});
test('current source intake precision rebuild preserves exact LIVE847 without authorizing LIVE changes', () => {
  assert.deepEqual(receipt.protectedLive, {
    sourceSha: '84769378eb2014addebfefdbdd63091bddc4b817', buildRunId: 43503721126,
    artifactId: 14075022275,
    artifactDigest: 'sha256:b0f3bacb68511cdfc91ac934602c51f55afec5c1d6428d886d13a72a706ee283',
    liveRunId: 43506971214, version: 'sites/ays-orbit-360-lab/versions/0766db29b338befc',
    origins: ['https://ays-orbit-360-lab.web.app', 'https://app.aysseguros.com']
  });
  for (const historical of [documentedReceipt, hydrationReceipt, retentionReceipt, observabilityReceipt, residualReceipt])
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
  const f = acceptedBackupFixture(); assert.equal(api.validateArtifact(f.run, f.artifact, f.expected).artifactId, 14312141615);
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
