'use strict';
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const digest=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const gitSha=x=>/^[a-f0-9]{40}$/.test(x);
const artDigest=x=>/^sha256:[a-f0-9]{64}$/.test(x);
const version=x=>/^sites\/ays-orbit-360-lab\/versions\/[a-zA-Z0-9_-]+$/.test(x);
function releaseBinding(release) {
  assert.ok(gitSha(release.sourceSha)&&gitSha(release.sourceTree)&&gitSha(release.manifestBlob)&&gitSha(release.compositionBlob),'RELEASE_SOURCE_BINDING');
  assert.ok(artDigest(release.artifactDigest),'RELEASE_ARTIFACT_BINDING');
  if(release.executionProvider===undefined){
    assert.ok(Number.isSafeInteger(release.artifactId)&&release.artifactId>0,'RELEASE_ARTIFACT_BINDING');
  }else{
    assert.equal(release.executionProvider,'CLOUD_BUILD','RELEASE_EXECUTION_PROVIDER_UNKNOWN');
    require('./gravicentra-i6-6-cloud-build-preview.cjs').artifactIdentity(
      release.sourceSha,release.buildRunId,release.artifactId,release.artifactDigest);
  }
  assert.ok(version(release.hostingVersion)&&release.buildId&&Number.isSafeInteger(release.files)&&release.files>0,'RELEASE_HOSTING_BINDING');
  return release;
}
function validateRequest(request,control) {
  assert.equal(request.schema,'GI_I66_FRONTEND_PROMOTION_V1');
  assert.equal(request.gate,'I6.6');assert.ok(['FRONTEND_ONLY','COMPOSITE'].includes(request.scope),'RELEASE_SCOPE_UNKNOWN');
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
  assert.equal(request.scope,'FRONTEND_ONLY','COMPOSITE_MUST_CONSUME_EXECUTED_LIVE_PROOF');
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
function validateCompositeProof(request,proof){
  assert.equal(request.scope,'COMPOSITE','COMPOSITE_SCOPE_REQUIRED');
  const g=require('./gravicentra-i6-6-operational-release-candidate.cjs'),p=request.candidate;
  assert.equal(p?.opsLeadsComposite,true,'COMPOSITE_FOUR_FUNCTION_CANDIDATE_REQUIRED');
  assert.equal(request.target.executionProvider,p.executionProvider,'COMPOSITE_TARGET_IDENTITY_executionProvider');
  assert.equal(request.previous.executionProvider,p.currentLive?.executionProvider,'COMPOSITE_PREDECESSOR_executionProvider');
  g.validateLiveProof(p,proof);
  const count=g.targetsForCandidate(p,'live').length;
  assert.equal(proof.backendRevisions.length,count,p.makeIngressComposite===true?'COMPOSITE_FIVE_EFFECTIVE_REVISIONS_REQUIRED':'COMPOSITE_FOUR_EFFECTIVE_REVISIONS_REQUIRED');
  for(const key of ['sourceSha','artifactId','artifactDigest','buildId','buildRunId'])
    assert.equal(request.target[key],p[key],'COMPOSITE_TARGET_IDENTITY_'+key);
  assert.equal(request.target.previewUrl,p.previewUrl,'COMPOSITE_PREVIEW_ORIGIN');
  assert.equal(request.target.previewChannel,p.previewChannelId,'COMPOSITE_PREVIEW_CHANNEL');
  assert.equal(request.target.hostingVersion,proof.liveHostingVersion,'COMPOSITE_PHYSICAL_VERSION');
  assert.equal(request.target.files,p.expectedSiteFileCount,'COMPOSITE_FILE_COUNT');
  for(const key of ['sourceSha','artifactId','artifactDigest','buildId','buildRunId','hostingVersion'])
    assert.equal(request.previous[key],p.currentLive[key],'COMPOSITE_PREDECESSOR_'+key);
  if(p.makeIngressComposite===true){
    const binding=request.financialQa;
    assert.equal(binding?.scopeId,'SIX_RECEIPT_CURRENT_BALANCE_READONLY','COMPOSITE_FINANCIAL_SCOPE_REQUIRED');
    assert.ok(gitSha(binding.authorityBlob)&&gitSha(binding.parentAuthorityBlob));
    assert.equal(binding.parentAuthorityBlob,request.approvalBlob,'COMPOSITE_FINANCIAL_PARENT_AUTHORITY_DRIFT');
    assert.equal(binding.previewReceiptPath,p.financialPreviewQa?.receiptPath);
    assert.equal(binding.previewReceiptBlob,p.financialPreviewQa?.receiptBlob);assert.ok(gitSha(binding.previewReceiptBlob));
  }
  return proof;
}
function compositeFinancialUiReceipt(request,journal,report){
  const b=request.financialQa;
  if(request.target.executionProvider!==undefined)
    assert.equal(request.target.executionProvider,'CLOUD_BUILD','RELEASE_EXECUTION_PROVIDER_UNKNOWN');
  return {schema:'GI_I66_FRONTEND_FINANCIAL_READONLY_UI_RECEIPT_V1',generation:journal.generation,scopeId:b.scopeId,
    ...(request.target.executionProvider===undefined?{}:{executionProvider:request.target.executionProvider}),
    releaseScope:'COMPOSITE',authorityBlob:b.authorityBlob,parentAuthorityBlob:b.parentAuthorityBlob,
    sourceSha:request.target.sourceSha,artifactDigest:request.target.artifactDigest,buildId:request.target.buildId,
    physicalPhaseKey:journal.key,result:'PASS',readOnly:true,fullA04Accepted:false,fullA12Passed:false,
    reportSha256:crypto.createHash('sha256').update(JSON.stringify(report,null,2)+'\n').digest('hex'),financialQa:report};
}
function validateCompositeFinancialUi(request,journal,observed,{committedReadback=false}={}){
  assert.equal(journal.phase,committedReadback?'COMMITTED':'VERIFIED','COMPOSITE_FINANCIAL_QA_MUST_FOLLOW_VERIFIED');
  assert.equal(observed?.result,'PASS');assert.equal(observed.scopeId,request.financialQa.scopeId);
  assert.equal(observed.generation,request.generation);assert.equal(observed.physicalPhaseKey,journal.key);
  assert.equal(observed.authorityBlob,request.financialQa.authorityBlob);assert.equal(observed.parentAuthorityBlob,request.approvalBlob);
  for(const key of ['sourceSha','artifactDigest','buildId'])assert.equal(observed[key],request.target[key]);
  assert.equal(observed.runId,journal.liveProof.runId);
  assert.equal(observed.receiptPath,require('./gravicentra-i66-frontend-control.cjs').genName(journal.generation,'LIVE_UI'));
  const report=observed.financialQa;
  assert.equal(observed.executionProvider,request.target.executionProvider,'COMPOSITE_FINANCIAL_UI_PROVIDER_DRIFT');
  assert.equal(report?.executionProvider,request.target.executionProvider,'COMPOSITE_FINANCIAL_REPORT_PROVIDER_DRIFT');
  require('./gravicentra-i66-frontend-promotion-owner.cjs').validateFinancialReport(report,request.target,'live',
    {authorityBlob:request.financialQa.authorityBlob,parentAuthorityBlob:request.approvalBlob,
      physicalPhaseKey:journal.key,releaseScope:'COMPOSITE'});
  assert.equal(report.frontendQaBefore.runId,journal.liveProof.runId);
  for(const proof of [report.frontendQaBefore,report.frontendQaAfter])
    assert.equal(proof.generation,journal.generation,'COMPOSITE_FINANCIAL_REPORT_GENERATION_DRIFT');
  const receipt=compositeFinancialUiReceipt(request,journal,report);
  assert.equal(observed.reportSha256,receipt.reportSha256,'COMPOSITE_FINANCIAL_REPORT_HASH_DRIFT');
  assert.equal(observed.receiptBlob,require('./gravicentra-i66-frontend-control.cjs').blob(JSON.stringify(receipt,null,2)+'\n'),
    'COMPOSITE_FINANCIAL_UI_BYTES_DRIFT');
  const {financialQa,...compact}=observed;
  return compact;
}
// Acceptance of an already executed, signed composite release. Deployment and
// compensation remain owned by the exact LIVE workflow; this path never clones
// Hosting or fabricates a frontend-only promotion history.
async function acceptComposite(io,request,proof){
  validateCompositeProof(request,proof);
  const key=digest(request);let j=await io.readJournal(request.generation);
  if(j){
    assert.equal(j.key,key,'RELEASE_DIFFERENT_AUTHORITY_AT_GENERATION');
    if(j.phase==='COMMITTED'){await io.verifyCommitted(j);return j;}
    assert.equal(j.phase,'VERIFIED','COMPOSITE_ACCEPTANCE_NOT_RESUMABLE');
    assert.equal(j.operation,'ACCEPT_EXECUTED_COMPOSITE_LIVE');
    assert.deepEqual(j.liveProof,proof,'COMPOSITE_RESUME_PROOF_DRIFT');
  }
  try{
    const control=await io.readControl();validateRequest(request,control);
    const g=require('./gravicentra-i6-6-operational-release-candidate.cjs');
    assert.deepEqual(g.candidateForPhase(control.authorization,'live'),request.candidate,'COMPOSITE_LIVE_AUTHORIZATION_DRIFT');
    await io.validateProofs(request,proof);
    const [preview,physical]=await Promise.all([io.verifyPreview(request.target),io.verifyLive(request.target)]);
    verifyBytes(request.target,physical);
    assert.equal(preview.files,request.target.files,'RELEASE_PREVIEW_FILE_COUNT');
    assert.equal(preview.artifactDigest,request.target.artifactDigest,'RELEASE_PREVIEW_DIGEST');
    assert.equal(preview.hostingVersion,request.target.hostingVersion,'RELEASE_PREVIEW_VERSION');
    assert.equal(await io.currentVersion(),request.target.hostingVersion,'COMPOSITE_LIVE_CHANGED_BEFORE_ACCEPTANCE');
    if(!j)j=await io.cas(null,{phase:'VERIFIED',operation:'ACCEPT_EXECUTED_COMPOSITE_LIVE',key,
      generation:request.generation,request,preview,physical,liveProof:proof});
    await io.assertOwnership(j);
    if(request.candidate.makeIngressComposite===true){
      assert.equal(typeof io.financialLiveUiProof,'function','COMPOSITE_FINANCIAL_LIVE_UI_DRIVER_REQUIRED');
      const ui=validateCompositeFinancialUi(request,j,await io.financialLiveUiProof(j));
      if(j.financialUi)assert.deepEqual(j.financialUi,ui,'COMPOSITE_FINANCIAL_REPLAY_PROOF_DRIFT');
      else j=await io.cas(j,{...j,financialUi:ui});
      await io.assertOwnership(j);
    }
    const receipt=await io.signedReceipt(j);
    assert.ok(receipt.verified&&gitSha(receipt.blob)&&gitSha(receipt.commit),'RELEASE_SIGNED_RECEIPT_ABSENT');
    assert.equal(await io.currentVersion(),request.target.hostingVersion,'COMPOSITE_LIVE_CHANGED_BEFORE_COMMIT');
    return await io.commitAll(j,{...j,phase:'COMMITTED',receipt});
  }catch(error){
    // A lost acknowledgement after the atomic commit must never ask the outer
    // workflow to roll back an already accepted physical release.
    const actual=await io.readJournal(request.generation);
    if(actual?.phase==='COMMITTED'&&actual.key===key){await io.verifyCommitted(actual);return actual;}
    throw error;
  }
}
module.exports={promote,acceptComposite,validateCompositeProof,compositeFinancialUiReceipt,validateCompositeFinancialUi,validateRequest,verifyBytes,releaseBinding,digest};
