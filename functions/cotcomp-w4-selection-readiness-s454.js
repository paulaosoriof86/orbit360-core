'use strict';

const fs=require('node:fs');
const path=require('node:path');
const data=require('./cotcomp-runtime-data-contract');
const planner=require('./cotcomp-persistence-plan');
const adapter=require('./cotcomp-persistence-adapter-candidate');

const VERSION='ays-cotcomp-w4-selection-readiness-s454-v1.0';
const EXECUTION_ENABLED=false;
const APP_DATA_READS_ALLOWED=false;
const APP_DATA_WRITES_ALLOWED=false;
const PHYSICAL_W4_ALLOWED=false;

function audit(){
  const selection=data.buildSelection({
    tenantId:'alianzas-soluciones',
    caseId:'qcase_s454',
    comparisonSetId:'cmp_s454',
    proposalId:'proposal_s454',
    selectionRequestKey:'selreq_s454',
    explicitUserChoice:true
  });
  if(!selection.ok)throw new Error('S454_SELECTION_FIXTURE_INVALID');

  const plan=planner.buildSelectionPlan({
    tenantId:'alianzas-soluciones',
    caseId:'qcase_s454',
    comparisonSetId:'cmp_s454',
    proposalId:'proposal_s454',
    selectionRequestKey:'selreq_s454',
    explicitUserChoice:true
  });
  if(!plan.ok)throw new Error('S454_SELECTION_PLAN_INVALID');

  const runtimeSource=fs.readFileSync(path.join(__dirname,'cotcomp-runtime-data-contract.js'),'utf8');
  const planSource=fs.readFileSync(path.join(__dirname,'cotcomp-persistence-plan.js'),'utf8');
  const adapterSource=fs.readFileSync(path.join(__dirname,'cotcomp-persistence-adapter-candidate.js'),'utf8');

  const findings={
    explicitUserChoiceRequired:selection.value.explicitUserChoice===true,
    selectionTruthLocked:
      selection.value.issuanceState==='NOT_ISSUED' &&
      selection.value.bindingState==='NOT_BOUND' &&
      selection.value.coverageState==='NOT_CONFIRMED',
    selectionIdDependsOnRequestKey:/stableId\('sel',[\s\S]{0,240}selectionRequestKey/.test(runtimeSource),
    selectionRequestKeyPersisted:Object.prototype.hasOwnProperty.call(selection.value,'selectionRequestKey'),
    selectionHasRequestDigest:Object.prototype.hasOwnProperty.call(selection.value,'requestDigest'),
    planHasSeparateQuoteCasePatch:!!plan.quoteCasePatch,
    planIsSingleAtomicGroup:plan.atomic===true,
    planVerifiesComparisonSetMembership:/proposalIds/.test(planSource)&&/buildSelectionPlan[\s\S]{0,2600}proposalIds/.test(planSource),
    planVerifiesProposalCase:/buildSelectionPlan[\s\S]{0,2600}(proposal\.caseId|selectedProposal\.caseId)/.test(planSource),
    planVerifiesProposalCurrentEligible:/buildSelectionPlan[\s\S]{0,2600}(VALIDATED|currentValidity|isCurrentVersion)/.test(planSource),
    adapterDryRunOnly:adapter.DRY_RUN_ONLY===true,
    adapterCompilesSingleCommand:/compileSelection[\s\S]{0,1600}command:/.test(adapterSource),
    immutableSelectionCreate:plan.operation&&plan.operation.type==='CREATE_IDEMPOTENT_SELECTION'
  };

  const blockers=[];
  if(!findings.planVerifiesComparisonSetMembership)blockers.push('SELECTION_COMPARISONSET_MEMBERSHIP_REQUIRED');
  if(!findings.planVerifiesProposalCase)blockers.push('SELECTION_PROPOSAL_CASE_LINK_REQUIRED');
  if(!findings.planVerifiesProposalCurrentEligible)blockers.push('SELECTION_CURRENT_ELIGIBLE_PROPOSAL_REQUIRED');
  if(!findings.selectionRequestKeyPersisted||!findings.selectionHasRequestDigest)blockers.push('SELECTION_IDEMPOTENCY_CONTRACT_REQUIRED');
  if(findings.planHasSeparateQuoteCasePatch&&!findings.planIsSingleAtomicGroup)blockers.push('SELECTION_ATOMIC_CASE_PATCH_REQUIRED');
  if(findings.adapterCompilesSingleCommand)blockers.push('SELECTION_MULTI_DOCUMENT_DRYRUN_CONTRACT_REQUIRED');
  blockers.push('W4_PHYSICAL_ROLLBACK_JOURNAL_REQUIRED');
  blockers.push('OWNER_W4_AUTHORIZATION_REQUIRED');

  return Object.freeze({
    version:VERSION,
    findings:Object.freeze(findings),
    sourceReadinessAuditPass:true,
    technicalW4Ready:false,
    physicalW4Ready:false,
    physicalW4Allowed:false,
    blockers:Object.freeze(blockers),
    boundaries:Object.freeze({
      executionEnabled:EXECUTION_ENABLED,
      appDataReadsAllowed:APP_DATA_READS_ALLOWED,
      appDataWritesAllowed:APP_DATA_WRITES_ALLOWED,
      realDataAllowed:false,
      productionAllowed:false
    })
  });
}

module.exports=Object.freeze({VERSION,EXECUTION_ENABLED,APP_DATA_READS_ALLOWED,APP_DATA_WRITES_ALLOWED,PHYSICAL_W4_ALLOWED,audit});
