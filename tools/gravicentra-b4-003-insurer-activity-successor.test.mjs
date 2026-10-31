import test from 'node:test';
import assert from 'node:assert/strict';
import {collectInsurerActivitySuccessorModel,validateInsurerActivitySuccessorModel,
  insurerActivityContract as k,insurerAtomicPaths} from './gravicentra-b4-003-insurer-activity-successor.mjs';

// These discriminants alter independently meaningful authority boundaries.
// Product behavior is exercised by the separate actual-owner regressions.
const valid=collectInsurerActivitySuccessorModel();
const reject=(name,mutate,code)=>test(name,()=>{
  const copy=structuredClone(valid);mutate(copy);
  assert.throws(()=>validateInsurerActivitySuccessorModel(copy),code);
});
test('exact current four-owner composition preserves historical closure',()=>{
  const result=validateInsurerActivitySuccessorModel(valid);
  assert.equal(result.productFiles,118);
  assert.equal(result.replacedProductFiles,4);
  assert.equal(result.metasClosurePreserved,true);
});
reject('reject another new Control Plane key',m=>{m.control.unboundAuthority={authorized:true};},/PRIOR_CONTROL_OR_NEW_KEY_DRIFT/);
reject('reject altered prior closure authority',m=>{m.control.b4003InstitutionalGoalsClosure20261030.productionAccepted=true;},/PRIOR_CONTROL_OR_NEW_KEY_DRIFT/);
reject('reject unrelated fifth source',m=>{m.receipt.sourceFiles['functions/bootstrap.js']={};},/EXACT_FOUR_SOURCE_PATHS_REQUIRED/);
reject('reject current source hash mismatch',m=>{m.currentBlobs[k.productPaths[0]]='1'.repeat(40);},/CURRENT_SOURCE_BLOB_INVALID/);
reject('reject omitted current composition member',m=>{m.composition.productFiles.pop();},/FULL_CURRENT_ACCUMULATED_COMPOSITION_INVALID/);
reject('reject changed approved untouched product',m=>{
  const row=m.rows.find(r=>!k.productPaths.includes(r.path));row.currentBlob='2'.repeat(40);
},/FULL_CURRENT_ACCUMULATED_COMPOSITION_INVALID/);
reject('reject absent manifest binding',m=>{m.receipt.composition.blobSha='3'.repeat(40);},/COMPOSITION_POINTER_INVALID/);
reject('reject unrelated file in atomic delta',m=>{
  m.deltaPaths.push('unrelated.js');m.deltaPaths.sort();m.sourceDelta.push('unrelated.js');m.sourceDelta.sort();
},/EXACT_ATOMIC_SOURCE_COMMIT_REQUIRED|PREPUBLICATION_DELTA_NOT_EXACT|SOURCE_STATE_DRIFT|UNBOUND_TRANSPORT/);
reject('reject missing required test from atomic set',m=>{m.receipt.atomicCommitPaths=m.receipt.atomicCommitPaths.filter(p=>p!==k.validatorTest);},/RECEIPT_IDENTITY_INVALID/);
reject('reject LIVE target substitution',m=>{m.receipt.previewTransport.targetFunctions[0].name='orbit360ProductOperationalCommand';},/EXACT_PREVIEW_TRANSPORT_INVALID/);
reject('reject permission expansion',m=>{m.receipt.boundaries.authIamRulesChange=true;},/SCOPE_EXPANDED/);
reject('reject synthetic testing without restoration limit',m=>{m.receipt.boundaries.syntheticQaWithRestorationOnly=false;},/SCOPE_EXPANDED/);
reject('reject editing any original Guard statement',m=>{m.currentGuard+='\n// altered historical body\n';},/HISTORICAL_GUARD_BODY_CHANGED/);
reject('reject rewritten closure receipt',m=>{
  m.currentBlobs['artifacts/orbit360-recovery/release-control/I6_5_B4_003_INSTITUTIONAL_GOALS_FUNCTIONAL_CLOSURE_20261030.json']='4'.repeat(40);
},/FROZEN_EVIDENCE_CHANGED/);
reject('reject lost finding identifier',m=>{m.ledger.findings.pop();},/CLOSED_METAS_OR_OPEN_FINDINGS_CHANGED/);
reject('reject declaring existing insurer finding closed',m=>{m.receipt.boundaries.findingClosed=true;},/SCOPE_EXPANDED/);
reject('reject regression evidence with external writes',m=>{m.receipt.regressionTests[k.testPaths[0]].externalRequests=1;},/REGRESSION_BLOB_OR_RESULT_INVALID/);
reject('reject unbound validator bytes',m=>{m.receipt.governanceSources.validator.blobSha='5'.repeat(40);},/GOVERNANCE_BINDING_INVALID/);
reject('reject missing ancestry proof',m=>{m.parentVerified=false;},/EXACT_PARENT_REQUIRED/);
reject('reject missing actual-source security regression',m=>{
  m.receipt.requiredCurrentRegressions=m.receipt.requiredCurrentRegressions.filter(p=>!p.includes('operational-write-security'));
},/CURRENT_REGRESSION_SCOPE_CHANGED/);
reject('reject unbound transport workflow bytes',m=>{
  const source='6'.repeat(40);
  m.sourceCommit=source;m.sourceParent=k.parent;m.sourceAncestor=true;m.currentHead='7'.repeat(40);
  m.sourceDelta=[...insurerAtomicPaths];m.sourceTree={...m.currentBlobs};m.untracked=[];
  m.transport={parent:source,message:k.transportMessage,paths:[k.workflow]};
  m.deltaPaths=[...insurerAtomicPaths,k.workflow].sort();
  m.currentBlobs[k.workflow]='8'.repeat(40);
},/UNBOUND_TRANSPORT_OR_FOLLOWUP/);

function evidenceModel(){
  const m=structuredClone(valid),source='a'.repeat(40),transport='b'.repeat(40),blob='c'.repeat(40);
  delete m.control[k.evidenceKey];
  m.sourceControl=structuredClone(m.control);
  m.sourceCommit=source;m.sourceParent=k.parent;m.sourceAncestor=true;m.currentHead=transport;
  m.sourceDelta=[...insurerAtomicPaths];m.sourceTree={...m.currentBlobs};
  m.untracked=[k.evidencePath];m.evidenceCommit=null;m.evidenceParent=null;m.evidenceDelta=null;
  m.currentBlobs[k.workflow]=m.receipt.previewTransport.transportWorkflowAfterBlob;
  m.transport={sha:transport,parent:source,message:k.transportMessage,paths:[k.workflow],
    workflowBlob:m.currentBlobs[k.workflow]};
  m.deltaPaths=[...insurerAtomicPaths,k.workflow,k.evidencePath].sort();
  m.currentBlobs[k.evidencePath]=blob;
  const buildId='gi-i65-b4-'+source.slice(0,12)+'-test';
  m.evidence={schema:'GRAVICENTRA_I65_B4003_INSURER_ACTIVITY_PREVIEW_EVIDENCE_V1',
    status:'TECHNICAL_PREVIEW_PASS_AUTHENTICATED_AUDIT_PASS',gate:'I6.5/B4-003',sourceSha:source,
    transportSha:transport,parentHead:transport,sourceGuardRunId:101,transportRunId:102,
    previewUrl:m.receipt.previewTransport.expectedPreviewUrl,buildId,
    technical:{status:'PASS',backendExactSourceReadback:true,hostingBytesExact:true,liveIdentityUnchanged:true,
      iamUnchanged:true,newFunctionsCreated:0,targetFunctions:m.receipt.previewTransport.targetFunctions},
    authenticatedUat:{status:'PASS',fixtureId:'b4003qa_human_insurer_r20',actor:'Carlos Castro',role:'Operativo',
      country:'GT',buildId,syntheticWrites:2,restored:true,priorActivityRetained:true,newAuditRowsAfterReload:2,
      observationsRestoredExactly:true,otherVisibleFieldsCompared:12,otherVisibleFieldsUnchanged:true,
      auditRows:['edit','restore'].map((phase,i)=>({phase,visibleActor:'Carlos Castro',visibleRole:i?'Operativo':'operativo',dateTimeText:'30/10/2026, 18:40:00',
        reason:'QA reason '+phase,matchesSubmittedReason:true,changedFields:['observaciones'],rowDigestSha256:String(i+1).repeat(64)}))},
    boundaries:Object.fromEntries(['liveDeployment','authIamRulesChange','membershipChange','realBusinessWrites',
      'dataImport','cleanup','findingClosed','b4003Closed','paulaVisualAccepted','productionAccepted'].map(p=>[p,false]))};
  m.control[k.evidenceKey]={schema:'GRAVICENTRA_I65_B4003_INSURER_ACTIVITY_EVIDENCE_POINTER_V1',
    status:m.evidence.status,gate:'I6.5/B4-003',receiptPath:k.evidencePath,receiptBlobSha:blob,
    sourceSha:source,transportSha:transport,sourceGuardRunId:101,transportRunId:102,
    previewUrl:m.evidence.previewUrl,buildId,currentCapabilityAcceptances:0};
  return m;
}
test('exact explicitly bound two-file evidence preserves all source approvals',()=>{
  assert.equal(validateInsurerActivitySuccessorModel(evidenceModel()).metasClosurePreserved,true);
});
test('PASS evidence rejects unproven restoration',()=>{
  const m=evidenceModel();m.evidence.authenticatedUat.restored=false;
  assert.throws(()=>validateInsurerActivitySuccessorModel(m),/AUTHENTICATED_AUDIT_PASS_INCOMPLETE/);
});
test('PASS evidence rejects loss of existing activity',()=>{
  const m=evidenceModel();m.evidence.authenticatedUat.priorActivityRetained=false;
  assert.throws(()=>validateInsurerActivitySuccessorModel(m),/AUTHENTICATED_AUDIT_PASS_INCOMPLETE/);
});
test('runtime evidence cannot close the broader insurer finding',()=>{
  const m=evidenceModel();m.evidence.boundaries.findingClosed=true;
  assert.throws(()=>validateInsurerActivitySuccessorModel(m),/EVIDENCE_SCOPE_EXPANDED/);
});
test('honest blocked UAT needs no fabricated PASS',()=>{
  const m=evidenceModel();m.evidence.status='TECHNICAL_PREVIEW_PASS_AUTHENTICATED_AUDIT_BLOCKED';
  m.control[k.evidenceKey].status=m.evidence.status;m.evidence.authenticatedUat={status:'BLOCKED',reason:'Observed failure'};
  assert.equal(validateInsurerActivitySuccessorModel(m).metasClosurePreserved,true);
});
test('missing IAM readback remains an explicit partial proof',()=>{
  const m=evidenceModel();m.evidence.status='TECHNICAL_PREVIEW_PARTIAL_UAT_NOT_ACCEPTED';
  m.control[k.evidenceKey].status=m.evidence.status;m.evidence.technical.status='PARTIAL';
  m.evidence.technical.iamUnchanged=null;m.evidence.technical.iamReadbackStatus='UNAVAILABLE_HTTP_403';
  m.evidence.authenticatedUat={status:'NOT_ACCEPTED'};
  assert.equal(validateInsurerActivitySuccessorModel(m).metasClosurePreserved,true);
});
test('two generic rows cannot satisfy audit acceptance',()=>{
  const m=evidenceModel();m.evidence.authenticatedUat.auditRows[0].visibleActor='Equipo';
  assert.throws(()=>validateInsurerActivitySuccessorModel(m),/AUTHENTICATED_AUDIT_PASS_INCOMPLETE/);
});
test('audit acceptance rejects missing date and duplicate event evidence',()=>{
  const m=evidenceModel();m.evidence.authenticatedUat.auditRows[0].dateTimeText='Fecha no registrada';
  m.evidence.authenticatedUat.auditRows[1].rowDigestSha256=m.evidence.authenticatedUat.auditRows[0].rowDigestSha256;
  assert.throws(()=>validateInsurerActivitySuccessorModel(m),/AUTHENTICATED_AUDIT_PASS_INCOMPLETE/);
});
test('audit acceptance preserves all other visible insurer fields',()=>{
  const m=evidenceModel();m.evidence.authenticatedUat.otherVisibleFieldsUnchanged=false;
  assert.throws(()=>validateInsurerActivitySuccessorModel(m),/AUTHENTICATED_AUDIT_PASS_INCOMPLETE/);
});
test('audit actor role must be present on both event rows',()=>{
  const m=evidenceModel();m.evidence.authenticatedUat.auditRows[0].visibleRole='';
  assert.throws(()=>validateInsurerActivitySuccessorModel(m),/AUTHENTICATED_AUDIT_PASS_INCOMPLETE/);
});
reject('receipt cannot describe a broader followup permission',m=>{
  m.receipt.allowedEvidenceSuccessor.fullFindingClosureAuthorized=true;
},/EXPLICIT_EVIDENCE_SUCCESSOR_BOUNDARY_INVALID/);
