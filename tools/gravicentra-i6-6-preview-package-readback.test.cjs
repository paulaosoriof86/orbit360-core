'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const api=require('./gravicentra-i6-6-preview-package-readback.cjs');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const response=(status,bytes=Buffer.alloc(0),extra={})=>({status,redirected:false,
  arrayBuffer:async()=>Uint8Array.from(bytes).buffer,...extra});
function fixture(){
  const options={packageRoot:'/virtual/gi-i66-package',fingerprintRoot:'/virtual',reportPath:'/virtual/readback.json',
    previewUrl:'https://ays-orbit-360-lab--gi-i66-rc-101-test.web.app',previewChannel:'gi-i66-rc-101',
    sourceSha:'a'.repeat(40),artifactId:201,artifactDigest:'sha256:'+'c'.repeat(64)};
  const marker=Buffer.from(JSON.stringify({product:'Gravicentra Insurance',gate:'I6.6',sourceSha:options.sourceSha,
    buildId:'gi-i66-aaaaaaaaaaaa-57f234755dc1'})+'\n');
  const files=new Map([[api.MARKER,marker],['index.html',Buffer.from('<main>exact immutable package</main>')]]);
  for(let i=0;i<222;i++)files.set('assets/source-'+String(i).padStart(3,'0')+'.js',Buffer.from('"asset '+i+'";\n'));
  const manifest=Buffer.from([...files].map(([p,b])=>sha(b)+'  '+p).join('\n')+'\n');
  const local=new Map([...files].map(([p,b])=>[path.join(options.packageRoot,'bundle','site',p),b]));
  const liveBytes=new Map(api.LIVE.map(row=>[row.origin,Buffer.from('<main>predeploy '+row.label+'</main>')]));
  local.set(path.join(options.packageRoot,'evidence','site-manifest.sha256'),manifest);
  for(const row of api.LIVE)local.set(path.join(options.fingerprintRoot,row.beforeFile),Buffer.from(sha(liveBytes.get(row.origin))+'  -\n'));
  let time=0;
  const calls=[],reports=[],sleeps=[];
  const f={options,marker,files,manifest,local,liveBytes,calls,reports,sleeps,advance:ms=>{time+=ms;},now:()=>time};
  f.normal=url=>{
    if(liveBytes.has(url.origin))return response(200,liveBytes.get(url.origin));
    const bytes=files.get(url.pathname.slice(1));return bytes?response(200,bytes):response(404);
  };
  f.handler=url=>f.normal(url);
  f.deps={now:f.now,sleep:async ms=>{sleeps.push(ms);time+=ms;},
    readFile:file=>{assert.ok(local.has(file),'fixture local file missing '+file);return local.get(file);},
    writeReport:report=>reports.push(structuredClone(report)),
    fetch:async(url,init)=>{const parsed=new URL(url);calls.push({url:parsed,init});return f.handler(parsed,init);}};
  return f;
}
async function held(f,code){
  let error;try{await api.runReadback(f.options,f.deps);}catch(e){error=e;}
  assert.ok(error,'readback must refuse acceptance');assert.equal(error.code,code);
  assert.equal(error.report.status,'HOLD');return error.report;
}
test('224 exact manifest files and both predeploy LIVE fingerprints are required for success',async()=>{
  const f=fixture(),r=await api.runReadback(f.options,f.deps);
  assert.equal(r.status,'PASS');assert.equal(r.verifiedFiles,224);assert.equal(r.files.length,224);
  assert.equal(r.readinessAttempts.length,1);assert.equal(f.calls.length,227);
  assert.ok(r.files.every(row=>row.status==='PASS'&&row.attempts[0].sha256===row.expectedSha256));
  assert.ok(r.live.every(row=>row.status==='PASS'&&row.beforeSha256===row.afterSha256));
  assert.equal(r.appStartupAcceptance,false);assert.equal(r.noDeploymentPerformed,true);assert.equal(r.noArtifactMutation,true);
  assert.equal(f.reports.at(-1).status,'PASS');
  const keys=f.calls.map(row=>row.url.searchParams.get('__gi_i66_rb'));
  assert.equal(new Set(keys).size,keys.length);assert.ok(keys.every(key=>/^[a-f0-9]{32}\.[0-9]+$/.test(key)));
  for(const {init,url} of f.calls){
    assert.equal(init.method,'GET');assert.equal(init.cache,'no-store');assert.equal(init.redirect,'manual');assert.equal(init.credentials,'omit');
    assert.equal(init.headers['cache-control'],'no-cache, no-store, max-age=0');assert.equal(init.headers.pragma,'no-cache');
    assert.equal([...url.searchParams.keys()].join(','),'__gi_i66_rb');
  }
});
test('the actual upload-artifact bare digest is normalized by the CLI environment boundary only',async()=>{
  const f=fixture(),env={RUNNER_TEMP:'/virtual',PREVIEW_URL:f.options.previewUrl,PREVIEW_CHANNEL:f.options.previewChannel,
    SOURCE_SHA:f.options.sourceSha,ARTIFACT_ID:String(f.options.artifactId),ARTIFACT_DIGEST:'c'.repeat(64)};
  const options=api.optionsFromEnvironment(env);
  assert.equal(options.artifactDigest,'sha256:'+'c'.repeat(64));
  assert.equal(options.reportPath,'/virtual/gi-i66-preview-package-readback.json');
  assert.equal((await api.runReadback(options,f.deps)).status,'PASS');
  for(const value of ['sha256:'+'c'.repeat(64),'c'.repeat(64)+'\n','SHA256:'+'c'.repeat(64),'G'.repeat(64)]){
    const converted=api.optionsFromEnvironment({...env,ARTIFACT_DIGEST:value});
    assert.equal(converted.artifactDigest,value);
    if(value.startsWith('sha256:'))assert.equal((await api.runReadback(converted,f.deps)).status,'PASS');
    else await assert.rejects(api.runReadback(converted,f.deps),{code:'I66_READBACK_DIGEST_REQUIRED'});
  }
});
test('a wrong marker can become ready only after exact package bytes arrive',async()=>{
  const f=fixture();let markerCalls=0;
  const wrong=Buffer.from(JSON.stringify({sourceSha:'b'.repeat(40),buildId:'gi-i66-bbbbbbbbbbbb-57f234755dc1',secret:'NEVER_LOG_THIS_BODY'}));
  f.handler=url=>url.pathname==='/'+api.MARKER&&++markerCalls===1?response(200,wrong):f.normal(url);
  const r=await api.runReadback(f.options,f.deps);
  assert.equal(r.status,'PASS');assert.equal(r.readinessAttempts.length,2);assert.equal(r.markerReadinessElapsedMs,4000);
  assert.equal(r.readinessAttempts[0].exactBytes,false);assert.equal(r.readinessAttempts[0].sha256,sha(wrong));
  assert.equal(r.readinessAttempts[0].observedMarker.sourceSha,'b'.repeat(40));
  assert.equal(r.readinessAttempts[1].exactBytes,true);assert.ok(!JSON.stringify(r).includes('NEVER_LOG_THIS_BODY'));
});
test('a permanently wrong marker never passes the strict 240 second deployment deadline',async()=>{
  const f=fixture();f.handler=()=>response(200,Buffer.from('old or foreign deployment'));
  const r=await held(f,'I66_READBACK_MARKER_DEADLINE_EXCEEDED');
  assert.equal(f.now(),240000);assert.equal(r.markerReadinessElapsedMs,240000);
  assert.equal(r.readinessAttempts.length,60);assert.equal(f.calls.length,60);assert.equal(r.verifiedFiles,0);
  assert.equal(f.reports.at(-1).status,'HOLD');
});
test('simulated visibility beyond the former 25 by 4 second poll budget still needs exact bytes within 240 seconds',async()=>{
  const install=f=>{f.handler=url=>url.pathname==='/'+api.MARKER&&f.now()<108000?
    response(200,Buffer.from('not yet the expected package')):f.normal(url);};
  const oldBudget=fixture();oldBudget.options.readinessMs=100000;install(oldBudget);
  await held(oldBudget,'I66_READBACK_MARKER_DEADLINE_EXCEEDED');assert.equal(oldBudget.now(),100000);
  const current=fixture();install(current);const r=await api.runReadback(current.options,current.deps);
  assert.equal(r.status,'PASS');assert.equal(r.markerReadinessElapsedMs,108000);assert.equal(r.verifiedFiles,224);
});
test('equal source and build identity with different marker bytes is never accepted',async()=>{
  const f=fixture();f.handler=()=>response(200,Buffer.concat([f.marker,Buffer.from(' ')]));
  const r=await held(f,'I66_READBACK_MARKER_DEADLINE_EXCEEDED');
  assert.equal(r.readinessAttempts[0].observedMarker.sourceSha,f.options.sourceSha);
  assert.equal(r.readinessAttempts[0].exactBytes,false);assert.equal(r.verifiedFiles,0);
});
for(const status of [401,403])test('HTTP '+status+' terminates immediately without retrying authorization',async()=>{
  const f=fixture();f.handler=()=>response(status,Buffer.from('secret'),{arrayBuffer:()=>assert.fail('error body must not be read')});
  const r=await held(f,'I66_READBACK_HTTP_AUTHORIZATION_DENIED');
  assert.equal(f.calls.length,1);assert.deepEqual(f.sleeps,[]);assert.equal(r.readinessAttempts[0].status,status);
  assert.equal(f.now(),0);assert.ok(!JSON.stringify(r).includes('secret'));
});
for(const status of [404,503])test('temporary HTTP '+status+' retries and requires an exact subsequent marker',async()=>{
  const f=fixture();let reads=0;f.handler=url=>++reads===1?response(status):f.normal(url);
  const r=await api.runReadback(f.options,f.deps);
  assert.equal(r.status,'PASS');assert.equal(r.readinessAttempts[0].status,status);
  assert.equal(r.readinessAttempts.length,2);assert.deepEqual(f.sleeps,[4000]);
});
test('temporary network failure is retained by safe category and then may recover',async()=>{
  const f=fixture();let reads=0;f.handler=url=>{
    if(++reads===1)throw Object.assign(new Error('Bearer sensitive-person@example.test'),{code:'ECONNRESET'});
    return f.normal(url);
  };
  const r=await api.runReadback(f.options,f.deps);
  assert.equal(r.readinessAttempts[0].network,'ECONNRESET');assert.equal(r.status,'PASS');
  assert.ok(!JSON.stringify(r).includes('Bearer'));assert.ok(!JSON.stringify(r).includes('@'));
});
test('hung network requests use an injected timeout and cannot escape the 240 second deadline',async()=>{
  const f=fixture();f.handler=()=>new Promise(()=>{});
  f.deps.setTimer=(fn,ms)=>{queueMicrotask(()=>{f.advance(ms);fn();});return 1;};f.deps.clearTimer=()=>{};
  const r=await held(f,'I66_READBACK_MARKER_DEADLINE_EXCEEDED');
  assert.equal(f.now(),240000);assert.ok(r.readinessAttempts.length>1);
  assert.ok(r.readinessAttempts.every(row=>row.network==='REQUEST_TIMEOUT'));
  assert.ok(f.calls.every(row=>row.init.signal.aborted));assert.equal(r.verifiedFiles,0);
});
test('timeout bounds reading the response body as well as receiving its HTTP headers',async()=>{
  const f=fixture();f.options.readinessMs=15000;let fireTimer;
  f.handler=()=>response(200,Buffer.alloc(0),{arrayBuffer:()=>{queueMicrotask(fireTimer);return new Promise(()=>{});}});
  f.deps.setTimer=(fn,ms)=>{fireTimer=()=>{f.advance(ms);fn();};return 1;};f.deps.clearTimer=()=>{};
  const r=await held(f,'I66_READBACK_MARKER_DEADLINE_EXCEEDED');
  assert.equal(f.now(),15000);assert.equal(r.readinessAttempts.length,1);
  assert.equal(r.readinessAttempts[0].network,'REQUEST_TIMEOUT');assert.equal(r.readinessAttempts[0].receivedHeadersStatus,200);
  assert.equal(r.verifiedFiles,0);
});
test('an exact response received after the deployment deadline remains HOLD',async()=>{
  const f=fixture();f.handler=url=>{f.advance(240001);return f.normal(url);};
  const r=await held(f,'I66_READBACK_MARKER_DEADLINE_EXCEEDED');
  assert.equal(r.readinessAttempts[0].exactBytes,true);assert.equal(r.verifiedFiles,0);
});
test('a preview file byte mismatch fails immediately with hashes and no response body',async()=>{
  const f=fixture(),target='/assets/source-000.js',wrong=Buffer.from('private response NEVER_LOG_FILE');
  f.handler=url=>url.pathname===target?response(200,wrong):f.normal(url);
  const r=await held(f,'I66_READBACK_PREVIEW_FILE_BYTES_MISMATCH');
  const failed=r.files.find(row=>row.path===target.slice(1));assert.equal(failed.status,'HOLD');
  assert.equal(failed.attempts.length,1);assert.equal(failed.attempts[0].sha256,sha(wrong));
  assert.notEqual(failed.expectedSha256,failed.attempts[0].sha256);assert.ok(!JSON.stringify(r).includes('NEVER_LOG_FILE'));
  assert.equal(r.verifiedFiles,2);assert.deepEqual(f.sleeps,[]);
});
test('temporary file transport failure preserves retry bounds without relaxing byte equality',async()=>{
  const f=fixture();let reads=0;f.handler=url=>url.pathname==='/assets/source-000.js'&&++reads<4?response(503):f.normal(url);
  const r=await api.runReadback(f.options,f.deps);
  assert.equal(r.files.find(row=>row.path==='assets/source-000.js').attempts.length,4);
  assert.deepEqual(f.sleeps,[2000,2000,2000]);assert.equal(r.status,'PASS');
});
test('file authorization failure is terminal after marker readiness',async()=>{
  const f=fixture();f.handler=url=>url.pathname==='/assets/source-000.js'?response(403):f.normal(url);
  const r=await held(f,'I66_READBACK_HTTP_AUTHORIZATION_DENIED');
  assert.equal(r.files.at(-1).attempts.length,1);assert.equal(r.files.at(-1).status,'HOLD');assert.deepEqual(f.sleeps,[]);
});
test('drift on either LIVE origin is refused and both predeploy fingerprints are still checked',async()=>{
  for(const failedOrigin of api.LIVE.map(row=>row.origin)){
    const f=fixture();f.handler=url=>url.origin===failedOrigin?response(200,Buffer.from('different LIVE bytes')):f.normal(url);
    const r=await held(f,'I66_READBACK_LIVE_FINGERPRINT_DRIFT');
    assert.equal(r.verifiedFiles,224);assert.equal(r.live.length,2);assert.ok(r.live.every(row=>row.attempts.length===1));
    assert.equal(r.live.filter(row=>row.status==='HOLD').length,1);assert.equal(r.live.filter(row=>row.status==='PASS').length,1);
  }
});
test('redirects and nontransient HTTP errors cannot be retried into acceptance',async()=>{
  for(const status of [302,400,429]){
    const f=fixture();f.handler=()=>response(status);
    await held(f,'I66_READBACK_HTTP_TERMINAL');assert.equal(f.calls.length,1);assert.equal(f.now(),0);
  }
  const f=fixture();f.handler=()=>response(200,f.marker,{redirected:true,url:'https://unapproved.example/'});
  await held(f,'I66_READBACK_HTTP_REDIRECT_FORBIDDEN');assert.equal(f.calls.length,1);
});
test('manifest and local bytes are verified before any HTTP read',async()=>{
  const f=fixture();f.local.set(path.join(f.options.packageRoot,'bundle','site','assets/source-000.js'),Buffer.from('tampered local bytes'));
  await held(f,'I66_READBACK_LOCAL_BYTES_DRIFT');assert.equal(f.calls.length,0);
  const count=fixture();count.local.set(path.join(count.options.packageRoot,'evidence','site-manifest.sha256'),
    Buffer.from(count.manifest.toString().trimEnd().split('\n').slice(1).join('\n')+'\n'));
  await held(count,'I66_READBACK_MANIFEST_FILE_COUNT_OR_DUPLICATE');assert.equal(count.calls.length,0);
});
test('deadline and origin scope cannot be widened by invocation options',async()=>{
  const f=fixture();f.options.readinessMs=240001;await held(f,'I66_READBACK_DEADLINE_POLICY_INVALID');assert.equal(f.calls.length,0);
  const other=fixture();other.options.previewUrl='https://app.aysseguros.com';
  await held(other,'I66_READBACK_PREVIEW_ORIGIN_INVALID');assert.equal(other.calls.length,0);
});
test('diagnostic persistence failure cannot produce a successful readback',async()=>{
  const f=fixture();f.deps.writeReport=r=>{if(r.status==='PASS')throw Error('private filesystem failure');f.reports.push(structuredClone(r));};
  const r=await held(f,'I66_READBACK_DIAGNOSTIC_WRITE_FAILED');
  assert.equal(r.verifiedFiles,224);assert.equal(f.reports.at(-1).status,'HOLD');assert.ok(!f.reports.some(row=>row.status==='PASS'));
  assert.ok(!JSON.stringify(r).includes('private filesystem failure'));
});
test('failed readback retains an actual atomic diagnostic JSON file',async t=>{
  const f=fixture(),dir=fs.mkdtempSync(path.join(os.tmpdir(),'gi-i66-readback-test-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  f.options.reportPath=path.join(dir,'readback.json');delete f.deps.writeReport;f.handler=()=>response(403);
  await held(f,'I66_READBACK_HTTP_AUTHORIZATION_DENIED');
  const r=JSON.parse(fs.readFileSync(f.options.reportPath,'utf8'));
  assert.equal(r.status,'HOLD');assert.equal(r.readinessAttempts[0].status,403);
  assert.equal(fs.existsSync(f.options.reportPath+'.tmp'),false);
});
test('the existing build and Source QA execute and pin the readback owner with always-on evidence retention',()=>{
  const root=path.resolve(__dirname,'..'),helper='tools/gravicentra-i6-6-preview-package-readback.cjs';
  const tests='tools/gravicentra-i6-6-preview-package-readback.test.cjs';
  const build=fs.readFileSync(path.join(root,'.github/workflows/gravicentra-release-delta-66-package.yml'),'utf8');
  const sourceQa=fs.readFileSync(path.join(root,'.github/workflows/gravicentra-i66-privileged-role-parity-source-qa.yml'),'utf8');
  const owners=require('./gravicentra-i6-6-operational-release-candidate.cjs').PINNED_OWNER_PATHS;
  assert.ok(build.includes('node '+helper),'build must execute the same helper');
  assert.ok(build.includes('node --test '+tests),'build must test readback before deployment');
  assert.match(build,/name: Preserve Preview package readback diagnostic on every outcome\n\s+if: always\(\)[\s\S]*?gi-i66-preview-package-readback\.json/);
  assert.ok(!build.includes('for attempt in $(seq 1 25)'),'silent marker polling must be replaced');
  for(const p of [helper,tests])assert.ok(sourceQa.includes('      - '+p)&&owners.includes(p),'exact QA owner pin '+p);
  assert.ok(sourceQa.includes('node --test '+tests),'signed source QA must execute causal test');
});
