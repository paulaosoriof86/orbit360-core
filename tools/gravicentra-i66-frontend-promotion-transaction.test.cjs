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
function ownerSelectionRepo(check){
  const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{execFileSync}=require('node:child_process');
  const cwd=fs.mkdtempSync(path.join(os.tmpdir(),'offline-financial-owner-selection-'));
  const gitRead=(...args)=>execFileSync('git',args,{cwd,stdio:['ignore','pipe','pipe'],maxBuffer:8*1024*1024});
  const write=(p,text)=>{fs.mkdirSync(path.dirname(path.join(cwd,p)),{recursive:true});fs.writeFileSync(path.join(cwd,p),text);};
  const commit=()=>{gitRead('add','--all');gitRead('-c','user.name=Offline Fixture','-c','user.email=fixture@example.invalid','commit','-qm','offline selection fixture');return String(gitRead('rev-parse','HEAD')).trim();};
  try{
    gitRead('init','--quiet');for(const p of frontendOwner.financialQaPaths('COMPOSITE'))write(p,'offline fixture owner '+p+'\n');
    write('functions/not-an-explicit-qa-pin.js','offline function leaf\n');
    write('orbit360-platform/test-leaf.js','offline platform leaf\n');
    write('orbit360-platform/docs/recovery/orbit360-recovery-state-v1.json','{"offline":1}\n');
    const source=commit();return check({cwd,source,gitRead,write,commit,fs,path});
  }finally{fs.rmSync(cwd,{recursive:true,force:true});}
}
test('composite financial pins select exact regular blobs and treat only historical storage.rules as optional',()=>ownerSelectionRepo(f=>{
  const selected=frontendOwner.financialQaOwnerSelection(f.source,f);
  assert.deepEqual(selected.paths,frontendOwner.financialQaPaths('COMPOSITE'));
  assert.deepEqual(selected.optionalAbsent,['storage.rules']);
  assert.ok(!selected.paths.some(p=>['functions','orbit360-platform'].includes(p)||p.startsWith(':(')));
  for(const p of selected.paths)assert.equal(selected.pins[p],String(f.gitRead('rev-parse',f.source+':'+p)).trim());
  f.write('storage.rules','offline optional owner\n');const withOptional=f.commit();
  assert.ok(frontendOwner.financialQaOwnerSelection(withOptional,f).paths.includes('storage.rules'));
  f.fs.rmSync(f.path.join(f.cwd,selected.paths[0]));const missing=f.commit();
  assert.throws(()=>frontendOwner.financialQaOwnerSelection(missing,f),/FINANCIAL_QA_REQUIRED_OWNER_ABSENT/);
  assert.throws(()=>frontendOwner.financialQaPaths('COMPOSITE',['missing-arbitrary-owner.cjs']),/UNKNOWN_OPTIONAL_OWNER/);
}));
test('complete financial composition protects directory leaves outside individual pins and excludes only recovery state',()=>ownerSelectionRepo(f=>{
  const check=()=>frontendOwner.assertFinancialComposition(f.source,f.source,f);
  assert.doesNotThrow(check);
  for(const p of ['functions/not-an-explicit-qa-pin.js','orbit360-platform/test-leaf.js',
    'tools/gravicentra-i66-frontend-promotion-owner.cjs']){
    f.write(p,'changed offline owner\n');assert.throws(check);f.gitRead('restore','--',p);
  }
  f.write('orbit360-platform/docs/recovery/orbit360-recovery-state-v1.json','{"offline":2}\n');
  assert.doesNotThrow(check);const stateOnly=f.commit();
  assert.doesNotThrow(()=>frontendOwner.assertFinancialComposition(f.source,stateOnly,f));
  f.write('functions/not-an-explicit-qa-pin.js','committed changed leaf\n');const changed=f.commit();
  assert.throws(()=>frontendOwner.assertFinancialComposition(f.source,changed,f));
}));
test('new storage.rules or an untracked protected directory leaf cannot silently bypass the frozen composition',()=>ownerSelectionRepo(f=>{
  f.write('functions/new-untracked-leaf.js','new offline function\n');
  assert.throws(()=>frontendOwner.assertFinancialComposition(f.source,f.source,f),/UNTRACKED_COMPOSITION_FILE/);
  f.fs.rmSync(f.path.join(f.cwd,'functions/new-untracked-leaf.js'));
  f.write('storage.rules','new offline rules\n');
  assert.throws(()=>frontendOwner.assertFinancialComposition(f.source,f.source,f),/UNTRACKED_COMPOSITION_FILE/);
  f.gitRead('add','storage.rules');assert.throws(()=>frontendOwner.assertFinancialComposition(f.source,f.source,f));
  const changed=f.commit();assert.throws(()=>frontendOwner.assertFinancialComposition(f.source,changed,f));
}));
test('each release-owner command invoked by either deployment workflow dispatches to its real action and unknown commands fail closed',async()=>{
  const fs=require('node:fs'),actions=new Set();
  for(const p of ['.github/workflows/gravicentra-delta-66-exact-live-clone.yml',
    '.github/workflows/gravicentra-i66-privileged-role-exact-live-promotion.yml']){
    for(const m of fs.readFileSync(p,'utf8').matchAll(/node tools\/gravicentra-i66-frontend-promotion-owner\.cjs(?:[ \t]+(--[a-z-]+))?/g))actions.add(m[1]);
  }
  assert.deepEqual([...actions].sort(),[undefined,'--verify-composite-financial-preview','--accept-composite-live','--authorize-composite-rollback','--record-composite-rollback'].sort());
  const map={'--verify-composite-financial-preview':'verifyCompositeFinancialPreview','--accept-composite-live':'runCompositeAcceptance',
    '--authorize-composite-rollback':'authorizeCompositeRollback','--record-composite-rollback':'recordCompositeRollback'};
  for(const action of actions){const calls=[],handlers=Object.fromEntries(['run',...Object.values(map)].map(name=>[name,async()=>calls.push(name)]));
    await frontendOwner.dispatchReleaseAction(action,handlers);assert.deepEqual(calls,[action===undefined?'run':map[action]]);}
  await assert.rejects(frontendOwner.dispatchReleaseAction('--not-authorized',{}),/RELEASE_OWNER_UNKNOWN_OPERATION/);
});
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

// Transport recovery: no new product writes, no weakened release evidence.
const recoveryOwner=require('./gravicentra-i66-frontend-promotion-owner.cjs');
const lostTransport=()=>Object.assign(new TypeError('fetch failed'),{cause:{code:'ECONNRESET'}});
async function withLocalCasFailure(mode,check){
  const http=require('node:http');let posts=0,commits=0,current='expected';
  const server=http.createServer((req,res)=>{
    if(req.method==='POST'){
      posts++;req.resume();
      req.once('end',()=>{
        if(mode==='BEFORE_COMMIT'&&posts===1){req.socket.destroy();return;}
        if(current!=='expected'){res.writeHead(409);res.end('{}');return;}
        current='exact';commits++;
        if(mode==='AFTER_COMMIT'&&posts===1){req.socket.destroy();return;}
        res.setHeader('Content-Type','application/json');res.end(JSON.stringify({sha:'exact'}));
      });
    }else{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(current==='exact'?{status:'EXACT_COMMIT',sha:'exact'}:{status:'UNCHANGED'}));}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  try{await check({
    write:async()=>{const r=await fetch(origin,{method:'POST',headers:{Connection:'close'},body:'synthetic-cas'});assert.equal(r.status,200);return (await r.json()).sha;},
    readback:async()=>{const r=await fetch(origin,{headers:{Connection:'close'}});return r.json();},
    verifySignature:async sha=>assert.equal(sha,'exact'),pause:async()=>{}
  },()=>({posts,commits}));}finally{await new Promise(resolve=>server.close(resolve));}
}
test('real lost HTTP response after CAS adopts the one exact commit without a second POST',async()=>{
  await withLocalCasFailure('AFTER_COMMIT',async(io,count)=>{assert.equal(await recoveryOwner.commitWithReadback(io),'exact');assert.deepEqual(count(),{posts:1,commits:1});});
});
test('real HTTP failure before CAS retries only after unchanged readback and still commits once',async()=>{
  await withLocalCasFailure('BEFORE_COMMIT',async(io,count)=>{assert.equal(await recoveryOwner.commitWithReadback(io),'exact');assert.deepEqual(count(),{posts:2,commits:1});});
});
test('an unreadable acknowledgement state never permits a second write',async()=>{
  let writes=0,reads=0;
  await assert.rejects(recoveryOwner.commitWithReadback({write:async()=>{writes++;throw lostTransport();},
    readback:async()=>{reads++;throw lostTransport();},verifySignature:async()=>{},pause:async()=>{}}),/fetch failed/);
  assert.equal(writes,1);assert.equal(reads,3);
});
test('a foreign concurrent commit is never adopted or overwritten after a transport failure',async()=>{
  let writes=0;await assert.rejects(recoveryOwner.commitWithReadback({write:async()=>{writes++;throw lostTransport();},
    readback:async()=>({status:'FOREIGN_COMMIT'}),verifySignature:async()=>{},pause:async()=>{}}),/RELEASE_HEAD_CAS_FAILED/);assert.equal(writes,1);
});
test('a signature network failure rechecks and verifies the exact commit without replaying its write',async()=>{
  let writes=0,signatures=0,reads=0;const sha=await recoveryOwner.commitWithReadback({write:async()=>{writes++;return 'exact';},
    readback:async()=>{reads++;return {status:'EXACT_COMMIT',sha:'exact'};},
    verifySignature:async()=>{if(++signatures===1)throw lostTransport();},pause:async()=>{}});
  assert.equal(sha,'exact');assert.deepEqual({writes,signatures,reads},{writes:1,signatures:2,reads:1});
});
test('an invalid signature and an HTTP permission denial do not become transport retries',async()=>{
  for(const reason of ['GITHUB_SIGNATURE_UNVERIFIED','GITHUB_PROVIDER_HTTP_403']){
    let writes=0,reads=0;await assert.rejects(recoveryOwner.commitWithReadback({write:async()=>{writes++;return 'exact';},
      readback:async()=>{reads++;return {status:'EXACT_COMMIT',sha:'exact'};},verifySignature:async()=>{throw Error(reason);},pause:async()=>{}}),new RegExp(reason));
    assert.equal(writes,1);assert.equal(reads,0);
  }
});
test('transport recovery has a three-CAS ceiling and diagnostics contain codes only',async()=>{
  let writes=0;const events=[];await assert.rejects(recoveryOwner.commitWithReadback({write:async()=>{writes++;throw lostTransport();},
    readback:async()=>({status:'UNCHANGED'}),verifySignature:async()=>{},pause:async()=>{},diagnostic:x=>events.push(x)}),/fetch failed/);
  assert.equal(writes,3);assert.equal(events.length,3);assert.ok(events.every(e=>Object.keys(e).sort().join(',')==='attempt,code,operation'&&e.code==='ECONNRESET'));
  assert.equal(recoveryOwner.transportCode({message:'sensitive-body',cause:{code:'Bearer private'}}),null);
});
test('long child supervision leaves the parent event loop running and propagates failure',async()=>{
  let heartbeat=false;const timer=setTimeout(()=>{heartbeat=true;},20);
  await recoveryOwner.runReleaseChild(process.execPath,['-e','setTimeout(()=>{},100)'],{stdio:'ignore',timeout:1000});
  clearTimeout(timer);assert.equal(heartbeat,true);
  await assert.rejects(recoveryOwner.runReleaseChild(process.execPath,['-e','process.exit(7)'],{stdio:'ignore',timeout:1000}),/RELEASE_SUBPROCESS_FAILED_7/);
});

const focalOwner=require('./gravicentra-i66-frontend-promotion-owner.cjs');
const focalControlOwner=require('./gravicentra-i66-frontend-control.cjs');
const focalPkg=require('./gravicentra-i6-6-cloud-build-package.cjs');
const focalPreviewOwner=require('./gravicentra-i6-6-cloud-build-preview.cjs');
const sourceTree=require('./gravicentra-i6-6-focal-hosting-composition.cjs');
const nativeCi=require('node:child_process');
const focalFixtureHead='118e68f2ae8a29628ab137a6cc2fb3d0afe4c0c8';
let focalPlanCache;
function nativeFocalFixture(){
  const cwd=require('node:path').join(__dirname,'..');
  const pp=focalPlanCache||=sourceTree.plan(cwd,focalFixtureHead);
  const previewId='00000000-0000-4000-8000-000000000001',build='00000000-0000-4000-8000-000000000002';
  const channel='gi-i66-e'+pp.requestVersion+'-'+pp.requestDigest.slice(0,12);
  const archive={uri:'gs://'+focalPkg.C.bucket+'/'+sourceTree.prefix(pp,build)+focalPkg.F.archive,
    bytes:12345,sha256:'2'.repeat(64),generation:'12345'};
  const p={schema:focalPreviewOwner.focalPreviewSchema,provider:focalPkg.C.provider,scope:'HOSTING_PREVIEW_ONLY',
    packagePlan:pp,sourceSha:pp.sourceSha,mechanismSha:focalFixtureHead,packageBuildId:build,requestVersion:pp.requestVersion,
    packageArtifact:archive,channel};
  const buildId='gi-i66-'+pp.sourceSha.slice(0,12)+'-'+pp.compositionTree.slice(0,12);
  const proof={schema:'GI_I66_FOCAL_HOSTING_PREVIEW_PROOF_V1',executionBuildId:previewId,packageBuildId:build,
    planDigest:focalPkg.digest(p),requestDigest:pp.requestDigest,compositionTree:pp.compositionTree,packageArtifact:archive,
    buildId,scope:'HOSTING_PREVIEW_ONLY',origin:'https://ays-orbit-360-lab--'+channel+'-fixture.web.app',
    hostingVersion:'sites/ays-orbit-360-lab/versions/fixture'};
  const composition=nativeCi.execFileSync('git',['rev-parse',pp.sourceSha+':'+focalControlOwner.P.composition],{cwd,encoding:'utf8'}).trim();
  return {p,proof,previewId,composition,target:focalOwner.focalTarget(p,proof,previewId,composition)};
}
test('native focal admission supplies the canonical request and exact product tree to the existing transaction',async()=>{
  const f=nativeFocalFixture(),control=focalOwner.focalControl(focalFixtureHead,f.p);
  assert.equal(control.focalRequestDigest,'55e78a70916bbcd4dffa3dd57a4e60f43c3ee4d2fc214471148047559322b1c6');
  assert.equal(control.focalCompositionTree,'072013af1a8ae12569611a8828179db9b4a63ed3');
  const r={schema:'GI_I66_FRONTEND_PROMOTION_V1',gate:'I6.6',scope:'FRONTEND_ONLY',generation:4,guardBlob:control.guardBlob,
    previousReceiptBlob:control.receiptBlob,previous:control.physical,approvalBlob:'f'.repeat(40),target:f.target};
  require('./gravicentra-i66-frontend-promotion-transaction.cjs').validateRequest(r,control);
  assert.deepEqual(r.previous,f.p.packagePlan.baseline);
  assert.equal(await focalOwner.dispatchReleaseAction('--promote-focal',{runFocal:async()=>'focal',run:()=>assert.fail('Actions')}),'focal');
  for(const patch of [{compositionTree:'7'.repeat(40)},{origin:f.p.packagePlan.baseline.previewUrl},{scope:'COMPOSITE'},
    {packageArtifact:{...f.p.packageArtifact,generation:'678'}},{executionBuildId:f.p.packageBuildId}]){
    assert.throws(()=>focalOwner.focalTarget(f.p,{...f.proof,...patch},f.previewId,f.composition));
  }
});
test('focal role acceptance requires both observed identities, checks after reload, exact artifact and no external effects',()=>{
  const {target:t}=nativeFocalFixture();
  const report={schema:'GI_I66_FOCAL_COMPARISON_ROLE_READBACK_V1',phase:'preview',result:'PASS',requestDigest:t.focalHosting.requestDigest,
    compositionTree:t.compositionTree,artifactDigest:t.artifactDigest,hostingVersion:t.hostingVersion,sourceSha:t.sourceSha,buildId:t.buildId,
    origin:t.previewUrl,physicalPhaseKey:null,businessWrites:0,externalCommunications:0,backendChanges:0,roles:[]};
  for(const [i,role] of ['direccion','operativo'].entries()){
    const actorSha256=String(i+1).repeat(64),s={role,actorSha256,buildId:t.buildId,origin:t.previewUrl,authenticated:true,tenant:'alianzas-soluciones',country:'GT',
      implicitRecipientBlocked:true,invalidProposalBlocked:true,mixedCurrenciesBlocked:true,exactCentavos:true,changedApprovalBlocked:true,
      emailComposerRevalidated:true,canonicalComparisonValid:true,independentDraftAvailable:true};
    report.roles.push({role,actorSha256,beforeReload:s,afterReload:{...s},fixtureKind:'synthetic',externalCommunications:0,businessWrites:0});
  }
  assert.equal(focalOwner.focalRoleProof(report,'preview',t,null),report);
  for(const change of [r=>r.roles.pop(),r=>r.roles[1].actorSha256=r.roles[0].actorSha256,r=>r.roles[1].afterReload.authenticated=false,
    r=>r.roles[0].afterReload.exactCentavos=false,r=>r.roles[1].beforeReload.emailComposerRevalidated=false,r=>r.externalCommunications++,
    r=>r.roles[0].businessWrites++,r=>r.roles[1].afterReload.origin='https://example.invalid',r=>r.artifactDigest='sha256:'+'3'.repeat(64)]){
    const copy=structuredClone(report);change(copy);assert.throws(()=>focalOwner.focalRoleProof(copy,'preview',t,null));
  }
  assert.throws(()=>focalOwner.focalRoleProof(report,'live',t,'3'.repeat(64)));
});
test('six-path closure excludes request35 owners and the previously rolled back journal',()=>{
  const {target}=nativeFocalFixture(),f=target.focalHosting,n=f.generation,{P,genName,releaseJournalPath}=focalControlOwner;
  const paths=[P.cp,P.state,P.transport,P.ledger,genName(n,'FOCAL_PROGRESS'),releaseJournalPath(n,f)];
  assert.doesNotThrow(()=>focalOwner.assertFocalPhasePaths(n,f,paths,true));
  for(const file of [genName(n,'JOURNAL'),genName(n,'PREVIEW_UI'),P.authority,'orbit360-platform/index.html']){
    assert.throws(()=>focalOwner.assertFocalPhasePaths(n,f,[...paths.slice(0,-1),file],true));
    assert.throws(()=>focalOwner.assertFocalPhasePaths(n,f,[file],false));
  }
});

test('synthetic E4 completes the shared transaction and six-document closure on R93 without consuming request35',async()=>{
  const f=nativeFocalFixture(),ctl=focalOwner.focalControl(focalFixtureHead,f.p),{P,genName,serial,blob,closeFiles,physicalGuard}=focalControlOwner;
  const readText=file=>nativeCi.execFileSync('git',['cat-file','blob',focalFixtureHead+':'+file],{encoding:'utf8',maxBuffer:32*1024*1024});
  const request={schema:'GI_I66_FRONTEND_PROMOTION_V1',gate:'I6.6',scope:'FRONTEND_ONLY',scopeId:'COTIZADOR_COMPARATIVO_DESTINATARIO',
    generation:4,guardBlob:ctl.guardBlob,previousReceiptBlob:ctl.receiptBlob,previous:ctl.physical,approvalBlob:'f'.repeat(40),target:f.target};
  const original=JSON.parse(readText(P.transport));
  const {io,state}=fixture();Object.assign(state,{current:request.previous.hostingVersion});
  let effective={};
  Object.assign(io,{readControl:()=>ctl,signedReceipt:async(j,ui)=>{
    const runId='sites/ays-orbit-360-lab/channels/live/releases/fixture';
    const receipt={schema:'GI_I66_SIGNED_FRONTEND_RECEIPT_V1',generation:4,scopeId:request.scopeId,authorization:request.approvalBlob,
      target:request.target,previous:request.previous,preview:j.preview,physical:j.physical,ui,runId};
    effective[genName(4,'RECEIPT')]=receipt;return {runId,commit:'2'.repeat(40),blob:blob(serial(receipt)),verified:true};
  },liveUiProof:async()=>({result:'PASS',buildId:f.target.buildId,receiptBlob:'2'.repeat(40)}),
  verifyLive:async r=>{assert.equal(state.current,r.hostingVersion);return {...r,firebase:r.files,custom:r.files,manifestDigest:'sha256:'+'9'.repeat(64)};},
  commitAll:async(j,next)=>{
    effective={...effective,...closeFiles(file=>JSON.parse(readText(file)),j,next)};
    state.j=next;return next;
  }});
  const j=await promote(io,request);assert.equal(j.phase,'COMMITTED');assert.equal(state.clones,1);
  const read={readFileSync:file=>Object.hasOwn(effective,file)?serial(effective[file]):readText(file)};
  physicalGuard(effective[P.cp],effective[P.state],effective[P.transport],read);
  for(const key of ['frontendPreviewRequest','operationalReleaseCandidate','scopedBackendPreviewI66','lastConsumedFrontendRelease'])
    assert.deepEqual(effective[P.transport][key],original[key]);
  assert.equal(read.readFileSync(genName(4,'JOURNAL')),readText(genName(4,'JOURNAL')));
  assert.equal(effective[genName(4,'FOCAL_PROGRESS')].releaseExecution.uiReceiptPath,genName(4,'FOCAL_HOSTING_LIVE_UI'));
});
test('uncertain focal closure keeps its verified journal for readback before any compensation',async()=>{
  const f=nativeFocalFixture(),ctl=focalOwner.focalControl(focalFixtureHead,f.p);
  const req={schema:'GI_I66_FRONTEND_PROMOTION_V1',gate:'I6.6',scope:'FRONTEND_ONLY',generation:4,approvalBlob:'f'.repeat(40),
    previousReceiptBlob:ctl.receiptBlob,guardBlob:ctl.guardBlob,previous:ctl.physical,target:f.target};
  const {state,io}=fixture();state.current=req.previous.hostingVersion;
  Object.assign(io,{readControl:()=>ctl,verifyLive:async r=>({...r,firebase:r.files,custom:r.files,manifestDigest:'sha256:'+'9'.repeat(64)}),
    liveUiProof:async()=>({result:'PASS',buildId:req.target.buildId,receiptBlob:'2'.repeat(40)}),
    commitAll:async()=>{throw Object.assign(new Error('unknown ACK'),{code:'FOCAL_CLOSURE_ACK_PENDING'});}});
  await assert.rejects(promote(io,req),{code:'FOCAL_CLOSURE_ACK_PENDING'});
  assert.equal(state.j.phase,'VERIFIED');assert.equal(state.clones,1);assert.equal(state.current,req.target.hostingVersion);
});
