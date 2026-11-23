'use strict';
const assert=require('node:assert/strict');
// A correction to an already-declared QA test is not a new product delta.
// Keep the original change/blobs immutable and admit only a linked successor.
function applyTestRevisions(manifest,tests,seenIds,{readBlob,readJson}){
  const revisions=manifest.testRevisions||[];
  assert.ok(Array.isArray(revisions),'QA_REVISIONS_ARRAY_REQUIRED');
  for(const revision of revisions){
    assert.match(revision.id||'',/^I6_6_[A-Z0-9_]+$/,'QA_REVISION_ID_INVALID');
    assert.ok(!seenIds.has(revision.id),'QA_REVISION_ID_REUSED');
    assert.equal(revision.approvedByDirection,true,'QA_REVISION_NOT_AUTHORIZED');
    assert.equal(revision.scope,'EXISTING_DECLARED_TESTS_ONLY','QA_REVISION_SCOPE_INVALID');
    assert.deepEqual(revision.paths,[],'QA_REVISION_CANNOT_AUTHORIZE_PRODUCT_PATHS');
    assert.ok(Array.isArray(revision.tests)&&revision.tests.length>0,'QA_REVISION_TESTS_REQUIRED');
    assert.match(revision.receipt||'',/^artifacts\/orbit360-recovery\/release-control\/[A-Z0-9_]+\.json$/,'QA_REVISION_RECEIPT_REQUIRED');
    assert.match(revision.receiptGitBlobSha||'',/^[0-9a-f]{40}$/,'QA_REVISION_RECEIPT_BLOB_REQUIRED');
    assert.equal(readBlob(revision.receipt),revision.receiptGitBlobSha,'QA_REVISION_RECEIPT_DRIFT');
    const receipt=readJson(revision.receipt);
    assert.equal(receipt.scope,revision.scope,'QA_REVISION_RECEIPT_SCOPE_DRIFT');
    assert.equal(receipt.productSourceChanges,0,'QA_REVISION_PRODUCT_CLAIM_FORBIDDEN');
    assert.equal(receipt.productionAcceptanceClaimed,false,'QA_REVISION_CANNOT_ACCEPT_RELEASE');
    assert.equal(receipt.revisionId,revision.id,'QA_REVISION_RECEIPT_ID_DRIFT');
    const seenPaths=new Set();
    for(const entry of revision.tests){
      assert.ok(!seenPaths.has(entry.path),'QA_REVISION_DUPLICATE_PATH');seenPaths.add(entry.path);
      const prior=tests.get(entry.path);
      assert.ok(prior,'QA_REVISION_UNKNOWN_TEST');
      assert.match(entry.gitBlobSha||'',/^[0-9a-f]{40}$/,'QA_REVISION_TEST_BLOB_REQUIRED');
      assert.notEqual(entry.gitBlobSha,prior.gitBlobSha,'QA_REVISION_MUST_CHANGE_TEST');
      assert.deepEqual(entry.replaces,{path:entry.path,priorGitBlobSha:prior.gitBlobSha,priorChangeId:prior.changeId},'QA_REVISION_PREDECESSOR_DRIFT');
      assert.notEqual(prior.changeId,revision.id,'QA_REVISION_SELF_SUPERSESSION');
    }
    assert.deepEqual(receipt.tests,revision.tests,'QA_REVISION_RECEIPT_TESTS_DRIFT');
    for(const entry of revision.tests)tests.set(entry.path,{gitBlobSha:entry.gitBlobSha,changeId:revision.id});
    seenIds.add(revision.id);
  }
  return tests;
}
module.exports={applyTestRevisions};
