'use strict';
const fs=require('node:fs');
const test=require('node:test');
const assert=require('node:assert/strict');
const owner=require('./gravicentra-i66-frontend-control.cjs');
const candidate=require('./gravicentra-i6-6-operational-release-candidate.cjs');
const {P,genName,physicalGuard,blob}=owner;
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const serial=value=>JSON.stringify(value,null,2)+'\n';

function model(){
  const cp=read(P.cp),state=read(P.state),transport=read(P.transport);
  const head=cp.i66FrontendReleaseHead,receipt=read(head.receiptPath);
  const journalPath=genName(head.generation,'JOURNAL'),journal=read(journalPath),ledger=read(P.ledger);
  const f={cp,state,transport,head,receipt,journal,ledger};
  f.verify=()=>{
    const receiptBytes=serial(receipt);
    head.receiptGitBlobSha=journal.receipt.blob=blob(receiptBytes);
    state.currentPhysicalFrontend=transport.latestSignedPhysicalFrontendLivePointer20261122=ledger.frontendReleaseHead=head;
    const snapshots=new Map([[head.receiptPath,receiptBytes],[journalPath,serial(journal)],[P.ledger,serial(ledger)]]);
    const io={readFileSync:(p,enc)=>snapshots.has(p)?snapshots.get(p):fs.readFileSync(p,enc)};
    return candidate.acceptedForPreflight(cp,state,transport,undefined,io);
  };
  return f;
}
test('the checked-out physical receipt agrees with the active control, ledger and transport',()=>{
  physicalGuard(read(P.cp),read(P.state),read(P.transport),fs);
});
test('a successor can change the file count without a historical acceptance key',()=>{
  const f=model(),count=f.receipt.target.files+1;
  f.receipt.target.files=f.journal.request.target.files=f.receipt.preview.files=count;
  f.receipt.physical.custom=f.receipt.physical.firebase=f.head.hostedFilesEachOrigin=f.transport.currentPhysicalHostingRelease.readbackEachOrigin=count;
  delete f.cp[candidate.ACCEPTANCE_KEY];
  assert.equal(f.verify().sourceSha,f.head.sourceSha);
});
for(const [field,mutate] of [
  ['control count',f=>f.head.hostedFilesEachOrigin++],
  ['transport count',f=>f.transport.currentPhysicalHostingRelease.readbackEachOrigin++],
  ['Preview count',f=>f.receipt.preview.files++],
  ['manifest',f=>f.head.manifestBlob='0'.repeat(40)],
  ['artifact',f=>f.transport.currentPhysicalHostingRelease.artifactId++],
  ['generation',f=>f.transport.frontendReleaseSequence++],
  ['versioned head removal',f=>delete f.cp.i66FrontendReleaseHead]
])test('rejects drift in '+field,()=>{const f=model();mutate(f);assert.throws(f.verify);});
