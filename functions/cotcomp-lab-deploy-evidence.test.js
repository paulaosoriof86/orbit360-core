'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const d=require('./cotcomp-lab-deploy-evidence');

function sample(){
  return {
    projectId:'ays-orbit-360-lab',
    environment:'LAB',
    sourceSha:'a'.repeat(40),
    runId:'12345',
    artifactId:'67890',
    artifactDigest:'b'.repeat(64),
    readbackExact:true,
    backendSourceDigest:'c'.repeat(64),
    workflowOwnerBlob:d.EXPECTED.workflowOwnerBlob,
    writesExecuted:0,
    dataTouched:false,
    productionTouched:false,
    evidencePath:'artifacts/cotcomp/test-evidence.json'
  };
}

test('current deploy evidence remains absent',()=>{
  const s=d.currentDeployEvidenceStatus();
  assert.equal(s.cotcompLabDeployEvidencePresent,false);
});

test('complete LAB deploy evidence passes structurally',()=>{
  const r=d.validateLabDeployEvidence(sample());
  assert.equal(r.ok,true);
  assert.equal(r.value.writesExecuted,0);
  assert.equal(r.effectiveRuntimeAllowed,false);
});

test('wrong project fails closed',()=>{
  const r=d.validateLabDeployEvidence({...sample(),projectId:'other'});
  assert.equal(r.ok,false);
  assert.ok(r.reasons.includes('PROJECT_NOT_LAB'));
});

test('workflow owner blob mismatch fails closed',()=>{
  const r=d.validateLabDeployEvidence({...sample(),workflowOwnerBlob:'wrong'});
  assert.equal(r.ok,false);
  assert.ok(r.reasons.includes('WORKFLOW_OWNER_BLOB_MISMATCH'));
});

test('deploy evidence cannot include data writes or production touch',()=>{
  const r=d.validateLabDeployEvidence({...sample(),writesExecuted:1,dataTouched:true,productionTouched:true});
  assert.equal(r.ok,false);
  assert.ok(r.reasons.includes('DEPLOY_EVIDENCE_WRITES_MUST_BE_ZERO'));
  assert.ok(r.reasons.includes('DATA_TOUCH_FORBIDDEN'));
  assert.ok(r.reasons.includes('PRODUCTION_TOUCH_FORBIDDEN'));
});

test('exact readback is mandatory',()=>{
  const r=d.validateLabDeployEvidence({...sample(),readbackExact:false});
  assert.equal(r.ok,false);
  assert.ok(r.reasons.includes('READBACK_EXACT_REQUIRED'));
});
