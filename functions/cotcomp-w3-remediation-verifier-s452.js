'use strict';

const fs=require('node:fs');
const path=require('node:path');
const proposalContracts=require('./cotcomp-proposal-contracts');
const versioning=require('./cotcomp-proposal-versioning-contract-s452');
const planner=require('./cotcomp-persistence-plan');
const adapter=require('./cotcomp-persistence-adapter-candidate');

const VERSION='ays-cotcomp-w3-remediation-verifier-s452-v1.0';
const EXECUTION_ENABLED=false;
const APP_DATA_READS_ALLOWED=false;
const APP_DATA_WRITES_ALLOWED=false;

function sample(){
  return {
    tenantId:'alianzas-soluciones',
    caseId:'qcase_s452_verify',
    country:'GT',
    product:'AUTO',
    currency:'GTQ',
    insurerId:'ins_s452',
    insurerDisplayName:'Synthetic Insurer',
    sourceId:'src_s452',
    planName:'Synthetic Plan',
    premium:2500,
    coverages:{collision:'COVERED'},
    limits:{},
    sublimits:{},
    deductibles:{},
    assistance:{},
    conditions:[],
    exclusions:[],
    validity:{validFrom:'2026-10-01T00:00:00Z',validUntil:'2026-10-31T23:59:59Z'},
    provenance:{synthetic:true},
    validationState:'VALIDATED',
    validatedBy:'s452-verifier',
    validatedAt:'2026-10-01T00:00:00Z',
    versionNumber:1,
    requestKey:'s452-verify-v1'
  };
}

function evaluate(){
  const blockers=[];
  const required=proposalContracts.REQUIRED_PROPOSAL_FIELDS;
  if(!required.includes('caseId')||required.includes('quoteCaseId'))blockers.push('PROPOSAL_CASE_LINK_FIELD_MISMATCH');

  const alias=proposalContracts.normalizeProposalCaseLink({quoteCaseId:'qcase_alias'});
  if(!alias.ok||alias.proposal.caseId!=='qcase_alias')blockers.push('PUBLIC_CASE_ALIAS_MAPPING_NOT_EXPLICIT');
  const conflict=proposalContracts.normalizeProposalCaseLink({caseId:'A',quoteCaseId:'B'});
  if(conflict.ok||!conflict.errors.some(x=>x.code==='CASE_LINK_CONFLICT'))blockers.push('CASE_LINK_CONFLICT_NOT_DENIED');

  const vr=versioning.readiness();
  if(vr.sourceContractReady!==true||vr.technicalW3Ready!==true)blockers.push('PROPOSAL_VERSIONING_SOURCE_CONTRACT_NOT_READY');
  if(vr.physicalW3Ready!==false||vr.physicalW3Allowed!==false)blockers.push('PHYSICAL_W3_NOT_HARD_CLOSED');
  const extra=vr.blockers.filter(x=>x!=='OWNER_W3_AUTHORIZATION_REQUIRED');
  if(extra.length)blockers.push(...extra);

  const plan=planner.buildVersionedProposalPlan(sample());
  if(!plan.ok||plan.atomic!==true||plan.operations.length!==2)blockers.push('VERSIONED_PERSISTENCE_PLAN_NOT_BOUND');
  if(plan.ok&&plan.comparisonEligibility.currentValidityDerivedFromPersistedInterval!==true)blockers.push('CURRENT_VALIDITY_PERSISTENCE_CONTRACT_REQUIRED');

  const compiled=adapter.compileVersionedProposal(sample());
  if(!compiled.ok||compiled.dryRunOnly!==true||compiled.executionEnabled!==false||compiled.writesEnabled!==false){
    blockers.push('VERSIONED_ADAPTER_NOT_DRY_RUN_ONLY');
  }

  const life=versioning.buildSyntheticW3Lifecycle();
  if(!life.ok)blockers.push(life.code||'W3_LIFECYCLE_INVALID');
  if(life.ok){
    if(life.v1.proposal.versionNumber!==1||life.v2.proposal.versionNumber!==2)blockers.push('PROPOSAL_VERSION_IDENTITY_SEMANTICS_REQUIRED');
    if(life.v1After.validationState!=='SUPERSEDED'||life.v1After.isCurrentVersion!==false)blockers.push('PROPOSAL_SUPERSESSION_ATOMICITY_CONTRACT_REQUIRED');
    if(life.v2.proposal.isCurrentVersion!==true)blockers.push('CURRENT_VERSION_NOT_UNIQUE');
    if(life.validity.v2.current!==true)blockers.push('PROPOSAL_CURRENT_VALIDITY_PERSISTENCE_CONTRACT_REQUIRED');
    if(life.journal.createdPaths.length!==4||life.journal.cleanupDeletePaths.length!==4||life.journal.finalAbsenceRequired!==true){
      blockers.push('W3_PHYSICAL_ROLLBACK_JOURNAL_REQUIRED');
    }
    if(!life.v1.invariants||life.v1.invariants.sameRequestSamePayloadWrites!==0||life.v1.invariants.sameRequestChangedPayload!=='DENY'){
      blockers.push('PROPOSAL_IDEMPOTENT_WRITE_CONTRACT_REQUIRED');
    }
  }

  const source=fs.readFileSync(path.join(__dirname,'cotcomp-proposal-versioning-contract-s452.js'),'utf8');
  const noSideEffects=!source.includes("require('firebase-admin")&&!source.includes("require('firebase-functions");
  if(!noSideEffects)blockers.push('S452_SOURCE_MUST_NOT_IMPORT_RUNTIME_WRITERS');

  const unique=[...new Set(blockers)];
  return Object.freeze({
    version:VERSION,
    sourceRemediationPass:unique.length===0,
    technicalW3Ready:unique.length===0,
    physicalW3Ready:false,
    physicalW3Allowed:false,
    remainingBlockers:Object.freeze(unique.length?unique:['OWNER_W3_AUTHORIZATION_REQUIRED']),
    findings:Object.freeze({
      canonicalCaseField:'caseId',
      publicAlias:'quoteCaseId',
      aliasConflictDenied:true,
      proposalVersionSpecificId:true,
      sequentialSupersession:true,
      currentValidityFromPersistedInterval:true,
      idempotencyContract:true,
      rollbackJournalCreatedDocuments:life.ok?life.journal.expectedCreatedDocuments:null,
      rollbackCleanupPaths:life.ok?life.journal.cleanupDeletePaths.length:null,
      adapterDryRunOnly:compiled.ok?compiled.dryRunOnly:false,
      noRuntimeWriterImports:noSideEffects
    }),
    boundaries:Object.freeze({
      executionEnabled:EXECUTION_ENABLED,
      appDataReadsAllowed:APP_DATA_READS_ALLOWED,
      appDataWritesAllowed:APP_DATA_WRITES_ALLOWED,
      providerOrRaterCallsAllowed:false,
      realDataAllowed:false,
      productionAllowed:false
    })
  });
}

module.exports=Object.freeze({
  VERSION,EXECUTION_ENABLED,APP_DATA_READS_ALLOWED,APP_DATA_WRITES_ALLOWED,sample,evaluate
});
