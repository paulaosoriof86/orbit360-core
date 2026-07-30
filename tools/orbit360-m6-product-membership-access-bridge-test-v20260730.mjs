#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const ROOT=process.cwd();
const files=[
  'orbit360-platform/core/membership-multirol-contract-p0.js',
  'orbit360-platform/core/membership-multirol-effective-p0.js',
  'orbit360-platform/core/product-membership-access-bridge-p0.js'
];
let activeRole='Dirección';
const memory={};
const sandbox={
  console,
  URLSearchParams,
  setTimeout,
  clearTimeout,
  CustomEvent:function(name,opts){this.type=name;this.detail=opts&&opts.detail;},
  localStorage:{getItem:k=>memory[k]||null,setItem:(k,v)=>{memory[k]=String(v);},removeItem:k=>{delete memory[k];}},
  document:{dispatchEvent:()=>{},documentElement:{dataset:{}},querySelectorAll:()=>[]},
  location:{search:'',hash:''}
};
sandbox.window=sandbox;
sandbox.Orbit={
  MODULE_META:{inicio:{},cliente360:{},polizas:{},cobros:{},renovaciones:{},ops:{},leads:{},aseguradoras:{},calidad:{},importar:{},portal:{},finanzas:{}},
  NAV:[],
  auth:{productUser:{uid:'synthetic-user',tenantId:'synthetic-tenant',roles:['Dirección','Operativo','Asesor'],defaultRole:'Dirección',activeRole:'Dirección',advisorId:'advisor-source-only',countries:['GT','CO'],dataScopes:{default:'all',modules:{}},modulesExtra:[],modulesRestricted:[],productReadOnly:true}},
  session:{
    rol:()=>activeRole,
    asesorId:()=> 'advisor-source-only',
    canSee:route=>route==='inicio',
    set:role=>{activeRole=role;return true;},
    allowedRoles:()=>['Dirección','Operativo','Asesor'],
    rolesAsignados:()=>['Dirección','Operativo','Asesor'],
    writeAuthorized:false,
    membershipWrites:false
  }
};
vm.createContext(sandbox);
for(const rel of files){vm.runInContext(fs.readFileSync(path.join(ROOT,rel),'utf8'),sandbox,{filename:rel});}
const results={};
for(const role of ['Dirección','Operativo','Asesor']){
  activeRole=role;
  results[role]={
    aseguradoras:sandbox.Orbit.session.canSee('aseguradoras'),
    cliente360:sandbox.Orbit.session.canSee('cliente360'),
    finanzas:sandbox.Orbit.session.canSee('finanzas')
  };
}
const bridge=sandbox.Orbit.productMembershipAccessBridgeP0||{};
const ok=bridge.advisorCollectionRequired===false&&bridge.writesStore===false&&bridge.writesMembership===false&&results.Dirección.aseguradoras===true&&results.Operativo.aseguradoras===true&&results.Asesor.aseguradoras===true&&results.Operativo.cliente360===true&&results.Asesor.cliente360===true&&results.Operativo.finanzas===false&&results.Asesor.finanzas===false;
const out={status:ok?'PASS':'FAIL',advisorStorePresent:false,advisorCollectionRequired:bridge.advisorCollectionRequired===true,roles:results,bridgeVersion:String(bridge.VERSION||''),membershipSource:String(bridge.membershipSource||''),writesStore:bridge.writesStore===true,writesMembership:bridge.writesMembership===true};
console.log(JSON.stringify(out,null,2));
process.exit(ok?0:1);
