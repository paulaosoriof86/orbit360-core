import test from 'node:test';
import assert from 'node:assert/strict';
import {collectInsurerTimestampSuccessorModel,validateInsurerTimestampSuccessorModel,insurerTimestampContract,
  insurerTimestampSourcePaths} from './gravicentra-b4-003-insurer-timestamp-successor.mjs';

const k=insurerTimestampContract;
const base=collectInsurerTimestampSuccessorModel();
const clone=()=>structuredClone(base);
const reject=(mutate,pattern)=>{
  const m=clone();mutate(m);assert.throws(()=>validateInsurerTimestampSuccessorModel(m),pattern);
};
test('exact additive timestamp successor, historical guard prefix, all progress denominators',()=>{
  assert.deepEqual(insurerTimestampSourcePaths.length,7);
  assert.equal(validateInsurerTimestampSuccessorModel(base).status,'TIMESTAMP_SNAPSHOT_CONTRACT_VALIDATED');
});
test('existing control keys cannot be reinterpreted or rewritten',()=>{
  reject(m=>{m.control.b4003RealProgressReconciliation20261030.formalI6Progress.percent=60;},/FROZEN_CONTROL_FIELDS_CHANGED/);
  reject(m=>{m.control[k.key].progress.priorityP0.closed=2;},/CURRENT_PROGRESS_DENOMINATORS_INVALID/);
  reject(m=>{m.control[k.key].progress.currentOverallImplementationPercent=96;},/CURRENT_PROGRESS_DENOMINATORS_INVALID/);
});
test('prior failure evidence and its exact operation timestamp drift cannot be hidden',()=>{
  reject(m=>{m.receipt.failureEvidence.differingFields=['updateTime','serviceConfig'];},/FAILED_READBACK_CAUSE_UNBOUND/);
  reject(m=>{m.receipt.failureEvidence.currentFunctionUpdateTime='2026-10-31T01:05:12.368285930Z';},/FAILED_READBACK_CAUSE_UNBOUND/);
  reject(m=>{m.receipt.correctedContract.updateTimeRequiresValidMonotonicTimestamp=false;},/READBACK_CONTRACT_WEAKENED/);
  reject(m=>{m.receipt.correctedContract.exactBackendSourceComparisonsRequired=0;},/READBACK_CONTRACT_WEAKENED/);
});
test('production, permissions, writes and closure remain forbidden',()=>{
  for(const flag of ['productionPromotion','liveDeployment','authIamRulesChange','businessDataWrites',
    'backendCodeDeployment','configurationPatch','cleanup','findingClosed','b4003Closed',
    'productionAccepted','authenticatedUatAccepted'])
    reject(m=>{m.receipt.boundaries[flag]=true;},/SCOPE_EXPANDED/);
});
test('historical recipe, exact source hashes and Guard inheritance are immutable',()=>{
  reject(m=>{m.receipt.priorReadbackReceiptBlobSha='0'.repeat(40);},/FROZEN_GOVERNANCE_NOT_PRESERVED/);
  reject(m=>{m.guardText='fake';},/FROZEN_GOVERNANCE_NOT_PRESERVED/);
  reject(m=>{m.receipt.governanceBlobs[k.readback]='0'.repeat(40);},/SOURCE_BLOB_MISMATCH/);
  reject(m=>{m.untracked.push('new-product-file.js');},/EXACT_ATOMIC_SOURCE_AND_TRANSPORT_DIFF_REQUIRED|UNEXPECTED_UNTRACKED_CONTENT/);
});
