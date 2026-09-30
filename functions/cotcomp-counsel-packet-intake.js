'use strict';

const legal = require('./cotcomp-legal-validation-evidence');
const provenance = require('./cotcomp-legal-evidence-provenance');
const evidenceReadiness = require('./cotcomp-evidence-bound-readiness');
const governance = require('./cotcomp-governance-policy');

const VERSION = 'ays-cotcomp-counsel-packet-intake-s431-v0.1';
const RUNTIME_ENABLED = false;
const WRITES_ENABLED = false;
const DEPLOY_ALLOWED = false;

function normalizeSubmission({packet,evidence,ownerAcceptance} = {}){
  const packetState=legal.validateCountryPacket(packet||{});
  const evidenceState=provenance.validateEvidenceProvenance(evidence||{});
  const acceptanceState=provenance.ownerAcceptanceRecord(ownerAcceptance||{});
  const reasons=[];

  if(!packetState.ok) reasons.push('LEGAL_PACKET_INVALID');
  if(!evidenceState.ok) reasons.push('LEGAL_EVIDENCE_PROVENANCE_INVALID');
  if(!acceptanceState.ok) reasons.push('OWNER_ACCEPTANCE_INVALID');

  if(packetState.ok && evidenceState.ok){
    if(packetState.country!==evidenceState.value.country) reasons.push('COUNTRY_EVIDENCE_MISMATCH');
    if(packetState.packet.formalOpinionReference!==evidenceState.value.documentReference) reasons.push('FORMAL_REFERENCE_MISMATCH');
    if(packetState.packet.reviewedPolicyVersion!==evidenceState.value.reviewedPolicyVersion) reasons.push('POLICY_VERSION_MISMATCH');
  }

  if(evidenceState.ok && acceptanceState.ok){
    if(evidenceState.value.country!==acceptanceState.value.country) reasons.push('OWNER_ACCEPTANCE_COUNTRY_MISMATCH');
    if(evidenceState.value.documentSha256!==acceptanceState.value.evidenceDocumentSha256) reasons.push('OWNER_ACCEPTANCE_EVIDENCE_MISMATCH');
  }

  if(packetState.ok && packetState.packet.ownerAcceptedCountryOpinion!==true){
    reasons.push('PACKET_OWNER_ACCEPTANCE_FLAG_REQUIRED');
  }

  return {
    ok:reasons.length===0,
    reasons:[...new Set(reasons)],
    country:packetState.country || (evidenceState.value && evidenceState.value.country) || '',
    packet:packetState.ok?packetState.packet:null,
    evidence:evidenceState.ok?evidenceState.value:null,
    ownerAcceptance:acceptanceState.ok?acceptanceState.value:null,
    intakeStatus:reasons.length===0?'FORMAL_COUNTRY_PACKET_ACCEPTED':'REJECTED'
  };
}

function evaluateDualCountryIntake({gt,co,readinessInput={}} = {}){
  const gtState=normalizeSubmission(gt||{});
  const coState=normalizeSubmission(co||{});
  const reasons=[];

  if(!gtState.ok) reasons.push('GT_COUNSEL_SUBMISSION_INVALID');
  if(!coState.ok) reasons.push('CO_COUNSEL_SUBMISSION_INVALID');

  const readiness = evidenceReadiness.evaluateEvidenceBoundReadiness({
    ...readinessInput,
    gtLegalPacket:gtState.packet || undefined,
    coLegalPacket:coState.packet || undefined
  });

  reasons.push(...readiness.reasons);

  return {
    version:VERSION,
    ok:reasons.length===0,
    reasons:[...new Set(reasons)],
    governancePolicyVersion:governance.VERSION,
    countries:{GT:gtState,CO:coState},
    formalLegalValidationComplete:gtState.ok && coState.ok && readiness.formalLegalValidationComplete===true,
    readiness,
    runtimeEnabledByCode:RUNTIME_ENABLED,
    writesEnabledByCode:WRITES_ENABLED,
    deployAllowedByCode:DEPLOY_ALLOWED,
    effectiveRuntimeAllowed:false
  };
}

function currentIntakeStatus(){
  return Object.freeze({
    governancePolicyVersion:governance.VERSION,
    GT:'ABSENT',
    CO:'ABSENT',
    formalLegalValidationComplete:false,
    source:'NO_FORMAL_COUNSEL_SUBMISSIONS_RECORDED'
  });
}

module.exports=Object.freeze({
  VERSION,
  RUNTIME_ENABLED,
  WRITES_ENABLED,
  DEPLOY_ALLOWED,
  normalizeSubmission,
  evaluateDualCountryIntake,
  currentIntakeStatus
});
