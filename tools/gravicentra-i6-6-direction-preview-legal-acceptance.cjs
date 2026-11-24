'use strict';
// Implements the owner's explicit 2026-11-16 decision in her signed Preview
// session. It never seeds acceptance storage, dismisses a gate or accepts for
// another actor. Historical one-successor decisions stay exact. The separate
// I6.6 scope decision below permits only identical V2 Preview technical retries.
const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const CONTROL='artifacts/orbit360-recovery/release-control/I6_6_RELEASE_TRANSPORT_CONTROL_20261110.json';
const RECEIPT='artifacts/orbit360-recovery/release-control/I6_6_DIRECTION_PREVIEW_LEGAL_ACCEPTANCE_20261116.json';
const DECISION='DIRECTION_PREVIEW_INTERNAL_LEGAL_V2_ACCEPTED_20261116';
const SOURCE_BASE='76cb5f5182fad3c0da11aa99ac906d8bb706dc23';
// Exact technical retry; the signed run did not emit an acceptance proof.
// SOURCE_BASE remains the original consent receipt's immutable source anchor.
const SOURCE_PARENT='b28b6c2de2da30f34b0e6e6abb96b4d238d84af7';
const ORIGIN='https://ays-orbit-360-lab--gi-i66-rc-42868854629-abj14q6n.web.app';
const ADVISOR='ase-paula-osorio',TENANT='alianzas-soluciones',VERSION='2.0';
const CLAUSES=Object.freeze(['confidencialidad','tratamiento_datos','descargo_ia']);
const TERMS_SHA256='485b07887091063cc7a5d1dc8f11a9bb547f2ef059490bb04d4acee73404f6b2';
const REVIEW_SHA256='c368d591a5b533a4c047cbffa265171e464c3574a70520398b967f243588d0e9';
// Preserve the exact historical validation path and add only this one
// QA-navigation successor, selected by its source-bound candidate receipt.
const TECHNICAL_RETRY=Object.freeze({
  receiptPath:'artifacts/orbit360-recovery/release-control/I6_6_DIRECTION_PREVIEW_QA_NAVIGATION_RETRY_20261116.json',
  receiptSha256:'d6297a5c2c59424470119d20aaf912c7353ae895bf7bc1196d8d2e9d8c1f8431',
  sourceParent:'b9bf7ffaff28124dbae4c67b7a255b8f2326cf16',
  originalReceiptSha256:'68d3961987e19acdc223b7d2adf01eb39c540ca6ae8aa72c64752cab45fddbae',
  legalOwnerSha256:'b74a965b7be0d67862d82bcf73dacc0d5a8293dcf30cb4f5f3fdeaa6ee1c68a3'
});
// One separate QA-only diagnostic successor. Historical receipts and their
// validation paths stay exact; no actor, origin, clause or future-source grant.
const PROPOSAL_DIAGNOSTIC_RETRY=Object.freeze({
  receiptPath:'artifacts/orbit360-recovery/release-control/I6_6_DIRECTION_PREVIEW_PROPOSAL_DIAGNOSTIC_RETRY_20261117.json',
  receiptSha256:'e2c123a1a4a250815b295d2b8aa3b9432bc84bed06b242c174a4b9cc8f7f8634',
  sourceParent:'3076026cdfd900cf8e99037c3220682b3be68943',
  originalReceiptSha256:'68d3961987e19acdc223b7d2adf01eb39c540ca6ae8aa72c64752cab45fddbae',
  legalOwnerSha256:'b74a965b7be0d67862d82bcf73dacc0d5a8293dcf30cb4f5f3fdeaa6ee1c68a3'
});
const I66_SCOPE=Object.freeze({
  receiptPath:'artifacts/orbit360-recovery/release-control/I6_6_DIRECTION_PREVIEW_V2_SCOPE_AUTHORIZATION_20261116.json',
  receiptSha256:'d3309675c753bd1b31f9163d506aba2e29ac70583a7b8d54cb5b8503b5c50a44',
  schema:'I6_6_DIRECTION_PREVIEW_SAME_TERMS_SCOPE_AUTHORIZATION_V1',
  decisionId:'DIRECTION_I66_PREVIEW_SAME_LEGAL_V2_TECHNICAL_SUCCESSORS_AUTHORIZED_20261116',
  authorizationScope:'I6_6_PREVIEW_IDENTICAL_V2_TERMS',
  sourceBaseHead:'25f5112e9b4586a28ded0c49fe91973d1d5dd401',
  historicalReceiptSha256:'68d3961987e19acdc223b7d2adf01eb39c540ca6ae8aa72c64752cab45fddbae',
  legalOwnerSha256:'b74a965b7be0d67862d82bcf73dacc0d5a8293dcf30cb4f5f3fdeaa6ee1c68a3'
});

// A proposal is immutable source evidence, never consent. The separate
// authorization file is mutable control metadata and must not exist until the
// owner explicitly confirms the reviewed LIVE scope.
const LIVE_SCOPE=Object.freeze({
  proposalPath:'artifacts/orbit360-recovery/release-control/I6_6_DIRECTION_LIVE_V2_SCOPE_PROPOSAL_20261117.json',
  proposalSha256:'e9e1b369d166242cfff2145b08fd36ca8ad3288b302ce6980e00a36e3165e04a',
  authorizationPath:'artifacts/orbit360-recovery/release-control/I6_6_DIRECTION_LIVE_V2_SCOPE_AUTHORIZATION_20261117.json',
  schema:'I6_6_DIRECTION_LIVE_SAME_TERMS_SCOPE_AUTHORIZATION_V1',
  decisionId:'DIRECTION_I66_LIVE_SAME_LEGAL_V2_TECHNICAL_SUCCESSORS_AUTHORIZED_20261117',
  authorizationScope:'I6_6_LIVE_IDENTICAL_V2_TERMS',origin:'https://app.aysseguros.com',
  reviewDocumentSha256:'f8fd153e864892c8c4720003f1b72d4ade64fc3c866266c3719729c5a0369d4f',
  reviewDocumentLibraryId:'libfile_650fc78f92448191a82bddfd92c0ec60'
});

// Only these source-owned diagnostic codes may leave the signed session.
const LEGAL_FAILURE_CHECKS=Object.freeze([
  'DIRECTION_LIVE_LEGAL_APPROVED_ARTIFACT_REQUIRED',
  'DIRECTION_LIVE_LEGAL_APPROVED_CANDIDATE_DRIFT',
  'DIRECTION_LIVE_LEGAL_APPROVED_SOURCE_MISMATCH',
  'DIRECTION_LIVE_LEGAL_AUTHORITY_HOLD',
  'DIRECTION_LIVE_LEGAL_AUTHORITY_VALIDATED_NOT_EXECUTION_PROOF',
  'DIRECTION_LIVE_LEGAL_AUTHORIZATION_REQUIRED',
  'DIRECTION_LIVE_LEGAL_CANDIDATE_DRIFT',
  'DIRECTION_LIVE_LEGAL_CANDIDATE_PIN_MISMATCH',
  'DIRECTION_LIVE_LEGAL_CONSTRAINT_MISMATCH',
  'DIRECTION_LIVE_LEGAL_DECISION_DATE_REQUIRED',
  'DIRECTION_LIVE_LEGAL_DECISION_MISMATCH',
  'DIRECTION_LIVE_LEGAL_EXECUTION_PROOF_REQUIRED',
  'DIRECTION_LIVE_LEGAL_EXECUTION_REQUIREMENTS_MISMATCH',
  'DIRECTION_LIVE_LEGAL_EXPLICIT_CONFIRMATION_REQUIRED',
  'DIRECTION_LIVE_LEGAL_LIVE_ONLY',
  'DIRECTION_LIVE_LEGAL_ORIGIN_MISMATCH',
  'DIRECTION_LIVE_LEGAL_OTHER_ACTOR_FORBIDDEN',
  'DIRECTION_LIVE_LEGAL_OWNER_CHANGED',
  'DIRECTION_LIVE_LEGAL_PACKAGE_OWNER_CHANGED',
  'DIRECTION_LIVE_LEGAL_PREVIEW_AUTHORITY_CHANGED',
  'DIRECTION_LIVE_LEGAL_PREVIEW_OWNER_CHANGED',
  'DIRECTION_LIVE_LEGAL_PREVIEW_READBACK_REQUIRED',
  'DIRECTION_LIVE_LEGAL_PROOF_',
  'DIRECTION_LIVE_LEGAL_PROOF_CLAUSES',
  'DIRECTION_LIVE_LEGAL_PROOF_SCOPE',
  'DIRECTION_LIVE_LEGAL_PROOF_TIME',
  'DIRECTION_LIVE_LEGAL_PROPOSAL_IS_NOT_AUTHORIZATION',
  'DIRECTION_LIVE_LEGAL_PROPOSAL_MISMATCH',
  'DIRECTION_LIVE_LEGAL_PROPOSAL_NOT_IN_SOURCE',
  'DIRECTION_LIVE_LEGAL_QUOTE_MISMATCH',
  'DIRECTION_LIVE_LEGAL_QUOTE_REQUIRED',
  'DIRECTION_LIVE_LEGAL_RECEIPT_DIGEST_REQUIRED',
  'DIRECTION_LIVE_LEGAL_RECEIPT_MISMATCH',
  'DIRECTION_LIVE_LEGAL_RECEIPT_SCHEMA',
  'DIRECTION_LIVE_LEGAL_REVIEW_CONTEXT_MISMATCH',
  'DIRECTION_LIVE_LEGAL_REVIEW_CONTEXT_REQUIRED',
  'DIRECTION_LIVE_LEGAL_REVIEW_MISMATCH',
  'DIRECTION_LIVE_LEGAL_REVIEW_QUESTION_MISMATCH',
  'DIRECTION_LIVE_LEGAL_REVIEW_QUESTION_REQUIRED',
  'DIRECTION_LIVE_LEGAL_SCOPE_MISMATCH',
  'DIRECTION_LIVE_LEGAL_SIGNED_ACTOR_REQUIRED',
  'DIRECTION_LIVE_LEGAL_SIGNED_PREVIEW_REQUIRED',
  'DIRECTION_LIVE_LEGAL_SOURCE_ANCHOR_REQUIRED',
  'DIRECTION_LIVE_LEGAL_SOURCE_MISMATCH',
  'DIRECTION_LIVE_LEGAL_SOURCE_NOT_DESCENDANT',
  'DIRECTION_LIVE_LEGAL_SUBJECT_MISMATCH',
  'DIRECTION_LIVE_LEGAL_TERMS_MISMATCH',
  'DIRECTION_LIVE_LEGAL_UNKNOWN_OPERATION',
  'DIRECTION_LEGAL_ACCEPTANCE_NOT_PERSISTED',
  'DIRECTION_LEGAL_ACCEPTANCE_TIME_MISMATCH',
  'DIRECTION_LEGAL_ACCEPTED_ACTOR_MISMATCH',
  'DIRECTION_LEGAL_ACCEPTED_CLAUSES_MISMATCH',
  'DIRECTION_LEGAL_ACCEPTED_COUNTRY_MISMATCH',
  'DIRECTION_LEGAL_ACCEPTED_ORIGIN_MISMATCH',
  'DIRECTION_LEGAL_ACCEPTED_SCOPE_MISMATCH',
  'DIRECTION_LEGAL_ACCEPTED_TYPE_MISMATCH',
  'DIRECTION_LEGAL_ACCEPTED_VERSION_MISMATCH',
  'DIRECTION_LEGAL_CANDIDATE_DECISION_PIN_MISMATCH',
  'DIRECTION_LEGAL_CANDIDATE_NOT_AUTHORIZED',
  'DIRECTION_LEGAL_CANDIDATE_SOURCE_MISMATCH',
  'DIRECTION_LEGAL_CONSTRAINT_MISMATCH',
  'DIRECTION_LEGAL_COUNTRY_NOT_READY',
  'DIRECTION_LEGAL_COUNTRY_OPTIONS_MISMATCH',
  'DIRECTION_LEGAL_COUNTRY_SELECTION_NOT_FRESH',
  'DIRECTION_LEGAL_COUNTRY_SELECTION_NOT_REQUIRED',
  'DIRECTION_LEGAL_COUNTRY_SELECTION_TEXT_MUST_WAIT',
  'DIRECTION_LEGAL_DECISION_DATE_MISMATCH',
  'DIRECTION_LEGAL_DECISION_IS_NOT_FOR_THIS_SUCCESSOR',
  'DIRECTION_LEGAL_DECISION_MISMATCH',
  'DIRECTION_LEGAL_DECISION_NOT_IN_SOURCE',
  'DIRECTION_LEGAL_DISABLED_BUTTON_REQUIRED',
  'DIRECTION_LEGAL_DISPLAYED_TEXT_CHANGED',
  'DIRECTION_LEGAL_FABRICATED_IP_FORBIDDEN',
  'DIRECTION_LEGAL_FRESH_CONTEXT_REQUIRED',
  'DIRECTION_LEGAL_GENUINE_ACCEPTANCE_REQUIRED',
  'DIRECTION_LEGAL_HOSTED_OWNER_MISMATCH',
  'DIRECTION_LEGAL_INTERNAL_CLAUSES_ONLY',
  'DIRECTION_LEGAL_IP_PROVENANCE_REQUIRED',
  'DIRECTION_LEGAL_NORMAL_UI_REQUIRED',
  'DIRECTION_LEGAL_ONE_VISIBLE_GATE_REQUIRED',
  'DIRECTION_LEGAL_ORIGIN_MISMATCH',
  'DIRECTION_LEGAL_OTHER_ACTOR_FORBIDDEN',
  'DIRECTION_LEGAL_OTHER_ADVISOR_FORBIDDEN',
  'DIRECTION_LEGAL_OWNER_READBACK_FAILED',
  'DIRECTION_LEGAL_PACKAGE_ROOT_REQUIRED',
  'DIRECTION_LEGAL_PACKAGE_SOURCE_MISMATCH',
  'DIRECTION_LEGAL_PREVIEW_GATE_NOT_ACTIVE',
  'DIRECTION_LEGAL_PREVIEW_ONLY',
  'DIRECTION_LEGAL_RECEIPT_DIGEST_REQUIRED',
  'DIRECTION_LEGAL_RECEIPT_SCHEMA',
  'DIRECTION_LEGAL_REVIEW_DOCUMENT_MISMATCH',
  'DIRECTION_LEGAL_RUNTIME_ADVISOR_MISMATCH',
  'DIRECTION_LEGAL_RUNTIME_CLAUSE_SET_MISMATCH',
  'DIRECTION_LEGAL_RUNTIME_COUNTRY_MISMATCH',
  'DIRECTION_LEGAL_RUNTIME_ORIGIN_MISMATCH',
  'DIRECTION_LEGAL_RUNTIME_ROLE_MISMATCH',
  'DIRECTION_LEGAL_RUNTIME_SCOPE_MISMATCH',
  'DIRECTION_LEGAL_RUNTIME_TENANT_MISMATCH',
  'DIRECTION_LEGAL_RUNTIME_VERSION_MISMATCH',
  'DIRECTION_LEGAL_SCOPE_MISMATCH',
  'DIRECTION_LEGAL_SCOPE_AUTHORITY_DRIFT',
  'DIRECTION_LEGAL_SCOPE_BUILD_ID_REQUIRED',
  'DIRECTION_LEGAL_SCOPE_CANDIDATE_DRIFT',
  'DIRECTION_LEGAL_SCOPE_HISTORICAL_RECEIPT_CHANGED',
  'DIRECTION_LEGAL_SCOPE_MARKER_READBACK_FAILED',
  'DIRECTION_LEGAL_SCOPE_OWNER_CHANGED',
  'DIRECTION_LEGAL_SCOPE_RECEIPT_MISMATCH',
  'DIRECTION_LEGAL_SCOPE_SOURCE_NOT_DESCENDANT',
  'DIRECTION_LEGAL_RELOAD_ACTOR_MISMATCH',
  'DIRECTION_LEGAL_RELOAD_APP_NOT_READY',
  'DIRECTION_LEGAL_RELOAD_GATE_PENDING',
  'DIRECTION_LEGAL_RELOAD_PROOF_REQUIRED',
  'DIRECTION_LEGAL_RELOAD_RECORD_CHANGED',
  'DIRECTION_LEGAL_SIGNED_ACTOR_REQUIRED',
  'DIRECTION_LEGAL_SIGNED_PROOF_CLAUSES_MISMATCH',
  'DIRECTION_LEGAL_SIGNED_PROOF_DECISION_MISMATCH',
  'DIRECTION_LEGAL_SIGNED_PROOF_IDENTITY_REQUIRED',
  'DIRECTION_LEGAL_SIGNED_PROOF_NOT_ACCEPTED',
  'DIRECTION_LEGAL_SIGNED_PROOF_ORIGIN_MISMATCH',
  'DIRECTION_LEGAL_SIGNED_PROOF_RECEIPT_MISMATCH',
  'DIRECTION_LEGAL_SIGNED_PROOF_REQUIRED',
  'DIRECTION_LEGAL_SIGNED_PROOF_SCOPE_MISMATCH',
  'DIRECTION_LEGAL_SIGNED_PROOF_SOURCE_MISMATCH',
  'DIRECTION_LEGAL_SIGNED_PROOF_TERMS_MISMATCH',
  'DIRECTION_LEGAL_SIGNED_PROOF_TIME_REQUIRED',
  'DIRECTION_LEGAL_SIGNED_PROOF_VERSION_MISMATCH',
  'DIRECTION_LEGAL_SIGNED_UID_MISMATCH',
  'DIRECTION_LEGAL_SOURCE_BASE_MISMATCH',
  'DIRECTION_LEGAL_SOURCE_REQUIRED',
  'DIRECTION_LEGAL_SUBJECT_MISMATCH',
  'DIRECTION_LEGAL_TERMS_MISMATCH',
  'DIRECTION_LEGAL_TECHNICAL_RETRY_BINDING_MISMATCH',
  'DIRECTION_LEGAL_TECHNICAL_RETRY_BYTES_REQUIRED',
  'DIRECTION_LEGAL_TECHNICAL_RETRY_NOT_IN_SOURCE',
  'DIRECTION_LEGAL_TECHNICAL_RETRY_OWNER_CHANGED',
  'DIRECTION_LEGAL_TECHNICAL_RETRY_RECEIPT_MISMATCH',
  'DIRECTION_LEGAL_UNCHECKED_BOX_REQUIRED'
]);
const LEGAL_FAILURE_SUBSTAGES=Object.freeze(['AUTHORITY_VALIDATION','OWNER_READBACK','VISIBLE_GATE_WAIT',
  'PRE_CLICK_PRESENTATION','COUNTRY_SELECTION','CHECKBOX_ACTION','BUTTON_ACTION','POST_CLICK_GATE_CLOSE','POST_CLICK_PERSISTENCE',
  'RELOAD_READBACK','RELOAD_ACTOR_VALIDATION']);
function safeLegalFailureSubstage(value){return LEGAL_FAILURE_SUBSTAGES.includes(value)?value:null;}
const normalize=v=>String(v||'').replace(/\s+/g,' ').trim();
const role=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z]/g,'');
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const hash=v=>crypto.createHash('sha256').update(v).digest('hex');
const digest=v=>hash(JSON.stringify(stable(v)));

// The digest covers all text of each displayed clause, including jurisdiction,
// framework and authority. It excludes only whitespace and presentation markup.
function projectCatalog(catalog){
  return CLAUSES.map(key=>{const c=catalog[key],m=c.meta||{},rows=[];
    for(const [field,label] of [['vigencia','Vigencia:'],['ley','Ley aplicable:'],['foro','Jurisdicción:'],['norma','Marco:'],['autoridad','Autoridad:']])
      if(m[field])rows.push(label+' '+m[field]);
    return{title:normalize(c.ic+' '+c.titulo),intro:normalize(c.intro),
      blocks:(c.bloques||[]).map(b=>({heading:normalize(b.h),paragraph:normalize(b.p),items:(b.items||[]).map(normalize)})),metadata:normalize(rows.join(' · '))};
  });
}
function technicalRetryCandidatePin(sourceSha){
  return{receiptPath:TECHNICAL_RETRY.receiptPath,receiptSha256:TECHNICAL_RETRY.receiptSha256,
    sourceParent:TECHNICAL_RETRY.sourceParent,sourceSha,legalOwnerSha256:TECHNICAL_RETRY.legalOwnerSha256};
}
function validateTechnicalRetry({technicalRetryBytes,receiptSha256,candidate,cfg,sourceParent}){
  assert.equal(sourceParent,TECHNICAL_RETRY.sourceParent,'DIRECTION_LEGAL_DECISION_IS_NOT_FOR_THIS_SUCCESSOR');
  assert.ok(Buffer.isBuffer(technicalRetryBytes),'DIRECTION_LEGAL_TECHNICAL_RETRY_BYTES_REQUIRED');
  assert.equal(hash(technicalRetryBytes),TECHNICAL_RETRY.receiptSha256,'DIRECTION_LEGAL_TECHNICAL_RETRY_RECEIPT_MISMATCH');
  assert.equal(receiptSha256,TECHNICAL_RETRY.originalReceiptSha256,'DIRECTION_LEGAL_TECHNICAL_RETRY_RECEIPT_MISMATCH');
  assert.deepEqual(candidate?.legalTechnicalRetry,technicalRetryCandidatePin(cfg.source),'DIRECTION_LEGAL_TECHNICAL_RETRY_BINDING_MISMATCH');
  return true;
}
function proposalDiagnosticRetryCandidatePin(sourceSha){
  return{receiptPath:PROPOSAL_DIAGNOSTIC_RETRY.receiptPath,receiptSha256:PROPOSAL_DIAGNOSTIC_RETRY.receiptSha256,
    sourceParent:PROPOSAL_DIAGNOSTIC_RETRY.sourceParent,sourceSha,legalOwnerSha256:PROPOSAL_DIAGNOSTIC_RETRY.legalOwnerSha256};
}
function validateProposalDiagnosticRetry({technicalRetryBytes,receiptSha256,candidate,cfg,sourceParent}){
  assert.equal(sourceParent,PROPOSAL_DIAGNOSTIC_RETRY.sourceParent,'DIRECTION_LEGAL_DECISION_IS_NOT_FOR_THIS_SUCCESSOR');
  assert.ok(Buffer.isBuffer(technicalRetryBytes),'DIRECTION_LEGAL_TECHNICAL_RETRY_BYTES_REQUIRED');
  assert.equal(hash(technicalRetryBytes),PROPOSAL_DIAGNOSTIC_RETRY.receiptSha256,'DIRECTION_LEGAL_TECHNICAL_RETRY_RECEIPT_MISMATCH');
  assert.equal(receiptSha256,PROPOSAL_DIAGNOSTIC_RETRY.originalReceiptSha256,'DIRECTION_LEGAL_TECHNICAL_RETRY_RECEIPT_MISMATCH');
  assert.deepEqual(candidate?.legalTechnicalRetry,proposalDiagnosticRetryCandidatePin(cfg.source),'DIRECTION_LEGAL_TECHNICAL_RETRY_BINDING_MISMATCH');
  return true;
}
function usesI66Scope(candidate){return candidate?.legalAcceptance?.decisionId===I66_SCOPE.decisionId;}
function i66ScopeCandidatePin(candidate){
  return {receiptPath:I66_SCOPE.receiptPath,receiptSha256:I66_SCOPE.receiptSha256,decisionId:I66_SCOPE.decisionId,
    authorizationScope:I66_SCOPE.authorizationScope,gate:'I6.6',phase:'PREVIEW',origin:candidate.previewUrl,
    sourceSha:candidate.sourceSha,actorRole:'direccion',termsProjectionSha256:TERMS_SHA256,buildId:candidate.buildId};
}
function validateI66ScopeCandidate(candidate){
  const guard=require('./gravicentra-i6-6-operational-release-candidate.cjs');
  guard.previewIdentity(candidate);
  assert.ok(typeof candidate.buildId==='string'&&candidate.buildId.trim()===candidate.buildId,'DIRECTION_LEGAL_SCOPE_BUILD_ID_REQUIRED');
  guard.validateBuildMarker(candidate,{product:'Gravicentra Insurance',gate:'I6.6',sourceSha:candidate.sourceSha,buildId:candidate.buildId});
  assert.deepEqual(candidate.legalAcceptance,i66ScopeCandidatePin(candidate),'DIRECTION_LEGAL_CANDIDATE_DECISION_PIN_MISMATCH');
  assert.equal(candidate.legalTechnicalRetry,undefined,'DIRECTION_LEGAL_TECHNICAL_RETRY_BINDING_MISMATCH');
  return true;
}
function validateI66ScopeDecision({receipt,receiptSha256,candidate,cfg,actor,technicalRetryBytes,control}){
  assert.equal(cfg.phase,'PREVIEW','DIRECTION_LEGAL_PREVIEW_ONLY');
  const guard=require('./gravicentra-i6-6-operational-release-candidate.cjs');
  assert.deepEqual(guard.candidateForPhase(control,'preview'),candidate,'DIRECTION_LEGAL_SCOPE_CANDIDATE_DRIFT');
  validateI66ScopeCandidate(candidate);
  assert.equal(cfg.origin,candidate.previewUrl,'DIRECTION_LEGAL_ORIGIN_MISMATCH');
  assert.equal(cfg.source,candidate.sourceSha,'DIRECTION_LEGAL_CANDIDATE_SOURCE_MISMATCH');
  assert.equal(technicalRetryBytes,undefined,'DIRECTION_LEGAL_TECHNICAL_RETRY_BINDING_MISMATCH');
  assert.equal(receiptSha256,I66_SCOPE.receiptSha256,'DIRECTION_LEGAL_SCOPE_RECEIPT_MISMATCH');
  assert.equal(receipt.schema,I66_SCOPE.schema,'DIRECTION_LEGAL_RECEIPT_SCHEMA');
  assert.equal(receipt.decisionId,I66_SCOPE.decisionId,'DIRECTION_LEGAL_DECISION_MISMATCH');
  assert.equal(receipt.sourceBaseHead,I66_SCOPE.sourceBaseHead,'DIRECTION_LEGAL_SOURCE_BASE_MISMATCH');
  const decision=receipt.decision||{};
  assert.equal(decision.status,'EXPLICIT_BOUNDED_SCOPE_AUTHORIZATION','DIRECTION_LEGAL_GENUINE_ACCEPTANCE_REQUIRED');
  assert.equal(decision.response,'autorizo','DIRECTION_LEGAL_GENUINE_ACCEPTANCE_REQUIRED');
  assert.equal(decision.normalizedResponse,'AUTORIZO','DIRECTION_LEGAL_GENUINE_ACCEPTANCE_REQUIRED');
  assert.equal(decision.receivedLocalDate,'2026-11-16','DIRECTION_LEGAL_DECISION_DATE_MISMATCH');
  assert.equal(decision.timezone,'America/Guatemala','DIRECTION_LEGAL_DECISION_DATE_MISMATCH');
  assert.equal(decision.reviewDocumentSha256,REVIEW_SHA256,'DIRECTION_LEGAL_REVIEW_DOCUMENT_MISMATCH');
  assert.deepEqual(receipt.subject,{advisorId:ADVISOR,role:'direccion',tenantId:TENANT,country:'GT'},'DIRECTION_LEGAL_SUBJECT_MISMATCH');
  assert.deepEqual(receipt.environment,{gate:'I6.6',phase:'PREVIEW',repository:'paulaosoriof86/orbit360-core',
    branch:'recovery/fase-a-clean-20260831',firebaseProject:'ays-orbit-360-lab',
    originBinding:'EXACT_VALIDATED_IMMUTABLE_CANDIDATE_PREVIEW_ORIGIN'},'DIRECTION_LEGAL_SCOPE_MISMATCH');
  assert.deepEqual(receipt.legal,{version:VERSION,clauseIds:[...CLAUSES],termsProjectionSha256:TERMS_SHA256,
    legalOwnerSha256:I66_SCOPE.legalOwnerSha256},'DIRECTION_LEGAL_TERMS_MISMATCH');
  assert.deepEqual(receipt.constraints,{ordinaryUiOnly:true,sameTermsI66PreviewTechnicalSuccessors:true,
    otherActors:false,otherTenants:false,otherCountries:false,live:false,futureGates:false,changedTerms:false,
    realPayments:false,storageSeeding:false,gateBypass:false},'DIRECTION_LEGAL_CONSTRAINT_MISMATCH');
  assert.deepEqual(receipt.historicalReceipt,{path:RECEIPT,sha256:I66_SCOPE.historicalReceiptSha256,unchanged:true,
    pastConstraintsRemainHistorical:true},'DIRECTION_LEGAL_SCOPE_HISTORICAL_RECEIPT_CHANGED');
  assert.deepEqual(receipt.executionAcceptance,{authorizationIsNotExecutionProof:true,requireSignedActor:true,
    requireSourceAndImmutablePackageAndHostedLegalOwnerEquality:true,requireDisplayedTermsDigestBeforeClick:true,
    requireNormalCheckboxAndButton:true,requireImmediateAndReloadReadback:true,
    requireCandidateSourceBuildIdOriginAndReceiptInProof:true,productionAcceptanceUnchanged:true},'DIRECTION_LEGAL_SCOPE_AUTHORITY_DRIFT');
  assert.equal(role(actor.role),'direccion','DIRECTION_LEGAL_OTHER_ACTOR_FORBIDDEN');
  assert.equal(actor.advisorId,ADVISOR,'DIRECTION_LEGAL_OTHER_ADVISOR_FORBIDDEN');
  assert.ok(typeof actor.uid==='string'&&actor.uid.length>0,'DIRECTION_LEGAL_SIGNED_ACTOR_REQUIRED');
  return true;
}
function expectedOrigin(candidate,phase='PREVIEW'){
  if(phase==='LIVE'){validateLiveScopeCandidate(candidate);return LIVE_SCOPE.origin;}
  assert.equal(phase,'PREVIEW','DIRECTION_LEGAL_PREVIEW_ONLY');
  if(!usesI66Scope(candidate))return ORIGIN;
  validateI66ScopeCandidate(candidate);return candidate.previewUrl;
}
function validateDecision({receipt,receiptSha256,candidate,cfg,sourceParent,actor,technicalRetryBytes,control}){
  if(usesI66Scope(candidate))return validateI66ScopeDecision({receipt,receiptSha256,candidate,cfg,actor,technicalRetryBytes,control});
  assert.match(receiptSha256,/^[a-f0-9]{64}$/,'DIRECTION_LEGAL_RECEIPT_DIGEST_REQUIRED');
  assert.equal(cfg.phase,'PREVIEW','DIRECTION_LEGAL_PREVIEW_ONLY');
  assert.equal(cfg.origin,ORIGIN,'DIRECTION_LEGAL_ORIGIN_MISMATCH');
  assert.match(cfg.source,/^[a-f0-9]{40}$/,'DIRECTION_LEGAL_SOURCE_REQUIRED');
  if(sourceParent===SOURCE_PARENT){
    assert.equal(technicalRetryBytes,undefined,'DIRECTION_LEGAL_TECHNICAL_RETRY_BINDING_MISMATCH');
    assert.equal(candidate?.legalTechnicalRetry,undefined,'DIRECTION_LEGAL_TECHNICAL_RETRY_BINDING_MISMATCH');
  }else if(sourceParent===PROPOSAL_DIAGNOSTIC_RETRY.sourceParent){
    validateProposalDiagnosticRetry({technicalRetryBytes,receiptSha256,candidate,cfg,sourceParent});
  }else validateTechnicalRetry({technicalRetryBytes,receiptSha256,candidate,cfg,sourceParent});
  assert.equal(candidate?.sourceSha,cfg.source,'DIRECTION_LEGAL_CANDIDATE_SOURCE_MISMATCH');
  assert.equal(candidate?.status,'EXACT_BACKEND_PREVIEW_SIGNED_QA_AUTHORIZED','DIRECTION_LEGAL_CANDIDATE_NOT_AUTHORIZED');
  assert.deepEqual(candidate?.legalAcceptance,{receiptPath:RECEIPT,receiptSha256,decisionId:DECISION,sourceSha:cfg.source,phase:'PREVIEW',actorRole:'direccion'},'DIRECTION_LEGAL_CANDIDATE_DECISION_PIN_MISMATCH');
  assert.equal(receipt.schema,'I6_6_EXPLICIT_DIRECTION_PREVIEW_LEGAL_ACCEPTANCE_V1','DIRECTION_LEGAL_RECEIPT_SCHEMA');
  assert.equal(receipt.decisionId,DECISION,'DIRECTION_LEGAL_DECISION_MISMATCH');
  assert.equal(receipt.sourceBaseHead,SOURCE_BASE,'DIRECTION_LEGAL_SOURCE_BASE_MISMATCH');
  assert.equal(receipt.decision?.status,'EXPLICIT_ACCEPTANCE','DIRECTION_LEGAL_GENUINE_ACCEPTANCE_REQUIRED');
  assert.equal(receipt.decision?.response,'Acepto','DIRECTION_LEGAL_GENUINE_ACCEPTANCE_REQUIRED');
  assert.equal(receipt.decision?.receivedLocalDate,'2026-11-16','DIRECTION_LEGAL_DECISION_DATE_MISMATCH');
  assert.equal(receipt.decision?.reviewDocumentSha256,REVIEW_SHA256,'DIRECTION_LEGAL_REVIEW_DOCUMENT_MISMATCH');
  assert.deepEqual(receipt.subject,{advisorId:ADVISOR,role:'direccion',tenantId:TENANT,country:'GT'},'DIRECTION_LEGAL_SUBJECT_MISMATCH');
  assert.deepEqual(receipt.environment,{phase:'PREVIEW',origin:ORIGIN},'DIRECTION_LEGAL_SCOPE_MISMATCH');
  assert.deepEqual(receipt.legal,{version:VERSION,clauseIds:[...CLAUSES],termsProjectionSha256:TERMS_SHA256},'DIRECTION_LEGAL_TERMS_MISMATCH');
  assert.deepEqual(receipt.constraints,{ordinaryUiOnly:true,otherActors:false,live:false,futureSourceSuccessors:false,storageSeeding:false,gateBypass:false},'DIRECTION_LEGAL_CONSTRAINT_MISMATCH');
  assert.equal(role(actor.role),'direccion','DIRECTION_LEGAL_OTHER_ACTOR_FORBIDDEN');
  assert.equal(actor.advisorId,ADVISOR,'DIRECTION_LEGAL_OTHER_ADVISOR_FORBIDDEN');
  assert.ok(typeof actor.uid==='string'&&actor.uid.length>0,'DIRECTION_LEGAL_SIGNED_ACTOR_REQUIRED');
  return true;
}
function validateAcceptanceProof(proof,candidate){
  assert.ok(proof,'DIRECTION_LEGAL_SIGNED_PROOF_REQUIRED');
  assert.equal(proof.status,'EXPLICIT_OWNER_DECISION_APPLIED_BY_NORMAL_UI','DIRECTION_LEGAL_SIGNED_PROOF_NOT_ACCEPTED');
  const scoped=usesI66Scope(candidate),origin=expectedOrigin(candidate);
  assert.equal(proof.decisionId,scoped?I66_SCOPE.decisionId:DECISION,'DIRECTION_LEGAL_SIGNED_PROOF_DECISION_MISMATCH');
  assert.equal(proof.receiptSha256,candidate.legalAcceptance?.receiptSha256,'DIRECTION_LEGAL_SIGNED_PROOF_RECEIPT_MISMATCH');
  assert.equal(proof.sourceSha,candidate.sourceSha,'DIRECTION_LEGAL_SIGNED_PROOF_SOURCE_MISMATCH');
  assert.equal(proof.origin,origin,'DIRECTION_LEGAL_SIGNED_PROOF_ORIGIN_MISMATCH');
  if(scoped){
    assert.equal(proof.authorizationScope,I66_SCOPE.authorizationScope,'DIRECTION_LEGAL_SIGNED_PROOF_SCOPE_MISMATCH');
    assert.equal(proof.gate,'I6.6','DIRECTION_LEGAL_SIGNED_PROOF_SCOPE_MISMATCH');
    assert.equal(proof.buildId,candidate.buildId,'DIRECTION_LEGAL_SCOPE_BUILD_ID_REQUIRED');
    for(const key of ['immediateReadback','reloadReadback','reloadActorVerified'])assert.equal(proof[key],true,'DIRECTION_LEGAL_RELOAD_PROOF_REQUIRED');
  }
  assert.equal(proof.version,VERSION,'DIRECTION_LEGAL_SIGNED_PROOF_VERSION_MISMATCH');
  assert.deepEqual(proof.clauseIds,[...CLAUSES],'DIRECTION_LEGAL_SIGNED_PROOF_CLAUSES_MISMATCH');
  assert.equal(proof.termsProjectionSha256,TERMS_SHA256,'DIRECTION_LEGAL_SIGNED_PROOF_TERMS_MISMATCH');
  for(const key of ['actorUidSha256','scopeSha256'])assert.match(String(proof[key]||''),/^[a-f0-9]{64}$/,'DIRECTION_LEGAL_SIGNED_PROOF_IDENTITY_REQUIRED');
  assert.ok(Number.isFinite(Date.parse(proof.acceptedAt)),'DIRECTION_LEGAL_SIGNED_PROOF_TIME_REQUIRED');
  for(const key of ['acceptedForOtherActors','liveAcceptance','storageSeeded','gateBypassed'])assert.equal(proof[key],false,'DIRECTION_LEGAL_SIGNED_PROOF_SCOPE_MISMATCH');
  return true;
}
function validatePresentationIdentity(snapshot,actor,candidate,phase='PREVIEW'){
  assert.equal(snapshot.origin,expectedOrigin(candidate,phase),'DIRECTION_LEGAL_RUNTIME_ORIGIN_MISMATCH');
  assert.equal(snapshot.actorUid,actor.uid,'DIRECTION_LEGAL_SIGNED_UID_MISMATCH');
  assert.equal(snapshot.advisorId,ADVISOR,'DIRECTION_LEGAL_RUNTIME_ADVISOR_MISMATCH');
  assert.equal(role(snapshot.role),'direccion','DIRECTION_LEGAL_RUNTIME_ROLE_MISMATCH');
  assert.equal(snapshot.tenantId,TENANT,'DIRECTION_LEGAL_RUNTIME_TENANT_MISMATCH');
  assert.equal(snapshot.scope,'user:'+(snapshot.email||snapshot.actorUid),'DIRECTION_LEGAL_RUNTIME_SCOPE_MISMATCH');
  assert.equal(snapshot.gateCount,1,'DIRECTION_LEGAL_ONE_VISIBLE_GATE_REQUIRED');
  assert.equal(snapshot.version,VERSION,'DIRECTION_LEGAL_RUNTIME_VERSION_MISMATCH');
  assert.equal(snapshot.type,'interno','DIRECTION_LEGAL_INTERNAL_CLAUSES_ONLY');
  assert.deepEqual(snapshot.clauseIds,[...CLAUSES],'DIRECTION_LEGAL_RUNTIME_CLAUSE_SET_MISMATCH');
  assert.equal(snapshot.previousAcceptance,null,'DIRECTION_LEGAL_FRESH_CONTEXT_REQUIRED');
  assert.equal(snapshot.checked,false,'DIRECTION_LEGAL_UNCHECKED_BOX_REQUIRED');
  assert.equal(snapshot.buttonDisabled,true,'DIRECTION_LEGAL_DISABLED_BUTTON_REQUIRED');
  return true;
}
function validatePresentation(snapshot,actor,candidate,phase='PREVIEW'){
  validatePresentationIdentity(snapshot,actor,candidate,phase);
  assert.equal(snapshot.country,'GT','DIRECTION_LEGAL_RUNTIME_COUNTRY_MISMATCH');
  assert.equal(digest(snapshot.terms),TERMS_SHA256,'DIRECTION_LEGAL_DISPLAYED_TEXT_CHANGED');
  if(snapshot.checkboxDisabled!==undefined)assert.equal(snapshot.checkboxDisabled,false,'DIRECTION_LEGAL_COUNTRY_NOT_READY');
  return true;
}
function validateCountrySelection(snapshot){
  assert.equal(snapshot.country,'','DIRECTION_LEGAL_COUNTRY_SELECTION_NOT_FRESH');
  assert.equal(snapshot.countrySelectionValue,'','DIRECTION_LEGAL_COUNTRY_SELECTION_NOT_FRESH');
  assert.deepEqual([...(snapshot.countryOptions||[])].sort(),['CO','GT'],'DIRECTION_LEGAL_COUNTRY_OPTIONS_MISMATCH');
  assert.equal(snapshot.checkboxDisabled,true,'DIRECTION_LEGAL_COUNTRY_SELECTION_NOT_REQUIRED');
  assert.equal(snapshot.terms.length,0,'DIRECTION_LEGAL_COUNTRY_SELECTION_TEXT_MUST_WAIT');
  return true;
}
function validateAccepted(record,actor,scope,startedAt,finishedAt,candidate,phase='PREVIEW'){
  assert.ok(record&&record.aceptado===true,'DIRECTION_LEGAL_ACCEPTANCE_NOT_PERSISTED');
  assert.equal(record.version,VERSION,'DIRECTION_LEGAL_ACCEPTED_VERSION_MISMATCH');
  assert.equal(record.actorUid,actor.uid,'DIRECTION_LEGAL_ACCEPTED_ACTOR_MISMATCH');
  assert.equal(record.scopeId,scope,'DIRECTION_LEGAL_ACCEPTED_SCOPE_MISMATCH');
  assert.equal(record.origin,expectedOrigin(candidate,phase),'DIRECTION_LEGAL_ACCEPTED_ORIGIN_MISMATCH');
  assert.equal(record.pais,'GT','DIRECTION_LEGAL_ACCEPTED_COUNTRY_MISMATCH');
  assert.equal(record.tipo,'interno','DIRECTION_LEGAL_ACCEPTED_TYPE_MISMATCH');
  assert.deepEqual(record.clausulas,[...CLAUSES],'DIRECTION_LEGAL_ACCEPTED_CLAUSES_MISMATCH');
  assert.equal(record.acceptanceMethod,'VISIBLE_CHECKBOX_AND_BUTTON','DIRECTION_LEGAL_NORMAL_UI_REQUIRED');
  assert.equal(record.ip,null,'DIRECTION_LEGAL_FABRICATED_IP_FORBIDDEN');
  assert.equal(record.ipSource,'NOT_COLLECTED','DIRECTION_LEGAL_IP_PROVENANCE_REQUIRED');
  const at=Date.parse(record.fecha);
  assert.ok(Number.isFinite(at)&&at>=startedAt&&at<=finishedAt,'DIRECTION_LEGAL_ACCEPTANCE_TIME_MISMATCH');
  return true;
}
function validateReloadReadback(snapshot,actor,scope,immediate,startedAt,finishedAt,candidate,phase='PREVIEW'){
  assert.equal(snapshot.origin,expectedOrigin(candidate,phase),'DIRECTION_LEGAL_RUNTIME_ORIGIN_MISMATCH');
  assert.equal(snapshot.actorUid,actor.uid,'DIRECTION_LEGAL_RELOAD_ACTOR_MISMATCH');
  assert.equal(snapshot.signedActorUid,actor.uid,'DIRECTION_LEGAL_RELOAD_ACTOR_MISMATCH');
  assert.equal(snapshot.appStarted,true,'DIRECTION_LEGAL_RELOAD_APP_NOT_READY');
  assert.equal(snapshot.legalSatisfied,true,'DIRECTION_LEGAL_RELOAD_GATE_PENDING');
  assert.equal(snapshot.advisorId,ADVISOR,'DIRECTION_LEGAL_RUNTIME_ADVISOR_MISMATCH');
  assert.equal(role(snapshot.role),'direccion','DIRECTION_LEGAL_RUNTIME_ROLE_MISMATCH');
  assert.equal(snapshot.tenantId,TENANT,'DIRECTION_LEGAL_RUNTIME_TENANT_MISMATCH');
  assert.equal(snapshot.scope,scope,'DIRECTION_LEGAL_RUNTIME_SCOPE_MISMATCH');
  assert.equal(snapshot.scope,'user:'+(snapshot.email||snapshot.actorUid),'DIRECTION_LEGAL_RUNTIME_SCOPE_MISMATCH');
  assert.equal(snapshot.gateCount,0,'DIRECTION_LEGAL_RELOAD_GATE_PENDING');
  validateAccepted(snapshot.record,actor,scope,startedAt,finishedAt,candidate,phase);
  assert.deepEqual(snapshot.record,immediate,'DIRECTION_LEGAL_RELOAD_RECORD_CHANGED');
  return true;
}
async function acceptDirectionPreviewLegal({page,actor,cfg}){
  let legalSubstage='AUTHORITY_VALIDATION';
  try{
  const control=JSON.parse(fs.readFileSync(CONTROL,'utf8'));
  // The scoped four/five-function Preview leaves the production lock intact.
  // Validate that exact owner-approved synthetic-only authority rather than
  // requiring the former global Preview status. Never grant consent or skip UI.
  const scopedPreview=control.status==='OPERATIONAL_EXACT_LIVE_ACCEPTED_LOCKED' &&
    (control.scopedBackendPreviewI66?.status==='APPROVED_FOUR_FUNCTION_PREVIEW_SYNTHETIC_ONLY' ||
     control.scopedBackendPreviewI66?.status===require('./gravicentra-i66-make-release-scope.cjs').PREVIEW_STATUS);
  if(!scopedPreview){
    assert.equal(control.status,'OPERATIONAL_BACKEND_PREVIEW_AUTHORIZED','DIRECTION_LEGAL_PREVIEW_GATE_NOT_ACTIVE');
  }
  const candidate=scopedPreview
    ? require('./gravicentra-i6-6-operational-release-candidate.cjs').candidateForPhase(control,'preview')
    : control.operationalReleaseCandidate;
  const scoped=usesI66Scope(candidate);
  const receiptPath=scoped?I66_SCOPE.receiptPath:RECEIPT;
  const receiptBytes=fs.readFileSync(receiptPath),receipt=JSON.parse(receiptBytes),receiptSha256=hash(receiptBytes);
  const sourceParent=scoped?undefined:execFileSync('git',['rev-parse',cfg.source+'^'],{encoding:'utf8'}).trim();
  const technicalRetry=scoped?undefined:sourceParent===PROPOSAL_DIAGNOSTIC_RETRY.sourceParent?PROPOSAL_DIAGNOSTIC_RETRY:
    sourceParent===TECHNICAL_RETRY.sourceParent?TECHNICAL_RETRY:undefined;
  const technicalRetryBytes=technicalRetry?fs.readFileSync(technicalRetry.receiptPath):undefined;
  validateDecision({receipt,receiptSha256,candidate,cfg,sourceParent,actor,technicalRetryBytes,control});
  if(scoped){
    // The once-approved scope may cover descendant technical candidates, not
    // unrelated or pre-authorization source trees. CI checks out full history.
    try{execFileSync('git',['merge-base','--is-ancestor',I66_SCOPE.sourceBaseHead,cfg.source],{stdio:'pipe'});}
    catch(_){throw new Error('DIRECTION_LEGAL_SCOPE_SOURCE_NOT_DESCENDANT');}
    assert.equal(hash(fs.readFileSync(RECEIPT)),I66_SCOPE.historicalReceiptSha256,'DIRECTION_LEGAL_SCOPE_HISTORICAL_RECEIPT_CHANGED');
    assert.equal(hash(execFileSync('git',['show',cfg.source+':'+RECEIPT])),I66_SCOPE.historicalReceiptSha256,'DIRECTION_LEGAL_SCOPE_HISTORICAL_RECEIPT_CHANGED');
  }
  if(technicalRetryBytes)assert.equal(hash(execFileSync('git',['show',cfg.source+':'+technicalRetry.receiptPath])),technicalRetry.receiptSha256,'DIRECTION_LEGAL_TECHNICAL_RETRY_NOT_IN_SOURCE');
  assert.equal(hash(execFileSync('git',['show',cfg.source+':'+receiptPath])),receiptSha256,'DIRECTION_LEGAL_DECISION_NOT_IN_SOURCE');
  return await applyDirectionLegalUi({page,actor,cfg,candidate,receipt,receiptSha256,scoped,technicalRetryBytes,technicalRetry,phase:'PREVIEW'});
  }catch(error){
    // The substage identifies the attempted operation. In particular a failed
    // click does not establish whether its handler ran or acceptance persisted.
    if(error&&typeof error==='object'&&!error.directionLegalSubstage)error.directionLegalSubstage=legalSubstage;
    throw error;
  }
}
async function applyDirectionLegalUi({page,actor,cfg,candidate,receipt,receiptSha256,scoped,technicalRetryBytes,technicalRetry,phase}){
  const live=phase==='LIVE';let legalSubstage='OWNER_READBACK';
  try{
  assert.ok(cfg.packageRoot&&path.isAbsolute(cfg.packageRoot),'DIRECTION_LEGAL_PACKAGE_ROOT_REQUIRED');
  legalSubstage='OWNER_READBACK';
  const packageMarker=scoped?JSON.parse(fs.readFileSync(path.join(cfg.packageRoot,'bundle/site/__recovery__/build.json'),'utf8')):null;
  const verifyScopeMarker=async()=>{
    if(!scoped)return;
    const response=await fetch(cfg.origin+'/__recovery__/build.json',{redirect:'error',headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(30000)});
    assert.equal(response.status,200,'DIRECTION_LEGAL_SCOPE_MARKER_READBACK_FAILED');
    require('./gravicentra-i6-6-operational-release-candidate.cjs').validateBuildMarker(candidate,await response.json(),packageMarker);
  };
  await verifyScopeMarker();
  const bundled=fs.readFileSync(path.join(cfg.packageRoot,'bundle/site/core/legal.js'));
  const source=execFileSync('git',['show',cfg.source+':orbit360-platform/core/legal.js']);
  if(scoped)assert.equal(hash(source),I66_SCOPE.legalOwnerSha256,'DIRECTION_LEGAL_SCOPE_OWNER_CHANGED');
  if(technicalRetryBytes)assert.equal(hash(source),technicalRetry.legalOwnerSha256,'DIRECTION_LEGAL_TECHNICAL_RETRY_OWNER_CHANGED');
  assert.equal(hash(bundled),hash(source),'DIRECTION_LEGAL_PACKAGE_SOURCE_MISMATCH');
  const response=await fetch(cfg.origin+'/core/legal.js',{headers:{'cache-control':'no-cache'}});
  assert.equal(response.status,200,'DIRECTION_LEGAL_OWNER_READBACK_FAILED');
  assert.equal(hash(Buffer.from(await response.arrayBuffer())),hash(bundled),'DIRECTION_LEGAL_HOSTED_OWNER_MISMATCH');
  legalSubstage='VISIBLE_GATE_WAIT';
  await page.waitForSelector('[data-legal-gate]',{state:'visible',timeout:10000});
  legalSubstage='PRE_CLICK_PRESENTATION';
  const readPresentation=()=>page.evaluate(()=>{
    const w=v=>String(v||'').replace(/\s+/g,' ').trim(),gates=document.querySelectorAll('[data-legal-gate]'),gate=gates[0],u=Orbit.auth.user();
    const scope=gate.getAttribute('data-legal-gate'),countrySelect=gate.querySelector('#lg-country');
    return{origin:location.origin,actorUid:u.uid,advisorId:u.advisorId,role:Orbit.session.rol(),tenantId:u.tenantId,email:u.email||'',scope,gateCount:gates.length,
      version:gate.getAttribute('data-legal-version'),type:gate.getAttribute('data-legal-type'),country:gate.getAttribute('data-legal-country'),
      clauseIds:(gate.getAttribute('data-legal-clauses')||'').split(' '),previousAcceptance:Orbit.legal.aceptaciones()[scope]||null,
      countrySelectionRequired:gate.getAttribute('data-legal-country-required')==='1',countrySelectionValue:countrySelect?.value||'',
      countryOptions:countrySelect?[...countrySelect.options].map(option=>option.value).filter(Boolean):[],
      checked:gate.querySelector('#lg-chk').checked,checkboxDisabled:gate.querySelector('#lg-chk').disabled,buttonDisabled:gate.querySelector('#lg-ok').disabled,
      terms:[...gate.querySelectorAll('.lg-clausula')].map(c=>({title:w(c.querySelector('.lg-cl-t')?.textContent),intro:w(c.querySelector('.lg-intro')?.textContent),
        blocks:[...c.querySelectorAll('.lg-bloque')].map(b=>({heading:w(b.querySelector('.lg-bl-h')?.textContent),paragraph:w(b.querySelector('p')?.textContent),items:[...b.querySelectorAll('li')].map(li=>w(li.textContent))})),
        metadata:w(c.querySelector('.lg-meta')?.textContent)}))};
  });
  let snapshot=await readPresentation();
  validatePresentationIdentity(snapshot,actor,candidate,phase);
  if(snapshot.countrySelectionRequired){
    validateCountrySelection(snapshot);
    legalSubstage='COUNTRY_SELECTION';
    await page.locator('[data-legal-gate]').locator('#lg-country').selectOption(receipt.subject.country);
    legalSubstage='PRE_CLICK_PRESENTATION';
    snapshot=await readPresentation();
  }
  validatePresentation(snapshot,actor,candidate,phase);
  const startedAt=Date.now(),gate=page.locator('[data-legal-gate]');
  legalSubstage='CHECKBOX_ACTION';
  await gate.locator('#lg-chk').check();
  legalSubstage='BUTTON_ACTION';
  await gate.locator('#lg-ok').click();
  legalSubstage='POST_CLICK_GATE_CLOSE';
  await page.waitForSelector('[data-legal-gate]',{state:'detached',timeout:10000});
  legalSubstage='POST_CLICK_PERSISTENCE';
  const record=await page.evaluate(scope=>Orbit.legal.aceptaciones()[scope]||null,snapshot.scope);
  const immediateAt=Date.now();
  validateAccepted(record,actor,snapshot.scope,startedAt,immediateAt,candidate,phase);
  if(scoped){
    legalSubstage='RELOAD_READBACK';
    await page.reload({waitUntil:'commit',timeout:30000});
    await page.waitForFunction(()=>{
      const u=window.Orbit?.auth?.user?.();
      return !!(u?.uid&&u.tenantId&&window.Orbit?.session?.rol?.()&&window.Orbit?.legal?.aceptaciones&&
        window.Orbit?.productAppP0?.isStarted?.()===true&&window.Orbit?.productRuntimeBrowserProvidersP0?.initialUser);
    },null,{timeout:30000});
    legalSubstage='RELOAD_ACTOR_VALIDATION';
    const reloaded=await page.evaluate(async scope=>{
      const signed=await Orbit.productRuntimeBrowserProvidersP0.initialUser();
      const u=Orbit.auth.user()||{};
      return {origin:location.origin,actorUid:u.uid,advisorId:u.advisorId,role:Orbit.session.rol(),tenantId:u.tenantId,
        signedActorUid:signed?.uid||'',appStarted:Orbit.productAppP0.isStarted()===true,
        legalSatisfied:Orbit.legal.yaAcepto(scope)===true,email:u.email||'',scope,
        gateCount:document.querySelectorAll('[data-legal-gate]').length,
        record:Orbit.legal.aceptaciones()[scope]||null};
    },snapshot.scope);
    validateReloadReadback(reloaded,actor,snapshot.scope,record,startedAt,immediateAt,candidate,phase);
    await verifyScopeMarker();
  }
  return{status:'EXPLICIT_OWNER_DECISION_APPLIED_BY_NORMAL_UI',decisionId:live?LIVE_SCOPE.decisionId:scoped?I66_SCOPE.decisionId:DECISION,receiptSha256,
    sourceSha:cfg.source,origin:expectedOrigin(candidate,phase),version:VERSION,clauseIds:[...CLAUSES],termsProjectionSha256:TERMS_SHA256,
    ...(scoped?{authorizationScope:live?LIVE_SCOPE.authorizationScope:I66_SCOPE.authorizationScope,gate:'I6.6',buildId:candidate.buildId,
      immediateReadback:true,reloadReadback:true,reloadActorVerified:true}:{}),
    actorUidSha256:hash(actor.uid),scopeSha256:hash(snapshot.scope),acceptedAt:record.fecha,
    ...(live?{phase:'LIVE',authorizationSourceBaseHead:candidate.liveLegalAcceptance.sourceBaseHead,advisorId:ADVISOR,actorRole:'direccion',tenantId:TENANT,country:'GT'}:{}),
    acceptedForOtherActors:false,liveAcceptance:live,storageSeeded:false,gateBypassed:false};
  }catch(error){
    // The substage identifies the attempted operation. In particular a failed
    // click does not establish whether its handler ran or acceptance persisted.
    if(error&&typeof error==='object')error.directionLegalSubstage=legalSubstage;
    throw error;
  }
}
const liveSha=(value,label)=>assert.match(String(value||''),/^[a-f0-9]{40}$/,label);
const liveDigest=(value,label)=>assert.match(String(value||''),/^[a-f0-9]{64}$/,label);
function liveScopeCandidatePin(candidate,receiptSha256,receipt){
  return {receiptPath:LIVE_SCOPE.authorizationPath,receiptSha256,decisionId:LIVE_SCOPE.decisionId,
    authorizationScope:LIVE_SCOPE.authorizationScope,gate:'I6.6',phase:'LIVE',origin:LIVE_SCOPE.origin,
    sourceBaseHead:receipt.sourceBaseHead,sourceSha:candidate.sourceSha,buildId:candidate.buildId,
    buildRunId:candidate.buildRunId,artifactId:candidate.artifactId,artifactDigest:candidate.artifactDigest,
    previewQa:candidate.previewQa,actorUidSha256:receipt.subject.actorUidSha256,
    advisorId:ADVISOR,actorRole:'direccion',tenantId:TENANT,country:'GT',termsProjectionSha256:TERMS_SHA256,
    proposalSha256:LIVE_SCOPE.proposalSha256,reviewDocumentSha256:LIVE_SCOPE.reviewDocumentSha256};
}
function validateLiveScopeCandidate(candidate){
  const pin=candidate?.liveLegalAcceptance;
  assert.ok(pin,'DIRECTION_LIVE_LEGAL_AUTHORIZATION_REQUIRED');
  liveSha(pin.sourceBaseHead,'DIRECTION_LIVE_LEGAL_SOURCE_ANCHOR_REQUIRED');
  liveDigest(pin.receiptSha256,'DIRECTION_LIVE_LEGAL_RECEIPT_DIGEST_REQUIRED');
  liveDigest(pin.actorUidSha256,'DIRECTION_LIVE_LEGAL_SIGNED_ACTOR_REQUIRED');
  const g=require('./gravicentra-i6-6-operational-release-candidate.cjs');
  g.previewIdentity(candidate);
  g.validateBuildMarker(candidate,{product:'Gravicentra Insurance',gate:'I6.6',sourceSha:candidate.sourceSha,buildId:candidate.buildId});
  assert.ok(candidate.previewQa,'DIRECTION_LIVE_LEGAL_SIGNED_PREVIEW_REQUIRED');
  assert.deepEqual(pin,liveScopeCandidatePin(candidate,pin.receiptSha256,{sourceBaseHead:pin.sourceBaseHead,subject:{actorUidSha256:pin.actorUidSha256}}),'DIRECTION_LIVE_LEGAL_CANDIDATE_PIN_MISMATCH');
  return pin;
}
function buildLiveReviewQuestion(candidate){
  return 'Paula, ¿autorizas el alcance del documento «Gravicentra Insurance — Propuesta de alcance legal LIVE» para tu cuenta Dirección de Alianzas & Soluciones (A&S, Guatemala), únicamente en https://app.aysseguros.com y dentro de I6.6? Comprende registrar, mediante la casilla y el botón normales, tu aceptación de las tres cláusulas internas V2.0: confidencialidad, tratamiento de datos personales y descargo de IA, con verificación inmediata y después de recargar. Se aplicará al build '+candidate.buildId+', artifact '+candidate.artifactId+', y a sus sucesores técnicos de I6.6 sólo con términos idénticos. No comprende otros actores, tenants, países, orígenes o gates, pagos reales, precarga del consentimiento ni elusión del gate. Responde «Autorizo el alcance LIVE propuesto».';
}

function buildLiveReviewContext(candidate,{actorUidSha256}={}){
  const g=require('./gravicentra-i6-6-operational-release-candidate.cjs');
  g.previewIdentity(candidate);liveDigest(actorUidSha256,'DIRECTION_LIVE_LEGAL_SIGNED_ACTOR_REQUIRED');
  assert.equal(candidate.previewQa?.status,'SIGNED_DRIVERS_DURABLE_READBACK_RELOAD_RESTORE_PASS','DIRECTION_LIVE_LEGAL_SIGNED_PREVIEW_REQUIRED');
  const bytes=fs.readFileSync(LIVE_SCOPE.proposalPath);assert.equal(hash(bytes),LIVE_SCOPE.proposalSha256);
  const proposal=JSON.parse(bytes),question=buildLiveReviewQuestion(candidate);
  const context={schema:'I6_6_DIRECTION_LIVE_REVIEW_CONTEXT_V1',status:'PROPOSED_NOT_AUTHORIZED',
    decisionId:LIVE_SCOPE.decisionId,sourceBaseHead:candidate.sourceSha,
    proposal:{path:LIVE_SCOPE.proposalPath,sha256:LIVE_SCOPE.proposalSha256},
    subject:{...proposal.subject,actorUidSha256},environment:proposal.environment,legal:proposal.legal,
    constraints:proposal.constraints,executionAcceptance:proposal.executionAcceptance,
    historicalPreviewAuthorization:proposal.historicalPreviewAuthorization,
    approvedCandidate:Object.fromEntries(['sourceSha','buildId','buildRunId','artifactId','artifactDigest','previewUrl','previewChannelId','previewQa'].map(k=>[k,candidate[k]])),
    decision:{status:'AWAITING_EXPLICIT_OWNER_APPROVAL',question,questionSha256:hash(question),
      responseContext:'REVIEWED_LIVE_SCOPE_AND_EXACT_CANDIDATE',reviewDocumentSha256:LIVE_SCOPE.reviewDocumentSha256,
      reviewDocumentLibraryId:LIVE_SCOPE.reviewDocumentLibraryId}};
  context.decision.reviewContextSha256=liveReviewContextDigest(context);
  return context;
}
function liveReviewContextDigest(receipt){
  return digest({questionSha256:receipt.decision?.questionSha256,reviewDocumentSha256:LIVE_SCOPE.reviewDocumentSha256,
    reviewDocumentLibraryId:LIVE_SCOPE.reviewDocumentLibraryId,proposalSha256:LIVE_SCOPE.proposalSha256,
    sourceBaseHead:receipt.sourceBaseHead,approvedCandidate:receipt.approvedCandidate,subject:receipt.subject,
    environment:receipt.environment,legal:receipt.legal,constraints:receipt.constraints});
}
function validateLiveScopeDecision({receipt,receiptSha256,candidate,proposalBytes,control}){
  const g=require('./gravicentra-i6-6-operational-release-candidate.cjs');
  assert.deepEqual(g.candidateForPhase(control,'live'),candidate,'DIRECTION_LIVE_LEGAL_CANDIDATE_DRIFT');
  const pin=validateLiveScopeCandidate(candidate);
  assert.equal(receiptSha256,pin.receiptSha256,'DIRECTION_LIVE_LEGAL_RECEIPT_MISMATCH');
  assert.equal(hash(proposalBytes),LIVE_SCOPE.proposalSha256,'DIRECTION_LIVE_LEGAL_PROPOSAL_MISMATCH');
  const proposal=JSON.parse(proposalBytes);
  assert.equal(proposal.status,'PROPOSED_NOT_AUTHORIZED','DIRECTION_LIVE_LEGAL_PROPOSAL_IS_NOT_AUTHORIZATION');
  assert.equal(proposal.authorizationNotReceived,true,'DIRECTION_LIVE_LEGAL_PROPOSAL_IS_NOT_AUTHORIZATION');
  assert.equal(receipt.schema,LIVE_SCOPE.schema,'DIRECTION_LIVE_LEGAL_RECEIPT_SCHEMA');
  assert.equal(receipt.decisionId,LIVE_SCOPE.decisionId,'DIRECTION_LIVE_LEGAL_DECISION_MISMATCH');
  assert.deepEqual(receipt.proposal,{path:LIVE_SCOPE.proposalPath,sha256:LIVE_SCOPE.proposalSha256},'DIRECTION_LIVE_LEGAL_PROPOSAL_MISMATCH');
  assert.equal(receipt.sourceBaseHead,pin.sourceBaseHead,'DIRECTION_LIVE_LEGAL_SOURCE_ANCHOR_REQUIRED');
  const decision=receipt.decision||{};
  assert.equal(decision.status,'EXPLICIT_BOUNDED_SCOPE_AUTHORIZATION','DIRECTION_LIVE_LEGAL_AUTHORIZATION_REQUIRED');
  assert.equal(typeof decision.response,'string','DIRECTION_LIVE_LEGAL_QUOTE_REQUIRED');
  assert.ok(decision.response.length>0&&decision.response.length<=4096,'DIRECTION_LIVE_LEGAL_QUOTE_REQUIRED');
  const response=normalize(decision.response).toUpperCase();
  assert.ok(['AUTORIZO','AUTORIZO EL ALCANCE LIVE PROPUESTO',normalize(proposal.proposedConfirmationQuote).toUpperCase()].includes(response),'DIRECTION_LIVE_LEGAL_EXPLICIT_CONFIRMATION_REQUIRED');
  assert.equal(decision.normalizedResponse,response,'DIRECTION_LIVE_LEGAL_QUOTE_MISMATCH');
  assert.equal(decision.responseContext,'REVIEWED_LIVE_SCOPE_AND_EXACT_CANDIDATE','DIRECTION_LIVE_LEGAL_REVIEW_CONTEXT_REQUIRED');
  assert.ok(typeof decision.question==='string'&&decision.question.length>0&&decision.question.length<=8192,'DIRECTION_LIVE_LEGAL_REVIEW_QUESTION_REQUIRED');
  assert.equal(decision.questionSha256,hash(decision.question),'DIRECTION_LIVE_LEGAL_REVIEW_QUESTION_MISMATCH');
  assert.equal(decision.question,buildLiveReviewQuestion(receipt.approvedCandidate||{}),'DIRECTION_LIVE_LEGAL_REVIEW_QUESTION_MISMATCH');
  assert.equal(decision.reviewContextSha256,liveReviewContextDigest(receipt),'DIRECTION_LIVE_LEGAL_REVIEW_CONTEXT_MISMATCH');
  assert.equal(decision.reviewDocumentSha256,LIVE_SCOPE.reviewDocumentSha256,'DIRECTION_LIVE_LEGAL_REVIEW_MISMATCH');
  assert.equal(decision.reviewDocumentLibraryId,LIVE_SCOPE.reviewDocumentLibraryId,'DIRECTION_LIVE_LEGAL_REVIEW_MISMATCH');
  assert.match(String(decision.receivedLocalDate||''),/^\d{4}-\d{2}-\d{2}$/,'DIRECTION_LIVE_LEGAL_DECISION_DATE_REQUIRED');
  assert.ok(Number.isFinite(Date.parse(decision.receivedLocalDate)),'DIRECTION_LIVE_LEGAL_DECISION_DATE_REQUIRED');
  assert.equal(decision.timezone,'America/Guatemala','DIRECTION_LIVE_LEGAL_DECISION_DATE_REQUIRED');
  assert.deepEqual(receipt.subject,{...proposal.subject,actorUidSha256:pin.actorUidSha256},'DIRECTION_LIVE_LEGAL_SUBJECT_MISMATCH');
  assert.deepEqual(receipt.environment,proposal.environment,'DIRECTION_LIVE_LEGAL_SCOPE_MISMATCH');
  assert.deepEqual(receipt.legal,proposal.legal,'DIRECTION_LIVE_LEGAL_TERMS_MISMATCH');
  assert.deepEqual(receipt.constraints,proposal.constraints,'DIRECTION_LIVE_LEGAL_CONSTRAINT_MISMATCH');
  assert.deepEqual(receipt.executionAcceptance,proposal.executionAcceptance,'DIRECTION_LIVE_LEGAL_EXECUTION_REQUIREMENTS_MISMATCH');
  assert.deepEqual(receipt.historicalPreviewAuthorization,proposal.historicalPreviewAuthorization,'DIRECTION_LIVE_LEGAL_PREVIEW_AUTHORITY_CHANGED');
  const initial=receipt.approvedCandidate||{};
  assert.equal(initial.sourceSha,receipt.sourceBaseHead,'DIRECTION_LIVE_LEGAL_APPROVED_SOURCE_MISMATCH');
  liveSha(initial.sourceSha,'DIRECTION_LIVE_LEGAL_APPROVED_SOURCE_MISMATCH');
  assert.match(String(initial.buildId||''),new RegExp('^gi-i66-'+initial.sourceSha.slice(0,12)+'-[a-f0-9]{12}$'),'DIRECTION_LIVE_LEGAL_APPROVED_BUILD_MISMATCH');
  const initialQa=initial.previewQa||{};
  assert.equal(initialQa.status,'SIGNED_DRIVERS_DURABLE_READBACK_RELOAD_RESTORE_PASS','DIRECTION_LIVE_LEGAL_SIGNED_PREVIEW_REQUIRED');
  liveSha(initialQa.headSha,'DIRECTION_LIVE_LEGAL_SIGNED_PREVIEW_REQUIRED');
  for(const key of ['runId','receiptArtifactId'])assert.ok(Number.isSafeInteger(initialQa[key])&&initialQa[key]>0,'DIRECTION_LIVE_LEGAL_SIGNED_PREVIEW_REQUIRED');
  assert.match(String(initialQa.receiptArtifactDigest||''),/^sha256:[a-f0-9]{64}$/,'DIRECTION_LIVE_LEGAL_SIGNED_PREVIEW_REQUIRED');
  for(const key of ['buildRunId','artifactId'])assert.ok(Number.isSafeInteger(initial[key])&&initial[key]>0,'DIRECTION_LIVE_LEGAL_APPROVED_ARTIFACT_REQUIRED');
  assert.match(String(initial.artifactDigest||''),/^sha256:[a-f0-9]{64}$/,'DIRECTION_LIVE_LEGAL_APPROVED_ARTIFACT_REQUIRED');
  if(candidate.sourceSha===receipt.sourceBaseHead)assert.deepEqual(initial,
    Object.fromEntries(['sourceSha','buildId','buildRunId','artifactId','artifactDigest','previewUrl','previewChannelId','previewQa'].map(k=>[k,candidate[k]])),
    'DIRECTION_LIVE_LEGAL_APPROVED_CANDIDATE_DRIFT');
  return receipt;
}
function readLiveScopeAuthorization(control,candidate,io=fs){
  const pin=validateLiveScopeCandidate(candidate);
  let bytes;
  try{bytes=io.readFileSync(LIVE_SCOPE.authorizationPath);}catch(_){throw Error('DIRECTION_LIVE_LEGAL_AUTHORIZATION_REQUIRED');}
  assert.equal(hash(bytes),pin.receiptSha256,'DIRECTION_LIVE_LEGAL_RECEIPT_MISMATCH');
  const receipt=JSON.parse(bytes),proposalBytes=io.readFileSync(LIVE_SCOPE.proposalPath);
  validateLiveScopeDecision({receipt,receiptSha256:hash(bytes),candidate,proposalBytes,control});
  assert.equal(hash(io.readFileSync(I66_SCOPE.receiptPath)),I66_SCOPE.receiptSha256,'DIRECTION_LIVE_LEGAL_PREVIEW_AUTHORITY_CHANGED');
  return {control,candidate,receipt,receiptSha256:hash(bytes)};
}
function assertDirectionLiveLegalAuthority({sourceSha}={}){
  const control=JSON.parse(fs.readFileSync(CONTROL,'utf8'));
  const candidate=require('./gravicentra-i6-6-operational-release-candidate.cjs').candidateForPhase(control,'live');
  if(sourceSha!==undefined)assert.equal(sourceSha,candidate.sourceSha,'DIRECTION_LIVE_LEGAL_SOURCE_MISMATCH');
  const authority=readLiveScopeAuthorization(control,candidate);
  assert.equal(hash(execFileSync('git',['show',candidate.sourceSha+':'+LIVE_SCOPE.proposalPath])),LIVE_SCOPE.proposalSha256,'DIRECTION_LIVE_LEGAL_PROPOSAL_NOT_IN_SOURCE');
  assert.equal(hash(execFileSync('git',['show',candidate.sourceSha+':'+I66_SCOPE.receiptPath])),I66_SCOPE.receiptSha256,'DIRECTION_LIVE_LEGAL_PREVIEW_AUTHORITY_CHANGED');
  const proposal=JSON.parse(fs.readFileSync(LIVE_SCOPE.proposalPath));
  for(const ancestor of [proposal.sourceBaseHead,authority.receipt.sourceBaseHead]){
    try{execFileSync('git',['merge-base','--is-ancestor',ancestor,candidate.sourceSha],{stdio:'pipe'});}
    catch(_){throw Error('DIRECTION_LIVE_LEGAL_SOURCE_NOT_DESCENDANT');}
  }
  assert.equal(hash(execFileSync('git',['show',candidate.sourceSha+':orbit360-platform/core/legal.js'])),I66_SCOPE.legalOwnerSha256,'DIRECTION_LIVE_LEGAL_OWNER_CHANGED');
  return authority;
}
async function preflightDirectionLiveLegalPackage({packageRoot}={}){
  const authority=assertDirectionLiveLegalAuthority(),p=authority.candidate;
  assert.ok(packageRoot&&path.isAbsolute(packageRoot),'DIRECTION_LEGAL_PACKAGE_ROOT_REQUIRED');
  const root=path.join(packageRoot,'bundle/site'),g=require('./gravicentra-i6-6-operational-release-candidate.cjs');
  const marker=JSON.parse(fs.readFileSync(path.join(root,'__recovery__/build.json'),'utf8'));
  g.validateBuildMarker(p,marker);
  const bundled=fs.readFileSync(path.join(root,'core/legal.js'));
  assert.equal(hash(bundled),I66_SCOPE.legalOwnerSha256,'DIRECTION_LIVE_LEGAL_PACKAGE_OWNER_CHANGED');
  const response=await fetch(p.previewUrl+'/__recovery__/build.json',{redirect:'error',headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(30000)});
  assert.equal(response.status,200,'DIRECTION_LIVE_LEGAL_PREVIEW_READBACK_REQUIRED');
  g.validateBuildMarker(p,await response.json(),marker);
  const owner=await fetch(p.previewUrl+'/core/legal.js',{redirect:'error',headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(30000)});
  assert.equal(owner.status,200,'DIRECTION_LIVE_LEGAL_PREVIEW_READBACK_REQUIRED');
  assert.equal(hash(Buffer.from(await owner.arrayBuffer())),hash(bundled),'DIRECTION_LIVE_LEGAL_PREVIEW_OWNER_CHANGED');
  return authority;
}
function validateLiveAcceptanceProof(proof,candidate){
  const pin=validateLiveScopeCandidate(candidate);
  assert.ok(proof,'DIRECTION_LIVE_LEGAL_EXECUTION_PROOF_REQUIRED');
  for(const [key,value] of Object.entries({status:'EXPLICIT_OWNER_DECISION_APPLIED_BY_NORMAL_UI',phase:'LIVE',decisionId:LIVE_SCOPE.decisionId,
    authorizationScope:LIVE_SCOPE.authorizationScope,gate:'I6.6',sourceSha:candidate.sourceSha,buildId:candidate.buildId,
    authorizationSourceBaseHead:pin.sourceBaseHead,origin:LIVE_SCOPE.origin,receiptSha256:pin.receiptSha256,
    advisorId:ADVISOR,actorRole:'direccion',tenantId:TENANT,country:'GT',version:VERSION,termsProjectionSha256:TERMS_SHA256,
    actorUidSha256:pin.actorUidSha256,immediateReadback:true,reloadReadback:true,reloadActorVerified:true,
    acceptedForOtherActors:false,liveAcceptance:true,storageSeeded:false,gateBypassed:false}))assert.equal(proof[key],value,'DIRECTION_LIVE_LEGAL_PROOF_'+key);
  assert.deepEqual(proof.clauseIds,[...CLAUSES],'DIRECTION_LIVE_LEGAL_PROOF_CLAUSES');
  liveDigest(proof.scopeSha256,'DIRECTION_LIVE_LEGAL_PROOF_SCOPE');
  assert.ok(Number.isFinite(Date.parse(proof.acceptedAt)),'DIRECTION_LIVE_LEGAL_PROOF_TIME');
  return true;
}
async function acceptDirectionLiveLegal({page,actor,cfg}){
  try{
    assert.equal(cfg.phase,'LIVE','DIRECTION_LIVE_LEGAL_LIVE_ONLY');
    assert.equal(cfg.origin,LIVE_SCOPE.origin,'DIRECTION_LIVE_LEGAL_ORIGIN_MISMATCH');
    const authority=assertDirectionLiveLegalAuthority({sourceSha:cfg.source}),{candidate,receipt,receiptSha256}=authority;
    assert.equal(role(actor.role),'direccion','DIRECTION_LIVE_LEGAL_OTHER_ACTOR_FORBIDDEN');
    assert.equal(actor.advisorId,ADVISOR,'DIRECTION_LIVE_LEGAL_OTHER_ACTOR_FORBIDDEN');
    assert.equal(hash(actor.uid),candidate.liveLegalAcceptance.actorUidSha256,'DIRECTION_LIVE_LEGAL_OTHER_ACTOR_FORBIDDEN');
    const proof=await applyDirectionLegalUi({page,actor,cfg,candidate,receipt,receiptSha256,scoped:true,phase:'LIVE'});
    validateLiveAcceptanceProof(proof,candidate);return proof;
  }catch(error){
    if(error&&typeof error==='object'&&!error.directionLegalSubstage)error.directionLegalSubstage='AUTHORITY_VALIDATION';
    throw error;
  }
}

module.exports={CONTROL,RECEIPT,DECISION,SOURCE_BASE,SOURCE_PARENT,ORIGIN,ADVISOR,TENANT,VERSION,CLAUSES,TERMS_SHA256,REVIEW_SHA256,TECHNICAL_RETRY,technicalRetryCandidatePin,validateTechnicalRetry,
  PROPOSAL_DIAGNOSTIC_RETRY,proposalDiagnosticRetryCandidatePin,validateProposalDiagnosticRetry,I66_SCOPE,usesI66Scope,i66ScopeCandidatePin,validateI66ScopeCandidate,validateI66ScopeDecision,validateReloadReadback,
  LIVE_SCOPE,liveScopeCandidatePin,buildLiveReviewQuestion,buildLiveReviewContext,liveReviewContextDigest,validateLiveScopeCandidate,validateLiveScopeDecision,readLiveScopeAuthorization,assertDirectionLiveLegalAuthority,preflightDirectionLiveLegalPackage,validateLiveAcceptanceProof,acceptDirectionLiveLegal,
  LEGAL_FAILURE_CHECKS,LEGAL_FAILURE_SUBSTAGES,safeLegalFailureSubstage,digest,projectCatalog,validateDecision,validatePresentationIdentity,validatePresentation,validateCountrySelection,validateAccepted,validateAcceptanceProof,acceptDirectionPreviewLegal};

if(require.main===module){
  const flag=process.argv[2];
  Promise.resolve().then(()=>{
    if(flag==='--preflight-live-authority')return assertDirectionLiveLegalAuthority();
    if(flag==='--preflight-live-package')return preflightDirectionLiveLegalPackage({packageRoot:process.env.I66_PACKAGE_ROOT});
    throw Error('DIRECTION_LIVE_LEGAL_UNKNOWN_OPERATION');
  }).then(()=>console.log('DIRECTION_LIVE_LEGAL_AUTHORITY_VALIDATED_NOT_EXECUTION_PROOF')).catch(error=>{
    const code=String(error?.message||'').split('\n')[0];console.error(/^DIRECTION_[A-Z0-9_]+$/.test(code)?code:'DIRECTION_LIVE_LEGAL_AUTHORITY_HOLD');process.exitCode=1;
  });
}
