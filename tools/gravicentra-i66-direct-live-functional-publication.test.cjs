'use strict';
// Causal offline tests of the existing publisher; no provider, consent or refs.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const owner=require('./gravicentra-i66-frontend-control.cjs'),native=require('./gravicentra-i6-6-cloud-build-operational.cjs'),pkg=require('./gravicentra-i6-6-cloud-build-package.cjs'),driver=require('./gravicentra-i6-6-proposal-application-signed-uat.cjs');
const clone=x=>JSON.parse(JSON.stringify(x)),read=p=>JSON.parse(fs.readFileSync(p,'utf8')),serial=x=>JSON.stringify(x,null,2)+'\n';
const unitFile='artifacts/orbit360-recovery/release-control/I6_6_SCOPED_FUNCTION_RELEASE.json';
const decision=owner.directLivePublication(),binding=read(unitFile),head='f2e5168ea12d83dbac8a6e68a5b63110ce10277a';
const object=(name)=>({uri:'gs://'+native.C.bucket+'/i66/synthetic-test-only/'+name,generation:'1795659999000001',sha256:'a'.repeat(64),bytes:100});
function governance(withHistoricalPreview=true){
 const cp=read(owner.P.cp);if(!withHistoricalPreview)delete cp.i66ScopedFunctionRelease.providerStages.PREVIEW_DEPLOYED;
 const files=new Map([[owner.P.cp,serial(cp)]]),io={...fs,readFileSync:(p,e)=>files.has(p)?files.get(p):fs.readFileSync(p,e),existsSync:p=>files.has(p)||fs.existsSync(p)};
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
 const deps={need:(v,c)=>assert.ok(v,c),equal:assert.deepEqual,require:n=>{assert.equal(n,'./gravicentra-i66-frontend-control.cjs');return options.noAuthorization?{...owner,directLivePublication:()=>{throw Error('NO_AUTHORITY');}}:owner;},git:()=>decision.decisionBlob,process,fs,path,os,checkedBranch:()=>head,scopedCandidate:()=>binding,readFunctionalPackage:()=>pack,functionalFacts:()=>facts,verifyScopedHosting:async()=>{},json:()=>control,checkServingSnapshot:(s,p,phase)=>{calls.push(['archive-preimage',phase,s.revision]);assert.equal(s.revision,p.revision);assert.equal(s.source.generation,p.sourceGeneration);},readFunctionSnapshot:()=>snapshot(),operationalClaimReader:()=>({findClaim:async()=>null}),retainedFunctionRecord:async(name,value)=>{records.push({name,value});return object(name.split('/').at(-1));},writeFunctionalStage:(stage,value)=>({stage,value}),readGcloud,scopedArchive:()=>archive,sha:pkg.sha,C:native.C};
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
