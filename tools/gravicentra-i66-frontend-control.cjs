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
function releaseJournalPath(generation,focalHosting){
  if(!focalHosting)return genName(generation,'JOURNAL');
  assert.equal(focalHosting.schema,'GI_I66_FOCAL_HOSTING_REQUEST_V1');
  assert.equal(focalHosting.generation,generation);
  return genName(generation,'FOCAL_HOSTING_JOURNAL');
}
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
function assertRetiredReleaseContinuation(control,progress){
  // Scope this check to active execution fields. Evidence text and archived
  // receipts remain immutable, even when they describe a once-valid next step.
  const retired=[progress.latestImmutableBuild,progress.immediateExecution?.latestImmutableBuild]
    .filter(row=>row&&row.liveAccepted===false&&row.successorNeedsNewOwnerPinnedBuild===true&&
      /NOT_RELEASE_ELIGIBLE/.test(String(row.status||'')));
  if(!retired.length)return;
  const fields=[];
  const add=(name,value)=>{if(typeof value==='string')fields.push([name,value]);};
  add('next',progress.next);
  for(const row of (progress.shockObjectives?.items||[]).filter(row=>row.passForShock!==true))add('objective.'+row.id,row.next);
  for(const row of progress.remainingExecutionLanes||[])add('remaining.'+row.id,row.next);
  for(const [i,value] of (progress.updateDiscipline?.nextIncomplete||[]).entries())add('nextIncomplete.'+i,value);
  for(const row of progress.parallelLanes||[])add('parallel.'+row.id,row.next);
  for(const [name,value] of Object.entries({immediate:progress.immediateExecution?.next,financialFocal:progress.immediateExecution?.financialFocal,
    frontendBalance:progress.frontendBalanceCorrection?.next,successorRelease:progress.currentSuccessorPlan?.releaseNext,
    successorFinance:progress.currentSuccessorPlan?.financeNext,successorLeads:progress.currentSuccessorPlan?.leadsNext,
    statements:progress.newStatementSourceWork20261124?.next,make:progress.parallelMakeIngressWork20261124?.next,
    prospectiveLeads:progress.prospectiveLeadPriority?.next,control:control.nextAction,cursor:control.i66ActiveRecoveryCursor?.next,
    cursorAction:control.i66ActiveRecoveryCursor?.nextAction,currentWork:control.i66OperationalContinuation20261115?.currentWork,
    nextSourceWork:control.i66OperationalContinuation20261115?.nextSourceWork}))add(name,value);
  const escape=value=>String(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  for(const target of retired){
    const version=Number(String(target.receiptPath||'').match(/_V([1-9][0-9]*)_IMMUTABLE_BUILD_RECEIPT_/)?.[1])||null;
    const pending=progress.pendingImmutableBuild;
    if(pending){
      for(const key of ['sourceSha','buildId','artifactId','artifactDigest'])
        assert.ok(target[key]===undefined||pending[key]!==target[key],'I66_PROGRESS_RETIRED_PENDING_TARGET_'+key);
      if(version)assert.notEqual(pending.version,version,'I66_PROGRESS_RETIRED_PENDING_VERSION');
      assert.notEqual(pending.receipt?.path,target.receiptPath,'I66_PROGRESS_RETIRED_PENDING_RECEIPT');
    }
    const identities=['sourceSha','buildId','buildRunId','artifactId','artifactDigest'].map(k=>target[k]).filter(x=>x!==undefined&&x!==null).map(escape);
    if(version)identities.push('\\b(?:v|preview)\\s*'+version+'\\b');
    if(!identities.length)continue;
    const identity=new RegExp(identities.join('|'),'i');
    for(const [name,text] of fields){
      for(const clause of text.split(/[.;,\n]|\b(?:but|pero|sin embargo)\b/i)){
        if(!identity.test(clause))continue;
        const actions=/\b(?:execute|executed|executing|rerun|re-run|run|retry|replay|promote|promoted|promoting|publish|published|deploy|deployed|ejecutar|ejecuta|ejecute|promover|promueve|publicar|publica|desplegar|reintentar|reintenta)\b/ig;
        for(const action of clause.matchAll(actions)){
          const prefix=clause.slice(0,action.index);
          // An explicit prohibition is not an instruction to retry. Separate
          // sentences/clauses still detect an appended contradictory command.
          if(/\b(?:do not|don't|must not|never|no|nunca|sin)\b/i.test(prefix))continue;
          assert.fail('I66_PROGRESS_RETIRED_NEXT_TARGET_'+name);
        }
      }
    }
  }
}
// Resolve the active provider from pinned evidence, never from the name of an
// older workflow or from a copied objective status. This is a read-only view;
// transport readback is not signed functional Preview or LIVE acceptance.
function resolveNativeExecutionProgress(control,progress,io){
  const pending=progress.pendingImmutableBuild,plan=progress.currentSuccessorPlan;
  if(pending?.provider!=='GOOGLE_CLOUD_BUILD'&&!pending?.nativeExecutionEvidence)return null;
  assert.equal(pending.provider,'GOOGLE_CLOUD_BUILD','I66_NATIVE_PROGRESS_PROVIDER_DRIFT');
  const cursor=control.i66ActiveRecoveryCursor;
  assert.ok(cursor&&plan,'I66_NATIVE_PROGRESS_ACTIVE_AUTHORITY_MISSING');
  const safePath=p=>typeof p==='string'&&/^artifacts\/orbit360-recovery\/release-control\/[A-Za-z0-9_.-]+\.json$/.test(p);
  assert.ok(safePath(cursor.currentEvidencePath),'I66_NATIVE_PROGRESS_CURSOR_PATH_INVALID');
  const activeBytes=io.readFileSync(cursor.currentEvidencePath,'utf8');
  assert.equal(blob(activeBytes),cursor.currentEvidenceBlobSha,'I66_NATIVE_PROGRESS_CURSOR_BLOB_DRIFT');
  assert.deepEqual(JSON.parse(activeBytes),progress,'I66_NATIVE_PROGRESS_CURSOR_CONTENT_DRIFT');
  const cache=new Map([[cursor.currentEvidencePath,progress]]);
  const pins=new Map([[cursor.currentEvidencePath,cursor.currentEvidenceBlobSha]]);
  const sameRef=(a,b,label)=>{
    assert.ok(a&&b,'I66_NATIVE_PROGRESS_REFERENCE_MISSING_'+label);
    assert.equal(a.path,b.path,'I66_NATIVE_PROGRESS_REFERENCE_PATH_DRIFT_'+label);
    assert.equal(a.fragment,b.fragment,'I66_NATIVE_PROGRESS_REFERENCE_FRAGMENT_DRIFT_'+label);
    if(a.gitBlobSha&&b.gitBlobSha)
      assert.equal(a.gitBlobSha,b.gitBlobSha,'I66_NATIVE_PROGRESS_REFERENCE_PIN_DRIFT_'+label);
    // Equivalent references may share an explicit pin; resolve that side first
    // without walking past the immediately preceding checkpoint for authority.
    return resolve(a.gitBlobSha?a:b,label);
  };
  function resolve(ref,label){
    assert.ok(ref&&safePath(ref.path),'I66_NATIVE_PROGRESS_REFERENCE_PATH_INVALID_'+label);
    const parts=String(ref.fragment||'').split('.');
    assert.ok(parts.length&&parts.every(k=>/^[A-Za-z][A-Za-z0-9_]*$/.test(k)&&
      !['__proto__','constructor','prototype'].includes(k)),'I66_NATIVE_PROGRESS_REFERENCE_FRAGMENT_INVALID_'+label);
    const pin=ref.gitBlobSha||(ref.path===cursor.currentEvidencePath?cursor.currentEvidenceBlobSha:
      ref.path===progress.previousEvidencePath?progress.previousEvidenceBlobSha:null);
    assert.match(String(pin||''),/^[a-f0-9]{40}$/,'I66_NATIVE_PROGRESS_REFERENCE_PIN_REQUIRED_'+label);
    if(!cache.has(ref.path)){
      const bytes=io.readFileSync(ref.path,'utf8');
      assert.equal(blob(bytes),pin,'I66_NATIVE_PROGRESS_REFERENCE_BLOB_DRIFT_'+label);
      cache.set(ref.path,JSON.parse(bytes));pins.set(ref.path,pin);
    }else assert.equal(pins.get(ref.path),pin,'I66_NATIVE_PROGRESS_REFERENCE_BLOB_DRIFT_'+label);
    let value=cache.get(ref.path);
    for(const key of parts){
      assert.ok(value&&Object.hasOwn(value,key),'I66_NATIVE_PROGRESS_REFERENCE_NOT_FOUND_'+label);
      value=value[key];
    }
    assert.ok(value&&typeof value==='object','I66_NATIVE_PROGRESS_REFERENCE_VALUE_INVALID_'+label);
    return value;
  }
  const transport=JSON.parse(io.readFileSync(P.transport,'utf8'));
  const consumed=transport.lastConsumedFrontendRelease;
  const isConsumed=consumed?.previewRequestVersion===pending.version;
  const request=isConsumed?transport.lastConsumedFrontendPreviewRequest:transport.frontendPreviewRequest;
  assert.ok(request&&Number.isSafeInteger(request.version)&&request.version>0,'I66_NATIVE_PROGRESS_REQUEST_REQUIRED');
  assert.equal(pending.version,request.version,'I66_NATIVE_PROGRESS_REQUEST_DRIFT');
  assert.equal(plan.plannedRequestVersion,request.version,'I66_NATIVE_PROGRESS_PLAN_REQUEST_DRIFT');
  assert.match(String(pending.sourceSha||''),/^[a-f0-9]{40}$/,'I66_NATIVE_PROGRESS_SOURCE_REQUIRED');
  assert.equal(plan.sourceSha,pending.sourceSha,'I66_NATIVE_PROGRESS_PLAN_SOURCE_DRIFT');
  for(const row of [pending,plan])for(const key of ['sourceQaHead','sourceQaRunId','guardRunId'])
    assert.equal(row[key],request[key],'I66_NATIVE_PROGRESS_REQUEST_BINDING_DRIFT_'+key);
  const packaged=sameRef(pending.nativeExecutionEvidence,plan.providerExecution,'PACKAGE');
  const bind=(proof,label)=>{
    assert.equal(proof.provider,'GOOGLE_CLOUD_BUILD','I66_NATIVE_PROGRESS_PROVIDER_DRIFT_'+label);
    assert.equal(proof.requestVersion,request.version,'I66_NATIVE_PROGRESS_REQUEST_DRIFT_'+label);
    assert.equal(proof.sourceSha,pending.sourceSha,'I66_NATIVE_PROGRESS_SOURCE_DRIFT_'+label);
    assert.match(String(proof.buildId||''),/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i,
      'I66_NATIVE_PROGRESS_BUILD_ID_INVALID_'+label);
  };
  bind(packaged,'PACKAGE');
  assert.equal(packaged.scope,'PACKAGE_ONLY','I66_NATIVE_PROGRESS_PACKAGE_SCOPE_DRIFT');
  assert.equal(pending.providerBuildId,packaged.buildId,'I66_NATIVE_PROGRESS_PACKAGE_BUILD_DRIFT');
  assert.equal(pending.providerStatus,packaged.status,'I66_NATIVE_PROGRESS_PROVIDER_STATUS_DRIFT');
  const packageCertified=packaged.status==='SUCCESS'&&packaged.finalResultObserved===true&&
    packaged.artifactCreated===true&&packaged.artifactReadbackVerified===true;
  function artifact(value,label){
    assert.ok(value&&/^gs:\/\/[^/\s]+\/[^\s]+$/.test(value.uri||''),'I66_NATIVE_PROGRESS_ARTIFACT_URI_INVALID_'+label);
    assert.match(String(value.generation||''),/^[1-9][0-9]*$/,'I66_NATIVE_PROGRESS_ARTIFACT_GENERATION_INVALID_'+label);
    assert.match(String(value.sha256||''),/^[a-f0-9]{64}$/,'I66_NATIVE_PROGRESS_ARTIFACT_DIGEST_INVALID_'+label);
    assert.ok(Number.isSafeInteger(value.bytes)&&value.bytes>0,'I66_NATIVE_PROGRESS_ARTIFACT_SIZE_INVALID_'+label);
    return Object.fromEntries(['uri','generation','sha256','bytes'].map(k=>[k,value[k]]));
  }
  let packageArtifact=null;
  if(packaged.artifact||packageCertified){
    packageArtifact=artifact(packaged.artifact,'PACKAGE');
    assert.deepEqual(artifact(resolve(plan.artifactIdentity,'ARTIFACT'),'PLAN'),packageArtifact,
      'I66_NATIVE_PROGRESS_PLAN_ARTIFACT_DRIFT');
  }
  if(isConsumed){
    const head=control.i66FrontendReleaseHead;
    assert.ok(packageCertified&&head,'I66_NATIVE_PROGRESS_CONSUMED_PROOF_REQUIRED');
    assert.equal(consumed.sourceSha,pending.sourceSha,'I66_NATIVE_PROGRESS_CONSUMED_SOURCE_DRIFT');
    assert.equal(consumed.artifactDigest,'sha256:'+packageArtifact.sha256,'I66_NATIVE_PROGRESS_CONSUMED_ARTIFACT_DRIFT');
    for(const key of ['generation','sourceSha','artifactDigest','receiptPath'])
      assert.equal(consumed[key],head[key],'I66_NATIVE_PROGRESS_CONSUMED_HEAD_DRIFT_'+key);
    assert.deepEqual(progress.consumedPreviewRequest,request,'I66_NATIVE_PROGRESS_CONSUMED_REQUEST_DRIFT');
  }
  // These receipts certify transport only. A later signed acceptance must use
  // its own existing proof path instead of changing the meaning of this view.
  for(const key of ['previewAccepted','liveAccepted','releaseAcceptance'])
    assert.equal(packaged[key],false,'I66_NATIVE_PROGRESS_PACKAGE_ACCEPTANCE_SCOPE_'+key);
  let hosting=null;
  if(plan.hostingPreviewExecution||pending.hostingPreviewContinuation){
    const proof=sameRef(pending.hostingPreviewContinuation,plan.hostingPreviewExecution,'HOSTING');bind(proof,'HOSTING');
    assert.equal(proof.scope,'EXISTING_HOSTING_PREVIEW_ONLY_SIGNED_QA_AND_LIVE_PENDING',
      'I66_NATIVE_PROGRESS_HOSTING_SCOPE_DRIFT');
    sameRef(proof.packageEvidence,plan.providerExecution,'HOSTING_PACKAGE');
    assert.equal(proof.packageBuildId,packaged.buildId,'I66_NATIVE_PROGRESS_HOSTING_PACKAGE_BUILD_DRIFT');
    assert.deepEqual(artifact(proof.packageArtifact,'HOSTING'),packageArtifact,'I66_NATIVE_PROGRESS_HOSTING_ARTIFACT_DRIFT');
    assert.equal(proof.samePackageArtifactRequired,true,'I66_NATIVE_PROGRESS_SAME_PACKAGE_REQUIRED');
    assert.equal(proof.signedFunctionalPreviewAccepted,false,'I66_NATIVE_PROGRESS_HOSTING_ACCEPTANCE_SCOPE');
    for(const key of ['backendDeploys','liveDeploys','businessWrites'])
      assert.equal(proof[key],0,'I66_NATIVE_PROGRESS_HOSTING_EFFECT_SCOPE_'+key);
    const readbackCertified=proof.status==='SUCCESS'&&proof.finalResultObserved===true&&proof.hostingReadbackVerified===true;
    if(readbackCertified){
      assert.equal(packageCertified,true,'I66_NATIVE_PROGRESS_HOSTING_WITHOUT_CERTIFIED_PACKAGE');
      assert.match(String(proof.hostingVersion||''),/^sites\/[^/]+\/versions\/[A-Za-z0-9_-]+$/,
        'I66_NATIVE_PROGRESS_HOSTING_VERSION_REQUIRED');
    }
    hosting={buildId:proof.buildId,status:proof.status,readbackCertified,hostingVersion:proof.hostingVersion||null};
  }
  return {provider:'GOOGLE_CLOUD_BUILD',requestVersion:request.version,sourceSha:pending.sourceSha,
    disposition:isConsumed?'CONSUMED_EXACT_RELEASE_HISTORY':'CURRENT_REQUEST',
    package:{buildId:packaged.buildId,status:packaged.status,readbackCertified:packageCertified,artifact:packageArtifact},
    hostingPreview:hosting,signedFunctionalAcceptanceEstablished:false,liveAcceptanceEstablished:false,
    acceptanceScope:'TRANSPORT_EVIDENCE_ONLY'};
}
function assertNativeExecutionProgress(control,progress,io){
  const native=resolveNativeExecutionProgress(control,progress,io);
  if(!native?.package.readbackCertified||native.disposition==='CONSUMED_EXACT_RELEASE_HISTORY')return native;
  const statuses=(progress.shockObjectives?.items||[]).filter(x=>x.passForShock!==true)
    .map(row=>['objective.'+row.id,row.status]);
  for(const row of progress.parallelLanes||[])statuses.push(['parallel.'+row.id,row.status]);
  for(const key of ['pendingImmutableBuild','currentSuccessorPlan','immediateExecution'])
    statuses.push([key,progress[key]?.status]);
  for(const [name,status] of statuses){
    // A different request or an unbound financial/provider lane can remain on
    // GitHub Actions. Only the explicitly version-bound blocker is contradicted
    // by the native package evidence for this same request.
    const bound=String(status||'').match(/^V([1-9][0-9]*)_PROVIDER_BILLING_HOLD(?:_|$)/);
    assert.ok(!bound||Number(bound[1])!==native.requestVersion,'I66_NATIVE_PROGRESS_STALE_PROVIDER_BILLING_'+name);
  }
  assertTerminalAttemptProgress(control,progress,io,native);
  return native;
}
// A terminal provider receipt is an independently retained fact, not another
// copied status. Discover only the active request's scoped receipts so an older
// cursor cannot hide a consumed claim by omitting its pointer. This grants no
// retry or release permission; those remain with the existing release owner.
function terminalAttemptRecords(native,io){
  assert.equal(typeof io.readdirSync,'function','I66_TERMINAL_RECEIPT_DIRECTORY_REQUIRED');
  const names=io.readdirSync(dir).filter(name=>new RegExp('^I6_6_REQUEST'+native.requestVersion+'_[A-Z0-9_]+\\.json$').test(name));
  const records=[];
  for(const name of names){
    const receiptPath=dir+name,bytes=io.readFileSync(receiptPath,'utf8'),receipt=JSON.parse(bytes);
    if(receipt.schema!=='GI_I66_SCOPED_OPERATIONAL_ATTEMPT_AND_SOURCE_CHECKPOINT_V1'||
        receipt.frozenSource!==native.sourceSha||receipt.frozenArchiveSha256!==native.package.artifact.sha256)continue;
    const attempt=receipt['request'+native.requestVersion];
    // The same checkpoint envelope may later record a successful retry or a
    // different phase. Those facts are not compensated Preview failures.
    if(attempt?.phase!=='preview'||attempt.status!=='FAILURE')continue;
    assert.equal(receipt.activeGate,'I6.6','I66_TERMINAL_GATE_DRIFT');
    assert.equal(receipt.sourceChangedInFrozenRequest,false,'I66_TERMINAL_PRODUCT_CHANGED');
    assert.equal(receipt.fullI66ProductionAccepted,false,'I66_TERMINAL_FALSE_ACCEPTANCE');
    assert.ok(attempt&&attempt.phase==='preview'&&attempt.status==='FAILURE','I66_TERMINAL_ATTEMPT_REQUIRED');
    assert.match(String(attempt.build||''),/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/,'I66_TERMINAL_BUILD_REQUIRED');
    assert.match(String(attempt.claimGeneration||''),/^[1-9][0-9]*$/,'I66_TERMINAL_CLAIM_REQUIRED');
    assert.equal(attempt.actualCompensation,'COMPENSATION_READBACK_VERIFIED','I66_TERMINAL_COMPENSATION_UNPROVEN');
    assert.equal(attempt.configuration,'CLOSED_CONFIG_READBACK_VERIFIED','I66_TERMINAL_CLOSED_UNPROVEN');
    assert.ok(['EXACT_PREVIOUS_PREVIEW_REVISION_RESTORED','EXACT_PREVIOUS_PREVIEW_REVISION_ALREADY_RESTORED'].includes(attempt.trigger),
      'I66_TERMINAL_TRIGGER_UNPROVEN');
    assert.deepEqual(attempt.rollbackFailures,[],'I66_TERMINAL_ROLLBACK_FAILED');
    for(const key of ['livePromotion','signedPreviewAccepted','canReuseOriginalClaim'])
      assert.equal(attempt[key],false,'I66_TERMINAL_SCOPE_'+key);
    for(const key of ['canonicalLeadWrites','externalMessagesSent'])assert.equal(attempt[key],0,'I66_TERMINAL_EFFECT_'+key);
    assert.match(String(attempt.reason||''),/^[A-Z][A-Z0-9_]+$/,'I66_TERMINAL_FAILURE_CODE_REQUIRED');
    assert.equal(attempt.records?.privateBucket,'ays-orbit360-firestore-private-backup-646761409743','I66_TERMINAL_PRIVATE_BUCKET');
    assert.equal(attempt.records.prefix,'i66/operational-attempts/'+attempt.build+'/','I66_TERMINAL_HOLD_BUILD_DRIFT');
    for(const name of ['hold.json','hold-execution.log']){
      const object=attempt.records[name];assert.match(String(object?.generation||''),/^[1-9][0-9]*$/,'I66_TERMINAL_OBJECT_GENERATION');
      assert.match(String(object.sha256||''),/^[a-f0-9]{64}$/,'I66_TERMINAL_OBJECT_DIGEST');
      assert.ok(Number.isSafeInteger(object.bytes)&&object.bytes>0,'I66_TERMINAL_OBJECT_BYTES');
      assert.ok(BigInt(object.generation)>BigInt(attempt.claimGeneration),'I66_TERMINAL_OBJECT_PRECEDES_CLAIM');
    }
    assert.equal(typeof receipt.releaseNext,'string','I66_TERMINAL_NEXT_REQUIRED');assert.ok(receipt.releaseNext.trim());
    const projection={schema:'GI_I66_CURRENT_TERMINAL_OPERATIONAL_ATTEMPT_V1',requestVersion:native.requestVersion,
      phase:attempt.phase,sourceSha:native.sourceSha,artifactDigest:'sha256:'+native.package.artifact.sha256,
      buildId:attempt.build,status:'FAILURE_COMPENSATED_CLAIM_CONSUMED',failureCode:attempt.reason,
      claimGeneration:attempt.claimGeneration,canReuseOriginalClaim:false,signedPreviewAccepted:false,livePromotion:false,
      receipt:{path:receiptPath,gitBlobSha:blob(bytes),sha256:hash(bytes)},
      next:'For request '+native.requestVersion+' only: '+receipt.releaseNext+' Preserve its certified package and Hosting bytes. Independently scoped functional releases proceed from the current physical composition and their own signed gates.'};
    records.push({projection,receipt,bytes});
  }
  records.sort((a,b)=>BigInt(a.projection.claimGeneration)<BigInt(b.projection.claimGeneration)?-1:1);
  for(let i=1;i<records.length;i++)assert.ok(records[i-1].projection.claimGeneration!==records[i].projection.claimGeneration&&
    records[i-1].projection.buildId!==records[i].projection.buildId,'I66_TERMINAL_DUPLICATE_CLAIM');
  return records;
}
function assertTerminalAttemptProgress(control,progress,io,native=resolveNativeExecutionProgress(control,progress,io)){
  if(!native?.package.readbackCertified||native.disposition!=='CURRENT_REQUEST')return null;
  const latest=terminalAttemptRecords(native,io).at(-1)?.projection;if(!latest)return null;
  assert.deepEqual(progress.lastTerminalOperationalAttempt,latest,'I66_TERMINAL_RECEIPT_NOT_RECONCILED');
  const cursor=control.i66ActiveRecoveryCursor,plan=progress.currentSuccessorPlan;
  assert.deepEqual(cursor.lastTerminalOperationalAttempt,latest,'I66_TERMINAL_CURSOR_DRIFT');
  const transport=JSON.parse(io.readFileSync(P.transport,'utf8'));
  const candidate=transport.operationalReleaseCandidate||transport.scopedBackendPreviewI66?.candidate;
  const retry=candidate?.providerBinding?.compensatedRetry;
  // A later explicit retry is validated by its existing runtime owner. Its
  // admission does not erase this terminal predecessor or reuse its claim.
  if(retry){
    assert.equal(retry.schema,'GI_I66_COMPENSATED_RETRY_REFERENCE_V1','I66_TERMINAL_RETRY_REFERENCE_SCHEMA');
    for(const key of ['phase','requestVersion','sourceSha','artifactDigest'])
      assert.equal(retry[key],latest[key],'I66_TERMINAL_RETRY_BINDING_'+key);
    assert.equal(retry.artifactId,candidate.artifactId,'I66_TERMINAL_RETRY_PACKAGE_DRIFT');
    assert.equal(retry.priorClaim?.generation,latest.claimGeneration,'I66_TERMINAL_RETRY_CLAIM_DRIFT');
    assert.equal(retry.priorBuildId,latest.buildId,'I66_TERMINAL_RETRY_PREDECESSOR_DRIFT');
    assert.match(String(retry.admission?.commit||''),/^[a-f0-9]{40}$/,'I66_TERMINAL_RETRY_ADMISSION_COMMIT');
    assert.ok(/^artifacts\/orbit360-recovery\/release-control\/I6_6_[A-Z0-9_]+\.json$/.test(retry.admission.path),
      'I66_TERMINAL_RETRY_ADMISSION_PATH');
    const bytes=io.readFileSync(retry.admission.path,'utf8');
    assert.equal(blob(bytes),retry.admission.blob,'I66_TERMINAL_RETRY_ADMISSION_BLOB_DRIFT');
    assert.equal(hash(bytes),retry.admission.sha256,'I66_TERMINAL_RETRY_ADMISSION_HASH_DRIFT');
    const recorded=JSON.parse(bytes);
    assert.equal(recorded.schema,'GI_I66_COMPENSATED_RETRY_ADMISSION_V1','I66_TERMINAL_RETRY_ADMISSION_SCHEMA');
    assert.equal(recorded.status,'EXACT_COMPENSATED_PREVIEW_RETRY_ADMITTED','I66_TERMINAL_RETRY_ADMISSION_STATUS');
    for(const key of ['phase','requestVersion','sourceSha','artifactId','artifactDigest','priorBuildId','priorClaim','hold'])
      assert.deepEqual(recorded[key],retry[key],'I66_TERMINAL_RETRY_ADMISSION_BINDING_'+key);
    assert.deepEqual(recorded.constraints,{productSourceChanges:0,rebuilds:0,livePromotion:false,claimReuse:false,
      realCustomerWrites:0,realFinancialWrites:0,externalMessagesSent:0},'I66_TERMINAL_RETRY_SCOPE');
    // This is continuity readback only. Actual provider facts, admission
    // ancestry, signing and claim acquisition remain runtime-owner gates.
  }else{
    assert.deepEqual(plan.operationalPreviewRuntimeHold,latest.receipt,'I66_TERMINAL_PLAN_RECEIPT_DRIFT');
    const admission=progress['request'+latest.requestVersion+'OperationalPreviewAdmission'];
    assert.ok(admission,'I66_TERMINAL_ADMISSION_VIEW_REQUIRED');
    assert.deepEqual(admission.lastRuntimeHold,latest.receipt,'I66_TERMINAL_ADMISSION_RECEIPT_DRIFT');
    assert.equal(admission.buildId,latest.buildId,'I66_TERMINAL_PREDECESSOR_BUILD_DRIFT');
    assert.equal(admission.status,latest.status,'I66_TERMINAL_STALE_ADMISSION_STATUS');
    for(const [name,value] of Object.entries({next:progress.next,immediate:progress.immediateExecution?.next,
      release:plan.releaseNext,control:control.nextAction,cursor:cursor.next,cursorAction:cursor.nextAction,
      currentWork:control.i66OperationalContinuation20261115?.currentWork}))
      assert.equal(value,latest.next,'I66_TERMINAL_STALE_NEXT_'+name);
  }
  return latest;
}
// Produce the complete prospective metadata transaction for the existing
// signed CAS writer. No file, ref, provider or business write occurs here.
function prepareTerminalAttemptReconciliation({authorityHead,receiptPath,receiptBytes,nextEvidencePath,recordedAtUtc},io){
  assert.match(String(authorityHead||''),/^[a-f0-9]{40}$/,'I66_TERMINAL_EXPECTED_HEAD_REQUIRED');
  assert.ok(Number.isFinite(Date.parse(recordedAtUtc)),'I66_TERMINAL_TIME_REQUIRED');
  const raw=new Map(),read=file=>{const bytes=io.readFileSync(file,'utf8');raw.set(file,bytes);return JSON.parse(bytes);};
  const control=read(P.cp),state=read(P.state),transport=read(P.transport),cursor=control.i66ActiveRecoveryCursor;
  const previousPath=cursor.currentEvidencePath,progress=read(previousPath);
  assert.equal(blob(raw.get(previousPath)),cursor.currentEvidenceBlobSha,'I66_TERMINAL_PREVIOUS_CURSOR_DRIFT');
  assert.ok(/^artifacts\/orbit360-recovery\/release-control\/I6_6_REQUEST[1-9][0-9]*_[A-Z0-9_]+\.json$/.test(receiptPath),'I66_TERMINAL_RECEIPT_PATH');
  const existing=io.existsSync(receiptPath);if(existing)raw.set(receiptPath,io.readFileSync(receiptPath,'utf8'));
  const bytes=receiptBytes===undefined?raw.get(receiptPath):receiptBytes;
  assert.equal(typeof bytes,'string','I66_TERMINAL_RECEIPT_BYTES_REQUIRED');
  if(existing)assert.equal(bytes,raw.get(receiptPath),'I66_TERMINAL_EXISTING_RECEIPT_IMMUTABLE');
  const receipt=JSON.parse(bytes);assert.equal(serial(receipt),bytes,'I66_TERMINAL_EXACT_SERIALIZED_RECEIPT_REQUIRED');
  const view={...io,readFileSync:(file,encoding)=>file===receiptPath?bytes:io.readFileSync(file,encoding),
    readdirSync:directory=>[...new Set([...io.readdirSync(directory),...(directory===dir?[path.basename(receiptPath)]:[])])]};
  const native=resolveNativeExecutionProgress(control,progress,view);
  assert.ok(native?.package.readbackCertified&&native.disposition==='CURRENT_REQUEST','I66_TERMINAL_CURRENT_NATIVE_REQUEST_REQUIRED');
  const latest=terminalAttemptRecords(native,view).at(-1)?.projection;
  assert.equal(latest?.receipt.path,receiptPath,'I66_TERMINAL_LATEST_PREDECESSOR_REQUIRED');
  const preimages=Object.fromEntries([...raw].map(([file,value])=>[file,blob(value)]));
  if(!existing)preimages[receiptPath]=null;
  if(progress.lastTerminalOperationalAttempt&&serial(progress.lastTerminalOperationalAttempt)===serial(latest)){
    assertExecutionProgress(control,progress,view);assertOwnerPlanContinuation(control,state,transport);
    return {status:'NOOP_ALREADY_RECONCILED',expectedHeadOid:authorityHead,expectedPreimages:preimages,changes:{},terminal:latest};
  }
  assert.ok(/^artifacts\/orbit360-recovery\/release-control\/I6_6_CURRENT_EXECUTION_PROGRESS_[0-9]{8}_R[1-9][0-9]*\.json$/.test(nextEvidencePath),
    'I66_TERMINAL_SUCCESSOR_PATH');
  assert.equal(io.existsSync(nextEvidencePath),false,'I66_TERMINAL_SUCCESSOR_ALREADY_EXISTS');
  assert.ok(Number.isSafeInteger(progress.version)&&progress.version>0,'I66_TERMINAL_PROGRESS_VERSION_REQUIRED');
  assert.equal(Number(nextEvidencePath.match(/_R([1-9][0-9]*)\.json$/)[1]),progress.version+1,'I66_TERMINAL_NEXT_VERSION_REQUIRED');
  preimages[nextEvidencePath]=null;
  const oldReleaseNext=progress.currentSuccessorPlan.releaseNext;
  progress.previousEvidencePath=previousPath;progress.previousEvidenceBlobSha=cursor.currentEvidenceBlobSha;
  progress.version++;progress.recordedAtUtc=recordedAtUtc;progress.lastTerminalOperationalAttempt=latest;
  const plan=progress.currentSuccessorPlan;plan.operationalPreviewRuntimeHold=latest.receipt;plan.releaseNext=latest.next;
  const key='request'+latest.requestVersion+'OperationalPreviewAdmission',admission=progress[key];
  assert.ok(admission&&admission.sourceSha===latest.sourceSha&&admission.artifactDigest===latest.artifactDigest,'I66_TERMINAL_ADMISSION_PREIMAGE_DRIFT');
  Object.assign(admission,{status:latest.status,buildId:latest.buildId,lastRuntimeHold:latest.receipt});
  for(const lane of progress.parallelLanes||[])if(lane.next===oldReleaseNext)lane.next=latest.next;
  for(const row of progress.shockObjectives.items)if(row.passForShock!==true&&row.next===oldReleaseNext)row.next=latest.next;
  progress.next=progress.immediateExecution.next=latest.next;
  synchronizeExecutionProgress(progress);progress.executionSynchronization=executionSnapshot(transport);
  Object.assign(cursor,{previousEvidencePath:previousPath,previousEvidenceBlobSha:cursor.currentEvidenceBlobSha,
    currentEvidencePath:nextEvidencePath,currentEvidenceBlobSha:blob(serial(progress)),lastTerminalOperationalAttempt:latest,
    next:latest.next,nextAction:latest.next});
  control.nextAction=latest.next;
  control.i66OperationalContinuation20261115.currentWork=latest.next;
  synchronizeOwnerPlanContinuation(control,state,transport);
  const changes={[nextEvidencePath]:progress,[P.cp]:control,[P.state]:state,...(!existing?{[receiptPath]:receipt}:{})};
  const prospective={...view,readFileSync:(file,encoding)=>Object.hasOwn(changes,file)?serial(changes[file]):view.readFileSync(file,encoding)};
  assertExecutionProgress(control,progress,prospective);assertOwnerPlanContinuation(control,state,transport);
  return {status:'ATOMIC_METADATA_RECONCILIATION_PREPARED',expectedHeadOid:authorityHead,expectedPreimages:preimages,changes,terminal:latest};
}
function assertTerminalAttemptChangeSetPreimages(changeSet,{head,...io}){
  assert.equal(head,changeSet.expectedHeadOid,'I66_TERMINAL_HEAD_CAS_CHANGED');
  for(const [file,expected] of Object.entries(changeSet.expectedPreimages)){
    const actual=io.existsSync(file)?blob(io.readFileSync(file,'utf8')):null;
    assert.equal(actual,expected,'I66_TERMINAL_PREIMAGE_CAS_CHANGED_'+file);
  }
  return true;
}
// This runs in the authenticated operator checkout after a build finishes and
// on interrupted-session resume. Only verified provider receipts reach it.
function prepareProviderOutcome(event,{io=require('node:fs'),head,now=new Date().toISOString()}={}) {
  const git=require('node:child_process').execFileSync;
  head=head||git('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  const cp=JSON.parse(io.readFileSync(P.cp,'utf8')),state=JSON.parse(io.readFileSync(P.state,'utf8'));
  const transport=JSON.parse(io.readFileSync(P.transport,'utf8')),cursor=cp.i66ActiveRecoveryCursor;
  const oldPath=cursor.currentEvidencePath,oldRaw=io.readFileSync(oldPath,'utf8');
  const prog=JSON.parse(oldRaw);
  assert.equal(blob(oldRaw),cursor.currentEvidenceBlobSha,'I66_TERMINAL_CURRENT_CHECKPOINT');
  assert.match(event.buildId,/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/);
  assert.ok(['PROVIDER_SUCCESS_VERIFIED','PROVIDER_FAILURE_COMPENSATED','PROVIDER_FAILURE_HOLD'].includes(event.status));
  assert.ok(['preview','live'].includes(event.phase));
  const candidates=[transport.operationalReleaseCandidate,transport.scopedBackendPreviewI66?.candidate,transport.lastConsumedOperationalCandidate].filter(Boolean);
  assert.ok(candidates.some(p=>p.sourceSha===event.sourceSha&&p.artifactDigest===event.artifactDigest&&p.providerBinding?.requestVersion===event.requestVersion),'I66_TERMINAL_WRONG_CANDIDATE');
  const existing=prog.providerTerminalOutcomes||{};
  if(existing[event.buildId]){
    assert.deepEqual(existing[event.buildId],event,'I66_TERMINAL_CHANGED_PROVIDER_FACT');
    assert.deepEqual(cursor.providerTerminalOutcomes,existing,'I66_TERMINAL_CURSOR_RECEIPTS');
    assertOwnerPlanContinuation(cp,state,transport);
    return {status:'NOOP_ALREADY_RECONCILED',changes:{},expectedHeadOid:head};
  }
  // Reconcile an already-retained compensated receipt through its causal owner,
  // consuming a single checkpoint for the controller, state and new observation.
  const native=resolveNativeExecutionProgress(cp,prog,io);
  const prior=native?.disposition==='CURRENT_REQUEST'?terminalAttemptRecords(native,io).find(x=>x.projection.buildId===event.buildId):null;
  if(prior){
    assert.equal(event.status,'PROVIDER_FAILURE_COMPENSATED');
    assert.equal(event.claim.generation,prior.projection.claimGeneration);
    assert.equal(event.hold.generation,prior.receipt['request'+event.requestVersion].records['hold.json'].generation);
    assert.equal(event.hold.sha256,prior.receipt['request'+event.requestVersion].records['hold.json'].sha256);
  }
  const nextPath=oldPath.replace(/_R\d+\.json$/, '_R'+(prog.version+1)+'.json');
  assert.notEqual(nextPath,oldPath);assert.ok(!io.existsSync(nextPath),'I66_TERMINAL_CHECKPOINT_IN_USE');
  const prepared=prior?prepareTerminalAttemptReconciliation({authorityHead:head,receiptPath:prior.projection.receipt.path,nextEvidencePath:nextPath,recordedAtUtc:now},io):null;
  const control=prepared?.changes[P.cp]||cp,recovery=prepared?.changes[P.state]||state;
  const progress=prepared?.changes[nextPath]||prog,active=control.i66ActiveRecoveryCursor;
  if(!prepared?.changes[nextPath]){
    progress.previousEvidencePath=oldPath;progress.previousEvidenceBlobSha=cursor.currentEvidenceBlobSha;
    progress.version++;progress.recordedAtUtc=now;
    active.previousEvidencePath=oldPath;active.previousEvidenceBlobSha=cursor.currentEvidenceBlobSha;
  }
  progress.providerTerminalOutcomes={...existing,[event.buildId]:event};
  active.providerTerminalOutcomes=progress.providerTerminalOutcomes;
  progress.currentSuccessorPlan.lastProviderOutcome=active.lastProviderOutcome=event;
  if(!prior){
    const next=event.status==='PROVIDER_SUCCESS_VERIFIED' ?
      (event.phase==='preview'?'Verify this signed Preview receipt and promote the same artifact under the current physical release guard.':'Read back the signed LIVE receipt and continue the next admitted functional unit.') :
      'Preserve the consumed claim. Reconcile the verified provider outcome and its rollback before a new attempt of this scope.';
    progress.currentSuccessorPlan.releaseNext=progress.immediateExecution.next=progress.next=next;
    active.nextAction=active.next=control.nextAction=next;
    if(control.i66OperationalContinuation20261115)control.i66OperationalContinuation20261115.currentWork=next;
  }
  synchronizeExecutionProgress(progress);
  active.currentEvidencePath=nextPath;active.currentEvidenceBlobSha=blob(serial(progress));
  synchronizeOwnerPlanContinuation(control,recovery,transport);
  const changes={[P.cp]:control,[P.state]:recovery,[nextPath]:progress};
  const view={...io,readFileSync:(p,e)=>Object.hasOwn(changes,p)?serial(changes[p]):io.readFileSync(p,e)};
  assertExecutionProgress(control,progress,view);assertOwnerPlanContinuation(control,recovery,transport);
  return {status:'ATOMIC_METADATA_RECONCILIATION_PREPARED',expectedHeadOid:head,expectedPreimages:{
    [P.cp]:blob(io.readFileSync(P.cp,'utf8')),[P.state]:blob(io.readFileSync(P.state,'utf8')),
    [P.transport]:blob(io.readFileSync(P.transport,'utf8')),[oldPath]:blob(oldRaw),[nextPath]:null},changes};
}

// Archive only immutable history from the physical parent. The live projections,
// transport, and independently addressable old Git blobs stay available.
function providerOutcomeBytes(change,checkpoint,io=require('node:fs')){
  const original=Object.fromEntries(Object.entries(change.changes).map(([p,value])=>[p,serial(value)]));
  const {mutationForFiles,GRAPHQL_BODY_BUDGET}=require('./gravicentra-i6-6-cloud-build-signed-cas.cjs');
  const title='release(i66): reconcile verified provider outcome at R'+change.changes[checkpoint].version;
  const additions=Object.keys(original).sort().map(path=>({path,contents:Buffer.from(original[path]).toString('base64')}));
  const envelope=mutationForFiles(change.expectedHeadOid,title,additions);
  if(Buffer.byteLength(JSON.stringify(envelope))<=GRAPHQL_BODY_BUDGET)return original;
  const compact=value=>JSON.stringify(value)+'\n';
  const read=p=>{
    const bytes=io.readFileSync(p,'utf8');
    assert.equal(blob(bytes),change.expectedPreimages[p],'I66_HISTORY_PARENT_BLOB');
    return JSON.parse(bytes);
  };
  const parent=change.expectedHeadOid;
  assert.match(parent,/^[a-f0-9]{40}$/);
  const control=structuredClone(change.changes[P.cp]),state=structuredClone(change.changes[P.state]);
  const progress=structuredClone(change.changes[checkpoint]),cursor=control.i66ActiveRecoveryCursor;
  assert.equal(cursor.currentEvidencePath,checkpoint);
  assert.equal(cursor.currentEvidenceBlobSha,blob(serial(progress)),'I66_PREPARED_CHECKPOINT_BYTES');
  const oldPath=progress.previousEvidencePath,oldProgress=read(oldPath),oldState=read(P.state);
  assert.equal(progress.previousEvidenceBlobSha,change.expectedPreimages[oldPath]);
  assert.deepEqual(progress.archivedProviderSnapshots,oldProgress.archivedProviderSnapshots,'I66_INHERITED_SNAPSHOT_PINS_CHANGED');
  assert.deepEqual(state.priorProviderContinuationArchive,oldState.priorProviderContinuationArchive,'I66_INHERITED_STATE_PIN_CHANGED');
  const pin=(file,key,value)=>({commit:parent,path:file,blob:change.expectedPreimages[file],field:key,sha256:hash(compact(value))});
  // These two explicitly superseded freeze snapshots have no active readers.
  for(const field of ['priorReleaseFreezeBeforeV20_20261124','priorV19ReleaseAttempt20261124']){
    if(!Object.hasOwn(progress,field))continue;
    assert.deepEqual(progress[field],oldProgress[field],'I66_CHECKPOINT_HISTORY_CHANGED');
    progress.archivedProviderSnapshots={...progress.archivedProviderSnapshots};
    assert.ok(!Object.hasOwn(progress.archivedProviderSnapshots,field),'I66_HISTORY_PIN_ALREADY_EXISTS');
    progress.archivedProviderSnapshots[field]=pin(oldPath,field,oldProgress[field]);
    delete progress[field];
  }
  // Retain newly appended rows inline. Each archive points to the parent state,
  // which also retains its preceding archive pointer, so the full chain survives.
  const field='priorI66OwnerPlanContinuations',past=oldState[field]||[],history=state[field]||[];
  if(Buffer.byteLength(compact(past))>64*1024){
    assert.deepEqual(history.slice(0,past.length),past,'I66_STATE_HISTORY_PREFIX_CHANGED');
    state.priorProviderContinuationArchive={...pin(P.state,field,past),count:past.length};
    state[field]=history.slice(past.length);
  }
  const checkpointBytes=compact(progress);
  cursor.currentEvidenceBlobSha=blob(checkpointBytes);
  const transport=read(P.transport);
  synchronizeOwnerPlanContinuation(control,state,transport,{archivePrior:false});
  assertOwnerPlanContinuation(control,state,transport);
  const bytes={[P.cp]:compact(control),[P.state]:compact(state),[checkpoint]:checkpointBytes};
  const view={...io,readFileSync:(file,encoding)=>Object.hasOwn(bytes,file)?bytes[file]:io.readFileSync(file,encoding)};
  assertExecutionProgress(control,progress,view);
  return bytes;
}

function commitProviderOutcome(change) {
  const fs=require('node:fs'),os=require('node:os');
  const {execFileSync}=require('node:child_process');
  const repo='paulaosoriof86/orbit360-core',branch='recovery/fase-a-clean-20260831',remote='https://github.com/'+repo+'.git';
  const head=change.expectedHeadOid,paths=Object.keys(change.changes).sort();
  assert.match(head,/^[a-f0-9]{40}$/);
  assert.deepEqual(paths.filter(p=>p!==P.cp&&p!==P.state).length,1);
  const checkpoint=paths.find(p=>p!==P.cp&&p!==P.state);
  assert.match(checkpoint,/^artifacts\/orbit360-recovery\/release-control\/I6_6_CURRENT_EXECUTION_PROGRESS_[0-9]{8}_R[1-9][0-9]*\.json$/);
  assert.ok(paths.includes(P.cp)&&paths.includes(P.state));
  const git=(args,options={})=>execFileSync('git',args,{stdio:['pipe','pipe','pipe'],maxBuffer:16*1024*1024,...options});
  const gh=(args,input)=>JSON.parse(execFileSync('gh',['api',...args],{encoding:'utf8',input,maxBuffer:16*1024*1024}));
  const ref=()=>gh(['repos/'+repo+'/git/ref/heads/'+branch]).object.sha;
  assertTerminalAttemptChangeSetPreimages(change,{head:git(['rev-parse','HEAD']).toString().trim(),...fs});
  for(const [p,expected] of Object.entries(change.expectedPreimages)){
    const row=git(['ls-tree',head,'--',p]).toString().trim();
    assert.equal(row?row.split(/\s+/)[2]:null,expected,'I66_TERMINAL_VERSIONED_PREIMAGE_'+p);
  }
  const account=gh(['user']);assert.equal(account.login,'paulaosoriof86');
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'gi-i66-signed-cas-'));
  const email=account.id+'+'+account.login+'@users.noreply.github.com';
  const message='release(i66): reconcile verified provider outcome at R'+change.changes[checkpoint].version;
  try{
    const env={...process.env,GIT_INDEX_FILE:path.join(temp,'index')},additions=[];
    const preparedBytes=providerOutcomeBytes(change,checkpoint,fs);
    git(['read-tree',head],{env});
    for(const p of paths){
      const bytes=preparedBytes[p];
      const oid=git(['hash-object','-w','--stdin'],{input:bytes}).toString().trim();assert.equal(oid,blob(bytes));
      git(['update-index','--add','--cacheinfo','100644',oid,p],{env});
      additions.push({path:p,contents:Buffer.from(bytes).toString('base64')});
    }
    const tree=git(['write-tree'],{env}).toString().trim();
    // Read back the exact one-parent tree and its GitHub signature before
    // adopting any acknowledgement. A different concurrent commit is a HOLD.
    function verified(sha){
      assert.match(sha,/^[a-f0-9]{40}$/);
      const commit=gh(['repos/'+repo+'/git/commits/'+sha]);
      assert.equal(commit.verification.verified,true,'I66_GITHUB_VERIFICATION_REQUIRED');
      assert.deepEqual(commit.parents.map(p=>p.sha),[head],'I66_SIGNED_CAS_EXACT_PARENT');
      assert.equal(commit.tree.sha,tree,'I66_SIGNED_CAS_EXACT_TREE');
      assert.equal(commit.message.replace(/\n$/,''),message,'I66_SIGNED_CAS_EXACT_MESSAGE');
      assert.equal(ref(),sha,'I66_SIGNED_CAS_POST_COMMIT_HEAD_CHANGED');
      return {sha,tree,parent:head,message,verified:true};
    }
    const initial=ref();if(initial!==head)return verified(initial);
    const key=process.env.GRAVICENTRA_I66_SIGNING_KEY;
    // An explicitly configured, still-present registered key preserves the
    // existing SSH route. A lost /tmp key is not a new credential requirement:
    // the existing authenticated GitHub expected-head mutation signs the same
    // bounded metadata delta. No key is generated, registered or exported.
    if(key&&path.isAbsolute(key)&&fs.existsSync(key)&&fs.existsSync(key+'.pub')){
      const publicKey=fs.readFileSync(key+'.pub','utf8').trim().split(/\s+/).slice(0,2).join(' ');
      assert.ok(gh(['users/'+account.login+'/ssh_signing_keys']).some(k=>k.key.trim().split(/\s+/).slice(0,2).join(' ')===publicKey),'I66_PROVIDER_REGISTERED_SIGNER_REQUIRED');
      const sha=git(['-c','user.name='+account.login,'-c','user.email='+email,'-c','gpg.format=ssh','-c','user.signingkey='+key,'commit-tree','-S',tree,'-p',head,'-m',message]).toString().trim();
      fs.writeFileSync(path.join(temp,'allowed'),email+' '+publicKey+'\n',{mode:0o600});
      git(['-c','gpg.ssh.allowedSignersFile='+path.join(temp,'allowed'),'verify-commit',sha]);
      assert.equal(git(['rev-list','--parents','-1',sha]).toString().trim(),sha+' '+head);
      assert.equal(git(['rev-parse',sha+'^{tree}']).toString().trim(),tree);
      assert.equal(git(['log','-1','--format=%s',sha]).toString().trim(),message);
      fs.writeFileSync(path.join(temp,'pre-push'),'#!/bin/sh\nset -eu\nread -r local_ref local_sha remote_ref remote_sha\ntest "$local_sha" = "'+sha+'" && test "$remote_ref" = "refs/heads/'+branch+'" && test "$remote_sha" = "'+head+'" || exit 1\nif read -r extra; then exit 1; fi\n',{mode:0o700});
      const fresh=ref();if(fresh!==head)return verified(fresh);
      try{git(['-c','core.hooksPath='+temp,'-c','credential.helper=','-c','credential.helper=!gh auth git-credential','push','--porcelain',remote,sha+':refs/heads/'+branch]);}
      catch(error){if(ref()!==sha)throw Error('I66_SIGNED_CAS_UNCONFIRMED_RECOMPOSE_FROM_FRESH_HEAD');}
      return verified(sha);
    }
    const {mutationForFiles,signedMutationBody}=require('./gravicentra-i6-6-cloud-build-signed-cas.cjs');
    const payload=signedMutationBody(mutationForFiles(head,message,additions));
    const journal=path.resolve(git(['rev-parse','--git-common-dir']).toString().trim(),'gi-i66-provider-outcomes',head,tree);
    fs.mkdirSync(journal,{recursive:true,mode:0o700});
    const fingerprint=JSON.stringify({parent:head,tree,bytes:Buffer.byteLength(payload),sha256:hash(payload)});
    const transient=error=>/ECONNRESET|ETIMEDOUT|EPIPE|ENOTFOUND|EAI_AGAIN|unexpected EOF|connection reset|timed out|timeout|HTTP 50[234]/i.test(String(error?.stderr||'')+' '+String(error?.message||''));
    for(let attempt=0;attempt<3;attempt++){
      const fresh=ref();if(fresh!==head)return verified(fresh);
      const slot=path.join(journal,String(attempt+1));
      try{fs.writeFileSync(slot,fingerprint,{flag:'wx',mode:0o600});}
      catch(error){
        if(error.code!=='EEXIST')throw error;
        assert.equal(fs.readFileSync(slot,'utf8'),fingerprint,'I66_SIGNED_CAS_REPLAY_PAYLOAD_CHANGED');
        continue;
      }
      try{
        const response=gh(['graphql','--input','-'],payload);
        assert.ok(!response.errors?.length&&response.data?.createCommitOnBranch?.commit?.oid,'I66_SIGNED_EXPECTED_HEAD_CAS_FAILED');
        return verified(response.data.createCommitOnBranch.commit.oid);
      }catch(error){
        // Never switch signing method or blindly repeat after an unknown ACK.
        // Re-read first; only the exact accepted commit or unchanged parent is
        // admissible. A read failure leaves the retained provider proof pending.
        const observed=ref();if(observed!==head)return verified(observed);
        // A 499 or broken pipe with unchanged HEAD is an unknown ACK. Stop
        // here instead of immediately posting the same multi-megabyte body.
        if(/HTTP 499|EPIPE/i.test(String(error.stderr||'')+' '+error.message))
          throw Error('I66_SIGNED_CAS_ACK_PENDING parent='+head+' tree='+tree+' bytes='+Buffer.byteLength(payload)+' sha256='+hash(payload));
        if(!transient(error)||attempt===2)throw error;
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,200*(attempt+1));
      }
    }
    const lastObserved=ref();if(lastObserved!==head)return verified(lastObserved);
    throw Error('I66_SIGNED_CAS_UNCONFIRMED_RECOMPOSE_FROM_FRESH_HEAD');
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
}

const DIRECT_LIVE_PUBLICATION=Object.freeze({
  mode:'DIRECT_LIVE_CERTIFIED_PACKAGE_V1',
  decisionPath:dir+'I6_6_DIRECTION_CONTINUOUS_LIVE_CORRECTION_AND_BULK_INFERENCE_20261126.json',
  decisionBlob:'e9e4f82a8e1df98046345719096ae986e4936574'
});
function directLivePublication(io=require('node:fs')){
  const raw=io.readFileSync(DIRECT_LIVE_PUBLICATION.decisionPath,'utf8');
  assert.equal(blob(raw),DIRECT_LIVE_PUBLICATION.decisionBlob,'DIRECT_LIVE_EXACT_OWNER_DECISION');
  const receipt=JSON.parse(raw);
  assert.deepEqual([receipt.schema,receipt.repository,receipt.branch,receipt.activeGate],
    ['GI_I66_DIRECTION_CONTINUOUS_LIVE_CORRECTION_DECISION_V1','paulaosoriof86/orbit360-core','recovery/fase-a-clean-20260831','I6.6'],'DIRECT_LIVE_OWNER_SCOPE');
  for(const key of ['existingPublicationAuthorizationContinues','noPreviewAsDeliverableOrManualWaitingGate','immutableArtifactRequired','rollbackAndLiveReadbackRequired','noInventedAcceptanceOrConsent','oneCoordinatedReleaseWriter'])
    assert.equal(receipt.decision[key],true,'DIRECT_LIVE_OWNER_REQUIREMENT_'+key);
  return {...DIRECT_LIVE_PUBLICATION};
}
function prepareFunctionalStage(stage,facts,head,io=require('node:fs'),recordedAtUtc=new Date().toISOString(),recoveredDeployment){
  const direct=!!facts.publication;
  if(direct){assert.deepEqual(facts.publication,directLivePublication(io),'DIRECT_LIVE_PUBLICATION_BINDING');assert.ok(stage.startsWith('LIVE_'),'DIRECT_LIVE_LIVE_STAGE_ONLY');}
  const track=direct?['PACKAGE_CERTIFIED','LIVE_DEPLOYED','LIVE_VERIFIED']:['PACKAGE_CERTIFIED','PREVIEW_DEPLOYED','PREVIEW_VERIFIED','LIVE_DEPLOYED','LIVE_VERIFIED'];
  const terminal=/^(PREVIEW|LIVE)_(HOLD|ROLLED_BACK)$/.exec(stage);
  const deployedStage=terminal&&terminal[1]+'_DEPLOYED',i=track.indexOf(terminal?deployedStage:stage);
  assert.ok(i>=0,'UNKNOWN_FUNCTIONAL_STAGE');
  const read=p=>JSON.parse(io.readFileSync(p,'utf8')),cp=read(P.cp),state=read(P.state),tr=read(P.transport);
  const authority=cp.i66ScopedFunctionRelease,cursor=cp.i66ActiveRecoveryCursor;
  assert.ok(authority?.candidatePath&&authority.candidateBlob===blob(io.readFileSync(authority.candidatePath,'utf8')),'SCOPED_CANDIDATE_DRIFT');
  const binding=read(authority.candidatePath);assert.equal(facts.bindingBlob,authority.candidateBlob);
  if(direct&&stage==='LIVE_DEPLOYED'){
    assert.deepEqual([facts.rollbackRevision,facts.rollbackProof?.revision,facts.rollbackProof?.archiveSha256,facts.rollbackProof?.ready],
      [binding.predecessor.revision,binding.predecessor.revision,binding.predecessor.archiveSha256,true],'DIRECT_LIVE_PROVEN_ROLLBACK_REQUIRED');
    assert.equal(String(facts.rollbackProof.source?.generation),binding.predecessor.sourceGeneration,'DIRECT_LIVE_ROLLBACK_SOURCE_GENERATION');
    assert.match(facts.rollbackProof.configurationDigest||'',/^[a-f0-9]{64}$/,'DIRECT_LIVE_ROLLBACK_CONFIGURATION');
  }
  assert.match(facts.sourceSha,/^[a-f0-9]{40}$/);assert.match(facts.packageSha256,/^[a-f0-9]{64}$/);
  const stages=authority.providerStages||{},prior=stages[stage];
  if(prior){assert.deepEqual(prior,facts,'SCOPED_STAGE_IDENTITY_DRIFT');return {status:'NOOP_ALREADY_RECONCILED',expectedHeadOid:head,changes:{}};}
  if(recoveredDeployment){
    assert.ok(direct&&stage==='LIVE_ROLLED_BACK'&&!stages.LIVE_DEPLOYED,'RECOVERY_ONLY_UNREGISTERED_OWN_DEPLOYMENT');
    assert.deepEqual(facts.recovery.deployment,recoveredDeployment.receipt,'RECOVERY_ORIGINAL_RECEIPT');
    for(const ref of [facts.recovery.claim,facts.recovery.intent,facts.recovery.deployment,facts.receipt]){
      assert.match(ref.sha256,/^[a-f0-9]{64}$/);
      assert.match(ref.generation,/^[1-9][0-9]*$/);
    }
    const intermediate=prepareFunctionalStage('LIVE_DEPLOYED',recoveredDeployment,head,io,recordedAtUtc);
    stages.LIVE_DEPLOYED=intermediate.changes[P.cp].i66ScopedFunctionRelease.providerStages.LIVE_DEPLOYED;
  }
  const predecessorCount=terminal&&terminal[2]==='ROLLED_BACK'?i+1:i;
  if(direct){
    const previewKeys=Object.keys(stages).filter(key=>key.startsWith('PREVIEW_'));
    assert.ok([[],['PREVIEW_DEPLOYED'],['PREVIEW_DEPLOYED','PREVIEW_VERIFIED']].some(keys=>JSON.stringify(keys)===JSON.stringify(previewKeys)),'DIRECT_LIVE_PRESERVED_PREVIEW_HISTORY');
    for(const key of previewKeys)for(const field of ['sourceSha','buildId','packageSha256','bindingBlob','artifact'])assert.deepEqual(stages[key][field],stages.PACKAGE_CERTIFIED[field],'DIRECT_LIVE_PRESERVED_PACKAGE');
    assert.deepEqual(Object.keys(stages).filter(key=>!key.startsWith('PREVIEW_')),track.slice(0,predecessorCount),'SCOPED_STAGE_PREDECESSOR');
    if(stages.LIVE_DEPLOYED)assert.deepEqual(stages.LIVE_DEPLOYED.publication,facts.publication,'DIRECT_LIVE_METHOD_CONTINUITY');
    assert.equal(stages.LIVE_VERIFIED,undefined,'DIRECT_LIVE_ALREADY_ACCEPTED');
  }else{
    assert.equal(stages.LIVE_DEPLOYED?.publication,undefined,'DIRECT_LIVE_METHOD_REQUIRED');
    assert.deepEqual(Object.keys(stages),track.slice(0,predecessorCount),'SCOPED_STAGE_PREDECESSOR');
  }
  if(terminal){
    assert.ok(facts.receipt?.uri&&/^[0-9]+$/.test(facts.receipt.generation)&&/^[a-f0-9]{64}$/.test(facts.receipt.sha256),'SCOPED_TERMINAL_PROVIDER_EVIDENCE');
    if(terminal[2]==='ROLLED_BACK')assert.deepEqual([facts.revision,facts.rolledBackRevision],[stages[deployedStage].rollbackRevision,stages[deployedStage].revision]);
  }
  if(i){const first=stages.PACKAGE_CERTIFIED;for(const key of ['sourceSha','buildId','packageSha256','bindingBlob','artifact'])assert.deepEqual(facts[key],first[key],'SCOPED_SAME_ARTIFACT_'+key);}
  if(i>=1){
    assert.equal(facts.target,stage.startsWith('PREVIEW_')?binding.targets.preview:binding.targets.live);
    assert.ok(typeof facts.revision==='string'&&facts.revision.startsWith(facts.target.toLowerCase()+'-'));
    assert.equal(facts.trafficPercent,100);
  }
  if(stage.endsWith('VERIFIED')){assert.equal(facts.revision,stages[track[i-1]].revision);assert.deepEqual(facts.roles,binding.roles);}
  const old=cursor.currentEvidencePath,oldRaw=io.readFileSync(old,'utf8'),progress=JSON.parse(oldRaw);
  assert.equal(blob(oldRaw),cursor.currentEvidenceBlobSha);const next=old.replace(/_R\d+\.json$/,'_R'+(progress.version+1)+'.json');
  assert.notEqual(next,old);assert.ok(!io.existsSync(next));
  const expectedPreimages=Object.fromEntries([P.cp,P.state,P.transport,old,authority.candidatePath,...(direct?[DIRECT_LIVE_PUBLICATION.decisionPath]:[])].map(p=>[p,blob(io.readFileSync(p,'utf8'))]));expectedPreimages[next]=null;
  authority.providerStages={...stages,[stage]:facts};authority.status=stage;authority.packageStatus='CERTIFIED';
  if(direct)authority.publicationMethod=facts.publication;
  if(stage==='LIVE_VERIFIED'){
    authority.accepted={epoch:binding.releaseEpoch+1,target:facts.target,revision:facts.revision,sourceSha:facts.sourceSha,packageSha256:facts.packageSha256,
      sourcePins:Object.fromEntries(binding.owners.map(p=>[p,binding.sourcePins[p]]))};
  }
  progress.previousEvidencePath=old;progress.previousEvidenceBlobSha=cursor.currentEvidenceBlobSha;progress.version++;
  assert.equal(new Date(recordedAtUtc).toISOString(),recordedAtUtc,'SCOPED_RECEIPT_TIMESTAMP');
  progress.recordedAtUtc=recordedAtUtc;
  progress.currentSuccessorPlan.independentFunctionalRelease=progress.independentFunctionalRelease=cursor.independentFunctionalRelease=authority;
  synchronizeExecutionProgress(progress);
  Object.assign(cursor,{previousEvidencePath:old,previousEvidenceBlobSha:blob(oldRaw),currentEvidencePath:next,currentEvidenceBlobSha:blob(serial(progress))});
  synchronizeOwnerPlanContinuation(cp,state,tr);
  const changes={[P.cp]:cp,[P.state]:state,[next]:progress};
  const view={...io,readFileSync:(p,e)=>Object.hasOwn(changes,p)?serial(changes[p]):io.readFileSync(p,e)};
  assertExecutionProgress(cp,progress,view);assertOwnerPlanContinuation(cp,state,tr);
  return {status:'ATOMIC_METADATA_RECONCILIATION_PREPARED',expectedHeadOid:head,expectedPreimages,changes};
}

function prepareTerminalCli(args=process.argv.slice(2)){
  assert.equal(args.length,3,'I66_TERMINAL_USE_PREPARE_TERMINAL_RECEIPT_NEW_DIRECTORY');
  assert.equal(args[0],'prepare-terminal','I66_TERMINAL_UNKNOWN_ACTION');
  const fs=require('node:fs'),{execFileSync,spawnSync}=require('node:child_process');
  const authorityHead=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  const control=JSON.parse(fs.readFileSync(P.cp,'utf8')),current=control.i66ActiveRecoveryCursor.currentEvidencePath;
  for(const file of [P.cp,P.state,P.transport,current])assert.equal(fs.readFileSync(file,'utf8'),
    execFileSync('git',['show',authorityHead+':'+file],{encoding:'utf8',maxBuffer:64*1024*1024}),'I66_TERMINAL_CANONICAL_METADATA_WORKTREE_DRIFT');
  const progress=JSON.parse(fs.readFileSync(current,'utf8')),receiptPath=args[1],receiptBytes=fs.readFileSync(receiptPath,'utf8');
  const committed=spawnSync('git',['cat-file','-e',authorityHead+':'+receiptPath],{stdio:'pipe'}).status===0;
  if(committed)assert.equal(receiptBytes,execFileSync('git',['show',authorityHead+':'+receiptPath],{encoding:'utf8',maxBuffer:64*1024*1024}),
    'I66_TERMINAL_EXISTING_RECEIPT_IMMUTABLE');
  const date=current.match(/_([0-9]{8})_R[0-9]+\.json$/)?.[1]||new Date().toISOString().slice(0,10).replaceAll('-','');
  const nextEvidencePath=dir+'I6_6_CURRENT_EXECUTION_PROGRESS_'+date+'_R'+(progress.version+1)+'.json';
  const io={...fs,existsSync:file=>file===receiptPath?committed:fs.existsSync(file)};
  const prepared=prepareTerminalAttemptReconciliation({authorityHead,receiptPath,receiptBytes,nextEvidencePath,recordedAtUtc:new Date().toISOString()},io);
  fs.mkdirSync(args[2],{recursive:false,mode:0o700});
  fs.writeFileSync(path.join(args[2],'changeset.json'),serial(prepared),{flag:'wx',mode:0o600});
  console.log(JSON.stringify({status:prepared.status,expectedHeadOid:prepared.expectedHeadOid,paths:Object.keys(prepared.changes),
    output:path.join(args[2],'changeset.json'),canonicalRefWrites:0,providerWrites:0}));
  return prepared;
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
function assertActiveFinancialAndPlanProjections(control,progress,io){
  const continuation=control.i66OperationalContinuation20261115;
  assert.ok(continuation,'I66_ACTIVE_CONTINUATION_MISSING');
  const planPath=continuation.canonicalPlan;
  assert.ok(/^artifacts\/orbit360-recovery\/release-control\/[A-Za-z0-9_.-]+\.json$/.test(planPath||''),
    'I66_CANONICAL_PLAN_PATH_INVALID');
  const plan=JSON.parse(io.readFileSync(planPath,'utf8'));
  // This file retains the frozen decisions and dated evidence. Its old prose
  // must never become a second mutable execution cursor after a new release.
  assert.equal(plan.recordScope,'FROZEN_BUSINESS_DECISIONS_AND_HISTORICAL_EVIDENCE',
    'I66_CANONICAL_PLAN_SCOPE_MISSING');
  assert.equal(plan.nextAction,P.cp+'#nextAction','I66_CANONICAL_PLAN_NEXT_ACTION_DRIFT');
  assert.deepEqual(plan.currentExecutionAuthority,{
    schema:'GI_I66_CANONICAL_PLAN_EXECUTION_REDIRECT_V1',controlPlanePath:P.cp,
    cursorPointer:P.cp+'#i66ActiveRecoveryCursor',nextActionPointer:P.cp+'#nextAction',
    financialExecutionPointer:P.cp+'#i66OperationalContinuation20261115.currentFinancialDataExecution20261124'
  },'I66_CANONICAL_PLAN_EXECUTION_POINTER_DRIFT');

  const current=progress.financialWork?.currentExecution20261124;
  assert.equal(current?.schema,'GI_I66_CURRENT_FINANCIAL_EXECUTION_V1','I66_CURRENT_FINANCIAL_EXECUTION_MISSING');
  assert.deepEqual(continuation.currentFinancialDataExecution20261124,current,
    'I66_CURRENT_FINANCIAL_EXECUTION_PROJECTION_DRIFT');
  // Compare the duplicated summary to the active receipt, and independently
  // to its sealed application proof. Updating both summaries to PENDING cannot
  // erase a completed application or authorize the same payments a second time.
  const payments=current.historicalPayments,completion=payments?.applicationCompletion,pin=completion?.receipt;
  assert.ok(completion&&pin,'I66_APPLIED_PAYMENT_COMPLETION_MISSING');
  assert.ok(/^artifacts\/orbit360-recovery\/release-control\/[A-Za-z0-9_.-]+\.json$/.test(pin.path||''),
    'I66_APPLIED_PAYMENT_RECEIPT_PATH_INVALID');
  const bytes=io.readFileSync(pin.path,'utf8'),receipt=JSON.parse(bytes),proven=receipt.cendoso;
  assert.equal(blob(bytes),pin.gitBlobSha,'I66_APPLIED_PAYMENT_RECEIPT_BLOB_DRIFT');
  assert.equal(hash(bytes),pin.sha256,'I66_APPLIED_PAYMENT_RECEIPT_HASH_DRIFT');
  assert.ok(proven&&proven.exactManifestIdentitySetCovered===true&&proven.committedUnverified===0&&
    proven.writeOutcomeIndeterminate===false,'I66_APPLIED_PAYMENT_READBACK_UNPROVEN');
  assert.equal(proven.applicationState,'APPLIED_DIRECT','I66_APPLIED_PAYMENT_PROOF_NOT_APPLIED');
  assert.equal(payments.applicationState,proven.applicationState,'I66_APPLIED_PAYMENT_STATE_REGRESSION');
  assert.equal(completion.applicationState,proven.applicationState,'I66_APPLIED_PAYMENT_COMPLETION_STATE_DRIFT');
  assert.equal(completion.status,proven.status,'I66_APPLIED_PAYMENT_COMPLETION_STATUS_DRIFT');
  assert.equal(payments.applied,proven.verifiedApplied,'I66_APPLIED_PAYMENT_COUNT_DRIFT');
  assert.equal(payments.grossCents,proven.registeredPaymentGrossCents,'I66_APPLIED_PAYMENT_GROSS_DRIFT');
  assert.equal(payments.currency,proven.currency,'I66_APPLIED_PAYMENT_CURRENCY_DRIFT');
  assert.equal(completion.verifiedExistingPayments,proven.verifiedApplied,'I66_APPLIED_PAYMENT_COMPLETION_COUNT_DRIFT');
  assert.equal(completion.registeredPaymentGrossCents,proven.registeredPaymentGrossCents,'I66_APPLIED_PAYMENT_COMPLETION_GROSS_DRIFT');
  assert.equal(completion.currency,proven.currency,'I66_APPLIED_PAYMENT_COMPLETION_CURRENCY_DRIFT');
  assert.equal(completion.insurerReconciliationProven,proven.insurerReconciliationProven,'I66_APPLIED_PAYMENT_INSURER_RECONCILIATION_DRIFT');
  assert.equal(completion.all155SinglePostCompletionCensusClaimed,proven.noWriteReplayEvidence.all155SinglePostCompletionCensusClaimed,
    'I66_APPLIED_PAYMENT_SINGLE_POST_COMPLETION_CENSUS_DRIFT');
  assert.deepEqual(completion.applicationRunIds,proven.runs.map(run=>run.runId),'I66_APPLIED_PAYMENT_RUN_DRIFT');
  for(const key of ['newPayments','newObligations','bankMovements','amountChangesCents','paidDateChanges'])
    assert.equal(completion[key],proven[key],'I66_APPLIED_PAYMENT_COMPLETION_EFFECT_DRIFT_'+key);
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
  const focal=head.focalHosting;
  const consumed=focal?transport.lastConsumedFocalHostingRelease:transport.lastConsumedFrontendRelease;
  assert.ok(consumed,'I66_ACTIVE_RELEASE_CONSUMPTION_MISSING');
  assert.equal(consumed.generation,head.generation);assert.equal(consumed.sourceSha,head.sourceSha);
  assert.equal(consumed.artifactDigest,head.artifactDigest);assert.equal(consumed.receiptPath,head.receiptPath);
  if(focal){
    assert.equal(head.scope,'FRONTEND_ONLY');
    assert.equal(require('./gravicentra-i6-6-cloud-build-package.cjs').digest(consumed.request),focal.requestDigest,'FOCAL_CONSUMED_REQUEST_DRIFT');
    assert.deepEqual(consumed.focalHosting,focal);
    assert.deepEqual(progress.consumedFocalHostingRequest,consumed.request);
    assert.deepEqual(execution.focalHosting,focal);
    assert.deepEqual(execution.sourceQa,consumed.request.qa);
  }else{
    assert.deepEqual(progress.consumedPreviewRequest,transport.lastConsumedFrontendPreviewRequest,'I66_ACTIVE_CONSUMED_PREVIEW_DRIFT');
  }
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
  assertNativeExecutionProgress(control,progress,io);
  assertRetiredReleaseContinuation(control,progress);
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
  const receipt=JSON.parse(read(head.receiptPath)),journal=JSON.parse(read(releaseJournalPath(head.generation,head.focalHosting)));
  assert.equal(journal.phase,'COMMITTED');assert.equal(journal.receipt.blob,head.receiptGitBlobSha);
  assert.equal(journal.receipt.commit,head.receiptCommit);assert.equal(journal.receipt.verified,true);
  assert.deepEqual(receipt.target,journal.request.target);assert.deepEqual(receipt.previous,journal.request.previous);
  assert.equal(receipt.preview.artifactDigest,receipt.target.artifactDigest);assert.equal(receipt.ui.result,'PASS');
  require('./gravicentra-i66-frontend-promotion-transaction.cjs').verifyBytes(receipt.target,receipt.physical);
  const target=receipt.target,physical=transport.currentPhysicalHostingRelease;
  for(const sealed of [head,physical]) assert.deepEqual(sealed.focalHosting,target.focalHosting,'FOCAL_HOSTING_PHYSICAL_BINDING');
  if(target.focalHosting){
    require('./gravicentra-i6-6-cloud-build-preview.cjs').focalArtifactIdentity(target);
    assert.equal(head.compositionTree,target.focalHosting.compositionTree,'FOCAL_HOSTING_HEAD_TREE');
    assert.equal(head.journalPath,releaseJournalPath(head.generation,target.focalHosting),'FOCAL_HOSTING_HEAD_JOURNAL');
    assert.equal(head.generation,target.focalHosting.generation,'FOCAL_HOSTING_HEAD_GENERATION');
    assert.notEqual(receipt.scope,'COMPOSITE','FOCAL_HOSTING_SCOPE');
    assert.equal(journal.request.scope,'FRONTEND_ONLY','FOCAL_HOSTING_SCOPE');
  }
  assert.equal(receipt.generation,head.generation,'I66_RECEIPT_GENERATION');
  assert.ok(Number.isSafeInteger(target.files)&&target.files>0,'I66_SIGNED_FILE_COUNT_REQUIRED');
  assert.equal(head.hostedFilesEachOrigin,target.files,'I66_HEAD_FILE_COUNT_DRIFT');
  assert.equal(receipt.preview.files,target.files,'I66_PREVIEW_FILE_COUNT_DRIFT');
  assert.equal(receipt.preview.hostingVersion,target.hostingVersion,'I66_PREVIEW_VERSION_DRIFT');
  for(const key of ['executionProvider','sourceSha','sourceTree','manifestBlob','compositionBlob','artifactId','artifactDigest','buildId','buildRunId','previewUrl','hostingVersion']){
    assert.equal(head[key],target[key],'I66_HEAD_TARGET_DRIFT_'+key);
  }
  for(const key of ['executionProvider','sourceSha','buildId','artifactId','artifactDigest'])assert.equal(physical[key],target[key],'I66_TRANSPORT_TARGET_DRIFT_'+key);
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
  const head={generation:n,gate:'I6.6',scope:'FRONTEND_ONLY',...(t.executionProvider===undefined?{}:{executionProvider:t.executionProvider}),status:'FOCAL_FRONTEND_LIVE_UI_VERIFIED',sourceSha:t.sourceSha,sourceTree:t.sourceTree,
    compositionBlob:t.compositionBlob,manifestBlob:t.manifestBlob,artifactId:t.artifactId,artifactDigest:t.artifactDigest,
    hostingVersion:t.hostingVersion,buildId:t.buildId,hostedFilesEachOrigin:t.files,previewUrl:t.previewUrl,buildRunId:t.buildRunId,
    rollback:j.request.previous.hostingVersion,receiptPath,receiptGitBlobSha:body.receipt.blob,receiptCommit:body.receipt.commit,
    fullI66ProductionAccepted:false,liveCloneRunId:body.receipt.runId};
  const focal=t.focalHosting;
  if(focal){
    const authorized=transport.focalHostingRequest;
    require('./gravicentra-i6-6-cloud-build-preview.cjs').focalArtifactIdentity(t);
    assert.equal(j.request.scope,'FRONTEND_ONLY');
    assert.equal(authorized?.scope,'HOSTING_ONLY');
    assert.equal(focal.schema,authorized.schema);
    assert.equal(require('./gravicentra-i6-6-cloud-build-package.cjs').digest(authorized),focal.requestDigest,'FOCAL_STALE_REQUEST');
    assert.equal(n,transport.frontendReleaseSequence+1);
    assert.equal(authorized.generation,n);assert.equal(focal.generation,n);
    assert.equal(authorized.sourceSha,t.sourceSha);assert.equal(authorized.manifestBlob,t.manifestBlob);
    assert.equal(authorized.previousReceiptBlob,cp.i66FrontendReleaseHead.receiptGitBlobSha);
    assert.equal(authorized.protectedPreviewRequestVersion,transport.frontendPreviewRequest.version);
    assert.equal(transport.forbidBackendFunctionDeploy,true);assert.equal(transport.forbidFirestoreRulesDataAuthWrites,true);
    head.focalHosting=structuredClone(focal);head.compositionTree=focal.compositionTree;
    head.journalPath=releaseJournalPath(n,focal);
  }
  cp.i66FrontendReleaseHead=head;cp.currentExecutionDecisionPointer='i66FrontendReleaseHead';
  cp.i66OperationalContinuation20261115={...cp.i66OperationalContinuation20261115,latestProvenLiveSource:t.sourceSha,
    latestProvenLiveSourceScope:'FRONTEND_ONLY_EXACT_ARTIFACT_SIGNED_UI_PROOF',latestPhysicalFrontendLiveReceipt:receiptPath};
  cp.nextAction='I6.6 continúa después de la publicación focal '+t.buildId+'. '+c.next;
  state.currentExecutionDecisionPointer=P.cp+'#i66FrontendReleaseHead';state.currentPhysicalFrontend=head;
  transport.previousPhysicalHostingRelease=transport.currentPhysicalHostingRelease;
  transport.currentPhysicalHostingRelease={...(t.executionProvider===undefined?{}:{executionProvider:t.executionProvider}),sourceSha:t.sourceSha,buildId:t.buildId,artifactId:t.artifactId,artifactDigest:t.artifactDigest,
    previewRunId:t.buildRunId,signedPreviewRunId:t.previewUiRunId||null,liveCloneRunId:body.receipt.runId,liveHostingVersion:t.hostingVersion,
    readbackEachOrigin:t.files,receipt:receiptPath,backendFunctionsChanged:0,fullI66ProductionAccepted:false,status:head.status};
  if(focal)transport.currentPhysicalHostingRelease.focalHosting=structuredClone(focal);
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
  if(focal){
    transport.lastConsumedFocalHostingRelease={generation:n,focalHosting:structuredClone(focal),
      request:structuredClone(transport.focalHostingRequest),sourceSha:t.sourceSha,artifactDigest:t.artifactDigest,receiptPath};
  }else{
    transport.lastConsumedFrontendPreviewRequest=structuredClone(transport.frontendPreviewRequest);
    transport.lastConsumedFrontendRelease={generation:n,previewRequestVersion:transport.frontendPreviewRequest?.version||null,
      sourceSha:t.sourceSha,artifactDigest:t.artifactDigest,receiptPath};
  }
  if(j.request.scope!=='COMPOSITE'){
    progress.priorReleaseExecutionViews=[...(progress.priorReleaseExecutionViews||[]),{
      priorEvidencePath:oldEvidence,priorEvidenceGitBlobSha:c.currentEvidenceBlobSha,priorLiveSourceScope,view:priorReleaseView}];
    progress.releaseScope='FRONTEND_ONLY';
    if(focal)progress.consumedFocalHostingRequest=structuredClone(transport.focalHostingRequest);
    else progress.consumedPreviewRequest=structuredClone(transport.frontendPreviewRequest);
    progress.releaseExecution={status:'FRONTEND_FOCAL_SIGNED_LIVE_ACCEPTED',scope:'FRONTEND_ONLY',scopeId:j.request.scopeId||null,
      sourceSha:t.sourceSha,buildId:t.buildId,buildRunId:t.buildRunId,artifactId:t.artifactId,artifactDigest:t.artifactDigest,
      artifactBuilt:true,previewSignedPass:true,livePromoted:true,signedPreviewRunId:t.previewUiRunId||null,
      liveRunId:body.receipt.runId,receiptPath,uiReceiptPath:genName(n,'LIVE_UI'),uiReceiptGitBlobSha:body.liveUi?.receiptBlob||null,
      backendFunctionsChanged:0,businessWrites:0,...(focal?{focalHosting:structuredClone(focal),
        sourceQa:structuredClone(transport.focalHostingRequest.qa)}:{sourceQaHead:transport.frontendPreviewRequest?.sourceQaHead||null,
      sourceQaRunId:transport.frontendPreviewRequest?.sourceQaRunId||null,guardRunId:transport.frontendPreviewRequest?.guardRunId||null,
      frontendPreviewRequestVersion:transport.frontendPreviewRequest?.version||null}),fullI66ProductionAccepted:false};
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
  return {...changes,[P.cp]:cp,[P.state]:state,[P.transport]:transport,[P.ledger]:ledger,[progressPath]:progress,[releaseJournalPath(n,focal)]:body};
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
  const backend={generation:j.generation,gate:'I6.6',scope:'COMPOSITE',status:'SIGNED_LIVE_VERIFIED',...(p.executionProvider===undefined?{}:{executionProvider:p.executionProvider}),
    sourceSha:p.sourceSha,artifactId:p.artifactId,artifactDigest:p.artifactDigest,buildId:p.buildId,
    functionsChanged:backendCount,revisions:proof.backendRevisions,liveRunId:proof.runId,
    proofPath,proofSha256:hash(proofText),rollbackHostingVersion:proof.previousHostingVersion,
    fullI66ProductionAccepted:false};
  return {schema:'GI_I66_SIGNED_COMPOSITE_RECEIPT_V1',scope:'COMPOSITE',generation:j.generation,...(p.executionProvider===undefined?{}:{executionProvider:p.executionProvider}),
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
    ...(head.executionProvider===undefined?{}:{executionProvider:head.executionProvider}),
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
    ...(head.executionProvider===undefined?{}:{executionProvider:head.executionProvider}),
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
      ...(head.executionProvider===undefined?{}:{executionProvider:head.executionProvider}),
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
  const [currentReceipt]=await Promise.all([file(genName(head.generation,'RECEIPT')),file(releaseJournalPath(head.generation,head.focalHosting)),
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
module.exports={releaseJournalPath,providerOutcomeBytes,DIRECT_LIVE_PUBLICATION,directLivePublication,prepareFunctionalStage,prepareProviderOutcome,commitProviderOutcome,P,genName,serial,blob,physicalGuard,closeFiles,executionSnapshot,executionProgressProjection,synchronizeExecutionProgress,archiveExecutionObservers,assertExecutionProgress,assertRetiredReleaseContinuation,
  resolveNativeExecutionProgress,assertNativeExecutionProgress,terminalAttemptRecords,assertTerminalAttemptProgress,
  prepareTerminalAttemptReconciliation,assertTerminalAttemptChangeSetPreimages,prepareTerminalCli,
  ownerPlanContinuationProjection,synchronizeOwnerPlanContinuation,assertOwnerPlanContinuation,assertActiveFinancialAndPlanProjections,assertActiveReleaseProgress,
  compositeReceipt,closeCompositeFiles,READONLY_PROFILES,readonlyObserverPaths,readonlyObserverTarget,resolveReadonlyObserver,verifyReadonlyObserver};
if(require.main===module)try{prepareTerminalCli();}catch(error){console.error(String(error.message).split('\n')[0]);process.exitCode=1;}
