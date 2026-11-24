'use strict';
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const fs = require('node:fs');
const makeScope=require('./gravicentra-i66-make-release-scope.cjs');
const dir = 'artifacts/orbit360-recovery/release-control/';
const transportPath = dir+'I6_6_RELEASE_TRANSPORT_CONTROL_20261110.json';
const manifest = dir+'I6_6_APPROVED_PRODUCT_DELTA_MANIFEST_20261110.json';
const branch = 'recovery/fase-a-clean-20260831';
const git = (...args) => execFileSync('git',args,{encoding:'utf8'}).trim();
const STARTUP_RECEIPT_PATH=dir+'I6_6_STARTUP_PENDING_READ_RETRY_CAUSAL_SOURCE_20261124.json';
const STARTUP_TEST_PATH='tools/gravicentra-i6-6-startup-pending-read-retry.test.cjs';
const STARTUP_PATHS=Object.freeze([
  'orbit360-platform/core/product-hydration-required-optional-p0.js',
  'orbit360-platform/data/store-firestore-product-readonly-p0.js'
]);
const DIRECT_FORMS_RECEIPT_PATH=dir+'I6_6_DIRECT_RENEWAL_AND_ISSUED_ENDORSEMENT_CAUSAL_SOURCE_20261124.json';
const DIRECT_FORMS_RECEIPT_BLOB='844dac30f829bbac5b5a1b4f960cf2d41de03061';
const DIRECT_FORMS_PATHS=Object.freeze([
  'orbit360-platform/modules/issuance-endosos-v1201-bridge.js',
  'orbit360-platform/modules/renewals-v1200-operational-bridge.js'
]);
const DIRECT_FORMS_QA_PATHS=Object.freeze([
  'tools/gravicentra-i6-6-carlos-paula-live-direct-renewal-synthetic-uat.cjs',
  'tools/gravicentra-i6-6-direct-forms-signed-driver.test.cjs',
  'tools/gravicentra-i6-6-issued-endorsement-direct-entry.test.cjs',
  'tools/gravicentra-i6-6-operational-renewal-entry.test.cjs',
  'tools/gravicentra-i6-6-ops-activity-direct-vehicle-endorsement.test.cjs',
  'tools/gravicentra-i6-6-renewal-direct-form-entry.test.cjs'
]);

// A causal successor may retain the exact undeployed Make backend while
// correcting these two existing startup owners. This does not widen either
// the ordinary frontend path class or the historical Make request contract.
function validateStartupRecovery(request,currentSource,previousRequest,{readBlob,readJson}) {
  if(!Object.hasOwn(request,'startupRecovery'))return [];
  assert.equal(request.mode,makeScope.REQUEST_MODE,'I66_STARTUP_EXISTING_MAKE_COMPOSITION_REQUIRED');
  const extension=request.startupRecovery;
  assert.ok(extension&&typeof extension==='object'&&!Array.isArray(extension),'I66_STARTUP_EXTENSION_REQUIRED');
  assert.deepEqual(Object.keys(extension).sort(),['productPathBlobs','receiptBlob','receiptPath','schema'],
    'I66_STARTUP_EXACT_EXTENSION_FIELDS_REQUIRED');
  assert.equal(extension.schema,'GI_I66_STARTUP_RECOVERY_PREVIEW_EXTENSION_V1');
  assert.equal(extension.receiptPath,STARTUP_RECEIPT_PATH,'I66_STARTUP_EXACT_RECEIPT_REQUIRED');
  assert.match(extension.receiptBlob||'',/^[a-f0-9]{40}$/,'I66_STARTUP_RECEIPT_PIN_REQUIRED');
  assert.deepEqual(Object.keys(extension.productPathBlobs||{}).sort(),STARTUP_PATHS,'I66_STARTUP_EXACT_PATHS_REQUIRED');
  assert.equal(previousRequest?.mode,makeScope.REQUEST_MODE,'I66_STARTUP_PREVIOUS_MAKE_REQUEST_REQUIRED');
  assert.deepEqual(request.backendPathBlobs,previousRequest.backendPathBlobs,'I66_STARTUP_PENDING_BACKEND_PINS_CHANGED');
  for(const ref of [request.sourceQaHead,'HEAD'])
    assert.equal(readBlob(ref,STARTUP_RECEIPT_PATH),extension.receiptBlob,'I66_STARTUP_RECEIPT_SOURCE_DRIFT');
  const receipt=readJson(request.sourceQaHead,STARTUP_RECEIPT_PATH);
  assert.equal(receipt.schema,'GI_I66_STARTUP_PENDING_READ_RETRY_CAUSAL_SOURCE_V1');
  for(const field of ['noBackendChanges','noDataWrites','noPermissionChanges'])
    assert.equal(receipt[field],true,'I66_STARTUP_SCOPE_BOUNDARY_'+field);
  assert.equal(receipt.maxRetries,1,'I66_STARTUP_RETRY_COUNT_CHANGED');
  assert.equal(receipt.retryDelayMs,1200,'I66_STARTUP_RETRY_DELAY_CHANGED');
  assert.equal(receipt.snapshotTimeoutChanged,false,'I66_STARTUP_SNAPSHOT_TIMEOUT_CHANGED');
  assert.ok(Array.isArray(receipt.sourcePaths),'I66_STARTUP_RECEIPT_PATHS_REQUIRED');
  assert.deepEqual(receipt.sourcePaths.map(row=>row.path).sort(),STARTUP_PATHS,'I66_STARTUP_RECEIPT_SCOPE_DRIFT');
  for(const row of receipt.sourcePaths){
    assert.deepEqual(Object.keys(row).sort(),['gitBlobSha','path','previousGitBlobSha'],'I66_STARTUP_EXACT_SOURCE_ROW_REQUIRED');
    assert.match(row.gitBlobSha||'',/^[a-f0-9]{40}$/);assert.match(row.previousGitBlobSha||'',/^[a-f0-9]{40}$/);
    assert.notEqual(row.gitBlobSha,row.previousGitBlobSha,'I66_STARTUP_CAUSAL_SOURCE_CHANGE_REQUIRED');
    assert.equal(extension.productPathBlobs[row.path],row.gitBlobSha,'I66_STARTUP_REQUEST_BLOB_DRIFT');
    assert.equal(readBlob(currentSource,row.path),row.previousGitBlobSha,'I66_STARTUP_ACCEPTED_PREDECESSOR_DRIFT');
    for(const ref of [request.sourceQaHead,'HEAD'])
      assert.equal(readBlob(ref,row.path),row.gitBlobSha,'I66_STARTUP_PRODUCT_SOURCE_DRIFT');
  }
  const proof=receipt.causalTest;
  assert.equal(proof?.path,STARTUP_TEST_PATH,'I66_STARTUP_EXACT_CAUSAL_TEST_REQUIRED');
  assert.match(proof.gitBlobSha||'',/^[a-f0-9]{40}$/,'I66_STARTUP_CAUSAL_TEST_PIN_REQUIRED');
  assert.ok(Number.isSafeInteger(proof.passed)&&proof.passed>0,'I66_STARTUP_CAUSAL_TEST_NOT_PASSED');
  assert.ok(Number.isSafeInteger(proof.baselineFailures)&&proof.baselineFailures>0,'I66_STARTUP_BASELINE_NOT_REPRODUCED');
  for(const ref of [request.sourceQaHead,'HEAD'])
    assert.equal(readBlob(ref,STARTUP_TEST_PATH),proof.gitBlobSha,'I66_STARTUP_CAUSAL_TEST_SOURCE_DRIFT');
  return [...STARTUP_PATHS];
}

// A separate closed extension admits only the two reported direct-form owners.
// It preserves the exact pending Make/startup composition and does not change
// how an older request without this extension is interpreted.
function validateDirectFormsRecovery(request,currentSource,previousRequest,{readBlob,readJson}) {
  if(!Object.hasOwn(request,'directFormsRecovery'))return [];
  assert.equal(request.mode,makeScope.REQUEST_MODE,'I66_DIRECT_FORMS_EXISTING_MAKE_COMPOSITION_REQUIRED');
  assert.match(request.sourceQaHead||'',/^[a-f0-9]{40}$/,'I66_DIRECT_FORMS_SOURCE_QA_PIN_REQUIRED');
  const extension=request.directFormsRecovery;
  assert.ok(extension&&typeof extension==='object'&&!Array.isArray(extension),'I66_DIRECT_FORMS_EXTENSION_REQUIRED');
  assert.deepEqual(Object.keys(extension).sort(),['productPathBlobs','receiptBlob','receiptPath','schema'],
    'I66_DIRECT_FORMS_EXACT_EXTENSION_FIELDS_REQUIRED');
  assert.equal(extension.schema,'GI_I66_DIRECT_FORMS_RECOVERY_PREVIEW_EXTENSION_V1');
  assert.equal(extension.receiptPath,DIRECT_FORMS_RECEIPT_PATH,'I66_DIRECT_FORMS_EXACT_RECEIPT_REQUIRED');
  assert.equal(extension.receiptBlob,DIRECT_FORMS_RECEIPT_BLOB,'I66_DIRECT_FORMS_EXACT_RECEIPT_PIN_REQUIRED');
  assert.deepEqual(Object.keys(extension.productPathBlobs||{}).sort(),DIRECT_FORMS_PATHS,'I66_DIRECT_FORMS_EXACT_PATHS_REQUIRED');
  assert.equal(previousRequest?.mode,makeScope.REQUEST_MODE,'I66_DIRECT_FORMS_PREVIOUS_MAKE_REQUEST_REQUIRED');
  assert.deepEqual(request.backendPaths,previousRequest.backendPaths,'I66_DIRECT_FORMS_PENDING_BACKEND_PATHS_CHANGED');
  assert.deepEqual(request.backendPathBlobs,previousRequest.backendPathBlobs,'I66_DIRECT_FORMS_PENDING_BACKEND_PINS_CHANGED');
  assert.ok(previousRequest.startupRecovery,'I66_DIRECT_FORMS_EXISTING_STARTUP_REQUIRED');
  assert.deepEqual(request.startupRecovery,previousRequest.startupRecovery,'I66_DIRECT_FORMS_STARTUP_RECOVERY_CHANGED');
  for(const ref of [request.sourceQaHead,'HEAD'])
    assert.equal(readBlob(ref,DIRECT_FORMS_RECEIPT_PATH),extension.receiptBlob,'I66_DIRECT_FORMS_RECEIPT_SOURCE_DRIFT');
  const receipt=readJson(request.sourceQaHead,DIRECT_FORMS_RECEIPT_PATH);
  assert.equal(receipt.schema,'GI_I66_DIRECT_RENEWAL_AND_ISSUED_ENDORSEMENT_CAUSAL_SOURCE_QA_V1');
  assert.equal(receipt.status,'SOURCE_FOCAL_REGRESSION_PASS_SIGNED_PREVIEW_LIVE_PENDING');
  assert.equal(receipt.gate,'I6.6');assert.equal(receipt.classification,'PRODUCT');
  assert.match(receipt.sourceBase||'',/^[a-f0-9]{40}$/,'I66_DIRECT_FORMS_CAUSAL_BASE_REQUIRED');
  assert.equal(receipt.realDataWrites,0,'I66_DIRECT_FORMS_SOURCE_REAL_WRITES');
  assert.equal(receipt.liveDeploys,0,'I66_DIRECT_FORMS_SOURCE_LIVE_DEPLOY');
  assert.equal(receipt.tests?.renewalBaselineNewSuite?.expectedFailureReproduced,true,'I66_DIRECT_FORMS_CAUSAL_FAILURE_REQUIRED');
  assert.ok(Number.isSafeInteger(receipt.tests?.renewalBaselineNewSuite?.fail)&&receipt.tests.renewalBaselineNewSuite.fail>0,'I66_DIRECT_FORMS_BASELINE_NOT_REPRODUCED');
  for(const name of ['combinedSource','canonicalEndorsementDurableContract','signedDriverContracts']){
    const result=receipt.tests?.[name];assert.ok(Number.isSafeInteger(result?.pass)&&result.pass>0,'I66_DIRECT_FORMS_SOURCE_TEST_NOT_PASSED');
    assert.equal(result.fail,0,'I66_DIRECT_FORMS_SOURCE_TEST_FAILED');
  }
  assert.equal(receipt.tests?.signedUi,'PENDING');assert.equal(receipt.tests?.published,false);
  assert.ok(Array.isArray(receipt.files),'I66_DIRECT_FORMS_RECEIPT_FILES_REQUIRED');
  const sourceRows=receipt.files.filter(row=>row.path?.startsWith('orbit360-platform/'));
  assert.deepEqual(sourceRows.map(row=>row.path).sort(),DIRECT_FORMS_PATHS,'I66_DIRECT_FORMS_RECEIPT_SCOPE_DRIFT');
  const qaRows=receipt.files.filter(row=>row.path?.startsWith('tools/'));
  assert.deepEqual(qaRows.map(row=>row.path).sort(),DIRECT_FORMS_QA_PATHS,'I66_DIRECT_FORMS_EXACT_QA_PATHS_REQUIRED');
  for(const row of [...sourceRows,...qaRows]){
    assert.deepEqual(Object.keys(row).sort(),['gitBlobSha','path','sha256'],'I66_DIRECT_FORMS_EXACT_SOURCE_ROW_REQUIRED');
    assert.match(row.gitBlobSha||'',/^[a-f0-9]{40}$/);assert.match(row.sha256||'',/^[a-f0-9]{64}$/);
    for(const ref of [request.sourceQaHead,'HEAD'])
      assert.equal(readBlob(ref,row.path),row.gitBlobSha,'I66_DIRECT_FORMS_PRODUCT_OR_QA_SOURCE_DRIFT');
    if(DIRECT_FORMS_PATHS.includes(row.path)){
      assert.equal(extension.productPathBlobs[row.path],row.gitBlobSha,'I66_DIRECT_FORMS_REQUEST_BLOB_DRIFT');
      const predecessor=readBlob(receipt.sourceBase,row.path);
      assert.notEqual(row.gitBlobSha,predecessor,'I66_DIRECT_FORMS_CAUSAL_SOURCE_CHANGE_REQUIRED');
      assert.equal(readBlob(currentSource,row.path),predecessor,'I66_DIRECT_FORMS_ACCEPTED_PREDECESSOR_DRIFT');
    }
  }
  return [...DIRECT_FORMS_PATHS];
}

function previewRequestTransition(request, previousRequest) {
  if (JSON.stringify(request) === JSON.stringify(previousRequest)) return false;
  assert.ok(Number.isSafeInteger(request?.version) && request.version > 0,
    'PREVIEW_REQUEST_VERSION_INVALID');
  assert.equal(request.version,(previousRequest?.version || 0)+1,'PREVIEW_REQUEST_VERSION_DRIFT');
  return true;
}

async function admitPreview(transport,api,readMarker) {
  const request = transport.frontendPreviewRequest;
  const previous = JSON.parse(git('show','HEAD^:'+transportPath));
  if (!previewRequestTransition(request,previous.frontendPreviewRequest)) return false;
  const composite=request.mode==='COMPOSITE_ARTIFACT_HOSTING_PREVIEW_ONLY',makeIngress=request.mode===makeScope.REQUEST_MODE;
  assert.ok(request.mode==='PREVIEW_HOSTING_ONLY'||composite||makeIngress,'PREVIEW_REQUEST_MODE_INVALID');
  if(makeIngress){
    assert.equal(request.backendPreviewRequired,true,'BACKEND_PREVIEW_ACCEPTANCE_REQUIRED');
    assert.equal(request.backendLiveDeployAllowed,false,'NO_UNCERTIFIED_BACKEND_LIVE');
    assert.equal(request.realDataWritesAllowed,false,'NO_REAL_WRITES_IN_PREVIEW');
    assert.equal(request.fiveFunctionExactPreviewRequired,true);
    assert.equal(request.scopeContractBlob,makeScope.CONTRACT_BLOB);
    assert.deepEqual(request.balanceCorrection,makeScope.BALANCE_CORRECTION,'I66_MAKE_BALANCE_FOCAL_REQUIRED');
    assert.equal(git('rev-parse',request.sourceQaHead+':'+makeScope.FRONTEND_PATH),makeScope.FRONTEND_BLOB,'I66_MAKE_BALANCE_SOURCE_BLOB_DRIFT');
    assert.equal(git('rev-parse',request.sourceQaHead+':'+makeScope.BALANCE_RECEIPT_PATH),makeScope.BALANCE_RECEIPT_BLOB,'I66_MAKE_BALANCE_AUTHORITY_BLOB_DRIFT');
    assert.deepEqual(request.backendPaths,makeScope.SOURCE_PATHS,'I66_MAKE_BACKEND_EXACT_SCOPE_REQUIRED');
    assert.deepEqual(Object.keys(request.backendPathBlobs||{}).sort(),makeScope.SOURCE_PATHS);
    for(const p of request.backendPaths)assert.equal(request.backendPathBlobs[p],git('rev-parse',request.sourceQaHead+':'+p),'BACKEND_SOURCE_BLOB_DRIFT');
  }
  if(composite){
    assert.equal(request.backendPreviewRequired,true,'BACKEND_PREVIEW_ACCEPTANCE_REQUIRED');
    assert.equal(request.backendLiveDeployAllowed,false,'NO_UNCERTIFIED_BACKEND_LIVE');
    assert.equal(request.realDataWritesAllowed,false,'NO_REAL_WRITES_IN_PREVIEW');
    assert.deepEqual(request.backendPaths,['functions/product-ops-leads-domain.js'],'BACKEND_OWNER_SCOPE_DRIFT');
    assert.equal(request.backendPathBlobs?.[request.backendPaths[0]],
      git('rev-parse',request.sourceQaHead+':'+request.backendPaths[0]),'BACKEND_SOURCE_BLOB_DRIFT');
  }
  assert.equal(transport.livePromotionAuthorized,false);
  assert.equal(transport.noHostingPromotion,true);
  assert.equal(transport.forbidBackendFunctionDeploy,true);
  assert.equal(transport.forbidFirestoreRulesDataAuthWrites,true);
  const control = JSON.parse(fs.readFileSync(dir+'CONTROL_PLANE.json'));
  assert.equal(control.gateState.gates.I6.activeSubgate,'I6.6');
  const current = control[control.currentExecutionDecisionPointer];
  const physical = transport.currentPhysicalHostingRelease;
  assert.ok(current && physical && request.previousReceiptBlob);
  assert.equal(current.receiptGitBlobSha, request.previousReceiptBlob);
  assert.equal(git('rev-parse','HEAD:'+current.receiptPath),request.previousReceiptBlob);
  for (const field of ['artifactId','artifactDigest','sourceSha','buildId'])
    assert.equal(current[field],physical[field]);
  assert.equal(current.hostingVersion,physical.liveHostingVersion);
  assert.match(request.sourceQaHead,/^[0-9a-f]{40}$/);
  assert.match(request.manifestBlob,/^[0-9a-f]{40}$/);
  git('merge-base','--is-ancestor',current.sourceSha,request.sourceQaHead);
  git('merge-base','--is-ancestor',request.sourceQaHead,'HEAD');
  assert.equal(git('rev-parse',request.sourceQaHead+':'+manifest),request.manifestBlob);
  assert.equal(git('rev-parse','HEAD:'+manifest),request.manifestBlob);
  const startupPaths=validateStartupRecovery(request,current.sourceSha,previous.frontendPreviewRequest,{
    readBlob:(ref,p)=>git('rev-parse',ref+':'+p),readJson:(ref,p)=>JSON.parse(git('show',ref+':'+p))
  });
  const directFormsPaths=validateDirectFormsRecovery(request,current.sourceSha,previous.frontendPreviewRequest,{
    readBlob:(ref,p)=>git('rev-parse',ref+':'+p),readJson:(ref,p)=>JSON.parse(git('show',ref+':'+p))
  });
  const roots = ['orbit360-platform','functions','firebase.json','storage.rules','firestore.rules',
    'database.rules.json','tools/gravicentra-i6-1-preview-package.mjs',':(exclude)orbit360-platform/docs/recovery/orbit360-recovery-state-v1.json'];
  git('diff','--quiet',request.sourceQaHead,'HEAD','--',...roots);
  const paths=git('diff','--name-only',current.sourceSha,request.sourceQaHead,'--',...roots).split('\n');
  const frontendPath=p=>/^orbit360-platform\/(modules|core)\/[\w.-]+\.js$/.test(p);
  if(makeIngress){
    assert.deepEqual(paths,[...makeScope.PRODUCT_PATHS,...startupPaths,...directFormsPaths].sort(),'I66_MAKE_BALANCE_AND_BACKEND_EXACT_PRODUCT_DELTA_REQUIRED');
    assert.deepEqual(paths.filter(p=>frontendPath(p)||startupPaths.includes(p)),[makeScope.FRONTEND_PATH,...startupPaths,...directFormsPaths].sort(),
      'I66_MAKE_NO_UNRELATED_FRONTEND_DELTA');
  }else if(composite){
    assert.ok(paths.some(frontendPath),'COMPOSITE_FRONTEND_MISSING');
    assert.deepEqual(paths.filter(p=>!frontendPath(p)),request.backendPaths,'COMPOSITE_BACKEND_EXACT_SCOPE_REQUIRED');
  }else{
    assert.ok(paths.length && paths.every(frontendPath),'PREVIEW_SCOPE_DRIFT');
  }
  assert.deepEqual(request.productPaths,paths);
  const runs = [[request.sourceQaRunId,'gravicentra-i66-privileged-role-parity-source-qa.yml'],
    [request.guardRunId,'gravicentra-release-lock-sync.yml']];
  for (const [runId,workflow] of runs) {
    assert.ok(Number.isSafeInteger(runId) && runId>0);
    const run=await api('runs/'+runId);
    assert.deepEqual([run.head_sha,run.head_branch,run.path,run.status,run.conclusion],
      [request.sourceQaHead,branch,'.github/workflows/'+workflow,'completed','success']);
    const jobs=await api('runs/'+runId+'/jobs?per_page=100');
    assert.ok(jobs.jobs.some(j=>j.conclusion==='success' && j.steps?.some(s=>s.conclusion==='success' && s.number>2)));
  }
  const artifact=await api('artifacts/'+current.artifactId);
  assert.equal(artifact.digest,current.artifactDigest);
  assert.equal(artifact.workflow_run.head_sha,current.sourceSha);
  for(const origin of ['https://app.aysseguros.com','https://ays-orbit-360-lab.web.app']) {
    const marker=await readMarker(origin);
    assert.deepEqual([marker.sourceSha,marker.buildId],[current.sourceSha,current.buildId]);
  }
  return true;
}
module.exports={admitPreview,previewRequestTransition,validateStartupRecovery,STARTUP_PATHS,STARTUP_RECEIPT_PATH,STARTUP_TEST_PATH,
  validateDirectFormsRecovery,DIRECT_FORMS_PATHS,DIRECT_FORMS_RECEIPT_PATH,DIRECT_FORMS_RECEIPT_BLOB,DIRECT_FORMS_QA_PATHS};
