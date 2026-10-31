import test from 'node:test';
import assert from 'node:assert/strict';
import {collectInsurerTransportBindingModel,validateInsurerTransportBindingModel,
  insurerTransportBindingContract,insurerTransportSourcePaths} from './gravicentra-b4-003-insurer-transport-binding-successor.mjs';
const k=insurerTransportBindingContract;
const model=collectInsurerTransportBindingModel();
const reject=(mutation,pattern)=>{const m=structuredClone(model);mutation(m);assert.throws(()=>validateInsurerTransportBindingModel(m),pattern);};
test('the only source change is the five-file additive transport binding successor',()=>{
  assert.equal(insurerTransportSourcePaths.length,5);
  assert.equal(validateInsurerTransportBindingModel(model).productSourceChanged,false);
});
test('old control and corrected progress cannot be rewritten',()=>{
  reject(m=>m.control.b4003InsurerOperationTimestampReadback20261031.progress.priorityP0.closed=2,/HISTORICAL_CONTROL_CHANGED/);
  reject(m=>m.control[k.key].livePromotionAuthorized=true,/TRANSPORT_POINTER_INVALID/);
});
test('same failed workflow and exact field mismatch must remain traceable',()=>{
  reject(m=>m.receipt.failedAttempt.failureCode='SOURCE_CHANGED',/EXACT_FAILED_WORKFLOW_UNBOUND/);
  reject(m=>m.receipt.correction.exactSourceBytesRequired=0,/REPAIR_SCOPE_INVALID/);
  reject(m=>m.receipt.priorReceiptBlobSha='0'.repeat(40),/FROZEN_PREVIOUS_PROOFS_CHANGED/);
});
test('no production, IAM, backend or data authority can leak into the correction',()=>{
  for(const f of ['livePromotion','authIamRules','configPatch','backendDeployment','businessWrites',
    'cleanup','findingClosure','b4003Closure','productionAcceptance'])
    reject(m=>m.receipt.boundaries[f]=true,/MUTATION_OR_CLOSURE_AUTHORIZED/);
});
test('the new source and guard hashes stay bound to their receipt',()=>{
  reject(m=>m.receipt.governanceBlobs[k.validator]='0'.repeat(40),/BLOB_BINDING_MISMATCH/);
  reject(m=>m.guardText='fake',/FROZEN_PREVIOUS_PROOFS_CHANGED/);
});
