'use strict';
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const digest=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const gitSha=x=>/^[a-f0-9]{40}$/.test(x);
const artDigest=x=>/^sha256:[a-f0-9]{64}$/.test(x);
const version=x=>/^sites\/ays-orbit-360-lab\/versions\/[a-zA-Z0-9_-]+$/.test(x);
function releaseBinding(release) {
  assert.ok(gitSha(release.sourceSha)&&gitSha(release.sourceTree)&&gitSha(release.manifestBlob)&&gitSha(release.compositionBlob),'RELEASE_SOURCE_BINDING');
  assert.ok(artDigest(release.artifactDigest)&&Number.isSafeInteger(release.artifactId)&&release.artifactId>0,'RELEASE_ARTIFACT_BINDING');
  assert.ok(version(release.hostingVersion)&&release.buildId&&Number.isSafeInteger(release.files)&&release.files>0,'RELEASE_HOSTING_BINDING');
  return release;
}
function validateRequest(request,control) {
  assert.equal(request.schema,'GI_I66_FRONTEND_PROMOTION_V1');
  assert.equal(request.gate,'I6.6');assert.equal(request.scope,'FRONTEND_ONLY');
  assert.equal(request.generation,(control.generation||0)+1,'RELEASE_GENERATION_CAS');
  assert.ok(gitSha(request.approvalBlob)&&gitSha(request.guardBlob),'RELEASE_AUTHORITY_MISSING');
  assert.equal(request.guardBlob,control.guardBlob,'RELEASE_STALE_GUARD');
  assert.equal(request.previousReceiptBlob,control.receiptBlob,'RELEASE_PREDECESSOR_RECEIPT_DRIFT');
  assert.ok(!control.consumed?.includes(request.approvalBlob),'RELEASE_AUTHORIZATION_CONSUMED');
  assert.deepEqual(request.previous,control.physical,'RELEASE_CONTROL_DRIFT');
  releaseBinding(request.target);
  assert.notEqual(request.target.sourceSha,request.previous.sourceSha,'RELEASE_NO_PRODUCT_CHANGE');
  assert.notEqual(request.target.artifactDigest,request.previous.artifactDigest,'RELEASE_SAME_ARTIFACT');
}
function verifyBytes(binding,proof) {
  assert.equal(proof.sourceSha,binding.sourceSha,'RELEASE_BYTE_SOURCE');
  assert.equal(proof.artifactDigest,binding.artifactDigest,'RELEASE_BYTE_DIGEST');
  assert.equal(proof.buildId,binding.buildId,'RELEASE_BYTE_BUILD');
  assert.equal(proof.hostingVersion,binding.hostingVersion,'RELEASE_BYTE_HOSTING_VERSION');
  assert.equal(proof.firebase,binding.files,'RELEASE_FIREBASE_INCOMPLETE');
  assert.equal(proof.custom,binding.files,'RELEASE_CUSTOM_INCOMPLETE');
  assert.ok(artDigest(proof.manifestDigest),'RELEASE_READBACK_MANIFEST');
}
async function promote(io,request) {
  const key=digest(request);let j=await io.readJournal(request.generation);
  if(j){
    assert.equal(j.key,key,'RELEASE_DIFFERENT_AUTHORITY_AT_GENERATION');
    if(j.phase==='COMMITTED'){
      await io.verifyCommitted(j);return j;
    }
    assert.ok(['PREPARED','PROMOTING','VERIFIED'].includes(j.phase),'RELEASE_TERMINAL_INCIDENT');
  }
  try{
  const control=await io.readControl();
  validateRequest(request,control);
  await io.validateProofs(request);
  if(!j){
    const backup=await io.verifyLive(request.previous);
    verifyBytes(request.previous,backup);
    const preview=await io.verifyPreview(request.target);
    assert.equal(preview.files,request.target.files,'RELEASE_PREVIEW_FILE_COUNT');
    assert.equal(preview.artifactDigest,request.target.artifactDigest,'RELEASE_PREVIEW_DIGEST');
    assert.equal(preview.hostingVersion,request.target.hostingVersion,'RELEASE_PREVIEW_VERSION');
    j=await io.cas(null,{phase:'PREPARED',key,generation:request.generation,request,backup,preview});
  }
    if(j.phase==='PREPARED'){
      assert.equal(await io.currentVersion(),request.previous.hostingVersion,'RELEASE_LIVE_DRIFT_BEFORE_PROMOTE');
      j=await io.cas(j,{...j,phase:'PROMOTING'});
    }
    if(j.phase==='PROMOTING'){
      const current=await io.currentVersion();
      assert.ok([request.previous.hostingVersion,request.target.hostingVersion].includes(current),'RELEASE_FOREIGN_VERSION');
      if(current===request.previous.hostingVersion){
        await io.assertOwnership(j);
        await io.clone(request.target.hostingVersion,request.previous.hostingVersion);
      }
      const physical=await io.verifyLive(request.target);
      verifyBytes(request.target,physical);
      j=await io.cas(j,{...j,phase:'VERIFIED',physical});
    }
    await io.assertOwnership(j);
    const proof=await io.liveUiProof(j);
    assert.ok(gitSha(proof.receiptBlob)&&proof.buildId===request.target.buildId&&proof.result==='PASS','RELEASE_LIVE_UI_RECEIPT_ABSENT');
    const receipt=await io.signedReceipt(j,proof);
    assert.ok(receipt.verified&&gitSha(receipt.blob)&&gitSha(receipt.commit),'RELEASE_SIGNED_RECEIPT_ABSENT');
    assert.equal(await io.currentVersion(),request.target.hostingVersion,'RELEASE_LIVE_DRIFT_BEFORE_COMMIT');
    return await io.commitAll(j,{...j,phase:'COMMITTED',receipt,liveUi:proof});
  }catch(error){
    // A lost response to the atomic metadata commit must never roll back a
    // release whose signed receipt and control pointers were already committed.
    const actual=await io.readJournal(request.generation);
    if(actual?.phase==='COMMITTED' && actual.key===key){await io.verifyCommitted(actual);return actual;}
    if(actual?.key!==key)throw error;
    let state='INCIDENT',rollback;
    try{
      const physical=await io.currentVersion();
      if(physical===request.target.hostingVersion){
        await io.assertCompensationOwnership(actual);
        await io.clone(request.previous.hostingVersion,request.target.hostingVersion);
      }else if(physical!==request.previous.hostingVersion)throw Error('RELEASE_ROLLBACK_FOREIGN_VERSION');
      rollback=await io.verifyLive(request.previous);verifyBytes(request.previous,rollback);state='ROLLED_BACK';
    }catch(recoveryError){rollback={reason:String(recoveryError.message).slice(0,100)};}
    await io.incident(actual,{...actual,phase:state,rollback,reason:String(error.message).slice(0,100)});
    throw error;
  }
}
module.exports={promote,validateRequest,verifyBytes,releaseBinding,digest};
