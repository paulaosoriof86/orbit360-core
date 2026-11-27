'use strict';
const {test,after}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const h=require('./gravicentra-i6-6-cloud-build-signed-cas.cjs');
const DIR='artifacts/orbit360-recovery/release-control/',CP=DIR+'CONTROL_PLANE.json',STATE='orbit360-platform/docs/recovery/orbit360-recovery-state-v1.json',JOURNAL=DIR+'I6_6_FRONTEND_E00036_JOURNAL.json';
const HEAD='a'.repeat(40),NEXT='b'.repeat(40),OTHER='c'.repeat(40),SECRET='CONTROL_CONTENT_MUST_NOT_APPEAR_IN_DIAGNOSTICS';
const serial=v=>JSON.stringify(v,null,2)+'\n',hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'i66-cas-test-'));
after(()=>fs.rmSync(temp,{recursive:true,force:true}));
const git=(args,input)=>execFileSync('git',args,{cwd:temp,input,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trimEnd();
git(['init','--quiet']);
for(const [file,value] of Object.entries({[CP]:serial({generation:35}),[STATE]:serial({preserve:true}),
  'source/a.js':'// untouched product\n','source/a.c':'// sorting fixture\n','source/a/file.js':'// directory ordering\n'})){
  const target=path.join(temp,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,value);
}
git(['add','.']);const baseTreeSha=git(['write-tree']);
const tree={sha:baseTreeSha,truncated:false,tree:git(['ls-tree','-r','-t','-z',baseTreeSha]).split('\0').filter(Boolean).map(row=>{
  const match=/^(\d+) (\w+) ([a-f0-9]{40})\t([\s\S]+)$/.exec(row);
  return{mode:match[1],type:match[2],sha:match[3],path:match[4]};
})};
const base={sha:HEAD,commit:{tree:{sha:baseTreeSha}}};
const input={head:HEAD,headline:'I6.6 preserve exact control after observed native gate',
  entries:{[CP]:{generation:36,privateTestSentinel:SECRET},[JOURNAL]:{status:'PENDING',sourceSha:'d'.repeat(40)},[STATE]:{preserve:true}},
  allowedPaths:[CP,JOURNAL,STATE],execution:{buildId:'11111111-2222-4333-8444-555555555555',sourceSha:'d'.repeat(40),phase:'preview',authorityHead:HEAD}};
const prepared=h.preparePacket(input,base,tree);
function gitTarget(change){
  git(['read-tree',baseTreeSha]);
  for(const [file,value] of Object.entries(input.entries)){
    const blob=git(['hash-object','-w','--stdin'],serial(value));git(['update-index','--add','--cacheinfo','100644',blob,file]);
  }
  if(change)change();return git(['write-tree']);
}
const targetTree=gitTarget();
function candidate(){return{sha:NEXT,parents:[{sha:HEAD}],commit:{message:input.headline,tree:{sha:targetTree},verification:{verified:true,reason:'valid'}}};}
function fixture({refs=[HEAD,NEXT,NEXT],commit=candidate(),retentionError,readbackChange}={}){
  const calls=[],events=[],diagnostics=[];let retained,index=0;
  async function getJson(url){
    calls.push(['GET',url]);
    if(url.endsWith('/git/ref/heads/'+h.C.branch))return{ref:'refs/heads/'+h.C.branch,object:{type:'commit',sha:refs[Math.min(index++,refs.length-1)]}};
    if(url.endsWith('/commits/'+HEAD))return base;
    if(url.endsWith('/git/trees/'+baseTreeSha+'?recursive=1'))return tree;
    if(url.endsWith('/commits/'+NEXT))return commit;
    throw Error('Unexpected test read');
  }
  const io={getJson,pause:async()=>{},diagnostic:x=>diagnostics.push(x),emit:x=>events.push(x),
    retainOnce:async req=>{
      calls.push(['RETAIN']);assert.equal(req.ifGenerationMatch,0);assert.equal(req.bucket,h.C.bucket);
      if(retentionError)throw retentionError;retained=Buffer.from(req.bytes);
      return{bucket:req.bucket,name:req.name,generation:'1795600000000001',sha256:hash(req.bytes),size:req.bytes.length};
    },readObjectExact:async ref=>{
      calls.push(['READ_OBJECT']);const out={generation:ref.generation,bytes:Buffer.from(retained)};
      if(readbackChange)readbackChange(out);return out;
    }};
  return{io,calls,events,diagnostics};
}

test('packet preserves owner JSON and Git reproduces its exact whole target tree',()=>{
  assert.equal(prepared.packet.expectedTree,targetTree);
  assert.deepEqual(prepared.packet.changedPaths,[CP,JOURNAL].sort());
  for(const entry of prepared.packet.entries){
    assert.equal(entry.content,serial(input.entries[entry.path]));
    assert.equal(entry.newBlobSha,git(['hash-object','--stdin'],entry.content));
    assert.equal(entry.sha256,hash(Buffer.from(entry.content)));
  }
  assert.equal(prepared.name,'i66/signed-cas/'+input.execution.buildId+'/'+hash(prepared.bytes)+'.json');
  assert.equal(h.preparePacket(input,base,tree).sha256,prepared.sha256);
});
test('complete base tree must match Git root and each subtree',()=>{
  for(const mutate of [x=>x.truncated=true,x=>x.sha=OTHER,x=>x.tree[0].sha=OTHER,x=>x.tree.push(x.tree[0])]){
    const changed=structuredClone(tree);mutate(changed);assert.throws(()=>h.preparePacket(input,base,changed),/HOLD_/);
  }
});
test('owner must supply exact unique path set before any IO',()=>{
  for(const allowedPaths of [undefined,[],[CP,JOURNAL],[...input.allowedPaths,CP],[...input.allowedPaths,'tools/fake.cjs']]){
    assert.throws(()=>h.preparePacket({...input,allowedPaths},base,tree),/EXACT_OWNER_PATHS_REQUIRED/);
  }
});
test('product/code and out-of-scope authority paths cannot enter a metadata packet',()=>{
  for(const file of ['functions/product-ops-leads-domain.js','tools/change.cjs','.github/workflows/fake.yml','index.html',
    DIR+'I6_6_APPROVED_PRODUCT_DELTA_MANIFEST_20261110.json',DIR+'I6_6_FRONTEND_PROMOTION_AUTHORITY.json',
    DIR+'../SOURCE.json',DIR+'I6_6_FAKE_PROGRESS.json/extra',DIR+'I6_6_FAKE_PROGRESS.js']){
    assert.throws(()=>h.preparePacket({...input,entries:{[file]:{}},allowedPaths:[file]},base,tree),/METADATA_ONLY_SCOPE/);
  }
});
test('metadata gate accepts generation and explicit progress/snapshot paths only with exact owner scope',()=>{
  for(const file of [JOURNAL,DIR+'I6_6_FRONTEND_E00036_LIVE_UI.json',DIR+'I6_6_FOCAL_PROGRESS_R84_20261125.json',DIR+'I6_6_OBSERVER_SNAPSHOT_20261125.json'])assert.equal(h.metadataPath(file),true);
});
test('source/authority/UUID/phase and headline are not invented',()=>{
  for(const execution of [{...input.execution,sourceSha:'missing'},{...input.execution,buildId:'4550000000'},
    {...input.execution,authorityHead:'missing'},{...input.execution,phase:'package'},{...input.execution,artifactId:1}]){
    assert.throws(()=>h.preparePacket({...input,execution},base,tree),/HOLD_/);
  }
  assert.throws(()=>h.preparePacket({...input,headline:'first\nsecond'},base,tree),/HEADLINE/);
});
test('JSON serialization cannot silently drop non-JSON values',()=>{
  for(const value of [undefined,NaN,Infinity,()=>{},new Date(),1n])assert.throws(()=>h.preparePacket({...input,entries:{[CP]:{value}},allowedPaths:[CP]},base,tree),/HOLD_/);
  const cyclic={};cyclic.self=cyclic;assert.throws(()=>h.preparePacket({...input,entries:{[CP]:cyclic},allowedPaths:[CP]},base,tree),/PLAIN_JSON/);
});
test('verified exact one-parent commit is accepted',()=>assert.equal(h.verifyCommit(prepared,candidate()),NEXT));
for(const [label,modify,code] of [
  ['unsigned',x=>{x.commit.verification={verified:false,reason:'unsigned'};},'GITHUB_SIGNATURE_UNVERIFIED'],
  ['missing verification',x=>{delete x.commit.verification;},'GITHUB_SIGNATURE_UNVERIFIED'],
  ['wrong parent',x=>{x.parents=[{sha:OTHER}];},'ONE_EXPECTED_PARENT'],
  ['merge commit',x=>{x.parents.push({sha:OTHER});},'ONE_EXPECTED_PARENT'],
  ['wrong headline',x=>{x.commit.message+='\nextra body';},'EXACT_HEADLINE'],
  ['wrong target blob',x=>{x.commit.tree.sha=OTHER;},'EXACT_REQUESTED_TREE']]){
  test('readback rejects '+label,()=>{const value=candidate();modify(value);assert.throws(()=>h.verifyCommit(prepared,value),new RegExp(code));});
}
test('Git readback rejects an extra source change, deletion or mode change',()=>{
  const variants=[
    ()=>{const blob=git(['hash-object','-w','--stdin'],'unapproved source\n');git(['update-index','--cacheinfo','100644',blob,'source/a.js']);},
    ()=>git(['update-index','--force-remove','source/a.js']),
    ()=>git(['update-index','--chmod=+x','source/a.js'])
  ];
  for(const variant of variants){const value=candidate();value.commit.tree.sha=gitTarget(variant);assert.throws(()=>h.verifyCommit(prepared,value),/EXACT_REQUESTED_TREE/);}
});
test('handoff retains exactly once and returns only observed signed commit',async()=>{
  const f=fixture();assert.equal(await h.requestSignedCas({...input,io:f.io,maxPolls:2}),NEXT);
  assert.equal(f.calls.filter(x=>x[0]==='RETAIN').length,1);
  assert.equal(f.events.length,1);assert.equal(f.events[0].sha256,prepared.sha256);
  assert.equal(JSON.stringify(f.events).includes(SECRET),false);
  assert.equal(JSON.stringify(f.events).includes('entries'),false);
});
test('already committed exact signed change is recovered without a new write',async()=>{
  const f=fixture({refs:[NEXT,NEXT]});assert.equal(await h.requestSignedCas({...input,io:f.io}),NEXT);
  assert.equal(f.calls.some(x=>x[0]==='RETAIN'),false);
});
test('unsigned connector commit remains HOLD even when all requested bytes match',async()=>{
  const commit=candidate();commit.commit.verification={verified:false,reason:'unsigned'};
  const f=fixture({commit});await assert.rejects(h.requestSignedCas({...input,io:f.io}),/GITHUB_SIGNATURE_UNVERIFIED/);
  assert.equal(f.calls.filter(x=>x[0]==='RETAIN').length,1);
});
test('concurrent branch drift cannot be adopted by the handoff',async()=>{
  const f=fixture({refs:[HEAD,NEXT,OTHER]});await assert.rejects(h.requestSignedCas({...input,io:f.io}),/BRANCH_MOVED_DURING_READBACK/);
});
test('lost conditional-write response is not retried or reported retained',async()=>{
  const f=fixture({retentionError:Error('secret upload URL?token=DO_NOT_PRINT')});
  await assert.rejects(h.requestSignedCas({...input,io:f.io}),/RETENTION_UNCONFIRMED_NO_RETRY/);
  assert.equal(f.calls.filter(x=>x[0]==='RETAIN').length,1);assert.equal(f.events.length,0);
});
test('immutable object generation and full bytes must read back before handoff is emitted',async()=>{
  for(const readbackChange of [x=>{x.generation='99';},x=>{x.bytes=Buffer.from('changed');}]){
    const f=fixture({readbackChange});await assert.rejects(h.requestSignedCas({...input,io:f.io}),/RETENTION_READBACK_/);assert.equal(f.events.length,0);
  }
});
test('bounded polling never mistakes unchanged branch for successful CAS',async()=>{
  const f=fixture({refs:[HEAD]});await assert.rejects(h.requestSignedCas({...input,io:f.io,maxPolls:2}),/SIGNED_COMMIT_NOT_OBSERVED/);
  assert.equal(f.calls.filter(x=>x[0]==='RETAIN').length,1);
});
test('public provider GET retries only known transient transport errors, up to three',async()=>{
  const f=fixture();const get=f.io.getJson;delete f.io.getJson;let firstReads=0;
  f.io.fetch=async(url,options)=>{
    assert.equal(options.method,undefined);assert.equal(options.headers.Authorization,undefined);
    if(url.endsWith('/commits/'+HEAD)&&++firstReads<3)throw Object.assign(Error('token=MUST_NOT_PRINT'),{cause:{code:'ECONNRESET'}});
    return{ok:true,status:200,json:()=>get(url)};
  };
  assert.equal(await h.requestSignedCas({...input,io:f.io}),NEXT);assert.equal(firstReads,3);
  assert.equal(f.diagnostics.length,2);assert.equal(f.diagnostics.some(x=>x.includes('MUST_NOT_PRINT')),false);
});
test('HTTP denial does not retry and cannot cause retention',async()=>{
  const f=fixture();delete f.io.getJson;let reads=0;
  f.io.fetch=async()=>{reads++;return{ok:false,status:403};};
  await assert.rejects(h.requestSignedCas({...input,io:f.io}),/HTTP_STATUS_403/);
  assert.equal(reads,1);assert.equal(f.calls.some(x=>x[0]==='RETAIN'),false);
});

const native=require('./gravicentra-i6-6-cloud-build-operational.cjs');
const operatorInput={...input,execution:{...input.execution,phase:'live'}};
const operatorPrepared=h.preparePacket(operatorInput,base,tree);
function operatorBuild(status='WORKING'){
  const plan={schema:native.C.planSchema,provider:native.C.provider,phase:'live',repository:native.C.repository,branch:native.C.branch,
    projectId:native.C.projectId,projectNumber:native.C.projectNumber,region:native.C.region,serviceAccount:native.C.serviceAccount,bucket:native.C.bucket,
    authorityHead:HEAD,candidateSha256:'1'.repeat(64),mechanismSha:'2'.repeat(40),sourceSha:operatorInput.execution.sourceSha,requestVersion:35,
    transportBlob:'3'.repeat(40),financialAuthorityBlob:'4'.repeat(40),workflowBlob:'5'.repeat(40),
    blocks:Object.fromEntries(Object.keys(native.blockNames('live')).map(key=>[key,'6'.repeat(64)]))};
  const config=native.configFor(plan),start='2026-11-25T12:00:00Z',finish='2026-11-25T12:10:00Z',id=operatorInput.execution.buildId;
  const build={...config,id,name:'projects/'+native.C.projectNumber+'/locations/'+native.C.region+'/builds/'+id,projectId:native.C.projectId,status,
    source:{gitSource:{url:native.C.repositoryUrl,revision:HEAD}},sourceProvenance:{resolvedGitSource:{url:native.C.repositoryUrl,revision:HEAD}},
    createTime:'2026-11-25T11:59:59Z',startTime:start};
  if(status==='SUCCESS')Object.assign(build,{finishTime:finish,steps:config.steps.map(step=>({...step,status:'SUCCESS',timing:{startTime:start,endTime:finish}})),
    results:{buildStepImages:['sha256:'+'7'.repeat(64),'sha256:'+'8'.repeat(64)],numArtifacts:String(Object.keys(native.F).length),
      artifactManifest:'gs://'+native.C.bucket+'/'+native.prefix(plan,id)+'artifacts-'+id+'.json'}});
  return build;
}
function operatorFixture({bytes=operatorPrepared.bytes,refs=[HEAD,HEAD,NEXT,NEXT],commit=candidate(),builds=[operatorBuild()],mutateObject,post}={}){
  const digest=hash(bytes),uri='gs://'+h.C.bucket+'/i66/signed-cas/'+operatorInput.execution.buildId+'/'+digest+'.json';
  const reference=h.operatorReference(uri+'#1795600000000001',digest),events=[],payloads=[];let refIndex=0,buildIndex=0;
  const io={
    readObjectExact:async ref=>{events.push('object');assert.deepEqual(ref,reference);
      const object={metadata:{bucket:ref.bucket,name:ref.name,generation:ref.generation,size:String(bytes.length)},bytes:Buffer.from(bytes)};
      if(mutateObject)mutateObject(object);return object;},
    readBuild:async id=>{events.push('build');assert.equal(id,operatorInput.execution.buildId);return builds[Math.min(buildIndex++,builds.length-1)];},
    getJson:async url=>{events.push(url);
      if(url.endsWith('/git/ref/heads/'+h.C.branch))return{ref:'refs/heads/'+h.C.branch,object:{type:'commit',sha:refs[Math.min(refIndex++,refs.length-1)]}};
      if(url.endsWith('/commits/'+HEAD))return base;
      if(url.endsWith('/git/trees/'+baseTreeSha+'?recursive=1'))return tree;
      if(url.endsWith('/commits/'+NEXT))return commit;
      throw Error('Unexpected operator read');},
    createCommit:async payload=>{events.push('POST');payloads.push(payload);return post?post(payload):{data:{createCommitOnBranch:{commit:{oid:NEXT}}}};}
  };
  return {reference,events,payloads,io,args:[reference.uri+'#'+reference.generation,reference.sha256]};
}
const operate=(fixture,mode='apply')=>h.operateSignedCas(fixture.reference,{mode,io:fixture.io,env:{}});
test('operator CLI defaults to inspect and never writes or exposes retained JSON',async()=>{
  const f=operatorFixture({refs:[HEAD]}),emitted=[];
  const result=await h.operatorMain(f.args,{io:f.io,env:{},emit:x=>emitted.push(x)});
  assert.equal(result.mode,'inspect');assert.equal(result.status,'INSPECTED_PENDING_NO_WRITE');assert.equal(result.writeAttempts,0);
  assert.deepEqual(result.changedPaths,operatorPrepared.packet.changedPaths);assert.equal(f.payloads.length,0);
  assert.equal(JSON.stringify(emitted).includes(SECRET),false);assert.deepEqual(h.parseOperatorArgs(['inspect',...f.args]),h.parseOperatorArgs(f.args));
});
test('operator requires explicit apply and exact retained digest/generation before IO',async()=>{
  const f=operatorFixture();assert.equal(h.parseOperatorArgs(['apply',...f.args]).mode,'apply');
  for(const args of [[],['apply'],['apply',...f.args,'extra'],['--apply',...f.args],[f.reference.uri,f.reference.sha256],
    [f.args[0].replace('#1795600000000001','#0'),f.args[1]],[f.args[0],'0'.repeat(64)],
    [f.args[0].replace(h.C.bucket,'foreign-bucket'),f.args[1]],[f.args[0].replace('/i66/signed-cas/','/i66/other/'),f.args[1]]])
    await assert.rejects(h.operatorMain(args,{io:f.io,env:{},emit:()=>{}}),/I66_SIGNED_CAS_HOLD_/);
  assert.equal(f.events.length,0);
  for(const env of [{GRAVICENTRA_BUILD_PROVIDER:'CLOUD_BUILD'},{GRAVICENTRA_CLOUD_BUILD_ID:operatorInput.execution.buildId},{I66_NATIVE_AUTHORITY_HEAD:HEAD},{I66_NATIVE_PLAN_SHA256:'1'.repeat(64)}])
    await assert.rejects(h.operateSignedCas(f.reference,{mode:'apply',io:f.io,env}),/OPERATOR_OUTSIDE_CLOUD_BUILD/);
  assert.equal(f.events.length,0);
});
test('operator verifies generation, metadata, bytes and UTF-8 before provider or GitHub reads',async()=>{
  for(const mutateObject of [o=>o.metadata.bucket='other',o=>o.metadata.name+='other',o=>o.metadata.generation='2',o=>o.metadata.size='1',o=>o.bytes=Buffer.from('altered')]){
    const f=operatorFixture({mutateObject});await assert.rejects(operate(f),/OPERATOR_OBJECT_/);assert.deepEqual(f.events,['object']);
  }
  for(const bytes of [Buffer.from([0xff]),Buffer.from('{'),Buffer.from('null'),Buffer.from(serial(operatorPrepared.packet).replace('"schema"','"extra":true,"schema"'))]){
    const f=operatorFixture({bytes});await assert.rejects(operate(f),/OPERATOR_PACKET_/);assert.deepEqual(f.events,['object']);
  }
});
for(const [label,mutate] of [
  ['wrong repository',p=>p.repository='other/repo'],['wrong branch',p=>p.branch='main'],['wrong provider',p=>p.provider='GITHUB_ACTIONS'],
  ['Preview packet',p=>p.execution.phase='preview'],['crossed UUID',p=>p.execution.buildId='99999999-2222-4333-8444-555555555555'],
  ['extra execution key',p=>p.execution.token='DO_NOT_LOG'],['noncanonical entry',p=>{const e=p.entries[0];e.content=JSON.stringify(JSON.parse(e.content));const b=Buffer.from(e.content);e.bytes=b.length;e.newBlobSha=git(['hash-object','--stdin'],b);e.sha256=hash(b);}],
  ['wrong entry hash',p=>p.entries[0].sha256='0'.repeat(64)],['duplicate path',p=>p.entries.push(p.entries[0])],
  ['product mutation',p=>p.entries[0].path='functions/product.js'],['extra owner path',p=>p.allowedPaths.push(DIR+'I6_6_EXTRA_PROGRESS.json')],
  ['wrong preimage blob',p=>p.entries[0].baseBlobSha=OTHER],['wrong expected tree',p=>p.expectedTree=OTHER],
  ['wrong base tree',p=>p.expectedBaseTree=OTHER],['omitted changed path',p=>p.changedPaths=[]]
])test('operator rejects '+label+' before any write',async()=>{
  const packet=structuredClone(operatorPrepared.packet);mutate(packet);const f=operatorFixture({bytes:Buffer.from(serial(packet))});
  await assert.rejects(operate(f),/I66_SIGNED_CAS_HOLD_/);assert.equal(f.payloads.length,0);
});
test('operator reuses actual native Build validation and matches source and authority',async()=>{
  for(const change of [b=>b.id='99999999-2222-4333-8444-555555555555',b=>b.serviceAccount='foreign',
    b=>b.source.gitSource.revision=OTHER,b=>b.steps[1].args[0]='other.cjs',b=>b.availableSecrets={},
    b=>{const p=JSON.parse(b.steps[1].args[2]);p.sourceSha=OTHER;Object.assign(b,native.configFor(p));},
    b=>{const p=JSON.parse(b.steps[1].args[2]);p.authorityHead=OTHER;Object.assign(b,native.configFor(p));b.source.gitSource.revision=OTHER;b.sourceProvenance.resolvedGitSource.revision=OTHER;}]){
    const build=operatorBuild();change(build);const f=operatorFixture({builds:[build]});await assert.rejects(operate(f));assert.equal(f.payloads.length,0);
  }
  for(const status of ['FAILURE','CANCELLED','TIMEOUT','QUEUED']){
    const f=operatorFixture({builds:[operatorBuild(status)],refs:[NEXT,NEXT]});await assert.rejects(operate(f),/OPERATOR_BUILD_NOT_ACTIVE_OR_SUCCESSFUL/);assert.equal(f.payloads.length,0);
  }
});
test('exact signed commit is adopted without a write while WORKING or after real SUCCESS',async()=>{
  for(const status of ['WORKING','SUCCESS']){
    const f=operatorFixture({builds:[operatorBuild(status)],refs:[NEXT,NEXT]}),result=await operate(f);
    assert.equal(result.status,'EXACT_SIGNED_COMMIT_ALREADY_PRESENT');assert.equal(result.branchHead,NEXT);assert.equal(result.writeAttempts,0);assert.equal(f.payloads.length,0);
  }
  const stale=operatorFixture({builds:[operatorBuild('SUCCESS')],refs:[HEAD]});
  await assert.rejects(operate(stale),/OPERATOR_COMPLETED_BUILD_WITHOUT_COMMIT/);assert.equal(stale.payloads.length,0);
});
test('new commit requires a fresh WORKING Build and adopts a concurrent exact commit without writing',async()=>{
  const finished=operatorFixture({builds:[operatorBuild(),operatorBuild('SUCCESS')],refs:[HEAD]});
  await assert.rejects(operate(finished),/OPERATOR_NEW_COMMIT_REQUIRES_WORKING_BUILD/);assert.equal(finished.payloads.length,0);
  const concurrent=operatorFixture({refs:[HEAD,NEXT,NEXT]});
  assert.equal((await operate(concurrent)).status,'EXACT_SIGNED_COMMIT_ALREADY_PRESENT');assert.equal(concurrent.payloads.length,0);
  const concurrentFinished=operatorFixture({builds:[operatorBuild(),operatorBuild('SUCCESS')],refs:[HEAD,NEXT,NEXT]});
  assert.equal((await operate(concurrentFinished)).status,'EXACT_SIGNED_COMMIT_ALREADY_PRESENT');assert.equal(concurrentFinished.payloads.length,0);
});
test('operator emits one original GraphQL CAS with all exact base64 bytes and checks signed REST readback',async()=>{
  const f=operatorFixture(),result=await operate(f);assert.equal(result.status,'SIGNED_COMMIT_APPLIED');assert.equal(result.writeAttempts,1);
  assert.equal(f.payloads.length,1);const payload=f.payloads[0],value=payload.variables.input;
  assert.equal(payload.query,'mutation($input:CreateCommitOnBranchInput!){createCommitOnBranch(input:$input){commit{oid}}}');
  assert.deepEqual(value.branch,{repositoryNameWithOwner:h.C.repository,branchName:h.C.branch});assert.equal(value.expectedHeadOid,HEAD);
  assert.deepEqual(value.message,{headline:operatorInput.headline});assert.deepEqual(Object.keys(value.fileChanges),['additions']);
  assert.deepEqual(value.fileChanges.additions.map(e=>({path:e.path,content:Buffer.from(e.contents,'base64').toString('utf8')})),operatorPrepared.packet.entries.map(e=>({path:e.path,content:e.content})));
  assert.equal(f.events.filter(e=>e==='build').length,2);assert.ok(f.events.includes('https://api.github.com/repos/'+h.C.repository+'/commits/'+NEXT));
});
test('a lost or rejected mutation response adopts only exact signed readback and never repeats POST',async()=>{
  for(const post of [()=>{throw Error('Authorization: DO_NOT_LOG');},()=>({errors:[{message:'DO_NOT_LOG'}]}),()=>({})]){
    const f=operatorFixture({post}),result=await operate(f);assert.equal(result.status,'EXACT_SIGNED_COMMIT_RECOVERED');assert.equal(f.payloads.length,1);
  }
  const unchanged=operatorFixture({refs:[HEAD],post:()=>{throw Error('lost response');}});
  await assert.rejects(operate(unchanged),/OPERATOR_WRITE_UNCONFIRMED_NO_RETRY/);assert.equal(unchanged.payloads.length,1);
  const mismatch=operatorFixture({post:()=>({data:{createCommitOnBranch:{commit:{oid:OTHER}}}})});
  await assert.rejects(operate(mismatch),/OPERATOR_RETURNED_COMMIT_MISMATCH/);assert.equal(mismatch.payloads.length,1);
});
for(const [label,mutate,error] of [
  ['unsigned',c=>c.commit.verification={verified:false,reason:'unsigned'},'GITHUB_SIGNATURE_UNVERIFIED'],
  ['other parent',c=>c.parents=[{sha:OTHER}],'ONE_EXPECTED_PARENT'],['merge',c=>c.parents.push({sha:OTHER}),'ONE_EXPECTED_PARENT'],
  ['extra message',c=>c.commit.message+='\nbody','EXACT_HEADLINE'],['other tree',c=>c.commit.tree.sha=OTHER,'EXACT_REQUESTED_TREE']
])test('operator cannot adopt '+label+' regardless of acknowledged write',async()=>{
  const commit=candidate();mutate(commit);
  for(const refs of [[NEXT,NEXT],[HEAD,HEAD,NEXT,NEXT]]){
    const f=operatorFixture({refs,commit});await assert.rejects(operate(f),new RegExp(error));assert.equal(f.payloads.length,refs[0]===NEXT?0:1);
  }
});
test('operator rejects post-write branch drift and unreadable acknowledgement without a second write',async()=>{
  const drift=operatorFixture({refs:[HEAD,HEAD,NEXT,OTHER]});await assert.rejects(operate(drift),/BRANCH_MOVED_DURING_READBACK/);assert.equal(drift.payloads.length,1);
  const unreadable=operatorFixture(),read=unreadable.io.getJson;
  unreadable.io.getJson=async url=>{if(unreadable.payloads.length)throw Error('provider unavailable');return read(url);};
  await assert.rejects(operate(unreadable),/provider unavailable/);assert.equal(unreadable.payloads.length,1);
});
function cliFixture(){
  const f=operatorFixture(),calls=[];
  const exec=(command,args,options)=>{
    calls.push({command,args,options});assert.deepEqual(options.stdio,['pipe','pipe','pipe']);assert.equal(options.timeout,60000);
    if(command==='gcloud'){
      assert.ok(args.includes('--project='+native.C.projectId));
      if(args[0]==='storage'){
        assert.equal(args[args[1]==='objects'?3:2],f.reference.uri+'#'+f.reference.generation);
        if(args[1]==='objects')return Buffer.from(JSON.stringify({bucket:f.reference.bucket,name:f.reference.name,generation:f.reference.generation,size:String(operatorPrepared.bytes.length)}));
        assert.equal(args[1],'cat');return operatorPrepared.bytes;
      }
      assert.deepEqual(args.slice(0,3),['builds','describe',operatorInput.execution.buildId]);assert.ok(args.includes('--region='+native.C.region));return Buffer.from(JSON.stringify(operatorBuild()));
    }
    assert.equal(command,'gh');assert.ok(args.includes('github.com'));
    if(args[1]==='graphql')return Buffer.from(JSON.stringify({data:{createCommitOnBranch:{commit:{oid:NEXT}}}}));
    const endpoint=args[1];
    if(endpoint.endsWith('/commits/'+HEAD))return Buffer.from(JSON.stringify(base));
    if(endpoint.endsWith('/git/trees/'+baseTreeSha+'?recursive=1'))return Buffer.from(JSON.stringify(tree));
    if(endpoint.endsWith('/commits/'+NEXT))return Buffer.from(JSON.stringify(candidate()));
    assert.ok(endpoint.endsWith('/git/ref/heads/'+h.C.branch));
    return Buffer.from(JSON.stringify({ref:'refs/heads/'+h.C.branch,object:{type:'commit',sha:calls.some(c=>c.command==='gh'&&c.args[1]==='graphql')?NEXT:HEAD}}));
  };
  return {f,calls,exec};
}
test('real CLI adapter inspects exact GCS generation only and sends GraphQL JSON exclusively over stdin',async()=>{
  for(const mode of ['inspect','apply']){
    const {f,calls,exec}=cliFixture(),emitted=[];
    const result=await h.operatorMain(mode==='apply'?['apply',...f.args]:f.args,{io:h.operatorCliIo({exec}),env:{},emit:r=>emitted.push(r)});
    const writes=calls.filter(c=>c.command==='gh'&&c.args[1]==='graphql');assert.equal(writes.length,mode==='apply'?1:0);
    assert.equal(result.writeAttempts,writes.length);assert.equal(calls.some(c=>c.args.includes('list')||c.args.includes('auth')||c.args.includes('token')),false);
    for(const call of calls)assert.equal(JSON.stringify(call.args).includes(SECRET),false);
    assert.equal(JSON.stringify(emitted).includes(SECRET),false);
    if(writes.length){assert.deepEqual(writes[0].args,['api','graphql','--hostname','github.com','--method','POST','--input','-']);
      assert.deepEqual(JSON.parse(writes[0].options.input.toString()),h.operatorMutation(operatorPrepared));}
  }
});
test('CLI refuses oversized GCS metadata before downloading and redacts provider stderr',async()=>{
  const f=operatorFixture();let calls=0;
  const io=h.operatorCliIo({exec:()=>{calls++;return Buffer.from(JSON.stringify({bucket:f.reference.bucket,name:f.reference.name,generation:f.reference.generation,size:String(32*1024*1024+1)}));}});
  await assert.rejects(io.readObjectExact(f.reference),/OPERATOR_PACKET_SIZE/);assert.equal(calls,1);
  const failed=h.operatorCliIo({exec:()=>{throw Object.assign(Error('Bearer DO_NOT_LOG'),{stderr:Buffer.from(SECRET)});}});
  await assert.rejects(failed.readBuild(operatorInput.execution.buildId),error=>error.message==='I66_SIGNED_CAS_HOLD_OPERATOR_BUILD_READ');
});

test('final UTF-8 transport budget includes base64, escaped path names, headline and envelope',()=>{
  const content='a'.repeat(1650000);
  const packet={expectedHead:HEAD,headline:'Prueba á',entries:[{path:'prueba-ñ.json',content}]};
  const large=h.operatorMutation({packet:{...packet,entries:[]}});
  large.variables.input.fileChanges.additions=[{path:packet.entries[0].path,contents:Buffer.from(content).toString('base64')}];
  const raw=Buffer.from(JSON.stringify(large));
  assert.ok(raw.length>h.GRAPHQL_BODY_BUDGET);
  const fingerprint=require('node:crypto').createHash('sha256').update(raw).digest('hex');
  assert.throws(()=>h.operatorMutation({packet}),new RegExp('FINAL_BODY_BUDGET_'+raw.length));
  assert.throws(()=>h.signedMutationBody(large),new RegExp('FINAL_BODY_BUDGET_'+raw.length+'_OF_2200000_SHA256_'+fingerprint));
  const small=h.operatorMutation({packet:{...packet,entries:[{path:'ñ.json',content:'á'}]}});
  assert.deepEqual(h.signedMutationBody(small),Buffer.from(JSON.stringify(small)));
});
