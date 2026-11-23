'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const source=JSON.parse(fs.readFileSync(path.join(__dirname,'../artifacts/orbit360-recovery/source-batches/I6_6_SOURCE_BULK_20261120_MULTI_302.json')));
const cross=JSON.parse(fs.readFileSync(path.join(__dirname,'../artifacts/orbit360-recovery/source-batches/I6_6_UNIVERSALES_25_PENDING_2_PAID_9_INFERRED_20261122.json')));
test('Universales 25 unique pending requirements remain exact insured-source rows, not assumed payments',()=>{
 const chosen=cross.exactPolicies.flatMap(p=>p.pendingRows.map(r=>({...r,policy:p.policy})));
 assert.equal(chosen.length,25);
 assert.equal(new Set(chosen.map(r=>r.requirement)).size,25);
 for(const r of chosen){
  const originals=source.rows.filter(s=>s.insurer==='UNIVERSALES'&&s.policy===r.policy&&s.requirement===r.requirement);
  assert.equal(originals.length,1);
  const s=originals[0];
  assert.deepEqual([r.due,r.grossCents,r.sourceRowNumber],[s.due,s.grossCents,s.sourceRowNumber]);
  assert.equal(s.state,'PENDING');
  assert.equal(s.sourceSha256,cross.documentarySources.insurerPending.rawSha256);
 }
 assert.equal(chosen.reduce((n,r)=>n+r.grossCents,0),1574183);
 assert.equal(cross.counts.pendingRows,25);
 assert.equal(cross.counts.operationalLiveWrites,0);
});
test('Two original insurer paid receipts anchor nine distinct earlier inferences without invented dates',()=>{
 const p=cross.exactPolicies.filter(r=>r.paidAnchor);
 assert.equal(p.length,2);
 assert.equal(p.reduce((n,r)=>n+r.priorInferred.count,0),9);
 for(const x of p){
  const refs=x.pendingRows.map(r=>+r.requirement);
  assert.equal(Math.min(...refs)-1,+x.paidAnchor.requirement);
  assert.equal(x.paidAnchor.paymentNumber+1,x.firstPaymentSequence);
  assert.equal(x.priorInferred.last,x.paidAnchor.paymentNumber-1);
  assert.equal(x.paidAnchor.status,'PAGADO');
  assert.match(x.paidAnchor.statusTimestampLocal,/^2026-11-\d\dT\d\d:\d\d:\d\d$/);
  assert.equal(x.paidAnchor.dueDate,'2026-11-01');
  assert.ok(!Object.hasOwn(x.paidAnchor,'actualPaymentDate'),'source status timestamp is not a bank payment date');
 }
});
test('Old -3 medical policy does not manufacture -4 contract or paid installments',()=>{
 const med=cross.exactPolicies.find(p=>p.policy==='04-05-01-12289-4');
 assert.equal(med.pendingRows.length,12);
 assert.equal(med.paidAnchor,null);
 assert.equal(med.priorInferred,null);
 assert.equal(med.knownPriorIssued.number,'04-05-01-12289-3');
 assert.equal(med.knownPriorIssued.exactEdition2026IssuedVerified,false);
 assert.equal(cross.priceSemantics.policy10738.differenceCents,2464);
 assert.equal(cross.priceSemantics.policy15590.differenceCents,2464);
 assert.equal(cross.unchangedFourthPolicyControl.pendingRows,10);
 assert.equal(cross.operationalWrites,0);
 assert.equal(cross.paymentWrites,0);
 assert.equal(cross.liveDeploy,false);
});
