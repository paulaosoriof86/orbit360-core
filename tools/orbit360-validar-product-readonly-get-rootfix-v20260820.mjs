#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';

const SOURCE='orbit360-platform/data/store-firestore-product-readonly-p0.js';
const source=fs.readFileSync(SOURCE,'utf8');
const checks={};
const need=(name,cond,details={})=>{
  checks[name]=!!cond;
  if(!cond){
    console.error(JSON.stringify({ok:false,status:'F2_PRODUCT_READONLY_GET_ROOTFIX_SOURCEONLY_FAIL',classification:'FUNCTIONAL_DEFECT',code:name,checks,details,browser:false,secrets:false,firestore:false,writes:0,containsPII:false,containsSecrets:false},null,2));
    process.exit(1);
  }
};

const getBody=(source.match(/function get\(collection, id\)\s*\{([\s\S]*?)\n\s*\}/)||[])[1]||'';
need('GET_FUNCTION_PRESENT',!!getBody);
need('GET_NO_LONGER_CALLS_ALL',!/\ball\s*\(/.test(getBody),{getBody});
need('GET_READS_CACHE_DIRECTLY',/cache\[collection\]/.test(getBody));
need('GET_CLONES_FOUND_ROW',/clone\(row\)/.test(getBody));
need('ALL_STILL_CLONES_COLLECTION',/function all\(collection\)\s*\{\s*return \(cache\[collection\] \|\| \[\]\)\.map\(clone\);\s*\}/.test(source));
need('WRITE_GUARD_CONSTANT_PRESERVED',source.includes("WRITE_BLOCKED_PRODUCT_READ_ONLY_P0"));
need('NO_AYS_TENANT_HARDCODE',!source.includes('alianzas-soluciones'));

class CustomEvent { constructor(type,init={}){this.type=type;this.detail=init.detail;} }
const dispatched=[];
const window={Orbit:{},dispatchEvent:(e)=>{dispatched.push(e);return true;}};
const context=vm.createContext({window,CustomEvent,console,Date,JSON,Object,Array,String,Number,Error,Math,setTimeout,clearTimeout});
vm.runInContext(source,context,{filename:SOURCE});

const rows=[
  {id:'c-1',tenantId:'tenant-test',nombre:'Uno',nested:{x:1},tags:['a']},
  {id:'c-2',tenantId:'tenant-test',nombre:'Dos',nested:{x:2},tags:['b']}
];
const ref={
  where(){return this;},
  onSnapshot(onNext){
    onNext({forEach(cb){rows.forEach(r=>cb({id:r.id,data:()=>JSON.parse(JSON.stringify(r))}));}});
    return ()=>{};
  }
};
const db={collection(){return ref;}};
const paths={
  validateTenantId(id){return id==='tenant-test'?{ok:true,tenantId:id}:{ok:false,errors:['bad_tenant']};},
  dataCollectionPath(tenant,collection){return `tenants/${tenant}/data/${collection}`;}
};
const queryPlanner=()=>({ok:true,constraints:[{field:'tenantId',op:'==',value:'tenant-test'}],errors:[]});
const api=window.Orbit.createFirestoreProductReadOnlyStoreP0({db},{tenantId:'tenant-test',paths,collections:['clientes'],queryPlanner});
need('FACTORY_CREATED',!!api);
need('ATTACH_PASS',api._attachSnapshots()===true);

const requiredApi=['all','get','where','find','insert','update','remove','on','_emit','pref','setPref','init','reseed','raw','subscribe','_subscribe','_attachSnapshots','_detachSnapshots','_productStatus'];
need('PUBLIC_API_PRESERVED',requiredApi.every(k=>typeof api[k]==='function'),{missing:requiredApi.filter(k=>typeof api[k]!=='function')});
need('READONLY_MARKER_PRESERVED',api.__productReadOnlyP0===true);

const first=api.get('clientes','c-1');
need('GET_FOUND',first && first.nombre==='Uno');
first.nombre='MUTATED'; first.nested.x=999; first.tags.push('mut');
const second=api.get('clientes','c-1');
need('GET_RETURNS_ISOLATED_CLONE',second && second.nombre==='Uno' && second.nested.x===1 && second.tags.length===1,second||{});
need('GET_MISSING_RETURNS_NULL',api.get('clientes','missing')===null);

const all1=api.all('clientes');
need('ALL_COUNT_PRESERVED',all1.length===2);
all1[0].nested.x=444;
need('ALL_RETURNS_ISOLATED_CLONES',api.get('clientes','c-1').nested.x===1);
const where1=api.where('clientes','nombre','Uno');
need('WHERE_CONTRACT_PRESERVED',where1.length===1 && where1[0].id==='c-1');
where1[0].nested.x=555;
need('WHERE_RETURNS_ISOLATED_CLONES',api.get('clientes','c-1').nested.x===1);
need('FIND_CONTRACT_PRESERVED',api.find('clientes',r=>r.id==='c-2')?.nombre==='Dos');

let emitCount=0;
const off=api.on('clientes',()=>{emitCount++;});
api._emit('clientes'); off();
need('EMIT_CONTRACT_PRESERVED',emitCount===1 && dispatched.length>=2,{emitCount,dispatched:dispatched.length});

for(const fn of ['insert','update','remove','setPref','reseed']){
  let blocked=false,code='';
  try{api[fn]('clientes','x',{});}catch(e){blocked=true;code=e.code||'';}
  need(`WRITE_${fn.toUpperCase()}_BLOCKED`,blocked && code==='WRITE_BLOCKED_PRODUCT_READ_ONLY_P0',{blocked,code});
}

const status=api._productStatus();
need('PRODUCT_STATUS_READONLY',status && status.writeEnabled===false && status.mode==='product');

console.log(JSON.stringify({
  ok:true,
  status:'F2_PRODUCT_READONLY_GET_ROOTFIX_SOURCEONLY_PASS',
  classification:'FUNCTIONAL_DEFECT_ROOTFIX_VERIFIED',
  resolvedCode:'F2_PRODUCT_READONLY_GET_FULL_COLLECTION_CLONE_AMPLIFICATION',
  implementation:'cache.find -> clone(foundRow)',
  checks,
  apiPreserved:true,
  cloneIsolationPreserved:true,
  writesRemainBlocked:true,
  tenantHardcode:false,
  browser:false,secrets:false,firestore:false,writes:0,containsPII:false,containsSecrets:false
},null,2));
