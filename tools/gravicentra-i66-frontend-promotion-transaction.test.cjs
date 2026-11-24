'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {promote,digest}=require('./gravicentra-i66-frontend-promotion-transaction.cjs');
const release=c=>({sourceSha:c.repeat(40),sourceTree:'5'.repeat(40),manifestBlob:'6'.repeat(40),compositionBlob:'7'.repeat(40),
  artifactDigest:'sha256:'+c.repeat(64),artifactId:parseInt(c,16),hostingVersion:'sites/ays-orbit-360-lab/versions/'+c,
  files:3,buildId:'build-'+c});
function fixture(){
  const previous=release('a'),target=release('b'),req={schema:'GI_I66_FRONTEND_PROMOTION_V1',generation:1,gate:'I6.6',scope:'FRONTEND_ONLY',
    approvalBlob:'c'.repeat(40),guardBlob:'d'.repeat(40),previousReceiptBlob:'e'.repeat(40),previous,target};
  const state={current:previous.hostingVersion,j:null,clones:0,consumed:[]};
  const io={
    readJournal:async()=>state.j,
    readControl:async()=>({generation:0,physical:previous,receiptBlob:req.previousReceiptBlob,guardBlob:'d'.repeat(40),consumed:state.consumed}),
    validateProofs:async()=>{},verifyPreview:async r=>r,
    verifyLive:async r=>{assert.equal(state.current,r.hostingVersion);return {...r,firebase:r.files,custom:r.files,manifestDigest:'sha256:'+'9'.repeat(64)};},
    currentVersion:async()=>state.current,assertOwnership:async()=>{},assertCompensationOwnership:async()=>{},
    cas:async(old,next)=>{assert.deepEqual(old,state.j);state.j=next;return next;},
    clone:async(to,from)=>{assert.equal(state.current,from);state.current=to;state.clones++;},
    liveUiProof:async()=>({result:'PASS',buildId:target.buildId,receiptBlob:'2'.repeat(40)}),
    signedReceipt:async()=>({verified:true,blob:'3'.repeat(40),commit:'4'.repeat(40)}),
    commitAll:async(old,next)=>{assert.deepEqual(old,state.j);state.j=next;state.consumed.push(req.approvalBlob);return next;},
    verifyCommitted:async j=>{assert.equal(j.phase,'COMMITTED');assert.equal(state.current,target.hostingVersion);},
    incident:async(old,next)=>{assert.deepEqual(state.j,old);state.j=next;}
  };
  return {req,state,io};
}
test('verified commit and idempotent retry clone once',async()=>{const f=fixture();await promote(f.io,f.req);await promote(f.io,f.req);assert.equal(f.state.clones,1);});
for(const [title,mutate] of [
  ['stale guard',f=>f.req.guardBlob='0'.repeat(40)],
  ['consumed authorization',f=>f.state.consumed.push(f.req.approvalBlob)],
  ['digest drift',f=>f.io.verifyPreview=async r=>({...r,artifactDigest:'sha256:'+'0'.repeat(64)} )],
  ['foreign current release',f=>f.state.current='third'],
  ['concurrent HEAD CAS',f=>f.io.cas=async()=>{throw Error('HEAD_CAS_FAILED');}]
])test(title,async()=>{const f=fixture();mutate(f);await assert.rejects(promote(f.io,f.req));assert.equal(f.state.clones,0);});
for(const [title,mutate] of [
  ['commit failure compensates',f=>f.io.commitAll=async()=>{throw Error('HEAD_CAS_FAILED');}],
  ['missing signed receipt',f=>f.io.signedReceipt=async()=>({})],
  ['missing real UI receipt',f=>f.io.liveUiProof=async()=>({})],
  ['incomplete custom origin',f=>{const verify=f.io.verifyLive;f.io.verifyLive=async r=>({...await verify(r),custom:r.sourceSha===f.req.target.sourceSha?0:r.files});}]
])test(title,async()=>{const f=fixture();mutate(f);await assert.rejects(promote(f.io,f.req));assert.equal(f.state.j.phase,'ROLLED_BACK');assert.equal(f.state.clones,2);});
test('interrupted after Hosting resumes without another clone',async()=>{const f=fixture();f.state.j={phase:'PROMOTING',key:digest(f.req),generation:1,request:f.req};f.state.current=f.req.target.hostingVersion;await promote(f.io,f.req);assert.equal(f.state.clones,0);});
test('concurrent third version during compensation remains untouched',async()=>{const f=fixture();f.io.liveUiProof=async()=>{f.state.current='third';throw Error('INTERRUPTED');};await assert.rejects(promote(f.io,f.req));assert.equal(f.state.current,'third');assert.equal(f.state.j.phase,'INCIDENT');});
test('lost reply after committed metadata cannot trigger rollback',async()=>{const f=fixture(),commit=f.io.commitAll;f.io.commitAll=async(...args)=>{await commit(...args);throw Error('LOST_ACK');};assert.equal((await promote(f.io,f.req)).phase,'COMMITTED');assert.equal(f.state.clones,1);});

const frontendOwner=require('./gravicentra-i66-frontend-promotion-owner.cjs');
function financialAuthority(phase='preview'){
  const physical={...release('a'),generation:3,receiptGitBlobSha:'e'.repeat(40)},authorityBlob='f'.repeat(40);
  const target={...release('b'),buildId:'gi-i66-bbbbbbbbbbbb-123456789abc',buildRunId:101,
    previewUrl:'https://ays-orbit-360-lab--gi-i66-rc-101-abc.web.app',previewChannel:'gi-i66-rc-101'};
  const raw={scopeId:frontendOwner.FINANCIAL_SCOPE,gate:'I6.6',approvedByDirection:true,readOnlyQa:true,
    backendDeployAllowed:false,businessWritesAllowed:false,generation:4,
    status:phase==='preview'?'DIRECTION_AUTHORIZED_EXACT_PREVIEW_READONLY':'DIRECTION_APPROVED_EXACT_PREVIEW',
    previousReceiptBlob:physical.receiptGitBlobSha,previousHostingVersion:physical.hostingVersion,previousArtifactDigest:physical.artifactDigest,
    target,ownerPins:Object.fromEntries(frontendOwner.financialQaPaths().map(p=>[p,'1'.repeat(40)]))};
  const request={scope:'FRONTEND_ONLY',generation:4,approvalBlob:authorityBlob,previousReceiptBlob:physical.receiptGitBlobSha,previous:physical,target};
  const journal={phase:'VERIFIED',generation:4,key:digest(request),request,
    physical:{...target,firebase:target.files,custom:target.files,manifestDigest:'sha256:'+'8'.repeat(64)}};
  return {raw,authorityBlob,physical,journal:phase==='live'?journal:null,phase};
}
test('financial Preview authority cannot change data, backend, accepted predecessor or the frozen QA owner set',()=>{
  assert.doesNotThrow(()=>frontendOwner.validateFinancialAuthority(financialAuthority()));
  for(const mutate of [f=>f.raw.generation=3,f=>f.raw.approvedByDirection=false,f=>f.raw.businessWritesAllowed=true,
    f=>f.raw.backendDeployAllowed=true,f=>f.raw.previousReceiptBlob='0'.repeat(40),f=>f.raw.ownerPins={},
    f=>f.raw.target.sourceSha=f.physical.sourceSha,f=>f.raw.target.previewUrl='https://foreign.example',
    f=>f.raw.status='DIRECTION_APPROVED_EXACT_PREVIEW']){
    const f=financialAuthority();mutate(f);assert.throws(()=>frontendOwner.validateFinancialAuthority(f));
  }
});
test('financial LIVE readback requires the exact physically verified journal and cannot accept PREPARED or another artifact',()=>{
  assert.doesNotThrow(()=>frontendOwner.validateFinancialAuthority(financialAuthority('live')));
  for(const mutate of [f=>f.journal=null,f=>f.journal.phase='PREPARED',f=>f.journal.phase='COMMITTED',
    f=>f.journal.request.scope='COMPOSITE',f=>f.journal.request.approvalBlob='0'.repeat(40),
    f=>f.journal.physical.custom=0,f=>f.journal.key='0'.repeat(64),f=>f.journal.request.target={...f.raw.target,sourceSha:'9'.repeat(40)}]){
    const f=financialAuthority('live');mutate(f);assert.throws(()=>frontendOwner.validateFinancialAuthority(f));
  }
});
test('a failed financial UI proof follows the existing exact artifact compensation instead of closing a partial release',async()=>{
  const f=fixture();f.io.liveUiProof=async()=>{throw Error('FINANCIAL_QA_FINAL_AUTHORITY_DRIFT');};
  await assert.rejects(promote(f.io,f.req),/FINANCIAL_QA_FINAL_AUTHORITY_DRIFT/);
  assert.equal(f.state.j.phase,'ROLLED_BACK');assert.equal(f.state.current,f.req.previous.hostingVersion);
  assert.equal(f.state.clones,2);assert.equal(f.state.consumed.length,0);
});
test('financial QA admits E5 after a proven E4 rollback to E3 but rejects incidents, missing attempts and a false restored artifact',()=>{
  const previous=financialAuthority('live'),rolled={...previous.journal,phase:'ROLLED_BACK',
    rollback:{...previous.physical,firebase:previous.physical.files,custom:previous.physical.files,manifestDigest:'sha256:'+'9'.repeat(64)}};
  for(const phase of ['preview','live']){
    const f=financialAuthority(phase);f.raw.generation=5;f.attemptHistory=[structuredClone(rolled)];
    if(f.journal){f.journal.generation=f.journal.request.generation=5;f.journal.key=digest(f.journal.request);}
    assert.doesNotThrow(()=>frontendOwner.validateFinancialAuthority(f));
    for(const mutate of [x=>x.attemptHistory=[],x=>x.attemptHistory[0].phase='INCIDENT',x=>x.attemptHistory[0].phase='VERIFIED',
      x=>x.attemptHistory[0].rollback.custom=0,x=>x.attemptHistory[0].rollback.artifactDigest='sha256:'+'0'.repeat(64)]){
      const bad=structuredClone(f);mutate(bad);assert.throws(()=>frontendOwner.validateFinancialAuthority(bad));
    }
  }
});

function financialRemoteFixture(phase='preview'){
  const fs=require('node:fs'),control=require('./gravicentra-i66-frontend-control.cjs'),{P,genName,blob}=control;
  const cp=JSON.parse(fs.readFileSync(P.cp)),physical=cp.i66FrontendReleaseHead,head='7'.repeat(40),workflowHead='8'.repeat(40);
  const f=financialAuthority(phase);f.physical=physical;f.raw.generation=physical.generation+1;
  f.raw.previousReceiptBlob=physical.receiptGitBlobSha;f.raw.previousHostingVersion=physical.hostingVersion;
  f.raw.previousArtifactDigest=physical.artifactDigest;
  f.raw.ownerPins=Object.fromEntries(frontendOwner.financialQaPaths().map(p=>[p,blob(fs.readFileSync(p))]));
  f.raw.target.sourceSha='9'.repeat(40);
  f.authorityBlob=blob(JSON.stringify(f.raw));
  if(f.journal){f.journal.generation=f.raw.generation;f.journal.request.generation=f.raw.generation;
    f.journal.request.approvalBlob=f.authorityBlob;f.journal.request.previousReceiptBlob=physical.receiptGitBlobSha;
    f.journal.request.previous={...physical,files:physical.hostedFilesEachOrigin};f.journal.request.target=f.raw.target;
    f.journal.key=digest(f.journal.request);f.journal.physical={...f.raw.target,firebase:f.raw.target.files,custom:f.raw.target.files,
      manifestDigest:'sha256:'+'1'.repeat(64)};}
  const env={GITHUB_REPOSITORY:'paulaosoriof86/orbit360-core',GITHUB_REF_NAME:'recovery/fase-a-clean-20260831',GITHUB_SHA:workflowHead,GITHUB_RUN_ID:'1001'};
  const responseFiles=new Map([[P.authority,JSON.stringify(f.raw)]]);
  if(f.journal)responseFiles.set(genName(f.raw.generation,'JOURNAL'),JSON.stringify(f.journal));
  const execution={id:1001,path:phase==='preview'?'.github/workflows/gravicentra-i66-preview-performance-readonly.yml':'.github/workflows/gravicentra-delta-66-exact-live-clone.yml',
    head_sha:workflowHead,head_branch:env.GITHUB_REF_NAME,status:'in_progress'};
  const build={id:f.raw.target.buildRunId,path:'.github/workflows/gravicentra-release-delta-66-package.yml',head_sha:f.raw.target.sourceSha,
    head_branch:env.GITHUB_REF_NAME,status:'completed',conclusion:'success'};
  const artifact={id:f.raw.target.artifactId,digest:f.raw.target.artifactDigest,workflow_run:{id:build.id,head_sha:build.head_sha},expired:false};
  const api=async route=>{
    if(route.startsWith('git/ref/'))return {object:{sha:head}};
    if(route==='actions/runs/1001')return execution;
    if(route==='actions/runs/'+build.id)return build;
    if(route==='actions/artifacts/'+artifact.id)return artifact;
    if(route.startsWith('contents/')){
      const p=decodeURIComponent(route.slice(9).split('?')[0]);
      if(p===genName(f.raw.generation,'JOURNAL')&&!responseFiles.has(p))throw Error('GITHUB_PROVIDER_HTTP_404');
      const text=responseFiles.has(p)?responseFiles.get(p):fs.readFileSync(p);
      return {path:p,sha:blob(text),size:Buffer.byteLength(text),encoding:'base64',content:Buffer.from(text).toString('base64')};
    }
    throw Error('UNEXPECTED_READ_API_ROUTE');
  };
  const gitRead=(...args)=>args[0]==='show'?fs.readFileSync(args[1].slice(41)):Buffer.from('');
  const readMarker=async origin=>{const pin=phase==='preview'&&origin!==f.raw.target.previewUrl?physical:f.raw.target;
    return {sourceSha:pin.sourceSha,buildId:pin.buildId,gate:'I6.6',product:'Gravicentra Insurance'};};
  return {...f,env,api,gitRead,readMarker,io:fs,responseFiles,artifact,execution,build};
}
test('financial authority resolution re-reads the exact remote artifact, active physical receipt and frozen QA bytes before and after',async()=>{
  for(const phase of ['preview','live']){
    const f=financialRemoteFixture(phase),before=await frontendOwner.resolveFinancialQa(phase,f);
    assert.equal(before.stage,'before');assert.equal(before.target.sourceSha,f.raw.target.sourceSha);
    assert.equal(before.authorityBlob,f.authorityBlob);
    const after=await frontendOwner.resolveFinancialQa(phase,{...f,stage:'after',expected:before});
    assert.equal(after.stage,'after');assert.equal(after.physicalPhaseKey,f.journal?.key||null);
  }
});
test('remote authority, executing workflow, built QA bytes, artifact digest and hosted origin drift fail closed',async()=>{
  for(const mutate of [f=>f.artifact.digest='sha256:'+'0'.repeat(64),f=>f.build.conclusion='failure',
    f=>f.execution.path='.github/workflows/foreign.yml',f=>f.execution.status='completed',
    f=>f.gitRead=(...a)=>a[0]==='show'?Buffer.from('different build owner'):Buffer.from(''),
    f=>f.readMarker=async()=>({sourceSha:'0'.repeat(40),buildId:f.raw.target.buildId,gate:'I6.6',product:'Gravicentra Insurance'})]){
    const f=financialRemoteFixture();mutate(f);await assert.rejects(frontendOwner.resolveFinancialQa('preview',f));
  }
  const f=financialRemoteFixture(),before=await frontendOwner.resolveFinancialQa('preview',f);
  f.raw.approvedByDirection=false;f.responseFiles.set(require('./gravicentra-i66-frontend-control.cjs').P.authority,JSON.stringify(f.raw));
  await assert.rejects(frontendOwner.resolveFinancialQa('preview',{...f,stage:'after',expected:before}));
});
