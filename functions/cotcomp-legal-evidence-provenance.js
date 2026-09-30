'use strict';

const governance = require('./cotcomp-governance-policy');

const VERSION = 'ays-cotcomp-legal-evidence-provenance-s430-v0.1';
const RUNTIME_ENABLED = false;
const WRITES_ENABLED = false;
const DEPLOY_ALLOWED = false;

const SOURCE_TYPES = Object.freeze([
  'FORMAL_COUNSEL_OPINION'
]);

const COUNTRIES = Object.freeze(['GT','CO']);

function clean(v,max=1000){
  return String(v==null?'':v).replace(/\u0000/g,'').trim().slice(0,max);
}

function validSha256(v){
  return /^[a-f0-9]{64}$/i.test(clean(v,80));
}

function validateEvidenceProvenance(input = {}){
  const reasons=[];
  const country=clean(input.country,8).toUpperCase();
  const sourceType=clean(input.sourceType,80).toUpperCase();

  if(!COUNTRIES.includes(country)) reasons.push('COUNTRY_INVALID');
  if(!SOURCE_TYPES.includes(sourceType)) reasons.push('FORMAL_COUNSEL_SOURCE_REQUIRED');
  if(input.reviewedPolicyVersion!==governance.VERSION) reasons.push('POLICY_VERSION_MISMATCH');
  if(!clean(input.documentReference,500)) reasons.push('DOCUMENT_REFERENCE_REQUIRED');
  if(!clean(input.documentFileName,500)) reasons.push('DOCUMENT_FILENAME_REQUIRED');
  if(!validSha256(input.documentSha256)) reasons.push('DOCUMENT_SHA256_REQUIRED');
  if(!clean(input.issuedBy,300)) reasons.push('ISSUED_BY_REQUIRED');
  if(!clean(input.issuedAt,80)) reasons.push('ISSUED_AT_REQUIRED');
  if(input.signedOrOfficial!==true) reasons.push('SIGNED_OR_OFFICIAL_EVIDENCE_REQUIRED');
  if(input.derivedFromPublicResearch===true) reasons.push('PUBLIC_RESEARCH_CANNOT_BE_COUNSEL_EVIDENCE');

  return {
    ok:reasons.length===0,
    reasons,
    value:reasons.length?null:{
      schemaVersion:VERSION,
      country,
      sourceType,
      reviewedPolicyVersion:governance.VERSION,
      documentReference:clean(input.documentReference,500),
      documentFileName:clean(input.documentFileName,500),
      documentSha256:clean(input.documentSha256,80).toLowerCase(),
      issuedBy:clean(input.issuedBy,300),
      issuedAt:clean(input.issuedAt,80),
      signedOrOfficial:true,
      derivedFromPublicResearch:false
    }
  };
}

function ownerAcceptanceRecord(input = {}){
  const reasons=[];
  if(!COUNTRIES.includes(clean(input.country,8).toUpperCase())) reasons.push('COUNTRY_INVALID');
  if(input.policyVersion!==governance.VERSION) reasons.push('POLICY_VERSION_MISMATCH');
  if(input.ownerAccepted!==true) reasons.push('OWNER_ACCEPTANCE_REQUIRED');
  if(!clean(input.acceptedAt,80)) reasons.push('OWNER_ACCEPTED_AT_REQUIRED');
  if(!clean(input.evidenceDocumentSha256,80) || !validSha256(input.evidenceDocumentSha256)) reasons.push('EVIDENCE_SHA256_REQUIRED');

  return {
    ok:reasons.length===0,
    reasons,
    value:reasons.length?null:{
      country:clean(input.country,8).toUpperCase(),
      policyVersion:governance.VERSION,
      ownerAccepted:true,
      acceptedAt:clean(input.acceptedAt,80),
      evidenceDocumentSha256:clean(input.evidenceDocumentSha256,80).toLowerCase()
    }
  };
}

module.exports=Object.freeze({
  VERSION,
  RUNTIME_ENABLED,
  WRITES_ENABLED,
  DEPLOY_ALLOWED,
  SOURCE_TYPES,
  COUNTRIES,
  validSha256,
  validateEvidenceProvenance,
  ownerAcceptanceRecord
});
