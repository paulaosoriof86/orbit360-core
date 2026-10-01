'use strict';

const crypto = require('node:crypto');
const planner = require('./cotcomp-persistence-plan');

const VERSION = 'ays-cotcomp-persistence-adapter-candidate-s421-v0.1';
const EXECUTION_ENABLED = false;
const WRITES_ENABLED = false;
const FIRESTORE_IMPORTED = false;
const DRY_RUN_ONLY = true;

function digest(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value == null ? null : value),'utf8').digest('hex');
}

function flattenPlan(plan) {
  if (!plan || plan.ok !== true || !Array.isArray(plan.phases)) {
    return { ok:false, code:'PERSISTENCE_PLAN_INVALID', commands:[] };
  }
  const commands=[];
  for (const phase of plan.phases) {
    for (const op of phase.operations || []) {
      commands.push({
        phase:phase.phase,
        atomicGroup:phase.atomicGroup,
        blocked:op.blocked === true || phase.blockedByUndeployedWorkflowSchema === true,
        blockReason:op.blockReason || (phase.blockedByUndeployedWorkflowSchema ? 'WORKFLOW_COTCOMP_SCHEMA_NOT_DEPLOYED' : null),
        type:op.type,
        entity:op.entity,
        path:op.path,
        payloadDigest:digest(op.payload || op.requiredFields || null),
        hasPayload:op.payload != null,
        hasRequiredFields:op.requiredFields != null
      });
    }
  }
  return {ok:true,commands};
}

function compileInitialHandoff(input = {}) {
  const plan=planner.buildInitialHandoffPlan(input);
  if (!plan.ok) return {ok:false,code:plan.code,plan,commands:[]};
  const flat=flattenPlan(plan);
  return {
    ok:true,
    version:VERSION,
    dryRunOnly:DRY_RUN_ONLY,
    executionEnabled:EXECUTION_ENABLED,
    writesEnabled:WRITES_ENABLED,
    firestoreImported:FIRESTORE_IMPORTED,
    gate:plan.gate,
    identifiers:plan.identifiers,
    commands:flat.commands,
    blockers:plan.blockers.slice(),
    executionOrder:plan.executionOrder.slice()
  };
}

function compileProposal(input = {}) {
  const plan=planner.buildProposalPlan(input);
  if (!plan.ok) return plan;
  return {
    ok:true,
    version:VERSION,
    dryRunOnly:DRY_RUN_ONLY,
    command:{
      type:plan.operation.type,
      path:plan.operation.path,
      payloadDigest:digest(plan.operation.payload)
    },
    comparisonEligibility:plan.comparisonEligibility
  };
}

function compileVersionedProposal(input = {}) {
  const plan=planner.buildVersionedProposalPlan(input);
  if (!plan.ok) return plan;
  return {
    ok:true,
    version:VERSION,
    dryRunOnly:DRY_RUN_ONLY,
    executionEnabled:EXECUTION_ENABLED,
    writesEnabled:WRITES_ENABLED,
    physicalW3Allowed:false,
    requestId:plan.requestId,
    requestDigest:plan.requestDigest,
    proposalId:plan.proposal.proposalId,
    proposalSeriesId:plan.proposal.proposalSeriesId,
    versionNumber:plan.proposal.versionNumber,
    atomic:plan.atomic===true,
    commands:plan.operations.map(op=>({
      type:op.type,
      entity:op.entity,
      path:op.path,
      expectedBeforeDigest:op.expectedBeforeDigest||null,
      payloadDigest:digest(op.payload||null)
    })),
    invariants:plan.invariants,
    comparisonEligibility:plan.comparisonEligibility
  };
}

function compileSelection(input = {}) {
  const plan=planner.buildSelectionPlan(input);
  if (!plan.ok) return plan;
  return {
    ok:true,
    version:VERSION,
    dryRunOnly:DRY_RUN_ONLY,
    command:{
      type:plan.operation.type,
      path:plan.operation.path,
      payloadDigest:digest(plan.operation.payload)
    },
    quoteCasePatch:plan.quoteCasePatch,
    truth:plan.truth
  };
}

function compileAtomicSelection(input = {}) {
  const plan=planner.buildAtomicSelectionPlan(input);
  if (!plan.ok) return plan;
  return {
    ok:true,
    version:VERSION,
    dryRunOnly:DRY_RUN_ONLY,
    executionEnabled:EXECUTION_ENABLED,
    writesEnabled:WRITES_ENABLED,
    physicalW4Allowed:false,
    atomic:plan.atomic===true,
    selectionRequestId:plan.selectionRequestId,
    requestDigest:plan.requestDigest,
    selectionId:plan.selection.selectionId,
    proposalId:plan.selection.proposalId,
    comparisonSetId:plan.selection.comparisonSetId,
    prerequisiteReadSet:plan.prerequisiteReadSet.map(x=>({
      entity:x.entity,path:x.path,expectedDigest:x.expectedDigest
    })),
    commands:plan.operations.map(op=>({
      type:op.type,
      entity:op.entity,
      path:op.path,
      expectedBeforeDigest:op.expectedBeforeDigest||null,
      payloadDigest:digest(op.payload||op.patch||null)
    })),
    invariants:plan.invariants,
    truth:plan.truth
  };
}

function executeCompiled() {
  const error=new Error('COTCOMP_PERSISTENCE_EXECUTION_DISABLED');
  error.code='COTCOMP_PERSISTENCE_EXECUTION_DISABLED';
  throw error;
}

module.exports=Object.freeze({
  VERSION,
  EXECUTION_ENABLED,
  WRITES_ENABLED,
  FIRESTORE_IMPORTED,
  DRY_RUN_ONLY,
  flattenPlan,
  compileInitialHandoff,
  compileProposal,
  compileVersionedProposal,
  compileSelection,
  compileAtomicSelection,
  executeCompiled
});
