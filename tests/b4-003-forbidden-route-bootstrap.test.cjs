'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const {resolve,Denied}=require('../functions/b4-003-scoped-access-boundary.js');

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
          if(collection==='asesores'&&member.activeRole==='Asesor')
            return {ok:false,scope:'none',module:'equipo',constraints:[{field:'__deny__',op:'==',value:true}]};
          const module={clientes:'cliente360',polizas:'polizas',aseguradoras:'aseguradoras'}[collection];
          return {ok:true,scope:'tenant',module,
            constraints:[{field:'tenantId',op:'==',value:member.tenantId}]};
        },
        ...(visibility==='missing'?{}:{
          // This mirrors the REAL mismatch: client module visibility may
          // approve Aseguradoras while the server's directory role gate denies.
          moduleVisible:function(){return true;}
        })
      }
    }
  };
  vm.runInNewContext(source,{window},{filename:FILE,timeout:1000});
  return window.Orbit.productHydrationRequiredOptionalP0.contract({
    uid:'synthetic-role-test',tenantId:'synthetic-tenant',
    activeRole:role,roles:[role]
  }).startupCollection;
}

function serverDirectory(role){
  const uid='synthetic-role-test',tenantId='synthetic-tenant';
  const member={uid,tenantId,status:'active',roles:[role],
    countries:['CO'],advisorId:'synthetic-advisor',dataScopes:{default:'own'}};
  return resolve({auth:{uid},member,config:{},tenantId,activeRole:role,
    collection:'aseguradoras',country:'CO'});
}

test('SERVER truth: Asesor is DIRECTORY_DENIED even if client module is visible',()=>{
  assert.throws(()=>serverDirectory('Asesor'),
    e=>e instanceof Denied&&e.code==='DIRECTORY_DENIED');
});
test('SERVER truth: Operativo retains directory access',()=>{
  assert.equal(serverDirectory('Operativo').scope,'all');
});
test('RED predecessor: denied Aseguradoras deep link forced a server snapshot',()=>{
  assert.equal(startup(before,'aseguradoras','Asesor'),'aseguradoras');
});
test('GREEN candidate: server-denied Asesor route bootstraps Clientes',()=>{
  assert.equal(startup(current,'aseguradoras','Asesor'),'clientes');
});
test('GREEN candidate: server-denied Asesor Jr also bootstraps Clientes',()=>{
  assert.equal(startup(current,'aseguradoras','Asesor Jr.'),'clientes');
});
test('Operativo keeps Aseguradoras as route-primary',()=>{
  assert.equal(startup(current,'aseguradoras','Operativo'),'aseguradoras');
});
test('Asesor Pólizas retains its own protected primary source',()=>{
  assert.equal(startup(current,'polizas','Asesor'),'polizas');
});
test('Asesor Inicio remains scoped to Clientes',()=>{
  assert.equal(startup(current,'inicio','Asesor'),'clientes');
});
test('missing effective-module evaluator fails closed',()=>{
  assert.throws(()=>startup(current,'aseguradoras','Asesor','missing'),
    /product_required_hydration_contract_missing/);
});
