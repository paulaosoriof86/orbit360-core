'use strict';
// Isolated source contract: the scope facade ALREADY returns projected clients.
// A second projection triggers O(C*P) product store clones and freezes the topbar.
// Preserve authorized links, aliases, and no cross-country/client ID leak.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=fs.readFileSync(require('node:path').resolve(__dirname,'../orbit360-platform/core/router.js'),'utf8');
const match=src.match(/  function wireGlobalSearch\(\) \{[\s\S]*?\n  \}\n  return \{ init/);
assert.ok(match,'SEARCH_OWNER_NOT_FOUND');
const timers=new Map(),listeners={},docListeners={},winListeners={};let timerId=0,projected=0;
const input={value:'',addEventListener(k,fn){listeners[k]=fn;}};
let dropdownOpen=false;
const dd={innerHTML:'',classList:{add(k){if(k==='open')dropdownOpen=true;},remove(k){if(k==='open')dropdownOpen=false;}},
  querySelectorAll(){return[];},querySelector(selector){
    assert.equal(selector,'[data-go]');
    const match=this.innerHTML.match(/data-go="([^"]+)"/);
    return match?{dataset:{go:match[1]}}:null;
  }};
const document={querySelector(k){return k==='.tb-search'?{querySelector:()=>input,appendChild(){}}:null;},getElementById:()=>dd,addEventListener(k,fn){docListeners[k]=fn;}};
const window={addEventListener(k,fn){winListeners[k]=fn;}};
const scoped={
  clientes:[{id:'c-visible',nombre:'Cliente autorizado',estado:'Vigente'},
    {id:'c-alias',nombreCompleto:'Empresa nombre alterno',numeroDocumento:'ALIAS-2026'}],
  polizas:[{id:'p1',numero:'POLVISIBLE',clienteId:'c-visible'},
    {id:'p1-edition',numero:'POLVISIBLE',clienteId:'c-visible'},
    {id:'p2',numero:'POLRESTRICTED',clienteId:'client-hidden'}],
  vehiculos:[{id:'v1',polizaId:'p2',clienteId:'client-hidden',placa:'PLATEVISIBLE'}],
  cobros:[{id:'co1',clienteId:'client-hidden',numeroRecibo:'RECVISIBLE',monto:100,moneda:'GTQ'}],
  aseguradoras:[]
};
const store={all(name){return scoped[name]||[];},get(){throw Error('GLOBAL_OR_UNSCOPED_FALLBACK_READ');},find(){throw Error('POLICY_SCAN_PER_CLIENT');}};
const Orbit={pais:'GT',session:{rol:()=> 'Operativo'},auth:{productUser:{uid:'signed-user',tenantId:'tenant'}},
  ui:{esc:x=>String(x),money:(m,c)=>String(m)+' '+c},access:{scopedStore:()=>store},store,
  clientProjection:{
    project(){projected++;throw Error('REDUNDANT_FULL_CLIENT_REPROJECTION');},
    get(){throw Error('UNSCOPED_CLIENT_PROJECTION_GET');}
  }
};
const location={hash:'#/inicio'};
const scope={Orbit,window,document,location,current:'inicio',
  setTimeout(fn){const id=++timerId;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);}};
vm.runInNewContext('('+match[0].replace(/\n  return \{ init$/,'')+')',scope)();
function type(v){input.value=v;listeners.input();const pending=[...timers.values()];timers.clear();pending.forEach(fn=>fn());return dd.innerHTML;}
assert.match(type('POLVISIBLE'),/Cliente autorizado/,'SCOPED_CLIENT_RESOLVES');
assert.equal(projected,0,'ALREADY_PROJECTED_CLIENT_NOT_REPROJECTED');
assert.match(type('ALIAS-2026'),/Empresa nombre alterno/,'SEARCH_CANONICAL_CLIENT_ALIAS');
const hidden=type('POLRESTRICTED');
assert.match(hidden,/POLRESTRICTED/,'POLICY_NUMBER_REMAINS_SEARCHABLE');
assert.match(hidden,/data-go="#\/polizas"/,'HIDDEN_CLIENT_LINK_FALLS_BACK_TO_SCOPED_MODULE');
assert.doesNotMatch(hidden,/client-hidden|#\/cliente360/,'HIDDEN_CLIENT_ID_NEVER_EXPOSED');
assert.match(type('PLATEVISIBLE'),/data-go="#\/polizas"/,'VEHICLE_WITHOUT_AUTHORIZED_CLIENT_LINK');
assert.match(type('RECVISIBLE'),/data-go="#\/cobros"/,'CHARGE_WITHOUT_AUTHORIZED_CLIENT_LINK');
assert.equal(projected,0,'INDEX_REUSED_WITHOUT_ANY_REPROJECTION');
const unique=type('POLVISIBLE');
assert.equal((unique.match(/class="tb-sr"/g)||[]).length,1,'HISTORIC_EDITION_DUPLICATE_COLLAPSED_IN_VISIBLE_RESULTS');
let prevented=false;
listeners.keydown({key:'Enter',preventDefault(){prevented=true;}});
assert.equal(prevented,true,'ENTER_PREVENTS_DEFAULT');
assert.equal(location.hash,'#/cliente360?c=c-visible','ENTER_NAVIGATES_TO_FIRST_AUTHORIZED_MATCH');
assert.equal(input.value,'','ENTER_CLEARS_FIELD');
input.value='ALIAS-2026';listeners.input();
prevented=false;
listeners.keydown({key:'Enter',preventDefault(){prevented=true;}});
assert.equal(prevented,true,'FAST_ENTER_PREVENTS_DEFAULT');
assert.equal(location.hash,'#/cliente360?c=c-alias','FAST_ENTER_FLUSHES_DEBOUNCE');
assert.equal(timers.size,0,'FAST_ENTER_CLEARS_STALE_TIMER');
type('UNKNOWN-ZZZ');
assert.equal(dropdownOpen,true,'NOT_FOUND_FEEDBACK_STILL_VISIBLE');
listeners.keydown({key:'Escape'});
assert.equal(dropdownOpen,false,'ESCAPE_DISMISSES_RESULTS');
console.log('I66_GLOBAL_TOPBAR_SCOPED_SEARCH_ENTER_FAST_ENTER_DEDUP_ESCAPE_15_15_PASS');
