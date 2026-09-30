'use strict';

const VERSION = 'ays-cotcomp-governance-policy-s426-v1.0';
const OWNER_APPROVED = true;
const LEGAL_VALIDATION_REQUIRED = true;
const LEGAL_VALIDATION_COMPLETE = false;
const RUNTIME_ENABLED = false;
const WRITES_ENABLED = false;
const DEPLOY_ALLOWED = false;

const RETENTION = Object.freeze({
  DRAFT_INACTIVE: Object.freeze({
    inactivityDays: 30,
    action: 'DELETE_OR_ANONYMIZE',
    legalBasis: 'INTERNAL_GOVERNANCE_PENDING_FORMAL_LEGAL_VALIDATION'
  }),
  SUBMITTED_NOT_CONVERTED: Object.freeze({
    retentionMonthsAfterClosureOrLastActivity: 12,
    action: 'DELETE_OR_ANONYMIZE',
    legalBasis: 'INTERNAL_GOVERNANCE_PENDING_FORMAL_LEGAL_VALIDATION'
  }),
  CONVERTED_TO_CLIENT: Object.freeze({
    action: 'HANDOFF_TO_GRAVICENTRA_CLIENT_POLICY_GOVERNANCE',
    cotcompAutomaticDeletionAllowed: false,
    transitionConfirmationRequired: true
  })
});

const CASE_ACCESS = Object.freeze({
  tokenLifetimeDays: 7,
  boundToSingleQuoteCase: true,
  rawTokenPersistenceAllowed: false,
  tokenHashPersistenceAllowed: true,
  renewalCreatesNewToken: true,
  previousTokenRevokedOnRenewal: true,
  revocationReasons: Object.freeze([
    'CASE_CLOSED',
    'ACCESS_CONTEXT_CHANGED',
    'TOKEN_ROTATED',
    'OWNER_REVOKED',
    'SECURITY_EVENT'
  ])
});

const CONSENT = Object.freeze({
  requestManagementSeparateFromMarketing: true,
  marketingOptional: true,
  marketingDefault: false,
  noBundledConsent: true
});

function clean(v,max=160){
  return String(v==null?'':v).replace(/\u0000/g,'').trim().slice(0,max);
}

function addDays(iso,days){
  const d=new Date(String(iso||''));
  if(!Number.isFinite(d.getTime())) return null;
  d.setUTCDate(d.getUTCDate()+Number(days||0));
  return d.toISOString();
}

function addMonths(iso,months){
  const d=new Date(String(iso||''));
  if(!Number.isFinite(d.getTime())) return null;
  const originalDay=d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth()+Number(months||0));
  const lastDay=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();
  d.setUTCDate(Math.min(originalDay,lastDay));
  return d.toISOString();
}

function evaluateRetention({state,lastActivityAt,closedAt,conversionConfirmed} = {}){
  const s=clean(state,80).toUpperCase();

  if(s==='DRAFT'){
    const deadline=addDays(lastActivityAt,RETENTION.DRAFT_INACTIVE.inactivityDays);
    return deadline
      ? {ok:true,policy:'DRAFT_INACTIVE',deadline,action:RETENTION.DRAFT_INACTIVE.action}
      : {ok:false,code:'LAST_ACTIVITY_REQUIRED'};
  }

  if(['CLOSED_NOT_CONVERTED','SUBMITTED_NOT_CONVERTED'].includes(s)){
    const basis=closedAt || lastActivityAt;
    const deadline=addMonths(basis,RETENTION.SUBMITTED_NOT_CONVERTED.retentionMonthsAfterClosureOrLastActivity);
    return deadline
      ? {ok:true,policy:'SUBMITTED_NOT_CONVERTED',deadline,action:RETENTION.SUBMITTED_NOT_CONVERTED.action}
      : {ok:false,code:'CLOSURE_OR_ACTIVITY_REQUIRED'};
  }

  if(s==='CONVERTED_TO_CLIENT'){
    if(conversionConfirmed!==true) return {ok:false,code:'CONVERSION_CONFIRMATION_REQUIRED'};
    return {
      ok:true,
      policy:'CONVERTED_TO_CLIENT',
      deadline:null,
      action:RETENTION.CONVERTED_TO_CLIENT.action,
      cotcompAutomaticDeletionAllowed:false
    };
  }

  return {ok:false,code:'RETENTION_STATE_UNSUPPORTED'};
}

function evaluateCaseAccess({issuedAt,quoteCaseId,tokenHash,revokedAt,revocationReason,now} = {}){
  if(!clean(quoteCaseId,180)) return {ok:false,code:'QUOTE_CASE_ID_REQUIRED'};
  if(!clean(tokenHash,128)) return {ok:false,code:'TOKEN_HASH_REQUIRED'};
  if(!issuedAt) return {ok:false,code:'ISSUED_AT_REQUIRED'};

  const expiresAt=addDays(issuedAt,CASE_ACCESS.tokenLifetimeDays);
  if(!expiresAt) return {ok:false,code:'ISSUED_AT_INVALID'};

  if(revokedAt){
    const reason=clean(revocationReason,80);
    if(!CASE_ACCESS.revocationReasons.includes(reason)) return {ok:false,code:'REVOCATION_REASON_INVALID',expiresAt};
    return {ok:false,code:'CASE_ACCESS_REVOKED',expiresAt,revocationReason:reason};
  }

  const nowMs=Date.parse(String(now||''));
  const expMs=Date.parse(expiresAt);
  if(!Number.isFinite(nowMs)) return {ok:false,code:'NOW_INVALID',expiresAt};
  if(nowMs>=expMs) return {ok:false,code:'CASE_ACCESS_EXPIRED',expiresAt};

  return {ok:true,code:'CASE_ACCESS_ACTIVE',expiresAt};
}

function governanceGate({ownerApproval,legalValidationComplete} = {}){
  const reasons=[];
  if(ownerApproval!==true) reasons.push('OWNER_GOVERNANCE_APPROVAL_REQUIRED');
  if(legalValidationComplete!==true) reasons.push('FORMAL_LEGAL_VALIDATION_REQUIRED');

  return {
    ok:reasons.length===0,
    reasons,
    ownerApprovedByPolicy:OWNER_APPROVED,
    legalValidationRequired:LEGAL_VALIDATION_REQUIRED,
    legalValidationCompleteByCode:LEGAL_VALIDATION_COMPLETE,
    runtimeEnabled:RUNTIME_ENABLED,
    writesEnabled:WRITES_ENABLED,
    deployAllowed:DEPLOY_ALLOWED,
    effectiveRuntimeAllowed:false
  };
}

module.exports=Object.freeze({
  VERSION,
  OWNER_APPROVED,
  LEGAL_VALIDATION_REQUIRED,
  LEGAL_VALIDATION_COMPLETE,
  RUNTIME_ENABLED,
  WRITES_ENABLED,
  DEPLOY_ALLOWED,
  RETENTION,
  CASE_ACCESS,
  CONSENT,
  addDays,
  addMonths,
  evaluateRetention,
  evaluateCaseAccess,
  governanceGate
});
