'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const pathEngine = 'orbit360-platform/core/policy-receipts-engine.js';
const pathBridge = 'orbit360-platform/modules/policy-receipts-v1199-bridge.js';
const pathFacade = 'orbit360-platform/data/store-firestore-product-operational-p0.js';
const engineSource = fs.readFileSync(pathEngine, 'utf8');
const bridgeSource = fs.readFileSync(pathBridge, 'utf8');
const facadeSource = fs.readFileSync(pathFacade, 'utf8');

function makeEngine(options = {}) {
  const policy = options.policy || {
    id:'pol_co_other',tenantId:'ays',clienteId:'cli_co',asesorId:'asesor_otro',
    pais:'CO',numero:'CO-2026-1',renovable:true,moneda:'COP',historial:[{t:'anterior'}]
  };
  const captures = [];
  const store = {
    get(collection,id) {
      if(collection==='polizas'&&id===policy.id) return JSON.parse(JSON.stringify(policy));
      return null;
    },
    batchDurable: async (mutations,opts) => {
      captures.push({mutations,opts});
      if(options.failCode) {
        const e = new Error(options.failCode); e.code=options.failCode; throw e;
      }
      return {ok:true,canonicalReadback:true};
    }
  };
  const Orbit = {
    store,primas:{},
    access:{activeRole:()=>options.role||'Operativo',actorAdvisor:()=>({restricciones:options.advisorRestrictions||[]}),
      tenantId:()=> 'ays',actorUser:()=>({id:'carlos',nombre:'Carlos'})},
    ui:{today:()=> '2026-11-10'}
  };
  const context = {Orbit,window:{Orbit},Date,Math,Set,Map,JSON,Object,Array,String,
    Number,RegExp,Boolean,parseFloat,parseInt};
  vm.runInNewContext(engineSource,context,{filename:pathEngine,timeout:2000});
  return {E:context.Orbit.policyReceipts,captures,policy};
}

test('I6.6 Operativo CO: changing only renewable builds a policy PATCH and an audited activity, nothing financial', async()=>{
  const x=makeEngine();
  const result=await x.E.updatePolicy('pol_co_other',{renovable:false},{
    motivo:'Póliza no renovable',operationId:'test_renewability_co_other'
  });
  assert.equal(result.ok,true);
  assert.equal(result.renewabilityOnly,true);
  assert.equal(result.atomicServerCommit,true);
  assert.equal(x.captures.length,1);
  assert.equal(x.captures[0].opts.policyRenewabilityOnly,true);
  assert.equal(x.captures[0].opts.requestId,'test_renewability_co_other');
  assert.equal(x.captures[0].mutations.length,2);
  const [policyMutation,activity]=x.captures[0].mutations;
  assert.equal(policyMutation.collection,'polizas');
  assert.equal(policyMutation.action,'update');
  assert.deepEqual(Object.keys(policyMutation.payload),['renovable']);
  assert.equal(policyMutation.payload.renovable,false);
  assert.equal(activity.collection,'actividades');
  assert.equal(activity.action,'insert');
  assert.equal(activity.payload.pais,'CO');
  assert.equal(activity.payload.asesorId,'asesor_otro');
  assert.match(activity.payload.detalle,/Póliza no renovable/);
  assert.equal(x.policy.renovable,true);
  assert.equal(x.policy.historial.length,1);
  assert.equal(x.captures[0].mutations.some(m=>
    ['recibosEsperados','carteraPrimas','cobros','vehiculos'].includes(m.collection)),false);
});

test('I6.6 failed confirmation retains operationId and error without claiming persistence', async()=>{
  const x=makeEngine({failCode:'permission-denied'});
  const result=await x.E.updatePolicy('pol_co_other',{renovable:false},{
    motivo:'Póliza no renovable',operationId:'test_renewability_error'
  });
  assert.equal(result.ok,false);
  assert.deepEqual(Array.from(result.errors),['operacion_atomica_no_confirmada']);
  assert.equal(result.operationId,'test_renewability_error');
  assert.equal(result.error,'permission-denied');
});

test('I6.6 empty motive and no-op classification fail before any batch write', async()=>{
  const x=makeEngine();
  const noMotive=await x.E.updatePolicy('pol_co_other',{renovable:false},{motivo:''});
  assert.equal(noMotive.ok,false);
  assert.equal(x.captures.length,0);
  const noChange=await x.E.updatePolicy('pol_co_other',{renovable:true},{motivo:'repetición'});
  assert.equal(noChange.ok,false);
  assert.equal(x.captures.length,0);
});

test('I6.6 retains the existing Asesor and Operativo role boundary', ()=>{
  const advisor=makeEngine({role:'Asesor'});
  const operative=makeEngine({role:'Operativo'});
  assert.equal(advisor.E.canManagePolicies(),false);
  assert.equal(operative.E.canManagePolicies(),true);
});

test('I6.6 patch-only uses server callable + exact readback, not browser Firestore writes', ()=>{
  assert.match(facadeSource,/PRODUCT_RENEWABILITY_PATCH_CONTRACT_INVALID/);
  assert.match(facadeSource,/x\.collection==='polizas'&&options\.policyRenewabilityOnly===true/);
  assert.match(facadeSource,/requireServerReadback\(result,targets\)/);
  assert.match(bridgeSource,/nonRenewalBaseline/);
  assert.match(bridgeSource,/renewabilityOnly\?\{renovable:payload\.renovable\}:payload/);
  assert.match(bridgeSource,/Verificación requerida/);
  assert.equal(JSON.parse(fs.readFileSync('firebase.product-go-live.json','utf8')).firestore.rules,
    'firestore.product-readonly.rules');
});

