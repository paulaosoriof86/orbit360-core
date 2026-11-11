'use strict';
// Isolated source contract: one scoped policy-client context, no O(C*P) store.find
// and no globally fetched client or client ID outside authorized search results.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=fs.readFileSync(require('node:path').resolve(__dirname,'../orbit360-platform/core/router.js'),'utf8');
const match=src.match(/  function wireGlobalSearch\(\) \{[\s\S]*?\n  \}\n  return \{ init/);
assert.ok(match,'SEARCH_OWNER_NOT_FOUND');
const timers=new Map(),listeners={},docListeners={},winListeners={};let timerId=0,projected=0;
const input={value:'',addEventListener(k,fn){listeners[k]=fn;}};
const dd={innerHTML:'',classList:{add(){},remove(){}},querySelectorAll(){return[];}};
const document={querySelector(k){return k==='.tb-search'?{querySelector:()=>input,appendChild(){}}:null;},getElementById:()=>dd,addEventListener(k,fn){docListeners[k]=fn;}};
const window={addEventListener(k,fn){winListeners[k]=fn;}};
const scoped={
  clientes:[{id:'c-visible',nombre:'Cliente autorizado',estado:'Vigente'}],
  polizas:[{id:'p1',numero:'POLVISIBLE',clienteId:'c-visible'},{id:'p2',numero:'POLRESTRICTED',clienteId:'client-hidden'}],
  vehiculos:[{id:'v1',polizaId:'p2',clienteId:'client-hidden',placa:'PLATEVISIBLE'}],
  cobros:[{id:'co1',clienteId:'client-hidden',numeroRecibo:'RECVISIBLE',monto:100,moneda:'GTQ'}],
  aseguradoras:[]
};
const store={all(name){return scoped[name]||[];},get(){throw Error('GLOBAL_OR_UNSCOPED_FALLBACK_READ');},find(){throw Error('POLICY_SCAN_PER_CLIENT');}};
const Orbit={pais:'GT',session:{rol:()=> 'Operativo'},auth:{productUser:{uid:'signed-user',tenantId:'tenant'}},
  ui:{esc:x=>String(x),money:(m,c)=>String(m)+' '+c},access:{scopedStore:()=>store},store,
  clientProjection:{
    project(raw,context){projected++;assert.ok(context&&context.policyClientIds&&context.policyClientIds.has('c-visible'));return raw;},
    get(){throw Error('UNSCOPED_CLIENT_PROJECTION_GET');}
  }
};
const scope={Orbit,window,document,current:'inicio',
  setTimeout(fn){const id=++timerId;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);}};
vm.runInNewContext('('+match[0].replace(/\n  return \{ init$/,'')+')',scope)();
function type(v){input.value=v;listeners.input();const pending=[...timers.values()];timers.clear();pending.forEach(fn=>fn());return dd.innerHTML;}
assert.match(type('POLVISIBLE'),/Cliente autorizado/,'SCOPED_CLIENT_RESOLVES');
assert.equal(projected,1,'PROJECT_CLIENT_ONCE_WITH_BATCH_CONTEXT');
const hidden=type('POLRESTRICTED');
assert.match(hidden,/POLRESTRICTED/,'POLICY_NUMBER_REMAINS_SEARCHABLE');
assert.match(hidden,/data-go="#\/polizas"/,'HIDDEN_CLIENT_LINK_FALLS_BACK_TO_SCOPED_MODULE');
assert.doesNotMatch(hidden,/client-hidden|#\/cliente360/,'HIDDEN_CLIENT_ID_NEVER_EXPOSED');
assert.match(type('PLATEVISIBLE'),/data-go="#\/polizas"/,'VEHICLE_WITHOUT_AUTHORIZED_CLIENT_LINK');
assert.match(type('RECVISIBLE'),/data-go="#\/cobros"/,'CHARGE_WITHOUT_AUTHORIZED_CLIENT_LINK');
assert.equal(projected,1,'INDEX_REUSED_WITHOUT_EXTRA_PROJECTION');
console.log('I66_GLOBAL_TOPBAR_POLICY_CONTEXT_AND_SCOPED_FALLBACK_7_7_PASS');
