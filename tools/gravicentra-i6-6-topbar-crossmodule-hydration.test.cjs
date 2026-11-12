'use strict';
// I6.6 regression from authenticated Chrome: searching MAPFRE on #/cobros showed
// "Sin resultados" after a protected role switch, although the insurer was
// authorized and indexed on #/inicio. A topbar search is not route-local.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../orbit360-platform/core/router.js'),'utf8');
const match=source.match(/  function wireGlobalSearch\(\) \{[\s\S]*?\n  \}\n  return \{ init/);
assert.ok(match,'SEARCH_WIRING_OWNER_MISSING');
const timers=new Map(),listeners={},docListeners={},winListeners={};let timerId=0;
const input={value:'',addEventListener(k,fn){listeners[k]=fn;}};
const dropdown={innerHTML:'',classList:{add(){},remove(){}},querySelectorAll(){return[];},
  querySelector(){const m=this.innerHTML.match(/data-go="([^"]+)"/);return m?{dataset:{go:m[1]}}:null;}};
const document={querySelector(k){return k==='.tb-search'?{querySelector:()=>input,appendChild(){}}:null;},
  getElementById:()=>dropdown,addEventListener(k,fn){docListeners[k]=fn;}};
const window={addEventListener(k,fn){winListeners[k]=fn;}};
let role='Operativo',loaded=new Set(['clientes','polizas','cobros']),ensureCalls=[];
const insurer={id:'a1',nombre:'MAPFRE SEGUROS',pais:'GT'};
const rows={clientes:[],polizas:[],cobros:[],aseguradoras:[insurer],vehiculos:[]};
const ownership={clientes:'cliente360',polizas:'polizas',cobros:'cobros',vehiculos:'polizas',aseguradoras:'aseguradoras'};
const access={can(route){return role!=='Asesor'||route!=='aseguradoras';},
  scopedStore(module){return{all(collection){assert.equal(module,ownership[collection],
    'GLOBAL_SEARCH_READS_EACH_SOURCE_USING_ITS_OWN_MODULE_SCOPE');
    return loaded.has(collection)?rows[collection]:[];}};}};
const store={_productStatus(){return{serverConfirmedCollections:[...loaded],deniedCollections:[],snapshotErrors:{}};},
  _ensureCollections(names){ensureCalls.push(names.slice());},all(){throw Error('UNSCOPED_PRODUCT_READ_FORBIDDEN');}};
const Orbit={pais:'GT',session:{rol:()=>role},auth:{productUser:{uid:'user',tenantId:'tenant'}},
  access,store,ui:{esc:x=>String(x),money:(m,c)=>String(m)+' '+c}};
const location={hash:'#/cobros'};
const scope={Orbit,window,document,location,current:'cobros',
  setTimeout(fn){const id=++timerId;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);}};
vm.runInNewContext('('+match[0].replace(/\n  return \{ init$/,'')+')',scope)();
function flush(){for(let i=0;i<8&&timers.size;i++){const todo=[...timers.values()];timers.clear();todo.forEach(fn=>fn());}}
function type(v){input.value=v;listeners.input();flush();return dropdown.innerHTML;}
assert.match(type('MAPFRE'),/Buscando resultados autorizados/,'MISSING_SOURCE_NOT_FALSLY_NO_RESULTS');
assert.equal(ensureCalls.length,1,'PROTECTED_HYDRATION_REQUEST_ONCE_NOT_EVERY_KEYSTROKE');
assert.ok(ensureCalls[0].includes('aseguradoras'),'INSURER_HYDRATED_WHILE_ON_COBROS');
assert.match(type('MAPFRE S'),/Buscando resultados autorizados/);
assert.equal(ensureCalls.length,1,'TYPING_NEVER_RESTARTS_DEFERRED_PAUSE');
loaded.add('aseguradoras');
winListeners['orbit:store:emit']({detail:{collection:'aseguradoras'}});flush();
assert.match(dropdown.innerHTML,/MAPFRE SEGUROS/,'SNAPSHOT_REHYDRATES_VISIBLE_QUERY');
assert.match(dropdown.innerHTML,/data-go="#\/aseguradoras"/,'ROUTE_INDEPENDENT_INSURER_DESTINATION');
role='Asesor';loaded=new Set(['clientes','polizas','cobros']);
docListeners['orbit:session']({detail:{collection:'*'}});flush();
assert.doesNotMatch(type('MAPFRE'),/MAPFRE SEGUROS/,'ADVISOR_INSURER_NOT_LEAKED');
assert.ok(ensureCalls.at(-1).every(name=>name!=='aseguradoras'),'DENIED_SOURCE_NEVER_REQUESTED');
role='Operativo';loaded=new Set(['clientes','polizas','cobros']);
docListeners['orbit:session']({detail:{collection:'*'}});flush();
assert.match(type('MAPFRE'),/Buscando resultados autorizados/,'ROLE_RESET_REQUIRES_NEW_SERVER_SNAPSHOT');
loaded.add('aseguradoras');
winListeners['orbit:store:emit']({detail:{collection:'aseguradoras'}});flush();
assert.match(dropdown.innerHTML,/MAPFRE SEGUROS/,'OPERATIVO_CAN_SEARCH_INSURER_FROM_COBROS');
console.log('I66_TOPBAR_CROSS_MODULE_PROTECTED_ROLE_HYDRATION_11_11_PASS');
