'use strict';
// Bounded synthetic control-plane tests. No credentials, browser, network,
// Hosting release or business data writes are used by this harness.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const CP='artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json';
const CONTRACT='artifacts/orbit360-recovery/release-control/I6_5_B4_003_CURRENT42_CAUSAL_FRONTEND_SUCCESSOR_CONTRACT_20261107.json';
const RAW='artifacts/orbit360-recovery/release-control/I6_5_B4_003_RETAINED_HOSTING_LIVE_PROMOTED_20261107.json';
const EVIDENCE='artifacts/orbit360-recovery/release-control/SYNTHETIC_CAUSAL_UAT_FIXTURE.json';
const preflight=fs.readFileSync(path.join(ROOT,'tools/gravicentra-b4-003-retained-hosting-preflight.mjs'),'utf8');
const promotion=fs.readFileSync(path.join(ROOT,'tools/gravicentra-b4-003-retained-hosting-promotion.mjs'),'utf8');
const raw=JSON.parse(fs.readFileSync(path.join(ROOT,RAW),'utf8'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const clone=x=>JSON.parse(JSON.stringify(x));
const historical=JSON.parse(fs.readFileSync(path.join(ROOT,CP),'utf8')).b4003ActiveCertificationCursor20261106;
function cursor(){return {schema:'GRAVICENTRA_B4_003_CAUSAL_FRONTEND_SUCCESSOR_CURSOR_V1',
  preservedAcceptancePointer:'/b4003ActiveCertificationCursor20261106/formalLiveAcceptance',
  sourceContractPath:CONTRACT,sourceContractBlobSha:'c792b7db1aa3f16ed7ee20cbdffe2b76dc61b97f',
  b4003Closed:true,b4003HistoricalAcceptancePreserved:true,nextGateExecuted:false,
  activeSourceSha:'1111111111111111111111111111111111111111',activeImmutableArtifactId:1,
  status:'FRONTEND_SUCCESSOR_PREVIEW_ACCEPTED_PROMOTION_AUTHORIZED',productionPromotionAuthorized:true,
  focalAuthenticatedAcceptance:{status:'PASS',sourceSha:'1111111111111111111111111111111111111111',artifactId:1,evidencePaths:[EVIDENCE]}};}
function harness(source,options={}){
  const begin=source.indexOf('function causalSuccessorContext('),end=source.indexOf('\nfunction relativePath(',begin);
  assert.ok(begin>0&&end>begin);
  const env={B4_CAUSAL_FRONTEND_SUCCESSOR:'current42-frontend-20261107',B4_CURSOR_KEY:'b4003CausalFrontendSuccessor20261107',...options.env};
  const io={readFileSync(p,enc){let bytes=fs.readFileSync(path.resolve(ROOT,p));if(options.tamper===p)bytes=Buffer.concat([bytes,Buffer.from(' ')]);return enc?bytes.toString(enc):bytes;},existsSync(p){return p===EVIDENCE||fs.existsSync(path.resolve(ROOT,p));}};
  const ctx=vm.createContext({env,fs:io,crypto,Buffer,sha,
    exact(a,b,c){assert.equal(a,b,c);},requireValue(a,c){assert.ok(a,c);}});
  vm.runInContext(source.slice(begin,end),ctx);
  return {run:(cp,c,auth)=>ctx.causalSuccessorContext(cp,c,auth),ctx};
}
for(const [name,source]of [['preflight',preflight],['promotion',promotion]]){
  test(name+': new operation preserves the exact accepted current42 certificate',()=>{
    const cp={b4003ActiveCertificationCursor20261106:clone(historical)},before=JSON.stringify(cp),c=cursor();
    const result=harness(source).run(cp,c,true);
    assert.equal(result.pin.versionName,'sites/ays-orbit-360-lab/versions/c5e1ae001fae793b');
    assert.equal(result.manifest.fileCount,218);assert.equal(result.raw.liveHostingTotalFiles,220);
    assert.equal(result.manifest.digest,'308b669105c380294177f1a8d2350216af95fec31f800955d611e607542b42da');
    assert.equal(JSON.stringify(cp),before);assert.equal(c.b4003Closed,true);
  });
  test(name+': no implicit opt-in and no arbitrary mode',()=>{
    assert.equal(harness(source,{env:{B4_CAUSAL_FRONTEND_SUCCESSOR:''}}).run({},null,true),null);
    assert.throws(()=>harness(source,{env:{B4_CAUSAL_FRONTEND_SUCCESSOR:'other'}}).run({},cursor(),true),/CAUSAL_MODE_INVALID/);
  });
  test(name+': reopened, replaced or advanced historical acceptance is denied',()=>{
    for(const edit of [x=>x.b4003Closed=false,x=>x.formalLiveAcceptance.b4003Closed=false,x=>x.formalLiveAcceptance.sourceSha='0'.repeat(40),x=>x.formalLiveAcceptance.hostingVersion='sites/ays-orbit-360-lab/versions/wrong']){
      const old=clone(historical);edit(old);assert.throws(()=>harness(source).run({b4003ActiveCertificationCursor20261106:old},cursor(),true),/CURRENT42_/);
    }
    const c=cursor();c.nextGateExecuted=true;assert.throws(()=>harness(source).run({b4003ActiveCertificationCursor20261106:clone(historical)},c,true),/CAUSAL_CLOSED_B4_REQUIRED/);
  });
  test(name+': artifact replay and missing or mismatched authenticated evidence are denied',()=>{
    for(const [edit,code]of [
      [x=>x.activeSourceSha=historical.formalLiveAcceptance.sourceSha,/CAUSAL_CANDIDATE_NOT_NEW/],
      [x=>x.activeImmutableArtifactId=historical.formalLiveAcceptance.artifactId,/CAUSAL_CANDIDATE_NOT_NEW/],
      [x=>x.productionPromotionAuthorized=false,/CAUSAL_PROMOTION_NOT_AUTHORIZED/],
      [x=>x.focalAuthenticatedAcceptance.status='PENDING',/CAUSAL_AUTHENTICATED_UAT_NOT_PASS/],
      [x=>x.focalAuthenticatedAcceptance.sourceSha='0'.repeat(40),/CAUSAL_UAT_SOURCE_MISMATCH/],
      [x=>x.focalAuthenticatedAcceptance.artifactId=2,/CAUSAL_UAT_ARTIFACT_MISMATCH/],
      [x=>x.focalAuthenticatedAcceptance.evidencePaths=[],/CAUSAL_UAT_EVIDENCE_REQUIRED/],
      [x=>x.focalAuthenticatedAcceptance.evidencePaths=['../fake'],/CAUSAL_UAT_EVIDENCE_MISSING/]
    ]){const c=cursor();edit(c);assert.throws(()=>harness(source).run({b4003ActiveCertificationCursor20261106:clone(historical)},c,true),code);}
  });
  test(name+': pending focal UAT allows GET-only preflight but never promotion',()=>{
    const c=cursor();c.status='EXACT_PREVIEW_TRANSPORT_PASS_FOCAL_UAT_PENDING';c.productionPromotionAuthorized=false;delete c.focalAuthenticatedAcceptance;
    const cp={b4003ActiveCertificationCursor20261106:clone(historical)};
    assert.ok(harness(source).run(cp,c,false));assert.throws(()=>harness(source).run(cp,c,true),/CAUSAL_FOCAL_PREVIEW_NOT_ACCEPTED/);
  });
  test(name+': modified source contract or retained raw certificate is denied',()=>{
    for(const p of [CONTRACT,RAW])assert.throws(()=>harness(source,{tamper:p}).run({b4003ActiveCertificationCursor20261106:clone(historical)},cursor(),true),/CAUSAL_CONTRACT_BLOB_CHANGED|CURRENT42_RAW_CERTIFICATE_CHANGED/);
  });
}

function preflightRollbackHarness(edit){
  const common=harness(preflight),causal=common.run({b4003ActiveCertificationCursor20261106:clone(historical)},cursor(),false);
  const version=clone(raw.liveHostingObservation.version),files=clone(raw.liveHostingObservation.files);
  if(edit)edit({version,files});
  const calls=[],out={};
  Object.assign(common.ctx,{causal,cp:{},binding:{site:'ays-orbit-360-lab'},receipt:{},rollbackChannel:null,
    requiredEnv(k){return {ROLLBACK_SOURCE_SHA:causal.pin.sourceSha,ROLLBACK_BUILD_ID:causal.pin.buildId,ROLLBACK_CHANNEL:'live',ROLLBACK_FILE_COUNT:'218',ROLLBACK_PAYLOAD_SHA256:causal.pin.digest}[k];},
    async getChannel(id){calls.push(['get',id]);assert.equal(id,'live');return{url:'https://ays-orbit-360-lab.web.app',versionName:causal.pin.versionName};},
    compactChannel:c=>c,versionName:c=>c.versionName,
    async hostingGet(v){calls.push(['metadata',v]);return version;},async listFiles(v){calls.push(['files',v]);return files;},
    writeJson:(k,v)=>out[k]=v,
    async readManifest(base,paths,expected,label,nonce,digest){calls.push(['raw',base,paths.length]);assert.equal(base,'https://ays-orbit-360-lab.web.app');assert.equal(paths.length,218);assert.equal(expected.length,218);assert.equal(digest,causal.pin.digest);return{fileCount:218,digest,marker:{sourceSha:causal.pin.sourceSha,buildId:causal.pin.buildId}};}});
  const begin=preflight.indexOf('function previewFileContract('),end=preflight.indexOf('\nasync function publicRead(',begin);
  vm.runInContext(preflight.slice(begin,end),common.ctx);
  const marker="await check('certified_rollback_version_and_all_served_bytes',async()=>{";
  const body=preflight.slice(preflight.indexOf(marker)+marker.length,preflight.indexOf("\n  });\n  await check('live_unchanged_after_readonly_preflight'",preflight.indexOf(marker)));
  vm.runInContext('async function runRollback(){'+body+'\n}',common.ctx);
  return{run:()=>common.ctx.runRollback(),calls,out};
}
test('current42 rollback reads all 218 product files and accounts for both managed files',async()=>{
  const h=preflightRollbackHarness(),result=await h.run();assert.equal(result.rawBytesReadInThisRun,true);assert.equal(result.b4003HistoricalAcceptancePreserved,true);
  assert.equal(h.calls.filter(x=>x[0]==='raw').length,1);assert.equal(h.out['rollback-hosting-version.json'].transportContract.metadataFileCount,220);
});
test('rollback cannot ignore an extra or missing Hosting path or inactive file',async()=>{
  for(const edit of [({files})=>files.pop(),({version,files})=>{files.push({path:'extra.js',status:'ACTIVE'});version.fileCount=221;},({files})=>files[2].status='DELETED']){
    const h=preflightRollbackHarness(edit);await assert.rejects(h.run(),/PREVIEW_|CURRENT42_HOSTING_FILE_NOT_ACTIVE/);assert.equal(h.calls.some(x=>x[0]==='raw'),false);
  }
});

function promotionCertificateHarness(edit){
  const h=harness(promotion),causal=h.run({b4003ActiveCertificationCursor20261106:clone(historical)},cursor(),true);
  const e={versionName:causal.pin.versionName,digest:causal.pin.digest,fileCount:218,
    marker:{sourceSha:causal.pin.sourceSha,buildId:causal.pin.buildId},rawPayloadDigestVerified:true,rawBytesReadInThisRun:true};
  const proof={runId:'synthetic-current-run',runnerCommit:'synthetic-runner',checks:[{name:'certified_rollback_version_and_all_served_bytes',status:'PASS',evidence:e}]};
  const files=clone(raw.liveRawFiles),observation=clone(raw.liveHostingObservation);
  if(edit)edit({proof,files,observation});
  const originalFs=h.ctx.fs;
  Object.assign(h.ctx,{causal,proof,binding:{site:'ays-orbit-360-lab',sourceSha:'1'.repeat(40),buildId:'synthetic-new-build'},expectedPreview:'sites/ays-orbit-360-lab/versions/synthetic',out:'/fixture',path,
    fs:{...originalFs,readFileSync(p,enc){
      if(p==='/fixture/rollback-manifest.sha256'||p==='/fixture/retained-site-manifest.sha256')return causal.manifest.text;
      if(p==='/fixture/rollback-files.json')return JSON.stringify(files);
      if(p==='/fixture/rollback-hosting-version.json')return JSON.stringify(observation);
      return originalFs.readFileSync(p,enc);
    }}});
  for(const [start,end]of [
    ['function relativePath(','\nfunction hostingFileContract('],
    ['function normalizeVersionResource(','\nfunction normalizedChannelName('],
    ['function readRows(','\nfunction requireRollbackRawProof('],
    ['function stableJson(','\nfunction readPinnedRollbackCertificate('],
    ['function readCurrent42RollbackCertificate(','\nfunction assertRetainedVersionCurrent(']
  ]){const a=promotion.indexOf(start),b=promotion.indexOf(end,a);assert.ok(a>0&&b>a);vm.runInContext(promotion.slice(a,b),h.ctx);}
  return()=>h.ctx.readCurrent42RollbackCertificate();
}
test('promotion requires the fresh rollback bytes and matches historical metadata and hashes',()=>{
  const result=promotionCertificateHarness()();assert.equal(result.manifest.fileCount,218);assert.equal(result.rawProof.currentReadRunId,'synthetic-current-run');
  assert.equal(result.files.length,220);assert.equal(result.reference.receiptBlobSha,'3e07e1e21192e878af668d03d077c8368837024c');
});
test('promotion rejects stale or failed rollback evidence, altered bytes and changed Hosting metadata',()=>{
  for(const [edit,code]of [
    [x=>x.proof.checks[0].status='FAIL',/CURRENT42_FRESH_ROLLBACK_PREFLIGHT_REQUIRED/],
    [x=>x.proof.checks[0].evidence.rawBytesReadInThisRun=false,/CURRENT42_FRESH_RAW_READ_REQUIRED/],
    [x=>x.files[0].sha256='0'.repeat(64),/CURRENT42_FRESH_FILES_CHANGED/],
    [x=>x.observation.version.config.rewrites=[],/CURRENT42_VERSION_METADATA_CHANGED/],
    [x=>x.observation.files[0].hostingHash='0'.repeat(64),/CURRENT42_HOSTING_PATH_HASH_CHANGED/]
  ])assert.throws(promotionCertificateHarness(edit),code);
});
