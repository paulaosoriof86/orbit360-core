'use strict';
// Offline authority and API fixtures only. No credential, network, mutation or
// production acceptance is supplied by these tests.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const owner=require('./gravicentra-i66-frontend-control.cjs');
const clone=x=>structuredClone(x),read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
function fixture(profile='fiveRoles'){
  const control=read(owner.P.cp),state=read(owner.P.state),transport=read(owner.P.transport);
  const pin=owner.physicalGuard(control,state,transport,fs),paths=owner.readonlyObserverPaths(profile);
  const qa='b'.repeat(40),head='c'.repeat(40),remote='d'.repeat(40),source=new Map(paths.map(p=>[p,fs.readFileSync(p,'utf8')]));
  const local=new Map(),io={readFileSync:(p,encoding)=>local.has(p)?local.get(p):fs.readFileSync(p,encoding)};
  const authority={schema:'GI_I66_READONLY_OBSERVER_AUTHORITY_V1',status:'APPROVED_EXACT_QA_ON_ACCEPTED_LIVE',profile,
    approvedByDirection:true,readOnly:true,noProductWrites:true,noReleaseTransitions:true,noSyntheticWrites:true,
    target:owner.readonlyObserverTarget(pin),qaSourceSha:qa,sourceQaRunId:10001,guardRunId:10002,
    qaPins:Object.fromEntries(paths.map(p=>[p,owner.blob(source.get(p))]))};
  control.i66OperationalContinuation20261115.postAcceptanceGovernanceQa={observers:{[profile]:authority}};
  const model={artifactMatched:false,ancestryFailure:false,calls:[]};
  const git=(...args)=>{
    if(args[0]==='merge-base'){if(model.ancestryFailure)throw Error('NO_ANCESTRY');return '';}
    const [sha,...rest]=args[1].split(':'),p=rest.join(':');
    assert.ok(source.has(p),'UNDECLARED_QA_READ_'+p);
    if(args[0]==='rev-parse'){assert.equal(sha,qa);return owner.blob(source.get(p));}
    assert.equal(args[0],'show');
    if(sha===qa)return source.get(p);
    assert.equal(sha,pin.sourceSha);
    return model.artifactMatched||owner.READONLY_PROFILES[profile].productDependencies.includes(p)?source.get(p):'old artifact observer bytes';
  };
  const resolve=()=>owner.resolveReadonlyObserver(profile,control,state,transport,io,git,head);
  const env={GITHUB_REPOSITORY:'paulaosoriof86/orbit360-core',GITHUB_REF_NAME:'recovery/fase-a-clean-20260831',GITHUB_SHA:head,GITHUB_RUN_ID:'10003'};
  const all=new Map([[owner.P.cp,owner.serial(control)],[owner.P.state,owner.serial(state)],[owner.P.transport,owner.serial(transport)],
    [owner.P.ledger,fs.readFileSync(owner.P.ledger,'utf8')]]);
  for(const suffix of ['RECEIPT','JOURNAL',...(pin.scope==='COMPOSITE'?['LIVE_PROOF']:[])]){
    const p=owner.genName(pin.generation,suffix);all.set(p,fs.readFileSync(p,'utf8'));
  }
  const api=async route=>{
    model.calls.push(route);
    if(route==='actions/runs/10003')return{id:10003,path:owner.READONLY_PROFILES[profile].workflow,head_sha:head,head_branch:env.GITHUB_REF_NAME,status:'in_progress'};
    if(route==='actions/runs/10001'||route==='actions/runs/10002'){
      const first=route.endsWith('10001');return{id:first?10001:10002,path:'.github/workflows/'+(first?'gravicentra-i66-privileged-role-parity-source-qa.yml':'gravicentra-release-lock-sync.yml'),
        head_sha:qa,head_branch:env.GITHUB_REF_NAME,status:'completed',conclusion:'success'};
    }
    if(route.includes('/jobs?')){
      const first=route.includes('/10001/');return{jobs:[{name:first?'signed-source-gate-no-production-writes':'verify-control-plane',status:'completed',conclusion:'success',
        steps:(first?['Source test with 5 roles, 12 domain writers and explicit negative boundaries','Canonical source blob and historic release guard without re-opening B4']:
          ['Fail closed through canonical shared governance preflight']).map((name,i)=>({name,number:4+i,status:'completed',conclusion:'success'}))}]};
    }
    if(route==='git/ref/heads/'+env.GITHUB_REF_NAME)return{object:{sha:remote}};
    if(route.startsWith('contents/')){
      const match=route.match(/^contents\/(.+)\?ref=([a-f0-9]{40})$/);assert.ok(match);assert.equal(match[2],remote);
      const p=decodeURIComponent(match[1]),text=all.get(p);assert.ok(text,'REMOTE_METADATA_NOT_PREDECLARED_'+p);
      return{path:p,sha:owner.blob(text),size:Buffer.byteLength(text),encoding:p===owner.P.cp?'none':'base64',
        content:p===owner.P.cp?'':Buffer.from(text).toString('base64')};
    }
    if(route.startsWith('git/blobs/')){
      const text=[...all.values()].find(v=>owner.blob(v)===route.slice(10));assert.ok(text);
      return{sha:owner.blob(text),encoding:'base64',content:Buffer.from(text).toString('base64')};
    }
    throw Error('UNEXPECTED_READONLY_API_'+route);
  };
  const readMarker=async()=>({sourceSha:pin.sourceSha,buildId:pin.buildId,gate:'I6.6',product:'Gravicentra Insurance'});
  return{control,state,transport,pin,authority,paths,source,local,model,io,git,resolve,env,all,api,readMarker};
}
test('separate read-only QA pins exact source while the real accepted artifact and receipt remain unchanged',async()=>{
  for(const profile of ['fiveRoles','performance']){
    const f=fixture(profile),before=JSON.stringify([f.control,f.state,f.transport]),resolution=f.resolve();
    assert.equal(resolution.mode,'INDEPENDENT_READONLY_QA');assert.notEqual(resolution.qaSourceSha,f.pin.sourceSha);
    assert.deepEqual(resolution.target,owner.readonlyObserverTarget(f.pin));
    for(const stage of ['before','after']){
      const result=await owner.verifyReadonlyObserver(resolution,{env:f.env,api:f.api,readMarker:f.readMarker,stage});
      assert.equal(result.sourceQaVerified,true);assert.equal(result.releaseTransitions,0);assert.equal(result.productWrites,0);
      assert.equal(result.syntheticWrites,0);assert.equal(result.hostedMarkersVerified.length,2);assert.equal(result.stage,stage);
    }
    assert.equal(JSON.stringify([f.control,f.state,f.transport]),before);assert.ok(f.model.calls.some(p=>p.startsWith('git/blobs/')));
  }
});
test('unchanged certified observer source retains artifact pin and grants no separate-QA fallback',()=>{
  const f=fixture();f.model.artifactMatched=true;delete f.control.i66OperationalContinuation20261115.postAcceptanceGovernanceQa;
  assert.equal(f.resolve().mode,'ARTIFACT_SOURCE');
  f.model.artifactMatched=false;assert.throws(f.resolve,/EXACT_QA_AUTHORITY_REQUIRED/);
  assert.throws(()=>owner.readonlyObserverPaths('synthetic-writer'),/PROFILE_NOT_ALLOWED/);
});
for(const [label,change] of [
  ['unapproved observer',f=>f.authority.approvedByDirection=false],['write permission',f=>f.authority.noProductWrites=false],
  ['release transition',f=>f.authority.noReleaseTransitions=false],['synthetic writer',f=>f.authority.noSyntheticWrites=false],
  ['different physical artifact',f=>f.authority.target.artifactId++],['different accepted receipt',f=>f.authority.target.receiptGitBlobSha='e'.repeat(40)],
  ['arbitrary QA head',f=>f.model.ancestryFailure=true],['missing pin',f=>delete f.authority.qaPins[f.paths[0]]],
  ['additional writer path',f=>f.authority.qaPins['functions/new-writer.js']='f'.repeat(40)],
  ['edited executing driver',f=>f.local.set(f.paths.find(p=>p.includes('route-readonly.cjs')), 'unapproved bytes')],
  ['changed product role dependency',f=>f.local.set('functions/product-active-role-contract.js','different product contract')],
  ['reused QA run as guard',f=>f.authority.guardRunId=f.authority.sourceQaRunId]
])test('read-only authority rejects '+label,()=>{const f=fixture();change(f);assert.throws(f.resolve);});
for(const [label,change] of [
  ['different QA source',v=>v.head_sha='e'.repeat(40)],['failed source run',v=>v.conclusion='failure'],
  ['wrong source workflow',v=>v.path='.github/workflows/other.yml']
])test('real Source QA API identity rejects '+label,async()=>{
  const f=fixture(),api=async route=>{const v=await f.api(route);if(route==='actions/runs/10001')change(v);return v;};
  await assert.rejects(()=>owner.verifyReadonlyObserver(f.resolve(),{env:f.env,api,readMarker:f.readMarker}));
});
for(const [label,change] of [
  ['only setup succeeded',v=>v.jobs[0].steps=[{name:'Set up job',number:4,status:'completed',conclusion:'success'}]],
  ['main test skipped',v=>v.jobs[0].steps[0].conclusion='skipped'],
  ['wrong auxiliary job',v=>v.jobs[0].name='upload-only'],
  ['main job failed',v=>v.jobs[0].conclusion='failure'],
  ['duplicate required step',v=>v.jobs[0].steps.push(clone(v.jobs[0].steps[0]))]
])test('source success does not mask '+label,async()=>{
  const f=fixture(),api=async route=>{const v=await f.api(route);if(route.includes('/10001/jobs?'))change(v);return v;};
  await assert.rejects(()=>owner.verifyReadonlyObserver(f.resolve(),{env:f.env,api,readMarker:f.readMarker}));
});
test('a skipped canonical guard fails even when another guard job passes',async()=>{
  const f=fixture(),api=async route=>{const v=await f.api(route);if(route.includes('/10002/jobs?')){
    v.jobs[0].steps[0].conclusion='skipped';v.jobs.push({name:'availability',status:'completed',conclusion:'success',steps:[{number:5,conclusion:'success'}]});}return v;};
  await assert.rejects(()=>owner.verifyReadonlyObserver(f.resolve(),{env:f.env,api,readMarker:f.readMarker}));
});
test('changed remote control, authority, receipt, marker or unreadable API cannot produce after-run acceptance',async()=>{
  for(const mutate of [f=>{const x=JSON.parse(f.all.get(owner.P.cp));x.i66FrontendReleaseHead.artifactId++;f.all.set(owner.P.cp,owner.serial(x));},
    f=>{const x=JSON.parse(f.all.get(owner.P.cp));x.i66OperationalContinuation20261115.postAcceptanceGovernanceQa.observers.fiveRoles.guardRunId++;f.all.set(owner.P.cp,owner.serial(x));},
    f=>f.all.set(f.pin.receiptPath,f.all.get(f.pin.receiptPath)+' '),
    f=>f.readMarker=async()=>({sourceSha:'e'.repeat(40),buildId:f.pin.buildId,gate:'I6.6',product:'Gravicentra Insurance'}),
    f=>f.api=async()=>{throw Error('HTTP_403');}]){
    const f=fixture(),resolution=f.resolve();mutate(f);
    await assert.rejects(()=>owner.verifyReadonlyObserver(resolution,{env:f.env,api:f.api,readMarker:f.readMarker,stage:'after'}));
  }
});
test('the read-only role marker excludes both existing Preview writer jobs even when markers are combined',()=>{
  const file=fs.readFileSync(owner.READONLY_PROFILES.fiveRoles.workflow,'utf8');
  for(const job of ['existing-preview-document-fixture','signed-preview']){
    const line=file.match(new RegExp('  '+job+':\\n    if: ([^\\n]+)'))?.[1];assert.ok(line);
    assert.ok(line.includes("!contains(github.event.head_commit.message, 'I66_LIVE_FIVE_ROLE_MATRIX')"));
  }
});
test('actual topbar certificate rejects console and HTTP errors while preserving the separate timing assertion',()=>{
  const file=fs.readFileSync(owner.READONLY_PROFILES.performance.workflow,'utf8');
  const start=file.indexOf("const x=require(process.env.RUNNER_TEMP+'/gi-i66-live-perf-summary.json');");assert.ok(start>0);
  const stop=file.indexOf('\n          NODE',start);assert.ok(stop>start);const code=file.slice(start,stop);
  const good={status:'LIVE_READONLY_MEASURED',origin:'https://app.aysseguros.com',auth:{activation:{role:'Operativo'},pageErrors:0,consoleErrors:0,httpErrorClasses:{}},
    firestoreWrites:0,paymentActions:0,globalTopbarSearch:{ready:true,first:{resultCount:3,timeMs:100},second:{resultCount:3,timeMs:50}},globalTopbarTiming:{projection:{calls:0}}};
  const run=value=>vm.runInNewContext(code,{require:()=>value,process:{env:{RUNNER_TEMP:'/fixture'}},console:{log(){}}});
  assert.doesNotThrow(()=>run(good));
  for(const change of [x=>x.auth.consoleErrors=1,x=>x.auth.httpErrorClasses={backend_403:1},x=>delete x.auth.httpErrorClasses,
    x=>x.globalTopbarSearch.first.timeMs=2200,x=>x.auth.pageErrors=1]){const bad=clone(good);change(bad);assert.throws(()=>run(bad));}
});
