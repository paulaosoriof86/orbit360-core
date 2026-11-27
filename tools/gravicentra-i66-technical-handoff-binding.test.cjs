'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {prepareFindingHandoff,resolveFindingHandoff,settleFindingHandoff}=require('./gravicentra-i6-6-cloud-build-signed-cas.cjs');
const bytes=v=>Buffer.from(JSON.stringify(v,null,2)+'\n');
const blob=b=>crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
function fixture() {
  const id='GI-HO-99',head='a'.repeat(40),ledger=bytes({findings:[{id:'keep'}],i66TechnicalHandoffs:{}});
  const register=bytes({expectedLedgerNextBlobSha:blob(ledger),inventory:[{id:'keep'}]});
  const control={findingLedgerBlobSha:blob(ledger),continuityRegisterBlobSha:blob(register),journal:{stage:'LIVE_DEPLOYED'},
    findingContinuityControl:{lastLedgerBlobSha:blob(ledger),registerBlobSha:blob(register)}};
  const proposed=JSON.parse(ledger);proposed.i66TechnicalHandoffs[id]={id,gate:'I6.6',status:'RECEIVED_OPEN',functionalReleaseAccepted:false};
  const nextLedger=bytes(proposed),nextRegister=bytes({...JSON.parse(register),expectedLedgerNextBlobSha:blob(nextLedger)});
  return {id,head,ledger,register,nextLedger,nextRegister,control};
}
test('old, prepared, received and settled states have exact, independently reproducible pointers',()=>{
  const f=fixture(),p=prepareFindingHandoff(f);assert.equal(resolveFindingHandoff(f.control,f.ledger,f.register),f.control);
  assert.equal(resolveFindingHandoff(p,f.ledger,f.register).findingLedgerBlobSha,blob(f.ledger));
  assert.equal(resolveFindingHandoff(p,f.nextLedger,f.nextRegister).continuityRegisterBlobSha,blob(f.nextRegister));
  const s=settleFindingHandoff(p,f.nextLedger,f.nextRegister);assert.equal(s.findingLedgerBlobSha,blob(f.nextLedger));
  assert.equal(s.findingContinuityControl.preparedTechnicalHandoff,undefined);assert.deepEqual(s.journal,f.control.journal);
});
test('mixed, missing, unprepared or third pairs and premature finalization all fail closed',()=>{
  const f=fixture(),p=prepareFindingHandoff(f);
  for(const [l,r] of [[f.ledger,f.nextRegister],[f.nextLedger,f.register],[f.nextLedger,bytes({...JSON.parse(f.nextRegister),extra:1})]])
    assert.throws(()=>resolveFindingHandoff(p,l,r));
  assert.throws(()=>settleFindingHandoff(p,f.ledger,f.register));assert.throws(()=>settleFindingHandoff(f.control,f.ledger,f.register));
  assert.throws(()=>prepareFindingHandoff({...f,control:p}));
});
test('unrelated rows, functional acceptance, receipt digest or stale controlling pins cannot be admitted',()=>{
  const f=fixture(),p=prepareFindingHandoff(f);
  for(const mod of [j=>j.findings.pop(),j=>{j.i66TechnicalHandoffs[f.id].functionalReleaseAccepted=true;}]) {
    const j=JSON.parse(f.nextLedger);mod(j);assert.throws(()=>prepareFindingHandoff({...f,nextLedger:bytes(j)}));
  }
  const bad=structuredClone(p);bad.findingContinuityControl.preparedTechnicalHandoff.handoffSha256='0'.repeat(64);
  assert.throws(()=>resolveFindingHandoff(bad,f.nextLedger,f.nextRegister));
  assert.throws(()=>resolveFindingHandoff({...p,findingLedgerBlobSha:'0'.repeat(40)},f.ledger,f.register));
});
