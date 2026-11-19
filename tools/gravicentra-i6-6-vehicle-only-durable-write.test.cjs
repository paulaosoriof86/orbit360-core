'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const engineSource = fs.readFileSync(path.join(__dirname,'../orbit360-platform/core/policy-receipts-engine.js'),'utf8');
function harness({role='Operativo',fail=false}={}){
  const policy={id:'pol_ashlyn',numero:'GT-ASHLYN',tenantId:'alianzas-soluciones',clienteId:'cli_ashlyn',asesorId:'asesor_otro',pais:'GT',primaTotal:1500};
  const vehicle={id:'veh_ashlyn',tenantId:policy.tenantId,clienteId:policy.clienteId,polizaId:policy.id,asesorId:policy.asesorId,pais:'GT',placa:'ABC123',linea:'Sedan'};
  const data={polizas:[policy],vehiculos:[vehicle],recibosEsperados:[{id:'r1',estado:'Pagado'}],carteraPrimas:[{id:'cp1',estado:'Pagado'}],cobros:[{id:'c1',estado:'Pagado'}],actividades:[]};
  const calls=[];
  const store={
    get:(collection,id)=>(data[collection]||[]).find(row=>row.id===id)||null,
    batchDurable:async(mutations,options)=>{
      calls.push({mutations,options});
      assert.deepEqual(Array.from(mutations,m=>m.collection),['vehiculos','actividades']);
      if(fail)throw Object.assign(new Error('Denied by server'),{code:'permission-denied'});
      for(const m of mutations){
        if(m.action==='update')Object.assign(store.get(m.collection,m.id),m.payload);
        else if(m.action==='insert')data[m.collection].push(Object.assign({id:m.id},m.payload));
      }
      return{canonicalReadback:true,canonicalReadbackCount:mutations.length};
    }
  };
  const access={activeRole:()=>role,actorAdvisor:()=>({}),tenantId:()=>policy.tenantId};
  const Orbit={store,access,ui:{today:()=> '2026-11-19'}};
  const context=vm.createContext({window:{Orbit},Orbit,console});
  vm.runInContext(engineSource,context,{filename:'policy-receipts-engine.js'});
  return{engine:Orbit.policyReceipts,data,calls};
}

test('Operativo edits an existing vehicle without writing policy, receipts, cartera or payments',async()=>{
  const h=harness();
  const beforeFinance=JSON.stringify([h.data.polizas,h.data.recibosEsperados,h.data.carteraPrimas,h.data.cobros]);
  const result=await h.engine.updatePolicy('pol_ashlyn',{vehiculo:{id:'veh_ashlyn',linea:'SUV',placa:'XYZ456'}},{motivo:'Corrección documentada de riesgo'});
  assert.equal(result.ok,true);
  assert.equal(result.vehicleOnly,true);
  assert.equal(result.atomicServerCommit,true);
  assert.equal(h.data.vehiculos[0].placa,'XYZ456');
  assert.equal(h.data.actividades.length,1);
  assert.equal(JSON.stringify([h.data.polizas,h.data.recibosEsperados,h.data.carteraPrimas,h.data.cobros]),beforeFinance);
  assert.equal(h.calls.length,1);
});

test('vehicle update fails closed for unrelated policy and hidden relationship fields',async()=>{
  const h=harness();
  const unrelated=await h.engine.updatePolicy('pol_ashlyn',{vehiculo:{id:'veh_otra',placa:'XXX'}},{motivo:'Revisión'});
  assert.equal(unrelated.ok,false);
  assert.equal(unrelated.errors[0],'vehiculo_vinculo_canonico_invalido');
  const changedParent=await h.engine.updatePolicy('pol_ashlyn',{vehiculo:{id:'veh_ashlyn',clienteId:'cli_otro'}},{motivo:'Revisión'});
  assert.equal(changedParent.ok,false);
  assert.equal(changedParent.errors[0],'vehiculo_campos_no_autorizados');
  assert.equal(h.calls.length,0);
});

test('server denial is returned as failure without optimistic financial or vehicle changes',async()=>{
  const h=harness({fail:true});
  const result=await h.engine.updatePolicy('pol_ashlyn',{vehiculo:{id:'veh_ashlyn',placa:'XYZ456'}},{motivo:'Revisión'});
  assert.equal(result.ok,false);
  assert.equal(result.error,'permission-denied');
  assert.equal(h.data.vehiculos[0].placa,'ABC123');
  assert.equal(h.data.actividades.length,0);
});

test('Asesor without explicit write rights cannot edit vehicle',async()=>{
  const h=harness({role:'Asesor'});
  const result=await h.engine.updatePolicy('pol_ashlyn',{vehiculo:{id:'veh_ashlyn',placa:'XYZ456'}},{motivo:'Revisión'});
  assert.equal(result.ok,false);
  assert.equal(result.errors[0],'permiso_poliza_denegado');
  assert.equal(h.calls.length,0);
});
