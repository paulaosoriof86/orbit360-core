'use strict';
// Explicit successor of the existing four-function I6.6 release. Historical
// candidates keep their own validator; these rules never reinterpret E3.
const assert=require('node:assert/strict');
const fs=require('node:fs'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const SCOPE='GI_I66_A13_A14_MACHINE_INGRESS_RELEASE_V1';
const REQUEST_MODE='A13_A14_BALANCE_COMPOSITE_ARTIFACT_HOSTING_PREVIEW_ONLY';
const CONTRACT_PATH='artifacts/orbit360-recovery/release-control/I6_6_A13_CHANNEL_SCOPE_AND_EXISTING_EXECUTORS_20261124.json';
const CONTRACT_BLOB='7ce546736ac8d08b8ac922d19f3e6e4c2bac0021';
const COMMUNICATION_DECISION_PATH='artifacts/orbit360-recovery/release-control/I6_6_COMMUNICATION_TRACEABILITY_AND_DOCUMENT_INGRESS_OWNER_DECISION_20261124.json';
const COMMUNICATION_DECISION_BLOB='3bbfe4a19b9bb2db446bbfbb8f8be60da6ef8a18';
const META_RECEIPT_PATH='artifacts/orbit360-recovery/release-control/I6_6_META_WHATSAPP_ATTRIBUTION_READONLY_20261124.json';
const META_RECEIPT_BLOB='ca24ec3265bc3b1b6c77a8ff63f37b9be913abbd';
const EVENT_TYPE='google.cloud.firestore.document.v1.created.withAuthContext';
const SECRET='projects/ays-orbit-360-lab/secrets/orbit360-greenapi-gt-alianzas-soluciones';
const RUNTIME_RECEIPT_PATH='artifacts/orbit360-recovery/release-control/I6_6_MAKE_CANONICAL_RUNTIME_ACCESS_READBACK_20261124.json';
const RUNTIME_RECEIPT_BLOB='e359231b4813145aa05346e9936bac8a5f13a2a4';
const RUNTIME='646761409743-compute@developer.gserviceaccount.com';
const RUNTIME_REPORT_DIGEST='696fe4e0f3122bed2d32520ab2697f78bab39a2ff74d2db4d15813f01af3d47a';
const SOURCE_PATHS=Object.freeze(['functions/b4-003-scoped-related-reader.js','functions/bootstrap.js',
  'functions/make-lead-ingress-bridge.js','functions/product-lead-ingress-contract.js',
  'functions/product-lead-ingress-owner-support.js','functions/product-ops-leads-domain.js']);
const FRONTEND_PATH='orbit360-platform/core/queries.js';
const FRONTEND_BLOB='b77b65f86ef6ac2ab6dc157fdbc9ad5e34dbcdcc';
const PRODUCT_PATHS=Object.freeze([...SOURCE_PATHS,FRONTEND_PATH]);
const PACKAGER_PATH='tools/gravicentra-i6-1-preview-package.mjs';
const PACKAGER_BLOB='c774bbcec55878fa7136f906443e605be43334d4';
const BALANCE_RECEIPT_PATH='artifacts/orbit360-recovery/release-control/I6_6_FUTURE_PENDING_BALANCE_OWNER_CAUSAL_CORRECTION_20261124.json';
const BALANCE_RECEIPT_BLOB='c05769d469b0a5e88e72e9e946095cb47bfc9d32';
const BALANCE_CORRECTION=Object.freeze({path:FRONTEND_PATH,gitBlobSha:FRONTEND_BLOB,
  causalReceiptPath:BALANCE_RECEIPT_PATH,causalReceiptBlob:BALANCE_RECEIPT_BLOB,
  financialQaScope:'SIX_RECEIPT_CURRENT_BALANCE_READONLY',requiredStagesPerPhase:48,
  sameArtifactBothPhases:true,fullA04A12A14Acceptance:false});
const ADDED=Object.freeze({preview:Object.freeze({name:'orbit360MakeLeadIngressPreview',region:'us-east1'}),
  live:Object.freeze({name:'orbit360MakeLeadIngress',region:'us-central1'})});
const PREVIEW_STATUS='APPROVED_FIVE_FUNCTION_PREVIEW_MACHINE_INGRESS_SYNTHETIC_ONLY';
const LIVE_STATUS='SAME_ARTIFACT_FIVE_FUNCTIONS_SIGNED_LIVE_CLOSED_INGRESS_READBACK_RELOAD_RESTORE_PASS';
const sha40=(s,m)=>assert.match(String(s||''),/^[a-f0-9]{40}$/,m);
const sha64=(s,m)=>assert.match(String(s||''),/^[a-f0-9]{64}$/,m);
const digest=s=>crypto.createHash('sha256').update(s).digest('hex');
const blob=s=>crypto.createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex');
const isMake=p=>p?.makeIngressComposite===true;
// The pinned canonical builder adds exactly this B4 export to bootstrap once.
// Verify its complete deterministic output; every other declared owner remains
// byte-identical, and no packaged file is edited by this verifier.
function validatePackagedSourceBytes(sourcePath,sourceBytes,packagedBytes,packagerBytes){
  assert.ok(SOURCE_PATHS.includes(sourcePath),'I66_MAKE_PACKAGED_SOURCE_PATH_FORBIDDEN');
  for(const bytes of [sourceBytes,packagedBytes,packagerBytes])assert.ok(Buffer.isBuffer(bytes),'I66_MAKE_PACKAGED_SOURCE_BUFFER_REQUIRED');
  assert.equal(blob(packagerBytes),PACKAGER_BLOB,'I66_MAKE_CANONICAL_PACKAGER_PIN_DRIFT');
  let expected=sourceBytes;
  if(sourcePath==='functions/bootstrap.js'){
    const source=sourceBytes.toString('utf8');
    assert.ok(Buffer.from(source,'utf8').equals(sourceBytes),'I66_MAKE_BOOTSTRAP_SOURCE_ENCODING_DRIFT');
    const integrated=source.includes("require('./b4-003-scoped-policy-callable')");
    assert.ok(!source.includes('b4-003-scoped-policy-callable')||integrated,'B4_003_SCOPED_EXPORT_DUPLICATE');
    const suffix="\n// B4-003 dual-name source; executor deploys Preview only.\nObject.assign(module.exports,require('./b4-003-scoped-policy-callable'));\n";
    if(!integrated)expected=Buffer.concat([sourceBytes,Buffer.from(suffix,'utf8')]);
  }
  assert.ok(expected.equals(packagedBytes),'I66_MAKE_PRODUCT_OWNER_BUILD_BYTES_DIFFER:'+sourcePath);
  return true;
}
function target(p,phase){assert.ok(isMake(p),'I66_MAKE_SCOPE_REQUIRED');assert.ok(ADDED[phase]);return ADDED[phase];}
function validateScope(scope,{sourceSha,phase}={}){
  assert.equal(scope?.schema,SCOPE,'I66_MAKE_RELEASE_SCHEMA');
  assert.equal(scope.scopeContractPath,CONTRACT_PATH);assert.equal(scope.scopeContractBlob,CONTRACT_BLOB);
  assert.equal(scope.communicationDecision?.path,COMMUNICATION_DECISION_PATH);
  assert.equal(scope.communicationDecision?.gitBlobSha,COMMUNICATION_DECISION_BLOB);
  assert.equal(scope.tenantId,'alianzas-soluciones');assert.equal(scope.country,'GT');assert.equal(scope.instanceId,'710522720868');
  assert.equal(scope.scenarioId,10196136);assert.equal(scope.firestoreConnectionId,14756714);
  assert.equal(scope.assignment,'pending_operations');assert.equal(scope.outboundEnabled,false);assert.equal(scope.noBackfill,true);
  assert.equal(scope.authContextEventType,EVENT_TYPE);assert.equal(scope.deployState,'CLOSED');
  assert.equal(scope.realLeadActivationAfterCommittedOnly,true);assert.equal(scope.rollbackNewFunctionAndExactSecretDelta,true);
  assert.deepEqual(scope.sourcePaths,SOURCE_PATHS,'I66_MAKE_PRODUCT_SOURCE_SCOPE_DRIFT');
  assert.deepEqual(scope.balanceCorrection,BALANCE_CORRECTION,'I66_MAKE_BALANCE_FOCAL_SCOPE_DRIFT');
  assert.deepEqual(Object.keys(scope.sourceBlobs||{}).sort(),SOURCE_PATHS,'I66_MAKE_PRODUCT_SOURCE_PINS_MISSING');
  for(const h of Object.values(scope.sourceBlobs))sha40(h,'I66_MAKE_PRODUCT_SOURCE_BLOB_INVALID');
  if(sourceSha)assert.equal(scope.sourceSha,sourceSha,'I66_MAKE_SOURCE_DRIFT');
  sha40(scope.sourceSha,'I66_MAKE_SOURCE_REQUIRED');
  const runtime=scope.runtimeAccess||{};
  assert.equal(runtime.principal,RUNTIME,'I66_MAKE_RUNTIME_IDENTITY_REQUIRED');
  assert.equal(runtime.receiptPath,RUNTIME_RECEIPT_PATH);
  assert.equal(runtime.receiptBlob,RUNTIME_RECEIPT_BLOB,'I66_MAKE_RUNTIME_RECEIPT_REQUIRED');
  assert.equal(runtime.reportDigest,RUNTIME_REPORT_DIGEST,'I66_MAKE_RUNTIME_DIGEST_REQUIRED');
  assert.equal(runtime.firestoreCapabilitiesVerified,true,'I66_MAKE_RUNTIME_FIRESTORE_REQUIRED');
  assert.equal(scope.permissions?.secretResource,SECRET);assert.equal(scope.permissions?.role,'roles/secretmanager.secretAccessor');
  assert.equal(scope.permissions?.principal,runtime.principal);assert.equal(scope.permissions?.exactSecretResourceOnly,true);
  assert.equal(scope.permissions?.etagCompareAndSwap,true);assert.equal(scope.permissions?.projectIamWrites,0);
  assert.equal(scope.permissions?.rulesAuthMembershipWrites,0);
  assert.equal(scope.permissions?.forbidCliProjectIamMutation,true);
  assert.equal(scope.queueConfigurationWritesOutsideDataOnly,true);
  assert.ok(['firestore.rules','firestore.b4-003-scoped-candidate.rules'].includes(scope.queueRules?.sourcePath));
  sha40(scope.queueRules?.sourceBlob);
  if(phase!==undefined)assert.ok(['preview','live'].includes(phase));
  for(const ph of ['preview','live']){
    const closed=scope.closedConfiguration?.[ph];
    assert.ok(closed&&(closed.expectedDigest==='ABSENT'||/^[a-f0-9]{64}$/.test(closed.expectedDigest||'')),
      'I66_MAKE_CLOSED_CONFIG_PREIMAGE_REQUIRED');sha64(closed.nonce,'I66_MAKE_CLOSED_PROBE_NONCE_REQUIRED');
    const before=scope.targetBefore?.[ph];assert.ok(before,'I66_MAKE_TRIGGER_PREIMAGE_REQUIRED');
    assert.ok(['ABSENT','EXISTING_APPROVED'].includes(before.state),'I66_MAKE_TRIGGER_PREIMAGE_STATE');
    assert.equal(before.name,ADDED[ph].name);assert.equal(before.region,ADDED[ph].region);
    if(before.state==='ABSENT')assert.equal(before.revision,null,'I66_MAKE_ABSENT_PREVIOUS_REVISION_FORBIDDEN');
    else{assert.match(String(before.revision||''),/^[a-z][a-z0-9-]+$/);sha64(before.configurationDigest);sha40(before.receiptBlob);}
  }
  return scope;
}
function validateCandidate(p,phase){
  assert.equal(p.opsLeadsComposite,true);assert.equal(p.compositeVersion,2,'I66_MAKE_COMPOSITE_VERSION');
  assert.equal(p.expectedSiteFileCount,224);assert.equal(p.rollbackFiveBackendRevisionsAndHosting,true);
  assert.equal(p.syntheticRecordsOnly,true);assert.equal(p.noRealFinancialOrCustomerWrites,true);
  assert.equal(p.noRulesAuthIamWrites,false,'I66_MAKE_EXACT_SECRET_IAM_MUST_BE_DECLARED');
  assert.equal(p.noRulesAuthMembershipWrites,true);assert.equal(p.onlyExactSecretIamDeltaAllowed,true);
  const s=validateScope(p.makeIngress,{sourceSha:p.sourceSha,phase});
  assert.equal(p.opsLeadsBackendPath,'functions/product-ops-leads-domain.js');
  assert.equal(p.opsLeadsBackendBlobSha,s.sourceBlobs[p.opsLeadsBackendPath]);
  if(phase==='live'||p.financialPreviewQa!==undefined){
    const qa=p.financialPreviewQa;
    assert.match(String(qa?.receiptPath||''),/^artifacts\/orbit360-recovery\/release-control\/I6_6_[A-Z0-9_]+\.json$/,'I66_MAKE_FINANCIAL_PREVIEW_RECEIPT_REQUIRED');
    sha40(qa.receiptBlob,'I66_MAKE_FINANCIAL_PREVIEW_RECEIPT_PIN');
    sha40(qa.previewReadOnlyAuthorityBlob,'I66_MAKE_FINANCIAL_PREVIEW_AUTHORITY_PIN');
    for(const key of ['qaRunId','qaArtifactId'])assert.ok(Number.isSafeInteger(qa[key])&&qa[key]>0,'I66_MAKE_FINANCIAL_PREVIEW_RUN_OR_ARTIFACT_REQUIRED');
    assert.match(String(qa.qaArtifactDigest||''),/^sha256:[a-f0-9]{64}$/,'I66_MAKE_FINANCIAL_PREVIEW_ARTIFACT_DIGEST');
    sha64(qa.qaReportSha256,'I66_MAKE_FINANCIAL_PREVIEW_REPORT_DIGEST');
  }
  return s;
}
function verifySourcePins(p){
  const s=validateScope(p.makeIngress,{sourceSha:p.sourceSha});
  const at=(sha,pth)=>execFileSync('git',['show',sha+':'+pth]);
  assert.equal(blob(at(p.sourceSha,PACKAGER_PATH)),PACKAGER_BLOB,'I66_MAKE_CANONICAL_PACKAGER_PIN_DRIFT');
  assert.equal(blob(at(p.sourceSha,CONTRACT_PATH)),CONTRACT_BLOB,'I66_MAKE_APPROVED_CONTRACT_CHANGED');
  const decisionBytes=at(p.sourceSha,COMMUNICATION_DECISION_PATH);
  assert.equal(blob(decisionBytes),COMMUNICATION_DECISION_BLOB,'I66_MAKE_COMMUNICATION_DECISION_CHANGED');
  const decision=JSON.parse(decisionBytes);assert.equal(decision.whatsApp?.retainInitialMessage,true);
  assert.equal(decision.whatsApp.bodyMustComeFromVerifiedProviderReadback,true);assert.equal(decision.whatsApp.retainProductOnlyWhenSupportedByMessage,true);
  assert.equal(blob(at(p.sourceSha,META_RECEIPT_PATH)),META_RECEIPT_BLOB,'I66_MAKE_META_OBSERVATION_CHANGED');
  for(const pth of SOURCE_PATHS)assert.equal(blob(at(p.sourceSha,pth)),s.sourceBlobs[pth],'I66_MAKE_SOURCE_PIN_DRIFT_'+pth);
  assert.equal(blob(at(p.sourceSha,FRONTEND_PATH)),FRONTEND_BLOB,'I66_MAKE_BALANCE_SOURCE_PIN_DRIFT');
  const balanceBytes=at(p.sourceSha,BALANCE_RECEIPT_PATH);
  assert.equal(blob(balanceBytes),BALANCE_RECEIPT_BLOB,'I66_MAKE_BALANCE_CAUSAL_AUTHORITY_CHANGED');
  assert.deepEqual(JSON.parse(balanceBytes).correction?.productPaths,[{path:FRONTEND_PATH,gitBlobSha:FRONTEND_BLOB}]);
  const bytes=fs.readFileSync(s.runtimeAccess.receiptPath);assert.equal(blob(bytes),s.runtimeAccess.receiptBlob,'I66_MAKE_RUNTIME_RECEIPT_BLOB_DRIFT');
  const r=JSON.parse(bytes);
  assert.equal(r.schema,'GI_I66_MAKE_CANONICAL_RUNTIME_ACCESS_RECEIPT_V1');assert.equal(r.logEvidence?.observedReportDigest,RUNTIME_REPORT_DIGEST);
  assert.equal(r.logEvidence.redactedPayloadReconstructed,false,'I66_MAKE_REDACTED_LOG_MUST_NOT_BE_RECONSTRUCTED');
  assert.equal(r.runId,45352724136);assert.equal(r.jobId,138302908866);assert.equal(r.jobConclusion,'success');
  assert.equal(r.status,'EXACT_SECRET_IAM_DELTA_REQUIRED');assert.equal(r.scopeContractBlob,CONTRACT_BLOB);
  assert.equal(r.observedCanonicalRuntime?.principal,RUNTIME);assert.equal(r.observedCanonicalRuntime.firestoreCapabilitiesVerified,true);
  assert.equal(r.observedCanonicalRuntime.impersonationVerified,true);assert.equal(r.observedCanonicalRuntime.secretStatus,'PERMISSION_DENIED');
  assert.equal(r.exactRemediationScope?.secretResource,SECRET);assert.equal(r.exactRemediationScope.requiredGrantCount,1);
  return s;
}
const inventoryRows=x=>Array.isArray(x?.result)?x.result:Array.isArray(x)?x:[];
const id=r=>String(r.entryPoint||r.id||r.name||'').split('/').pop();
function validateInventoryBefore(p,phase,raw,expected){
  const s=validateCandidate(p,phase),rows=inventoryRows(raw),extra=ADDED[phase];
  assert.equal(new Set(rows.map(id)).size,rows.length,'I66_MAKE_FUNCTION_INVENTORY_DUPLICATE');
  for(const t of expected){const found=rows.filter(r=>id(r)===t.name);
    const absent=t.name===extra.name&&s.targetBefore[phase].state==='ABSENT';
    assert.equal(found.length,absent?0:1,'I66_MAKE_FUNCTION_PREIMAGE_DRIFT_'+t.name);
    if(found.length){assert.equal(String(found[0].region||found[0].location||''),t.region);
      if(t.name===extra.name)assert.equal(String(found[0].serviceConfig?.revision||found[0].revision||''),s.targetBefore[phase].revision);}
  }
  return true;
}
function validateInventoryAfter(p,phase,beforeRaw,afterRaw,expected){
  validateInventoryBefore(p,phase,beforeRaw,expected);
  const before=inventoryRows(beforeRaw),after=inventoryRows(afterRaw),extra=ADDED[phase];
  assert.equal(new Set(after.map(id)).size,after.length,'I66_MAKE_FUNCTION_INVENTORY_DUPLICATE');
  const added=p.makeIngress.targetBefore[phase].state==='ABSENT'?[extra.name]:[];
  assert.deepEqual(after.map(id).sort(),[...before.map(id),...added].sort(),'I66_MAKE_UNEXPECTED_FUNCTION_INVENTORY_DELTA');
  for(const t of expected){const found=after.filter(r=>id(r)===t.name);assert.equal(found.length,1);assert.equal(String(found[0].region||found[0].location||''),t.region);}
  const names=new Set(expected.map(t=>t.name));const untouched=rows=>rows.filter(r=>!names.has(id(r))).sort((a,b)=>id(a).localeCompare(id(b)));
  assert.deepEqual(untouched(before),untouched(after),'I66_MAKE_UNRELATED_FUNCTION_CHANGED');return true;
}
function validateTrigger(p,phase,row){
  const t=ADDED[phase],s=validateScope(p.makeIngress,{sourceSha:p.sourceSha,phase});
  assert.equal(row?.name,t.name);assert.equal(row.region,t.region);assert.equal(row.runtimePrincipal,s.runtimeAccess.principal);
  assert.equal(row.eventType,EVENT_TYPE);assert.equal(row.database,'(default)');
  assert.equal(row.document,`tenants/alianzas-soluciones/${phase==='preview'?'previewLeadIngressRequests':'leadIngressRequests'}/{requestId}`);
  assert.equal(row.queueRulesDenyClient,true);assert.equal(row.closedConfigurationVerified,true);assert.equal(row.probeOnly,true);
  sha64(row.configurationDigest);sha64(row.principalProbeDigest);sha64(row.principalSha256);
  assert.ok(['service_account','unknown'].includes(row.authType));
  for(const key of ['canonicalLeadWrites','canonicalAuditWrites','notificationsCreated','externalMessagesSent','providerRequests'])assert.equal(row[key],0);
  assert.equal(row.realAuthContextObserved,true,'I66_MAKE_TRAFFIC_ALONE_IS_NOT_AUTH_PROOF');
  assert.equal(row.projectIamReadback?.status,'PROJECT_IAM_UNCHANGED_AND_CLI_WRITES_FORBIDDEN');
  assert.equal(row.projectIamReadback.cliVersion,'14.10.1');assert.equal(row.projectIamReadback.projectIamWrites,0);
  sha64(row.projectIamReadback.beforeDigest);assert.equal(row.projectIamReadback.beforeDigest,row.projectIamReadback.afterDigest);return row;
}
function validatePreviewProof(p,proof){
  assert.equal(proof?.schema,'GI_I66_MAKE_LEAD_INGRESS_PREVIEW_PROOF_V1');assert.equal(proof.sourceSha,p.sourceSha);
  assert.equal(proof.artifactDigest,p.artifactDigest);assert.equal(proof.status,'PASS');
  validateTrigger(p,'preview',proof.closedTrigger);
  for(const key of ['authenticatedMakeQueue','providerFixtureIsSynthetic','pendingOperationsCanonicalLead','canonicalReadback','sameImmutableArtifact','noOtherOperationalMutations','syntheticRestoreComplete'])assert.equal(proof[key],true);
  assert.equal(proof.createdCanonicalLeads,1);assert.equal(proof.replayCanonicalWrites,0);assert.equal(proof.rejectCanonicalWrites,0);
  assert.equal(proof.externalMessagesSent,0);assert.equal(proof.realLeadAccepted,false);sha64(proof.reportSha256);sha40(proof.reportBlobSha);
  return proof;
}
function validateLiveProof(p,proof){
  validateCandidate(p,'live');assert.equal(proof.status,LIVE_STATUS);
  validateTrigger(p,'live',proof.makeIngress?.closedTrigger);
  validatePreviewProof(p,proof.makeIngress?.preview);
  assert.equal(proof.makeIngress?.status,'CLOSED_DEPLOYMENT_AUTH_CONTEXT_VERIFIED');
  assert.equal(proof.makeIngress?.active,false);assert.equal(proof.makeIngress?.a13RealLeadAccepted,false);
  assert.equal(proof.makeIngress?.configurationWritesOutsideDataOnly,true);assert.equal(proof.makeIngress?.externalMessagesSent,0);
  assert.ok([0,1].includes(proof.makeIngress?.secretIamWrites),'I66_MAKE_ONLY_ONE_SECRET_GRANT_ALLOWED');
  const iam=proof.makeIngress.secretIamReadback;assert.equal(iam?.status,'SECRET_RUNTIME_ACCESS_VERIFIED');
  assert.equal(iam.secretResource,SECRET);assert.equal(iam.principal,p.makeIngress.runtimeAccess.principal);
  assert.equal(iam.role,'roles/secretmanager.secretAccessor');assert.equal(iam.secretReadback,true);
  assert.equal(iam.iamWrites,proof.makeIngress.secretIamWrites);
  for(const k of ['projectIamWrites','secretValueWrites','firestoreWrites','membershipWrites','externalMessagesSent'])assert.equal(iam[k],0);
  const t=ADDED.live,before=p.makeIngress.targetBefore.live;
  const row=proof.backendRevisions.find(r=>r.name===t.name&&r.region===t.region);assert.ok(row);
  if(before.state==='ABSENT'){
    assert.equal(row.previousState,'ABSENT');assert.equal(row.previousRevision,null);assert.equal(row.rollbackAction,'DELETE_EXACT_CREATED_FUNCTION');
  }else{assert.equal(row.previousState,'EXISTING_APPROVED');assert.equal(row.previousRevision,before.revision);assert.equal(row.rollbackAction,'RESTORE_EXACT_PREVIOUS_REVISION');}
  assert.equal(row.currentRevision,proof.makeIngress.closedTrigger.revision);
  return proof;
}
module.exports={SCOPE,REQUEST_MODE,CONTRACT_PATH,CONTRACT_BLOB,COMMUNICATION_DECISION_PATH,COMMUNICATION_DECISION_BLOB,META_RECEIPT_PATH,META_RECEIPT_BLOB,EVENT_TYPE,SECRET,RUNTIME,RUNTIME_RECEIPT_PATH,RUNTIME_RECEIPT_BLOB,RUNTIME_REPORT_DIGEST,SOURCE_PATHS,FRONTEND_PATH,FRONTEND_BLOB,PRODUCT_PATHS,PACKAGER_PATH,PACKAGER_BLOB,BALANCE_RECEIPT_PATH,BALANCE_RECEIPT_BLOB,BALANCE_CORRECTION,ADDED,PREVIEW_STATUS,LIVE_STATUS,
  isMake,target,validatePackagedSourceBytes,validateScope,validateCandidate,verifySourcePins,validateInventoryBefore,validateInventoryAfter,validateTrigger,validatePreviewProof,validateLiveProof};
