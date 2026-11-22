'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('./gravicentra-i66-issued-renewal-cas.cjs');
const holder={id:'qa-holder'},insurer={id:'qa-insurer'};
const prior={id:'qa-old',clienteId:holder.id,aseguradoraId:insurer.id,asesorId:'qa-advisor',vigenciaFin:C.term.vigenciaInicio};
const car={id:'qa-vehicle',placa:'qa-plate',clienteId:holder.id};
const current={holders:[holder],insurers:[insurer],policies:[prior],risk:[car],advisors:[{id:'qa-advisor'}]};
const judge=patch=>C.assess({...current,...patch},(v,f)=>v==='qa-plate'&&f==='plateWitness');
test('exact frozen issue, statement and direction decision agree',()=>C.checkSources());
test('unique predecessor, assignee, insured and risk',()=>assert.equal(judge({}),'ELIGIBLE'));
for(const [reason,patch] of [
  ['HOLDER_OR_INSURER_NOT_UNIQUE',{holders:[holder,holder]}],['PREDECESSOR_NOT_UNIQUE',{policies:[]}],
  ['ISSUED_EDITION_ALREADY_PRESENT',{policies:[prior,{vigenciaInicio:C.term.vigenciaInicio}]}],
  ['PREDECESSOR_HAS_DIFFERENT_LIFECYCLE',{policies:[{...prior,renovadaPor:'qa-other'}]}],
  ['RISK_CONTRADICTS_ISSUER_OR_HOLDER',{risk:[{...car,vin:'conflict'}]}],['ADVISOR_NOT_CURRENT',{advisors:[]}],
  ['DUPLICATE_OR_ORPHAN_REFERENCE',{requirementAlreadyUsed:true}],['PREDECESSOR_HAS_LINKED_SUCCESSOR',{priorObligations:true}]
])test(reason,()=>assert.equal(judge(patch),reason));
test('one issued obligation, linked portfolio and risk, no cash or assertion of consent',()=>{
  const plan=C.mutations(prior,holder,insurer,car,'2026-11-22T18:00:00Z');
  const [[,p],[,r],[,c],[,v],[,a]]=plan.creates;
  assert.deepEqual(plan.creates.map(([k])=>k),['polizas','recibosEsperados','carteraPrimas','vehiculos','actividades']);
  assert.equal(p.id,plan.previous.renovadaPor);assert.equal(p.renuevaDe,prior.id);
  assert.equal(p.id,v.polizaId);assert.equal(p.vehiculoId,v.id);assert.equal(a.clienteId,holder.id);
  assert.equal(r.id,c.reciboId);assert.equal(Math.round(100*(r.neta+r.gastosEmision+r.otros+r.iva)),306320);
  assert.equal(r.conciliado,false);assert.equal(r.fechaPago,null);assert.equal(p.documentos[0].fileId,C.term.issuerDocumentId);
  assert.equal(p.vencimientosDocumentados[0].fechaVencimiento,r.vence);
  assert.deepEqual(plan,C.mutations(prior,holder,insurer,car,'2026-11-22T18:00:00Z'));
});
