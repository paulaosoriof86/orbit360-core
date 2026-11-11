'use strict';
// Source-level DOM contract. Proves search never deep-clones the fleet per policy
// or per keystroke, and invalidates only when role, route or source changes.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const file=path.resolve(__dirname,'../orbit360-platform/core/router.js');
const source=fs.readFileSync(file,'utf8');
const found=source.match(/  function wireGlobalSearch\(\) \{[\s\S]*?\n  \}\n  return \{ init/);
assert.ok(found,'P0_GLOBAL_SEARCH_OWNER_NOT_FOUND');
const functionSource=found[0].replace(/\n  return \{ init$/,'');
const listeners={},docListeners={},winListeners={},counts={};
let nextTimer=0,role='Operativo',country='GT';
const timers=new Map();
const input={value:'',addEventListener(type,cb){listeners[type]=cb;}};
const dropdown={innerHTML:'',classList:{add(){},remove(){}},querySelectorAll(){return[];}};
const box={querySelector(){return input;},appendChild(){}};
const document={querySelector(selector){return selector==='.tb-search'?box:null;},getElementById(){return dropdown;},
  addEventListener(type,cb){docListeners[type]=cb;}};
const window={addEventListener(type,cb){winListeners[type]=cb;}};
const clients=Array.from({length:440},(_,i)=>({id:'c'+i,nombre:'Cliente '+i,identificacion:'NIT'+i}));
const policies=Array.from({length:1400},(_,i)=>({id:'p'+i,numero:'POL'+i,producto:'Auto',ramo:'Vehículos',clienteId:'c'+(i%440)}));
const vehicles=Array.from({length:1000},(_,i)=>({id:'v'+i,polizaId:'p'+i,clienteId:'c'+(i%440),placa:'PLACA'+i,marca:'Marca',linea:'Modelo'}));
const fixtures={clientes:clients,polizas:policies,vehiculos:vehicles,cobros:[{id:'r1',clienteId:'c1',numeroRecibo:'R123',monto:200,moneda:'GTQ',estado:'recaudado'}],aseguradoras:[{id:'a1',nombre:'Seguros QA',pais:'GT'}]};
const S={all(name){counts[name]=(counts[name]||0)+1;return fixtures[name]||[];},get(name,id){return (fixtures[name]||[]).find(x=>x.id===id);}};
const Orbit={pais:country,session:{rol:()=>role},auth:{productUser:{uid:'u1',tenantId:'ays',roles:[role]}},
  ui:{esc:x=>String(x),money:(m,c)=>String(m)+' '+c},
  clientProjection:{project:raw=>raw,get:id=>clients.find(x=>x.id===id)},
  access:{scopedStore:()=>S},store:S};
const sandbox={document,window,Orbit,current:'inicio',
  setTimeout(fn){const id=++nextTimer;timers.set(id,fn);return id;},
  clearTimeout(id){timers.delete(id);}};
const fn=vm.runInNewContext('('+functionSource+')',sandbox,{filename:'router-global-search.js'});
fn();
function type(term){input.value=term;listeners.input();const jobs=[...timers.values()];timers.clear();jobs.forEach(job=>job());}
type('PLACA999');
assert.ok(dropdown.innerHTML.includes('PLACA999'),'P0_GLOBAL_SEARCH_VEHICLE_MATCH_MISSING');
for(const coll of Object.keys(fixtures))assert.equal(counts[coll],1,'P0_GLOBAL_SEARCH_INITIAL_SINGLE_SNAPSHOT_'+coll);
type('POL999');
assert.ok(dropdown.innerHTML.includes('POL999'),'P0_GLOBAL_SEARCH_POLICY_MATCH_MISSING');
for(const coll of Object.keys(fixtures))assert.equal(counts[coll],1,'P0_GLOBAL_SEARCH_DUPLICATE_CLONE_PER_KEYSTROKE_'+coll);
role='Asesor';Orbit.auth.productUser.roles=['Operativo','Asesor'];docListeners['orbit:session']();
type('PLACA999');
for(const coll of Object.keys(fixtures))assert.equal(counts[coll],2,'P0_GLOBAL_SEARCH_ROLE_CACHE_NOT_INVALIDATED_'+coll);
docListeners['orbit:store']();type('NIT1');
for(const coll of Object.keys(fixtures))assert.equal(counts[coll],3,'P0_GLOBAL_SEARCH_SOURCE_CACHE_NOT_INVALIDATED_'+coll);
winListeners['orbit:store:emit']();type('PLACA999');
for(const coll of Object.keys(fixtures))assert.equal(counts[coll],4,'P0_GLOBAL_SEARCH_PRODUCT_SNAPSHOT_STALE_'+coll);
sandbox.current='cobros';winListeners.hashchange();type('Seguros QA');
for(const coll of Object.keys(fixtures))assert.equal(counts[coll],5,'P0_GLOBAL_SEARCH_ROUTE_CACHE_NOT_INVALIDATED_'+coll);
assert.ok(dropdown.innerHTML.includes('Seguros QA'),'P0_GLOBAL_SEARCH_INSURER_MATCH_MISSING');
console.log('I66_GLOBAL_SEARCH_TRANSVERSAL_INDEX_SINGLE_SNAPSHOT_AND_SCOPE_INVALIDATION_17_17_PASS');
