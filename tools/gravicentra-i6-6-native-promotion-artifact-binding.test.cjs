'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const file=path.join(__dirname,'gravicentra-i66-frontend-promotion-transaction.cjs');
const loaded=new Module(file,module);loaded.filename=file;loaded.paths=Module._nodeModulePaths(__dirname);
loaded._compile(fs.readFileSync(process.env.I66_NATIVE_TRANSACTION_TEST_SOURCE||file,'utf8'),file);
const t=loaded.exports;
const SOURCE='b'.repeat(40),UUID='12345678-1234-1234-1234-123456789abc';
const bucket='ays-orbit360-firestore-private-backup-646761409743';
const native=()=>({executionProvider:'CLOUD_BUILD',sourceSha:SOURCE,sourceTree:'5'.repeat(40),manifestBlob:'6'.repeat(40),
  compositionBlob:'7'.repeat(40),buildRunId:UUID,
  artifactId:'gs://'+bucket+'/i66/packages/request-35/'+SOURCE+'/'+UUID+'/gi-i66-exact-package.tar.gz#1234567890',
  artifactDigest:'sha256:'+'b'.repeat(64),hostingVersion:'sites/ays-orbit-360-lab/versions/synthetic-target',
  files:224,buildId:'gi-i66-'+SOURCE.slice(0,12)+'-123456789abc'});
const historical=()=>({sourceSha:'a'.repeat(40),sourceTree:'5'.repeat(40),manifestBlob:'6'.repeat(40),compositionBlob:'7'.repeat(40),
  artifactId:101,buildRunId:100,artifactDigest:'sha256:'+'a'.repeat(64),hostingVersion:'sites/ays-orbit-360-lab/versions/synthetic-previous',
  files:224,buildId:'gi-i66-aaaaaaaaaaaa-123456789abc'});
function request(){
  const previous=historical(),target=native(),req={schema:'GI_I66_FRONTEND_PROMOTION_V1',generation:4,gate:'I6.6',scope:'FRONTEND_ONLY',
    approvalBlob:'c'.repeat(40),guardBlob:'d'.repeat(40),previousReceiptBlob:'e'.repeat(40),previous,target};
  return {req,control:{generation:3,physical:previous,receiptBlob:req.previousReceiptBlob,guardBlob:req.guardBlob,consumed:[]}};
}
test('native URI plus real UUID and TAR digest bind, while historical numeric identities remain unchanged',()=>{
  const n=native(),h=historical();assert.equal(t.releaseBinding(n),n);assert.equal(t.releaseBinding(h),h);
  const f=request();assert.doesNotThrow(()=>t.validateRequest(f.req,f.control));
});
test('provider discrimination rejects unknown, missing and crossed numeric/native identity forms',()=>{
  for(const mutate of [x=>x.executionProvider='OTHER',x=>x.executionProvider='GITHUB_ACTIONS',x=>x.executionProvider=null,
    x=>delete x.executionProvider,x=>x.artifactId=101]){
    const value=native();mutate(value);assert.throws(()=>t.releaseBinding(value));
  }
  for(const artifactId of ['101',0,-1,1.5,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>t.releaseBinding({...historical(),artifactId}));
  assert.throws(()=>t.releaseBinding({...historical(),executionProvider:'CLOUD_BUILD'}));
});
test('native identity cannot cross bucket, request path, source, build UUID, generation or digest',()=>{
  for(const mutate of [
    x=>x.artifactId=x.artifactId.replace(bucket,'foreign-bucket'),
    x=>x.artifactId=x.artifactId.replace('request-35','request-0'),
    x=>x.artifactId=x.artifactId.replace('/'+SOURCE+'/','/'+'c'.repeat(40)+'/'),
    x=>x.buildRunId='23456789-2345-2345-2345-23456789abcd',
    x=>x.buildRunId=123,
    x=>x.artifactId=x.artifactId.replace('#1234567890','#0'),
    x=>x.artifactId=x.artifactId.replace('#1234567890','#0123'),
    x=>x.artifactId=x.artifactId.replace('#1234567890',''),
    x=>x.artifactId+='?alternate=1',
    x=>x.artifactId=x.artifactId.replace('gi-i66-exact-package.tar.gz','other.zip'),
    x=>x.artifactDigest='sha256:invalid'
  ]){const value=native();mutate(value);assert.throws(()=>t.releaseBinding(value));}
});
test('native binding preserves exact integer file counts, generation CAS and byte readback',()=>{
  for(const files of [0,-1,1.5,'224',Number.MAX_SAFE_INTEGER+1])assert.throws(()=>t.releaseBinding({...native(),files}));
  for(const generation of [0,3,4.5,'4',5]){const f=request();f.req.generation=generation;assert.throws(()=>t.validateRequest(f.req,f.control),/RELEASE_GENERATION_CAS/);}
  const target=native(),proof={...target,firebase:224,custom:224,manifestDigest:'sha256:'+'8'.repeat(64)};
  assert.doesNotThrow(()=>t.verifyBytes(target,proof));
  for(const mutate of [x=>x.firebase=223,x=>x.custom=223,x=>x.custom='224',x=>x.artifactDigest='sha256:'+'0'.repeat(64)]){
    const changed={...proof};mutate(changed);assert.throws(()=>t.verifyBytes(target,changed));
  }
});
test('composite target and predecessor provider labels cannot be dropped or reassigned',()=>{
  for(const prior of [false,true]){
    const f=request();f.req.scope='COMPOSITE';f.req.candidate={opsLeadsComposite:true,executionProvider:'CLOUD_BUILD',currentLive:{}};
    if(prior)f.req.previous.executionProvider='CLOUD_BUILD';else delete f.req.target.executionProvider;
    assert.throws(()=>t.validateCompositeProof(f.req,{}),prior?/COMPOSITE_PREDECESSOR_executionProvider/:/COMPOSITE_TARGET_IDENTITY_executionProvider/);
  }
});
function financialFixture(){
  const f=request();f.req.scope='COMPOSITE';f.req.financialQa={scopeId:'SIX_RECEIPT_CURRENT_BALANCE_READONLY',authorityBlob:'f'.repeat(40),parentAuthorityBlob:f.req.approvalBlob};
  const journal={phase:'VERIFIED',generation:4,key:'8'.repeat(64),liveProof:{runId:UUID}};
  const report={executionProvider:'CLOUD_BUILD',readOnly:true};
  const observed={executionProvider:'CLOUD_BUILD',result:'PASS',scopeId:f.req.financialQa.scopeId,generation:4,physicalPhaseKey:journal.key,
    authorityBlob:f.req.financialQa.authorityBlob,parentAuthorityBlob:f.req.approvalBlob,sourceSha:SOURCE,
    artifactDigest:f.req.target.artifactDigest,buildId:f.req.target.buildId,runId:UUID,
    receiptPath:'artifacts/orbit360-recovery/release-control/I6_6_FRONTEND_E00004_LIVE_UI.json',financialQa:report};
  return {...f,journal,report,observed};
}
test('native financial receipt retains its provider; the historical receipt shape stays unchanged',()=>{
  const f=financialFixture(),nativeReceipt=t.compositeFinancialUiReceipt(f.req,f.journal,f.report);
  assert.equal(nativeReceipt.executionProvider,'CLOUD_BUILD');assert.equal(nativeReceipt.generation,4);
  delete f.req.target.executionProvider;delete f.report.executionProvider;
  assert.equal(Object.hasOwn(t.compositeFinancialUiReceipt(f.req,f.journal,f.report),'executionProvider'),false);
});
test('a financial observed receipt or report cannot lose its native provider identity',()=>{
  const f=financialFixture();delete f.observed.executionProvider;
  assert.throws(()=>t.validateCompositeFinancialUi(f.req,f.journal,f.observed),/COMPOSITE_FINANCIAL_UI_PROVIDER_DRIFT/);
  f.observed.executionProvider='CLOUD_BUILD';delete f.report.executionProvider;
  assert.throws(()=>t.validateCompositeFinancialUi(f.req,f.journal,f.observed),/COMPOSITE_FINANCIAL_REPORT_PROVIDER_DRIFT/);
});
test('native identity does not permit COMMITTED without a verified signed receipt',async()=>{
  const f=request(),s={current:f.req.previous.hostingVersion,j:null,commits:0};
  const io={readJournal:async()=>s.j,readControl:async()=>f.control,validateProofs:async()=>{},verifyPreview:async r=>r,
    verifyLive:async r=>({...r,firebase:r.files,custom:r.files,manifestDigest:'sha256:'+'9'.repeat(64)}),
    currentVersion:async()=>s.current,assertOwnership:async()=>{},assertCompensationOwnership:async()=>{},
    cas:async(old,next)=>{assert.deepEqual(old,s.j);s.j=next;return next;},clone:async to=>{s.current=to;},
    liveUiProof:async()=>({result:'PASS',buildId:f.req.target.buildId,receiptBlob:'2'.repeat(40)}),
    signedReceipt:async()=>({verified:false,blob:'3'.repeat(40),commit:'4'.repeat(40)}),
    commitAll:async(old,next)=>{s.commits++;s.j=next;return next;},verifyCommitted:async()=>{},
    incident:async(old,next)=>{s.j=next;}};
  await assert.rejects(t.promote(io,f.req),/RELEASE_SIGNED_RECEIPT_ABSENT/);
  assert.equal(s.commits,0);assert.equal(s.j.phase,'ROLLED_BACK');assert.equal(s.current,f.req.previous.hostingVersion);
});
