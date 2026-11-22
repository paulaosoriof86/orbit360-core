'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process'),assert=require('node:assert/strict');
const site='ays-orbit-360-lab',origins=['https://ays-orbit-360-lab.web.app','https://app.aysseguros.com'];
const hash=v=>crypto.createHash('sha256').update(v).digest('hex');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
function hosting(auth,github){
  const packages=new Map(),git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
  async function current(channel){
    assert.match(channel,/^[a-z0-9][a-z0-9-]+$/);
    const url='https://firebasehosting.googleapis.com/v1beta1/sites/'+site+'/channels/'+channel+'/releases?pageSize=1';
    const headers=await auth.getRequestHeaders(url);
    const res=await fetch(url,{headers,signal:AbortSignal.timeout(20000)});assert.ok(res.ok,'HOSTING_RELEASE_READ');
    const version=(await res.json()).releases?.[0]?.version?.name;
    assert.match(version,/^sites\/ays-orbit-360-lab\/versions\/[a-zA-Z0-9_-]+$/);return version;
  }
  async function packageData(r){
    if(packages.has(r.artifactDigest))return packages.get(r.artifactDigest);
    const meta=await github('actions/artifacts/'+r.artifactId);
    assert.equal(meta.digest,r.artifactDigest);assert.equal(meta.workflow_run.head_sha,r.sourceSha);
    assert.equal(meta.workflow_run.id,r.buildRunId);assert.equal(meta.expired,false);
    const zip=Buffer.from(await (await github('actions/artifacts/'+r.artifactId+'/zip',true)).arrayBuffer());
    assert.equal('sha256:'+hash(zip),r.artifactDigest,'GITHUB_ARTIFACT_ZIP_DIGEST');
    const tmp=fs.mkdtempSync(path.join(process.env.RUNNER_TEMP||os.tmpdir(),'i66-immutable-'));
    const file=path.join(tmp,'immutable.zip');fs.writeFileSync(file,zip,{mode:0o600});
    const members=execFileSync('unzip',['-Z1',file],{encoding:'utf8'}).trim().split('\n');
    function extract(name){
      const found=members.filter(m=>m.split('/').at(-1)===name);assert.equal(found.length,1);
      assert.ok(!found[0].startsWith('/')&&found[0].split('/').every(x=>x&&x!=='.'&&x!=='..'));
      return execFileSync('unzip',['-p',file,found[0]],{maxBuffer:160*1024*1024});
    }
    const tar=extract('gi-i66-exact-package.tar.gz'),tarPath=path.join(tmp,'package.tar.gz');
    assert.equal(hash(tar),extract('gi-i66-exact-package.sha256').toString().trim().split(/\s+/)[0]);
    fs.writeFileSync(tarPath,tar,{mode:0o600});
    const listing=execFileSync('tar',['-tzf',tarPath],{encoding:'utf8'}).trim().split('\n');
    function member(name){const matches=listing.filter(p=>p.replace(/^\.\//,'')===name);assert.equal(matches.length,1);return execFileSync('tar',['-xOzf',tarPath,matches[0]],{maxBuffer:10*1024*1024});}
    const manifest=member('evidence/site-manifest.sha256'),marker=JSON.parse(member('bundle/site/__recovery__/build.json'));
    assert.equal(marker.sourceSha,r.sourceSha);assert.equal(marker.buildId,r.buildId);
    const rows=manifest.toString().trim().split('\n').map(line=>{
      const m=/^([a-f0-9]{64})  (.+)$/.exec(line);assert.ok(m&&m[2].split('/').every(s=>s&&s!=='.'&&s!=='..')&&!m[2].includes('\\'));
      return {digest:m[1],path:m[2]};
    });
    assert.ok(rows.length>0&&new Set(rows.map(row=>row.path)).size===rows.length);
    assert.equal(rows.find(x=>x.path==='__recovery__/build.json')?.digest,hash(member('bundle/site/__recovery__/build.json')));
    const out={rows,manifestDigest:'sha256:'+hash(manifest)};packages.set(r.artifactDigest,out);return out;
  }
  async function bytes(url){
    const res=await fetch(url,{redirect:'error',headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(20000)});
    assert.equal(res.status,200,'HOSTED_FILE_NOT_200');return Buffer.from(await res.arrayBuffer());
  }
  async function originRead(origin,r){
    const data=await packageData(r);let ready=false;
    for(let i=0;i<16;i++){try{const m=JSON.parse(await bytes(origin+'/__recovery__/build.json'));
      ready=m.sourceSha===r.sourceSha&&m.buildId===r.buildId;if(ready)break;}catch{}if(i<15)await pause(2000);}
    assert.ok(ready,'HOSTED_MARKER_DRIFT');let index=0,count=0;
    await Promise.all(Array.from({length:8},async()=>{while(index<data.rows.length){
      const row=data.rows[index++],url=origin+'/'+row.path.split('/').map(encodeURIComponent).join('/');
      assert.equal(hash(await bytes(url)),row.digest,'HOSTED_FILE_HASH_DRIFT');count++;
    }}));assert.equal(count,data.rows.length);return count;
  }
  async function live(binding){
    const [firebase,custom,physical,pkg]=await Promise.all([originRead(origins[0],binding),originRead(origins[1],binding),current('live'),packageData(binding)]);
    return {firebase,custom,sourceSha:binding.sourceSha,buildId:binding.buildId,artifactDigest:binding.artifactDigest,hostingVersion:physical,manifestDigest:pkg.manifestDigest};
  }
  async function preview(binding){
    assert.match(binding.previewUrl,/^https:\/\/ays-orbit-360-lab--gi-i66-[a-z0-9-]+\.web\.app$/);
    const [files,hostingVersion]=await Promise.all([originRead(binding.previewUrl,binding),current(binding.previewChannel)]);
    return {files,hostingVersion,artifactDigest:binding.artifactDigest};
  }
  async function clone(to,from){
    assert.equal(await current('live'),from,'HOSTING_PRECONDITION_CHANGED');assert.match(to,/^sites\/ays-orbit-360-lab\/versions\/[\w-]+$/);
    execFileSync(process.execPath,[process.env.FIREBASE_CLI_BIN,'hosting:clone',site+'@'+to.split('/').at(-1),site+':live',
      '--project',site,'--non-interactive','--json'],{stdio:['ignore','pipe','pipe'],timeout:180000});
  }
  return {current,packageData,live,preview,clone,git};
}
module.exports={hosting};
