import test from 'node:test';
import assert from 'node:assert/strict';
import {collectInsurerPreviewResumeModel,validateInsurerPreviewResumeModel,
  insurerResumeContract as k,insurerResumeAtomicPaths} from './gravicentra-b4-003-insurer-preview-resume.mjs';

const valid=collectInsurerPreviewResumeModel();
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
