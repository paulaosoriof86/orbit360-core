'use strict';
// I6.6 role-wide business access parity. Synthetic, source-only: no Firebase,
// browser credentials, customer identifiers, deployment or financial writes.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=p=>fs.readFileSync(path.join(root,p),'utf8');
const norm=v=>String(v==null?'':v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const text=(v,max=160)=>String(v==null?'':v).trim().slice(0,max);
const elevated=['Operativo','Dirección','Admin','AdminTenant','SuperAdmin'];
const modules=['cliente360','polizas','cobros','ops','leads','cancelaciones','siniestros','comisiones'];
const rows=['clientes','polizas','vehiculos','recibosEsperados','carteraPrimas','cobros','negocios','gestiones','tareas','cancelaciones','reclamos','comisiones'];

function ui(role,options={}){
  const member={uid:'qa-actor',tenantId:'qa-tenant',roles:[role],activeRole:role,countries:['GT'],advisorId:'advisor-own',productReadOnly:true};
  const advisor={id:'advisor-own',dataScopes:{default:'own',modules:options.moduleScopes||{}},modulesRestricted:options.restricted||[]};
  const permissions=Object.fromEntries(modules.map(m=>[m,{ver:true,editar:options.deniedModule!==m}]));
  const access={roleScopes:{[role]:options.roleScope||'all'},rolePermissions:{[role]:permissions}};
  const store={get:(c,id)=>c==='asesores'&&id==='advisor-own'?advisor:null,all:()=>[]};
  const orbit={session:{rol:()=>role,rolesAsignados:()=>[role],asesorId:()=> 'advisor-own'},
    auth:{productUser:member,user:()=>({uid:member.uid,rol:role})},
    store,tenant:{get:()=>({tenantId:'qa-tenant'}),isActive:()=>true},
    domainConfig:{peekReadOnly:()=>access},
    ROLES:{[role]:{modulos:modules,nivel:10}},pais:'GT'};
  const window={Orbit:orbit};vm.runInNewContext(source('orbit360-platform/core/access-scope.js'),{window,Orbit:orbit,console});
  return orbit.access;
}

const serverSource=source('functions/product-operational-domain.js');
const serverBlock=serverSource.slice(serverSource.indexOf('function normalizedScope(value)'),serverSource.indexOf('function listHas('));
assert.ok(serverBlock.startsWith('function normalizedScope(value)')&&serverBlock.includes('function effectiveScope('));
const effectiveScope=new Function('norm','text',serverBlock+'\nreturn effectiveScope;')(norm,text);
const workflowSource=source('functions/product-ops-leads-domain.js');
const workflowBlock=workflowSource.slice(workflowSource.indexOf('function scope(m,domain,activeRole,accessConfig)'),workflowSource.indexOf('function advisorAllowed('));
assert.ok(workflowBlock.startsWith('function scope('));
const workflowScope=new Function('norm','text',workflowBlock+'\nreturn scope;')(norm,text);
const workflowModuleBlock=workflowSource.slice(workflowSource.indexOf('function workflowRoleModuleAllowed('),workflowSource.indexOf('function canonicalizeCollaborationPayload('));
assert.ok(workflowModuleBlock.startsWith('function workflowRoleModuleAllowed('));
const unique=v=>Array.from(new Set([].concat(v||[]).map(x=>text(x,180)).filter(Boolean)));
const workflowModuleAllowed=new Function('norm','text','unique',workflowModuleBlock+'\nreturn workflowRoleModuleAllowed;')(norm,text,unique);
const {resolve,allowRow,Denied}=require('../functions/b4-003-scoped-access-boundary.js');

function context(role,collection,options={}){
  const member={uid:'qa-actor',tenantId:'qa-tenant',roles:[role],activeRole:role,
    status:'active',countries:['GT'],advisorId:'advisor-own',dataScopes:{default:'own',modules:options.moduleScopes||{}},
    modulesRestricted:options.restricted||[]};
  const module=collection==='reclamos'?'cliente360':collection==='comisiones'?'comisiones':null;
  return{auth:{uid:member.uid,token:{}},member,config:{roleScopes:{[role]:options.roleScope||'all'},
    rolePermissions:module?{[role]:{[module]:{ver:true,editar:true}}}:{}},
    tenantId:'qa-tenant',activeRole:role,collection,country:'GT'};
}

for(const role of elevated){
  test(`${role}: full allowed business portfolio across UI, reader, operational writer, Ops/Leads`,()=>{
    const access=ui(role);
    for(const module of modules){
      assert.equal(access.dataScope(module),'all',`${role} UI ${module}`);
      assert.equal(access.can(module,'create'),true,`${role} create ${module}`);
      assert.equal(access.can(module,'edit'),true,`${role} edit ${module}`);
      assert.equal(access.canAccessRecord({id:'foreign',tenantId:'qa-tenant',pais:'GT',asesorId:'advisor-peer'},module,{collection:module}),true,`${role} foreign advisor ${module}`);
      assert.equal(access.canAccessRecord({id:'foreign',tenantId:'qa-tenant',pais:'CO',asesorId:'advisor-peer'},module,{collection:module}),false,`${role} foreign country ${module}`);
      assert.equal(access.canAccessRecord({id:'foreign',tenantId:'other-tenant',pais:'GT',asesorId:'advisor-peer'},module,{collection:module}),false,`${role} foreign tenant ${module}`);
      assert.equal(effectiveScope({dataScopes:{default:'own'}},{roleScopes:{[role]:'all'}},role,module),'all',`${role} server writer ${module}`);
    }
    for(const domain of ['ops','leads'])assert.equal(workflowScope({dataScopes:{default:'own'}},domain,role,{roleScopes:{[role]:'all'}}),'all');
    assert.equal(workflowModuleAllowed({actor:{activeRole:role},member:{countries:['GT']},accessConfig:{}},'ops',{pais:'GT'}),true);
    for(const collection of rows){
      const scope=resolve(context(role,collection));
      assert.equal(scope.scope,'all',`${role} reader ${collection}`);
      assert.equal(allowRow(scope,{id:'foreign',tenantId:'qa-tenant',pais:'GT',asesorId:'advisor-peer'}),true);
      assert.throws(()=>allowRow(scope,{id:'foreign',tenantId:'qa-tenant',pais:'CO',asesorId:'advisor-peer'}),Denied);
    }
  });
}

test('An explicit module NONE and deny matrix still win for every privileged role',()=>{
  for(const role of elevated){
    const noOps=ui(role,{moduleScopes:{ops:'none'}});
    assert.equal(noOps.dataScope('ops'),'none');
    assert.equal(noOps.canAccessRecord({pais:'GT',asesorId:'advisor-peer'},'ops'),false);
    assert.equal(effectiveScope({dataScopes:{default:'own',modules:{ops:'none'}}},{roleScopes:{[role]:'all'}},role,'ops'),'none');
    assert.equal(workflowScope({dataScopes:{default:'own',modules:{ops:'none'}}},'ops',role,{roleScopes:{[role]:'all'}}),'none');
    assert.throws(()=>resolve(context(role,'gestiones',{moduleScopes:{ops:'none'}})),Denied);
    assert.equal(ui(role,{deniedModule:'cobros'}).can('cobros','edit'),false);
    assert.equal(workflowModuleAllowed({actor:{activeRole:role},member:{countries:['GT'],modulesRestricted:['ops']},accessConfig:{}},'ops',{pais:'GT'}),false);
    assert.equal(workflowModuleAllowed({actor:{activeRole:role},member:{countries:['GT']},accessConfig:{rolePermissions:{[role]:{ops:{ver:true,editar:false}}}}},'ops',{pais:'GT'}),false);
    assert.equal(workflowModuleAllowed({actor:{activeRole:role},member:{countries:['GT']},accessConfig:{}},'ops',{pais:'CO'}),false);
    assert.throws(()=>resolve(context(role,'gestiones',{restricted:['ops']})),Denied);
    assert.equal(effectiveScope({dataScopes:{default:'own'}},{roleScopes:{[role]:'team'}},role,'polizas'),'own');
  }
});

test('Asesor remains own-only, with no privilege inheritance',()=>{
  const role='Asesor',access=ui(role);
  assert.equal(access.dataScope('polizas'),'own');
  assert.equal(access.canAccessRecord({pais:'GT',asesorId:'advisor-peer'},'polizas',{collection:'polizas'}),false);
  assert.equal(effectiveScope({dataScopes:{default:'own'}},{roleScopes:{[role]:'all'}},role,'polizas'),'own');
  assert.equal(workflowScope({dataScopes:{default:'own'}},'ops',role,{roleScopes:{[role]:'all'}}),'own');
  const scope=resolve(context(role,'polizas'));
  assert.equal(scope.scope,'own');
  assert.throws(()=>allowRow(scope,{tenantId:'qa-tenant',pais:'GT',asesorId:'advisor-peer'}),Denied);
});

console.log('I66_PRIVILEGED_ROLE_PORTFOLIO_PARITY_SYNTHETIC_NO_LIVE_WRITES');
