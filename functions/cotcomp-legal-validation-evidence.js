'use strict';

const governance = require('./cotcomp-governance-policy');

const VERSION = 'ays-cotcomp-legal-validation-evidence-s428-v0.1';
const RUNTIME_ENABLED = false;
const WRITES_ENABLED = false;
const DEPLOY_ALLOWED = false;

const COUNTRIES = Object.freeze(['GT','CO']);

const POLICY_ITEMS = Object.freeze([
  'DRAFT_RETENTION',
  'UNCONVERTED_RETENTION',
  'CONVERTED_HANDOFF',
  'CASE_ACCESS_LIFETIME',
  'TOKEN_STORAGE_AND_REVOCATION',
  'CONSENT_SEPARATION',
  'HEALTH_SENSITIVE_DATA',
  'CONSENT_EVIDENCE_RETENTION'
]);

const DECISIONS = Object.freeze([
  'COMPLIANT',
  'ADJUST',
  'NOT_APPLICABLE'
]);

function clean(v,max=600){
  return String(v==null?'':v).replace(/\u0000/g,'').trim().slice(0,max);
}

function normalizeCountry(v){
  return clean(v,8).toUpperCase();
}

function validateDecision(item = {}){
  const reasons=[];
  const policyItem=clean(item.policyItem,100).toUpperCase();
  const decision=clean(item.decision,40).toUpperCase();

  if(!POLICY_ITEMS.includes(policyItem)) reasons.push('POLICY_ITEM_INVALID');
  if(!DECISIONS.includes(decision)) reasons.push('LEGAL_DECISION_INVALID');
  if(!clean(item.legalSource,1200)) reasons.push('LEGAL_SOURCE_REQUIRED');
  if(!clean(item.analysis,3000)) reasons.push('LEGAL_ANALYSIS_REQUIRED');

  if(decision==='ADJUST'){
    if(!clean(item.requiredAdjustment,2000)) reasons.push('REQUIRED_ADJUSTMENT_REQUIRED');
    if(item.ownerAcceptedAdjustment!==true) reasons.push('OWNER_ACCEPTED_ADJUSTMENT_REQUIRED');
    if(item.appliedToPolicyVersion!==governance.VERSION) reasons.push('ADJUSTMENT_NOT_APPLIED_TO_CURRENT_POLICY');
  }

  if(decision==='NOT_APPLICABLE' && !clean(item.notApplicableReason,1200)){
    reasons.push('NOT_APPLICABLE_REASON_REQUIRED');
  }

  return {
    ok:reasons.length===0,
    reasons,
    value:reasons.length?null:{
      policyItem,
      decision,
      legalSource:clean(item.legalSource,1200),
      analysis:clean(item.analysis,3000),
      mandatoryMinimum:clean(item.mandatoryMinimum,400),
      mandatoryMaximum:clean(item.mandatoryMaximum,400),
      affectedData:clean(item.affectedData,1200),
      requiredConsentEvidence:clean(item.requiredConsentEvidence,1600),
      requiredAdjustment:clean(item.requiredAdjustment,2000),
      ownerAcceptedAdjustment:item.ownerAcceptedAdjustment===true,
      appliedToPolicyVersion:clean(item.appliedToPolicyVersion,180),
      notApplicableReason:clean(item.notApplicableReason,1200)
    }
  };
}

function validateCountryPacket(packet = {}){
  const reasons=[];
  const country=normalizeCountry(packet.country);

  if(!COUNTRIES.includes(country)) reasons.push('COUNTRY_INVALID');
  if(packet.reviewedPolicyVersion!==governance.VERSION) reasons.push('POLICY_VERSION_MISMATCH');
  if(!clean(packet.entityLegalName,300)) reasons.push('ENTITY_LEGAL_NAME_REQUIRED');
  if(!clean(packet.counselOrganization,300)) reasons.push('COUNSEL_ORGANIZATION_REQUIRED');
  if(!clean(packet.formalOpinionReference,500)) reasons.push('FORMAL_OPINION_REFERENCE_REQUIRED');
  if(!clean(packet.opinionDate,60)) reasons.push('OPINION_DATE_REQUIRED');

  const decisions=Array.isArray(packet.decisions)?packet.decisions:[];
  const byItem=new Map();
  const invalid=[];

  for(const item of decisions){
    const state=validateDecision(item);
    if(!state.ok){
      invalid.push({policyItem:clean(item && item.policyItem,100),reasons:state.reasons});
      continue;
    }
    if(byItem.has(state.value.policyItem)){
      invalid.push({policyItem:state.value.policyItem,reasons:['DUPLICATE_POLICY_ITEM']});
      continue;
    }
    byItem.set(state.value.policyItem,state.value);
  }

  const missing=POLICY_ITEMS.filter(item=>!byItem.has(item));
  if(missing.length) reasons.push('POLICY_ITEMS_INCOMPLETE');
  if(invalid.length) reasons.push('LEGAL_DECISIONS_INVALID');

  return {
    ok:reasons.length===0,
    reasons,
    country,
    missing,
    invalid,
    packet:reasons.length?null:{
      schemaVersion:VERSION,
      country,
      reviewedPolicyVersion:governance.VERSION,
      entityLegalName:clean(packet.entityLegalName,300),
      counselOrganization:clean(packet.counselOrganization,300),
      formalOpinionReference:clean(packet.formalOpinionReference,500),
      opinionDate:clean(packet.opinionDate,60),
      decisions:POLICY_ITEMS.map(item=>byItem.get(item)),
      ownerAcceptedCountryOpinion:packet.ownerAcceptedCountryOpinion===true
    }
  };
}

function evaluateFormalValidation({gt,co} = {}){
  const gtState=validateCountryPacket(gt||{});
  const coState=validateCountryPacket(co||{});
  const reasons=[];

  if(!gtState.ok) reasons.push('GT_LEGAL_PACKET_INCOMPLETE');
  if(!coState.ok) reasons.push('CO_LEGAL_PACKET_INCOMPLETE');
  if(gtState.ok && gtState.packet.ownerAcceptedCountryOpinion!==true) reasons.push('GT_OWNER_ACCEPTANCE_REQUIRED');
  if(coState.ok && coState.packet.ownerAcceptedCountryOpinion!==true) reasons.push('CO_OWNER_ACCEPTANCE_REQUIRED');

  return {
    version:VERSION,
    ok:reasons.length===0,
    reasons,
    countries:{
      GT:gtState,
      CO:coState
    },
    reviewedPolicyVersion:governance.VERSION,
    formalLegalValidationComplete:reasons.length===0,
    runtimeEnabled:RUNTIME_ENABLED,
    writesEnabled:WRITES_ENABLED,
    deployAllowed:DEPLOY_ALLOWED,
    effectiveRuntimeAllowed:false
  };
}

function emptyCountryPacket(country){
  return {
    country:normalizeCountry(country),
    reviewedPolicyVersion:governance.VERSION,
    entityLegalName:'',
    counselOrganization:'',
    formalOpinionReference:'',
    opinionDate:'',
    ownerAcceptedCountryOpinion:false,
    decisions:POLICY_ITEMS.map(policyItem=>({
      policyItem,
      decision:'',
      legalSource:'',
      analysis:'',
      mandatoryMinimum:'',
      mandatoryMaximum:'',
      affectedData:'',
      requiredConsentEvidence:'',
      requiredAdjustment:'',
      ownerAcceptedAdjustment:false,
      appliedToPolicyVersion:'',
      notApplicableReason:''
    }))
  };
}

module.exports=Object.freeze({
  VERSION,
  RUNTIME_ENABLED,
  WRITES_ENABLED,
  DEPLOY_ALLOWED,
  COUNTRIES,
  POLICY_ITEMS,
  DECISIONS,
  validateDecision,
  validateCountryPacket,
  evaluateFormalValidation,
  emptyCountryPacket
});
