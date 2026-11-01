'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {execFileSync}=require('node:child_process');

const FILE='orbit360-platform/core/product-hydration-required-optional-p0.js';
const PREVIOUS='ce50d1fc6cc66ad0fc451b25f01b6aeb18aa5064';
const before=execFileSync('git',['show',PREVIOUS+':'+FILE],{encoding:'utf8'});
const current=fs.readFileSync(FILE,'utf8');

function startup(source,route,role,visibility){
  const window={
    location:{hash:'#/'+route},
    __ORBIT360_PRODUCT_PUBLIC_CONFIG__:{
      requiredCollections:['clientes','polizas','aseguradoras'],
      optionalCollections:[],hydrationContractVersion:'uat-forbidden-route'
    },
    Orbit:{
      createFirestoreProductReadOnlyStoreP0:function(){return {};},
      tenantAccessPolicyProductP0:{
        queryConstraints:function(collection,member){
          const module={clientes:'cliente360',polizas:'polizas',aseguradoras:'aseguradoras'}[collection];
          return {ok:true,scope:'tenant',module,
            constraints:[{field:'tenantId',op:'==',value:member.tenantId}]};
        },
        ...(visibility==='missing'?{}:{
          moduleVisible:function(member,module){
            return !(member.activeRole==='Asesor'&&module==='aseguradoras');
          }
        })
      }
    }
  };
  vm.runInNewContext(source,{window},{filename:FILE,timeout:1000});
  return window.Orbit.productHydrationRequiredOptionalP0.contract({
    uid:'synthetic-role-test',tenantId:'alianzas-soluciones',
    activeRole:role,roles:[role]
  }).startupCollection;
}

test('RED before: denied Aseguradoras deep link incorrectly forces server snapshot',()=>{
  assert.equal(startup(before,'aseguradoras','Asesor'),'aseguradoras');
});
test('GREEN after: denied route hydrates an authorized neutral source',()=>{
  assert.equal(startup(current,'aseguradoras','Asesor'),'clientes');
});
test('authorized Operativo keeps Aseguradoras as route-primary',()=>{
  assert.equal(startup(current,'aseguradoras','Operativo'),'aseguradoras');
});
test('Asesor Pólizas keeps its own protected primary source',()=>{
  assert.equal(startup(current,'polizas','Asesor'),'polizas');
});
test('Asesor Inicio remains scoped to Clientes',()=>{
  assert.equal(startup(current,'inicio','Asesor'),'clientes');
});
test('missing effective-module evaluator fails closed',()=>{
  assert.throws(()=>startup(current,'aseguradoras','Asesor','missing'),
    /product_required_hydration_contract_missing/);
});
