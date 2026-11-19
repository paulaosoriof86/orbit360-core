'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {SOURCE_SHA,ROWS,selectSix,stateFingerprint,corrected,paid,internal,cents}=require('./gravicentra-i66-mapfre-six-protected-cas.cjs');
assert.equal(SOURCE_SHA,'29a42705ae6f7b2b42693f51a27a0b1f4ced279e2259b28ce021ff7b21ccefb0');
assert.equal(ROWS.length,6);
assert.equal(new Set(ROWS.map(x=>x.requirement)).size,6);
assert.equal(new Set(ROWS.map(x=>x.due+'|'+x.policy)).size,6);
assert.equal(new Set(ROWS.map(x=>x.policy)).size,3);
assert.equal(ROWS.reduce((s,x)=>s+x.grossCents-x.oldCents,0),10879,'INSURER_PENDING_GROSS_CORRECTION_Q108_79');
assert.equal(ROWS.filter(x=>x.oldCents!==x.grossCents).length,5);
assert.equal(ROWS.reduce((s,x)=>s+x.grossCents,0),130130,'SIX_GROSS_PENDING_TOTAL_Q1301_30');
assert.equal(internal(''),true);assert.equal(internal('rec_abcdef0123456789'),true);
assert.equal(internal('1 / 12'),true);assert.equal(internal('MAPFRE-REQ-456'),false);
assert.equal(cents(104.58),10458);
assert.equal(paid({estado:'Pagado'}),true);assert.equal(paid({applicationState:'APPLIED_DIRECT'}),true);
function sourceGroups(){
  return [...new Set(ROWS.map(x=>x.policy))].map((policyNumber,i)=>{
    const policy={id:'p'+i,numero:policyNumber,pais:'GT',moneda:'GTQ',clienteId:'client'+i,
      aseguradoraId:'insurer'+i,vigenciaInicio:'2026-06-01',vigenciaFin:'2027-06-01',
      primaNeta:999.99,comisionPorcentaje:17};
    const rows=ROWS.filter(x=>x.policy===policyNumber);
    return {policy,clientExists:true,insurerVerified:true,
      receipts:rows.map(x=>({id:'r'+x.id,polizaId:policy.id,clienteId:policy.clienteId,
        moneda:'GTQ',fechaLimite:x.due,numeroReciboFuente:'1/12',primaTotal:x.oldCents/100,
        primaNeta:99.99,comisionNeta:17,estado:'Pendiente'})),
      portfolio:rows.map(x=>({id:'c'+x.id,reciboId:'r'+x.id,polizaId:policy.id,
        clienteId:policy.clienteId,moneda:'GTQ',primaTotal:x.oldCents/100,carteraActiva:true})),
      cobros:[]};
  });
}
const sourceIndex=()=>Object.fromEntries(ROWS.map(x=>[x.requirement,[]]));
const good=sourceGroups();
const found=selectSix(good,sourceIndex());
assert.equal(found.length,6);
assert.equal(found.filter(x=>x.source.grossCents!==x.source.oldCents).length,5);
const after=corrected(good,found);
assert.notEqual(stateFingerprint(good),stateFingerprint(after));
for(const x of found){
  const g=after.find(g=>g.policy.id===x.policyId);
  const r=g.receipts.find(r=>r.id===x.receiptId),c=g.portfolio.find(c=>c.id===x.portfolioId);
  assert.equal(r.numeroReciboFuente,x.source.requirement);
  assert.equal(cents(r.primaTotal),x.source.grossCents);
  assert.equal(cents(c.primaTotal),x.source.grossCents);
  assert.equal(r.primaNeta,99.99,'NET_PREMIUM_IMMUTABLE');
  assert.equal(r.comisionNeta,17,'COMMISSION_IMMUTABLE');
  assert.equal(g.policy.primaNeta,999.99,'POLICY_NET_IMMUTABLE');
  assert.equal(g.policy.comisionPorcentaje,17,'POLICY_COMMISSION_IMMUTABLE');
  assert.equal(r.estado,'Pendiente','PENDING_NOT_PAID');
  assert.equal(g.cobros.length,0,'NO_PAYMENT_CREATED');
}
assert.deepEqual(good,sourceGroups(),'PREDICTED_POSTIMAGE_DOES_NOT_MUTATE_PREIMAGE');
const mut=(fn)=>{const clone=structuredClone(good);fn(clone);return clone;};
const deny=(target,matcher)=>assert.throws(()=>selectSix(target,sourceIndex()),matcher);
deny(mut(g=>{g[0].receipts[0].numeroReciboFuente='MAPFRE-OLD';}),/EXTERNAL_REFERENCE_CONFLICT/);
deny(mut(g=>{g[0].receipts[0].numeroRequerimiento='OTHER-REQ';}),/EXTERNAL_REFERENCE_CONFLICT/);
deny(mut(g=>{g[0].receipts[0].primaTotal=10;}),/RECEIPT_GROSS_PREIMAGE_CHANGED/);
deny(mut(g=>{g[0].receipts[0].monto=10;}),/RECEIPT_GROSS_PREIMAGE_CHANGED/);
deny(mut(g=>{g[0].receipts[0].pagado=true;}),/PAID_RECEIPT_PROTECTED/);
deny(mut(g=>{g[0].cobros.push({reciboId:g[0].receipts[0].id});}),/PAID_RECEIPT_PROTECTED/);
deny(mut(g=>{g[0].portfolio[0].primaTotal=100;}),/PORTFOLIO_GROSS_OR_RELATION_MISMATCH/);
deny(mut(g=>{g[0].portfolio[0].carteraActiva=false;}),/ACTIVE_PORTFOLIO_NOT_EXACT/);
deny(mut(g=>{g[0].portfolio[0].clienteId='another';}),/PORTFOLIO_GROSS_OR_RELATION_MISMATCH/);
deny(mut(g=>{g[0].portfolio.push({...g[0].portfolio[0],id:'other'});}),/ACTIVE_PORTFOLIO_NOT_EXACT/);
deny(mut(g=>{g[0].receipts.push({...g[0].receipts[0],id:'other'});}),/EXACT_DUE_POLICY_EDITION_NOT_UNIQUE/);
deny(mut(g=>{g[0].policy.pais='CO';}),/POLICY_RECEIPT_SCOPE_OR_TERM/);
deny(mut(g=>{g[0].policy.tenantId='other-tenant';}),/POLICY_RECEIPT_SCOPE_OR_TERM/);
deny(mut(g=>{g[0].receipts[0].tenantId='other-tenant';}),/POLICY_RECEIPT_SCOPE_OR_TERM/);
deny(mut(g=>{g[0].portfolio[0].tenantId='other-tenant';}),/PORTFOLIO_GROSS_OR_RELATION_MISMATCH/);
deny(mut(g=>{g[0].policy.estado='Cancelada';}),/POLICY_RECEIPT_SCOPE_OR_TERM/);
deny(mut(g=>{g[0].policy.moneda='USD';}),/POLICY_RECEIPT_SCOPE_OR_TERM/);
deny(mut(g=>{g[0].clientExists=false;}),/CLIENT_OR_MAPFRE_IDENTITY/);
deny(mut(g=>{g[0].insurerVerified=false;}),/CLIENT_OR_MAPFRE_IDENTITY/);
deny(mut(g=>{g[0].policy.vigenciaFin='2026-07-01';}),/POLICY_RECEIPT_SCOPE_OR_TERM/);
deny(mut(g=>{g[0].receipts[0].fechaLimite='2026-04-01';}),/EXACT_DUE_POLICY_EDITION_NOT_UNIQUE/);
deny(mut(g=>{g.splice(2,1);}),/THREE_POLICY_NUMBERS_REQUIRED/);
assert.throws(()=>selectSix(good,{...sourceIndex(),[ROWS[0].requirement]:['already-linked']}),/SOURCE_NUMBER_ALREADY_LINKED/);
const withHistorical=structuredClone(good);
withHistorical.push({policy:{...good[0].policy,id:'old-edition',vigenciaInicio:'2025-06-01',vigenciaFin:'2026-06-01'},
 clientExists:true,insurerVerified:true,receipts:[],cobros:[],portfolio:[]});
assert.equal(selectSix(withHistorical,sourceIndex()).length,6,'HISTORICAL_POLICY_EDITIONS_NOT_FALSE_CONFLICT');
const source=fs.readFileSync(path.join(__dirname,'gravicentra-i66-mapfre-six-protected-cas.cjs'),'utf8');
assert.ok(source.includes("name:'gravicentra-live-data-writes' ")===false);
assert.ok(source.includes("gate?.environment!=='gravicentra-live-data-writes'"));
assert.ok(source.includes("mode==='dry-run'"));
assert.ok(source.includes('tx.update(item(db,\'recibosEsperados\')'));
assert.ok(source.includes('tx.update(item(db,\'carteraPrimas\')'));
assert.ok(source.includes('tx.create(auditRef'));
assert.equal(source.includes("tx.update(item(db,'cobros')"),false);
assert.equal(source.includes("tx.update(item(db,'polizas')"),false);
assert.equal(source.includes('setCustomUserClaims'),false);
console.log('I66_MAPFRE_SIX_SOURCE_GROSS_CAS_NEGATIVE_TESTS_PASS 6 receipts 6 cartera 0 cobros');
