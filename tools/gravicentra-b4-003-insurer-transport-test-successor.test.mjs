import test from 'node:test';
import assert from 'node:assert/strict';
import {collectInsurerTransportTestModel,validateInsurerTransportTestModel,insurerTransportTestContract,
  insurerTransportTestPaths} from './gravicentra-b4-003-insurer-transport-test-successor.mjs';
const k=insurerTransportTestContract,m=collectInsurerTransportTestModel();
const reject=(mutate,re)=>{const x=structuredClone(m);mutate(x);assert.throws(()=>validateInsurerTransportTestModel(x),re);};
test('previous 425 control keys, one five-file source successor and no product change',()=>{
  assert.equal(insurerTransportTestPaths.length,5);
  assert.equal(validateInsurerTransportTestModel(m).productSourceChanged,false);
});
test('formal I6, P0 closure and 96 percent historical interpretation are frozen',()=>{
  reject(x=>x.control.b4003InsurerOperationTimestampReadback20261031.progress.priorityP0.closed=2,/PREVIOUS_CONTROL_NOT_FROZEN/);
  reject(x=>x.control[k.key].newProductionPermission=true,/POINTER_INVALID/);
});
test('source proof and current test selector cannot be bypassed',()=>{
  reject(x=>x.receipt.correction.testRunsAgainstCurrentSuccessor=false,/CAUSAL_PREVIEW_ROUTE_NOT_PROVEN/);
  reject(x=>x.receipt.correction.exactWorkflowReplacements=2,/CAUSAL_PREVIEW_ROUTE_NOT_PROVEN/);
  reject(x=>x.receipt.boundaries.sourceProofBypass=true,/SOURCE_OR_PRODUCTION_SCOPE_EXPANDED/);
});
test('historical receipts, guard prefix and new source hashes remain exact',()=>{
  reject(x=>x.receipt.priorReceiptBlobSha='0'.repeat(40),/PREVIOUS_EVIDENCE_BYTES_CHANGED/);
  reject(x=>x.guardText='fake',/PREVIOUS_EVIDENCE_BYTES_CHANGED/);
  reject(x=>x.receipt.governanceBlobs[k.validator]='0'.repeat(40),/CURRENT_GOVERNANCE_BLOB_MISMATCH/);
});
