'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {execFileSync}=require('node:child_process');
const {P,genName,serial,blob,closeFiles,physicalGuard,closeCompositeFiles,compositeReceipt}=require('./gravicentra-i66-frontend-control.cjs');
const {promote,acceptComposite}=require('./gravicentra-i66-frontend-promotion-transaction.cjs');
const {hosting}=require('./gravicentra-i66-frontend-hosting-io.cjs');
const repository='paulaosoriof86/orbit360-core',branch='recovery/fase-a-clean-20260831';
const repoUrl='https://api.github.com/repos/'+repository+'/';
const runId=Number(process.env.GITHUB_RUN_ID);
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:25*1024*1024}).trimEnd();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const jsonAt=(sha,p)=>JSON.parse(git('show',sha+':'+p));
const blobAt=(sha,p)=>git('rev-parse',sha+':'+p);
const optional=(sha,p)=>{try{return jsonAt(sha,p);}catch(e){if(!existsAt(sha,p))return null;throw e;}};
function existsAt(sha,p){try{execFileSync('git',['cat-file','-e',sha+':'+p],{stdio:'ignore'});return true;}catch{return false;}}
function remote(){git('fetch','--quiet','origin','refs/heads/'+branch);return git('rev-parse','FETCH_HEAD');}
async function api(url,options={}){
  const r=await fetch(url,{...options,headers:{Authorization:'Bearer '+process.env.GITHUB_TOKEN,'User-Agent':'Gravicentra-Release-Owner',
    Accept:'application/vnd.github+json',...options.headers},signal:AbortSignal.timeout(60000)});assert.ok(r.ok,'GITHUB_PROVIDER_HTTP_'+r.status);return r;
}
const github=async(p,raw=false)=>{const r=await api(repoUrl+p);return raw?r:r.json();};
async function signed(sha){const c=await github('commits/'+sha);assert.equal(c.commit.verification.verified,true,'GITHUB_SIGNATURE_UNVERIFIED');return sha;}
async function casCommit(head,headline,entries){
  const mutation='mutation($input:CreateCommitOnBranchInput!){createCommitOnBranch(input:$input){commit{oid}}}';
  const input={branch:{repositoryNameWithOwner:repository,branchName:branch},expectedHeadOid:head,message:{headline},
    fileChanges:{additions:Object.entries(entries).map(([p,obj])=>({path:p,contents:Buffer.from(serial(obj)).toString('base64')}))}};
  const r=await (await api('https://api.github.com/graphql',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:mutation,variables:{input}})})).json();
  assert.ok(!r.errors?.length&&r.data?.createCommitOnBranch?.commit?.oid,'RELEASE_HEAD_CAS_FAILED');
  return signed(r.data.createCommitOnBranch.commit.oid);
}
const pins=[P.guard,'tools/gravicentra-i66-frontend-control.cjs','tools/gravicentra-i66-frontend-promotion-owner.cjs',
  'tools/gravicentra-i66-frontend-hosting-io.cjs','tools/gravicentra-i66-frontend-promotion-transaction.cjs',
  'tools/gravicentra-i6-6-operational-release-candidate.cjs','.github/workflows/gravicentra-delta-66-exact-live-clone.yml'];
function pinSet(head){return Object.fromEntries(pins.map(p=>[p,blobAt(head,p)]));}
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
  assert.ok(Number.isSafeInteger(expectedRunId)&&expectedRunId>0);
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
  assert.equal(process.env.GITHUB_REPOSITORY,repository);assert.equal(process.env.GITHUB_REF_NAME,branch);
  const file=path.join(process.env.RUNNER_TEMP,'gi-i66-composite-acceptance-attempt.json');
  const attempt=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):null,h=remote();
  let journal=null;
  if(attempt){
    const jp=genName(attempt.generation,'JOURNAL'),listed=git('ls-tree','--name-only',h,'--',jp);
    assert.ok(listed===''||listed===jp,'COMPOSITE_ROLLBACK_JOURNAL_LOOKUP_INVALID');
    if(listed)journal=jsonAt(h,jp);
  }
  assertCompositeRollbackAllowed(attempt,journal,{runId,sourceSha:process.env.I66_ROLE_SOURCE_SHA,
    previous:{sourceSha:process.env.I66_PREVIOUS_SOURCE_SHA,buildId:process.env.I66_PREVIOUS_BUILD_ID,
      hostingVersion:process.env.I66_PREVIOUS_HOSTING_VERSION},transport:jsonAt(h,P.transport)});
  console.log('I66_COMPOSITE_PHYSICAL_ROLLBACK_AUTHORIZED_BEFORE_COMMIT');
}
function verifyProspectiveChanges(h,changes){
  const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'gi-i66-guard-')),wt=path.join(scratch,'tree');
  try{
    git('worktree','add','--quiet','--detach',wt,h);
    for(const [file,obj] of Object.entries(changes))fs.writeFileSync(path.join(wt,file),serial(obj));
    git('-C',wt,'add','--',...Object.keys(changes));
    git('-C',wt,'-c','user.name=Gravicentra release preflight','-c','user.email=release@localhost',
      '-c','commit.gpgSign=false','commit','--quiet','-m','Verify prospective control transaction');
    const tree=git('-C',wt,'rev-parse','HEAD^{tree}');
    for(const [file,obj] of Object.entries(changes))assert.equal(git('-C',wt,'rev-parse',tree+':'+file),blob(serial(obj)),'PROSPECTIVE_TREE_DRIFT');
    execFileSync(process.execPath,[P.guard],{cwd:wt,stdio:'inherit',timeout:420000});
  }finally{if(fs.existsSync(wt))git('worktree','remove','--force',wt);fs.rmSync(scratch,{recursive:true,force:true});}
}
async function run(){
  assert.equal(process.env.GITHUB_REPOSITORY,repository);assert.equal(process.env.GITHUB_REF_NAME,branch);
  assert.ok(Number.isSafeInteger(runId)&&runId>0);
  const {GoogleAuth}=require('google-auth-library');
  const auth=await new GoogleAuth({scopes:['https://www.googleapis.com/auth/firebase.hosting']}).getClient();
  const provider=hosting(auth,github),boot=remote(),raw=jsonAt(boot,P.authority),approvalBlob=blobAt(boot,P.authority);
  assert.ok(raw.status==='DIRECTION_APPROVED_EXACT_PREVIEW'&&raw.approvedByDirection===true&&raw.gate==='I6.6');
  assert.ok(Number.isSafeInteger(raw.generation)&&raw.generation>0);
  const jp=genName(raw.generation,'JOURNAL'),rp=genName(raw.generation,'RECEIPT'),uiPath=genName(raw.generation,'LIVE_UI');
  const approvedScope=raw.scopeId;assert.match(approvedScope,/^[A-Z0-9_-]+$/);
  const currentRaw=jsonAt(boot,P.transport).currentPhysicalHostingRelease,existing=optional(boot,jp);
  const targetBase=raw.target;
  const digestPaths=head=>{
    assert.equal(blobAt(head,P.authority),approvalBlob,'RELEASE_AUTHORITY_REPLACED');
    assert.deepEqual(pinSet(head),raw.ownerPins,'RELEASE_OWNER_DRIFT');
    assert.equal(blobAt(head,P.manifest),blobAt(targetBase.sourceSha,P.manifest),'RELEASE_COMPOSITION_MANIFEST_DRIFT');
    assert.equal(blobAt(head,P.composition),blobAt(targetBase.sourceSha,P.composition),'RELEASE_COMPOSITION_LOCK_DRIFT');
    git('diff','--quiet',targetBase.sourceSha,head,'--','orbit360-platform','functions','firebase.json','firestore.rules','storage.rules',
      ':(exclude)orbit360-platform/docs/recovery/orbit360-recovery-state-v1.json');
  };
  // Resume an interrupted release using its frozen version and previous backup,
  // even when the physical LIVE channel already points to the target.
  async function makeBinding(base,prior){
    const v={sourceSha:base.sourceSha,sourceTree:git('rev-parse',base.sourceSha+'^{tree}'),manifestBlob:blobAt(base.sourceSha,P.manifest),
      compositionBlob:blobAt(base.sourceSha,P.composition),artifactId:base.artifactId,artifactDigest:base.artifactDigest,buildId:base.buildId,
      buildRunId:base.buildRunId||base.previewRunId,previewUrl:base.previewUrl||'',previewChannel:base.previewChannel||'',
      hostingVersion:prior?base.liveHostingVersion:await provider.current(base.previewChannel)};
    const pkg=await provider.packageData(v);v.files=pkg.rows.length;return v;
  }
  const request=existing?.request||{schema:'GI_I66_FRONTEND_PROMOTION_V1',gate:'I6.6',scope:'FRONTEND_ONLY',generation:raw.generation,approvalBlob,
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
      for(const k of ['authenticated','buttonClicked','serverReadback','reload','linkedDestination','roleScope','noDuplicate','desktop','mobile390'])
        assert.equal(qa[k],true,'PREVIEW_FUNCTIONAL_PROOF_MISSING_'+k);
      assert.equal(qa.visualDecision,'APPROVED_BY_DIRECTION');
      const branchGuardSig=pinSet(raw.guardHead);assert.deepEqual(branchGuardSig,raw.ownerPins,'STALE_GUARD_RUN');
    },
    verifyLive:provider.live,verifyPreview:provider.preview,currentVersion:()=>provider.current('live'),clone:provider.clone,cas:writePhase,
    assertOwnership:async j=>{const h=remote();validateCurrent(h);assert.deepEqual(optional(h,jp),j,'RELEASE_OWNER_LOST');},
    assertCompensationOwnership:async j=>{const h=remote();assert.deepEqual(optional(h,jp),j);const tr=ctl(h);assert.equal(tr.currentPhysicalHostingRelease.liveHostingVersion,request.previous.hostingVersion);},
    liveUiProof:async j=>{
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
      verifyProspectiveChanges(h,changes);
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
  assert.equal(process.env.GITHUB_REPOSITORY,repository);assert.equal(process.env.GITHUB_REF_NAME,branch);
  assert.ok(Number.isSafeInteger(runId)&&runId>0);
  const g=require('./gravicentra-i6-6-operational-release-candidate.cjs');
  const proof=JSON.parse(fs.readFileSync(path.join(process.env.RUNNER_TEMP,'i66-role-live-exact-proof.json'),'utf8'));
  assert.equal(proof.runId,runId,'COMPOSITE_CURRENT_RUN_PROOF_REQUIRED');
  assert.equal(proof.headSha,process.env.GITHUB_SHA,'COMPOSITE_CURRENT_RUN_HEAD_REQUIRED');
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
  const approvalBlob=existing?.request?.approvalBlob||blobAt(boot,P.transport),ownerPins=pinSet(boot);
  const previous=cp.i66FrontendReleaseHead;
  const request=existing?.request||{schema:'GI_I66_FRONTEND_PROMOTION_V1',gate:'I6.6',scope:'COMPOSITE',generation,
    approvalBlob,guardBlob:blobAt(boot,P.guard),previousReceiptBlob:previous.receiptGitBlobSha,candidate,
    previous:{sourceSha:previous.sourceSha,sourceTree:previous.sourceTree,manifestBlob:previous.manifestBlob,
      compositionBlob:previous.compositionBlob,artifactId:previous.artifactId,artifactDigest:previous.artifactDigest,
      buildId:previous.buildId,buildRunId:previous.buildRunId,previewUrl:previous.previewUrl,
      hostingVersion:previous.hostingVersion,files:previous.hostedFilesEachOrigin},
    target:{sourceSha:candidate.sourceSha,sourceTree:git('rev-parse',candidate.sourceSha+'^{tree}'),
      manifestBlob:blobAt(candidate.sourceSha,P.manifest),compositionBlob:blobAt(candidate.sourceSha,P.composition),
      artifactId:candidate.artifactId,artifactDigest:candidate.artifactDigest,buildId:candidate.buildId,
      buildRunId:candidate.buildRunId,previewUrl:candidate.previewUrl,previewChannel:candidate.previewChannelId,
      hostingVersion:proof.liveHostingVersion,files:candidate.expectedSiteFileCount}};
  function validateCurrent(h){
    assert.equal(blobAt(h,P.transport),approvalBlob,'COMPOSITE_LIVE_AUTHORITY_REPLACED');
    assert.deepEqual(pinSet(h),ownerPins,'RELEASE_OWNER_DRIFT');
    assert.equal(git('diff','--name-only',candidate.sourceSha,h,'--',...g.PINNED_OWNER_PATHS),'','COMPOSITE_SOURCE_OR_QA_OWNER_DRIFT');
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
      validateCurrent(remote());
      const [build,artifact,qa,qaArtifact,current]=await Promise.all([
        github('actions/runs/'+candidate.buildRunId),github('actions/artifacts/'+candidate.artifactId),
        github('actions/runs/'+candidate.previewQa.runId),github('actions/artifacts/'+candidate.previewQa.receiptArtifactId),
        github('actions/runs/'+runId)]);
      g.validateArtifact(candidate,build,artifact);g.validatePreviewQa(candidate,qa,qaArtifact);
      assert.equal(current.head_sha,proof.headSha);assert.equal(current.head_branch,branch);
      assert.equal(current.path,'.github/workflows/gravicentra-i66-privileged-role-exact-live-promotion.yml');
      assert.ok(current.status==='in_progress'||(current.status==='completed'&&current.conclusion==='success'),'COMPOSITE_LIVE_RUN_NOT_EXECUTING');
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
    signedReceipt:async j=>{
      const proposed=compositeReceipt(j,runId),h=remote();validateCurrent(h);
      const stored=optional(h,rp);let commit;
      if(stored){assert.deepEqual(stored,proposed,'COMPOSITE_EXISTING_RECEIPT_DRIFT');commit=git('log','-1','--format=%H',h,'--',rp);}
      else{assert.deepEqual(optional(h,jp),j);commit=await casCommit(h,'release(i66): sign four-function composite LIVE receipt '+generation,
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
      verifyProspectiveChanges(h,changes);
      assert.equal(await provider.current('live'),request.target.hostingVersion,'PHYSICAL_DRIFT_DURING_METADATA_GUARD');
      verifyBackend();
      try{await casCommit(h,'release(i66): COMMITTED same-artifact composite, backend rollback and synchronized execution',changes);return next;}
      catch(e){if(attempt===2||!String(e.message).includes('HEAD_CAS_FAILED'))throw e;}
    }},verifyCommitted
  };
  const result=await acceptComposite(io,request,proof);await verifyCommitted(result);
  console.log('I66_COMPOSITE_FINAL_PHASE='+result.phase+' GENERATION='+generation+' BACKEND_FUNCTIONS=4');
}
async function recordCompositeRollback(){
  assert.equal(process.env.GITHUB_REPOSITORY,repository);assert.equal(process.env.GITHUB_REF_NAME,branch);
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
    const s=JSON.parse(execFileSync('gcloud',['run','services','describe',row.service,'--region',row.region,
      '--project','ays-orbit-360-lab','--format=json'],{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:60000}));
    const active=(s.status?.traffic||s.traffic||[]).filter(x=>Number(x.percent)>0);
    assert.equal(active.length,1);assert.equal(Number(active[0].percent),100);
    assert.equal(String(active[0].revisionName||active[0].revision),row.previousRevision,'COMPOSITE_ROLLBACK_REVISION_NOT_RESTORED');
    backend.push({name:row.name,region:row.region,revision:row.previousRevision,trafficPercent:100});
  }
  const fresh=remote();assert.deepEqual(optional(fresh,jp),j,'COMPOSITE_ROLLBACK_JOURNAL_CAS');
  assert.equal(jsonAt(fresh,P.transport).currentPhysicalHostingRelease.sourceSha,j.request.previous.sourceSha);
  await casCommit(fresh,'release(i66): record verified composite compensation without advancing physical control',
    {[jp]:{...j,phase:'ROLLED_BACK',rollback:{physical,backend,verified:true,runId}}});
  console.log('I66_COMPOSITE_COMPENSATION_RECORDED_GENERATION='+attempt.generation);
}
if(require.main===module){
  const action=process.argv[2];
  const execution=action==='--accept-composite-live'?runCompositeAcceptance():
    action==='--authorize-composite-rollback'?authorizeCompositeRollback():action==='--record-composite-rollback'?recordCompositeRollback():
    action===undefined?run():Promise.reject(Error('RELEASE_OWNER_UNKNOWN_OPERATION'));
  execution.catch(e=>{console.error('I66_FRONTEND_PROMOTION_HOLD '+String(e.message).split('\n')[0].slice(0,150));process.exitCode=1;});
}
module.exports={nextCompositeGeneration,assertCompositeRollbackAllowed};
