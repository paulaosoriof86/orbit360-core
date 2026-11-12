'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {resolve,allowRow,Denied}=require('../functions/b4-003-scoped-access-boundary.js');
const TENANT='tenant_gt',UID='qa_operativo';
const config={roleScopes:{Operativo:'all',Direccion:'all',Asesor:'own'},rolePermissions:{}};
function args(role,collection,country='GT',memberPatch={}){
  return{tenantId:TENANT,activeRole:role,collection,country,config,auth:{uid:UID,token:{}},
    member:{uid:UID,tenantId:TENANT,activeRole:role,roles:[role],status:'active',countries:['GT'],
      advisorId:'advisor_carlos',dataScopes:{default:'own',modules:{}},...memberPatch}};
}
test('Operativo all-config read includes other authorized advisors in Ops, Leads and Tasks',()=>{
  for(const collection of ['negocios','gestiones','tareas']){
    const scope=resolve(args('Operativo',collection));
    assert.equal(scope.scope,'all',`${collection} must have full authorized role scope`);
    assert.equal(allowRow(scope,{tenantId:TENANT,pais:'GT',asesorId:'another_advisor'}),true);
    assert.throws(()=>allowRow(scope,{tenantId:TENANT,pais:'CO',asesorId:'another_advisor'}),Denied);
  }
});
test('Operativo explicitly denied modules and role scope do not widen',()=>{
  assert.throws(()=>resolve(args('Operativo','gestiones','GT',{modulesRestricted:['ops']})),Denied);
  assert.throws(()=>resolve(args('Operativo','gestiones','GT',{dataScopes:{default:'own',modules:{ops:'none'}}})),Denied);
  assert.throws(()=>resolve(args('Operativo','gestiones','CO')),Denied);
});
test('Asesor is never widened to a second advisor and unassigned role is denied',()=>{
  const advisor=resolve(args('Asesor','gestiones'));
  assert.equal(advisor.scope,'own');
  assert.throws(()=>allowRow(advisor,{tenantId:TENANT,pais:'GT',asesorId:'another_advisor'}),Denied);
  assert.throws(()=>resolve(args('SuperAdmin','gestiones')),Denied);
});
