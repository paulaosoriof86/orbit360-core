'use strict';

const governance=require('./cotcomp-governance-policy');
const legal=require('./cotcomp-legal-validation-evidence');
const provenance=require('./cotcomp-legal-evidence-provenance');
const intake=require('./cotcomp-counsel-packet-intake');

const VERSION='ays-cotcomp-w5-counsel-intake-kit-s461-v1.0';
const EXECUTION_ENABLED=false;
const APP_DATA_READS_ALLOWED=false;
const APP_DATA_WRITES_ALLOWED=false;
const REAL_DATA_ALLOWED=false;
const PRODUCTION_ALLOWED=false;

function decisionTemplate(policyItem){
  return Object.freeze({
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
  });
}

function countryCounselTemplate(country){
  const normalized=String(country||'').trim().toUpperCase();
  if(!legal.COUNTRIES.includes(normalized))throw new Error('S461_COUNTRY_INVALID');
  return Object.freeze({
    packet:Object.freeze({
      country:normalized,
      reviewedPolicyVersion:governance.VERSION,
      entityLegalName:'',
      counselOrganization:'',
      formalOpinionReference:'',
      opinionDate:'',
      ownerAcceptedCountryOpinion:false,
      decisions:Object.freeze(legal.POLICY_ITEMS.map(decisionTemplate))
    }),
    evidence:Object.freeze({
      country:normalized,
      sourceType:'FORMAL_COUNSEL_OPINION',
      reviewedPolicyVersion:governance.VERSION,
      documentReference:'',
      documentFileName:'',
      documentSha256:'',
      issuedBy:'',
      issuedAt:'',
      signedOrOfficial:false,
      derivedFromPublicResearch:false
    }),
    ownerAcceptance:Object.freeze({
      country:normalized,
      policyVersion:governance.VERSION,
      ownerAccepted:false,
      acceptedAt:'',
      evidenceDocumentSha256:''
    })
  });
}

function counselQuestionnaire(country){
  const normalized=String(country||'').trim().toUpperCase();
  if(!legal.COUNTRIES.includes(normalized))throw new Error('S461_COUNTRY_INVALID');
  return Object.freeze({
    country:normalized,
    reviewedPolicyVersion:governance.VERSION,
    purpose:'Formal legal review of the current CotComp governance policy before any W5 real-data pilot.',
    instructions:Object.freeze([
      'Review the exact current governance-policy version only.',
      'For each policy item choose COMPLIANT, ADJUST or NOT_APPLICABLE.',
      'Cite the legal/regulatory source relied on.',
      'Explain the legal analysis for the specific CotComp processing context.',
      'If ADJUST, state the exact required adjustment.',
      'If NOT_APPLICABLE, explain why.',
      'Do not infer that public research already in the project is formal counsel evidence.'
    ]),
    items:Object.freeze(legal.POLICY_ITEMS.map(policyItem=>Object.freeze({
      policyItem,
      questions:Object.freeze([
        'Is the current internal policy for this item compliant for A&S in this country?',
        'What legal or regulatory source governs this item?',
        'Is there a mandatory minimum retention/availability period?',
        'Is there a mandatory maximum retention/availability period?',
        'What categories of personal or sensitive data are affected?',
        'What consent or evidence of consent must be retained?',
        'Does the current policy need adjustment before real-data use?'
      ])
    })))
  });
}

function validateCountryBundle(bundle){
  const normalized=intake.normalizeSubmission(bundle||{});
  return Object.freeze({
    ok:normalized.ok,
    country:normalized.country,
    intakeStatus:normalized.intakeStatus,
    reasons:Object.freeze(normalized.reasons||[]),
    packetAccepted:!!normalized.packet,
    evidenceAccepted:!!normalized.evidence,
    ownerAcceptanceAccepted:!!normalized.ownerAcceptance
  });
}

function dualCountryGate({gt,co}={}){
  const gtState=validateCountryBundle(gt||{});
  const coState=validateCountryBundle(co||{});
  const complete=gtState.ok&&coState.ok;
  return Object.freeze({
    version:VERSION,
    governancePolicyVersion:governance.VERSION,
    gt:gtState,
    co:coState,
    dualCountryCounselIntakeComplete:complete,
    formalLegalValidationComplete:false,
    executionAllowed:false,
    realDataAllowed:false,
    productionAllowed:false,
    note:complete
      ? 'Both country intake bundles are structurally valid; formal validation still must be evaluated through the frozen evidence-bound readiness contract.'
      : 'One or both country intake bundles remain incomplete.'
  });
}

function sourceReadiness(){
  const gt=countryCounselTemplate('GT');
  const co=countryCounselTemplate('CO');
  const technicalPass=
    gt.packet.decisions.length===legal.POLICY_ITEMS.length &&
    co.packet.decisions.length===legal.POLICY_ITEMS.length &&
    gt.packet.reviewedPolicyVersion===governance.VERSION &&
    co.packet.reviewedPolicyVersion===governance.VERSION &&
    gt.evidence.sourceType==='FORMAL_COUNSEL_OPINION' &&
    co.evidence.sourceType==='FORMAL_COUNSEL_OPINION';

  return Object.freeze({
    version:VERSION,
    counselIntakeKitReady:technicalPass,
    executionAllowed:false,
    realDataAllowed:false,
    productionAllowed:false,
    governancePolicyVersion:governance.VERSION,
    countries:Object.freeze(['GT','CO']),
    policyItems:Object.freeze([...legal.POLICY_ITEMS]),
    decisions:Object.freeze([...legal.DECISIONS]),
    currentIntakeStatus:intake.currentIntakeStatus(),
    remainingBlockers:Object.freeze([
      'FORMAL_LEGAL_VALIDATION_REQUIRED',
      'W5_EXACT_PILOT_SCOPE_REQUIRED',
      'W5_SUCCESS_PERSISTENCE_DISPOSITION_REQUIRED',
      'OWNER_W5_REAL_DATA_AUTHORIZATION_REQUIRED'
    ]),
    boundaries:Object.freeze({
      executionEnabled:EXECUTION_ENABLED,
      appDataReadsAllowed:APP_DATA_READS_ALLOWED,
      appDataWritesAllowed:APP_DATA_WRITES_ALLOWED,
      realDataAllowed:REAL_DATA_ALLOWED,
      productionAllowed:PRODUCTION_ALLOWED
    })
  });
}

module.exports=Object.freeze({
  VERSION,EXECUTION_ENABLED,APP_DATA_READS_ALLOWED,APP_DATA_WRITES_ALLOWED,REAL_DATA_ALLOWED,PRODUCTION_ALLOWED,
  decisionTemplate,countryCounselTemplate,counselQuestionnaire,validateCountryBundle,dualCountryGate,sourceReadiness
});
