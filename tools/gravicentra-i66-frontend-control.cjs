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
const hash=body=>crypto.createHash('sha256').update(body).digest('hex');
const genName=(n,suffix)=>{assert.ok(Number.isSafeInteger(n)&&n>0);return dir+'I6_6_FRONTEND_E'+String(n).padStart(5,'0')+'_'+suffix+'.json';};
function executionSnapshot(transport){
  const r=transport.frontendPreviewRequest,s=transport.scopedBackendPreviewI66,p=transport.operationalReleaseCandidate;
  return {transportStatus:transport.status,previewRequest:r?{version:r.version,sourceQaHead:r.sourceQaHead,
    sourceQaRunId:r.sourceQaRunId,guardRunId:r.guardRunId}:null,
    scopedPreview:s?{sourceSha:s.sourceSha,artifactDigest:s.artifactDigest}:null,
    operationalCandidate:p?{status:p.status,sourceSha:p.sourceSha,artifactDigest:p.artifactDigest,
      previewQaRunId:p.previewQa?.runId||null}:null};
}
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
  if(receipt.scope==='COMPOSITE'||head.scope==='COMPOSITE'||journal.request.scope==='COMPOSITE'){
    assert.equal(receipt.scope,'COMPOSITE','COMPOSITE_RECEIPT_SCOPE_REMOVED');
    assert.equal(receipt.schema,'GI_I66_SIGNED_COMPOSITE_RECEIPT_V1');
    assert.equal(journal.operation,'ACCEPT_EXECUTED_COMPOSITE_LIVE');
    assert.equal(journal.request.scope,'COMPOSITE');
    const proofPath=genName(head.generation,'LIVE_PROOF'),proofText=read(proofPath),proof=JSON.parse(proofText);
    assert.deepEqual(receipt.liveProof,{path:proofPath,sha256:hash(proofText),gitBlobSha:blob(proofText)});
    assert.deepEqual(journal.liveProof,proof,'COMPOSITE_JOURNAL_PROOF_DRIFT');
    require('./gravicentra-i66-frontend-promotion-transaction.cjs').validateCompositeProof(journal.request,proof);
    assert.deepEqual(receipt,compositeReceipt(journal,proof.runId),'COMPOSITE_SIGNED_RECEIPT_CONTENT_DRIFT');
    assert.equal(head.scope,'COMPOSITE');assert.equal(head.backendFunctionsChanged,4);
    assert.equal(physical.scope,'COMPOSITE');assert.equal(physical.backendFunctionsChanged,4);
    assert.deepEqual(receipt.backendRevisions,proof.backendRevisions,'COMPOSITE_RECEIPT_REVISIONS_DRIFT');
    assert.deepEqual(head.backendRevisions,proof.backendRevisions,'COMPOSITE_HEAD_REVISIONS_DRIFT');
    assert.deepEqual(physical.backendRevisions,proof.backendRevisions,'COMPOSITE_TRANSPORT_REVISIONS_DRIFT');
    assert.equal(head.liveProofPath,proofPath);assert.equal(head.liveProofSha256,hash(proofText));
    for(const current of [control.i66CurrentPhysicalBackendRelease,state.currentPhysicalBackend,
      transport.currentPhysicalBackendRelease,JSON.parse(read(P.ledger)).backendReleaseHead])
      assert.deepEqual(current,receipt.backend,'COMPOSITE_BACKEND_POINTER_DRIFT');
    assert.equal(receipt.backend.sourceSha,target.sourceSha);assert.equal(receipt.backend.artifactDigest,target.artifactDigest);
    assert.equal(receipt.backend.functionsChanged,4);assert.deepEqual(receipt.backend.revisions,proof.backendRevisions);
    assert.deepEqual(transport.lastConsumedOperationalCandidate,journal.request.candidate,'COMPOSITE_CONSUMED_AUTHORITY_DRIFT');
    const pending=transport.scopedBackendPreviewI66?.candidate||transport.operationalReleaseCandidate;
    if(pending){
      assert.notEqual(pending.sourceSha,head.sourceSha,'COMPOSITE_ACCEPTED_AUTHORITY_REUSED');
      require('./gravicentra-i6-6-operational-release-candidate.cjs').candidateForPhase(transport,
        transport.status==='OPERATIONAL_EXACT_LIVE_PROMOTION_AUTHORIZED'?'live':'preview');
    }else{
      assert.equal(transport.status,'OPERATIONAL_EXACT_LIVE_ACCEPTED_LOCKED');
      for(const [key,value] of Object.entries({forbidBackendFunctionDeploy:true,backendFunctionPreviewOnly:false,
        forbidBackendLiveFunctionDeploy:true,forbidFirestoreRulesDataAuthWrites:true,livePromotionAuthorized:false,
        previewApproved:false,noHostingPromotion:true}))assert.equal(transport[key],value,'COMPOSITE_TERMINAL_LOCK_'+key);
    }
  }
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
  cp.i66OperationalContinuation20261115.currentPhysicalHostingRelease=transport.currentPhysicalHostingRelease;
  cp.i66OperationalContinuation20261115.latestPhysicalFrontendLiveRunId=body.receipt.runId;
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
  if(c.executionSynchronizationVersion===1)progress.executionSynchronization=executionSnapshot(transport);
  c.currentEvidenceBlobSha=blob(serial(progress));
  return {...changes,[P.cp]:cp,[P.state]:state,[P.transport]:transport,[P.ledger]:ledger,[progressPath]:progress,[genName(n,'JOURNAL')]:body};
}
function compositeReceipt(j,runId){
  const {validateCompositeProof}=require('./gravicentra-i66-frontend-promotion-transaction.cjs');
  const proof=validateCompositeProof(j.request,j.liveProof),p=j.request.candidate;
  assert.equal(runId,proof.runId,'COMPOSITE_RECEIPT_RUN_DRIFT');
  const proofPath=genName(j.generation,'LIVE_PROOF'),proofText=serial(proof);
  const backend={generation:j.generation,gate:'I6.6',scope:'COMPOSITE',status:'SIGNED_LIVE_VERIFIED',
    sourceSha:p.sourceSha,artifactId:p.artifactId,artifactDigest:p.artifactDigest,buildId:p.buildId,
    functionsChanged:4,revisions:proof.backendRevisions,liveRunId:proof.runId,
    proofPath,proofSha256:hash(proofText),rollbackHostingVersion:proof.previousHostingVersion,
    fullI66ProductionAccepted:false};
  return {schema:'GI_I66_SIGNED_COMPOSITE_RECEIPT_V1',scope:'COMPOSITE',generation:j.generation,
    target:j.request.target,previous:j.request.previous,authorization:j.request.approvalBlob,
    scopeId:'I66_COMPOSITE_FOUR_FUNCTIONS_SIGNED',preview:j.preview,physical:j.physical,
    ui:{result:'PASS',buildId:p.buildId,receiptBlob:blob(proofText),source:'VALIDATED_SIGNED_COMPOSITE_LIVE_PROOF'},
    backendFunctionsChanged:4,backendRevisions:proof.backendRevisions,backend,
    liveProof:{path:proofPath,sha256:hash(proofText),gitBlobSha:blob(proofText)},runId};
}
function closeCompositeFiles(read,j,body){
  const receipt=compositeReceipt(j,j.liveProof.runId);
  assert.equal(body.phase,'COMMITTED');assert.equal(body.receipt.blob,blob(serial(receipt)),'COMPOSITE_SIGNED_RECEIPT_DRIFT');
  const changes=closeFiles(read,j,body),cp=changes[P.cp],transport=changes[P.transport],state=changes[P.state],ledger=changes[P.ledger];
  const head=cp.i66FrontendReleaseHead,physical=transport.currentPhysicalHostingRelease;
  Object.assign(head,{scope:'COMPOSITE',status:'COMPOSITE_LIVE_SIGNED_UI_VERIFIED',backendFunctionsChanged:4,
    backendRevisions:receipt.backendRevisions,liveProofPath:receipt.liveProof.path,liveProofSha256:receipt.liveProof.sha256});
  Object.assign(physical,{scope:'COMPOSITE',status:head.status,backendFunctionsChanged:4,backendRevisions:receipt.backendRevisions,
    liveProofPath:receipt.liveProof.path,liveProofSha256:receipt.liveProof.sha256});
  const previousBackend=transport.currentPhysicalBackendRelease||null;
  if(previousBackend)transport.previousPhysicalBackendRelease=previousBackend;
  cp.i66CurrentPhysicalBackendRelease=state.currentPhysicalBackend=transport.currentPhysicalBackendRelease=ledger.backendReleaseHead=receipt.backend;
  transport.lastConsumedOperationalCandidate=j.request.candidate;
  if(transport.scopedBackendPreviewI66)transport.lastConsumedScopedBackendPreviewI66=transport.scopedBackendPreviewI66;
  delete transport.operationalReleaseCandidate;delete transport.scopedBackendPreviewI66;
  Object.assign(transport,{status:'OPERATIONAL_EXACT_LIVE_ACCEPTED_LOCKED',forbidBackendFunctionDeploy:true,
    backendFunctionPreviewOnly:false,forbidBackendLiveFunctionDeploy:true,forbidFirestoreRulesDataAuthWrites:true,
    livePromotionAuthorized:false,previewApproved:false,noHostingPromotion:true});
  const progress=changes[genName(j.generation,'FOCAL_PROGRESS')],c=cp.i66ActiveRecoveryCursor;
  progress.releasedBackend=receipt.backend;progress.releaseScope='COMPOSITE';progress.notTouched.backendDeploy=false;
  c.lastCompositeLiveUatRunId=receipt.runId;c.lastCompositeLiveUatStatus=j.liveProof.status;
  const continuation=cp.i66OperationalContinuation20261115;
  continuation.latestCompositeLiveReceipt=genName(j.generation,'RECEIPT');continuation.latestCompositeLiveRunId=receipt.runId;
  continuation.currentWork='I6.6: composite '+head.buildId+' verified with the same immutable frontend and four backend functions; remaining genuine business workflows, Make and financial deltas stay individually gated.';
  continuation.latestProvenLiveSourceScope='COMPOSITE_FRONTEND_AND_FOUR_BACKEND_FUNCTIONS_SAME_IMMUTABLE_SIGNED_PROOF';
  continuation.legalSuccessorAcceptance='COMPOSITE_PREVIEW_AND_LIVE_IDENTICAL_V2_NORMAL_UI_RELOAD_VERIFIED';
  if(state.currentLiveSuccessorAcceptance)state.previousLiveSuccessorAcceptance=state.currentLiveSuccessorAcceptance;
  state.currentLiveSuccessorAcceptance={status:'CURRENT_COMPOSITE_EXACT_SIGNED_LIVE_PASS_FULL_I66_HOLD',
    gate:'I6.6',scope:'COMPOSITE',generation:j.generation,sourceSha:head.sourceSha,buildId:head.buildId,
    buildRunId:head.buildRunId,artifactId:head.artifactId,artifactDigest:head.artifactDigest,hostingVersion:head.hostingVersion,
    liveRunId:receipt.runId,receipt:head.receiptPath,receiptGitBlobSha:head.receiptGitBlobSha,
    proofPath:receipt.liveProof.path,proofSha256:receipt.liveProof.sha256,backendFunctionsChanged:4,
    backendRevisions:receipt.backendRevisions,previousLiveVersionForRollback:j.request.previous.hostingVersion,
    fullI66ProductionAccepted:false,realFinancialWrites:0};
  state.nextAction=cp.nextAction='I6.6: publicación compuesta '+head.buildId+' verificada. Continuar las capacidades reales y lotes pendientes desde '+genName(j.generation,'FOCAL_PROGRESS')+'.';
  assert.ok(Number.isFinite(Date.parse(j.liveProof.recordedAtUtc)),'COMPOSITE_ACCEPTANCE_TIMESTAMP_REQUIRED');
  progress.previousReleaseExecution=progress.releaseExecution||null;
  progress.consumedPreviewRequest=transport.frontendPreviewRequest;
  transport.lastConsumedFrontendPreviewRequest=transport.frontendPreviewRequest;
  progress.releaseExecution={status:'COMPOSITE_FOUR_FUNCTIONS_SIGNED_LIVE_ACCEPTED',
    sourceSha:head.sourceSha,buildId:head.buildId,buildRunId:head.buildRunId,
    artifactId:head.artifactId,artifactDigest:head.artifactDigest,artifactBuilt:true,
    previewSignedPass:true,livePromoted:true,signedPreviewRunId:j.request.candidate.previewQa.runId,
    liveRunId:receipt.runId,receiptPath:head.receiptPath,proofPath:receipt.liveProof.path,
    proofSha256:receipt.liveProof.sha256,backendFunctionsChanged:4,
    sourceQaHead:transport.frontendPreviewRequest?.sourceQaHead,
    sourceQaRunId:transport.frontendPreviewRequest?.sourceQaRunId,
    guardRunId:transport.frontendPreviewRequest?.guardRunId,
    frontendPreviewRequestVersion:transport.frontendPreviewRequest?.version,
    recordedAtUtc:j.liveProof.recordedAtUtc,fullI66ProductionAccepted:false};
  progress.recordedAtUtc=j.liveProof.recordedAtUtc;
  progress.remainingExecutionLanes=(progress.shockObjectives?.items||[]).filter(row=>row.passForShock!==true)
    .map(({id,title,status,next})=>({id,title,status,next}));
  const next='I6.6: continuar las capacidades pendientes del plan congelado: '+
    progress.remainingExecutionLanes.map(row=>row.id+' '+row.title).join('; ')+
    '. El artifact '+head.artifactDigest+' ya está aceptado; retomar sus pruebas pendientes y la operación autorizada, sin repetir su build ni promoción.';
  c.next=progress.next=continuation.currentWork=state.nextAction=cp.nextAction=next;
  progress.executionSynchronization=executionSnapshot(transport);c.executionSynchronizationVersion=1;
  c.currentEvidenceBlobSha=blob(serial(progress));
  return {...changes,[genName(j.generation,'RECEIPT')]:receipt,[receipt.liveProof.path]:j.liveProof};
}
module.exports={P,genName,serial,blob,physicalGuard,closeFiles,executionSnapshot,compositeReceipt,closeCompositeFiles};
