'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const plan=require('./gravicentra-i66-issued-renewal-gyt-plan.cjs');
test('The two statement requirements and eight later contractual obligations reconcile to the issued schedule',()=>{
  plan.check();
  const rows=plan.term.issuedSchedule;
  assert.equal(rows.slice(0,2).reduce((s,x)=>s+x.grossCents,0),132948);
  assert.equal(rows.slice(2).reduce((s,x)=>s+x.grossCents,0),531789);
});
test('Duplicate requirement and component drift are rejected',t=>{
  const [first,second]=plan.term.issuedSchedule;
  const original=Object.assign({},second);
  t.after(()=>Object.assign(second,original));
  second.number=first.number;
  assert.throws(plan.check);
  Object.assign(second,original);
  second.netCents++;
  assert.throws(plan.check);
});
test('Vehicle class, policy history, two evidence classes and full receipt links survive materialization',t=>{
  const term=plan.term,old={...term};
  t.after(()=>Object.assign(term,old));
  const witness=v=>plan.sha(term.pdfSha256+'|'+plan.normalize(v));
  Object.assign(term,{plateWitness:witness('C000ZZZ'),plateWithoutClassWitness:witness('000ZZZ'),engineWitness:witness('TESTENGINE'),
    chassisWitness:witness('TESTVIN'),issuerChassisLength:7});
  assert.equal(plan.matchRisk({placa:'000ZZZ',motor:'different'}),false);
  assert.equal(plan.matchRisk({placa:'P000ZZZ'}),false);
  assert.equal(plan.matchRisk({placa:'C000ZZZ',chasis:'other'}),false);
  assert.equal(plan.matchRisk({}),false);
  const before={id:'test-prior',clienteId:'test-holder',asesorId:'test-advisor',aseguradoraId:'test-insurer',historial:[{t:'history'}]};
  const r=plan.mutation(before,{id:'test-car',placa:'000ZZZ'},'2026-11-23T01:00:00Z');
  assert.equal(r.created.length,23);
  const docs=k=>r.created.filter(([collection])=>collection===k).map(([,d])=>d);
  const [policy]=docs('polizas'),receipts=docs('recibosEsperados'),portfolio=docs('carteraPrimas');
  assert.equal(r.previous.renovadaPor,policy.id);
  assert.equal(policy.renuevaDe,before.id);
  assert.deepEqual(r.previous.historial[0],before.historial[0]);
  assert.equal(r.previous.historial[1].fecha,'2026-11-22');
  assert.equal(docs('vehiculos')[0].placa,'C000ZZZ');
  assert.equal(receipts.filter(x=>x.origenSaldo==='ESTADO_ASEGURADORA_PENDIENTE').length,2);
  assert.equal(receipts.filter(x=>x.origenSaldo==='CALENDARIO_EMITIDO_FUTURO').length,8);
  for(const [i,receipt] of receipts.entries()){
    assert.equal(receipt.fechaPago,null); assert.equal(receipt.conciliado,false);
    assert.equal(receipt.polizaId,policy.id); assert.equal(portfolio[i].reciboId,receipt.id);
  }
  assert.equal(docs('cobros').length,0);
});
