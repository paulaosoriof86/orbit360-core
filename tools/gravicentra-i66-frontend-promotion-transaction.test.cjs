'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {promote,digest}=require('./gravicentra-i66-frontend-promotion-transaction.cjs');
const release=c=>({sourceSha:c.repeat(40),sourceTree:'5'.repeat(40),manifestBlob:'6'.repeat(40),compositionBlob:'7'.repeat(40),
  artifactDigest:'sha256:'+c.repeat(64),artifactId:parseInt(c,16),hostingVersion:'sites/ays-orbit-360-lab/versions/'+c,
  files:3,buildId:'build-'+c});
function fixture(){
  const previous=release('a'),target=release('b'),req={schema:'GI_I66_FRONTEND_PROMOTION_V1',generation:1,gate:'I6.6',scope:'FRONTEND_ONLY',
    approvalBlob:'c'.repeat(40),guardBlob:'d'.repeat(40),previousReceiptBlob:'e'.repeat(40),previous,target};
  const state={current:previous.hostingVersion,j:null,clones:0,consumed:[]};
  const io={
    readJournal:async()=>state.j,
    readControl:async()=>({generation:0,physical:previous,receiptBlob:req.previousReceiptBlob,guardBlob:'d'.repeat(40),consumed:state.consumed}),
    validateProofs:async()=>{},verifyPreview:async r=>r,
    verifyLive:async r=>{assert.equal(state.current,r.hostingVersion);return {...r,firebase:r.files,custom:r.files,manifestDigest:'sha256:'+'9'.repeat(64)};},
    currentVersion:async()=>state.current,assertOwnership:async()=>{},assertCompensationOwnership:async()=>{},
    cas:async(old,next)=>{assert.deepEqual(old,state.j);state.j=next;return next;},
    clone:async(to,from)=>{assert.equal(state.current,from);state.current=to;state.clones++;},
    liveUiProof:async()=>({result:'PASS',buildId:target.buildId,receiptBlob:'2'.repeat(40)}),
    signedReceipt:async()=>({verified:true,blob:'3'.repeat(40),commit:'4'.repeat(40)}),
    commitAll:async(old,next)=>{assert.deepEqual(old,state.j);state.j=next;state.consumed.push(req.approvalBlob);return next;},
    verifyCommitted:async j=>{assert.equal(j.phase,'COMMITTED');assert.equal(state.current,target.hostingVersion);},
    incident:async(old,next)=>{assert.deepEqual(state.j,old);state.j=next;}
  };
  return {req,state,io};
}
test('verified commit and idempotent retry clone once',async()=>{const f=fixture();await promote(f.io,f.req);await promote(f.io,f.req);assert.equal(f.state.clones,1);});
for(const [title,mutate] of [
  ['stale guard',f=>f.req.guardBlob='0'.repeat(40)],
  ['consumed authorization',f=>f.state.consumed.push(f.req.approvalBlob)],
  ['digest drift',f=>f.io.verifyPreview=async r=>({...r,artifactDigest:'sha256:'+'0'.repeat(64)} )],
  ['foreign current release',f=>f.state.current='third'],
  ['concurrent HEAD CAS',f=>f.io.cas=async()=>{throw Error('HEAD_CAS_FAILED');}]
])test(title,async()=>{const f=fixture();mutate(f);await assert.rejects(promote(f.io,f.req));assert.equal(f.state.clones,0);});
for(const [title,mutate] of [
  ['commit failure compensates',f=>f.io.commitAll=async()=>{throw Error('HEAD_CAS_FAILED');}],
  ['missing signed receipt',f=>f.io.signedReceipt=async()=>({})],
  ['missing real UI receipt',f=>f.io.liveUiProof=async()=>({})],
  ['incomplete custom origin',f=>{const verify=f.io.verifyLive;f.io.verifyLive=async r=>({...await verify(r),custom:r.sourceSha===f.req.target.sourceSha?0:r.files});}]
])test(title,async()=>{const f=fixture();mutate(f);await assert.rejects(promote(f.io,f.req));assert.equal(f.state.j.phase,'ROLLED_BACK');assert.equal(f.state.clones,2);});
test('interrupted after Hosting resumes without another clone',async()=>{const f=fixture();f.state.j={phase:'PROMOTING',key:digest(f.req),generation:1,request:f.req};f.state.current=f.req.target.hostingVersion;await promote(f.io,f.req);assert.equal(f.state.clones,0);});
test('concurrent third version during compensation remains untouched',async()=>{const f=fixture();f.io.liveUiProof=async()=>{f.state.current='third';throw Error('INTERRUPTED');};await assert.rejects(promote(f.io,f.req));assert.equal(f.state.current,'third');assert.equal(f.state.j.phase,'INCIDENT');});
test('lost reply after committed metadata cannot trigger rollback',async()=>{const f=fixture(),commit=f.io.commitAll;f.io.commitAll=async(...args)=>{await commit(...args);throw Error('LOST_ACK');};assert.equal((await promote(f.io,f.req)).phase,'COMMITTED');assert.equal(f.state.clones,1);});
