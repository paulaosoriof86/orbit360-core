'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('orbit360-platform/core/primas.js','utf8'),ui=fs.readFileSync('orbit360-platform/modules/policy-receipts-v1199-bridge.js','utf8');
function primas(){const app={Orbit:{paisCfg:()=>({iva:12,recargoFinanciero:5,gastosEmision:0})}};vm.runInNewContext(src,{window:app,Orbit:app.Orbit,Date,Math,Number,RangeError});return app.Orbit.primas;}
test('cash or Visa-funded one insurer receipt starts on inception, grace limit 30 days',()=>{
 const p=primas(),d=p.desglose(2600.02,'GT',{fraccionado:false,gastosEmision:140,otros:200,ivaPct:12,recargoFinPct:0});
 const rows=p.recibos(d,{frecuencia:'Contado',cuotas:1,vigenciaInicio:'2026-11-18',vigenciaFin:'2027-11-18',cashGraceDays:30});
 assert.equal(rows.length,1);assert.equal(rows[0].vence,'2026-11-18');assert.equal(rows[0].fechaLimite,'2026-12-18');
 assert.equal(rows[0].total,d.total);
});
test('historical one-payment calendar retains its original operational limit',()=>{
 const p=primas(),d=p.desglose(1000,'GT',{fraccionado:false,gastosEmision:0,otros:0,ivaPct:12,recargoFinPct:0});
 const rows=p.recibos(d,{frecuencia:'Contado',cuotas:1,vigenciaInicio:'2026-10-20',vigenciaFin:'2027-10-20'});
 assert.equal(rows[0].vence,'2026-10-20');assert.equal(rows[0].fechaLimite,'2026-11-04');
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
test('GT insurer issuance is editable and resolved from the insurer fiche, never from a brand name',()=>{
 assert.match(ui,/issueManuallyEdited=true/);
 assert.match(ui,/insurerPremiumRule\(insurerEl\.value,ramoEl\.value\)/);
 assert.match(ui,/rule\.gastosEmisionBase==='netaMasAsistencia'/);
 assert.match(ui,/rule\.gastosEmisionPct/);
 assert.doesNotMatch(ui,/\/mapfre\//i);
 assert.doesNotMatch(ui,/\/columna\//i);
});
test('owner-approved twelve-payment financial surcharge defaults to 13.5 percent when source does not override',()=>{
 assert.match(ui,/freq==='Mensual'&&installments<=11/);
 assert.match(ui,/freq==='Mensual'&&installments===12\)pct\.value='13\.5'/);
 assert.match(ui,/rule\?\.recargosPorCuotas/);
 assert.match(ui,/recargo_financiero_requiere_confirmacion/);
});

test('new policy selects a real insurer explicitly and never silently preselects QA',()=>{
 assert.match(ui,/data-insurer><option value="">— Seleccionar aseguradora —<\/option>/);
 assert.match(ui,/if \(!existing && !insurerEl\.value\)/);
 assert.match(ui,/Selecciona la aseguradora real del documento/);
 assert.match(ui,/insurerEl\.focus\(\)/);
});

test('client change never silently selects first insurer; editing preserves real existing insurer only',()=>{
 assert.match(ui,/const availableInsurers = linkedInsurers\(country2\)/);
 assert.match(ui,/insurerEl\.innerHTML = '<option value="">— Seleccionar aseguradora —<\/option>' \+ availableInsurers\.map/);
 assert.match(ui,/insurerEl\.value = existing && availableInsurers\.some\(a => a\.id === existing\.aseguradoraId\) \? existing\.aseguradoraId : '';/);
});
