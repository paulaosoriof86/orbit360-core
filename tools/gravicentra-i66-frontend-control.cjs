'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto'),path=require('node:path');
const dir='artifacts/orbit360-recovery/release-control/';
const P={cp:dir+'CONTROL_PLANE.json',transport:dir+'I6_6_RELEASE_TRANSPORT_CONTROL_20261110.json',
  ledger:dir+'CAPABILITY_STATUS_LEDGER.json',manifest:dir+'I6_6_APPROVED_PRODUCT_DELTA_MANIFEST_20261110.json',
  composition:dir+'I6_CANONICAL_ACCUMULATIVE_COMPOSITION_LOCK_20260924.json',state:'orbit360-platform/docs/recovery/orbit360-recovery-state-v1.json',
  authority:dir+'I6_6_FRONTEND_PROMOTION_AUTHORITY.json',guard:'tools/gravicentra-governance-preflight-v1.mjs',
  legacy:dir+'I6_6_FRONTEND_PREVERSIONED_CONTROL_VIEW.json'};
const serial=v=>JSON.stringify(v,null,2)+'\n';
const blob=body=>crypto.createHash('sha1').update('blob '+Buffer.byteLength(body)+'\0').update(body).digest('hex');
const genName=(n,suffix)=>{assert.ok(Number.isSafeInteger(n)&&n>0);return dir+'I6_6_FRONTEND_E'+String(n).padStart(5,'0')+'_'+suffix+'.json';};
function physicalGuard(control,state,transport,io){
  const head=control.i66FrontendReleaseHead;
  assert.ok(head&&Number.isSafeInteger(head.generation)&&head.generation>0,'I66_VERSIONED_FRONTEND_HEAD_MISSING');
  assert.equal(transport.frontendReleaseSequence,head.generation,'I66_TRANSPORT_GENERATION_DRIFT');
  assert.equal(control.currentExecutionDecisionPointer,'i66FrontendReleaseHead');
  assert.equal(state.currentExecutionDecisionPointer,P.cp+'#i66FrontendReleaseHead');
  assert.deepEqual(state.currentPhysicalFrontend,head);
  assert.equal(head.gate,'I6.6');assert.equal(head.fullI66ProductionAccepted,false);
  const read=p=>io.readFileSync(p,'utf8');
  assert.equal(head.receiptPath,genName(head.generation,'RECEIPT'));
  assert.equal(blob(read(head.receiptPath)),head.receiptGitBlobSha);
  const receipt=JSON.parse(read(head.receiptPath)),journal=JSON.parse(read(genName(head.generation,'JOURNAL')));
  assert.equal(journal.phase,'COMMITTED');assert.equal(journal.receipt.blob,head.receiptGitBlobSha);
  assert.equal(journal.receipt.commit,head.receiptCommit);assert.equal(journal.receipt.verified,true);
  assert.deepEqual(receipt.target,journal.request.target);assert.deepEqual(receipt.previous,journal.request.previous);
  assert.equal(receipt.preview.artifactDigest,receipt.target.artifactDigest);assert.equal(receipt.ui.result,'PASS');
  require('./gravicentra-i66-frontend-promotion-transaction.cjs').verifyBytes(receipt.target,receipt.physical);
  const target=receipt.target,physical=transport.currentPhysicalHostingRelease;
  assert.equal(receipt.generation,head.generation,'I66_RECEIPT_GENERATION');
  assert.ok(Number.isSafeInteger(target.files)&&target.files>0,'I66_SIGNED_FILE_COUNT_REQUIRED');
  assert.equal(head.hostedFilesEachOrigin,target.files,'I66_HEAD_FILE_COUNT_DRIFT');
  assert.equal(receipt.preview.files,target.files,'I66_PREVIEW_FILE_COUNT_DRIFT');
  assert.equal(receipt.preview.hostingVersion,target.hostingVersion,'I66_PREVIEW_VERSION_DRIFT');
  for(const key of ['sourceSha','sourceTree','manifestBlob','compositionBlob','artifactId','artifactDigest','buildId','buildRunId','previewUrl','hostingVersion']){
    assert.equal(head[key],target[key],'I66_HEAD_TARGET_DRIFT_'+key);
  }
  for(const key of ['sourceSha','buildId','artifactId','artifactDigest'])assert.equal(physical[key],target[key],'I66_TRANSPORT_TARGET_DRIFT_'+key);
  assert.equal(physical.liveHostingVersion,target.hostingVersion);
  assert.equal(physical.previewRunId,target.buildRunId);
  assert.equal(physical.readbackEachOrigin,target.files,'I66_TRANSPORT_FILE_COUNT_DRIFT');
  assert.equal(physical.receipt,head.receiptPath,'I66_TRANSPORT_RECEIPT_DRIFT');
  assert.deepEqual(transport.latestSignedPhysicalFrontendLivePointer20261122,head);
  assert.deepEqual(JSON.parse(read(P.ledger)).frontendReleaseHead,head);
  assert.equal(control.i66OperationalContinuation20261115.latestProvenLiveSource,head.sourceSha);
  assert.equal(control.i66ActiveRecoveryCursor.lastPhysicalLiveSourceSha,head.sourceSha);
  return head;
}
function closeFiles(read,j,body){
  const cp=read(P.cp),transport=read(P.transport),ledger=read(P.ledger),state=read(P.state);
  const c=cp.i66ActiveRecoveryCursor,t=j.request.target,n=j.generation;
  assert.equal(transport.currentPhysicalHostingRelease.liveHostingVersion,j.request.previous.hostingVersion);
  const changes={};
  if(!cp.i66FrontendReleaseHead){
    const legacy={decision:cp.currentExecutionDecisionPointer,work:cp.i66OperationalContinuation20261115,nextAction:cp.nextAction,
      stateDecision:state.currentExecutionDecisionPointer,hosting:transport.currentPhysicalHostingRelease,signed:transport.latestSignedPhysicalFrontendLivePointer20261122};
    changes[P.legacy]=legacy;cp.i66PreversionedControlViewBlob=blob(serial(legacy));
  }
  const receiptPath=genName(n,'RECEIPT');
  const head={generation:n,gate:'I6.6',status:'FOCAL_FRONTEND_LIVE_UI_VERIFIED',sourceSha:t.sourceSha,sourceTree:t.sourceTree,
    compositionBlob:t.compositionBlob,manifestBlob:t.manifestBlob,artifactId:t.artifactId,artifactDigest:t.artifactDigest,
    hostingVersion:t.hostingVersion,buildId:t.buildId,hostedFilesEachOrigin:t.files,previewUrl:t.previewUrl,buildRunId:t.buildRunId,
    rollback:j.request.previous.hostingVersion,receiptPath,receiptGitBlobSha:body.receipt.blob,receiptCommit:body.receipt.commit,
    fullI66ProductionAccepted:false,liveCloneRunId:body.receipt.runId};
  cp.i66FrontendReleaseHead=head;cp.currentExecutionDecisionPointer='i66FrontendReleaseHead';
  cp.i66OperationalContinuation20261115={...cp.i66OperationalContinuation20261115,latestProvenLiveSource:t.sourceSha,latestPhysicalFrontendLiveReceipt:receiptPath};
  cp.nextAction='I6.6 continúa después de la publicación focal '+t.buildId+'. '+c.next;
  state.currentExecutionDecisionPointer=P.cp+'#i66FrontendReleaseHead';state.currentPhysicalFrontend=head;
  transport.previousPhysicalHostingRelease=transport.currentPhysicalHostingRelease;
  transport.currentPhysicalHostingRelease={sourceSha:t.sourceSha,buildId:t.buildId,artifactId:t.artifactId,artifactDigest:t.artifactDigest,
    previewRunId:t.buildRunId,signedPreviewRunId:t.previewUiRunId||null,liveCloneRunId:body.receipt.runId,liveHostingVersion:t.hostingVersion,
    readbackEachOrigin:t.files,receipt:receiptPath,backendFunctionsChanged:0,fullI66ProductionAccepted:false,status:head.status};
  transport.latestSignedPhysicalFrontendLivePointer20261122=head;
  transport.frontendReleaseSequence=n;transport.consumedFrontendAuthorities=[...new Set([...(transport.consumedFrontendAuthorities||[]),j.request.approvalBlob])];
  ledger.frontendReleaseHead=head;
  const oldEvidence=c.currentEvidencePath,progress=read(oldEvidence),progressPath=genName(n,'FOCAL_PROGRESS');
  progress.previousEvidencePath=oldEvidence;progress.previousEvidenceBlobSha=c.currentEvidenceBlobSha;
  progress.releasedFrontend={sourceSha:t.sourceSha,buildId:t.buildId,artifactId:t.artifactId,digest:t.artifactDigest,fileCount:t.files,
    hostingVersion:t.hostingVersion,liveReceipt:receiptPath};
  progress.notTouched.hostingProduction=false;progress.frontendReleaseGeneration=n;progress.frontendPromotionBusinessWrites=0;
  c.previousEvidencePath=oldEvidence;c.previousEvidenceBlobSha=c.currentEvidenceBlobSha;c.currentEvidencePath=progressPath;
  c.currentEvidenceBlobSha=blob(serial(progress));c.lastPhysicalLiveRunId=head.liveCloneRunId;c.lastPhysicalLiveSourceSha=t.sourceSha;
  c.moduleReleasedThisIteration=true;
  return {...changes,[P.cp]:cp,[P.state]:state,[P.transport]:transport,[P.ledger]:ledger,[progressPath]:progress,[genName(n,'JOURNAL')]:body};
}
module.exports={P,genName,serial,blob,physicalGuard,closeFiles};
