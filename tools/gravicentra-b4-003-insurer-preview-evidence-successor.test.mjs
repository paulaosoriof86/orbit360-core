import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  insurerPreviewEvidenceContract as k,
  validateInsurerPreviewEvidenceData
} from './gravicentra-b4-003-insurer-preview-evidence-successor.mjs';

function fixture() {
  const current=JSON.parse(fs.readFileSync(k.control,'utf8'));
  const before=structuredClone(current);
  delete before[k.key];
  const receipt=JSON.parse(fs.readFileSync(k.evidence,'utf8'));
  const guardReceipt=JSON.parse(fs.readFileSync(k.guardReceipt,'utf8'));
  const blobs={
    evidenceBlob:k.evidenceBlob,
    sourceControlBlob:k.sourceControlBlob,
    baseControlBlob:k.baseControlBlob,
    baseGuardBlob:k.baseGuardBlob,
    guardBlob:guardReceipt.governanceBlobs[k.guard],
    validatorBlob:guardReceipt.governanceBlobs[k.validator],
    testBlob:guardReceipt.governanceBlobs[k.test],
    ledgerBlob:guardReceipt.frozenBlobs[k.ledger],
    carryBlob:guardReceipt.frozenBlobs[k.carry],
    compositionBlob:guardReceipt.frozenBlobs[k.composition],
    masterBlob:guardReceipt.frozenBlobs[k.master]
  };
  return {before,current,receipt,guardReceipt,...blobs};
}

function rejected(mutator,reason) {
  const f=fixture();
  mutator(f);
  assert.throws(()=>validateInsurerPreviewEvidenceData(f),
    new RegExp('B4_003_INSURER_PREVIEW_EVIDENCE_'+reason));
}

test('accepts bounded exact insurer preview evidence without gate advancement',()=>{
  assert.deepEqual(validateInsurerPreviewEvidenceData(fixture()),{
    technicalPreviewReadback:'PASS',backendSourceComparisons:66,
    priorControlKeys:427,currentControlKeys:428,formalI6Percent:50,
    p0Closed:1,p0Total:6,clientEditorChanged:false,
    productionAccepted:false,capabilityClosed:false
  });
});

test('rejects missing previous control keys',()=>rejected(f=>{
  delete f.before[Object.keys(f.before)[0]];
},'CONTROL_KEY_COUNTS_INVALID'));

test('rejects changed historical control content',()=>rejected(f=>{
  f.current[Object.keys(f.before)[0]]={unauthorized:'edit'};
},'FROZEN_CONTROL_CHANGED'));

test('rejects an extra control-plane key',()=>rejected(f=>{
  f.current.unauthorizedExtraKey=true;
},'CONTROL_KEY_COUNTS_INVALID'));

test('rejects retrospective evidence claiming formal gate closure',()=>rejected(f=>{
  f.current[k.key].b4003Closed=true;
},'CONTROL_POINTER_INVALID'));

test('rejects retrospective evidence claiming authenticated UAT acceptance',()=>rejected(f=>{
  f.current[k.key].authenticatedUatFullyAccepted=true;
},'CONTROL_POINTER_INVALID'));

test('rejects unpinned source control blob',()=>rejected(f=>{
  f.sourceControlBlob='a'.repeat(40);
  f.guardReceipt.sourceControlBlob=f.sourceControlBlob;
},'CONTROL_POINTER_INVALID'));

test('rejects preview result digest substitution',()=>rejected(f=>{
  f.receipt.technicalPreview.hostedPayloadDigest='a'.repeat(64);
},'PREVIEW_TECHNICAL_PROOF_INVALID'));

test('rejects reduced backend source comparisons',()=>rejected(f=>{
  f.receipt.technicalPreview.backendSourceComparisons=65;
},'PREVIEW_TECHNICAL_PROOF_INVALID'));

test('rejects any live deployment recorded in evidence',()=>rejected(f=>{
  f.receipt.technicalPreview.liveDeployment=true;
},'PREVIEW_TECHNICAL_PROOF_INVALID'));

test('rejects business-data writes',()=>rejected(f=>{
  f.receipt.technicalPreview.businessDataWrites=1;
},'PREVIEW_TECHNICAL_PROOF_INVALID'));

test('rejects mismatched independently checked archive digest',()=>rejected(f=>{
  f.receipt.artifactEvidence.combinedPreviewZipSha256='a'.repeat(64);
},'ARTIFACT_EVIDENCE_SCOPE_INVALID'));

test('keeps original incomplete subreadback distinct from final proof',()=>rejected(f=>{
  f.receipt.artifactEvidence.historicalSubreadbackSourceBytesProofCompleted=true;
},'ARTIFACT_EVIDENCE_SCOPE_INVALID'));

test('does not claim independently downloaded live identity ZIP',()=>rejected(f=>{
  f.receipt.artifactEvidence.liveIdentityEvidenceBasis='INDEPENDENT_ZIP_READ';
},'ARTIFACT_EVIDENCE_SCOPE_INVALID'));

test('rejects formal I6 progress inflation',()=>rejected(f=>{
  f.receipt.humanEvidence.formalI6ProgressPercent=100;
},'SCOPE_OR_GATE_EXPANDED'));

test('rejects new release authority in receipt',()=>rejected(f=>{
  f.receipt.boundaries.newReleaseAuthority=true;
},'SCOPE_OR_GATE_EXPANDED'));

test('rejects an extra guard-path change',()=>rejected(f=>{
  f.guardReceipt.guardPaths.push('src/example.ts');
},'GUARD_RECEIPT_INVALID'));

test('rejects changed predecessor guard blob',()=>rejected(f=>{
  f.guardReceipt.baseGuardBlob='a'.repeat(40);
},'GUARD_RECEIPT_INVALID'));

test('rejects release authority in guard successor itself',()=>rejected(f=>{
  f.guardReceipt.boundaries.newReleaseAuthority=true;
},'GUARD_RECEIPT_INVALID'));

test('rejects frozen ledger changes',()=>rejected(f=>{
  f.guardReceipt.frozenBlobs[k.ledger]='a'.repeat(40);
},'GUARD_RECEIPT_INVALID'));
