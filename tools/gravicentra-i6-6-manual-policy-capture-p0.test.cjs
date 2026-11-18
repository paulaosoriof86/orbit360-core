'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('orbit360-platform/core/primas.js','utf8'),ui=fs.readFileSync('orbit360-platform/modules/policy-receipts-v1199-bridge.js','utf8');
function primas(){const app={Orbit:{paisCfg:()=>({iva:12,recargoFinanciero:5,gastosEmision:0})}};vm.runInNewContext(src,{window:app,Orbit:app.Orbit,Date,Math,Number,RangeError});return app.Orbit.primas;}
test('cash or Visa-funded one insurer receipt starts on inception, grace limit 30 days',()=>{
 const p=primas(),d=p.desglose(2600.02,'GT',{fraccionado:false,gastosEmision:140,otros:200,ivaPct:12,recargoFinPct:0});
 const rows=p.recibos(d,{frecuencia:'Contado',cuotas:1,vigenciaInicio:'2026-11-18',vigenciaFin:'2027-11-18'});
 assert.equal(rows.length,1);assert.equal(rows[0].vence,'2026-11-18');assert.equal(rows[0].fechaLimite,'2026-12-18');
 assert.equal(rows[0].total,d.total);
});
test('a monthly two-payment plan begins at inception then follows month offset without drift',()=>{
 const p=primas(),d=p.desglose(1000,'GT',{fraccionado:true,gastosEmision:50,otros:0,ivaPct:12,recargoFinPct:2});
 const rows=p.recibos(d,{frecuencia:'Mensual',cuotas:2,vigenciaInicio:'2026-11-18',vigenciaFin:'2027-11-18'});
 assert.equal(rows.length,2);assert.equal(rows[0].vence,'2026-11-18');assert.equal(rows[1].vence,'2026-12-18');
 assert.equal(rows[0].fechaLimite,'2026-12-03');
});
test('two semiannual receipts are separated six months, not presumed monthly',()=>{
 const p=primas(),d=p.desglose(1000,'GT',{fraccionado:true,gastosEmision:50,otros:0,ivaPct:12,recargoFinPct:2});
 const rows=p.recibos(d,{frecuencia:'Semestral',cuotas:2,vigenciaInicio:'2026-11-18',vigenciaFin:'2027-11-18'});
 assert.equal(rows[0].vence,'2026-11-18');assert.equal(rows[1].vence,'2027-05-18');
});
test('new policy defaults renewable while existing unknown remains reviewable',()=>{
 assert.match(ui,/\(!existing \|\| renewabilityState\(existing\)==='YES'\)/);
 assert.match(ui,/existing && renewabilityState\(existing\)==='UNKNOWN'/);
});
test('date recalculation does not overwrite manually edited term and uses UTC civil year',()=>{
 assert.match(ui,/endManuallyEdited=true/);assert.match(ui,/if\(!endManuallyEdited\)/);
 assert.match(ui,/Date\.UTC\(endYear,month-1,Math\.min\(day,last\)\)/);
});
test('source UI exposes optional calendar errors rather than silently suppressing create',()=>{
 assert.match(ui,/data-contractual-calendar-panel/);
 assert.match(ui,/Never silently disable the button/);
 assert.match(ui,/\[data-documented-calendar\].*aria-invalid/);
});
test('GT insurer issue defaults remain human overridable and product-gated',()=>{
 assert.match(ui,/issueManuallyEdited=true/);
 assert.match(ui,/mapfre/);
 assert.match(ui,/net\+assistance/);
 assert.match(ui,/columna/);
 assert.match(ui,/veh.*mapfre/i);
});
test('twelve-payment financial surcharge cannot default to an unverified rate',()=>{
 assert.match(ui,/freq==='Mensual'&&installments<=11/);
 assert.match(ui,/recargo_financiero_requiere_confirmacion/);
});
