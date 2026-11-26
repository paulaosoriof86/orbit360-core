'use strict';
// Causal offline tests of the existing publisher; no provider, consent or refs.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const owner=require('./gravicentra-i66-frontend-control.cjs'),native=require('./gravicentra-i6-6-cloud-build-operational.cjs'),pkg=require('./gravicentra-i6-6-cloud-build-package.cjs'),driver=require('./gravicentra-i6-6-proposal-application-signed-uat.cjs');
const clone=x=>JSON.parse(JSON.stringify(x)),read=p=>JSON.parse(fs.readFileSync(p,'utf8')),serial=x=>JSON.stringify(x,null,2)+'\n';
const unitFile='artifacts/orbit360-recovery/release-control/I6_6_SCOPED_FUNCTION_RELEASE.json';
const decision=owner.directLivePublication(),binding=read(unitFile),head='f2e5168ea12d83dbac8a6e68a5b63110ce10277a';
const object=(name)=>({uri:'gs://'+native.C.bucket+'/i66/synthetic-test-only/'+name,generation:'1795659999000001',sha256:'a'.repeat(64),bytes:100});
// Replay the immutable pre-deployment authority. Later real checkpoints may
// already occupy the path this historical transition creates in memory.
const beforeDirect='2d98ed59052ecac0fe7f568920089de09c92cd9b';
const historicalFiles=new Map();
function historical(file){
 if(!historicalFiles.has(file))historicalFiles.set(file,require('node:child_process').execFileSync('git',['show',beforeDirect+':'+file],{encoding:'utf8',maxBuffer:8*1024*1024}));
 return historicalFiles.get(file);
}
function governance(withHistoricalPreview=true){
 const cp=JSON.parse(historical(owner.P.cp));
 if(!withHistoricalPreview)delete cp.i66ScopedFunctionRelease.providerStages.PREVIEW_DEPLOYED;
 const firstCheckpoint=cp.i66ActiveRecoveryCursor.currentEvidencePath;
 const files=new Map([[owner.P.cp,serial(cp)],[owner.P.state,historical(owner.P.state)],[firstCheckpoint,historical(firstCheckpoint)]]);
 const io={...fs,readFileSync:(p,e)=>files.has(p)?files.get(p):fs.readFileSync(p,e),existsSync:p=>files.has(p)||(!/I6_6_CURRENT_EXECUTION_PROGRESS_.*_R\d+\.json$/.test(p)&&fs.existsSync(p))};
 const facts=clone(cp.i66ScopedFunctionRelease.providerStages.PACKAGE_CERTIFIED),rollbackProof={revision:binding.predecessor.revision,source:{bucket:'existing-source',object:'source.zip',generation:binding.predecessor.sourceGeneration},archiveSha256:binding.predecessor.archiveSha256,configurationDigest:'c'.repeat(64),ready:true};
 const deployed={...facts,publication:decision,rollbackProof,target:binding.targets.live,revision:binding.targets.live.toLowerCase()+'-99999-test',trafficPercent:100,receipt:object('deployment.json'),rollbackRevision:binding.predecessor.revision};
 const stage=(name,data)=>owner.prepareFunctionalStage(name,data,head,io),apply=change=>{for(const[p,v]of Object.entries(change.changes))files.set(p,serial(v));};
 return{cp,files,io,facts,deployed,stage,apply,current:()=>JSON.parse(io.readFileSync(owner.P.cp,'utf8'))};
}
test('the direct mode consumes exact frozen owner instruction and refuses absent or changed authorization',()=>{
 assert.equal(decision.decisionBlob,'e9e4f82a8e1df98046345719096ae986e4936574');
 assert.throws(()=>owner.directLivePublication({readFileSync:()=>{throw Error('ABSENT');}}),/ABSENT/);
 const raw=fs.readFileSync(decision.decisionPath,'utf8');assert.throws(()=>owner.directLivePublication({readFileSync:()=>raw.replace('true','false')}),/EXACT_OWNER_DECISION/);
});
for(const withPreview of [false,true])test('certified source advances directly to LIVE with preserved history and no invented Preview acceptance: '+withPreview,()=>{
 const f=governance(withPreview),oldPreview=clone(f.cp.i66ScopedFunctionRelease.providerStages.PREVIEW_DEPLOYED||null);const result=f.stage('LIVE_DEPLOYED',f.deployed);f.apply(result);
 const live=f.current().i66ScopedFunctionRelease;assert.equal(live.status,'LIVE_DEPLOYED');assert.equal(live.accepted??null,null);assert.equal(live.providerStages.PREVIEW_VERIFIED,undefined);assert.deepEqual(live.providerStages.PREVIEW_DEPLOYED||null,oldPreview);assert.deepEqual(live.publicationMethod,decision);assert.equal(result.expectedPreimages[decision.decisionPath],decision.decisionBlob);
 const proof={...f.facts,publication:decision,target:f.deployed.target,revision:f.deployed.revision,trafficPercent:100,roles:binding.roles,journeys:object('actual-journeys-reference.json')};
 f.apply(f.stage('LIVE_VERIFIED',proof));const accepted=f.current().i66ScopedFunctionRelease;assert.equal(accepted.accepted.epoch,binding.releaseEpoch+1);assert.equal(accepted.accepted.packageSha256,f.facts.packageSha256);assert.equal(accepted.providerStages.PREVIEW_VERIFIED,undefined);
 assert.equal(f.stage('LIVE_VERIFIED',proof).status,'NOOP_ALREADY_RECONCILED');
});
test('direct metadata rejects missing rollback, source substitution, wrong target or forged method and keeps legacy gate',()=>{
 for(const mutate of [f=>delete f.deployed.rollbackProof,f=>f.deployed.rollbackProof.ready=false,f=>f.deployed.rollbackProof.source.generation='9',f=>f.deployed.packageSha256='0'.repeat(64),f=>f.deployed.target=binding.targets.preview,f=>f.deployed.publication={...decision,decisionBlob:'0'.repeat(40)}]){const f=governance();mutate(f);assert.throws(()=>f.stage('LIVE_DEPLOYED',f.deployed));}
 const f=governance(),legacy={...f.deployed};delete legacy.publication;assert.throws(()=>f.stage('LIVE_DEPLOYED',legacy),/SCOPED_STAGE_PREDECESSOR/);
 assert.throws(()=>f.stage('LIVE_VERIFIED',{...f.facts,publication:decision,target:binding.targets.live,revision:f.deployed.revision,roles:binding.roles,trafficPercent:100,journeys:object('fake.json')}),/SCOPED_STAGE_PREDECESSOR/);
});
test('direct rollback preserves evidence and returns to exact known revision without acceptance',()=>{
 const f=governance();f.apply(f.stage('LIVE_DEPLOYED',f.deployed));
 const rolled={...f.facts,publication:decision,target:binding.targets.live,revision:binding.predecessor.revision,rolledBackRevision:f.deployed.revision,trafficPercent:100,receipt:object('rollback.json')};
 f.apply(f.stage('LIVE_ROLLED_BACK',rolled));const c=f.current().i66ScopedFunctionRelease;assert.equal(c.accepted??null,null);assert.equal(c.status,'LIVE_ROLLED_BACK');assert.equal(c.providerStages.PREVIEW_VERIFIED,undefined);
});
function runtime(options={}){
 const source=fs.readFileSync(path.join(__dirname,'gravicentra-i6-6-cloud-build-operational.cjs'),'utf8'),start=source.indexOf('function verifyFunctionalRollback('),end=source.indexOf('\nfunction firestoreFields(',start),calls=[],records=[],f=governance(),control=clone(f.cp);
 const before={target:binding.targets.live,region:binding.targets.region,service:binding.targets.live.toLowerCase(),revision:binding.predecessor.revision,source:{bucket:'existing-source',object:'old.zip',generation:binding.predecessor.sourceGeneration},configurationDigest:'b'.repeat(64)},archive=Buffer.from('offline certified immutable function archive'),facts={...f.facts,packageSha256:pkg.sha(archive),artifact:{...f.facts.artifact,sha256:pkg.sha(archive)}};
 control.i66ScopedFunctionRelease.providerStages.PACKAGE_CERTIFIED=facts;let deployed=false;
 const pack={sourceSha:facts.sourceSha,buildId:facts.buildId,artifact:facts.artifact,receipt:{bindingBlob:facts.bindingBlob}};
 const snapshot=()=>({...clone(before),...(deployed?{revision:before.service+'-99999-new',source:{bucket:'new-source',object:'new.zip',generation:'1795659999000002'}}:{})});
 const readGcloud=args=>{calls.push(args);if(args[0]==='run'&&args[1]==='revisions')return Buffer.from(JSON.stringify({status:{conditions:[{type:'Ready',status:options.rollbackNotReady?'False':'True'}]}}));if(args[0]==='storage'&&args[1]==='cp')return Buffer.from('');if(args[0]==='storage'&&args[1]==='objects')return Buffer.from(JSON.stringify({generation:facts.artifact.generation}));if(args[0]==='functions'&&args[1]==='deploy'){deployed=true;return Buffer.from('');}throw Error('UNEXPECTED_PROVIDER_COMMAND '+args.join(' '));};
 const deps={digest:pkg.digest,need:(v,c)=>assert.ok(v,c),equal:assert.deepEqual,require:n=>{assert.equal(n,'./gravicentra-i66-frontend-control.cjs');return options.noAuthorization?{...owner,directLivePublication:()=>{throw Error('NO_AUTHORITY');}}:owner;},git:()=>decision.decisionBlob,process,fs,path,os,checkedBranch:()=>head,scopedCandidate:()=>binding,readFunctionalPackage:()=>pack,functionalFacts:()=>facts,verifyScopedHosting:async()=>{},json:()=>control,checkServingSnapshot:(s,p,phase)=>{calls.push(['archive-preimage',phase,s.revision]);assert.equal(s.revision,p.revision);assert.equal(s.source.generation,p.sourceGeneration);},readFunctionSnapshot:()=>snapshot(),operationalClaimReader:()=>({findClaim:async()=>null}),retainedFunctionRecord:async(name,value)=>{records.push({name,value});return object(name.split('/').at(-1));},writeFunctionalStage:(stage,value)=>({stage,value}),readGcloud,scopedArchive:()=>archive,sha:pkg.sha,C:native.C};
 const fn=new Function(...Object.keys(deps),source.slice(start,end)+';return executeFunctionalPhase;')(...Object.values(deps));
 return{run:phase=>fn(phase||'direct-live',facts.buildId),calls,records,facts};
}
test('real publisher dispatch deploys only LIVE with exact package after rollback readiness and retains physical proof',async()=>{
 const h=runtime(),r=await h.run(),deploy=h.calls.find(c=>c[0]==='functions'&&c[1]==='deploy');assert.equal(r.stage,'LIVE_DEPLOYED');assert.equal(deploy[2],binding.targets.live);assert.ok(deploy.includes('--source='+h.facts.artifact.uri));assert.ok(h.calls.findIndex(c=>c[0]==='run'&&c[1]==='revisions')<h.calls.indexOf(deploy));assert.equal(h.calls.filter(c=>c[0]==='functions').length,1);assert.equal(r.value.rollbackProof.ready,true);assert.deepEqual(r.value.publication,decision);assert.equal(h.records[0].value.before.revision,binding.predecessor.revision);
});
test('missing rollback or authority prevents provider mutation; historical live still requires its Preview',async()=>{
 for(const options of [{rollbackNotReady:true},{noAuthorization:true}]){const h=runtime(options);await assert.rejects(h.run());assert.equal(h.calls.some(c=>c[0]==='functions'||c[0]==='storage'&&c[1]==='cp'),false);}
 const legacy=runtime();await assert.rejects(legacy.run('live'),/SIGNED_PREVIEW_REQUIRED/);assert.equal(legacy.calls.some(c=>c[0]==='functions'),false);
 const preview=runtime();await assert.rejects(preview.run('preview'),/OWNER_INSTRUCTION_REQUIRES_LIVE/);assert.equal(preview.calls.length,0);
});
test('LIVE driver accepts the actual direct-deployed package without fake Preview but preserves its role/source constraints',()=>{
 const f=governance();f.apply(f.stage('LIVE_DEPLOYED',f.deployed));const cp=f.current(),hosting={version:binding.predecessor.hostingVersion,sourceSha:binding.predecessor.sourceSha,buildId:binding.predecessor.buildId,markerSha256:'a'.repeat(64)};
 const input={phase:'live',origin:'https://app.aysseguros.com',binding,facts:f.facts,hosting,uiHosting:{...hosting,origin:'https://app.aysseguros.com',basis:'SCOPED_HOSTING_PREDECESSOR'},revision:f.deployed.revision};
 assert.equal(driver.validateScopedHistoricalContext(input,cp,fs.readFileSync(unitFile)).sourceSha,f.facts.sourceSha);assert.equal(cp.i66ScopedFunctionRelease.providerStages.PREVIEW_VERIFIED,undefined);
 for(const mutate of [x=>x.binding.roles=['Dirección'],x=>x.facts.sourceSha='0'.repeat(40),x=>x.revision='wrong']){const bad=clone(input);mutate(bad);assert.throws(()=>driver.validateScopedHistoricalContext(bad,cp,fs.readFileSync(unitFile)));}
 const bad=clone(cp);delete bad.i66ScopedFunctionRelease.providerStages.LIVE_DEPLOYED.publication;assert.throws(()=>driver.validateScopedHistoricalContext(input,bad,fs.readFileSync(unitFile)),/DIRECT_LIVE_DEPLOYMENT_AUTHORITY/);
});

test('provider CAS serializes a stable R92 successor and retains verifiable history at the parent',()=>{
  const f=governance(),observed='2026-11-26T03:25:03.000Z';
  const build=()=>owner.prepareFunctionalStage('LIVE_DEPLOYED',f.deployed,head,f.io,observed);
  const change=build(),next=change.changes[owner.P.cp].i66ActiveRecoveryCursor.currentEvidencePath;
  const raw=owner.providerOutcomeBytes(change,next,f.io);
  assert.deepEqual(owner.providerOutcomeBytes(build(),next,f.io),raw);
  const cp=JSON.parse(raw[owner.P.cp]),state=JSON.parse(raw[owner.P.state]),progress=JSON.parse(raw[next]);
  assert.equal(cp.i66ActiveRecoveryCursor.currentEvidenceBlobSha,owner.blob(raw[next]));
  assert.equal(state.i66OwnerPlanContinuation20261115.evidenceGitBlobSha,owner.blob(raw[next]));
  assert.equal(progress.recordedAtUtc,observed);
  assert.deepEqual(cp.i66ScopedFunctionRelease.providerStages,change.changes[owner.P.cp].i66ScopedFunctionRelease.providerStages);
  const recover=pin=>{
    assert.equal(pin.commit,head);
    const body=f.io.readFileSync(pin.path,'utf8');
    assert.equal(owner.blob(body),pin.blob);
    const value=JSON.parse(body)[pin.field];
    assert.equal(require('node:crypto').createHash('sha256').update(JSON.stringify(value)+'\n').digest('hex'),pin.sha256);
    return value;
  };
  const allHistory=[...recover(state.priorProviderContinuationArchive),...state.priorI66OwnerPlanContinuations];
  assert.deepEqual(allHistory,change.changes[owner.P.state].priorI66OwnerPlanContinuations);
  for(const [field,pin] of Object.entries(progress.archivedProviderSnapshots)){
    progress[field]=recover(pin);
  }
  delete progress.archivedProviderSnapshots;
  assert.deepEqual(progress,change.changes[next]);
  const size=values=>Buffer.byteLength(JSON.stringify(Object.entries(values).map(([path,bytes])=>({path,contents:Buffer.from(bytes).toString('base64')}))));
  const oldSize=size(Object.fromEntries(Object.entries(change.changes).map(([p,v])=>[p,serial(v)])));
  const newSize=size(raw);
  assert.ok(oldSize>3500000&&newSize<2680000);
  console.log('R92 functional fixture addition bytes',oldSize,newSize);
  const corrupted=clone(change);
  corrupted.changes[owner.P.state].priorI66OwnerPlanContinuations[0].reason='changed';
  assert.throws(()=>owner.providerOutcomeBytes(corrupted,next,f.io),/STATE_HISTORY_PREFIX_CHANGED/);
});
function rollbackEvidence(){
  const f=governance(),rollback=f.deployed.rollbackProof,target=binding.targets.live;
  const before={target,region:binding.targets.region,service:target.toLowerCase(),revision:rollback.revision,
    source:rollback.source,configurationDigest:rollback.configurationDigest};
  const after={...clone(before),revision:f.deployed.revision,source:{bucket:'test',object:'new.zip',generation:'22'}};
  const common={...f.facts,publication:decision,target,phase:'live',rollbackProof:rollback};
  return {head,control:f.cp,binding:clone(binding),facts:f.facts,publication:decision,rollback,
    archiveDigest:f.facts.packageSha256,scopePreserved:true,ref:f.deployed.receipt,live:clone(after),
    claim:{...clone(common),authorityHead:head,before:clone(before)},receipt:{...clone(common),before,after,trafficPercent:100}};
}
test('retained physical ownership can be checked before signed ACK and against a signed entry',()=>{
  const x=rollbackEvidence(),resolved=native.validateDirectRollbackOwnership(x);
  assert.equal(resolved.revision,x.live.revision);
  assert.equal(resolved.rollbackRevision,binding.predecessor.revision);
  x.control.i66ScopedFunctionRelease.providerStages.LIVE_DEPLOYED=clone(resolved);
  assert.deepEqual(native.validateDirectRollbackOwnership(x),resolved);
});
for(const [reason,mutate] of Object.entries({
  alteredIntent:x=>x.claim.transitionId='1'.repeat(64), successor:x=>x.live.revision+='-other', configuration:x=>x.live.configurationDigest='a'.repeat(64),
  package:x=>x.archiveDigest='f'.repeat(64), receipt:x=>x.receipt.buildId='different', claim:x=>x.claim.packageSha256='e'.repeat(64),
  authority:x=>x.scopePreserved=false, previous:x=>x.receipt.before.revision+='-other',
  unavailable:x=>x.rollback.ready=false, traffic:x=>x.receipt.trafficPercent=50,
  accepted:x=>x.control.i66ScopedFunctionRelease.providerStages.LIVE_VERIFIED={},
  competingRegister:x=>x.control.i66ScopedFunctionRelease.providerStages.LIVE_DEPLOYED={revision:'different'}
})){
  test('physical rollback gate refuses '+reason,()=>{
    const x=rollbackEvidence();mutate(x);assert.throws(()=>native.validateDirectRollbackOwnership(x));
  });
}
function routeFixture(d){
  return {apiVersion:'serving.knative.dev/v1',kind:'Service',
    metadata:{name:d.target.toLowerCase(),namespace:native.C.projectId,uid:'12345678-1111-4111-8111-123456789abc',
      generation:21,resourceVersion:'private-version-1',labels:{'cloud.googleapis.com/location':binding.targets.region}},
    spec:{template:{metadata:{name:d.revision}},traffic:[{latestRevision:true,percent:100}]},
    status:{observedGeneration:21,conditions:[{type:'Ready',status:'True'}],latestCreatedRevisionName:d.revision,
      latestReadyRevisionName:d.revision,traffic:[{revisionName:d.revision,percent:100}]}};
}
test('compensation retains metadata, exact resourceVersion and template, refusing a competing revision',()=>{
  const x=rollbackEvidence(),deployment=native.validateDirectRollbackOwnership(x),proof={head,claim:object('claim'),deployment};
  const row=routeFixture(deployment),{request,intent}=native.directRollbackRequest(row,proof,binding.targets.region);
  assert.deepEqual(request.metadata,row.metadata);assert.deepEqual(request.spec.template,row.spec.template);
  assert.deepEqual(request.spec.traffic,[{revisionName:deployment.rollbackRevision,percent:100}]);
  assert.equal(row.spec.traffic[0].latestRevision,true);assert.equal(request.status,undefined);
  const restored=clone(row);restored.metadata.generation=restored.status.observedGeneration=22;
  restored.metadata.resourceVersion='private-version-2';restored.spec=request.spec;restored.status.traffic=[{revisionName:deployment.rollbackRevision,percent:100}];
  assert.equal(native.verifyRestoredRoute(restored,intent,deployment.target,binding.targets.region).revision,deployment.rollbackRevision);
  for(const modify of [y=>y.metadata.uid='12345678-1111-4111-8111-123456789abd',y=>y.metadata.generation=y.status.observedGeneration=23,y=>y.spec.template.metadata.name='successor',y=>y.status.latestCreatedRevisionName='successor']){
    const changed=clone(restored);modify(changed);assert.throws(()=>native.verifyRestoredRoute(changed,intent,deployment.target,binding.targets.region));
  }
  for(const modify of [y=>delete y.metadata.resourceVersion,y=>y.status.latestCreatedRevisionName='successor',y=>y.status.traffic.push({percent:0,tag:'preview'}),y=>y.status.conditions[0].status='False']){
    const changed=clone(row);modify(changed);assert.throws(()=>native.directRollbackRequest(changed,proof,binding.targets.region));
  }
});
test('missing ACK and proven compensation are recorded together with one new checkpoint',()=>{
  const x=rollbackEvidence(),deployment=native.validateDirectRollbackOwnership(x),f=governance();
  const recovery={claim:object('claim'),intent:object('intent'),deployment:deployment.receipt};
  const facts={...x.facts,publication:decision,phase:'live',target:deployment.target,revision:deployment.rollbackRevision,rolledBackRevision:deployment.revision,trafficPercent:100,recovery,receipt:object('rollback')};
  const change=owner.prepareFunctionalStage('LIVE_ROLLED_BACK',facts,head,f.io,'2026-11-26T04:00:00.000Z',deployment);
  const authority=change.changes[owner.P.cp].i66ScopedFunctionRelease;
  assert.equal(Object.keys(change.changes).length,3);assert.equal(authority.status,'LIVE_ROLLED_BACK');
  assert.deepEqual(authority.providerStages.LIVE_DEPLOYED,deployment);assert.equal(authority.providerStages.LIVE_VERIFIED,undefined);
  assert.deepEqual(authority.providerStages.LIVE_ROLLED_BACK.receipt,facts.receipt);
  const bad=clone(facts);bad.recovery.deployment.sha256='e'.repeat(64);
  assert.throws(()=>owner.prepareFunctionalStage('LIVE_ROLLED_BACK',bad,head,f.io,'2026-11-26T04:00:00.000Z',deployment));
});
test('composite with intersecting target stops on original scoped claim before branch ACK; different region or Preview is independent',async()=>{
  const f=governance(),target=binding.targets.live,reader={findClaim:async()=>object('claim')};
  const candidate={targets:{live:[{name:target,region:binding.targets.region}]}};
  await assert.rejects(native.protectOverlappingLiveDeploy(candidate,'live',f.cp,binding,reader),/SCOPED_LIVE_CLAIM_PENDING/);
  await native.protectOverlappingLiveDeploy(candidate,'preview',f.cp,binding,reader);
  await native.protectOverlappingLiveDeploy({targets:{live:[{name:'other',region:binding.targets.region}]}},'live',f.cp,binding,reader);
  await native.protectOverlappingLiveDeploy(candidate,'live',f.cp,binding,{findClaim:async()=>null});
});
function recoveryRuntime(){
  const x=rollbackEvidence(),deployment=native.validateDirectRollbackOwnership(x),proof={head,claim:object('claim'),deployment,trafficWrites:0};
  let row=routeFixture(deployment),puts=0,validations=0,recorded=null;
  const retained=new Map(),reader={findClaim:async name=>retained.get(name)?.ref||null,object:async ref=>{
    const entry=[...retained.values()].find(v=>v.ref.uri===ref.uri);assert(entry);return {data:JSON.stringify(entry.value)};
  }};
  const retain=async(name,value)=>{
    const existing=retained.get(name);if(existing){assert.deepEqual(existing.value,value);return existing.ref;}
    const ref=object(name);retained.set(name,{ref,value:clone(value)});return ref;
  };
  const provider=async(url,options)=>{
    if(options.method==='GET')return {ok:true,json:async()=>clone(row)};
    const body=JSON.parse(options.body);assert.deepEqual(body.metadata,row.metadata);
    assert.deepEqual(body.spec.template,row.spec.template);
    if(url.endsWith('?dryRun=all')){validations++;return {ok:true,json:async()=>body};}
    puts++;assert.equal(puts,1);assert([...retained.keys()].some(k=>k.endsWith('rollback-intent.json')));
    row={...clone(row),spec:body.spec};row.metadata.generation=row.status.observedGeneration=22;
    row.metadata.resourceVersion='new-observed-version';row.status.traffic=[{revisionName:deployment.rollbackRevision,percent:100}];
    throw Error('simulated lost traffic ACK');
  };
  const deps={checkedBranch:()=>head,scopedCandidate:()=>binding,json:()=>x.control,C:native.C,
    equal:assert.deepEqual,need:assert.ok,operationalClaimReader:()=>reader,readGcloud:()=>Buffer.from('offline-only'),
    fetch:provider,checkDirectRollback:async()=>proof,retainedFunctionRecord:retain,
    writeFunctionalStage:async(stage,facts,prior)=>{recorded={stage,facts,prior};return recorded;},uuid:native.uuid,digest:pkg.digest};
  const source=fs.readFileSync(path.join(__dirname,'gravicentra-i6-6-cloud-build-operational.cjs'),'utf8');
  const code=source.slice(source.indexOf('function singleRollbackRoute('),source.indexOf('async function rollbackFunctionalPhase('));
  const fn=new Function(...Object.keys(deps),code+';return recoverDirectRollback;')(...Object.values(deps));
  return {run:check=>fn(x.facts.buildId,check),counts:()=>({puts,validations,retained:retained.size,recorded})};
}
test('provider dry-run leaves traffic, receipt storage and canonical state untouched',async()=>{
  const f=recoveryRuntime();assert.equal((await f.run(true)).status,'PROVIDER_DRY_RUN_VERIFIED');
  assert.deepEqual(f.counts(),{puts:0,validations:1,retained:0,recorded:null});
});
test('pending canonical deployment and lost traffic ACK use one PUT, and resumed registration uses no additional PUT',async()=>{
  const f=recoveryRuntime(),first=await f.run(false),second=await f.run(false);
  assert.deepEqual(first,second);assert.equal(first.stage,'LIVE_ROLLED_BACK');assert(first.prior.receipt);
  assert.equal(f.counts().puts,1);assert.equal(f.counts().validations,1);assert.equal(f.counts().retained,2);
});
