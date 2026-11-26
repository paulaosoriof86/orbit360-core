'use strict';
// Synthetic causal tests. This file never creates an admission or a claim.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const n=require('./gravicentra-i6-6-cloud-build-operational.cjs'),helper=require('./gravicentra-i6-6-cloud-build-compensated-retry.cjs');
const make=require('./gravicentra-i66-make-lead-protected-executor.cjs'),pkg=require('./gravicentra-i6-6-cloud-build-package.cjs');
const {fixture}=require('./gravicentra-i6-6-cloud-build-compensated-retry.test.cjs');
const clone=x=>structuredClone(x),root=path.join(__dirname,'..');
async function state(){
 const f=fixture();
 const old={...f.fn,revision:f.traffic.targets[0].revision};delete old.configurationDigest;old.configurationDigest=pkg.digest(old);
 for(const p of [f.p,f.priorCandidate]){
  p.makeIngress.targetBefore.preview.configurationDigest=old.configurationDigest;
  p.makeIngress.closedConfiguration={preview:{expectedDigest:'c'.repeat(64),nonce:'d'.repeat(64)}};
 }
 f.seal();f.report=await helper.verifyCompensatedRetry(f.p,'preview',f.io,f.options);
 f.row={name:'projects/'+n.C.projectId+'/locations/'+f.fn.region+'/functions/'+f.fn.name,state:'ACTIVE',
  serviceConfig:{serviceAccountEmail:f.fn.runtimePrincipal,revision:f.fn.revision,service:f.fn.service},
  eventTrigger:{eventType:f.fn.eventType,retryPolicy:f.fn.retryPolicy,trigger:f.fn.trigger,eventFilters:[{attribute:'database',value:'(default)'},
   {attribute:'namespace',value:'(default)'},{attribute:'document',value:f.fn.document,operator:'match-path-pattern'}]}};
 f.run={name:f.fn.service,uid:f.traffic.serviceUid,generation:f.traffic.generation,observedGeneration:f.traffic.generation,
  reconciling:false,terminalCondition:{state:'CONDITION_SUCCEEDED'},latestReadyRevision:f.fn.revision,
  trafficStatuses:[{type:'TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION',...f.traffic.targets[0]}]};
 f.requests=[];f.auth={request:async request=>{f.requests.push(request);assert.equal(request.method,'GET');
  if(request.url.startsWith('https://cloudfunctions.googleapis.com/v2/'))return {data:f.row};
  if(request.url.startsWith('https://run.googleapis.com/v2/'))return {data:f.run};throw Error('UNEXPECTED_PROVIDER_ROUTE');}};
 const ref={collection(){return ref;},doc(){return ref;},async get(){return {exists:true,data:()=>clone(f.current.configuration)};}};f.db=ref;
 return f;
}
test('claim retry is Preview only; normal and later LIVE claims keep their original identities',async()=>{
 const f=await state(),base=helper.originalLockName(f.p,'preview');
 assert.notEqual(n.lockName(f.p,'preview'),base);assert.equal(n.lockName(f.p,'preview'),f.report.retryClaimName);
 assert.equal(n.lockName(f.p,'live'),helper.originalLockName(f.p,'live'));
 assert.equal(n.validateRetryReadback(f.p,'live',null),null);assert.equal(await n.verifyRetryRuntime(f.p,'live'),null);
 const ordinary=clone(f.p);delete ordinary.providerBinding.compensatedRetry;
 assert.equal(n.lockName(ordinary,'preview'),base);assert.equal(await n.verifyRetryRuntime(ordinary,'preview'),null);
});
test('compensated readback is pinned to this fresh executor and canonical admission; ordinary callers cannot inject it',async()=>{
 const f=await state(),identity={buildId:f.options.currentBuildId,authorityHead:f.options.authorityHead};
 assert.equal(n.validateRetryReadback(f.p,'preview',f.report,identity),f.report);
 for(const field of ['priorBuildId','priorClaim','hold','admission','currentBuildId','authorityHead','retryClaimName','priorPlanSha256']){
  const bad=clone(f.report);bad[field]='changed';assert.throws(()=>n.validateRetryReadback(f.p,'preview',bad,identity));
 }
 const ordinary=clone(f.p);delete ordinary.providerBinding.compensatedRetry;
 assert.throws(()=>n.validateRetryReadback(ordinary,'preview',f.report),/UNREQUESTED_RETRY_PROOF/);
 assert.throws(()=>n.validateRetryReadback(f.p,'preview',null),/RETRY_READBACK_REQUIRED/);
});
test('Make snapshot accepts the proven restored traffic without pretending Functions metadata reverted',async()=>{
 const f=await state(),before=clone(f.p);
 await assert.rejects(()=>make.snapshotTrigger({auth:f.auth,p:f.p,phase:'preview'}),/RETRY_READBACK_REQUIRED/);
 const snapshot=await make.snapshotTrigger({auth:f.auth,p:f.p,phase:'preview',retryReadback:f.report});
 assert.equal(snapshot.function.revision,f.fn.revision);assert.equal(snapshot.traffic.targets[0].revision,f.traffic.targets[0].revision);
 assert.notEqual(snapshot.function.revision,snapshot.traffic.targets[0].revision);assert.deepEqual(f.p,before);
 assert.equal(make.validateSnapshotPreimage(f.p,'preview',snapshot,f.report),snapshot);
 assert.equal(make.closedPreimageDigest(f.p,'preview',f.report),pkg.digest(f.current.configuration));
 assert.notEqual(make.closedPreimageDigest(f.p,'preview',f.report),f.p.makeIngress.closedConfiguration.preview.expectedDigest);
});
for(const [label,change] of [
 ['function revision',f=>f.row.serviceConfig.revision='orbit360makeleadingresspreview-00023-other'],
 ['service UID',f=>f.run.uid='52345678-1234-4234-8234-123456789035'],
 ['serving revision',f=>f.run.trafficStatuses[0].revision=f.fn.revision],
 ['routing generation',f=>f.run.generation=f.run.observedGeneration='13']
])test('fresh retry snapshot rejects drift in '+label,async()=>{
 const f=await state();change(f);await assert.rejects(()=>make.snapshotTrigger({auth:f.auth,p:f.p,phase:'preview',retryReadback:f.report}));
 assert.ok(f.requests.every(r=>r.method==='GET'));
});
test('fresh grant and provider projections are read through existing owners; CLOSED digest controls subsequent CAS',async()=>{
 const f=await state(),actual=await n.currentRetryState({p:f.p,phase:'preview'},{db:f.db,auth:f.auth});
 assert.deepEqual(actual.configuration,f.current.configuration);assert.deepEqual(actual.function,f.fn);assert.deepEqual(actual.traffic,f.traffic);
 assert.equal(f.requests.length,3);assert.ok(f.requests.every(r=>r.method==='GET'));
 assert.equal((await make.requireClosedTrafficGrant({db:f.db,p:f.p,phase:'preview',retryReadback:f.report})).digest,pkg.digest(f.current.configuration));
 f.current.configuration.enabled=true;await assert.rejects(()=>make.requireClosedTrafficGrant({db:f.db,p:f.p,phase:'preview',retryReadback:f.report}),/GRANT_PREIMAGE_CHANGED/);
});
test('retained retry report cannot be borrowed by another Cloud Build or authority head',async()=>{
 const f=await state(),directory=fs.mkdtempSync(path.join(os.tmpdir(),'gi-retry-runtime-'));
 try{
  fs.writeFileSync(path.join(directory,n.RETRY_READBACK),JSON.stringify(f.report));
  const env={GRAVICENTRA_CLOUD_BUILD_ID:f.options.currentBuildId,I66_NATIVE_AUTHORITY_HEAD:f.options.authorityHead};
  assert.deepEqual(n.readRetryReadback(f.p,'preview',{directory,env}),f.report);
  for(const key of Object.keys(env))assert.throws(()=>n.readRetryReadback(f.p,'preview',{directory,env:{...env,[key]:'changed'}}));
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
});
function failedBuild(){
 const source=fs.readFileSync(path.join(__dirname,'gravicentra-i6-6-cloud-build-operational.test.cjs'),'utf8');
 const fixtureSource=source.slice(source.indexOf('function hostingPlan(){'),source.indexOf("test('native candidate"));
 const get=new Function('fs','path','__dirname','pkg','preview','n','g','scope','clone','root','UUID','HOSTING_UUID','EXEC_UUID',fixtureSource+';return {plan,build};');
 const values=get(fs,path,__dirname,pkg,require('./gravicentra-i6-6-cloud-build-preview.cjs'),n,require('./gravicentra-i6-6-operational-release-candidate.cjs'),require('./gravicentra-i66-make-release-scope.cjs'),clone,root,
  '12345678-1234-4234-8234-123456789035','22345678-1234-4234-8234-123456789035','32345678-1234-4234-8234-123456789035');
 const plan=values.plan(),build=values.build(plan);build.status='FAILURE';build.steps[1].status='FAILURE';delete build.results.artifactManifest;delete build.results.numArtifacts;return {plan,build};
}
test('actual failed provider execution is verified as FAILURE and never relabeled SUCCESS',()=>{
 const {plan,build}=failedBuild(),before=clone(build);assert.equal(n.validateBuild(plan,build,{failed:true}),build);assert.deepEqual(build,before);
 assert.throws(()=>n.validateBuild(plan,build),/BUILD_STATUS/);
 for(const mutate of [b=>b.status='SUCCESS',b=>b.status='TIMEOUT',b=>b.steps[0].status='FAILURE',b=>b.steps[1].status='SUCCESS',b=>b.steps[1].allowFailure=true,b=>b.sourceProvenance.resolvedGitSource.revision='f'.repeat(40),b=>b.results.buildStepImages=[]]){
  const bad=clone(build);mutate(bad);assert.throws(()=>n.validateBuild(plan,bad,{failed:true}));
 }
});
test('runtime wiring validates before claiming and threads the same restored preimage through the existing Make owner',()=>{
 const source=fs.readFileSync(path.join(__dirname,'gravicentra-i6-6-cloud-build-operational.cjs'),'utf8'),worker=source.slice(source.indexOf('async function worker(plan)'));
 assert.ok(worker.indexOf('verifyRetryRuntime(p,plan.phase')<worker.indexOf('io.retain(lockName(p,plan.phase)'));
 assert.ok(worker.indexOf('before-'+"'"+'+RETRY_READBACK')<worker.indexOf('io.retain(lockName(p,plan.phase)'));
 const owner=fs.readFileSync(path.join(__dirname,'gravicentra-i66-make-lead-protected-executor.cjs'),'utf8');
 assert.match(owner,/beforeDeploy\(\{db,auth,p,phase,requireFrom,authorityBlob,retryReadback,/);
 assert.match(owner,/snapshotTrigger\(\{auth,p,phase,retryReadback\}\)/);
 assert.match(owner,/captureTrigger\(\{db,auth,p,phase,retryReadback,/);
 assert.match(owner,/initializeClosed\(\{db,auth,p,phase,authorityBlob,retryReadback,/);
 assert.match(owner,/expectedDigest=closedPreimageDigest\(p,phase,retryReadback\)/);
});
