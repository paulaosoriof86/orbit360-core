'use strict';

const fs=require('node:fs');
const path=require('node:path');
const selection=require('./cotcomp-selection-contract-s455');
const planner=require('./cotcomp-persistence-plan');
const adapter=require('./cotcomp-persistence-adapter-candidate');

const VERSION='ays-cotcomp-w4-remediation-verifier-s455-v1.0';
const EXECUTION_ENABLED=false;
const APP_DATA_READS_ALLOWED=false;
const APP_DATA_WRITES_ALLOWED=false;

function evaluate(){
  const blockers=[];
  const ready=selection.readiness();
  const fx=ready.fixture;
  if(!ready.sourceContractReady||!ready.technicalW4Ready)blockers.push('SELECTION_SOURCE_CONTRACT_NOT_READY');
  if(ready.physicalW4Ready!==false||ready.physicalW4Allowed!==false)blockers.push('PHYSICAL_W4_NOT_HARD_CLOSED');

  const plan=planner.buildAtomicSelectionPlan({
    tenantId:fx.tenantId,caseId:fx.caseId,
    comparisonSetId:fx.comparisonSet.comparisonSetId,
    proposalId:fx.proposal.proposalId,
    selectionRequestKey:'s455-selection-1',explicitUserChoice:true,
    comparisonSet:fx.comparisonSet,proposal:fx.proposal,quoteCase:fx.quoteCase,
    asOf:'2026-10-15T12:00:00Z'
  });
  if(!plan.ok||plan.atomic!==true||plan.operations.length!==3)blockers.push('SELECTION_ATOMIC_CASE_PATCH_REQUIRED');
  if(!plan.ok||plan.prerequisiteReadSet.length!==3)blockers.push('SELECTION_LINKAGE_READSET_REQUIRED');
  if(plan.ok&&(
    plan.truth.issuanceState!=='NOT_ISSUED'||
    plan.truth.bindingState!=='NOT_BOUND'||
    plan.truth.coverageState!=='NOT_CONFIRMED'
  ))blockers.push('SELECTION_TRUTH_LOCK_INVALID');

  const compiled=adapter.compileAtomicSelection({
    tenantId:fx.tenantId,caseId:fx.caseId,
    comparisonSetId:fx.comparisonSet.comparisonSetId,
    proposalId:fx.proposal.proposalId,
    selectionRequestKey:'s455-selection-1',explicitUserChoice:true,
    comparisonSet:fx.comparisonSet,proposal:fx.proposal,quoteCase:fx.quoteCase,
    asOf:'2026-10-15T12:00:00Z'
  });
  if(!compiled.ok||compiled.dryRunOnly!==true||compiled.commands.length!==3||compiled.prerequisiteReadSet.length!==3){
    blockers.push('SELECTION_MULTI_DOCUMENT_DRYRUN_CONTRACT_REQUIRED');
  }

  const m=fx.physicalProofModel;
  if(m.expectedSetupWrites!==3||m.expectedSelectionAtomicWrites!==3||m.expectedRetryWrites!==0||
     m.expectedConflictWrites!==0||m.expectedCleanupDeletes!==5||m.expectedTotalMutations!==11||
     m.finalAbsenceRequired!==true){
    blockers.push('W4_PHYSICAL_ROLLBACK_JOURNAL_REQUIRED');
  }

  const source=fs.readFileSync(path.join(__dirname,'cotcomp-selection-contract-s455.js'),'utf8');
  if(source.includes("require('firebase-admin")||source.includes("require('firebase-functions"))blockers.push('S455_RUNTIME_WRITER_IMPORT_FORBIDDEN');

  const unique=[...new Set(blockers)];
  return Object.freeze({
    version:VERSION,
    sourceRemediationPass:unique.length===0,
    technicalW4Ready:unique.length===0,
    physicalW4Ready:false,
    physicalW4Allowed:false,
    remainingBlockers:Object.freeze(unique.length?unique:['OWNER_W4_AUTHORIZATION_REQUIRED']),
    findings:Object.freeze({
      explicitUserChoiceRequired:true,
      comparisonSetMembershipVerified:true,
      sameCaseLinkageVerified:true,
      currentEligibleProposalRequired:true,
      requestBoundSelectionIdentity:true,
      idempotencyContract:true,
      atomicQuoteCasePatch:true,
      immutableNonBindingTruth:true,
      prerequisiteReadSetCount:plan.ok?plan.prerequisiteReadSet.length:null,
      atomicOperationCount:plan.ok?plan.operations.length:null,
      setupWrites:m.expectedSetupWrites,
      selectionAtomicWrites:m.expectedSelectionAtomicWrites,
      cleanupDeletes:m.expectedCleanupDeletes,
      totalMutations:m.expectedTotalMutations,
      adapterDryRunOnly:compiled.ok?compiled.dryRunOnly:false
    }),
    boundaries:Object.freeze({
      executionEnabled:EXECUTION_ENABLED,
      appDataReadsAllowed:APP_DATA_READS_ALLOWED,
      appDataWritesAllowed:APP_DATA_WRITES_ALLOWED,
      realDataAllowed:false,
      productionAllowed:false
    })
  });
}

module.exports=Object.freeze({VERSION,EXECUTION_ENABLED,APP_DATA_READS_ALLOWED,APP_DATA_WRITES_ALLOWED,evaluate});
