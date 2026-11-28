'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {execFileSync,spawn}=require('node:child_process');
const {P,genName,releaseJournalPath,serial,blob,closeFiles,physicalGuard,closeCompositeFiles,compositeReceipt}=require('./gravicentra-i66-frontend-control.cjs');
const {promote,acceptComposite}=require('./gravicentra-i66-frontend-promotion-transaction.cjs');
const {hosting}=require('./gravicentra-i66-frontend-hosting-io.cjs');
const repository='paulaosoriof86/orbit360-core',branch='recovery/fase-a-clean-20260831';
const repoUrl='https://api.github.com/repos/'+repository+'/';
const nativeProvider=()=>process.env.GRAVICENTRA_BUILD_PROVIDER==='CLOUD_BUILD';
const nativeOwner=()=>require('./gravicentra-i6-6-cloud-build-operational.cjs');
function releaseProviderIdentity(binding){return nativeOwner().provider(binding)?{executionProvider:'CLOUD_BUILD'}:{};}
const executionHead=()=>nativeProvider()?process.env.I66_NATIVE_AUTHORITY_HEAD:process.env.GITHUB_SHA;
const runId=nativeProvider()?process.env.GRAVICENTRA_CLOUD_BUILD_ID:Number(process.env.GITHUB_RUN_ID);
async function assertExecution(phase,action,p){
  if(nativeProvider()){
    const g=require('./gravicentra-i6-6-operational-release-candidate.cjs');
    const candidate=p||g.candidateForPhase(JSON.parse(fs.readFileSync(g.CONTROL,'utf8')),phase);
    return nativeOwner().verifyRuntimeAuthority(candidate,{phase,action});
  }
  assert.ok(!process.env.GRAVICENTRA_BUILD_PROVIDER,'RELEASE_UNKNOWN_PROVIDER');
  assert.equal(process.env.GITHUB_REPOSITORY,repository);assert.equal(process.env.GITHUB_REF_NAME,branch);
  assert.ok(Number.isSafeInteger(runId)&&runId>0);return null;
}
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:25*1024*1024}).trimEnd();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const jsonAt=(sha,p)=>JSON.parse(git('show',sha+':'+p));
const blobAt=(sha,p)=>git('rev-parse',sha+':'+p);
const optional=(sha,p)=>{try{return jsonAt(sha,p);}catch(e){if(!existsAt(sha,p))return null;throw e;}};
function existsAt(sha,p){try{execFileSync('git',['cat-file','-e',sha+':'+p],{stdio:'ignore'});return true;}catch{return false;}}
function remote(){git('fetch','--quiet',nativeProvider()?nativeOwner().C.repositoryUrl:'origin','refs/heads/'+branch);return git('rev-parse','FETCH_HEAD');}
async function api(url,options={}){
  // Long browser/guard subprocesses must not leave a reused GitHub connection
  // as the only route to recording an otherwise proven release.
  const r=await fetch(url,{...options,headers:{...(process.env.GITHUB_TOKEN?{Authorization:'Bearer '+process.env.GITHUB_TOKEN}:{}),'User-Agent':'Gravicentra-Release-Owner',
    Accept:'application/vnd.github+json',...options.headers,Connection:'close'},signal:AbortSignal.timeout(60000)});assert.ok(r.ok,'GITHUB_PROVIDER_HTTP_'+r.status);return r;
}
const github=async(p,raw=false)=>{const r=await api(repoUrl+p);return raw?r:r.json();};
async function signed(sha){const c=await github('commits/'+sha);assert.equal(c.commit.verification.verified,true,'GITHUB_SIGNATURE_UNVERIFIED');return sha;}
function transportCode(error){
  const allowed=new Set(['ECONNRESET','ETIMEDOUT','EPIPE','ENOTFOUND','EAI_AGAIN','UND_ERR_SOCKET',
    'UND_ERR_CONNECT_TIMEOUT','UND_ERR_HEADERS_TIMEOUT','UND_ERR_BODY_TIMEOUT','ABORT_ERR']);
  for(const item of [error,error?.cause])if(allowed.has(item?.code))return item.code;
  if(error?.name==='TimeoutError'||error?.name==='AbortError')return error.name;
  if(error?.message==='fetch failed')return 'FETCH_FAILED';
  return null;
}
function runReleaseChild(file,args,options){
  return new Promise((resolve,reject)=>{
    const child=spawn(file,args,{...options,windowsHide:true});
    child.once('error',reject);
    child.once('close',(code,signal)=>code===0?resolve():reject(Error('RELEASE_SUBPROCESS_FAILED_'+String(code)+'_'+String(signal))));
  });
}
// A retry may repeat only the same expected-head CAS after an independent
// read proves it has not committed. Lost acknowledgements adopt only the exact
// one-parent, exact-file-set, exact-blob commit, followed by signature proof.
async function commitWithReadback({write,readback,verifySignature,pause=sleep,diagnostic=()=>{}},{maxAttempts=3}={}){
  assert.equal(maxAttempts,3,'RELEASE_CAS_RECOVERY_BOUND');
  let state={status:'UNCHANGED'},last;
  for(let attempt=0;attempt<maxAttempts;attempt++){
    try{
      const sha=state.status==='EXACT_COMMIT'?state.sha:await write();
      state={status:'EXACT_COMMIT',sha};
      await verifySignature(sha);return sha;
    }catch(error){
      last=error;const code=transportCode(error);
      if(!code&&error.message!=='RELEASE_HEAD_CAS_FAILED')throw error;
      diagnostic({operation:'SIGNED_EXPECTED_HEAD_COMMIT',attempt:attempt+1,code:code||'HEAD_CAS_FAILED'});
      let observed;
      for(let readAttempt=0;readAttempt<3;readAttempt++){
        try{observed=await readback();break;}catch(readError){
          if(!transportCode(readError)||readAttempt===2)throw readError;
          await pause(200*(readAttempt+1));
        }
      }
      assert.ok(observed&&['UNCHANGED','EXACT_COMMIT'].includes(observed.status),'RELEASE_HEAD_CAS_FAILED');
      state=observed;
      if(!code&&state.status==='UNCHANGED')throw error;
      if(attempt+1<maxAttempts)await pause(200*(attempt+1));
    }
  }
  // The final failed response can still describe a successful single CAS.
  // Signature verification remains mandatory and is never inferred from bytes.
  if(state.status==='EXACT_COMMIT'){await verifySignature(state.sha);return state.sha;}
  throw last;
}
async function casCommit(head,headline,entries){
  if(nativeProvider()){
    const runtime=await assertExecution('live','accept-live');
    return require('./gravicentra-i6-6-cloud-build-signed-cas.cjs').requestSignedCas({head,headline,entries,allowedPaths:Object.keys(entries),
      execution:{buildId:runtime.buildId,sourceSha:runtime.plan.sourceSha,phase:'live',authorityHead:runtime.workflowHeadSha},
      io:await nativeOwner().signedCasIo(runtime)});
  }
  const mutation='mutation($input:CreateCommitOnBranchInput!){createCommitOnBranch(input:$input){commit{oid}}}';
  const input={branch:{repositoryNameWithOwner:repository,branchName:branch},expectedHeadOid:head,message:{headline},
    fileChanges:{additions:Object.entries(entries).map(([p,obj])=>({path:p,contents:Buffer.from(serial(obj)).toString('base64')}))}};
  return commitWithReadback({
    write:async()=>{
      const r=await (await api('https://api.github.com/graphql',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:mutation,variables:{input}})})).json();
      assert.ok(!r.errors?.length&&r.data?.createCommitOnBranch?.commit?.oid,'RELEASE_HEAD_CAS_FAILED');
      return r.data.createCommitOnBranch.commit.oid;
    },
    readback:async()=>{
      const fresh=remote();if(fresh===head)return {status:'UNCHANGED'};
      assert.equal(git('show','-s','--format=%P',fresh),head,'RELEASE_HEAD_CAS_FAILED');
      assert.equal(git('show','-s','--format=%s',fresh),headline,'RELEASE_HEAD_CAS_FAILED');
      const changed=Object.entries(entries).filter(([file,obj])=>!existsAt(head,file)||blobAt(head,file)!==blob(serial(obj))).map(([file])=>file).sort();
      assert.deepEqual(git('diff-tree','--no-commit-id','--name-only','-r',fresh).split('\n').filter(Boolean).sort(),changed,'RELEASE_HEAD_CAS_FAILED');
      for(const [file,obj] of Object.entries(entries))assert.equal(blobAt(fresh,file),blob(serial(obj)),'RELEASE_HEAD_CAS_FAILED');
      return {status:'EXACT_COMMIT',sha:fresh};
    },
    verifySignature:signed,
    diagnostic:detail=>console.error('I66_RELEASE_TRANSPORT_RECOVERY '+JSON.stringify(detail))
  });
}
const pins=[P.guard,'tools/gravicentra-i66-frontend-control.cjs','tools/gravicentra-i66-frontend-promotion-owner.cjs',
  'tools/gravicentra-i66-frontend-hosting-io.cjs','tools/gravicentra-i66-frontend-promotion-transaction.cjs',
  'tools/gravicentra-i6-6-operational-release-candidate.cjs','.github/workflows/gravicentra-delta-66-exact-live-clone.yml'];
const FINANCIAL_SCOPE='SIX_RECEIPT_CURRENT_BALANCE_READONLY';
const FINANCIAL_DRIVER='tools/gravicentra-i66-live-performance-readonly.mjs';
const FINANCIAL_PREVIEW_WORKFLOW='.github/workflows/gravicentra-i66-preview-performance-readonly.yml';
const FINANCIAL_LIVE_WORKFLOW='.github/workflows/gravicentra-delta-66-exact-live-clone.yml';
const COMPOSITE_FINANCIAL_LIVE_WORKFLOW='.github/workflows/gravicentra-i66-privileged-role-exact-live-promotion.yml';
const financialPins=[FINANCIAL_DRIVER,FINANCIAL_PREVIEW_WORKFLOW,
  'tools/gravicentra-i6-6-six-existing-receipts-ui-readonly.test.cjs',
  'tools/gravicentra-i66-frontend-promotion-transaction.test.cjs','tools/gravicentra-i66-frontend-control.test.cjs',
  'functions/product-active-role-contract.js'];
const financialTargetKeys=['sourceSha','artifactId','artifactDigest','buildId','buildRunId','previewUrl','previewChannel'];
const financialTarget=t=>({...Object.fromEntries(financialTargetKeys.map(k=>[k,t[k]])),...(t.executionProvider===undefined?{}:{executionProvider:t.executionProvider})});
// These three entries are Git pathspecs, not file identities. Their complete
// trees remain protected by assertFinancialComposition, including files that
// are not individually listed as QA owners. storage.rules is historically
// absent; only that named optional owner may be absent from the frozen tree.
const financialNonFilePaths=new Set(['functions','orbit360-platform',
  ':(exclude)orbit360-platform/docs/recovery/orbit360-recovery-state-v1.json']);
const financialOptionalPaths=['storage.rules'];
const financialQaPaths=(releaseScope='FRONTEND_ONLY',optionalPaths=[])=>{
  assert.ok(optionalPaths.every(p=>financialOptionalPaths.includes(p)),'FINANCIAL_QA_UNKNOWN_OPTIONAL_OWNER');
  return [...new Set([...pins,...financialPins,
  ...require('./gravicentra-i66-frontend-control.cjs').readonlyObserverPaths('performance'),
  ...(releaseScope==='COMPOSITE'?[COMPOSITE_FINANCIAL_LIVE_WORKFLOW,
    ...require('./gravicentra-i6-6-operational-release-candidate.cjs').PINNED_OWNER_PATHS
      .filter(p=>!financialNonFilePaths.has(p)&&!financialOptionalPaths.includes(p)),...optionalPaths]:[])])].sort();
};
const financialDeclaredOptionalPaths=raw=>financialOptionalPaths.filter(p=>Object.hasOwn(raw.ownerPins||{},p));
function financialQaOwnerSelection(sourceSha,{gitRead=(...a)=>execFileSync('git',a,{maxBuffer:25*1024*1024})}={}){
  assert.match(sourceSha||'',/^[a-f0-9]{40}$/,'FINANCIAL_QA_FROZEN_SOURCE_REQUIRED');
  const rows=String(gitRead('ls-tree','-r','--full-tree','-z',sourceSha)).split('\0').filter(Boolean),tree=new Map();
  for(const row of rows){const match=/^(\d+) (blob|commit) ([a-f0-9]{40})\t([\s\S]+)$/.exec(row);
    assert.ok(match,'FINANCIAL_QA_INVALID_SOURCE_TREE');assert.ok(!tree.has(match[4]),'FINANCIAL_QA_DUPLICATE_TREE_PATH');
    tree.set(match[4],{mode:match[1],type:match[2],sha:match[3]});}
  const optional=financialOptionalPaths.filter(p=>tree.has(p)),paths=financialQaPaths('COMPOSITE',optional);
  for(const p of paths){const entry=tree.get(p);assert.ok(entry,'FINANCIAL_QA_REQUIRED_OWNER_ABSENT_'+p);
    assert.equal(entry.type,'blob','FINANCIAL_QA_OWNER_NOT_BLOB_'+p);assert.match(entry.mode,/^100(?:644|755)$/,'FINANCIAL_QA_OWNER_NOT_REGULAR_FILE_'+p);}
  return {paths,pins:Object.fromEntries(paths.map(p=>[p,tree.get(p).sha])),optionalAbsent:financialOptionalPaths.filter(p=>!tree.has(p))};
}
function assertFinancialComposition(sourceSha,workflowHead,{gitRead=(...a)=>execFileSync('git',a,{maxBuffer:25*1024*1024})}={}){
  const pathspec=require('./gravicentra-i6-6-operational-release-candidate.cjs').PINNED_OWNER_PATHS;
  assert.match(sourceSha||'',/^[a-f0-9]{40}$/);assert.match(workflowHead||'',/^[a-f0-9]{40}$/);
  gitRead('diff','--exit-code',sourceSha,workflowHead,'--',...pathspec);
  gitRead('diff','--exit-code',sourceSha,'--',...pathspec);
  const untracked=String(gitRead('ls-files','--others','--exclude-standard','-z','--',...pathspec));
  assert.equal(untracked,'','FINANCIAL_QA_UNTRACKED_COMPOSITION_FILE');
}
function pinSet(head,scope,releaseScope){
  if(scope===FINANCIAL_SCOPE&&releaseScope==='COMPOSITE')return financialQaOwnerSelection(head).pins;
  return Object.fromEntries((scope===FINANCIAL_SCOPE?financialQaPaths(releaseScope):pins).map(p=>[p,blobAt(head,p)]));
}
// Read-only verification has no button/write requirement. Its evidence remains
// tied to the exact artifact, two existing assigned roles and four real views.
function validateFinancialReport(report,target,phase,{authorityBlob,physicalPhaseKey,releaseScope,parentAuthorityBlob}={}){
  if(nativeOwner().provider(target))assert.equal(report.executionProvider,'CLOUD_BUILD','FINANCIAL_NATIVE_REPORT_PROVIDER');
  assert.equal(report.schema,'GI_I66_BROWSER_PERFORMANCE_READONLY_V2');
  assert.equal(report.status,'FRONTEND_SIX_RECEIPTS_TWO_ROLE_TWO_VIEW_READONLY_PASS');
  assert.equal(report.phase,phase);assert.equal(report.scopeId,FINANCIAL_SCOPE);
  assert.deepEqual([report.sourceSha,report.buildId,report.releaseArtifactId,report.releaseArtifactDigest,report.releaseBuildRunId],
    [target.sourceSha,target.buildId,target.artifactId,target.artifactDigest,target.buildRunId],'FINANCIAL_QA_TARGET_DRIFT');
  assert.equal(report.origin,phase==='preview'?target.previewUrl:'https://app.aysseguros.com');
  for(const key of ['firestoreWrites','businessActions','paymentActions','syntheticFixtures','pushNotifications'])
    assert.equal(report[key],0,'FINANCIAL_QA_WRITE_BOUNDARY_'+key);
  assert.equal(report.readOnly,true);assert.equal(report.roleChanged,false);
  assert.equal(report.assignedRoleSelectionOnly,true);assert.equal(report.fullA04Accepted,false);assert.equal(report.fullA12Passed,false);
  assert.deepEqual(report.errors,[]);assert.equal(report.roles?.length,4,'FINANCIAL_QA_FOUR_REAL_VIEWS_REQUIRED');
  assert.deepEqual(report.roles.map(r=>r.role+':'+r.width).sort(),['direccion:1365','direccion:390','operativo:1365','operativo:390']);
  assert.equal(new Set(report.roles.filter(r=>r.role==='operativo').map(r=>r.actorSha256)).size,1);
  assert.equal(new Set(report.roles.filter(r=>r.role==='direccion').map(r=>r.actorSha256)).size,1);
  assert.equal(new Set(report.roles.map(r=>r.actorSha256)).size,2,'FINANCIAL_QA_TWO_ACTORS_REQUIRED');
  assert.equal(report.matrixServerSnapshotBefore?.length,6);
  assert.deepEqual(report.matrixServerSnapshotAfter,report.matrixServerSnapshotBefore,'FINANCIAL_QA_MATRIX_SERVER_CHANGED');
  for(const row of report.roles){
    assert.equal(row.authenticated,true);assert.equal(row.assignedRoleVerified,true);assert.equal(row.country,'GT');
    assert.match(row.actorSha256||'',/^[a-f0-9]{64}$/);assert.equal(row.viewportVerified,true);
    const f=row.financialFocal;assert.equal(f?.sixExistingObligations,true);
    assert.equal(f.distinctObligationCount,6);assert.equal(f.newObligations,0);assert.equal(f.additionalWrites,0);
    assert.equal(f.sourceGrossCents,166956);assert.equal(f.currentOutstandingCents,166956);assert.equal(f.policyUnchanged,true);
    assert.deepEqual(f.sourceSnapshotAfter,f.sourceSnapshotBefore,'FINANCIAL_QA_SERVER_CHANGED');
    assert.deepEqual(f.sourceSnapshotBefore,report.matrixServerSnapshotBefore,'FINANCIAL_QA_VIEW_SERVER_CHANGED');
    for(const s of f.sourceSnapshotBefore){assert.equal(s.serverBalanceProof?.sourceSha,target.sourceSha);
      assert.match(s.serverBalanceProof.ownerBlob||'',/^[a-f0-9]{40}$/);assert.equal(s.serverBalanceProof.open,true);
      assert.equal(s.serverBalanceProof.balanceCents,27826);}
    assert.equal(f.observations?.length,6);assert.equal(new Set(f.observations.map(x=>x.receiptId)).size,6);
    for(const observation of f.observations){
      assert.equal(observation.reloadPass,true,'FINANCIAL_QA_RELOAD_HOLD');
      for(const [stage,check] of [['beforeReload','beforeCheck'],['afterReload','afterCheck']]){
        assert.equal(observation[check]?.pass,true,'FINANCIAL_QA_VISIBLE_STAGE_HOLD');
        assert.deepEqual(Object.keys(observation[check].checks).sort(),
          ['balanceState','balanceValue','balanceVerified','contractualDue','gross','operationalLimit','status']);
        assert.ok(Object.values(observation[check].checks).every(x=>x===true));
        const u=observation[stage];assert.equal(u?.actorMatches,true);assert.equal(u.role.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''),row.role);
        assert.equal(u.country,'GT');assert.equal(u.protectedCandidate,true);assert.equal(u.confirmed,true);
        assert.deepEqual(u.relevantErrors,[]);assert.equal(u.detailCount,1);assert.equal(u.balanceCents,27826);
        assert.equal(u.displayedBalanceCents,27826);assert.equal(u.balanceState,'open');assert.equal(u.open,true);
        assert.equal(u.amountProofSource,f.sourceSnapshotBefore.find(s=>s.receiptId===observation.receiptId)?.serverBalanceProof.source,
          'FINANCIAL_QA_BROWSER_SERVER_OWNER_DRIFT');
        assert.equal(u.viewport?.width,row.width);assert.equal(u.viewport?.detailVisible,true);assert.equal(u.viewport?.balanceVisible,true);
        assert.equal(u.viewport?.horizontalOverflowPx,0,'FINANCIAL_QA_HORIZONTAL_OVERFLOW');
      }
    }
    assert.deepEqual(f.cobrosEngineBeforeReload,f.cobrosEngineAfterReload);assert.equal(f.cobrosEngineAfterReload?.totalGrossCents,166956);
    for(const key of ['pageErrors','consoleErrors','blockedWrites'])assert.equal(f.errors[key],0,'FINANCIAL_QA_RUNTIME_'+key);
    assert.deepEqual(f.errors.httpClasses,{});
  }
  const before=report.frontendQaBefore,after=report.frontendQaAfter;
  assert.equal(before?.stage,'before');assert.equal(after?.stage,'after');
  for(const proof of [before,after]){
    assert.equal(proof.phase,phase);assert.equal(proof.scopeId,FINANCIAL_SCOPE);assert.equal(proof.readOnly,true);
    assert.deepEqual(proof.target,financialTarget(target),'FINANCIAL_QA_AUTHORITY_TARGET_DRIFT');
    assert.equal(proof.authorityBlob,authorityBlob||before.authorityBlob,'FINANCIAL_QA_AUTHORITY_CHANGED');
    assert.match(proof.authorityBlob||'',/^[a-f0-9]{40}$/);
    assert.equal(proof.physicalPhaseKey,physicalPhaseKey||null,'FINANCIAL_QA_JOURNAL_CHANGED');
    assert.equal(proof.runId,before.runId);assert.equal(proof.workflowHeadSha,report.workflowHeadSha);
    if(releaseScope==='COMPOSITE'){
      assert.equal(proof.releaseScope,'COMPOSITE','FINANCIAL_QA_COMPOSITE_SCOPE_MISSING');
      assert.match(parentAuthorityBlob||'',/^[a-f0-9]{40}$/);
      assert.equal(proof.parentAuthorityBlob,parentAuthorityBlob,'FINANCIAL_QA_PARENT_AUTHORITY_DRIFT');
    }
  }
  assert.equal(report.stageCount,48,'FINANCIAL_QA_48_STAGES_REQUIRED');
  return report;
}
function validateCompositeFinancialParent(raw,parentAuthority,parentAuthorityBlob,phase){
  const g=require('./gravicentra-i6-6-operational-release-candidate.cjs'),make=require('./gravicentra-i66-make-release-scope.cjs');
  assert.equal(raw.releaseScope,'COMPOSITE');assert.equal(raw.parentScopeId,make.SCOPE);
  assert.match(parentAuthorityBlob||'',/^[a-f0-9]{40}$/);
  assert.equal(raw.parentAuthorityBlob,parentAuthorityBlob,'FINANCIAL_QA_PARENT_AUTHORITY_DRIFT');
  const candidate=g.candidateForPhase(parentAuthority,phase);
  assert.equal(make.isMake(candidate),true,'FINANCIAL_QA_APPROVED_COMPOSED_CANDIDATE_REQUIRED');
  assert.deepEqual(candidate.makeIngress.balanceCorrection,make.BALANCE_CORRECTION);
  assert.deepEqual(financialTarget(raw.target),financialTarget({...candidate,previewChannel:candidate.previewChannelId}),
    'FINANCIAL_QA_PARENT_TARGET_DRIFT');
  return candidate;
}
function validateFinancialAuthority({raw,authorityBlob,physical,journal,phase,attemptHistory=[],parentAuthority,parentAuthorityBlob}){
  assert.ok(['preview','live'].includes(phase));assert.equal(raw.scopeId,FINANCIAL_SCOPE);assert.equal(raw.gate,'I6.6');
  const releaseScope=raw.releaseScope||'FRONTEND_ONLY';assert.ok(['FRONTEND_ONLY','COMPOSITE'].includes(releaseScope));
  assert.equal(raw.approvedByDirection,true);assert.equal(raw.readOnlyQa,true);
  assert.equal(raw.backendDeployAllowed,false);assert.equal(raw.businessWritesAllowed,false);
  assert.equal(raw.status,phase==='preview'?'DIRECTION_AUTHORIZED_EXACT_PREVIEW_READONLY':'DIRECTION_APPROVED_EXACT_PREVIEW');
  assert.ok(Number.isSafeInteger(raw.generation)&&raw.generation>physical.generation&&raw.generation<=physical.generation+100,
    'FINANCIAL_QA_GENERATION_DRIFT');
  assert.equal(attemptHistory.length,raw.generation-physical.generation-1,'FINANCIAL_QA_ATTEMPT_HISTORY_REQUIRED');
  for(let i=0;i<attemptHistory.length;i++){
    const prior=attemptHistory[i];assert.equal(prior.generation,physical.generation+i+1);
    assert.equal(prior.phase,'ROLLED_BACK','FINANCIAL_QA_PREVIOUS_ATTEMPT_NOT_ROLLED_BACK');
    assert.equal(prior.key,require('./gravicentra-i66-frontend-promotion-transaction.cjs').digest(prior.request));
    assert.equal(prior.request.previousReceiptBlob,physical.receiptGitBlobSha);
    for(const k of ['sourceSha','artifactDigest','hostingVersion'])assert.equal(prior.request.previous[k],physical[k]);
    require('./gravicentra-i66-frontend-promotion-transaction.cjs').verifyBytes(prior.request.previous,prior.rollback);
  }
  assert.equal(raw.previousReceiptBlob,physical.receiptGitBlobSha);assert.equal(raw.previousHostingVersion,physical.hostingVersion);
  assert.equal(raw.previousArtifactDigest,physical.artifactDigest);
  const t=raw.target;assert.match(t.sourceSha||'',/^[a-f0-9]{40}$/);assert.notEqual(t.sourceSha,physical.sourceSha);
  assert.match(t.artifactDigest||'',/^sha256:[a-f0-9]{64}$/);assert.notEqual(t.artifactDigest,physical.artifactDigest);
  if(nativeOwner().provider(t))require('./gravicentra-i6-6-cloud-build-preview.cjs').artifactIdentity(t.sourceSha,t.buildRunId,t.artifactId,t.artifactDigest);
  else for(const k of ['artifactId','buildRunId'])assert.ok(Number.isSafeInteger(t[k])&&t[k]>0);
  assert.match(t.buildId||'',/^gi-i66-[a-z0-9-]+$/);
  assert.match(t.previewUrl||'',/^https:\/\/ays-orbit-360-lab--gi-i66-[a-z0-9-]+\.web\.app$/);
  assert.match(t.previewChannel||'',/^gi-i66-[a-z0-9-]+$/);
  assert.deepEqual(Object.keys(raw.ownerPins||{}).sort(),financialQaPaths(releaseScope,financialDeclaredOptionalPaths(raw)),'FINANCIAL_QA_EXACT_OWNER_PINS_REQUIRED');
  const candidate=releaseScope==='COMPOSITE'?validateCompositeFinancialParent(raw,parentAuthority,parentAuthorityBlob,phase):null;
  if(phase==='live'){
    assert.equal(journal?.phase,'VERIFIED','FINANCIAL_QA_LIVE_VERIFIED_JOURNAL_REQUIRED');
    assert.equal(journal.generation,raw.generation);assert.equal(journal.request.scope,releaseScope);
    assert.equal(journal.request.approvalBlob,releaseScope==='COMPOSITE'?parentAuthorityBlob:authorityBlob,'FINANCIAL_QA_JOURNAL_AUTHORITY_DRIFT');
    if(candidate){
      assert.equal(journal.operation,'ACCEPT_EXECUTED_COMPOSITE_LIVE');
      assert.deepEqual(journal.request.candidate,candidate,'FINANCIAL_QA_COMPOSITE_CANDIDATE_DRIFT');
      assert.equal(journal.request.financialQa?.authorityBlob,authorityBlob);
      assert.equal(journal.request.financialQa?.parentAuthorityBlob,parentAuthorityBlob);
      assert.equal(journal.request.financialQa?.scopeId,FINANCIAL_SCOPE);
    }
    assert.deepEqual(financialTarget(journal.request.target),financialTarget(t));
    assert.equal(journal.request.previousReceiptBlob,physical.receiptGitBlobSha);
    assert.equal(journal.key,require('./gravicentra-i66-frontend-promotion-transaction.cjs').digest(journal.request));
    require('./gravicentra-i66-frontend-promotion-transaction.cjs').verifyBytes(journal.request.target,journal.physical);
  }else assert.equal(journal,null,'FINANCIAL_QA_PREVIEW_GENERATION_ALREADY_USED');
  return financialTarget(t);
}
async function resolveFinancialQa(phase,{env=process.env,api:readApi=github,io=fs,gitRead=(...a)=>execFileSync('git',a,{maxBuffer:25*1024*1024}),readMarker,stage='before',expected}={}){
  const cloud=env.GRAVICENTRA_BUILD_PROVIDER==='CLOUD_BUILD';
  assert.ok(!env.GRAVICENTRA_BUILD_PROVIDER||cloud,'FINANCIAL_QA_UNKNOWN_PROVIDER');
  if(!cloud){assert.equal(env.GITHUB_REPOSITORY,repository);assert.equal(env.GITHUB_REF_NAME,branch);}
  const workflowHead=cloud?env.I66_NATIVE_AUTHORITY_HEAD:env.GITHUB_SHA;
  assert.ok(['before','after'].includes(stage));assert.match(workflowHead||'',/^[a-f0-9]{40}$/);
  const executionRun=cloud?env.GRAVICENTRA_CLOUD_BUILD_ID:Number(env.GITHUB_RUN_ID);
  if(cloud)assert.ok(nativeOwner().uuid(executionRun),'FINANCIAL_QA_NATIVE_UUID');else assert.ok(Number.isSafeInteger(executionRun)&&executionRun>0);
  const remoteRef=await readApi('git/ref/heads/'+branch),head=remoteRef.object?.sha;assert.match(head||'',/^[a-f0-9]{40}$/);
  const files=new Map();
  async function file(relative){
    const entry=await readApi('contents/'+relative.split('/').map(encodeURIComponent).join('/')+'?ref='+head);
    assert.equal(entry.path,relative);assert.ok(entry.size>0&&entry.size<=4*1024*1024);
    const data=entry.encoding==='base64'?entry:await readApi('git/blobs/'+entry.sha);assert.equal(data.encoding,'base64');
    const bytes=Buffer.from(data.content,'base64');assert.equal(blob(bytes),entry.sha,'FINANCIAL_QA_REMOTE_BLOB_DRIFT');
    files.set(relative,bytes);return JSON.parse(bytes);
  }
  const [cp,state,tr,raw]=await Promise.all([file(P.cp),file(P.state),file(P.transport),file(P.authority),file(P.ledger)]);
  const current=cp.i66FrontendReleaseHead;assert.ok(current);
  const [currentReceipt]=await Promise.all([file(genName(current.generation,'RECEIPT')),file(releaseJournalPath(current.generation,current.focalHosting)),
    ...(current.scope==='COMPOSITE'?[file(genName(current.generation,'LIVE_PROOF'))]:[])]);
  if(currentReceipt.financialUi)await Promise.all([file(currentReceipt.financialUi.receiptPath),
    file(currentReceipt.financialPreviewUi.receiptPath)]);
  const physical=physicalGuard(cp,state,tr,{readFileSync:p=>{assert.ok(files.has(p));return files.get(p);}});
  assert.ok(Number.isSafeInteger(raw.generation)&&raw.generation>physical.generation&&raw.generation<=physical.generation+100,
    'FINANCIAL_QA_GENERATION_DRIFT');
  const attemptHistory=await Promise.all(Array.from({length:raw.generation-physical.generation-1},(_,i)=>file(genName(physical.generation+i+1,'JOURNAL'))));
  let journal=null;
  if(phase==='live')journal=await file(genName(raw.generation,'JOURNAL'));
  else try{journal=await file(genName(raw.generation,'JOURNAL'));}catch(error){
    if(error?.message!=='GITHUB_PROVIDER_HTTP_404')throw error;
  }
  const releaseScope=raw.releaseScope||'FRONTEND_ONLY',parentAuthorityBlob=releaseScope==='COMPOSITE'?blob(files.get(P.transport)):undefined;
  const authorityBlob=blob(files.get(P.authority)),target=validateFinancialAuthority({raw,authorityBlob,physical,journal,phase,attemptHistory,
    parentAuthority:tr,parentAuthorityBlob});
  const selected=releaseScope==='COMPOSITE'?financialQaOwnerSelection(target.sourceSha,{gitRead}):null;
  const g=require('./gravicentra-i6-6-operational-release-candidate.cjs');
  const nativeCandidate=cloud?g.candidateForPhase(tr,phase):null;
  let runtime;
  if(cloud){
    assert.equal(releaseScope,'COMPOSITE','FINANCIAL_QA_NATIVE_COMPOSITE_REQUIRED');
    runtime=await nativeOwner().verifyRuntimeAuthority(nativeCandidate,{phase,action:'financial-readonly',env});
    nativeOwner().fetchAuthorityHead(head,{gitRead});
    g.verifyPinnedOwners(nativeCandidate,{head,cwd:process.cwd()});
  }
  if(selected){
    const expectedPins=cloud?Object.fromEntries(selected.paths.map(p=>[p,nativeCandidate.providerBinding.mechanism.files[p]?.blob||selected.pins[p]])):selected.pins;
    assert.deepEqual(expectedPins,raw.ownerPins,'FINANCIAL_QA_FROZEN_TREE_OWNER_DRIFT');
    if(!cloud)assertFinancialComposition(target.sourceSha,workflowHead,{gitRead});
  }
  for(const p of selected?.paths||financialQaPaths(releaseScope)){
    const bytes=io.readFileSync(p);assert.equal(blob(bytes),raw.ownerPins[p],'FINANCIAL_QA_EXECUTING_OWNER_DRIFT_'+p);
    const ownerSource=cloud&&nativeCandidate.providerBinding.mechanism.files[p]?nativeCandidate.providerBinding.mechanism.commit:target.sourceSha;
    assert.ok(Buffer.from(bytes).equals(Buffer.from(gitRead('show',ownerSource+':'+p))),'FINANCIAL_QA_BUILD_OWNER_DRIFT_'+p);
  }
  gitRead('merge-base','--is-ancestor',physical.sourceSha,target.sourceSha);
  gitRead('merge-base','--is-ancestor',target.sourceSha,workflowHead);
  if(!cloud){
  const [execution,build,artifact]=await Promise.all([readApi('actions/runs/'+executionRun),readApi('actions/runs/'+target.buildRunId),readApi('actions/artifacts/'+target.artifactId)]);
  assert.deepEqual([execution.id,execution.path,execution.head_sha,execution.head_branch,execution.status],
    [executionRun,phase==='preview'?FINANCIAL_PREVIEW_WORKFLOW:
      releaseScope==='COMPOSITE'?COMPOSITE_FINANCIAL_LIVE_WORKFLOW:FINANCIAL_LIVE_WORKFLOW,workflowHead,branch,'in_progress']);
  assert.deepEqual([build.id,build.path,build.head_sha,build.head_branch,build.status,build.conclusion],
    [target.buildRunId,'.github/workflows/gravicentra-release-delta-66-package.yml',target.sourceSha,branch,'completed','success']);
  assert.deepEqual([artifact.id,artifact.digest,artifact.workflow_run?.id,artifact.workflow_run?.head_sha,artifact.expired],
    [target.artifactId,target.artifactDigest,target.buildRunId,target.sourceSha,false]);
  }
  if(!readMarker)readMarker=async origin=>{
    const r=await fetch(origin+'/__recovery__/build.json',{headers:{'cache-control':'no-cache'},redirect:'error',signal:AbortSignal.timeout(30000)});
    assert.equal(r.status,200);return r.json();
  };
  const hosted=phase==='preview'?[[target.previewUrl,target],['https://app.aysseguros.com',physical],['https://ays-orbit-360-lab.web.app',physical]]:
    [['https://app.aysseguros.com',target],['https://ays-orbit-360-lab.web.app',target]];
  for(const [origin,pin] of hosted){const m=await readMarker(origin);
    assert.deepEqual([m.sourceSha,m.buildId,m.gate,m.product],[pin.sourceSha,pin.buildId,'I6.6','Gravicentra Insurance'],'FINANCIAL_QA_HOSTED_MARKER_DRIFT');}
  const proof={schema:'GI_I66_FRONTEND_FINANCIAL_QA_AUTHORITY_V1',stage,phase,scopeId:FINANCIAL_SCOPE,
    generation:raw.generation,target,authorityBlob,physicalPhaseKey:journal?.key||null,
    runId:executionRun,workflowHeadSha:workflowHead,remoteControlHead:head,readOnly:true,...(cloud?{executionProvider:'CLOUD_BUILD'}:{}),
    ...(releaseScope==='COMPOSITE'?{releaseScope,parentAuthorityBlob}:{})};
  if(expected)for(const key of ['phase','scopeId','generation','target','authorityBlob','physicalPhaseKey','runId','workflowHeadSha','releaseScope','parentAuthorityBlob'])
    assert.deepEqual(proof[key],expected[key],'FINANCIAL_QA_FINAL_AUTHORITY_DRIFT_'+key);
  return proof;
}
async function readFinancialPreviewReport(qa,target,{releaseScope,parentAuthorityBlob}={}){
  if(nativeOwner().provider(target))return nativeOwner().readFinancialPreview(qa,target,{releaseScope,parentAuthorityBlob});
  for(const k of ['qaRunId','qaArtifactId'])assert.ok(Number.isSafeInteger(qa[k])&&qa[k]>0);
  assert.match(qa.qaArtifactDigest||'',/^sha256:[a-f0-9]{64}$/);assert.match(qa.qaReportSha256||'',/^[a-f0-9]{64}$/);
  const [run,artifact,jobs]=await Promise.all([github('actions/runs/'+qa.qaRunId),github('actions/artifacts/'+qa.qaArtifactId),
    github('actions/runs/'+qa.qaRunId+'/jobs?per_page=100')]);
  assert.deepEqual([run.path,run.head_branch,run.status,run.conclusion],
    [FINANCIAL_PREVIEW_WORKFLOW,branch,'completed','success'],'FINANCIAL_PREVIEW_WORKFLOW_NOT_PASSED');
  const job=jobs.jobs.filter(j=>j.name==='exact-preview-chrome-perf');assert.equal(job.length,1);
  assert.equal(job[0].conclusion,'success');
  const step=job[0].steps.filter(s=>s.name==='Measure every authorized module in exact PREVIEW');
  assert.equal(step.length,1);assert.equal(step[0].conclusion,'success','FINANCIAL_PREVIEW_UI_NOT_EXECUTED');
  assert.deepEqual([artifact.digest,artifact.workflow_run?.id,artifact.workflow_run?.head_sha,artifact.expired],
    [qa.qaArtifactDigest,qa.qaRunId,run.head_sha,false]);
  const zip=Buffer.from(await (await github('actions/artifacts/'+qa.qaArtifactId+'/zip',true)).arrayBuffer());
  assert.equal('sha256:'+crypto.createHash('sha256').update(zip).digest('hex'),qa.qaArtifactDigest);
  const tmp=fs.mkdtempSync(path.join(process.env.RUNNER_TEMP||os.tmpdir(),'i66-financial-qa-'));
  try{
    const file=path.join(tmp,'qa.zip');fs.writeFileSync(file,zip,{mode:0o600});
    const members=execFileSync('unzip',['-Z1',file],{encoding:'utf8',maxBuffer:65536}).trim().split('\n');
    const reports=members.filter(m=>m.split('/').at(-1)==='gi-i66-preview-perf-summary.json');assert.equal(reports.length,1);
    assert.ok(reports[0].split('/').every(x=>x&&x!=='.'&&x!=='..')&&!reports[0].startsWith('/'));
    const bytes=execFileSync('unzip',['-p',file,reports[0]],{maxBuffer:8*1024*1024});
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),qa.qaReportSha256);
    const report=JSON.parse(bytes);assert.equal(report.workflowHeadSha,run.head_sha);assert.equal(report.frontendQaBefore?.runId,qa.qaRunId);
    validateFinancialReport(report,target,'preview',{authorityBlob:qa.previewReadOnlyAuthorityBlob,releaseScope,parentAuthorityBlob});
    return report;
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
}
function comparableFinancialRows(rows){return rows.map(row=>{const copy=structuredClone(row);
  if(copy.financialReadProjection)delete copy.financialReadProjection.rawToProjection;
  return copy;}).sort((a,b)=>a.receiptId.localeCompare(b.receiptId));}
function validateFinancialPhasePair(preview,live,target,{previewAuthorityBlob,previewParentAuthorityBlob,authorityBlob,parentAuthorityBlob,physicalPhaseKey}){
  validateFinancialReport(preview,target,'preview',{authorityBlob:previewAuthorityBlob,releaseScope:'COMPOSITE',parentAuthorityBlob:previewParentAuthorityBlob});
  validateFinancialReport(live,target,'live',{authorityBlob,physicalPhaseKey,releaseScope:'COMPOSITE',parentAuthorityBlob});
  assert.deepEqual(comparableFinancialRows(live.matrixServerSnapshotBefore),comparableFinancialRows(preview.matrixServerSnapshotAfter),
    'FINANCIAL_QA_SOURCE_CHANGED_BETWEEN_PREVIEW_AND_LIVE');
}
function compositeFinancialBinding(raw,authorityBlob,parentAuthority,parentAuthorityBlob,candidate){
  assert.deepEqual(validateCompositeFinancialParent(raw,parentAuthority,parentAuthorityBlob,'live'),candidate);
  assert.equal(raw.scopeId,FINANCIAL_SCOPE);assert.equal(raw.gate,'I6.6');
  assert.equal(raw.status,'DIRECTION_APPROVED_EXACT_PREVIEW');assert.equal(raw.approvedByDirection,true);
  assert.equal(raw.readOnlyQa,true);assert.equal(raw.backendDeployAllowed,false);assert.equal(raw.businessWritesAllowed,false);
  assert.deepEqual(Object.keys(raw.ownerPins||{}).sort(),financialQaPaths('COMPOSITE',financialDeclaredOptionalPaths(raw)));
  assert.match(authorityBlob,/^[a-f0-9]{40}$/);assert.ok(Number.isSafeInteger(raw.generation)&&raw.generation>0);
  const q=candidate.financialPreviewQa;
  assert.ok(q&&/^artifacts\/orbit360-recovery\/release-control\/I6_6_FRONTEND_E[0-9]{5}_PREVIEW_UI\.json$/.test(q.receiptPath));
  assert.match(q.receiptBlob||'',/^[a-f0-9]{40}$/);
  assert.equal(raw.previewReceiptPath,q.receiptPath);assert.equal(raw.previewReceiptBlob,q.receiptBlob);
  return {scopeId:FINANCIAL_SCOPE,authorityBlob,parentAuthorityBlob,previewReceiptPath:q.receiptPath,previewReceiptBlob:q.receiptBlob};
}
async function compositeFinancialPreviewAt(head,candidate,raw){
  const pin=candidate.financialPreviewQa,qa=jsonAt(head,pin.receiptPath);
  assert.equal(blobAt(head,pin.receiptPath),pin.receiptBlob,'COMPOSITE_FINANCIAL_PREVIEW_RECEIPT_DRIFT');
  assert.equal(qa.result,'PASS');assert.equal(qa.readOnly,true);assert.equal(qa.releaseScope,'COMPOSITE');
  assert.equal(qa.scopeId,FINANCIAL_SCOPE);assert.equal(qa.fullA04Accepted,false);assert.equal(qa.fullA12Passed,false);
  for(const key of ['qaRunId','qaArtifactId','qaArtifactDigest','qaReportSha256','previewReadOnlyAuthorityBlob'])
    assert.equal(qa[key],pin[key],'COMPOSITE_FINANCIAL_PREVIEW_PIN_DRIFT_'+key);
  for(const key of ['sourceSha','buildId','artifactDigest'])assert.equal(qa[key],candidate[key]);
  assert.match(qa.parentAuthorityBlob||'',/^[a-f0-9]{40}$/);
  const target=financialTarget({...candidate,previewChannel:candidate.previewChannelId});
  assert.deepEqual(target,financialTarget(raw.target));
  const report=await readFinancialPreviewReport(qa,target,{releaseScope:'COMPOSITE',parentAuthorityBlob:qa.parentAuthorityBlob});
  return {qa,report};
}
async function verifyCompositeFinancialPreview(){
  await assertExecution('live','verify-preview');
  const h=remote(),tr=jsonAt(h,P.transport),raw=jsonAt(h,P.authority);
  const candidate=require('./gravicentra-i6-6-operational-release-candidate.cjs').candidateForPhase(tr,'live');
  compositeFinancialBinding(raw,blobAt(h,P.authority),tr,blobAt(h,P.transport),candidate);
  assert.deepEqual(pinSet(h,FINANCIAL_SCOPE,'COMPOSITE'),raw.ownerPins,'COMPOSITE_FINANCIAL_EXECUTING_OWNER_DRIFT');
  if(nativeProvider()){
    require('./gravicentra-i6-6-operational-release-candidate.cjs').verifyPinnedOwners(candidate,{head:h,cwd:process.cwd()});
    const selected=financialQaOwnerSelection(candidate.sourceSha);
    assert.deepEqual(Object.fromEntries(selected.paths.map(p=>[p,candidate.providerBinding.mechanism.files[p]?.blob||selected.pins[p]])),raw.ownerPins,'COMPOSITE_FINANCIAL_BUILT_OWNER_DRIFT');
  }else{
    assert.deepEqual(financialQaOwnerSelection(candidate.sourceSha).pins,raw.ownerPins,'COMPOSITE_FINANCIAL_BUILT_OWNER_DRIFT');
    assertFinancialComposition(candidate.sourceSha,executionHead());
  }
  await compositeFinancialPreviewAt(h,candidate,raw);
  console.log('I66_COMPOSITE_FINANCIAL_PREVIEW_48_VERIFIED_READONLY');
}
async function certifyCompositeFinancialLive({request,journal,validateCurrent,preview}){
  assert.equal(journal.phase,'VERIFIED');assert.equal(request.scope,'COMPOSITE');
  const binding=request.financialQa,uiPath=genName(journal.generation,'LIVE_UI');
  const check=ui=>{
    assert.equal(ui.schema,'GI_I66_FRONTEND_FINANCIAL_READONLY_UI_RECEIPT_V1');
    assert.equal(ui.generation,journal.generation);assert.equal(ui.releaseScope,'COMPOSITE');
    assert.equal(ui.scopeId,FINANCIAL_SCOPE);assert.equal(ui.physicalPhaseKey,journal.key);
    assert.equal(ui.result,'PASS');assert.equal(ui.readOnly,true);assert.equal(ui.fullA04Accepted,false);assert.equal(ui.fullA12Passed,false);
    assert.equal(ui.authorityBlob,binding.authorityBlob);assert.equal(ui.parentAuthorityBlob,binding.parentAuthorityBlob);
    for(const key of ['sourceSha','buildId','artifactDigest'])assert.equal(ui[key],request.target[key]);
    assert.equal(ui.financialQa.frontendQaBefore.runId,runId);
    assert.equal(crypto.createHash('sha256').update(serial(ui.financialQa)).digest('hex'),ui.reportSha256);
    validateFinancialPhasePair(preview.report,ui.financialQa,request.target,{previewAuthorityBlob:preview.qa.previewReadOnlyAuthorityBlob,
      previewParentAuthorityBlob:preview.qa.parentAuthorityBlob,authorityBlob:binding.authorityBlob,parentAuthorityBlob:binding.parentAuthorityBlob,
      physicalPhaseKey:journal.key});
    return {result:'PASS',scopeId:FINANCIAL_SCOPE,generation:journal.generation,buildId:request.target.buildId,
      ...(request.target.executionProvider===undefined?{}:{executionProvider:request.target.executionProvider}),
      sourceSha:request.target.sourceSha,artifactDigest:request.target.artifactDigest,authorityBlob:binding.authorityBlob,
      parentAuthorityBlob:binding.parentAuthorityBlob,physicalPhaseKey:journal.key,receiptPath:uiPath,receiptBlob:blob(serial(ui)),
      reportSha256:ui.reportSha256,runId,financialQa:ui.financialQa};
  };
  const before=remote();validateCurrent(before);assert.deepEqual(optional(before,genName(journal.generation,'JOURNAL')),journal);
  const prior=optional(before,uiPath);
  if(prior){const result=check(prior);await signed(git('log','-1','--format=%H',before,'--',uiPath));return result;}
  const output=path.join(process.env.RUNNER_TEMP,'gi-i66-composite-live-financial-'+runId+'.json');
  await runReleaseChild(process.execPath,[FINANCIAL_DRIVER],{stdio:'inherit',timeout:18*60*1000,
    env:{...process.env,GI_I66_PERF_PROJECT:'ays-orbit-360-lab',GI_I66_PERF_TENANT:'alianzas-soluciones',
      GI_I66_PERF_PHASE:'live',GI_I66_READONLY_MODE:'six-frontend-release',GI_I66_PERF_REPORT:output}});
  const reportBytes=fs.readFileSync(output),report=JSON.parse(reportBytes);
  const ui={schema:'GI_I66_FRONTEND_FINANCIAL_READONLY_UI_RECEIPT_V1',generation:journal.generation,scopeId:FINANCIAL_SCOPE,
    ...(request.target.executionProvider===undefined?{}:{executionProvider:request.target.executionProvider}),
    releaseScope:'COMPOSITE',authorityBlob:binding.authorityBlob,parentAuthorityBlob:binding.parentAuthorityBlob,
    sourceSha:request.target.sourceSha,artifactDigest:request.target.artifactDigest,buildId:request.target.buildId,
    physicalPhaseKey:journal.key,result:'PASS',readOnly:true,fullA04Accepted:false,fullA12Passed:false,
    reportSha256:crypto.createHash('sha256').update(reportBytes).digest('hex'),financialQa:report};
  const result=check(ui),fresh=remote();validateCurrent(fresh);
  assert.deepEqual(optional(fresh,genName(journal.generation,'JOURNAL')),journal,'COMPOSITE_OWNER_LOST_AFTER_FINANCIAL_QA');
  await casCommit(fresh,'release(i66): signed composed financial read-only UI for '+journal.generation,{[uiPath]:ui});
  const final=remote();validateCurrent(final);assert.equal(blobAt(final,uiPath),result.receiptBlob);
  return result;
}
function nextCompositeGeneration(sequence,readJournal){
  assert.ok(Number.isSafeInteger(sequence)&&sequence>0);
  for(let n=sequence+1;n<=sequence+100;n++){
    const j=readJournal(n);if(!j||j.phase==='VERIFIED')return n;
    assert.equal(j.phase,'ROLLED_BACK','COMPOSITE_PREVIOUS_ATTEMPT_NOT_TERMINAL');
  }
  throw Error('COMPOSITE_GENERATION_HISTORY_BOUND');
}
function assertCompositeRollbackAllowed(attempt,journal,context){
  // The caller must obtain these values from a successful fresh remote read.
  // `null` means proven absence; an unavailable/indeterminate read must throw.
  assert.notEqual(journal,undefined,'COMPOSITE_ROLLBACK_JOURNAL_READ_INDETERMINATE');
  const {runId:expectedRunId,sourceSha,previous,transport}=context;
  nativeOwner().executionId(context,expectedRunId,'ROLLBACK_RUN');
  assert.match(sourceSha,/^[0-9a-f]{40}$/);
  if(attempt){
    assert.ok(Number.isSafeInteger(attempt.generation)&&attempt.generation>0);
    assert.match(attempt.key,/^[0-9a-f]{64}$/);
    assert.equal(attempt.runId,expectedRunId,'COMPOSITE_ROLLBACK_ATTEMPT_RUN_DRIFT');
    assert.equal(attempt.sourceSha,sourceSha,'COMPOSITE_ROLLBACK_ATTEMPT_SOURCE_DRIFT');
    if(journal){
      assert.equal(journal.key,attempt.key,'COMPOSITE_ROLLBACK_ATTEMPT_KEY_DRIFT');
      assert.equal(journal.generation,attempt.generation,'COMPOSITE_ROLLBACK_GENERATION_DRIFT');
      assert.equal(journal.operation,'ACCEPT_EXECUTED_COMPOSITE_LIVE');
      assert.equal(journal.request.scope,'COMPOSITE');
      assert.equal(journal.liveProof.runId,expectedRunId);assert.equal(journal.liveProof.sourceSha,sourceSha);
      assert.notEqual(journal.phase,'COMMITTED','COMPOSITE_ROLLBACK_BLOCKED_COMMITTED');
      assert.equal(journal.phase,'VERIFIED','COMPOSITE_ROLLBACK_PHASE_NOT_COMPENSABLE');
    }
  }else assert.equal(journal,null,'COMPOSITE_ROLLBACK_ATTEMPT_MISSING');
  assert.ok(previous?.sourceSha&&previous.buildId&&previous.hostingVersion,'COMPOSITE_ROLLBACK_PREDECESSOR_MISSING');
  const physical=transport.currentPhysicalHostingRelease;
  assert.equal(physical.sourceSha,previous.sourceSha,'COMPOSITE_ROLLBACK_CONTROL_ALREADY_ADVANCED');
  assert.equal(physical.buildId,previous.buildId,'COMPOSITE_ROLLBACK_PREDECESSOR_BUILD_DRIFT');
  assert.equal(physical.liveHostingVersion,previous.hostingVersion,'COMPOSITE_ROLLBACK_PREDECESSOR_VERSION_DRIFT');
}
async function authorizeCompositeRollback(){
  await assertExecution('live','rollback');
  const file=path.join(process.env.RUNNER_TEMP,'gi-i66-composite-acceptance-attempt.json');
  const attempt=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):null,h=remote();
  let journal=null;
  if(attempt){
    const jp=genName(attempt.generation,'JOURNAL'),listed=git('ls-tree','--name-only',h,'--',jp);
    assert.ok(listed===''||listed===jp,'COMPOSITE_ROLLBACK_JOURNAL_LOOKUP_INVALID');
    if(listed)journal=jsonAt(h,jp);
  }
  assertCompositeRollbackAllowed(attempt,journal,{runId,...(nativeProvider()?{executionProvider:'CLOUD_BUILD'}:{}),sourceSha:process.env.I66_ROLE_SOURCE_SHA,
    previous:{sourceSha:process.env.I66_PREVIOUS_SOURCE_SHA,buildId:process.env.I66_PREVIOUS_BUILD_ID,
      hostingVersion:process.env.I66_PREVIOUS_HOSTING_VERSION},transport:jsonAt(h,P.transport)});
  console.log('I66_COMPOSITE_PHYSICAL_ROLLBACK_AUTHORIZED_BEFORE_COMMIT');
}
async function verifyProspectiveChanges(h,changes){
  const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'gi-i66-guard-')),wt=path.join(scratch,'tree');
  try{
    git('worktree','add','--quiet','--detach',wt,h);
    for(const [file,obj] of Object.entries(changes))fs.writeFileSync(path.join(wt,file),serial(obj));
    git('-C',wt,'add','--',...Object.keys(changes));
    git('-C',wt,'-c','user.name=Gravicentra release preflight','-c','user.email=release@localhost',
      '-c','commit.gpgSign=false','commit','--quiet','-m','Verify prospective control transaction');
    const tree=git('-C',wt,'rev-parse','HEAD^{tree}');
    for(const [file,obj] of Object.entries(changes))assert.equal(git('-C',wt,'rev-parse',tree+':'+file),blob(serial(obj)),'PROSPECTIVE_TREE_DRIFT');
    await runReleaseChild(process.execPath,[P.guard],{cwd:wt,stdio:'inherit',timeout:420000});
  }finally{if(fs.existsSync(wt))git('worktree','remove','--force',wt);fs.rmSync(scratch,{recursive:true,force:true});}
}
async function run(){
  assert.equal(process.env.GITHUB_REPOSITORY,repository);assert.equal(process.env.GITHUB_REF_NAME,branch);
  assert.ok(Number.isSafeInteger(runId)&&runId>0);
  const {GoogleAuth}=require('google-auth-library');
  const auth=await new GoogleAuth({scopes:['https://www.googleapis.com/auth/firebase.hosting']}).getClient();
  const provider=hosting(auth,github),boot=remote(),raw=jsonAt(boot,P.authority),approvalBlob=blobAt(boot,P.authority);
  assert.ok(!raw.releaseScope||raw.releaseScope==='FRONTEND_ONLY','COMPOSITE_FINANCIAL_AUTHORITY_CANNOT_PROMOTE_FRONTEND_ONLY');
  assert.ok(raw.status==='DIRECTION_APPROVED_EXACT_PREVIEW'&&raw.approvedByDirection===true&&raw.gate==='I6.6');
  assert.ok(Number.isSafeInteger(raw.generation)&&raw.generation>0);
  const jp=genName(raw.generation,'JOURNAL'),rp=genName(raw.generation,'RECEIPT'),uiPath=genName(raw.generation,'LIVE_UI');
  const approvedScope=raw.scopeId;assert.match(approvedScope,/^[A-Z0-9_-]+$/);
  const currentRaw=jsonAt(boot,P.transport).currentPhysicalHostingRelease,existing=optional(boot,jp);
  const targetBase=raw.target;
  const digestPaths=head=>{
    assert.equal(blobAt(head,P.authority),approvalBlob,'RELEASE_AUTHORITY_REPLACED');
    assert.deepEqual(pinSet(head,approvedScope),raw.ownerPins,'RELEASE_OWNER_DRIFT');
    assert.equal(blobAt(head,P.manifest),blobAt(targetBase.sourceSha,P.manifest),'RELEASE_COMPOSITION_MANIFEST_DRIFT');
    assert.equal(blobAt(head,P.composition),blobAt(targetBase.sourceSha,P.composition),'RELEASE_COMPOSITION_LOCK_DRIFT');
    git('diff','--quiet',targetBase.sourceSha,head,'--','orbit360-platform','functions','firebase.json','firestore.rules','storage.rules',
      ':(exclude)orbit360-platform/docs/recovery/orbit360-recovery-state-v1.json');
  };
  // Resume an interrupted release using its frozen version and previous backup,
  // even when the physical LIVE channel already points to the target.
  async function makeBinding(base,prior){
    const v={...releaseProviderIdentity(base),sourceSha:base.sourceSha,sourceTree:git('rev-parse',base.sourceSha+'^{tree}'),manifestBlob:blobAt(base.sourceSha,P.manifest),
      compositionBlob:blobAt(base.sourceSha,P.composition),artifactId:base.artifactId,artifactDigest:base.artifactDigest,buildId:base.buildId,
      buildRunId:base.buildRunId||base.previewRunId,previewUrl:base.previewUrl||'',previewChannel:base.previewChannel||'',previewUiRunId:base.previewUiRunId||null,
      hostingVersion:prior?base.liveHostingVersion:await provider.current(base.previewChannel)};
    const pkg=await provider.packageData(v);v.files=pkg.rows.length;return v;
  }
  const request=existing?.request||{schema:'GI_I66_FRONTEND_PROMOTION_V1',gate:'I6.6',scope:'FRONTEND_ONLY',scopeId:approvedScope,generation:raw.generation,approvalBlob,
    guardBlob:raw.ownerPins[P.guard],previousReceiptBlob:raw.previousReceiptBlob,
    previous:await makeBinding(currentRaw,true),target:await makeBinding(targetBase,false)};
  assert.equal(request.approvalBlob,approvalBlob);
  assert.equal(request.previous.hostingVersion,raw.previousHostingVersion);
  assert.equal(request.previous.artifactDigest,raw.previousArtifactDigest);
  async function writePhase(old,next,extra={}){
    for(let attempt=0;attempt<3;attempt++){
      const h=remote(),stored=optional(h,jp);
      if(stored&&JSON.stringify(stored)===JSON.stringify(next))return stored;
      assert.deepEqual(stored,old,'RELEASE_PHASE_CAS');
      if(!['INCIDENT','ROLLED_BACK'].includes(next.phase))digestPaths(h);
      try{await casCommit(h,'release(i66): '+next.phase+' frontend generation '+raw.generation,{[jp]:next,...extra});return next;}
      catch(e){if(attempt===2||!String(e.message).includes('HEAD_CAS_FAILED'))throw e;}
    }
  }
  const ctl=h=>jsonAt(h,P.transport);
  const validateCurrent=h=>{
    digestPaths(h);const transport=ctl(h),p=transport.currentPhysicalHostingRelease;
    assert.equal(p.liveHostingVersion,request.previous.hostingVersion);assert.equal(p.artifactDigest,request.previous.artifactDigest);
    assert.equal(p.buildId,request.previous.buildId);assert.equal(p.artifactId,request.previous.artifactId);assert.equal(p.sourceSha,request.previous.sourceSha);
    const cp=jsonAt(h,P.cp),pointer=cp[cp.currentExecutionDecisionPointer];
    assert.equal(pointer.sourceSha,p.sourceSha);assert.equal(pointer.receiptGitBlobSha,request.previousReceiptBlob);
    assert.equal(blobAt(h,p.receipt),request.previousReceiptBlob);
  };
  const io={
    readJournal:async()=>optional(remote(),jp),
    readControl:async()=>{
      const h=remote();validateCurrent(h);const tr=ctl(h);
      const previousAttempt=raw.generation>1?optional(h,genName(raw.generation-1,'JOURNAL')):null;
      if(raw.generation>1)assert.ok(previousAttempt&&['COMMITTED','ROLLED_BACK'].includes(previousAttempt.phase),'PREVIOUS_RELEASE_NOT_TERMINAL');
      return {generation:Math.max(tr.frontendReleaseSequence||0,previousAttempt?.generation||0),physical:request.previous,receiptBlob:request.previousReceiptBlob,
        guardBlob:blobAt(h,P.guard),consumed:tr.consumedFrontendAuthorities||[]};
    },
    validateProofs:async()=>{
      const h=remote();validateCurrent(h);
      const qa=jsonAt(h,raw.previewReceiptPath);assert.equal(blobAt(h,raw.previewReceiptPath),raw.previewReceiptBlob);
      const proofs=[[targetBase.buildRunId,'gravicentra-release-delta-66-package.yml','immutable-package'],[raw.guardRun,'gravicentra-release-lock-sync.yml',null]];
      for(const [id,workflow,jobName] of proofs){
        const run=await github('actions/runs/'+id);assert.equal(run.path,'.github/workflows/'+workflow);
        assert.equal(run.status,'completed');assert.equal(run.conclusion,'success');assert.equal(run.head_sha,id===targetBase.buildRunId?targetBase.sourceSha:raw.guardHead);
        const jobs=await github('actions/runs/'+id+'/jobs?per_page=100');
        assert.ok(jobs.jobs.some(j=>(!jobName||j.name===jobName)&&j.conclusion==='success'&&j.steps.some(s=>s.number>2&&s.conclusion==='success')));
      }
      assert.deepEqual([qa.scopeId,qa.sourceSha,qa.buildId,qa.artifactDigest,qa.result],
        [approvedScope,targetBase.sourceSha,targetBase.buildId,targetBase.artifactDigest,'PASS']);
      if(approvedScope===FINANCIAL_SCOPE){
        assert.equal(raw.readOnlyQa,true);assert.equal(raw.backendDeployAllowed,false);assert.equal(raw.businessWritesAllowed,false);
        assert.equal(qa.readOnly,true);assert.equal(qa.fullA04Accepted,false);assert.equal(qa.fullA12Passed,false);
        await readFinancialPreviewReport(qa,targetBase);
      }else{
        for(const k of ['authenticated','buttonClicked','serverReadback','reload','linkedDestination','roleScope','noDuplicate','desktop','mobile390'])
          assert.equal(qa[k],true,'PREVIEW_FUNCTIONAL_PROOF_MISSING_'+k);
        assert.equal(qa.visualDecision,'APPROVED_BY_DIRECTION');
      }
      const branchGuardSig=pinSet(raw.guardHead,approvedScope);assert.deepEqual(branchGuardSig,raw.ownerPins,'STALE_GUARD_RUN');
    },
    verifyLive:provider.live,verifyPreview:provider.preview,currentVersion:()=>provider.current('live'),clone:provider.clone,cas:writePhase,
    assertOwnership:async j=>{const h=remote();validateCurrent(h);assert.deepEqual(optional(h,jp),j,'RELEASE_OWNER_LOST');},
    assertCompensationOwnership:async j=>{const h=remote();assert.deepEqual(optional(h,jp),j);const tr=ctl(h);assert.equal(tr.currentPhysicalHostingRelease.liveHostingVersion,request.previous.hostingVersion);},
    liveUiProof:async j=>{
      if(approvedScope===FINANCIAL_SCOPE){
        const h=remote();validateCurrent(h);assert.deepEqual(optional(h,jp),j,'RELEASE_OWNER_LOST');
        const prior=optional(h,uiPath);
        if(prior){
          assert.equal(prior.generation,j.generation);assert.equal(prior.physicalPhaseKey,j.key);assert.equal(prior.scopeId,approvedScope);
          validateFinancialReport(prior.financialQa,request.target,'live',{authorityBlob:approvalBlob,physicalPhaseKey:j.key});
          await signed(git('log','-1','--format=%H',h,'--',uiPath));
          return {result:'PASS',buildId:request.target.buildId,receiptBlob:blobAt(h,uiPath)};
        }
        const output=path.join(process.env.RUNNER_TEMP,'gi-i66-frontend-live-financial-'+runId+'.json');
        await runReleaseChild(process.execPath,[FINANCIAL_DRIVER],{stdio:'inherit',timeout:18*60*1000,
          env:{...process.env,GI_I66_PERF_PROJECT:'ays-orbit-360-lab',GI_I66_PERF_TENANT:'alianzas-soluciones',
            GI_I66_PERF_PHASE:'live',GI_I66_READONLY_MODE:'six-frontend-release',GI_I66_PERF_REPORT:output}});
        const report=JSON.parse(fs.readFileSync(output,'utf8'));
        validateFinancialReport(report,request.target,'live',{authorityBlob:approvalBlob,physicalPhaseKey:j.key});
        const fresh=remote();validateCurrent(fresh);assert.deepEqual(optional(fresh,jp),j,'RELEASE_OWNER_LOST_AFTER_FINANCIAL_QA');
        const ui={schema:'GI_I66_FRONTEND_FINANCIAL_READONLY_UI_RECEIPT_V1',generation:j.generation,scopeId:approvedScope,
          sourceSha:request.target.sourceSha,artifactDigest:request.target.artifactDigest,buildId:request.target.buildId,
          physicalPhaseKey:j.key,result:'PASS',readOnly:true,fullA04Accepted:false,fullA12Passed:false,
          reportSha256:crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex'),financialQa:report};
        await casCommit(fresh,'release(i66): signed exact financial read-only UI for '+j.generation,{[uiPath]:ui});
        return {result:'PASS',buildId:request.target.buildId,receiptBlob:blob(serial(ui))};
      }
      console.log('I66_PHYSICAL_VERIFIED_AWAITING_LIVE_UI '+request.target.buildId+' '+uiPath);
      for(let i=0;i<36;i++){
        const h=remote(),u=optional(h,uiPath);
        if(u){assert.equal(u.generation,j.generation);assert.equal(u.scopeId,approvedScope);assert.equal(u.artifactDigest,request.target.artifactDigest);
          assert.equal(u.sourceSha,request.target.sourceSha);assert.equal(u.physicalPhaseKey,j.key);
          for(const k of ['authenticated','buttonClicked','serverReadback','reload','linkedDestination','roleScope','noDuplicate'])assert.equal(u[k],true,'LIVE_UI_PROOF_MISSING_'+k);
          return {result:u.result,buildId:u.buildId,receiptBlob:blobAt(h,uiPath)};
        }
        await sleep(10000);
      }
      throw Error('RELEASE_LIVE_UI_RECEIPT_TIMEOUT');
    },
    signedReceipt:async(j,ui)=>{
      const proposed={schema:'GI_I66_SIGNED_FRONTEND_RECEIPT_V1',generation:j.generation,target:j.request.target,previous:j.request.previous,
        authorization:approvalBlob,scopeId:approvedScope,preview:j.preview,physical:j.physical,ui,runId};
      const head=remote(),stored=optional(head,rp);
      let commit;
      if(stored){assert.deepEqual({...stored,runId},proposed);commit=git('log','-1','--format=%H',head,'--',rp);}
      else{assert.deepEqual(optional(head,jp),j);commit=await casCommit(head,'release(i66): sign exact physical and UI receipt for '+raw.generation,{[rp]:proposed});}
      await signed(commit);const h=remote();assert.equal(blobAt(h,rp),blob(serial(stored||proposed)));
      return {blob:blobAt(h,rp),commit,verified:true,runId:stored?.runId||runId};
    },
    commitAll:async(j,next)=>{
      const h=remote();validateCurrent(h);assert.deepEqual(optional(h,jp),j);
      const changes=closeFiles(p=>jsonAt(h,p),j,next);
      const read={readFileSync:p=>Object.hasOwn(changes,p)?serial(changes[p]):git('show',h+':'+p)+'\n'};
      physicalGuard(changes[P.cp],changes[P.state],changes[P.transport],read);
      await verifyProspectiveChanges(h,changes);
      assert.equal(await provider.current('live'),request.target.hostingVersion,'PHYSICAL_DRIFT_DURING_METADATA_GUARD');
      await casCommit(h,'release(i66): COMMITTED exact frontend, transport, status ledger, rollback and cursor',changes);return next;
    },
    verifyCommitted:async j=>{
      const h=remote(),read={readFileSync:p=>git('show',h+':'+p)+'\n'};
      physicalGuard(jsonAt(h,P.cp),jsonAt(h,P.state),jsonAt(h,P.transport),read);
      await signed(j.receipt.commit);assert.equal(await provider.current('live'),request.target.hostingVersion);
    },
    incident:writePhase
  };
  const result=await promote(io,request);await io.verifyCommitted(result);
  console.log('I66_FRONTEND_FINAL_PHASE='+result.phase+' GENERATION='+raw.generation);
}
async function runCompositeAcceptance(){
  await assertExecution('live','accept-live');
  const g=require('./gravicentra-i6-6-operational-release-candidate.cjs');
  const proof=JSON.parse(fs.readFileSync(path.join(process.env.RUNNER_TEMP,'i66-role-live-exact-proof.json'),'utf8'));
  assert.equal(proof.runId,runId,'COMPOSITE_CURRENT_RUN_PROOF_REQUIRED');
  assert.equal(proof.headSha,executionHead(),'COMPOSITE_CURRENT_RUN_HEAD_REQUIRED');
  const {GoogleAuth}=require('google-auth-library');
  const auth=await new GoogleAuth({scopes:['https://www.googleapis.com/auth/firebase.hosting']}).getClient();
  const provider=hosting(auth,github),boot=remote(),initial=jsonAt(boot,P.transport),cp=jsonAt(boot,P.cp);
  const already=initial.currentPhysicalHostingRelease.sourceSha===proof.sourceSha&&cp.i66FrontendReleaseHead?.scope==='COMPOSITE';
  const generation=already?cp.i66FrontendReleaseHead.generation:
    nextCompositeGeneration(initial.frontendReleaseSequence,n=>optional(boot,genName(n,'JOURNAL')));
  const jp=genName(generation,'JOURNAL'),rp=genName(generation,'RECEIPT'),proofPath=genName(generation,'LIVE_PROOF');
  const existing=optional(boot,jp);
  const candidate=already?existing?.request?.candidate:g.candidateForPhase(initial,'live');
  g.validateLiveProof(candidate,proof);
  const needsFinancial=candidate.makeIngressComposite===true;
  const approvalBlob=existing?.request?.approvalBlob||blobAt(boot,P.transport);
  const financialAuthority=needsFinancial&&!already?jsonAt(boot,P.authority):null;
  const financialBinding=needsFinancial?(already?existing.request.financialQa:
    compositeFinancialBinding(financialAuthority,blobAt(boot,P.authority),initial,approvalBlob,candidate)):null;
  if(financialAuthority)assert.equal(financialAuthority.generation,generation,'COMPOSITE_FINANCIAL_GENERATION_DRIFT');
  const ownerPins=pinSet(boot,needsFinancial?FINANCIAL_SCOPE:undefined,needsFinancial?'COMPOSITE':undefined);
  if(financialAuthority)assert.deepEqual(ownerPins,financialAuthority.ownerPins,'COMPOSITE_FINANCIAL_OWNER_PIN_DRIFT');
  const previous=cp.i66FrontendReleaseHead;
  const request=existing?.request||{schema:'GI_I66_FRONTEND_PROMOTION_V1',gate:'I6.6',scope:'COMPOSITE',generation,
    approvalBlob,guardBlob:blobAt(boot,P.guard),previousReceiptBlob:previous.receiptGitBlobSha,candidate,
    ...(needsFinancial?{financialQa:financialBinding}:{}),
    previous:{...releaseProviderIdentity(previous),sourceSha:previous.sourceSha,sourceTree:previous.sourceTree,manifestBlob:previous.manifestBlob,
      compositionBlob:previous.compositionBlob,artifactId:previous.artifactId,artifactDigest:previous.artifactDigest,
      buildId:previous.buildId,buildRunId:previous.buildRunId,previewUrl:previous.previewUrl,
      hostingVersion:previous.hostingVersion,files:previous.hostedFilesEachOrigin},
    target:{sourceSha:candidate.sourceSha,sourceTree:git('rev-parse',candidate.sourceSha+'^{tree}'),
      ...(candidate.executionProvider===undefined?{}:{executionProvider:candidate.executionProvider}),
      manifestBlob:blobAt(candidate.sourceSha,P.manifest),compositionBlob:blobAt(candidate.sourceSha,P.composition),
      artifactId:candidate.artifactId,artifactDigest:candidate.artifactDigest,buildId:candidate.buildId,
      buildRunId:candidate.buildRunId,previewUrl:candidate.previewUrl,previewChannel:candidate.previewChannelId,
      hostingVersion:proof.liveHostingVersion,files:candidate.expectedSiteFileCount}};
  if(needsFinancial)assert.deepEqual(request.financialQa,financialBinding);
  let financialPreview;
  function validateCurrent(h){
    assert.equal(blobAt(h,P.transport),approvalBlob,'COMPOSITE_LIVE_AUTHORITY_REPLACED');
    assert.deepEqual(pinSet(h,needsFinancial?FINANCIAL_SCOPE:undefined,needsFinancial?'COMPOSITE':undefined),ownerPins,'RELEASE_OWNER_DRIFT');
    if(needsFinancial){
      assert.equal(blobAt(h,P.authority),financialBinding.authorityBlob,'COMPOSITE_FINANCIAL_AUTHORITY_REPLACED');
      assert.deepEqual(compositeFinancialBinding(jsonAt(h,P.authority),blobAt(h,P.authority),jsonAt(h,P.transport),approvalBlob,candidate),financialBinding);
    }
    if(nativeProvider())g.verifyPinnedOwners(candidate,{head:h,cwd:process.cwd()});
    else assert.equal(git('diff','--name-only',candidate.sourceSha,h,'--',...g.PINNED_OWNER_PATHS),'','COMPOSITE_SOURCE_OR_QA_OWNER_DRIFT');
    const tr=jsonAt(h,P.transport),control=jsonAt(h,P.cp),head=control.i66FrontendReleaseHead;
    assert.deepEqual(g.candidateForPhase(tr,'live'),candidate,'COMPOSITE_LIVE_AUTHORIZATION_DRIFT');
    assert.equal(head.generation,initial.frontendReleaseSequence,'RELEASE_GENERATION_CAS');
    assert.equal(head.receiptGitBlobSha,request.previousReceiptBlob,'RELEASE_PREDECESSOR_RECEIPT_DRIFT');
    assert.equal(blobAt(h,head.receiptPath),request.previousReceiptBlob);
    assert.equal(tr.currentPhysicalHostingRelease.liveHostingVersion,request.previous.hostingVersion);
    return tr;
  }
  function verifyBackend(){
    for(const row of proof.backendRevisions){
      const f=JSON.parse(execFileSync('gcloud',['functions','describe',row.name,'--gen2','--region',row.region,
        '--project',g.SITE,'--format=json'],{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:60000}));
      const s=JSON.parse(execFileSync('gcloud',['run','services','describe',row.service,'--region',row.region,
        '--project',g.SITE,'--format=json'],{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:60000}));
      const active=(s.status?.traffic||s.traffic||[]).filter(x=>Number(x.percent)>0);
      assert.equal(f.serviceConfig?.revision,row.currentRevision,'COMPOSITE_EFFECTIVE_FUNCTION_REVISION_DRIFT');
      assert.equal(String(f.serviceConfig?.service||'').split('/').at(-1),row.service,'COMPOSITE_BACKEND_SERVICE_DRIFT');
      assert.ok(['ACTIVE','READY'].includes(String(f.state||'').toUpperCase()),'COMPOSITE_BACKEND_NOT_READY');
      assert.equal(active.length,1);assert.equal(Number(active[0].percent),100);
      assert.equal(String(active[0].revisionName||active[0].revision),row.currentRevision,'COMPOSITE_EFFECTIVE_TRAFFIC_DRIFT');
      if(candidate.makeIngressComposite===true&&row.name==='orbit360MakeLeadIngress'){
        const actual=require('./gravicentra-i66-make-lead-protected-executor.cjs').fnProjection(f,candidate,'live');
        assert.equal(actual.configurationDigest,proof.makeIngress.closedTrigger.configurationDigest,'COMPOSITE_AUTH_CONTEXT_TRIGGER_DRIFT');
        assert.equal(actual.revision,proof.makeIngress.closedTrigger.revision,'COMPOSITE_AUTH_CONTEXT_REVISION_DRIFT');
      }
    }
  }
  async function verifyCommitted(j){
    const h=remote(),read={readFileSync:p=>git('show',h+':'+p)+'\n'};
    assert.equal(j.phase,'COMMITTED');assert.deepEqual(j.liveProof,proof);
    physicalGuard(jsonAt(h,P.cp),jsonAt(h,P.state),jsonAt(h,P.transport),read);
    await signed(j.receipt.commit);assert.equal(await provider.current('live'),request.target.hostingVersion);
    verifyBackend();
  }
  fs.writeFileSync(path.join(process.env.RUNNER_TEMP,'gi-i66-composite-acceptance-attempt.json'),serial({generation,
    key:require('./gravicentra-i66-frontend-promotion-transaction.cjs').digest(request),runId,sourceSha:candidate.sourceSha}));
  if(already){assert.ok(existing,'COMPOSITE_COMMITTED_JOURNAL_MISSING');await verifyCommitted(existing);return;}
  const io={
    readJournal:async()=>optional(remote(),jp),
    readControl:async()=>{const h=remote(),tr=validateCurrent(h);
      assert.equal(nextCompositeGeneration(tr.frontendReleaseSequence,n=>optional(h,genName(n,'JOURNAL'))),generation,'COMPOSITE_GENERATION_CAS');
      return {generation:generation-1,
      physical:request.previous,receiptBlob:request.previousReceiptBlob,guardBlob:blobAt(h,P.guard),
      consumed:tr.consumedFrontendAuthorities||[],authorization:tr};},
    validateProofs:async()=>{
      const head=remote();validateCurrent(head);
      if(needsFinancial)financialPreview=await compositeFinancialPreviewAt(head,candidate,jsonAt(head,P.authority));
      if(nativeProvider()){await nativeOwner().admitRuntime(candidate,'live');}
      else{
      const [build,artifact,qa,qaArtifact,current]=await Promise.all([
        github('actions/runs/'+candidate.buildRunId),github('actions/artifacts/'+candidate.artifactId),
        github('actions/runs/'+candidate.previewQa.runId),github('actions/artifacts/'+candidate.previewQa.receiptArtifactId),
        github('actions/runs/'+runId)]);
      g.validateArtifact(candidate,build,artifact);g.validatePreviewQa(candidate,qa,qaArtifact);
      assert.equal(current.head_sha,proof.headSha);assert.equal(current.head_branch,branch);
      assert.equal(current.path,'.github/workflows/gravicentra-i66-privileged-role-exact-live-promotion.yml');
      assert.ok(current.status==='in_progress'||(current.status==='completed'&&current.conclusion==='success'),'COMPOSITE_LIVE_RUN_NOT_EXECUTING');
      }
      verifyBackend();
    },
    verifyLive:provider.live,verifyPreview:provider.preview,currentVersion:()=>provider.current('live'),
    cas:async(old,next)=>{for(let attempt=0;attempt<3;attempt++){
      const h=remote();validateCurrent(h);const stored=optional(h,jp);
      if(stored&&JSON.stringify(stored)===JSON.stringify(next))return stored;
      assert.deepEqual(stored,old,'RELEASE_PHASE_CAS');
      try{await casCommit(h,'release(i66): VERIFIED executed composite generation '+generation,{[jp]:next});return next;}
      catch(e){if(attempt===2||!String(e.message).includes('HEAD_CAS_FAILED'))throw e;}
    }},
    assertOwnership:async j=>{const h=remote();validateCurrent(h);assert.deepEqual(optional(h,jp),j,'RELEASE_OWNER_LOST');},
    financialLiveUiProof:async j=>{assert.equal(needsFinancial,true);assert.ok(financialPreview);
      return certifyCompositeFinancialLive({request,journal:j,validateCurrent,preview:financialPreview});},
    signedReceipt:async j=>{
      const proposed=compositeReceipt(j,runId),h=remote();validateCurrent(h);
      if(needsFinancial){
        assert.equal(blobAt(h,j.financialUi.receiptPath),j.financialUi.receiptBlob,'COMPOSITE_FINANCIAL_UI_RECEIPT_DRIFT');
        const ui=jsonAt(h,j.financialUi.receiptPath);
        validateFinancialPhasePair(financialPreview.report,ui.financialQa,request.target,
          {previewAuthorityBlob:financialPreview.qa.previewReadOnlyAuthorityBlob,previewParentAuthorityBlob:financialPreview.qa.parentAuthorityBlob,
            authorityBlob:financialBinding.authorityBlob,parentAuthorityBlob:approvalBlob,physicalPhaseKey:j.key});
        assert.equal(crypto.createHash('sha256').update(serial(ui.financialQa)).digest('hex'),j.financialUi.reportSha256);
      }
      const stored=optional(h,rp);let commit;
      if(stored){assert.deepEqual(stored,proposed,'COMPOSITE_EXISTING_RECEIPT_DRIFT');commit=git('log','-1','--format=%H',h,'--',rp);}
      else{assert.deepEqual(optional(h,jp),j);commit=await casCommit(h,'release(i66): sign '+g.targetsForCandidate(candidate,'live').length+'-function composite LIVE receipt '+generation,
        {[rp]:proposed,[proofPath]:proof});}
      await signed(commit);const fresh=remote();assert.equal(blobAt(fresh,rp),blob(serial(proposed)));
      assert.equal(blobAt(fresh,proofPath),blob(serial(proof)));
      return {blob:blobAt(fresh,rp),commit,verified:true,runId};
    },
    commitAll:async(j,next)=>{for(let attempt=0;attempt<3;attempt++){
      const h=remote();validateCurrent(h);assert.deepEqual(optional(h,jp),j);
      const changes=closeCompositeFiles(p=>jsonAt(h,p),j,next);
      const read={readFileSync:p=>Object.hasOwn(changes,p)?serial(changes[p]):git('show',h+':'+p)+'\n'};
      physicalGuard(changes[P.cp],changes[P.state],changes[P.transport],read);
      await verifyProspectiveChanges(h,changes);
      assert.equal(await provider.current('live'),request.target.hostingVersion,'PHYSICAL_DRIFT_DURING_METADATA_GUARD');
      verifyBackend();
      try{await casCommit(h,'release(i66): COMMITTED same-artifact composite, backend rollback and synchronized execution',changes);return next;}
      catch(e){if(attempt===2||!String(e.message).includes('HEAD_CAS_FAILED'))throw e;}
    }},verifyCommitted
  };
  const result=await acceptComposite(io,request,proof);await verifyCommitted(result);
  console.log('I66_COMPOSITE_FINAL_PHASE='+result.phase+' GENERATION='+generation+' BACKEND_FUNCTIONS='+g.targetsForCandidate(candidate,'live').length);
}
async function recordCompositeRollback(){
  await assertExecution('live','record-rollback');
  const file=path.join(process.env.RUNNER_TEMP,'gi-i66-composite-acceptance-attempt.json');
  if(!fs.existsSync(file))return;
  const attempt=JSON.parse(fs.readFileSync(file,'utf8')),jp=genName(attempt.generation,'JOURNAL'),h=remote(),j=optional(h,jp);
  if(!j)return;
  assert.equal(attempt.runId,runId);assert.equal(j.key,attempt.key);assert.equal(j.phase,'VERIFIED','COMPOSITE_ROLLBACK_CANNOT_REWRITE_ACCEPTANCE');
  assert.equal(j.liveProof.sourceSha,attempt.sourceSha);assert.equal(j.liveProof.runId,runId);
  const {GoogleAuth}=require('google-auth-library');
  const auth=await new GoogleAuth({scopes:['https://www.googleapis.com/auth/firebase.hosting']}).getClient();
  const provider=hosting(auth,github),physical=await provider.live(j.request.previous);
  require('./gravicentra-i66-frontend-promotion-transaction.cjs').verifyBytes(j.request.previous,physical);
  const backend=[];
  for(const row of j.liveProof.backendRevisions){
    if(j.request.candidate?.makeIngressComposite===true&&row.previousState==='ABSENT'){
      const scope=require('./gravicentra-i66-make-release-scope.cjs');assert.equal(row.name,scope.ADDED.live.name);assert.equal(row.region,scope.ADDED.live.region);
      const rows=JSON.parse(execFileSync('gcloud',['functions','list','--gen2','--regions',row.region,'--project','ays-orbit-360-lab','--format=json'],{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:60000}));
      assert.ok(Array.isArray(rows)&&!rows.some(f=>String(f.name||'').split('/').at(-1)===row.name),'COMPOSITE_CREATED_TRIGGER_NOT_REMOVED');
      backend.push({name:row.name,region:row.region,state:'ABSENT',rollbackAction:'DELETE_EXACT_CREATED_FUNCTION'});continue;
    }
    const s=JSON.parse(execFileSync('gcloud',['run','services','describe',row.service,'--region',row.region,
      '--project','ays-orbit-360-lab','--format=json'],{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:60000}));
    const active=(s.status?.traffic||s.traffic||[]).filter(x=>Number(x.percent)>0);
    assert.equal(active.length,1);assert.equal(Number(active[0].percent),100);
    assert.equal(String(active[0].revisionName||active[0].revision),row.previousRevision,'COMPOSITE_ROLLBACK_REVISION_NOT_RESTORED');
    backend.push({name:row.name,region:row.region,revision:row.previousRevision,trafficPercent:100});
  }
  const fresh=remote();assert.deepEqual(optional(fresh,jp),j,'COMPOSITE_ROLLBACK_JOURNAL_CAS');
  assert.equal(jsonAt(fresh,P.transport).currentPhysicalHostingRelease.sourceSha,j.request.previous.sourceSha);
  let makeIngress;
  if(j.request.candidate?.makeIngressComposite===true){
    makeIngress=JSON.parse(fs.readFileSync(path.join(process.env.RUNNER_TEMP,'gi-make-live-rollback.json')));
    assert.equal(makeIngress.status,'COMPENSATION_READBACK_VERIFIED');assert.equal(makeIngress.phase,'live');
    assert.equal(makeIngress.sourceSha,j.request.candidate.sourceSha);assert.equal(makeIngress.artifactDigest,j.request.candidate.artifactDigest);
    assert.deepEqual(makeIngress.failures,[]);assert.equal(makeIngress.canonicalLeadWrites,0);assert.equal(makeIngress.externalMessagesSent,0);
  }
  await casCommit(fresh,'release(i66): record verified composite compensation without advancing physical control',
    {[jp]:{...j,phase:'ROLLED_BACK',rollback:{physical,backend,verified:true,runId,...(makeIngress?{makeIngress}:{})}}});
  console.log('I66_COMPOSITE_COMPENSATION_RECORDED_GENERATION='+attempt.generation);
}
// This adapter supplies the existing promotion transaction with the exact
// Hosting-only request. The composite request and its journal remain independent.
const focalPreview = require('./gravicentra-i6-6-cloud-build-preview.cjs');
const focalPackage = require('./gravicentra-i6-6-cloud-build-package.cjs');
const focalComposition = require('./gravicentra-i6-6-focal-hosting-composition.cjs');
const focalSigning = require('./gravicentra-i6-6-cloud-build-signed-cas.cjs');
const comparisonUnit = ['I6_6_COTIZADOR_COMPARATIVO_DESTINATARIO_20261127','I6_6_COTIZADOR_COMPARATIVO_DESTINATARIO_20261127_CONTENCION'];

function focalRoleProof(report, phase, binding, physicalKey) {
  assert.ok(phase==='preview'||phase==='live');
  if(phase==='live')assert.match(physicalKey,/^[a-f0-9]{64}$/);
  else assert.equal(physicalKey,null);
  assert.deepEqual([report.schema,report.phase,report.result],['GI_I66_FOCAL_COMPARISON_ROLE_READBACK_V1',phase,'PASS']);
  const origin=phase==='preview'?binding.previewUrl:'https://app.aysseguros.com';
  assert.deepEqual([report.requestDigest,report.compositionTree,report.artifactDigest,report.hostingVersion,
    report.sourceSha,report.buildId,report.origin,report.physicalPhaseKey],
    [binding.focalHosting.requestDigest,binding.compositionTree,binding.artifactDigest,binding.hostingVersion,
      binding.sourceSha,binding.buildId,origin,physicalKey]);
  assert.deepEqual([report.externalCommunications,report.businessWrites,report.backendChanges],[0,0,0]);
  assert.deepEqual(report.roles.map(row=>row.role).sort(),['direccion','operativo'],'FOCAL_ASSIGNED_ROLE_COVERAGE');
  assert.equal(new Set(report.roles.map(row=>row.actorSha256)).size,2,'FOCAL_DISTINCT_ASSIGNED_ACTORS');
  for(const row of report.roles){
    assert.match(row.actorSha256,/^[0-9a-f]{64}$/);
    for(const stage of ['beforeReload','afterReload']){
      const s=row[stage];
      assert.deepEqual([s.role,s.actorSha256,s.buildId,s.origin,s.authenticated,s.tenant,s.country],
        [row.role,row.actorSha256,binding.buildId,origin,true,'alianzas-soluciones','GT'],'FOCAL_AUTHENTICATED_ROLE_READBACK');
      for(const check of ['implicitRecipientBlocked','invalidProposalBlocked','mixedCurrenciesBlocked',
        'exactCentavos','changedApprovalBlocked','emailComposerRevalidated','canonicalComparisonValid','independentDraftAvailable'])
        assert.equal(s[check],true,'FOCAL_BEHAVIOR_'+check);
    }
    assert.deepEqual([row.fixtureKind,row.externalCommunications,row.businessWrites],['synthetic',0,0]);
  }
  return report;
}
function focalTarget(plan,proof,previewBuildId,compositionBlob) {
  focalPreview.validatePlan(plan);
  assert.equal(plan.schema,focalPreview.focalPreviewSchema);
  const p=plan.packagePlan,a=plan.packageArtifact;
  assert.deepEqual(p.request.changes,comparisonUnit,'FOCAL_COMPARISON_UNIT');
  assert.deepEqual([proof.schema,proof.executionBuildId,proof.packageBuildId,proof.planDigest,proof.requestDigest,
    proof.compositionTree,proof.packageArtifact,proof.scope],
    ['GI_I66_FOCAL_HOSTING_PREVIEW_PROOF_V1',previewBuildId,plan.packageBuildId,focalPackage.digest(plan),
      p.requestDigest,p.compositionTree,a,'HOSTING_PREVIEW_ONLY']);
  const buildId='gi-i66-'+p.sourceSha.slice(0,12)+'-'+p.compositionTree.slice(0,12);
  assert.equal(proof.buildId,buildId);
  assert.match(proof.origin,new RegExp('^https://ays-orbit-360-lab--'+plan.channel+'-[a-z0-9]+\\.web\\.app$'));
  const target={executionProvider:'CLOUD_BUILD',sourceSha:p.sourceSha,sourceTree:p.sourceTreeSha,
    manifestBlob:p.request.manifestBlob,compositionBlob,compositionTree:p.compositionTree,
    focalHosting:{schema:p.request.schema,generation:p.requestVersion,requestDigest:p.requestDigest,compositionTree:p.compositionTree},
    buildId,buildRunId:plan.packageBuildId,artifactId:a.uri+'#'+a.generation,artifactDigest:'sha256:'+a.sha256,
    previewChannel:plan.channel,previewUrl:proof.origin,hostingVersion:proof.hostingVersion,files:p.baseline.files};
  require('./gravicentra-i66-frontend-promotion-transaction.cjs').releaseBinding(target);
  return target;
}

function focalControl(head,plan){
  const p=plan.packagePlan,tr=jsonAt(head,P.transport),cp=jsonAt(head,P.cp);
  const live=cp[cp.currentExecutionDecisionPointer];
  const admitted=focalComposition.plan(process.cwd(),head);
  assert.deepEqual(admitted,{...p,mechanismSha:head},'FOCAL_SIGNED_COMPOSITION_CHANGED');
  assert.equal(live.receiptGitBlobSha,p.request.previousReceiptBlob);
  assert.equal(blobAt(head,live.receiptPath),live.receiptGitBlobSha);
  return {generation:tr.frontendReleaseSequence,physical:admitted.baseline,receiptBlob:live.receiptGitBlobSha,
    guardBlob:blobAt(head,P.guard),consumed:tr.consumedFrontendAuthorities||[],
    focalRequestDigest:admitted.requestDigest,focalCompositionTree:admitted.compositionTree};
}

function getFocalSigner(account,digest){
  assert.equal(account.login,'paulaosoriof86');
  const key=process.env.GRAVICENTRA_I66_E4_CLOSURE_KEY;
  assert.ok(key&&path.isAbsolute(key),'FOCAL_REGISTERED_CLOSURE_KEY_REQUIRED');
  const stat=fs.lstatSync(key),parent=fs.lstatSync(path.dirname(key));
  assert.ok(fs.realpathSync(key)===key&&key.startsWith('/dev/shm/')&&stat.isFile()&&!stat.isSymbolicLink()&&
    stat.uid===process.getuid()&&(stat.mode&0o077)===0&&parent.uid===stat.uid&&(parent.mode&0o077)===0,
    'FOCAL_SIGNER_TEMPORARY_PROTECTION');
  const pub=fs.readFileSync(key+'.pub','utf8').trim().split(/\s+/).slice(0,2).join(' ');
  const keys=focalGh(['users/'+account.login+'/ssh_signing_keys']);
  const label='Gravicentra I6.6 E4 '+digest.slice(0,12)+' - firma temporal';
  assert.ok(keys.some(k=>(!k.title||k.title===label)&&k.key.trim().split(/\s+/).slice(0,2).join(' ')===pub),'FOCAL_REGISTERED_SIGNING_ONLY_KEY');
  return key;
}
function focalGh(args){return JSON.parse(execFileSync('gh',['api',...args],{encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:40*1024*1024}));}
const focalRef=()=>focalGh(['repos/'+repository+'/git/ref/heads/'+branch]).object.sha;
function exactFocalCommit(hash){
  const c=focalGh(['repos/'+repository+'/commits/'+hash]);
  assert.equal(c.sha,hash);assert.equal(c.commit.verification.verified,true,'FOCAL_VERIFIED_SIGNATURE_REQUIRED');
  return c;
}
async function retainFocal(storage,name,bytes){
  try{return await storage.retain(name,bytes,'application/json');}
  catch(error){
    const m=await storage.metadata(name);
    const ref={uri:'gs://'+focalPackage.C.bucket+'/'+name,generation:String(m.generation),
      bytes:bytes.length,sha256:focalPackage.sha(bytes)};
    await storage.object(ref);
    return ref;
  }
}
function assertFocalPhasePaths(generation,authority,paths,closing){
  const jp=releaseJournalPath(generation,authority),rp=genName(generation,'RECEIPT');
  if(closing){
    assert.deepEqual([...paths].sort(),[jp,P.cp,P.state,P.transport,P.ledger,genName(generation,'FOCAL_PROGRESS')].sort(),'FOCAL_EXACT_CLOSURE_PATHS');
  }else{
    assert.equal(paths.length,1);assert.ok([jp,rp,genName(generation,'FOCAL_HOSTING_PREVIEW_UI'),genName(generation,'FOCAL_HOSTING_LIVE_UI')].includes(paths[0]),'FOCAL_METADATA_SCOPE');
  }
}
// Retain the signed Git object itself before sending the ref update. When a
// response is lost another operator session can recover the same commit OID.
function retainedFocalCommit(uri,dir,gitBytes,create){
  const common={stdio:['ignore','pipe','pipe'],timeout:60000};
  const meta=()=>JSON.parse(execFileSync('gcloud',['storage','objects','describe',uri,'--raw','--format=json'],common));
  let m;
  try{m=meta();}catch(error){
    if(!/404|not found|No URLs matched/i.test(String(error.stderr)))throw error;
    const sha=create(),file=path.join(dir,'signed.git');
    fs.writeFileSync(file,gitBytes(['cat-file','commit',sha]),{flag:'wx',mode:0o600});
    try{execFileSync('gcloud',['storage','cp','--if-generation-match=0',file,uri],common);}catch{/* Exact immutable readback below decides. */}
    m=meta();
  }
  assert.equal('gs://'+m.bucket+'/'+m.name,uri);assert.match(String(m.generation),/^[1-9]\d*$/);
  assert.ok(Number(m.size)>0&&Number(m.size)<65536);
  const bytes=execFileSync('gcloud',['storage','cat',uri+'#'+m.generation],{...common,maxBuffer:65536});
  assert.equal(bytes.length,Number(m.size));
  return gitBytes(['hash-object','-w','-t','commit','--stdin'],{input:bytes}).toString().trim();
}
async function writeFocalCas({head,message,entries,request,storage,temp,account,closing=false}){
  const paths=Object.keys(entries).sort(),authority=request.target.focalHosting,n=request.generation;
  assertFocalPhasePaths(n,authority,paths,closing);
  const gitBytes=(args,options={})=>execFileSync('git',args,{stdio:['pipe','pipe','pipe'],maxBuffer:64*1024*1024,...options});
  const dir=fs.mkdtempSync(path.join(temp,'transition-')),env={...process.env,GIT_INDEX_FILE:path.join(dir,'index')};
  const entriesWithPins=[];
  gitBytes(['read-tree',head],{env});
  for(const file of paths){
    const content=serial(entries[file]),oid=blob(content);
    assert.equal(gitBytes(['hash-object','-w','--stdin'],{input:content}).toString().trim(),oid);
    const prior=git('ls-tree',head,'--',file);
    assert.ok(!prior||prior.startsWith('100644 blob '),'FOCAL_PREIMAGE_MODE');
    entriesWithPins.push({path:file,baseBlobSha:prior?prior.split(/\s/)[2]:null,newBlobSha:oid,content});
    gitBytes(['update-index','--add','--cacheinfo','100644',oid,file],{env});
  }
  const tree=gitBytes(['write-tree'],{env}).toString().trim();
  const packet={expectedHead:head,expectedBaseTree:git('rev-parse',head+'^{tree}'),expectedTree:tree,headline:message,
    requestDigest:authority.requestDigest,packageBuildId:request.target.buildRunId,entries:entriesWithPins};
  assert.notEqual(tree,packet.expectedBaseTree,'FOCAL_NO_CHANGES');
  const verify=sha=>{focalSigning.verifyCommit({packet},exactFocalCommit(sha));assert.equal(focalRef(),sha);return sha;};
  const prefix='i66/source-checkpoints/focal-hosting-package/'+authority.requestDigest+'/promotion/'+head+'/'+tree+'/';
  const data=Buffer.from(serial(packet)),ref=await retainFocal(storage,prefix+'transition.json',data);
  const before=focalRef();if(before!==head)return verify(before);
  if(closing){
    assert.equal(n,4,'E4_TEMPORARY_SIGNER_SCOPE');
    const key=getFocalSigner(account,authority.requestDigest),email=account.id+'+'+account.login+'@users.noreply.github.com';
    let submitted=false;
    try{
      return require('./gravicentra-i66-frontend-control.cjs').pushFocalClosure({fs,git:gitBytes,gh:focalGh,account,email,key,tree,
        head,message,temp:dir,ref:focalRef,branch,remote:'https://github.com/'+repository+'.git',verified:verify,
        onPush:()=>{submitted=true;},getSignedCommit:create=>retainedFocalCommit('gs://'+focalPackage.C.bucket+'/'+prefix+'closure.git',dir,gitBytes,create)});
    }catch(error){
      if(submitted)error.code='FOCAL_CLOSURE_ACK_PENDING';
      throw error;
    }
  }
  const mutation=focalSigning.operatorMutation({packet});
  // A reservation belongs to one POST only. On an uncertain ACK the original
  // expected tree and all its preimages survive in private storage.
  try{await storage.retain(prefix+'attempt1.json',Buffer.from(serial(ref)),'application/json');}
  catch{const observed=focalRef();if(observed!==head)return verify(observed);throw Error('FOCAL_CAS_EXISTING_CLAIM_ACK_PENDING');}
  if(focalRef()!==head)return verify(focalRef());
  let response;
  try{response=await focalSigning.operatorCliIo().createCommit(mutation);}catch{/* Inspect the ref before taking any further action. */}
  const after=focalRef();assert.notEqual(after,head,'FOCAL_CAS_ACK_PENDING');
  const ack=response?.data?.createCommitOnBranch?.commit?.oid;if(ack)assert.equal(after,ack);
  return verify(after);
}

async function runFocal(args=process.argv.slice(3)){
  const [planFile,previewId,mode='promote',reportFile]=args;
  assert.ok(planFile&&/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(previewId),'FOCAL_PREVIEW_BUILD_REQUIRED');
  assert.ok(['promote','attest-preview','attest-live','inspect'].includes(mode));
  assert.equal(args.length,mode.startsWith('attest-')?4:mode==='promote'&&args.length===2?2:3);
  const account=focalGh(['user']);assert.equal(account.login,'paulaosoriof86');
  const cloud=(args)=>execFileSync('gcloud',args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:40*1024*1024}).trim();
  assert.equal(cloud(['config','get-value','project']),focalPackage.C.projectId,'FOCAL_GOOGLE_PROJECT');
  assert.equal(cloud(['auth','list','--filter=status:ACTIVE','--format=value(account)']),'aysseguros2009@gmail.com','FOCAL_GOOGLE_ACTOR');
  assert.equal(git('status','--porcelain'),'','FOCAL_CLEAN_OPERATOR_CHECKOUT');
  assert.equal(git('rev-parse','--abbrev-ref','HEAD'),'HEAD','FOCAL_DETACHED_OPERATOR_CHECKOUT');
  const plan=JSON.parse(fs.readFileSync(planFile,'utf8'));
  focalPreview.validatePlan(plan);assert.equal(plan.schema,focalPreview.focalPreviewSchema);
  const pp=plan.packagePlan,n=pp.requestVersion;
  assert.deepEqual(pp.request.changes,comparisonUnit);
  const journalPath=releaseJournalPath(n,pp.request),receiptPath=genName(n,'RECEIPT');
  const previewUi=genName(n,'FOCAL_HOSTING_PREVIEW_UI'),liveUi=genName(n,'FOCAL_HOSTING_LIVE_UI');
  const programHead=git('rev-parse','HEAD');
  const codePins=[P.guard,'tools/gravicentra-i66-frontend-promotion-owner.cjs','tools/gravicentra-i66-frontend-promotion-transaction.cjs',
    'tools/gravicentra-i66-frontend-control.cjs','tools/gravicentra-i66-frontend-hosting-io.cjs','tools/gravicentra-i6-6-cloud-build-signed-cas.cjs',
    'tools/gravicentra-i6-6-cloud-build-package.cjs','tools/gravicentra-i6-6-cloud-build-preview.cjs','tools/gravicentra-i6-6-focal-hosting-composition.cjs',
    'tools/gravicentra-i6-6-frontend-preview-authority.cjs'];
  function fresh(){
    const head=remote();
    assert.equal(focalRef(),head,'FOCAL_BRANCH_READBACK');
    git('diff','--quiet',programHead,head,'--',...codePins);
    if(git('rev-parse','HEAD')!==head){
      assert.equal(git('status','--porcelain'),'','FOCAL_DIRTY_CHECKOUT');
      git('checkout','--quiet','--detach',head);
    }
    return head;
  }
  const boot=fresh();exactFocalCommit(boot);exactFocalCommit(plan.mechanismSha);
  const existing=optional(boot,journalPath);
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'gi-focal-operator-'));
  try{
    const auth={getRequestHeaders:async()=>({Authorization:'Bearer '+cloud(['auth','print-access-token','--project='+focalPackage.C.projectId])})};
    const storage=await focalPreview.cloudIo(await auth.getRequestHeaders());
    const verifyDir=path.join(temp,'preview');
    let proof;
    if(existing){
      assert.equal(existing.generation,n);assert.ok(existing.nativePreview,'FOCAL_NATIVE_JOURNAL_REQUIRED');
      assert.equal(existing.nativePreview.buildId,previewId);
      const saved=(await storage.object(existing.nativePreview.receipt)).data;
      proof=JSON.parse(saved).proof;
    }else{
      focalControl(boot,plan);
      proof=(await focalPreview.verify(plan,previewId,verifyDir)).proof;
    }
    const target=focalTarget(plan,proof,previewId,blobAt(pp.sourceSha,P.composition));
    const previous=pp.baseline;
    if(existing){
      assert.deepEqual(existing.request.target,target,'FOCAL_RETAINED_TARGET');
      assert.deepEqual(existing.request.previous,previous,'FOCAL_RETAINED_PREDECESSOR');
    }
    const prefix='i66/source-checkpoints/focal-hosting-package/'+pp.requestDigest+'/runtime/'+previewId+'/';
    const data=await focalPreview.readPackage(plan,storage,path.join(temp,'package'),process.cwd());
    assert.equal(data.proof.output.siteManifestSha256,proof.siteManifestSha256);
    const previousBytes=(await storage.object(pp.request.baselineArchive)).data;
    const oldBundle=focalComposition.unpackBaseline(previousBytes,pp,path.join(temp,'old'));
    const newDir=path.join(temp,'new');fs.mkdirSync(newDir);
    focalPreview.safeUnpack(path.join(temp,'package',focalPackage.F.archive),newDir);
    const newBundle=focalPreview.loadBundle(newDir,target);
    const bundles=[{binding:previous,bundle:oldBundle},{binding:target,bundle:newBundle}];
    const provider=hosting(auth,undefined,{certifiedBundles:bundles});
    const journal=()=>optional(fresh(),journalPath);
    const readAt=head=>({readFileSync:(file,encoding)=>execFileSync('git',['cat-file','blob',head+':'+file],{encoding,maxBuffer:40*1024*1024})});
    async function verifiedUi(head,phase,physicalKey){
      const file=phase==='preview'?previewUi:liveUi,stored=jsonAt(head,file);
      const commit=git('log','-1','--format=%H',head,'--',file),signedUi=exactFocalCommit(commit);
      assert.equal(signedUi.author?.login,account.login,'FOCAL_ATTESTING_OPERATOR');
      assert.equal(stored.schema,'GI_I66_SIGNED_FOCAL_ROLE_EVIDENCE_V1');
      const ref=stored.evidence;
      assert.ok(ref.uri==='gs://'+focalPackage.C.bucket+'/'+prefix+phase+'/'+ref.sha256+'.json','FOCAL_ROLE_EVIDENCE_PATH');
      const raw=(await storage.object(ref)).data;
      focalRoleProof(JSON.parse(raw),phase,target,physicalKey);
      assert.deepEqual(stored,{schema:'GI_I66_SIGNED_FOCAL_ROLE_EVIDENCE_V1',phase,requestDigest:pp.requestDigest,
        sourceSha:target.sourceSha,buildId:target.buildId,artifactDigest:target.artifactDigest,hostingVersion:target.hostingVersion,
        physicalPhaseKey:physicalKey,evidence:ref,result:'PASS'});
      return {result:'PASS',buildId:target.buildId,receiptBlob:blobAt(head,file)};
    }
    async function verifyCommitted(j){
      const head=fresh();assert.deepEqual(optional(head,journalPath),j);
      assert.equal(j.request.target.focalHosting.requestDigest,pp.requestDigest);
      physicalGuard(jsonAt(head,P.cp),jsonAt(head,P.state),jsonAt(head,P.transport),readAt(head));
      exactFocalCommit(j.receipt.commit);await verifiedUi(head,'preview',null);await verifiedUi(head,'live',j.key);
      assert.deepEqual(await provider.live(target),j.physical);
    }
    if(existing?.phase==='COMMITTED'){await verifyCommitted(existing);return existing;}
    const control=focalControl(boot,plan);
    const requestBase={schema:'GI_I66_FRONTEND_PROMOTION_V1',gate:'I6.6',scope:'FRONTEND_ONLY',scopeId:'COTIZADOR_COMPARATIVO_DESTINATARIO',
      generation:n,guardBlob:control.guardBlob,previousReceiptBlob:pp.request.previousReceiptBlob,target,previous};
    const cas=(head,message,entries,closing=false)=>writeFocalCas({head,message,entries,request:requestBase,account,storage,temp,closing});
    if(mode.startsWith('attest-')){
      const phase=mode.slice(7),physicalKey=phase==='live'?existing?.key:null;
      if(phase==='live')assert.equal(existing?.phase,'VERIFIED','FOCAL_LIVE_UI_REQUIRES_PHYSICAL_VERIFIED');
      else assert.equal(await provider.current('live'),previous.hostingVersion);
      const bytes=fs.readFileSync(reportFile),report=JSON.parse(bytes);
      focalRoleProof(report,phase,target,physicalKey);
      const state=phase==='preview'?await provider.preview(target):await provider.live(target);
      assert.equal(state.hostingVersion,target.hostingVersion);
      const ref=await retainFocal(storage,prefix+phase+'/'+focalPackage.sha(bytes)+'.json',bytes);
      const value={schema:'GI_I66_SIGNED_FOCAL_ROLE_EVIDENCE_V1',phase,requestDigest:pp.requestDigest,
        sourceSha:target.sourceSha,buildId:target.buildId,artifactDigest:target.artifactDigest,hostingVersion:target.hostingVersion,
        physicalPhaseKey:physicalKey,evidence:ref,result:'PASS'};
      // The observer retains only the role evidence. The promotion process is
      // the sole canonical writer, including while it awaits LIVE readback.
      const head=fresh();focalControl(head,plan);assert.deepEqual(optional(head,journalPath),existing);
      const receipt=await retainFocal(storage,prefix+phase+'/attestation.json',Buffer.from(serial(value)));
      return {stage:'ROLE_OBSERVATION_RETAINED',buildId:target.buildId,receipt};
    }
    async function adoptUi(phase,physicalKey) {
      const file=phase==='preview'?previewUi:liveUi,head=fresh();
      if(existsAt(head,file))return verifiedUi(head,phase,physicalKey);
      const objectName=prefix+phase+'/attestation.json';
      const url='https://storage.googleapis.com/storage/v1/b/'+focalPackage.C.bucket+'/o/'+encodeURIComponent(objectName);
      const response=await fetch(url,{headers:await auth.getRequestHeaders(),redirect:'error',signal:AbortSignal.timeout(15000)});
      if(response.status===404)return null;
      assert.ok(response.ok,'FOCAL_ROLE_ATTESTATION_READ');
      const m=await response.json();assert.equal(m.bucket,focalPackage.C.bucket);assert.equal(m.name,objectName);
      assert.match(String(m.generation),/^[1-9][0-9]*$/);assert.ok(Number(m.size)>0&&Number(m.size)<16384);
      const bytes=await storage.bytes(objectName,String(m.generation));assert.equal(bytes.length,Number(m.size));
      const value=JSON.parse(bytes),ref=value.evidence;
      assert.equal(ref.uri,'gs://'+focalPackage.C.bucket+'/'+prefix+phase+'/'+ref.sha256+'.json');
      const raw=(await storage.object(ref)).data;
      focalRoleProof(JSON.parse(raw),phase,target,physicalKey);
      assert.deepEqual(value,{schema:'GI_I66_SIGNED_FOCAL_ROLE_EVIDENCE_V1',phase,requestDigest:pp.requestDigest,
        sourceSha:target.sourceSha,buildId:target.buildId,artifactDigest:target.artifactDigest,hostingVersion:target.hostingVersion,
        physicalPhaseKey:physicalKey,evidence:ref,result:'PASS'});
      assert.equal(await provider.current(phase==='preview'?plan.channel:'live'),target.hostingVersion);
      const before=fresh();focalControl(before,plan);
      if(phase==='live') {
        const active=optional(before,journalPath);
        assert.equal(active?.phase,'VERIFIED');assert.equal(active.key,physicalKey);
      }
      if(!existsAt(before,file))await cas(before,'release(i66): attest focal '+phase+' UI generation '+n,{[file]:value});
      return verifiedUi(fresh(),phase,physicalKey);
    }
    if(mode==='inspect')return {stage:'PREVIEW_DEPLOYED',previewBuild:previewId,target,previous,roleProof:existsAt(boot,previewUi)?await verifiedUi(boot,'preview',null):'PENDING'};
    const uiApproval=await adoptUi('preview',null);
    assert.ok(uiApproval,'FOCAL_AUTHENTICATED_PREVIEW_ROLE_EVIDENCE_PENDING');
    const request={...requestBase,approvalBlob:uiApproval.receiptBlob};
    getFocalSigner(account,pp.requestDigest);
    assert.equal(n,4,'E4_TEMPORARY_SIGNER_SCOPE');
    const cli=process.env.FIREBASE_CLI_BIN;
    assert.ok(cli&&fs.existsSync(cli),'FOCAL_PINNED_HOSTING_CLI_REQUIRED');
    assert.equal(execFileSync(process.execPath,[cli,'--version'],{encoding:'utf8'}).trim(),'14.10.1');
    const nativePreview=existing?.nativePreview||{buildId:previewId,receipt:await retainFocal(storage,prefix+'certified-preview.json',fs.readFileSync(path.join(verifyDir,'receipt.json')))};
    if(existing)assert.deepEqual(existing.request,request,'FOCAL_JOURNAL_REQUEST_DRIFT');
    async function ownership(j){
      const h=fresh();focalControl(h,plan);assert.deepEqual(optional(h,journalPath),j,'FOCAL_JOURNAL_OWNER_CHANGED');return h;
    }
    async function writePhase(old,next){
      const h=await ownership(old);
      const value={...next,nativePreview};
      await cas(h,'release(i66): '+value.phase+' focal Hosting generation '+n,{[journalPath]:value});
      assert.deepEqual(journal(),value,'FOCAL_PHASE_READBACK');return value;
    }
    const io={readJournal:journal,readControl:()=>focalControl(fresh(),plan),
      validateProofs:()=>verifiedUi(fresh(),'preview',null),cas:writePhase,incident:writePhase,
      verifyLive:provider.live,verifyPreview:provider.preview,currentVersion:()=>provider.current('live'),
      clone:provider.clone,assertOwnership:ownership,assertCompensationOwnership:ownership,
      liveUiProof:async j=>{
        for(let i=0;i<60;i++){
          await ownership(j);
          const ui=await adoptUi('live',j.key);if(ui)return ui;
          await sleep(10000);
        }
        throw Error('FOCAL_LIVE_UI_RECEIPT_TIMEOUT');
      },
      signedReceipt:async(j,ui)=>{
        const h=await ownership(j),release=await provider.currentRelease('live');
        assert.equal(release.version.name,target.hostingVersion);
        assert.match(release.name,/^sites\/ays-orbit-360-lab\/(?:channels\/live\/)?releases\/[a-zA-Z0-9_-]+$/);
        const value={schema:'GI_I66_SIGNED_FRONTEND_RECEIPT_V1',generation:n,scopeId:request.scopeId,
          authorization:request.approvalBlob,target,previous,preview:j.preview,physical:j.physical,ui,runId:release.name,
          hostingRelease:release.name,previewBuild:previewId,packageBuild:target.buildRunId};
        const prior=optional(h,receiptPath);if(prior)assert.deepEqual(prior,value,'FOCAL_SIGNED_RECEIPT_COLLISION');
        else await cas(h,'release(i66): sign focal Hosting receipt generation '+n,{[receiptPath]:value});
        const head=fresh(),commit=git('log','-1','--format=%H',head,'--',receiptPath);
        exactFocalCommit(commit);assert.equal(blobAt(head,receiptPath),blob(serial(value)));
        return {blob:blobAt(head,receiptPath),commit,verified:true,runId:release.name};
      },
      commitAll:async(j,next)=>{
        const h=await ownership(j),changes=closeFiles(file=>jsonAt(h,file),j,next);
        const reader={readFileSync:file=>Object.hasOwn(changes,file)?serial(changes[file]):readAt(h).readFileSync(file).toString('utf8')};
        physicalGuard(changes[P.cp],changes[P.state],changes[P.transport],reader);
        await verifyProspectiveChanges(h,changes);
        assert.equal(await provider.current('live'),target.hostingVersion);
        assert.equal(await ownership(j),h);
        await cas(h,'release(i66): COMMITTED exact focal Hosting generation '+n,changes,true);
        await verifyCommitted(next);return next;
      },verifyCommitted};
    return await promote(io,request);
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
}

function dispatchReleaseAction(action,handlers={verifyCompositeFinancialPreview,runCompositeAcceptance,authorizeCompositeRollback,recordCompositeRollback,run,runFocal}){
  const operations={'--promote-focal':'runFocal','--verify-composite-financial-preview':'verifyCompositeFinancialPreview','--accept-composite-live':'runCompositeAcceptance',
    '--authorize-composite-rollback':'authorizeCompositeRollback','--record-composite-rollback':'recordCompositeRollback'};
  const name=action===undefined?'run':operations[action];
  if(!name)return Promise.reject(Error('RELEASE_OWNER_UNKNOWN_OPERATION'));
  return Promise.resolve().then(()=>handlers[name]());
}
if(require.main===module){
  const execution=dispatchReleaseAction(process.argv[2]);
  if(process.argv[2]==='--promote-focal')execution.then(result=>console.log(JSON.stringify({
    stage:result.stage||result.phase||result.result,buildId:result.target?.buildId||result.request?.target?.buildId||result.buildId,
    receipt:result.receipt||result.receiptBlob||null})),()=>{});
  execution.catch(e=>{console.error('I66_FRONTEND_PROMOTION_HOLD '+String(e.message).split('\n')[0].slice(0,150)+(transportCode(e)?' TRANSPORT_CODE='+transportCode(e):''));process.exitCode=1;});
}
module.exports={focalRoleProof,focalTarget,focalControl,assertFocalPhasePaths,releaseProviderIdentity,nextCompositeGeneration,assertCompositeRollbackAllowed,FINANCIAL_SCOPE,financialQaPaths,financialQaOwnerSelection,assertFinancialComposition,financialTarget,
  validateFinancialAuthority,resolveFinancialQa,validateFinancialReport,validateFinancialPhasePair,compositeFinancialBinding,
  validateCompositeFinancialParent,dispatchReleaseAction,transportCode,runReleaseChild,commitWithReadback};
