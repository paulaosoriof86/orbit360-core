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
