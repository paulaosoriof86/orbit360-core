'use strict';

const writerInterface = require('./cotcomp-persistence-writer-interface');
const storagePolicy = require('./cotcomp-lab-storage-adapter-candidate');
const security = require('./cotcomp-negative-security-contract');

const VERSION = 'ays-cotcomp-secure-writer-envelope-s425-v0.1';
const EXECUTION_ENABLED = false;
const WRITES_ENABLED = false;
const DEPENDENCY_CALLS_ALLOWED = false;

function serverContextFor(tenantId){
  return {
    actorType:'SERVER_COTCOMP_WRITER',
    tenantId,
    publicBrowser:false
  };
}

function buildInitialHandoffEnvelope({
  deps = {},
  input = {},
  existingIdempotencyRecord = null,
  incomingRequestDigest = ''
} = {}){
  const writer=writerInterface.createWriter(deps);
  const preview=writer.previewInitialHandoff(input);
  const context=storagePolicy.validateServerContext(serverContextFor(input.tenantId));
  const replay=security.evaluateIdempotencyReplay({
    existingRequestDigest:existingIdempotencyRecord && existingIdempotencyRecord.requestDigest,
    incomingRequestDigest
  });
  const dryRunSafety=security.validateDryRunSummary(preview);

  const securityPreflightPass =
    writer.dependencyState.ok === true &&
    context.ok === true &&
    replay.ok === true &&
    dryRunSafety.ok === true &&
    preview.ok === true;

  return {
    version:VERSION,
    operation:'INITIAL_HANDOFF',
    securityPreflightPass,
    effectiveExecutionAllowed:false,
    executionEnabled:EXECUTION_ENABLED,
    writesEnabled:WRITES_ENABLED,
    dependencyCallsAllowed:DEPENDENCY_CALLS_ALLOWED,
    dependencyState:writer.dependencyState,
    context,
    replay,
    dryRunSafety,
    preview
  };
}

function buildProposalEnvelope({deps = {},input = {}} = {}){
  const writer=writerInterface.createWriter(deps);
  const preview=writer.previewProposal(input);
  const tenantId=input && input.proposal && input.proposal.tenantId;
  const context=storagePolicy.validateServerContext(serverContextFor(tenantId));
  return {
    version:VERSION,
    operation:'PROPOSAL',
    securityPreflightPass:writer.dependencyState.ok===true && context.ok===true && preview.ok===true,
    effectiveExecutionAllowed:false,
    executionEnabled:EXECUTION_ENABLED,
    writesEnabled:WRITES_ENABLED,
    dependencyCallsAllowed:DEPENDENCY_CALLS_ALLOWED,
    dependencyState:writer.dependencyState,
    context,
    preview
  };
}

function buildSelectionEnvelope({deps = {},input = {}} = {}){
  const writer=writerInterface.createWriter(deps);
  const preview=writer.previewSelection(input);
  const context=storagePolicy.validateServerContext(serverContextFor(input.tenantId));
  return {
    version:VERSION,
    operation:'SELECTION',
    securityPreflightPass:writer.dependencyState.ok===true && context.ok===true && preview.ok===true,
    effectiveExecutionAllowed:false,
    executionEnabled:EXECUTION_ENABLED,
    writesEnabled:WRITES_ENABLED,
    dependencyCallsAllowed:DEPENDENCY_CALLS_ALLOWED,
    dependencyState:writer.dependencyState,
    context,
    preview
  };
}

function buildPublicResponseEnvelope(payload){
  const safety=security.validatePublicPayload(payload);
  return {
    version:VERSION,
    ok:safety.ok,
    safety,
    payload:safety.ok ? payload : null
  };
}

function assertExecutionClosed(){
  const error=new Error('COTCOMP_SECURE_WRITER_EXECUTION_DISABLED');
  error.code='COTCOMP_SECURE_WRITER_EXECUTION_DISABLED';
  throw error;
}

module.exports=Object.freeze({
  VERSION,
  EXECUTION_ENABLED,
  WRITES_ENABLED,
  DEPENDENCY_CALLS_ALLOWED,
  serverContextFor,
  buildInitialHandoffEnvelope,
  buildProposalEnvelope,
  buildSelectionEnvelope,
  buildPublicResponseEnvelope,
  assertExecutionClosed
});
