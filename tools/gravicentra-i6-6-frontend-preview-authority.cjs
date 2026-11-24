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
const DIRECT_FORMS_QA_REVISION_RECEIPT_PATH=dir+'I6_6_DIRECT_FORMS_LEGAL_READINESS_AND_PERSONAL_AUTHORITY_CAUSAL_SOURCE_20261124.json';
const DIRECT_FORMS_QA_REVISION_RECEIPT_BLOB='70207f0c0dce31b1412744a9f679ae6734e513a4'; // sealed after composing existing QA owners
const DIRECT_FORMS_QA_REVISION_SOURCE_BASE='74ae28c6e6e6b40f845567c9b00738a58307b3cb';
const DIRECT_FORMS_QA_CHANGED_PATHS=Object.freeze([
  '.github/workflows/gravicentra-i66-privileged-role-three-function-preview-uat.yml',
  'tools/gravicentra-i6-6-carlos-paula-live-direct-renewal-synthetic-uat.cjs',
  'tools/gravicentra-i6-6-direct-forms-signed-driver.test.cjs',
  'tools/gravicentra-i6-6-operational-release-candidate.cjs',
  'tools/gravicentra-i6-6-preview-failure-diagnostics-retention.test.cjs'
]);
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

const DIRECT_FORMS_QA_REVISION_PATHS=Object.freeze([...new Set([...DIRECT_FORMS_QA_PATHS,...DIRECT_FORMS_QA_CHANGED_PATHS])].sort());
// Explicit successors retain the published source322 receipts and product
// preimages. No historical receipt is rewritten by a new composition.
const COMPOSED_PUBLISHED_SOURCE='32229710311b6fc8fdb01d1e00c95ced32d2ebf8';
const DIRECT_FORMS_ASSIGNED_ROLES_RECEIPT_PATH=dir+'I6_6_DIRECT_FORMS_ASSIGNED_ROLES_AND_INSURER_EDITOR_CAUSAL_SOURCE_20261124.json';
const DIRECT_FORMS_ASSIGNED_ROLES_RECEIPT_BLOB='539a1c4be0635588f5c7ec187320a78ce4b91927';
const DIRECT_FORMS_ASSIGNED_ROLES_PROFILE='PAULA_ASSIGNED_ROLES_EFFECTIVE_FORMS_V1';
const DIRECT_FORMS_ASSIGNED_ROLES_CHANGED_QA=Object.freeze([
  'tools/gravicentra-i6-6-carlos-paula-live-direct-renewal-synthetic-uat.cjs',
  'tools/gravicentra-i6-6-direct-forms-signed-driver.test.cjs',
  'tools/gravicentra-i6-6-operational-release-candidate.cjs'
]);
const DIRECT_FORMS_ASSIGNED_ROLES_PREDECESSOR=Object.freeze({repositoryHead:COMPOSED_PUBLISHED_SOURCE,
  receiptPath:DIRECT_FORMS_QA_REVISION_RECEIPT_PATH,receiptBlob:DIRECT_FORMS_QA_REVISION_RECEIPT_BLOB,
  scope:'ASSIGNED_ROLES_QA_AND_INSURER_EDITOR_PRODUCT_ORIGINAL_DIRECT_FORMS_PRESERVED'});
const DIRECT_FORMS_INSURER_EDITOR_PATH='orbit360-platform/modules/aseguradoras.js';
const DIRECT_FORMS_INSURER_EDITOR_TEST_PATH='tools/gravicentra-i6-6-insurer-credential-placeholder-integrity.test.cjs';
const DIRECT_FORMS_INSURER_EDITOR_RECEIPT_PATH=dir+'I6_6_INSURER_EDITOR_STATE_PRESERVATION_CAUSAL_SOURCE_20261124.json';
function validatePublishedPredecessor(receipt,expected,request,{readBlob,readJson},preservedKeys){
  assert.deepEqual(receipt.supersedes,expected,'I66_PUBLISHED_PREDECESSOR_EXACT_REFERENCE_REQUIRED');
  assert.equal(typeof readJson,'function','I66_PUBLISHED_PREDECESSOR_READ_REQUIRED');
  for(const ref of [expected.repositoryHead,request.sourceQaHead,'HEAD']){
    assert.equal(readBlob(ref,expected.receiptPath),expected.receiptBlob,'I66_PUBLISHED_PREDECESSOR_RECEIPT_DRIFT');
    if(expected.qaReceiptPath)assert.equal(readBlob(ref,expected.qaReceiptPath),expected.qaReceiptBlob,'I66_PUBLISHED_PREDECESSOR_QA_RECEIPT_DRIFT');
  }
  const previous=readJson(expected.repositoryHead,expected.receiptPath);
  for(const key of preservedKeys)assert.deepEqual(receipt[key],previous[key],'I66_PUBLISHED_PREDECESSOR_PRESERVED_FIELD_'+key);
  return previous;
}
function validateAssignedRolesInsurerRevision(receipt,original,request,{readBlob,readJson}){
  const previous=validatePublishedPredecessor(receipt,DIRECT_FORMS_ASSIGNED_ROLES_PREDECESSOR,request,{readBlob,readJson},[
    'schema','status','gate','noBackendChanges','noPermissionChanges','realDataWrites','liveDeploys',
    'legalAcceptanceExecutions','personalDecisionPresent','causalEvidence','conditionalCancellationProfile'
  ]);
  assert.equal(receipt.schema,'GI_I66_DIRECT_FORMS_LEGAL_READINESS_AND_PERSONAL_AUTHORITY_CAUSAL_QA_V1');
  assert.equal(receipt.classification,'PRODUCT_AND_QA');assert.equal(receipt.productBytesUnchanged,false);
  assert.equal(receipt.originalDirectFormsProductBytesUnchanged,true);
  assert.equal(receipt.qaSourceBase,COMPOSED_PUBLISHED_SOURCE,'I66_ASSIGNED_ROLES_PUBLISHED_QA_PREIMAGE_REQUIRED');
  assert.deepEqual(receipt.driverContract,{previewChecks:44,liveChecks:66,personalAuthorizationSeparateFromFunctionalChecks:true,directionScopeUnchanged:true,
    profile:DIRECT_FORMS_ASSIGNED_ROLES_PROFILE,assignedRoles:['direccion','operativo'],sameActorUidRequired:true,
    directionAcceptanceOwnerUnchanged:true,cancellationRecoveryPreserved:true,legacyCarlosProfilePreserved:true},'I66_ASSIGNED_ROLES_EXACT_DRIVER_CONTRACT');
  assert.equal(request.directFormsQaProfile,DIRECT_FORMS_ASSIGNED_ROLES_PROFILE,'I66_ASSIGNED_ROLES_REQUEST_PROFILE_REQUIRED');
  assert.ok(request.cancellationRecovery&&request.financialRecovery,'I66_ASSIGNED_ROLES_EXISTING_COMPOSITION_REQUIRED');
  validateCancellationQaBinding(request.cancellationRecoveryQa);validateFinancialQaBinding(request.financialRecoveryQa);
  assert.deepEqual(receipt.tests.failureDiagnosticRetention,previous.tests.failureDiagnosticRetention,'I66_ASSIGNED_ROLES_RETENTION_PROOF_CHANGED');
  const test=receipt.tests.signedDriverContracts;
  assert.ok(Number.isSafeInteger(test?.pass)&&test.pass>0,'I66_ASSIGNED_ROLES_SOURCE_TEST_REQUIRED');
  assert.equal(test.fail,0);assert.equal(test.skip,0);assert.match(test.reportSha256||'',/^[a-f0-9]{64}$/);
  assert.equal(receipt.tests.signedUi,'PENDING');assert.equal(receipt.tests.published,false);
  const source=receipt.files.filter(x=>DIRECT_FORMS_PATHS.includes(x.path)),qa=receipt.files.filter(x=>!DIRECT_FORMS_PATHS.includes(x.path));
  assert.deepEqual(source,original.files.filter(x=>DIRECT_FORMS_PATHS.includes(x.path)),'I66_ASSIGNED_ROLES_ORIGINAL_PRODUCT_CHANGED');
  assert.deepEqual(qa.map(x=>x.path).sort(),DIRECT_FORMS_QA_REVISION_PATHS,'I66_ASSIGNED_ROLES_EXACT_QA_PATHS');
  const oldQa=previous.files.filter(x=>!DIRECT_FORMS_PATHS.includes(x.path));
  assert.deepEqual(receipt.previousQaFiles,oldQa,'I66_ASSIGNED_ROLES_PUBLISHED_QA_ROWS_DRIFT');
  for(const row of receipt.previousQaFiles){
    assert.equal(readBlob(COMPOSED_PUBLISHED_SOURCE,row.path),row.gitBlobSha,'I66_ASSIGNED_ROLES_PUBLISHED_QA_PREIMAGE_DRIFT');
    const next=qa.find(x=>x.path===row.path);
    if(DIRECT_FORMS_ASSIGNED_ROLES_CHANGED_QA.includes(row.path))assert.notEqual(next.gitBlobSha,row.gitBlobSha,'I66_ASSIGNED_ROLES_CAUSAL_QA_CHANGE_REQUIRED');
    else assert.deepEqual(next,row,'I66_ASSIGNED_ROLES_UNRELATED_QA_CHANGE');
  }
  return qa;
}
function validatePreservedDirectFormsProducts(request,currentSource,previousRequest,io){
  assert.deepEqual(Object.keys(previousRequest.directFormsRecovery?.productPathBlobs||{}).sort(),DIRECT_FORMS_PATHS,'I66_EXISTING_TWO_DIRECT_FORM_PREIMAGES_REQUIRED');
  for(const p of DIRECT_FORMS_PATHS)assert.equal(request.directFormsRecovery.productPathBlobs?.[p],previousRequest.directFormsRecovery.productPathBlobs[p],'I66_FINANCIAL_DIRECT_FORMS_PRODUCT_CHANGED');
  if(request.directFormsRecovery.receiptPath===DIRECT_FORMS_ASSIGNED_ROLES_RECEIPT_PATH||request.directFormsQaProfile!==undefined||Object.keys(request.directFormsRecovery.productPathBlobs).length!==DIRECT_FORMS_PATHS.length)
    validateDirectFormsRecovery(request,currentSource,previousRequest,io);
}

const DIRECT_FORMS_INSURER_FINDINGS=Object.freeze([
  'UNCHANGED_LEGACY_LOGO_BLOCKS_OTHER_FIELD','CONTACT_UNEDITED_SOURCE_METADATA_REMOVED',
  'EXPLICITLY_CLEARED_PASSWORD_REMAINS_PENDING','DELETED_PORTAL_PENDING_CREDENTIAL_STILL_IMPORTED'
]);
function validateInsurerEditorSource(revision,request,currentSource,{readBlob,readJson}){
  assert.ok(request.cancellationRecovery&&request.financialRecovery,'I66_INSURER_EDITOR_REQUIRES_REVIEWED_COMPOSITION');
  const ref=revision.insurerEditorRecovery;
  assert.deepEqual(Object.keys(ref||{}).sort(),['receiptBlob','receiptPath'],'I66_INSURER_EDITOR_CLOSED_SUPPLEMENT_REQUIRED');
  assert.equal(ref.receiptPath,DIRECT_FORMS_INSURER_EDITOR_RECEIPT_PATH,'I66_INSURER_EDITOR_EXACT_RECEIPT_PATH');
  assert.match(ref.receiptBlob||'',/^[a-f0-9]{40}$/,'I66_INSURER_EDITOR_EXACT_RECEIPT_PIN');
  for(const r of [request.sourceQaHead,'HEAD'])assert.equal(readBlob(r,ref.receiptPath),ref.receiptBlob,'I66_INSURER_EDITOR_CAUSAL_RECEIPT_SOURCE_DRIFT');
  const receipt=readJson(request.sourceQaHead,ref.receiptPath);
  assert.deepEqual(Object.keys(receipt||{}).sort(),['boundaries','causalFindingIds','evidence','id','notes','preimages','productPaths','runtimeAcceptance','schema','sourceOnly','status','testPaths','tests'].sort(),'I66_INSURER_EDITOR_CLOSED_CAUSAL_RECEIPT');
  assert.equal(receipt.schema,'GI_I66_INSURER_EDITOR_STATE_PRESERVATION_CAUSAL_SOURCE_V1');
  assert.equal(receipt.id,'I6_6_INSURER_EDITOR_STATE_PRESERVATION_20261124');
  assert.equal(receipt.status,'SOURCE_VERIFIED_NOT_SIGNED_PREVIEW_OR_LIVE');
  assert.equal(receipt.sourceOnly,true);assert.equal(receipt.runtimeAcceptance,false,'I66_INSURER_EDITOR_SOURCE_NOT_RUNTIME_ACCEPTANCE');
  assert.deepEqual(receipt.causalFindingIds,DIRECT_FORMS_INSURER_FINDINGS,'I66_INSURER_EDITOR_EXACT_CAUSAL_FINDINGS_REQUIRED');
  assert.deepEqual(receipt.preimages,{physicalE3SourceSha:currentSource,priorSource28Sha:DIRECT_FORMS_QA_REVISION_SOURCE_BASE,sameProductAndTestBlobsAtBothSources:true},'I66_INSURER_EDITOR_PREIMAGE_SOURCE_DRIFT');
  assert.deepEqual(receipt.productPaths?.map(x=>x.path),[DIRECT_FORMS_INSURER_EDITOR_PATH],'I66_INSURER_EDITOR_EXACT_ONE_PRODUCT_OWNER');
  assert.deepEqual(receipt.testPaths?.map(x=>x.path),[DIRECT_FORMS_INSURER_EDITOR_TEST_PATH],'I66_INSURER_EDITOR_EXACT_EXISTING_TEST_OWNER');
  for(const row of [...receipt.productPaths,...receipt.testPaths]){
    assert.deepEqual(Object.keys(row).sort(),['beforeGitBlobSha','bytes','gitBlobSha','path','sha256'],'I66_INSURER_EDITOR_EXACT_SOURCE_ROW');
    for(const k of ['gitBlobSha','beforeGitBlobSha'])assert.match(row[k]||'',/^[a-f0-9]{40}$/);assert.match(row.sha256||'',/^[a-f0-9]{64}$/);
    assert.ok(Number.isSafeInteger(row.bytes)&&row.bytes>0);assert.notEqual(row.gitBlobSha,row.beforeGitBlobSha,'I66_INSURER_EDITOR_CAUSAL_CHANGE_REQUIRED');
    for(const r of [currentSource,DIRECT_FORMS_QA_REVISION_SOURCE_BASE])assert.equal(readBlob(r,row.path),row.beforeGitBlobSha,'I66_INSURER_EDITOR_CAUSAL_PREIMAGE_DRIFT');
    for(const r of [request.sourceQaHead,'HEAD'])assert.equal(readBlob(r,row.path),row.gitBlobSha,'I66_INSURER_EDITOR_FINAL_SOURCE_DRIFT');
  }
  assert.equal(request.directFormsRecovery.productPathBlobs[DIRECT_FORMS_INSURER_EDITOR_PATH],receipt.productPaths[0].gitBlobSha,'I66_INSURER_EDITOR_REQUEST_POSTIMAGE_DRIFT');
  const t=receipt.tests;
  assert.deepEqual(Object.keys(t||{}).sort(),['baselineCases','baselineFailed','baselinePassed','cancelled','candidateCases','candidateFailed','candidatePassed','existingStaticGuardsPassed','networkRequests','realCredentialsUsed','realWrites','skipped'].sort(),'I66_INSURER_EDITOR_CLOSED_TEST_PROOF');
  for(const k of ['candidateCases','candidatePassed','baselineCases','baselinePassed','baselineFailed','existingStaticGuardsPassed'])assert.ok(Number.isSafeInteger(t[k])&&t[k]>0,'I66_INSURER_EDITOR_ACTUAL_CAUSAL_TEST_REQUIRED');
  assert.equal(t.candidateCases,t.candidatePassed);assert.equal(t.baselineCases,t.baselinePassed+t.baselineFailed);assert.equal(t.baselineCases,t.candidateCases);
  for(const k of ['candidateFailed','skipped','cancelled','networkRequests','realWrites'])assert.equal(t[k],0,'I66_INSURER_EDITOR_SOURCE_TEST_BOUNDARY');
  assert.equal(t.realCredentialsUsed,false,'I66_INSURER_EDITOR_SYNTHETIC_SOURCE_TEST_REQUIRED');
  const files={candidate:'editor-regression-attempt1.tap',baseline:'editor-baseline-negative.tap',originalRepro:'source-review.json',freshShapeReadback:'insurer-server-shape-fresh-20261124.log'};
  assert.deepEqual(Object.keys(receipt.evidence||{}).sort(),Object.keys(files).sort(),'I66_INSURER_EDITOR_EXACT_EVIDENCE_SET');
  for(const [key,name] of Object.entries(files)){
    const e=receipt.evidence[key],extra=key==='freshShapeReadback'?['containsOnlyShapeEvidence','doesNotMeasureExposure']:[];
    assert.deepEqual(Object.keys(e||{}).sort(),['fileName','gitBlobSha','sha256','bytes',...extra].sort(),'I66_INSURER_EDITOR_CLOSED_EVIDENCE_ROW');
    assert.equal(e.fileName,name);assert.match(e.gitBlobSha||'',/^[a-f0-9]{40}$/);assert.match(e.sha256||'',/^[a-f0-9]{64}$/);assert.ok(Number.isSafeInteger(e.bytes)&&e.bytes>0);
    for(const k of extra)assert.equal(e[k],true,'I66_INSURER_EDITOR_SHAPE_EVIDENCE_BOUNDARY');
  }
  assert.deepEqual(receipt.boundaries,{productOwners:1,backendOwnersAdded:0,functionTargetsAdded:0,fiveExistingReleaseTargetsPreserved:true,authOrRoleChanges:0,realFinancialWrites:0,sameArtifactPreviewLiveStillRequired:true,incidentAttributedToReportedActor:false,realExposureCountKnown:false},'I66_INSURER_EDITOR_BOUNDARY_DRIFT');
  assert.ok(Array.isArray(receipt.notes)&&receipt.notes.every(x=>typeof x==='string'),'I66_INSURER_EDITOR_NOTES_SCHEMA');
  return [DIRECT_FORMS_INSURER_EDITOR_PATH];
}

function validateDirectFormsQaRevision(receipt,original,{readBlob}){
  assert.equal(receipt.schema,'GI_I66_DIRECT_FORMS_LEGAL_READINESS_AND_PERSONAL_AUTHORITY_CAUSAL_QA_V1');
  assert.equal(receipt.status,'SOURCE_CAUSAL_QA_PASS_NO_PERSONAL_CONSENT_SIGNED_PREVIEW_LIVE_PENDING');
  assert.equal(receipt.gate,'I6.6');assert.equal(receipt.classification,'QA_ONLY');
  assert.deepEqual(receipt.supersedes,{receiptPath:DIRECT_FORMS_RECEIPT_PATH,receiptBlob:DIRECT_FORMS_RECEIPT_BLOB,scope:'QA_ONLY'});
  assert.equal(receipt.qaSourceBase,DIRECT_FORMS_QA_REVISION_SOURCE_BASE,'I66_DIRECT_FORMS_QA_PREIMAGE_SOURCE_DRIFT');
  for(const k of ['productBytesUnchanged','noBackendChanges','noPermissionChanges'])assert.equal(receipt[k],true,'I66_DIRECT_FORMS_QA_BOUNDARY_'+k);
  for(const k of ['realDataWrites','liveDeploys','legalAcceptanceExecutions'])assert.equal(receipt[k],0,'I66_DIRECT_FORMS_QA_BOUNDARY_'+k);
  assert.equal(receipt.personalDecisionPresent,false,'I66_DIRECT_FORMS_QA_CANNOT_DECLARE_PERSONAL_CONSENT');
  assert.deepEqual(receipt.causalEvidence,{sourceSchedulingRaceReproduced:true,actualRunInterceptorObserved:false,actualRunHitTestRetained:false,
    signedPreviewRunId:45465410675,readinessWaitsForCanonicalGate:true,normalClickOnly:true,personalAuthorityRequiredBeforeBackendMutation:true});
  assert.deepEqual(receipt.driverContract,{previewChecks:44,liveChecks:66,personalAuthorizationSeparateFromFunctionalChecks:true,directionScopeUnchanged:true});
  for(const k of ['signedDriverContracts','failureDiagnosticRetention']){
    const result=receipt.tests?.[k];assert.ok(Number.isSafeInteger(result?.pass)&&result.pass>0,'I66_DIRECT_FORMS_QA_REVISION_TEST_REQUIRED');
    assert.equal(result.fail,0,'I66_DIRECT_FORMS_QA_REVISION_TEST_FAILED');assert.equal(result.skip,0,'I66_DIRECT_FORMS_QA_REVISION_TEST_SKIPPED');
    assert.match(result.reportSha256||'',/^[a-f0-9]{64}$/,'I66_DIRECT_FORMS_QA_REVISION_TEST_REPORT_PIN');
  }
  assert.equal(receipt.tests?.signedUi,'PENDING');assert.equal(receipt.tests?.published,false);
  assert.ok(Array.isArray(receipt.files)&&Array.isArray(receipt.previousQaFiles),'I66_DIRECT_FORMS_QA_REVISION_ROWS_REQUIRED');
  const source=receipt.files.filter(x=>DIRECT_FORMS_PATHS.includes(x.path)),qa=receipt.files.filter(x=>!DIRECT_FORMS_PATHS.includes(x.path));
  assert.deepEqual(source,original.files.filter(x=>DIRECT_FORMS_PATHS.includes(x.path)),'I66_DIRECT_FORMS_QA_REVISION_PRODUCT_CHANGED');
  assert.deepEqual(qa.map(x=>x.path).sort(),DIRECT_FORMS_QA_REVISION_PATHS,'I66_DIRECT_FORMS_QA_REVISION_EXACT_PATHS');
  assert.deepEqual(receipt.previousQaFiles.map(x=>x.path).sort(),DIRECT_FORMS_QA_REVISION_PATHS,'I66_DIRECT_FORMS_QA_REVISION_PREIMAGE_PATHS');
  for(const previous of receipt.previousQaFiles){
    assert.deepEqual(Object.keys(previous).sort(),['gitBlobSha','path','sha256'],'I66_DIRECT_FORMS_QA_PREIMAGE_ROW');
    assert.match(previous.gitBlobSha||'',/^[a-f0-9]{40}$/);assert.match(previous.sha256||'',/^[a-f0-9]{64}$/);
    assert.equal(readBlob(receipt.qaSourceBase,previous.path),previous.gitBlobSha,'I66_DIRECT_FORMS_QA_PREIMAGE_DRIFT');
    const originalRow=original.files.find(x=>x.path===previous.path);
    if(originalRow)assert.deepEqual(previous,originalRow,'I66_DIRECT_FORMS_ORIGINAL_QA_PREIMAGE_CHANGED');
    const next=qa.find(x=>x.path===previous.path);
    if(DIRECT_FORMS_QA_CHANGED_PATHS.includes(previous.path))assert.notEqual(next.gitBlobSha,previous.gitBlobSha,'I66_DIRECT_FORMS_QA_CAUSAL_CHANGE_REQUIRED');
    else assert.deepEqual(next,previous,'I66_DIRECT_FORMS_UNRELATED_QA_REVISION');
  }
  return qa;
}

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
  const assigned=extension.receiptPath===DIRECT_FORMS_ASSIGNED_ROLES_RECEIPT_PATH;
  const revised=assigned||extension.receiptPath===DIRECT_FORMS_QA_REVISION_RECEIPT_PATH;
  assert.equal(extension.receiptPath,assigned?DIRECT_FORMS_ASSIGNED_ROLES_RECEIPT_PATH:revised?DIRECT_FORMS_QA_REVISION_RECEIPT_PATH:DIRECT_FORMS_RECEIPT_PATH,'I66_DIRECT_FORMS_EXACT_RECEIPT_REQUIRED');
  assert.equal(extension.receiptBlob,assigned?DIRECT_FORMS_ASSIGNED_ROLES_RECEIPT_BLOB:revised?DIRECT_FORMS_QA_REVISION_RECEIPT_BLOB:DIRECT_FORMS_RECEIPT_BLOB,'I66_DIRECT_FORMS_EXACT_RECEIPT_PIN_REQUIRED');
  if(!assigned)assert.deepEqual(Object.keys(extension.productPathBlobs||{}).sort(),DIRECT_FORMS_PATHS,'I66_DIRECT_FORMS_EXACT_PATHS_REQUIRED');
  assert.equal(previousRequest?.mode,makeScope.REQUEST_MODE,'I66_DIRECT_FORMS_PREVIOUS_MAKE_REQUEST_REQUIRED');
  assert.deepEqual(request.backendPaths,previousRequest.backendPaths,'I66_DIRECT_FORMS_PENDING_BACKEND_PATHS_CHANGED');
  assert.deepEqual(request.backendPathBlobs,previousRequest.backendPathBlobs,'I66_DIRECT_FORMS_PENDING_BACKEND_PINS_CHANGED');
  assert.ok(previousRequest.startupRecovery,'I66_DIRECT_FORMS_EXISTING_STARTUP_REQUIRED');
  assert.deepEqual(request.startupRecovery,previousRequest.startupRecovery,'I66_DIRECT_FORMS_STARTUP_RECOVERY_CHANGED');
  for(const ref of [request.sourceQaHead,'HEAD'])
    assert.equal(readBlob(ref,extension.receiptPath),extension.receiptBlob,'I66_DIRECT_FORMS_RECEIPT_SOURCE_DRIFT');
  const receipt=readJson(request.sourceQaHead,DIRECT_FORMS_RECEIPT_PATH);
  let revisedQaRows=null,insurerPaths=[];
  if(revised){
    for(const ref of [request.sourceQaHead,'HEAD'])assert.equal(readBlob(ref,DIRECT_FORMS_RECEIPT_PATH),DIRECT_FORMS_RECEIPT_BLOB,'I66_DIRECT_FORMS_ORIGINAL_RECEIPT_SOURCE_DRIFT');
    const revision=readJson(request.sourceQaHead,extension.receiptPath);
    if(assigned){
      revisedQaRows=validateAssignedRolesInsurerRevision(revision,receipt,request,{readBlob,readJson});
      insurerPaths=validateInsurerEditorSource(revision,request,currentSource,{readBlob,readJson});
    }else revisedQaRows=validateDirectFormsQaRevision(revision,receipt,{readBlob});
  }
  if(!assigned)assert.equal(request.directFormsQaProfile,undefined,'I66_ASSIGNED_ROLES_PROFILE_REQUIRES_EXACT_SUCCESSOR');
  const admittedProductPaths=exactPathUnion(DIRECT_FORMS_PATHS,insurerPaths);
  assert.deepEqual(Object.keys(extension.productPathBlobs||{}).sort(),admittedProductPaths,'I66_DIRECT_FORMS_EXACT_PATHS_REQUIRED');
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
  const qaRows=revisedQaRows||receipt.files.filter(row=>row.path?.startsWith('tools/'));
  assert.deepEqual(qaRows.map(row=>row.path).sort(),revised?DIRECT_FORMS_QA_REVISION_PATHS:DIRECT_FORMS_QA_PATHS,'I66_DIRECT_FORMS_EXACT_QA_PATHS_REQUIRED');
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
  return admittedProductPaths;
}

const FINANCIAL_RECEIPT_PATH=dir+'I6_6_R51_DOCUMENTARY_PAYMENT_FINANCIAL_RECOVERY_SOURCE_20261124.json';
const FINANCIAL_AUTHORITY_PATH=dir+'I6_6_DIRECTION_URGENT_COMPLETION_TOLERANCE_AND_DIRECT_RENEWAL_20261124.json';
const FINANCIAL_PATHS=Object.freeze([
  'functions/cobros-reconciliation-domain.js','functions/payment-inference-engine.js','orbit360-platform/core/primas.js',
  'orbit360-platform/modules/cobros.js','orbit360-platform/modules/config-domain-v20260804-bridge.js','orbit360-platform/modules/policy-receipts-v1199-detail-guard.js'
]);
const FINANCIAL_QA_PROFILE='I66_R51_DOCUMENTARY_PAYMENT_UI_SIGNED_QA_V1';
const FINANCIAL_SUCCESSOR_RECEIPT_PATH=dir+'I6_6_R51_ASSIGNED_ROLES_INSURER_FINANCIAL_RECOVERY_SOURCE_20261124.json';
const FINANCIAL_SUCCESSOR_PREDECESSOR=Object.freeze({repositoryHead:COMPOSED_PUBLISHED_SOURCE,receiptPath:FINANCIAL_RECEIPT_PATH,
  receiptBlob:'60fcca730463b28892f715a27dd89b20be255805',qaReceiptPath:dir+'I6_6_R51_DOCUMENTARY_PAYMENT_AND_ADMISSION_QA_20261124.json',
  qaReceiptBlob:'9e21e7e71dc927da3546a34e60971f901eafe2b6',scope:'QA_COMPOSITION_ONLY_FINANCIAL_PRODUCT_BYTES_PRESERVED'});
function validateFinancialQaBinding(binding){
  assert.deepEqual(Object.keys(binding||{}).sort(),['profile','receiptBlob','receiptPath'],'I66_FINANCIAL_EXACT_QA_BINDING');
  assert.equal(binding.profile,FINANCIAL_QA_PROFILE,'I66_FINANCIAL_PROFILE_DRIFT');assert.match(binding.receiptBlob||'',/^[a-f0-9]{40}$/,'I66_FINANCIAL_RECEIPT_BLOB');
  assert.ok([FINANCIAL_RECEIPT_PATH,FINANCIAL_SUCCESSOR_RECEIPT_PATH].includes(binding.receiptPath),'I66_FINANCIAL_CLOSED_QA_RECEIPT_PATH');
  return binding;
}
const FINANCIAL_QA_PATHS=Object.freeze([
  '.github/workflows/gravicentra-i66-privileged-role-parity-source-qa.yml',
  'tools/gravicentra-i6-6-cobros-payment-failure-category.test.cjs','tools/gravicentra-i6-6-composite-preview-admission.test.cjs',
  'tools/gravicentra-i6-6-documentary-payment-ui.test.cjs','tools/gravicentra-i6-6-frontend-preview-authority.cjs',
  'tools/gravicentra-i6-6-operational-release-candidate.cjs','tools/gravicentra-i6-6-proposal-application-signed-uat.cjs',
  'tools/gravicentra-i6-6-proposal-application-signed-uat.test.cjs','tools/gravicentra-i6-6-r51-documentary-variance.test.cjs',
  'tools/gravicentra-i6-6-r51-payment-application-preservation.test.cjs'
]);
function validateFinancialRecovery(request,currentSource,previousRequest,{readBlob,readJson}){
  if(!Object.hasOwn(request,'financialRecovery'))return [];
  const extension=request.financialRecovery;
  assert.equal(request.mode,makeScope.REQUEST_MODE,'I66_FINANCIAL_EXISTING_MAKE_COMPOSITION_REQUIRED');
  assert.match(request.sourceQaHead||'',/^[a-f0-9]{40}$/,'I66_FINANCIAL_SOURCE_QA_PIN_REQUIRED');
  assert.deepEqual(Object.keys(extension||{}).sort(),['productPathBlobs','receiptBlob','receiptPath','schema'],'I66_FINANCIAL_EXACT_EXTENSION_REQUIRED');
  assert.equal(extension.schema,'GI_I66_R51_FINANCIAL_RECOVERY_PREVIEW_EXTENSION_V1');
  assert.ok([FINANCIAL_RECEIPT_PATH,FINANCIAL_SUCCESSOR_RECEIPT_PATH].includes(extension.receiptPath),'I66_FINANCIAL_CLOSED_RECEIPT_PATH');assert.match(extension.receiptBlob||'',/^[a-f0-9]{40}$/);
  assert.deepEqual(Object.keys(extension.productPathBlobs||{}).sort(),FINANCIAL_PATHS,'I66_FINANCIAL_EXACT_SIX_OWNERS_REQUIRED');
  validateFinancialQaBinding(request.financialRecoveryQa);
  assert.deepEqual(request.financialRecoveryQa,{profile:FINANCIAL_QA_PROFILE,receiptPath:extension.receiptPath,receiptBlob:extension.receiptBlob},'I66_FINANCIAL_SIGNED_UI_QA_REQUIRED');
  assert.equal(previousRequest?.mode,makeScope.REQUEST_MODE,'I66_FINANCIAL_PENDING_MAKE_REQUEST_REQUIRED');
  assert.deepEqual(request.backendPaths,previousRequest.backendPaths,'I66_FINANCIAL_PENDING_MAKE_PATHS_CHANGED');
  assert.deepEqual(request.backendPathBlobs,previousRequest.backendPathBlobs,'I66_FINANCIAL_PENDING_MAKE_PINS_CHANGED');
  assert.deepEqual(request.backendPaths,makeScope.SOURCE_PATHS,'I66_FINANCIAL_MAKE_SCOPE_WIDENED');
  assert.equal(request.fiveFunctionExactPreviewRequired,true,'I66_FINANCIAL_FIVE_TARGETS_REQUIRED');
  assert.equal(request.backendLiveDeployAllowed,false);assert.equal(request.realDataWritesAllowed,false);
  assert.ok(request.startupRecovery&&request.directFormsRecovery,'I66_FINANCIAL_EXISTING_URGENT_OWNERS_REQUIRED');
  assert.deepEqual(request.startupRecovery,previousRequest.startupRecovery,'I66_FINANCIAL_STARTUP_COMPOSITION_CHANGED');
  validatePreservedDirectFormsProducts(request,currentSource,previousRequest,{readBlob,readJson});
  for(const ref of [request.sourceQaHead,'HEAD'])assert.equal(readBlob(ref,extension.receiptPath),extension.receiptBlob,'I66_FINANCIAL_RECEIPT_DRIFT');
  const receipt=readJson(request.sourceQaHead,extension.receiptPath);
  if(extension.receiptPath===FINANCIAL_SUCCESSOR_RECEIPT_PATH){
    validatePublishedPredecessor(receipt,FINANCIAL_SUCCESSOR_PREDECESSOR,request,{readBlob,readJson},['schema','status','gate','classification','authority','priorToleranceAuthority','semantics','boundaries','productPaths']);
    assert.equal(request.directFormsQaProfile,DIRECT_FORMS_ASSIGNED_ROLES_PROFILE,'I66_FINANCIAL_SUCCESSOR_ASSIGNED_ROLES_PROFILE_REQUIRED');
  }
  assert.equal(receipt.schema,'GI_I66_R51_DOCUMENTARY_PAYMENT_FINANCIAL_RECOVERY_SOURCE_V1');
  assert.equal(receipt.status,'SOURCE_FOCAL_REGRESSION_PASS_SIGNED_PREVIEW_LIVE_PENDING');assert.equal(receipt.gate,'I6.6');assert.equal(receipt.classification,'PRODUCT');
  assert.equal(receipt.authority?.path,FINANCIAL_AUTHORITY_PATH);assert.match(receipt.authority?.gitBlobSha||'',/^[a-f0-9]{40}$/);
  for(const ref of [request.sourceQaHead,'HEAD'])assert.equal(readBlob(ref,FINANCIAL_AUTHORITY_PATH),receipt.authority.gitBlobSha,'I66_FINANCIAL_R51_AUTHORITY_DRIFT');
  const authority=readJson(request.sourceQaHead,FINANCIAL_AUTHORITY_PATH);
  assert.equal(authority.schema,'GI_I66_DIRECTION_URGENT_COMPLETION_DECISION_V1');assert.equal(authority.status,'AUTHORIZED_WORK_REQUIRES_EXACT_EXECUTION_PROOFS');
  for(const key of ['extendPreviouslyApprovedToleranceToAllInsurersAndCases','completePendingApplicationThroughCanonicalWriter'])assert.equal(authority.decisions?.[key],true,'I66_FINANCIAL_DIRECTION_SCOPE_REQUIRED');
  const tolerance=authority.decisions.priorToleranceAuthority;assert.deepEqual(receipt.priorToleranceAuthority,tolerance,'I66_FINANCIAL_ORIGINAL_TOLERANCE_AUTHORITY_REQUIRED');
  for(const ref of [request.sourceQaHead,'HEAD'])assert.equal(readBlob(ref,tolerance.path),tolerance.gitBlobSha,'I66_FINANCIAL_ORIGINAL_TOLERANCE_DRIFT');
  assert.deepEqual(receipt.semantics,{country:'GT',currency:'GTQ',documentaryVarianceCents:5,allInsurers:true,
    realPaymentAmountDateOriginPreserved:true,paymentObligationMismatchHeld:true,bankSettlementExact:true,identityCountryCurrencyExact:true,
    noInventedPayments:true,noAutomaticCustomerNotice:true},'I66_FINANCIAL_SEMANTICS_DRIFT');
  assert.deepEqual(receipt.boundaries,{productOwners:6,backendTargets:5,realDataWrites:0,authOrRoleChanges:0,bankMutations:0,deployments:0,
    signedPreview:'PENDING',signedLive:'PENDING'},'I66_FINANCIAL_SOURCE_BOUNDARIES_DRIFT');
  assert.deepEqual(receipt.productPaths?.map(row=>row.path),FINANCIAL_PATHS,'I66_FINANCIAL_RECEIPT_EXACT_PATHS_REQUIRED');
  for(const row of receipt.productPaths){
    assert.deepEqual(Object.keys(row).sort(),['gitBlobSha','path','previousGitBlobSha','sha256']);
    assert.match(row.gitBlobSha||'',/^[a-f0-9]{40}$/);assert.match(row.previousGitBlobSha||'',/^[a-f0-9]{40}$/);assert.match(row.sha256||'',/^[a-f0-9]{64}$/);
    assert.notEqual(row.gitBlobSha,row.previousGitBlobSha);assert.equal(extension.productPathBlobs[row.path],row.gitBlobSha);
    assert.equal(readBlob(currentSource,row.path),row.previousGitBlobSha,'I66_FINANCIAL_ACCEPTED_PREDECESSOR_DRIFT');
    for(const ref of [request.sourceQaHead,'HEAD'])assert.equal(readBlob(ref,row.path),row.gitBlobSha,'I66_FINANCIAL_PRODUCT_SOURCE_DRIFT');
  }
  assert.deepEqual(receipt.qaPaths?.map(row=>row.path),FINANCIAL_QA_PATHS,'I66_FINANCIAL_EXACT_QA_OWNERS_REQUIRED');
  for(const row of receipt.qaPaths){
    assert.deepEqual(Object.keys(row).sort(),['gitBlobSha','path','sha256']);assert.match(row.gitBlobSha||'',/^[a-f0-9]{40}$/);assert.match(row.sha256||'',/^[a-f0-9]{64}$/);
    assert.ok(row.path.startsWith('tools/')||row.path==='.github/workflows/gravicentra-i66-privileged-role-parity-source-qa.yml','I66_FINANCIAL_QA_PATH_FORBIDDEN');
    for(const ref of [request.sourceQaHead,'HEAD'])assert.equal(readBlob(ref,row.path),row.gitBlobSha,'I66_FINANCIAL_QA_SOURCE_DRIFT');
  }
  assert.ok(Number.isSafeInteger(receipt.localVerification?.passed)&&receipt.localVerification.passed>0);
  assert.equal(receipt.localVerification.failed,0);assert.equal(receipt.localVerification.skipped,0);
  return [...FINANCIAL_PATHS];
}
// The reported effective-cancellation defect has a separate closed scope. Its
// shared detail owner must carry the same final blob in the financial receipt;
// this does not extend FINANCIAL_PATHS or grant a new backend/role permission.
const CANCELLATION_RECEIPT_PATH=dir+'I6_6_EFFECTIVE_CANCELLATION_DIRECT_OR_OPS_CAUSAL_SOURCE_20261124.json';
const CANCELLATION_TEST_PATH='tools/gravicentra-i6-6-effective-cancellation-direct-form.test.cjs';
const CANCELLATION_QA_PROFILE='I66_EFFECTIVE_CANCELLATION_UI_SIGNED_QA_V1';
const CANCELLATION_SUCCESSOR_RECEIPT_PATH=dir+'I6_6_EFFECTIVE_CANCELLATION_ASSIGNED_ROLES_CAUSAL_SOURCE_20261124.json';
const CANCELLATION_SUCCESSOR_PREDECESSOR=Object.freeze({repositoryHead:COMPOSED_PUBLISHED_SOURCE,receiptPath:CANCELLATION_RECEIPT_PATH,
  receiptBlob:'4dc8fe03cee4545a5b93db9816222b6e50fad66c',scope:'QA_COMPOSITION_ONLY_CANCELLATION_PRODUCT_BYTES_PRESERVED'});
function validateCancellationQaBinding(binding){
  assert.deepEqual(Object.keys(binding||{}).sort(),['profile','receiptBlob','receiptPath'],'I66_CANCELLATION_EXACT_QA_BINDING_REQUIRED');
  assert.equal(binding.profile,CANCELLATION_QA_PROFILE,'I66_CANCELLATION_PROFILE_DRIFT');assert.match(binding.receiptBlob||'',/^[a-f0-9]{40}$/,'I66_CANCELLATION_RECEIPT_BLOB');
  assert.ok([CANCELLATION_RECEIPT_PATH,CANCELLATION_SUCCESSOR_RECEIPT_PATH].includes(binding.receiptPath),'I66_CANCELLATION_RECEIPT_DRIFT');
  return binding;
}
const CANCELLATION_SOURCE_QA_PATH='.github/workflows/gravicentra-i66-privileged-role-parity-source-qa.yml';
const CANCELLATION_PATHS=Object.freeze([
  'orbit360-platform/core/policy-receipts-engine.js',
  'orbit360-platform/data/store-firestore-product-operational-p0.js',
  'orbit360-platform/modules/policy-receipts-v1199-bridge.js',
  'orbit360-platform/modules/policy-receipts-v1199-detail-guard.js'
]);
const CANCELLATION_QA_PATHS=Object.freeze([
  '.github/workflows/gravicentra-i66-privileged-role-exact-live-promotion.yml',
  CANCELLATION_SOURCE_QA_PATH,
  '.github/workflows/gravicentra-i66-privileged-role-three-function-preview-uat.yml',
  'tools/gravicentra-i6-6-carlos-paula-live-direct-renewal-synthetic-uat.cjs',
  'tools/gravicentra-i6-6-composite-preview-admission.test.cjs',
  'tools/gravicentra-i6-6-direct-forms-signed-driver.test.cjs',
  CANCELLATION_TEST_PATH,
  'tools/gravicentra-i6-6-frontend-preview-authority.cjs',
  'tools/gravicentra-i6-6-operational-release-candidate.cjs'
]);
const CANCELLATION_AUTHORITY=Object.freeze({
  kind:'CURRENT_DIRECTION_USER_MESSAGE',date:'2026-11-24',
  instructionExcerpt:'reporte qué cancelaciones también estaba mandando a Ops en vez de cancelar en firme. Pedí que todas las gestiones con póliza se deben poder hacer tanto directamente como solicita la gestión por Ops',
  effectiveCancellationDirect:true,requestViaOpsPreserved:true,existingPolicyWriteAuthorityOnly:true,
  publicationInstruction:'Pero cuando yo te dé hallazgos tienes que solucionarlos y publicarlos de una vez.'
});
const exactPathUnion=(...groups)=>[...new Set(groups.flat())].sort();
function validateCancellationRecovery(request,currentSource,previousRequest,{readBlob,readJson,readText}){
  if(!Object.hasOwn(request,'cancellationRecovery'))return [];
  const extension=request.cancellationRecovery;
  assert.equal(request.mode,makeScope.REQUEST_MODE,'I66_CANCELLATION_EXISTING_MAKE_COMPOSITION_REQUIRED');
  assert.match(request.sourceQaHead||'',/^[a-f0-9]{40}$/,'I66_CANCELLATION_SOURCE_QA_PIN_REQUIRED');
  assert.deepEqual(Object.keys(extension||{}).sort(),['productPathBlobs','receiptBlob','receiptPath','schema'],'I66_CANCELLATION_EXACT_EXTENSION_REQUIRED');
  assert.equal(extension.schema,'GI_I66_EFFECTIVE_CANCELLATION_PREVIEW_EXTENSION_V1');
  assert.ok([CANCELLATION_RECEIPT_PATH,CANCELLATION_SUCCESSOR_RECEIPT_PATH].includes(extension.receiptPath),'I66_CANCELLATION_EXACT_RECEIPT_REQUIRED');
  assert.match(extension.receiptBlob||'',/^[a-f0-9]{40}$/,'I66_CANCELLATION_RECEIPT_PIN_REQUIRED');
  assert.deepEqual(Object.keys(extension.productPathBlobs||{}).sort(),CANCELLATION_PATHS,'I66_CANCELLATION_EXACT_FOUR_OWNERS_REQUIRED');
  validateCancellationQaBinding(request.cancellationRecoveryQa);
  assert.deepEqual(request.cancellationRecoveryQa,{profile:CANCELLATION_QA_PROFILE,receiptPath:extension.receiptPath,receiptBlob:extension.receiptBlob},'I66_CANCELLATION_SIGNED_UI_QA_REQUIRED');
  assert.equal(previousRequest?.mode,makeScope.REQUEST_MODE,'I66_CANCELLATION_PENDING_MAKE_REQUEST_REQUIRED');
  assert.deepEqual(request.backendPaths,previousRequest.backendPaths,'I66_CANCELLATION_PENDING_MAKE_PATHS_CHANGED');
  assert.deepEqual(request.backendPathBlobs,previousRequest.backendPathBlobs,'I66_CANCELLATION_PENDING_MAKE_PINS_CHANGED');
  assert.deepEqual(request.backendPaths,makeScope.SOURCE_PATHS,'I66_CANCELLATION_MAKE_SCOPE_WIDENED');
  assert.equal(request.fiveFunctionExactPreviewRequired,true,'I66_CANCELLATION_FIVE_TARGETS_REQUIRED');
  assert.equal(request.backendLiveDeployAllowed,false);assert.equal(request.realDataWritesAllowed,false);
  assert.ok(request.startupRecovery&&request.directFormsRecovery&&request.financialRecovery,'I66_CANCELLATION_EXISTING_COMPOSITION_REQUIRED');
  assert.deepEqual(request.startupRecovery,previousRequest.startupRecovery,'I66_CANCELLATION_STARTUP_COMPOSITION_CHANGED');
  validatePreservedDirectFormsProducts(request,currentSource,previousRequest,{readBlob,readJson});
  for(const p of CANCELLATION_PATHS.filter(p=>FINANCIAL_PATHS.includes(p)))
    assert.equal(extension.productPathBlobs[p],request.financialRecovery.productPathBlobs?.[p],'I66_CANCELLATION_SHARED_FINANCIAL_OWNER_DRIFT');
  for(const ref of [request.sourceQaHead,'HEAD'])assert.equal(readBlob(ref,extension.receiptPath),extension.receiptBlob,'I66_CANCELLATION_RECEIPT_DRIFT');
  const receipt=readJson(request.sourceQaHead,extension.receiptPath);
  if(extension.receiptPath===CANCELLATION_SUCCESSOR_RECEIPT_PATH){
    validatePublishedPredecessor(receipt,CANCELLATION_SUCCESSOR_PREDECESSOR,request,{readBlob,readJson},['schema','status','gate','classification','authority','semantics','boundaries','runtimeRequirement','productPaths']);
    assert.equal(request.directFormsQaProfile,DIRECT_FORMS_ASSIGNED_ROLES_PROFILE,'I66_CANCELLATION_SUCCESSOR_ASSIGNED_ROLES_PROFILE_REQUIRED');
  }
  assert.equal(receipt.schema,'GI_I66_EFFECTIVE_CANCELLATION_DIRECT_OR_OPS_CAUSAL_SOURCE_V1');
  assert.equal(receipt.status,'SOURCE_FOCAL_REGRESSION_PASS_SIGNED_PREVIEW_LIVE_PENDING');
  assert.equal(receipt.gate,'I6.6');assert.equal(receipt.classification,'PRODUCT');
  assert.deepEqual(receipt.authority,CANCELLATION_AUTHORITY,'I66_CANCELLATION_CURRENT_DIRECTION_SCOPE_REQUIRED');
  assert.deepEqual(receipt.semantics,{country:'GT',directEffectiveCancellation:true,requestViaOpsPreserved:true,
    existingPolicyWriteAuthorityOnly:true,documentReferenceMotiveDateRequired:true,effectiveConfirmationRequired:true,
    sparseCanonicalPolicyWrite:true,canonicalServerReadbackRequired:true,idempotentReplay:true,
    policyFinancialFactsPreserved:true,receiptAndPaymentWrites:0,noAutomaticCustomerNotice:true},'I66_CANCELLATION_SEMANTICS_DRIFT');
  assert.deepEqual(receipt.boundaries,{productOwners:4,newBackendOwners:0,backendTargets:5,realDataWrites:0,
    authOrRoleChanges:0,bankMutations:0,deployments:0,signedPreview:'PENDING',signedLive:'PENDING'},'I66_CANCELLATION_SOURCE_BOUNDARIES_DRIFT');
  assert.deepEqual(receipt.runtimeRequirement,{profile:CANCELLATION_QA_PROFILE,preview:'SYNTHETIC_FORM_NO_CANONICAL_WRITE',
    live:'SYNTHETIC_CANONICAL_READBACK_RELOAD_REPLAY_FINANCIAL_PRESERVATION_CLEANUP',signedPreview:'PENDING',signedLive:'PENDING'},'I66_CANCELLATION_SIGNED_RUNTIME_PROOF_REQUIRED');
  assert.deepEqual(receipt.productPaths?.map(row=>row.path),CANCELLATION_PATHS,'I66_CANCELLATION_RECEIPT_EXACT_PATHS_REQUIRED');
  for(const row of receipt.productPaths){
    assert.deepEqual(Object.keys(row).sort(),['gitBlobSha','path','previousGitBlobSha','sha256']);
    assert.match(row.gitBlobSha||'',/^[a-f0-9]{40}$/);assert.match(row.previousGitBlobSha||'',/^[a-f0-9]{40}$/);assert.match(row.sha256||'',/^[a-f0-9]{64}$/);
    assert.notEqual(row.gitBlobSha,row.previousGitBlobSha,'I66_CANCELLATION_CAUSAL_SOURCE_CHANGE_REQUIRED');
    assert.equal(extension.productPathBlobs[row.path],row.gitBlobSha,'I66_CANCELLATION_REQUEST_BLOB_DRIFT');
    assert.equal(readBlob(currentSource,row.path),row.previousGitBlobSha,'I66_CANCELLATION_ACCEPTED_PREDECESSOR_DRIFT');
    for(const ref of [request.sourceQaHead,'HEAD'])assert.equal(readBlob(ref,row.path),row.gitBlobSha,'I66_CANCELLATION_PRODUCT_SOURCE_DRIFT');
  }
  assert.deepEqual(receipt.qaPaths?.map(row=>row.path),CANCELLATION_QA_PATHS,'I66_CANCELLATION_EXACT_QA_OWNERS_REQUIRED');
  for(const row of receipt.qaPaths){
    assert.deepEqual(Object.keys(row).sort(),['gitBlobSha','path','sha256']);
    assert.match(row.gitBlobSha||'',/^[a-f0-9]{40}$/);assert.match(row.sha256||'',/^[a-f0-9]{64}$/);
    for(const ref of [request.sourceQaHead,'HEAD'])assert.equal(readBlob(ref,row.path),row.gitBlobSha,'I66_CANCELLATION_QA_SOURCE_DRIFT');
  }
  assert.equal(typeof readText,'function','I66_CANCELLATION_SIGNED_TEST_INVOCATION_REQUIRED');
  const escapedTest=CANCELLATION_TEST_PATH.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  assert.match(readText(request.sourceQaHead,CANCELLATION_SOURCE_QA_PATH),new RegExp('^\\s+node --test [^\\n]*'+escapedTest+'(?:\\s|$)','m'),'I66_CANCELLATION_SIGNED_TEST_INVOCATION_REQUIRED');
  const proof=receipt.localVerification;
  assert.deepEqual(proof?.tests?.map(row=>row.path),['tools/gravicentra-i6-6-composite-preview-admission.test.cjs',CANCELLATION_TEST_PATH],'I66_CANCELLATION_EXACT_LOCAL_PROOFS_REQUIRED');
  for(const result of proof.tests){
    assert.ok(Number.isSafeInteger(result.passed)&&result.passed>0,'I66_CANCELLATION_LOCAL_TEST_NOT_PASSED');
    assert.equal(result.failed,0,'I66_CANCELLATION_LOCAL_TEST_FAILED');assert.equal(result.skipped,0,'I66_CANCELLATION_LOCAL_TEST_SKIPPED');
    assert.match(result.reportSha256||'',/^[a-f0-9]{64}$/,'I66_CANCELLATION_LOCAL_REPORT_PIN_REQUIRED');
  }
  assert.equal(proof.passed,proof.tests.reduce((sum,row)=>sum+row.passed,0));
  assert.equal(proof.failed,0);assert.equal(proof.skipped,0);
  return [...CANCELLATION_PATHS];
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
  const financialPaths=validateFinancialRecovery(request,current.sourceSha,previous.frontendPreviewRequest,{
    readBlob:(ref,p)=>git('rev-parse',ref+':'+p),readJson:(ref,p)=>JSON.parse(git('show',ref+':'+p))
  });
  const cancellationPaths=validateCancellationRecovery(request,current.sourceSha,previous.frontendPreviewRequest,{
    readBlob:(ref,p)=>git('rev-parse',ref+':'+p),readJson:(ref,p)=>JSON.parse(git('show',ref+':'+p)),readText:(ref,p)=>git('show',ref+':'+p)
  });
  const roots = ['orbit360-platform','functions','firebase.json','storage.rules','firestore.rules',
    'database.rules.json','tools/gravicentra-i6-1-preview-package.mjs',':(exclude)orbit360-platform/docs/recovery/orbit360-recovery-state-v1.json'];
  git('diff','--quiet',request.sourceQaHead,'HEAD','--',...roots);
  const paths=git('diff','--name-only',current.sourceSha,request.sourceQaHead,'--',...roots).split('\n');
  const frontendPath=p=>/^orbit360-platform\/(modules|core)\/[\w.-]+\.js$/.test(p);
  if(makeIngress){
    assert.deepEqual(paths,exactPathUnion(makeScope.PRODUCT_PATHS,startupPaths,directFormsPaths,financialPaths,cancellationPaths),'I66_MAKE_BALANCE_AND_BACKEND_EXACT_PRODUCT_DELTA_REQUIRED');
    assert.deepEqual(paths.filter(p=>frontendPath(p)||startupPaths.includes(p)||cancellationPaths.includes(p)),exactPathUnion([makeScope.FRONTEND_PATH],startupPaths,directFormsPaths,financialPaths.filter(frontendPath),cancellationPaths),
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
module.exports={COMPOSED_PUBLISHED_SOURCE,DIRECT_FORMS_ASSIGNED_ROLES_RECEIPT_PATH,DIRECT_FORMS_ASSIGNED_ROLES_RECEIPT_BLOB,DIRECT_FORMS_ASSIGNED_ROLES_PROFILE,DIRECT_FORMS_ASSIGNED_ROLES_CHANGED_QA,DIRECT_FORMS_ASSIGNED_ROLES_PREDECESSOR,
  DIRECT_FORMS_INSURER_EDITOR_PATH,DIRECT_FORMS_INSURER_EDITOR_TEST_PATH,DIRECT_FORMS_INSURER_EDITOR_RECEIPT_PATH,DIRECT_FORMS_INSURER_FINDINGS,validateAssignedRolesInsurerRevision,validateInsurerEditorSource,
  FINANCIAL_SUCCESSOR_RECEIPT_PATH,FINANCIAL_SUCCESSOR_PREDECESSOR,validateFinancialQaBinding,CANCELLATION_SUCCESSOR_RECEIPT_PATH,CANCELLATION_SUCCESSOR_PREDECESSOR,validateCancellationQaBinding,
  admitPreview,previewRequestTransition,validateStartupRecovery,STARTUP_PATHS,STARTUP_RECEIPT_PATH,STARTUP_TEST_PATH,
  validateCancellationRecovery,exactPathUnion,CANCELLATION_RECEIPT_PATH,CANCELLATION_TEST_PATH,CANCELLATION_QA_PROFILE,CANCELLATION_SOURCE_QA_PATH,CANCELLATION_PATHS,CANCELLATION_QA_PATHS,CANCELLATION_AUTHORITY,
  validateFinancialRecovery,FINANCIAL_PATHS,FINANCIAL_RECEIPT_PATH,FINANCIAL_AUTHORITY_PATH,FINANCIAL_QA_PROFILE,FINANCIAL_QA_PATHS,
  validateDirectFormsRecovery,validateDirectFormsQaRevision,DIRECT_FORMS_QA_REVISION_RECEIPT_PATH,DIRECT_FORMS_QA_REVISION_RECEIPT_BLOB,DIRECT_FORMS_QA_REVISION_SOURCE_BASE,DIRECT_FORMS_QA_CHANGED_PATHS,DIRECT_FORMS_QA_REVISION_PATHS,DIRECT_FORMS_PATHS,DIRECT_FORMS_RECEIPT_PATH,DIRECT_FORMS_RECEIPT_BLOB,DIRECT_FORMS_QA_PATHS};
