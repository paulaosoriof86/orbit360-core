'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
// Parsing and source precedence are tested without contacting a provider.
const C=require('./gravicentra-i66-issued-source-schedules.cjs');
const rel={client:{id:'qa-c'},advisor:{id:'qa-a'},insurer:{id:'qa-i'}};
const original={status:'VERIFIED',sourceId:'qa-document',risk:{placa:'QA',vin:'QA',sumaAsegurada:100}};
for(const code of ['D01','D03'])test(code+' conservation, deterministic relationships and no direct payments',()=>{
  const s=C.scope(code),links=code==='D01'?rel:{...rel,prior:{id:'qa-parent',ramo:'VEHICULOS'}};
  const p=C.plan(s,links,original,'2026-11-22T18:00:00Z');
  const rows=k=>p.creates.filter(([c])=>k===c).map(([,r])=>r);
  const policy=rows('polizas')[0],receipts=rows('recibosEsperados'),portfolio=rows('carteraPrimas'),payments=rows('cobros');
  assert.equal(new Set(p.creates.map(([k,r])=>k+'/'+r.id)).size,p.creates.length);
  assert.ok(portfolio.every(r=>receipts.some(x=>x.id===r.reciboId&&x.carteraActiva)));
  assert.deepEqual([receipts.length,portfolio.length,payments.length],code==='D01'?[12,10,2]:[11,11,0]);
  assert.ok(payments.every(r=>r.fechaPago===r.vence && r.metodo===null && !r.confirmado && !r.conciliado));
  assert.equal(policy.primaTotal,code==='D01'?4012.30:5502.36);
  assert.equal(p.pending,code==='D01'?334370:563508);assert.equal(p.inferred,code==='D01'?66855:0);
  if(code==='D03'){assert.equal(policy.cuotas,1);assert.equal(policy.cronogramaOriginalAseguradora[0].requirement,'5654713');assert.ok(receipts.every(r=>r.importeNeto==null&&r.cuota===''&&r.numeroCuota==null&&r.posicionEstadoCuenta===r.secuencia));}
  assert.deepEqual(p,C.plan(s,links,original,'2026-11-22T18:00:00Z'));
});
test('unknown financial authority or unavailable original stops the plan',()=>{
  assert.throws(()=>C.scope('D04'));assert.throws(()=>C.plan(C.scope('D01'),rel,{status:'404'},'2026-11-22T18:00:00Z'));
});
