import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {collectInsurerPreviewResumeModel,validateInsurerPreviewResumeModel,
  insurerResumeContract as k,insurerResumeAtomicPaths,identityContract as n,identityAtomicPaths,
  postRestorationContract as p,postRestorationAtomicPaths,postPatchFailureHistory} from './gravicentra-b4-003-insurer-preview-resume.mjs';

const valid=collectInsurerPreviewResumeModel();
if(valid.kind==='INSURER_POST_RESTORATION_READBACK_SUCCESSOR'){
 const reject=(name,edit,code)=>test(name,()=>{const m=structuredClone(valid);edit(m);assert.throws(()=>validateInsurerPreviewResumeModel(m),code);});
 test('exact GET-only six-file successor preserves all 422 keys and 118 product files',()=>{
  const r=validateInsurerPreviewResumeModel(valid);assert.equal(r.productFilesPreserved,118);assert.equal(r.priorKeysPreserved,422);assert.equal(r.furtherConfigurationWrites,0);
 });
 reject('cannot rewrite the previous identity authority',m=>{m.control[n.key].status='changed';},/POST_RESTORATION_PRIOR_KEYS_CHANGED/);
 reject('cannot add an unrelated Control Plane key',m=>{m.control.unbound=true;},/POST_RESTORATION_PRIOR_KEYS_CHANGED/);
 reject('cannot change a product blob',m=>{m.currentBlobs[m.productPaths[0]]='1'.repeat(40);},/POST_RESTORATION_PRODUCT_COMPOSITION_CHANGED/);
 reject('physical Guard stays unchanged',m=>{m.currentBlobs[k.guard]='2'.repeat(40);},/POST_RESTORATION_FROZEN_PARENT_REQUIRED/);
 reject('historical PATCH helper remains immutable',m=>{m.currentBlobs[k.repair]='3'.repeat(40);},/POST_RESTORATION_HISTORICAL_RECIPE_CHANGED/);
 reject('historical identity receipt remains immutable',m=>{m.currentBlobs[n.receipt]='3'.repeat(40);},/POST_RESTORATION_HISTORICAL_RECIPE_CHANGED/);
 reject('current authority must bind the new receipt',m=>{m.authorityReceiptPath=n.receipt;},/POST_RESTORATION_AUTHORITY_POINTER_INVALID/);
 reject('readback cannot authorize PATCH',m=>{m.receipt.readOnlyRecovery.allowedHttpMethods.push('PATCH');},/POST_RESTORATION_READ_ONLY_SCOPE_INVALID/);
 reject('cannot adjudicate an arbitrary operation',m=>{m.receipt.readOnlyRecovery.operationName+='other';},/POST_RESTORATION_READ_ONLY_SCOPE_INVALID/);
 reject('operation response is mandatory',m=>{m.receipt.readOnlyRecovery.operationResponseFunctionMustEqualCurrent=false;},/POST_RESTORATION_READ_ONLY_SCOPE_INVALID/);
 reject('all expected source hashes stay tied to the immutable manifest',m=>{m.receipt.backendManifest.files[0].sha256='0'.repeat(64);},/POST_RESTORATION_ORIGINAL_MANIFEST_CHANGED/);
 reject('original deployment snapshot cannot be rewritten',m=>{m.receipt.initialDeploymentSnapshot.targets[0].identity.build='other';},/POST_RESTORATION_ORIGINAL_DEPLOYMENT_SNAPSHOT_CHANGED/);
 reject('the single historical PATCH remains visible',m=>{m.receipt.postPatchFailureHistory[0].patchRequests=0;},/POST_RESTORATION_FAILED_ATTEMPTS_CHANGED/);
 reject('the second failed no-PATCH attempt remains visible',m=>{m.receipt.failedAttemptReports.pop();},/POST_RESTORATION_FAILED_ATTEMPTS_CHANGED/);
 reject('one target is not enough to prove both deployed source packages',m=>{m.receipt.readOnlyRecovery.exactSourceComparisonsRequired=33;},/POST_RESTORATION_READ_ONLY_SCOPE_INVALID/);
 reject('metadata alone must remain pending exact source bytes',m=>{m.receipt.readOnlyRecovery.metadataPassIsSourceBytesPending=false;},/POST_RESTORATION_READ_ONLY_SCOPE_INVALID/);
 reject('transport cannot authorize a further config write',m=>{m.receipt.previewTransport.configurationWrite=true;},/POST_RESTORATION_TRANSPORT_INVALID/);
 reject('cannot add a seventh atomic source file',m=>{m.sourceDelta.push('extra.js');m.sourceDelta.sort();m.deltaPaths.push('extra.js');m.deltaPaths.sort();},/POST_RESTORATION_ATOMIC_SOURCE_INVALID|POST_RESTORATION_PREPUBLICATION_DELTA_NOT_EXACT|POST_RESTORATION_EXACT_TRANSPORT_REQUIRED/);
 reject('cannot substitute the GET helper bytes',m=>{m.receipt.governanceSources.readback.blobSha='4'.repeat(40);},/POST_RESTORATION_TOOL_BINDING_INVALID/);
 function evidence(){
  const m=structuredClone(valid),source='a'.repeat(40),transport='b'.repeat(40),blob='c'.repeat(40);
  delete m.control[k.evidenceKey];m.sourceControl=structuredClone(m.control);m.sourceCommit=source;m.sourceParent=p.parent;m.sourceAncestor=true;m.head=transport;
  m.sourceDelta=[...postRestorationAtomicPaths];m.sourceTree={...m.currentBlobs};m.untracked=[k.evidencePath];m.evidenceCommit=null;m.evidenceParent=null;m.evidenceDelta=null;
  m.currentBlobs[k.workflow]=m.receipt.previewTransport.transportWorkflowAfterBlob;
  m.transport={sha:transport,parent:source,message:k.transportMessage,paths:[k.workflow],workflowBlob:m.currentBlobs[k.workflow]};
  m.deltaPaths=[...postRestorationAtomicPaths,k.workflow,k.evidencePath].sort();m.currentBlobs[k.evidencePath]=blob;
  const initial=m.receipt.initialDeploymentSnapshot.targets;
  const beforeReader=initial.find(x=>x.target==='orbit360ScopedPolicyReadPreview').identity;
  const reader={...structuredClone(beforeReader),build:'projects/ays-orbit-360-lab/locations/us-east1/builds/provider-rebuild',
   sourceStorage:{...beforeReader.sourceStorage,generation:'1793408711390000'},revision:'orbit360scopedpolicyreadpreview-00068-test',
   environmentVariablesSha256:k.baselineEnvironmentSha256,serviceConfigNonRevisionSha256:p.baselineServiceConfigSha256};
  const F={...reader,labelsSha256:crypto.createHash('sha256').update(JSON.stringify(Object.fromEntries(Object.entries(reader.labels).sort()))).digest('hex')};
  const checks=Object.fromEntries(['name','environment','stateActive','runtime','entryPoint','service','codeHash','labels','baselineEnvironment','baselineServiceConfig','secretReferences','buildInScope','storageInScope','revisionInScope'].map(f=>[f,true]));
  const H={schema:'gravicentra-insurer-reader-postpatch-readback-v1',status:'EXPECTED_METADATA_PASS_SOURCE_BYTES_PENDING',operationName:p.operationName,operationDone:true,
   operationResponseBindsCurrent:true,finalOperationResponseBindsCurrent:true,functionStableDuringReadback:true,patchRequests:0,remoteMutationRequests:0,
   sourceBytesProofRequired:true,sourceBytesProofCompleted:false,manifestSha256:p.manifestSha256,expectedBackendFileCount:33,iamUnchanged:true,iamSha256:p.iamSha256,
   finalEnvironmentSha256:k.baselineEnvironmentSha256,finalServiceConfigNonRevisionSha256:p.baselineServiceConfigSha256,finalRevision:reader.revision,
   currentFunctionIdentity:F,operationResponseFunctionIdentity:structuredClone(F),finalFunctionIdentity:structuredClone(F),
   currentFunctionComparisons:checks,operationResponseFunctionComparisons:{...checks},finalFunctionComparisons:{...checks},
   operationResponseBinding:{responsePresent:true,responseTypeValid:true,bindsCurrent:true,comparisons:Object.fromEntries(['name','state','environment','buildConfig','serviceConfig','labels','updateTime','completeFunction'].map(f=>[f,true]))},
   platformBuildChanged:true,platformStorageChanged:true,platformImageChanged:true,currentImage:'new-image-reference',deployedImage:'old-image-reference'};
  const rows=initial.map(t=>{const after=t.target==='orbit360ScopedPolicyReadPreview'?reader:structuredClone(t.identity);return {target:t.target,region:'us-east1',iamUnchanged:true,after,
   sourceProof:{status:'DEPLOYED_BACKEND_SOURCE_BYTES_MATCH_EXACT_STAGE',scope:'ALL_STAGED_FUNCTION_FILES',storageSource:after.sourceStorage,
    sourceFiles:m.receipt.backendManifest.files.map(f=>({path:f.path.replace(/^functions\//,''),sha256:f.sha256}))}};});
  const E=m.evidence={schema:'GRAVICENTRA_I65_B4003_INSURER_ACTIVITY_PREVIEW_EVIDENCE_V1',status:'TECHNICAL_PREVIEW_PASS_AUTHENTICATED_AUDIT_BLOCKED',gate:'I6.5/B4-003',
   sourceSha:k.source,sourceGuardRunId:k.sourceGuardRunId,initialTransportSha:k.parent,initialRunId:k.initialRunId,failedRecoveryTransportSha:n.parent,failedRecoveryRunId:n.failedRecoveryRunId,
   postPatchFailureTransportSha:p.parent,postPatchFailureRunId:p.failedRunId,postPatchFailureHistory:structuredClone(postPatchFailureHistory),failedAttemptReports:structuredClone(m.receipt.failedAttemptReports),
   parentHead:transport,transportSha:transport,transportRunId:102,recoverySourceSha:source,recoveryGuardRunId:101,recoveryTransportSha:transport,recoveryRunId:102,
   previewUrl:m.receipt.previewTransport.expectedPreviewUrl,buildId:'gi-i65-b4-'+k.source.slice(0,12)+'-57f234755dc1',
   technical:{status:'PASS',newFunctionsCreated:0,backendCodeRedeployed:false,hostingRebuilt:false,backendExactSourceReadback:true,hostingBytesExact:true,liveIdentityUnchanged:true,iamUnchanged:true,
    recoveryEnvironmentRestored:true,recoveredEnvironmentSha256:k.baselineEnvironmentSha256,recoveredReaderRevision:reader.revision,initialBackendSourceUnchanged:true,
    targetFunctions:[{name:'orbit360ProductOperationalCommandPreview',region:'us-east1'},{name:'orbit360ScopedPolicyReadPreview',region:'us-east1'}],
    backendCodeDeploymentRequested:false,currentConfigurationPatchRequests:0,remoteMutationRequests:0,backendSourceContentUnchanged:true,sourceBytesProofCompleted:true,backendSourceComparisons:66,
    knownOperationDone:true,operationResponseBindsCurrent:true,sourceIdentityMeaning:p.sourceIdentityMeaning,postRestorationReadback:H,
    platformBuildChanged:true,platformStorageChanged:true,platformImageChanged:true,functionReadbacks:rows},
   authenticatedUat:{status:'BLOCKED',reason:'Synthetic fixture for the evidence validation test; no browser action was performed.'},
   boundaries:Object.fromEntries(['liveDeployment','authIamRulesChange','membershipChange','realBusinessWrites','dataImport','cleanup','findingClosed','b4003Closed','paulaVisualAccepted','productionAccepted'].map(f=>[f,false]))};
  m.control[k.evidenceKey]={schema:'GRAVICENTRA_I65_B4003_INSURER_ACTIVITY_EVIDENCE_POINTER_V1',status:E.status,gate:E.gate,receiptPath:k.evidencePath,receiptBlobSha:blob,
   sourceSha:E.sourceSha,sourceGuardRunId:E.sourceGuardRunId,transportSha:E.transportSha,transportRunId:E.transportRunId,previewUrl:E.previewUrl,buildId:E.buildId,currentCapabilityAcceptances:0,
   recoverySourceSha:source,recoveryGuardRunId:101,recoveryTransportSha:transport,recoveryRunId:102,failedRecoveryTransportSha:n.parent,failedRecoveryRunId:n.failedRecoveryRunId,
   postPatchFailureTransportSha:p.parent,postPatchFailureRunId:p.failedRunId};
  return m;
 }
 const rejectEvidence=(name,edit,code)=>test(name,()=>{const m=evidence();edit(m);assert.throws(()=>validateInsurerPreviewResumeModel(m),code);});
 test('bound provider metadata regeneration plus all 66 original bytes can pass technical evidence',()=>{assert.equal(validateInsurerPreviewResumeModel(evidence()).findingsChanged,false);});
 rejectEvidence('missing completed operation Function response cannot pass',m=>{delete m.evidence.technical.postRestorationReadback.operationResponseFunctionIdentity;},/POST_RESTORATION_OPERATION_BOUND_METADATA_REQUIRED/);
 rejectEvidence('33 arbitrary hashes are insufficient',m=>{m.evidence.technical.functionReadbacks[0].sourceProof.sourceFiles[0].sha256='0'.repeat(64);},/POST_RESTORATION_ALL_66_CONTENT_COMPARISONS_REQUIRED/);
 rejectEvidence('a changed image must not be described as unchanged',m=>{m.evidence.technical.containerImageUnchanged=true;},/POST_RESTORATION_METADATA_REGENERATION_MISREPORTED/);
 rejectEvidence('writer metadata may not change under reader operation authority',m=>{m.evidence.technical.functionReadbacks.find(r=>r.target==='orbit360ProductOperationalCommandPreview').after.build='changed';},/POST_RESTORATION_FROZEN_TARGETS_OR_METADATA_FACTS_CHANGED/);
 rejectEvidence('writer environment remains exactly the original snapshot',m=>{m.evidence.technical.functionReadbacks.find(r=>r.target==='orbit360ProductOperationalCommandPreview').after.environmentVariablesSha256='0'.repeat(64);},/POST_RESTORATION_FROZEN_TARGETS_OR_METADATA_FACTS_CHANGED/);
 rejectEvidence('evidence must admit zero further PATCH calls only',m=>{m.evidence.technical.currentConfigurationPatchRequests=1;},/POST_RESTORATION_EVIDENCE_WRITES_FORBIDDEN/);
 rejectEvidence('neither failed attempt may disappear from final evidence',m=>{m.evidence.postPatchFailureHistory.pop();},/POST_RESTORATION_EVIDENCE_FAILURE_HISTORY_LOST/);
 rejectEvidence('metadata pending cannot become source-content PASS',m=>{m.evidence.technical.sourceBytesProofCompleted=false;},/POST_RESTORATION_CONTENT_PASS_INCOMPLETE/);
 rejectEvidence('the compared source must belong to the operation-bound function',m=>{m.evidence.technical.functionReadbacks.find(r=>r.target==='orbit360ScopedPolicyReadPreview').after.build='other';},/POST_RESTORATION_CONTENT_NOT_BOUND_TO_OPERATION_FUNCTION/);
 rejectEvidence('full service configuration hash stays exact',m=>{m.evidence.technical.postRestorationReadback.finalServiceConfigNonRevisionSha256='0'.repeat(64);},/POST_RESTORATION_OPERATION_BOUND_METADATA_REQUIRED/);
 rejectEvidence('source bytes from only one target do not pass',m=>{m.evidence.technical.functionReadbacks.pop();},/POST_RESTORATION_ALL_66_CONTENT_COMPARISONS_REQUIRED/);
 test('partial readback can be recorded without accepting UAT or source content',()=>{
  const m=evidence();m.evidence.status='TECHNICAL_PREVIEW_PARTIAL_UAT_NOT_ACCEPTED';m.control[k.evidenceKey].status=m.evidence.status;
  m.evidence.technical.status='PARTIAL';m.evidence.authenticatedUat={status:'NOT_ACCEPTED'};delete m.evidence.technical.sourceBytesProofCompleted;
  assert.equal(validateInsurerPreviewResumeModel(m).findingsChanged,false);
 });
}else if(valid.kind==='INSURER_REVISION_IDENTITY_SUCCESSOR'){
 const reject=(name,edit,code)=>test(name,()=>{const m=structuredClone(valid);edit(m);assert.throws(()=>validateInsurerPreviewResumeModel(m),code);});
 test('exact six-file identity successor preserves all product and prior authority',()=>{
  const r=validateInsurerPreviewResumeModel(valid);assert.equal(r.productFilesPreserved,118);assert.equal(r.priorKeysPreserved,421);
 });
 reject('current authority path must identify the new receipt',m=>{m.authorityReceiptPath=k.receipt;},/IDENTITY_CURRENT_AUTHORITY_POINTER_INVALID/);
 reject('current authority blob must match the current Control Plane',m=>{m.authorityReceiptBlobSha='1'.repeat(40);},/IDENTITY_CURRENT_AUTHORITY_POINTER_INVALID/);
 reject('cannot rewrite the prior restoration authorization',m=>{m.control.b4003InsurerPreviewEnvironmentRestoreResume20261030.environmentRestoreAuthorized=false;},/IDENTITY_PRIOR_CONTROL_OR_KEYS_CHANGED/);
 reject('cannot add another unrelated control key',m=>{m.control.unbound=true;},/IDENTITY_PRIOR_CONTROL_OR_KEYS_CHANGED/);
 reject('cannot change the already deployed product',m=>{m.currentBlobs[m.productPaths[0]]='2'.repeat(40);},/IDENTITY_PRODUCT_COMPOSITION_CHANGED/);
 reject('the existing Guard stays physically frozen',m=>{m.currentBlobs[k.guard]='3'.repeat(40);},/IDENTITY_EXACT_PARENT_AND_FROZEN_GUARD_REQUIRED/);
 reject('cannot broaden the original environment patch mask',m=>{m.receipt.environmentRestore.patchMask='serviceConfig';},/IDENTITY_PREVIOUS_RECIPE_OR_SCOPE_CHANGED/);
 reject('short service is not falsely documented as the observed cause',m=>{m.receipt.failedRecovery.shortServiceRepresentationConfirmed=true;},/IDENTITY_FAILED_READ_MISREPRESENTED/);
 reject('the failed read must preserve zero patch attempts',m=>{m.receipt.failedRecovery.patchRequests=1;},/IDENTITY_FAILED_READ_MISREPRESENTED/);
 reject('short parent service cannot weaken full revision identity',m=>{m.receipt.identityCompatibility.completeRevisionNameStillExact=false;},/IDENTITY_COMPATIBILITY_SCOPE_EXPANDED/);
 reject('cannot relax hashes or permitted API mask',m=>{m.receipt.identityCompatibility.hashesMasksAndTargetsUnchanged=false;},/IDENTITY_COMPATIBILITY_SCOPE_EXPANDED/);
 reject('cannot substitute unbound helper bytes',m=>{m.receipt.governanceSources.repair.blobSha='4'.repeat(40);},/IDENTITY_CURRENT_TOOL_BINDING_INVALID/);
 reject('cannot add a seventh source file',m=>{m.sourceDelta.push('extra.js');m.sourceDelta.sort();m.deltaPaths.push('extra.js');m.deltaPaths.sort();},/IDENTITY_ATOMIC_SOURCE_INVALID|IDENTITY_PREPUBLICATION_DELTA_NOT_EXACT|IDENTITY_EXACT_TRANSPORT_REQUIRED/);
 reject('cannot omit the exact resumed workflow hash',m=>{m.receipt.previewTransport.transportWorkflowAfterBlob=null;},/IDENTITY_TRANSPORT_INVALID/);
 function evidence(){
  const m=structuredClone(valid),resume='a'.repeat(40),transport='b'.repeat(40),blob='c'.repeat(40);
  delete m.control[k.evidenceKey];m.sourceControl=structuredClone(m.control);
  m.sourceCommit=resume;m.sourceParent=n.parent;m.sourceAncestor=true;m.head=transport;
  m.sourceDelta=[...identityAtomicPaths];m.sourceTree={...m.currentBlobs};m.untracked=[k.evidencePath];
  m.evidenceCommit=null;m.evidenceParent=null;m.evidenceDelta=null;
  m.currentBlobs[k.workflow]=m.receipt.previewTransport.transportWorkflowAfterBlob;
  m.transport={sha:transport,parent:resume,message:k.transportMessage,paths:[k.workflow],workflowBlob:m.currentBlobs[k.workflow]};
  m.deltaPaths=[...identityAtomicPaths,k.workflow,k.evidencePath].sort();m.currentBlobs[k.evidencePath]=blob;
  const buildId='gi-i65-b4-'+k.source.slice(0,12)+'-57f234755dc1';
  const E=m.evidence={schema:'GRAVICENTRA_I65_B4003_INSURER_ACTIVITY_PREVIEW_EVIDENCE_V1',status:'TECHNICAL_PREVIEW_PASS_AUTHENTICATED_AUDIT_PASS',
   gate:'I6.5/B4-003',sourceSha:k.source,sourceGuardRunId:k.sourceGuardRunId,initialTransportSha:k.parent,initialRunId:k.initialRunId,
   failedRecoveryTransportSha:n.parent,failedRecoveryRunId:n.failedRecoveryRunId,transportSha:transport,parentHead:transport,transportRunId:102,
   recoverySourceSha:resume,recoveryGuardRunId:101,recoveryTransportSha:transport,recoveryRunId:102,previewUrl:m.receipt.previewTransport.expectedPreviewUrl,buildId,
   technical:{status:'PASS',newFunctionsCreated:0,backendCodeRedeployed:false,hostingRebuilt:false,backendExactSourceReadback:true,hostingBytesExact:true,
    liveIdentityUnchanged:true,iamUnchanged:true,recoveryEnvironmentRestored:true,recoveredEnvironmentSha256:k.baselineEnvironmentSha256,
    initialBackendSourceUnchanged:true,recoveredReaderRevision:'orbit360scopedpolicyreadpreview-00068-test',targetFunctions:[
      {name:'orbit360ProductOperationalCommandPreview',region:'us-east1'},{name:'orbit360ScopedPolicyReadPreview',region:'us-east1'}]},
   authenticatedUat:{status:'PASS',fixtureId:'b4003qa_human_insurer_r20',actor:'Carlos Castro',role:'Operativo',country:'GT',buildId,
    syntheticWrites:2,restored:true,priorActivityRetained:true,newAuditRowsAfterReload:2,observationsRestoredExactly:true,
    otherVisibleFieldsCompared:12,otherVisibleFieldsUnchanged:true,auditRows:['edit','restore'].map((phase,i)=>({phase,visibleActor:'Carlos Castro',
     visibleRole:'operativo',reason:'QA reason '+phase,matchesSubmittedReason:true,changedFields:['observaciones'],rowDigestSha256:String(i+1).repeat(64),dateTimeText:'30/10/2026, 18:50:00'}))},
   boundaries:Object.fromEntries(['liveDeployment','authIamRulesChange','membershipChange','realBusinessWrites','dataImport','cleanup','findingClosed',
    'b4003Closed','paulaVisualAccepted','productionAccepted'].map(p=>[p,false]))};
  m.control[k.evidenceKey]={schema:'GRAVICENTRA_I65_B4003_INSURER_ACTIVITY_EVIDENCE_POINTER_V1',status:E.status,gate:E.gate,
   receiptPath:k.evidencePath,receiptBlobSha:blob,sourceSha:E.sourceSha,transportSha:E.transportSha,sourceGuardRunId:E.sourceGuardRunId,
   transportRunId:E.transportRunId,previewUrl:E.previewUrl,buildId,currentCapabilityAcceptances:0,recoverySourceSha:E.recoverySourceSha,
   recoveryGuardRunId:E.recoveryGuardRunId,recoveryTransportSha:E.recoveryTransportSha,recoveryRunId:E.recoveryRunId,
   failedRecoveryTransportSha:n.parent,failedRecoveryRunId:n.failedRecoveryRunId};
  return m;
 }
 test('final evidence preserves original source and both failed transports',()=>{assert.equal(validateInsurerPreviewResumeModel(evidence()).findingsChanged,false);});
 test('final evidence cannot omit the failed identity read',()=>{const m=evidence();delete m.evidence.failedRecoveryRunId;assert.throws(()=>validateInsurerPreviewResumeModel(m),/IDENTITY_FAILED_RECOVERY_LINEAGE_LOST/);});
 test('final evidence cannot replace the original product source',()=>{const m=evidence();m.evidence.sourceSha='d'.repeat(40);assert.throws(()=>validateInsurerPreviewResumeModel(m),/EVIDENCE_IDENTITY_INVALID/);});
 test('final evidence still requires exact restoration of observations',()=>{const m=evidence();m.evidence.authenticatedUat.observationsRestoredExactly=false;assert.throws(()=>validateInsurerPreviewResumeModel(m),/AUTHENTICATED_AUDIT_PASS_INCOMPLETE/);});
 test('final evidence cannot hide a source redeployment',()=>{const m=evidence();m.evidence.technical.backendCodeRedeployed=true;assert.throws(()=>validateInsurerPreviewResumeModel(m),/EVIDENCE_TARGETS_INVALID/);});
}else{
const reject=(name,edit,code)=>test(name,()=>{const m=structuredClone(valid);edit(m);assert.throws(()=>validateInsurerPreviewResumeModel(m),code);});
test('exact governance-only repair preserves the complete deployed product',()=>{
  const r=validateInsurerPreviewResumeModel(valid);assert.equal(r.productFilesPreserved,118);
  assert.equal(r.backendCodeRedeploy,false);assert.equal(r.hostingRebuild,false);
});
reject('cannot rewrite prior Metas closure',m=>{m.control.b4003InstitutionalGoalsClosure20261030.productionAccepted=true;},/PRIOR_CONTROL_OR_NEW_KEYS_CHANGED/);
reject('cannot add an unrelated authority key',m=>{m.control.extraAuthority=true;},/PRIOR_CONTROL_OR_NEW_KEYS_CHANGED/);
reject('cannot reclassify the failed initial run as successful',m=>{m.receipt.driftEvidence.originalRunReclassifiedAsSuccess=true;},/ORIGINAL_FAILURE_EVIDENCE_INVALID/);
reject('cannot change a product file during environment recovery',m=>{m.currentBlobs[m.productPaths[0]]='1'.repeat(40);},/PRODUCT_OR_ORIGINAL_COMPOSITION_CHANGED/);
reject('cannot target LIVE reader',m=>{m.receipt.environmentRestore.function='orbit360ScopedPolicyRead';},/ENVIRONMENT_RESTORE_SCOPE_INVALID/);
reject('cannot restore an unproven environment map',m=>{m.receipt.environmentRestore.baselineEnvironmentSha256='2'.repeat(64);},/ENVIRONMENT_RESTORE_SCOPE_INVALID/);
reject('cannot broaden the Cloud Functions patch mask',m=>{m.receipt.environmentRestore.patchMask='serviceConfig';},/ENVIRONMENT_RESTORE_SCOPE_INVALID/);
reject('cannot accept another current revision',m=>{m.receipt.environmentRestore.expectedCurrentRevision='arbitrary-revision';},/ENVIRONMENT_RESTORE_SCOPE_INVALID/);
reject('cannot mutate IAM under restoration authority',m=>{m.receipt.environmentRestore.iamPolicyMutation=true;},/ENVIRONMENT_RESTORE_SCOPE_INVALID/);
reject('cannot rebuild Hosting under artifact reuse authority',m=>{m.receipt.rebuildForbidden=false;},/IMMUTABLE_ARTIFACT_REUSE_INVALID/);
reject('cannot substitute a different Hosting artifact',m=>{m.receipt.artifacts.hosting.id++;},/IMMUTABLE_ARTIFACT_REUSE_INVALID/);
reject('cannot suppress source-generation preservation',m=>{m.receipt.environmentRestore.codeStorageAndImageMustRemainUnchanged=false;},/ENVIRONMENT_RESTORE_SCOPE_INVALID/);
reject('cannot alter the original Guard body',m=>{m.currentGuard+='\n// changed\n';},/PARENT_GUARD_BODY_CHANGED/);
reject('cannot run an unbound repair helper',m=>{m.receipt.governanceSources.repair.blobSha='3'.repeat(40);},/CURRENT_GOVERNANCE_BLOB_INVALID/);
reject('cannot add an eighth atomic file',m=>{m.sourceDelta.push('extra.js');m.sourceDelta.sort();m.deltaPaths.push('extra.js');m.deltaPaths.sort();},/EXACT_RESUME_SOURCE_COMMIT_REQUIRED|PREPUBLICATION_DELTA_NOT_EXACT|EXACT_RESUME_TRANSPORT_REQUIRED/);

function evidenceModel(){
  const m=structuredClone(valid),resume='a'.repeat(40),transport='b'.repeat(40),blob='c'.repeat(40);
  delete m.control[k.evidenceKey];m.sourceControl=structuredClone(m.control);
  m.sourceCommit=resume;m.sourceParent=k.parent;m.sourceAncestor=true;m.head=transport;
  m.sourceDelta=[...insurerResumeAtomicPaths];m.sourceTree={...m.currentBlobs};
  m.untracked=[k.evidencePath];m.evidenceCommit=null;m.evidenceParent=null;m.evidenceDelta=null;
  m.currentBlobs[k.workflow]=m.receipt.previewTransport.transportWorkflowAfterBlob;
  m.transport={sha:transport,parent:resume,message:k.transportMessage,paths:[k.workflow],workflowBlob:m.currentBlobs[k.workflow]};
  m.deltaPaths=[...insurerResumeAtomicPaths,k.workflow,k.evidencePath].sort();m.currentBlobs[k.evidencePath]=blob;
  const buildId='gi-i65-b4-'+k.source.slice(0,12)+'-57f234755dc1';
  const E=m.evidence={schema:'GRAVICENTRA_I65_B4003_INSURER_ACTIVITY_PREVIEW_EVIDENCE_V1',
    status:'TECHNICAL_PREVIEW_PASS_AUTHENTICATED_AUDIT_PASS',gate:'I6.5/B4-003',sourceSha:k.source,
    sourceGuardRunId:k.sourceGuardRunId,initialTransportSha:k.parent,initialRunId:k.initialRunId,
    transportSha:transport,parentHead:transport,transportRunId:102,recoverySourceSha:resume,recoveryGuardRunId:101,
    recoveryTransportSha:transport,recoveryRunId:102,previewUrl:m.receipt.previewTransport.expectedPreviewUrl,buildId,
    technical:{status:'PASS',newFunctionsCreated:0,backendCodeRedeployed:false,hostingRebuilt:false,
      backendExactSourceReadback:true,hostingBytesExact:true,liveIdentityUnchanged:true,iamUnchanged:true,
      recoveryEnvironmentRestored:true,recoveredEnvironmentSha256:k.baselineEnvironmentSha256,
      initialBackendSourceUnchanged:true,recoveredReaderRevision:'orbit360scopedpolicyreadpreview-00068-test',
      targetFunctions:[{name:'orbit360ProductOperationalCommandPreview',region:'us-east1'},
        {name:'orbit360ScopedPolicyReadPreview',region:'us-east1'}]},
    authenticatedUat:{status:'PASS',fixtureId:'b4003qa_human_insurer_r20',actor:'Carlos Castro',role:'Operativo',country:'GT',
      buildId,syntheticWrites:2,restored:true,priorActivityRetained:true,newAuditRowsAfterReload:2,
      observationsRestoredExactly:true,otherVisibleFieldsCompared:12,otherVisibleFieldsUnchanged:true,
      auditRows:['edit','restore'].map((phase,i)=>({phase,visibleActor:'Carlos Castro',visibleRole:'operativo',
        reason:'QA reason '+phase,matchesSubmittedReason:true,changedFields:['observaciones'],
        rowDigestSha256:String(i+1).repeat(64),dateTimeText:'30/10/2026, 18:50:00'}))},
    boundaries:Object.fromEntries(['liveDeployment','authIamRulesChange','membershipChange','realBusinessWrites','dataImport',
      'cleanup','findingClosed','b4003Closed','paulaVisualAccepted','productionAccepted'].map(p=>[p,false]))};
  m.control[k.evidenceKey]={schema:'GRAVICENTRA_I65_B4003_INSURER_ACTIVITY_EVIDENCE_POINTER_V1',
    status:E.status,gate:E.gate,receiptPath:k.evidencePath,receiptBlobSha:blob,sourceSha:E.sourceSha,
    transportSha:E.transportSha,sourceGuardRunId:E.sourceGuardRunId,transportRunId:E.transportRunId,
    previewUrl:E.previewUrl,buildId,currentCapabilityAcceptances:0,recoverySourceSha:E.recoverySourceSha,
    recoveryGuardRunId:E.recoveryGuardRunId,recoveryTransportSha:E.recoveryTransportSha,recoveryRunId:E.recoveryRunId};
  return m;
}
test('final evidence preserves failed initial run and exact recovery lineage',()=>{
  assert.equal(validateInsurerPreviewResumeModel(evidenceModel()).findingsChanged,false);
});
test('recovery cannot erase the original failed run',()=>{
  const m=evidenceModel();m.evidence.initialRunId=999;
  assert.throws(()=>validateInsurerPreviewResumeModel(m),/EVIDENCE_IDENTITY_INVALID/);
});
test('runtime acceptance requires exact restored environment hash',()=>{
  const m=evidenceModel();m.evidence.technical.recoveredEnvironmentSha256=k.driftEnvironmentSha256;
  assert.throws(()=>validateInsurerPreviewResumeModel(m),/TECHNICAL_RESUME_PASS_INCOMPLETE/);
});
test('runtime acceptance cannot hide backend code redeployment',()=>{
  const m=evidenceModel();m.evidence.technical.backendCodeRedeployed=true;
  assert.throws(()=>validateInsurerPreviewResumeModel(m),/EVIDENCE_TARGETS_INVALID/);
});
test('runtime acceptance requires two attributed dated edit and restore events',()=>{
  const m=evidenceModel();m.evidence.authenticatedUat.auditRows[0].visibleActor='Equipo';
  assert.throws(()=>validateInsurerPreviewResumeModel(m),/AUTHENTICATED_AUDIT_PASS_INCOMPLETE/);
});
test('runtime acceptance still requires original observations restoration',()=>{
  const m=evidenceModel();m.evidence.authenticatedUat.observationsRestoredExactly=false;
  assert.throws(()=>validateInsurerPreviewResumeModel(m),/AUTHENTICATED_AUDIT_PASS_INCOMPLETE/);
});
test('recovery evidence cannot close the broader finding',()=>{
  const m=evidenceModel();m.evidence.boundaries.findingClosed=true;
  assert.throws(()=>validateInsurerPreviewResumeModel(m),/EVIDENCE_SCOPE_EXPANDED/);
});
test('failed recovery can be recorded without false acceptance',()=>{
  const m=evidenceModel();m.evidence.status='TECHNICAL_PREVIEW_FAILED_UAT_NOT_RUN';m.control[k.evidenceKey].status=m.evidence.status;
  m.evidence.technical.status='FAILED';m.evidence.authenticatedUat={status:'NOT_RUN'};
  assert.equal(validateInsurerPreviewResumeModel(m).findingsChanged,false);
});

}
