'use strict';
// New Preview authorization must not overwrite any historical I6.6 request.
// This is source-only QA; no Hosting/Function/Firestore operation runs here.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.join(__dirname,'..');
const file=p=>fs.readFileSync(path.join(root,p),'utf8');
const transport=JSON.parse(file('artifacts/orbit360-recovery/release-control/I6_6_RELEASE_TRANSPORT_CONTROL_20261110.json'));
const request=transport.postAcceptanceOwnerSourceLineagePreviewBuildRequest20261119;
const old=transport.postAcceptanceOwnerP0PremiumRulesPreviewBuildRequest20261119;
const sha=p=>execFileSync('git',['hash-object',p],{cwd:root,encoding:'utf8'}).trim();
assert.equal(old.approvedManifestBlobSha,'a34b9ebc0161148f938c47a057e4b451ce008689',
  'historical Preview request must remain immutable');
assert.equal(request.approvedManifestBlobSha,
  sha('artifacts/orbit360-recovery/release-control/I6_6_APPROVED_PRODUCT_DELTA_MANIFEST_20261110.json'));
assert.equal(request.sourceLineageTestBlobSha,
  sha('tools/gravicentra-i6-6-source-lineage-reconciliation.test.cjs'));
assert.equal(request.sourceQaLineageTests,52);
assert.equal(request.sourceQaHead,request.sourceGovernanceHead);
assert.equal(request.sourceQaWorkflow,'.github/workflows/gravicentra-i66-privileged-role-parity-source-qa.yml');
assert.equal(request.sourceQaRunId,44571113161);
assert.equal(request.sourceGovernanceRunId,44571113275);
assert.equal(request.authorizedBranch,'recovery/fase-a-clean-20260831');
assert.equal(request.sourceQaLocalFinancialWrites,0);
assert.equal(request.sourceQaProductCommissionTests,6);
assert.equal(request.productCommissionTestBlobSha,
  sha('tools/gravicentra-i6-6-insurer-product-commission.test.cjs'));
assert.equal(request.releaseScope,
  'EXACT_IMMUTABLE_PREVIEW_ONLY_OWNER_APPROVED_LOGIN_CLIENT360_OPS_LEADS_PREMIUM_COBROS_LINEAGE');
assert.equal(request.previousLiveSourceSha,transport.currentExactHostingRelease.sourceSha);
assert.equal(request.previousLiveArtifactId,transport.currentExactHostingRelease.artifactId);
assert.equal(request.previousLiveArtifactDigest,transport.currentExactHostingRelease.artifactDigest);
assert.equal(request.previousLiveHostingVersion,transport.currentExactHostingRelease.liveHostingVersion);
for(const key of ['approvedByDirection','strictlyNewImmutableSource','existingBuildJobOnly',
  'previewHostingChannelOnly','rollbackMustPreserveCurrentLive',
  'sourceReadyForNewImmutablePackage','previewOnlyNoLive'])assert.equal(request[key],true,key);
for(const key of ['liveDeploy','backendLiveDeploy','realOperationalDataWrites',
  'legalChanges','newFirebase'])assert.equal(request[key],false,key);
const source=file('.github/workflows/gravicentra-release-delta-66-package.yml');
for(const proof of ['postAcceptanceOwnerSourceLineagePreviewBuildRequest20261119',
  'I66_LINEAGE_PREVIEW_SOURCE_QA_PIN_MISSING',
  'I66_LINEAGE_PREVIEW_GOVERNANCE_NOT_SIGNED',
  'I66_POST_ACCEPTANCE_PREVIEW_ONLY_REQUEST_SCOPE_DRIFT',
  'governance.event!==\'push\'',
  "governance.conclusion!=='success'",'successor.previousLiveHostingVersion===live.liveHostingVersion'])
  assert.ok(source.includes(proof),'missing controlled gate '+proof);
assert.equal(transport.livePromotionAuthorized,false);
assert.equal(transport.forbidBackendLiveFunctionDeploy,true);
assert.equal(transport.forbidBackendFunctionDeploy,true);
assert.equal(transport.forbidFirestoreRulesDataAuthWrites,true);
console.log('I66_LINEAGE_PREVIEW_TRANSPORT_EXACT_SOURCE_OLD_REQUEST_PRESERVED_NO_WRITES_PASS');
