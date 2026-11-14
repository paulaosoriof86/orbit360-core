'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {K,fixtureRows,inspect,financialSnapshot,digest}=require('./gravicentra-i66-universales-maria-10-source-numbers-protected.cjs');

const insurerRows=Array.from({length:10},(_,i)=>({seq:i+3,
  receiptId:'cob_pol_mwajp407_fizii_'+String(i+3).padStart(3,'0'),
  numeroReciboFuente:String(39460328+i),
  contractualDueDate:[
    '2026-12-01','2027-01-01','2027-02-01','2027-03-01','2027-04-01',
    '2027-05-01','2027-06-01','2027-07-01','2027-08-01','2027-09-01'][i],
  amountGTQ:952.56}));
const fixture={projectId:K.project,status:'NOT_APPLIED',policyNumber:K.policy,
  policyId:'pol_mwajp407_fizii',clientId:K.clientId,
  source:{kind:'UNIVERSALES_AGING_CUTOFF_2026_11_09'},rows:insurerRows};
const source=fixtureRows(fixture);
const dates=[null,'2026-10-01','2026-10-31','2026-12-01','2026-12-31','2027-01-31',
  '2027-03-03','2027-03-31','2027-05-01','2027-05-31','2027-07-01','2027-07-31','2027-08-31'];
const iid=n=>'cob_pol_mwajp407_'+String(n).padStart(3,'0');
function sample(){
  const receipts=Array.from({length:12},(_,i)=>({id:iid(i+1),polizaId:K.policyId,
    clienteId:K.clientId,secuencia:i+1,cuota:(i+1)+'/12',monto:952.56,
    vence:dates[i+1],estado:'Pendiente'}));
  return {tenantId:'tenant-gt',policyMatches:1,
    policy:{id:K.policyId,numero:K.policy,pais:'GT',clienteId:K.clientId},
    client:{id:K.clientId},receipts,portfolio:receipts.map(r=>({
      id:'car_'+r.id,reciboId:r.id,polizaId:K.policyId,monto:952.56,
      vence:r.vence,estado:'Pendiente'})),payments:[],marker:null,event:null,
    sourceMatches:Object.fromEntries(source.map(r=>[r.source,[]]))};
}
test('10 insurer rows remain tied to the immutable original policy and exact sequence',()=>{
  assert.deepEqual(source.map(r=>r.seq),[3,4,5,6,7,8,9,10,11,12]);
  assert.equal(source[0].source,'39460328');assert.equal(source[9].source,'39460337');
  assert.throws(()=>fixtureRows({...fixture,rows:insurerRows.slice(0,9)}));
  assert.throws(()=>fixtureRows({...fixture,policyId:K.policyId}));
});
test('reads 10 eligible technical reference numbers while preserving 7 date HOLDs',()=>{
  const result=inspect(sample(),source);
  assert.equal(result.ok,true);
  assert.equal(result.patchCount,10);
  assert.deepEqual(result.dueMismatches,[4,5,6,7,9,11,12]);
  assert.equal(result.paymentWriteCount,undefined);
  assert.equal(result.paymentsCreated,0);
  assert.equal(result.datesChanged,0);
});
test('a valid audited replay is safe and makes no second write',()=>{
  const x=sample();
  for(const item of source){
    x.receipts.find(r=>r.id===item.id).numeroReciboFuente=item.source;
    x.sourceMatches[item.source]=[{id:item.id}];
  }
  x.marker={status:'committed',eventId:K.eventId};x.event={requestId:K.requestId};
  const c=inspect(x,source);assert.equal(c.ok,true);assert.equal(c.patchCount,0);
});
test('partial or unaudited attachment is HOLD even if all numbers are correct',()=>{
  const x=sample();x.receipts[2].numeroReciboFuente=source[0].source;
  x.sourceMatches[source[0].source]=[{id:source[0].id}];
  assert.ok(inspect(x,source).issues.includes('UNAUDITED_PARTIAL_SOURCE_APPLICATION'));
  const y=sample();for(const it of source){
    y.receipts.find(r=>r.id===it.id).numeroReciboFuente=it.source;
    y.sourceMatches[it.source]=[{id:it.id}];
  }
  assert.ok(inspect(y,source).issues.includes('UNAUDITED_PARTIAL_SOURCE_APPLICATION'));
});
test('paid receipt and linked payment are never eligible for this technical batch',()=>{
  const x=sample();x.receipts[3].fechaPago='2026-11-10';
  assert.equal(inspect(x,source).ok,false);
  const y=sample();y.payments.push({id:'some-payment'});
  assert.ok(inspect(y,source).issues.includes('POLICY_PAYMENTS_REQUIRE_REVIEW'));
});
test('fails closed on changed contractual dates, receipt amount or external reference collision',()=>{
  const x=sample();x.receipts[3].vence='2027-01-01';
  assert.ok(inspect(x,source).issues.includes('DATE_DRIFT_SET_CHANGED'));
  const y=sample();y.receipts[4].monto=999;
  assert.ok(inspect(y,source).issues.includes('RECEIPT_RELATION_STATE_5'));
  const z=sample();z.sourceMatches[source[1].source]=[{id:iid(99)}];
  assert.ok(inspect(z,source).issues.includes('SOURCE_CONFLICT_4'));
});
test('cross-tenant, duplicate portfolio and wrong source order are rejected',()=>{
  const x=sample();x.policy.tenantId='another-tenant';
  assert.ok(inspect(x,source).issues.includes('POLICY_CLIENT_TENANT'));
  const y=sample();y.portfolio.push({...y.portfolio[3],id:'duplicate'});
  assert.ok(inspect(y,source).issues.includes('PORTFOLIO_12_RELATIONS'));
  const z={...fixture,rows:insurerRows.map(r=>({...r}))};
  z.rows[1].numeroReciboFuente=z.rows[2].numeroReciboFuente;
  assert.throws(()=>fixtureRows(z));
});
test('financial snapshot fingerprint ignores only external source number',()=>{
  const first=sample(),second=sample();
  second.receipts[2].numeroReciboFuente='39460328';
  assert.equal(digest(financialSnapshot(first)),digest(financialSnapshot(second)));
  second.receipts[2].vence='2027-01-01';
  assert.notEqual(digest(financialSnapshot(first)),digest(financialSnapshot(second)));
});
