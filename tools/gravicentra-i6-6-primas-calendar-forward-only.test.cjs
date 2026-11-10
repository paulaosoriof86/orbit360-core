'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const primasSource=fs.readFileSync('orbit360-platform/core/primas.js','utf8');
const policySource=fs.readFileSync('orbit360-platform/core/policy-receipts-engine.js','utf8');
const copy=x=>JSON.parse(JSON.stringify(x));
function makeRuntime(country='GT'){
  const client={id:'c1',pais:country,asesorId:'advisor1'};
  const insurer={id:'ins1',pais:country,vinculada:true};
  const rows={clientes:[client],aseguradoras:[insurer],polizas:[],recibosEsperados:[],carteraPrimas:[],cobros:[],vehiculos:[],actividades:[],comisiones:[]};
  const store={
    get:(name,id)=>(rows[name]||[]).find(x=>x.id===id)||null,
    all:name=>rows[name]||[],
    where:(name,predicate)=>(rows[name]||[]).filter(predicate),
    insert:(name,data)=>{if(!rows[name])rows[name]=[];if(rows[name].some(x=>x.id===data.id))throw Error('DUPLICATE_SYNTHETIC_ID');rows[name].push(copy(data));},
    update:(name,id,patch)=>{const target=(rows[name]||[]).find(x=>x.id===id);if(!target)throw Error('MISSING_SYNTHETIC_TARGET');Object.assign(target,copy(patch));},
    batchDurable:async mutations=>{for(const m of mutations){if(m.action==='insert')store.insert(m.collection,m.payload);else if(m.action==='update')store.update(m.collection,m.id,m.payload);else throw Error('INVALID_SYNTHETIC_ACTION');}return {ok:true};}
  };
  const Orbit={
    paisCfg:code=>({iva:code==='CO'?19:12,recargoFinanciero:0,gastosEmision:0}),
    store,
    access:{tenantId:()=> 'tenant1',activeRole:()=> 'Dirección',actorUser:()=>({id:'owner1',nombre:'Dirección'}),actorAdvisor:()=>({}),currencyFor:code=>code==='CO'?'COP':'GTQ'}
  };
  const sandbox=vm.createContext({window:{Orbit},Orbit,console});
  vm.runInContext(primasSource,sandbox,{filename:'primas.js'});
  vm.runInContext(policySource,sandbox,{filename:'policy-receipts-engine.js'});
  const financial=Orbit.primas.desglose(9720,country,{fraccionado:true,gastosEmision:486,recargoFinPct:0,ivaPct:country==='CO'?19:12});
  const policy=(id,numero)=>({
    id,tenantId:'tenant1',pais:country,moneda:country==='CO'?'COP':'GTQ',
    clienteId:client.id,asesorId:'advisor1',aseguradoraId:insurer.id,
    numero,ramo:'Vehículos',producto:'Auto Individual',estado:'Vigente',
    vigenciaInicio:'2026-10-01',vigenciaFin:'2027-09-30',frecuencia:'Mensual',cuotas:12,
    primaNeta:9720,gastosEmision:486,recargoFinPct:0,ivaPct:country==='CO'?19:12,
    formaPago:'Tarjeta de crédito',conducto:'Cobro aseguradora'
  });
  return{Orbit,store,rows,policy,financial};
}
const iso=(year,month,day)=>new Date(Date.UTC(year,month-1,day)).toISOString().slice(0,10);
function due(primas,start,frecuencia,n){
  const breakdown=primas.desglose(1200,'GT',{fraccionado:n>1,gastosEmision:0,recargoFinPct:0,ivaPct:12});
  return Array.from(primas.recibos(breakdown,{vigenciaInicio:start,frecuencia,cuotas:n}),x=>x.vence);
}
test('GT y CO: 12 cuotas mensuales usan día 1 civil sin desfase local',()=>{
  const expected=Array.from({length:12},(_,i)=>iso(2026,10+i,1));
  for(const country of ['GT','CO']){
    const runtime=makeRuntime(country);
    assert.deepEqual(due(runtime.Orbit.primas,'2026-10-01','Mensual',12),expected);
    const rows=runtime.Orbit.primas.recibos(runtime.financial,{vigenciaInicio:'2026-10-01',frecuencia:'Mensual',cuotas:12});
    for(let i=0;i<12;i++)assert.equal(rows[i].fechaLimite,iso(2026,10+i,16));
    const total=rows.reduce((sum,r)=>sum+r.total,0);
    assert.equal(Math.round(total*100),Math.round(runtime.financial.total*100));
  }
});
test('Año bisiesto y días 29,30,31: clamp independiente por mes, sin deriva posterior',()=>{
  const primas=makeRuntime().Orbit.primas;
  assert.deepEqual(due(primas,'2024-01-31','Mensual',5),['2024-01-31','2024-02-29','2024-03-31','2024-04-30','2024-05-31']);
  assert.deepEqual(due(primas,'2023-01-31','Mensual',5),['2023-01-31','2023-02-28','2023-03-31','2023-04-30','2023-05-31']);
  assert.deepEqual(due(primas,'2024-01-30','Mensual',3),['2024-01-30','2024-02-29','2024-03-30']);
  assert.deepEqual(due(primas,'2024-02-29','Mensual',3),['2024-02-29','2024-03-29','2024-04-29']);
});
test('Cadencias originales intactas: contado, bimestral, trimestral, cuatrimestral y semestral',()=>{
  const p=makeRuntime().Orbit.primas;
  assert.deepEqual(due(p,'2026-01-31','Contado',1),['2026-01-31']);
  assert.deepEqual(due(p,'2026-01-31','Bimestral',6),['2026-01-31','2026-03-31','2026-05-31','2026-07-31','2026-09-30','2026-11-30']);
  assert.deepEqual(due(p,'2026-01-31','Trimestral',4),['2026-01-31','2026-04-30','2026-07-31','2026-10-31']);
  assert.deepEqual(due(p,'2026-01-31','Cuatrimestral',3),['2026-01-31','2026-05-31','2026-09-30']);
  assert.deepEqual(due(p,'2026-08-31','Semestral',2),['2026-08-31','2027-02-28']);
  assert.deepEqual(due(p,'2026-02-28','Anual',1),['2026-02-28']);
});
test('Date-time ISO no cambia fecha civil y fecha inválida falla cerrada',()=>{
  const p=makeRuntime().Orbit.primas;
  assert.equal(due(p,'2026-10-01T00:00:00-06:00','Mensual',12)[0],'2026-10-01');
  assert.throws(()=>due(p,'2026-02-30','Mensual',12),/vigenciaInicio_fecha_civil_invalida/);
});
test('Pólizas anteriores conservan versión histórica al editar gestión no financiera',async()=>{
  for(const country of ['GT','CO']){
    const env=makeRuntime(country),{Orbit,rows,policy}=env;
    const original=policy('p_legacy_'+country,'POL-LEGACY-'+country);
    rows.polizas.push(copy(original));
    const before=copy(Orbit.policyReceipts.expectedReceipts(original));
    rows.recibosEsperados.push(...copy(before));
    assert.equal(rows.polizas[0].planCalendarVersion,undefined);
    const result=await Orbit.policyReceipts.updatePolicy(original.id,{notaComercial:'Gestión telefónica'},{motivo:'Actualización administrativa sin cambio financiero',operationId:'op_legacy_'+country});
    assert.equal(result.ok,true,JSON.stringify(result.errors||[]));
    assert.equal(rows.polizas[0].planCalendarVersion,undefined,'No convertir calendario heredado');
    const after=rows.recibosEsperados.filter(x=>x.polizaId===original.id).sort((a,b)=>a.secuencia-b.secuencia);
    assert.deepEqual(after.map(x=>[x.vence,x.fechaLimite,x.cuota]),before.map(x=>[x.vence,x.fechaLimite,x.cuota]),'Edición comercial no cambia fechas/cuotas existentes');
    const originalMoney=before.map(x=>Number(x.primaTotal).toFixed(2));
    assert.deepEqual(after.map(x=>Number(x.primaTotal).toFixed(2)),originalMoney);
  }
});
test('Nuevas pólizas adoptan calendario UTC en captura y lo conservan tras editar',async()=>{
  for(const country of ['GT','CO']){
    const env=makeRuntime(country),{Orbit,rows,policy}=env;
    const input=policy('p_new_'+country,'POL-NEW-'+country);
    input.planCalendarVersion='legacy_local_v0';
    const created=await Orbit.policyReceipts.createPolicy(input,{operationId:'op_new_'+country});
    assert.equal(created.ok,true,JSON.stringify(created.errors||[]));
    assert.equal(rows.polizas[0].planCalendarVersion,'UTC_ANCHOR_V1','Se ignora version forzada de entrada');
    const expected=Array.from({length:12},(_,i)=>iso(2026,10+i,1));
    const ids=rows.recibosEsperados.filter(x=>x.polizaId===input.id).sort((a,b)=>a.secuencia-b.secuencia);
    assert.deepEqual(ids.map(x=>x.vence),expected);
    const updated=await Orbit.policyReceipts.updatePolicy(input.id,{notaComercial:'Seguimiento'},{motivo:'Seguimiento administrativo sin mutación plan de pagos',operationId:'op_upd_'+country});
    assert.equal(updated.ok,true,JSON.stringify(updated.errors||[]));
    const after=rows.recibosEsperados.filter(x=>x.polizaId===input.id).sort((a,b)=>a.secuencia-b.secuencia);
    assert.deepEqual(after.map(x=>x.vence),expected);
    assert.equal(rows.polizas[0].planCalendarVersion,'UTC_ANCHOR_V1');
  }
});
test('Paridad del defecto histórico: solo modo legacy reproduce desfase GT/CO',()=>{
  if(!['America/Guatemala','America/Bogota'].includes(process.env.TZ))return;
  const e=makeRuntime('GT');
  const legacy=e.Orbit.primas.recibos(e.financial,{vigenciaInicio:'2026-10-01',cuotas:12,frecuencia:'Mensual',calendarMode:'legacy_local_v0'});
  assert.deepEqual(Array.from(legacy,x=>x.vence),['2026-10-01','2026-10-31','2026-12-01','2026-12-31','2027-01-31','2027-03-03','2027-03-31','2027-05-01','2027-05-31','2027-07-01','2027-07-31','2027-08-31']);
  const modern=e.Orbit.primas.recibos(e.financial,{vigenciaInicio:'2026-10-01',cuotas:12,frecuencia:'Mensual'});
  assert.equal(modern[11].vence,'2027-09-01');
});
