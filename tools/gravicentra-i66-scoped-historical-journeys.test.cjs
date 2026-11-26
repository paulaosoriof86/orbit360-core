'use strict';
// Offline discriminants only. Provider records below are synthetic fixtures;
// they never confer authorization or create a production QA receipt.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm');
const {execFileSync}=require('node:child_process'),{createRequire}=require('node:module');
const n=require('./gravicentra-i6-6-cloud-build-operational.cjs'),pkg=require('./gravicentra-i6-6-cloud-build-package.cjs');
const root=path.resolve(__dirname,'..'),base='f769fdf387d553eb91ce3ef5ec97d97cecd16eb3',clone=x=>JSON.parse(JSON.stringify(x)),show=p=>execFileSync('git',['show',base+':'+p],{cwd:root,maxBuffer:64*1024*1024});
const cp=JSON.parse(show(n.C.control)),unitPath='artifacts/orbit360-recovery/release-control/I6_6_SCOPED_FUNCTION_RELEASE.json',binding=JSON.parse(show(unitPath));
const execId='12345678-1234-4234-8234-123456789123',uri='gs://'+n.C.bucket+'/',hash='a'.repeat(64);
const ref=(name)=>({uri:uri+name,generation:'1795659999000001',sha256:hash,bytes:321});
function plan(phase='preview'){
 const facts=clone(cp.i66ScopedFunctionRelease.providerStages.PACKAGE_CERTIFIED),deployment=clone(cp.i66ScopedFunctionRelease.providerStages.PREVIEW_DEPLOYED);
 if(phase==='live'){deployment.target=binding.targets.live;deployment.revision=binding.targets.live.toLowerCase()+'-99999-qa';}
 const hosting={version:binding.predecessor.hostingVersion,buildId:binding.predecessor.buildId,sourceSha:binding.predecessor.sourceSha,markerSha256:hash};
 const origin=phase==='preview'?cp.i66FrontendReleaseHead.previewUrl:'https://app.aysseguros.com';
 return {schema:n.FUNCTIONAL_JOURNEY.planSchema,phase,authorityHead:base,binding:clone(binding),facts,deployment,deploymentCreatedAt:'2026-11-26T00:53:00Z',
  snapshot:{target:deployment.target,region:'us-central1',service:deployment.target.toLowerCase(),revision:deployment.revision,source:{bucket:n.C.bucket,object:'synthetic-existing-source.zip',generation:'1795659999000000'},configurationDigest:hash},
  hosting,uiHosting:{...hosting,origin,basis:'SCOPED_HOSTING_PREDECESSOR'},origin,previousAttempt:null,pins:{control:pkg.blob(show(n.C.control)),transport:pkg.blob(show(n.C.transport)),unit:facts.bindingBlob,toolsTree:'b'.repeat(40),functionsTree:'c'.repeat(40),files:Object.fromEntries(n.FUNCTIONAL_JOURNEY_PINS.map(file=>[file,{blob:'d'.repeat(40),sha256:hash}]))}};
}
function build(p,now=Date.now()){
 const c=n.functionalJourneyConfig(p),start=new Date(now-60000).toISOString(),finish=new Date(now+60000).toISOString();
 return {...clone(c),id:execId,name:'projects/'+n.C.projectId+'/locations/'+n.C.region+'/builds/'+execId,projectId:n.C.projectId,status:'SUCCESS',createTime:start,startTime:start,finishTime:finish,
  source:{gitSource:{url:n.C.repositoryUrl,revision:p.authorityHead}},sourceProvenance:{resolvedGitSource:{url:n.C.repositoryUrl,revision:p.authorityHead}},
  steps:c.steps.map(s=>({...s,status:'SUCCESS',timing:{startTime:start,endTime:finish}})),results:{buildStepImages:['sha256:'+hash,'sha256:'+'b'.repeat(64)]}};
}
let seam;
async function actualSeam(){
 if(seam)return seam;
 const p=plan(),began=new Date().toISOString(),out=fs.mkdtempSync(path.join(os.tmpdir(),'i66-scoped-seam-e3-'));
 for(const file of ['core/queries.js','core/cobros-reconciliation-domain-client.js','modules/cobros.js']){const dest=path.join(out,'orbit360-platform',file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,execFileSync('git',['show',binding.predecessor.sourceSha+':orbit360-platform/'+file],{cwd:root}));}
 const saved=process.env.I66_SCOPED_JOURNEY_UI_ROOT;process.env.I66_SCOPED_JOURNEY_UI_ROOT=out;
 const journeys=[];
 try{for(const role of ['direccion','operativo']){
  const filename=path.join(__dirname,n.FUNCTIONAL_JOURNEY.driverTest.split('/').at(-1)),req=createRequire(filename),module={exports:{}};
  let text=fs.readFileSync(filename,'utf8');
  text=text.replace("vm.runInNewContext(source+'\\nmodule.exports={harness};'", "vm.runInNewContext(source.replaceAll('operator','fixture_actor_'+role.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase()).replace('serverTimestamp:()=>({__timestamp:true})','serverTimestamp:()=>({_seconds:Math.floor(Date.now()/1000),_nanoseconds:(Date.now()%1000)*1000000})')+'\\nmodule.exports={harness};'");
  text=text.replace("actor={uid:'operator',role}","actor={uid:'fixture_actor_'+role,role}");
  const original="return{status:options.witnessHold?'HOLD':'PASS',requestId:journey.requestId,matchingPaymentIds:[journey.cobroId]};";
  assert.ok(text.includes(original),'use the real driver fixture seam');
  text=text.replace(original,"return canonical({journey,before,after},b.db);");
  const canonical=async(input,db)=>{const resolve=p=>{const parts=p.split('/');let r=db.collection(parts.shift());while(parts.length){r=r.doc(parts.shift());if(parts.length)r=r.collection(parts.shift());}return r;};const adapter={collection:resolve,doc:resolve};return n.captureFunctionalJourneyWitness(p,input,{db:adapter});};
  new Function('module','exports','require','__dirname','canonical',text+'\nmodule.exports={harness};')(module,module.exports,name=>name==='node:test'?()=>{}:req(name),__dirname,canonical);
  const h=module.exports.harness('preview',role),j=clone(await h.run());assert.equal(h.deletes.length,6);assert.equal(h.readbackCount,1);journeys.push(j);
 }}finally{if(saved===undefined)delete process.env.I66_SCOPED_JOURNEY_UI_ROOT;else process.env.I66_SCOPED_JOURNEY_UI_ROOT=saved;fs.rmSync(out,{recursive:true,force:true});}
 const report={schema:n.FUNCTIONAL_JOURNEY.reportSchema,status:'PASS',plan:p,executionProvider:'CLOUD_BUILD',executionBuildId:execId,phase:p.phase,sourceSha:p.facts.sourceSha,packageBuildId:p.facts.buildId,packageSha256:p.facts.packageSha256,bindingBlob:p.facts.bindingBlob,revision:p.snapshot.revision,hostingBuildId:p.uiHosting.buildId,protectedLiveHosting:p.hosting,uiHosting:p.uiHosting,startedAt:began,finishedAt:new Date().toISOString(),journeys,realCustomerWrites:0,authOrMembershipMutations:0,cleanup:{status:'PASS',remaining:0,targets:journeys.flatMap(j=>j.cleanup.targets)}};
 seam={p,report,build:build(p)};return seam;
}
test('real E3 Cobros UI and actual scoped callable produce worker canonical witnesses for both assigned roles before cleanup',async()=>{
 const {p,report,build:b}=await actualSeam();assert.notEqual(p.facts.sourceSha,p.hosting.sourceSha);assert.equal(p.facts.buildId,'c640fadc-6886-407b-8e61-6973f11c7b33');assert.equal(p.facts.packageSha256,'5609a99eb0280ad427aac58ec85319e16388a747911c2e76775913f94556f73e');
 assert.equal(n.validateFunctionalJourneyReport(p,report,b),report);assert.ok(report.journeys.every(j=>j.originalPaymentCount===1&&j.originalCobroDocumentCount===0&&j.afterCobroDocumentCount===1));
});
for(const [name,mutate] of [
 ['wrong source',x=>x.sourceSha='a'.repeat(40)],['wrong revision',x=>x.revision='other'],['wrong role',x=>x.journeys[0].role='Asesor'],
 ['browser-only proof',x=>delete x.journeys[0].serverReadback],['false original physical count',x=>x.journeys[0].originalCobroDocumentCount=1],
 ['changed original amount',x=>x.journeys[0].originalAmount=999],['no replay',x=>x.journeys[0].idempotentReplay=false],
 ['cleanup pending',x=>x.cleanup.remaining=1],['fake witness source',x=>x.journeys[0].serverReadback.documents.event.recordedPaymentBefore.sourceCollection='cobros'],
 ['same actor for two roles',x=>x.journeys[1].actorUidSha256=x.journeys[0].actorUidSha256]
])test('retained report rejects '+name,async()=>{const {p,report,build:b}=await actualSeam(),bad=clone(report);mutate(bad);assert.throws(()=>n.validateFunctionalJourneyReport(p,bad,b));});
test('Cloud Build SUCCESS must prove exact source, SDK, principal, package, roles and executed steps',()=>{
 const p=plan(),b=build(p);assert.equal(n.validateFunctionalJourneyBuild(p,b),b);
 for(const change of [x=>x.status='WORKING',x=>x.source.gitSource.revision='f'.repeat(40),x=>x.serviceAccount='other',x=>x.steps[1].args[2]='{}',x=>x.steps[1].allowFailure=true,x=>x.steps[1].status='SKIPPED',x=>x.options.env=['NODE_OPTIONS=--require=evil'],x=>x.artifacts={objects:{}}]){const bad=clone(b);change(bad);assert.throws(()=>n.validateFunctionalJourneyBuild(p,bad));}
 const wrong=clone(p);wrong.deployment.packageSha256='f'.repeat(64);assert.throws(()=>n.functionalJourneyConfig(wrong));
});
test('nested Admin Timestamp and REST ISO preserve all member fields and nanoseconds',()=>{
 const stamp={seconds:1795651200,nanoseconds:123456789,toDate:()=>new Date('2026-11-26T00:00:00.123Z')};
 const a={roles:['Dirección','Operativo'],countries:['GT'],status:'active',audit:{createdAt:stamp,history:[stamp]}},b=clone(a);b.audit.createdAt='2026-11-26T00:00:00.123456789Z';b.audit.history=[b.audit.createdAt];
 assert.deepEqual(n.functionalJourneyMember(a,'Dirección'),n.functionalJourneyMember(b,'Dirección'));b.audit.createdAt='2026-11-26T00:00:00.123456788Z';assert.notEqual(n.functionalJourneyMember(a,'Dirección').memberDigest,n.functionalJourneyMember(b,'Dirección').memberDigest);
});
test('provider-retained report and claim times cannot precede or outlive their execution',()=>{
 const b=build(plan());pkg.validateObjectTime(b,{timeCreated:new Date().toISOString()});for(const time of ['2020-01-01T00:00:00Z','2099-01-01T00:00:00Z',undefined])assert.throws(()=>pkg.validateObjectTime(b,{timeCreated:time}));
});
test('LIVE lost ACK adopts the exact canonical stage before old binding epoch validation, without reexecution',()=>{
 const p=plan('live'),c=clone(cp),baseFacts=p.facts,receipt=ref('i66/synthetic-test-only/role-journeys.json'),s=c.i66ScopedFunctionRelease.providerStages;
 s.LIVE_DEPLOYED={...p.deployment};s.LIVE_VERIFIED={...baseFacts,target:p.binding.targets.live,revision:p.snapshot.revision,trafficPercent:100,roles:p.binding.roles,journeys:receipt};
 c.i66ScopedFunctionRelease.accepted={epoch:p.binding.releaseEpoch+1,target:p.binding.targets.live,revision:p.snapshot.revision,sourceSha:p.facts.sourceSha,packageSha256:p.facts.packageSha256};
 assert.equal(n.adoptedFunctionalJourney(c,p.binding,'live',p.facts.buildId,receipt).status,'NOOP_ALREADY_RECONCILED');
 const wrong=clone(receipt);wrong.generation='2';assert.throws(()=>n.adoptedFunctionalJourney(c,p.binding,'live',p.facts.buildId,wrong));c.i66ScopedFunctionRelease.accepted.epoch++;assert.throws(()=>n.adoptedFunctionalJourney(c,p.binding,'live',p.facts.buildId,receipt));
});
test('terminal failure with proven cleanup can continue same package; active, unknown, dirty and crossed package cannot',async()=>{
 const {p:old,report}=await actualSeam(),b=build(old);b.status='FAILURE';b.steps[1].status='FAILURE';
 const prior={cursor:ref('i66/synthetic-test-only/current.json'),claim:ref('i66/synthetic-test-only/claim.json'),hold:ref('i66/synthetic-test-only/hold.json'),executionBuildId:b.id},p={...clone(old),previousAttempt:prior};
 const claim={schema:'GI_I66_SCOPED_FUNCTION_JOURNEY_CLAIM_V1',phase:p.phase,packageBuildId:p.facts.buildId,executionBuildId:b.id,authorityHead:old.authorityHead,planSha256:pkg.digest(old)},cursor={schema:'GI_I66_SCOPED_FUNCTION_JOURNEY_CURSOR_V1',claim:prior.claim,executionBuildId:b.id,planSha256:pkg.digest(old)};
 const hold={schema:'GI_I66_SCOPED_FUNCTION_JOURNEY_HOLD_V1',plan:old,planSha256:pkg.digest(old),phase:p.phase,packageBuildId:p.facts.buildId,executionBuildId:b.id,claim:prior.claim,accepted:false,partialReport:report,cleanup:n.functionalJourneyCleanupProof(report)};
 assert.equal(n.validateFunctionalJourneyRetryEvidence(p,prior,b,hold,claim,cursor),true);
 await n.functionalCleanupAbsent(hold.cleanup.targets,{read:async()=>404});await assert.rejects(n.functionalCleanupAbsent(hold.cleanup.targets,{read:async()=>200}),/CLEANUP_ABSENCE/);await assert.rejects(n.functionalCleanupAbsent(hold.cleanup.targets,{read:async()=>503}),/CLEANUP_ABSENCE/);
 for(const change of [x=>x.b.status='WORKING',x=>x.b.status='UNKNOWN',x=>x.h.cleanup.remaining=1,x=>x.h.cleanup.status='HOLD',x=>x.h.plan.facts.packageSha256='f'.repeat(64),x=>x.h.partialReport=null]){const x={b:clone(b),h:clone(hold)};change(x);assert.throws(()=>n.validateFunctionalJourneyRetryEvidence(p,prior,x.b,x.h,claim,cursor));}
});
test('claim is acquired only inside awaited beforeFixtureWrite, after dependency install and tests',()=>{
 const raw=fs.readFileSync(path.join(root,n.C.tool),'utf8'),worker=raw.slice(raw.indexOf('async function functionalJourneyWorker('),raw.indexOf('function adoptedFunctionalJourney('));
 assert.ok(worker.indexOf("'--test'")<worker.indexOf('beforeFixtureWrite:async'));assert.ok(worker.indexOf('beforeFixtureWrite:async')<worker.indexOf('acquireFunctionalJourneyClaim('));
 const driver=fs.readFileSync(path.join(root,n.FUNCTIONAL_JOURNEY.driver),'utf8');assert.ok(driver.includes('await io.beforeFixtureWrite'));assert.ok(!worker.includes('functions\',\'deploy'));
});
test('cursor CAS applied with lost readback ACK retains the immutable claim and permits retry after zero-write cleanup',async()=>{
 const p=plan(),source=fs.readFileSync(path.join(root,n.C.tool),'utf8'),body=source.slice(source.indexOf('async function acquireFunctionalJourneyClaim('),source.indexOf('async function functionalJourneyWorker('));
 let cursor=null,claimRecord=null,createCalls=0;const claimRef=ref('i66/synthetic-test-only/immutable-claim.json');
 const reader={findClaim:async()=>{if(!cursor)return null;throw Error('SYNTHETIC_CURSOR_READBACK_ACK_LOST');}};
 const acquire=new Function('functionalJourneyPrefix','operationalClaimReader','verifyPreviousFunctionalJourney','equal','retainedFunctionRecord','digest','fs','path','os','readGcloud','C','need','sha','Buffer',body+';return acquireFunctionalJourneyClaim;')(
  x=>'i66/functional/'+x.binding.unit+'/'+x.facts.sourceSha+'/'+x.facts.buildId+'/',()=>reader,async()=>{throw Error('unexpected retry before first claim');},assert.deepEqual,
  async(_name,value)=>{claimRecord=value;return claimRef;},pkg.digest,fs,path,os,args=>{assert.ok(args.includes('--if-generation-match=0'));cursor=JSON.parse(fs.readFileSync(args[2]));},n.C,assert.ok,pkg.sha,Buffer);
 let error;try{await acquire(p,execId);createCalls++;}catch(e){error=e;}
 assert.match(error.message,/ACK_LOST/);assert.equal(createCalls,0);assert.deepEqual(error.functionalJourneyClaim,claimRef);assert.deepEqual(cursor.claim,claimRef);
 const partialReport={status:'HOLD',journeys:[{status:'HOLD',role:'Dirección',receiptId:'b3004qa_i66_historical_direccion_ack_receipt',cleanup:{status:'PASS',remaining:0,targets:[]}}]},b=build(p);b.status='FAILURE';b.steps[1].status='FAILURE';
 const previousAttempt={cursor:ref('i66/synthetic-test-only/cursor.json'),claim:claimRef,hold:ref('i66/synthetic-test-only/hold.json'),executionBuildId:execId};
 const hold={schema:'GI_I66_SCOPED_FUNCTION_JOURNEY_HOLD_V1',phase:p.phase,packageBuildId:p.facts.buildId,executionBuildId:execId,plan:p,planSha256:pkg.digest(p),claim:error.functionalJourneyClaim,partialReport,cleanup:n.functionalJourneyCleanupProof(partialReport),accepted:false};
 assert.equal(n.validateFunctionalJourneyRetryEvidence({...clone(p),previousAttempt},previousAttempt,b,hold,claimRecord,cursor),true);await n.functionalCleanupAbsent([],{read:async()=>{throw Error('no documents were created');}});
});
