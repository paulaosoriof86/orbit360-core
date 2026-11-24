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
    ...(transport.lastConsumedFrontendRelease?{previewRequestDisposition:{version:r?.version||null,
      status:r?.version===transport.lastConsumedFrontendRelease.previewRequestVersion?'CONSUMED_EXACT_LIVE':'PENDING_NEW_PREVIEW_REQUEST',
      lastConsumedRelease:transport.lastConsumedFrontendRelease}}:{}),
    scopedPreview:s?{sourceSha:s.sourceSha,artifactDigest:s.artifactDigest}:null,
    operationalCandidate:p?{status:p.status,sourceSha:p.sourceSha,artifactDigest:p.artifactDigest,
      previewQaRunId:p.previewQa?.runId||null}:null};
}
// The current objectives own the derived work list. Historical receipts keep
// their bytes; updating one active objective must not leave an older next step
// or an older observer result looking current elsewhere in the same cursor.
function executionProgressProjection(progress){
  assert.ok(Array.isArray(progress.shockObjectives?.items),'I66_PROGRESS_OBJECTIVES_MISSING');
  const ids=new Set(),remainingExecutionLanes=[];
  for(const row of progress.shockObjectives.items){
    assert.ok(row&&typeof row.id==='string'&&!ids.has(row.id),'I66_PROGRESS_OBJECTIVE_ID_INVALID');
    ids.add(row.id);
    if(row.passForShock===true)continue;
    for(const key of ['title','status','evidence','next'])
      assert.equal(typeof row[key],'string','I66_PROGRESS_OBJECTIVE_FIELD_MISSING_'+row.id+'_'+key);
    const {id,title,status,evidence,next}=row;
    remainingExecutionLanes.push({id,title,status,evidence,next});
  }
  return {remainingExecutionLanes,nextIncomplete:remainingExecutionLanes.map(row=>row.id+': '+row.next)};
}
function synchronizeExecutionProgress(progress){
  const projection=executionProgressProjection(progress);
  progress.remainingExecutionLanes=projection.remainingExecutionLanes;
  progress.updateDiscipline=progress.updateDiscipline||{};
  progress.updateDiscipline.nextIncomplete=projection.nextIncomplete;
  if(progress.postAcceptanceObserverResults&&progress.currentObserverStatus){
    progress.previousPendingObserverStatus=progress.currentObserverStatus;
    delete progress.currentObserverStatus;
  }
  return projection;
}
const observerTargetKeys=['generation','sourceSha','buildId','artifactId','artifactDigest','hostingVersion'];
const observerCursorKeys=cursor=>Object.keys(cursor).filter(key=>/^(lastObserverResults|lastFiveRoleMatrix|lastPerformance|lastFinancialUiReadback)/.test(key));
const observerSummaryKeys=progress=>Object.keys(progress).filter(key=>/^current(SignedRoleMatrix|LivePerformance)\d{8}$/.test(key));
const observerContinuationKeys=continuation=>Object.keys(continuation).filter(key=>/^postAcceptanceObserverResults\d{8}$/.test(key));
const observerTarget=target=>Object.fromEntries(observerTargetKeys.map(key=>[key,target[key]]));
function sameObserverTarget(target,head){
  return target&&['generation','sourceSha','artifactDigest'].every(key=>target[key]===head[key])&&
    ['buildId','artifactId','hostingVersion'].every(key=>target[key]===undefined||target[key]===head[key]);
}
function retireObserverAuthorities(continuation,head,archived){
  for(const [profile,authority] of Object.entries(continuation.postAcceptanceGovernanceQa?.observers||{})){
    if(sameObserverTarget(authority.target,head))continue;
    archived.observerAuthorities[profile]=authority;
    delete continuation.postAcceptanceGovernanceQa.observers[profile];
  }
  for(const key of Object.keys(continuation).filter(key=>/^acceptedLivePerformance(?:Timeline)?Request\d{8}$/.test(key))){
    const request=continuation[key];if(sameObserverTarget(request.target||request,head))continue;
    archived.observerRequests[key]=request;delete continuation[key];
  }
}
// A signed observation remains true for the artifact it measured. Publishing a
// successor moves that evidence into history; it neither transfers its PASS to
// the successor nor destroys the original proof or reopens unrelated gates.
function archiveExecutionObservers(control,progress,head,read){
  const observations=progress.postAcceptanceObserverResults;
  if(!observations){
    const pending=progress.currentObserverStatus;
    if(!pending||sameObserverTarget(pending.target,head))return null;
    const prior=progress.priorPostAcceptanceObserverResults?.find(item=>item.results.receiptPath===pending.previousResultsReceipt);
    assert.ok(prior,'I66_PROGRESS_PREVIOUS_OBSERVER_HISTORY_MISSING');
    const transition={previousUnobservedTarget:structuredClone(pending.target),target:observerTarget(head),
      previousResultsReceipt:pending.previousResultsReceipt,observerAuthorities:{},observerRequests:{},acceptanceTransferred:false};
    retireObserverAuthorities(control.i66OperationalContinuation20261115,head,transition);
    progress.priorPendingObserverTransitions=[...(progress.priorPendingObserverTransitions||[]),transition];
    pending.target=observerTarget(head);
    synchronizeExecutionProgress(progress);
    return prior;
  }
  const receipt=read(observations.receiptPath);
  assert.equal(receipt.schema,'GI_I66_POST_ACCEPTANCE_OBSERVER_RESULTS_RECONCILIATION_V1');
  if(sameObserverTarget(receipt.target,head))return null;
  const cursor=control.i66ActiveRecoveryCursor,continuation=control.i66OperationalContinuation20261115;
  const archived={schema:'GI_I66_SUPERSEDED_OBSERVER_RESULTS_V1',reason:'ACCEPTED_LIVE_TARGET_CHANGED',
    target:structuredClone(receipt.target),supersededByTarget:observerTarget(head),
    acceptanceScope:'HISTORICAL_ORIGINAL_ARTIFACT_ONLY',immutableReceiptRetained:true,
    results:structuredClone(observations),progressSummaries:{},cursorPointers:{},continuationSummaries:{},
    observerAuthorities:{},observerRequests:{},objectiveStates:[],parallelLaneStates:[]};
  for(const key of observerSummaryKeys(progress)){
    archived.progressSummaries[key]=progress[key];delete progress[key];
  }
  for(const key of ['postAcceptanceVerification'])if(progress[key]){
    archived.progressSummaries[key]=progress[key];delete progress[key];
  }
  if(progress.financialWork?.currentSignedUiReadback){
    archived.progressSummaries.currentSignedUiReadback=progress.financialWork.currentSignedUiReadback;
    delete progress.financialWork.currentSignedUiReadback;
  }
  for(const key of observerCursorKeys(cursor)){
    archived.cursorPointers[key]=cursor[key];delete cursor[key];
  }
  for(const key of observerContinuationKeys(continuation)){
    archived.continuationSummaries[key]=continuation[key];delete continuation[key];
  }
  retireObserverAuthorities(continuation,head,archived);
  for(const objective of progress.shockObjectives.items.filter(row=>['A04','A12','A14'].includes(row.id))){
    archived.objectiveStates.push(structuredClone(objective));
    if(objective.passForShock===true)continue;
    objective.status='CURRENT_ARTIFACT_OBSERVER_PENDING_PRIOR_RESULT_HISTORICAL';
    objective.evidence='Prior accepted artifact E'+receipt.target.generation+' only: '+objective.evidence;
    objective.next='Observe the current accepted artifact for this pending scope; preserve the original proof at '+
      observations.receiptPath+'. Remaining work recorded before publication: '+objective.next;
  }
  for(const lane of (progress.parallelLanes||[]).filter(row=>['L3','L4'].includes(row.id))){
    archived.parallelLaneStates.push(structuredClone(lane));
    lane.status='CURRENT_ARTIFACT_OBSERVER_PENDING_PRIOR_SCOPED_RESULTS_ARCHIVED';
  }
  if(cursor.nextRoleMatrixWork){archived.cursorPointers.nextRoleMatrixWork=cursor.nextRoleMatrixWork;delete cursor.nextRoleMatrixWork;}
  if(progress.immediateExecution?.observerResultsReceipt){
    archived.progressSummaries.immediateExecution=structuredClone(progress.immediateExecution);
    delete progress.immediateExecution.observerResultsReceipt;
    progress.immediateExecution.status='CURRENT_ARTIFACT_OBSERVERS_PENDING_PREVIOUS_RESULTS_ARCHIVED';
  }
  delete progress.postAcceptanceObserverResults;
  progress.priorPostAcceptanceObserverResults=[...(progress.priorPostAcceptanceObserverResults||[]),archived];
  progress.currentObserverStatus={status:'PENDING_READONLY_OBSERVATION_ON_CURRENT_ACCEPTED_ARTIFACT',
    target:observerTarget(head),previousResultsReceipt:observations.receiptPath,
    historicalProofsRemainValidForOriginalArtifact:true,acceptanceTransferred:false};
  synchronizeExecutionProgress(progress);
  return archived;
}
function ownerPlanContinuationProjection(control,transport){
  const head=control.i66FrontendReleaseHead,c=control.i66ActiveRecoveryCursor,continuation=control.i66OperationalContinuation20261115;
  assert.ok(head&&c&&continuation,'I66_OWNER_PLAN_ACTIVE_AUTHORITY_MISSING');
  return {schema:'GI_I66_ACTIVE_OWNER_PLAN_CONTINUATION_V1',authorityPointer:P.cp+'#i66OperationalContinuation20261115',
    generation:head.generation,latestProvenLiveSource:head.sourceSha,latestPhysicalFrontendLiveReceipt:head.receiptPath,
    currentPhysicalFrontend:observerTarget(head),evidencePath:c.currentEvidencePath,evidenceGitBlobSha:c.currentEvidenceBlobSha,
    activeGate:'I6.6',currentWork:continuation.currentWork,nextAction:control.nextAction,
    frontendPreviewRequest:executionSnapshot(transport).previewRequest};
}
function synchronizeOwnerPlanContinuation(control,state,transport,{archivePrior=true}={}){
  const prior=state.i66OwnerPlanContinuation20261115,next=ownerPlanContinuationProjection(control,transport);
  if(prior&&serial(prior)!==serial(next)&&archivePrior){
    state.priorI66OwnerPlanContinuations=[...(state.priorI66OwnerPlanContinuations||[]),{
      reason:'ACTIVE_OWNER_PLAN_SUMMARY_SUPERSEDED',priorGitBlobSha:blob(serial(prior)),
      supersededByGeneration:next.generation,prior:structuredClone(prior)}];
  }
  state.i66OwnerPlanContinuation20261115=next;
  state.currentOperationalWorkPointer=next.authorityPointer;
  state.nextAction=control.nextAction;
  return next;
}
function assertOwnerPlanContinuation(control,state,transport){
  const mirror=state.i66OwnerPlanContinuation20261115;
  // The historical mixed acceptance/summary object is archived on explicit
  // adoption. Every successor from E4 must carry the current small projection.
  if(control.i66FrontendReleaseHead.generation<4&&mirror?.schema!=='GI_I66_ACTIVE_OWNER_PLAN_CONTINUATION_V1')return;
  assert.deepEqual(mirror,ownerPlanContinuationProjection(control,transport),'I66_OWNER_PLAN_ACTIVE_SUMMARY_DRIFT');
  assert.equal(state.currentOperationalWorkPointer,mirror.authorityPointer,'I66_OWNER_PLAN_POINTER_DRIFT');
  assert.equal(state.nextAction,control.nextAction,'I66_OWNER_PLAN_NEXT_ACTION_DRIFT');
}
function assertActiveReleaseProgress(control,progress,transport){
  const head=control.i66FrontendReleaseHead;if(!head||head.generation<4)return;
  const execution=progress.releaseExecution;
  assert.equal(progress.frontendReleaseGeneration,head.generation,'I66_ACTIVE_RELEASE_PROGRESS_GENERATION_DRIFT');
  assert.equal(progress.releaseScope,head.scope||'FRONTEND_ONLY','I66_ACTIVE_RELEASE_PROGRESS_SCOPE_DRIFT');
  for(const k of ['sourceSha','buildId','buildRunId','artifactId','artifactDigest'])
    assert.equal(execution?.[k],head[k],'I66_ACTIVE_RELEASE_EXECUTION_DRIFT_'+k);
  assert.equal(execution.receiptPath,head.receiptPath);assert.equal(execution.liveRunId,head.liveCloneRunId||head.liveRunId);
  assert.equal(execution.fullI66ProductionAccepted,false);
  const consumed=transport.lastConsumedFrontendRelease;assert.ok(consumed,'I66_ACTIVE_RELEASE_CONSUMPTION_MISSING');
  assert.equal(consumed.generation,head.generation);assert.equal(consumed.sourceSha,head.sourceSha);
  assert.equal(consumed.artifactDigest,head.artifactDigest);assert.equal(consumed.receiptPath,head.receiptPath);
  assert.deepEqual(progress.consumedPreviewRequest,transport.lastConsumedFrontendPreviewRequest,'I66_ACTIVE_CONSUMED_PREVIEW_DRIFT');
  if(progress.releaseScope==='FRONTEND_ONLY'){
    assert.equal(control.i66OperationalContinuation20261115.latestProvenLiveSourceScope,'FRONTEND_ONLY_EXACT_ARTIFACT_SIGNED_UI_PROOF',
      'I66_ACTIVE_FRONTEND_SOURCE_SCOPE_DRIFT');
    assert.equal(execution.backendFunctionsChanged,0);assert.equal(progress.notTouched.productSource,false);
    assert.equal(progress.currentExecutionMutations?.scope,'THIS_FRONTEND_PROMOTION_ONLY');
    assert.equal(progress.currentExecutionMutations.productSourceChanged,true);assert.equal(progress.currentExecutionMutations.hostingDeploy,true);
    assert.equal(progress.currentExecutionMutations.backendDeploy,false);assert.equal(progress.currentExecutionMutations.businessWrites,false);
  }else if(transport.lastConsumedOperationalCandidate?.makeIngressComposite===true){
    assert.equal(control.i66OperationalContinuation20261115.latestProvenLiveSourceScope,'COMPOSITE_FRONTEND_AND_FIVE_BACKEND_FUNCTIONS_CLOSED_INGRESS_SIGNED_PROOF');
    assert.equal(execution.backendFunctionsChanged,5);assert.equal(progress.notTouched.productSource,false);
    assert.equal(progress.currentExecutionMutations?.scope,'THIS_COMPOSITE_PROMOTION_ONLY');
    assert.equal(progress.currentExecutionMutations.backendFunctionsChanged,5);assert.equal(progress.currentExecutionMutations.businessWrites,false);
    assert.equal(progress.makeIngressDeploymentAcceptance?.acceptanceScope,'RELEASE_TIME_ONLY');
    assert.equal(progress.makeIngressDeploymentAcceptance?.a13RealLeadAccepted,false);assert.equal(progress.makeIngressDeploymentAcceptance?.fullA13Accepted,false);
  }
}
function assertExecutionProgress(control,progress,io){
  const projection=executionProgressProjection(progress),cursor=control.i66ActiveRecoveryCursor||{};
  assert.deepEqual(progress.remainingExecutionLanes,projection.remainingExecutionLanes,'I66_PROGRESS_REMAINING_LANES_DRIFT');
  assert.deepEqual(progress.updateDiscipline?.nextIncomplete,projection.nextIncomplete,'I66_PROGRESS_NEXT_INCOMPLETE_DRIFT');
  const observations=progress.postAcceptanceObserverResults;
  if(!observations&&!cursor.lastObserverResultsReceipt){
    assert.equal(observerSummaryKeys(progress).length,0,'I66_PROGRESS_CURRENT_SUMMARY_WITHOUT_OBSERVER_RECEIPT');
    assert.equal(observerCursorKeys(cursor).length,0,'I66_PROGRESS_CURRENT_CURSOR_WITHOUT_OBSERVER_RECEIPT');
    assert.ok(!progress.financialWork?.currentSignedUiReadback,'I66_PROGRESS_CURRENT_FINANCIAL_WITHOUT_OBSERVER_RECEIPT');
    assert.equal(observerContinuationKeys(control.i66OperationalContinuation20261115||{}).length,0,'I66_PROGRESS_CURRENT_CONTINUATION_WITHOUT_OBSERVER_RECEIPT');
    if(progress.currentObserverStatus){
      const pending=progress.currentObserverStatus;
      assert.equal(pending.status,'PENDING_READONLY_OBSERVATION_ON_CURRENT_ACCEPTED_ARTIFACT');
      assert.deepEqual(pending.target,observerTarget(control.i66FrontendReleaseHead),'I66_PROGRESS_PENDING_OBSERVER_TARGET_DRIFT');
      assert.equal(pending.acceptanceTransferred,false,'I66_PROGRESS_PREVIOUS_OBSERVER_ACCEPTANCE_TRANSFERRED');
      assert.ok(progress.priorPostAcceptanceObserverResults?.some(item=>item.results.receiptPath===pending.previousResultsReceipt),
        'I66_PROGRESS_PREVIOUS_OBSERVER_HISTORY_MISSING');
    }
    return projection;
  }
  assert.ok(observations,'I66_PROGRESS_OBSERVER_RESULTS_REMOVED');
  assert.ok(!progress.currentObserverStatus,'I66_PROGRESS_STALE_PENDING_MARKER_WITH_CURRENT_OBSERVER_RESULTS');
  assert.equal(observations.receiptPath,cursor.lastObserverResultsReceipt,'I66_PROGRESS_OBSERVER_RECEIPT_PATH_DRIFT');
  assert.equal(observations.receiptGitBlobSha,cursor.lastObserverResultsReceiptGitBlobSha,'I66_PROGRESS_OBSERVER_RECEIPT_PIN_DRIFT');
  assert.ok(/^artifacts\/orbit360-recovery\/release-control\/[A-Za-z0-9_.-]+\.json$/.test(observations.receiptPath),'I66_PROGRESS_OBSERVER_RECEIPT_PATH_INVALID');
  const bytes=io.readFileSync(observations.receiptPath,'utf8'),receipt=JSON.parse(bytes);
  assert.equal(blob(bytes),observations.receiptGitBlobSha,'I66_PROGRESS_OBSERVER_RECEIPT_BYTES_DRIFT');
  assert.equal(receipt.schema,'GI_I66_POST_ACCEPTANCE_OBSERVER_RESULTS_RECONCILIATION_V1');
  for(const key of ['generation','sourceSha','buildId','artifactId','artifactDigest','hostingVersion'])
    assert.equal(receipt.target[key],control.i66FrontendReleaseHead[key],'I66_PROGRESS_OBSERVER_TARGET_DRIFT_'+key);
  for(const [key,receiptKey] of [['fiveRoles','fiveRoleReadOnly'],['performance','performance'],['financialSixReceiptUi','financialSixReceiptUi']])
    assert.deepEqual(observations[key],receipt[receiptKey],'I66_PROGRESS_OBSERVER_RESULT_DRIFT_'+key);
  const role=observations.fiveRoles,performance=observations.performance,financial=observations.financialSixReceiptUi;
  assert.equal(cursor.lastFiveRoleMatrixRunId,role.runId,'I66_PROGRESS_ROLE_RUN_DRIFT');
  assert.equal(cursor.lastFiveRoleMatrixStatus,role.status,'I66_PROGRESS_ROLE_STATUS_DRIFT');
  assert.equal(cursor.lastFiveRoleMatrixArtifactId,role.artifactId,'I66_PROGRESS_ROLE_ARTIFACT_DRIFT');
  assert.equal(cursor.lastFiveRoleMatrixArtifactDigest,role.artifactDigest,'I66_PROGRESS_ROLE_ARTIFACT_DIGEST_DRIFT');
  assert.equal(cursor.lastPerformanceRunId,performance.runId,'I66_PROGRESS_PERFORMANCE_RUN_DRIFT');
  assert.equal(cursor.lastPerformanceEvidenceArtifactId,performance.artifactId,'I66_PROGRESS_PERFORMANCE_ARTIFACT_DRIFT');
  assert.equal(cursor.lastFinancialUiReadbackRunId,financial.runId,'I66_PROGRESS_FINANCIAL_UI_RUN_DRIFT');
  assert.equal(cursor.lastFinancialUiReadbackStatus,financial.status,'I66_PROGRESS_FINANCIAL_UI_STATUS_DRIFT');
  assert.deepEqual(progress.currentSignedRoleMatrix20261124,role,'I66_PROGRESS_CURRENT_ROLE_SUMMARY_DRIFT');
  assert.deepEqual(progress.financialWork?.currentSignedUiReadback,financial,'I66_PROGRESS_CURRENT_FINANCIAL_SUMMARY_DRIFT');
  for(const key of Object.keys(performance))
    assert.deepEqual(progress.currentLivePerformance20261124?.[key],performance[key],'I66_PROGRESS_CURRENT_PERFORMANCE_SUMMARY_DRIFT_'+key);
  for(const [id,result,fullField] of [['A04',role,'fullA04Accepted'],['A12',financial,'fullA12Passed'],['A14',performance,'fullA14Passed']]){
    const objective=progress.shockObjectives.items.find(row=>row.id===id);
    assert.ok(objective&&objective.evidence.includes(String(result.runId)),'I66_PROGRESS_OBJECTIVE_OBSERVER_EVIDENCE_DRIFT_'+id);
    if(result[fullField]!==true)assert.equal(objective.passForShock,false,'I66_PROGRESS_PARTIAL_OBSERVER_FALSE_FULL_PASS_'+id);
  }
  return projection;
}
function physicalGuard(control,state,transport,io){
  const head=control.i66FrontendReleaseHead;
  assert.ok(head&&Number.isSafeInteger(head.generation)&&head.generation>0,'I66_VERSIONED_FRONTEND_HEAD_MISSING');
  assert.equal(transport.frontendReleaseSequence,head.generation,'I66_TRANSPORT_GENERATION_DRIFT');
  assert.equal(control.currentExecutionDecisionPointer,'i66FrontendReleaseHead');
  assert.equal(state.currentExecutionDecisionPointer,P.cp+'#i66FrontendReleaseHead');
  assert.deepEqual(state.currentPhysicalFrontend,head);
  assert.equal(head.gate,'I6.6');assert.equal(head.fullI66ProductionAccepted,false);
  assertOwnerPlanContinuation(control,state,transport);
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
    if(journal.request.candidate.makeIngressComposite===true){
      const financial=receipt.financialUi,uiText=read(financial.receiptPath),ui=JSON.parse(uiText);
      assert.equal(blob(uiText),financial.receiptBlob,'COMPOSITE_FINANCIAL_RECEIPT_BYTES_DRIFT');
      const verified=require('./gravicentra-i66-frontend-promotion-transaction.cjs').validateCompositeFinancialUi(
        journal.request,journal,{...financial,financialQa:ui.financialQa},{committedReadback:true});
      assert.deepEqual(verified,journal.financialUi,'COMPOSITE_COMMITTED_FINANCIAL_PROOF_DRIFT');
      assert.deepEqual(receipt.financialPreviewUi,journal.request.candidate.financialPreviewQa);
      assert.equal(blob(read(receipt.financialPreviewUi.receiptPath)),receipt.financialPreviewUi.receiptBlob);
    }
    const backendCount=require('./gravicentra-i6-6-operational-release-candidate.cjs').targetsForCandidate(journal.request.candidate,'live').length;
    assert.equal(head.scope,'COMPOSITE');assert.equal(head.backendFunctionsChanged,backendCount);
    assert.equal(physical.scope,'COMPOSITE');assert.equal(physical.backendFunctionsChanged,backendCount);
    assert.deepEqual(receipt.backendRevisions,proof.backendRevisions,'COMPOSITE_RECEIPT_REVISIONS_DRIFT');
    assert.deepEqual(head.backendRevisions,proof.backendRevisions,'COMPOSITE_HEAD_REVISIONS_DRIFT');
    assert.deepEqual(physical.backendRevisions,proof.backendRevisions,'COMPOSITE_TRANSPORT_REVISIONS_DRIFT');
    assert.equal(head.liveProofPath,proofPath);assert.equal(head.liveProofSha256,hash(proofText));
    for(const current of [control.i66CurrentPhysicalBackendRelease,state.currentPhysicalBackend,
      transport.currentPhysicalBackendRelease,JSON.parse(read(P.ledger)).backendReleaseHead])
      assert.deepEqual(current,receipt.backend,'COMPOSITE_BACKEND_POINTER_DRIFT');
    assert.equal(receipt.backend.sourceSha,target.sourceSha);assert.equal(receipt.backend.artifactDigest,target.artifactDigest);
    assert.equal(receipt.backend.functionsChanged,backendCount);assert.deepEqual(receipt.backend.revisions,proof.backendRevisions);
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
  const priorLiveSourceScope={sourceSha:cp.i66OperationalContinuation20261115?.latestProvenLiveSource,
    scope:cp.i66OperationalContinuation20261115?.latestProvenLiveSourceScope};
  assert.equal(transport.currentPhysicalHostingRelease.liveHostingVersion,j.request.previous.hostingVersion);
  const changes={};
  if(!cp.i66FrontendReleaseHead){
    const legacy={decision:cp.currentExecutionDecisionPointer,work:cp.i66OperationalContinuation20261115,nextAction:cp.nextAction,
      stateDecision:state.currentExecutionDecisionPointer,hosting:transport.currentPhysicalHostingRelease,signed:transport.latestSignedPhysicalFrontendLivePointer20261122};
    changes[P.legacy]=legacy;cp.i66PreversionedControlViewBlob=blob(serial(legacy));
  }
  const receiptPath=genName(n,'RECEIPT');
  const head={generation:n,gate:'I6.6',scope:'FRONTEND_ONLY',status:'FOCAL_FRONTEND_LIVE_UI_VERIFIED',sourceSha:t.sourceSha,sourceTree:t.sourceTree,
    compositionBlob:t.compositionBlob,manifestBlob:t.manifestBlob,artifactId:t.artifactId,artifactDigest:t.artifactDigest,
    hostingVersion:t.hostingVersion,buildId:t.buildId,hostedFilesEachOrigin:t.files,previewUrl:t.previewUrl,buildRunId:t.buildRunId,
    rollback:j.request.previous.hostingVersion,receiptPath,receiptGitBlobSha:body.receipt.blob,receiptCommit:body.receipt.commit,
    fullI66ProductionAccepted:false,liveCloneRunId:body.receipt.runId};
  cp.i66FrontendReleaseHead=head;cp.currentExecutionDecisionPointer='i66FrontendReleaseHead';
  cp.i66OperationalContinuation20261115={...cp.i66OperationalContinuation20261115,latestProvenLiveSource:t.sourceSha,
    latestProvenLiveSourceScope:'FRONTEND_ONLY_EXACT_ARTIFACT_SIGNED_UI_PROOF',latestPhysicalFrontendLiveReceipt:receiptPath};
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
  const priorReleaseView=Object.fromEntries(['releaseScope','releaseExecution','consumedPreviewRequest','currentExecutionMutations','immediateExecution','notTouched']
    .filter(k=>progress[k]!==undefined).map(k=>[k,structuredClone(progress[k])]));
  const archivedObservers=archiveExecutionObservers(cp,progress,head,read);
  progress.previousEvidencePath=oldEvidence;progress.previousEvidenceBlobSha=c.currentEvidenceBlobSha;
  progress.releasedFrontend={sourceSha:t.sourceSha,buildId:t.buildId,artifactId:t.artifactId,digest:t.artifactDigest,fileCount:t.files,
    hostingVersion:t.hostingVersion,liveReceipt:receiptPath};
  progress.notTouched.hostingProduction=false;progress.frontendReleaseGeneration=n;progress.frontendPromotionBusinessWrites=0;
  transport.lastConsumedFrontendPreviewRequest=structuredClone(transport.frontendPreviewRequest);
  transport.lastConsumedFrontendRelease={generation:n,previewRequestVersion:transport.frontendPreviewRequest?.version||null,
    sourceSha:t.sourceSha,artifactDigest:t.artifactDigest,receiptPath};
  if(j.request.scope!=='COMPOSITE'){
    progress.priorReleaseExecutionViews=[...(progress.priorReleaseExecutionViews||[]),{
      priorEvidencePath:oldEvidence,priorEvidenceGitBlobSha:c.currentEvidenceBlobSha,priorLiveSourceScope,view:priorReleaseView}];
    progress.releaseScope='FRONTEND_ONLY';progress.consumedPreviewRequest=structuredClone(transport.frontendPreviewRequest);
    progress.releaseExecution={status:'FRONTEND_FOCAL_SIGNED_LIVE_ACCEPTED',scope:'FRONTEND_ONLY',scopeId:j.request.scopeId||null,
      sourceSha:t.sourceSha,buildId:t.buildId,buildRunId:t.buildRunId,artifactId:t.artifactId,artifactDigest:t.artifactDigest,
      artifactBuilt:true,previewSignedPass:true,livePromoted:true,signedPreviewRunId:t.previewUiRunId||null,
      liveRunId:body.receipt.runId,receiptPath,uiReceiptPath:genName(n,'LIVE_UI'),uiReceiptGitBlobSha:body.liveUi?.receiptBlob||null,
      backendFunctionsChanged:0,businessWrites:0,sourceQaHead:transport.frontendPreviewRequest?.sourceQaHead||null,
      sourceQaRunId:transport.frontendPreviewRequest?.sourceQaRunId||null,guardRunId:transport.frontendPreviewRequest?.guardRunId||null,
      frontendPreviewRequestVersion:transport.frontendPreviewRequest?.version||null,fullI66ProductionAccepted:false};
    progress.currentExecutionMutations={scope:'THIS_FRONTEND_PROMOTION_ONLY',sourceQaAndProtectedWriterCodePublished:true,
      productSourceChanged:true,hostingDeploy:true,backendDeploy:false,businessWrites:false,
      priorFinancialWritesRetainedAt:oldEvidence};
    progress.notTouched.productSource=false;
    progress.immediateExecution={...progress.immediateExecution,status:'EXACT_FRONTEND_FOCAL_RELEASE_ACCEPTED_REMAINING_I66_WORK_OPEN',
      frontendSourceSha:t.sourceSha,frontendArtifactDigest:t.artifactDigest,frontendReceiptPath:receiptPath,
      financialFocal:j.request.scopeId==='SIX_RECEIPT_CURRENT_BALANCE_READONLY'
        ?'Exact six-receipt balance, source, reload and viewport readback passed in Preview and LIVE for the two assigned roles; no business writes. Full A04/A12 and other financial scopes retain their gates.'
        :'The exact focal frontend release passed its approved Preview and LIVE UI scope; continue the remaining capabilities.',
      alreadyPublishedArtifactMustNotBeRebuilt:true,fullA04Passed:false,fullA12Passed:false,fullA14Passed:false,fullI66ProductionAccepted:false};
    delete progress.immediateExecution.sourceScopeReceipt;
    if(j.request.scopeId==='SIX_RECEIPT_CURRENT_BALANCE_READONLY'){
      const a12=progress.shockObjectives.items.find(row=>row.id==='A12');assert.ok(a12);
      a12.status='SIX_RECEIPT_PREVIEW_LIVE_SCOPED_UI_PASS_FULL_A12_OPEN';a12.passForShock=false;
      a12.evidence='Current E'+n+': exact six receipts, two assigned roles, desktop/mobile390, 48 read/reload stages per phase, zero business writes; signed proof '+receiptPath+'. Prior artifact evidence remains archived.';
      a12.next='Preserve the accepted six-receipt UI proof and completed financial writes. Continue remaining A12 source universes and exceptions against the frozen plan; do not reimport the six records or repeat this accepted release.';
      synchronizeExecutionProgress(progress);
    }
  }
  c.previousEvidencePath=oldEvidence;c.previousEvidenceBlobSha=c.currentEvidenceBlobSha;c.currentEvidencePath=progressPath;
  c.currentEvidenceBlobSha=blob(serial(progress));c.lastPhysicalLiveRunId=head.liveCloneRunId;c.lastPhysicalLiveSourceSha=t.sourceSha;
  c.moduleReleasedThisIteration=true;
  if(archivedObservers){
    const next='I6.6: artifact '+head.artifactDigest+' accepted; continue the remaining capabilities and observe the new artifact. '+
      'Prior observer results remain historical for E'+archivedObservers.target.generation+' at '+archivedObservers.results.receiptPath+'.';
    c.next=progress.next=cp.i66OperationalContinuation20261115.currentWork=state.nextAction=cp.nextAction=next;
  }
  if(c.executionSynchronizationVersion===1)progress.executionSynchronization=executionSnapshot(transport);
  c.currentEvidenceBlobSha=blob(serial(progress));
  synchronizeOwnerPlanContinuation(cp,state,transport);
  if(j.request.scope!=='COMPOSITE')assertActiveReleaseProgress(cp,progress,transport);
  return {...changes,[P.cp]:cp,[P.state]:state,[P.transport]:transport,[P.ledger]:ledger,[progressPath]:progress,[genName(n,'JOURNAL')]:body};
}
function compositeReceipt(j,runId){
  const {validateCompositeProof}=require('./gravicentra-i66-frontend-promotion-transaction.cjs');
  const proof=validateCompositeProof(j.request,j.liveProof),p=j.request.candidate;
  assert.equal(runId,proof.runId,'COMPOSITE_RECEIPT_RUN_DRIFT');
  const proofPath=genName(j.generation,'LIVE_PROOF'),proofText=serial(proof);
  const makeIngress=require('./gravicentra-i66-make-release-scope.cjs').isMake(p);
  if(makeIngress){
    assert.equal(j.financialUi?.result,'PASS','COMPOSITE_FINANCIAL_LIVE_UI_REQUIRED_BEFORE_SIGNING');
    assert.equal(j.financialUi.scopeId,'SIX_RECEIPT_CURRENT_BALANCE_READONLY');
    assert.equal(j.financialUi.generation,j.generation);assert.equal(j.financialUi.physicalPhaseKey,j.key);
    assert.equal(j.financialUi.authorityBlob,j.request.financialQa.authorityBlob);
    assert.equal(j.financialUi.parentAuthorityBlob,j.request.approvalBlob);
    assert.equal(j.financialUi.sourceSha,p.sourceSha);assert.equal(j.financialUi.artifactDigest,p.artifactDigest);
    assert.equal(j.financialUi.buildId,p.buildId);assert.equal(j.financialUi.runId,runId);
    assert.equal(j.financialUi.receiptPath,genName(j.generation,'LIVE_UI'));
    assert.match(j.financialUi.receiptBlob,/^[a-f0-9]{40}$/);assert.match(j.financialUi.reportSha256,/^[a-f0-9]{64}$/);
  }
  const backendCount=require('./gravicentra-i6-6-operational-release-candidate.cjs').targetsForCandidate(p,'live').length;
  const backend={generation:j.generation,gate:'I6.6',scope:'COMPOSITE',status:'SIGNED_LIVE_VERIFIED',
    sourceSha:p.sourceSha,artifactId:p.artifactId,artifactDigest:p.artifactDigest,buildId:p.buildId,
    functionsChanged:backendCount,revisions:proof.backendRevisions,liveRunId:proof.runId,
    proofPath,proofSha256:hash(proofText),rollbackHostingVersion:proof.previousHostingVersion,
    fullI66ProductionAccepted:false};
  return {schema:'GI_I66_SIGNED_COMPOSITE_RECEIPT_V1',scope:'COMPOSITE',generation:j.generation,
    target:j.request.target,previous:j.request.previous,authorization:j.request.approvalBlob,
    scopeId:makeIngress?'I66_COMPOSITE_FIVE_FUNCTIONS_CLOSED_MAKE_SIGNED':'I66_COMPOSITE_FOUR_FUNCTIONS_SIGNED',preview:j.preview,physical:j.physical,
    ui:{result:'PASS',buildId:p.buildId,receiptBlob:blob(proofText),source:'VALIDATED_SIGNED_COMPOSITE_LIVE_PROOF'},
    backendFunctionsChanged:backendCount,backendRevisions:proof.backendRevisions,backend,
    ...(makeIngress?{makeIngress:{status:'CLOSED_DEPLOYMENT_AUTH_CONTEXT_VERIFIED',active:false,a13RealLeadAccepted:false,
      scopeContractBlob:p.makeIngress.scopeContractBlob,closedTrigger:proof.makeIngress.closedTrigger},
      financialUi:j.financialUi,financialPreviewUi:p.financialPreviewQa}:{}),
    liveProof:{path:proofPath,sha256:hash(proofText),gitBlobSha:blob(proofText)},runId};
}
function closeCompositeFiles(read,j,body){
  const receipt=compositeReceipt(j,j.liveProof.runId);
  assert.equal(body.phase,'COMMITTED');assert.equal(body.receipt.blob,blob(serial(receipt)),'COMPOSITE_SIGNED_RECEIPT_DRIFT');
  const changes=closeFiles(read,j,body),cp=changes[P.cp],transport=changes[P.transport],state=changes[P.state],ledger=changes[P.ledger];
  const head=cp.i66FrontendReleaseHead,physical=transport.currentPhysicalHostingRelease;
  const makeIngress=require('./gravicentra-i66-make-release-scope.cjs').isMake(j.request.candidate),backendCount=receipt.backend.functionsChanged;
  Object.assign(head,{scope:'COMPOSITE',status:'COMPOSITE_LIVE_SIGNED_UI_VERIFIED',backendFunctionsChanged:backendCount,
    backendRevisions:receipt.backendRevisions,liveProofPath:receipt.liveProof.path,liveProofSha256:receipt.liveProof.sha256});
  Object.assign(physical,{scope:'COMPOSITE',status:head.status,backendFunctionsChanged:backendCount,backendRevisions:receipt.backendRevisions,
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
  continuation.currentWork=makeIngress?'I6.6: composite '+head.buildId+' verified with the same immutable frontend and five backend functions; the machine ingress is CLOSED and real Make activation remains independently gated.':
    'I6.6: composite '+head.buildId+' verified with the same immutable frontend and four backend functions; remaining genuine business workflows, Make and financial deltas stay individually gated.';
  continuation.latestProvenLiveSourceScope=makeIngress?'COMPOSITE_FRONTEND_AND_FIVE_BACKEND_FUNCTIONS_CLOSED_INGRESS_SIGNED_PROOF':
    'COMPOSITE_FRONTEND_AND_FOUR_BACKEND_FUNCTIONS_SAME_IMMUTABLE_SIGNED_PROOF';
  continuation.legalSuccessorAcceptance='COMPOSITE_PREVIEW_AND_LIVE_IDENTICAL_V2_NORMAL_UI_RELOAD_VERIFIED';
  if(state.currentLiveSuccessorAcceptance)state.previousLiveSuccessorAcceptance=state.currentLiveSuccessorAcceptance;
  state.currentLiveSuccessorAcceptance={status:'CURRENT_COMPOSITE_EXACT_SIGNED_LIVE_PASS_FULL_I66_HOLD',
    gate:'I6.6',scope:'COMPOSITE',generation:j.generation,sourceSha:head.sourceSha,buildId:head.buildId,
    buildRunId:head.buildRunId,artifactId:head.artifactId,artifactDigest:head.artifactDigest,hostingVersion:head.hostingVersion,
    liveRunId:receipt.runId,receipt:head.receiptPath,receiptGitBlobSha:head.receiptGitBlobSha,
    proofPath:receipt.liveProof.path,proofSha256:receipt.liveProof.sha256,backendFunctionsChanged:backendCount,
    backendRevisions:receipt.backendRevisions,previousLiveVersionForRollback:j.request.previous.hostingVersion,
    fullI66ProductionAccepted:false,realFinancialWrites:0};
  state.nextAction=cp.nextAction='I6.6: publicación compuesta '+head.buildId+' verificada. Continuar las capacidades reales y lotes pendientes desde '+genName(j.generation,'FOCAL_PROGRESS')+'.';
  assert.ok(Number.isFinite(Date.parse(j.liveProof.recordedAtUtc)),'COMPOSITE_ACCEPTANCE_TIMESTAMP_REQUIRED');
  progress.previousReleaseExecution=progress.releaseExecution||null;
  progress.consumedPreviewRequest=transport.frontendPreviewRequest;
  transport.lastConsumedFrontendPreviewRequest=transport.frontendPreviewRequest;
  progress.releaseExecution={status:makeIngress?'COMPOSITE_FIVE_FUNCTIONS_CLOSED_INGRESS_SIGNED_LIVE_ACCEPTED':'COMPOSITE_FOUR_FUNCTIONS_SIGNED_LIVE_ACCEPTED',
    sourceSha:head.sourceSha,buildId:head.buildId,buildRunId:head.buildRunId,
    artifactId:head.artifactId,artifactDigest:head.artifactDigest,artifactBuilt:true,
    previewSignedPass:true,livePromoted:true,signedPreviewRunId:j.request.candidate.previewQa.runId,
    liveRunId:receipt.runId,receiptPath:head.receiptPath,proofPath:receipt.liveProof.path,
    proofSha256:receipt.liveProof.sha256,backendFunctionsChanged:backendCount,
    sourceQaHead:transport.frontendPreviewRequest?.sourceQaHead,
    sourceQaRunId:transport.frontendPreviewRequest?.sourceQaRunId,
    guardRunId:transport.frontendPreviewRequest?.guardRunId,
    frontendPreviewRequestVersion:transport.frontendPreviewRequest?.version,
    recordedAtUtc:j.liveProof.recordedAtUtc,fullI66ProductionAccepted:false};
  if(makeIngress){
    progress.notTouched.productSource=false;
    progress.currentExecutionMutations={scope:'THIS_COMPOSITE_PROMOTION_ONLY',productSourceChanged:true,hostingDeploy:true,
      backendDeploy:true,backendFunctionsChanged:backendCount,businessWrites:false,financialWrites:false,
      integrationConfigurationOutsideDataOnly:true,exactSecretIamWrites:j.liveProof.makeIngress.secretIamWrites};
    progress.makeIngressDeploymentAcceptance={...receipt.makeIngress,sourceSha:head.sourceSha,artifactDigest:head.artifactDigest,
      receiptPath:head.receiptPath,acceptanceScope:'RELEASE_TIME_ONLY',realLeadAcceptanceNotIncluded:true,fullA13Accepted:false};
    progress.previousFrontendBalanceCorrection=progress.frontendBalanceCorrection;
    progress.frontendBalanceCorrection={status:'LATEST_APPROVED_VERSION_LIVE_PASS_SCOPED_FULL_I66_OPEN',
      scopeId:'SIX_RECEIPT_CURRENT_BALANCE_READONLY',generation:j.generation,sourceSha:head.sourceSha,
      buildId:head.buildId,artifactId:head.artifactId,artifactDigest:head.artifactDigest,
      preview:{...receipt.financialPreviewUi,stageCount:48,scopeOnly:true},
      live:{...receipt.financialUi,stageCount:48,scopeOnly:true},sameArtifactBothPhases:true,
      financialWritesDuringCertification:0,fullA04Accepted:false,fullA12Passed:false,fullA14Passed:false,fullI66ProductionAccepted:false};
    progress.releaseExecution.financialUi=receipt.financialUi;
    state.currentLiveSuccessorAcceptance.financialUi=receipt.financialUi;
    continuation.frontendBalanceCorrection20261124=progress.frontendBalanceCorrection;
    const a12=progress.shockObjectives.items.find(x=>x.id==='A12');assert.equal(a12.passForShock,false);
    a12.status='FINANCIAL_COMMITS_PRESERVED_SIX_RECEIPT_BALANCE_SCOPED_LIVE_PASS_FULL_A12_OPEN';
    a12.evidence+='; exact composed artifact: financial Preview48 and LIVE48 with two assigned roles, two viewports, actual reload and unchanged financial source snapshots; receipt '+receipt.financialUi.receiptPath;
    a12.next='Preserve the accepted six-record balance proof and all committed financial batches. Continue only unresolved source, identity and reconciliation cases through their approved canonical owners; no reimport of the six records.';
    progress.immediateExecution={...progress.immediateExecution,status:'COMPOSITE_ARTIFACT_AND_BALANCE_ACCEPTED_CLOSED_MAKE_ACTIVATION_PENDING',
      financialFocal:a12.next,fullA04Passed:false,fullA12Passed:false,fullA14Passed:false,fullI66ProductionAccepted:false};
    delete transport.frontendPreviewRequest;
  }
  progress.recordedAtUtc=j.liveProof.recordedAtUtc;
  synchronizeExecutionProgress(progress);
  const next='I6.6: continuar las capacidades pendientes del plan congelado: '+
    progress.remainingExecutionLanes.map(row=>row.id+' '+row.title).join('; ')+
    '. El artifact '+head.artifactDigest+' ya está aceptado; retomar sus pruebas pendientes y la operación autorizada, sin repetir su build ni promoción.';
  c.next=progress.next=continuation.currentWork=state.nextAction=cp.nextAction=next;
  progress.executionSynchronization=executionSnapshot(transport);c.executionSynchronizationVersion=1;
  c.currentEvidenceBlobSha=blob(serial(progress));
  synchronizeOwnerPlanContinuation(cp,state,transport,{archivePrior:false});
  assertActiveReleaseProgress(cp,progress,transport);
  return {...changes,[genName(j.generation,'RECEIPT')]:receipt,[receipt.liveProof.path]:j.liveProof};
}
// Observation code has its own exact source authority. It cannot change the
// accepted artifact, grant a release, or run a synthetic/business writer.
const READONLY_COMMON_PATHS=Object.freeze([
  'tools/gravicentra-i66-frontend-control.cjs','tools/gravicentra-i66-frontend-promotion-transaction.cjs',
  'tools/gravicentra-i6-6-operational-release-candidate.cjs','tools/gravicentra-i6-6-direction-preview-legal-acceptance.cjs',
  'tools/gravicentra-i6-6-readonly-observer-authority.test.cjs',
  'tools/gravicentra-governance-preflight-v1.mjs','tools/gravicentra-i6-6-delta-guard.mjs','tools/gravicentra-i6-6-delta-test-revisions.cjs',
  '.github/workflows/gravicentra-i66-privileged-role-parity-source-qa.yml','.github/workflows/gravicentra-release-lock-sync.yml'
]);
const READONLY_PROFILES=Object.freeze({
  fiveRoles:{workflow:'.github/workflows/gravicentra-i66-current-exact-preview-cross-module-uat-20261119.yml',
    paths:['tools/gravicentra-i6-6-current-live-five-role-route-readonly.cjs','tools/gravicentra-i6-6-five-role-assigned-selection.test.cjs'],
    productDependencies:['functions/product-active-role-contract.js']},
  performance:{workflow:'.github/workflows/gravicentra-i66-live-performance-readonly.yml',
    paths:['tools/gravicentra-i66-live-performance-readonly.mjs','tools/gravicentra-i6-6-performance-first-route-source-timeline.test.cjs',
      'tools/gravicentra-i6-6-six-existing-receipts-ui-readonly.test.cjs'],productDependencies:[]}
});
function readonlyObserverPaths(profile){
  const spec=READONLY_PROFILES[profile];assert.ok(spec,'READONLY_OBSERVER_PROFILE_NOT_ALLOWED');
  return [...new Set([...READONLY_COMMON_PATHS,...spec.paths,spec.workflow,...spec.productDependencies])].sort();
}
function readonlyObserverTarget(pin){
  return Object.fromEntries(['generation','sourceSha','buildId','buildRunId','artifactId','artifactDigest',
    'hostingVersion','receiptPath','receiptGitBlobSha','receiptCommit'].map(k=>[k,pin[k]]));
}
function resolveReadonlyObserver(profile,control,state,transport,io,gitRead,headSha){
  const paths=readonlyObserverPaths(profile),spec=READONLY_PROFILES[profile];
  assert.match(headSha||'',/^[a-f0-9]{40}$/,'READONLY_OBSERVER_EXECUTION_HEAD_REQUIRED');
  const pin=physicalGuard(control,state,transport,io),target=readonlyObserverTarget(pin);
  const sourceText=(sha,file)=>gitRead('show',sha+':'+file),localText=file=>io.readFileSync(file,'utf8');
  const equalSource=(sha,file)=>Buffer.from(localText(file)).equals(Buffer.from(sourceText(sha,file)));
  for(const file of spec.productDependencies)assert.ok(equalSource(pin.sourceSha,file),'READONLY_OBSERVER_LIVE_PRODUCT_DEPENDENCY_DRIFT_'+file);
  const sourcePins=Object.fromEntries(paths.map(file=>[file,blob(localText(file))]));
  const artifactMatched=paths.every(file=>{try{return equalSource(pin.sourceSha,file);}catch{return false;}});
  if(artifactMatched)return {profile,mode:'ARTIFACT_SOURCE',target,physical:pin,qaSourceSha:pin.sourceSha,
    qaPins:sourcePins,workflow:spec.workflow,executionHeadSha:headSha,readOnly:true,noReleaseTransition:true};
  const authority=control.i66OperationalContinuation20261115?.postAcceptanceGovernanceQa?.observers?.[profile];
  assert.equal(authority?.schema,'GI_I66_READONLY_OBSERVER_AUTHORITY_V1','READONLY_OBSERVER_EXACT_QA_AUTHORITY_REQUIRED');
  assert.equal(authority.status,'APPROVED_EXACT_QA_ON_ACCEPTED_LIVE');assert.equal(authority.profile,profile);
  for(const key of ['approvedByDirection','readOnly','noProductWrites','noReleaseTransitions','noSyntheticWrites'])assert.equal(authority[key],true,'READONLY_OBSERVER_BOUNDARY_'+key);
  assert.deepEqual(authority.target,target,'READONLY_OBSERVER_ACCEPTED_TARGET_DRIFT');
  assert.match(authority.qaSourceSha||'',/^[a-f0-9]{40}$/,'READONLY_OBSERVER_QA_SOURCE_REQUIRED');
  for(const key of ['sourceQaRunId','guardRunId'])assert.ok(Number.isSafeInteger(authority[key])&&authority[key]>0,'READONLY_OBSERVER_RUN_REQUIRED_'+key);
  assert.notEqual(authority.sourceQaRunId,authority.guardRunId);
  gitRead('merge-base','--is-ancestor',pin.sourceSha,authority.qaSourceSha);
  gitRead('merge-base','--is-ancestor',authority.qaSourceSha,headSha);
  assert.deepEqual(Object.keys(authority.qaPins||{}).sort(),paths,'READONLY_OBSERVER_EXACT_PIN_SET_REQUIRED');
  assert.deepEqual(authority.qaPins,sourcePins,'READONLY_OBSERVER_EXECUTING_BYTES_DRIFT');
  for(const file of paths){
    assert.match(authority.qaPins[file],/^[a-f0-9]{40}$/);
    assert.equal(String(gitRead('rev-parse',authority.qaSourceSha+':'+file)).trim(),authority.qaPins[file],'READONLY_OBSERVER_QA_SOURCE_BLOB_DRIFT_'+file);
    assert.ok(equalSource(authority.qaSourceSha,file),'READONLY_OBSERVER_QA_SOURCE_BYTES_DRIFT_'+file);
  }
  return {profile,mode:'INDEPENDENT_READONLY_QA',target,physical:pin,qaSourceSha:authority.qaSourceSha,
    qaPins:sourcePins,workflow:spec.workflow,executionHeadSha:headSha,authority,
    readOnly:true,noReleaseTransition:true};
}
async function verifyReadonlyObserver(resolution,{env=process.env,api,readMarker,stage='before'}={}){
  assert.ok(['before','after'].includes(stage));assert.ok(READONLY_PROFILES[resolution.profile]);
  const repository='paulaosoriof86/orbit360-core',branch='recovery/fase-a-clean-20260831';
  assert.equal(env.GITHUB_REPOSITORY,repository);assert.equal(env.GITHUB_REF_NAME,branch);
  assert.equal(env.GITHUB_SHA,resolution.executionHeadSha,'READONLY_OBSERVER_CURRENT_EXECUTION_HEAD_DRIFT');
  const runId=Number(env.GITHUB_RUN_ID);assert.ok(Number.isSafeInteger(runId)&&runId>0,'READONLY_OBSERVER_CURRENT_RUN_REQUIRED');
  if(!api){
    assert.ok(env.GITHUB_TOKEN,'READONLY_OBSERVER_GITHUB_READ_TOKEN_REQUIRED');
    api=async route=>{
      const response=await fetch('https://api.github.com/repos/'+repository+'/'+route,{headers:{Authorization:'Bearer '+env.GITHUB_TOKEN,
        Accept:'application/vnd.github+json','User-Agent':'Gravicentra-Readonly-Observer'},redirect:'error',signal:AbortSignal.timeout(30000)});
      assert.equal(response.status,200,'READONLY_OBSERVER_GITHUB_HTTP_'+response.status);return response.json();
    };
  }
  const current=await api('actions/runs/'+runId);
  assert.equal(current.id,runId);assert.equal(current.path,resolution.workflow);assert.equal(current.head_sha,env.GITHUB_SHA);
  assert.equal(current.head_branch,branch);assert.equal(current.status,'in_progress','READONLY_OBSERVER_JOB_NOT_EXECUTING');
  let sourceQaVerified=resolution.mode==='ARTIFACT_SOURCE';
  if(resolution.mode==='INDEPENDENT_READONLY_QA'){
    const a=resolution.authority;
    const checks=[[a.sourceQaRunId,'.github/workflows/gravicentra-i66-privileged-role-parity-source-qa.yml','signed-source-gate-no-production-writes',
      ['Source test with 5 roles, 12 domain writers and explicit negative boundaries','Canonical source blob and historic release guard without re-opening B4']],
      [a.guardRunId,'.github/workflows/gravicentra-release-lock-sync.yml','verify-control-plane',
        ['Fail closed through canonical shared governance preflight']]];
    await Promise.all(checks.map(async([id,workflow,jobName,stepNames])=>{
      const [run,jobs]=await Promise.all([api('actions/runs/'+id),api('actions/runs/'+id+'/jobs?per_page=100')]);
      assert.deepEqual([run.id,run.path,run.head_sha,run.head_branch,run.status,run.conclusion],
        [id,workflow,a.qaSourceSha,branch,'completed','success'],'READONLY_OBSERVER_SOURCE_QA_IDENTITY_DRIFT');
      assert.ok(Array.isArray(jobs.jobs)&&jobs.jobs.length>0&&jobs.jobs.length<100,'READONLY_OBSERVER_JOB_INVENTORY_INVALID');
      const matched=jobs.jobs.filter(j=>j.name===jobName);assert.equal(matched.length,1,'READONLY_OBSERVER_EXACT_SOURCE_QA_JOB_REQUIRED');
      const job=matched[0];assert.equal(job.status,'completed');assert.equal(job.conclusion,'success','READONLY_OBSERVER_SOURCE_QA_JOB_NOT_EXECUTED');
      for(const name of stepNames){const steps=job.steps?.filter(s=>s.name===name)||[];
        assert.equal(steps.length,1,'READONLY_OBSERVER_EXACT_SOURCE_QA_STEP_REQUIRED');
        assert.equal(steps[0].status,'completed');assert.equal(steps[0].conclusion,'success','READONLY_OBSERVER_SOURCE_QA_STEP_NOT_EXECUTED');
      }
    }));sourceQaVerified=true;
  }else assert.equal(resolution.mode,'ARTIFACT_SOURCE','READONLY_OBSERVER_MODE_NOT_ALLOWED');
  // Re-read the canonical control and receipt at one remote commit. This is
  // observation only; the stored authority never changes the release head.
  const ref=await api('git/ref/heads/'+branch),remoteHead=ref.object?.sha;
  assert.match(remoteHead||'',/^[a-f0-9]{40}$/,'READONLY_OBSERVER_REMOTE_HEAD_REQUIRED');
  const files=new Map();
  async function file(relative){
    const value=await api('contents/'+relative.split('/').map(encodeURIComponent).join('/')+'?ref='+remoteHead);
    assert.equal(value.path,relative);assert.match(value.sha||'',/^[a-f0-9]{40}$/);
    assert.ok(Number.isSafeInteger(value.size)&&value.size>0&&value.size<=4*1024*1024,'READONLY_OBSERVER_METADATA_SIZE_INVALID');
    const raw=value.encoding==='base64'?value:await api('git/blobs/'+value.sha);
    assert.equal(raw.encoding,'base64');const text=Buffer.from(raw.content,'base64').toString('utf8');
    assert.equal(blob(text),value.sha,'READONLY_OBSERVER_REMOTE_METADATA_BLOB_DRIFT');files.set(relative,text);return JSON.parse(text);
  }
  const [control,state,transport]=await Promise.all([file(P.cp),file(P.state),file(P.transport),file(P.ledger)]);
  const head=control.i66FrontendReleaseHead;assert.ok(head,'READONLY_OBSERVER_REMOTE_PHYSICAL_HEAD_MISSING');
  const [currentReceipt]=await Promise.all([file(genName(head.generation,'RECEIPT')),file(genName(head.generation,'JOURNAL')),
    ...(head.scope==='COMPOSITE'?[file(genName(head.generation,'LIVE_PROOF'))]:[])]);
  if(currentReceipt.financialUi)await Promise.all([file(currentReceipt.financialUi.receiptPath),
    file(currentReceipt.financialPreviewUi.receiptPath)]);
  const physical=physicalGuard(control,state,transport,{readFileSync:relative=>{
    assert.ok(files.has(relative),'READONLY_OBSERVER_UNEXPECTED_REMOTE_METADATA_PATH');return files.get(relative);
  }});
  assert.deepEqual(readonlyObserverTarget(physical),resolution.target,'READONLY_OBSERVER_PHYSICAL_RELEASE_CHANGED');
  if(resolution.mode==='INDEPENDENT_READONLY_QA')assert.deepEqual(
    control.i66OperationalContinuation20261115?.postAcceptanceGovernanceQa?.observers?.[resolution.profile],resolution.authority,
    'READONLY_OBSERVER_AUTHORITY_CHANGED');
  const origins=['https://app.aysseguros.com','https://ays-orbit-360-lab.web.app'];
  if(!readMarker)readMarker=async origin=>{
    const response=await fetch(origin+'/__recovery__/build.json',{headers:{'Cache-Control':'no-cache'},redirect:'error',signal:AbortSignal.timeout(30000)});
    assert.equal(response.status,200,'READONLY_OBSERVER_MARKER_HTTP_'+response.status);return response.json();
  };
  for(const origin of origins){const marker=await readMarker(origin);
    assert.equal(marker.sourceSha,physical.sourceSha,'READONLY_OBSERVER_SERVED_SOURCE_DRIFT');
    assert.equal(marker.buildId,physical.buildId,'READONLY_OBSERVER_SERVED_BUILD_DRIFT');
    assert.equal(marker.gate,'I6.6');assert.equal(marker.product,'Gravicentra Insurance');
  }
  return {schema:'GI_I66_READONLY_OBSERVER_EXECUTION_V1',stage,profile:resolution.profile,mode:resolution.mode,
    qaSourceSha:resolution.qaSourceSha,qaPins:resolution.qaPins,workflowHeadSha:env.GITHUB_SHA,runId,
    sourceQaRunId:resolution.authority?.sourceQaRunId||null,guardRunId:resolution.authority?.guardRunId||null,
    sourceQaVerified,remoteControlHead:remoteHead,target:resolution.target,readOnly:true,
    productWrites:0,syntheticWrites:0,releaseTransitions:0,hostedMarkersVerified:origins};
}
module.exports={P,genName,serial,blob,physicalGuard,closeFiles,executionSnapshot,executionProgressProjection,synchronizeExecutionProgress,archiveExecutionObservers,assertExecutionProgress,
  ownerPlanContinuationProjection,synchronizeOwnerPlanContinuation,assertOwnerPlanContinuation,assertActiveReleaseProgress,
  compositeReceipt,closeCompositeFiles,READONLY_PROFILES,readonlyObserverPaths,readonlyObserverTarget,resolveReadonlyObserver,verifyReadonlyObserver};
