'use strict';

const fs=require('node:fs');
const path=require('node:path');
const data=require('./cotcomp-runtime-data-contract');
const proposalContracts=require('./cotcomp-proposal-contracts');
const persistence=require('./cotcomp-persistence-plan');

const VERSION='ays-cotcomp-w3-proposal-readiness-s451-v1.0';
const EXECUTION_ENABLED=false;
const APP_DATA_READS_ALLOWED=false;
const APP_DATA_WRITES_ALLOWED=false;
const PHYSICAL_W3_ALLOWED=false;

const BLOCKERS=Object.freeze([
  'PROPOSAL_CASE_LINK_FIELD_MISMATCH',
  'PROPOSAL_VERSION_IDENTITY_SEMANTICS_REQUIRED',
  'PROPOSAL_CURRENT_VALIDITY_PERSISTENCE_CONTRACT_REQUIRED',
  'PROPOSAL_IDEMPOTENT_WRITE_CONTRACT_REQUIRED',
  'PROPOSAL_SUPERSESSION_ATOMICITY_CONTRACT_REQUIRED',
  'W3_PHYSICAL_ROLLBACK_JOURNAL_REQUIRED',
  'OWNER_W3_AUTHORIZATION_REQUIRED'
]);

function clean(v,max=240){return String(v==null?'':v).replace(/\u0000/g,'').trim().slice(0,max);}

function syntheticProposalInput(overrides={}){
  return Object.assign({
    tenantId:'alianzas-soluciones',
    proposalId:'proposal_s451_v1',
    caseId:'qcase_s451_synthetic',
    country:'GT',
    product:'AUTO',
    currency:'GTQ',
    insurerId:'insurer_synthetic',
    insurerDisplayName:'Synthetic Insurer',
    planName:'Synthetic Plan',
    sourceId:'source_synthetic',
    premium:2500,
    coverages:{collision:'COVERED'},
    limits:{},
    sublimits:{},
    deductibles:{},
    assistance:{},
    conditions:[],
    exclusions:[],
    validity:{},
    provenance:{synthetic:true},
    validationState:'VALIDATED',
    validatedBy:'s451-source-only',
    validatedAt:'2026-10-01T00:00:00Z',
    supersedesProposalId:''
  },overrides);
}

function auditCurrentModel(){
  const runtimeProposal=data.buildProposal(syntheticProposalInput());
  if(!runtimeProposal.ok)throw new Error('S451_RUNTIME_PROPOSAL_BUILD_FAILED');

  const comparisonShape=proposalContracts.validateProposalShape(runtimeProposal.value);
  const comparisonEligibility=proposalContracts.evaluateComparisonEligibility(runtimeProposal.value,{currentValidityConfirmed:true});
  const plan=persistence.buildProposalPlan({proposal:syntheticProposalInput()});

  const runtimeSource=fs.readFileSync(path.join(__dirname,'cotcomp-runtime-data-contract.js'),'utf8');
  const contractSource=fs.readFileSync(path.join(__dirname,'cotcomp-proposal-contracts.js'),'utf8');
  const persistenceSource=fs.readFileSync(path.join(__dirname,'cotcomp-persistence-plan.js'),'utf8');

  const findings={
    runtimeBuildUsesCaseId:Object.prototype.hasOwnProperty.call(runtimeProposal.value,'caseId'),
    runtimeBuildUsesQuoteCaseId:Object.prototype.hasOwnProperty.call(runtimeProposal.value,'quoteCaseId'),
    comparisonRequiresQuoteCaseId:proposalContracts.REQUIRED_PROPOSAL_FIELDS.includes('quoteCaseId'),
    comparisonRequiresCaseId:proposalContracts.REQUIRED_PROPOSAL_FIELDS.includes('caseId'),
    directRuntimeProposalComparisonShapePasses:comparisonShape.ok,
    directRuntimeProposalEligibleWithValidityContext:comparisonEligibility.eligible,
    proposalPlanOperationType:plan&&plan.operation&&plan.operation.type||'',
    proposalPlanPath:plan&&plan.operation&&plan.operation.path||'',
    planHasVersionNumber:/version(No|Number|Index|Id)/.test(persistenceSource),
    runtimeHasSupersedesProposalId:runtimeSource.includes('supersedesProposalId'),
    runtimeHasStandardCurrentValidityField:/currentValidityConfirmed/.test(runtimeSource),
    comparisonCurrentValidityIsExternalContext:contractSource.includes('validityContext.currentValidityConfirmed'),
    proposalPlanHasIdempotencyKey:/buildProposalPlan[\s\S]{0,2500}idempotency/i.test(persistenceSource),
    proposalPlanHasAtomicSupersession:/buildProposalPlan[\s\S]{0,2500}(transaction|atomic|SUPERSEDED)/i.test(persistenceSource)
  };

  const blockers=[];
  if(findings.runtimeBuildUsesCaseId&&findings.comparisonRequiresQuoteCaseId&&!findings.runtimeBuildUsesQuoteCaseId){
    blockers.push('PROPOSAL_CASE_LINK_FIELD_MISMATCH');
  }
  if(findings.proposalPlanOperationType==='UPSERT_VERSIONED_PROPOSAL'&&!findings.planHasVersionNumber){
    blockers.push('PROPOSAL_VERSION_IDENTITY_SEMANTICS_REQUIRED');
  }
  if(!findings.runtimeHasStandardCurrentValidityField&&findings.comparisonCurrentValidityIsExternalContext){
    blockers.push('PROPOSAL_CURRENT_VALIDITY_PERSISTENCE_CONTRACT_REQUIRED');
  }
  if(!findings.proposalPlanHasIdempotencyKey){
    blockers.push('PROPOSAL_IDEMPOTENT_WRITE_CONTRACT_REQUIRED');
  }
  if(findings.runtimeHasSupersedesProposalId&&!findings.proposalPlanHasAtomicSupersession){
    blockers.push('PROPOSAL_SUPERSESSION_ATOMICITY_CONTRACT_REQUIRED');
  }
  blockers.push('W3_PHYSICAL_ROLLBACK_JOURNAL_REQUIRED');
  blockers.push('OWNER_W3_AUTHORIZATION_REQUIRED');

  return Object.freeze({
    version:VERSION,
    findings:Object.freeze(findings),
    blockers:Object.freeze(blockers),
    logicalW3Ready:blockers.length===0,
    physicalW3Allowed:false,
    executionEnabled:EXECUTION_ENABLED,
    appDataReadsAllowed:APP_DATA_READS_ALLOWED,
    appDataWritesAllowed:APP_DATA_WRITES_ALLOWED
  });
}

function proposedAlignment(){
  return Object.freeze({
    status:'SOURCE_ONLY_CANDIDATE_NOT_PROMOTED',
    caseLinkBoundary:Object.freeze({
      persistedCanonicalField:'caseId',
      publicApiFieldMayRemain:'quoteCaseId',
      rule:'PUBLIC quoteCaseId MUST map explicitly to persisted caseId; no dual-source ambiguity.'
    }),
    versioningCandidate:Object.freeze({
      immutableVersionDocument:true,
      proposalIdIsVersionSpecific:true,
      supersedesProposalIdRequiredFromVersion2:true,
      priorVersionMustBecome:'SUPERSEDED',
      currentVersionMustBeUniquelyResolvable:true,
      silentOverwriteForbidden:true
    }),
    currentValidityCandidate:Object.freeze({
      comparisonRule:'VALIDATED + CURRENT only',
      currentValidityMustBePersistedOrDeterministicallyDerivedFromFrozenValiditySchema:true,
      externalUnpersistedBooleanNotSufficientForPhysicalW3:true
    }),
    idempotencyCandidate:Object.freeze({
      requestIdentityRequired:true,
      sameRequestSamePayloadWrites:0,
      sameRequestChangedPayload:'DENY',
      duplicateVersionCreate:'DENY'
    }),
    rollbackCandidate:Object.freeze({
      exactJournalRequired:true,
      readbackRequired:true,
      cleanupRequired:true,
      finalAbsenceRequired:true
    })
  });
}

function readiness(){
  const audit=auditCurrentModel();
  return Object.freeze({
    version:VERSION,
    audit,
    candidate:proposedAlignment(),
    sourceOnlyReady:true,
    physicalW3Ready:false,
    physicalW3Allowed:false,
    blockers:audit.blockers
  });
}

module.exports=Object.freeze({
  VERSION,EXECUTION_ENABLED,APP_DATA_READS_ALLOWED,APP_DATA_WRITES_ALLOWED,PHYSICAL_W3_ALLOWED,
  BLOCKERS,syntheticProposalInput,auditCurrentModel,proposedAlignment,readiness
});
