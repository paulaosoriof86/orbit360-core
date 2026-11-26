'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const n=require('./gravicentra-i6-6-cloud-build-operational.cjs'),pkg=require('./gravicentra-i6-6-cloud-build-package.cjs'),promotion=require('./gravicentra-i66-frontend-promotion-owner.cjs');
const source='a'.repeat(40),uuid='12345678-1234-4234-8234-123456789035',bytes=Buffer.from('synthetic retained prior package');
function prior(){return {executionProvider:'CLOUD_BUILD',sourceSha:source,buildId:'gi-i66-'+source.slice(0,12)+'-123456789abc',buildRunId:uuid,liveRunId:'22345678-1234-4234-8234-123456789035',artifactId:'gs://'+n.C.bucket+'/i66/packages/request-35/'+source+'/'+uuid+'/'+pkg.F.archive+'#123',artifactDigest:'sha256:'+pkg.sha(bytes),hostingVersion:'sites/ays-orbit-360-lab/versions/previous'};}
const physical=p=>({...p,previewRunId:p.buildRunId,liveCloneRunId:p.liveRunId,liveHostingVersion:p.hostingVersion});
test('native predecessor uses its own UUID/GCS identity, independent of the next candidate provider',()=>{
 const p=prior();assert.equal(n.validatePreviousLive(p,physical(p)),p);
 const legacy={...p,artifactId:123,buildRunId:124,liveRunId:125};delete legacy.executionProvider;assert.equal(n.validatePreviousLive(legacy,physical(legacy)),legacy);
});
for(const [label,change] of [['lost provider',p=>delete p.executionProvider],['crossed provider',p=>p.executionProvider='GITHUB_ACTIONS'],['numeric artifact',p=>p.artifactId=123],['wrong generation',p=>p.artifactId=p.artifactId.replace('#123','#124')],['wrong UUID',p=>p.buildRunId='32345678-1234-4234-8234-123456789035'],['wrong source',p=>p.sourceSha='b'.repeat(40)],['numeric LIVE run',p=>p.liveRunId=123],['wrong Hosting version',p=>p.hostingVersion+='x']])test('predecessor rejects '+label,()=>{const p=prior(),original=physical(p);change(p);assert.throws(()=>n.validatePreviousLive(p,original));});
test('promotion bindings preserve the declared prior provider while historical bindings remain unchanged',()=>{
 assert.deepEqual(promotion.releaseProviderIdentity(prior()),{executionProvider:'CLOUD_BUILD'});assert.deepEqual(promotion.releaseProviderIdentity({}),{});
 assert.throws(()=>promotion.releaseProviderIdentity({executionProvider:'unknown'}));
 const source=fs.readFileSync(path.join(__dirname,'gravicentra-i66-frontend-promotion-owner.cjs'),'utf8');
 assert.match(source,/const v=\{\.\.\.releaseProviderIdentity\(base\)/);assert.match(source,/previous:\{\.\.\.releaseProviderIdentity\(previous\)/);
});
test('actual package resolver selects and verifies the prior native package rather than the new one',async()=>{
 const old=prior(),target={...old,sourceSha:'b'.repeat(40),artifactDigest:'sha256:'+'c'.repeat(64),currentLive:old,providerBinding:{hostingPlan:{synthetic:true}}};
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'gi-native-prior-'));let verified=0,newPackageReads=0;
 const io={};try{
  const result=await n.packageTarForCandidate(target,old,io,temp,{verifyNative:async(binding,options)=>{verified++;assert.deepEqual(binding,old);assert.equal(options.io,io);fs.mkdirSync(options.out);fs.writeFileSync(path.join(options.out,pkg.F.archive),bytes);},readPackage:async()=>{newPackageReads++;throw Error('WRONG_NEW_PACKAGE');}});
  assert.deepEqual(result,bytes);assert.equal(verified,1);assert.equal(newPackageReads,0);
  for(const field of ['sourceSha','artifactId','artifactDigest','executionProvider']){const bad={...old,[field]:'wrong'};await assert.rejects(()=>n.packageTarForCandidate(target,bad,io,temp),/EXACT_PREVIOUS_PROVIDER_AND_PACKAGE/);}
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test('resolver rejects provider verification failure and retained archive drift',async()=>{
 const old=prior(),target={...old,sourceSha:'b'.repeat(40),currentLive:old};
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'gi-native-prior-reject-'));try{
  await assert.rejects(()=>n.packageTarForCandidate(target,old,{},temp,{verifyNative:async()=>{throw Error('REAL_PROVIDER_HOLD');}}),/REAL_PROVIDER_HOLD/);
  await assert.rejects(()=>n.packageTarForCandidate(target,old,{},temp,{verifyNative:async(_,options)=>{fs.mkdirSync(options.out);fs.writeFileSync(path.join(options.out,pkg.F.archive),'changed');}}),/PREVIOUS_NATIVE_TAR_DIGEST/);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
