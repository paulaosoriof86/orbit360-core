'use strict';
// Offline fixtures only: no network, deployment, consent or persisted PASS.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const g=require('./gravicentra-i6-6-operational-release-candidate.cjs');
const legal=require('./gravicentra-i6-6-direction-preview-legal-acceptance.cjs');
const owner=require('./gravicentra-i66-frontend-control.cjs');
const tx=require('./gravicentra-i66-frontend-promotion-transaction.cjs');
const {assertCompositeRollbackAllowed}=require('./gravicentra-i66-frontend-promotion-owner.cjs');
// Load reusable sample definitions at module scope so their node:test cases
// remain top-level and cannot be cancelled as nested tests of makeFixture.
const makeExamples=require('./gravicentra-i66-make-release-scope.test.cjs');
const {P,genName,serial,blob}=owner,clone=v=>JSON.parse(JSON.stringify(v));
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
function fixture(){
  const cp=read(P.cp),state=read(P.state),transport=read(P.transport),ledger=read(P.ledger),previous=cp.i66FrontendReleaseHead;
  const p=clone(read(g.ACCEPTANCE_RECEIPT).candidate),proof=read(g.ACCEPTANCE_PROOF);
  delete p.previewRollover;
  Object.assign(p,{sourceSha:'9'.repeat(40),buildId:'gi-i66-'+ '9'.repeat(12)+'-57f234755dc1',
    buildRunId:232,artifactId:233,artifactDigest:'sha256:'+'b'.repeat(64),previewChannelId:'gi-i66-rc-232',
    previewUrl:'https://ays-orbit-360-lab--gi-i66-rc-232-ab12cd34.web.app',opsLeadsComposite:true,compositeVersion:1,
    targets:clone(g.COMPOSITE_TARGETS),expectedSiteFileCount:224,rollbackFourBackendRevisionsAndHosting:true,
    opsLeadsBackendPath:'functions/product-ops-leads-domain.js',opsLeadsBackendBlobSha:'b7921ca88343ced65bdad4cd9de26fa120647083',
    currentPhysicalLive:clone(transport.currentPhysicalHostingRelease),currentLive:{sourceSha:previous.sourceSha,
      buildId:previous.buildId,artifactId:previous.artifactId,artifactDigest:previous.artifactDigest,
      buildRunId:previous.buildRunId,liveRunId:previous.liveCloneRunId,hostingVersion:previous.hostingVersion},
    previewQa:{runId:234,headSha:'7'.repeat(40),receiptArtifactId:235,receiptArtifactDigest:'sha256:'+'d'.repeat(64),
      status:'SIGNED_DRIVERS_DURABLE_READBACK_RELOAD_RESTORE_PASS'}});
  p.legalAcceptance=legal.i66ScopeCandidatePin(p);
  p.liveLegalAcceptance=legal.liveScopeCandidatePin(p,p.liveLegalAcceptance.receiptSha256,read(legal.LIVE_SCOPE.authorizationPath));
  for(const key of ['sourceSha','buildId','buildRunId','artifactId','artifactDigest','previewQa'])proof[key]=clone(p[key]);
  Object.assign(proof,{runId:236,headSha:'8'.repeat(40),previewChannel:p.previewChannelId,
    recordedAtUtc:'2026-11-23T23:30:00.000Z',
    status:'SAME_ARTIFACT_FOUR_FUNCTIONS_SIGNED_LIVE_READBACK_RELOAD_RESTORE_PASS',previousLive:clone(p.currentLive),
    previousHostingVersion:previous.hostingVersion,previewHostingVersion:'sites/ays-orbit-360-lab/versions/fixture-composite',
    liveHostingVersion:'sites/ays-orbit-360-lab/versions/fixture-composite',previewFiles:224,liveSiteFiles:224,customSiteFiles:224,
    targets:clone(g.COMPOSITE_TARGETS.live),backendRevisions:g.COMPOSITE_TARGETS.live.map(({name,region})=>({name,region,
      service:name.toLowerCase(),previousRevision:name.toLowerCase()+'-before',currentRevision:name.toLowerCase()+'-after',
      trafficPercent:100,ready:true}))});
  for(const entry of Object.values(proof.directionLiveLegalAcceptance))Object.assign(entry,{sourceSha:p.sourceSha,buildId:p.buildId});
  delete transport.scopedBackendPreviewI66;
  Object.assign(transport,{status:'OPERATIONAL_EXACT_LIVE_PROMOTION_AUTHORIZED',forbidBackendFunctionDeploy:false,
    backendFunctionPreviewOnly:false,forbidBackendLiveFunctionDeploy:false,livePromotionAuthorized:true,
    previewApproved:true,noHostingPromotion:false,operationalReleaseCandidate:p});
  const request={schema:'GI_I66_FRONTEND_PROMOTION_V1',scope:'COMPOSITE',gate:'I6.6',generation:previous.generation+1,
    approvalBlob:'c'.repeat(40),guardBlob:'d'.repeat(40),previousReceiptBlob:previous.receiptGitBlobSha,candidate:p,
    previous:{sourceSha:previous.sourceSha,sourceTree:previous.sourceTree,manifestBlob:previous.manifestBlob,
      compositionBlob:previous.compositionBlob,artifactId:previous.artifactId,artifactDigest:previous.artifactDigest,
      buildId:previous.buildId,buildRunId:previous.buildRunId,hostingVersion:previous.hostingVersion,files:previous.hostedFilesEachOrigin},
    target:{sourceSha:p.sourceSha,sourceTree:'4'.repeat(40),manifestBlob:'5'.repeat(40),compositionBlob:'6'.repeat(40),
      artifactId:p.artifactId,artifactDigest:p.artifactDigest,buildId:p.buildId,buildRunId:p.buildRunId,
      previewUrl:p.previewUrl,previewChannel:p.previewChannelId,hostingVersion:proof.liveHostingVersion,files:224}};
  cp.i66ActiveRecoveryCursor.executionSynchronizationVersion=1;
  const progressPath=cp.i66ActiveRecoveryCursor.currentEvidencePath,progress=read(progressPath);
  progress.executionSynchronization=owner.executionSnapshot(transport);cp.i66ActiveRecoveryCursor.currentEvidenceBlobSha=blob(serial(progress));
  const files=new Map([[P.cp,cp],[P.state,state],[P.transport,transport],[P.ledger,ledger],[progressPath,progress]]);
  const readFile=p=>clone(files.has(p)?files.get(p):read(p));
  const readText=p=>files.has(p)?serial(files.get(p)):fs.readFileSync(p,'utf8');
  const jp=genName(request.generation,'JOURNAL'),rp=genName(request.generation,'RECEIPT');
  const model={current:request.target.hostingVersion,commits:0,clones:0,checks:0};
  const io={readJournal:async()=>files.get(jp)||null,
    readControl:async()=>({generation:previous.generation,physical:request.previous,receiptBlob:request.previousReceiptBlob,
      guardBlob:'d'.repeat(40),consumed:transport.consumedFrontendAuthorities||[],authorization:transport}),
    validateProofs:async()=>{model.checks++;},
    verifyPreview:async()=>({files:224,hostingVersion:proof.previewHostingVersion,artifactDigest:p.artifactDigest}),
    verifyLive:async()=>({firebase:224,custom:224,sourceSha:p.sourceSha,buildId:p.buildId,artifactDigest:p.artifactDigest,
      hostingVersion:model.current,manifestDigest:'sha256:'+'0'.repeat(64)}),currentVersion:async()=>model.current,
    cas:async(old,next)=>{assert.deepEqual(files.get(jp)||null,old);files.set(jp,next);return next;},
    assertOwnership:async j=>assert.deepEqual(files.get(jp),j),
    signedReceipt:async j=>{const receipt=owner.compositeReceipt(j,proof.runId);files.set(rp,receipt);files.set(receipt.liveProof.path,proof);
      return {blob:blob(serial(receipt)),commit:'a'.repeat(40),verified:true,runId:proof.runId};},
    commitAll:async(j,next)=>{assert.deepEqual(files.get(jp),j);const changes=owner.closeCompositeFiles(readFile,j,next);
      for(const [path,value] of Object.entries(changes))files.set(path,value);model.commits++;return next;},
    verifyCommitted:async j=>{assert.equal(j.phase,'COMMITTED');assert.equal(model.current,request.target.hostingVersion);
      owner.physicalGuard(readFile(P.cp),readFile(P.state),readFile(P.transport),{readFileSync:readText});},
    clone:async()=>{model.clones++;throw Error('COMPOSITE_ACCEPTANCE_MUST_NOT_DEPLOY');}}
  return {request,proof,p,cp,state,transport,ledger,files,io,model,readFile,readText,jp,rp};
}
test('composite acceptance synchronizes one generation and four revisions without another deployment',async()=>{
  const f=fixture(),priorProgressPath=f.cp.i66ActiveRecoveryCursor.currentEvidencePath;
  const priorProgress=f.readFile(priorProgressPath),priorProgressBytes=f.readText(priorProgressPath);
  const priorObservations=priorProgress.postAcceptanceObserverResults;
  const priorObserverBytes=priorObservations?f.readText(priorObservations.receiptPath):null;
  const out=await tx.acceptComposite(f.io,f.request,f.proof);await f.io.verifyCommitted(out);
  assert.equal(out.operation,'ACCEPT_EXECUTED_COMPOSITE_LIVE');assert.equal(f.model.clones,0);assert.equal(f.model.commits,1);
  const cp=f.readFile(P.cp),tr=f.readFile(P.transport),state=f.readFile(P.state),ledger=f.readFile(P.ledger),head=cp.i66FrontendReleaseHead;
  assert.equal(head.scope,'COMPOSITE');assert.equal(head.generation,f.request.generation);
  assert.equal(tr.currentPhysicalHostingRelease.backendFunctionsChanged,4);assert.equal(tr.operationalReleaseCandidate,undefined);
  assert.deepEqual(cp.i66CurrentPhysicalBackendRelease,ledger.backendReleaseHead);
  assert.deepEqual(state.currentPhysicalBackend,tr.currentPhysicalBackendRelease);
  assert.equal(state.currentLiveSuccessorAcceptance.sourceSha,head.sourceSha);
  assert.deepEqual(cp.i66OperationalContinuation20261115.currentPhysicalHostingRelease,tr.currentPhysicalHostingRelease);
  assert.deepEqual(tr.currentPhysicalBackendRelease.revisions,f.proof.backendRevisions);
  const progress=f.readFile(cp.i66ActiveRecoveryCursor.currentEvidencePath);
  assert.deepEqual(progress.executionSynchronization,owner.executionSnapshot(tr));
  assert.equal(progress.notTouched.backendDeploy,false);
  assert.equal(progress.releaseExecution.status,'COMPOSITE_FOUR_FUNCTIONS_SIGNED_LIVE_ACCEPTED');
  for(const key of ['artifactBuilt','previewSignedPass','livePromoted'])assert.equal(progress.releaseExecution[key],true);
  assert.equal(progress.releaseExecution.liveRunId,f.proof.runId);
  assert.equal(progress.releaseExecution.artifactDigest,f.p.artifactDigest);
  assert.equal(progress.releaseExecution.recordedAtUtc,f.proof.recordedAtUtc);
  assert.equal(progress.recordedAtUtc,f.proof.recordedAtUtc);
  assert.deepEqual(progress.previousReleaseExecution,f.readFile(progress.previousEvidencePath).releaseExecution);
  assert.deepEqual(progress.consumedPreviewRequest,tr.lastConsumedFrontendPreviewRequest);
  for(const next of [cp.nextAction,state.nextAction,cp.i66ActiveRecoveryCursor.next,cp.i66OperationalContinuation20261115.currentWork])
    assert.equal(next,progress.next);
  assert.ok(!progress.next.includes('construir y leer el artifact nuevo de V12'));
  assert.ok(progress.remainingExecutionLanes.length>0);
  // An observation is scoped to the bytes it measured. A successor preserves
  // every unrelated/closed objective and the exact old proof, but cannot keep
  // that proof's PASS or HOLD labelled as a measurement of the new artifact.
  const observedIds=new Set(['A04','A12','A14']);
  const {items:priorItems,...priorTotals}=priorProgress.shockObjectives;
  const {items:currentItems,...currentTotals}=progress.shockObjectives;
  assert.deepEqual(currentTotals,priorTotals);
  assert.deepEqual(currentItems.map(row=>row.id),priorItems.map(row=>row.id));
  for(const before of priorItems){
    const after=currentItems.find(row=>row.id===before.id);
    if(!priorObservations||!observedIds.has(before.id)||before.passForShock===true){
      assert.deepEqual(after,before);continue;
    }
    const {status:oldStatus,evidence:oldEvidence,next:oldNext,...unchangedBefore}=before;
    const {status,evidence,next,...unchangedAfter}=after;
    assert.deepEqual(unchangedAfter,unchangedBefore);
    assert.equal(status,'CURRENT_ARTIFACT_OBSERVER_PENDING_PRIOR_RESULT_HISTORICAL');
    assert.notEqual(status,oldStatus);
    assert.ok(evidence.includes(oldEvidence));
    assert.ok(next.includes(oldNext)&&next.includes(priorObservations.receiptPath));
  }
  assert.equal(f.readText(priorProgressPath),priorProgressBytes,'PREVIOUS_PROGRESS_MUST_REMAIN_IMMUTABLE');
  if(priorObservations){
    const receipt=JSON.parse(priorObserverBytes),archived=progress.priorPostAcceptanceObserverResults.at(-1);
    assert.equal(blob(priorObserverBytes),priorObservations.receiptGitBlobSha);
    assert.equal(f.readText(priorObservations.receiptPath),priorObserverBytes,'PREVIOUS_OBSERVER_RECEIPT_MUST_REMAIN_IMMUTABLE');
    assert.deepEqual(archived.results,priorObservations);
    assert.deepEqual(archived.target,receipt.target);
    assert.deepEqual(archived.objectiveStates,priorItems.filter(row=>observedIds.has(row.id)));
    assert.equal(archived.acceptanceScope,'HISTORICAL_ORIGINAL_ARTIFACT_ONLY');
    assert.equal(archived.immutableReceiptRetained,true);
    assert.equal(progress.postAcceptanceObserverResults,undefined);
    assert.equal(cp.i66ActiveRecoveryCursor.lastObserverResultsReceipt,undefined);
    assert.deepEqual(archived.supersededByTarget,progress.currentObserverStatus.target);
  }
  if(priorObservations||priorProgress.currentObserverStatus){
    assert.equal(progress.currentObserverStatus.status,'PENDING_READONLY_OBSERVATION_ON_CURRENT_ACCEPTED_ARTIFACT');
    assert.equal(progress.currentObserverStatus.acceptanceTransferred,false);
    for(const key of ['generation','sourceSha','buildId','artifactId','artifactDigest','hostingVersion'])
      assert.equal(progress.currentObserverStatus.target[key],head[key]);
  }
  owner.assertExecutionProgress(cp,progress,{readFileSync:f.readText});
  assert.deepEqual(progress.officialProgress,f.readFile(progress.previousEvidencePath).officialProgress);
  assert.equal(cp.i66ActiveRecoveryCursor.currentEvidenceBlobSha,blob(serial(progress)));
  assert.equal(progress.financialWork.currentIterationRealCustomerFinancialWrites,
    f.readFile(progress.previousEvidencePath).financialWork.currentIterationRealCustomerFinancialWrites);
  await tx.acceptComposite(f.io,f.request,f.proof);assert.equal(f.model.commits,1);
});
for(const [label,mutate] of [
  ['three-function proof',f=>f.proof.backendRevisions.pop()],
  ['unsigned/HOLD result',f=>f.proof.status='HOLD'],
  ['artifact mismatch',f=>f.proof.artifactDigest='sha256:'+'0'.repeat(64)],
  ['missing LIVE legal reload',f=>f.proof.directionLiveLegalAcceptance.advisorPayables.reloadReadback=false],
  ['synthetic records not restored',f=>f.proof.syntheticRestoreComplete=false],
  ['unproven real financial writes',f=>f.proof.realFinancialOrCustomerWrites=1],
  ['backend serving previous revision',f=>f.proof.backendRevisions[3].currentRevision=f.proof.backendRevisions[3].previousRevision],
  ['partial backend traffic',f=>f.proof.backendRevisions[3].trafficPercent=50],
  ['different predecessor',f=>f.request.previous.hostingVersion+='wrong'],
  ['stale guard',f=>f.request.guardBlob='0'.repeat(40)],
  ['Preview-only authorization',f=>f.transport.status='OPERATIONAL_BACKEND_PREVIEW_AUTHORIZED'],
  ['foreign live version',f=>f.model.current='sites/ays-orbit-360-lab/versions/foreign'],
  ['incomplete byte readback',f=>{const verify=f.io.verifyLive;f.io.verifyLive=async()=>({...await verify(),custom:223});}]
])test('composite acceptance refuses '+label+' without advancing control',async()=>{
  const f=fixture(),before=serial(f.readFile(P.cp));mutate(f);
  await assert.rejects(tx.acceptComposite(f.io,f.request,f.proof));
  assert.equal(f.model.commits,0);assert.equal(f.model.clones,0);assert.equal(serial(f.readFile(P.cp)),before);
});
test('metadata CAS failure never records COMMITTED and leaves rollback to the LIVE owner',async()=>{
  const f=fixture();f.io.commitAll=async()=>{throw Error('HEAD_CAS_FAILED');};
  await assert.rejects(tx.acceptComposite(f.io,f.request,f.proof),/HEAD_CAS_FAILED/);
  assert.equal(f.files.get(f.jp).phase,'VERIFIED');assert.equal(f.model.clones,0);assert.equal(f.model.commits,0);
});
test('semantic close refuses a proof without its real sealing timestamp and preserves all control pointers',async()=>{
  const f=fixture(),before=serial(f.readFile(P.cp));delete f.proof.recordedAtUtc;
  await assert.rejects(tx.acceptComposite(f.io,f.request,f.proof),/COMPOSITE_ACCEPTANCE_TIMESTAMP_REQUIRED/);
  assert.equal(f.model.commits,0);assert.equal(serial(f.readFile(P.cp)),before);
});
test('lost acknowledgement after the atomic close returns COMMITTED without rollback',async()=>{
  const f=fixture(),commit=f.io.commitAll;f.io.commitAll=async(...args)=>{await commit(...args);throw Error('LOST_ACK');};
  const j=await tx.acceptComposite(f.io,f.request,f.proof);
  assert.equal(j.phase,'COMMITTED');assert.equal(f.model.clones,0);assert.equal(f.model.commits,1);
});
test('physical guard rejects a composite release labelled zero backend changes or a stale backend pointer',async()=>{
  for(const mutate of [f=>f.files.get(P.transport).currentPhysicalHostingRelease.backendFunctionsChanged=0,
    f=>f.files.get(P.state).currentPhysicalBackend={sourceSha:'0'.repeat(40)},
    f=>{const receipt=f.files.get(f.rp);delete receipt.scope;const hash=blob(serial(receipt));
      f.files.get(P.cp).i66FrontendReleaseHead.receiptGitBlobSha=hash;f.files.get(f.jp).receipt.blob=hash;}]){
    const f=fixture();const j=await tx.acceptComposite(f.io,f.request,f.proof);mutate(f);
    await assert.rejects(f.io.verifyCommitted(j));
  }
});
test('frontend-only promoter cannot execute the composite acceptance path',async()=>{
  const f=fixture();await assert.rejects(tx.promote(f.io,f.request),/COMPOSITE_MUST_CONSUME_EXECUTED_LIVE_PROOF/);
  assert.equal(f.model.commits,0);assert.equal(f.model.clones,0);
});
test('a verified rollback preserves its immutable receipt and permits the next generation',()=>{
  const {nextCompositeGeneration}=require('./gravicentra-i66-frontend-promotion-owner.cjs');
  assert.equal(nextCompositeGeneration(2,()=>null),3);
  assert.equal(nextCompositeGeneration(2,n=>n===3?{phase:'ROLLED_BACK'}:null),4);
  assert.equal(nextCompositeGeneration(2,n=>n===3?{phase:'VERIFIED'}:null),3);
  assert.throws(()=>nextCompositeGeneration(2,()=>({phase:'COMMITTED'})),/COMPOSITE_PREVIOUS_ATTEMPT_NOT_TERMINAL/);
  assert.throws(()=>nextCompositeGeneration(2,()=>({phase:'INCIDENT'})),/COMPOSITE_PREVIOUS_ATTEMPT_NOT_TERMINAL/);
});
function rollbackContext(f){
  return {runId:f.proof.runId,sourceSha:f.request.target.sourceSha,previous:f.request.previous,transport:f.readFile(P.transport)};
}
function financialReport(f,j,phase='live'){
  const releaseOwner=require('./gravicentra-i66-frontend-promotion-owner.cjs'),binding=f.request.financialQa;
  const rows=Array.from({length:6},(_,i)=>({receiptId:'offline-existing-'+i,serverBalanceProof:{sourceSha:f.p.sourceSha,
    ownerBlob:'a'.repeat(40),open:true,balanceCents:27826,source:'CARTERA_EXPLICIT'}}));
  const checks=Object.fromEntries(['balanceState','balanceValue','balanceVerified','contractualDue','gross','operationalLimit','status'].map(k=>[k,true]));
  const roles=['operativo','direccion'].flatMap((role,index)=>[1365,390].map(width=>{
    const observations=rows.map(row=>{const ui={actorMatches:true,role,country:'GT',protectedCandidate:true,confirmed:true,
      relevantErrors:[],detailCount:1,balanceCents:27826,displayedBalanceCents:27826,balanceState:'open',open:true,
      amountProofSource:'CARTERA_EXPLICIT',viewport:{width,detailVisible:true,balanceVisible:true,horizontalOverflowPx:0}};
      return {receiptId:row.receiptId,reloadPass:true,beforeCheck:{pass:true,checks:clone(checks)},afterCheck:{pass:true,checks:clone(checks)},
        beforeReload:clone(ui),afterReload:clone(ui)};});
    return {role,width,actorSha256:String(index+1).repeat(64),authenticated:true,assignedRoleVerified:true,country:'GT',viewportVerified:true,
      financialFocal:{sixExistingObligations:true,distinctObligationCount:6,newObligations:0,additionalWrites:0,sourceGrossCents:166956,
        currentOutstandingCents:166956,policyUnchanged:true,sourceSnapshotBefore:clone(rows),sourceSnapshotAfter:clone(rows),observations,
        cobrosEngineBeforeReload:{totalGrossCents:166956},cobrosEngineAfterReload:{totalGrossCents:166956},
        errors:{pageErrors:0,consoleErrors:0,blockedWrites:0,httpClasses:{}}}};
  }));
  const before={stage:'before',phase,scopeId:binding.scopeId,readOnly:true,releaseScope:'COMPOSITE',generation:f.request.generation,
    target:releaseOwner.financialTarget(f.request.target),authorityBlob:binding.authorityBlob,parentAuthorityBlob:binding.parentAuthorityBlob,
    physicalPhaseKey:phase==='live'?j.key:null,runId:f.proof.runId,workflowHeadSha:f.proof.headSha};
  return {schema:'GI_I66_BROWSER_PERFORMANCE_READONLY_V2',status:'FRONTEND_SIX_RECEIPTS_TWO_ROLE_TWO_VIEW_READONLY_PASS',phase,
    scopeId:binding.scopeId,sourceSha:f.p.sourceSha,buildId:f.p.buildId,releaseArtifactId:f.p.artifactId,
    releaseArtifactDigest:f.p.artifactDigest,releaseBuildRunId:f.p.buildRunId,workflowHeadSha:f.proof.headSha,
    origin:phase==='live'?'https://app.aysseguros.com':f.p.previewUrl,firestoreWrites:0,businessActions:0,paymentActions:0,
    syntheticFixtures:0,pushNotifications:0,readOnly:true,roleChanged:false,assignedRoleSelectionOnly:true,
    fullA04Accepted:false,fullA12Passed:false,errors:[],roles,matrixServerSnapshotBefore:rows,matrixServerSnapshotAfter:clone(rows),
    frontendQaBefore:before,frontendQaAfter:{...clone(before),stage:'after'},stageCount:48};
}
function makeFixture(){
  const f=fixture(),scope=require('./gravicentra-i66-make-release-scope.cjs');
  const examples=makeExamples,sample=examples.fixture().p;
  Object.assign(f.p,{makeIngressComposite:true,compositeVersion:2,makeIngress:clone(sample.makeIngress),targets:clone(g.MAKE_TARGETS),
    financialPreviewQa:clone(sample.financialPreviewQa),
    rollbackFiveBackendRevisionsAndHosting:true,noRulesAuthIamWrites:false,noRulesAuthMembershipWrites:true,onlyExactSecretIamDeltaAllowed:true,
    opsLeadsBackendBlobSha:sample.opsLeadsBackendBlobSha});f.p.makeIngress.sourceSha=f.p.sourceSha;
  const liveTrigger=examples.trigger(f.p,'live'),previewTrigger=examples.trigger(f.p,'preview');
  f.proof.status=scope.LIVE_STATUS;f.proof.targets=clone(g.MAKE_TARGETS.live);
  f.proof.backendRevisions.push({...scope.ADDED.live,service:scope.ADDED.live.name.toLowerCase(),previousState:'ABSENT',
    previousRevision:null,currentRevision:liveTrigger.revision,trafficPercent:100,ready:true,rollbackAction:'DELETE_EXACT_CREATED_FUNCTION'});
  f.proof.makeIngress={status:'CLOSED_DEPLOYMENT_AUTH_CONTEXT_VERIFIED',active:false,a13RealLeadAccepted:false,
    closedTrigger:liveTrigger,configurationWritesOutsideDataOnly:true,externalMessagesSent:0,secretIamWrites:1,
    secretIamReadback:{status:'SECRET_RUNTIME_ACCESS_VERIFIED',secretResource:scope.SECRET,principal:scope.RUNTIME,
      role:'roles/secretmanager.secretAccessor',secretReadback:true,iamWrites:1,projectIamWrites:0,secretValueWrites:0,
      firestoreWrites:0,membershipWrites:0,externalMessagesSent:0},
    preview:{schema:'GI_I66_MAKE_LEAD_INGRESS_PREVIEW_PROOF_V1',status:'PASS',sourceSha:f.p.sourceSha,artifactDigest:f.p.artifactDigest,
      closedTrigger:previewTrigger,authenticatedMakeQueue:true,providerFixtureIsSynthetic:true,pendingOperationsCanonicalLead:true,
      canonicalReadback:true,sameImmutableArtifact:true,noOtherOperationalMutations:true,syntheticRestoreComplete:true,
      createdCanonicalLeads:1,replayCanonicalWrites:0,rejectCanonicalWrites:0,externalMessagesSent:0,realLeadAccepted:false,
      reportSha256:'e'.repeat(64),reportBlobSha:'f'.repeat(40)}};
  const previewReceipt={schema:'GI_I66_FRONTEND_FINANCIAL_PREVIEW_UI_RECEIPT_V1',result:'PASS',readOnly:true,
    releaseScope:'COMPOSITE',sourceSha:f.p.sourceSha,artifactDigest:f.p.artifactDigest,buildId:f.p.buildId};
  f.p.financialPreviewQa.receiptPath=genName(f.request.generation,'PREVIEW_UI');
  f.p.financialPreviewQa.receiptBlob=blob(serial(previewReceipt));
  f.files.set(f.p.financialPreviewQa.receiptPath,previewReceipt);
  f.request.financialQa={scopeId:'SIX_RECEIPT_CURRENT_BALANCE_READONLY',authorityBlob:'a'.repeat(40),parentAuthorityBlob:f.request.approvalBlob,
    previewReceiptPath:f.p.financialPreviewQa.receiptPath,previewReceiptBlob:f.p.financialPreviewQa.receiptBlob};
  f.model.financialProofs=0;f.model.signedReceipts=0;
  const signed=f.io.signedReceipt;f.io.signedReceipt=async j=>{f.model.signedReceipts++;return signed(j);};
  f.financialReport=financialReport;
  f.io.financialLiveUiProof=async j=>{
    f.model.financialProofs++;const report=financialReport(f,j),receipt=tx.compositeFinancialUiReceipt(f.request,j,report);
    const receiptPath=genName(j.generation,'LIVE_UI');f.files.set(receiptPath,receipt);
    return {result:'PASS',scopeId:f.request.financialQa.scopeId,generation:j.generation,sourceSha:f.p.sourceSha,
      artifactDigest:f.p.artifactDigest,buildId:f.p.buildId,authorityBlob:f.request.financialQa.authorityBlob,
      parentAuthorityBlob:f.request.approvalBlob,physicalPhaseKey:j.key,receiptPath,receiptBlob:blob(serial(receipt)),
      reportSha256:receipt.reportSha256,runId:f.proof.runId,financialQa:report};
  };
  return f;
}
test('five-target successor closes the same artifact with a CLOSED machine ingress and preserves all financial evidence',async()=>{
  const f=makeFixture(),beforeProgress=f.readFile(f.cp.i66ActiveRecoveryCursor.currentEvidencePath),beforeFinance=clone(beforeProgress.financialWork);
  const j=await tx.acceptComposite(f.io,f.request,f.proof);await f.io.verifyCommitted(j);
  const cp=f.readFile(P.cp),tr=f.readFile(P.transport),state=f.readFile(P.state),progress=f.readFile(cp.i66ActiveRecoveryCursor.currentEvidencePath);
  assert.equal(j.phase,'COMMITTED');assert.equal(f.model.clones,0);assert.equal(f.model.commits,1);
  assert.equal(f.model.financialProofs,1);assert.equal(f.model.signedReceipts,1);
  assert.equal(j.financialUi.result,'PASS');assert.equal(f.readFile(j.financialUi.receiptPath).financialQa.stageCount,48);
  assert.equal(tr.currentPhysicalBackendRelease.functionsChanged,5);assert.equal(tr.currentPhysicalHostingRelease.backendFunctionsChanged,5);
  assert.equal(cp.i66OperationalContinuation20261115.latestProvenLiveSourceScope,'COMPOSITE_FRONTEND_AND_FIVE_BACKEND_FUNCTIONS_CLOSED_INGRESS_SIGNED_PROOF');
  assert.equal(progress.releaseExecution.status,'COMPOSITE_FIVE_FUNCTIONS_CLOSED_INGRESS_SIGNED_LIVE_ACCEPTED');
  assert.equal(progress.notTouched.productSource,false);assert.equal(progress.currentExecutionMutations.businessWrites,false);
  assert.equal(progress.currentExecutionMutations.financialWrites,false);
  const {currentSignedUiReadback:priorUi,...priorFinance}=beforeFinance;
  const {currentSignedUiReadback:nextUi,...afterFinance}=progress.financialWork;
  assert.deepEqual(afterFinance,priorFinance);
  if(priorUi){assert.equal(nextUi,undefined);assert.deepEqual(f.readFile(progress.previousEvidencePath).financialWork.currentSignedUiReadback,priorUi);}
  assert.equal(progress.makeIngressDeploymentAcceptance.acceptanceScope,'RELEASE_TIME_ONLY');
  assert.equal(progress.makeIngressDeploymentAcceptance.active,false);assert.equal(progress.makeIngressDeploymentAcceptance.a13RealLeadAccepted,false);
  assert.equal(f.readFile(f.rp).makeIngress.active,false);assert.equal(tr.frontendPreviewRequest,undefined);
  assert.deepEqual(state.currentPhysicalBackend,tr.currentPhysicalBackendRelease);
  assert.equal(j.liveProof.fullI66ProductionAccepted,false);
  await tx.acceptComposite(f.io,f.request,f.proof);assert.equal(f.model.commits,1);
  assert.equal(f.model.financialProofs,1);assert.equal(f.model.signedReceipts,1);
});
for(const [name,mutate] of [
  ['missing financial driver',f=>delete f.io.financialLiveUiProof],
  ['missing binding',f=>delete f.request.financialQa],
  ['wrong parent',f=>f.request.financialQa.parentAuthorityBlob='0'.repeat(40)],
  ['failed LIVE observation',f=>f.io.financialLiveUiProof=async()=>{throw Error('OFFLINE_LIVE_UI_HOLD');}],
  ['47 stages',f=>{const fn=f.io.financialLiveUiProof;f.io.financialLiveUiProof=async j=>{const x=await fn(j);x.financialQa.stageCount=47;return x;};}],
  ['wrong role',f=>{const fn=f.io.financialLiveUiProof;f.io.financialLiveUiProof=async j=>{const x=await fn(j);x.financialQa.roles[0].role='admin';return x;};}],
  ['changed source snapshot',f=>{const fn=f.io.financialLiveUiProof;f.io.financialLiveUiProof=async j=>{const x=await fn(j);x.financialQa.matrixServerSnapshotAfter[0].serverBalanceProof.balanceCents++;return x;};}],
  ['reload not proved',f=>{const fn=f.io.financialLiveUiProof;f.io.financialLiveUiProof=async j=>{const x=await fn(j);x.financialQa.roles[0].financialFocal.observations[0].reloadPass=false;return x;};}],
  ['wrong artifact',f=>{const fn=f.io.financialLiveUiProof;f.io.financialLiveUiProof=async j=>{const x=await fn(j);x.financialQa.releaseArtifactDigest='sha256:'+'0'.repeat(64);return x;};}],
  ['wrong report hash',f=>{const fn=f.io.financialLiveUiProof;f.io.financialLiveUiProof=async j=>({...await fn(j),reportSha256:'0'.repeat(64)});}],
  ['wrong receipt bytes',f=>{const fn=f.io.financialLiveUiProof;f.io.financialLiveUiProof=async j=>({...await fn(j),receiptBlob:'0'.repeat(40)});}],
  ['financial write',f=>{const fn=f.io.financialLiveUiProof;f.io.financialLiveUiProof=async j=>{const x=await fn(j);x.financialQa.firestoreWrites=1;return x;};}]
])test('five-target acceptance refuses '+name+' before signing or advancing physical control',async()=>{
  const f=makeFixture(),before=serial(f.readFile(P.cp));mutate(f);await assert.rejects(tx.acceptComposite(f.io,f.request,f.proof));
  assert.equal(f.model.signedReceipts,0);assert.equal(f.model.commits,0);assert.equal(serial(f.readFile(P.cp)),before);
});
test('the actual financial certifier keeps the parent responsive and recovers a lost signed-UI acknowledgement before one close',async()=>{
  const releaseOwner=require('./gravicentra-i66-frontend-promotion-owner.cjs'),f=makeFixture(),vm=require('node:vm');
  const path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'offline-composite-financial-certifier-'));
  const source=fs.readFileSync(require.resolve('./gravicentra-i66-frontend-promotion-owner.cjs'),'utf8');
  const start=source.indexOf('async function certifyCompositeFinancialLive('),end=source.indexOf('\nfunction nextCompositeGeneration(',start);
  assert.ok(start>0&&end>start);let heartbeat=0,writes=0,reads=0,signatures=0,children=0;
  const timer=setInterval(()=>heartbeat++,2),sha='b'.repeat(40),financialDriver='tools/gravicentra-i66-live-performance-readonly.mjs';
  const context={assert,fs,path,crypto,JSON,genName,serial,blob,runId:f.proof.runId,FINANCIAL_DRIVER:financialDriver,FINANCIAL_SCOPE:releaseOwner.FINANCIAL_SCOPE,
    process:{execPath:process.execPath,env:{RUNNER_TEMP:tmp}},remote:()=>sha,
    optional:(_head,p)=>f.files.get(p)||null,blobAt:(_head,p)=>blob(serial(f.readFile(p))),
    validateFinancialPhasePair:releaseOwner.validateFinancialPhasePair,
    runReleaseChild:async(file,args,options)=>{
      children++;assert.equal(file,process.execPath);assert.deepEqual(Array.from(args),[financialDriver]);
      assert.equal(options.env.GI_I66_READONLY_MODE,'six-frontend-release');assert.equal(options.env.GI_I66_PERF_PHASE,'live');
      const j=f.files.get(f.jp),encoded=Buffer.from(serial(financialReport(f,j))).toString('base64');
      const child="setTimeout(()=>require('node:fs').writeFileSync(process.argv[1],Buffer.from(process.argv[2],'base64')),75)";
      await releaseOwner.runReleaseChild(file,['-e',child,options.env.GI_I66_PERF_REPORT,encoded],{stdio:'ignore',timeout:5000});
      assert.ok(heartbeat>1,'FINANCIAL_CHILD_BLOCKED_RELEASE_PARENT');
    },
    casCommit:async(head,_headline,entries)=>{
      assert.equal(head,sha);
      return releaseOwner.commitWithReadback({write:async()=>{
        writes++;for(const [p,value]of Object.entries(entries))f.files.set(p,JSON.parse(serial(value)));
        throw Object.assign(new TypeError('fetch failed'),{cause:{code:'ECONNRESET'}});
      },readback:async()=>{reads++;for(const [p,value]of Object.entries(entries))assert.equal(blob(serial(f.readFile(p))),blob(serial(value)));
        return {status:'EXACT_COMMIT',sha};},verifySignature:async value=>{assert.equal(value,sha);signatures++;},pause:async()=>{}});
    }
  };
  vm.runInNewContext(source.slice(start,end)+'\nthis.certify=certifyCompositeFinancialLive;',context);
  f.io.financialLiveUiProof=async j=>context.certify({request:f.request,journal:j,validateCurrent:head=>assert.equal(head,sha),
    preview:{report:financialReport(f,j,'preview'),qa:{previewReadOnlyAuthorityBlob:f.request.financialQa.authorityBlob,
      parentAuthorityBlob:f.request.approvalBlob}}});
  try{const j=await tx.acceptComposite(f.io,f.request,f.proof);await f.io.verifyCommitted(j);
    assert.equal(j.phase,'COMMITTED');assert.deepEqual({children,writes,reads,signatures},{children:1,writes:1,reads:1,signatures:1});
    assert.equal(f.model.signedReceipts,1);assert.equal(f.model.commits,1);}
  finally{clearInterval(timer);fs.rmSync(tmp,{recursive:true,force:true});}
});
test('composed financial authority keeps its exact parent binding and cross-phase source snapshots',()=>{
  const releaseOwner=require('./gravicentra-i66-frontend-promotion-owner.cjs'),f=makeFixture(),j={key:tx.digest(f.request)};
  const raw={scopeId:releaseOwner.FINANCIAL_SCOPE,gate:'I6.6',status:'DIRECTION_APPROVED_EXACT_PREVIEW',approvedByDirection:true,
    generation:f.request.generation,readOnlyQa:true,backendDeployAllowed:false,businessWritesAllowed:false,releaseScope:'COMPOSITE',
    parentScopeId:require('./gravicentra-i66-make-release-scope.cjs').SCOPE,parentAuthorityBlob:f.request.approvalBlob,
    target:releaseOwner.financialTarget(f.request.target),ownerPins:Object.fromEntries(releaseOwner.financialQaPaths('COMPOSITE').map(p=>[p,'1'.repeat(40)])),
    previewReceiptPath:f.p.financialPreviewQa.receiptPath,previewReceiptBlob:f.p.financialPreviewQa.receiptBlob};
  assert.deepEqual(releaseOwner.compositeFinancialBinding(raw,f.request.financialQa.authorityBlob,f.transport,f.request.approvalBlob,f.p),f.request.financialQa);
  for(const mutate of [x=>x.parentAuthorityBlob='0'.repeat(40),x=>x.businessWritesAllowed=true,x=>x.backendDeployAllowed=true,
    x=>x.target.artifactDigest='sha256:'+'0'.repeat(64),x=>delete x.ownerPins['tools/gravicentra-i66-frontend-promotion-owner.cjs'],
    x=>x.previewReceiptBlob='0'.repeat(40)]){
    const bad=clone(raw);mutate(bad);assert.throws(()=>releaseOwner.compositeFinancialBinding(bad,f.request.financialQa.authorityBlob,f.transport,f.request.approvalBlob,f.p));
  }
  const preview=financialReport(f,j,'preview'),live=financialReport(f,j),options={previewAuthorityBlob:f.request.financialQa.authorityBlob,
    previewParentAuthorityBlob:f.request.approvalBlob,authorityBlob:f.request.financialQa.authorityBlob,parentAuthorityBlob:f.request.approvalBlob,physicalPhaseKey:j.key};
  assert.doesNotThrow(()=>releaseOwner.validateFinancialPhasePair(preview,live,f.request.target,options));
  const changed=clone(live);for(const rows of [changed.matrixServerSnapshotBefore,changed.matrixServerSnapshotAfter,
    ...changed.roles.flatMap(row=>[row.financialFocal.sourceSnapshotBefore,row.financialFocal.sourceSnapshotAfter])])rows[0].financialAudit='changed';
  assert.throws(()=>releaseOwner.validateFinancialPhasePair(preview,changed,f.request.target,options),/SOURCE_CHANGED_BETWEEN_PREVIEW_AND_LIVE/);
});
test('five-target close refuses fake previous revision, active ingress, missing AuthContext or widened IAM',async()=>{
  for(const mutate of [f=>f.proof.backendRevisions[4].previousRevision='invented-prior',
    f=>f.proof.backendRevisions[4].rollbackAction='RESTORE_EXACT_PREVIOUS_REVISION',
    f=>f.proof.makeIngress.active=true,f=>f.proof.makeIngress.a13RealLeadAccepted=true,
    f=>f.proof.makeIngress.closedTrigger.realAuthContextObserved=false,
    f=>f.proof.makeIngress.secretIamReadback.projectIamWrites=1,
    f=>f.proof.makeIngress.preview.artifactDigest='sha256:'+'0'.repeat(64)]){
    const f=makeFixture(),before=serial(f.readFile(P.cp));mutate(f);await assert.rejects(tx.acceptComposite(f.io,f.request,f.proof));
    assert.equal(f.model.commits,0);assert.equal(f.model.clones,0);assert.equal(serial(f.readFile(P.cp)),before);
  }
});
function rollbackAttempt(f){
  return {generation:f.request.generation,key:tx.digest(f.request),runId:f.proof.runId,sourceSha:f.request.target.sourceSha};
}
function runLiveRollbackTrap(guard){
  const path=require('node:path'),os=require('node:os'),{spawnSync}=require('node:child_process');
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'i66-rollback-trap-'));
  try{
    let guardStatus=0;try{guard();}catch{guardStatus=1;}
    const text=fs.readFileSync('.github/workflows/gravicentra-i66-privileged-role-exact-live-promotion.yml','utf8');
    const start=text.indexOf('          rollback(){'),end=text.indexOf('          trap rollback EXIT',start);
    assert.ok(start>=0&&end>start,'LIVE_ROLLBACK_TRAP_MISSING');
    const trap=text.slice(start,end+'          trap rollback EXIT'.length).replace(/^          /gm,'');
    fs.writeFileSync(path.join(tmp,'gi-role-live-old-revisions.tsv'),[1,2,3,4].map(n=>`fn${n}|region|service${n}|old${n}`).join('\n')+'\n');
    const script=`set -euo pipefail
node(){
  if test "\${2:-}" = --authorize-composite-rollback;then printf 'guard\\n' >> "$TRACE";return "$GUARD_STATUS";fi
  if test "\${2:-}" = hosting:clone;then printf 'physical:hosting\\n' >> "$TRACE";fi
  return 0
}
gcloud(){
  if test "\${3:-}" = update-traffic;then printf 'physical:backend\\n' >> "$TRACE";fi
  printf '{}\\n'
}
curl(){ printf '{}\\n'; }
started=1;completed=0
${trap}
false
`;
    const r=spawnSync('bash',['-s'],{input:script,encoding:'utf8',env:{...process.env,RUNNER_TEMP:tmp,
      TRACE:path.join(tmp,'trace'),GUARD_STATUS:String(guardStatus),PROJECT_ID:'fixture-project',SITE:'fixture-site',
      FIREBASE_CLI_BIN:'fixture-cli',I66_ROLE_ROLLBACK_HOSTING_VERSION:'old-version',I66_MAKE_INGRESS:'false'},timeout:10000});
    assert.equal(r.error,undefined);assert.equal(r.status,1,'ROLLBACK_TRAP_MUST_PRESERVE_ORIGINAL_FAILURE');
    const calls=fs.existsSync(path.join(tmp,'trace'))?fs.readFileSync(path.join(tmp,'trace'),'utf8').trim().split('\n'):[];
    assert.equal(calls[0],'guard','JOURNAL_GUARD_MUST_PRECEDE_ALL_PHYSICAL_ROLLBACK');
    return {calls,stdout:r.stdout};
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
}
test('persisted COMMITTED plus failed postcommit verification performs zero physical rollback commands',async()=>{
  const f=fixture(),j=await tx.acceptComposite(f.io,f.request,f.proof);
  f.io.verifyCommitted=async()=>{throw Error('POST_COMMIT_GCLOUD_READ_FAILED');};
  await assert.rejects(f.io.verifyCommitted(j),/POST_COMMIT_GCLOUD_READ_FAILED/);
  assert.equal(f.files.get(f.jp).phase,'COMMITTED');assert.equal(f.model.commits,1);
  const guard=()=>assertCompositeRollbackAllowed(rollbackAttempt(f),f.files.get(f.jp),rollbackContext(f));
  assert.throws(guard,/COMPOSITE_ROLLBACK_BLOCKED_COMMITTED/);
  const result=runLiveRollbackTrap(guard);
  assert.deepEqual(result.calls,['guard']);assert.match(result.stdout,/NO_PHYSICAL_MUTATIONS/);
});
test('lost commit acknowledgement and failed verification cannot reach physical rollback',async()=>{
  const f=fixture(),commit=f.io.commitAll;
  f.io.commitAll=async(...args)=>{await commit(...args);throw Error('LOST_ACK');};
  f.io.verifyCommitted=async()=>{throw Error('POST_COMMIT_REMOTE_READ_FAILED');};
  await assert.rejects(tx.acceptComposite(f.io,f.request,f.proof),/POST_COMMIT_REMOTE_READ_FAILED/);
  assert.equal(f.files.get(f.jp).phase,'COMMITTED');
  const result=runLiveRollbackTrap(()=>assertCompositeRollbackAllowed(rollbackAttempt(f),f.files.get(f.jp),rollbackContext(f)));
  assert.deepEqual(result.calls,['guard']);
});
test('indeterminate remote journal read blocks the real rollback trap before physical writes',()=>{
  const f=fixture();
  const guard=()=>assertCompositeRollbackAllowed(rollbackAttempt(f),undefined,rollbackContext(f));
  assert.throws(guard,/COMPOSITE_ROLLBACK_JOURNAL_READ_INDETERMINATE/);
  assert.deepEqual(runLiveRollbackTrap(guard).calls,['guard']);
  assert.deepEqual(runLiveRollbackTrap(()=>{throw Error('REMOTE_FETCH_UNAVAILABLE');}).calls,['guard']);
});
test('only a verified uncommitted attempt can reach four backend rollbacks and one Hosting clone',async()=>{
  const f=fixture();f.io.commitAll=async()=>{throw Error('HEAD_CAS_FAILED');};
  await assert.rejects(tx.acceptComposite(f.io,f.request,f.proof),/HEAD_CAS_FAILED/);
  const journal=f.files.get(f.jp),attempt=rollbackAttempt(f),context=rollbackContext(f);
  const guard=()=>assertCompositeRollbackAllowed(attempt,journal,context);
  assert.doesNotThrow(guard);
  assert.deepEqual(runLiveRollbackTrap(guard).calls,['guard',...Array(4).fill('physical:backend'),'physical:hosting']);
  assert.throws(()=>assertCompositeRollbackAllowed({...attempt,key:'0'.repeat(64)},journal,context),/KEY_DRIFT/);
  assert.throws(()=>assertCompositeRollbackAllowed(attempt,{...journal,phase:'INCIDENT'},context),/PHASE_NOT_COMPENSABLE/);
  assert.doesNotThrow(()=>assertCompositeRollbackAllowed(attempt,null,context));
  assert.doesNotThrow(()=>assertCompositeRollbackAllowed(null,null,context));
  context.transport.currentPhysicalHostingRelease.sourceSha=f.request.target.sourceSha;
  assert.throws(()=>assertCompositeRollbackAllowed(null,null,context),/CONTROL_ALREADY_ADVANCED/);
});
