import fs from 'node:fs';
import vm from 'node:vm';

function assert(value, code){ if(!value) throw new Error(code); }
function clone(v){ return JSON.parse(JSON.stringify(v)); }

// R89: pending update must survive a stale authoritative snapshot that only proves ID existence.
{
  const source=fs.readFileSync('orbit360-platform/data/store-firestore-product-operational-p0.js','utf8');
  let baseRows=[{id:'biz-r89',tenantId:'alianzas-soluciones',etapa:'nuevo',asesorId:'adv-1'}];
  const baseListeners=[];
  const base={
    __productReadOnlyP0:true,
    _productStatus:()=>({ready:true,status:'ready-read-only',noFallback:true,writeEnabled:false}),
    all:()=>clone(baseRows),
    get:(c,id)=>clone(baseRows.find(r=>r.id===id)||null),
    where:()=>clone(baseRows),
    find:()=>clone(baseRows[0]||null),
    on:(collection,fn)=>{ if(typeof collection==='function')fn=collection; baseListeners.push(fn); return ()=>{}; },
    pref:(k,d)=>d,
    raw:()=>({}),
    _detachSnapshots:()=>{}
  };
  let resolveCall;
  const callPromise=new Promise(resolve=>{resolveCall=resolve;});
  const provider={
    browserFirestoreWriteAuthorized:false,
    serverWriteTransport:'firebase-functions',
    noFallback:true,
    initialize:async()=>({auth:{currentUser:{uid:'u1'}}}),
    callFunction:async()=>callPromise
  };
  const Orbit={
    auth:{productUser:{productReadOnly:true,uid:'u1',tenantId:'alianzas-soluciones',roles:['Dirección'],activeRole:'Dirección',email:'qa@example.test'}},
    session:{rol:()=> 'Dirección'},
    access:{can:()=>true,canAccessRecord:()=>true},
    productRuntimeBrowserProvidersP0:provider
  };
  const sandbox={
    window:{Orbit},
    Orbit,
    location:{hostname:'ays-orbit-360-lab--gi-i65-b2-test.web.app'},
    document:{dispatchEvent:()=>{}},
    CustomEvent:function(type,opts){this.type=type;this.detail=opts?.detail;},
    console,setTimeout,clearTimeout,Promise,Date,Math,JSON,Object,Array,String,Number,Boolean,RegExp,Error,Set
  };
  vm.runInNewContext(source,sandbox,{filename:'store-firestore-product-operational-p0.js'});
  const status=Orbit.productOperationalWriteP0.install(base);
  assert(status.pendingReconcile==='expected-field-match','R89_STATUS_EXPECTATION_CONTRACT_MISSING');
  const durable=Orbit.store.updateDurable('negocios','biz-r89',{etapa:'cotizando'});
  await Promise.resolve(); await Promise.resolve();
  baseListeners.forEach(fn=>fn('negocios'));
  assert(Orbit.store.get('negocios','biz-r89')?.etapa==='cotizando','R89_STALE_SNAPSHOT_DROPPED_OPTIMISTIC_UPDATE');
  resolveCall({ok:true,projection:{}});
  await durable;
  assert(Orbit.store.get('negocios','biz-r89')?.etapa==='cotizando','R89_POST_COMMIT_STALE_BASE_REVERTED_UPDATE');
  baseRows=[{id:'biz-r89',tenantId:'alianzas-soluciones',etapa:'cotizando',asesorId:'adv-1'}];
  baseListeners.forEach(fn=>fn('negocios'));
  assert(Orbit.store.get('negocios','biz-r89')?.etapa==='cotizando','R89_CANONICAL_MATCH_RECONCILE_FAILED');
}

// R88: only one route-primary authoritative collection blocks shell readiness; full hydration is deferred.
{
  const source=fs.readFileSync('orbit360-platform/core/product-hydration-required-optional-p0.js','utf8');
  const publicConfig={
    hydrationContractVersion:'qa',
    hydrationContractSource:'qa',
    requiredCollections:['clientes','polizas','cobros','aseguradoras','vehiculos','recibosEsperados','carteraPrimas','asesores'],
    optionalCollections:['metas','negocios','gestiones','comisiones']
  };
  const policy={queryConstraints:(collection)=>({ok:true,scope:collection==='asesores'?'tenant':'own',constraints:[{field:'tenantId',op:'==',value:'alianzas-soluciones'}]})};
  const fakeFactory=()=>({});
  const context={
    window:{
      __ORBIT360_PRODUCT_PUBLIC_CONFIG__:publicConfig,
      Orbit:{createFirestoreProductReadOnlyStoreP0:fakeFactory,tenantAccessPolicyProductP0:policy},
      location:{hash:'#/inicio'}
    },
    console,JSON,Object,Array,String,Number,Boolean,RegExp,Error,Set
  };
  context.Orbit=context.window.Orbit;
  vm.runInNewContext(source,context,{filename:'product-hydration-required-optional-p0.js'});
  const pre=context.Orbit.productHydrationRequiredOptionalP0.contract();
  assert(pre.preMembershipEnumeration===true,'R88_PREMEMBERSHIP_ENUMERATION_FLAG_MISSING');
  assert(pre.required.length===8&&pre.all.length===12,'R88_PREMEMBERSHIP_COLLECTION_UNIVERSE_LOST');
  const membership={tenantId:'alianzas-soluciones'};
  let h=context.Orbit.productHydrationRequiredOptionalP0.contract(membership);
  assert(JSON.stringify(h.required)==='["clientes"]','R88_INICIO_PRIMARY_NOT_CLIENTES');
  assert(h.fullHydrationDeferred===true&&h.routeOptimized===true,'R88_DEFERRED_HYDRATION_FLAGS_MISSING');
  assert(h.all.length===12,'R88_COLLECTION_LOSS_DURING_DEFER');
  context.window.location.hash='#/polizas';
  h=context.Orbit.productHydrationRequiredOptionalP0.contract(membership);
  assert(JSON.stringify(h.required)==='["polizas"]','R88_POLIZAS_PRIMARY_NOT_POLIZAS');
  context.window.location.hash='#/equipo';
  h=context.Orbit.productHydrationRequiredOptionalP0.contract(membership);
  assert(JSON.stringify(h.required)==='["asesores"]','R88_EQUIPO_PRIMARY_NOT_ASESORES');
}

console.log(JSON.stringify({
  status:'PASS',
  contract:'I6.5-B2-R20-R88-R89',
  r88:{startup:'single-route-primary-authoritative',fullHydrationDeferred:true},
  r89:{pendingReconcile:'expected-field-match',staleSnapshotPreservesOptimisticUpdate:true}
},null,2));
