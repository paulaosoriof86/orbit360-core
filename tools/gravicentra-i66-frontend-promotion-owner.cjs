'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {execFileSync}=require('node:child_process');
const {P,genName,serial,blob,closeFiles,physicalGuard}=require('./gravicentra-i66-frontend-control.cjs');
const {promote}=require('./gravicentra-i66-frontend-promotion-transaction.cjs');
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
      const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'gi-i66-guard-')),wt=path.join(scratch,'tree');
      try{
        git('worktree','add','--quiet','--detach',wt,h);
        for(const [file,obj] of Object.entries(changes))fs.writeFileSync(path.join(wt,file),serial(obj));
        execFileSync(process.execPath,[P.guard],{cwd:wt,stdio:'inherit',timeout:420000});
      }finally{if(fs.existsSync(wt))git('worktree','remove','--force',wt);fs.rmSync(scratch,{recursive:true,force:true});}
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
run().catch(e=>{console.error('I66_FRONTEND_PROMOTION_HOLD '+String(e.message).split('\n')[0].slice(0,150));process.exitCode=1;});
